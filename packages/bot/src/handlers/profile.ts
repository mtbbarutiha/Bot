import type { Context } from 'grammy';
import type { BotStep, ProfileDraft, User, UserGender } from '@petdate/shared';
import {
  COUNTRY_IRAN,
  IRAN_PROVINCES,
  PROFILE_INTEREST_OPTIONS,
  USER_GENDER_LABELS,
  USER_ROLE_LABELS,
  normalizeRoles,
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
  profileNavOpts,
  provinceReplyKeyboard,
  textStepKeyboard,
} from '../keyboards';
import { getSession, upsertSession } from '../session';
import { getCtxUser } from './helpers';

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
  return Boolean(
    user.name &&
      user.age &&
      user.gender &&
      user.country &&
      user.city &&
      (user.country !== 'ایران' || user.province)
  );
}

function formatNum(n: number | undefined | null): string {
  return new Intl.NumberFormat('fa-IR').format(n ?? 0);
}

function escapeHtml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/** کارت کامل پروفایل کاربر */
function formatProfileCard(user: User, petCount: number, petNames: string[] = []): string {
  const gender = user.gender ? USER_GENDER_LABELS[user.gender] : '—';
  const roles = normalizeRoles(user.roles, user.role);
  const role = roles.length ? roles.map((r) => USER_ROLE_LABELS[r]).join(' · ') : '—';
  const interests =
    user.interests && user.interests.length > 0
      ? user.interests.map(escapeHtml).join(' · ')
      : '—';
  const activeLabel = user.isActive === false ? '⏸ غیرفعال' : '✅ فعال';
  const phone = user.phone ? escapeHtml(user.phone) : '—';
  const petsLine =
    petNames.length > 0
      ? petNames.map((n) => `• ${escapeHtml(n)}`).join('\n')
      : 'هنوز پتی ثبت نشده';

  return [
    '👤 <b>پروفایل من</b>',
    '',
    `<b>نام:</b> ${escapeHtml(user.name)}`,
    user.username ? `<b>یوزرنیم:</b> @${escapeHtml(user.username)}` : null,
    `<b>سن:</b> ${user.age != null ? formatNum(user.age) : '—'}`,
    `<b>جنسیت:</b> ${gender}`,
    `<b>نقش:</b> ${role}`,
    '',
    '📍 <b>موقعیت</b>',
    `<b>کشور:</b> ${user.country ? escapeHtml(user.country) : '—'}`,
    `<b>استان:</b> ${user.province ? escapeHtml(user.province) : '—'}`,
    `<b>شهر:</b> ${user.city ? escapeHtml(user.city) : '—'}`,
    '',
    `📱 <b>موبایل:</b> ${phone}`,
    user.bio ? `💬 <b>درباره من:</b>\n${escapeHtml(user.bio)}` : '💬 <b>درباره من:</b> —',
    '',
    `🏷 <b>علایق:</b>\n${interests}`,
    '',
    `🐾 <b>پت‌های من</b> (${formatNum(petCount)})`,
    petsLine,
    '',
    '📊 <b>آمار</b>',
    `🪙 سکه: ${formatNum(user.coins)}`,
    `👁 بازدید: ${formatNum(user.profileViews)}`,
    `❤️ لایک: ${formatNum(user.likesCount)}`,
    `وضعیت حساب: ${activeLabel}`,
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
        parse_mode: 'HTML',
        reply_markup: kb,
      });
      return;
    } catch {
      /* fall through */
    }
  }
  await ctx.reply(caption, { parse_mode: 'HTML', reply_markup: kb });
}

async function cancelWizard(ctx: Context, telegramId: string): Promise<void> {
  const user = await getCtxUser(ctx);
  await upsertSession(telegramId, {
    step: 'ready',
    draftProfile: undefined,
    breedPage: undefined,
  });
  await ctx.reply('انصراف دادی. هر وقت خواستی از منو «پروفایل خودم» دوباره شروع کن.', {
    reply_markup: mainMenuKeyboard(user?.role, user?.roles),
  });
}

/** رد کردن کل ویزارد — پروفایل ناقص می‌ماند */
async function skipProfileWizardLater(ctx: Context, telegramId: string): Promise<void> {
  const user = await getCtxUser(ctx);
  await upsertSession(telegramId, {
    step: 'ready',
    draftProfile: undefined,
    breedPage: undefined,
  });
  await ctx.reply(
    'باشه، پروفایل رو فعلاً رد کردی.\nهر وقت خواستی از منو «👤 پروفایل خودم» تکمیلش کن.',
    { reply_markup: mainMenuKeyboard(user?.role, user?.roles) }
  );
}

