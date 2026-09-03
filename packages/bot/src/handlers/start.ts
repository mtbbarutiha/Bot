import type { Context } from 'grammy';
import type { User, UserRole } from '@petdate/shared';
import {
  BRAND,
  ROLE_CONFIRM_LABEL,
  USER_ROLE_LABELS,
  normalizeRoles,
  primaryRole,
  userHasRole,
} from '@petdate/shared';
import {
  getUserByTelegramId,
  registerTelegramUser,
  setUserOnboarding,
  setUserRoles,
} from '../api-client';
import { sendWelcomeLogo } from '../branding';
import { roleWelcomeHint } from '../format';
import { mainMenuKeyboard, roleKeyboard, roleReplyKeyboard, webLinksKeyboard } from '../keyboards';
import { getSession, upsertSession } from '../session';
import { webLinkHint } from '../urls';

export function displayName(from: { first_name: string; last_name?: string; username?: string }): string {
  const full = [from.first_name, from.last_name].filter(Boolean).join(' ');
  return full || from.username || `کاربر ${BRAND.name}`;
}

export async function getCtxUser(ctx: Context): Promise<User | null> {
  if (!ctx.from) return null;
  return getUserByTelegramId(String(ctx.from.id));
}

function roleLabels(user: User): string {
  const roles = normalizeRoles(user.roles, user.role);
  if (!roles.length) return '—';
  return roles.map((r) => USER_ROLE_LABELS[r]).join(' · ');
}

export async function handleStart(ctx: Context): Promise<void> {
  const from = ctx.from;
  if (!from) return;

  const telegramId = String(from.id);
  const name = displayName(from);

  try {
    const user = await registerTelegramUser({
      telegramId,
      name,
      username: from.username,
    });

    const roles = normalizeRoles(user.roles, user.role);
    await upsertSession(telegramId, {
      userId: user.id,
      role: user.role,
      draftRoles: roles,
      step: roles.length ? 'ready' : 'role_select',
      locale: 'fa',
    });

    if (!roles.length) {
      const caption = [
        `سلام ${name}! 👋`,
        '',
        `${BRAND.welcomeFa}`,
        `_${BRAND.taglineEn}_`,
        '',
        'پیدا کردن همبازی پت، مشاوره دامپزشک و خدمات پت.',
        '',
        'می‌تونی **چند نقش** انتخاب کنی.',
        'نقش‌ها رو از منو تیک بزن، بعد «✅ ثبت نقش‌ها» رو بزن:',
      ].join('\n');
      const sent = await sendWelcomeLogo(ctx, caption, {
        reply_markup: roleReplyKeyboard([]),
      });
      if (!sent) {
        await ctx.reply(caption, { parse_mode: 'Markdown', reply_markup: roleReplyKeyboard([]) });
      }
      return;
    }

    await sendWelcomeBack(ctx, user, name);
  } catch (error) {
    console.error('start failed:', error);
    await ctx.reply('فعلاً سرور همبازی در دسترس نیست. چند لحظه بعد دوباره /start بزن.');
  }
}

export async function sendWelcomeBack(ctx: Context, user: User, name: string): Promise<void> {
  const isOwner = userHasRole(user, 'pet_owner');
  const intro = isOwner
    ? 'از منوی زیر می‌تونی همبازی پیدا کنی، پت‌هات رو مدیریت کنی و از خدمات استفاده کنی.'
    : 'از منوی زیر استفاده کن.';

  const caption = [
    `سلام ${name}! 👋`,
    '',
    `به **${BRAND.name}** خوش برگشتی.`,
    `_${BRAND.taglineEn}_`,
    `نقش‌ها: ${roleLabels(user)}`,
    '',
    `${intro}${webLinkHint()}`,
  ].join('\n');

  const sent = await sendWelcomeLogo(ctx, caption, {
    reply_markup: mainMenuKeyboard(user.role, user.roles),
  });
  if (!sent) {
    await ctx.reply(caption, {
      parse_mode: 'Markdown',
      reply_markup: mainMenuKeyboard(user.role, user.roles),
    });
  }
}

/** تاگل یک نقش در حالت انتخاب چندتایی */
export async function handleRoleToggle(ctx: Context, role: UserRole): Promise<void> {
  const from = ctx.from;
  if (!from) return;

  const telegramId = String(from.id);
  const session = await getSession(telegramId);
  const selected = new Set(session?.draftRoles ?? []);
  if (selected.has(role)) selected.delete(role);
  else selected.add(role);
  const next = [...selected] as UserRole[];

  await upsertSession(telegramId, {
    step: 'role_select',
    draftRoles: next,
  });

  if (ctx.callbackQuery) {
    await ctx.answerCallbackQuery({
      text: selected.has(role) ? 'اضافه شد' : 'برداشته شد',
    });
    try {
      await ctx.editMessageReplyMarkup({ reply_markup: roleKeyboard(next) });
    } catch {
      /* ignore */
    }
    return;
  }

  const picked = next.length
    ? next.map((r) => USER_ROLE_LABELS[r]).join(' · ')
    : 'هنوز نقشی انتخاب نشده';
  await ctx.reply(
    `نقش‌های انتخاب‌شده:\n${picked}\n\nهر چند تا بخوای انتخاب کن، بعد «${ROLE_CONFIRM_LABEL}» رو بزن.`,
    { reply_markup: roleReplyKeyboard(next) }
  );
}

