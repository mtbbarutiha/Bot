import type { Context } from 'grammy';
import type { BotStep, PetDraft, PetGender, PetSize, PetSpecies } from '@petdate/shared';
import {
  PET_AGE_CUSTOM_LABEL,
  PET_GENDER_LABELS,
  PET_SIZE_LABELS,
  PET_SPECIES_LABELS,
  formatPetAge,
  parsePetAgeInput,
} from '@petdate/shared';
import {
  createPet,
  getUserByTelegramId,
  listBreeds,
  listSpecies,
} from '../api-client';
import {
  BREED_PAGE_SIZE,
  COMMON_CITIES,
  NO_LABEL,
  PET_FEMALE_LABEL,
  PET_MALE_LABEL,
  WIZARD_NAV,
  YES_LABEL,
  breedReplyKeyboard,
  cityReplyKeyboard,
  mainMenuKeyboard,
  petAgeReplyKeyboard,
  petGenderReplyKeyboard,
  petSizeReplyKeyboard,
  speciesReplyKeyboard,
  textStepKeyboard,
  yesNoReplyKeyboard,
} from '../keyboards';
import { getSession, upsertSession } from '../session';

const TOTAL_STEPS = 14;

const PET_BACK: Partial<Record<BotStep, BotStep>> = {
  pet_species: 'pet_name',
  pet_breed: 'pet_species',
  pet_gender: 'pet_breed',
  pet_age: 'pet_gender',
  pet_size: 'pet_age',
  pet_color: 'pet_size',
  pet_vaccinated: 'pet_color',
  pet_neutered: 'pet_vaccinated',
  pet_diseases: 'pet_neutered',
  pet_city: 'pet_diseases',
  pet_looking: 'pet_city',
  pet_bio: 'pet_looking',
  pet_photo: 'pet_bio',
};

function stepLabel(n: number): string {
  return `مرحله ${n} از ${TOTAL_STEPS}`;
}

async function cancelWizard(ctx: Context, telegramId: string): Promise<void> {
  const user = await getUserByTelegramId(telegramId);
  await upsertSession(telegramId, {
    step: 'ready',
    draftPet: undefined,
    breedPage: undefined,
  });
  await ctx.reply('ثبت پت لغو شد.', { reply_markup: mainMenuKeyboard(user?.role) });
}

export async function startPetWizard(ctx: Context, telegramId: string): Promise<void> {
  await upsertSession(telegramId, { step: 'pet_name', draftPet: {}, breedPage: 0 });
  await askPetName(ctx);
}

async function askPetName(ctx: Context): Promise<void> {
  await ctx.reply(
    [
      '🐾 **ثبت پت جدید**',
      '',
      `📝 ${stepLabel(1)}`,
      '',
      'نام پتت رو بنویس:',
    ].join('\n'),
    { parse_mode: 'Markdown', reply_markup: textStepKeyboard({ noBack: true }) }
  );
}

async function askSpecies(ctx: Context): Promise<void> {
  const species = await listSpecies();
  await ctx.reply(`🐾 **${stepLabel(2)}**\n\nنوع پت رو از منو انتخاب کن:`, {
    parse_mode: 'Markdown',
    reply_markup: speciesReplyKeyboard(species),
  });
}

async function askBreed(ctx: Context, speciesCode: string, page = 0): Promise<void> {
  const breeds = await listBreeds(speciesCode);
  if (breeds.length === 0) {
    await ctx.reply(`🧬 **${stepLabel(3)}**\n\nنژاد پت رو بنویس (یا رد کن):`, {
      parse_mode: 'Markdown',
      reply_markup: textStepKeyboard({ skip: true }),
    });
    return;
  }
  const totalPages = Math.max(1, Math.ceil(breeds.length / BREED_PAGE_SIZE));
  const safePage = Math.min(Math.max(0, page), totalPages - 1);
  await ctx.reply(
    `🧬 **${stepLabel(3)}**\n\nنژاد رو انتخاب کن (صفحه ${safePage + 1}/${totalPages}):`,
    {
      parse_mode: 'Markdown',
      reply_markup: breedReplyKeyboard(breeds, safePage),
    }
  );
}

