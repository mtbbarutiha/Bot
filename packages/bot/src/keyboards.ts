import { InlineKeyboard, Keyboard } from 'grammy';
import type { PetBreed, PetProfile, PetSpecies, UserRole } from '@petdate/shared';
import {
  PET_AGE_CUSTOM_LABEL,
  PET_AGE_OPTIONS,
  PET_COLOR_CUSTOM_LABEL,
  PET_COLOR_OPTIONS,
  PET_GENDER_LABELS,
  PET_SIZE_LABELS,
  PROFILE_COUNTRIES,
  PROFILE_INTEREST_OPTIONS,
  IRAN_PROVINCES,
  MY_ROLES_LABEL,
  ROLE_ADD_LABEL,
  ROLE_CONFIRM_LABEL,
  USER_GENDER_LABELS,
  USER_ROLE_LABELS,
  USER_ROLES,
  citiesForProvince,
  normalizeRoles,
  primaryRole,
} from '@petdate/shared';
import {
  COIN_PACKAGES,
  DAILY_COIN_REWARD,
  canClaimDaily,
  formatNum,
  packagePickerLabel,
} from './economy';
import { isTelegramAdmin } from './config';
import { effectiveWebUrl, isTelegramInlineUrl } from './urls';

/** دکمهٔ ثابت بازگشت/باز کردن منوی اصلی روی reply keyboard */
export const MAIN_MENU_BTN = '📋 منو' as const;

/** متن‌های معادل «منو» که همان رندر منوی اصلی را صدا می‌زنند */
export const MAIN_MENU_ALIASES = new Set<string>([
  MAIN_MENU_BTN,
  '🏠 منو',
  'منو',
  'منوی اصلی',
  '🔙 منوی اصلی',
  '🏠 منوی اصلی',
  '🔙 بازگشت به منو',
]);

/** Labels for pet_owner main menu */
export const PET_OWNER_MENU = {
  findPlaymate: '🔍 پیدا کردن همبازی',
  nearbyPets: '📍 پت‌های نزدیک من',
  searchPets: '🔎 جستجوی پت',
  myProfile: '👤 پروفایل خودم',
  myPets: '🐾 پت‌های من',
  addPet: '➕ ثبت پت',
  coins: '🪙 سکه',
  earn: '💵 کسب درآمد',
  verify: '🛡 احراز چهره',
  phoneVerify: '📱 احراز موبایل',
  medical: '🩺 پزشکی',
  invite: '🎁 معرفی به دوستان',
  help: '❓ راهنما',
  menu: MAIN_MENU_BTN,
  quickVet: '⚡ ارتباط سریع با پزشک',
  shop: '🛒 پت شاپ',
  services: '🛠 خدمات',
  myRoles: MY_ROLES_LABEL,
} as const;

/** زیرمنوی پنل ادمین (reply keyboard) */
export const ADMIN_MENU = {
  panel: '🛠 پنل ادمین',
  faceQueue: '📋 صف احراز چهره',
  vetQueue: '📄 صف مدارک دامپزشک',
  stats: '📊 وضعیت صف‌ها',
  pendingPayments: '💳 پرداخت‌های در انتظار',
  back: '🔙 بازگشت به منو',
  menu: MAIN_MENU_BTN,
} as const;

/** زیرمنوی جستجوی پت */
export const SEARCH_PETS_MENU = {
  byBreed: '🧬 بر اساس نژاد',
  sameProvince: '🗺 هم‌استان',
  mashhad: '🏙 مشهد',
  allPets: '🐾 همه پت‌ها',
  backToMenu: '🔙 بازگشت به منو',
  menu: MAIN_MENU_BTN,
} as const;

export const DEFAULT_MENU = {
  explore: '🔍 کشف همبازی',
  myPets: '🐾 پت‌های من',
  profile: '👤 پروفایل',
  verify: '🛡 احراز چهره',
  phoneVerify: '📱 احراز موبایل',
  addPet: '➕ ثبت پت',
  myRoles: MY_ROLES_LABEL,
  help: '❓ راهنما',
  menu: MAIN_MENU_BTN,
} as const;

/** منوی دامپزشک (بدون کشف همبازی) — فقط وقتی نقش فعال vet باشد */
export const VET_MENU = {
  patients: '📋 بیماران / مشاوره‌ها',
  profile: '👤 پروفایل',
  verify: '🛡 احراز چهره',
  phoneVerify: '📱 احراز موبایل',
  myRoles: MY_ROLES_LABEL,
  help: '❓ راهنما',
  menu: MAIN_MENU_BTN,
} as const;

