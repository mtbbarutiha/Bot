import crypto from 'crypto';
import type { Request } from 'express';

/**
 * تشخیص فراخوان داخلی (ربات/سرویس‌های هم‌شبکه) از ترافیک عمومی اینترنت.
 *
 * وقتی `INTERNAL_API_TOKEN` تنظیم نشده باشد همیشه false برمی‌گردد تا مسیر
 * پیش‌فرض، امنِ عمومی بماند؛ هیچ endpointـی نباید با «تنظیم‌نشدن env» داده
 * خصوصی لو بدهد.
 */
export function isInternalRequest(req: Request): boolean {
  const expected = process.env.INTERNAL_API_TOKEN;
  if (!expected) return false;

  const header = req.headers['x-internal-token'];
  const provided = Array.isArray(header) ? header[0] : header;
  if (typeof provided !== 'string' || provided.length === 0) return false;

  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}
