import { InlineKeyboard, Keyboard } from 'grammy';
import type { PetBreed, PetProfile, PetSpecies, UserRole } from '@petdate/shared';
import {
  PET_AGE_CUSTOM_LABEL,
  PET_AGE_OPTIONS,
  PET_COLOR_CUSTOM_LABEL,
  PET_COLOR_OPTIONS,
  PET_GENDER_LABELS,
  PET_SIZE_LABELS,
  PROFILE_INTEREST_OPTIONS,
  USER_GENDER_LABELS,
  USER_ROLE_LABELS,
  USER_ROLES,
} from '@petdate/shared';
import { effectiveWebUrl, isTelegramInlineUrl } from './urls';

/** Labels for pet_owner main menu */
export const PET_OWNER_MENU = {
  findPlaymate: '🔍 پیدا کردن همبازی',
  myProfile: '👤 پروفایل خودم',
  myPets: '🐾 پت‌های من',
  addPet: '➕ ثبت پت',
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
  profile: '👤 پروفایل',
  addPet: '➕ ثبت پت',
  help: '❓ راهنما',
} as const;

/** کیبورد مخصوص بخش پت‌های من (بدون پت‌های من / درخواست‌ها) */
export const MY_PETS_SECTION = {
  addPet: '➕ ثبت پت جدید',
  backToMenu: '🔙 بازگشت به منو',
} as const;

/** دکمه‌های ناوبری ویزارد (reply keyboard) */
export const WIZARD_NAV = {
  back: '↩️ بازگشت',
  cancel: '❌ انصراف',
  skip: '⏭ رد کردن',
  nextPage: 'بعدی ▶️',
  prevPage: '◀️ قبلی',
  custom: '✏️ نوشتن دستی',
  otherCity: '✏️ شهر دیگر',
  sharePhone: '📱 ارسال شماره تماس',
  interestsDone: '✅ ثبت علایق',
} as const;

export const YES_LABEL = '✅ بله';
export const NO_LABEL = '❌ خیر';
export const VACCINATED_YES_LABEL = '💉 واکسن زده';
export const VACCINATED_NO_LABEL = '🚫 واکسن نزده';
export const NEUTERED_YES_LABEL = '✂️ عقیم شده';
export const NEUTERED_NO_LABEL = '➖ عقیم نشده';
export const LOOKING_YES_LABEL = '🤝 دنبال همبازی';
export const LOOKING_NO_LABEL = '⏸ فعلاً نه';
export const USER_MALE_LABEL = `👨 ${USER_GENDER_LABELS.male}`;
export const USER_FEMALE_LABEL = `👩 ${USER_GENDER_LABELS.female}`;
export const PET_MALE_LABEL = `♂ ${PET_GENDER_LABELS.male}`;
export const PET_FEMALE_LABEL = `♀ ${PET_GENDER_LABELS.female}`;

export const PROFILE_AGE_CHIPS = ['18', '22', '25', '28', '30', '35', '40', '45'];
/** @deprecated use PET_AGE_OPTIONS / petAgeReplyKeyboard */
export const PET_AGE_CHIPS = PET_AGE_OPTIONS.map((o) => String(o.months));
export const COMMON_CITIES = [
  'تهران',
  'کرج',
  'مشهد',
  'اصفهان',
  'شیراز',
  'تبریز',
  'اهواز',
  'قم',
] as const;

export const BREED_PAGE_SIZE = 6;

export const WIZARD_NAV_LABELS = new Set<string>(Object.values(WIZARD_NAV));

export function isWizardNav(text: string): boolean {
  return WIZARD_NAV_LABELS.has(text);
}

export function withWizardNav(
  kb: Keyboard,
  opts?: { skip?: boolean; noBack?: boolean }
): Keyboard {
  if (opts?.skip) {
    kb.row().text(WIZARD_NAV.skip);
  }
  kb.row();
  if (!opts?.noBack) kb.text(WIZARD_NAV.back);
  kb.text(WIZARD_NAV.cancel).danger();
  return kb.resized().persistent();
}

/** کیبورد انتخابی منویی برای مراحل ویزارد */
export function choiceReplyKeyboard(
  labels: string[],
  opts?: { columns?: number; skip?: boolean; noBack?: boolean }
): Keyboard {
  const cols = opts?.columns ?? 2;
  const kb = new Keyboard();
  labels.forEach((label, i) => {
    kb.text(label);
    if ((i + 1) % cols === 0) kb.row();
  });
  if (labels.length % cols !== 0) kb.row();
  return withWizardNav(kb, opts);
}

export function textStepKeyboard(opts?: { skip?: boolean; noBack?: boolean }): Keyboard {
  return withWizardNav(new Keyboard(), opts);
}

export function genderReplyKeyboard(): Keyboard {
  return choiceReplyKeyboard([USER_MALE_LABEL, USER_FEMALE_LABEL]);
}

