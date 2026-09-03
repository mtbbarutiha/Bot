import type { Context, NextFunction } from 'grammy';
import { InlineKeyboard } from 'grammy';
import { config } from './config';

export type RequiredChannel = {
  username: string;
  title: string;
  url: string;
};

/** کانال‌های اجباری برای استفاده از بات (فعلاً فقط petdate) */
export function requiredChannels(): RequiredChannel[] {
  const petdate = config.forceJoinPetdateChannel ?? 'petdating';
  return [
    {
      username: petdate.replace(/^@/, ''),
      title: 'کانال petdate',
      url: `https://t.me/${petdate.replace(/^@/, '')}`,
    },
  ];
}

const MEMBER_OK = new Set(['creator', 'administrator', 'member', 'restricted']);

export async function isMemberOfChannel(
  ctx: Context,
  channelUsername: string
): Promise<'yes' | 'no' | 'error'> {
  const userId = ctx.from?.id;
  if (!userId) return 'no';
  const chatId = channelUsername.startsWith('@') ? channelUsername : `@${channelUsername}`;
  try {
    const member = await ctx.api.getChatMember(chatId, userId);
    return MEMBER_OK.has(member.status) ? 'yes' : 'no';
  } catch (err) {
    const msg = (err as { description?: string }).description ?? (err as Error).message;
    console.warn(`force-join check failed for ${chatId}:`, msg);
    return 'error';
  }
}

export async function missingChannels(ctx: Context): Promise<{
  missing: RequiredChannel[];
  errors: RequiredChannel[];
}> {
  const missing: RequiredChannel[] = [];
  const errors: RequiredChannel[] = [];
  for (const ch of requiredChannels()) {
    const status = await isMemberOfChannel(ctx, ch.username);
    if (status === 'no') missing.push(ch);
    if (status === 'error') errors.push(ch);
  }
  return { missing, errors };
}

export function forceJoinKeyboard(channels: RequiredChannel[]): InlineKeyboard {
  const kb = new InlineKeyboard();
  channels.forEach((ch) => {
    kb.url(`📢 عضویت در ${ch.title}`, ch.url).row();
  });
  kb.text('✅ عضو شدم — بررسی', 'join:check').success();
  return kb;
}

export async function sendForceJoinPrompt(
  ctx: Context,
  missing: RequiredChannel[],
  errors: RequiredChannel[] = []
): Promise<void> {
  const all = [...missing];
  for (const e of errors) {
    if (!all.some((c) => c.username === e.username)) all.push(e);
  }

  const lines = [
    '🔒 **عضویت اجباری**',
    '',
    'برای استفاده از petdate باید عضو **هر دو کانال** بشی:',
    '',
    ...requiredChannels().map((c, i) => `${i + 1}. [${c.title}](${c.url})`),
    '',
    missing.length
      ? `هنوز عضو این‌ها نیستی:\n${missing.map((c) => `• ${c.title}`).join('\n')}`
      : null,
    errors.length
      ? '\n_اگر بعد از عضویت باز هم خطا دیدی، ادمین باید ربات را در کانال ادمین کند._'
      : null,
    '',
    'بعد از عضویت، دکمه «عضو شدم» رو بزن 👇',
  ].filter(Boolean);

  const kb = forceJoinKeyboard(all.length ? all : requiredChannels());

  if (ctx.callbackQuery) {
    try {
      await ctx.editMessageText(lines.join('\n'), {
        parse_mode: 'Markdown',
        link_preview_options: { is_disabled: true },
        reply_markup: kb,
      });
      return;
    } catch {
      /* fall through */
    }
  }
  await ctx.reply(lines.join('\n'), {
    parse_mode: 'Markdown',
    link_preview_options: { is_disabled: true },
    reply_markup: kb,
  });
}

/** true = کاربر عضو هر دو کانال است و می‌تواند ادامه دهد */
export async function ensureForceJoined(ctx: Context): Promise<boolean> {
  if (!ctx.from) return false;
  const { missing, errors } = await missingChannels(ctx);
  if (missing.length === 0 && errors.length === 0) return true;
  await sendForceJoinPrompt(ctx, missing, errors);
  return false;
}

/**
 * Middleware: همه آپدیت‌ها را تا عضویت در کانال‌ها مسدود می‌کند
 * (به‌جز دکمه بررسی عضویت).
 */
export async function forceJoinMiddleware(ctx: Context, next: NextFunction): Promise<void> {
  if (!ctx.from) return next();

  const data = ctx.callbackQuery?.data;
  if (data === 'join:check') return next();

  const { missing, errors } = await missingChannels(ctx);
  if (missing.length === 0 && errors.length === 0) return next();

  if (ctx.callbackQuery) {
    await ctx.answerCallbackQuery({ text: 'اول عضو کانال‌ها شو', show_alert: true });
  }
  await sendForceJoinPrompt(ctx, missing, errors);
}
