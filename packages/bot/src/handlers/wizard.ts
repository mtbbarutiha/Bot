import type { Context } from 'grammy';
import type { PetDraft, PetGender, PetSize } from '@petdate/shared';
import {
  PET_GENDER_LABELS,
  PET_SIZE_LABELS,
  PET_SPECIES_LABELS,
} from '@petdate/shared';
import {
  createPet,
  getUserByTelegramId,
  listBreeds,
  listSpecies,
} from '../api-client';
import {
  breedKeyboard,
  mainMenuKeyboard,
  petBoolKeyboard,
  petGenderKeyboard,
  petSizeKeyboard,
  skipKeyboard,
  speciesKeyboardFromCatalog,
} from '../keyboards';
import { getSession, upsertSession } from '../session';

const TOTAL_STEPS = 14;

function stepLabel(n: number): string {
  return `مرحله ${n} از ${TOTAL_STEPS}`;
}

export async function startPetWizard(ctx: Context, telegramId: string): Promise<void> {
  await upsertSession(telegramId, { step: 'pet_name', draftPet: {} });
  await ctx.reply(
    [
      '🐾 **ثبت پت جدید**',
      '',
      `📝 ${stepLabel(1)}`,
      '',
      'نام پتت رو بنویس:',
      '_(یا /cancel برای انصراف)_',
    ].join('\n'),
    { parse_mode: 'Markdown' }
  );
}

async function askSpecies(ctx: Context): Promise<void> {
  const species = await listSpecies();
  await ctx.reply(`🐾 **${stepLabel(2)}**\n\nنوع پت رو انتخاب کن:`, {
    parse_mode: 'Markdown',
    reply_markup: speciesKeyboardFromCatalog(species),
  });
}

async function askBreed(ctx: Context, speciesCode: string): Promise<void> {
  const breeds = await listBreeds(speciesCode);
  if (breeds.length === 0) {
    await ctx.reply(
      `🧬 **${stepLabel(3)}**\n\nنژاد پت رو بنویس (یا رد کن):`,
      {
        parse_mode: 'Markdown',
        reply_markup: skipKeyboard('wizard:skip_breed'),
      }
    );
    return;
  }
  await ctx.reply(`🧬 **${stepLabel(3)}**\n\nنژاد پت رو انتخاب کن:`, {
    parse_mode: 'Markdown',
    reply_markup: breedKeyboard(breeds),
  });
}

function askGender(ctx: Context) {
  return ctx.reply(`⚧ **${stepLabel(4)}**\n\nجنسیت پت رو انتخاب کن:`, {
    parse_mode: 'Markdown',
    reply_markup: petGenderKeyboard(),
  });
}

function askAge(ctx: Context) {
  return ctx.reply(
    `🎂 **${stepLabel(5)}**\n\nسن پت چند ماهه؟\n_(مثلاً: ۱۲ برای یک‌ساله، یا ۳ برای سه‌ماهه)_`,
    { parse_mode: 'Markdown' }
  );
}

function askSize(ctx: Context) {
  return ctx.reply(`📏 **${stepLabel(6)}**\n\nاندازه پت رو انتخاب کن:`, {
    parse_mode: 'Markdown',
    reply_markup: petSizeKeyboard(),
  });
}

function askColor(ctx: Context) {
  return ctx.reply(`🎨 **${stepLabel(7)}**\n\nرنگ پت رو بنویس (یا رد کن):`, {
    parse_mode: 'Markdown',
    reply_markup: skipKeyboard('wizard:skip_color'),
  });
}

function askVaccinated(ctx: Context) {
  return ctx.reply(`💉 **${stepLabel(8)}**\n\nواکسن زده؟`, {
    parse_mode: 'Markdown',
    reply_markup: petBoolKeyboard('vaccinated'),
  });
}

function askNeutered(ctx: Context) {
  return ctx.reply(`✂️ **${stepLabel(9)}**\n\nعقیم‌سازی شده؟`, {
    parse_mode: 'Markdown',
    reply_markup: petBoolKeyboard('neutered'),
  });
}

function askDiseases(ctx: Context) {
  return ctx.reply(
    `🏥 **${stepLabel(10)}**\n\nبیماری یا حساسیت خاصی داره؟ بنویس یا رد کن:`,
    {
      parse_mode: 'Markdown',
      reply_markup: skipKeyboard('wizard:skip_diseases'),
    }
  );
}

function askCity(ctx: Context) {
  return ctx.reply(`🏙 **${stepLabel(11)}**\n\nشهر پت رو بنویس (یا رد کن):`, {
    parse_mode: 'Markdown',
    reply_markup: skipKeyboard('wizard:skip_city'),
  });
}

function askLooking(ctx: Context) {
  return ctx.reply(`🤝 **${stepLabel(12)}**\n\nدنبال همبازی هست؟`, {
    parse_mode: 'Markdown',
    reply_markup: petBoolKeyboard('looking'),
  });
}

function askBio(ctx: Context) {
  return ctx.reply(
    `💬 **${stepLabel(13)}**\n\nچند خط درباره پت بنویس (شخصیت، عادت‌ها...) یا رد کن:`,
    {
      parse_mode: 'Markdown',
      reply_markup: skipKeyboard('wizard:skip_bio'),
    }
  );
}

function askPhoto(ctx: Context) {
  return ctx.reply(`🖼 **${stepLabel(14)}**\n\nیک عکس از پت بفرست (یا رد کن):`, {
    parse_mode: 'Markdown',
    reply_markup: skipKeyboard('wizard:skip_photo'),
  });
}

