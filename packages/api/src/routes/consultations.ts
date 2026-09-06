import { Router } from 'express';
import fs from 'fs';
import { QUICK_VET_COST, type VetConsultStatus } from '@petdate/shared';
import { dbService } from '../db';
import { createPrescriptionWithDelivery } from '../services/prescription';
import {
  publicApiBaseUrl,
  prescriptionWebPath,
  renderPrescriptionHtml,
} from '../services/prescription-html';
import { notifyVetQuickConsultTelegram } from '../services/telegram-vet-consult-notify';
import { getUserFromBearer } from '../services/web-otp';

const VALID_STATUSES: VetConsultStatus[] = ['requested', 'active', 'completed', 'cancelled'];

export const consultationsRouter = Router();

consultationsRouter.get('/', (req, res) => {
  const vetUserId = req.query.vetUserId ? Number(req.query.vetUserId) : undefined;
  const patientUserId = req.query.patientUserId
    ? Number(req.query.patientUserId)
    : undefined;
  const status = req.query.status as VetConsultStatus | undefined;

  if (
    (vetUserId == null || Number.isNaN(vetUserId)) &&
    (patientUserId == null || Number.isNaN(patientUserId))
  ) {
    res.status(400).json({ error: 'vetUserId یا patientUserId الزامی است' });
    return;
  }
  if (status && !VALID_STATUSES.includes(status)) {
    res.status(400).json({ error: 'وضعیت نامعتبر است' });
    return;
  }

  const consultations = dbService.listVetConsultations({
    vetUserId:
      vetUserId != null && !Number.isNaN(vetUserId) ? vetUserId : undefined,
    patientUserId:
      patientUserId != null && !Number.isNaN(patientUserId)
        ? patientUserId
        : undefined,
    status,
  });
  res.json(consultations);
});

/** دامپزشک‌های قبلی بیمار — قبل از /:id تا route اشتباه نشود */
consultationsRouter.get('/previous-vets', (req, res) => {
  const patientUserId = req.query.patientUserId
    ? Number(req.query.patientUserId)
    : undefined;
  if (!patientUserId || Number.isNaN(patientUserId)) {
    res.status(400).json({ error: 'patientUserId الزامی است' });
    return;
  }
  const patient = dbService.getUserById(patientUserId);
  if (!patient) {
    res.status(404).json({ error: 'بیمار پیدا نشد' });
    return;
  }
  res.json(dbService.listPreviousVetsForPatient(patientUserId));
});

/**
 * اتصال سریع وب — همان سازوکار ربات:
 * پت اجباری → بررسی سکه → دامپزشک آنلاین → کسر سکه → ایجاد مشاوره + نوتیف تلگرام
 */
consultationsRouter.post('/quick-connect', async (req, res) => {
  const session = getUserFromBearer(req.header('authorization') ?? undefined);
  const bodyPatientId =
    req.body?.patientUserId != null ? Number(req.body.patientUserId) : undefined;
  const patientUserId = session?.user?.id ?? bodyPatientId;

  if (!patientUserId || !Number.isFinite(patientUserId)) {
    res.status(400).json({ error: 'patientUserId الزامی است', reason: 'missing_patient' });
    return;
  }
  if (session?.user?.id && session.user.id !== patientUserId) {
    res.status(403).json({ error: 'اجازه دسترسی ندارید', reason: 'forbidden' });
    return;
  }

  const patient = dbService.getUserById(patientUserId);
  if (!patient) {
    res.status(404).json({ error: 'بیمار پیدا نشد', reason: 'missing_patient' });
    return;
  }

  const pets = dbService.listPets({ ownerId: patient.id });
  if (!pets.length) {
    res.status(400).json({
      error: 'برای درخواست ارتباط با پزشک، اول باید حداقل یک پت ثبت کنی.',
      reason: 'no_pet',
    });
    return;
  }

  const balance = patient.coins ?? 0;
  if (balance < QUICK_VET_COST) {
    res.status(400).json({
      error: `برای اتصال سریع حداقل ${QUICK_VET_COST} سکه لازم داری. موجودی: ${balance}`,
      reason: 'insufficient_coins',
      balance,
      cost: QUICK_VET_COST,
    });
    return;
  }

  let vets = dbService.listVerifiedVets().filter((v) => v.id !== patient.id && v.telegramId);
  if (!vets.length) {
    res.status(409).json({
      error: 'فعلاً دامپزشک آنلاینی برای اتصال پیدا نشد. کمی بعد دوباره امتحان کن.',
      reason: 'no_online_vets',
    });
    return;
  }

  const debited = dbService.debitCoins(patient.id, QUICK_VET_COST);
  if (!debited) {
    res.status(400).json({
      error: 'سکه کافی نیست',
      reason: 'insufficient_coins',
      balance: patient.coins ?? 0,
      cost: QUICK_VET_COST,
    });
    return;
  }

  const consultations = [];
  let sent = 0;
  for (const vet of vets) {
    try {
      const consult = dbService.createVetConsultation({
        vetUserId: vet.id,
        patientUserId: patient.id,
        notes: 'اتصال سریع آنلاین',
      });
      consultations.push(consult);
      if (vet.telegramId) {
        const ok = await notifyVetQuickConsultTelegram({
          consult,
          vetTelegramId: vet.telegramId,
          patient,
        });
        if (ok) sent += 1;
      }
    } catch (err) {
      console.warn('create consult for vet failed:', vet.id, err);
    }
  }

  if (sent === 0) {
    dbService.creditCoins(patient.id, QUICK_VET_COST);
    const refunded = dbService.getUserById(patient.id);
    res.status(502).json({
      error: 'ارسال به پزشک‌ها ناموفق بود؛ سکه‌ات برگشت داده شد.',
      reason: 'notify_failed',
      refunded: true,
      cost: QUICK_VET_COST,
      coins: refunded?.coins ?? 0,
      consultations,
    });
    return;
  }

  const updatedPatient = dbService.getUserById(patient.id);
  res.status(201).json({
    ok: true,
    sent,
    cost: QUICK_VET_COST,
    coins: updatedPatient?.coins ?? 0,
    consultations,
    message: [
      'درخواستت برای پزشک‌های آنلاین ارسال شد.',
      `پزشک‌های مطلع‌شده: ${sent}`,
      `سکه کسر شده: ${QUICK_VET_COST}`,
      'به‌زودی یکی از دامپزشک‌ها باهات هماهنگ می‌کنه.',
    ].join('\n'),
  });
});

