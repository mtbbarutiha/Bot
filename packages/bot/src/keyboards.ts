import { InlineKeyboard, Keyboard } from 'grammy';
import type { PetBreed, PetProfile, PetSpecies, UserRole } from '@petdate/shared';
import { PET_GENDER_LABELS, PET_SIZE_LABELS, USER_ROLE_LABELS, USER_ROLES } from '@petdate/shared';
import { effectiveWebUrl, isTelegramInlineUrl } from './urls';

/** Labels for pet_owner main menu */
export const PET_OWNER_MENU = {
  findPlaymate: '🔍 پیدا کردن همبازی',
  myProfile: '👤 پروفایل خودم',
  myPets: '🐾 پت‌های من',
  coins: '🪙 سکه',
  medical: '🩺 پزشکی',
  invite: '🎁 معرفی به دوستان',
  help: '❓ راهنما',
  quickVet: '⚡ ارتباط سریع با پزشک',
  shop: '🛒 پت شاپ',
  services: '🛠 خدمات',
} as const;

export const DEFAULT_MENU = {
  explore: '🔍 کشف همبازی',
  myPets: '🐾 پت‌های من',
  requests: '📬 درخواست‌ها',
  profile: '👤 پروفایل',
  addPet: '➕ ثبت پت',
  help: '❓ راهنما',
} as const;

export function roleKeyboard(): InlineKeyboard {
  const kb = new InlineKeyboard();
  USER_ROLES.forEach((role, index) => {
    kb.text(USER_ROLE_LABELS[role], `role:${role}`);
    if (index % 2 === 1) kb.row();
  });
  return kb;
}

/** منوی اختصاصی صاحب پت */
export function petOwnerMenuKeyboard(): Keyboard {
  const m = PET_OWNER_MENU;
  return new Keyboard()
    .text(m.findPlaymate)
    .text(m.myProfile)
    .row()
    .text(m.myPets)
    .text(m.coins)
    .row()
    .text(m.medical)
    .text(m.invite)
    .row()
    .text(m.help)
    .text(m.quickVet)
    .row()
    .text(m.shop)
    .text(m.services)
    .resized()
    .persistent();
}

export function defaultMenuKeyboard(): Keyboard {
  const m = DEFAULT_MENU;
  return new Keyboard()
    .text(m.explore)
    .text(m.myPets)
    .row()
    .text(m.requests)
    .text(m.profile)
    .row()
    .text(m.addPet)
    .text(m.help)
    .resized()
    .persistent();
}

/** منوی اصلی بر اساس نقش کاربر */
export function mainMenuKeyboard(role?: UserRole | string | null): Keyboard {
  if (role === 'pet_owner') return petOwnerMenuKeyboard();
  return defaultMenuKeyboard();
}

export function speciesKeyboard(): InlineKeyboard {
  return new InlineKeyboard()
    .text('🐕 سگ', 'species:dog')
    .text('🐈 گربه', 'species:cat')
    .row()
    .text('🐾 سایر', 'species:other');
}

export function speciesKeyboardFromCatalog(species: PetSpecies[]): InlineKeyboard {
  const kb = new InlineKeyboard();
  species.forEach((s, i) => {
    kb.text(`${s.emoji} ${s.labelFa}`, `species:${s.code}`);
    if (i % 2 === 1) kb.row();
  });
  if (species.length % 2 === 1) kb.row();
  return kb;
}

export function breedKeyboard(breeds: PetBreed[]): InlineKeyboard {
  const kb = new InlineKeyboard();
  breeds.forEach((b) => {
    kb.text(b.nameFa, `breed:${b.id}`).row();
  });
  kb.text('✏️ نوشتن دستی', 'breed:custom').row();
  kb.text('⏭ رد کردن', 'wizard:skip_breed');
  return kb;
}

export function petGenderKeyboard(): InlineKeyboard {
  return new InlineKeyboard()
    .text(`♂ ${PET_GENDER_LABELS.male}`, 'pet:gender:male')
    .text(`♀ ${PET_GENDER_LABELS.female}`, 'pet:gender:female');
}

export function petSizeKeyboard(): InlineKeyboard {
  return new InlineKeyboard()
    .text(PET_SIZE_LABELS.small, 'pet:size:small')
    .text(PET_SIZE_LABELS.medium, 'pet:size:medium')
    .row()
    .text(PET_SIZE_LABELS.large, 'pet:size:large');
}

export function petBoolKeyboard(field: 'vaccinated' | 'neutered' | 'looking'): InlineKeyboard {
  return new InlineKeyboard()
    .text('✅ بله', `pet:bool:${field}:1`)
    .text('❌ خیر', `pet:bool:${field}:0`);
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

export function genderKeyboard(): InlineKeyboard {
  return new InlineKeyboard()
    .text('👨 آقا', 'profile:gender:male')
    .text('👩 خانم', 'profile:gender:female');
}

export function phoneKeyboard(): Keyboard {
  return new Keyboard().requestContact('📱 ارسال شماره تماس').resized().oneTime();
}

export function profileActionsKeyboard(complete: boolean): InlineKeyboard {
  const kb = new InlineKeyboard();
  if (complete) {
    kb.text('✏️ ویرایش پروفایل', 'profile:edit').row();
  } else {
    kb.text('✨ تکمیل پروفایل', 'profile:edit').row();
  }
  return kb;
}

export function skipProfileKeyboard(callback: string): InlineKeyboard {
  return new InlineKeyboard().text('⏭ رد کردن', callback);
}

export function myPetsActionKeyboard(): InlineKeyboard {
  return new InlineKeyboard()
    .text('➕ ثبت پت جدید', 'pets:add')
    .row()
    .text('📬 درخواست‌های همبازی', 'pets:requests');
}

export const MENU_LABELS = new Set<string>([
  ...Object.values(PET_OWNER_MENU),
  ...Object.values(DEFAULT_MENU),
]);
