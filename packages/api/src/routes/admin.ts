import { Router, type NextFunction, type Request, type Response } from 'express';
import fs from 'fs';
import net from 'net';
import os from 'os';
import {
  hasElasticsearchConfig,
  hasPostgresConfig,
  hasRedisConfig,
  hasS3Config,
  infra,
} from '../config/infra';
import { dbService } from '../db';
import { logAppEvent } from '../services/app-logger';

export const adminRouter = Router();

const STARTED_AT = Date.now();

function adminPassword(): string {
  return (process.env.ADMIN_PASSWORD || 'petdate').trim() || 'petdate';
}

function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  const header = req.header('x-admin-password') || '';
  const query = typeof req.query.adminPassword === 'string' ? req.query.adminPassword : '';
  const bodyPwd =
    req.body &&
    typeof req.body === 'object' &&
    typeof (req.body as { password?: string }).password === 'string'
      ? (req.body as { password: string }).password
      : '';
  if ((header || query || bodyPwd) !== adminPassword()) {
    res.status(401).json({ error: 'دسترسی ادمین مجاز نیست' });
    return;
  }
  next();
}

adminRouter.use(requireAdmin);

adminRouter.get('/logs', (req, res) => {
  const level = typeof req.query.level === 'string' ? req.query.level : undefined;
  const source = typeof req.query.source === 'string' ? req.query.source : undefined;
  const limit = req.query.limit ? Number(req.query.limit) : 100;
  const beforeId = req.query.beforeId ? Number(req.query.beforeId) : undefined;
  res.json({
    stats: dbService.getAppErrorLogStats(),
    logs: dbService.listAppErrorLogs({
      level,
      source,
      limit: Number.isFinite(limit) ? limit : 100,
      beforeId: Number.isFinite(beforeId) ? beforeId : undefined,
    }),
  });
});

adminRouter.delete('/logs', (req, res) => {
  const olderThanDays = req.query.olderThanDays ? Number(req.query.olderThanDays) : undefined;
  const cleared = dbService.clearAppErrorLogs(
    Number.isFinite(olderThanDays) ? olderThanDays : undefined
  );
  res.json({ ok: true, cleared });
});

adminRouter.post('/logs', (req, res) => {
  const message = typeof req.body?.message === 'string' ? req.body.message.trim() : '';
  if (!message) {
    res.status(400).json({ error: 'message الزامی است' });
    return;
  }
  const level =
    req.body?.level === 'warn' || req.body?.level === 'info' || req.body?.level === 'error'
      ? req.body.level
      : 'error';
  logAppEvent({
    level,
    source: typeof req.body?.source === 'string' ? req.body.source : 'external',
    message,
    stack: typeof req.body?.stack === 'string' ? req.body.stack : null,
    path: typeof req.body?.path === 'string' ? req.body.path : null,
    method: typeof req.body?.method === 'string' ? req.body.method : null,
    statusCode: typeof req.body?.statusCode === 'number' ? req.body.statusCode : null,
    meta:
      req.body?.meta && typeof req.body.meta === 'object'
        ? (req.body.meta as Record<string, unknown>)
        : null,
  });
  res.status(201).json({ ok: true });
});

function checkTcpPort(host: string, port: number, timeoutMs = 1200): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = net.connect({ host, port });
    const done = (ok: boolean) => {
      try {
        socket.destroy();
      } catch {
        /* ignore */
      }
      resolve(ok);
    };
    socket.setTimeout(timeoutMs);
    socket.on('connect', () => done(true));
    socket.on('timeout', () => done(false));
    socket.on('error', () => done(false));
  });
}

async function probeService(
  url: string | undefined,
  defaultPort: number
): Promise<{ ok: boolean; detail: string }> {
  if (!url) return { ok: false, detail: 'پیکربندی نشده' };
  try {
    const u = new URL(url);
    const host = u.hostname || '127.0.0.1';
    const port = Number(u.port || defaultPort);
    const ok = await checkTcpPort(host, port);
    return { ok, detail: ok ? `${host}:${port}` : `غیرقابل دسترس ${host}:${port}` };
  } catch (err) {
    return { ok: false, detail: (err as Error).message };
  }
}

