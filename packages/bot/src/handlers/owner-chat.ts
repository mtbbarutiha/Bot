import { Keyboard } from 'grammy';
import type { Context } from 'grammy';
import type { User } from '@petdate/shared';
import {
  USER_GENDER_LABELS,
  USER_ROLE_LABELS,
  VERIFIED_BADGE,
  normalizeRoles,
} from '@petdate/shared';
import { addUserContact, getPet, getUserById, getUserByTelegramId } from '../api-client';
import { getSession, upsertSession } from '../session';
import { getCtxUser, menuKeyboardFor } from './helpers';
import { formatPet } from '../format';
import { MAIN_MENU_ALIASES, MAIN_MENU_BTN, mainMenuKeyboard } from '../keyboards';

export const OWNER_CHAT_BTNS = {
  secureOn: '🔒 چت امن',
  secureOff: '🔓 خاموش‌کردن چت امن',
  peerProfile: '👤 پروفایل طرف مقابل',
  petProfile: '🐾 مشاهده پروفایل پت',
  addContact: '➕ افزودن مخاطب',
  end: '🔌 قطع چت همبازی',
} as const;

const OWNER_CHAT_ACTION_BTNS = new Set<string>([
  OWNER_CHAT_BTNS.secureOn,
  OWNER_CHAT_BTNS.secureOff,
  OWNER_CHAT_BTNS.peerProfile,
  OWNER_CHAT_BTNS.petProfile,
  OWNER_CHAT_BTNS.addContact,
  OWNER_CHAT_BTNS.end,
]);

function escapeHtml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/** کیبورد چت دو نفره — بدون منوی اصلی */
export function ownerChatReplyKeyboard(secure = false): Keyboard {
  return new Keyboard()
    .text(secure ? OWNER_CHAT_BTNS.secureOff : OWNER_CHAT_BTNS.secureOn)
    .text(OWNER_CHAT_BTNS.peerProfile)
    .row()
    .text(OWNER_CHAT_BTNS.petProfile)
    .text(OWNER_CHAT_BTNS.addContact)
    .row()
    .text(OWNER_CHAT_BTNS.end)
    .danger()
    .resized()
    .persistent();
}

function clearOwnerChatPatch() {
  return {
    step: 'ready' as const,
    ownerChatPlaydateId: undefined as number | undefined,
    ownerChatPeerTelegramId: undefined as string | undefined,
    ownerChatPeerUserId: undefined as number | undefined,
    ownerChatMyPetId: undefined as number | undefined,
    ownerChatPeerPetId: undefined as number | undefined,
    ownerChatSecure: undefined as boolean | undefined,
  };
}

const CHAT_WIPE_HINT =
  '🗑 لطفاً کل این گفتگو را از تلگرام پاک کنید تا اثری از پیام‌ها (متن، عکس، ویس و …) نماند.';

function formatPeerOwnerCard(user: User): string {
  const gender = user.gender ? USER_GENDER_LABELS[user.gender] : '—';
  const roles = normalizeRoles(user.roles, user.role);
  const role = roles.length ? roles.map((r) => USER_ROLE_LABELS[r]).join(' · ') : '—';
  const verified = (user.verificationStatus ?? 'none') === 'verified';
  const location = [user.province, user.city].filter(Boolean).join('، ') || '—';

  return [
    '👤 <b>پروفایل طرف مقابل</b>',
    verified ? VERIFIED_BADGE : null,
    '',
    `<b>نام:</b> ${escapeHtml(user.name)}${verified ? ' ✅' : ''}`,
    user.username ? `<b>یوزرنیم:</b> @${escapeHtml(user.username)}` : null,
    user.age != null ? `<b>سن:</b> ${user.age}` : null,
    `<b>جنسیت:</b> ${gender}`,
    `<b>نقش:</b> ${role}`,
    `<b>موقعیت:</b> ${escapeHtml(location)}`,
    user.bio ? `\n💬 ${escapeHtml(user.bio)}` : null,
  ]
    .filter(Boolean)
    .join('\n');
}

function protectOpts(secure: boolean): { protect_content?: true } {
  return secure ? { protect_content: true } : {};
}

/**
 * بعد از قبول درخواست همبازی، هر دو مالک وارد چت می‌شوند.
 */
