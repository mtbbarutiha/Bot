import type { Context } from 'grammy';
import type { BotStep, ProfileDraft, User, UserGender } from '@petdate/shared';
import {
  COUNTRY_IRAN,
  IRAN_PROVINCES,
  PROFILE_INTEREST_OPTIONS,
  USER_GENDER_LABELS,
  USER_ROLE_LABELS,
  citiesForProvince,
} from '@petdate/shared';
import {
  deleteUserAccount,
  listPets,
  setUserActive,
  updateUserProfile,
} from '../api-client';
import {
  PROFILE_AGE_CHIPS,
  USER_FEMALE_LABEL,
  USER_MALE_LABEL,
  WIZARD_NAV,
  ageChipKeyboard,
  cityReplyKeyboard,
  countryReplyKeyboard,
  genderReplyKeyboard,
  interestsReplyKeyboard,
  mainMenuKeyboard,
  phoneWizardKeyboard,
  profileActionsKeyboard,
  profileConfirmKeyboard,
  provinceReplyKeyboard,
  textStepKeyboard,
} from '../keyboards';
import { getSession, upsertSession } from '../session';
import { getCtxUser } from './start';

const PROFILE_TOTAL = 10;

const PROFILE_BACK: Partial<Record<BotStep, BotStep>> = {
  profile_age: 'profile_name',
  profile_gender: 'profile_age',
  profile_country: 'profile_gender',
  profile_province: 'profile_country',
  profile_city: 'profile_province',
  profile_phone: 'profile_city',
  profile_photo: 'profile_phone',
  profile_bio: 'profile_photo',
  profile_interests: 'profile_bio',
};

function stepTitle(n: number): string {
  return `مرحله ${n} از ${PROFILE_TOTAL}`;
}

function toEnglishDigits(raw: string): string {
  return raw
    .replace(/[۰-۹]/g, (d) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)))
    .replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)));
}

function isProfileComplete(user: User): boolean {
  return Boolean(user.name && user.age && user.gender && user.country && user.city);
}

function formatNum(n: number | undefined | null): string {
  return new Intl.NumberFormat('fa-IR').format(n ?? 0);
}

/** کارت پروفایل خودم — سبک دوردوریا (باکس آمار + caption) */
function formatProfileCard(user: User, petCount: number): string {
  const gender = user.gender ? USER_GENDER_LABELS[user.gender] : '—';
  const role = user.role ? USER_ROLE_LABELS[user.role] : '—';
  const loc =
    [user.country, user.province, user.city].filter(Boolean).join('، ') || '—';
  const interests =
    user.interests && user.interests.length > 0
      ? user.interests.join(' · ')
      : 'هنوز انتخاب نشده';
  const activeLabel = user.isActive === false ? '⏸ غیرفعال' : '✅ فعال';

  return [
    '📦 **پروفایل خودم**',
    '',
    `👤 ${user.name}`,
    user.username ? `@${user.username}` : null,
    `🎂 ${user.age ?? '—'} · ${gender}`,
    `📍 ${loc}`,
    `🐾 پت‌ها: ${formatNum(petCount)} · نقش: ${role}`,
    `وضعیت حساب: ${activeLabel}`,
    user.bio ? `💬 ${user.bio}` : null,
    '',
    '┏━━ آمار ━━┓',
    `┃ 🪙 سکه: ${formatNum(user.coins)}`,
    `┃ 👁 بازدید: ${formatNum(user.profileViews)}`,
    `┃ ❤️ لایک: ${formatNum(user.likesCount)}`,
    '┗━━━━━━━━┛',
    '',
    `🏷 علایق: ${interests}`,
  ]
    .filter((line) => line !== null)
    .join('\n');
}

async function sendOwnProfileCard(
  ctx: Context,
  user: User,
  petCount: number,
  caption: string
): Promise<void> {
  const kb = profileActionsKeyboard(isProfileComplete(user), user.isActive !== false);
  if (user.avatarUrl) {
    try {
      await ctx.replyWithPhoto(user.avatarUrl, {
        caption,
        parse_mode: 'Markdown',
        reply_markup: kb,
      });
      return;
    } catch {
      /* fall through */
    }
  }
  await ctx.reply(caption, { parse_mode: 'Markdown', reply_markup: kb });
}

async function cancelWizard(ctx: Context, telegramId: string): Promise<void> {
  const user = await getCtxUser(ctx);
  await upsertSession(telegramId, {
    step: 'ready',
    draftProfile: undefined,
    breedPage: undefined,
  });
  await ctx.reply('انصراف دادی. هر وقت خواستی از منو دوباره شروع کن.', {
    reply_markup: mainMenuKeyboard(user?.role),
  });
}