function diskCheck(dir: string): {
  ok: boolean;
  detail: string;
  freeGb?: number;
  totalGb?: number;
} {
  try {
    const st = fs.statfsSync(dir);
    const total = Number(st.blocks) * Number(st.bsize);
    const free = Number(st.bavail) * Number(st.bsize);
    const freeGb = Math.round((free / 1024 ** 3) * 100) / 100;
    const totalGb = Math.round((total / 1024 ** 3) * 100) / 100;
    return {
      ok: free > 512 * 1024 * 1024,
      detail: `${freeGb} / ${totalGb} GB آزاد`,
      freeGb,
      totalGb,
    };
  } catch (err) {
    return { ok: false, detail: (err as Error).message };
  }
}

adminRouter.get('/monitoring', async (_req, res) => {
  const mem = process.memoryUsage();
  const loadAvg = os.loadavg().map((n) => Math.round(n * 100) / 100);
  const [redis, postgres] = await Promise.all([
    probeService(process.env.REDIS_URL, 6379),
    probeService(
      process.env.DATABASE_URL?.startsWith('postgres') ? process.env.DATABASE_URL : undefined,
      5432
    ),
  ]);
  const counts = dbService.getOpsCounts();
  const logStats = dbService.getAppErrorLogStats();
  const disk = diskCheck(process.cwd());

  const checks: Record<string, { ok: boolean; detail: string; freeGb?: number; totalGb?: number }> =
    {
      api: { ok: true, detail: 'فعال' },
      telegramBot: {
        ok: Boolean(infra.telegram.botToken),
        detail: infra.telegram.botToken ? 'توکن تنظیم شده' : 'TELEGRAM_BOT_TOKEN نیست',
      },
      sqlite: { ok: true, detail: hasPostgresConfig() ? 'legacy/fallback' : 'اصلی' },
      postgres,
      redis,
      s3: {
        ok: hasS3Config(),
        detail: hasS3Config() ? 'پیکربندی شده' : 'پیکربندی نشده',
      },
      elasticsearch: {
        ok: hasElasticsearchConfig(),
        detail: hasElasticsearchConfig() ? 'پیکربندی شده' : 'پیکربندی نشده',
      },
      disk,
    };

  const unhealthy = Object.entries(checks)
    .filter(([, v]) => !v.ok)
    .map(([k]) => k);
  const criticalUnhealthy = unhealthy.filter((k) => !['elasticsearch', 's3', 'postgres', 'redis'].includes(k));

  res.json({
    ok: criticalUnhealthy.length === 0,
    generatedAt: new Date().toISOString(),
    uptimeSec: Math.floor((Date.now() - STARTED_AT) / 1000),
    node: process.version,
    platform: `${os.type()} ${os.release()}`,
    hostname: os.hostname(),
    loadAvg,
    memory: {
      rssMb: Math.round(mem.rss / (1024 * 1024)),
      heapUsedMb: Math.round(mem.heapUsed / (1024 * 1024)),
      heapTotalMb: Math.round(mem.heapTotal / (1024 * 1024)),
      externalMb: Math.round(mem.external / (1024 * 1024)),
      systemFreeMb: Math.round(os.freemem() / (1024 * 1024)),
      systemTotalMb: Math.round(os.totalmem() / (1024 * 1024)),
    },
    counts: {
      users: counts.users,
      pets: counts.pets,
      playdates: counts.playdates,
      playdatesAccepted: counts.playdatesAccepted,
      chatMessages: counts.chatMessages,
      openGames: counts.openGames,
    },
    logs: {
      total: logStats.total,
      errors24h: logStats.errors24h,
      warns24h: logStats.warns24h,
      lastErrorAt: logStats.lastErrorAt,
    },
    checks,
    unhealthy,
    redisConfigured: hasRedisConfig(),
  });
});