consultationsRouter.get('/:id', (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id) || id <= 0) {
    res.status(400).json({ error: 'شناسه نامعتبر' });
    return;
  }
  const consultation = dbService.getVetConsultation(id);
  if (!consultation) {
    res.status(404).json({ error: 'مشاوره پیدا نشد' });
    return;
  }
  res.json(consultation);
});

consultationsRouter.post('/', (req, res) => {
  const { vetUserId, patientUserId, petId, status, notes } = req.body ?? {};

  if (!vetUserId || !patientUserId) {
    res.status(400).json({ error: 'vetUserId و patientUserId الزامی هستند' });
    return;
  }

  const vet = dbService.getUserById(Number(vetUserId));
  const patient = dbService.getUserById(Number(patientUserId));
  if (!vet || !patient) {
    res.status(404).json({ error: 'دامپزشک یا بیمار پیدا نشد' });
    return;
  }

  if (status && !VALID_STATUSES.includes(status)) {
    res.status(400).json({ error: 'وضعیت نامعتبر است' });
    return;
  }

  if (petId != null) {
    const pet = dbService.getPet(Number(petId));
    if (!pet) {
      res.status(404).json({ error: 'پت پیدا نشد' });
      return;
    }
  }

  const consultation = dbService.createVetConsultation({
    vetUserId: Number(vetUserId),
    patientUserId: Number(patientUserId),
    petId: petId != null ? Number(petId) : undefined,
    status: status as VetConsultStatus | undefined,
    notes: typeof notes === 'string' ? notes : undefined,
  });

  res.status(201).json(consultation);
});

consultationsRouter.patch('/:id/status', (req, res) => {
  const id = Number(req.params.id);
  const status = req.body?.status as VetConsultStatus | undefined;
  if (!Number.isFinite(id) || id <= 0) {
    res.status(400).json({ error: 'شناسه نامعتبر' });
    return;
  }
  if (!status || !VALID_STATUSES.includes(status)) {
    res.status(400).json({ error: 'وضعیت نامعتبر است' });
    return;
  }
  const updated = dbService.updateVetConsultationStatus(id, status);
  if (!updated) {
    res.status(404).json({ error: 'مشاوره پیدا نشد' });
    return;
  }
  res.json(updated);
});

/** ثبت امتیاز اختیاری صاحب‌پت به دامپزشک — یک امتیاز به ازای هر مشاوره */
consultationsRouter.post('/:id/rating', (req, res) => {
  const consultId = Number(req.params.id);
  const patientUserId =
    req.body?.patientUserId != null ? Number(req.body.patientUserId) : undefined;
  const rating = req.body?.rating != null ? Number(req.body.rating) : undefined;
  const comment = typeof req.body?.comment === 'string' ? req.body.comment : undefined;

  if (!Number.isFinite(consultId) || consultId <= 0) {
    res.status(400).json({ error: 'شناسه مشاوره نامعتبر' });
    return;
  }
  if (!patientUserId || !Number.isFinite(patientUserId)) {
    res.status(400).json({ error: 'patientUserId الزامی است' });
    return;
  }

  const result = dbService.upsertVetRating({
    consultId,
    patientUserId,
    rating: rating as number,
    comment,
  });

  if (!result.ok) {
    if (result.reason === 'missing_consult') {
      res.status(404).json({ error: 'مشاوره پیدا نشد' });
      return;
    }
    if (result.reason === 'forbidden') {
      res.status(403).json({ error: 'فقط صاحب پت می‌تواند امتیاز دهد' });
      return;
    }
    res.status(400).json({ error: 'امتیاز باید بین ۱ تا ۵ باشد' });
    return;
  }

  res.status(result.created ? 201 : 200).json({
    ...result.rating,
    created: result.created,
    stats: dbService.getVetRatingStats(result.rating.vetUserId),
  });
});

