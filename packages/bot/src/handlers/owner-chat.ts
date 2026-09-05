import { Keyboard } from 'grammy';
import type { Context } from 'grammy';
import type { User } from '@petdate/shared';
import { getUserByTelegramId } from '../api-client';
import { getSession, upsertSession } from '../session';
import { getCtxUser, menuKeyboardFor } from './helpers';
import { MAIN_MENU_ALIASES, MAIN_MENU_BTN, mainMenuKeyboard } from '../keyboards';

export const OWNER_CHAT_BTNS = {
  end: '🔌 قطع چت همبازی',
} as const;

function escapeHtml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export function ownerChatReplyKeyboard(): Keyboard {
  return new Keyboard()
    .text(OWNER_CHAT_BTNS.end)
    .danger()
    .row()
    .text(MAIN_MENU_BTN)
    .primary()
    .resized()
    .persistent();
}

function clearOwnerChatPatch() {
  return {
    step: 'ready' as const,
    ownerChatPlaydateId: undefined as number | undefined,
    ownerChatPeerTelegramId: undefined as string | undefined,
  };
}

/**
 * بعد از قبول درخواست همبازی، هر دو مالک وارد چت می‌شوند.
 */
export async function startOwnerChat(
  ctx: Context,
  playdateId: number,
  accepter: User,
  requester: User,
  opts?: { fromPetName?: string; toPetName?: string }
): Promise<void> {
  if (!accepter.telegramId || !requester.telegramId) {
    await ctx.reply('برای شروع چت، هر دو طرف باید از ربات استفاده کرده باشند.');
    return;
  }

  await upsertSession(String(accepter.telegramId), {
    step: 'owner_chat',
    ownerChatPlaydateId: playdateId,
    ownerChatPeerTelegramId: String(requester.telegramId),
  });
  await upsertSession(String(requester.telegramId), {
    step: 'owner_chat',
    ownerChatPlaydateId: playdateId,
    ownerChatPeerTelegramId: String(accepter.telegramId),
  });

  const petLine =
    opts?.fromPetName && opts?.toPetName
      ? `پت‌ها: <b>${escapeHtml(opts.fromPetName)}</b> ↔ <b>${escapeHtml(opts.toPetName)}</b>`
      : null;

  const accepterIntro = [
    '💬 <b>چت با صاحب پت فعال شد</b>',
    '',
    `طرف مقابل: <b>${escapeHtml(requester.name)}</b>`,
    petLine,
    'هر پیامی بفرستی مستقیم به صاحب پت همبازی می‌رسد.',
    '',
    `پایان چت: ${OWNER_CHAT_BTNS.end}`,
  ]
    .filter(Boolean)
    .join('\n');

  const requesterIntro = [
    '✅ <b>درخواست همبازی پذیرفته شد!</b>',
    '',
    '💬 چت با صاحب پت فعال شد.',
    `طرف مقابل: <b>${escapeHtml(accepter.name)}</b>`,
    petLine,
    'هر پیامی بفرستی مستقیم به طرف مقابل می‌رسد.',
    '',
    `پایان چت: ${OWNER_CHAT_BTNS.end}`,
  ]
    .filter(Boolean)
    .join('\n');

  await ctx.reply(accepterIntro, {
    parse_mode: 'HTML',
    reply_markup: ownerChatReplyKeyboard(),
  });

  try {
    await ctx.api.sendMessage(requester.telegramId, requesterIntro, {
      parse_mode: 'HTML',
      reply_markup: ownerChatReplyKeyboard(),
    });
  } catch (err) {
    console.warn('notify requester owner chat start failed:', err);
  }
}

export async function handleOwnerChatEnd(ctx: Context): Promise<boolean> {
  const from = ctx.from;
  if (!from) return false;
  const session = await getSession(String(from.id));
  if (!session || session.step !== 'owner_chat') return false;

  const peerId = session.ownerChatPeerTelegramId;
  const user = await getCtxUser(ctx);

  await upsertSession(String(from.id), clearOwnerChatPatch());

  if (peerId) {
    await upsertSession(peerId, clearOwnerChatPatch());
    try {
      const peerUser = await getUserByTelegramId(peerId);
      await ctx.api.sendMessage(peerId, '🔌 چت همبازی قطع شد.', {
        reply_markup: mainMenuKeyboard(peerUser?.role, peerUser?.roles, Number(peerId), {
          vetOnline: peerUser?.vetOnline,
        }),
      });
    } catch {
      try {
        await ctx.api.sendMessage(peerId, '🔌 چت همبازی قطع شد.');
      } catch {
        /* ignore */
      }
    }
  }

  await ctx.reply('چت همبازی پایان یافت.', {
    reply_markup: menuKeyboardFor(ctx, user),
  });
  return true;
}

export async function handleOwnerChatRelay(ctx: Context): Promise<boolean> {
  const from = ctx.from;
  if (!from) return false;
  const session = await getSession(String(from.id));
  if (!session || session.step !== 'owner_chat' || !session.ownerChatPeerTelegramId) {
    return false;
  }

  const text = ctx.message?.text?.trim();
  if (text) {
    if (text === OWNER_CHAT_BTNS.end || MAIN_MENU_ALIASES.has(text) || text === MAIN_MENU_BTN) {
      return handleOwnerChatEnd(ctx);
    }
  }

  const peer = session.ownerChatPeerTelegramId;

  try {
    if (ctx.message?.photo?.length) {
      const fileId = ctx.message.photo[ctx.message.photo.length - 1]!.file_id;
      await ctx.api.sendPhoto(peer, fileId, {
        caption: ctx.message.caption || undefined,
      });
      return true;
    }
    if (ctx.message?.document) {
      await ctx.api.sendDocument(peer, ctx.message.document.file_id, {
        caption: ctx.message.caption || undefined,
      });
      return true;
    }
    if (ctx.message?.voice) {
      await ctx.api.sendVoice(peer, ctx.message.voice.file_id);
      return true;
    }
    if (text) {
      await ctx.api.sendMessage(peer, text);
      return true;
    }
  } catch (err) {
    console.warn('owner chat relay failed:', err);
    await ctx.reply('ارسال به طرف مقابل ناموفق بود. ممکن است ربات را بلاک کرده باشد.');
    return true;
  }
  return false;
}
