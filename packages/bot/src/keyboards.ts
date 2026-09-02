import { InlineKeyboard, Keyboard } from 'grammy';
import type { PetProfile } from '@petdate/shared';
import { USER_ROLE_LABELS, USER_ROLES } from '@petdate/shared';
import { effectiveWebUrl, isTelegramInlineUrl } from './urls';

export function roleKeyboard(): InlineKeyboard {
  const kb = new InlineKeyboard();
  USER_ROLES.forEach((role, index) => {
    kb.text(USER_ROLE_LABELS[role], `role:${role}`);
    if (index % 2 === 1) kb.row();
  });
  return kb;
}

export function mainMenuKeyboard(): Keyboard {
  return new Keyboard()
    .text('🔍 کشف همبازی')
    .text('🐾 پت‌های من')
    .row()
    .text('📬 درخواست‌ها')
    .text('👤 پروفایل')
    .row()
    .text('➕ ثبت پت')
    .text('❓ راهنما')
    .resized();
}

export function speciesKeyboard(): InlineKeyboard {
  return new InlineKeyboard()
    .text('🐕 سگ', 'species:dog')
    .text('🐈 گربه', 'species:cat')
    .row()
    .text('🐾 سایر', 'species:other');
}

export function skipKeyboard(callback: string): InlineKeyboard {
  return new InlineKeyboard().text('⏭ رد کردن', callback);
}

export function exploreListKeyboard(pets: PetProfile[], page: number, pageSize: number): InlineKeyboard {
  const kb = new InlineKeyboard();
  const start = page * pageSize;
  const slice = pets.slice(start, start + pageSize);

  slice.forEach((pet) => {
    kb.text(`${pet.name} (${pet.city ?? '—'})`, `explore:pet:${pet.id}`).row();
  });

  const totalPages = Math.ceil(pets.length / pageSize);
  if (totalPages > 1) {
    if (page > 0) kb.text('◀️ قبلی', `explore:page:${page - 1}`);
    kb.text(`${page + 1}/${totalPages}`, 'noop');
    if (page < totalPages - 1) kb.text('بعدی ▶️', `explore:page:${page + 1}`);
  }
  return kb;
}

export function petDetailKeyboard(petId: number, canRequest: boolean): InlineKeyboard {
  const kb = new InlineKeyboard();
  if (canRequest) kb.text('🤝 درخواست همبازی', `playdate:ask:${petId}`).row();
  kb.text('🔙 بازگشت به لیست', 'explore:back');
  return kb;
}

export function fromPetKeyboard(pets: PetProfile[], toPetId: number): InlineKeyboard {
  const kb = new InlineKeyboard();
  pets.forEach((pet) => {
    kb.text(pet.name, `playdate:from:${pet.id}:${toPetId}`).row();
  });
  kb.text('❌ انصراف', 'playdate:cancel');
  return kb;
}

export function playdateActionKeyboard(requestId: number): InlineKeyboard {
  return new InlineKeyboard()
    .text('✅ قبول', `playdate:accept:${requestId}`)
    .text('❌ رد', `playdate:reject:${requestId}`);
}

export function webLinksKeyboard(telegramId: string): InlineKeyboard | undefined {
  const base = effectiveWebUrl();
  if (!isTelegramInlineUrl(base)) return undefined;
  return new InlineKeyboard().url('🌐 باز کردن petdate', `${base}/profile?from=telegram&tg=${telegramId}`);
}

export const MENU_LABELS = new Set([
  '🔍 کشف همبازی',
  '🐾 پت‌های من',
  '📬 درخواست‌ها',
  '👤 پروفایل',
  '➕ ثبت پت',
  '❓ راهنما',
]);
