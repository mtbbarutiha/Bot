import path from 'path';
import dotenv from 'dotenv';

dotenv.config({ path: path.join(__dirname, '..', '..', '..', '.env') });

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

export const config = {
  telegramBotToken: optional('TELEGRAM_BOT_TOKEN'),
  telegramBotUsername: optional('TELEGRAM_BOT_USERNAME'),
  /** شناسه‌های تلگرام ادمین (جدا با کاما) — پنل ادمین / احراز */
  telegramAdminIds: resolveAdminIds(),
  /** رمز ورود پنل وقتی لیست ادمین خالی است (پیش‌فرض: petdate) */
  adminPassword: optional('ADMIN_PASSWORD', 'petdate')!,
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

/** بررسی رمز پنل ادمین */
export function checkAdminPassword(password: string): boolean {
  return password.trim() === config.adminPassword;
}

export function assertBotToken(): string {
  return required('TELEGRAM_BOT_TOKEN');
}
