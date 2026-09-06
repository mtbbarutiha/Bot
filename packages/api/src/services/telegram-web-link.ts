import { createHmac, randomBytes, timingSafeEqual } from 'crypto';
import { dbService } from '../db';
import { infra } from '../config/infra';
import { syncUserProfileFromTelegram } from './telegram-profile-sync';

const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;
/** Bot→web login links expire quickly so shared URLs die. */
const LINK_TTL_SEC = 15 * 60;
const MAX_SKEW_SEC = 60;
/** Web→bot attach tokens (stored in DB; deep-link payload must stay ≤64 chars). */
const ATTACH_TTL_SEC = 15 * 60;

function botToken(): string | null {
  const token = infra.telegram.botToken?.trim();
  return token || null;
}

function botUsername(): string | null {
  const u = infra.telegram.botUsername?.trim().replace(/^@/, '');
  return u || null;
}

export function signTelegramWebLink(telegramId: string, expSec: number): string | null {
  const token = botToken();
  if (!token) return null;
  const tg = String(telegramId).trim();
  if (!/^\d{3,20}$/.test(tg)) return null;
  return createHmac('sha256', token).update(`${tg}.${expSec}`).digest('hex');
}

function safeEqualHex(a: string, b: string): boolean {
  try {
    const ba = Buffer.from(a, 'hex');
    const bb = Buffer.from(b, 'hex');
    if (ba.length !== bb.length || ba.length === 0) return false;
    return timingSafeEqual(ba, bb);
  } catch {
    return false;
  }
}

/**
 * Exchange a bot-signed deep link for a web session on the same users row
 * (so pets/chats/wallet stay shared between Telegram and the website).
 * Also hydrates name/username/avatar from Telegram Bot API when appropriate.
 */
export async function exchangeTelegramWebLink(input: {
  telegramId: string;
  exp: string | number;
  sig: string;
}): Promise<
  | { ok: true; token: string; user: NonNullable<ReturnType<typeof dbService.getUserById>> }
  | { ok: false; reason: string; error: string }
> {
  const token = botToken();
  if (!token) {
    return { ok: false, reason: 'not_configured', error: 'ربات تلگرام پیکربندی نشده است' };
  }

  const telegramId = String(input.telegramId ?? '').trim();
  if (!/^\d{3,20}$/.test(telegramId)) {
    return { ok: false, reason: 'invalid_tg', error: 'شناسه تلگرام نامعتبر است' };
  }

  const exp = Number(input.exp);
  if (!Number.isFinite(exp) || exp <= 0) {
    return { ok: false, reason: 'invalid_exp', error: 'لینک نامعتبر است' };
  }

  const now = Math.floor(Date.now() / 1000);
  if (exp < now - MAX_SKEW_SEC) {
    return { ok: false, reason: 'expired', error: 'لینک منقضی شده — دوباره از ربات باز کن' };
  }
  if (exp > now + LINK_TTL_SEC + MAX_SKEW_SEC) {
    return { ok: false, reason: 'invalid_exp', error: 'لینک نامعتبر است' };
  }

  const expected = signTelegramWebLink(telegramId, exp);
  const sig = String(input.sig ?? '').trim().toLowerCase();
  if (!expected || !sig || !safeEqualHex(expected, sig)) {
    return { ok: false, reason: 'bad_sig', error: 'لینک نامعتبر است' };
  }

  let user = dbService.getUserByTelegramId(telegramId);
  if (!user) {
    const created = dbService.findOrCreateUser({
      telegramId,
      name: 'کاربر تلگرام',
    });
    user = created.user;
  }

  try {
    const synced = await syncUserProfileFromTelegram(user.id, telegramId);
    if (synced) user = synced;
  } catch (err) {
    console.warn('telegram profile sync on exchange failed:', (err as Error).message);
  }

  const sessionToken = randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS).toISOString();
  dbService.createWebSession(user.id, sessionToken, expiresAt);

  return { ok: true, token: sessionToken, user };
}

/**
 * Logged-in web user starts linking Telegram: one-time deep-link token for the bot.
 * Payload format: `wlink_<token>` (fits Telegram's 64-char start limit).
 */
export function createTelegramAttachLink(userId: number):
  | {
      ok: true;
      token: string;
      deepLink: string;
      botUsername: string;
      expiresAt: string;
      alreadyLinked: boolean;
      telegramId?: string;
    }
  | { ok: false; reason: string; error: string } {
  const user = dbService.getUserById(userId);
  if (!user) {
    return { ok: false, reason: 'missing_user', error: 'کاربر پیدا نشد' };
  }

  const username = botUsername();
  if (!username || !botToken()) {
    return { ok: false, reason: 'not_configured', error: 'ربات تلگرام پیکربندی نشده است' };
  }

  if (user.telegramId) {
    return {
      ok: true,
      token: '',
      deepLink: `https://t.me/${username}`,
      botUsername: username,
      expiresAt: new Date().toISOString(),
      alreadyLinked: true,
      telegramId: user.telegramId,
    };
  }

  const token = randomBytes(16).toString('hex'); // 32 chars → start payload = wlink_ + 32 = 38
  const expiresAt = new Date(Date.now() + ATTACH_TTL_SEC * 1000).toISOString();
  dbService.createTelegramAttachToken(userId, token, expiresAt);

  return {
    ok: true,
    token,
    deepLink: `https://t.me/${username}?start=${encodeURIComponent(`wlink_${token}`)}`,
    botUsername: username,
    expiresAt,
    alreadyLinked: false,
  };
}

/**
 * Bot completes web→Telegram attach after /start wlink_<token>.
 */
export async function completeTelegramAttach(input: {
  token: string;
  telegramId: string;
  username?: string;
  name?: string;
}): Promise<
  | {
      ok: true;
      user: NonNullable<ReturnType<typeof dbService.getUserById>>;
      merged: boolean;
      wallet: NonNullable<ReturnType<typeof dbService.getWallet>>;
    }
  | { ok: false; reason: string; error: string }
> {
  const rawToken = String(input.token ?? '')
    .trim()
    .replace(/^wlink_/i, '');
  if (!/^[a-f0-9]{32}$/i.test(rawToken)) {
    return { ok: false, reason: 'invalid_token', error: 'کد اتصال نامعتبر است' };
  }

  const telegramId = String(input.telegramId ?? '').trim();
  if (!/^\d{3,20}$/.test(telegramId)) {
    return { ok: false, reason: 'invalid_tg', error: 'شناسه تلگرام نامعتبر است' };
  }

  const row = dbService.consumeTelegramAttachToken(rawToken);
  if (!row) {
    return {
      ok: false,
      reason: 'expired',
      error: 'لینک منقضی یا استفاده‌شده است — از کیف پول وب دوباره اتصال بزن',
    };
  }

  const linked = dbService.linkTelegramIdentity(row.userId, telegramId, {
    username: input.username,
    name: input.name,
  });
  if (!linked.ok) {
    return { ok: false, reason: linked.reason, error: linked.error };
  }

  let user = linked.user;
  try {
    const synced = await syncUserProfileFromTelegram(user.id, telegramId);
    if (synced) user = synced;
  } catch (err) {
    console.warn('telegram profile sync on attach failed:', (err as Error).message);
  }

  const wallet = dbService.getWallet(user.id);
  return {
    ok: true,
    user,
    merged: linked.merged,
    wallet: wallet ?? { ton: 0, stars: 0, coins: 0, toman: 0 },
  };
}

export function buildTelegramWebLinkTtlSec(): number {
  return LINK_TTL_SEC;
}