export function ageChipKeyboard(chips: string[], opts?: { noBack?: boolean }): Keyboard {
  return choiceReplyKeyboard(chips, { columns: 4, noBack: opts?.noBack });
}

/** کیبورد سن پت با برچسب‌های خوانا (ماه‌ای / سالی) */
export function petAgeReplyKeyboard(): Keyboard {
  const labels = [...PET_AGE_OPTIONS.map((o) => o.label), PET_AGE_CUSTOM_LABEL];
  return choiceReplyKeyboard(labels, { columns: 3 });
}

export function cityReplyKeyboard(opts?: { skip?: boolean }): Keyboard {
  return choiceReplyKeyboard([...COMMON_CITIES, WIZARD_NAV.otherCity], {
    columns: 2,
    skip: opts?.skip,
  });
}

export function phoneWizardKeyboard(): Keyboard {
  return new Keyboard()
    .requestContact(WIZARD_NAV.sharePhone)
    .primary()
    .row()
    .text(WIZARD_NAV.skip)
    .row()
    .text(WIZARD_NAV.back)
    .text(WIZARD_NAV.cancel)
    .danger()
    .resized()
    .persistent();
}

export function interestsReplyKeyboard(selected: string[] = []): Keyboard {
  const kb = new Keyboard();
  PROFILE_INTEREST_OPTIONS.forEach((opt, i) => {
    const label = selected.includes(opt) ? `✓ ${opt}` : opt;
    if (selected.includes(opt)) kb.text(label).success();
    else kb.text(label);
    if ((i + 1) % 2 === 0) kb.row();
  });
  if (PROFILE_INTEREST_OPTIONS.length % 2 !== 0) kb.row();
  kb.text(WIZARD_NAV.interestsDone).success();
  return withWizardNav(kb, { skip: true });
}

export function speciesReplyKeyboard(species: PetSpecies[]): Keyboard {
  return choiceReplyKeyboard(species.map((s) => `${s.emoji} ${s.labelFa}`));
}

export function breedReplyKeyboard(breeds: PetBreed[], page: number): Keyboard {
  const totalPages = Math.max(1, Math.ceil(breeds.length / BREED_PAGE_SIZE));
  const safePage = Math.min(Math.max(0, page), totalPages - 1);
  const slice = breeds.slice(safePage * BREED_PAGE_SIZE, (safePage + 1) * BREED_PAGE_SIZE);

  const kb = new Keyboard();
  slice.forEach((b, i) => {
    kb.text(b.nameFa);
    if ((i + 1) % 2 === 0) kb.row();
  });
  if (slice.length % 2 !== 0) kb.row();

  kb.text(WIZARD_NAV.custom);
  if (totalPages > 1) {
    kb.row();
    if (safePage > 0) kb.text(WIZARD_NAV.prevPage);
    kb.text(`${safePage + 1}/${totalPages}`);
    if (safePage < totalPages - 1) kb.text(WIZARD_NAV.nextPage);
  }
  return withWizardNav(kb, { skip: true });
}

export function petGenderReplyKeyboard(): Keyboard {
  return choiceReplyKeyboard([PET_MALE_LABEL, PET_FEMALE_LABEL]);
}

export function petSizeReplyKeyboard(): Keyboard {
  return choiceReplyKeyboard([
    PET_SIZE_LABELS.small,
    PET_SIZE_LABELS.medium,
    PET_SIZE_LABELS.large,
  ]);
}

export function petColorReplyKeyboard(): Keyboard {
  return choiceReplyKeyboard([...PET_COLOR_OPTIONS, PET_COLOR_CUSTOM_LABEL], {
    columns: 3,
    skip: true,
  });
}

export function yesNoReplyKeyboard(): Keyboard {
  return new Keyboard()
    .text(YES_LABEL)
    .success()
    .text(NO_LABEL)
    .danger()
    .row()
    .text(WIZARD_NAV.back)
    .text(WIZARD_NAV.cancel)
    .danger()
    .resized()
    .persistent();
}

export function vaccinatedReplyKeyboard(): Keyboard {
  return choiceReplyKeyboard([VACCINATED_YES_LABEL, VACCINATED_NO_LABEL]);
}

export function neuteredReplyKeyboard(): Keyboard {
  return choiceReplyKeyboard([NEUTERED_YES_LABEL, NEUTERED_NO_LABEL]);
}

export function lookingReplyKeyboard(): Keyboard {
  return choiceReplyKeyboard([LOOKING_YES_LABEL, LOOKING_NO_LABEL]);
}

export function roleReplyKeyboard(): Keyboard {
  const kb = new Keyboard();
  USER_ROLES.forEach((role, index) => {
    kb.text(USER_ROLE_LABELS[role]).primary();
    if (index % 2 === 1) kb.row();
  });
  if (USER_ROLES.length % 2 === 1) kb.row();
  return kb.resized().persistent();
}

