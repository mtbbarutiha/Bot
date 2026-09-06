/**
 * Login / verify OTP SMS copy + Web OTP domain line for mobile autofill.
 *
 * Chrome Android Web OTP expects a final line like:
 *   @hostname #12345
 * iOS Safari picks up codes when the input has autocomplete="one-time-code".
 */

function publicWebHost(): string | null {
  const raw =
    process.env.PUBLIC_WEB_URL ||
    process.env.WEB_PUBLIC_URL ||
    process.env.PUBLIC_ORIGIN ||
    process.env.APP_PUBLIC_URL ||
    '';
  if (!raw.trim()) return null;
  try {
    const host = new URL(raw.includes('://') ? raw : `https://${raw}`).hostname;
    return host || null;
  } catch {
    return null;
  }
}

/** Human-friendly login OTP body; appends Web OTP origin line when host is known. */
export function formatLoginOtpSms(code: string): string {
  const digits = String(code ?? '').replace(/\D/g, '');
  const lines = [
    'پت‌دیت 🐾',
    `کد ورود شما: ${digits}`,
    '۵ دقیقه اعتبار دارد — در اختیار کسی نگذار.',
  ];
  const host = publicWebHost();
  if (host && digits) {
    lines.push('');
    lines.push(`@${host} #${digits}`);
  }
  return lines.join('\n');
}

/** Phone-verify OTP (in-app) — same autofill-friendly shape. */
export function formatPhoneVerifyOtpSms(code: string): string {
  const digits = String(code ?? '').replace(/\D/g, '');
  const lines = [
    'پت‌دیت 🐾',
    `کد تأیید موبایل: ${digits}`,
    '۵ دقیقه اعتبار دارد — در اختیار کسی نگذار.',
  ];
  const host = publicWebHost();
  if (host && digits) {
    lines.push('');
    lines.push(`@${host} #${digits}`);
  }
  return lines.join('\n');
}
