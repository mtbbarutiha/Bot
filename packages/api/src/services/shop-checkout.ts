/**
 * Atomic shop checkout paid with bot coins (users.coins) or wallet stars (users.wallet_stars).
 */
import { tomanToShopCoins, tomanToShopStars } from '@petdate/shared';
import { getDb, dbService } from '../db';
import { adminPlatform, type ShopOrderRow } from '../admin-platform';
import { lookupShopPrice } from './shop-price-index';

export type ShopCheckoutItemInput = {
  productId: string;
  qty: number;
};

export type ShopCheckoutCoinsInput = {
  userId: number;
  items: ShopCheckoutItemInput[];
  customerName: string;
  customerPhone: string;
  address: string;
  note?: string;
};

export type ShopCheckoutStarsInput = ShopCheckoutCoinsInput;

export type ShopCheckoutLine = {
  productId: string;
  title: string;
  categorySlug: string;
  qty: number;
  priceToman: number;
  costToman?: number;
  lineCoins: number;
  lineStars: number;
};

export type ShopCheckoutCoinsOk = {
  ok: true;
  order: ShopOrderRow;
  coinsSpent: number;
  coinsRemaining: number;
  totalToman: number;
  lines: ShopCheckoutLine[];
};

export type ShopCheckoutStarsOk = {
  ok: true;
  order: ShopOrderRow;
  starsSpent: number;
  starsRemaining: number;
  totalToman: number;
  lines: ShopCheckoutLine[];
};

export type ShopCheckoutFail = {
  ok: false;
  reason:
    | 'empty_cart'
    | 'bad_item'
    | 'product_missing'
    | 'out_of_stock'
    | 'insufficient_coins'
    | 'insufficient_stars'
    | 'user_missing'
    | 'bad_customer';
  error: string;
  balance?: number;
  cost?: number;
  productId?: string;
};

/** @deprecated use ShopCheckoutFail */
export type ShopCheckoutCoinsFail = ShopCheckoutFail;

function resolveLine(
  productId: string,
  qtyRaw: number
): { ok: true; line: ShopCheckoutLine } | { ok: false; fail: ShopCheckoutFail } {
  const qty = Math.floor(Number(qtyRaw));
  if (!productId || !Number.isFinite(qty) || qty <= 0) {
    return {
      ok: false,
      fail: {
        ok: false,
        reason: 'bad_item',
        error: 'آیتم سبد نامعتبر است.',
        productId,
      },
    };
  }

  const dbProd = adminPlatform.getShopProduct(productId);
  const indexed = lookupShopPrice(productId);

  if (!dbProd && !indexed) {
    return {
      ok: false,
      fail: {
        ok: false,
        reason: 'product_missing',
        error: 'محصول در کاتالوگ یافت نشد.',
        productId,
      },
    };
  }

  if (dbProd && !dbProd.inStock) {
    return {
      ok: false,
      fail: {
        ok: false,
        reason: 'out_of_stock',
        error: `«${dbProd.title}» موجود نیست.`,
        productId,
      },
    };
  }

  const priceToman = dbProd?.priceToman ?? indexed!.priceToman;
  const title = dbProd?.title ?? indexed!.title;
  const categorySlug = dbProd?.categorySlug ?? indexed!.categorySlug;
  const costToman = dbProd?.costToman;
  const id = dbProd?.id ?? indexed!.id;
  const unitCoins = tomanToShopCoins(priceToman);
  const unitStars = tomanToShopStars(priceToman);

  return {
    ok: true,
    line: {
      productId: id,
      title,
      categorySlug,
      qty,
      priceToman,
      costToman,
      lineCoins: unitCoins * qty,
      lineStars: unitStars * qty,
    },
  };
}

function validateCustomer(input: ShopCheckoutCoinsInput): ShopCheckoutFail | null {
  const name = input.customerName?.trim() ?? '';
  const phone = input.customerPhone?.trim() ?? '';
  const address = input.address?.trim() ?? '';
  if (!name || !phone || !address) {
    return {
      ok: false,
      reason: 'bad_customer',
      error: 'نام، موبایل و آدرس لازم است.',
    };
  }
  if (!Array.isArray(input.items) || input.items.length === 0) {
    return { ok: false, reason: 'empty_cart', error: 'سبد خرید خالی است.' };
  }
  return null;
}

function buildLines(
  items: ShopCheckoutItemInput[]
): { ok: true; lines: ShopCheckoutLine[] } | { ok: false; fail: ShopCheckoutFail } {
  const lines: ShopCheckoutLine[] = [];
  for (const item of items) {
    const resolved = resolveLine(String(item.productId ?? ''), item.qty);
    if (!resolved.ok) return { ok: false, fail: resolved.fail };
    lines.push(resolved.line);
  }
  return { ok: true, lines };
}

