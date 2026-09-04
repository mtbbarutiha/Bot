/** اقتصاد سکه همبازی — ثابت‌های مشترک API و بات */

/** هدیه یک‌باره ثبت‌نام */
export const SIGNUP_BONUS = 20;
/** جایزه تکمیل هر بخش پروفایل (اولین بار) */
export const PROFILE_SECTION_REWARD = 5;
/** جایزه تأیید احراز هویت تصویری توسط ادمین */
export const FACE_VERIFY_REWARD = 100;

/** کلیدهای ledger برای idempotency */
export const COIN_REASON = {
  signup: 'signup',
  faceVerify: 'face_verify',
  daily: 'daily',
  profile: (section: ProfileRewardSection) => `profile:${section}` as const,
} as const;

/** بخش‌های پروفایل که جایزه دارند (هم‌تراز ویرایش بخش‌بندی‌شده بات) */
export const PROFILE_REWARD_SECTIONS = [
  'name',
  'age',
  'gender',
  'location',
  'phone',
  'photo',
  'bio',
  'interests',
] as const;

export type ProfileRewardSection = (typeof PROFILE_REWARD_SECTIONS)[number];

export type CoinAward = {
  reason: string;
  amount: number;
  section?: ProfileRewardSection;
};

export const PROFILE_SECTION_LABELS_FA: Record<ProfileRewardSection, string> = {
  name: 'نام',
  age: 'سن',
  gender: 'جنسیت',
  location: 'موقعیت',
  phone: 'موبایل',
  photo: 'عکس',
  bio: 'بیو',
  interests: 'علایق',
};

export function formatCoinAwardMessage(awards: CoinAward[]): string {
  if (!awards.length) return '';
  const total = awards.reduce((s, a) => s + a.amount, 0);
  const fa = new Intl.NumberFormat('fa-IR').format(total);
  if (awards.length === 1 && awards[0]!.reason === COIN_REASON.signup) {
    return `${fa} سکه هدیه ثبت‌نام دریافت کردید`;
  }
  if (awards.length === 1 && awards[0]!.reason === COIN_REASON.faceVerify) {
    return `🎁 ${fa} سکه جایزه احراز هویت به موجودی‌ات اضافه شد.`;
  }
  const sections = awards
    .filter((a) => a.section)
    .map((a) => PROFILE_SECTION_LABELS_FA[a.section!])
    .filter(Boolean);
  if (sections.length === 1) {
    return `🎁 ${fa} سکه بابت تکمیل «${sections[0]}» دریافت کردید`;
  }
  if (sections.length > 1) {
    return `🎁 ${fa} سکه بابت تکمیل بخش‌های پروفایل (${sections.join('، ')}) دریافت کردید`;
  }
  return `🎁 ${fa} سکه دریافت کردید`;
}
