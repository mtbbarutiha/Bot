import { normalizeIranMobile, formatIranMobileDisplay } from '@petdate/shared';
import { candooSend, isCandooConfigured, nextSrcNumber } from './candoo';

export type VetStatusSmsResult =
  | { sent: true; phone: string }
  | { sent: false; skipped: true; reason: string };

/** پیامک اطلاع فعال/غیرفعال شدن حساب دامپزشک توسط ادمین */
export async function sendVetEnabledSms(opts: {
  phone?: string | null;
  enabled: boolean;
  vetName?: string;
  customerId?: number;
}): Promise<VetStatusSmsResult> {
  if (!opts.phone) {
    return { sent: false, skipped: true, reason: 'شماره موبایل ثبت نشده' };
  }
  if (!isCandooConfigured()) {
    return { sent: false, skipped: true, reason: 'سرویس پیامک پیکربندی نشده' };
  }
  const recipient = normalizeIranMobile(opts.phone);
  if (!recipient) {
    return { sent: false, skipped: true, reason: 'شماره موبایل نامعتبر است' };
  }

  const statusLine = opts.enabled
    ? 'حساب دامپزشکی شما در همبازی فعال شد. می‌توانید دوباره آنلاین شوید و بیمار بپذیرید.'
    : 'حساب دامپزشکی شما در همبازی توسط مدیر غیرفعال شد و تا اطلاع بعدی در لیست پزشک‌ها نمایش داده نمی‌شود.';

  const body = ['همبازی', statusLine].join('\n');

  try {
    const sent = await candooSend([
      {
        srcNum: nextSrcNumber(),
        recipient,
        body,
        customerId: opts.customerId,
        type: 0,
      },
    ]);
    if (sent.ok) {
      return { sent: true, phone: formatIranMobileDisplay(recipient) };
    }
    console.error('vet enabled SMS failed:', sent.error, sent.raw);
    return {
      sent: false,
      skipped: true,
      reason: sent.error || 'ارسال پیامک ناموفق بود',
    };
  } catch (err) {
    console.error('vet enabled SMS exception:', err);
    return { sent: false, skipped: true, reason: 'خطا در ارسال پیامک' };
  }
}
