import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

/** Minutes shown in OTP email footer — keep in sync with web-otp TTL. */
export const OTP_EMAIL_EXPIRES_MINUTES = 5;

/** CID used for inline logo attachment in sendMail. */
export const OTP_EMAIL_LOGO_CID = 'petdate-logo';

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Absolute path to the small opaque PNG embedded in outbound mail. */
export function resolveEmailLogoPath(): string {
  const candidates = [
    join(__dirname, '..', 'assets', 'brand', 'petdate-email-logo.png'), // dist/services → dist/assets
    join(__dirname, '..', '..', 'assets', 'brand', 'petdate-email-logo.png'), // src → package assets
    join(process.cwd(), 'assets', 'brand', 'petdate-email-logo.png'),
    join(process.cwd(), 'packages', 'api', 'assets', 'brand', 'petdate-email-logo.png'),
  ];
  for (const p of candidates) {
    if (existsSync(p)) return p;
  }
  return candidates[0]!;
}

export function readEmailLogoBuffer(): Buffer | null {
  try {
    const p = resolveEmailLogoPath();
    if (!existsSync(p)) return null;
    return readFileSync(p);
  } catch {
    return null;
  }
}

/**
 * Cursor-style OTP email: off-white page, white rounded card, big code hero.
 * Table + inline CSS for Gmail; RTL Persian copy. Logo via CID (not remote URL).
 */
export function buildLoginOtpEmailHtml(code: string, opts?: { expiresMinutes?: number }): string {
  const safeCode = escapeHtml(String(code ?? '').trim());
  const minutes = opts?.expiresMinutes ?? OTP_EMAIL_EXPIRES_MINUTES;
  const minutesFa = toPersianDigits(minutes);
  const logoSrc = `cid:${OTP_EMAIL_LOGO_CID}`;

  return `<!DOCTYPE html>
<html lang="fa" dir="rtl">
<head>
<meta charset="utf-8">
<meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light">
<meta http-equiv="Content-Language" content="fa">
<title>ورود به پت‌دیت</title>
</head>
<body style="margin:0;padding:0;background:#f4f4f5;-webkit-text-size-adjust:100%;">
  <!-- فارسی — لطفاً ترجمه نکنید / Persian transactional mail -->
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f4f4f5;width:100%;" lang="fa" dir="rtl">
    <tr>
      <td align="center" style="padding:32px 16px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:440px;width:100%;background:#ffffff;border:1px solid #e8e8ea;border-radius:12px;">
          <tr>
            <td dir="rtl" lang="fa" style="padding:40px 36px 36px;font-family:Tahoma,'Segoe UI',Arial,Helvetica,sans-serif;text-align:right;color:#111111;">
              <img src="${logoSrc}" width="40" height="40" alt="پت‌دیت" style="display:block;width:40px;height:40px;border:0;border-radius:8px;margin:0 0 28px;">
              <h1 style="margin:0 0 16px;font-size:22px;line-height:1.35;font-weight:700;color:#111111;">ورود به پت‌دیت</h1>
              <p style="margin:0 0 20px;font-size:15px;line-height:1.7;font-weight:400;color:#111111;">شما درخواست ورود به پت‌دیت داده‌اید. کد یک‌بارمصرف شما:</p>
              <p dir="ltr" style="margin:0 0 28px;font-size:40px;line-height:1.2;font-weight:700;letter-spacing:0.12em;color:#111111;font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;text-align:right;">${safeCode}</p>
              <hr style="border:none;border-top:1px solid #ececee;margin:0 0 18px;">
              <p style="margin:0 0 10px;font-size:13px;line-height:1.6;color:#737373;">این کد تا ${minutesFa} دقیقه معتبر است.</p>
              <p style="margin:0;font-size:13px;line-height:1.7;color:#737373;">اگر این درخواست از طرف شما نبوده، می‌توانید این ایمیل را نادیده بگیرید. ممکن است شخص دیگری ایمیل شما را به‌اشتباه وارد کرده باشد.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export function buildLoginOtpEmailText(code: string, opts?: { expiresMinutes?: number }): string {
  const minutes = opts?.expiresMinutes ?? OTP_EMAIL_EXPIRES_MINUTES;
  const minutesFa = toPersianDigits(minutes);
  return [
    'ورود به پت‌دیت',
    '',
    'شما درخواست ورود به پت‌دیت داده‌اید. کد یک‌بارمصرف شما:',
    String(code ?? '').trim(),
    '',
    `این کد تا ${minutesFa} دقیقه معتبر است.`,
    'اگر این درخواست از طرف شما نبوده، می‌توانید این ایمیل را نادیده بگیرید.',
  ].join('\n');
}

/** Simple branded wrapper for admin test/compose (same visual language). */
export function buildBrandedMailHtml(bodyText: string, opts?: { title?: string }): string {
  const title = escapeHtml(opts?.title || 'پت‌دیت');
  const body = escapeHtml(bodyText).replace(/\n/g, '<br>');
  const logoSrc = `cid:${OTP_EMAIL_LOGO_CID}`;
  return `<!DOCTYPE html>
<html lang="fa" dir="rtl">
<head>
<meta charset="utf-8">
<meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta http-equiv="Content-Language" content="fa">
<title>${title}</title>
</head>
<body style="margin:0;padding:0;background:#f4f4f5;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f4f4f5;width:100%;" lang="fa" dir="rtl">
    <tr>
      <td align="center" style="padding:32px 16px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:440px;width:100%;background:#ffffff;border:1px solid #e8e8ea;border-radius:12px;">
          <tr>
            <td dir="rtl" lang="fa" style="padding:40px 36px 36px;font-family:Tahoma,'Segoe UI',Arial,Helvetica,sans-serif;text-align:right;color:#111111;">
              <img src="${logoSrc}" width="40" height="40" alt="پت‌دیت" style="display:block;width:40px;height:40px;border:0;border-radius:8px;margin:0 0 24px;">
              <h1 style="margin:0 0 16px;font-size:20px;line-height:1.35;font-weight:700;color:#111111;">${title}</h1>
              <div style="font-size:15px;line-height:1.7;color:#111111;">${body}</div>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function toPersianDigits(n: number): string {
  return String(n).replace(/\d/g, (d) => '۰۱۲۳۴۵۶۷۸۹'[Number(d)]!);
}
