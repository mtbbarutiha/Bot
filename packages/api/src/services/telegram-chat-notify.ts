import { infra } from '../config/infra';

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

/** Deliver a playdate chat line from web/API to the peer's Telegram. */
export async function notifyPlaydateChatTelegram(opts: {
  toTelegramId: string;
  senderName: string;
  text: string;
  playdateId: number;
}): Promise<boolean> {
  if (!infra.telegram.botToken || !opts.toTelegramId) return false;
  if (opts.toTelegramId.startsWith('fake_') || opts.toTelegramId.startsWith('fake_owner_')) {
    return false;
  }

  const header = `💬 پیام همبازی از ${opts.senderName}:`;
  const body = opts.text.trim().slice(0, 3500);
  return telegramCall('sendMessage', {
    chat_id: opts.toTelegramId,
    text: `${header}\n\n${body}`,
  });
}