async function askGender(ctx: Context): Promise<void> {
  await ctx.reply(`⚧ **${stepLabel(4)}**\n\nجنسیت پت رو انتخاب کن:`, {
    parse_mode: 'Markdown',
    reply_markup: petGenderReplyKeyboard(),
  });
}

async function askAge(ctx: Context): Promise<void> {
  await ctx.reply(
    [
      `🎂 **${stepLabel(5)}**`,
      '',
      'سن پت رو انتخاب کن:',
      '',
      '_یا بنویس مثل: ۸ ماهه · ۲ ساله · ۱ سال و ۳ ماه_',
    ].join('\n'),
    { parse_mode: 'Markdown', reply_markup: petAgeReplyKeyboard() }
  );
}

async function askSize(ctx: Context): Promise<void> {
  await ctx.reply(`📏 **${stepLabel(6)}**\n\nاندازه پت رو انتخاب کن:`, {
    parse_mode: 'Markdown',
    reply_markup: petSizeReplyKeyboard(),
  });
}

async function askColor(ctx: Context): Promise<void> {
  await ctx.reply(`🎨 **${stepLabel(7)}**\n\nرنگ پت رو بنویس (یا رد کن):`, {
    parse_mode: 'Markdown',
    reply_markup: textStepKeyboard({ skip: true }),
  });
}

async function askVaccinated(ctx: Context): Promise<void> {
  await ctx.reply(`💉 **${stepLabel(8)}**\n\nواکسن زده؟`, {
    parse_mode: 'Markdown',
    reply_markup: yesNoReplyKeyboard(),
  });
}

async function askNeutered(ctx: Context): Promise<void> {
  await ctx.reply(`✂️ **${stepLabel(9)}**\n\nعقیم‌سازی شده؟`, {
    parse_mode: 'Markdown',
    reply_markup: yesNoReplyKeyboard(),
  });
}

async function askDiseases(ctx: Context): Promise<void> {
  await ctx.reply(
    `🏥 **${stepLabel(10)}**\n\nبیماری یا حساسیت خاصی داره؟ بنویس یا رد کن:`,
    { parse_mode: 'Markdown', reply_markup: textStepKeyboard({ skip: true }) }
  );
}

async function askCity(ctx: Context): Promise<void> {
  await ctx.reply(`🏙 **${stepLabel(11)}**\n\nشهر پت رو انتخاب کن یا بنویس:`, {
    parse_mode: 'Markdown',
    reply_markup: cityReplyKeyboard({ skip: true }),
  });
}

async function askLooking(ctx: Context): Promise<void> {
  await ctx.reply(`🤝 **${stepLabel(12)}**\n\nدنبال همبازی هست؟`, {
    parse_mode: 'Markdown',
    reply_markup: yesNoReplyKeyboard(),
  });
}

async function askBio(ctx: Context): Promise<void> {
  await ctx.reply(
    `💬 **${stepLabel(13)}**\n\nچند خط درباره پت بنویس (شخصیت، عادت‌ها...) یا رد کن:`,
    { parse_mode: 'Markdown', reply_markup: textStepKeyboard({ skip: true }) }
  );
}

async function askPhoto(ctx: Context): Promise<void> {
  await ctx.reply(`🖼 **${stepLabel(14)}**\n\nیک عکس از پت بفرست (یا رد کن):`, {
    parse_mode: 'Markdown',
    reply_markup: textStepKeyboard({ skip: true }),
  });
}

async function promptPetStep(
  ctx: Context,
  step: BotStep,
  draft: PetDraft,
  breedPage = 0
): Promise<void> {
  switch (step) {
    case 'pet_name':
      await askPetName(ctx);
      return;
    case 'pet_species':
      await askSpecies(ctx);
      return;
    case 'pet_breed':
      await askBreed(ctx, draft.species ?? 'other', breedPage);
      return;
    case 'pet_gender':
      await askGender(ctx);
      return;
    case 'pet_age':
      await askAge(ctx);
      return;
    case 'pet_size':
      await askSize(ctx);
      return;
    case 'pet_color':
      await askColor(ctx);
      return;
    case 'pet_vaccinated':
      await askVaccinated(ctx);
      return;
    case 'pet_neutered':
      await askNeutered(ctx);
      return;
    case 'pet_diseases':
      await askDiseases(ctx);
      return;
    case 'pet_city':
      await askCity(ctx);
      return;
    case 'pet_looking':
      await askLooking(ctx);
      return;
    case 'pet_bio':
      await askBio(ctx);
      return;
    case 'pet_photo':
      await askPhoto(ctx);
      return;
    default:
      return;
  }
}

