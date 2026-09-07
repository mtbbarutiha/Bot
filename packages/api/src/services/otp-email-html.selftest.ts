import assert from 'node:assert/strict';
import {
  OTP_EMAIL_EXPIRES_MINUTES,
  buildBrandedMailHtml,
  buildLoginOtpEmailHtml,
  buildLoginOtpEmailText,
} from './otp-email-html';

const html = buildLoginOtpEmailHtml('41941');
assert(html.includes('dir="rtl"'), 'OTP HTML must be RTL');
assert(html.includes('ورود به پت‌دیت'), 'OTP HTML must include Persian title');
assert(html.includes('41941'), 'OTP HTML must include code');
assert(html.includes('font-size:40px'), 'OTP code must be hero-sized');
assert(html.includes('petdate-mark-192.png'), 'OTP HTML must use PetDate brand mark');
assert(html.includes('۵ دقیقه') || html.includes(String(OTP_EMAIL_EXPIRES_MINUTES)), 'expiry copy');
assert(!html.toLowerCase().includes('cursor'), 'must not use Cursor branding');
assert(html.includes('border-radius:12px'), 'card rounded corners');

const text = buildLoginOtpEmailText('41941');
assert(text.includes('41941'), 'plain text must include code');
assert(text.includes('ورود به پت‌دیت'), 'plain text title');

const branded = buildBrandedMailHtml('سلام\nتست', { title: 'تست ارسال' });
assert(branded.includes('تست ارسال'), 'branded title');
assert(branded.includes('سلام<br>تست'), 'branded newlines');
assert(branded.includes('petdate-mark-192.png'), 'branded logo');

console.log('otp-email-html.selftest: ok');
