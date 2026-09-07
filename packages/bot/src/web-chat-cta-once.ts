/**
 * web-cta-once-v2 — At-most-once web-chat CTA per (kind + chatId + telegramId).
 * Same Redis key scheme as packages/api/src/services/web-chat-cta-once.ts
 * so bot + API share one gate. Relays must never append web CTA.
 */
import Redis from 'ioredis';
import { config } from './config';

/** Deploy marker — grep dist for this string to confirm v2 is live. */
export const WEB_CTA_ONCE_MARKER = 'web-cta-once-v2';

const KEY_PREFIX = 'petdate:web-cta:';
const TTL_SECONDS = 60 * 60 * 24 * 60;

export type WebChatCtaKind = 'vet' | 'playmate';

let redis: Redis | null = null;
let redisFailed = false;
const memoryClaimed = new Set<string>();

async function getRedis(): Promise<Redis | null> {
  if (redisFailed) return null;
  if (redis) return redis;
  try {
    const client = new Redis(config.redisUrl, {
      maxRetriesPerRequest: 1,
      lazyConnect: true,
      connectTimeout: 2000,
      retryStrategy: () => null,
    });
    client.on('error', () => {
      /* suppressed */
    });
    await client.connect();
    await client.ping();
    redis = client;
    return client;
  } catch {
    redisFailed = true;
    await redis?.quit().catch(() => undefined);
    return null;
  }
}

function ctaKey(kind: WebChatCtaKind, chatId: number, telegramId: string): string {
  return `${KEY_PREFIX}${kind}:${chatId}:${String(telegramId).trim()}`;
}

/**
 * Claim the right to send the web CTA.
 * @returns true → caller may send CTA now; false → already sent for this chat+user.
 */
export async function claimWebChatCtaOnce(
  kind: WebChatCtaKind,
  chatId: number,
  telegramId: string
): Promise<boolean> {
  if (!Number.isFinite(chatId) || chatId <= 0) return false;
  const tg = String(telegramId || '').trim();
  if (!tg || tg.startsWith('fake_') || tg.startsWith('demo_') || tg.startsWith('fake_owner_')) {
    return false;
  }

  const key = ctaKey(kind, chatId, tg);
  const client = await getRedis();
  if (client) {
    try {
      const ok = await client.set(key, '1', 'EX', TTL_SECONDS, 'NX');
      const claimed = ok === 'OK';
      if (!claimed) {
        console.log(
          `[${WEB_CTA_ONCE_MARKER}] CTA suppressed (already claimed) ${kind} chat=${chatId} tg=${tg}`
        );
      } else {
        console.log(`[${WEB_CTA_ONCE_MARKER}] claim once ${kind} chat=${chatId} tg=${tg}`);
      }
      return claimed;
    } catch (err) {
      console.warn(`[${WEB_CTA_ONCE_MARKER}] redis claim failed:`, (err as Error).message);
    }
  }

  if (memoryClaimed.has(key)) {
    console.log(
      `[${WEB_CTA_ONCE_MARKER}] CTA suppressed (memory) ${kind} chat=${chatId} tg=${tg}`
    );
    return false;
  }
  memoryClaimed.add(key);
  console.log(`[${WEB_CTA_ONCE_MARKER}] claim once (memory) ${kind} chat=${chatId} tg=${tg}`);
  return true;
}
