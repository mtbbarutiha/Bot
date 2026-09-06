import { createHmac } from 'crypto';
import { config } from './config';
import { effectiveWebUrl, isTelegramInlineUrl } from './urls';

/** Must stay in sync with packages/api telegram-web-link LINK_TTL_SEC. */
const LINK_TTL_SEC = 15 * 60;

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
  const next = nextPath.startsWith('/') ? nextPath : `/${nextPath}`;
  if (next && next !== '/home') qs.set('next', next);
  return `${base}/auth/telegram?${qs.toString()}`;
}
