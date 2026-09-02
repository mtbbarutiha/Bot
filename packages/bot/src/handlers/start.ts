import type { Context } from 'grammy';
import type { User, UserRole } from '@petdate/shared';
import { USER_ROLE_LABELS } from '@petdate/shared';
import { getUserByTelegramId, registerTelegramUser, setUserOnboarding, setUserRole } from '../api-client';
import { roleWelcomeHint } from '../format';
import { mainMenuKeyboard, roleKeyboard, webLinksKeyboard } from '../keyboards';
import { upsertSession } from '../session';
import { webLinkHint } from '../urls';
import { startPetWizard } from './wizard';

export function displayName(from: { first_name: string; last_name?: string; username?: string }): string {
  const full = [from.first_name, from.last_name].filter(Boolean).join(' ');
  return full || from.username || 'کاربر petdate';
}

export async function getCtxUser(ctx: Context): Promise<User | null> {
  if (!ctx.from) return null;
  return getUserByTelegramId(String(ctx.from.id));
}

export async function handleStart(ctx: Context): Promise<void> {
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
    locale: 'fa',
  });

  if (!user.role) {
    await ctx.reply(
      `سلام ${name}! 👋\n\nبه **petdate** خوش اومدی — پیدا کردن همبازی پت، مشاوره دامپزشک و خدمات پت.\n\nاول **نقشت** رو انتخاب کن:`,
      { parse_mode: 'Markdown', reply_markup: roleKeyboard() }
    );
    return;
  }

  await sendWelcomeBack(ctx, user, name);
}

export async function sendWelcomeBack(ctx: Context, user: User, name: string): Promise<void> {
  const roleLabel = user.role ? USER_ROLE_LABELS[user.role as UserRole] : '';
  await ctx.reply(
    `سلام ${name}! 👋\n\nبه petdate خوش برگشتی.\nنقش: ${roleLabel}${webLinkHint()}`,
    { reply_markup: mainMenuKeyboard() }
  );
}

export async function handleRoleSelect(ctx: Context, role: UserRole): Promise<void> {
  const from = ctx.from;
  if (!from) return;

  const telegramId = String(from.id);
  const user = await setUserRole(telegramId, role);
  const label = USER_ROLE_LABELS[role];
  const hint = roleWelcomeHint(role);

  await upsertSession(telegramId, {
    userId: user.id,
    role,
    step: role === 'pet_owner' ? 'pet_name' : 'ready',
  });

  if (role !== 'pet_owner') {
    await setUserOnboarding(telegramId, 'profile_incomplete');
  }

  await ctx.answerCallbackQuery({ text: `نقش «${label}» ثبت شد` });

  const text =
    `عالی! نقش تو **«${label}»** شد. 🎉\n\n${hint}${webLinkHint()}`;

  const webKb = webLinksKeyboard(telegramId);
  await ctx.editMessageText(text, {
    parse_mode: 'Markdown',
    reply_markup: webKb,
  });

  if (role === 'pet_owner') {
    await startPetWizard(ctx, telegramId);
  } else {
    await ctx.reply('از منوی زیر استفاده کن:', { reply_markup: mainMenuKeyboard() });
  }
}

export async function handleHelp(ctx: Context): Promise<void> {
  await ctx.reply(
    [
      '🐾 **petdate** — همبازی برای پت',
      '',
      '**دستورات:**',
      '/start — شروع یا بازگشت',
      '/menu — نمایش منو',
      '/explore — کشف همبازی‌ها',
      '/pets — پت‌های من',
      '/requests — درخواست‌های همبازی',
      '/profile — پروفایل',
      '/addpet — ثبت پت جدید',
      '/cancel — لغو عملیات جاری',
      '/help — راهنما',
      '',
      'یا از دکمه‌های منو استفاده کن 👇',
    ].join('\n'),
    { parse_mode: 'Markdown', reply_markup: mainMenuKeyboard() }
  );
}

export async function handleCancel(ctx: Context): Promise<void> {
  const from = ctx.from;
  if (!from) return;

  await upsertSession(String(from.id), { step: 'ready', draftPet: undefined, selectedPetId: undefined, selectedToPetId: undefined });
  await ctx.reply('عملیات لغو شد.', { reply_markup: mainMenuKeyboard() });
}
