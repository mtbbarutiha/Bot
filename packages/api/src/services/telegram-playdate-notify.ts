import {
  PET_GENDER_LABELS,
  PET_SIZE_LABELS,
  PET_SPECIES_LABELS,
  formatPetAge,
  type PetProfile,
} from '@petdate/shared';
import { infra } from '../config/infra';

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function defaultPetPhoto(pet: { species?: string; id: number }): string {
  const dogs = [
    'https://images.unsplash.com/photo-1552053831-71594a27632d?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1587300003388-59208cc962cb?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1517849845537-4d257902454a?auto=format&fit=crop&w=800&q=80',
  ];
  const cats = [
    'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?auto=format&fit=crop&w=800&q=80',
  ];
  const pool = pet.species === 'cat' ? cats : dogs;
  return pool[pet.id % pool.length]!;
}

function formatPetHtml(pet: PetProfile): string {
  const species = PET_SPECIES_LABELS[pet.species] ?? pet.species;
  const lines = [
    `🐾 <b>${escapeHtml(pet.name)}</b>`,
    `${species}${pet.breed ? ` · ${escapeHtml(pet.breed)}` : ''}`,
  ];
  const ownerLoc = [pet.ownerProvince, pet.ownerCity || pet.city].filter(Boolean).join('، ');
  if (ownerLoc) lines.push(`📍 ${escapeHtml(ownerLoc)}`);
  else if (pet.city) {
    lines.push(
      `📍 ${escapeHtml(pet.city)}${pet.neighborhood ? ` — ${escapeHtml(pet.neighborhood)}` : ''}`
    );
  }
  if (pet.ownerVerified) lines.push('✅ صاحب پت احراز شده');
  if (pet.gender) lines.push(`⚧ ${PET_GENDER_LABELS[pet.gender] ?? pet.gender}`);
  if (pet.ageMonths) lines.push(`🎂 ${formatPetAge(pet.ageMonths)}`);
  if (pet.size) lines.push(`📏 ${PET_SIZE_LABELS[pet.size] ?? pet.size}`);
  if (pet.color) lines.push(`🎨 ${escapeHtml(pet.color)}`);
  lines.push(pet.vaccinated ? '💉 واکسن زده' : '🚫 واکسن نزده');
  lines.push(pet.neutered ? '✂️ عقیم شده' : '➖ عقیم نشده');
  if (pet.bio) lines.push(`💬 ${escapeHtml(pet.bio)}`);
  lines.push(pet.lookingForPlaymate ? '🔍 دنبال همبازی' : '⏸️ فعلاً همبازی نمی‌خواد');
  return lines.filter(Boolean).join('\n');
}

/** Keep Telegram calls short so playdate create never blocks the HTTP response. */
const TELEGRAM_CALL_TIMEOUT_MS = 4000;

async function telegramCall(method: string, body: Record<string, unknown>): Promise<boolean> {
  const token = infra.telegram.botToken;
  if (!token) return false;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TELEGRAM_CALL_TIMEOUT_MS);
  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal,
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
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Notify recipient owner on Telegram when a playdate request is created
 * (same payload as bot notifyIncomingPlaydateRequest).
 */
export async function notifyPlaydateRequestTelegram(opts: {
  requestId: number;
  toTelegramId: string;
  fromPet: PetProfile;
  toPetName: string;
  speciesLabel?: string;
}): Promise<boolean> {
  if (!infra.telegram.botToken || !opts.toTelegramId) return false;

  const speciesLabel =
    opts.speciesLabel ?? PET_SPECIES_LABELS[opts.fromPet.species] ?? opts.fromPet.species;
  const caption = [
    '📬 <b>درخواست همبازی جدید</b>',
    '',
    `از طرف <b>${escapeHtml(opts.fromPet.name)}</b> برای <b>${escapeHtml(opts.toPetName)}</b>`,
    speciesLabel ? `دسته: ${escapeHtml(speciesLabel)}` : null,
    '',
    formatPetHtml(opts.fromPet),
  ]
    .filter((l) => l !== null)
    .join('\n')
    .slice(0, 1024);

  const photo = opts.fromPet.imageUrl || defaultPetPhoto(opts.fromPet);
  const reply_markup = {
    inline_keyboard: [
      [
        { text: '✅ قبول', callback_data: `playdate:accept:${opts.requestId}` },
        { text: '❌ رد', callback_data: `playdate:reject:${opts.requestId}` },
      ],
    ],
  };

  const sentPhoto = await telegramCall('sendPhoto', {
    chat_id: opts.toTelegramId,
    photo,
    caption,
    parse_mode: 'HTML',
    reply_markup,
  });
  if (sentPhoto) return true;

  return telegramCall('sendMessage', {
    chat_id: opts.toTelegramId,
    text: caption,
    parse_mode: 'HTML',
    reply_markup,
  });
}
