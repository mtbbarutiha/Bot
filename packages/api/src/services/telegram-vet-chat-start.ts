/**
 * After a vet consult is accepted (web or bot patch→active), notify Telegram
 * peers and open bot chat sessions. Must NOT run while status is still requested.
 */
import type { User } from '@petdate/shared';
import { infra } from '../config/infra';
import { activateBotVetChatSessions } from './bot-vet-chat-session';

function escapeHtml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function usableTelegramId(id?: string | null): id is string {
  if (!id) return false;
  const t = id.trim();
  if (!t) return false;
  if (t.startsWith('fake_') || t.startsWith('demo_')) return false;
  return true;
}

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

const VET_CHAT_END = '🔌 بستن چت';
const VET_CHAT_PET = '🐾 پروفایل پت';
const VET_CHAT_MED = '📋 پرونده';
const VET_CHAT_NOTE = '📝 ثبت پرونده';
const VET_CHAT_RX = '💊 نسخه';

function vetKeyboard() {
  return {
    keyboard: [
      [{ text: VET_CHAT_END }],
      [{ text: VET_CHAT_PET }, { text: VET_CHAT_MED }],
      [{ text: VET_CHAT_NOTE }, { text: VET_CHAT_RX }],
    ],
    resize_keyboard: true,
    is_persistent: true,
  };
}

function patientKeyboard() {
  return {
    keyboard: [[{ text: VET_CHAT_END }]],
    resize_keyboard: true,
    is_persistent: true,
  };
}

/**
 * Open bot vet_chat for both sides + send intros with web link.
 * Safe to call from web accept and from PATCH status→active (bot accept path
 * also calls startVetChat locally — duplicate intros are acceptable / rare).
 */
export async function startVetChatFromApi(opts: {
  consultId: number;
  vet: User;
  patient: User;
  /** When true, skip notifying the vet (they already got bot startVetChat). */
  skipVetNotify?: boolean;
}): Promise<boolean> {
  const webBase = infra.web.url.replace(/\/$/, '');
  const webChatUrl = `${webBase}/vet-chats/${opts.consultId}`;
  const canInline = (() => {
    try {
      return new URL(webChatUrl).protocol === 'https:';
    } catch {
      return false;
    }
  })();
  const webButton = canInline
    ? { inline_keyboard: [[{ text: 'ورود به چت وب', url: webChatUrl }]] }
    : undefined;

  await activateBotVetChatSessions({
    consultId: opts.consultId,
    vet: opts.vet,
    patient: opts.patient,
  });

  let anyOk = false;
  const vetTg = usableTelegramId(opts.vet.telegramId) ? opts.vet.telegramId.trim() : null;
  const patientTg = usableTelegramId(opts.patient.telegramId)
    ? opts.patient.telegramId.trim()
    : null;

  if (vetTg && !opts.skipVetNotify) {
    const vetIntro = [
      '💬 <b>چت با صاحب پت فعال شد</b>',
      '',
      `صاحب پت: <b>${escapeHtml(opts.patient.name)}</b>`,
      'هر پیامی بفرستی مستقیم به صاحب پت می‌رسد.',
      '',
      '🌐 می‌توانید در وب هم چت کنید:',
      webChatUrl,
    ].join('\n');
    const ok = await telegramCall('sendMessage', {
      chat_id: vetTg,
      text: vetIntro,
      parse_mode: 'HTML',
      reply_markup: vetKeyboard(),
    });
    anyOk = ok || anyOk;
    if (webButton) {
      await telegramCall('sendMessage', {
        chat_id: vetTg,
        text: '🌐 لینک چت وب:',
        reply_markup: webButton,
      });
    }
  }

  if (patientTg) {
    const patientIntro = [
      '💬 <b>چت با دامپزشک فعال شد</b>',
      '',
      `پزشک: <b>${escapeHtml(opts.vet.name)}</b>`,
      'هر پیامی بفرستی مستقیم به پزشک می‌رسد.',
      '',
      '🌐 می‌توانید در وب هم چت کنید:',
      webChatUrl,
      '',
      `پایان چت: ${VET_CHAT_END}`,
    ].join('\n');
    const ok = await telegramCall('sendMessage', {
      chat_id: patientTg,
      text: patientIntro,
      parse_mode: 'HTML',
      reply_markup: patientKeyboard(),
    });
    anyOk = ok || anyOk;
    if (webButton) {
      await telegramCall('sendMessage', {
        chat_id: patientTg,
        text: '🌐 لینک چت وب:',
        reply_markup: webButton,
      });
    }
  }

  return anyOk;
}
