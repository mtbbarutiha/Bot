/** petdate domain types — shared by web, API, and Telegram bot */

export type UserRole =
  | 'pet_owner'
  | 'vet'
  | 'no_pet'
  | 'pet_seeker'
  | 'community_seeker'
  | 'trainer'
  | 'pet_sitter';

export type OnboardingStatus =
  | 'role_selected'
  | 'profile_incomplete'
  | 'profile_complete';

export type UserGender = 'male' | 'female';

export interface PetdateUser {
  id: number;
  telegramId?: string;
  phone?: string;
  email?: string;
  name: string;
  username?: string;
  role?: UserRole;
  onboarding: OnboardingStatus;
  locale: string;
  avatarUrl?: string;
  age?: number;
  gender?: UserGender;
  city?: string;
  province?: string;
  bio?: string;
  interests?: string[];
  coins?: number;
  profileViews?: number;
  likesCount?: number;
  isActive?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ProfileDraft {
  name?: string;
  age?: number;
  gender?: UserGender;
  city?: string;
  province?: string;
  phone?: string;
  avatarFileId?: string;
  bio?: string;
  interests?: string[];
}

/** علایق پیش‌فرض پروفایل (سبک دوردوریا) */
export const PROFILE_INTEREST_OPTIONS = [
  '🐾 همبازی پت',
  '🚶 پیاده‌روی',
  '🎓 آموزش',
  '🏕 سفر با پت',
  '📸 عکاسی',
  '🏃 ورزش',
  '☕ کافه پت‌فرندلی',
  '💚 داوطلبانه',
] as const;

export type PetGender = 'male' | 'female';
export type PetSize = 'small' | 'medium' | 'large';

export interface PetProfile {
  id: number;
  ownerId: number;
  name: string;
  species: string;
  breed?: string;
  gender?: PetGender;
  ageMonths?: number;
  size?: PetSize;
  color?: string;
  bio?: string;
  vaccinated: boolean;
  neutered: boolean;
  lookingForPlaymate: boolean;
  personality: Record<string, unknown>;
  health: Record<string, unknown>;
  imageUrl?: string;
  city?: string;
  neighborhood?: string;
  createdAt: string;
  updatedAt: string;
}

export type PlaydateStatus = 'pending' | 'accepted' | 'rejected' | 'cancelled';

export interface PlaydateRequest {
  id: number;
  fromPetId: number;
  toPetId: number;
  fromUserId: number;
  toUserId?: number;
  message?: string;
  status: PlaydateStatus;
  scheduledAt?: string;
  location?: string;
  createdAt: string;
  updatedAt: string;
  fromPet?: PetProfile;
  toPet?: PetProfile;
}

export interface BotSession {
  telegramId: string;
  userId?: number;
  role?: UserRole;
  step: BotStep;
  locale: string;
  draftPet?: PetDraft;
  draftProfile?: ProfileDraft;
  selectedPetId?: number;
  selectedToPetId?: number;
  explorePage?: number;
  /** صفحهٔ نژاد در ویزارد ثبت پت (reply keyboard) */
  breedPage?: number;
  updatedAt: string;
}

export type BotStep =
  | 'start'
  | 'role_select'
  | 'profile_name'
  | 'profile_age'
  | 'profile_gender'
  | 'profile_province'
  | 'profile_city'
  | 'profile_phone'
  | 'profile_photo'
  | 'profile_bio'
  | 'profile_interests'
  | 'pet_name'
  | 'pet_species'
  | 'pet_breed'
  | 'pet_gender'
  | 'pet_age'
  | 'pet_size'
  | 'pet_color'
  | 'pet_vaccinated'
  | 'pet_neutered'
  | 'pet_diseases'
  | 'pet_city'
  | 'pet_looking'
  | 'pet_bio'
  | 'pet_photo'
  | 'playdate_message'
  | 'ready';

export interface PetDraft {
  name?: string;
  species?: string;
  breed?: string;
  gender?: PetGender;
  ageMonths?: number;
  size?: PetSize;
  color?: string;
  vaccinated?: boolean;
  neutered?: boolean;
  diseases?: string;
  lookingForPlaymate?: boolean;
  city?: string;
  neighborhood?: string;
  bio?: string;
  imageUrl?: string;
}

export const PLAYDATE_STATUS_LABELS: Record<PlaydateStatus, string> = {
  pending: 'در انتظار',
  accepted: 'پذیرفته',
  rejected: 'رد شده',
  cancelled: 'لغو شده',
};

export const USER_ROLES: UserRole[] = [
  'pet_owner',
  'vet',
  'no_pet',
  'pet_seeker',
  'community_seeker',
  'trainer',
  'pet_sitter',
];

export const USER_ROLE_LABELS: Record<UserRole, string> = {
  pet_owner: '🐾 صاحب پت',
  vet: '🩺 دامپزشک',
  no_pet: '🏠 بدون پت',
  pet_seeker: '🔍 دنبال پت',
  community_seeker: '👥 جامعه پت',
  trainer: '🎓 مربی',
  pet_sitter: '🏡 نگهبان پت',
};

export const USER_GENDER_LABELS: Record<UserGender, string> = {
  male: 'آقا',
  female: 'خانم',
};

export const ONBOARDING_STATUS_LABELS: Record<OnboardingStatus, string> = {
  role_selected: 'نقش انتخاب شده',
  profile_incomplete: 'پروفایل ناقص',
  profile_complete: 'پروفایل کامل',
};

/** گزینه‌های سن پت با برچسب خوانا (ذخیره به‌صورت ماه) */
export const PET_AGE_OPTIONS: ReadonlyArray<{ label: string; months: number }> = [
  { label: 'زیر ۲ ماه', months: 1 },
  { label: '۲ ماهه', months: 2 },
  { label: '۳ ماهه', months: 3 },
  { label: '۴ ماهه', months: 4 },
  { label: '۶ ماهه', months: 6 },
  { label: '۹ ماهه', months: 9 },
  { label: '۱ ساله', months: 12 },
  { label: '۱٫۵ ساله', months: 18 },
  { label: '۲ ساله', months: 24 },
  { label: '۳ ساله', months: 36 },
  { label: '۴ ساله', months: 48 },
  { label: '۵ ساله', months: 60 },
  { label: '۷ ساله', months: 84 },
  { label: '۱۰ ساله', months: 120 },
  { label: '۱۲ ساله+', months: 144 },
] as const;

export const PET_AGE_CUSTOM_LABEL = '✏️ سن دقیق';

const FA_DIGITS = '۰۱۲۳۴۵۶۷۸۹';

export function toEnglishDigits(raw: string): string {
  return raw
    .replace(/[۰-۹]/g, (d) => String(FA_DIGITS.indexOf(d)))
    .replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)));
}