export async function handleProfile(ctx: Context): Promise<void> {
  const user = await getCtxUser(ctx);
  if (!user) {
    await ctx.reply('اول /start بزن.');
    return;
  }

  if (!isProfileComplete(user)) {
    const caption = [
      formatProfileCard(user, 0),
      '',
      '⚠️ پروفایلت هنوز کامل نیست.',
      'با «تکمیل پروفایل» مرحله‌به‌مرحله کاملش می‌کنیم 👇',
    ].join('\n');
    await sendOwnProfileCard(ctx, user, 0, caption);
    await ctx.reply('منوی اصلی:', { reply_markup: mainMenuKeyboard(user.role) });
    return;
  }

  const pets = await listPets({ ownerId: user.id });
  await sendOwnProfileCard(ctx, user, pets.length, formatProfileCard(user, pets.length));
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
      country: user.country,
      province: user.province,
      city: user.city,
      phone: user.phone,
      bio: user.bio,
      avatarFileId: user.avatarUrl,
      interests: user.interests ?? [],
    },
  });

  await askProfileName(ctx, user.name);
}

async function askProfileName(ctx: Context, currentName?: string): Promise<void> {
  await ctx.reply(
    [
      `✨ **تکمیل پروفایل** (${stepTitle(1)})`,
      '',
      'نام نمایشی‌ات رو بنویس:',
      currentName ? `_(الان: ${currentName})_` : null,
    ]
      .filter(Boolean)
      .join('\n'),
    { parse_mode: 'Markdown', reply_markup: textStepKeyboard({ noBack: true }) }
  );
}

async function askProfileAge(ctx: Context): Promise<void> {
  await ctx.reply(
    `🎂 **${stepTitle(2)}**\n\nسنت چند سالِ؟\nاز دکمه‌ها انتخاب کن یا عدد بنویس:`,
    { parse_mode: 'Markdown', reply_markup: ageChipKeyboard(PROFILE_AGE_CHIPS) }
  );
}

async function askProfileGender(ctx: Context): Promise<void> {
  await ctx.reply(`⚧ **${stepTitle(3)}**\n\nجنسیتت رو از منو انتخاب کن:`, {
    parse_mode: 'Markdown',
    reply_markup: genderReplyKeyboard(),
  });
}

async function askProfileCountry(ctx: Context): Promise<void> {
  await ctx.reply(`🌍 **${stepTitle(4)}**\n\nکشورت رو انتخاب کن:`, {
    parse_mode: 'Markdown',
    reply_markup: countryReplyKeyboard(),
  });
}

async function askProfileProvince(ctx: Context): Promise<void> {
  await ctx.reply(`🗺 **${stepTitle(5)}**\n\nاستانت رو انتخاب کن:`, {
    parse_mode: 'Markdown',
    reply_markup: provinceReplyKeyboard(),
  });
}

async function askProfileCity(ctx: Context, province?: string): Promise<void> {
  await ctx.reply(`🏙 **${stepTitle(6)}**\n\nشهرت رو انتخاب کن یا «شهر دیگر» بزن:`, {
    parse_mode: 'Markdown',
    reply_markup: cityReplyKeyboard({ province }),
  });
}

async function askProfilePhone(ctx: Context): Promise<void> {
  await ctx.reply(
    `📱 **${stepTitle(7)}**\n\nشماره موبایلت رو بفرست یا دکمه اشتراک‌گذاری رو بزن:`,
    { parse_mode: 'Markdown', reply_markup: phoneWizardKeyboard() }
  );
}

async function askProfilePhoto(ctx: Context): Promise<void> {
  await ctx.reply(`🖼 **${stepTitle(8)}**\n\nیک عکس پروفایل بفرست:`, {
    parse_mode: 'Markdown',
    reply_markup: textStepKeyboard({ skip: true }),
  });
}

async function askProfileBio(ctx: Context): Promise<void> {
  await ctx.reply(
    `💬 **${stepTitle(9)}**\n\nچند خط درباره خودت بنویس:\n_(علاقه‌ها، پت‌ها، محله...)_`,
    { parse_mode: 'Markdown', reply_markup: textStepKeyboard({ skip: true }) }
  );
}

async function askProfileInterests(ctx: Context, selected: string[] = []): Promise<void> {
  const picked = selected.length ? `\nانتخاب‌شده: ${selected.join(' · ')}` : '';
  await ctx.reply(
    `💚 **${stepTitle(10)}**\n\nعلایقت رو از منو انتخاب کن (چندتا اوکیه)، بعد «ثبت علایق» بزن:${picked}`,
    { parse_mode: 'Markdown', reply_markup: interestsReplyKeyboard(selected) }
  );
}