export async function startOwnerChat(
  ctx: Context,
  playdateId: number,
  accepter: User,
  requester: User,
  opts?: {
    fromPetName?: string;
    toPetName?: string;
    fromPetId?: number;
    toPetId?: number;
  }
): Promise<void> {
  if (!accepter.telegramId || !requester.telegramId) {
    await ctx.reply('برای شروع چت، هر دو طرف باید از ربات استفاده کرده باشند.');
    return;
  }

  await upsertSession(String(accepter.telegramId), {
    step: 'owner_chat',
    ownerChatPlaydateId: playdateId,
    ownerChatPeerTelegramId: String(requester.telegramId),
    ownerChatPeerUserId: requester.id,
    ownerChatMyPetId: opts?.toPetId,
    ownerChatPeerPetId: opts?.fromPetId,
    ownerChatSecure: false,
  });
  await upsertSession(String(requester.telegramId), {
    step: 'owner_chat',
    ownerChatPlaydateId: playdateId,
    ownerChatPeerTelegramId: String(accepter.telegramId),
    ownerChatPeerUserId: accepter.id,
    ownerChatMyPetId: opts?.fromPetId,
    ownerChatPeerPetId: opts?.toPetId,
    ownerChatSecure: false,
  });

  const petLine =
    opts?.fromPetName && opts?.toPetName
      ? `پت‌ها: <b>${escapeHtml(opts.fromPetName)}</b> ↔ <b>${escapeHtml(opts.toPetName)}</b>`
      : null;

  const tipLines = [
    'دکمه‌های چت:',
    `• ${OWNER_CHAT_BTNS.secureOn} — پیام‌ها غیرقابل ذخیره/فوروارد`,
    `• ${OWNER_CHAT_BTNS.peerProfile} / ${OWNER_CHAT_BTNS.petProfile}`,
    `• ${OWNER_CHAT_BTNS.addContact}`,
    `• ${OWNER_CHAT_BTNS.end}`,
  ].join('\n');

  const accepterIntro = [
    '💬 <b>چت با صاحب پت فعال شد</b>',
    '',
    `طرف مقابل: <b>${escapeHtml(requester.name)}</b>`,
    petLine,
    'هر پیامی بفرستی مستقیم به صاحب پت همبازی می‌رسد.',
    '',
    tipLines,
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
    tipLines,
  ]
    .filter(Boolean)
    .join('\n');

  await ctx.reply(accepterIntro, {
    parse_mode: 'HTML',
    reply_markup: ownerChatReplyKeyboard(false),
  });

  try {
    await ctx.api.sendMessage(requester.telegramId, requesterIntro, {
      parse_mode: 'HTML',
      reply_markup: ownerChatReplyKeyboard(false),
    });
  } catch (err) {
    console.warn('notify requester owner chat start failed:', err);
  }
}

async function handleSecureToggle(ctx: Context): Promise<boolean> {
  const from = ctx.from;
  if (!from) return false;
  const session = await getSession(String(from.id));
  if (!session || session.step !== 'owner_chat' || !session.ownerChatPeerTelegramId) {
    return false;
  }

  const nextSecure = !session.ownerChatSecure;
  const peerId = session.ownerChatPeerTelegramId;

  await upsertSession(String(from.id), { ownerChatSecure: nextSecure });
  await upsertSession(peerId, { ownerChatSecure: nextSecure });

  const selfMsg = nextSecure
    ? '🔒 <b>چت امن فعال شد.</b>\nاز این به بعد پیام‌ها (متن، عکس، ویس و …) قابل ذخیره یا فوروارد نیستند.'
    : '🔓 چت امن خاموش شد. پیام‌های بعدی مثل قبل قابل ذخیره هستند.';
  const peerMsg = nextSecure
    ? '🔒 <b>طرف مقابل چت امن را فعال کرد.</b>\nپیام‌های این گفتگو قابل ذخیره یا فوروارد نیستند.'
    : '🔓 طرف مقابل چت امن را خاموش کرد.';

  await ctx.reply(selfMsg, {
    parse_mode: 'HTML',
    reply_markup: ownerChatReplyKeyboard(nextSecure),
  });

  try {
    await ctx.api.sendMessage(peerId, peerMsg, {
      parse_mode: 'HTML',
      reply_markup: ownerChatReplyKeyboard(nextSecure),
    });
  } catch {
    /* ignore */
  }
  return true;
}

