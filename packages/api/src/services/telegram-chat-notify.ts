import { infra } from '../config/infra';
import fs from 'fs';
import path from 'path';
import type { PlaydateChatMediaKind } from '@petdate/shared';
import { resolveStoragePath } from './chat-upload-store';

async function telegramCall(method: string, body: Record<string, unknown>): Promise<boolean> {
  const token = infra.telegram.botToken;
  if (!token) return false;
  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = (await res.json()) as { ok?: boolean; description?: string };
    if (!data.ok) {
      console.warn(`telegram ${method} failed:`, data.description ?? res.status);
      return false;
    }
    return true;
  } catch (err) {
    console.warn(`telegram ${method} error:`, (err as Error).message);
    return false;
  }
}

async function telegramCallForm(method: string, form: FormData): Promise<boolean> {
  const token = infra.telegram.botToken;
  if (!token) return false;
  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
      method: 'POST',
      body: form,
    });
    const data = (await res.json()) as { ok?: boolean; description?: string };
    if (!data.ok) {
      console.warn(`telegram ${method} failed:`, data.description ?? res.status);
      return false;
    }
    return true;
  } catch (err) {
    console.warn(`telegram ${method} error:`, (err as Error).message);
    return false;
  }
}

function usableTelegramId(id?: string | null): id is string {
  if (!id) return false;
  if (id.startsWith('fake_') || id.startsWith('fake_owner_')) return false;
  return true;
}

function telegramMethodForKind(kind: PlaydateChatMediaKind | null | undefined): string {
  switch (kind) {
    case 'photo':
    case 'sticker':
      return 'sendPhoto';
    case 'video':
    case 'animation':
    case 'video_note':
      return 'sendVideo';
    case 'voice':
      return 'sendVoice';
    case 'audio':
      return 'sendAudio';
    default:
      return 'sendDocument';
  }
}

function formFieldForKind(kind: PlaydateChatMediaKind | null | undefined): string {
  switch (kind) {
    case 'photo':
    case 'sticker':
      return 'photo';
    case 'video':
    case 'animation':
    case 'video_note':
      return 'video';
    case 'voice':
      return 'voice';
    case 'audio':
      return 'audio';
    default:
      return 'document';
  }
}

/** Deliver a playdate chat line from web/API to the peer's Telegram. */
export async function notifyPlaydateChatTelegram(opts: {
  toTelegramId: string;
  senderName: string;
  text: string;
  playdateId: number;
  protectContent?: boolean;
  mediaKind?: PlaydateChatMediaKind | null;
  storageKey?: string | null;
  mimeType?: string | null;
  fileName?: string | null;
}): Promise<boolean> {
  if (!infra.telegram.botToken || !usableTelegramId(opts.toTelegramId)) return false;

  const header = `💬 پیام همبازی از ${opts.senderName}:`;
  const captionText = opts.text.trim();
  const isPlaceholder = /^\[(تصویر|ویدیو|پیام صوتی|فایل صوتی|فایل|استیکر|رسانه)\]$/.test(
    captionText
  );
  const bodyText = isPlaceholder ? '' : captionText.slice(0, 900);

  if (opts.storageKey && opts.mediaKind) {
    const abs = resolveStoragePath(opts.storageKey);
    if (abs && fs.existsSync(abs)) {
      const buf = fs.readFileSync(abs);
      const fileName =
        opts.fileName || path.basename(abs) || `file${path.extname(abs) || ''}`;
      const mime = opts.mimeType || 'application/octet-stream';
      const form = new FormData();
      form.append('chat_id', opts.toTelegramId);
      const blob = new Blob([new Uint8Array(buf)], { type: mime });
      form.append(formFieldForKind(opts.mediaKind), blob, fileName);
      const caption = bodyText ? `${header}\n\n${bodyText}` : header;
      form.append('caption', caption.slice(0, 1024));
      if (opts.protectContent) form.append('protect_content', 'true');
      const ok = await telegramCallForm(telegramMethodForKind(opts.mediaKind), form);
      if (ok) return true;
      // fall through to text notice if media send fails
    }
  }

  const body = (bodyText || captionText || '[رسانه]').slice(0, 3500);
  return telegramCall('sendMessage', {
    chat_id: opts.toTelegramId,
    text: `${header}\n\n${body}`,
    ...(opts.protectContent ? { protect_content: true } : {}),
  });
}

export async function notifyPlaydateChatSecureTelegram(opts: {
  toTelegramId: string;
  secure: boolean;
}): Promise<boolean> {
  if (!infra.telegram.botToken || !usableTelegramId(opts.toTelegramId)) return false;
  const text = opts.secure
    ? '🔒 طرف مقابل چت امن را در وب فعال کرد.\nپیام‌های این گفتگو قابل ذخیره یا فوروارد نیستند.'
    : '🔓 طرف مقابل چت امن را در وب خاموش کرد.';
  return telegramCall('sendMessage', {
    chat_id: opts.toTelegramId,
    text,
  });
}

export async function notifyPlaydateChatEndedTelegram(opts: {
  toTelegramId: string;
}): Promise<boolean> {
  if (!infra.telegram.botToken || !usableTelegramId(opts.toTelegramId)) return false;
  return telegramCall('sendMessage', {
    chat_id: opts.toTelegramId,
    text:
      '🔌 چت همبازی از وب قطع شد.\n🗑 لطفاً کل این گفتگو را از تلگرام پاک کنید تا اثری نماند.',
  });
}

/** Resolve a Telegram file_id to a downloadable file path on Telegram servers. */
export async function resolveTelegramFile(fileId: string): Promise<{
  filePath: string;
  downloadUrl: string;
} | null> {
  const token = infra.telegram.botToken;
  if (!token || !fileId) return null;
  try {
    const res = await fetch(
      `https://api.telegram.org/bot${token}/getFile?file_id=${encodeURIComponent(fileId)}`
    );
    const data = (await res.json()) as {
      ok?: boolean;
      result?: { file_path?: string };
      description?: string;
    };
    if (!data.ok || !data.result?.file_path) {
      console.warn('telegram getFile failed:', data.description ?? res.status);
      return null;
    }
    const filePath = data.result.file_path;
    return {
      filePath,
      downloadUrl: `https://api.telegram.org/file/bot${token}/${filePath}`,
    };
  } catch (err) {
    console.warn('telegram getFile error:', (err as Error).message);
    return null;
  }
}
