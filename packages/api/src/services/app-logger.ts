import type { NextFunction, Request, Response } from 'express';
import { dbService } from '../db';

export type AppLogLevel = 'error' | 'warn' | 'info';

export function logAppEvent(opts: {
  level?: AppLogLevel;
  source?: string;
  message: string;
  stack?: string | null;
  path?: string | null;
  method?: string | null;
  statusCode?: number | null;
  meta?: Record<string, unknown> | null;
}): void {
  try {
    dbService.createAppErrorLog({
      level: opts.level ?? 'error',
      source: opts.source ?? 'api',
      message: opts.message,
      stack: opts.stack,
      path: opts.path,
      method: opts.method,
      statusCode: opts.statusCode,
      meta: opts.meta,
    });
  } catch (err) {
    console.error('failed to persist app log:', (err as Error).message);
  }
}

/** Express middleware: log 4xx/5xx responses (except common auth noise). */
export function responseErrorLogger(req: Request, res: Response, next: NextFunction): void {
  const started = Date.now();
  res.on('finish', () => {
    if (res.statusCode < 400) return;
    if (res.statusCode === 404 && !req.path.startsWith('/api/')) return;
    logAppEvent({
      level: res.statusCode >= 500 ? 'error' : 'warn',
      source: 'api',
      message: `HTTP ${res.statusCode} ${req.method} ${req.originalUrl}`,
      path: req.originalUrl,
      method: req.method,
      statusCode: res.statusCode,
      meta: { durationMs: Date.now() - started },
    });
  });
  next();
}

/** Final Express error handler — persists + returns JSON. */
export function expressErrorHandler(
  err: unknown,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  const message = err instanceof Error ? err.message : String(err);
  const stack = err instanceof Error ? err.stack : undefined;
  console.error('unhandled api error:', message);
  logAppEvent({
    level: 'error',
    source: 'api',
    message,
    stack,
    path: req.originalUrl,
    method: req.method,
    statusCode: 500,
  });
  if (res.headersSent) return;
  res.status(500).json({ error: 'خطای داخلی سرور' });
}

export function installProcessErrorLogging(source = 'api'): void {
  process.on('uncaughtException', (err) => {
    console.error('uncaughtException:', err);
    logAppEvent({
      level: 'error',
      source,
      message: `uncaughtException: ${err.message}`,
      stack: err.stack,
      meta: { type: 'uncaughtException' },
    });
  });
  process.on('unhandledRejection', (reason) => {
    const message =
      reason instanceof Error ? reason.message : `unhandledRejection: ${String(reason)}`;
    const stack = reason instanceof Error ? reason.stack : undefined;
    console.error('unhandledRejection:', reason);
    logAppEvent({
      level: 'error',
      source,
      message,
      stack,
      meta: { type: 'unhandledRejection' },
    });
  });
}
