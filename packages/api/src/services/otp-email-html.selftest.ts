import assert from 'node:assert/strict';
import {
  OTP_EMAIL_EXPIRES_MINUTES,
  OTP_EMAIL_LOGO_CID,
  buildBrandedMailHtml,
  buildLoginOtpEmailHtml,
  buildLoginOtpEmailText,
  readEmailLogoBuffer,
} from './otp-email-html';

const html = buildLoginOtpEmailHtml('41941');
assert(html.includes('dir="rtl"'), 'OTP HTML must be RTL');
assert(html.includes('lang="fa"'), 'OTP HTML must declare fa');
assert(html.includes('ورود به پت‌دیت'), 'OTP HTML must include Persian title');
assert(html.includes('41941'), 'OTP HTML must include code');
assert(html.includes('font-size:40px'), 'OTP code must be hero-sized');
assert(html.includes(`cid:${OTP_EMAIL_LOGO_CID}`), 'OTP HTML must use CID logo (not remote URL)');
assert(!html.includes('https://'), 'OTP HTML must not hotlink remote assets');
assert(html.includes('۵ دقیقه') || html.includes(String(OTP_EMAIL_EXPIRES_MINUTES)), 'expiry copy');

const text = buildLoginOtpEmailText('41941');
assert(text.includes('ورود به پت‌دیت'), 'plain text title');
assert(!/\bPetDate\b/i.test(text), 'plain text must stay Persian (no English brand)');

const branded = buildBrandedMailHtml('سلام\nتست', { title: 'تست ارسال' });
assert(branded.includes(`cid:${OTP_EMAIL_LOGO_CID}`), 'branded mail uses CID logo');
assert(branded.includes('lang="fa"'), 'branded mail declares fa');

const logo = readEmailLogoBuffer();
assert(logo && logo.length > 100, 'email logo PNG must exist on disk');

console.log('otp-email-html.selftest: ok');
