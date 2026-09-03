import type { PetProfile, PlaydateRequest } from '@petdate/shared';
import { PET_GENDER_LABELS, PET_SIZE_LABELS, PLAYDATE_STATUS_LABELS, formatPetAge } from '@petdate/shared';

const SPECIES_LABELS: Record<string, string> = {
  dog: '🐕 سگ',
  cat: '🐈 گربه',
  other: '🐾 سایر',
};

export function speciesLabel(species: string): string {
  return SPECIES_LABELS[species] ?? species;
}

export function formatPet(pet: PetProfile, detailed = false): string {
  const lines = [
    `🐾 <b>${escapeHtml(pet.name)}</b>`,
    `${speciesLabel(pet.species)}${pet.breed ? ` · ${escapeHtml(pet.breed)}` : ''}`,
    pet.city
      ? `📍 ${escapeHtml(pet.city)}${pet.neighborhood ? ` — ${escapeHtml(pet.neighborhood)}` : ''}`
      : '',
  ];
  if (detailed) {
    if (pet.gender) lines.push(`⚧ ${PET_GENDER_LABELS[pet.gender] ?? pet.gender}`);
    if (pet.ageMonths) lines.push(`🎂 ${formatPetAge(pet.ageMonths)}`);
    if (pet.size) lines.push(`📏 ${PET_SIZE_LABELS[pet.size] ?? pet.size}`);
    if (pet.color) lines.push(`🎨 ${escapeHtml(pet.color)}`);
    lines.push(pet.vaccinated ? '💉 واکسن زده' : '🚫 واکسن نزده');
    lines.push(pet.neutered ? '✂️ عقیم شده' : '➖ عقیم نشده');
    const diseases = typeof pet.health?.diseases === 'string' ? pet.health.diseases : null;
    if (diseases) lines.push(`🏥 ${escapeHtml(diseases)}`);
    if (pet.bio) lines.push(`💬 ${escapeHtml(pet.bio)}`);
    lines.push(pet.lookingForPlaymate ? '🔍 دنبال همبازی' : '⏸️ فعلاً همبازی نمی‌خواد');
  }
  return lines.filter(Boolean).join('\n');
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

export function formatPlaydate(req: PlaydateRequest): string {
  const fromName = req.fromPet?.name ?? `#${req.fromPetId}`;
  const toName = req.toPet?.name ?? `#${req.toPetId}`;
  const status = PLAYDATE_STATUS_LABELS[req.status];
  const lines = [
    `📬 درخواست #${req.id}`,
    `${fromName} → ${toName}`,
    `وضعیت: ${status}`,
  ];
  if (req.message) lines.push(`💬 ${req.message}`);
  if (req.scheduledAt) lines.push(`📅 ${req.scheduledAt}`);
  if (req.location) lines.push(`📍 ${req.location}`);
  return lines.join('\n');
}

export function roleWelcomeHint(role: string): string {
  const hints: Record<string, string> = {
    pet_owner: 'می‌تونی پت ثبت کنی و همبازی پیدا کنی.',
    vet: 'می‌تونی مشاوره آنلاین بدی (به‌زودی).',
    no_pet: 'می‌تونی همبازی‌ها رو ببینی و با جامعه پت آشنا بشی.',
    pet_seeker: 'می‌تونی پت مناسب پیدا کنی.',
    community_seeker: 'به جامعه petdate خوش اومدی!',
    trainer: 'می‌تونی خدمات آموزشی ارائه بدی (به‌زودی).',
    pet_sitter: 'می‌تونی خدمات نگهداری بدی (به‌زودی).',
  };
  return hints[role] ?? '';
}
