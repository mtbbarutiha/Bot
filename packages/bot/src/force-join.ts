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

export async function safeAnswerCallback(
  ctx: Context,
  opts?: { text?: string; show_alert?: boolean }
): Promise<void> {
  if (!ctx.callbackQuery) return;
  try {
    await ctx.answerCallbackQuery(opts);
  } catch {
    /* query expired / already answered */
  }
}

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
    // error را بلاک نمی‌کنیم تا ربات قفل نشود (مثلاً rate-limit موقت)
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
  _errors: RequiredChannel[] = []
): Promise<void> {
  const channels = missing.length ? missing : requiredChannels();

  const lines = [
    '🔒 عضویت اجباری',
    '',
    'برای استفاده از petdate باید عضو کانال بشی:',
    '',
    ...requiredChannels().map((c) => `📢 ${c.title}: ${c.url}`),
    '',
    missing.length ? `هنوز عضو نیستی:\n${missing.map((c) => `• ${c.title}`).join('\n')}\n` : '',
    'بعد از عضویت، دکمه «عضو شدم» رو بزن 👇',
  ].filter((line) => line !== '');

  const kb = forceJoinKeyboard(channels);
  const text = lines.join('\n');

  if (ctx.callbackQuery) {
    try {
      await ctx.editMessageText(text, { reply_markup: kb });
      return;
    } catch {
      /* fall through */
    }
  }
  try {
    await ctx.reply(text, { reply_markup: kb });
  } catch (err) {
    console.error('force-join prompt failed:', (err as Error).message);
  }
}

/** true = می‌تواند ادامه دهد */
export async function ensureForceJoined(ctx: Context): Promise<boolean> {
  if (!ctx.from) return false;
  const { missing } = await missingChannels(ctx);
  if (missing.length === 0) return true;
  await sendForceJoinPrompt(ctx, missing);
  return false;
}

/**
 * Middleware: تا عضویت در کانال‌های اجباری، بقیهٔ بات را مسدود می‌کند
 * (به‌جز دکمه بررسی عضویت).
 * خطای API چک عضویت باعث قفل کامل نمی‌شود.
 */
export async function forceJoinMiddleware(ctx: Context, next: NextFunction): Promise<void> {
  if (!ctx.from) return next();

  const data = ctx.callbackQuery?.data;
  if (data === 'join:check') return next();

  const { missing } = await missingChannels(ctx);
  if (missing.length === 0) return next();

  await safeAnswerCallback(ctx, { text: 'اول عضو کانال شو', show_alert: true });
  await sendForceJoinPrompt(ctx, missing);
}
