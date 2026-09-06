/**
 * Login / verify OTP SMS copy + origin-bound domain line for mobile autofill.
 *
 * Chrome Android Web OTP + Safari iOS 14+ origin-bound codes expect a final line:
 *   @hostname #12345
 * Keep that line alone at the end. Avoid Persian digits / emoji in the body —
 * heuristics (and some carriers) confuse them with the OTP.
 *
 * iOS Safari also needs autocomplete="one-time-code" on a single text input.
 */

const FALLBACK_HOST = 'petdate.ir';

function publicWebHost(): string {
  const raw =
    process.env.PUBLIC_WEB_URL ||
    process.env.WEB_PUBLIC_URL ||
    process.env.PUBLIC_ORIGIN ||
    process.env.APP_PUBLIC_URL ||
    process.env.WEB_URL ||
    '';
  if (raw.trim()) {
    try {
      const host = new URL(raw.includes('://') ? raw : `https://${raw}`).hostname;
      if (host) return host;
    } catch {
      /* fall through */
    }
  }
  return FALLBACK_HOST;
}

function otpDigits(code: string): string {
  return String(code ?? '').replace(/\D/g, '');
}

/** Origin-bound Web OTP / iOS line — must be the last line of the SMS. */
function domainBoundLine(host: string, digits: string): string {
  return `@${host} #${digits}`;
}

/** Human-friendly login OTP body; appends Web OTP origin line. */
export function formatLoginOtpSms(code: string): string {
  const digits = otpDigits(code);
  const host = publicWebHost();
  // Latin digits only; no emoji; no Persian/Arabic-Indic numerals in copy.
  const lines = [
    `PetDate: ${digits}`,
    'کد ورود پت‌دیت — 5 دقیقه اعتبار دارد. در اختیار کسی نگذار.',
    '',
    domainBoundLine(host, digits),
  ];
  return lines.join('\n');
}

/** Phone-verify OTP (in-app) — same autofill-friendly shape. */
export function formatPhoneVerifyOtpSms(code: string): string {
  const digits = otpDigits(code);
  const host = publicWebHost();
  const lines = [
    `PetDate: ${digits}`,
    'کد تأیید موبایل — 5 دقیقه اعتبار دارد. در اختیار کسی نگذار.',
    '',
    domainBoundLine(host, digits),
  ];
  return lines.join('\n');
}
