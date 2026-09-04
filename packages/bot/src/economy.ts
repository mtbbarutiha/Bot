/** اقتصاد سکه petdate — هم‌تراز با مدل دوردوریا */

export const COIN_PRICE_TOMAN = 2_000;
export const COIN_PRICE_STARS = 1;
export const COIN_SELL_PRICE_TOMAN = 1_000;
export const MIN_SELL_COINS = 50;
export const DAILY_COIN_REWARD = 10;
export const REFERRAL_BONUS_COINS = 50;
export const WELCOME_COINS = 15;

export type CoinPackage = {
  id: string;
  coins: number;
  toman: number;
  stars: number;
  vip?: boolean;
  label: string;
};

function pkg(id: string, coins: number, opts?: { vip?: boolean; label?: string }): CoinPackage {
  return {
    id,
    coins,
    toman: coins * COIN_PRICE_TOMAN,
    stars: coins * COIN_PRICE_STARS,
    vip: opts?.vip,
    label: opts?.label ?? `${coins.toLocaleString('fa-IR')} سکه`,
  };
}

/** پکیج سکه — هر سکه ۲٬۰۰۰ تومان یا ۱ Star */
export const COIN_PACKAGES: CoinPackage[] = [
  pkg('p50', 50),
  pkg('p120', 120),
  pkg('p300', 300),
  pkg('p700', 700),
  pkg('p1500', 1500),
  pkg('p4000', 4000, { vip: true, label: '👑 VIP — ۴۰۰۰ سکه' }),
];

export function formatNum(n: number): string {
  return new Intl.NumberFormat('fa-IR').format(n);
}

export function formatToman(n: number): string {
  return `${formatNum(n)} تومان`;
}

export function sellAmountToman(coins: number, rate = COIN_SELL_PRICE_TOMAN): number {
  return coins * rate;
}

export function packagePickerLabel(p: CoinPackage): string {
  if (p.vip) {
    return `👑 VIP · ${formatNum(p.coins)} سکه · ⭐${formatNum(p.stars)} · ${formatNum(p.toman)}ت`;
  }
  return `💰 ${formatNum(p.coins)} سکه · ⭐${formatNum(p.stars)} · ${formatNum(p.toman)}ت`;
}

export function coinsShopIntroText(balance: number): string {
  return [
    '💰 <b>سکه‌ها</b>',
    '',
    `موجودی: <b>${formatNum(balance)}</b> سکه`,
    '',
    `قیمت هر سکه: ${formatNum(COIN_PRICE_TOMAN)} تومان یا ${formatNum(COIN_PRICE_STARS)} Star`,
    `🎁 هر روز ${formatNum(DAILY_COIN_REWARD)} سکه رایگان — دکمه بالای لیست`,
    '',
    'بسته را بزن → Stars یا کارت‌به‌کارت',
  ].join('\n');
}

export function packageCheckoutText(p: CoinPackage): string {
  if (p.vip) {
    return [
      '👑━━━━━━━━━━━━━━👑',
      '         VIP',
      '👑━━━━━━━━━━━━━━👑',
      '',
      `💎 ${formatNum(p.coins)} سکه`,
      `⭐ Telegram Stars: ${formatNum(p.stars)} (هر سکه ${formatNum(COIN_PRICE_STARS)} Star)`,
      `💳 کارت‌به‌کارت: ${formatToman(p.toman)} (هر سکه ${formatNum(COIN_PRICE_TOMAN)} تومان)`,
      '',
      'روش پرداخت را انتخاب کن:',
    ].join('\n');
  }
  return [
    '💰 <b>خرید سکه</b>',
    '',
    `بسته: ${formatNum(p.coins)} سکه`,
    `⭐ Telegram Stars: ${formatNum(p.stars)} (هر سکه ${formatNum(COIN_PRICE_STARS)} Star)`,
    `💳 کارت‌به‌کارت: ${formatToman(p.toman)} (هر سکه ${formatNum(COIN_PRICE_TOMAN)} تومان)`,
    '',
    'روش پرداخت را انتخاب کن:',
  ].join('\n');
}

export function earnIntroText(balance: number): string {
  const toman = sellAmountToman(balance);
  return [
    '💵 <b>کسب درآمد — فروش سکه</b>',
    '',
    `موجودی تو: <b>${formatNum(balance)}</b> سکه`,
    `نرخ فروش: هر سکه ${formatNum(COIN_SELL_PRICE_TOMAN)} تومان`,
    `ارزش موجودی ≈ <b>${formatToman(toman)}</b>`,
    `حداقل برای فروش: ${formatNum(MIN_SELL_COINS)} سکه`,
    '',
    'دکمه فروش را بزن → تأیید مبلغ → شماره کارت بانکی را بفرست.',
    'پرداخت بعد از بررسی ادمین انجام می‌شود.',
  ].join('\n');
}

/** آیا امروز (UTC) سکه روزانه گرفته؟ */
export function canClaimDaily(lastDailyCoinAt?: string | null): boolean {
  if (!lastDailyCoinAt) return true;
  const last = new Date(lastDailyCoinAt);
  if (Number.isNaN(last.getTime())) return true;
  const now = new Date();
  return (
    last.getUTCFullYear() !== now.getUTCFullYear() ||
    last.getUTCMonth() !== now.getUTCMonth() ||
    last.getUTCDate() !== now.getUTCDate()
  );
}

/** نرمال‌سازی شماره کارت ایرانی — فقط رقم */
export function normalizeCardNumber(raw: string): string {
  const fa = '۰۱۲۳۴۵۶۷۸۹';
  const ar = '٠١٢٣٤٥٦٧٨٩';
  let s = (raw || '').trim().replace(/[\s\-]/g, '');
  s = s
    .split('')
    .map((ch) => {
      const fi = fa.indexOf(ch);
      if (fi >= 0) return String(fi);
      const ai = ar.indexOf(ch);
      if (ai >= 0) return String(ai);
      return ch;
    })
    .join('');
  return s.replace(/\D/g, '');
}

function luhnOk(digits: string): boolean {
  if (!/^\d{16}$/.test(digits)) return false;
  let sum = 0;
  let alt = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let n = Number(digits[i]);
    if (alt) {
      n *= 2;
      if (n > 9) n -= 9;
    }
    sum += n;
    alt = !alt;
  }
  return sum % 10 === 0;
}

export function validateIranCard(
  raw: string
): { ok: true; card: string } | { ok: false; reason: 'length' | 'luhn' } {
  const card = normalizeCardNumber(raw);
  if (card.length !== 16) return { ok: false, reason: 'length' };
  if (!luhnOk(card)) return { ok: false, reason: 'luhn' };
  return { ok: true, card };
}

export function formatCardGrouped(card: string): string {
  const d = normalizeCardNumber(card);
  return d.replace(/(\d{4})(?=\d)/g, '$1-');
}
