import Redis from 'ioredis';
import type { BotSession, UserRole } from '@petdate/shared';
import { config } from './config';

const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7; // 7 days
const KEY_PREFIX = 'petdate:bot:session:';

let redis: Redis | null = null;

function getRedis(): Redis {
  if (!redis) {
    redis = new Redis(config.redisUrl, {
      maxRetriesPerRequest: 3,
      lazyConnect: true,
    });
  }
  return redis;
}

export async function connectRedis(): Promise<void> {
  const client = getRedis();
  if (client.status === 'wait') await client.connect();
}

export async function disconnectRedis(): Promise<void> {
  if (redis) {
    await redis.quit();
    redis = null;
  }
}

function sessionKey(telegramId: string): string {
  return `${KEY_PREFIX}${telegramId}`;
}

export async function getSession(telegramId: string): Promise<BotSession | null> {
  const raw = await getRedis().get(sessionKey(telegramId));
  if (!raw) return null;
  return JSON.parse(raw) as BotSession;
}

export async function saveSession(session: BotSession): Promise<void> {
  session.updatedAt = new Date().toISOString();
  await getRedis().set(sessionKey(session.telegramId), JSON.stringify(session), 'EX', SESSION_TTL_SECONDS);
}

export async function upsertSession(
  telegramId: string,
  patch: Partial<Omit<BotSession, 'telegramId' | 'updatedAt'>>
): Promise<BotSession> {
  const existing = (await getSession(telegramId)) ?? {
    telegramId,
    step: 'start' as const,
    locale: 'fa',
    updatedAt: new Date().toISOString(),
  };
  const next: BotSession = { ...existing, ...patch, telegramId, updatedAt: new Date().toISOString() };
  await saveSession(next);
  return next;
}

export async function setSessionRole(telegramId: string, role: UserRole, userId?: number): Promise<BotSession> {
  return upsertSession(telegramId, { role, userId, step: 'profile_hint' });
}
