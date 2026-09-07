import { SITE } from '@petdate/shared';

/** Minutes shown in OTP email footer — keep in sync with web-otp TTL. */
export const OTP_EMAIL_EXPIRES_MINUTES = 5;

const LOGO_URL = `${SITE.origin}/brand/petdate-mark-192.png`;

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Cursor-style OTP email: off-white page, white rounded card, big code hero.
 * Table + inline CSS for Gmail; RTL Persian copy.
 */
export function buildLoginOtpEmailHtml(code: string, opts?: { expiresMinutes?: number }): string {
  const safeCode = escapeHtml(String(code ?? '').trim());
  const minutes = opts?.expiresMinutes ?? OTP_EMAIL_EXPIRES_MINUTES;
  const minutesFa = toPersianDigits(minutes);
  const logoUrl = escapeHtml(LOGO_URL);

  return `<!DOCTYPE html>
<html lang="fa" dir="rtl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light">
<title>ورود به پت‌دیت</title>
</head>
<body style="margin:0;padding:0;background:#f4f4f5;-webkit-text-size-adjust:100%;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f4f4f5;width:100%;">
    <tr>
      <td align="center" style="padding:32px 16px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:440px;width:100%;background:#ffffff;border:1px solid #e8e8ea;border-radius:12px;">
          <tr>
            <td dir="rtl" style="padding:40px 36px 36px;font-family:Tahoma,Arial,Helvetica,sans-serif;text-align:right;color:#111111;">
              <img src="${logoUrl}" width="40" height="40" alt="پت‌دیت" style="display:block;width:40px;height:40px;border:0;border-radius:8px;margin:0 0 28px;">
              <h1 style="margin:0 0 16px;font-size:22px;line-height:1.35;font-weight:700;color:#111111;">ورود به پت‌دیت</h1>
              <p style="margin:0 0 20px;font-size:15px;line-height:1.7;font-weight:400;color:#111111;">شما درخواست ورود به پت‌دیت داده‌اید. کد یک‌بارمصرف شما:</p>
              <p style="margin:0 0 28px;font-size:40px;line-height:1.2;font-weight:700;letter-spacing:0.12em;color:#111111;font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;">${safeCode}</p>
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
  const logoUrl = escapeHtml(LOGO_URL);
  return `<!DOCTYPE html>
<html lang="fa" dir="rtl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${title}</title>
</head>
<body style="margin:0;padding:0;background:#f4f4f5;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f4f4f5;width:100%;">
    <tr>
      <td align="center" style="padding:32px 16px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:440px;width:100%;background:#ffffff;border:1px solid #e8e8ea;border-radius:12px;">
          <tr>
            <td dir="rtl" style="padding:40px 36px 36px;font-family:Tahoma,Arial,Helvetica,sans-serif;text-align:right;color:#111111;">
              <img src="${logoUrl}" width="40" height="40" alt="پت‌دیت" style="display:block;width:40px;height:40px;border:0;border-radius:8px;margin:0 0 24px;">
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