function parseYesNo(text: string): boolean | null {
  const t = text.trim();
  if (t === YES_LABEL || t === 'بله' || t === 'آره') return true;
  if (t === NO_LABEL || t === 'خیر' || t === 'نه') return false;
  return null;
}

function parsePetGender(text: string): PetGender | null {
  const t = text.trim();
  if (t === PET_MALE_LABEL || t === PET_GENDER_LABELS.male || t === 'نر') return 'male';
  if (t === PET_FEMALE_LABEL || t === PET_GENDER_LABELS.female || t === 'ماده') return 'female';
  return null;
}

function parsePetSize(text: string): PetSize | null {
  const t = text.trim();
  if (t === PET_SIZE_LABELS.small || t === 'کوچک') return 'small';
  if (t === PET_SIZE_LABELS.medium || t === 'متوسط') return 'medium';
  if (t === PET_SIZE_LABELS.large || t === 'بزرگ') return 'large';
  return null;
}

function matchSpecies(text: string, species: PetSpecies[]): PetSpecies | null {
  const t = text.trim();
  return (
    species.find(
      (s) =>
        t === `${s.emoji} ${s.labelFa}` ||
        t === s.labelFa ||
        t === s.code ||
        t === PET_SPECIES_LABELS[s.code]
    ) ?? null
  );
}