async function promptProfileStep(ctx: Context, step: BotStep, draft: ProfileDraft): Promise<void> {
  switch (step) {
    case 'profile_name':
      await askProfileName(ctx, draft.name);
      return;
    case 'profile_age':
      await askProfileAge(ctx);
      return;
    case 'profile_gender':
      await askProfileGender(ctx);
      return;
    case 'profile_country':
      await askProfileCountry(ctx);
      return;
    case 'profile_province':
      await askProfileProvince(ctx);
      return;
    case 'profile_city':
      await askProfileCity(ctx, draft.province);
      return;
    case 'profile_phone':
      await askProfilePhone(ctx);
      return;
    case 'profile_photo':
      await askProfilePhoto(ctx);
      return;
    case 'profile_bio':
      await askProfileBio(ctx);
      return;
    case 'profile_interests':
      await askProfileInterests(ctx, draft.interests ?? []);
      return;
    default:
      return;
  }
}

export async function handleProfileWizardText(ctx: Context, text: string): Promise<boolean> {
  const from = ctx.from;
  if (!from) return false;

  const telegramId = String(from.id);
  const session = await getSession(telegramId);
  if (!session?.userId) return false;
  if (!String(session.step).startsWith('profile_')) return false;

  const draft: ProfileDraft = { ...session.draftProfile };

  if (text === WIZARD_NAV.cancel) {
    await cancelWizard(ctx, telegramId);
    return true;
  }

  if (text === WIZARD_NAV.back) {
    let prev = PROFILE_BACK[session.step];
    if (session.step === 'profile_city' && !draft.province) {
      prev = 'profile_country';
    }
    if (!prev) {
      await cancelWizard(ctx, telegramId);
      return true;
    }
    await upsertSession(telegramId, { step: prev, draftProfile: draft });
    await ctx.reply('برگشتیم یک مرحله ↩️');
    await promptProfileStep(ctx, prev, draft);
    return true;
  }

  if (text === WIZARD_NAV.skip) {
    if (session.step === 'profile_phone') {
      await upsertSession(telegramId, { step: 'profile_photo', draftProfile: draft });
      await askProfilePhoto(ctx);
      return true;
    }
    if (session.step === 'profile_photo') {
      await upsertSession(telegramId, { step: 'profile_bio', draftProfile: draft });
      await askProfileBio(ctx);
      return true;
    }
    if (session.step === 'profile_bio') {
      await upsertSession(telegramId, { step: 'profile_interests', draftProfile: draft });
      await askProfileInterests(ctx, draft.interests ?? []);
      return true;
    }
    if (session.step === 'profile_interests') {
      await finishProfileWizard(ctx, telegramId, draft);
      return true;
    }
  }

  if (session.step === 'profile_name') {
    const name = text.trim();
    if (name.length < 2) {
      await ctx.reply('نام خیلی کوتاهه. حداقل ۲ حرف بنویس.', {
        reply_markup: textStepKeyboard({ noBack: true }),
      });
      return true;
    }
    draft.name = name;
    await upsertSession(telegramId, { step: 'profile_age', draftProfile: draft });
    await askProfileAge(ctx);
    return true;
  }

  if (session.step === 'profile_age') {
    const age = Number(toEnglishDigits(text.trim()).replace(/[^\d]/g, ''));
    if (!Number.isFinite(age) || age < 13 || age > 99) {
      await ctx.reply('سن معتبر وارد کن (۱۳ تا ۹۹) یا از دکمه‌ها انتخاب کن.', {
        reply_markup: ageChipKeyboard(PROFILE_AGE_CHIPS),
      });
      return true;
    }
    draft.age = age;
    await upsertSession(telegramId, { step: 'profile_gender', draftProfile: draft });
    await askProfileGender(ctx);
    return true;
  }

  if (session.step === 'profile_gender') {
    const gender = parseUserGender(text);
    if (!gender) {
      await ctx.reply('از دکمه‌های کیبورد انتخاب کن:', { reply_markup: genderReplyKeyboard() });
      return true;
    }
    draft.gender = gender;
    await upsertSession(telegramId, { step: 'profile_country', draftProfile: draft });
    await askProfileCountry(ctx);
    return true;
  }

  if (session.step === 'profile_country') {
    if (text === 'سایر کشورها') {
      await ctx.reply('نام کشور رو بنویس:', { reply_markup: textStepKeyboard() });
      return true;
    }
    const country = text.trim();
    if (country.length < 2) {
      await ctx.reply('کشور رو از منو انتخاب کن یا بنویس.', {
        reply_markup: countryReplyKeyboard(),
      });
      return true;
    }
    draft.country = country;
    draft.province = undefined;
    if (country === COUNTRY_IRAN) {
      await upsertSession(telegramId, { step: 'profile_province', draftProfile: draft });
      await askProfileProvince(ctx);
    } else {
      await upsertSession(telegramId, { step: 'profile_city', draftProfile: draft });
      await ctx.reply(`🏙 **${stepTitle(6)}**\n\nشهرت رو بنویس:`, {
        parse_mode: 'Markdown',
        reply_markup: textStepKeyboard(),
      });
    }
    return true;
  }

  if (session.step === 'profile_province') {
    const province = text.trim();
    if (!(IRAN_PROVINCES as readonly string[]).includes(province)) {
      await ctx.reply('استان رو از دکمه‌ها انتخاب کن:', {
        reply_markup: provinceReplyKeyboard(),
      });
      return true;
    }
    draft.province = province;
    draft.city = undefined;
    await upsertSession(telegramId, { step: 'profile_city', draftProfile: draft });
    await askProfileCity(ctx, province);
    return true;
  }

  if (session.step === 'profile_city') {
    if (text === WIZARD_NAV.otherCity) {
      await ctx.reply('نام شهرت رو بنویس:', { reply_markup: textStepKeyboard() });
      return true;
    }
    const city = text.trim();
    if (city.length < 2) {
      await ctx.reply('نام شهر رو درست بنویس یا از منو انتخاب کن.', {
        reply_markup: cityReplyKeyboard({ province: draft.province }),
      });
      return true;
    }
    // اگر از لیست استان آمده، ترجیحاً یکی از شهرهای همان استان باشد (یا دستی)
    if (draft.province) {
      const allowed = citiesForProvince(draft.province);
      if (allowed.length && !allowed.includes(city) && text === city) {
        // اجازه نوشتن دستی هم داده می‌شود
      }
    }
    draft.city = city;
    await upsertSession(telegramId, { step: 'profile_phone', draftProfile: draft });
    await askProfilePhone(ctx);
    return true;
  }

  if (session.step === 'profile_phone') {
    const phone = text.trim().replace(/\s+/g, '');
    if (!/^(\+98|0)?9\d{9}$/.test(phone) && !/^\+?\d{10,13}$/.test(phone)) {
      await ctx.reply('شماره معتبر نیست. مثلاً ۰۹۱۲۳۴۵۶۷۸۹ یا دکمه اشتراک‌گذاری.', {
        reply_markup: phoneWizardKeyboard(),
      });
      return true;
    }
    draft.phone = phone;
    await upsertSession(telegramId, { step: 'profile_photo', draftProfile: draft });
    await askProfilePhoto(ctx);
    return true;
  }

  if (session.step === 'profile_photo') {
    await ctx.reply('لطفاً یک عکس بفرست یا «رد کردن» بزن.', {
      reply_markup: textStepKeyboard({ skip: true }),
    });
    return true;
  }

  if (session.step === 'profile_bio') {
    draft.bio = text.trim().slice(0, 300);
    await upsertSession(telegramId, { step: 'profile_interests', draftProfile: draft });
    await askProfileInterests(ctx, draft.interests ?? []);
    return true;
  }

  if (session.step === 'profile_interests') {
    if (text === WIZARD_NAV.interestsDone) {
      await finishProfileWizard(ctx, telegramId, draft);
      return true;
    }

    const cleaned = text.replace(/^✓\s*/, '').trim();
    const option = PROFILE_INTEREST_OPTIONS.find((o) => o === cleaned || o === text);
    if (!option) {
      await ctx.reply('از دکمه‌های کیبورد انتخاب کن یا «ثبت علایق» بزن.', {
        reply_markup: interestsReplyKeyboard(draft.interests ?? []),
      });
      return true;
    }

    const current = new Set(draft.interests ?? []);
    if (current.has(option)) current.delete(option);
    else current.add(option);
    draft.interests = [...current];
    await upsertSession(telegramId, { draftProfile: draft });
    await askProfileInterests(ctx, draft.interests);
    return true;
  }

  return false;
}

