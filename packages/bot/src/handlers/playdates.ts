import type { Context } from 'grammy';
import {
  createPlaydate,
  deletePet,
  getPet,
  listPets,
  listPlaydates,
  updatePlaydateStatus,
} from '../api-client';
import { formatPet, formatPlaydate } from '../format';
import {
  confirmPetDeleteKeyboard,
  fromPetKeyboard,
  mainMenuKeyboard,
  myPetProfileKeyboard,
  myPetsListKeyboard,
  myPetsSectionKeyboard,
  playdateActionKeyboard,
} from '../keyboards';
import { upsertSession } from '../session';
import { getCtxUser } from './helpers';

export async function handleMyPets(ctx: Context): Promise<void> {
  const user = await getCtxUser(ctx);
  if (!user?.id) {
    await ctx.reply('اول /start بزن.');
    return;
  }

  const pets = await listPets({ ownerId: user.id });
  if (pets.length === 0) {
    await ctx.reply('هنوز پتی ثبت نکردی. از دکمه زیر پت جدید اضافه کن:', {
      reply_markup: myPetsListKeyboard([]),
    });
    await ctx.reply('بخش پت‌های من 👇', { reply_markup: myPetsSectionKeyboard() });
    return;
  }

  await ctx.reply(`🐾 **پت‌های من** (${pets.length})\n\nروی هر پت بزن تا پروفایلش باز بشه:`, {
    parse_mode: 'Markdown',
    reply_markup: myPetsListKeyboard(pets),
  });
  await ctx.reply('بخش پت‌های من 👇', { reply_markup: myPetsSectionKeyboard() });
}

export async function handleMyPetView(ctx: Context, petId: number): Promise<void> {
  const user = await getCtxUser(ctx);
  if (!user?.id) {
    await ctx.answerCallbackQuery({ text: 'اول /start بزن', show_alert: true });
    return;
  }

  const pet = await getPet(petId);
  if (!pet || pet.ownerId !== user.id) {
    await ctx.answerCallbackQuery({ text: 'پت پیدا نشد', show_alert: true });
    return;
  }

  await ctx.answerCallbackQuery();
  const text = `🐾 <b>پروفایل پت</b>\n\n${formatPet(pet, true)}`;
  const kb = myPetProfileKeyboard(pet.id);
  const photo = pet.imageUrl || defaultPetPhoto(pet);

  try {
    await ctx.replyWithPhoto(photo, {
      caption: text,
      parse_mode: 'HTML',
      reply_markup: kb,
    });
    return;
  } catch (err) {
    console.warn('pet profile photo failed:', (err as Error).message);
  }

  await ctx.reply(text, { parse_mode: 'HTML', reply_markup: kb });
}

function defaultPetPhoto(pet: { species?: string; id: number }): string {
  const dogs = [
    'https://images.unsplash.com/photo-1552053831-71594a27632d?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1587300003388-59208cc962cb?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1517849845537-4d257902454a?auto=format&fit=crop&w=800&q=80',
  ];
  const cats = [
    'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?auto=format&fit=crop&w=800&q=80',
  ];
  const pool = pet.species === 'cat' ? cats : dogs;
  return pool[pet.id % pool.length]!;
}

export async function handleMyPetDeleteAsk(ctx: Context, petId: number): Promise<void> {
  const user = await getCtxUser(ctx);
  if (!user?.id) {
    await ctx.answerCallbackQuery({ text: 'اول /start بزن', show_alert: true });
    return;
  }

  const pet = await getPet(petId);
  if (!pet || pet.ownerId !== user.id) {
    await ctx.answerCallbackQuery({ text: 'پت پیدا نشد', show_alert: true });
    return;
  }

  await ctx.answerCallbackQuery();
  const text = `⚠️ مطمئنی می‌خوای **${pet.name}** رو حذف کنی؟\nاین کار قابل برگشت نیست.`;
  const kb = confirmPetDeleteKeyboard(pet.id);

  try {
    if (ctx.callbackQuery?.message && 'text' in ctx.callbackQuery.message) {
      await ctx.editMessageText(text, { parse_mode: 'Markdown', reply_markup: kb });
      return;
    }
  } catch {
    /* fall through */
  }
  await ctx.reply(text, { parse_mode: 'Markdown', reply_markup: kb });
}

export async function handleMyPetDeleteConfirm(ctx: Context, petId: number): Promise<void> {
  const user = await getCtxUser(ctx);
  if (!user?.id) {
    await ctx.answerCallbackQuery({ text: 'اول /start بزن', show_alert: true });
    return;
  }

  const pet = await getPet(petId);
  if (!pet || pet.ownerId !== user.id) {
    await ctx.answerCallbackQuery({ text: 'پت پیدا نشد', show_alert: true });
    return;
  }

  try {
    await deletePet(petId, user.id);
  } catch (err) {
    console.error('deletePet failed:', err);
    await ctx.answerCallbackQuery({ text: 'حذف ناموفق بود', show_alert: true });
    return;
  }

  await ctx.answerCallbackQuery({ text: 'حذف شد' });
  const pets = await listPets({ ownerId: user.id });
  const text =
    pets.length === 0
      ? `✅ **${pet.name}** حذف شد.\n\nهنوز پتی نداری. از دکمه زیر ثبت کن:`
      : `✅ **${pet.name}** حذف شد.\n\n🐾 **پت‌های من** (${pets.length})`;

  try {
    if (ctx.callbackQuery?.message && 'text' in ctx.callbackQuery.message) {
      await ctx.editMessageText(text, {
        parse_mode: 'Markdown',
        reply_markup: myPetsListKeyboard(pets),
      });
      await ctx.reply('بخش پت‌های من 👇', { reply_markup: myPetsSectionKeyboard() });
      return;
    }
  } catch {
    /* fall through */
  }
  await ctx.reply(text, {
    parse_mode: 'Markdown',
    reply_markup: myPetsListKeyboard(pets),
  });
  await ctx.reply('بخش پت‌های من 👇', { reply_markup: myPetsSectionKeyboard() });
}