export async function handleWizardText(ctx: Context, text: string): Promise<boolean> {
  const from = ctx.from;
  if (!from) return false;

  const telegramId = String(from.id);
  const session = await getSession(telegramId);
  if (!session || !session.userId) return false;

  const step = session.step;
  if (!String(step).startsWith('pet_') && step !== 'playdate_message') return false;

  const draft: PetDraft = { ...session.draftPet };

  if (step === 'playdate_message') {
    // پیام برای صاحب پت حذف شد — درخواست مستقیم ارسال می‌شود
    await upsertSession(telegramId, {
      step: 'ready',
      selectedPetId: undefined,
      selectedToPetId: undefined,
    });
    await ctx.reply('برای پیدا کردن همبازی از منو «🔍 پیدا کردن همبازی» رو بزن.', {
      reply_markup: mainMenuKeyboard((await getUserByTelegramId(telegramId))?.role),
    });
    return true;
  }

  if (text === WIZARD_NAV.cancel) {
    await cancelWizard(ctx, telegramId);
    return true;
  }

  if (text === WIZARD_NAV.back) {
    const prev = PET_BACK[step];
    if (!prev) {
      await cancelWizard(ctx, telegramId);
      return true;
    }
    const breedPage = prev === 'pet_breed' ? (session.breedPage ?? 0) : 0;
    await upsertSession(telegramId, { step: prev, draftPet: draft, breedPage });
    await ctx.reply('برگشتیم یک مرحله ↩️');
    await promptPetStep(ctx, prev, draft, breedPage);
    return true;
  }

  if (text === WIZARD_NAV.skip) {
    return handleSkipText(ctx, telegramId, session.userId, step, draft);
  }

  if (step === 'pet_name') {
    const name = text.trim();
    if (name.length < 1) {
      await ctx.reply('نام پت رو بنویس.', { reply_markup: textStepKeyboard({ noBack: true }) });
      return true;
    }
    draft.name = name;
    await upsertSession(telegramId, { step: 'pet_species', draftPet: draft });
    await askSpecies(ctx);
    return true;
  }

  if (step === 'pet_species') {
    const speciesList = await listSpecies();
    const matched = matchSpecies(text, speciesList);
    if (!matched) {
      await ctx.reply('از دکمه‌های کیبورد نوع پت رو انتخاب کن:', {
        reply_markup: speciesReplyKeyboard(speciesList),
      });
      return true;
    }
    draft.species = matched.code;
    await upsertSession(telegramId, { step: 'pet_breed', draftPet: draft, breedPage: 0 });
    await askBreed(ctx, matched.code, 0);
    return true;
  }

  if (step === 'pet_breed') {
    return handleBreedText(ctx, telegramId, draft, text, session.breedPage ?? 0);
  }

  if (step === 'pet_gender') {
    const gender = parsePetGender(text);
    if (!gender) {
      await ctx.reply('از دکمه‌ها انتخاب کن:', { reply_markup: petGenderReplyKeyboard() });
      return true;
    }
    draft.gender = gender;
    await upsertSession(telegramId, { step: 'pet_age', draftPet: draft });
    await askAge(ctx);
    return true;
  }

  if (step === 'pet_age') {
    if (text.trim() === PET_AGE_CUSTOM_LABEL) {
      await ctx.reply(
        [
          'سن دقیق رو بنویس، مثلاً:',
          '• ۸ ماهه',
          '• ۲ ساله',
          '• ۱ سال و ۳ ماه',
        ].join('\n'),
        { reply_markup: textStepKeyboard() }
      );
      return true;
    }

    const ageMonths = parsePetAgeInput(text);
    if (ageMonths == null) {
      await ctx.reply(
        'سن رو از دکمه‌ها انتخاب کن یا با واحد بنویس؛ مثل «۶ ماهه» یا «۲ ساله».',
        { reply_markup: petAgeReplyKeyboard() }
      );
      return true;
    }
    draft.ageMonths = ageMonths;
    await upsertSession(telegramId, { step: 'pet_size', draftPet: draft });
    await ctx.reply(`✅ سن ثبت شد: **${formatPetAge(ageMonths)}**`, { parse_mode: 'Markdown' });
    await askSize(ctx);
    return true;
  }

  if (step === 'pet_size') {
    const size = parsePetSize(text);
    if (!size) {
      await ctx.reply('از دکمه‌ها انتخاب کن:', { reply_markup: petSizeReplyKeyboard() });
      return true;
    }
    draft.size = size;
    await upsertSession(telegramId, { step: 'pet_color', draftPet: draft });
    await askColor(ctx);
    return true;
  }

  if (step === 'pet_color') {
    draft.color = text.trim().slice(0, 60);
    await upsertSession(telegramId, { step: 'pet_vaccinated', draftPet: draft });
    await askVaccinated(ctx);
    return true;
  }

  if (step === 'pet_vaccinated') {
    const value = parseYesNo(text);
    if (value == null) {
      await ctx.reply('بله یا خیر؟', { reply_markup: yesNoReplyKeyboard() });
      return true;
    }
    draft.vaccinated = value;
    await upsertSession(telegramId, { step: 'pet_neutered', draftPet: draft });
    await askNeutered(ctx);
    return true;
  }

  if (step === 'pet_neutered') {
    const value = parseYesNo(text);
    if (value == null) {
      await ctx.reply('بله یا خیر؟', { reply_markup: yesNoReplyKeyboard() });
      return true;
    }
    draft.neutered = value;
    await upsertSession(telegramId, { step: 'pet_diseases', draftPet: draft });
    await askDiseases(ctx);
    return true;
  }

  if (step === 'pet_diseases') {
    draft.diseases = text.trim().slice(0, 200);
    await upsertSession(telegramId, { step: 'pet_city', draftPet: draft });
    await askCity(ctx);
    return true;
  }

  if (step === 'pet_city') {
    if (text === WIZARD_NAV.otherCity) {
      await ctx.reply('نام شهر رو بنویس:', { reply_markup: textStepKeyboard({ skip: true }) });
      return true;
    }
    draft.city = text.trim();
    await upsertSession(telegramId, { step: 'pet_looking', draftPet: draft });
    await askLooking(ctx);
    return true;
  }

  if (step === 'pet_looking') {
    const value = parseYesNo(text);
    if (value == null) {
      await ctx.reply('بله یا خیر؟', { reply_markup: yesNoReplyKeyboard() });
      return true;
    }
    draft.lookingForPlaymate = value;
    await upsertSession(telegramId, { step: 'pet_bio', draftPet: draft });
    await askBio(ctx);
    return true;
  }

  if (step === 'pet_bio') {
    draft.bio = text.trim().slice(0, 400);
    await upsertSession(telegramId, { step: 'pet_photo', draftPet: draft });
    await askPhoto(ctx);
    return true;
  }

  if (step === 'pet_photo') {
    await ctx.reply('لطفاً یک عکس بفرست یا «رد کردن» بزن.', {
      reply_markup: textStepKeyboard({ skip: true }),
    });
    return true;
  }

  return false;
}

