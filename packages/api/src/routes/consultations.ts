import { Router } from 'express';
import fs from 'fs';
import { QUICK_VET_COST, type VetConsultStatus } from '@petdate/shared';
import { infra } from '../config/infra';
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

  // دسکتاپ/وب: هم آنلاین‌های ربات، هم آنلاین‌های وب
  let vets = dbService
    .listOnlineVetsForQuickConnect()
    .filter((v) => v.id !== patient.id);
  if (!vets.length) {
    res.status(409).json({
      error: 'فعلاً دامپزشک آنلاینی (ربات یا وب) برای اتصال پیدا نشد. کمی بعد دوباره امتحان کن.',
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
  let notifiedTelegram = 0;
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
        if (ok) notifiedTelegram += 1;
      }
    } catch (err) {
      console.warn('create consult for vet failed:', vet.id, err);
    }
  }

  // اگر هیچ مشاوره‌ای ساخته نشد، سکه برگردد (چت وب بدون رکورد بی‌معنی است)
  if (consultations.length === 0) {
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
  const sent = consultations.length;
  res.status(201).json({
    ok: true,
    sent,
    notifiedTelegram,
    cost: QUICK_VET_COST,
    coins: updatedPatient?.coins ?? 0,
    consultations,
    message: [
      'درخواستت برای پزشک‌های آنلاین (ربات و وب) ارسال شد.',
      `پزشک‌های هدف: ${sent}`,
      notifiedTelegram > 0 ? `اعلان تلگرام: ${notifiedTelegram}` : null,
      `سکه کسر شده: ${QUICK_VET_COST}`,
      'به‌زودی یکی از دامپزشک‌ها در چت وب یا ربات جواب می‌دهد.',
    ]
      .filter(Boolean)
      .join('\n'),
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

consultationsRouter.patch('/:id/status', async (req, res) => {
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
  const previous = dbService.getVetConsultation(id);
  const updated = dbService.updateVetConsultationStatus(id, status);
  if (!updated) {
    res.status(404).json({ error: 'مشاوره پیدا نشد' });
    return;
  }

  // Bot / Telegram accept path: activate web chat for both sides
  if (status === 'active' && previous?.status === 'requested') {
    dbService.cancelSiblingVetConsultations(updated.patientUserId, updated.id);
    const existing = dbService.listVetConsultChatMessages(updated.id, { limit: 1 });
    if (!existing.length) {
      try {
        dbService.createVetConsultChatMessage({
          consultId: updated.id,
          senderUserId: updated.vetUserId,
          text: '✅ درخواست قبول شد — چت وب فعال است. می‌توانید پیام بفرستید.',
        });
      } catch {
        /* ignore seed message errors */
      }
    }
    const patient = dbService.getUserById(updated.patientUserId);
    await notifyPeerWebVetChat({
      peerTelegramId: patient?.telegramId,
      peerName: patient?.name ?? 'بیمار',
      consultId: updated.id,
      roleLabel: 'دامپزشک',
    });
  }

  res.json(updated);
});

function requireConsultParticipant(consultId: number, userId: number) {
  const consult = dbService.getVetConsultation(consultId);
  if (!consult) return { error: 'not_found' as const };
  if (consult.vetUserId !== userId && consult.patientUserId !== userId) {
    return { error: 'forbidden' as const };
  }
  return { consult };
}

async function notifyPeerWebVetChat(opts: {
  peerTelegramId?: string | null;
  peerName: string;
  consultId: number;
  roleLabel: string;
}): Promise<void> {
  const token = infra.telegram.botToken;
  const peerId = opts.peerTelegramId?.trim();
  if (!token || !peerId) return;
  const chatUrl = `${infra.web.url.replace(/\/$/, '')}/vet-chats/${opts.consultId}`;
  const canInline = (() => {
    try {
      const u = new URL(chatUrl);
      return u.protocol === 'https:';
    } catch {
      return false;
    }
  })();
  try {
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: peerId,
        text: [
          `💬 چت وب با ${opts.roleLabel} آماده است.`,
          '',
          'همین حالا از وب وارد محیط چت شو:',
          chatUrl,
        ].join('\n'),
        ...(canInline
          ? {
              reply_markup: {
                inline_keyboard: [[{ text: 'ورود به چت وب', url: chatUrl }]],
              },
            }
          : {}),
      }),
    });
  } catch (err) {
    console.warn('notify peer web vet chat failed:', (err as Error).message);
  }
}

/** قبول درخواست توسط دامپزشک از وب → فعال‌سازی چت وب برای دو طرف */
consultationsRouter.post('/:id/accept', async (req, res) => {
  const id = Number(req.params.id);
  const session = getUserFromBearer(req.header('authorization') ?? undefined);
  if (!session?.user?.id) {
    res.status(401).json({ error: 'ورود لازم است' });
    return;
  }
  if (!Number.isFinite(id) || id <= 0) {
    res.status(400).json({ error: 'شناسه نامعتبر' });
    return;
  }
  const consult = dbService.getVetConsultation(id);
  if (!consult) {
    res.status(404).json({ error: 'مشاوره پیدا نشد' });
    return;
  }
  if (consult.vetUserId !== session.user.id) {
    res.status(403).json({ error: 'فقط دامپزشک این درخواست می‌تواند قبول کند' });
    return;
  }
  if (consult.status === 'active') {
    res.json(consult);
    return;
  }
  if (consult.status !== 'requested') {
    res.status(409).json({ error: 'این درخواست دیگر قابل قبول نیست' });
    return;
  }

  const updated = dbService.updateVetConsultationStatus(id, 'active');
  if (!updated) {
    res.status(404).json({ error: 'مشاوره پیدا نشد' });
    return;
  }
  dbService.cancelSiblingVetConsultations(updated.patientUserId, updated.id);

  try {
    dbService.createVetConsultChatMessage({
      consultId: updated.id,
      senderUserId: session.user.id,
      text: '✅ درخواست قبول شد — چت وب فعال است. می‌توانید پیام بفرستید.',
    });
  } catch {
    /* ignore seed message errors */
  }

  const patient = dbService.getUserById(updated.patientUserId);
  await notifyPeerWebVetChat({
    peerTelegramId: patient?.telegramId,
    peerName: patient?.name ?? 'بیمار',
    consultId: updated.id,
    roleLabel: 'دامپزشک',
  });

  res.json(updated);
});

