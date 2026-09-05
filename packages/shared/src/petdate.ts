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

/** وضعیت احراز هویت پروفایل مالک (سبک دوردوریا) */
export type VerificationStatus = 'none' | 'pending' | 'verified' | 'rejected';

export const VERIFICATION_STATUSES: VerificationStatus[] = [
  'none',
  'pending',
  'verified',
  'rejected',
];

export const VERIFICATION_STATUS_LABELS: Record<VerificationStatus, string> = {
  none: 'احراز نشده',
  pending: 'در انتظار بررسی',
  verified: 'احراز شده',
  rejected: 'رد شده',
};

/** روش خرید سکه */
export type PaymentMethod = 'card' | 'stars';

/**
 * وضعیت سفارش پرداخت:
 * - awaiting_receipt: کارت — منتظر آپلود رسید
 * - pending: کارت — منتظر بررسی ادمین
 * - awaiting_stars: ستاره — فاکتور ارسال شده
 * - paid: ستاره — پرداخت موفق و سکه واریز شده
 * - approved: کارت — تأیید ادمین و سکه واریز شده
 * - rejected: کارت — رد شده
 * - cancelled: لغو
 */
export type PaymentOrderStatus =
  | 'awaiting_receipt'
  | 'pending'
  | 'awaiting_stars'
  | 'paid'
  | 'approved'
  | 'rejected'
  | 'cancelled';

export interface PaymentOrder {
  id: number;
  userId: number;
  packageId: string;
  coins: number;
  amountToman?: number;
  amountStars?: number;
  method: PaymentMethod;
  status: PaymentOrderStatus;
  receiptFileId?: string;
  telegramPaymentChargeId?: string;
  adminNote?: string;
  createdAt: string;
  reviewedAt?: string;
  /** join — برای اعلان ادمین */
  userName?: string;
  userTelegramId?: string;
  userUsername?: string;
}

/** بج نمایشی برای پروفایل‌های تأییدشده */
export const VERIFIED_BADGE = '✅ احراز شده';

/**
 * شناسهٔ عمومی پایدار (نمایشی) — جدا از id داخلی DB.
 * فرمت: PD-U##### برای کاربر، PD-P##### برای پت.
 * پس از تخصیص تغییر نمی‌کند.
 */
export const USER_PUBLIC_ID_PREFIX = 'PD-U';
export const PET_PUBLIC_ID_PREFIX = 'PD-P';

export function makeUserPublicId(internalId: number): string {
  return `${USER_PUBLIC_ID_PREFIX}${String(Math.trunc(internalId)).padStart(5, '0')}`;
}

export function makePetPublicId(internalId: number): string {
  return `${PET_PUBLIC_ID_PREFIX}${String(Math.trunc(internalId)).padStart(5, '0')}`;
}

/** شناسهٔ نمایشی کاربر — publicId ذخیره‌شده یا مشتق از id */
export function userPublicIdOf(user: { id: number; publicId?: string | null }): string {
  return (user.publicId && String(user.publicId).trim()) || makeUserPublicId(user.id);
}

/** شناسهٔ نمایشی پت — publicId ذخیره‌شده یا مشتق از id */
export function petPublicIdOf(pet: { id: number; publicId?: string | null }): string {
  return (pet.publicId && String(pet.publicId).trim()) || makePetPublicId(pet.id);
}

/** متن معرفی احراز چهره — سبک دوردوریا */
export function faceVerifyIntroText(rewardCoins: number): string {
  const reward = new Intl.NumberFormat('fa-IR').format(rewardCoins);
  return [
    '🛡 <b>احراز چهره</b>',
    '',
    'اعتماد بیشتر = آشنایی امن‌تر 🤝',
    '',
    'با احراز چهره:',
    '✔️ پروفایلت واقعی‌تر دیده می‌شه',
    '✔️ اعتماد بقیه بیشتر می‌شه',
    '✔️ فضای امن‌تری می‌سازی',
    '',
    `🎁 جایزه پس از تأیید ادمین: <b>${reward}</b> سکه`,
    '',
    'یک <b>سلفی واضح</b> از چهره‌ات بفرست (یا ویدیوی کوتاه از چهره).',
    'عکس/ویدیو باید با چهرهٔ خودت یکی باشه.',
  ].join('\n');
}

/** وضعیت مدرک دامپزشک */
export type VetCredentialStatus = 'none' | 'pending' | 'verified';