async function handleBreedText(
  ctx: Context,
  telegramId: string,
  draft: PetDraft,
  text: string,
  page: number
): Promise<boolean> {
  const species = draft.species ?? 'other';
  const breeds = await listBreeds(species);
  const totalPages = Math.max(1, Math.ceil(breeds.length / BREED_PAGE_SIZE));

  if (text === WIZARD_NAV.nextPage) {
    const next = Math.min(page + 1, totalPages - 1);
    await upsertSession(telegramId, { breedPage: next });
    await askBreed(ctx, species, next);
    return true;
  }

  if (text === WIZARD_NAV.prevPage) {
    const prev = Math.max(page - 1, 0);
    await upsertSession(telegramId, { breedPage: prev });
    await askBreed(ctx, species, prev);
    return true;
  }

  // ignore page indicator taps like "1/2"
  if (/^\d+\/\d+$/.test(text.trim())) {
    await askBreed(ctx, species, page);
    return true;
  }

  if (text === WIZARD_NAV.custom) {
    await ctx.reply('نژاد رو بنویس:', { reply_markup: textStepKeyboard({ skip: true }) });
    return true;
  }

  const matched = breeds.find((b) => b.nameFa === text.trim());
  if (matched) {
    draft.breed = matched.nameFa;
    await upsertSession(telegramId, { step: 'pet_gender', draftPet: draft });
    await askGender(ctx);
    return true;
  }

  // free-text / custom breed
  if (text.trim().length >= 1 && !COMMON_CITIES.includes(text.trim() as (typeof COMMON_CITIES)[number])) {
    draft.breed = text.trim().slice(0, 80);
    await upsertSession(telegramId, { step: 'pet_gender', draftPet: draft });
    await askGender(ctx);
    return true;
  }

  await askBreed(ctx, species, page);
  return true;
}

async function handleSkipText(
  ctx: Context,
  telegramId: string,
  userId: number,
  step: BotStep,
  draft: PetDraft
): Promise<boolean> {
  if (step === 'pet_breed') {
    await upsertSession(telegramId, { step: 'pet_gender', draftPet: draft });
    await askGender(ctx);
    return true;
  }
  if (step === 'pet_color') {
    await upsertSession(telegramId, { step: 'pet_vaccinated', draftPet: draft });
    await askVaccinated(ctx);
    return true;
  }
  if (step === 'pet_diseases') {
    await upsertSession(telegramId, { step: 'pet_city', draftPet: draft });
    await askCity(ctx);
    return true;
  }
  if (step === 'pet_city') {
    await upsertSession(telegramId, { step: 'pet_looking', draftPet: draft });
    await askLooking(ctx);
    return true;
  }
  if (step === 'pet_bio') {
    await upsertSession(telegramId, { step: 'pet_photo', draftPet: draft });
    await askPhoto(ctx);
    return true;
  }
  if (step === 'pet_photo') {
    await finishPetWizard(ctx, telegramId, userId, draft);
    return true;
  }
  return true;
}

async function handlePlaydateMessage(
  _ctx: Context,
  _telegramId: string,
  _userId: number,
  _text: string
): Promise<boolean> {
  return false;
}

/** Legacy inline callbacks — keep working for old messages */
export async function handleSpeciesSelect(ctx: Context, species: string): Promise<void> {
  const from = ctx.from;
  if (!from) return;

  const telegramId = String(from.id);
  const session = await getSession(telegramId);
  if (!session || session.step !== 'pet_species') return;

  const draft: PetDraft = { ...session.draftPet, species };
  await upsertSession(telegramId, { step: 'pet_breed', draftPet: draft, breedPage: 0 });
  await ctx.answerCallbackQuery();
  await askBreed(ctx, species, 0);
}