async function handleShowPeerProfile(ctx: Context): Promise<boolean> {
  const from = ctx.from;
  if (!from) return false;
  const session = await getSession(String(from.id));
  if (!session || session.step !== 'owner_chat') return false;

  let peer: User | null = null;
  if (session.ownerChatPeerUserId) {
    peer = await getUserById(session.ownerChatPeerUserId);
  } else if (session.ownerChatPeerTelegramId) {
    peer = await getUserByTelegramId(session.ownerChatPeerTelegramId);
  }

  if (!peer) {
    await ctx.reply('پروفایل طرف مقابل پیدا نشد.');
    return true;
  }

  const text = formatPeerOwnerCard(peer);
  const secure = !!session.ownerChatSecure;
  if (peer.avatarUrl) {
    try {
      await ctx.replyWithPhoto(peer.avatarUrl, {
        caption: text,
        parse_mode: 'HTML',
        ...protectOpts(secure),
      });
      return true;
    } catch (err) {
      console.warn('owner peer profile photo failed:', (err as Error).message);
    }
  }

  await ctx.reply(text, {
    parse_mode: 'HTML',
    ...protectOpts(secure),
  });
  return true;
}

async function handleShowPeerPetProfile(ctx: Context): Promise<boolean> {
  const from = ctx.from;
  if (!from) return false;
  const session = await getSession(String(from.id));
  if (!session || session.step !== 'owner_chat') return false;

  const petId = session.ownerChatPeerPetId;
  if (!petId) {
    await ctx.reply('پروفایل پت طرف مقابل در این چت مشخص نیست.');
    return true;
  }

  const pet = await getPet(petId);
  if (!pet) {
    await ctx.reply('پروفایل پت پیدا نشد.');
    return true;
  }

  const text = `🐾 <b>پروفایل پت طرف مقابل</b>\n\n${formatPet(pet, true)}`;
  const secure = !!session.ownerChatSecure;
  if (pet.imageUrl) {
    try {
      await ctx.replyWithPhoto(pet.imageUrl, {
        caption: text,
        parse_mode: 'HTML',
        ...protectOpts(secure),
      });
      return true;
    } catch (err) {
      console.warn('owner peer pet photo failed:', (err as Error).message);
    }
  }

  await ctx.reply(text, {
    parse_mode: 'HTML',
    ...protectOpts(secure),
  });
  return true;
}

async function handleAddContact(ctx: Context): Promise<boolean> {
  const from = ctx.from;
  if (!from) return false;
  const session = await getSession(String(from.id));
  if (!session || session.step !== 'owner_chat') return false;

  const me = await getCtxUser(ctx);
  if (!me?.id) {
    await ctx.reply('حسابت پیدا نشد. دوباره /start بزن.');
    return true;
  }

  let peerUserId = session.ownerChatPeerUserId;
  if (!peerUserId && session.ownerChatPeerTelegramId) {
    const peer = await getUserByTelegramId(session.ownerChatPeerTelegramId);
    peerUserId = peer?.id;
  }

  if (!peerUserId) {
    await ctx.reply('طرف مقابل پیدا نشد.');
    return true;
  }

  try {
    const result = await addUserContact(me.id, peerUserId);
    await ctx.reply(
      result.created
        ? '➕ مخاطب با موفقیت اضافه شد.'
        : 'این شخص از قبل در مخاطبینت بود.'
    );
  } catch (err) {
    console.warn('add contact failed:', err);
    await ctx.reply('افزودن مخاطب ناموفق بود. کمی بعد دوباره امتحان کن.');
  }
  return true;
}

