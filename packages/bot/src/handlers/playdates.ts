import type { Context } from 'grammy';
import { createPlaydate, listPets, listPlaydates, updatePlaydateStatus } from '../api-client';
import { formatPlaydate } from '../format';
import { fromPetKeyboard, mainMenuKeyboard, playdateActionKeyboard } from '../keyboards';
import { upsertSession } from '../session';
import { getCtxUser } from './start';

export async function handleMyPets(ctx: Context): Promise<void> {
  const user = await getCtxUser(ctx);
  if (!user?.id) {
    await ctx.reply('اول /start بزن.');
    return;
  }

  const pets = await listPets({ ownerId: user.id });
  if (pets.length === 0) {
    const { myPetsActionKeyboard } = await import('../keyboards');
    await ctx.reply('هنوز پتی ثبت نکردی. از دکمه زیر پت جدید اضافه کن:', {
      reply_markup: myPetsActionKeyboard(),
    });
    await ctx.reply('منوی اصلی 👇', { reply_markup: mainMenuKeyboard(user.role) });
    return;
  }

  const lines = pets.map((p, i) => {
    const bits = [
      p.breed,
      p.gender === 'male' ? 'نر' : p.gender === 'female' ? 'ماده' : null,
      p.city,
    ].filter(Boolean);
    return `${i + 1}. **${p.name}** — ${p.species}${bits.length ? ` · ${bits.join(' · ')}` : ''}`;
  });
  const { myPetsActionKeyboard } = await import('../keyboards');
  await ctx.reply(`🐾 **پت‌های من**\n\n${lines.join('\n')}`, {
    parse_mode: 'Markdown',
    reply_markup: myPetsActionKeyboard(),
  });
  await ctx.reply('منوی اصلی 👇', { reply_markup: mainMenuKeyboard(user.role) });
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
      reply_markup: mainMenuKeyboard(user.role),
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
    reply_markup: mainMenuKeyboard(u?.role),
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
  await ctx.reply('منوی اصلی:', { reply_markup: mainMenuKeyboard(u?.role) });
}