/** دریافت امتیاز ثبت‌شده برای یک مشاوره (در صورت وجود) */
consultationsRouter.get('/:id/rating', (req, res) => {
  const consultId = Number(req.params.id);
  if (!Number.isFinite(consultId) || consultId <= 0) {
    res.status(400).json({ error: 'شناسه نامعتبر' });
    return;
  }
  const rating = dbService.getVetRatingByConsultId(consultId);
  if (!rating) {
    res.status(404).json({ error: 'امتیازی ثبت نشده' });
    return;
  }
  res.json(rating);
});

/** صدور نسخه دارویی: PDF + پرونده + پیامک (در صورت موبایل تأییدشده) */
consultationsRouter.post('/:id/prescription', async (req, res) => {
  const consultId = Number(req.params.id);
  const vetUserId = req.body?.vetUserId != null ? Number(req.body.vetUserId) : undefined;
  const petId = req.body?.petId != null ? Number(req.body.petId) : undefined;
  const text = typeof req.body?.text === 'string' ? req.body.text : '';

  if (!Number.isFinite(consultId) || consultId <= 0) {
    res.status(400).json({ error: 'شناسه مشاوره نامعتبر' });
    return;
  }
  if (!vetUserId || !Number.isFinite(vetUserId)) {
    res.status(400).json({ error: 'vetUserId الزامی است' });
    return;
  }
  if (!petId || !Number.isFinite(petId)) {
    res.status(400).json({ error: 'petId الزامی است' });
    return;
  }

  const created = await createPrescriptionWithDelivery({
    consultId,
    vetUserId,
    petId,
    text,
  });

  if (!created.ok) {
    res.status(created.status).json({ error: created.error });
    return;
  }

  const { result } = created;
  const id = result.prescription.id;
  const host = req.get('host') || undefined;
  const base = publicApiBaseUrl(host);
  res.status(201).json({
    prescription: result.prescription,
    pdfPath: result.pdfPath,
    pdfUrl: `/api/prescriptions/${id}/pdf`,
    webPath: prescriptionWebPath(id),
    webUrl: `${base}${prescriptionWebPath(id)}`,
    sms: result.sms,
    patient: {
      id: result.patient.id,
      name: result.patient.name,
      telegramId: result.patient.telegramId,
      phoneVerified: result.patient.phoneVerified,
    },
    vet: {
      id: result.vet.id,
      name: result.vet.name,
      telegramId: result.vet.telegramId,
    },
    pet: {
      id: result.pet.id,
      name: result.pet.name,
      species: result.pet.species,
      breed: result.pet.breed,
    },
  });
});

/** دانلود PDF / مشاهده وب نسخه */
export const prescriptionsFileRouter = Router();

function sendPrescriptionHtml(req: { get(name: string): string | undefined }, res: import('express').Response, id: number) {
  const rx = dbService.getPrescription(id);
  if (!rx) {
    res.status(404).json({ error: 'نسخه پیدا نشد' });
    return;
  }
  const html = renderPrescriptionHtml({
    prescriptionId: rx.id,
    vetName: rx.vetName || '—',
    patientName: rx.patientName || '—',
    petName: rx.petName || '—',
    petSpecies: rx.petSpecies,
    petBreed: rx.petBreed,
    medicationText: rx.text,
    dateIso: rx.createdAt,
    pdfUrl: `/api/prescriptions/${rx.id}/pdf`,
    logoUrl: '/assets/brand/petdate-dr-logo.png',
  });
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'private, max-age=60');
  res.send(html);
}

prescriptionsFileRouter.get('/:id/pdf', (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id) || id <= 0) {
    res.status(400).json({ error: 'شناسه نامعتبر' });
    return;
  }
  const rx = dbService.getPrescription(id);
  if (!rx?.pdfPath || !fs.existsSync(rx.pdfPath)) {
    res.status(404).json({ error: 'فایل نسخه پیدا نشد' });
    return;
  }
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader(
    'Content-Disposition',
    `inline; filename="petdate-dr-prescription-${id}.pdf"`
  );
  fs.createReadStream(rx.pdfPath).pipe(res);
});

prescriptionsFileRouter.get('/:id', (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id) || id <= 0) {
    res.status(400).json({ error: 'شناسه نامعتبر' });
    return;
  }
  sendPrescriptionHtml(req, res, id);
});

/** Short public URL: /rx/:id */
export const prescriptionWebRouter = Router();
prescriptionWebRouter.get('/:id', (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id) || id <= 0) {
    res.status(400).type('html').send('<h1>شناسه نامعتبر</h1>');
    return;
  }
  sendPrescriptionHtml(req, res, id);
});
