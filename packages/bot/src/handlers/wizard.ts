import type { Context } from 'grammy';
import { createPet, getUserByTelegramId } from '../api-client';
import { mainMenuKeyboard, skipKeyboard, speciesKeyboard } from '../keyboards';
import { getSession, upsertSession } from '../session';

export async function startPetWizard(ctx: Context, telegramId: string): Promise<void> {
  await upsertSession(telegramId, { step: 'pet_name', draftPet: {} });
  await ctx.reply(
    '🐾 **ثبت پت**\n\nنام پتت رو بنویس:\n_(یا /cancel برای انصراف)_',
    { parse_mode: 'Markdown' }
  );
}

export async function handleWizardText(ctx: Context, text: string): Promise<boolean> {
  const from = ctx.from;
  if (!from) return false;

  const telegramId = String(from.id);
  const session = await getSession(telegramId);
  if (!session || !session.userId) return false;

  if (session.step === 'pet_name') {
    await upsertSession(telegramId, {
      step: 'pet_species',
      draftPet: { ...session.draftPet, name: text.trim() },
    });
    await ctx.reply(`عالی! **${text.trim()}** 🐾\n\nنوع پت رو انتخاب کن:`, {
      parse_mode: 'Markdown',
      reply_markup: speciesKeyboard(),
    });
    return true;
  }

  if (session.step === 'pet_breed') {
    await upsertSession(telegramId, {
      step: 'pet_city',
      draftPet: { ...session.draftPet, breed: text.trim() },
    });
    await ctx.reply('🏙 شهر پت رو بنویس:', { reply_markup: skipKeyboard('wizard:skip_city') });
    return true;
  }

  if (session.step === 'pet_city') {
    await finishPetWizard(ctx, telegramId, session.userId, {
      ...session.draftPet,
      city: text.trim(),
    });
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
  if (!session) return;

  await upsertSession(telegramId, {
    step: 'pet_breed',
    draftPet: { ...session.draftPet, species },
  });

  await ctx.answerCallbackQuery();
  await ctx.editMessageText('نژاد پت رو بنویس (یا رد کن):');
  await ctx.reply('مثلاً: گلدن رتریور', { reply_markup: skipKeyboard('wizard:skip_breed') });
}

export async function handleWizardSkip(ctx: Context, field: 'breed' | 'city'): Promise<void> {
  const from = ctx.from;
  if (!from) return;

  const telegramId = String(from.id);
  const session = await getSession(telegramId);
  if (!session?.userId) return;

  await ctx.answerCallbackQuery();

  if (field === 'breed') {
    await upsertSession(telegramId, { step: 'pet_city', draftPet: session.draftPet });
    await ctx.reply('🏙 شهر پت رو بنویس (یا رد کن):', { reply_markup: skipKeyboard('wizard:skip_city') });
    return;
  }

  await finishPetWizard(ctx, telegramId, session.userId, session.draftPet ?? {});
}

async function finishPetWizard(
  ctx: Context,
  telegramId: string,
  userId: number,
  draft: { name?: string; species?: string; breed?: string; city?: string }
): Promise<void> {
  if (!draft.name || !draft.species) {
    await ctx.reply('اطلاعات ناقصه. دوباره /addpet بزن.');
    return;
  }

  const pet = await createPet({
    ownerId: userId,
    name: draft.name,
    species: draft.species,
    breed: draft.breed,
    city: draft.city,
  });

  await upsertSession(telegramId, { step: 'ready', draftPet: undefined });
  await ctx.reply(
    `🎉 **${pet.name}** با موفقیت ثبت شد!\n\n${pet.city ? `📍 ${pet.city}\n` : ''}الان می‌تونی همبازی پیدا کنی.`,
    { parse_mode: 'Markdown', reply_markup: mainMenuKeyboard('pet_owner') }
  );
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
    await ctx.reply('ثبت پت فقط برای **صاحب پت** فعاله. نقشت رو در /start عوض کن.', { parse_mode: 'Markdown' });
    return;
  }

  await startPetWizard(ctx, String(from.id));
}