export function roleKeyboard(): InlineKeyboard {
  const kb = new InlineKeyboard();
  USER_ROLES.forEach((role, index) => {
    kb.text(USER_ROLE_LABELS[role], `role:${role}`).primary();
    if (index % 2 === 1) kb.row();
  });
  return kb;
}

/** منوی اختصاصی صاحب پت */
export function petOwnerMenuKeyboard(): Keyboard {
  const m = PET_OWNER_MENU;
  return new Keyboard()
    .text(m.findPlaymate)
    .primary()
    .row()
    .text(m.myProfile)
    .text(m.myPets)
    .row()
    .text(m.coins)
    .text(m.medical)
    .row()
    .text(m.invite)
    .success()
    .text(m.quickVet)
    .primary()
    .row()
    .text(m.shop)
    .text(m.services)
    .row()
    .text(m.help)
    .resized()
    .persistent();
}

export function defaultMenuKeyboard(): Keyboard {
  const m = DEFAULT_MENU;
  return new Keyboard()
    .text(m.explore)
    .primary()
    .row()
    .text(m.myPets)
    .text(m.profile)
    .row()
    .text(m.help)
    .resized()
    .persistent();
}

/** ریپلای‌کیبورد داخل بخش پت‌های من — فقط ثبت و بازگشت */
export function myPetsSectionKeyboard(): Keyboard {
  const m = MY_PETS_SECTION;
  return new Keyboard()
    .text(m.addPet)
    .success()
    .row()
    .text(m.backToMenu)
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
    .primary()
    .text('🐈 گربه', 'species:cat')
    .primary()
    .row()
    .text('🐾 سایر', 'species:other');
}

export function speciesKeyboardFromCatalog(species: PetSpecies[]): InlineKeyboard {
  const kb = new InlineKeyboard();
  species.forEach((s, i) => {
    kb.text(`${s.emoji} ${s.labelFa}`, `species:${s.code}`).primary();
    if (i % 2 === 1) kb.row();
  });
  if (species.length % 2 === 1) kb.row();
  return kb;
}

export function breedKeyboard(breeds: PetBreed[]): InlineKeyboard {
  const kb = new InlineKeyboard();
  breeds.forEach((b) => {
    kb.text(b.nameFa, `breed:${b.id}`).primary().row();
  });
  kb.text('✏️ نوشتن دستی', 'breed:custom').row();
  kb.text('⏭ رد کردن', 'wizard:skip_breed');
  return kb;
}

export function petGenderKeyboard(): InlineKeyboard {
  return new InlineKeyboard()
    .text(`♂ ${PET_GENDER_LABELS.male}`, 'pet:gender:male')
    .primary()
    .text(`♀ ${PET_GENDER_LABELS.female}`, 'pet:gender:female')
    .primary();
}

export function petSizeKeyboard(): InlineKeyboard {
  return new InlineKeyboard()
    .text(PET_SIZE_LABELS.small, 'pet:size:small')
    .primary()
    .text(PET_SIZE_LABELS.medium, 'pet:size:medium')
    .primary()
    .row()
    .text(PET_SIZE_LABELS.large, 'pet:size:large')
    .primary();
}

export function petBoolKeyboard(field: 'vaccinated' | 'neutered' | 'looking'): InlineKeyboard {
  return new InlineKeyboard()
    .text('✅ بله', `pet:bool:${field}:1`)
    .success()
    .text('❌ خیر', `pet:bool:${field}:0`)
    .danger();
}

export function skipKeyboard(callback: string): InlineKeyboard {
  return new InlineKeyboard().text('⏭ رد کردن', callback);
}

export function exploreListKeyboard(pets: PetProfile[], page: number, pageSize: number): InlineKeyboard {
  const kb = new InlineKeyboard();
  const start = page * pageSize;
  const slice = pets.slice(start, start + pageSize);

  slice.forEach((pet) => {
    kb.text(`${pet.name} (${pet.city ?? '—'})`, `explore:pet:${pet.id}`).primary().row();
  });

  const totalPages = Math.ceil(pets.length / pageSize);
  if (totalPages > 1) {
    if (page > 0) kb.text('◀️ قبلی', `explore:page:${page - 1}`);
    kb.text(`${page + 1}/${totalPages}`, 'noop');
    if (page < totalPages - 1) kb.text('بعدی ▶️', `explore:page:${page + 1}`);
    kb.row();
  }
  kb.text('🔄 تعویض پت من', 'explore:pick').row();
  return kb;
}

