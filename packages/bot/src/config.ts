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

export const config = {
  telegramBotToken: optional('TELEGRAM_BOT_TOKEN'),
  telegramBotUsername: optional('TELEGRAM_BOT_USERNAME'),
  apiUrl: optional('API_URL', 'http://localhost:3001')!,
  webUrl: optional('WEB_URL', 'http://localhost:5173')!,
  /** Optional public URL (tunnel/prod) for Telegram inline link buttons. */
  publicWebUrl: optional('PUBLIC_WEB_URL'),
  redisUrl: optional('REDIS_URL', 'redis://localhost:6379')!,
  webhookUrl: optional('BOT_WEBHOOK_URL'),
  webhookSecret: optional('BOT_WEBHOOK_SECRET'),
  port: Number(process.env.BOT_PORT ?? process.env.PORT ?? 3002),
} as const;

export function assertBotToken(): string {
  return required('TELEGRAM_BOT_TOKEN');
}
