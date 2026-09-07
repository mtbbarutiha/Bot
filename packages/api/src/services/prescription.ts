/**
 * Create prescription: PDF + medical record + optional Candoo SMS with HTTPS PDF download link.
 */
import path from 'path';
import { normalizeIranMobile, formatIranMobileDisplay } from '@petdate/shared';
import { dbService } from '../db';
import { candooSendWithSrcFallback, isCandooConfigured } from './candoo';
import { generatePrescriptionPdf, prescriptionsDir } from './prescription-pdf';
import {
  prescriptionPdfPublicUrl,
  prescriptionPublicUrl,
} from './prescription-html';

export type CreatePrescriptionInput = {
  consultId: number;
  vetUserId: number;
  petId: number;
  text: string;
};

export type SmsDeliveryStatus =
  | { sent: true; phone: string; pdfUrl: string; webUrl: string }
  | { sent: false; skipped: true; reason: string; pdfUrl?: string; webUrl?: string };

export type CreatePrescriptionResult = {
  prescription: NonNullable<ReturnType<typeof dbService.getPrescription>>;
  pdfPath: string;
  /** Public HTML page: https://petdate.ir/rx/{id} */
  webUrl: string;
  /** Direct PDF download: https://petdate.ir/rx/{id}/pdf */
  pdfPublicUrl: string;
  sms: SmsDeliveryStatus;
  patient: NonNullable<ReturnType<typeof dbService.getUserById>>;
  vet: NonNullable<ReturnType<typeof dbService.getUserById>>;
  pet: NonNullable<ReturnType<typeof dbService.getPet>>;
};

/**
 * Exported for selftest — Persian SMS with public HTTPS PDF download link.
 * Prefer the direct /rx/{id}/pdf URL so the patient can open the file immediately.
 */
export function buildPrescriptionSmsBody(opts: {
  vetName: string;
  petName: string;
  text: string;
  pdfUrl: string;
  webUrl?: string;
}): string {
  const abbrev = opts.text.replace(/\s+/g, ' ').trim().slice(0, 200);
  const parts = [
    'پت دیت دکتر',
    `نسخه دارویی برای «${opts.petName}» توسط دکتر ${opts.vetName} صادر شد.`,
    'دانلود فایل PDF:',
    opts.pdfUrl,
  ];
  if (opts.webUrl && opts.webUrl !== opts.pdfUrl) {
    parts.push(`مشاهده نسخه: ${opts.webUrl}`);
  }
  if (abbrev.length <= 80) {
    parts.push(`دارو: ${abbrev}`);
  }
  let body = parts.join('\n');
  if (body.length > 880) {
    body = body.slice(0, 877) + '...';
  }
  return body;
}

function maskPhone(phone: string): string {
  const d = String(phone).replace(/\D/g, '');
  if (d.length < 6) return '***';
  return `${d.slice(0, 4)}***${d.slice(-2)}`;
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

  const access = dbService.canAccessPetMedical(pet.id, vet.id, { write: true });
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

  const webUrl = prescriptionPublicUrl(prescription.id);
  const pdfPublicUrl = prescriptionPdfPublicUrl(prescription.id);

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

  // SMS if verified phone — include HTTPS PDF download link under petdate.ir
  let sms: SmsDeliveryStatus;
  if (!patient.phoneVerified || !patient.phone) {
    console.warn(
      `[prescription] SMS skipped: no verified phone (patientId=${patient.id} rx=${prescription.id} pdf=${pdfPublicUrl})`
    );
    sms = {
      sent: false,
      skipped: true,
      reason: 'بیمار موبایل تأییدشده ندارد',
      pdfUrl: pdfPublicUrl,
      webUrl,
    };
  } else if (!isCandooConfigured()) {
    console.warn(
      `[prescription] SMS skipped: Candoo not configured (rx=${prescription.id} pdf=${pdfPublicUrl})`
    );
    sms = {
      sent: false,
      skipped: true,
      reason: 'سرویس پیامک پیکربندی نشده',
      pdfUrl: pdfPublicUrl,
      webUrl,
    };
  } else {
    const recipient = normalizeIranMobile(patient.phone);
    if (!recipient) {
      console.warn(
        `[prescription] SMS skipped: invalid phone (patientId=${patient.id} rx=${prescription.id})`
      );
      sms = {
        sent: false,
        skipped: true,
        reason: 'شماره موبایل بیمار نامعتبر است',
        pdfUrl: pdfPublicUrl,
        webUrl,
      };
    } else {
      const body = buildPrescriptionSmsBody({
        vetName: vet.name,
        petName: pet.name,
        text,
        pdfUrl: pdfPublicUrl,
        webUrl,
      });
      const sent = await candooSendWithSrcFallback({
        recipient,
        body,
        customerId: patient.id,
        type: 0,
      });
      if (sent.ok) {
        console.info(
          `[prescription] SMS sent rx=${prescription.id} to=${maskPhone(recipient)} pdf=${pdfPublicUrl}`
        );
        sms = {
          sent: true,
          phone: formatIranMobileDisplay(recipient),
          pdfUrl: pdfPublicUrl,
          webUrl,
        };
      } else {
        console.error(
          'prescription SMS failed:',
          sent.error,
          sent.raw,
          'src=',
          sent.srcNum,
          'to=',
          maskPhone(recipient),
          'pdf=',
          pdfPublicUrl
        );
        sms = {
          sent: false,
          skipped: true,
          reason: sent.error || 'ارسال پیامک ناموفق بود',
          pdfUrl: pdfPublicUrl,
          webUrl,
        };
      }
    }
  }

  return {
    ok: true,
    result: {
      prescription,
      pdfPath,
      webUrl,
      pdfPublicUrl,
      sms,
      patient,
      vet,
      pet,
    },
  };
}