export async function handleRoleConfirm(ctx: Context): Promise<void> {
  const from = ctx.from;
  if (!from) return;

  const telegramId = String(from.id);
  const session = await getSession(telegramId);
  const roles = normalizeRoles(session?.draftRoles);
  if (!roles.length) {
    if (ctx.callbackQuery) {
      await ctx.answerCallbackQuery({ text: 'حداقل یک نقش انتخاب کن', show_alert: true });
    }
    await ctx.reply('حداقل یک نقش انتخاب کن، بعد ثبت کن.', {
      reply_markup: roleReplyKeyboard([]),
    });
    return;
  }

  await handleRolesSelect(ctx, roles);
}

export async function handleRolesSelect(ctx: Context, roles: UserRole[]): Promise<void> {
  const from = ctx.from;
  if (!from) return;

  const telegramId = String(from.id);
  const normalized = normalizeRoles(roles);
  if (!normalized.length) {
    await ctx.reply('حداقل یک نقش انتخاب کن.', { reply_markup: roleReplyKeyboard([]) });
    return;
  }

  const user = await setUserRoles(telegramId, normalized);
  const primary = primaryRole(user.roles, user.role)!;
  const labels = normalizeRoles(user.roles, user.role)
    .map((r) => USER_ROLE_LABELS[r])
    .join(' · ');
  const hint = roleWelcomeHint(primary);

  await upsertSession(telegramId, {
    userId: user.id,
    role: primary,
    draftRoles: undefined,
    step: 'ready',
  });

  await setUserOnboarding(telegramId, 'profile_incomplete');

  if (ctx.callbackQuery) {
    await ctx.answerCallbackQuery({ text: 'نقش‌ها ثبت شد' });
  }

  const text = `عالی! نقش‌هات ثبت شد 🎉\n\n**${labels}**\n\n${hint}${webLinkHint()}`;
  const webKb = webLinksKeyboard(telegramId);

  if (ctx.callbackQuery) {
    try {
      if (ctx.callbackQuery.message && 'photo' in ctx.callbackQuery.message) {
        await ctx.editMessageCaption({ caption: text, parse_mode: 'Markdown', reply_markup: webKb });
      } else {
        await ctx.editMessageText(text, { parse_mode: 'Markdown', reply_markup: webKb });
      }
    } catch {
      await ctx.reply(text, { parse_mode: 'Markdown', reply_markup: webKb });
    }
  } else {
    await ctx.reply(text, { parse_mode: 'Markdown', reply_markup: webKb });
  }

  if (userHasRole(user, 'pet_owner')) {
    await ctx.reply(
      'منوی صاحب پت آماده است 👇\n\nاول «👤 پروفایل خودم» رو تکمیل کن، بعد پت ثبت کن.',
      { reply_markup: mainMenuKeyboard(user.role, user.roles) }
    );
  } else {
    await ctx.reply('از منوی زیر استفاده کن:', {
      reply_markup: mainMenuKeyboard(user.role, user.roles),
    });
  }
}

/** سازگاری با انتخاب تکی قدیمی — الان تاگل می‌کند */
export async function handleRoleSelect(ctx: Context, role: UserRole): Promise<void> {
  await handleRoleToggle(ctx, role);
}

export async function handleHelp(ctx: Context): Promise<void> {
  const user = await getCtxUser(ctx);
  const isOwner = userHasRole(user, 'pet_owner');

  const lines = isOwner
    ? [
        `🐾 **${BRAND.name}** — راهنمای صاحب پت`,
        `_${BRAND.taglineEn}_`,
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
        `🐾 **${BRAND.name}** — ${BRAND.taglineFa}`,
        `_${BRAND.taglineEn}_`,
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
    reply_markup: mainMenuKeyboard(user?.role, user?.roles),
  });
}

export async function handleCancel(ctx: Context): Promise<void> {
  const from = ctx.from;
  if (!from) return;

  const user = await getCtxUser(ctx);
  await upsertSession(String(from.id), {
    step: 'ready',
    draftPet: undefined,
    draftProfile: undefined,
    draftRoles: undefined,
    selectedPetId: undefined,
    selectedToPetId: undefined,
    breedPage: undefined,
  });
  await ctx.reply('عملیات لغو شد.', {
    reply_markup: mainMenuKeyboard(user?.role, user?.roles),
  });
}

export async function handleMenu(ctx: Context): Promise<void> {
  const user = await getCtxUser(ctx);
  await ctx.reply(`منوی ${BRAND.name} 👇`, {
    reply_markup: mainMenuKeyboard(user?.role, user?.roles),
  });
}