export async function handleBreedSelect(ctx: Context, breedId: number): Promise<void> {
  const from = ctx.from;
  if (!from) return;

  const telegramId = String(from.id);
  const session = await getSession(telegramId);
  if (!session || session.step !== 'pet_breed') return;

  const species = session.draftPet?.species;
  const breeds = species ? await listBreeds(species) : await listBreeds();
  const breed = breeds.find((b) => b.id === breedId);
  if (!breed) {
    await ctx.answerCallbackQuery({ text: 'نژاد پیدا نشد', show_alert: true });
    return;
  }

  const draft: PetDraft = { ...session.draftPet, breed: breed.nameFa };
  await upsertSession(telegramId, { step: 'pet_gender', draftPet: draft });
  await ctx.answerCallbackQuery({ text: breed.nameFa });
  await askGender(ctx);
}

export async function handleBreedCustom(ctx: Context): Promise<void> {
  const from = ctx.from;
  if (!from) return;

  const telegramId = String(from.id);
  const session = await getSession(telegramId);
  if (!session || session.step !== 'pet_breed') return;

  await ctx.answerCallbackQuery();
  await ctx.reply('نژاد رو بنویس:', { reply_markup: textStepKeyboard({ skip: true }) });
}

export async function handlePetGenderSelect(ctx: Context, gender: PetGender): Promise<void> {
  const from = ctx.from;
  if (!from) return;

  const telegramId = String(from.id);
  const session = await getSession(telegramId);
  if (!session || session.step !== 'pet_gender') return;

  const draft: PetDraft = { ...session.draftPet, gender };
  await upsertSession(telegramId, { step: 'pet_age', draftPet: draft });
  await ctx.answerCallbackQuery({ text: PET_GENDER_LABELS[gender] });
  await askAge(ctx);
}

export async function handlePetSizeSelect(ctx: Context, size: PetSize): Promise<void> {
  const from = ctx.from;
  if (!from) return;

  const telegramId = String(from.id);
  const session = await getSession(telegramId);
  if (!session || session.step !== 'pet_size') return;

  const draft: PetDraft = { ...session.draftPet, size };
  await upsertSession(telegramId, { step: 'pet_color', draftPet: draft });
  await ctx.answerCallbackQuery({ text: PET_SIZE_LABELS[size] });
  await askColor(ctx);
}

export async function handlePetBoolSelect(
  ctx: Context,
  field: 'vaccinated' | 'neutered' | 'looking',
  value: boolean
): Promise<void> {
  const from = ctx.from;
  if (!from) return;

  const telegramId = String(from.id);
  const session = await getSession(telegramId);
  if (!session) return;

  const draft: PetDraft = { ...session.draftPet };
  await ctx.answerCallbackQuery({ text: value ? 'بله' : 'خیر' });

  if (field === 'vaccinated' && session.step === 'pet_vaccinated') {
    draft.vaccinated = value;
    await upsertSession(telegramId, { step: 'pet_neutered', draftPet: draft });
    await askNeutered(ctx);
    return;
  }

  if (field === 'neutered' && session.step === 'pet_neutered') {
    draft.neutered = value;
    await upsertSession(telegramId, { step: 'pet_diseases', draftPet: draft });
    await askDiseases(ctx);
    return;
  }

  if (field === 'looking' && session.step === 'pet_looking') {
    draft.lookingForPlaymate = value;
    await upsertSession(telegramId, { step: 'pet_bio', draftPet: draft });
    await askBio(ctx);
  }
}

export async function handleWizardSkip(
  ctx: Context,
  field: 'breed' | 'color' | 'diseases' | 'city' | 'bio' | 'photo'
): Promise<void> {
  const from = ctx.from;
  if (!from) return;

  const telegramId = String(from.id);
  const session = await getSession(telegramId);
  if (!session?.userId) return;

  await ctx.answerCallbackQuery();
  const draft: PetDraft = { ...session.draftPet };

  if (field === 'breed') {
    await upsertSession(telegramId, { step: 'pet_gender', draftPet: draft });
    await askGender(ctx);
    return;
  }

  if (field === 'color') {
    await upsertSession(telegramId, { step: 'pet_vaccinated', draftPet: draft });
    await askVaccinated(ctx);
    return;
  }

  if (field === 'diseases') {
    await upsertSession(telegramId, { step: 'pet_city', draftPet: draft });
    await askCity(ctx);
    return;
  }

  if (field === 'city') {
    await upsertSession(telegramId, { step: 'pet_looking', draftPet: draft });
    await askLooking(ctx);
    return;
  }

  if (field === 'bio') {
    await upsertSession(telegramId, { step: 'pet_photo', draftPet: draft });
    await askPhoto(ctx);
    return;
  }

  await finishPetWizard(ctx, telegramId, session.userId, draft);
}

