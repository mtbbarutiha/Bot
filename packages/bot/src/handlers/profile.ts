import type { Context } from 'grammy';
import type { ProfileDraft, User, UserGender } from '@petdate/shared';
import { ONBOARDING_STATUS_LABELS, USER_GENDER_LABELS, USER_ROLE_LABELS } from '@petdate/shared';
import { listPets, updateUserProfile } from '../api-client';
import {
  genderKeyboard,
  mainMenuKeyboard,
  phoneKeyboard,
  profileActionsKeyboard,
  skipProfileKeyboard,
} from '../keyboards';
import { getSession, upsertSession } from '../session';
import { getCtxUser } from './start';

function isProfileComplete(user: User): boolean {
  return Boolean(user.name && user.age && user.gender && user.city);
}

function formatProfileCard(user: User, petCount: number): string {
  const gender = user.gender ? USER_GENDER_LABELS[user.gender] : '—';
  const role = user.role ? USER_ROLE_LABELS[user.role] : '—';
  const onboarding = user.onboarding ? ONBOARDING_STATUS_LABELS[user.onboarding] : '—';

  return [
    '👤 **پروفایل خودم**',
    '',
    `نام: ${user.name}`,
    user.username ? `@${user.username}` : null,
    `سن: ${user.age ?? '—'}`,
    `جنسیت: ${gender}`,
    `شهر: ${user.city ?? '—'}`,
    `موبایل: ${user.phone ?? '—'}`,
    `نقش: ${role}`,
    `وضعیت: ${onboarding}`,
    `پت‌ها: ${petCount}`,
    user.bio ? `\n💬 ${user.bio}` : null,
  ]
    .filter(Boolean)
    .join('\n');
}

export async function handleProfile(ctx: Context): Promise<void> {
  const user = await getCtxUser(ctx);
  if (!user) {
    await ctx.reply('اول /start بزن.');
    return;
  }

  if (!isProfileComplete(user)) {
    await ctx.reply(
      'پروفایلت هنوز کامل نیست.\nمثل دوردوریا، مرحله‌به‌مرحله اطلاعاتت رو می‌گیریم 👇',
      { reply_markup: profileActionsKeyboard(false) }
    );
    await ctx.reply('منوی اصلی:', { reply_markup: mainMenuKeyboard(user.role) });
    return;
  }

  const pets = await listPets({ ownerId: user.id });
  const text = formatProfileCard(user, pets.length);

  if (user.avatarUrl) {
    try {
      await ctx.replyWithPhoto(user.avatarUrl, {
        caption: text,
        parse_mode: 'Markdown',
        reply_markup: profileActionsKeyboard(true),
      });
    } catch {
      await ctx.reply(text, { parse_mode: 'Markdown', reply_markup: profileActionsKeyboard(true) });
    }
  } else {
    await ctx.reply(text, { parse_mode: 'Markdown', reply_markup: profileActionsKeyboard(true) });
  }

  await ctx.reply('منوی اصلی 👇', { reply_markup: mainMenuKeyboard(user.role) });
}

export async function startProfileWizard(ctx: Context): Promise<void> {
  const from = ctx.from;
  if (!from) return;

  const telegramId = String(from.id);
  const user = await getCtxUser(ctx);
  if (!user) {
    await ctx.reply('اول /start بزن.');
    return;
  }

  await upsertSession(telegramId, {
    step: 'profile_name',
    draftProfile: {
      name: user.name,
      age: user.age,
      gender: user.gender,
      city: user.city,
      phone: user.phone,
      bio: user.bio,
      avatarFileId: user.avatarUrl,
    },
  });

  await ctx.reply(
    [
      '✨ **تکمیل پروفایل** (مرحله ۱ از ۷)',
      '',
      'نام نمایشی‌ات رو بنویس:',
      `_(الان: ${user.name})_`,
      '',
      'یا /cancel برای انصراف',
    ].join('\n'),
    { parse_mode: 'Markdown' }
  );
}