/** کیبورد مخصوص بخش پت‌های من (بدون پت‌های من / درخواست‌ها) */
export const MY_PETS_SECTION = {
  addPet: '➕ ثبت پت جدید',
  backToMenu: '🔙 بازگشت به منو',
  menu: MAIN_MENU_BTN,
} as const;

/** دکمه‌های ناوبری ویزارد (reply keyboard) */
export const WIZARD_NAV = {
  back: '↩️ بازگشت',
  cancel: '❌ انصراف',
  skip: '⏭ رد کردن',
  /** رد کردن کل ویزارد پروفایل و رفتن به منو */
  skipLater: '⏭ فعلاً رد کن',
  nextPage: 'بعدی ▶️',
  prevPage: '◀️ قبلی',
  custom: '✏️ نوشتن دستی',
  otherCity: '✏️ شهر دیگر',
  sharePhone: '📱 ارسال شماره تماس',
  interestsDone: '✅ ثبت علایق',
  keepName: '✓ همین نام',
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

export const BREED_PAGE_SIZE = 12;

export const WIZARD_NAV_LABELS = new Set<string>(Object.values(WIZARD_NAV));

export function isWizardNav(text: string): boolean {
  return WIZARD_NAV_LABELS.has(text);
}

export function withWizardNav(
  kb: Keyboard,
  opts?: { skip?: boolean; noBack?: boolean; skipLater?: boolean }
): Keyboard {
  if (opts?.skip) {
    kb.row().text(WIZARD_NAV.skip);
  }
  if (opts?.skipLater) {
    kb.row().text(WIZARD_NAV.skipLater);
  }
  kb.row();
  if (!opts?.noBack) kb.text(WIZARD_NAV.back);
  kb.text(WIZARD_NAV.cancel).danger();
  // همیشه «منو» قابل‌دسترس باشد تا کیبورد قدیمی تلگرام گیر نکند
  kb.row().text(MAIN_MENU_BTN);
  return kb.resized().persistent();
}

/** کیبورد انتخابی منویی برای مراحل ویزارد */
export function choiceReplyKeyboard(
  labels: string[],
  opts?: { columns?: number; skip?: boolean; noBack?: boolean; skipLater?: boolean }
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

export function textStepKeyboard(
  opts?: { skip?: boolean; noBack?: boolean; skipLater?: boolean; keepName?: string }
): Keyboard {
  const kb = new Keyboard();
  if (opts?.keepName) {
    kb.text(WIZARD_NAV.keepName).success().row();
  }
  return withWizardNav(kb, opts);
}

/** ناوبری مشترک مراحل تکمیل پروفایل */
export function profileNavOpts(extra?: {
  skip?: boolean;
  noBack?: boolean;
  skipLater?: boolean;
}): { skip?: boolean; noBack?: boolean; skipLater?: boolean } {
  return { skipLater: true, ...extra };
}

export function genderReplyKeyboard(): Keyboard {
  return choiceReplyKeyboard([USER_MALE_LABEL, USER_FEMALE_LABEL], profileNavOpts());
}

export function ageChipKeyboard(chips: string[], opts?: { noBack?: boolean }): Keyboard {
  return choiceReplyKeyboard(chips, { columns: 4, ...profileNavOpts({ noBack: opts?.noBack }) });
}

/** کیبورد سن پت با برچسب‌های خوانا (ماه‌ای / سالی) */
export function petAgeReplyKeyboard(): Keyboard {
  const labels = [...PET_AGE_OPTIONS.map((o) => o.label), PET_AGE_CUSTOM_LABEL];
  return choiceReplyKeyboard(labels, { columns: 3 });
}

export function cityReplyKeyboard(opts?: { skip?: boolean; province?: string; skipLater?: boolean }): Keyboard {
  const cities = opts?.province
    ? [...citiesForProvince(opts.province), WIZARD_NAV.otherCity]
    : [...COMMON_CITIES, WIZARD_NAV.otherCity];
  return choiceReplyKeyboard(cities, {
    columns: 2,
    skip: opts?.skip,
    skipLater: opts?.skipLater,
  });
}

export function countryReplyKeyboard(): Keyboard {
  return choiceReplyKeyboard([...PROFILE_COUNTRIES], { columns: 1, ...profileNavOpts() });
}

export function provinceReplyKeyboard(): Keyboard {
  return choiceReplyKeyboard([...IRAN_PROVINCES], { columns: 2, ...profileNavOpts() });
}

export function phoneWizardKeyboard(): Keyboard {
  return new Keyboard()
    .requestContact(WIZARD_NAV.sharePhone)
    .primary()
    .row()
    .text(WIZARD_NAV.skip)
    .row()
    .text(WIZARD_NAV.skipLater)
    .row()
    .text(WIZARD_NAV.back)
    .text(WIZARD_NAV.cancel)
    .danger()
    .row()
    .text(MAIN_MENU_BTN)
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
  return withWizardNav(kb, profileNavOpts({ skip: true }));
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

  if (totalPages > 1) {
    kb.row();
    if (safePage > 0) kb.text(WIZARD_NAV.prevPage);
    kb.text(`${safePage + 1}/${totalPages}`);
    if (safePage < totalPages - 1) kb.text(WIZARD_NAV.nextPage);
  }

  // بازگشت و نوشتن دستی کنار هم — بدون رد کردن تا جا برای نژاد بیشتر باشد
  kb.row();
  kb.text(WIZARD_NAV.back);
  kb.text(WIZARD_NAV.custom);
  kb.row();
  kb.text(WIZARD_NAV.cancel).danger();
  kb.row().text(MAIN_MENU_BTN);
  return kb.resized().persistent();
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
    .row()
    .text(MAIN_MENU_BTN)
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

export function roleReplyKeyboard(selected: UserRole[] = []): Keyboard {
  const kb = new Keyboard();
  USER_ROLES.forEach((role, index) => {
    const label = selected.includes(role)
      ? `✓ ${USER_ROLE_LABELS[role]}`
      : USER_ROLE_LABELS[role];
    if (selected.includes(role)) kb.text(label).success();
    else kb.text(label).primary();
    if ((index + 1) % 2 === 0) kb.row();
  });
  if (USER_ROLES.length % 2 !== 0) kb.row();
  kb.text(ROLE_CONFIRM_LABEL).success();
  return kb.resized().persistent();
}

export function roleKeyboard(selected: UserRole[] = []): InlineKeyboard {
  const kb = new InlineKeyboard();
  USER_ROLES.forEach((role, index) => {
    const label = selected.includes(role)
      ? `✓ ${USER_ROLE_LABELS[role]}`
      : USER_ROLE_LABELS[role];
    kb.text(label, `role:${role}`);
    if (selected.includes(role)) kb.success();
    else kb.primary();
    if (index % 2 === 1) kb.row();
  });
  if (USER_ROLES.length % 2 === 1) kb.row();
  kb.text(ROLE_CONFIRM_LABEL, 'role:confirm').success();
  return kb;
}

/** منوی اصلی بر اساس نقش فعال کاربر + ردیف دسترسی */
export function mainMenuKeyboard(
  role?: UserRole | string | null,
  roles?: UserRole[] | null,
  telegramId?: string | number | null
): Keyboard {
  const list = normalizeRoles(roles as UserRole[] | null | undefined, role as UserRole | null | undefined);
  const active = primaryRole(list, role as UserRole | null | undefined);

  if (active === 'pet_owner') return petOwnerMenuKeyboard(telegramId);
  if (active === 'vet') return vetMenuKeyboard(telegramId);
  return defaultMenuKeyboard(telegramId);
}

/**
 * ردیف دسترسی پنل‌ها:
 * - «نقش‌های من» برای سوییچ نقش فعال (صاحب پت / دامپزشک / …)
 * - «پنل ادمین» فقط اگر telegramId در ADMIN_TELEGRAM_IDS / TELEGRAM_ADMIN_IDS باشد
 */
function appendAccessRow(kb: Keyboard, telegramId?: string | number | null): Keyboard {
  kb.row().text(MY_ROLES_LABEL);
  if (telegramId != null && isTelegramAdmin(telegramId)) {
    kb.text(ADMIN_MENU.panel).primary();
  }
  return kb;
}

export function vetMenuKeyboard(telegramId?: string | number | null): Keyboard {
  const m = VET_MENU;
  // «📋 منو» ردیف اول — روی موبایل دیده شود (قبلاً ته کیبورد بلند گم می‌شد)
  const kb = new Keyboard()
    .text(m.menu)
    .row()
    .text(m.patients)
    .primary()
    .row()
    .text(m.profile)
    .text(m.verify)
    .success()
    .row()
    .text(m.phoneVerify)
    .primary()
    .text(m.help)
    .resized()
    .persistent();
  return appendAccessRow(kb, telegramId);
}

export function petOwnerMenuKeyboard(telegramId?: string | number | null): Keyboard {
  const m = PET_OWNER_MENU;
  // «📋 منو» ردیف اول — کاربر فوراً ببیند (نه ته منوی ۱۲ ردیفی)
  const kb = new Keyboard()
    .text(m.menu)
    .row()
    .text(m.findPlaymate)
    .primary()
    .row()
    .text(m.nearbyPets)
    .success()
    .text(m.searchPets)
    .primary()
    .row()
    .text(m.myProfile)
    .text(m.myPets)
    .row()
    .text(m.coins)
    .text(m.earn)
    .row()
    .text(m.verify)
    .success()
    .text(m.phoneVerify)
    .primary()
    .row()
    .text(m.medical)
    .text(m.invite)
    .success()
    .row()
    .text(m.quickVet)
    .primary()
    .text(m.shop)
    .row()
    .text(m.services)
    .text(m.help)
    .resized()
    .persistent();
  return appendAccessRow(kb, telegramId);
}

export function searchPetsMenuKeyboard(): Keyboard {
  const m = SEARCH_PETS_MENU;
  return new Keyboard()
    .text(m.menu)
    .row()
    .text(m.byBreed)
    .primary()
    .row()
    .text(m.sameProvince)
    .success()
    .text(m.mashhad)
    .primary()
    .row()
    .text(m.allPets)
    .row()
    .text(m.backToMenu)
    .resized()
    .persistent();
}

export function defaultMenuKeyboard(telegramId?: string | number | null): Keyboard {
  const m = DEFAULT_MENU;
  const kb = new Keyboard()
    .text(m.menu)
    .row()
    .text(m.explore)
    .primary()
    .row()
    .text(m.myPets)
    .text(m.profile)
    .row()
    .text(m.verify)
    .success()
    .text(m.phoneVerify)
    .primary()
    .row()
    .text(m.help)
    .resized()
    .persistent();
  return appendAccessRow(kb, telegramId);
}

/** کیبورد پنل ادمین بعد از ورود */
export function adminPanelKeyboard(): Keyboard {
  const m = ADMIN_MENU;
  return new Keyboard()
    .text(m.faceQueue)
    .primary()
    .row()
    .text(m.vetQueue)
    .row()
    .text(m.stats)
    .success()
    .text(m.pendingPayments)
    .row()
    .text(m.menu)
    .text(m.back)
    .resized()
    .persistent();
}

/** اینلاین: سوییچ بین نقش‌های فعلی کاربر */
export function myRolesSwitchKeyboard(
  roles: UserRole[],
  activeRole?: UserRole | null
): InlineKeyboard {
  const kb = new InlineKeyboard();
  const active = primaryRole(roles, activeRole);
  roles.forEach((role) => {
    const isActive = role === active;
    const label = isActive ? `✓ ${USER_ROLE_LABELS[role]}` : USER_ROLE_LABELS[role];
    kb.text(label, `myroles:switch:${role}`);
    if (isActive) kb.success();
    else kb.primary();
    kb.row();
  });
  kb.text(ROLE_ADD_LABEL, 'myroles:add').primary().row();
  return kb;
}

export function adminVetCredentialKeyboard(userId: number): InlineKeyboard {
  return new InlineKeyboard()
    .text('✅ تأیید مدرک', `vetcred:approve:${userId}`)
    .success()
    .text('❌ رد', `vetcred:reject:${userId}`)
    .danger()
    .row()
    .text('⏭ بعدی', 'vetcred:admin:next')
    .text('📋 صف', 'vetcred:admin:queue');
}

/** ریپلای‌کیبورد داخل بخش پت‌های من — فقط ثبت و بازگشت */
export function myPetsSectionKeyboard(): Keyboard {
  const m = MY_PETS_SECTION;
  return new Keyboard()
    .text(m.menu)
    .row()
    .text(m.addPet)
    .success()
    .row()
    .text(m.backToMenu)
    .resized()
    .persistent();
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
  kb.text('✏️ نوشتن دستی', 'breed:custom');
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

export function profileActionsKeyboard(
  complete: boolean,
  isActive = true,
  verificationStatus: 'none' | 'pending' | 'verified' | 'rejected' = 'none',
  opts?: { isVet?: boolean }
): InlineKeyboard {
  const kb = new InlineKeyboard();
  if (complete) {
    kb.text('✏️ ویرایش پروفایل', 'profile:edit').primary().row();
  } else {
    kb.text('✨ تکمیل پروفایل', 'profile:edit').success().row();
  }

  if (opts?.isVet) {
    kb.text('📄 آپلود مدرک', 'profile:vet_credential').row();
  }

  // Face verify lives only in profile (not main reply menus)
  if (verificationStatus === 'verified') {
    kb.text('✅ احراز چهره شده', 'verify:status').row();
  } else if (verificationStatus === 'pending') {
    kb.text('⏳ در انتظار احراز چهره', 'verify:status').row();
  } else {
    kb.text('🛡 احراز چهره', 'verify:start').row();
  }

  kb.text('📱 احراز موبایل', 'phone:verify:start').primary().row();

  kb.text('🗑 حذف', 'profile:delete').danger();
  if (isActive) {
    kb.text('⏸ غیرفعال‌سازی', 'profile:deactivate').danger();
  } else {
    kb.text('▶️ فعال‌سازی', 'profile:activate').success();
  }
  return kb;
}

/** منوی ویرایش بخش‌به‌بخش پروفایل */
export function profileEditSectionsKeyboard(opts?: {
  incomplete?: boolean;
  isVet?: boolean;
}): InlineKeyboard {
  const kb = new InlineKeyboard()
    .text('✏️ ویرایش نام', 'profile:edit:name')
    .text('🎂 ویرایش سن', 'profile:edit:age')
    .row()
    .text('⚧ ویرایش جنسیت', 'profile:edit:gender')
    .text('📍 ویرایش موقعیت', 'profile:edit:location')
    .row()
    .text('📱 ویرایش موبایل', 'profile:edit:phone')
    .text('🖼 ویرایش عکس', 'profile:edit:photo')
    .row()
    .text('💬 ویرایش بیو', 'profile:edit:bio')
    .text('💚 ویرایش علایق', 'profile:edit:interests')
    .row();

  if (opts?.isVet) {
    kb.text('📄 آپلود مدرک', 'profile:vet_credential').row();
  }
  if (opts?.incomplete) {
    kb.text('✨ تکمیل همه', 'profile:edit:all').success().row();
  }
  kb.text('↩️ بازگشت به پروفایل', 'profile:edit:back');
  return kb;
}

export function verificationSubmitKeyboard(hasAvatar: boolean): InlineKeyboard {
  const kb = new InlineKeyboard();
  if (hasAvatar) {
    kb.text('📷 ارسال عکس فعلی پروفایل', 'verify:use_avatar').success().row();
  }
  kb.text('↩️ انصراف', 'verify:cancel');
  return kb;
}

export function adminVerificationKeyboard(userId: number): InlineKeyboard {
  return new InlineKeyboard()
    .text('✅ تأیید', `verify:approve:${userId}`)
    .success()
    .text('❌ رد', `verify:reject:${userId}`)
    .danger()
    .row()
    .text('⏭ بعدی', 'verify:admin:next')
    .text('📋 صف', 'verify:admin:queue');
}

export function adminRejectSkipKeyboard(): InlineKeyboard {
  return new InlineKeyboard().text('⏭ بدون دلیل', 'verify:reject_skip');
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
  ...Object.values(VET_MENU),
  ...Object.values(ADMIN_MENU),
  ...Object.values(MY_PETS_SECTION),
  ...Object.values(SEARCH_PETS_MENU),
  ...MAIN_MENU_ALIASES,
]);

/** کیبورد فروشگاه سکه + سکه روزانه */
export function coinsShopKeyboard(lastDailyCoinAt?: string | null): InlineKeyboard {
  const kb = new InlineKeyboard();
  if (canClaimDaily(lastDailyCoinAt)) {
    kb.text(`🎁 سکه روزانه (+${formatNum(DAILY_COIN_REWARD)})`, 'coins:daily').success().row();
  } else {
    kb.text('🎁 سکه روزانه (فردا)', 'coins:daily:done').row();
  }
  for (const p of COIN_PACKAGES) {
    kb.text(packagePickerLabel(p), `coins:pkg:${p.id}`);
    if (p.vip) kb.success();
    else kb.primary();
    kb.row();
  }
  return kb;
}

export function coinPackagePayKeyboard(pkgId: string): InlineKeyboard {
  return new InlineKeyboard()
    .text('⭐ پرداخت با ستاره', `coins:pay:stars:${pkgId}`)
    .primary()
    .row()
    .text('💳 کارت به کارت', `coins:pay:card:${pkgId}`)
    .row()
    .text('↩️ بازگشت', 'coins:back')
    .primary();
}

export function paymentReceiptCancelKeyboard(): InlineKeyboard {
  return new InlineKeyboard().text('↩️ انصراف از پرداخت', 'coins:pay:cancel');
}

export function adminPaymentKeyboard(orderId: number): InlineKeyboard {
  return new InlineKeyboard()
    .text('✅ تأیید واریز سکه', `pay:approve:${orderId}`)
    .success()
    .row()
    .text('❌ رد', `pay:reject:${orderId}`)
    .danger();
}

export function earnKeyboard(canSell: boolean): InlineKeyboard {
  const kb = new InlineKeyboard();
  if (canSell) {
    kb.text('💵 فروش سکه', 'earn:sell').success().row();
  }
  kb.text('بستن', 'earn:close');
  return kb;
}

export function earnConfirmKeyboard(coins: number): InlineKeyboard {
  return new InlineKeyboard()
    .text('✅ تأیید فروش', `earn:confirm:${coins}`)
    .success()
    .row()
    .text('↩️ انصراف', 'earn:cancel');
}

export function earnCancelKeyboard(): InlineKeyboard {
  return new InlineKeyboard().text('↩️ انصراف', 'earn:cancel');
}

/** لیست پت‌های جستجو — یک ردیف برای هر پت + صفحه‌بندی (سبک دوردوریا) */
export function searchPetsListKeyboard(
  pets: PetProfile[],
  mode: string,
  page: number,
  pageSize: number
): InlineKeyboard {
  const kb = new InlineKeyboard();
  const totalPages = Math.max(1, Math.ceil(pets.length / pageSize));
  const safePage = Math.min(Math.max(0, page), totalPages - 1);
  const slice = pets.slice(safePage * pageSize, (safePage + 1) * pageSize);

  slice.forEach((pet) => {
    const bits = [pet.breed, pet.ownerCity || pet.city].filter(Boolean).join(' · ');
    let label = bits ? `${pet.name} (${bits})` : pet.name;
    if (label.length > 56) label = `${label.slice(0, 53)}…`;
    kb.text(`🐾 ${label}`, `search:pet:${pet.id}`).primary().row();
  });

  if (totalPages > 1) {
    if (safePage > 0) kb.text('◀️ قبلی', `search:page:${mode}:${safePage - 1}`).primary();
    kb.text(`${safePage + 1}/${totalPages}`, 'noop');
    if (safePage < totalPages - 1) kb.text('بعدی ▶️', `search:page:${mode}:${safePage + 1}`).primary();
    kb.row();
  }

  if (mode === 'nearby') {
    kb.text('🔙 منوی اصلی', 'search:home').primary();
  } else {
    kb.text('🔎 منوی جستجو', 'search:menu').primary();
  }
  return kb;
}

/** پروفایل پت در نتایج جستجو — بازگشت به لیست */
export function searchPetDetailKeyboard(mode: string, page: number): InlineKeyboard {
  return new InlineKeyboard()
    .text('🔙 بازگشت به لیست', `search:page:${mode}:${page}`)
    .primary()
    .row()
    .text(
      mode === 'nearby' ? '🏠 منوی اصلی' : '🔎 منوی جستجو',
      mode === 'nearby' ? 'search:home' : 'search:menu'
    );
}

/** @deprecated استفاده از searchPetsListKeyboard */
export function searchResultsNavKeyboard(
  mode: string,
  page: number,
  hasMore: boolean
): InlineKeyboard {
  const kb = new InlineKeyboard();
  if (page > 0) kb.text('◀️ قبلی', `search:page:${mode}:${page - 1}`).primary();
  if (hasMore) kb.text('بعدی ▶️', `search:page:${mode}:${page + 1}`).primary();
  if (page > 0 || hasMore) kb.row();
  kb.text('🔎 منوی جستجو', 'search:menu').primary();
  return kb;
}