export const VET_CREDENTIAL_STATUSES: VetCredentialStatus[] = [
  'none',
  'pending',
  'verified',
];

export const VET_CREDENTIAL_STATUS_LABELS: Record<VetCredentialStatus, string> = {
  none: 'مدرک ارسال نشده',
  pending: 'در انتظار بررسی مدرک',
  verified: 'مدرک تأیید شده',
};

export interface PetdateUser {
  id: number;
  /** شناسه عمومی پایدار نمایشی (مثلاً PD-U00014) */
  publicId?: string;
  telegramId?: string;
  phone?: string;
  /** موبایل با OTP تأیید شده (Candoo) */
  phoneVerified?: boolean;
  phoneVerifiedAt?: string;
  email?: string;
  name: string;
  username?: string;
  role?: UserRole;
  /** چند نقش همزمان — role برای سازگاری همان نقش اصلی است */
  roles?: UserRole[];
  onboarding: OnboardingStatus;
  locale: string;
  avatarUrl?: string;
  age?: number;
  gender?: UserGender;
  city?: string;
  province?: string;
  country?: string;
  bio?: string;
  interests?: string[];
  coins?: number;
  profileViews?: number;
  likesCount?: number;
  isActive?: boolean;
  verificationStatus?: VerificationStatus;
  verificationPhotoFileId?: string;
  verifiedAt?: string;
  verificationNote?: string;
  /** فایل مدرک دامپزشک (Telegram file_id) */
  vetCredentialFileId?: string;
  vetCredentialStatus?: VetCredentialStatus;
  /** دامپزشک آنلاین و آماده پذیرش بیمار */
  vetOnline?: boolean;
  /** false = توسط ادمین از لیست/اتصال پزشک‌ها خارج شده */
  vetEnabled?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ProfileDraft {
  name?: string;
  age?: number;
  gender?: UserGender;
  country?: string;
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
  /** شناسه عمومی پایدار نمایشی (مثلاً PD-P00025) */
  publicId?: string;
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
  /** از پروفایل صاحب پت (برای مچ همبازی) */
  ownerProvince?: string;
  ownerCity?: string;
  /** صاحب پت احراز هویت شده */
  ownerVerified?: boolean;
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

/** وضعیت مشاوره دامپزشک */
export type VetConsultStatus = 'requested' | 'active' | 'completed' | 'cancelled';

/** رکورد مشاوره — برای لیست بیماران دامپزشک */
export interface VetConsultation {
  id: number;
  vetUserId: number;
  patientUserId: number;
  petId?: number;
  status: VetConsultStatus;
  notes?: string;
  createdAt: string;
  /** غنی‌سازی در API */
  patientName?: string;
  patientCity?: string;
  petName?: string;
  petSpecies?: string;
  petBreed?: string;
}

/** دامپزشکی که بیمار قبلاً باهاش مشاوره داشته (برای ارتباط سریع) */
export interface PreviousVet {
  id: number;
  name: string;
  city?: string;
  telegramId?: string;
  lastConsultAt: string;
  avgRating?: number;
  ratingCount?: number;
}

/** نسخه دارویی صادرشده توسط دامپزشک */
export interface Prescription {
  id: number;
  consultId?: number;
  petId: number;
  vetUserId: number;
  patientUserId: number;
  text: string;
  pdfPath?: string;
  createdAt: string;
  /** غنی‌سازی */
  vetName?: string;
  patientName?: string;
  petName?: string;
  petSpecies?: string;
  petBreed?: string;
}

export interface BotSession {
  telegramId: string;
  userId?: number;
  role?: UserRole;
  /** نقش‌های در حال انتخاب در مرحله role_select */
  draftRoles?: UserRole[];
  /** true = افزودن/ویرایش نقش از منوی «نقش‌های من» (نه آنبوردینگ اولیه) */
  addingRoles?: boolean;
  step: BotStep;
  locale: string;
  draftPet?: PetDraft;
  draftProfile?: ProfileDraft;
  selectedPetId?: number;
  selectedToPetId?: number;
  explorePage?: number;
  /** پتی که برایش همبازی می‌گردیم؛ undefined = همه / هنوز انتخاب نشده */
  exploreForPetId?: number;
  /** آیا کاربر پت مبدأ را برای جست‌وجوی همبازی انتخاب کرده */
  exploreForPicked?: boolean;
  /** صفحهٔ نژاد در ویزارد ثبت پت (reply keyboard) */
  breedPage?: number;
  /** حالت مرور/جستجوی پت */
  searchMode?: 'nearby' | 'breed' | 'province' | 'mashhad' | 'all';
  /** گونهٔ انتخاب‌شده در جستجو بر اساس نژاد */
  searchSpecies?: string;
  searchBreed?: string;
  searchPage?: number;
  searchBreedPage?: number;
  /** فروش سکه — منتظر شماره کارت */
  earnPendingCoins?: number;
  /** خرید سکه کارت‌به‌کارت — سفارش در انتظار رسید */
  paymentPendingOrderId?: number;
  /** ادمین — رد احراز هویت برای این userId */
  adminRejectUserId?: number;
  /** ادمین — ورود با رمز (وقتی ADMIN_IDS خالی است) */
  adminAuthed?: boolean;
  /**
   * ویرایش تک‌فیلدی پروفایل (نه ویزارد کامل).
   * بعد از ذخیرهٔ همان فیلد به منوی بخش‌ها برمی‌گردیم.
   */
  profileSectionEdit?: boolean;
  /**
   * ویرایش تک‌فیلدی پروفایل پت (از پت‌های من).
   * بعد از ذخیره به کارت پروفایل پت برمی‌گردیم.
   */
  petSectionEdit?: boolean;
  /** شماره در انتظار OTP احراز موبایل (نرمال‌شده 98…) */
  pendingPhone?: string;
  /** چت مشاوره دامپزشک — شناسه مشاوره */
  vetChatConsultId?: number;
  /** تلگرام طرف مقابل در چت مشاوره */
  vetChatPeerTelegramId?: string;
  /** نقش در چت: دامپزشک یا بیمار */
  vetChatRole?: 'vet' | 'patient';
  /** چت مالک↔مالک بعد از قبول همبازی — شناسه درخواست */
  ownerChatPlaydateId?: number;
  /** تلگرام طرف مقابل در چت همبازی */
  ownerChatPeerTelegramId?: string;
  /** شناسه کاربر طرف مقابل در چت همبازی */
  ownerChatPeerUserId?: number;
  /** پت خودم در این چت همبازی */
  ownerChatMyPetId?: number;
  /** پت طرف مقابل در این چت همبازی */
  ownerChatPeerPetId?: number;
  /** چت امن — پیام‌ها با protect_content و غیرقابل ذخیره */
  ownerChatSecure?: boolean;
  /** ثبت مورد در پرونده پزشکی (پت انتخاب‌شده) */
  medicalNotePetId?: number;
  /** نوشتن نسخه — پت انتخاب‌شده */
  prescriptionPetId?: number;
  /** پیش‌نویس متن نسخه (پیشنهاد دارو / دستی) قبل از تأیید صدور */
  prescriptionDraft?: string;
  updatedAt: string;
}

/** پرونده پزشکی پت */
export interface PetMedicalRecord {
  petId: number;
  notes?: string;
  vaccinations?: string;
  allergies?: string;
  chronicConditions?: string;
  lastCheckup?: string;
  medications?: string;
  /** آخرین ویرایشگر فیلدهای خلاصه پرونده */
  lastUpdatedByUserId?: number;
  /** نام نمایشی ویرایشگر در زمان آخرین به‌روزرسانی */
  lastUpdatedByName?: string;
  updatedAt: string;
}

export interface PetMedicalEntry {
  id: number;
  petId: number;
  authorUserId: number;
  /** نام پزشک/نویسنده در زمان ثبت (snapshot) */
  authorName?: string;
  consultId?: number;
  text: string;
  createdAt: string;
}

export type PetMedicalField =
  | 'notes'
  | 'vaccinations'
  | 'allergies'
  | 'chronicConditions'
  | 'lastCheckup'
  | 'medications';

export const PET_MEDICAL_FIELD_LABELS: Record<PetMedicalField, string> = {
  notes: 'یادداشت / تاریخچه',
  vaccinations: 'واکسیناسیون',
  allergies: 'آلرژی‌ها',
  chronicConditions: 'بیماری‌های مزمن',
  lastCheckup: 'آخرین چکاپ',
  medications: 'داروها',
};

export const PET_MEDICAL_FIELDS: PetMedicalField[] = [
  'notes',
  'vaccinations',
  'allergies',
  'chronicConditions',
  'lastCheckup',
  'medications',
];

/** نام پزشک برای نمایش در پرونده (اگر «دکتر» نداشت اضافه می‌شود) */
export function formatVetAuthorName(name?: string | null, fallbackUserId?: number): string {
  const raw = (name || '').trim();
  if (!raw) {
    return fallbackUserId != null ? `کاربر #${fallbackUserId}` : 'نامشخص';
  }
  if (/^دکتر\s/.test(raw) || /^دكتر\s/.test(raw)) return raw;
  return `دکتر ${raw}`;
}

/** تاریخ شمسی کوتاه مثل ۱۴۰۳/۰۶/۱۴ — ۱۲:۳۰ */
export function formatPersianDateTime(iso?: string | null): string {
  if (!iso) return '';
  const d = new Date(iso.includes('T') ? iso : iso.replace(' ', 'T') + (iso.includes('Z') ? '' : 'Z'));
  if (Number.isNaN(d.getTime())) {
    // sqlite datetime('now') بدون TZ — به عنوان UTC نخوان؛ فقط رقم‌ها را فارسی کن
    const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2}))?/);
    if (!m) return toPersianDigits(iso.slice(0, 16));
    return toPersianDigits(`${m[1]}/${m[2]}/${m[3]}${m[4] ? ` — ${m[4]}:${m[5]}` : ''}`);
  }
  try {
    const datePart = new Intl.DateTimeFormat('fa-IR-u-ca-persian', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(d);
    const timePart = new Intl.DateTimeFormat('fa-IR', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(d);
    return `${datePart} — ${timePart}`;
  } catch {
    return toPersianDigits(iso.slice(0, 16).replace('T', ' '));
  }
}

/** خط انتساب ثبت بالینی برای نمایش پرونده */
export function formatMedicalEntryAttribution(entry: {
  authorName?: string;
  authorUserId: number;
  createdAt: string;
}): string {
  const who = formatVetAuthorName(entry.authorName, entry.authorUserId);
  const when = formatPersianDateTime(entry.createdAt);
  return when ? `🩺 ثبت‌شده توسط: ${who} · ${when}` : `🩺 ثبت‌شده توسط: ${who}`;
}


export type BotStep =
  | 'start'
  | 'role_select'
  | 'profile_name'
  | 'profile_age'
  | 'profile_gender'
  | 'profile_country'
  | 'profile_province'
  | 'profile_city'
  | 'profile_phone'
  | 'profile_photo'
  | 'profile_bio'
  | 'profile_interests'
  | 'profile_edit_menu'
  | 'vet_credential'
  | 'search_species'
  | 'search_breed'
  | 'earn_card'
  | 'payment_receipt'
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
  | 'pet_edit_menu'
  | 'playdate_message'
  | 'verify_photo'
  | 'phone_verify_ask'
  | 'phone_verify_otp'
  | 'admin_reject_reason'
  | 'admin_password'
  | 'vet_chat'
  | 'vet_medical_note'
  | 'vet_prescription'
  | 'owner_chat'
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

export const ROLE_CONFIRM_LABEL = '✅ ثبت نقش‌ها';
export const MY_ROLES_LABEL = '🎭 نقش‌های من';
export const ROLE_ADD_LABEL = '➕ افزودن نقش';

/**
 * نقش فعال/اصلی.
 * اگر fallback (ستون role) بین نقش‌های کاربر باشد، همان اولویت دارد؛
 * وگرنه صاحب پت، وگرنه اولین نقش.
 */
export function primaryRole(roles: UserRole[] | undefined | null, fallback?: UserRole | null): UserRole | undefined {
  const list = normalizeRoles(roles, fallback);
  if (!list.length) return undefined;
  if (fallback && list.includes(fallback)) return fallback;
  if (list.includes('pet_owner')) return 'pet_owner';
  return list[0];
}

export function normalizeRoles(
  roles?: UserRole[] | null,
  fallback?: UserRole | null
): UserRole[] {
  const fromList = (roles ?? []).filter((r): r is UserRole => USER_ROLES.includes(r));
  if (fromList.length) return [...new Set(fromList)];
  if (fallback && USER_ROLES.includes(fallback)) return [fallback];
  return [];
}

export function userHasRole(
  user: { role?: UserRole | null; roles?: UserRole[] | null } | null | undefined,
  role: UserRole
): boolean {
  if (!user) return false;
  const roles = normalizeRoles(user.roles, user.role);
  return roles.includes(role);
}

export const USER_GENDER_LABELS: Record<UserGender, string> = {
  male: '👨 آقا',
  female: '👩 خانم',
};

export const ONBOARDING_STATUS_LABELS: Record<OnboardingStatus, string> = {
  role_selected: 'نقش انتخاب شده',
  profile_incomplete: 'پروفایل ناقص',
  profile_complete: 'پروفایل کامل',
};

/** گزینه‌های سن پت با برچسب خوانا (ذخیره به‌صورت ماه) */
export const PET_AGE_OPTIONS: ReadonlyArray<{ label: string; months: number }> = [
  { label: '🎂 زیر ۲ ماه', months: 1 },
  { label: '🎂 ۲ ماهه', months: 2 },
  { label: '🎂 ۳ ماهه', months: 3 },
  { label: '🎂 ۴ ماهه', months: 4 },
  { label: '🎂 ۶ ماهه', months: 6 },
  { label: '🎂 ۹ ماهه', months: 9 },
  { label: '🎂 ۱ ساله', months: 12 },
  { label: '🎂 ۱٫۵ ساله', months: 18 },
  { label: '🎂 ۲ ساله', months: 24 },
  { label: '🎂 ۳ ساله', months: 36 },
  { label: '🎂 ۴ ساله', months: 48 },
  { label: '🎂 ۵ ساله', months: 60 },
  { label: '🎂 ۷ ساله', months: 84 },
  { label: '🎂 ۱۰ ساله', months: 120 },
  { label: '🎂 ۱۲ ساله+', months: 144 },
] as const;

export const PET_AGE_CUSTOM_LABEL = '✏️ سن دقیق';

/** رنگ‌های رایج پت برای انتخاب دکمه‌ای */
export const PET_COLOR_OPTIONS = [
  '⬛ مشکی',
  '⬜ سفید',
  '🟫 قهوه‌ای',
  '🟨 طلایی',
  '🟡 کرم',
  '🩶 خاکستری',
  '🟧 نارنجی',
  '🌈 سه‌رنگ',
  '🎨 دو‌رنگ',
  '⬛⬜ مشکی-سفید',
  '⬛🟫 مشکی-قهوه‌ای',
  '🟫⬜ قهوه‌ای-سفید',
] as const;

export const PET_COLOR_CUSTOM_LABEL = '✏️ رنگ دیگر';

const FA_DIGITS = '۰۱۲۳۴۵۶۷۸۹';

export function toEnglishDigits(raw: string): string {
  return raw
    .replace(/[۰-۹]/g, (d) => String(FA_DIGITS.indexOf(d)))
    .replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)));
}