export async function handleOwnerChatEnd(ctx: Context): Promise<boolean> {
  const from = ctx.from;
  if (!from) return false;
  const session = await getSession(String(from.id));
  if (!session || session.step !== 'owner_chat') return false;

  const peerId = session.ownerChatPeerTelegramId;
  const wasSecure = !!session.ownerChatSecure;
  const user = await getCtxUser(ctx);

  await upsertSession(String(from.id), clearOwnerChatPatch());

  const endSelf = [
    'چت همبازی پایان یافت.',
    '',
    CHAT_WIPE_HINT,
    wasSecure ? 'چت امن فعال بود — حتماً گفتگو را پاک کن.' : null,
  ]
    .filter(Boolean)
    .join('\n');

  const endPeer = [
    '🔌 چت همبازی قطع شد.',
    '',
    CHAT_WIPE_HINT,
    wasSecure ? 'چت امن فعال بود — حتماً گفتگو را پاک کن.' : null,
  ]
    .filter(Boolean)
    .join('\n');

  if (peerId) {
    await upsertSession(peerId, clearOwnerChatPatch());
    try {
      const peerUser = await getUserByTelegramId(peerId);
      await ctx.api.sendMessage(peerId, endPeer, {
        reply_markup: mainMenuKeyboard(peerUser?.role, peerUser?.roles, Number(peerId), {
          vetOnline: peerUser?.vetOnline,
        }),
      });
    } catch {
      try {
        await ctx.api.sendMessage(peerId, endPeer);
      } catch {
        /* ignore */
      }
    }
  }

  await ctx.reply(endSelf, {
    reply_markup: menuKeyboardFor(ctx, user),
  });
  return true;
}

async function handleOwnerChatAction(ctx: Context, text: string): Promise<boolean> {
  if (text === OWNER_CHAT_BTNS.end || MAIN_MENU_ALIASES.has(text) || text === MAIN_MENU_BTN) {
    return handleOwnerChatEnd(ctx);
  }
  if (text === OWNER_CHAT_BTNS.secureOn || text === OWNER_CHAT_BTNS.secureOff) {
    return handleSecureToggle(ctx);
  }
  if (text === OWNER_CHAT_BTNS.peerProfile) {
    return handleShowPeerProfile(ctx);
  }
  if (text === OWNER_CHAT_BTNS.petProfile) {
    return handleShowPeerPetProfile(ctx);
  }
  if (text === OWNER_CHAT_BTNS.addContact) {
    return handleAddContact(ctx);
  }
  return false;
}

export async function handleOwnerChatRelay(ctx: Context): Promise<boolean> {
  const from = ctx.from;
  if (!from) return false;
  const session = await getSession(String(from.id));
  if (!session || session.step !== 'owner_chat' || !session.ownerChatPeerTelegramId) {
    return false;
  }

  const text = ctx.message?.text?.trim();
  if (text && (OWNER_CHAT_ACTION_BTNS.has(text) || MAIN_MENU_ALIASES.has(text) || text === MAIN_MENU_BTN)) {
    return handleOwnerChatAction(ctx, text);
  }

  const peer = session.ownerChatPeerTelegramId;
  const secure = !!session.ownerChatSecure;
  const protect = protectOpts(secure);

  try {
    if (ctx.message?.photo?.length) {
      const fileId = ctx.message.photo[ctx.message.photo.length - 1]!.file_id;
      await ctx.api.sendPhoto(peer, fileId, {
        caption: ctx.message.caption || undefined,
        ...protect,
      });
      return true;
    }
    if (ctx.message?.video) {
      await ctx.api.sendVideo(peer, ctx.message.video.file_id, {
        caption: ctx.message.caption || undefined,
        ...protect,
      });
      return true;
    }
    if (ctx.message?.animation) {
      await ctx.api.sendAnimation(peer, ctx.message.animation.file_id, {
        caption: ctx.message.caption || undefined,
        ...protect,
      });
      return true;
    }
    if (ctx.message?.video_note) {
      await ctx.api.sendVideoNote(peer, ctx.message.video_note.file_id, protect);
      return true;
    }
    if (ctx.message?.document) {
      await ctx.api.sendDocument(peer, ctx.message.document.file_id, {
        caption: ctx.message.caption || undefined,
        ...protect,
      });
      return true;
    }
    if (ctx.message?.voice) {
      await ctx.api.sendVoice(peer, ctx.message.voice.file_id, protect);
      return true;
    }
    if (ctx.message?.audio) {
      await ctx.api.sendAudio(peer, ctx.message.audio.file_id, {
        caption: ctx.message.caption || undefined,
        ...protect,
      });
      return true;
    }
    if (ctx.message?.sticker) {
      await ctx.api.sendSticker(peer, ctx.message.sticker.file_id, protect);
      return true;
    }
    if (text) {
      await ctx.api.sendMessage(peer, text, protect);
      return true;
    }
  } catch (err) {
    console.warn('owner chat relay failed:', err);
    await ctx.reply('ارسال به طرف مقابل ناموفق بود. ممکن است ربات را بلاک کرده باشد.');
    return true;
  }
  return false;
}
