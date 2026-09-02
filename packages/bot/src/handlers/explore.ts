import type { Context } from 'grammy';
import type { PetProfile } from '@petdate/shared';
import { getPet, listPets } from '../api-client';
import { formatPet } from '../format';
import { exploreListKeyboard, mainMenuKeyboard, petDetailKeyboard } from '../keyboards';
import { getCtxUser } from './start';
import { upsertSession } from '../session';

const PAGE_SIZE = 5;

export async function handleExplore(ctx: Context, page = 0): Promise<void> {
  const user = await getCtxUser(ctx);
  if (!user) {
    await ctx.reply('اول /start بزن.');
    return;
  }

  const allPets = await listPets({ lookingForPlaymate: true });
  const myPetIds = user.id ? (await listPets({ ownerId: user.id })).map((p) => p.id) : [];
  const pets = allPets.filter((p) => !myPetIds.includes(p.id));

  if (pets.length === 0) {
    await ctx.reply('فعلاً همبازی‌ای ثبت نشده. بعداً سر بزن یا اول پت ثبت کن!', {
      reply_markup: mainMenuKeyboard(),
    });
    return;
  }

  await upsertSession(String(ctx.from!.id), { explorePage: page, step: 'ready' });

  const text = `🔍 **همبازی‌های موجود** (${pets.length} پت)\n\nیکی رو انتخاب کن:`;
  const kb = exploreListKeyboard(pets, page, PAGE_SIZE);

  if (ctx.callbackQuery) {
    await ctx.editMessageText(text, { parse_mode: 'Markdown', reply_markup: kb });
  } else {
    await ctx.reply(text, { parse_mode: 'Markdown', reply_markup: kb });
  }
}

export async function handleExplorePet(ctx: Context, petId: number): Promise<void> {
  const user = await getCtxUser(ctx);
  const pet = await getPet(petId);
  if (!pet) {
    await ctx.answerCallbackQuery({ text: 'پت پیدا نشد', show_alert: true });
    return;
  }

  const myPets = user?.id ? await listPets({ ownerId: user.id }) : [];
  const canRequest = myPets.length > 0 && pet.ownerId !== user?.id;

  await ctx.answerCallbackQuery();
  await ctx.editMessageText(formatPet(pet, true), {
    parse_mode: 'Markdown',
    reply_markup: petDetailKeyboard(petId, canRequest),
  });
}

export async function handleExploreBack(ctx: Context): Promise<void> {
  const session = await import('../session').then((m) => m.getSession(String(ctx.from!.id)));
  await handleExplore(ctx, session?.explorePage ?? 0);
}

export { PAGE_SIZE };
