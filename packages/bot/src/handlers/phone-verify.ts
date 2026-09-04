import type { Context } from 'grammy';
import { Keyboard } from 'grammy';
import {
  formatIranMobileDisplay,
  normalizeIranMobile,
  phoneVerifyIntroText,
  toEnglishDigits,
  userHasRole,
  type User,
} from '@petdate/shared';
import { sendPhoneOtp, verifyPhoneOtp } from '../api-client';
import {
  ADMIN_MENU,
  DEFAULT_MENU,
  MAIN_MENU_ALIASES,
  MY_PETS_SECTION,
  PET_OWNER_MENU,
  SEARCH_PETS_MENU,
  VET_MENU,
  WIZARD_NAV,
  phoneWizardKeyboard,
  withWizardNav,
} from '../keyboards';
import { getSession, upsertSession } from '../session';
import { getCtxUser, menuKeyboardFor } from './helpers';

/** دکمه‌های منو نباید به‌عنوان شماره موبایل بلعیده شوند (جلوگیری از قفل شدن بات) */
const MENU_LABELS = new Set<string>([
  ...Object.values(PET_OWNER_MENU),
  ...Object.values(DEFAULT_MENU),
  ...Object.values(VET_MENU),
  ...Object.values(ADMIN_MENU),
  ...Object.values(SEARCH_PETS_MENU),
  ...Object.values(MY_PETS_SECTION),
  ...MAIN_MENU_ALIASES,
  '🛡 احراز هویت',
]);

function phoneOtpKeyboard(): Keyboard {
  return withWizardNav(new Keyboard().text('🔄 ارسال مجدد کد'), {
    noBack: true,
    skip: false,
  });
}

function phoneAskKeyboard(): Keyboard {
  return phoneWizardKeyboard();
}

/** آیا دامپزشک باید اول موبایل را تأیید کند؟ */
export function vetNeedsPhoneVerify(user: User | null | undefined): boolean {
  if (!user) return false;
  return userHasRole(user, 'vet') && !user.phoneVerified;
}

/**
 * گیت اقدامات حیاتی دامپزشک.
 * اگر موبایل تأیید نشده باشد، جریان احراز را شروع می‌کند و false برمی‌گرداند.
 */
export async function ensureVetPhoneVerified(ctx: Context): Promise<boolean> {
  const user = await getCtxUser(ctx);
  if (!vetNeedsPhoneVerify(user)) return true;

  if (ctx.callbackQuery) {
    await ctx.answerCallbackQuery({
      text: 'اول موبایلت رو تأیید کن',
      show_alert: true,
    }).catch(() => undefined);
  }

  await ctx.reply(
    [
      '📱 <b>احراز موبایل الزامی</b>',
      '',
      'برای استفاده از امکانات دامپزشکی باید شماره موبایلت رو با پیامک تأیید کنی.',
    ].join('\n'),
    { parse_mode: 'HTML' }
  );
  await handlePhoneVerifyStart(ctx, { required: true });
  return false;
}

export async function handlePhoneVerifyStart(
  ctx: Context,
  opts?: { required?: boolean }
): Promise<void> {
  const from = ctx.from;
  if (!from) return;
  const user = await getCtxUser(ctx);
  if (!user) {
    await ctx.reply('اول /start بزن.');
    return;
  }

  const telegramId = String(from.id);

  if (user.phoneVerified && user.phone) {
    await upsertSession(telegramId, {
      step: 'ready',
      pendingPhone: undefined,
    });
    await ctx.reply(
      [
        '✅ موبایلت قبلاً تأیید شده.',
        '',
        `شماره: <code>${formatIranMobileDisplay(user.phone)}</code>`,
        '',
        'اگر می‌خوای شماره جدید تأیید کنی، دوباره از منو «📱 احراز موبایل» رو بزن و شماره جدید بفرست.',
      ].join('\n'),
      {
        parse_mode: 'HTML',
        reply_markup: menuKeyboardFor(ctx, user),
      }
    );
    // Allow re-verify: still open ask flow if they continue typing
  }

  const required = opts?.required ?? vetNeedsPhoneVerify(user);
  await upsertSession(telegramId, {
    step: 'phone_verify_ask',
    pendingPhone: undefined,
    adminRejectUserId: undefined,
  });

  await ctx.reply(phoneVerifyIntroText({ required }), {
    parse_mode: 'HTML',
    reply_markup: phoneAskKeyboard(),
  });
}

