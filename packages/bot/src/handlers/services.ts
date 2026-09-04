import type { Context } from 'grammy';
import { InlineKeyboard } from 'grammy';
import {
  createVetConsultation,
  creditUserCoins,
  debitUserCoins,
  listVerifiedVets,
} from '../api-client';
import { QUICK_VET_COST, formatNum } from '../economy';
import { mainMenuKeyboard } from '../keyboards';
import { getCtxUser } from './helpers';

export async function handleCoins(ctx: Context): Promise<void> {
  const { handleCoins: coinsHandler } = await import('./coins');
  return coinsHandler(ctx);
}

export async function handleMedical(ctx: Context): Promise<void> {
  const user = await getCtxUser(ctx);
  await ctx.reply(
    [
      '🩺 **پزشکی پت**',
      '',
      'خدمات پزشکی:',
      '• پرونده سلامت پت',
      '• یادآور واکسیناسیون',
      '• نزدیک‌ترین کلینیک‌ها',
      '• مشاوره آنلاین',
      '',
      'یکی رو انتخاب کن:',
    ].join('\n'),
    {
      parse_mode: 'Markdown',
      reply_markup: new InlineKeyboard()
        .text('📋 پرونده سلامت', 'medical:record')
        .primary()
        .row()
        .text('💉 یادآور واکسن', 'medical:vaccine')
        .primary()
        .row()
        .text('🏥 کلینیک‌های نزدیک', 'medical:clinics')
        .primary()
        .row()
        .text('💬 مشاوره آنلاین', 'medical:consult')
        .success(),
    }
  );
  await ctx.reply('منوی اصلی 👇', { reply_markup: mainMenuKeyboard(user?.role, user?.roles) });
}

export async function handleInviteFriends(ctx: Context): Promise<void> {
  const user = await getCtxUser(ctx);
  const botUsername = process.env.TELEGRAM_BOT_USERNAME ?? 'Petdatebot';
  const link = `https://t.me/${botUsername}?start=ref_${user?.id ?? '0'}`;

  await ctx.reply(
    [
      '🎁 **معرفی به دوستان**',
      '',
      'دوستات رو به petdate دعوت کن و سکه بگیر!',
      '',
      `لینک دعوت تو:`,
      link,
      '',
      'به ازای هر دوست که ثبت‌نام کنه، **۵۰ سکه** هدیه می‌گیری.',
    ].join('\n'),
    {
      parse_mode: 'Markdown',
      reply_markup: new InlineKeyboard()
        .url(
          '📤 اشتراک‌گذاری لینک',
          `https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent(`بیا تو petdate همبازی برای پتت پیدا کن! 🐾\nPLAY • MEET • FRIENDS`)}`
        )
        .success(),
    }
  );
  await ctx.reply('منوی اصلی 👇', { reply_markup: mainMenuKeyboard(user?.role, user?.roles) });
}

export async function handleQuickVet(ctx: Context): Promise<void> {
  const user = await getCtxUser(ctx);
  await ctx.reply(
    [
      '⚡ <b>ارتباط سریع با پزشک</b>',
      '',
      'دامپزشک آنلاین در دسترسه.',
      `هزینه اتصال فوری: <b>${formatNum(QUICK_VET_COST)}</b> سکه`,
      '',
      'نوع مشاوره رو انتخاب کن:',
    ].join('\n'),
    {
      parse_mode: 'HTML',
      reply_markup: new InlineKeyboard()
        .text('🩺 به یه پزشک آنلاین وصلم کن', 'vet:connect')
        .success()
        .row()
        .text('💬 چت متنی', 'vet:chat')
        .primary()
        .row()
        .text('📞 تماس صوتی', 'vet:call')
        .primary()
        .row()
        .text('📹 ویدیو کال', 'vet:video')
        .primary(),
    }
  );
  await ctx.reply('منوی اصلی 👇', { reply_markup: mainMenuKeyboard(user?.role, user?.roles) });
}

