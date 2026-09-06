import type { NextFunction, Request, Response } from 'express';

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

/** Lightweight in-memory rate limiter (per-process). Fine for single PM2 fork. */
export function rateLimit(opts: {
  windowMs: number;
  max: number;
  /** Extra key dimension (e.g. phone/email). */
  keyFn?: (req: Request) => string;
  message?: string;
}) {
  const message = opts.message ?? 'تعداد درخواست‌ها زیاد است. کمی بعد دوباره تلاش کن.';

  return (req: Request, res: Response, next: NextFunction): void => {
    const ip =
      (typeof req.headers['x-forwarded-for'] === 'string'
        ? req.headers['x-forwarded-for'].split(',')[0]?.trim()
        : '') ||
      req.ip ||
      req.socket.remoteAddress ||
      'unknown';
    const extra = opts.keyFn?.(req) ?? '';
    const key = `${req.method}:${req.path}:${ip}:${extra}`;
    const now = Date.now();
    let bucket = buckets.get(key);
    if (!bucket || bucket.resetAt <= now) {
      bucket = { count: 0, resetAt: now + opts.windowMs };
      buckets.set(key, bucket);
    }
    bucket.count += 1;
    const retryAfterSec = Math.max(1, Math.ceil((bucket.resetAt - now) / 1000));
    res.setHeader('X-RateLimit-Limit', String(opts.max));
    res.setHeader('X-RateLimit-Remaining', String(Math.max(0, opts.max - bucket.count)));
    res.setHeader('X-RateLimit-Reset', String(Math.ceil(bucket.resetAt / 1000)));
    if (bucket.count > opts.max) {
      res.setHeader('Retry-After', String(retryAfterSec));
      res.status(429).json({
        ok: false,
        reason: 'rate_limited',
        error: message,
        retryAfterSec,
      });
      return;
    }
    next();
  };
}

/** Opportunistic cleanup so the Map does not grow forever. */
setInterval(() => {
  const now = Date.now();
  for (const [k, b] of buckets) {
    if (b.resetAt <= now) buckets.delete(k);
  }
}, 60_000).unref?.();