export async function handlePhoneVerifyCancel(ctx: Context): Promise<void> {
  const from = ctx.from;
  if (!from) return;
  const user = await getCtxUser(ctx);
  await upsertSession(String(from.id), {
    step: 'ready',
    pendingPhone: undefined,
  });
  await ctx.reply('احراز موبایل لغو شد.', {
    reply_markup: menuKeyboardFor(ctx, user),
  });
}

/** contact share در جریان احراز موبایل */
export async function handlePhoneVerifyContact(ctx: Context): Promise<boolean> {
  const from = ctx.from;
  const contact = ctx.message?.contact;
  if (!from || !contact?.phone_number) return false;

  const telegramId = String(from.id);
  const session = await getSession(telegramId);
  if (!session || session.step !== 'phone_verify_ask') return false;

  // فقط شمارهٔ خود کاربر
  if (contact.user_id != null && contact.user_id !== from.id) {
    await ctx.reply('لطفاً شمارهٔ خودت رو اشتراک بگذار.');
    return true;
  }

  await dispatchSendOtp(ctx, telegramId, contact.phone_number);
  return true;
}

/** متن شماره یا کد OTP */
export async function handlePhoneVerifyText(ctx: Context, text: string): Promise<boolean> {
  const from = ctx.from;
  if (!from) return false;
  const telegramId = String(from.id);
  const session = await getSession(telegramId);
  if (!session) return false;

  if (session.step !== 'phone_verify_ask' && session.step !== 'phone_verify_otp') {
    return false;
  }

  if (text === WIZARD_NAV.cancel) {
    await handlePhoneVerifyCancel(ctx);
    return true;
  }

  // اگر کاربر دکمه منو زد، از گیت موبایل خارج شو تا بات قفل نشود
  // (برای دامپزشک الزامی، فقط یادآوری می‌کنیم و منو را آزاد می‌گذاریم)
  if (MENU_LABELS.has(text)) {
    const user = await getCtxUser(ctx);
    await upsertSession(telegramId, {
      step: 'ready',
      pendingPhone: undefined,
    });
    if (vetNeedsPhoneVerify(user)) {
      await ctx.reply(
        'احراز موبایل برای امکانات دامپزشکی لازم است — بعداً از منو «📱 احراز موبایل» بزن.',
        { reply_markup: menuKeyboardFor(ctx, user) }
      );
    }
    return false; // اجازه بده handler منو اجرا شود
  }

  if (session.step === 'phone_verify_ask') {
    if (text === WIZARD_NAV.skip || text === WIZARD_NAV.skipLater) {
      const user = await getCtxUser(ctx);
      if (vetNeedsPhoneVerify(user)) {
        await ctx.reply(
          'برای دامپزشکان رد کردن احراز موبایل ممکن نیست. لطفاً شماره رو بفرست.',
          { reply_markup: phoneAskKeyboard() }
        );
        return true;
      }
      await handlePhoneVerifyCancel(ctx);
      return true;
    }
    // فقط اگر شبیه شماره موبایل بود OTP بفرست؛ وگرنه منو قفل نشود
    const normalized = normalizeIranMobile(text);
    if (!normalized) {
      await ctx.reply('شماره موبایل معتبر بفرست (مثلاً 0912…) یا /cancel بزن.', {
        reply_markup: phoneAskKeyboard(),
      });
      return true;
    }
    await dispatchSendOtp(ctx, telegramId, normalized);
    return true;
  }

  // phone_verify_otp
  if (text === '🔄 ارسال مجدد کد') {
    const phone = session.pendingPhone;
    if (!phone) {
      await upsertSession(telegramId, { step: 'phone_verify_ask', pendingPhone: undefined });
      await ctx.reply('شماره پیدا نشد. دوباره شماره رو بفرست.', {
        reply_markup: phoneAskKeyboard(),
      });
      return true;
    }
    await dispatchSendOtp(ctx, telegramId, phone);
    return true;
  }

  const phone = session.pendingPhone;
  if (!phone) {
    await upsertSession(telegramId, { step: 'phone_verify_ask' });
    await ctx.reply('جلسه منقضی شده. دوباره شماره رو بفرست.', {
      reply_markup: phoneAskKeyboard(),
    });
    return true;
  }

  const code = toEnglishDigits(text).replace(/[^\d]/g, '');
  if (!/^\d{4,8}$/.test(code)) {
    await ctx.reply('کد تأیید رو به‌صورت عدد بفرست (۵ رقم).', {
      reply_markup: phoneOtpKeyboard(),
    });
    return true;
  }

  try {
    const result = await verifyPhoneOtp(telegramId, phone, code);
    if (!result.ok) {
      const reason = (result as { reason?: string; error?: string; attemptsLeft?: number }).reason;
      const attemptsLeft = (result as { attemptsLeft?: number }).attemptsLeft;
      if (reason === 'mismatch') {
        await ctx.reply(
          `کد نادرست است${attemptsLeft != null ? ` — ${attemptsLeft} تلاش باقی‌مانده` : ''}.`,
          { reply_markup: phoneOtpKeyboard() }
        );
        return true;
      }
      await upsertSession(telegramId, { step: 'phone_verify_ask', pendingPhone: undefined });
      await ctx.reply(
        reason === 'expired'
          ? 'کد منقضی شد. دوباره شماره رو بفرست تا کد جدید بیاد.'
          : reason === 'too_many'
            ? 'تعداد تلاش بیش از حد. دوباره شماره رو بفرست.'
            : 'تأیید ناموفق. دوباره شماره رو بفرست.',
        { reply_markup: phoneAskKeyboard() }
      );
      return true;
    }

    const user = result.user;
    await upsertSession(telegramId, { step: 'ready', pendingPhone: undefined });
    await ctx.reply(
      [
        '✅ <b>موبایل تأیید شد</b>',
        '',
        `شماره: <code>${formatIranMobileDisplay(user.phone || phone)}</code>`,
        '',
        userHasRole(user, 'vet')
          ? 'الان می‌تونی از امکانات دامپزشکی استفاده کنی.'
          : 'مرسی! پروفایلت قابل اعتمادتر شد.',
      ].join('\n'),
      {
        parse_mode: 'HTML',
        reply_markup: menuKeyboardFor(ctx, user),
      }
    );
  } catch (err) {
    console.error('verifyPhoneOtp failed:', err);
    await ctx.reply('خطا در تأیید کد. کمی بعد دوباره تلاش کن.', {
      reply_markup: phoneOtpKeyboard(),
    });
  }
  return true;
}

