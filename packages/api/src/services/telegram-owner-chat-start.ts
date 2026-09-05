import Redis from 'ioredis';
import type { BotSession, User } from '@petdate/shared';
import { infra } from '../config/infra';

const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7;
const KEY_PREFIX = 'petdate:bot:session:';

/** Must match bot OWNER_CHAT_BTNS exactly so reply handlers work. */
const OWNER_CHAT_BTNS = {
  secureOn: '🔒 چت امن',
  secureOff: '🔓 خاموش‌کردن چت امن',
  peerProfile: '👤 پروفایل طرف مقابل',
  petProfile: '🐾 مشاهده پروفایل پت',
  addContact: '➕ افزودن مخاطب',
  end: '🔌 قطع چت همبازی',
} as const;

function ownerChatKeyboard(secure = false) {
  return {
    keyboard: [
      [
        { text: secure ? OWNER_CHAT_BTNS.secureOff : OWNER_CHAT_BTNS.secureOn },
        { text: OWNER_CHAT_BTNS.peerProfile },
      ],
      [{ text: OWNER_CHAT_BTNS.petProfile }, { text: OWNER_CHAT_BTNS.addContact }],
      [{ text: OWNER_CHAT_BTNS.end }],
    ],
    resize_keyboard: true,
    is_persistent: true,
  };
}

function escapeHtml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

async function telegramCall(method: string, body: Record<string, unknown>): Promise<boolean> {
  const token = infra.telegram.botToken;
  if (!token) return false;
  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = (await res.json()) as { ok?: boolean; description?: string };
    if (!data.ok) {
      console.warn(`telegram ${method} failed:`, data.description ?? res.status);
      return false;
    }
    return true;
  } catch (err) {
    console.warn(`telegram ${method} error:`, (err as Error).message);
    return false;
  }
}

function usableTelegramId(id?: string | null): id is string {
  if (!id) return false;
  if (id.startsWith('fake_') || id.startsWith('fake_owner_')) return false;
  return true;
}

async function upsertBotSession(
  redis: Redis,
  telegramId: string,
  patch: Partial<BotSession>
): Promise<void> {
  const key = `${KEY_PREFIX}${telegramId}`;
  let existing: BotSession | null = null;
  try {
    const raw = await redis.get(key);
    if (raw) existing = JSON.parse(raw) as BotSession;
  } catch {
    existing = null;
  }
  const next: BotSession = {
    ...(existing ?? {
      telegramId,
      step: 'ready' as const,
      locale: 'fa',
      updatedAt: new Date().toISOString(),
    }),
    ...patch,
    telegramId,
    updatedAt: new Date().toISOString(),
  };
  await redis.set(key, JSON.stringify(next), 'EX', SESSION_TTL_SECONDS);
}

/**
 * When a playdate is accepted from the web/API, put both Telegram users into
 * owner_chat and send the same intro the bot would send on accept.
 */
export async function startOwnerChatFromApi(opts: {
  playdateId: number;
  accepter: User;
  requester: User;
  fromPetName?: string;
  toPetName?: string;
  fromPetId?: number;
  toPetId?: number;
}): Promise<boolean> {
  const { accepter, requester, playdateId } = opts;
  if (!usableTelegramId(accepter.telegramId) || !usableTelegramId(requester.telegramId)) {
    console.warn('startOwnerChatFromApi: missing usable telegram ids', {
      playdateId,
      accepter: accepter.telegramId,
      requester: requester.telegramId,
    });
    return false;
  }

  const redisUrl = infra.redis.url;
  if (redisUrl) {
    const redis = new Redis(redisUrl, {
      maxRetriesPerRequest: 1,
      lazyConnect: true,
      connectTimeout: 2000,
      retryStrategy: () => null,
    });
    try {
      await redis.connect();
      await upsertBotSession(redis, accepter.telegramId, {
        userId: accepter.id,
        step: 'owner_chat',
        ownerChatPlaydateId: playdateId,
        ownerChatPeerTelegramId: requester.telegramId,
        ownerChatPeerUserId: requester.id,
        ownerChatMyPetId: opts.toPetId,
        ownerChatPeerPetId: opts.fromPetId,
        ownerChatSecure: false,
      });
      await upsertBotSession(redis, requester.telegramId, {
        userId: requester.id,
        step: 'owner_chat',
        ownerChatPlaydateId: playdateId,
        ownerChatPeerTelegramId: accepter.telegramId,
        ownerChatPeerUserId: accepter.id,
        ownerChatMyPetId: opts.fromPetId,
        ownerChatPeerPetId: opts.toPetId,
        ownerChatSecure: false,
      });
    } catch (err) {
      console.warn('startOwnerChatFromApi: redis session write failed:', (err as Error).message);
    } finally {
      await redis.quit().catch(() => undefined);
    }
  }

  const petLine =
    opts.fromPetName && opts.toPetName
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
    'پیام‌های وب هم اینجا می‌آید.',
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
    'پیام‌های وب هم اینجا می‌آید.',
    '',
    tipLines,
  ]
    .filter(Boolean)
    .join('\n');

  const keyboard = ownerChatKeyboard(false);
  const aOk = await telegramCall('sendMessage', {
    chat_id: accepter.telegramId,
    text: accepterIntro,
    parse_mode: 'HTML',
    reply_markup: keyboard,
  });
  const rOk = await telegramCall('sendMessage', {
    chat_id: requester.telegramId,
    text: requesterIntro,
    parse_mode: 'HTML',
    reply_markup: keyboard,
  });
  return aOk || rOk;
}