export async function handleProfile(ctx: Context): Promise<void> {
  const user = await getCtxUser(ctx);
  if (!user) {
    await ctx.reply('اول /start بزن.');
    return;
  }

  const pets = await listPets({ ownerId: user.id });
  const petNames = pets.map((p) => p.name);
  const card = formatProfileCard(user, pets.length, petNames);

  if (!isProfileComplete(user)) {
    // اگر onboarding اشتباه کامل علامت خورده، اصلاح کن
    if (user.onboarding === 'profile_complete') {
      try {
        await updateUserProfile(String(ctx.from!.id), { onboarding: 'profile_incomplete' });
      } catch {
        /* ignore */
      }
    }
    await sendOwnProfileCard(
      ctx,
      user,
      pets.length,
      `${card}\n\n⚠️ <b>پروفایلت هنوز کامل نیست.</b>\nالان مرحله‌به‌مرحله تکمیلش می‌کنیم 👇`
    );
    await startProfileWizard(ctx);
    return;
  }

  await sendOwnProfileCard(ctx, user, pets.length, card);
  await ctx.reply('منوی اصلی 👇', { reply_markup: mainMenuKeyboard(user.role, user.roles) });
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
    userId: user.id,
    role: user.role,
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
  const lines = [
    `✨ <b>تکمیل پروفایل</b> (${stepTitle(1)})`,
    '',
    'نام نمایشی‌ات رو بنویس:',
  ];
  if (currentName) {
    lines.push(`<i>الان: ${escapeHtml(currentName)}</i>`);
    lines.push('یا «✓ همین نام» رو بزن.');
  }
  lines.push('', 'اگر الان وقت نداری «⏭ فعلاً رد کن» رو بزن.');

  await ctx.reply(lines.join('\n'), {
    parse_mode: 'HTML',
    reply_markup: textStepKeyboard({
      ...profileNavOpts({ noBack: true }),
      keepName: currentName,
    }),
  });
}

async function askProfileAge(ctx: Context): Promise<void> {
  await ctx.reply(
    `🎂 <b>${stepTitle(2)}</b>\n\nسنت چند سالِ؟\nاز دکمه‌ها انتخاب کن یا عدد بنویس:`,
    { parse_mode: 'HTML', reply_markup: ageChipKeyboard(PROFILE_AGE_CHIPS) }
  );
}

async function askProfileGender(ctx: Context): Promise<void> {
  await ctx.reply(`⚧ <b>${stepTitle(3)}</b>\n\nجنسیتت رو از منو انتخاب کن:`, {
    parse_mode: 'HTML',
    reply_markup: genderReplyKeyboard(),
  });
}

async function askProfileCountry(ctx: Context): Promise<void> {
  await ctx.reply(`🌍 <b>${stepTitle(4)}</b>\n\nکشورت رو انتخاب کن:`, {
    parse_mode: 'HTML',
    reply_markup: countryReplyKeyboard(),
  });
}

async function askProfileProvince(ctx: Context): Promise<void> {
  await ctx.reply(`🗺 <b>${stepTitle(5)}</b>\n\nاستانت رو انتخاب کن:`, {
    parse_mode: 'HTML',
    reply_markup: provinceReplyKeyboard(),
  });
}

async function askProfileCity(ctx: Context, province?: string): Promise<void> {
  await ctx.reply(`🏙 <b>${stepTitle(6)}</b>\n\nشهرت رو انتخاب کن یا «شهر دیگر» بزن:`, {
    parse_mode: 'HTML',
    reply_markup: cityReplyKeyboard({ province, skipLater: true }),
  });
}

async function askProfilePhone(ctx: Context): Promise<void> {
  await ctx.reply(
    `📱 <b>${stepTitle(7)}</b>\n\nشماره موبایلت رو بفرست یا دکمه اشتراک‌گذاری رو بزن:`,
    { parse_mode: 'HTML', reply_markup: phoneWizardKeyboard() }
  );
}

async function askProfilePhoto(ctx: Context): Promise<void> {
  await ctx.reply(`🖼 <b>${stepTitle(8)}</b>\n\nیک عکس پروفایل بفرست:`, {
    parse_mode: 'HTML',
    reply_markup: textStepKeyboard(profileNavOpts({ skip: true })),
  });
}

async function askProfileBio(ctx: Context): Promise<void> {
  await ctx.reply(
    `💬 <b>${stepTitle(9)}</b>\n\nچند خط درباره خودت بنویس:\n<i>علاقه‌ها، پت‌ها، محله...</i>`,
    { parse_mode: 'HTML', reply_markup: textStepKeyboard(profileNavOpts({ skip: true })) }
  );
}

