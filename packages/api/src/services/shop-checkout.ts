/**
 * Atomic shop checkout paid with bot coins (users.coins).
 */
import { tomanToShopCoins } from '@petdate/shared';
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

export type ShopCheckoutLine = {
  productId: string;
  title: string;
  categorySlug: string;
  qty: number;
  priceToman: number;
  costToman?: number;
  lineCoins: number;
};

export type ShopCheckoutCoinsOk = {
  ok: true;
  order: ShopOrderRow;
  coinsSpent: number;
  coinsRemaining: number;
  totalToman: number;
  lines: ShopCheckoutLine[];
};

export type ShopCheckoutCoinsFail = {
  ok: false;
  reason:
    | 'empty_cart'
    | 'bad_item'
    | 'product_missing'
    | 'out_of_stock'
    | 'insufficient_coins'
    | 'user_missing'
    | 'bad_customer';
  error: string;
  balance?: number;
  cost?: number;
  productId?: string;
};

function resolveLine(
  productId: string,
  qtyRaw: number
): { ok: true; line: ShopCheckoutLine } | { ok: false; fail: ShopCheckoutCoinsFail } {
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
    },
  };
}

export function checkoutShopWithCoins(
  input: ShopCheckoutCoinsInput
): ShopCheckoutCoinsOk | ShopCheckoutCoinsFail {
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

  const user = dbService.getUserById(input.userId);
  if (!user) {
    return { ok: false, reason: 'user_missing', error: 'کاربر پیدا نشد.' };
  }

  const lines: ShopCheckoutLine[] = [];
  for (const item of input.items) {
    const resolved = resolveLine(String(item.productId ?? ''), item.qty);
    if (!resolved.ok) return resolved.fail;
    lines.push(resolved.line);
  }

  const totalToman = lines.reduce((s, l) => s + l.priceToman * l.qty, 0);
  const coinsNeeded = lines.reduce((s, l) => s + l.lineCoins, 0);
  const cogsToman = lines.reduce((s, l) => {
    const unit = l.costToman != null ? l.costToman : Math.floor(l.priceToman * 0.65);
    return s + unit * l.qty;
  }, 0);

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

  const noteParts = [
    `آدرس ارسال: ${address}`,
    input.note?.trim() ? input.note.trim() : '',
  ].filter(Boolean);
  const note = noteParts.join('\n');

  const d = getDb();
  try {
    const result = d.transaction(() => {
      const debited = dbService.debitCoins(input.userId, coinsNeeded);
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

/** Quote coin cost for a cart without debiting. */
export function quoteShopCoins(
  items: ShopCheckoutItemInput[]
):
  | { ok: true; totalToman: number; coins: number; lines: ShopCheckoutLine[]; balanceNeeded: number }
  | ShopCheckoutCoinsFail {
  if (!Array.isArray(items) || items.length === 0) {
    return { ok: false, reason: 'empty_cart', error: 'سبد خرید خالی است.' };
  }
  const lines: ShopCheckoutLine[] = [];
  for (const item of items) {
    const resolved = resolveLine(String(item.productId ?? ''), item.qty);
    if (!resolved.ok) return resolved.fail;
    lines.push(resolved.line);
  }
  const totalToman = lines.reduce((s, l) => s + l.priceToman * l.qty, 0);
  const coins = lines.reduce((s, l) => s + l.lineCoins, 0);
  return { ok: true, totalToman, coins, lines, balanceNeeded: coins };
}
