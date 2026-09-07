/**
 * Offline checks: prescription SMS must include public HTTPS PDF download link
 * on pdf.petdate.ir (PUBLIC_PDF_URL).
 * Run: npx tsx packages/api/src/services/prescription-sms.selftest.ts
 */
import { buildPrescriptionSmsBody } from './prescription';
import {
  prescriptionPdfPublicUrl,
  prescriptionPdfPublicPath,
  prescriptionPdfWebPath,
  prescriptionPublicUrl,
  publicWebOrigin,
  publicPdfOrigin,
  prescriptionWebPath,
} from './prescription-html';

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(msg);
}

const prev = {
  PUBLIC_WEB_URL: process.env.PUBLIC_WEB_URL,
  PUBLIC_API_URL: process.env.PUBLIC_API_URL,
  PUBLIC_PDF_URL: process.env.PUBLIC_PDF_URL,
  PDF_PUBLIC_URL: process.env.PDF_PUBLIC_URL,
  WEB_URL: process.env.WEB_URL,
};

process.env.PUBLIC_WEB_URL = 'https://petdate.ir';
process.env.PUBLIC_API_URL = 'http://185.110.189.218';
process.env.PUBLIC_PDF_URL = 'https://pdf.petdate.ir';
delete process.env.WEB_URL;
delete process.env.PDF_PUBLIC_URL;

assert(publicWebOrigin() === 'https://petdate.ir', 'must prefer PUBLIC_WEB_URL over API IP');
assert(publicPdfOrigin() === 'https://pdf.petdate.ir', 'pdf origin from PUBLIC_PDF_URL');
assert(prescriptionWebPath(42) === '/rx/42', 'web path shape');
assert(prescriptionPdfWebPath(42) === '/rx/42/pdf', 'legacy pdf path shape');
assert(prescriptionPdfPublicPath(42) === '/rx/42.pdf', 'public pdf path shape');
assert(
  prescriptionPublicUrl(42) === 'https://petdate.ir/rx/42',
  `public url got ${prescriptionPublicUrl(42)}`
);
assert(
  prescriptionPdfPublicUrl(42) === 'https://pdf.petdate.ir/rx/42.pdf',
  `pdf public url got ${prescriptionPdfPublicUrl(42)}`
);

const pdfUrl = prescriptionPdfPublicUrl(42);
const webUrl = prescriptionPublicUrl(42);
const body = buildPrescriptionSmsBody({
  vetName: 'آزمایشی',
  petName: 'لوکی',
  text: 'آموکسی سیلین 50mg',
  pdfUrl,
  webUrl,
});

assert(body.includes('https://pdf.petdate.ir/rx/42.pdf'), 'SMS must include HTTPS PDF download link');
assert(body.includes('https://petdate.ir/rx/42'), 'SMS may keep readable page link');
assert(body.includes('PDF'), 'SMS must mention PDF');
assert(body.includes('دانلود'), 'SMS must say download');
assert(!body.includes('تلگرام'), 'SMS must not tell user to use Telegram for PDF');
assert(!body.includes('185.110'), 'SMS must not leak VPS IP');
assert(!/[🐾💊]/.test(body), 'SMS should avoid emoji for carrier encoding');

// Without PUBLIC_PDF_URL → default pdf.petdate.ir
delete process.env.PUBLIC_PDF_URL;
delete process.env.PDF_PUBLIC_URL;
assert(publicPdfOrigin() === 'https://pdf.petdate.ir', 'default pdf subdomain');
assert(
  prescriptionPdfPublicUrl(7) === 'https://pdf.petdate.ir/rx/7.pdf',
  'pdf url defaults to pdf.petdate.ir'
);

// IP-only PUBLIC_API_URL (no web URL) must still fall back to petdate.ir for HTML page
delete process.env.PUBLIC_WEB_URL;
delete process.env.WEB_URL;
delete process.env.WEB_PUBLIC_URL;
delete process.env.PUBLIC_ORIGIN;
delete process.env.APP_PUBLIC_URL;
process.env.PUBLIC_API_URL = 'http://185.110.189.218';
assert(publicWebOrigin() === 'https://petdate.ir', 'bare API IP must not become public base');

// restore
for (const [k, v] of Object.entries(prev)) {
  if (v === undefined) delete process.env[k];
  else process.env[k] = v;
}

console.log('prescription-sms.selftest: OK');
console.log('sample SMS:\n' + body);