export async function handleWizardText(ctx: Context, text: string): Promise<boolean> {
  const from = ctx.from;
  if (!from) return false;

  const telegramId = String(from.id);
  const session = await getSession(telegramId);
  if (!session || !session.userId) return false;

  const draft: PetDraft = { ...session.draftPet };

  if (session.step === 'pet_name') {
    const name = text.trim();
    if (name.length < 1) {
      await ctx.reply('نام پت رو بنویس.');
      return true;
    }
    draft.name = name;
    await upsertSession(telegramId, { step: 'pet_species', draftPet: draft });
    await askSpecies(ctx);
    return true;
  }

  if (session.step === 'pet_breed') {
    draft.breed = text.trim();
    await upsertSession(telegramId, { step: 'pet_gender', draftPet: draft });
    await askGender(ctx);
    return true;
  }

  if (session.step === 'pet_age') {
    const ageMonths = Number(text.trim().replace(/[^\d]/g, ''));
    if (!Number.isFinite(ageMonths) || ageMonths < 1 || ageMonths > 360) {
      await ctx.reply('سن معتبر وارد کن (۱ تا ۳۶۰ ماه).');
      return true;
    }
    draft.ageMonths = ageMonths;
    await upsertSession(telegramId, { step: 'pet_size', draftPet: draft });
    await askSize(ctx);
    return true;
  }

  if (session.step === 'pet_color') {
    draft.color = text.trim().slice(0, 60);
    await upsertSession(telegramId, { step: 'pet_vaccinated', draftPet: draft });
    await askVaccinated(ctx);
    return true;
  }

  if (session.step === 'pet_diseases') {
    draft.diseases = text.trim().slice(0, 200);
    await upsertSession(telegramId, { step: 'pet_city', draftPet: draft });
    await askCity(ctx);
    return true;
  }

  if (session.step === 'pet_city') {
    draft.city = text.trim();
    await upsertSession(telegramId, { step: 'pet_looking', draftPet: draft });
    await askLooking(ctx);
    return true;
  }

  if (session.step === 'pet_bio') {
    draft.bio = text.trim().slice(0, 400);
    await upsertSession(telegramId, { step: 'pet_photo', draftPet: draft });
    await askPhoto(ctx);
    return true;
  }

  if (session.step === 'playdate_message') {
    const toPetId = session.selectedToPetId;
    const fromPetId = session.selectedPetId;
    if (!toPetId || !fromPetId) {
      await upsertSession(telegramId, { step: 'ready' });
      return false;
    }
    const { createPlaydate } = await import('../api-client');
    await createPlaydate({
      fromPetId,
      toPetId,
      fromUserId: session.userId,
      message: text.trim(),
    });
    await upsertSession(telegramId, {
      step: 'ready',
      selectedPetId: undefined,
      selectedToPetId: undefined,
    });
    const user = await getUserByTelegramId(telegramId);
    await ctx.reply('✅ درخواست همبازی ارسال شد!', { reply_markup: mainMenuKeyboard(user?.role) });
    return true;
  }

  return false;
}

export async function handleSpeciesSelect(ctx: Context, species: string): Promise<void> {
  const from = ctx.from;
  if (!from) return;

  const telegramId = String(from.id);
  const session = await getSession(telegramId);
  if (!session || session.step !== 'pet_species') return;

  const draft: PetDraft = { ...session.draftPet, species };
  await upsertSession(telegramId, { step: 'pet_breed', draftPet: draft });

  await ctx.answerCallbackQuery();
  const label = PET_SPECIES_LABELS[species] ?? species;
  try {
    await ctx.editMessageText(`نوع: **${label}** ✅`, { parse_mode: 'Markdown' });
  } catch {
    /* ignore */
  }
  await askBreed(ctx, species);
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
  try {
    await ctx.editMessageText(`نژاد: **${breed.nameFa}** ✅`, { parse_mode: 'Markdown' });
  } catch {
    /* ignore */
  }
  await askGender(ctx);
}

export async function handleBreedCustom(ctx: Context): Promise<void> {
  const from = ctx.from;
  if (!from) return;

  const telegramId = String(from.id);
  const session = await getSession(telegramId);
  if (!session || session.step !== 'pet_breed') return;

  await ctx.answerCallbackQuery();
  await ctx.reply('نژاد رو بنویس:', { reply_markup: skipKeyboard('wizard:skip_breed') });
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
  try {
    await ctx.editMessageText(`جنسیت: **${PET_GENDER_LABELS[gender]}** ✅`, { parse_mode: 'Markdown' });
  } catch {
    /* ignore */
  }
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
  try {
    await ctx.editMessageText(`اندازه: **${PET_SIZE_LABELS[size]}** ✅`, { parse_mode: 'Markdown' });
  } catch {
    /* ignore */
  }
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
    await upsertSession(telegramId, { step: 'ready', draftPet: undefined });
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

    await upsertSession(telegramId, { step: 'ready', draftPet: undefined });

    const gender = pet.gender ? PET_GENDER_LABELS[pet.gender] : null;
    const size = pet.size ? PET_SIZE_LABELS[pet.size] : null;
    const speciesLabel = PET_SPECIES_LABELS[pet.species] ?? pet.species;
    const lines = [
      `🎉 **${pet.name}** با موفقیت ثبت شد!`,
      '',
      `نوع: ${speciesLabel}`,
      pet.breed ? `نژاد: ${pet.breed}` : null,
      gender ? `جنسیت: ${gender}` : null,
      pet.ageMonths != null ? `سن: ${pet.ageMonths} ماه` : null,
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
    await ctx.reply('ثبت پت با خطا مواجه شد. دوباره امتحان کن یا /cancel بزن.');
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
