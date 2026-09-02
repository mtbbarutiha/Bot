import Redis from 'ioredis';
import type { BotSession, UserRole } from '@petdate/shared';
import { config } from './config';

const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7;
const KEY_PREFIX = 'petdate:bot:session:';

let redis: Redis | null = null;
let useMemory = false;
const memory = new Map<string, { session: BotSession; expiresAt: number }>();

async function ensureRedis(): Promise<Redis | null> {
  if (useMemory) return null;
  if (redis) return redis;

  const client = new Redis(config.redisUrl, {
    maxRetriesPerRequest: 1,
    lazyConnect: true,
    connectTimeout: 2000,
    retryStrategy: () => null,
  });

  client.on('error', () => {
    /* suppressed — fallback handles unavailable Redis */
  });

  try {
    await client.connect();
    await client.ping();
    redis = client;
    return client;
  } catch {
    useMemory = true;
    await client.quit().catch(() => undefined);
    return null;
  }
}

export async function connectRedis(): Promise<void> {
  const client = await ensureRedis();
  if (client) {
    console.log('   Redis: connected');
  } else {
    console.warn('   Redis: unavailable — using in-memory sessions (dev only)');
  }
}

export async function disconnectRedis(): Promise<void> {
  if (redis) {
    await redis.quit().catch(() => undefined);
    redis = null;
  }
}

function sessionKey(telegramId: string): string {
  return `${KEY_PREFIX}${telegramId}`;
}

function getMemorySession(telegramId: string): BotSession | null {
  const entry = memory.get(telegramId);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    memory.delete(telegramId);
    return null;
  }
  return entry.session;
}

function setMemorySession(session: BotSession): void {
  memory.set(session.telegramId, {
    session,
    expiresAt: Date.now() + SESSION_TTL_SECONDS * 1000,
  });
}

export async function getSession(telegramId: string): Promise<BotSession | null> {
  const client = await ensureRedis();
  if (!client) return getMemorySession(telegramId);

  const raw = await client.get(sessionKey(telegramId));
  if (!raw) return null;
  return JSON.parse(raw) as BotSession;
}

export async function saveSession(session: BotSession): Promise<void> {
  session.updatedAt = new Date().toISOString();
  const client = await ensureRedis();
  if (!client) {
    setMemorySession(session);
    return;
  }
  await client.set(sessionKey(session.telegramId), JSON.stringify(session), 'EX', SESSION_TTL_SECONDS);
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
  return upsertSession(telegramId, { role, userId, step: 'ready' });
}