/** انتخاب پت مبدأ برای پیدا کردن همبازی — فقط پت‌های خود کاربر */
export function explorePickMyPetKeyboard(pets: PetProfile[]): InlineKeyboard {
  const kb = new InlineKeyboard();
  pets.forEach((pet) => {
    const bits = [pet.breed, pet.city].filter(Boolean).join(' · ');
    const label = bits ? `${pet.name} (${bits})` : pet.name;
    kb.text(`🐾 ${label}`, `explore:for:${pet.id}`).primary().row();
  });
  return kb;
}

export function petDetailKeyboard(petId: number, canRequest: boolean): InlineKeyboard {
  const kb = new InlineKeyboard();
  // درخواست دستی حذف شد — پیدا کردن همبازی خودکار ارسال می‌کند
  void petId;
  void canRequest;
  kb.text('🔙 بازگشت', 'explore:pick');
  return kb;
}

export function fromPetKeyboard(pets: PetProfile[], toPetId: number): InlineKeyboard {
  const kb = new InlineKeyboard();
  pets.forEach((pet) => {
    kb.text(pet.name, `playdate:from:${pet.id}:${toPetId}`).primary().row();
  });
  kb.text('❌ انصراف', 'playdate:cancel').danger();
  return kb;
}

export function playdateActionKeyboard(requestId: number): InlineKeyboard {
  return new InlineKeyboard()
    .text('✅ قبول', `playdate:accept:${requestId}`)
    .success()
    .text('❌ رد', `playdate:reject:${requestId}`)
    .danger();
}

export function webLinksKeyboard(telegramId: string): InlineKeyboard | undefined {
  const base = effectiveWebUrl();
  if (!isTelegramInlineUrl(base)) return undefined;
  return new InlineKeyboard()
    .url('🌐 باز کردن petdate', `${base}/profile?from=telegram&tg=${telegramId}`)
    .primary();
}

export function genderKeyboard(): InlineKeyboard {
  return new InlineKeyboard()
    .text('👨 آقا', 'profile:gender:male')
    .primary()
    .text('👩 خانم', 'profile:gender:female')
    .primary();
}

export function phoneKeyboard(): Keyboard {
  return phoneWizardKeyboard();
}

export function profileActionsKeyboard(complete: boolean, isActive = true): InlineKeyboard {
  const kb = new InlineKeyboard();
  if (complete) {
    kb.text('✏️ ویرایش پروفایل', 'profile:edit').primary().row();
  } else {
    kb.text('✨ تکمیل پروفایل', 'profile:edit').success().row();
  }
  kb.text('🗑 حذف', 'profile:delete').danger();
  if (isActive) {
    kb.text('⏸ غیرفعال‌سازی', 'profile:deactivate').danger();
  } else {
    kb.text('▶️ فعال‌سازی', 'profile:activate').success();
  }
  return kb;
}

export function profileConfirmKeyboard(action: 'deactivate' | 'delete'): InlineKeyboard {
  return new InlineKeyboard()
    .text('✅ بله، مطمئنم', `profile:${action}:yes`)
    .danger()
    .text('↩️ نه', `profile:${action}:no`)
    .primary();
}

/** @deprecated alias — use profileConfirmKeyboard('delete') */
export function confirmDeleteKeyboard(): InlineKeyboard {
  return profileConfirmKeyboard('delete');
}

export function skipProfileKeyboard(callback: string): InlineKeyboard {
  return new InlineKeyboard().text('⏭ رد کردن', callback);
}

export function myPetsActionKeyboard(): InlineKeyboard {
  return new InlineKeyboard().text('➕ ثبت پت جدید', 'pets:add').success();
}

/** لیست پت‌های کاربر + ثبت جدید */
export function myPetsListKeyboard(pets: PetProfile[]): InlineKeyboard {
  const kb = new InlineKeyboard();
  pets.forEach((pet) => {
    const bits = [pet.breed, pet.city].filter(Boolean).join(' · ');
    const label = bits ? `${pet.name} (${bits})` : pet.name;
    kb.text(`🐾 ${label}`, `pets:view:${pet.id}`).primary().row();
  });
  kb.text('➕ ثبت پت جدید', 'pets:add').success();
  return kb;
}

export function myPetProfileKeyboard(petId: number): InlineKeyboard {
  return new InlineKeyboard()
    .text('🗑 حذف پت', `pets:delete:${petId}`)
    .danger()
    .row()
    .text('🔙 بازگشت به پت‌های من', 'pets:list');
}

export function confirmPetDeleteKeyboard(petId: number): InlineKeyboard {
  return new InlineKeyboard()
    .text('✅ بله، حذف شود', `pets:delete:yes:${petId}`)
    .danger()
    .text('↩️ نه', `pets:view:${petId}`)
    .primary();
}

export const MENU_LABELS = new Set<string>([
  ...Object.values(PET_OWNER_MENU),
  ...Object.values(DEFAULT_MENU),
  ...Object.values(MY_PETS_SECTION),
]);