async function askProfileInterests(ctx: Context, selected: string[] = []): Promise<void> {
  const picked = selected.length ? `\nانتخاب‌شده: ${escapeHtml(selected.join(' · '))}` : '';
  await ctx.reply(
    `💚 <b>${stepTitle(10)}</b>\n\nعلایقت رو از منو انتخاب کن (چندتا اوکیه)، بعد «ثبت علایق» بزن:${picked}`,
    { parse_mode: 'HTML', reply_markup: interestsReplyKeyboard(selected) }
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
  let session = await getSession(telegramId);
  if (!session) return false;
  if (!String(session.step).startsWith('profile_')) return false;

  if (!session.userId) {
    const user = await getCtxUser(ctx);
    if (!user) {
      await ctx.reply('اول /start بزن.');
      return true;
    }
    session = await upsertSession(telegramId, { userId: user.id, role: user.role });
  }

  const draft: ProfileDraft = { ...session.draftProfile };

  if (text === WIZARD_NAV.skipLater) {
    await skipProfileWizardLater(ctx, telegramId);
    return true;
  }

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
    // در مراحل اجباری، رد کردن فیلد = رد کردن کل ویزارد
    await skipProfileWizardLater(ctx, telegramId);
    return true;
  }

  if (session.step === 'profile_name') {
    let name = text.trim();
    if (text === WIZARD_NAV.keepName) {
      name = (draft.name ?? '').trim();
    }
    if (name.length < 2) {
      await ctx.reply('نام خیلی کوتاهه. حداقل ۲ حرف بنویس.', {
        reply_markup: textStepKeyboard({
          ...profileNavOpts({ noBack: true }),
          keepName: draft.name,
        }),
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
      await ctx.reply('نام کشور رو بنویس:', {
        reply_markup: textStepKeyboard(profileNavOpts()),
      });
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
      await ctx.reply(`🏙 <b>${stepTitle(6)}</b>\n\nشهرت رو بنویس:`, {
        parse_mode: 'HTML',
        reply_markup: textStepKeyboard(profileNavOpts()),
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
      await ctx.reply('نام شهرت رو بنویس:', {
        reply_markup: textStepKeyboard(profileNavOpts()),
      });
      return true;
    }
    const city = text.trim();
    if (city.length < 2) {
      await ctx.reply('نام شهر رو درست بنویس یا از منو انتخاب کن.', {
        reply_markup: cityReplyKeyboard({ province: draft.province, skipLater: true }),
      });
      return true;
    }
    draft.city = city;
    await upsertSession(telegramId, { step: 'profile_phone', draftProfile: draft });
    await askProfilePhone(ctx);
    return true;
  }

  if (session.step === 'profile_phone') {
    const phone = text.trim().replace(/\s+/g, '');
    if (!/^(\+98|0)?9\d{9}$/.test(toEnglishDigits(phone)) && !/^\+?\d{10,13}$/.test(toEnglishDigits(phone))) {
      await ctx.reply('شماره معتبر نیست. مثلاً ۰۹۱۲۳۴۵۶۷۸۹ یا دکمه اشتراک‌گذاری.', {
        reply_markup: phoneWizardKeyboard(),
      });
      return true;
    }
    draft.phone = toEnglishDigits(phone);
    await upsertSession(telegramId, { step: 'profile_photo', draftProfile: draft });
    await askProfilePhoto(ctx);
    return true;
  }

  if (session.step === 'profile_photo') {
    await ctx.reply('لطفاً یک عکس بفرست یا «رد کردن» بزن.', {
      reply_markup: textStepKeyboard(profileNavOpts({ skip: true })),
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
    const user = await getCtxUser(ctx);
    await ctx.reply('باشه، حسابت همون‌طور موند.', {
      reply_markup: mainMenuKeyboard(user?.role, user?.roles),
    });
    return;
  }
  await setUserActive(String(from.id), false);
  const user = await getCtxUser(ctx);
  await ctx.reply(
    '⏸ حسابت غیرفعال شد.\nبرای فعال‌سازی دوباره از پروفایل «فعال‌سازی» رو بزن.',
    { reply_markup: mainMenuKeyboard(user?.role, user?.roles) }
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
    const user = await getCtxUser(ctx);
    await ctx.reply('حذف لغو شد.', {
      reply_markup: mainMenuKeyboard(user?.role, user?.roles),
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
    await ctx.reply('اطلاعات ناقصه. دوباره از «پروفایل خودم» شروع کن یا مراحل رو کامل کن.');
    await upsertSession(telegramId, { step: 'profile_name', draftProfile: draft });
    await askProfileName(ctx, draft.name);
    return;
  }

  if (draft.country === COUNTRY_IRAN && !draft.province) {
    await ctx.reply('برای ایران باید استان رو هم انتخاب کنی.');
    await upsertSession(telegramId, { step: 'profile_province', draftProfile: draft });
    await askProfileProvince(ctx);
    return;
  }

  try {
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
    const text = `✅ پروفایلت کامل شد!\n\n${formatProfileCard(
      user,
      pets.length,
      pets.map((p) => p.name)
    )}`;
    await sendOwnProfileCard(ctx, user, pets.length, text);
    await ctx.reply('منوی اصلی 👇', { reply_markup: mainMenuKeyboard(user.role, user.roles) });
  } catch (err) {
    console.error('finishProfileWizard failed:', err);
    await ctx.reply('ثبت پروفایل با خطا مواجه شد. یک بار دیگه «✅ ثبت علایق» رو بزن یا از /profile دوباره شروع کن.');
  }
}
