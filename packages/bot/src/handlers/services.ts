import type { Context } from 'grammy';
import { InlineKeyboard } from 'grammy';
import { mainMenuKeyboard } from '../keyboards';
import { getCtxUser } from './start';

export async function handleCoins(ctx: Context): Promise<void> {
  const user = await getCtxUser(ctx);
  const balance = new Intl.NumberFormat('fa-IR').format(user?.coins ?? 0);
  await ctx.reply(
    [
      '🪙 **سکه petdate**',
      '',
      `موجودی فعلی: **${balance} سکه**`,
      '',
      'با سکه می‌تونی:',
      '• درخواست همبازی ویژه',
      '• مشاوره دامپزشک',
      '• تخفیف پت‌شاپ',
      '',
      '_خرید سکه به‌زودی فعال می‌شه._',
    ].join('\n'),
    { parse_mode: 'Markdown', reply_markup: mainMenuKeyboard(user?.role) }
  );
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
  await ctx.reply('منوی اصلی 👇', { reply_markup: mainMenuKeyboard(user?.role) });
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
          `https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent('بیا تو petdate همبازی برای پتت پیدا کن! 🐾')}`
        )
        .success(),
    }
  );
  await ctx.reply('منوی اصلی 👇', { reply_markup: mainMenuKeyboard(user?.role) });
}

export async function handleQuickVet(ctx: Context): Promise<void> {
  const user = await getCtxUser(ctx);
  await ctx.reply(
    [
      '⚡ **ارتباط سریع با پزشک**',
      '',
      'دامپزشک آنلاین در دسترسه.',
      '',
      'نوع مشاوره رو انتخاب کن:',
    ].join('\n'),
    {
      parse_mode: 'Markdown',
      reply_markup: new InlineKeyboard()
        .text('💬 چت متنی', 'vet:chat')
        .primary()
        .row()
        .text('📞 تماس صوتی', 'vet:call')
        .primary()
        .row()
        .text('📹 ویدیو کال', 'vet:video')
        .success(),
    }
  );
  await ctx.reply('منوی اصلی 👇', { reply_markup: mainMenuKeyboard(user?.role) });
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
  await ctx.reply('منوی اصلی 👇', { reply_markup: mainMenuKeyboard(user?.role) });
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
  await ctx.reply('منوی اصلی 👇', { reply_markup: mainMenuKeyboard(user?.role) });
}

export async function handleComingSoon(ctx: Context, feature: string): Promise<void> {
  await ctx.answerCallbackQuery({ text: `${feature} به‌زودی فعال می‌شه 🐾`, show_alert: true });
}