/** اتصال فوری: کسر ۱ سکه و ارسال درخواست به همه دامپزشک‌های احرازشده */
export async function handleQuickVetConnect(ctx: Context): Promise<void> {
  const from = ctx.from;
  if (!from) return;
  const user = await getCtxUser(ctx);
  if (!user) {
    await ctx.answerCallbackQuery({ text: 'اول /start بزن', show_alert: true });
    return;
  }

  const telegramId = String(from.id);
  const balance = user.coins ?? 0;
  if (balance < QUICK_VET_COST) {
    await ctx.answerCallbackQuery({
      text: `سکه کافی نیست (موجودی: ${balance})`,
      show_alert: true,
    });
    await ctx.reply(
      `برای اتصال سریع حداقل ${formatNum(QUICK_VET_COST)} سکه لازم داری.\nموجودی: ${formatNum(balance)} — از منو «🪙 سکه» بگیر.`,
      { reply_markup: mainMenuKeyboard(user.role, user.roles) }
    );
    return;
  }

  let vets: Awaited<ReturnType<typeof listVerifiedVets>> = [];
  try {
    vets = await listVerifiedVets();
  } catch (err) {
    console.error('listVerifiedVets failed:', err);
    await ctx.answerCallbackQuery({ text: 'خطا در یافتن پزشک', show_alert: true });
    return;
  }

  // خود کاربر اگر دامپزشک است، از لیست حذف شود
  vets = vets.filter((v) => v.id !== user.id && v.telegramId);

  if (!vets.length) {
    await ctx.answerCallbackQuery({ text: 'پزشک آنلاینی نیست', show_alert: true });
    await ctx.reply(
      'فعلاً دامپزشک احرازشده‌ای آنلاین نیست.\nبعداً دوباره امتحان کن.',
      { reply_markup: mainMenuKeyboard(user.role, user.roles) }
    );
    return;
  }

  try {
    await debitUserCoins(telegramId, QUICK_VET_COST);
  } catch (err) {
    console.error('debit for quick vet failed:', err);
    await ctx.answerCallbackQuery({ text: 'سکه کافی نیست', show_alert: true });
    return;
  }

  await ctx.answerCallbackQuery({ text: 'درخواست ارسال شد' });

  let sent = 0;
  for (const vet of vets) {
    try {
      await createVetConsultation({
        vetUserId: vet.id,
        patientUserId: user.id,
        notes: 'اتصال سریع آنلاین',
      });
      if (vet.telegramId) {
        try {
          await ctx.api.sendMessage(
            vet.telegramId,
            [
              '📬 <b>درخواست مشاوره سریع</b>',
              '',
              `بیمار: <b>${escapeHtml(user.name)}</b>`,
              user.city ? `شهر: ${escapeHtml(user.city)}` : null,
              '',
              'از منو «📋 بیماران / مشاوره‌ها» می‌تونی ببینی.',
              'برای شروع مشاوره به بیمار پیام بده یا قبول کن.',
            ]
              .filter(Boolean)
              .join('\n'),
            {
              parse_mode: 'HTML',
              reply_markup: new InlineKeyboard()
                .text('✅ دیدم', `vet:consult:ack:${user.id}`)
                .success(),
            }
          );
          sent += 1;
        } catch {
          /* blocked */
        }
      }
    } catch (err) {
      console.warn('create consult for vet failed:', vet.id, err);
    }
  }

  if (sent === 0) {
    try {
      await creditUserCoins(telegramId, QUICK_VET_COST);
    } catch {
      /* ignore */
    }
    await ctx.reply(
      'ارسال به پزشک‌ها ناموفق بود؛ سکه‌ات برگشت داده شد.',
      { reply_markup: mainMenuKeyboard(user.role, user.roles) }
    );
    return;
  }

  await ctx.reply(
    [
      '✅ درخواستت برای پزشک‌های آنلاین ارسال شد.',
      '',
      `پزشک‌های مطلع‌شده: ${formatNum(sent)}`,
      `سکه کسر شده: ${formatNum(QUICK_VET_COST)}`,
      '',
      'به‌زودی یکی از دامپزشک‌ها باهات هماهنگ می‌کنه.',
    ].join('\n'),
    { reply_markup: mainMenuKeyboard(user.role, user.roles) }
  );
}

function escapeHtml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export async function handlePetShop(ctx: Context): Promise<void> {
  const user = await getCtxUser(ctx);
  await ctx.reply(
    [
      '🛒 **پت شاپ**',
      '',
      'دسته‌بندی‌ها:',
      '• 🍖 غذا و خوراک',
      '• 🧸 اسباب‌بازی',
      '• 🧴 بهداشتی',
      '• 🛏️ لوازم نگهداری',
      '',
      '_فروشگاه به‌زودی کامل می‌شه._',
    ].join('\n'),
    {
      parse_mode: 'Markdown',
      reply_markup: new InlineKeyboard()
        .text('🍖 غذا', 'shop:food')
        .primary()
        .text('🧸 اسباب‌بازی', 'shop:toys')
        .primary()
        .row()
        .text('🧴 بهداشتی', 'shop:hygiene')
        .primary()
        .text('🛏️ لوازم', 'shop:supplies')
        .primary(),
    }
  );
  await ctx.reply('منوی اصلی 👇', { reply_markup: mainMenuKeyboard(user?.role, user?.roles) });
}

export async function handleServices(ctx: Context): Promise<void> {
  const user = await getCtxUser(ctx);
  await ctx.reply(
    [
      '🛠 **خدمات petdate**',
      '',
      '• 🎓 مربی‌گری و آموزش',
      '• 🏡 نگهداری موقت (pet sitter)',
      '• ✂️ آرایش و grooming',
      '• 🚗 حمل‌ونقل پت',
      '• 📸 عکاسی پت',
      '',
      '_رزرو خدمات به‌زودی فعال می‌شه._',
    ].join('\n'),
    {
      parse_mode: 'Markdown',
      reply_markup: new InlineKeyboard()
        .text('🎓 مربی', 'svc:trainer')
        .primary()
        .text('🏡 نگهبان', 'svc:sitter')
        .primary()
        .row()
        .text('✂️ آرایش', 'svc:groom')
        .primary()
        .text('🚗 حمل', 'svc:transport')
        .primary(),
    }
  );
  await ctx.reply('منوی اصلی 👇', { reply_markup: mainMenuKeyboard(user?.role, user?.roles) });
}

export async function handleComingSoon(ctx: Context, feature: string): Promise<void> {
  await ctx.answerCallbackQuery({ text: `${feature} به‌زودی فعال می‌شه 🐾`, show_alert: true });
}