function parseUserGender(text: string): UserGender | null {
  const t = text.trim();
  if (t === USER_MALE_LABEL || t === USER_GENDER_LABELS.male || t === 'آقا' || t === '👨 آقا') {
    return 'male';
  }
  if (t === USER_FEMALE_LABEL || t === USER_GENDER_LABELS.female || t === 'خانم' || t === '👩 خانم') {
    return 'female';
  }
  return null;
}

export async function handleProfileGender(ctx: Context, gender: UserGender): Promise<void> {
  const from = ctx.from;
  if (!from) return;

  const telegramId = String(from.id);
  const session = await getSession(telegramId);
  if (!session) return;

  const draft: ProfileDraft = { ...session.draftProfile, gender };
  await upsertSession(telegramId, { step: 'profile_country', draftProfile: draft });
  await ctx.answerCallbackQuery({ text: USER_GENDER_LABELS[gender] });
  await askProfileCountry(ctx);
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
  await askProfilePhoto(ctx);
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
  await askProfileBio(ctx);
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
    await askProfilePhoto(ctx);
    return;
  }

  if (field === 'photo') {
    await upsertSession(telegramId, { step: 'profile_bio', draftProfile: draft });
    await askProfileBio(ctx);
    return;
  }

  await upsertSession(telegramId, { step: 'profile_interests', draftProfile: draft });
  await askProfileInterests(ctx, draft.interests ?? []);
}

