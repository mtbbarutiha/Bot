/** اقتصاد سکه همبازی — ثابت‌های مشترک API و بات */

/** هزینه اتصال سریع به دامپزشک آنلاین (سکه ربات) — هم‌تراز ربات */
export const QUICK_VET_COST = 1;

/**
 * نرخ تبدیل خرید سکه (تومان به‌ازای هر سکه) — هم‌تراز ربات.
 * برای پرداخت فروشگاه با سکه: ceil(قیمت_تومان / این_نرخ).
 */
export const COIN_PRICE_TOMAN = 2_000;

/** تبدیل مبلغ تومان به سکه موردنیاز برای پرداخت فروشگاه (حداقل ۱ برای مبلغ مثبت) */
export function tomanToShopCoins(toman: number): number {
  const t = Math.floor(Number(toman) || 0);
  if (!Number.isFinite(t) || t <= 0) return 0;
  return Math.max(1, Math.ceil(t / COIN_PRICE_TOMAN));
}

/** موجودی کیف پول چندارزی کاربر */
export type WalletCurrency = 'ton' | 'stars' | 'coins' | 'toman';

export interface WalletBalances {
  /** TON (Telegram Toncoin) — ذخیره و نمایش؛ واریز on-chain فعلاً stub */
  ton: number;
  /** ستاره‌های تلگرام نگه‌داری‌شده — جدا از خرید سکه با Stars */
  stars: number;
  /** سکه ربات (users.coins) */
  coins: number;
  /** تومان (IRT) */
  toman: number;
}

export const WALLET_CURRENCY_LABELS_FA: Record<WalletCurrency, string> = {
  ton: 'تون',
  stars: 'ستاره‌ها',
  coins: 'سکه ربات',
  toman: 'تومان',
};

export const WALLET_CURRENCY_SYMBOLS: Record<WalletCurrency, string> = {
  ton: '◆',
  stars: '⭐',
  coins: '🪙',
  toman: 'تومان',
};

/** وضعیت اتصال هر ارز — برای UI و مستندات */
export const WALLET_CURRENCY_STATUS: Record<
  WalletCurrency,
  { deposit: 'wired' | 'stub' | 'bot_only'; noteFa: string }
> = {
  ton: {
    deposit: 'stub',
    noteFa: 'نمایش موجودی؛ واریز TON هنوز فعال نیست',
  },
  stars: {
    deposit: 'stub',
    noteFa: 'نمایش موجودی ستاره؛ پرداخت Stars در ربات برای خرید سکه فعال است',
  },
  coins: {
    deposit: 'wired',
    noteFa: 'سکه ربات — خرید/جایزه از بات و API',
  },
  toman: {
    deposit: 'stub',
    noteFa: 'نمایش موجودی تومان؛ واریز بانکی به‌زودی',
  },
};

export function emptyWallet(): WalletBalances {
  return { ton: 0, stars: 0, coins: 0, toman: 0 };
}

export function normalizeWalletBalances(input: Partial<WalletBalances> | null | undefined): WalletBalances {
  const n = (v: unknown) => {
    const x = Math.floor(Number(v ?? 0));
    return Number.isFinite(x) && x > 0 ? x : 0;
  };
  return {
    ton: n(input?.ton),
    stars: n(input?.stars),
    coins: n(input?.coins),
    toman: n(input?.toman),
  };
}

/** ساخت کیف پول از فیلدهای کاربر (coins = سکه ربات) */
export function walletFromUserFields(user: {
  coins?: number | null;
  walletTon?: number | null;
  walletStars?: number | null;
  walletToman?: number | null;
  wallet?: Partial<WalletBalances> | null;
}): WalletBalances {
  const pick = (...vals: Array<number | null | undefined>) => {
    for (const v of vals) {
      if (v != null) return v;
    }
    return 0;
  };
  if (user.wallet) {
    return normalizeWalletBalances({
      ton: pick(user.wallet.ton, user.walletTon),
      stars: pick(user.wallet.stars, user.walletStars),
      coins: pick(user.wallet.coins, user.coins),
      toman: pick(user.wallet.toman, user.walletToman),
    });
  }
  return normalizeWalletBalances({
    ton: pick(user.walletTon),
    stars: pick(user.walletStars),
    coins: pick(user.coins),
    toman: pick(user.walletToman),
  });
}

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
