/**
 * Activate Telegram bot vet_chat sessions in Redis after a consult is accepted.
 * Bot sessions live under petdate:bot:session:{telegramId} (see packages/bot/src/session.ts).
 * Only call this when consult.status === 'active' — never for requested/pending.
 */
import Redis from 'ioredis';
import type { User } from '@petdate/shared';
import { infra, hasRedisConfig } from '../config/infra';

const KEY_PREFIX = 'petdate:bot:session:';
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7;

type SessionLike = {
  telegramId?: string;
  step?: string;
  vetChatConsultId?: number;
  vetChatPeerTelegramId?: string;
  vetChatRole?: 'vet' | 'patient';
  medicalNotePetId?: number;
  prescriptionPetId?: number;
  prescriptionDraft?: unknown;
  updatedAt?: string;
  [key: string]: unknown;
};

let redis: Redis | null = null;
let redisFailed = false;

async function getRedis(): Promise<Redis | null> {
  if (!hasRedisConfig() || redisFailed) return null;
  if (redis) return redis;
  try {
    const client = new Redis(infra.redis.url!, {
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
    return null;
  }
}

function sessionKey(telegramId: string): string {
  return `${KEY_PREFIX}${telegramId}`;
}

function usableTelegramId(id?: string | null): id is string {
  if (!id) return false;
  const t = id.trim();
  if (!t) return false;
  if (t.startsWith('fake_') || t.startsWith('demo_')) return false;
  return true;
}

async function upsertVetChatSession(opts: {
  telegramId: string;
  consultId: number;
  peerTelegramId?: string | null;
  role: 'vet' | 'patient';
}): Promise<boolean> {
  const client = await getRedis();
  if (!client) return false;
  const key = sessionKey(opts.telegramId);
  let existing: SessionLike = { telegramId: opts.telegramId, step: 'ready' };
  try {
    const raw = await client.get(key);
    if (raw) existing = JSON.parse(raw) as SessionLike;
  } catch {
    /* start fresh */
  }
  const next: SessionLike = {
    ...existing,
    telegramId: opts.telegramId,
    step: 'vet_chat',
    vetChatConsultId: opts.consultId,
    vetChatPeerTelegramId: opts.peerTelegramId
      ? String(opts.peerTelegramId)
      : undefined,
    vetChatRole: opts.role,
    medicalNotePetId: undefined,
    prescriptionPetId: undefined,
    prescriptionDraft: undefined,
    updatedAt: new Date().toISOString(),
  };
  await client.set(key, JSON.stringify(next), 'EX', SESSION_TTL_SECONDS);
  return true;
}

/** Put vet + patient into bot vet_chat sessions (only after accept). */
export async function activateBotVetChatSessions(opts: {
  consultId: number;
  vet: User;
  patient: User;
}): Promise<{ vet: boolean; patient: boolean }> {
  const vetId = usableTelegramId(opts.vet.telegramId) ? opts.vet.telegramId.trim() : null;
  const patientId = usableTelegramId(opts.patient.telegramId)
    ? opts.patient.telegramId.trim()
    : null;
  const result = { vet: false, patient: false };
  if (vetId) {
    try {
      result.vet = await upsertVetChatSession({
        telegramId: vetId,
        consultId: opts.consultId,
        peerTelegramId: patientId,
        role: 'vet',
      });
    } catch (err) {
      console.warn('activate bot vet session failed:', (err as Error).message);
    }
  }
  if (patientId) {
    try {
      result.patient = await upsertVetChatSession({
        telegramId: patientId,
        consultId: opts.consultId,
        peerTelegramId: vetId,
        role: 'patient',
      });
    } catch (err) {
      console.warn('activate bot patient session failed:', (err as Error).message);
    }
  }
  return result;
}
