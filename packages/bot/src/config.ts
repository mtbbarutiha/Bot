import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';

function findEnvFile(): string | undefined {
  const candidates = [
    path.join(__dirname, '..', '..', '..', '.env'),
    path.join(process.cwd(), '.env'),
    path.join(process.cwd(), '..', '..', '.env'),
    path.join(process.cwd(), '..', '..', '..', '.env'),
  ];
  for (const c of candidates) {
    try {
      if (fs.existsSync(c)) return c;
    } catch {
      /* ignore */
    }
  }
  return undefined;
}

const envPath = findEnvFile();
if (envPath) dotenv.config({ path: envPath });

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing env: ${name}`);
  return value;
}

function optional(name: string, fallback?: string): string | undefined {
  const value = process.env[name];
  if (value === undefined || value === '') return fallback;
  return value;
}

function parseIdList(raw: string | undefined): string[] {
  if (!raw) return [];
  return raw
    .split(/[,;\s]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

/** TELEGRAM_ADMIN_IDS و ADMIN_TELEGRAM_IDS هر دو پذیرفته می‌شوند */
function resolveAdminIds(): string[] {
  const merged = [
    ...parseIdList(optional('TELEGRAM_ADMIN_IDS', '')),
    ...parseIdList(optional('ADMIN_TELEGRAM_IDS', '')),
  ];
  return [...new Set(merged)];
}

const DEFAULT_PAYMENT_CARD_NUMBER = '62198611052407631';
const DEFAULT_PAYMENT_CARD_HOLDER = 'محمد تقی باروتیها';

export const config = {
  telegramBotToken: optional('TELEGRAM_BOT_TOKEN'),
  telegramBotUsername: optional('TELEGRAM_BOT_USERNAME'),
  /** شناسه‌های تلگرام ادمین (جدا با کاما) — پنل ادمین / احراز / تأیید پرداخت */
  telegramAdminIds: resolveAdminIds(),
  /** رمز ورود پنل وقتی لیست ادمین خالی است — بدون پیش‌فرض؛ باید در .env تنظیم شود */
  adminPassword: optional('ADMIN_PASSWORD'),
  apiUrl: optional('API_URL', 'http://localhost:3001')!,
  webUrl: optional('WEB_URL', 'http://localhost:5173')!,
  /** Optional public URL (tunnel/prod) for Telegram inline link buttons. */
  publicWebUrl: optional('PUBLIC_WEB_URL'),
  redisUrl: optional('REDIS_URL', 'redis://localhost:6379')!,
  webhookUrl: optional('BOT_WEBHOOK_URL'),
  webhookSecret: optional('BOT_WEBHOOK_SECRET'),
  port: Number(process.env.BOT_PORT ?? process.env.PORT ?? 3002),
  /** کانال اجباری petdate (بدون @) */
  forceJoinPetdateChannel: optional('FORCE_JOIN_PETDATE_CHANNEL', 'petdating'),
  /** کانال دوردوریا — فعلاً غیرفعال؛ برای فعال‌سازی دوباره به requiredChannels اضافه شود */
  forceJoinDordoriaChannel: optional('FORCE_JOIN_DORDORIA_CHANNEL'),
  /** شماره کارت واریز خرید سکه */
  paymentCardNumber: optional('PAYMENT_CARD_NUMBER', DEFAULT_PAYMENT_CARD_NUMBER)!,
  paymentCardHolder: optional('PAYMENT_CARD_HOLDER', DEFAULT_PAYMENT_CARD_HOLDER)!,
} as const;

/** آیا حداقل یک ادمین با شناسه تلگرام در env تنظیم شده؟ */
export function hasConfiguredAdminIds(): boolean {
  return config.telegramAdminIds.length > 0;
}

/** ادمین بر اساس شناسه تلگرام در env */
export function isTelegramAdmin(telegramId: string | number | undefined | null): boolean {
  if (telegramId == null) return false;
  return config.telegramAdminIds.includes(String(telegramId));
}

export const ADMIN_PASSWORD_MISSING_MESSAGE =
  'ADMIN_PASSWORD is not set. The admin panel has no default password; set ' +
  'ADMIN_PASSWORD in .env to a value only you know, then restart.';

/**
 * بدون پیش‌فرض: اسکریپت دیپلوی وقتی `.env` وجود ندارد آن را از `.env.example`
 * می‌سازد، پس هر مقدار پیش‌فرضی روی سرور تازه یعنی رمز ادمینِ عمومی.
 */
export function assertAdminPasswordConfigured(): void {
  if (!config.adminPassword) throw new Error(ADMIN_PASSWORD_MISSING_MESSAGE);
}

/** بررسی رمز پنل ادمین — اگر رمزی تنظیم نشده باشد هیچ ورودی پذیرفته نمی‌شود */
export function checkAdminPassword(password: string): boolean {
  const expected = config.adminPassword;
  if (!expected) return false;
  return password.trim() === expected;
}

export function assertBotToken(): string {
  return required('TELEGRAM_BOT_TOKEN');
}