/**
 * نرمال‌سازی موبایل ایران به فرم بین‌المللی بدون +: 98912xxxxxxx
 * ورودی‌های مجاز: 09…، +989…، 989…، 9…
 */
export function normalizeIranMobile(raw: string): string | null {
  let digits = toEnglishDigits(raw ?? '')
    .replace(/[^\d]/g, '')
    .trim();
  if (!digits) return null;
  if (digits.startsWith('00')) digits = digits.slice(2);
  if (digits.startsWith('98') && digits.length >= 12) {
    digits = digits.slice(0, 12);
  } else if (digits.startsWith('0') && digits.length === 11) {
    digits = `98${digits.slice(1)}`;
  } else if (digits.startsWith('9') && digits.length === 10) {
    digits = `98${digits}`;
  } else {
    return null;
  }
  // موبایل ایران: 989 + ۹ رقم (اپراتور با ۹ شروع می‌شود)
  if (!/^989\d{9}$/.test(digits)) return null;
  return digits;
}

/** نمایش موبایل به صورت ۰۹۱۲… */
export function formatIranMobileDisplay(phone: string): string {
  const n = normalizeIranMobile(phone) ?? phone.replace(/[^\d]/g, '');
  if (n.startsWith('98') && n.length === 12) return `0${n.slice(2)}`;
  return phone;
}

