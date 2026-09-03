import type { Context } from 'grammy';
import type { User, UserRole } from '@petdate/shared';
import { USER_ROLE_LABELS } from '@petdate/shared';
import { getUserByTelegramId, registerTelegramUser, setUserOnboarding, setUserRole } from '../api-client';
import { sendWelcomeLogo } from '../branding';
import { roleWelcomeHint } from '../format';
import { mainMenuKeyboard, roleKeyboard, webLinksKeyboard } from '../keyboards';
import { upsertSession } from '../session';
import { webLinkHint } from '../urls';

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
    role: user.role,
    step: user.role ? 'ready' : 'role_select',
    locale: 'fa',
  });

  if (!user.role) {
    const caption =
      `سلام ${name}! 👋\n\nبه **petdate** خوش اومدی — پیدا کردن همبازی پت، مشاوره دامپزشک و خدمات پت.\n\nاول **نقشت** رو انتخاب کن:`;
    const sent = await sendWelcomeLogo(ctx, caption, { reply_markup: roleKeyboard() });
    if (!sent) {
      await ctx.reply(caption, { parse_mode: 'Markdown', reply_markup: roleKeyboard() });
    }
    return;
  }

  await sendWelcomeBack(ctx, user, name);
}

export async function sendWelcomeBack(ctx: Context, user: User, name: string): Promise<void> {
  const roleLabel = user.role ? USER_ROLE_LABELS[user.role as UserRole] : '';
  const isOwner = user.role === 'pet_owner';
  const intro = isOwner
    ? 'از منوی زیر می‌تونی همبازی پیدا کنی، پت‌هات رو مدیریت کنی و از خدمات استفاده کنی.'
    : 'از منوی زیر استفاده کن.';

  const caption =
    `سلام ${name}! 👋\n\nبه **petdate** خوش برگشتی.\nنقش: ${roleLabel}\n\n${intro}${webLinkHint()}`;

  const sent = await sendWelcomeLogo(ctx, caption, { reply_markup: mainMenuKeyboard(user.role) });
  if (!sent) {
    await ctx.reply(caption, {
      parse_mode: 'Markdown',
      reply_markup: mainMenuKeyboard(user.role),
    });
  }
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
    step: 'ready',
  });

  await setUserOnboarding(telegramId, role === 'pet_owner' ? 'profile_incomplete' : 'profile_incomplete');

  await ctx.answerCallbackQuery({ text: `نقش «${label}» ثبت شد` });

  const text = `عالی! نقش تو **«${label}»** شد. 🎉\n\n${hint}${webLinkHint()}`;
  const webKb = webLinksKeyboard(telegramId);

  try {
    if (ctx.callbackQuery?.message && 'photo' in ctx.callbackQuery.message) {
      await ctx.editMessageCaption({ caption: text, parse_mode: 'Markdown', reply_markup: webKb });
    } else {
      await ctx.editMessageText(text, { parse_mode: 'Markdown', reply_markup: webKb });
    }
  } catch {
    await ctx.reply(text, { parse_mode: 'Markdown', reply_markup: webKb });
  }

  if (role === 'pet_owner') {
    await ctx.reply(
      'منوی صاحب پت آماده است 👇\n\nاگر هنوز پت ثبت نکردی، از «🐾 پت‌های من» شروع کن.',
      { reply_markup: mainMenuKeyboard('pet_owner') }
    );
  } else {
    await ctx.reply('از منوی زیر استفاده کن:', { reply_markup: mainMenuKeyboard(role) });
  }
}

export async function handleHelp(ctx: Context): Promise<void> {
  const user = await getCtxUser(ctx);
  const isOwner = user?.role === 'pet_owner';

  const lines = isOwner
    ? [
        '🐾 **petdate** — راهنمای صاحب پت',
        '',
        '🔍 **پیدا کردن همبازی** — پت‌های نزدیک برای بازی',
        '👤 **پروفایل خودم** — اطلاعات حساب',
        '🐾 **پت‌های من** — مدیریت و ثبت پت',
        '🪙 **سکه** — موجودی و خرید سکه',
        '🩺 **پزشکی** — سلامت و کلینیک',
        '🎁 **معرفی به دوستان** — دعوت و پاداش',
        '⚡ **ارتباط سریع با پزشک** — مشاوره فوری',
        '🛒 **پت شاپ** — خرید لوازم',
        '🛠 **خدمات** — مربی، نگهبان، grooming',
        '',
        '/start — بازگشت به منو',
        '/cancel — لغو عملیات جاری',
      ]
    : [
        '🐾 **petdate** — همبازی برای پت',
        '',
        '/start — شروع یا بازگشت',
        '/menu — نمایش منو',
        '/explore — کشف همبازی‌ها',
        '/pets — پت‌های من',
        '/profile — پروفایل',
        '/help — راهنما',
      ];

  await ctx.reply(lines.join('\n'), {
    parse_mode: 'Markdown',
    reply_markup: mainMenuKeyboard(user?.role),
  });
}

export async function handleCancel(ctx: Context): Promise<void> {
  const from = ctx.from;
  if (!from) return;

  const user = await getCtxUser(ctx);
  await upsertSession(String(from.id), {
    step: 'ready',
    draftPet: undefined,
    selectedPetId: undefined,
    selectedToPetId: undefined,
  });
  await ctx.reply('عملیات لغو شد.', { reply_markup: mainMenuKeyboard(user?.role) });
}

export async function handleMenu(ctx: Context): Promise<void> {
  const user = await getCtxUser(ctx);
  await ctx.reply('منوی petdate 👇', { reply_markup: mainMenuKeyboard(user?.role) });
}
