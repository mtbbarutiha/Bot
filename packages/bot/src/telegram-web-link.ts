import { createHmac } from 'crypto';
import { config } from './config';
import { effectiveWebUrl, isTelegramInlineUrl } from './urls';

/** Must stay in sync with packages/api telegram-web-link LINK_TTL_SEC. */
const LINK_TTL_SEC = 15 * 60;

/** Web→bot deep-link prefix for «ورود با تلگرام» (must stay in sync with web). */
export const WEB_LOGIN_START_PREFIX = 'weblogin';

const SAFE_NEXT = /^\/(?!\/)[A-Za-z0-9\-._~:/?#[\]@!$&'()*+,;=%]*$/;

function sanitizeWebLoginNext(raw: string | null | undefined, fallback = '/home'): string {
  if (!raw) return fallback;
  const value = raw.trim();
  if (!value.startsWith('/') || value.startsWith('//')) return fallback;
  if (value.startsWith('/auth') || value.startsWith('/welcome')) return fallback;
  if (value === '/') return '/home';
  if (!SAFE_NEXT.test(value)) return fallback;
  return value;
}

/** Parse /start weblogin[_base64url(next)] → safe relative next path. */
export function parseWebLoginStartPayload(payload: string): string | null {
  const raw = String(payload ?? '').trim();
  const m = /^weblogin(?:_(.+))?$/i.exec(raw);
  if (!m) return null;
  const encoded = m[1];
  if (!encoded) return '/home';
  try {
    const decoded = Buffer.from(encoded, 'base64url').toString('utf8');
    return sanitizeWebLoginNext(decoded, '/home');
  } catch {
    return '/home';
  }
}

/**
 * Signed HTTPS URL that logs the Telegram user into the website
 * on the same account (pets/chats/wallet shared).
 */
export function telegramWebLoginUrl(
  telegramId: string | number,
  nextPath = '/wallet'
): string | null {
  const base = effectiveWebUrl().replace(/\/$/, '');
  if (!isTelegramInlineUrl(base)) return null;

  const token = config.telegramBotToken?.trim();
  if (!token) return null;

  const tg = String(telegramId).trim();
  if (!/^\d{3,20}$/.test(tg)) return null;

  const exp = Math.floor(Date.now() / 1000) + LINK_TTL_SEC;
  const sig = createHmac('sha256', token).update(`${tg}.${exp}`).digest('hex');
  const qs = new URLSearchParams({
    tg,
    exp: String(exp),
    sig,
  });
  const next = sanitizeWebLoginNext(
    nextPath.startsWith('/') ? nextPath : `/${nextPath}`,
    '/home'
  );
  if (next && next !== '/home') qs.set('next', next);
  return `${base}/auth/telegram?${qs.toString()}`;
}
