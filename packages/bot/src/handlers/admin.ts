import type { Context } from 'grammy';
import {
  approveVetCredential,
  listPendingVerifications,
  listPendingVetCredentials,
  rejectVetCredential,
} from '../api-client';
import {
  checkAdminPassword,
  hasConfiguredAdminIds,
  isTelegramAdmin,
} from '../config';
import { isAdminAuthorized, requireAdminAuth } from './admin-auth';

export { isAdminAuthorized, requireAdminAuth } from './admin-auth';
import {
  ADMIN_MENU,
  adminPanelKeyboard,
  adminVetCredentialKeyboard,
} from '../keyboards';
import { getSession, upsertSession } from '../session';
import { getCtxUser, menuKeyboardFor } from './helpers';
import { handleAdminVerifyQueue } from './verification';

function escapeHtml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export async function showAdminPanel(ctx: Context): Promise<void> {
  await ctx.reply(
    [
      '🛠 <b>پنل ادمین</b>',
      '',
      'از دکمه‌های زیر برای مدیریت صف‌ها استفاده کن.',
    ].join('\n'),
    { parse_mode: 'HTML', reply_markup: adminPanelKeyboard() }
  );
}

/** /admin یا دکمه منو */
export async function handleAdminEntry(ctx: Context): Promise<void> {
  const from = ctx.from;
  if (!from) return;

  if (isTelegramAdmin(from.id) || (await isAdminAuthorized(ctx))) {
    await showAdminPanel(ctx);
    return;
  }

  if (hasConfiguredAdminIds()) {
    await ctx.reply('این بخش فقط برای ادمین است.');
    return;
  }

  await upsertSession(String(from.id), { step: 'admin_password' });
  await ctx.reply('رمز پنل ادمین را وارد کن:');
}

export async function handleAdminPasswordText(ctx: Context, text: string): Promise<boolean> {
  const from = ctx.from;
  if (!from) return false;
  const session = await getSession(String(from.id));
  if (!session || session.step !== 'admin_password') return false;

  if (!checkAdminPassword(text)) {
    await upsertSession(String(from.id), { step: 'ready' });
    await ctx.reply('رمز نادرست بود.');
    return true;
  }

  await upsertSession(String(from.id), {
    step: 'ready',
    adminAuthed: true,
  });
  await ctx.reply('✅ ورود ادمین موفق.');
  await showAdminPanel(ctx);
  return true;
}

export async function handleAdminStats(ctx: Context): Promise<void> {
  if (!(await requireAdminAuth(ctx))) return;
  let face = 0;
  let vet = 0;
  try {
    face = (await listPendingVerifications()).length;
  } catch (err) {
    console.error('admin stats face queue failed:', err);
  }
  try {
    vet = (await listPendingVetCredentials()).length;
  } catch (err) {
    console.error('admin stats vet queue failed:', err);
  }
  await ctx.reply(
    [
      '📊 <b>وضعیت صف‌ها</b>',
      '',
      `🛡 احراز چهره: <b>${face}</b>`,
      `📄 مدارک دامپزشک: <b>${vet}</b>`,
    ].join('\n'),
    { parse_mode: 'HTML', reply_markup: adminPanelKeyboard() }
  );
}

export async function handleAdminBackToMenu(ctx: Context): Promise<void> {
  const user = await getCtxUser(ctx);
  await ctx.reply('منوی اصلی 👇', { reply_markup: menuKeyboardFor(ctx, user) });
}

function formatVetCard(user: Awaited<ReturnType<typeof listPendingVetCredentials>>[number]): string {
  const loc = [user.province, user.city].filter(Boolean).join('، ') || '—';
  return [
    '📄 <b>درخواست مدرک دامپزشکی</b>',
    '',
    `<b>نام:</b> ${escapeHtml(user.name)}`,
    user.username ? `<b>یوزرنیم:</b> @${escapeHtml(user.username)}` : null,
    `<b>آیدی:</b> <code>${user.id}</code>`,
    user.telegramId ? `<b>تلگرام:</b> <code>${escapeHtml(user.telegramId)}</code>` : null,
    `<b>شهر:</b> ${escapeHtml(loc)}`,
  ]
    .filter((l) => l !== null)
    .join('\n');
}

async function sendVetCredentialItem(
  ctx: Context,
  user: Awaited<ReturnType<typeof listPendingVetCredentials>>[number]
): Promise<void> {
  const caption = formatVetCard(user);
  const kb = adminVetCredentialKeyboard(user.id);
  const fileId = user.vetCredentialFileId;
  if (fileId) {
    try {
      await ctx.replyWithPhoto(fileId, { caption, parse_mode: 'HTML', reply_markup: kb });
      return;
    } catch {
      /* try document */
    }
    try {
      await ctx.replyWithDocument(fileId, { caption, parse_mode: 'HTML', reply_markup: kb });
      return;
    } catch {
      /* fall through */
    }
  }
  await ctx.reply(`${caption}\n\n⚠️ فایل در دسترس نیست.`, {
    parse_mode: 'HTML',
    reply_markup: kb,
  });
}

