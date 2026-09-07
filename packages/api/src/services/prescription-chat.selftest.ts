/**
 * Offline checks: prescription chat caption always includes PDF download link
 * and uses clear no-phone messaging (chat is primary when SMS cannot send).
 * Run: npx tsx packages/api/src/services/prescription-chat.selftest.ts
 */
import { buildPrescriptionChatCaption } from './prescription-chat';

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(msg);
}

const pdfUrl = 'https://pdf.petdate.ir/rx/42.pdf';

const withSms = buildPrescriptionChatCaption({
  prescriptionId: 42,
  petName: 'لوکی',
  pdfPublicUrl: pdfUrl,
  webUrl: 'https://petdate.ir/rx/42',
  sms: { sent: true, phone: '0912***67', pdfUrl, webUrl: 'https://petdate.ir/rx/42' },
});
assert(withSms.includes(pdfUrl), 'caption must include PDF URL');
assert(withSms.includes('نسخه صادر شد'), 'caption must say issued');
assert(withSms.includes('پیامک'), 'when SMS sent, mention SMS');
assert(!withSms.includes('شماره موبایل ثبت نشده'), 'no no-phone line when SMS sent');

const noPhone = buildPrescriptionChatCaption({
  prescriptionId: 42,
  petName: 'لوکی',
  pdfPublicUrl: pdfUrl,
  sms: {
    sent: false,
    skipped: true,
    reason: 'بیمار شماره موبایل ثبت‌شده ندارد — نسخه در چت مشاوره ارسال می‌شود',
    pdfUrl,
  },
});
assert(noPhone.includes('نسخه صادر شد — دانلود PDF:'), 'primary no-phone line shape');
assert(noPhone.includes(pdfUrl), 'no-phone caption must include PDF URL');
assert(noPhone.includes('همین چت'), 'no-phone must say delivered in chat');
assert(!noPhone.includes('آموکسی'), 'caption must not include med details');

const smsFailed = buildPrescriptionChatCaption({
  prescriptionId: 7,
  pdfPublicUrl: 'https://pdf.petdate.ir/rx/7.pdf',
  sms: {
    sent: false,
    skipped: true,
    failed: true,
    reason: 'ارسال پیامک ناموفق بود',
  },
});
assert(smsFailed.includes('پیامک ارسال نشد'), 'provider failure still shown');
assert(smsFailed.includes('https://pdf.petdate.ir/rx/7.pdf'), 'still includes PDF link');

console.log('prescription-chat.selftest: OK');
console.log('sample no-phone caption:\n' + noPhone);