/** متن معرفی احراز موبایل */
export function phoneVerifyIntroText(opts?: { required?: boolean }): string {
  const required = opts?.required
    ? 'برای دامپزشکان احراز موبایل <b>اجباری</b> است.'
    : 'احراز موبایل اختیاری است — برای اعتماد بیشتر پیشنهاد می‌شه.';
  return [
    '📱 <b>احراز موبایل</b>',
    '',
    required,
    '',
    'شماره موبایل ایرانیت رو بفرست یا دکمهٔ «ارسال شماره تماس» رو بزن.',
    'یک کد تأیید پیامکی برات می‌فرستیم.',
  ].join('\n');
}


export function toPersianDigits(value: number | string): string {
  return String(value).replace(/\d/g, (d) => FA_DIGITS[Number(d)] ?? d);
}

/** نمایش امتیاز دامپزشک — مثلاً «⭐ ۴.۶ (۱۲ نظر)» یا پیام خالی */
export function formatVetRatingLine(
  avgRating?: number | null,
  ratingCount?: number | null,
  opts?: { emptyLabel?: string }
): string {
  const count = ratingCount != null ? Math.max(0, Math.floor(Number(ratingCount))) : 0;
  if (!count || avgRating == null || !Number.isFinite(avgRating)) {
    return opts?.emptyLabel ?? 'هنوز نظری ثبت نشده';
  }
  const avg = Math.round(Number(avgRating) * 10) / 10;
  const avgText = toPersianDigits(avg % 1 === 0 ? String(avg) : avg.toFixed(1));
  return `⭐ ${avgText} (${toPersianDigits(count)} نظر)`;
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

function normPlace(value?: string | null): string {
  return (value ?? '')
    .trim()
    .replace(/ي/g, 'ی')
    .replace(/ك/g, 'ک')
    .replace(/\s+/g, ' ')
    .toLowerCase();
}

export interface PlaymateMatchScore {
  pet: PetProfile;
  score: number;
  reasons: string[];
}

/**
 * امتیاز همبازی با اولویت:
 * هم‌کشور (ایران) → هم‌استان → هم‌دسته → هم‌نژاد → سن نزدیک → جنسیت متفاوت
 * فقط هم‌گونه (species) واجد شرایط‌اند.
 */
export function rankPlaymateMatches(
  source: PetProfile,
  candidates: PetProfile[],
  opts?: { max?: number }
): PlaymateMatchScore[] {
  const max = opts?.max ?? 40;
  const sourceId = source.id;
  const sourceOwner = source.ownerId;
  const sourceSpecies = (source.species || '').toLowerCase();

  const scored: PlaymateMatchScore[] = [];

  for (const pet of candidates) {
    if (pet.id === sourceId || pet.ownerId === sourceOwner) continue;
    if (!pet.lookingForPlaymate) continue;
    if ((pet.species || '').toLowerCase() !== sourceSpecies) continue;

    let score = 0;
    const reasons: string[] = [];

    // هم‌کشور — فعلاً همه داخل ایران فرض می‌شوند
    score += 50;
    reasons.push('هم‌کشور');

    const srcProv = normPlace(source.ownerProvince);
    const candProv = normPlace(pet.ownerProvince);
    if (srcProv && candProv && srcProv === candProv) {
      score += 1000;
      reasons.push('هم‌استان');
    }

    const srcCity = normPlace(source.city || source.ownerCity);
    const candCity = normPlace(pet.city || pet.ownerCity);
    if (srcCity && candCity && srcCity === candCity) {
      score += 500;
      reasons.push('هم‌شهر');
    }

    // هم‌دسته (گونه) — شرط ورود؛ امتیاز پایه
    score += 300;
    reasons.push('هم‌دسته');

    const srcBreed = normPlace(source.breed);
    const candBreed = normPlace(pet.breed);
    if (srcBreed && candBreed && srcBreed === candBreed) {
      score += 200;
      reasons.push('هم‌نژاد');
    }

    if (source.ageMonths != null && pet.ageMonths != null) {
      const diff = Math.abs(source.ageMonths - pet.ageMonths);
      const ageScore = Math.max(0, 120 - diff);
      score += ageScore;
      if (diff <= 6) reasons.push('سن نزدیک');
      else if (diff <= 18) reasons.push('سن نسبتاً نزدیک');
    }

    if (source.gender && pet.gender && source.gender !== pet.gender) {
      score += 80;
      reasons.push('جنسیت متفاوت');
    }

    scored.push({ pet, score, reasons });
  }

  scored.sort((a, b) => b.score - a.score || a.pet.name.localeCompare(b.pet.name, 'fa'));
  return scored.slice(0, max);
}