export async function handleProfileWizardText(ctx: Context, text: string): Promise<boolean> {
  const from = ctx.from;
  if (!from) return false;

  const telegramId = String(from.id);
  const session = await getSession(telegramId);
  if (!session?.userId) return false;

  const draft: ProfileDraft = { ...session.draftProfile };

  if (session.step === 'profile_name') {
    const name = text.trim();
    if (name.length < 2) {
      await ctx.reply('نام خیلی کوتاهه. حداقل ۲ حرف بنویس.');
      return true;
    }
    draft.name = name;
    await upsertSession(telegramId, { step: 'profile_age', draftProfile: draft });
    await ctx.reply('🎂 **مرحله ۲ از ۷**\n\nسنت چند سالِ؟\n_(مثلاً: ۲۸)_', { parse_mode: 'Markdown' });
    return true;
  }

  if (session.step === 'profile_age') {
    const age = Number(text.trim().replace(/[^\d]/g, ''));
    if (!Number.isFinite(age) || age < 13 || age > 99) {
      await ctx.reply('سن معتبر وارد کن (۱۳ تا ۹۹).');
      return true;
    }
    draft.age = age;
    await upsertSession(telegramId, { step: 'profile_gender', draftProfile: draft });
    await ctx.reply('⚧ **مرحله ۳ از ۷**\n\nجنسیتت رو انتخاب کن:', {
      parse_mode: 'Markdown',
      reply_markup: genderKeyboard(),
    });
    return true;
  }

  if (session.step === 'profile_city') {
    const city = text.trim();
    if (city.length < 2) {
      await ctx.reply('نام شهر رو درست بنویس.');
      return true;
    }
    draft.city = city;
    await upsertSession(telegramId, { step: 'profile_phone', draftProfile: draft });
    await ctx.reply(
      '📱 **مرحله ۵ از ۷**\n\nشماره موبایلت رو بفرست یا دکمه زیر رو بزن:',
      { parse_mode: 'Markdown', reply_markup: phoneKeyboard() }
    );
    await ctx.reply('یا شماره رو تایپ کن / رد کن:', {
      reply_markup: skipProfileKeyboard('profile:skip_phone'),
    });
    return true;
  }

  if (session.step === 'profile_phone') {
    const phone = text.trim().replace(/\s+/g, '');
    if (!/^(\+98|0)?9\d{9}$/.test(phone) && !/^\+?\d{10,13}$/.test(phone)) {
      await ctx.reply('شماره معتبر نیست. مثلاً ۰۹۱۲۳۴۵۶۷۸۹');
      return true;
    }
    draft.phone = phone;
    await upsertSession(telegramId, { step: 'profile_photo', draftProfile: draft });
    await askPhoto(ctx);
    return true;
  }

  if (session.step === 'profile_bio') {
    draft.bio = text.trim().slice(0, 300);
    await upsertSession(telegramId, { draftProfile: draft });
    await finishProfileWizard(ctx, telegramId, draft);
    return true;
  }

  return false;
}

export async function handleProfileGender(ctx: Context, gender: UserGender): Promise<void> {
  const from = ctx.from;
  if (!from) return;

  const telegramId = String(from.id);
  const session = await getSession(telegramId);
  if (!session) return;

  const draft: ProfileDraft = { ...session.draftProfile, gender };
  await upsertSession(telegramId, { step: 'profile_city', draftProfile: draft });
  await ctx.answerCallbackQuery({ text: USER_GENDER_LABELS[gender] });
  await ctx.editMessageText(
    `جنسیت: **${USER_GENDER_LABELS[gender]}** ✅\n\n🏙 **مرحله ۴ از ۷**\n\nشهرت کجاست؟\n_(مثلاً: تهران)_`,
    { parse_mode: 'Markdown' }
  );
}