async function dispatchSendOtp(
  ctx: Context,
  telegramId: string,
  phoneRaw: string
): Promise<void> {
  const normalized = normalizeIranMobile(phoneRaw);
  if (!normalized) {
    await ctx.reply(
      'شماره نامعتبره. مثل ۰۹۱۲۳۴۵۶۷۸۹ بفرست یا دکمهٔ اشتراک شماره رو بزن.',
      { reply_markup: phoneAskKeyboard() }
    );
    return;
  }

  try {
    const result = await sendPhoneOtp(telegramId, normalized);
    if (!result.ok) {
      const reason = result.reason;
      if (reason === 'cooldown') {
        await ctx.reply(
          `کمی صبر کن${result.retryAfterSec ? ` (حدود ${result.retryAfterSec} ثانیه)` : ''} و دوباره درخواست کد بده.`,
          { reply_markup: phoneOtpKeyboard() }
        );
        return;
      }
      await ctx.reply(
        result.error ||
          (reason === 'not_configured'
            ? 'سرویس پیامک فعلاً در دسترس نیست.'
            : 'ارسال پیامک ناموفق بود. کمی بعد دوباره تلاش کن.'),
        { reply_markup: phoneAskKeyboard() }
      );
      return;
    }

    await upsertSession(telegramId, {
      step: 'phone_verify_otp',
      pendingPhone: result.phone,
    });

    await ctx.reply(
      [
        '📩 کد تأیید برات پیامک شد.',
        '',
        `شماره: <code>${formatIranMobileDisplay(result.phone)}</code>`,
        'کد ۵ رقمی رو اینجا بفرست.',
        'اعتبار کد حدود ۵ دقیقه است.',
      ].join('\n'),
      {
        parse_mode: 'HTML',
        reply_markup: phoneOtpKeyboard(),
      }
    );
  } catch (err) {
    console.error('sendPhoneOtp failed:', err);
    await ctx.reply(
      'ارتباط با سرور برقرار نشد یا سرویس پیامک قطع است. کمی بعد دوباره از منو «📱 احراز موبایل» رو بزن.',
      { reply_markup: phoneAskKeyboard() }
    );
  }
}