consultationsRouter.post('/:id/reject', (req, res) => {
  const id = Number(req.params.id);
  const session = getUserFromBearer(req.header('authorization') ?? undefined);
  if (!session?.user?.id) {
    res.status(401).json({ error: 'ورود لازم است' });
    return;
  }
  if (!Number.isFinite(id) || id <= 0) {
    res.status(400).json({ error: 'شناسه نامعتبر' });
    return;
  }
  const consult = dbService.getVetConsultation(id);
  if (!consult) {
    res.status(404).json({ error: 'مشاوره پیدا نشد' });
    return;
  }
  if (consult.vetUserId !== session.user.id) {
    res.status(403).json({ error: 'فقط دامپزشک این درخواست می‌تواند رد کند' });
    return;
  }
  if (consult.status !== 'requested') {
    res.status(409).json({ error: 'این درخواست دیگر قابل رد نیست' });
    return;
  }
  const updated = dbService.updateVetConsultationStatus(id, 'cancelled');
  res.json(updated);
});

consultationsRouter.get('/:id/messages', (req, res) => {
  const id = Number(req.params.id);
  const session = getUserFromBearer(req.header('authorization') ?? undefined);
  const userId =
    session?.user?.id ??
    (req.query.userId != null ? Number(req.query.userId) : undefined);
  if (!userId || !Number.isFinite(userId)) {
    res.status(401).json({ error: 'ورود لازم است' });
    return;
  }
  if (!Number.isFinite(id) || id <= 0) {
    res.status(400).json({ error: 'شناسه نامعتبر' });
    return;
  }
  const gate = requireConsultParticipant(id, userId);
  if (gate.error === 'not_found') {
    res.status(404).json({ error: 'مشاوره پیدا نشد' });
    return;
  }
  if (gate.error === 'forbidden') {
    res.status(403).json({ error: 'دسترسی به این چت مجاز نیست' });
    return;
  }
  const afterId = req.query.afterId != null ? Number(req.query.afterId) : undefined;
  res.json(
    dbService.listVetConsultChatMessages(id, {
      afterId: afterId != null && Number.isFinite(afterId) ? afterId : undefined,
    })
  );
});

consultationsRouter.post('/:id/messages', async (req, res) => {
  const id = Number(req.params.id);
  const session = getUserFromBearer(req.header('authorization') ?? undefined);
  const senderUserId =
    session?.user?.id ??
    (req.body?.senderUserId != null ? Number(req.body.senderUserId) : undefined);
  const text = typeof req.body?.text === 'string' ? req.body.text : '';

  if (!senderUserId || !Number.isFinite(senderUserId)) {
    res.status(401).json({ error: 'ورود لازم است' });
    return;
  }
  if (!Number.isFinite(id) || id <= 0) {
    res.status(400).json({ error: 'شناسه نامعتبر' });
    return;
  }

  const gate = requireConsultParticipant(id, senderUserId);
  if (gate.error === 'not_found') {
    res.status(404).json({ error: 'مشاوره پیدا نشد' });
    return;
  }
  if (gate.error === 'forbidden') {
    res.status(403).json({ error: 'دسترسی به این چت مجاز نیست' });
    return;
  }
  if (gate.consult.status !== 'active') {
    res.status(409).json({ error: 'چت فقط بعد از قبول درخواست فعال است' });
    return;
  }

  try {
    const message = dbService.createVetConsultChatMessage({
      consultId: id,
      senderUserId,
      text,
    });

    const peerId =
      gate.consult.vetUserId === senderUserId
        ? gate.consult.patientUserId
        : gate.consult.vetUserId;
    const peer = dbService.getUserById(peerId);
    const sender = dbService.getUserById(senderUserId);
    if (peer?.telegramId) {
      const token = infra.telegram.botToken;
      if (token) {
        const chatUrl = `${infra.web.url.replace(/\/$/, '')}/vet-chats/${id}`;
        void fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: peer.telegramId,
            text: `💬 ${sender?.name ?? 'طرف مقابل'}:\n${message.text}\n\n↩️ پاسخ در چت وب:\n${chatUrl}`,
          }),
        }).catch(() => undefined);
      }
    }

    res.status(201).json(message);
  } catch (err) {
    if (err instanceof Error && err.message === 'EMPTY_TEXT') {
      res.status(400).json({ error: 'متن پیام خالی است' });
      return;
    }
    if (err instanceof Error && err.message === 'TEXT_TOO_LONG') {
      res.status(400).json({ error: 'پیام خیلی طولانی است' });
      return;
    }
    throw err;
  }
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