export async function handleProfileDeactivate(ctx: Context): Promise<void> {
  await ctx.answerCallbackQuery();
  await ctx.reply(
    '⏸ حسابت موقتاً غیرفعال بشه؟\nدیگه تو جستجو نشون داده نمی‌شی.',
    { reply_markup: profileConfirmKeyboard('deactivate') }
  );
}

/** alias */
export const handleProfileDeactivateAsk = handleProfileDeactivate;

export async function handleProfileDeleteAsk(ctx: Context): Promise<void> {
  await ctx.answerCallbackQuery();
  await ctx.reply('⚠️ مطمئنی حسابت حذف شود؟ این کار برگشت‌پذیر نیست.', {
    reply_markup: profileConfirmKeyboard('delete'),
  });
}

export async function handleProfileDeactivateConfirm(ctx: Context, yes: boolean): Promise<void> {
  const from = ctx.from;
  if (!from) return;
  await ctx.answerCallbackQuery();
  if (!yes) {
    await ctx.reply('باشه، حسابت همون‌طور موند.', {
      reply_markup: mainMenuKeyboard((await getCtxUser(ctx))?.role),
    });
    return;
  }
  await setUserActive(String(from.id), false);
  await ctx.reply(
    '⏸ حسابت غیرفعال شد.\nبرای فعال‌سازی دوباره از پروفایل «فعال‌سازی» رو بزن.',
    { reply_markup: mainMenuKeyboard((await getCtxUser(ctx))?.role) }
  );
}

export async function handleProfileActivate(ctx: Context): Promise<void> {
  const from = ctx.from;
  if (!from) return;
  await setUserActive(String(from.id), true);
  await ctx.answerCallbackQuery({ text: 'حساب فعال شد' });
  await handleProfile(ctx);
}

export async function handleProfileDeleteConfirm(ctx: Context, yes: boolean): Promise<void> {
  const from = ctx.from;
  if (!from) return;
  await ctx.answerCallbackQuery();
  if (!yes) {
    await ctx.reply('حذف لغو شد.', {
      reply_markup: mainMenuKeyboard((await getCtxUser(ctx))?.role),
    });
    return;
  }
  const telegramId = String(from.id);
  await deleteUserAccount(telegramId);
  await upsertSession(telegramId, {
    step: 'start',
    userId: undefined,
    role: undefined,
    draftProfile: undefined,
    draftPet: undefined,
  });
  await ctx.reply('🗑 حسابت حذف شد.\nبرای ساخت حساب جدید /start بزن.');
}

async function finishProfileWizard(
  ctx: Context,
  telegramId: string,
  draft: ProfileDraft
): Promise<void> {
  if (!draft.name || !draft.age || !draft.gender || !draft.country || !draft.city) {
    await ctx.reply('اطلاعات ناقصه. دوباره از «پروفایل خودم» شروع کن.');
    await upsertSession(telegramId, { step: 'ready', draftProfile: undefined });
    return;
  }

  const user = await updateUserProfile(telegramId, {
    name: draft.name,
    age: draft.age,
    gender: draft.gender,
    country: draft.country,
    province: draft.province,
    city: draft.city,
    phone: draft.phone,
    bio: draft.bio,
    interests: draft.interests,
    avatarUrl: draft.avatarFileId,
    onboarding: 'profile_complete',
  });

  await upsertSession(telegramId, { step: 'ready', draftProfile: undefined });

  const pets = await listPets({ ownerId: user.id });
  const text = `✅ پروفایلت کامل شد!\n\n${formatProfileCard(user, pets.length)}`;
  await sendOwnProfileCard(ctx, user, pets.length, text);
  await ctx.reply('منوی اصلی 👇', { reply_markup: mainMenuKeyboard(user.role) });
}
