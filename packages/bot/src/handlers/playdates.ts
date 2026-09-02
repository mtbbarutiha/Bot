import type { Context } from 'grammy';
import { InlineKeyboard } from 'grammy';
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
    await ctx.reply('هنوز پتی ثبت نکردی.\n/addpet یا «➕ ثبت پت» رو بزن.', { reply_markup: mainMenuKeyboard() });
    return;
  }

  const lines = pets.map((p, i) => `${i + 1}. **${p.name}** — ${p.species}${p.city ? ` (${p.city})` : ''}`);
  await ctx.reply(`🐾 **پت‌های من**\n\n${lines.join('\n')}`, {
    parse_mode: 'Markdown',
    reply_markup: mainMenuKeyboard(),
  });
}

export async function handleRequests(ctx: Context): Promise<void> {
  const user = await getCtxUser(ctx);
  if (!user?.id) {
    await ctx.reply('اول /start بزن.');
    return;
  }

  const requests = await listPlaydates({ userId: user.id });
  if (requests.length === 0) {
    await ctx.reply('📬 درخواستی نداری.\nاز «🔍 کشف همبازی» شروع کن!', { reply_markup: mainMenuKeyboard() });
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

  if (myPets.length === 1) {
    await startPlaydateMessage(ctx, myPets[0]!.id, toPetId, user.id);
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
  await startPlaydateMessage(ctx, fromPetId, toPetId, user.id);
}

async function startPlaydateMessage(
  ctx: Context,
  fromPetId: number,
  toPetId: number,
  _userId: number
): Promise<void> {
  const telegramId = String(ctx.from!.id);
  await upsertSession(telegramId, {
    step: 'playdate_message',
    selectedPetId: fromPetId,
    selectedToPetId: toPetId,
  });

  if (ctx.callbackQuery) {
    await ctx.editMessageText('💬 پیام برای صاحب پت بنویس (یا «بدون پیام» بزن):', {
      reply_markup: new InlineKeyboard().text('📭 بدون پیام', `playdate:send:${fromPetId}:${toPetId}`),
    });
  } else {
    await ctx.reply('💬 پیام برای صاحب پت بنویس:', {
      reply_markup: new InlineKeyboard().text('📭 بدون پیام', `playdate:send:${fromPetId}:${toPetId}`),
    });
  }
}

export async function handlePlaydateSend(
  ctx: Context,
  fromPetId: number,
  toPetId: number,
  message?: string
): Promise<void> {
  const user = await getCtxUser(ctx);
  if (!user?.id) return;

  await ctx.answerCallbackQuery();
  await createPlaydate({ fromPetId, toPetId, fromUserId: user.id, message });
  await upsertSession(String(ctx.from!.id), { step: 'ready', selectedPetId: undefined, selectedToPetId: undefined });

  await ctx.editMessageText('✅ درخواست همبازی ارسال شد!');
  await ctx.reply('منتظر پاسخ بمون یا درخواست‌های دیگه رو ببین.', { reply_markup: mainMenuKeyboard() });
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
  await ctx.reply('منوی اصلی:', { reply_markup: mainMenuKeyboard() });
}