export async function handleProfileContact(ctx: Context): Promise<boolean> {
  const from = ctx.from;
  const contact = ctx.message?.contact;
  if (!from || !contact) return false;

  const telegramId = String(from.id);
  const session = await getSession(telegramId);
  if (!session || session.step !== 'profile_phone') return false;

  const draft: ProfileDraft = {
    ...session.draftProfile,
    phone: contact.phone_number,
  };
  await upsertSession(telegramId, { step: 'profile_photo', draftProfile: draft });
  await askPhoto(ctx);
  return true;
}

export async function handleProfilePhoto(ctx: Context): Promise<boolean> {
  const from = ctx.from;
  const photos = ctx.message?.photo;
  if (!from || !photos?.length) return false;

  const telegramId = String(from.id);
  const session = await getSession(telegramId);
  if (!session || session.step !== 'profile_photo') return false;

  const best = photos[photos.length - 1]!;
  const draft: ProfileDraft = {
    ...session.draftProfile,
    avatarFileId: best.file_id,
  };
  await upsertSession(telegramId, { step: 'profile_bio', draftProfile: draft });
  await askBio(ctx);
  return true;
}

export async function handleProfileSkip(
  ctx: Context,
  field: 'phone' | 'photo' | 'bio'
): Promise<void> {
  const from = ctx.from;
  if (!from) return;

  const telegramId = String(from.id);
  const session = await getSession(telegramId);
  if (!session) return;

  await ctx.answerCallbackQuery();
  const draft: ProfileDraft = { ...session.draftProfile };

  if (field === 'phone') {
    await upsertSession(telegramId, { step: 'profile_photo', draftProfile: draft });
    await askPhoto(ctx);
    return;
  }

  if (field === 'photo') {
    await upsertSession(telegramId, { step: 'profile_bio', draftProfile: draft });
    await askBio(ctx);
    return;
  }

  await finishProfileWizard(ctx, telegramId, draft);
}

async function askPhoto(ctx: Context): Promise<void> {
  await ctx.reply(
    '🖼 **مرحله ۶ از ۷**\n\nیک عکس پروفایل بفرست:',
    {
      parse_mode: 'Markdown',
      reply_markup: skipProfileKeyboard('profile:skip_photo'),
    }
  );
}

async function askBio(ctx: Context): Promise<void> {
  await ctx.reply(
    '💬 **مرحله ۷ از ۷**\n\nچند خط درباره خودت بنویس:\n_(علاقه‌ها، پت‌ها، محله...)_',
    {
      parse_mode: 'Markdown',
      reply_markup: skipProfileKeyboard('profile:skip_bio'),
    }
  );
}

async function finishProfileWizard(
  ctx: Context,
  telegramId: string,
  draft: ProfileDraft
): Promise<void> {
  if (!draft.name || !draft.age || !draft.gender || !draft.city) {
    await ctx.reply('اطلاعات ناقصه. دوباره از «پروفایل خودم» شروع کن.');
    await upsertSession(telegramId, { step: 'ready', draftProfile: undefined });
    return;
  }

  const user = await updateUserProfile(telegramId, {
    name: draft.name,
    age: draft.age,
    gender: draft.gender,
    city: draft.city,
    phone: draft.phone,
    bio: draft.bio,
    avatarUrl: draft.avatarFileId,
    onboarding: 'profile_complete',
  });

  await upsertSession(telegramId, { step: 'ready', draftProfile: undefined });

  const pets = await listPets({ ownerId: user.id });
  const text = `✅ پروفایلت کامل شد!\n\n${formatProfileCard(user, pets.length)}`;

  if (user.avatarUrl) {
    try {
      await ctx.replyWithPhoto(user.avatarUrl, {
        caption: text,
        parse_mode: 'Markdown',
        reply_markup: mainMenuKeyboard(user.role),
      });
      return;
    } catch {
      /* fall through */
    }
  }

  await ctx.reply(text, {
    parse_mode: 'Markdown',
    reply_markup: mainMenuKeyboard(user.role),
  });
}
