/**
 * Create prescription: PDF + medical record + optional Candoo SMS.
 */
import path from 'path';
import { normalizeIranMobile, formatIranMobileDisplay } from '@petdate/shared';
import { dbService } from '../db';
import { candooSendWithSrcFallback, isCandooConfigured } from './candoo';
import { generatePrescriptionPdf, prescriptionsDir } from './prescription-pdf';

export type CreatePrescriptionInput = {
  consultId: number;
  vetUserId: number;
  petId: number;
  text: string;
};

export type SmsDeliveryStatus =
  | { sent: true; phone: string }
  | { sent: false; skipped: true; reason: string };

export type CreatePrescriptionResult = {
  prescription: NonNullable<ReturnType<typeof dbService.getPrescription>>;
  pdfPath: string;
  sms: SmsDeliveryStatus;
  patient: NonNullable<ReturnType<typeof dbService.getUserById>>;
  vet: NonNullable<ReturnType<typeof dbService.getUserById>>;
  pet: NonNullable<ReturnType<typeof dbService.getPet>>;
};

function buildSmsBody(opts: {
  vetName: string;
  petName: string;
  text: string;
}): string {
  const abbrev = opts.text.replace(/\s+/g, ' ').trim().slice(0, 280);
  const parts = [
    'پت دیت دکتر',
    `نسخه دارویی برای «${opts.petName}» توسط دکتر ${opts.vetName} صادر شد.`,
    'فایل PDF را در تلگرام ربات پت دیت دریافت کنید.',
  ];
  if (abbrev.length <= 120) {
    parts.push(`دارو: ${abbrev}`);
  }
  let body = parts.join('\n');
  if (body.length > 880) {
    body = body.slice(0, 877) + '...';
  }
  return body;
}

export async function createPrescriptionWithDelivery(
  input: CreatePrescriptionInput
): Promise<
  | { ok: true; result: CreatePrescriptionResult }
  | { ok: false; status: number; error: string }
> {
  const text = String(input.text ?? '').trim();
  if (!text) {
    return { ok: false, status: 400, error: 'متن نسخه الزامی است' };
  }
  if (text.length > 8000) {
    return { ok: false, status: 400, error: 'متن نسخه خیلی طولانی است' };
  }

  const consult = dbService.getVetConsultation(input.consultId);
  if (!consult) {
    return { ok: false, status: 404, error: 'مشاوره پیدا نشد' };
  }
  if (consult.vetUserId !== input.vetUserId) {
    return { ok: false, status: 403, error: 'فقط دامپزشک این مشاوره می‌تواند نسخه بنویسد' };
  }

  const vet = dbService.getUserById(input.vetUserId);
  const patient = dbService.getUserById(consult.patientUserId);
  const pet = dbService.getPet(input.petId);
  if (!vet || !patient || !pet) {
    return { ok: false, status: 404, error: 'دامپزشک، بیمار یا پت پیدا نشد' };
  }
  if (pet.ownerId !== patient.id) {
    return { ok: false, status: 400, error: 'این پت متعلق به بیمار مشاوره نیست' };
  }

  const access = dbService.canAccessPetMedical(pet.id, vet.id);
  if (!access.ok) {
    return { ok: false, status: 403, error: 'دسترسی به پرونده این پت ندارید' };
  }

  // Persist first (without pdf), then generate file, then update path
  let prescription = dbService.createPrescription({
    consultId: consult.id,
    petId: pet.id,
    vetUserId: vet.id,
    patientUserId: patient.id,
    text,
  });

  const fileName = `rx-${prescription.id}-${Date.now()}.pdf`;
  const pdfPath = path.join(prescriptionsDir(), fileName);

  try {
    await generatePrescriptionPdf(
      {
        vetName: vet.name,
        patientName: patient.name,
        petName: pet.name,
        petSpecies: pet.species,
        petBreed: pet.breed,
        medicationText: text,
        dateIso: prescription.createdAt,
        prescriptionId: prescription.id,
      },
      pdfPath
    );
  } catch (err) {
    console.error('prescription PDF failed:', err);
    return { ok: false, status: 500, error: 'ساخت PDF ناموفق بود' };
  }

  prescription = dbService.updatePrescriptionPdfPath(prescription.id, pdfPath) ?? prescription;

  // Update medical record medications + clinical entry (attributed to vet)
  const prevMeds = dbService.getPetMedicalRecord(pet.id).medications;
  const medStamp = new Date().toISOString().slice(0, 10);
  const nextMeds = prevMeds
    ? `${prevMeds}\n---\n[${medStamp}] ${text}`
    : `[${medStamp}] ${text}`;
  dbService.upsertPetMedicalRecord(
    pet.id,
    { medications: nextMeds.slice(0, 4000) },
    {
      userId: vet.id,
      name: vet.name,
      consultId: consult.id,
      // نسخه خودش یک ثبت بالینی جدا دارد — از تکرار فیلد جلوگیری می‌کنیم
      appendEntries: false,
    }
  );
  dbService.addPetMedicalEntry({
    petId: pet.id,
    authorUserId: vet.id,
    authorName: vet.name,
    consultId: consult.id,
    text: `💊 نسخه:\n${text}`,
  });

  // SMS if verified phone
  let sms: SmsDeliveryStatus;
  if (!patient.phoneVerified || !patient.phone) {
    sms = {
      sent: false,
      skipped: true,
      reason: 'بیمار موبایل تأییدشده ندارد',
    };
  } else if (!isCandooConfigured()) {
    sms = {
      sent: false,
      skipped: true,
      reason: 'سرویس پیامک پیکربندی نشده',
    };
  } else {
    const recipient = normalizeIranMobile(patient.phone);
    if (!recipient) {
      sms = {
        sent: false,
        skipped: true,
        reason: 'شماره موبایل بیمار نامعتبر است',
      };
    } else {
      const body = buildSmsBody({
        vetName: vet.name,
        petName: pet.name,
        text,
      });
      const sent = await candooSendWithSrcFallback({
        recipient,
        body,
        customerId: patient.id,
        type: 0,
      });
      if (sent.ok) {
        sms = { sent: true, phone: formatIranMobileDisplay(recipient) };
      } else {
        console.error('prescription SMS failed:', sent.error, sent.raw, 'src=', sent.srcNum);
        sms = {
          sent: false,
          skipped: true,
          reason: sent.error || 'ارسال پیامک ناموفق بود',
        };
      }
    }
  }

  return {
    ok: true,
    result: {
      prescription,
      pdfPath,
      sms,
      patient,
      vet,
      pet,
    },
  };
}
