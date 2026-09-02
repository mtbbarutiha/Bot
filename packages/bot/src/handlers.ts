import type { Bot } from 'grammy';
import { InlineKeyboard } from 'grammy';
import type { UserRole } from '@petdate/shared';
import { USER_ROLE_LABELS } from '@petdate/shared';
import { registerTelegramUser, setUserRole } from './api-client';
import { config } from './config';
import { exploreKeyboard, roleKeyboard } from './keyboards';
import { setSessionRole, upsertSession } from './session';

function displayName(from: { first_name: string; last_name?: string; username?: string }): string {
  const full = [from.first_name, from.last_name].filter(Boolean).join(' ');
  return full || from.username || 'کاربر petdate';
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
      ? `سلام ${name}! 👋\n\nبه petdate خوش برگشتی.\nنقش تو: ${USER_ROLE_LABELS[user.role as UserRole]}`
      : `سلام ${name}! 👋\n\nبه petdate خوش اومدی — جایی برای پیدا کردن همبازی پت، مشاوره دامپزشک و خدمات پت.\n\nاول نقشت رو انتخاب کن:`;

    if (user.role) {
      await ctx.reply(welcome, {
        reply_markup: exploreKeyboard(config.webUrl),
      });
      return;
    }

    await ctx.reply(welcome, { reply_markup: roleKeyboard() });
  });

  bot.callbackQuery(/^role:(.+)$/, async (ctx) => {
    const role = ctx.match![1] as UserRole;
    const from = ctx.from;
    if (!from) return;

    const telegramId = String(from.id);
    const user = await setUserRole(telegramId, role);
    await setSessionRole(telegramId, role, user.id);

    const label = USER_ROLE_LABELS[role];
    const profileUrl = `${config.webUrl}/profile?from=telegram&tg=${telegramId}`;
    const onboardingUrl = `${config.webUrl}/onboarding/role?from=telegram&tg=${telegramId}`;

    await ctx.answerCallbackQuery({ text: `نقش «${label}» ثبت شد` });
    await ctx.editMessageText(
      `عالی! نقش تو «${label}» شد. 🎉\n\nبرای تکمیل پروفایل و استفاده کامل از petdate، می‌تونی از وب‌اپ ادامه بدی:`,
      {
        reply_markup: new InlineKeyboard()
          .url('🌐 تکمیل پروفایل', profileUrl)
          .row()
          .url('📝 ویزارد نقش', onboardingUrl),
      }
    );
  });

  bot.command('explore', async (ctx) => {
    await ctx.reply('همبازی‌های نزدیک رو اینجا ببین:', {
      reply_markup: exploreKeyboard(config.webUrl),
    });
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
        `🌐 ${config.webUrl}`,
      ].join('\n')
    );
  });
}
