import { Router } from 'express';
import { COIN_PRICE_TOMAN } from '@petdate/shared';
import { getUserFromBearer } from '../services/web-otp';
import { checkoutShopWithCoins, quoteShopCoins } from '../services/shop-checkout';
import { dbService } from '../db';

export const shopRouter = Router();

function requireSession(req: { header: (name: string) => string | undefined }, res: {
  status: (code: number) => { json: (body: unknown) => void };
}) {
  const session = getUserFromBearer(req.header('authorization') ?? undefined);
  if (!session) {
    res.status(401).json({ error: 'برای پرداخت با سکه وارد حساب شوید.', reason: 'unauthorized' });
    return null;
  }
  return session;
}

/** نرخ و قواعد نمایش قیمت سکه فروشگاه */
shopRouter.get('/coin-rate', (_req, res) => {
  res.json({
    ok: true,
    coinPriceToman: COIN_PRICE_TOMAN,
    noteFa: `هر سکه ≈ ${COIN_PRICE_TOMAN.toLocaleString('fa-IR')} تومان در پرداخت فروشگاه`,
  });
});

/** برآورد هزینه سکه برای سبد (نیاز به ورود) */
shopRouter.post('/quote-coins', (req, res) => {
  const session = requireSession(req, res);
  if (!session) return;

  const items = Array.isArray(req.body?.items) ? req.body.items : [];
  const quoted = quoteShopCoins(
    items.map((it: { productId?: string; qty?: number }) => ({
      productId: String(it?.productId ?? ''),
      qty: Number(it?.qty ?? 0),
    }))
  );
  if (!quoted.ok) {
    res.status(400).json(quoted);
    return;
  }

  const wallet = dbService.getWallet(session.user.id);
  const balance = wallet?.coins ?? session.user.coins ?? 0;
  res.json({
    ok: true,
    totalToman: quoted.totalToman,
    coins: quoted.coins,
    lines: quoted.lines,
    balance,
    canAfford: balance >= quoted.coins,
    coinPriceToman: COIN_PRICE_TOMAN,
  });
});

/**
 * پرداخت و ثبت سفارش با سکه ربات.
 * کسر سکه اتمیک + سفارش status=paid و payment_currency=coins.
 */
shopRouter.post('/checkout/coins', (req, res) => {
  const session = requireSession(req, res);
  if (!session) return;

  const body = req.body ?? {};
  const items = Array.isArray(body.items) ? body.items : [];
  const result = checkoutShopWithCoins({
    userId: session.user.id,
    items: items.map((it: { productId?: string; qty?: number }) => ({
      productId: String(it?.productId ?? ''),
      qty: Number(it?.qty ?? 0),
    })),
    customerName: String(body.customerName ?? body.name ?? ''),
    customerPhone: String(body.customerPhone ?? body.phone ?? ''),
    address: String(body.address ?? ''),
    note: body.note != null ? String(body.note) : undefined,
  });

  if (!result.ok) {
    const status = result.reason === 'user_missing' ? 404 : 400;
    res.status(status).json(result);
    return;
  }

  const user = dbService.getUserById(session.user.id);
  res.status(201).json({
    ok: true,
    orderId: result.order.id,
    order: result.order,
    coinsSpent: result.coinsSpent,
    coinsRemaining: result.coinsRemaining,
    totalToman: result.totalToman,
    lines: result.lines,
    wallet: user?.wallet ?? dbService.getWallet(session.user.id),
    coins: result.coinsRemaining,
    message: `سفارش #${result.order.id} با ${result.coinsSpent.toLocaleString('fa-IR')} سکه پرداخت شد.`,
  });
});