export async function handleAdminVetCredentialQueue(ctx: Context): Promise<void> {
  if (!(await requireAdminAuth(ctx))) return;
  let pending: Awaited<ReturnType<typeof listPendingVetCredentials>>;
  try {
    pending = await listPendingVetCredentials();
  } catch (err) {
    console.error('listPendingVetCredentials failed:', err);
    await ctx.reply('خطا در دریافت صف مدارک.');
    return;
  }
  if (pending.length === 0) {
    await ctx.reply('📭 صف مدارک دامپزشک خالی است.', { reply_markup: adminPanelKeyboard() });
    return;
  }
  await ctx.reply(`📋 ${pending.length} مدرک در صف بررسی:`, { reply_markup: adminPanelKeyboard() });
  await sendVetCredentialItem(ctx, pending[0]!);
  if (pending.length > 1) {
    await ctx.reply(`+ ${pending.length - 1} مورد دیگر — «⏭ بعدی» را بزن.`);
  }
}

export async function handleAdminVetCredentialNext(ctx: Context): Promise<void> {
  await handleAdminVetCredentialQueue(ctx);
}

export async function handleAdminVetCredentialApprove(ctx: Context, userId: number): Promise<void> {
  if (!(await requireAdminAuth(ctx))) return;
  let result: Awaited<ReturnType<typeof approveVetCredential>>;
  try {
    result = await approveVetCredential(userId);
  } catch (err) {
    console.error('approveVetCredential failed:', err);
    await ctx.answerCallbackQuery({ text: 'خطا یا دیگر در صف نیست', show_alert: true }).catch(() => undefined);
    return;
  }
  await ctx.answerCallbackQuery({ text: 'مدرک تأیید شد ✅' }).catch(() => undefined);
  try {
    await ctx.editMessageReplyMarkup({ reply_markup: { inline_keyboard: [] } });
  } catch {
    /* ignore */
  }
  const user = result.user;
  await ctx.reply(`✅ مدرک ${escapeHtml(user.name)} (#${user.id}) تأیید شد.`, { parse_mode: 'HTML' });
  if (user.telegramId) {
    try {
      await ctx.api.sendMessage(user.telegramId, '✅ مدرک دامپزشکی‌ات تأیید شد.');
    } catch (err) {
      console.warn('notify vet approve failed:', err);
    }
  }
}

export async function handleAdminVetCredentialReject(ctx: Context, userId: number): Promise<void> {
  if (!(await requireAdminAuth(ctx))) return;
  let result: Awaited<ReturnType<typeof rejectVetCredential>>;
  try {
    result = await rejectVetCredential(userId);
  } catch (err) {
    console.error('rejectVetCredential failed:', err);
    await ctx.answerCallbackQuery({ text: 'خطا یا دیگر در صف نیست', show_alert: true }).catch(() => undefined);
    return;
  }
  await ctx.answerCallbackQuery({ text: 'مدرک رد شد' }).catch(() => undefined);
  try {
    await ctx.editMessageReplyMarkup({ reply_markup: { inline_keyboard: [] } });
  } catch {
    /* ignore */
  }
  const user = result.user;
  await ctx.reply(`❌ مدرک ${escapeHtml(user.name)} (#${user.id}) رد شد.`, { parse_mode: 'HTML' });
  if (user.telegramId) {
    try {
      await ctx.api.sendMessage(
        user.telegramId,
        '❌ مدرک دامپزشکی‌ات رد شد. از پروفایل دوباره آپلود کن.'
      );
    } catch (err) {
      console.warn('notify vet reject failed:', err);
    }
  }
}

/** هندل دکمه‌های کیبورد پنل ادمین */
export async function handleAdminMenuText(ctx: Context, text: string): Promise<boolean> {
  const m = ADMIN_MENU;
  switch (text) {
    case m.panel:
      await handleAdminEntry(ctx);
      return true;
    case m.faceQueue:
      if (!(await requireAdminAuth(ctx))) return true;
      await handleAdminVerifyQueue(ctx);
      return true;
    case m.vetQueue:
      await handleAdminVetCredentialQueue(ctx);
      return true;
    case m.stats:
      await handleAdminStats(ctx);
      return true;
    case m.back:
    case m.menu:
      await handleAdminBackToMenu(ctx);
      return true;
    default:
      return false;
  }
}
