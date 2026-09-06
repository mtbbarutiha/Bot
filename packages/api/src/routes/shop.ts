import { Router } from 'express';
import { COIN_PRICE_TOMAN, tomanToShopCoins } from '@petdate/shared';
import { getUserFromBearer } from '../services/web-otp';
import { checkoutShopWithCoins, quoteShopCoins } from '../services/shop-checkout';
import { adminPlatform } from '../admin-platform';
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

function parseBool(raw: unknown): boolean | undefined {
  if (raw === '1' || raw === 'true') return true;
  if (raw === '0' || raw === 'false') return false;
  return undefined;
}

function publicProduct(p: ReturnType<typeof adminPlatform.getShopProduct>) {
  if (!p) return null;
  return {
    id: p.id,
    slug: p.slug,
    title: p.title,
    brandId: p.brandId,
    categorySlug: p.categorySlug,
    petTypes: p.petTypes,
    priceToman: p.priceToman,
    compareAtToman: p.compareAtToman,
    image: p.image,
    badge: p.badge,
    inStock: p.inStock,
    stockQty: p.stockQty,
    params: p.params,
    description: p.description,
    featured: p.featured,
    coins: tomanToShopCoins(p.priceToman),
    coinPriceToman: COIN_PRICE_TOMAN,
  };
}

/** نرخ و قواعد نمایش قیمت سکه فروشگاه */
shopRouter.get('/coin-rate', (_req, res) => {
  res.json({
    ok: true,
    coinPriceToman: COIN_PRICE_TOMAN,
    noteFa: `هر سکه ≈ ${COIN_PRICE_TOMAN.toLocaleString('fa-IR')} تومان در پرداخت فروشگاه`,
  });
});

/**
 * کاتالوگ عمومی — منبع حقیقت مشترک وب و ربات (از DB).
 * GET /api/shop/categories?petType=dog|cat|bird
 */
shopRouter.get('/categories', (req, res) => {
  const petType = typeof req.query.petType === 'string' ? req.query.petType.trim() : '';
  let categories = adminPlatform.listShopCategories();
  if (petType && petType !== 'all') {
    categories = categories.filter((c) => c.petType === petType);
  }
  res.json({
    ok: true,
    total: categories.length,
    categories,
    coinPriceToman: COIN_PRICE_TOMAN,
  });
});

/**
 * لیست محصولات عمومی از DB.
 * Query: category, petType, q, featured, inStock, limit, offset
 */
shopRouter.get('/products', (req, res) => {
  const q = typeof req.query.q === 'string' ? req.query.q.trim() : undefined;
  const categorySlug =
    typeof req.query.category === 'string'
      ? req.query.category.trim()
      : typeof req.query.categorySlug === 'string'
        ? req.query.categorySlug.trim()
        : undefined;
  const petType = typeof req.query.petType === 'string' ? req.query.petType.trim() : undefined;
  const featuredOnly = parseBool(req.query.featured) === true;
  const inStock = parseBool(req.query.inStock);

  let products = adminPlatform.listShopProducts({
    q,
    categorySlug: categorySlug || undefined,
    inStock,
  });

  if (petType && petType !== 'all') {
    products = products.filter((p) => p.petTypes.includes(petType));
  }
  if (featuredOnly) {
    products = products.filter((p) => p.featured);
  }

  const limitRaw = Number(req.query.limit ?? 100);
  const offsetRaw = Number(req.query.offset ?? 0);
  const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(Math.floor(limitRaw), 1), 300) : 100;
  const offset = Number.isFinite(offsetRaw) ? Math.max(Math.floor(offsetRaw), 0) : 0;
  const total = products.length;
  const page = products.slice(offset, offset + limit).map((p) => publicProduct(p)!);

  res.json({
    ok: true,
    total,
    offset,
    limit,
    products: page,
    coinPriceToman: COIN_PRICE_TOMAN,
  });
});

/** جزئیات یک محصول از DB */
shopRouter.get('/products/:idOrSlug', (req, res) => {
  const product = adminPlatform.getShopProduct(req.params.idOrSlug);
  if (!product) {
    res.status(404).json({ ok: false, error: 'محصول پیدا نشد' });
    return;
  }
  const category = adminPlatform.listShopCategories().find((c) => c.slug === product.categorySlug);
  res.json({
    ok: true,
    product: publicProduct(product),
    category: category ?? null,
    coinPriceToman: COIN_PRICE_TOMAN,
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
 * پرداخت و ثبت سفارش با سکه ربات (وب — Bearer OTP).
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

/**
 * پرداخت با سکه از ربات تلگرام — همان کیف پول و همان کاتالوگ DB.
 * Body: { telegramId, items, customerName, customerPhone, address, note? }
 */
shopRouter.post('/checkout/coins-telegram', (req, res) => {
  const body = req.body ?? {};
  const telegramId = String(body.telegramId ?? '').trim();
  if (!telegramId) {
    res.status(400).json({ ok: false, reason: 'bad_user', error: 'telegramId الزامی است.' });
    return;
  }

  const user = dbService.getUserByTelegramId(telegramId);
  if (!user) {
    res.status(404).json({ ok: false, reason: 'user_missing', error: 'کاربر پیدا نشد. اول /start بزن.' });
    return;
  }

  const items = Array.isArray(body.items) ? body.items : [];
  const result = checkoutShopWithCoins({
    userId: user.id,
    items: items.map((it: { productId?: string; qty?: number }) => ({
      productId: String(it?.productId ?? ''),
      qty: Number(it?.qty ?? 0),
    })),
    customerName: String(body.customerName ?? body.name ?? user.name ?? ''),
    customerPhone: String(body.customerPhone ?? body.phone ?? user.phone ?? ''),
    address: String(body.address ?? ''),
    note: body.note != null ? String(body.note) : undefined,
  });

  if (!result.ok) {
    const status = result.reason === 'user_missing' ? 404 : 400;
    res.status(status).json(result);
    return;
  }

  const fresh = dbService.getUserById(user.id);
  res.status(201).json({
    ok: true,
    orderId: result.order.id,
    order: result.order,
    coinsSpent: result.coinsSpent,
    coinsRemaining: result.coinsRemaining,
    totalToman: result.totalToman,
    lines: result.lines,
    wallet: fresh?.wallet ?? dbService.getWallet(user.id),
    coins: result.coinsRemaining,
    message: `سفارش #${result.order.id} با ${result.coinsSpent.toLocaleString('fa-IR')} سکه پرداخت شد.`,
  });
});