export async function handleRequests(ctx: Context): Promise<void> {
  const user = await getCtxUser(ctx);
  if (!user?.id) {
    await ctx.reply('اول /start بزن.');
    return;
  }

  const requests = await listPlaydates({ userId: user.id });
  if (requests.length === 0) {
    await ctx.reply('📬 درخواستی نداری.\nاز «🔍 پیدا کردن همبازی» شروع کن!', {
      reply_markup: mainMenuKeyboard(user.role, user.roles),
    });
    return;
  }

  for (const req of requests.slice(0, 5)) {
    const isIncoming = req.toUserId === user.id && req.status === 'pending';
    const text = formatPlaydate(req);
    await ctx.reply(text, {
      parse_mode: 'Markdown',
      reply_markup: isIncoming ? playdateActionKeyboard(req.id) : undefined,
    });
  }

  if (requests.length > 5) {
    await ctx.reply(`... و ${requests.length - 5} درخواست دیگر`);
  }
}

export async function handlePlaydateAsk(ctx: Context, toPetId: number): Promise<void> {
  const user = await getCtxUser(ctx);
  if (!user?.id) return;

  const myPets = await listPets({ ownerId: user.id });
  if (myPets.length === 0) {
    await ctx.answerCallbackQuery({ text: 'اول یک پت ثبت کن', show_alert: true });
    return;
  }

  await ctx.answerCallbackQuery();

  const session = await import('../session').then((m) => m.getSession(String(ctx.from!.id)));
  const preferredId = session?.exploreForPetId;
  if (preferredId && myPets.some((p) => p.id === preferredId)) {
    await sendPlaydateNow(ctx, preferredId, toPetId, user.id);
    return;
  }

  if (myPets.length === 1) {
    await sendPlaydateNow(ctx, myPets[0]!.id, toPetId, user.id);
    return;
  }

  await ctx.editMessageText('کدوم پتت رو می‌فرستی؟', {
    reply_markup: fromPetKeyboard(myPets, toPetId),
  });
}

export async function handlePlaydateFrom(ctx: Context, fromPetId: number, toPetId: number): Promise<void> {
  const user = await getCtxUser(ctx);
  if (!user?.id) return;

  await ctx.answerCallbackQuery();
  await sendPlaydateNow(ctx, fromPetId, toPetId, user.id);
}

/** ارسال مستقیم درخواست همبازی — بدون نوشتن پیام برای صاحب پت */
async function sendPlaydateNow(
  ctx: Context,
  fromPetId: number,
  toPetId: number,
  fromUserId: number
): Promise<void> {
  await createPlaydate({ fromPetId, toPetId, fromUserId });
  await upsertSession(String(ctx.from!.id), {
    step: 'ready',
    selectedPetId: undefined,
    selectedToPetId: undefined,
  });

  const done = '✅ درخواست همبازی ارسال شد!';
  if (ctx.callbackQuery) {
    try {
      await ctx.editMessageText(done);
    } catch {
      await ctx.reply(done);
    }
  } else {
    await ctx.reply(done);
  }

  const u = await getCtxUser(ctx);
  await ctx.reply('منتظر پاسخ بمون یا همبازی‌های دیگه رو ببین.', {
    reply_markup: mainMenuKeyboard(u?.role, u?.roles),
  });
}

/** @deprecated kept for old inline buttons — sends without message */
export async function handlePlaydateSend(
  ctx: Context,
  fromPetId: number,
  toPetId: number,
  _message?: string
): Promise<void> {
  const user = await getCtxUser(ctx);
  if (!user?.id) return;
  await ctx.answerCallbackQuery();
  await sendPlaydateNow(ctx, fromPetId, toPetId, user.id);
}

export async function handlePlaydateAction(
  ctx: Context,
  requestId: number,
  action: 'accept' | 'reject'
): Promise<void> {
  const status = action === 'accept' ? 'accepted' : 'rejected';
  await ctx.answerCallbackQuery({ text: action === 'accept' ? 'پذیرفته شد ✅' : 'رد شد' });
  const updated = await updatePlaydateStatus(requestId, status);
  if (updated) {
    await ctx.editMessageText(`${formatPlaydate(updated)}\n\n${action === 'accept' ? '✅ توافق شد!' : '❌ رد شد.'}`, {
      parse_mode: 'Markdown',
    });
  }
}

export async function handlePlaydateCancel(ctx: Context): Promise<void> {
  await ctx.answerCallbackQuery();
  await upsertSession(String(ctx.from!.id), { step: 'ready', selectedPetId: undefined, selectedToPetId: undefined });
  await ctx.editMessageText('انصراف دادی.');
  const u = await getCtxUser(ctx);
  await ctx.reply('منوی اصلی:', { reply_markup: mainMenuKeyboard(u?.role, u?.roles) });
}