export function toPersianDigits(value: number | string): string {
  return String(value).replace(/\d/g, (d) => FA_DIGITS[Number(d)] ?? d);
}

/** نمایش سن پت به فارسی خوانا */
export function formatPetAge(ageMonths: number): string {
  if (!Number.isFinite(ageMonths) || ageMonths < 1) return '—';
  const months = Math.round(ageMonths);
  if (months < 12) return `${toPersianDigits(months)} ماهه`;
  if (months === 18) return '۱٫۵ ساله';
  const years = Math.floor(months / 12);
  const rem = months % 12;
  if (rem === 0) return `${toPersianDigits(years)} ساله`;
  if (rem === 6 && years === 1) return '۱٫۵ ساله';
  return `${toPersianDigits(years)} سال و ${toPersianDigits(rem)} ماه`;
}

/**
 * پارس ورودی سن پت.
 * پشتیبانی: برچسب دکمه، «۲ ساله»، «۸ ماهه»، «۱ سال و ۳ ماه»، عدد خام
 */
export function parsePetAgeInput(raw: string): number | null {
  const trimmed = raw.trim().replace(/ي/g, 'ی').replace(/ك/g, 'ک');
  if (!trimmed || trimmed === PET_AGE_CUSTOM_LABEL) return null;

  const byLabel = PET_AGE_OPTIONS.find((o) => o.label === trimmed);
  if (byLabel) return byLabel.months;

  const text = toEnglishDigits(trimmed);

  // ۱ سال و ۳ ماه / 1 سال 3 ماه
  const yearsAndMonths = text.match(
    /^(\d+(?:[./٫]\d+)?)\s*سال(?:\s*و)?\s*(\d+)\s*ماه/
  );
  if (yearsAndMonths) {
    const y = Number(yearsAndMonths[1]!.replace('٫', '.').replace('/', '.'));
    const m = Number(yearsAndMonths[2]);
    if (!Number.isFinite(y) || !Number.isFinite(m)) return null;
    const total = Math.round(y * 12) + m;
    return total >= 1 && total <= 360 ? total : null;
  }

  // ۱٫۵ ساله / 2 ساله / ۲ سال
  const yearsOnly = text.match(/^(\d+(?:[./٫]\d+)?)\s*سال/);
  if (yearsOnly) {
    const y = Number(yearsOnly[1]!.replace('٫', '.').replace('/', '.'));
    if (!Number.isFinite(y) || y <= 0) return null;
    const total = Math.round(y * 12);
    return total >= 1 && total <= 360 ? total : null;
  }

  // ۸ ماهه / 3 ماه
  const monthsOnly = text.match(/^(\d+)\s*ماه/);
  if (monthsOnly) {
    const m = Number(monthsOnly[1]);
    return Number.isFinite(m) && m >= 1 && m <= 360 ? m : null;
  }

  // عدد خام بدون واحد قبول نیست — باید ماهه/ساله باشد یا از دکمه انتخاب شود
  if (/^\d+$/.test(text)) return null;

  return null;
}