export async function handlePetPhoto(ctx: Context): Promise<boolean> {
  const from = ctx.from;
  const photos = ctx.message?.photo;
  if (!from || !photos?.length) return false;

  const telegramId = String(from.id);
  const session = await getSession(telegramId);
  if (!session?.userId || session.step !== 'pet_photo') return false;

  const best = photos[photos.length - 1]!;
  const draft: PetDraft = {
    ...session.draftPet,
    imageUrl: best.file_id,
  };
  await finishPetWizard(ctx, telegramId, session.userId, draft);
  return true;
}

async function finishPetWizard(
  ctx: Context,
  telegramId: string,
  userId: number,
  draft: PetDraft
): Promise<void> {
  if (!draft.name || !draft.species) {
    await ctx.reply('اطلاعات ناقصه. دوباره از «ثبت پت جدید» شروع کن.');
    await upsertSession(telegramId, { step: 'ready', draftPet: undefined, breedPage: undefined });
    return;
  }

  const health: Record<string, unknown> = {};
  if (draft.diseases) health.diseases = draft.diseases;

  try {
    const pet = await createPet({
      ownerId: userId,
      name: draft.name,
      species: draft.species,
      breed: draft.breed,
      gender: draft.gender,
      ageMonths: draft.ageMonths,
      size: draft.size,
      color: draft.color,
      bio: draft.bio,
      vaccinated: draft.vaccinated ?? false,
      neutered: draft.neutered ?? false,
      lookingForPlaymate: draft.lookingForPlaymate ?? true,
      health,
      diseases: draft.diseases,
      imageUrl: draft.imageUrl,
      city: draft.city,
      neighborhood: draft.neighborhood,
    });

    await upsertSession(telegramId, { step: 'ready', draftPet: undefined, breedPage: undefined });

    const gender = pet.gender ? PET_GENDER_LABELS[pet.gender] : null;
    const size = pet.size ? PET_SIZE_LABELS[pet.size] : null;
    const speciesLabel = PET_SPECIES_LABELS[pet.species] ?? pet.species;
    const lines = [
      `🎉 **${pet.name}** با موفقیت ثبت شد!`,
      '',
      `نوع: ${speciesLabel}`,
      pet.breed ? `نژاد: ${pet.breed}` : null,
      gender ? `جنسیت: ${gender}` : null,
      pet.ageMonths != null ? `سن: ${formatPetAge(pet.ageMonths)}` : null,
      size ? `اندازه: ${size}` : null,
      pet.color ? `رنگ: ${pet.color}` : null,
      pet.city ? `📍 ${pet.city}` : null,
      `واکسن: ${pet.vaccinated ? 'بله' : 'خیر'} · عقیم: ${pet.neutered ? 'بله' : 'خیر'}`,
      pet.lookingForPlaymate ? '🤝 دنبال همبازی' : null,
    ].filter(Boolean);

    const caption = lines.join('\n');
    if (pet.imageUrl) {
      try {
        await ctx.replyWithPhoto(pet.imageUrl, {
          caption,
          parse_mode: 'Markdown',
          reply_markup: mainMenuKeyboard('pet_owner'),
        });
        return;
      } catch {
        /* fall through */
      }
    }

    await ctx.reply(caption, {
      parse_mode: 'Markdown',
      reply_markup: mainMenuKeyboard('pet_owner'),
    });
  } catch (err) {
    console.error('createPet failed:', err);
    await ctx.reply('ثبت پت با خطا مواجه شد. دوباره امتحان کن یا انصراف بزن.', {
      reply_markup: textStepKeyboard(),
    });
  }
}

export async function handleAddPetCommand(ctx: Context): Promise<void> {
  const from = ctx.from;
  if (!from) return;

  const user = await getUserByTelegramId(String(from.id));
  if (!user) {
    await ctx.reply('اول /start بزن.');
    return;
  }
  if (user.role !== 'pet_owner') {
    await ctx.reply('ثبت پت فقط برای **صاحب پت** فعاله. نقشت رو در /start عوض کن.', {
      parse_mode: 'Markdown',
    });
    return;
  }

  await startPetWizard(ctx, String(from.id));
}
