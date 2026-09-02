import type { Bot } from 'grammy';
import type { UserRole } from '@petdate/shared';
import { USER_ROLE_LABELS } from '@petdate/shared';
import { registerTelegramUser, setUserRole } from './api-client';
import { exploreKeyboard, profileLinksKeyboard, roleKeyboard } from './keyboards';
import { setSessionRole, upsertSession } from './session';
import { effectiveWebUrl, webLinkHint } from './urls';

function displayName(from: { first_name: string; last_name?: string; username?: string }): string {
  const full = [from.first_name, from.last_name].filter(Boolean).join(' ');
  return full || from.username || 'کاربر petdate';
}

function replyMarkup<T extends { reply_markup?: unknown }>(markup: unknown, options: T): T {
  if (markup) {
    return { ...options, reply_markup: markup };
  }
  return options;
}

export function registerHandlers(bot: Bot): void {
  bot.command('start', async (ctx) => {
    const from = ctx.from;
    if (!from) return;

    const telegramId = String(from.id);
    const name = displayName(from);

    const user = await registerTelegramUser({
      telegramId,
      name,
      username: from.username,
    });

    await upsertSession(telegramId, {
      userId: user.id,
      step: user.role ? 'ready' : 'role_select',
      locale: from.language_code?.startsWith('fa') ? 'fa' : 'fa',
    });

    const welcome = user.role
      ? `سلام ${name}! 👋\n\nبه petdate خوش برگشتی.\nنقش تو: ${USER_ROLE_LABELS[user.role as UserRole]}${webLinkHint()}`
      : `سلام ${name}! 👋\n\nبه petdate خوش اومدی — جایی برای پیدا کردن همبازی پت، مشاوره دامپزشک و خدمات پت.\n\nاول نقشت رو انتخاب کن:`;

    if (user.role) {
      await ctx.reply(welcome, replyMarkup(exploreKeyboard(), {}));
      return;
    }

    await ctx.reply(welcome, { reply_markup: roleKeyboard() });
  });

  bot.callbackQuery(/^role:(.+)$/, async (ctx) => {
    const role = ctx.match![1] as UserRole;
    const from = ctx.from;
    if (!from) return;

    const telegramId = String(from.id);

    try {
      const user = await setUserRole(telegramId, role);
      await setSessionRole(telegramId, role, user.id);

      const label = USER_ROLE_LABELS[role];
      const text =
        `عالی! نقش تو «${label}» شد. 🎉\n\n` +
        `برای تکمیل پروفایل و استفاده کامل از petdate، می‌تونی از وب‌اپ ادامه بدی:${webLinkHint()}`;

      await ctx.answerCallbackQuery({ text: `نقش «${label}» ثبت شد` });
      await ctx.editMessageText(text, replyMarkup(profileLinksKeyboard(telegramId), {}));
    } catch (err) {
      console.error('Role selection failed:', err);
      await ctx.answerCallbackQuery({ text: 'خطا در ثبت نقش. دوباره /start بزن.', show_alert: true });
    }
  });

  bot.command('explore', async (ctx) => {
    const hint = webLinkHint();
    await ctx.reply(
      hint ? `همبازی‌های نزدیک رو در وب‌اپ ببین:${hint}` : 'همبازی‌های نزدیک رو اینجا ببین:',
      replyMarkup(exploreKeyboard(), {})
    );
  });

  bot.command('help', async (ctx) => {
    await ctx.reply(
      [
        '🐾 petdate — همبازی برای پت',
        '',
        '/start — شروع یا بازگشت',
        '/explore — کشف همبازی‌ها',
        '/help — راهنما',
        '',
        `🌐 ${effectiveWebUrl()}`,
      ].join('\n')
    );
  });
}