function orderNote(address: string, note?: string): string {
  return [`آدرس ارسال: ${address}`, note?.trim() ? note.trim() : ''].filter(Boolean).join('\n');
}

function cogsOf(lines: ShopCheckoutLine[]): number {
  return lines.reduce((s, l) => {
    const unit = l.costToman != null ? l.costToman : Math.floor(l.priceToman * 0.65);
    return s + unit * l.qty;
  }, 0);
}

export function checkoutShopWithCoins(
  input: ShopCheckoutCoinsInput
): ShopCheckoutCoinsOk | ShopCheckoutFail {
  const bad = validateCustomer(input);
  if (bad) return bad;

  const user = dbService.getUserById(input.userId);
  if (!user) {
    return { ok: false, reason: 'user_missing', error: 'کاربر پیدا نشد.' };
  }

  const built = buildLines(input.items);
  if (!built.ok) return built.fail;
  const { lines } = built;

  const name = input.customerName.trim();
  const phone = input.customerPhone.trim();
  const address = input.address.trim();
  const totalToman = lines.reduce((s, l) => s + l.priceToman * l.qty, 0);
  const coinsNeeded = lines.reduce((s, l) => s + l.lineCoins, 0);
  const cogsToman = cogsOf(lines);

  const balance = user.coins ?? 0;
  if (balance < coinsNeeded) {
    return {
      ok: false,
      reason: 'insufficient_coins',
      error: `موجودی سکه کافی نیست. نیاز: ${coinsNeeded.toLocaleString('fa-IR')} — موجودی: ${balance.toLocaleString('fa-IR')}`,
      balance,
      cost: coinsNeeded,
    };
  }

  const note = orderNote(address, input.note);
  const d = getDb();
  try {
    const result = d.transaction(() => {
      const debited = dbService.debitCoins(input.userId, coinsNeeded, { skipLedger: true });
      if (!debited) {
        throw Object.assign(new Error('INSUFFICIENT'), {
          balance: dbService.getUserById(input.userId)?.coins ?? 0,
          cost: coinsNeeded,
        });
      }

      const order = adminPlatform.createShopOrder({
        userId: input.userId,
        status: 'paid',
        totalToman,
        items: lines.map((l) => ({
          productId: l.productId,
          title: l.title,
          categorySlug: l.categorySlug,
          qty: l.qty,
          priceToman: l.priceToman,
          costToman: l.costToman ?? Math.floor(l.priceToman * 0.65),
          coins: l.lineCoins,
        })),
        customerName: name,
        customerPhone: phone,
        note,
        paymentCurrency: 'coins',
        paymentAmount: coinsNeeded,
        cogsToman,
      });

      d.prepare(
        `INSERT INTO wallet_ledger (user_id, currency, amount, direction, reason, ref_type, ref_id)
         VALUES (?, 'coins', ?, 'debit', ?, 'shop_order', ?)`
      ).run(input.userId, coinsNeeded, 'خرید فروشگاه با سکه', String(order.id));

      return {
        order,
        coinsRemaining: debited.coins ?? 0,
      };
    })();

    return {
      ok: true,
      order: result.order,
      coinsSpent: coinsNeeded,
      coinsRemaining: result.coinsRemaining,
      totalToman,
      lines,
    };
  } catch (err) {
    const e = err as { message?: string; balance?: number; cost?: number };
    if (e?.message === 'INSUFFICIENT') {
      return {
        ok: false,
        reason: 'insufficient_coins',
        error: `موجودی سکه کافی نیست. نیاز: ${(e.cost ?? coinsNeeded).toLocaleString('fa-IR')} — موجودی: ${(e.balance ?? 0).toLocaleString('fa-IR')}`,
        balance: e.balance ?? 0,
        cost: e.cost ?? coinsNeeded,
      };
    }
    throw err;
  }
}

/**
 * پرداخت فروشگاه با ستاره کیف پول مشترک (users.wallet_stars).
 * نرخ: STAR_PRICE_TOMAN = ۲٬۰۰۰ (هم‌تراز ۱ Star = ۱ سکه در ربات).
 */
