/**
 * Candoo SMS REST client (api.candoosms.com v3.0.1)
 *
 * Auth: header `x-api-key`
 * Send: POST /api/v3.0.1/send  body = JSON array of messages
 * Balance: GET /api/v3.0.1/balance
 * OTP messages should use type=1 (رمز یکبار مصرف)
 */

export type CandooSendItem = {
  srcNum: string;
  recipient: string;
  body: string;
  customerId?: number;
  type?: number;
  retryCount?: number;
  validityPeriod?: number;
};

export type CandooSendResult = {
  ok: boolean;
  status: number;
  raw: unknown;
  error?: string;
};

function apiBase(): string {
  const base = (process.env.CANDOO_API_URL || 'https://api.candoosms.com').replace(/\/$/, '');
  return base;
}

function apiKey(): string {
  return (process.env.CANDOO_API_KEY || '').trim();
}

function srcNumbers(): string[] {
  const raw = process.env.CANDOO_SRC_NUMBERS || '';
  return raw
    .split(',')
    .map((s) => s.trim().replace(/^\+/, ''))
    .filter(Boolean);
}

let srcRoundRobin = 0;

/** انتخاب شماره فرستنده — round-robin بین CANDOO_SRC_NUMBERS */
export function nextSrcNumber(): string {
  const nums = srcNumbers();
  if (!nums.length) {
    throw new Error('CANDOO_SRC_NUMBERS خالی است');
  }
  const n = nums[srcRoundRobin % nums.length]!;
  srcRoundRobin += 1;
  return n;
}

export function isCandooConfigured(): boolean {
  return Boolean(apiKey() && srcNumbers().length);
}

/** ساخت بدنهٔ درخواست ارسال — برای تست واحد / اعتبارسنجی شکل */
export function buildSendPayload(items: CandooSendItem[]): CandooSendItem[] {
  return items.map((item) => ({
    srcNum: String(item.srcNum),
    recipient: String(item.recipient),
    body: String(item.body),
    ...(item.customerId != null ? { customerId: item.customerId } : {}),
    ...(item.type != null ? { type: item.type } : {}),
    ...(item.retryCount != null ? { retryCount: item.retryCount } : {}),
    ...(item.validityPeriod != null ? { validityPeriod: item.validityPeriod } : {}),
  }));
}

function extractCandooErrorMessage(raw: unknown, fallback: string): string {
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
    const msg = (raw as { message?: unknown }).message;
    if (typeof msg === 'string' && msg.trim()) return msg.trim();
  }
  if (typeof raw === 'string' && raw.trim()) {
    try {
      const parsed = JSON.parse(raw) as { message?: string };
      if (parsed?.message) return String(parsed.message);
    } catch {
      /* keep fallback */
    }
  }
  return fallback;
}

/** آیا پاسخ send آرایه‌ای با ACCEPTED است؟ */
export function isCandooSendAccepted(raw: unknown): boolean {
  if (!Array.isArray(raw) || raw.length === 0) return false;
  return raw.every((item) => {
    if (!item || typeof item !== 'object') return false;
    const row = item as { status?: string; statusCode?: number };
    if (typeof row.status === 'string' && row.status.toUpperCase() === 'ACCEPTED') return true;
    if (typeof row.statusCode === 'number' && row.statusCode >= 200 && row.statusCode < 300) {
      return true;
    }
    return false;
  });
}

export async function candooSend(items: CandooSendItem[]): Promise<CandooSendResult> {
  const key = apiKey();
  if (!key) {
    return { ok: false, status: 0, raw: null, error: 'سرویس پیامک پیکربندی نشده (کلید API)' };
  }
  if (!items.length) {
    return { ok: false, status: 0, raw: null, error: 'لیست پیام خالی است' };
  }

  const url = `${apiBase()}/api/v3.0.1/send`;
  const payload = buildSendPayload(items);

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': key,
      },
      body: JSON.stringify(payload),
    });
    const text = await res.text();
    let raw: unknown = text;
    try {
      raw = text ? JSON.parse(text) : null;
    } catch {
      /* keep text */
    }
    if (!res.ok) {
      const detail = extractCandooErrorMessage(
        raw,
        res.status === 401 ? 'کلید API نامعتبر است' : `خطای سرویس پیامک (HTTP ${res.status})`
      );
      return {
        ok: false,
        status: res.status,
        raw,
        error:
          res.status === 401
            ? 'کلید API پیامک نامعتبر است. با پشتیبانی تماس بگیر.'
            : res.status >= 500
              ? 'سرویس پیامک موقتاً در دسترس نیست. کمی بعد دوباره تلاش کن.'
              : detail,
      };
    }
    if (!isCandooSendAccepted(raw)) {
      return {
        ok: false,
        status: res.status,
        raw,
        error: extractCandooErrorMessage(raw, 'سرویس پیامک ارسال را تأیید نکرد'),
      };
    }
    return { ok: true, status: res.status, raw };
  } catch {
    return {
      ok: false,
      status: 0,
      raw: null,
      error: 'ارتباط با سرویس پیامک برقرار نشد. کمی بعد دوباره تلاش کن.',
    };
  }
}

/** ارسال OTP — type=1 طبق مستند Candoo */
export async function candooSendOtp(opts: {
  recipient: string;
  body: string;
  srcNum?: string;
  customerId?: number;
}): Promise<CandooSendResult & { srcNum: string }> {
  const srcNum = opts.srcNum || nextSrcNumber();
  const result = await candooSend([
    {
      srcNum,
      recipient: opts.recipient,
      body: opts.body,
      type: 1,
      retryCount: 2,
      validityPeriod: 300,
      ...(opts.customerId != null ? { customerId: opts.customerId } : {}),
    },
  ]);
  return { ...result, srcNum };
}

/** بررسی اعتبار / موجودی — بدون ارسال SMS */
export async function candooBalance(): Promise<{
  ok: boolean;
  status: number;
  balance?: number;
  error?: string;
  raw?: unknown;
}> {
  const key = apiKey();
  if (!key) {
    return { ok: false, status: 0, error: 'CANDOO_API_KEY تنظیم نشده' };
  }
  const url = `${apiBase()}/api/v3.0.1/balance`;
  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: { 'x-api-key': key },
    });
    const text = await res.text();
    if (!res.ok) {
      return {
        ok: false,
        status: res.status,
        error: res.status === 401 ? 'کلید API نامعتبر (401)' : `Candoo HTTP ${res.status}`,
        raw: text,
      };
    }
    const balance = Number(text.trim());
    return {
      ok: true,
      status: res.status,
      balance: Number.isFinite(balance) ? balance : undefined,
      raw: text,
    };
  } catch (err) {
    return {
      ok: false,
      status: 0,
      error: err instanceof Error ? err.message : 'خطای شبکه Candoo',
    };
  }
}
