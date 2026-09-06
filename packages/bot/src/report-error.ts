import { config } from './config';

/** Push bot/runtime errors into API admin error-log store (near-real-time). */
export async function reportBotError(opts: {
  message: string;
  level?: 'error' | 'warn' | 'info';
  stack?: string | null;
  path?: string | null;
  meta?: Record<string, unknown> | null;
}): Promise<void> {
  const message = (opts.message || '').trim();
  if (!message) return;
  try {
    const res = await fetch(`${config.apiUrl}/api/admin/logs`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-password': config.adminPassword,
      },
      body: JSON.stringify({
        level: opts.level ?? 'error',
        source: 'bot',
        message: message.slice(0, 4000),
        stack: opts.stack ?? null,
        path: opts.path ?? null,
        meta: opts.meta ?? null,
      }),
    });
    if (!res.ok) {
      console.warn('reportBotError failed:', res.status, await res.text().catch(() => ''));
    }
  } catch (err) {
    console.warn('reportBotError error:', (err as Error).message);
  }
}
