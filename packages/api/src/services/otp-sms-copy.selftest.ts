/**
 * Offline checks for OTP SMS shape (iOS / Web OTP autofill).
 * Run: npx tsx packages/api/src/services/otp-sms-copy.selftest.ts
 */
import { formatLoginOtpSms, formatPhoneVerifyOtpSms } from './otp-sms-copy';

function assert(cond: unknown, msg: string): void {
  if (!cond) throw new Error(msg);
}

const prev = process.env.PUBLIC_WEB_URL;
process.env.PUBLIC_WEB_URL = 'https://petdate.ir';

const login = formatLoginOtpSms('04217');
const lines = login.split('\n');
assert(lines[lines.length - 1] === '@petdate.ir #04217', `last line must be domain-bound: ${lines[lines.length - 1]}`);
assert(login.includes('04217'), 'login SMS must include code');
assert(!/[۰-۹٠-٩]/.test(login), 'SMS must not contain Persian/Arabic-Indic digits');
assert(!login.includes('🐾'), 'SMS must not include emoji (carrier encoding risk)');
assert(login.endsWith('@petdate.ir #04217'), 'must end with origin-bound line');

const verify = formatPhoneVerifyOtpSms('99881');
assert(verify.split('\n').pop() === '@petdate.ir #99881', 'verify SMS last line');
assert(!/[۰-۹٠-٩🐾]/.test(verify), 'verify SMS clean of Indic digits/emoji');

delete process.env.PUBLIC_WEB_URL;
delete process.env.WEB_PUBLIC_URL;
delete process.env.PUBLIC_ORIGIN;
delete process.env.APP_PUBLIC_URL;
delete process.env.WEB_URL;
const fallback = formatLoginOtpSms('11111');
assert(fallback.endsWith('@petdate.ir #11111'), 'fallback host petdate.ir');

if (prev !== undefined) process.env.PUBLIC_WEB_URL = prev;

console.log('otp-sms-copy.selftest: OK');
console.log('sample:\n' + formatLoginOtpSms('12345'));
