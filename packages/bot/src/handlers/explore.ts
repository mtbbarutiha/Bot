import type { Context } from 'grammy';
import type { PetProfile } from '@petdate/shared';
import { getPet, listPets } from '../api-client';
import { formatPet } from '../format';
import {
  exploreListKeyboard,
  explorePickMyPetKeyboard,
  mainMenuKeyboard,
  myPetsActionKeyboard,
  petDetailKeyboard,
} from '../keyboards';
import { getSession, upsertSession } from '../session';
import { getCtxUser } from './start';

const PAGE_SIZE = 5;

/** ورود از منو: اول پت خود کاربر را انتخاب کن */
export async function handleFindPlaymate(ctx: Context): Promise<void> {
  await handleExplorePickPet(ctx);
}

export async function handleExplorePickPet(ctx: Context): Promise<void> {
  const user = await getCtxUser(ctx);
  if (!user?.id) {
    await ctx.reply('اول /start بزن.');
    return;
  }

  const myPets = await listPets({ ownerId: user.id });
  if (myPets.length === 0) {
    await ctx.reply('اول باید حداقل یک پت ثبت کنی تا برات همبازی پیدا کنیم.', {
      reply_markup: myPetsActionKeyboard(),
    });
    await ctx.reply('منوی اصلی 👇', { reply_markup: mainMenuKeyboard(user.role) });
    return;
  }

  await upsertSession(String(ctx.from!.id), {
    step: 'ready',
    exploreForPicked: false,
    exploreForPetId: undefined,
    explorePage: 0,
  });

  const text = [
    '🔍 **پیدا کردن همبازی**',
    '',
    'برای **کدوم پتت** همبازی می‌خوای؟',
    '',
    'می‌تونی یکی رو انتخاب کنی یا «همه» رو بزنی.',
  ].join('\n');
  const kb = explorePickMyPetKeyboard(myPets);

  if (ctx.callbackQuery) {
    await ctx.answerCallbackQuery();
    try {
      await ctx.editMessageText(text, { parse_mode: 'Markdown', reply_markup: kb });
      return;
    } catch {
      /* fall through */
    }
  }
  await ctx.reply(text, { parse_mode: 'Markdown', reply_markup: kb });
}

export async function handleExploreForPet(ctx: Context, petId: number | 'all'): Promise<void> {
  const user = await getCtxUser(ctx);
  if (!user?.id) return;

  if (petId !== 'all') {
    const myPets = await listPets({ ownerId: user.id });
    if (!myPets.some((p) => p.id === petId)) {
      await ctx.answerCallbackQuery({ text: 'این پت مال تو نیست', show_alert: true });
      return;
    }
  }

  await upsertSession(String(ctx.from!.id), {
    exploreForPicked: true,
    exploreForPetId: petId === 'all' ? undefined : petId,
    explorePage: 0,
  });

  await ctx.answerCallbackQuery({
    text: petId === 'all' ? 'همه پت‌ها' : 'پت انتخاب شد',
  });
  await handleExplore(ctx, 0);
}

export async function handleExplore(ctx: Context, page = 0): Promise<void> {
  const user = await getCtxUser(ctx);
  if (!user) {
    await ctx.reply('اول /start بزن.');
    return;
  }

  const telegramId = String(ctx.from!.id);
  const session = await getSession(telegramId);

  if (!session?.exploreForPicked) {
    await handleExplorePickPet(ctx);
    return;
  }

  const allPets = await listPets({ lookingForPlaymate: true });
  const myPets = user.id ? await listPets({ ownerId: user.id }) : [];
  const myPetIds = myPets.map((p) => p.id);
  const pets = allPets.filter((p) => !myPetIds.includes(p.id));

  if (pets.length === 0) {
    const empty =
      'فعلاً همبازی‌ای ثبت نشده. بعداً سر بزن یا پت‌های بیشتری ثبت کن!';
    if (ctx.callbackQuery) {
      try {
        await ctx.editMessageText(empty, { reply_markup: explorePickMyPetKeyboard(myPets) });
        return;
      } catch {
        /* fall through */
      }
    }
    await ctx.reply(empty, { reply_markup: mainMenuKeyboard(user.role) });
    return;
  }

  await upsertSession(telegramId, { explorePage: page, step: 'ready' });

  const forLabel = await exploreForLabel(session.exploreForPetId, myPets);
  const text = [
    `🔍 **همبازی‌های موجود** (${pets.length} پت)`,
    `برای: **${forLabel}**`,
    '',
    'یکی رو انتخاب کن:',
  ].join('\n');
  const kb = exploreListKeyboard(pets, page, PAGE_SIZE);

  if (ctx.callbackQuery) {
    try {
      await ctx.editMessageText(text, { parse_mode: 'Markdown', reply_markup: kb });
      return;
    } catch {
      /* fall through */
    }
  }
  await ctx.reply(text, { parse_mode: 'Markdown', reply_markup: kb });
}

async function exploreForLabel(
  exploreForPetId: number | undefined,
  myPets: PetProfile[]
): Promise<string> {
  if (!exploreForPetId) return 'همه پت‌ها';
  const pet = myPets.find((p) => p.id === exploreForPetId);
  return pet?.name ?? `پت #${exploreForPetId}`;
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
  const session = await getSession(String(ctx.from!.id));
  await handleExplore(ctx, session?.explorePage ?? 0);
}

export { PAGE_SIZE };