export function checkoutShopWithStars(
  input: ShopCheckoutStarsInput
): ShopCheckoutStarsOk | ShopCheckoutFail {
  const bad = validateCustomer(input);
  if (bad) return bad;

  const user = dbService.getUserById(input.userId);
  if (!user) {
    return { ok: false, reason: 'user_missing', error: 'کاربر پیدا نشد.' };
  }

  const built = buildLines(input.items);
  if (!built.ok) return built.fail;
  const { lines } = built;

  const name = input.customerName.trim();
  const phone = input.customerPhone.trim();
  const address = input.address.trim();
  const totalToman = lines.reduce((s, l) => s + l.priceToman * l.qty, 0);
  const starsNeeded = lines.reduce((s, l) => s + l.lineStars, 0);
  const cogsToman = cogsOf(lines);

  const balance = user.wallet?.stars ?? user.walletStars ?? 0;
  if (balance < starsNeeded) {
    return {
      ok: false,
      reason: 'insufficient_stars',
      error: `موجودی ستاره کافی نیست. نیاز: ${starsNeeded.toLocaleString('fa-IR')} — موجودی: ${balance.toLocaleString('fa-IR')}`,
      balance,
      cost: starsNeeded,
    };
  }

  const note = orderNote(address, input.note);
  const d = getDb();
  try {
    const result = d.transaction(() => {
      const debited = dbService.debitStars(input.userId, starsNeeded, { skipLedger: true });
      if (!debited) {
        const w = dbService.getWallet(input.userId);
        throw Object.assign(new Error('INSUFFICIENT'), {
          balance: w?.stars ?? 0,
          cost: starsNeeded,
        });
      }

      const order = adminPlatform.createShopOrder({
        userId: input.userId,
        status: 'paid',
        totalToman,
        items: lines.map((l) => ({
          productId: l.productId,
          title: l.title,
          categorySlug: l.categorySlug,
          qty: l.qty,
          priceToman: l.priceToman,
          costToman: l.costToman ?? Math.floor(l.priceToman * 0.65),
          coins: l.lineStars,
        })),
        customerName: name,
        customerPhone: phone,
        note,
        paymentCurrency: 'stars',
        paymentAmount: starsNeeded,
        cogsToman,
      });

      d.prepare(
        `INSERT INTO wallet_ledger (user_id, currency, amount, direction, reason, ref_type, ref_id)
         VALUES (?, 'stars', ?, 'debit', ?, 'shop_order', ?)`
      ).run(input.userId, starsNeeded, 'خرید فروشگاه با ستاره', String(order.id));

      return {
        order,
        starsRemaining: debited.wallet?.stars ?? debited.walletStars ?? 0,
      };
    })();

    return {
      ok: true,
      order: result.order,
      starsSpent: starsNeeded,
      starsRemaining: result.starsRemaining,
      totalToman,
      lines,
    };
  } catch (err) {
    const e = err as { message?: string; balance?: number; cost?: number };
    if (e?.message === 'INSUFFICIENT') {
      return {
        ok: false,
        reason: 'insufficient_stars',
        error: `موجودی ستاره کافی نیست. نیاز: ${(e.cost ?? starsNeeded).toLocaleString('fa-IR')} — موجودی: ${(e.balance ?? 0).toLocaleString('fa-IR')}`,
        balance: e.balance ?? 0,
        cost: e.cost ?? starsNeeded,
      };
    }
    throw err;
  }
}

/** Quote coin cost for a cart without debiting. */
export function quoteShopCoins(
  items: ShopCheckoutItemInput[]
):
  | { ok: true; totalToman: number; coins: number; lines: ShopCheckoutLine[]; balanceNeeded: number }
  | ShopCheckoutFail {
  if (!Array.isArray(items) || items.length === 0) {
    return { ok: false, reason: 'empty_cart', error: 'سبد خرید خالی است.' };
  }
  const built = buildLines(items);
  if (!built.ok) return built.fail;
  const { lines } = built;
  const totalToman = lines.reduce((s, l) => s + l.priceToman * l.qty, 0);
  const coins = lines.reduce((s, l) => s + l.lineCoins, 0);
  return { ok: true, totalToman, coins, lines, balanceNeeded: coins };
}

/** Quote star cost for a cart without debiting. */
export function quoteShopStars(
  items: ShopCheckoutItemInput[]
):
  | { ok: true; totalToman: number; stars: number; lines: ShopCheckoutLine[]; balanceNeeded: number }
  | ShopCheckoutFail {
  if (!Array.isArray(items) || items.length === 0) {
    return { ok: false, reason: 'empty_cart', error: 'سبد خرید خالی است.' };
  }
  const built = buildLines(items);
  if (!built.ok) return built.fail;
  const { lines } = built;
  const totalToman = lines.reduce((s, l) => s + l.priceToman * l.qty, 0);
  const stars = lines.reduce((s, l) => s + l.lineStars, 0);
  return { ok: true, totalToman, stars, lines, balanceNeeded: stars };
}
