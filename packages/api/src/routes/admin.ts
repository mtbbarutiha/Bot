import { Router, type NextFunction, type Request, type Response } from 'express';
import fs from 'fs';
import net from 'net';
import os from 'os';
import type { UserRole } from '@petdate/shared';
import { USER_ROLES } from '@petdate/shared';
import {
  hasElasticsearchConfig,
  hasPostgresConfig,
  hasRedisConfig,
  hasS3Config,
  infra,
} from '../config/infra';
import { dbService } from '../db';
import { adminPlatform } from '../admin-platform';
import { logAppEvent } from '../services/app-logger';

export const adminRouter = Router();
const STARTED_AT = Date.now();

function adminPassword(): string {
  return (process.env.ADMIN_PASSWORD || 'petdate').trim() || 'petdate';
}

function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  if (req.path === '/auth/login' && req.method === 'POST') {
    next();
    return;
  }
  const header = req.header('x-admin-password') || '';
  const query = typeof req.query.adminPassword === 'string' ? req.query.adminPassword : '';
  const bodyPwd =
    req.body && typeof req.body === 'object' && typeof (req.body as { password?: string }).password === 'string'
      ? (req.body as { password: string }).password
      : '';
  if ((header || query || bodyPwd) !== adminPassword()) {
    res.status(401).json({ error: 'دسترسی ادمین مجاز نیست' });
    return;
  }
  next();
}

adminRouter.use(requireAdmin);

adminRouter.post('/auth/login', (req, res) => {
  const password = typeof req.body?.password === 'string' ? req.body.password : '';
  if (password !== adminPassword()) {
    res.status(401).json({ error: 'رمز عبور اشتباه است' });
    return;
  }
  res.json({ ok: true });
});

adminRouter.get('/dashboard', (_req, res) => {
  res.json({
    generatedAt: new Date().toISOString(),
    stats: adminPlatform.getDashboardStats(),
    recentPets: dbService.listPets().slice(0, 8),
    recentPlaydates: dbService.listPlaydateRequests().slice(0, 8),
    recentConsults: dbService.listVetConsultations({ all: true }).slice(0, 8),
    recentShopOrders: adminPlatform.listShopOrders({ limit: 8 }),
  });
});

adminRouter.get('/users', (req, res) => {
  const q = typeof req.query.q === 'string' ? req.query.q : undefined;
  const role = typeof req.query.role === 'string' ? req.query.role : undefined;
  const active =
    req.query.active === '1' || req.query.active === 'true'
      ? true
      : req.query.active === '0' || req.query.active === 'false'
        ? false
        : undefined;
  const limit = req.query.limit ? Number(req.query.limit) : 50;
  const offset = req.query.offset ? Number(req.query.offset) : 0;
  res.json(adminPlatform.listUsersAdmin({
    q, role, active,
    limit: Number.isFinite(limit) ? limit : 50,
    offset: Number.isFinite(offset) ? offset : 0,
  }));
});

adminRouter.patch('/users/:id', (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) { res.status(400).json({ error: 'شناسه نامعتبر' }); return; }
  let user = dbService.getUserById(id);
  if (!user) { res.status(404).json({ error: 'کاربر پیدا نشد' }); return; }
  if (typeof req.body?.isActive === 'boolean') {
    user = adminPlatform.setUserActive(id, req.body.isActive) ?? user;
  }
  if (Array.isArray(req.body?.roles)) {
    const roles = (req.body.roles as unknown[]).filter(
      (r): r is UserRole => typeof r === 'string' && USER_ROLES.includes(r as UserRole)
    );
    if (roles.length) user = dbService.setUserRoles(id, roles) ?? user;
  } else if (typeof req.body?.role === 'string' && USER_ROLES.includes(req.body.role as UserRole)) {
    user = dbService.setUserRole(id, req.body.role as UserRole) ?? user;
  }
  res.json(user);
});

adminRouter.get('/pets', (req, res) => {
  const species = typeof req.query.species === 'string' ? req.query.species : undefined;
  const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';
  let pets = dbService.listPets({ species });
  if (q) {
    const lower = q.toLowerCase();
    pets = pets.filter((p) =>
      p.name.toLowerCase().includes(lower) ||
      (p.breed || '').toLowerCase().includes(lower) ||
      (p.city || '').toLowerCase().includes(lower) ||
      String(p.id) === q
    );
  }
  res.json({ total: pets.length, pets });
});

adminRouter.delete('/pets/:id', (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) { res.status(400).json({ error: 'شناسه نامعتبر' }); return; }
  if (!dbService.deletePet(id)) { res.status(404).json({ error: 'پت پیدا نشد' }); return; }
  res.json({ ok: true });
});

adminRouter.get('/playdates', (req, res) => {
  const status = typeof req.query.status === 'string' ? req.query.status : undefined;
  const items = dbService.listPlaydateRequests(
    status ? { status: status as 'pending' | 'accepted' | 'rejected' | 'cancelled' } : undefined
  );
  res.json({ total: items.length, playdates: items });
});

adminRouter.patch('/playdates/:id/status', (req, res) => {
  const id = Number(req.params.id);
  const status = String(req.body?.status || '');
  if (!['pending', 'accepted', 'rejected', 'cancelled'].includes(status)) {
    res.status(400).json({ error: 'وضعیت نامعتبر' }); return;
  }
  const updated = dbService.updatePlaydateStatus(id, status as 'pending' | 'accepted' | 'rejected' | 'cancelled');
  if (!updated) { res.status(404).json({ error: 'درخواست پیدا نشد' }); return; }
  res.json(updated);
});

adminRouter.get('/consultations', (req, res) => {
  const status = typeof req.query.status === 'string' ? req.query.status : undefined;
  const items = dbService.listVetConsultations({
    all: true,
    ...(status ? { status: status as never } : {}),
  });
  res.json({ total: items.length, consultations: items });
});

adminRouter.patch('/consultations/:id/status', (req, res) => {
  const id = Number(req.params.id);
  const status = String(req.body?.status || '');
  const updated = dbService.updateVetConsultationStatus(id, status as never);
  if (!updated) { res.status(404).json({ error: 'مشاوره پیدا نشد' }); return; }
  res.json(updated);
});

adminRouter.get('/payments', (req, res) => {
  const status = typeof req.query.status === 'string' ? req.query.status : undefined;
  res.json({ orders: adminPlatform.listPaymentOrdersAdmin({ status, limit: 150 }) });
});

adminRouter.post('/payments/:id/approve', (req, res) => {
  const id = Number(req.params.id);
  const note = typeof req.body?.note === 'string' ? req.body.note : undefined;
  const result = dbService.approveCardPayment(id, note);
  if (!result.ok) { res.status(400).json({ error: result.reason }); return; }
  res.json(result);
});

adminRouter.post('/payments/:id/reject', (req, res) => {
  const id = Number(req.params.id);
  const note = typeof req.body?.note === 'string' ? req.body.note : undefined;
  const result = dbService.rejectCardPayment(id, note);
  if (!result.ok) { res.status(400).json({ error: result.reason }); return; }
  res.json(result);
});

adminRouter.get('/shop/products', (req, res) => {
  const q = typeof req.query.q === 'string' ? req.query.q : undefined;
  const categorySlug = typeof req.query.category === 'string' ? req.query.category : undefined;
  const inStock = req.query.inStock === '1' ? true : req.query.inStock === '0' ? false : undefined;
  const products = adminPlatform.listShopProducts({ q, categorySlug, inStock });
  res.json({ total: products.length, products });
});

adminRouter.get('/shop/products/:id', (req, res) => {
  const product = adminPlatform.getShopProduct(req.params.id);
  if (!product) { res.status(404).json({ error: 'محصول پیدا نشد' }); return; }
  res.json(product);
});

adminRouter.post('/shop/products', (req, res) => {
  const body = req.body ?? {};
  if (!body.title || !body.slug || !body.brandId || !body.categorySlug) {
    res.status(400).json({ error: 'title, slug, brandId, categorySlug الزامی‌اند' }); return;
  }
  const product = adminPlatform.upsertShopProduct({
    id: body.id, slug: String(body.slug), title: String(body.title), brandId: String(body.brandId),
    categorySlug: String(body.categorySlug),
    petTypes: Array.isArray(body.petTypes) ? body.petTypes.map(String) : [],
    priceToman: Number(body.priceToman ?? 0),
    compareAtToman: body.compareAtToman != null ? Number(body.compareAtToman) : undefined,
    image: body.image ? String(body.image) : undefined, badge: body.badge ?? null,
    inStock: body.inStock !== false, stockQty: Number(body.stockQty ?? 0),
    params: body.params && typeof body.params === 'object' ? body.params : {},
    description: body.description ? String(body.description) : '', featured: Boolean(body.featured),
  });
  res.status(201).json(product);
});

adminRouter.put('/shop/products/:id', (req, res) => {
  const existing = adminPlatform.getShopProduct(req.params.id);
  if (!existing) { res.status(404).json({ error: 'محصول پیدا نشد' }); return; }
  const body = req.body ?? {};
  const product = adminPlatform.upsertShopProduct({
    id: existing.id,
    slug: String(body.slug ?? existing.slug),
    title: String(body.title ?? existing.title),
    brandId: String(body.brandId ?? existing.brandId),
    categorySlug: String(body.categorySlug ?? existing.categorySlug),
    petTypes: Array.isArray(body.petTypes) ? body.petTypes.map(String) : existing.petTypes,
    priceToman: body.priceToman != null ? Number(body.priceToman) : existing.priceToman,
    compareAtToman: body.compareAtToman != null ? Number(body.compareAtToman) : existing.compareAtToman,
    image: body.image != null ? String(body.image) : existing.image,
    badge: body.badge !== undefined ? body.badge : existing.badge,
    inStock: body.inStock != null ? Boolean(body.inStock) : existing.inStock,
    stockQty: body.stockQty != null ? Number(body.stockQty) : existing.stockQty,
    params: body.params && typeof body.params === 'object' ? body.params : existing.params,
    description: body.description != null ? String(body.description) : existing.description,
    featured: body.featured != null ? Boolean(body.featured) : existing.featured,
  });
  res.json(product);
});

adminRouter.delete('/shop/products/:id', (req, res) => {
  if (!adminPlatform.deleteShopProduct(req.params.id)) { res.status(404).json({ error: 'محصول پیدا نشد' }); return; }
  res.json({ ok: true });
});

adminRouter.post('/shop/catalog/sync', (req, res) => {
  const products = Array.isArray(req.body?.products) ? req.body.products : [];
  const categories = Array.isArray(req.body?.categories) ? req.body.categories : undefined;
  if (!products.length) { res.status(400).json({ error: 'products خالی است' }); return; }
  const result = adminPlatform.replaceShopCatalog({
    products: products.map((p: Record<string, unknown>) => ({
      id: p.id != null ? String(p.id) : undefined,
      slug: String(p.slug), title: String(p.title),
      brandId: String(p.brandId ?? p.brand_id),
      categorySlug: String(p.categorySlug ?? p.category_slug),
      petTypes: Array.isArray(p.petTypes) ? p.petTypes.map(String) : [],
      priceToman: Number(p.priceToman ?? p.price_toman ?? 0),
      compareAtToman: p.compareAtToman != null || p.compare_at_toman != null
        ? Number(p.compareAtToman ?? p.compare_at_toman) : undefined,
      image: p.image ? String(p.image) : undefined,
      badge: (p.badge as string) ?? null,
      inStock: p.inStock !== false && p.in_stock !== 0,
      stockQty: Number(p.stockQty ?? p.stock_qty ?? (p.inStock === false ? 0 : 10)),
      params: (p.params as Record<string, string>) ?? {},
      description: String(p.description ?? ''),
      featured: Boolean(p.featured),
    })),
    categories: categories?.map((c: Record<string, unknown>, i: number) => ({
      slug: String(c.slug),
      labelFa: String(c.labelFa ?? c.label_fa),
      petType: String(c.petType ?? c.pet_type),
      description: String(c.description ?? ''),
      emoji: String(c.emoji ?? '🛒'),
      sortOrder: Number(c.sortOrder ?? c.sort_order ?? i * 10),
    })),
  });
  res.json({ ok: true, ...result });
});

adminRouter.get('/shop/categories', (_req, res) => {
  res.json({ categories: adminPlatform.listShopCategories() });
});

adminRouter.post('/shop/categories', (req, res) => {
  const body = req.body ?? {};
  if (!body.slug || !body.labelFa || !body.petType) {
    res.status(400).json({ error: 'slug, labelFa, petType الزامی‌اند' }); return;
  }
  res.status(201).json(adminPlatform.upsertShopCategory({
    slug: String(body.slug), labelFa: String(body.labelFa), petType: String(body.petType),
    description: body.description ? String(body.description) : '',
    emoji: body.emoji ? String(body.emoji) : '🛒',
    sortOrder: body.sortOrder != null ? Number(body.sortOrder) : 100,
  }));
});

adminRouter.delete('/shop/categories/:slug', (req, res) => {
  if (!adminPlatform.deleteShopCategory(req.params.slug)) { res.status(404).json({ error: 'دسته پیدا نشد' }); return; }
  res.json({ ok: true });
});

adminRouter.get('/shop/orders', (req, res) => {
  const status = typeof req.query.status === 'string' ? req.query.status : undefined;
  res.json({ orders: adminPlatform.listShopOrders({ status, limit: 150 }) });
});

adminRouter.patch('/shop/orders/:id/status', (req, res) => {
  const id = Number(req.params.id);
  const status = String(req.body?.status || '');
  if (!status) { res.status(400).json({ error: 'status الزامی است' }); return; }
  const order = adminPlatform.updateShopOrderStatus(id, status);
  if (!order) { res.status(404).json({ error: 'سفارش پیدا نشد' }); return; }
  res.json(order);
});

adminRouter.post('/shop/orders', (req, res) => {
  const body = req.body ?? {};
  res.status(201).json(adminPlatform.createShopOrder({
    userId: body.userId != null ? Number(body.userId) : undefined,
    status: body.status ? String(body.status) : 'pending',
    totalToman: Number(body.totalToman ?? 0),
    items: Array.isArray(body.items) ? body.items : [],
    customerName: body.customerName ? String(body.customerName) : undefined,
    customerPhone: body.customerPhone ? String(body.customerPhone) : undefined,
    note: body.note ? String(body.note) : undefined,
  }));
});

adminRouter.get('/content/announcements', (_req, res) => {
  res.json({ announcements: adminPlatform.listAnnouncements() });
});

adminRouter.post('/content/announcements', (req, res) => {
  const title = typeof req.body?.title === 'string' ? req.body.title.trim() : '';
  if (!title) { res.status(400).json({ error: 'title الزامی است' }); return; }
  res.status(201).json(adminPlatform.upsertAnnouncement({
    title,
    body: typeof req.body?.body === 'string' ? req.body.body : '',
    active: req.body?.active !== false,
    placement: typeof req.body?.placement === 'string' ? req.body.placement : 'landing',
  }));
});

adminRouter.put('/content/announcements/:id', (req, res) => {
  const id = Number(req.params.id);
  const title = typeof req.body?.title === 'string' ? req.body.title.trim() : '';
  if (!title) { res.status(400).json({ error: 'title الزامی است' }); return; }
  res.json(adminPlatform.upsertAnnouncement({
    id, title,
    body: typeof req.body?.body === 'string' ? req.body.body : '',
    active: req.body?.active !== false,
    placement: typeof req.body?.placement === 'string' ? req.body.placement : 'landing',
  }));
});

adminRouter.delete('/content/announcements/:id', (req, res) => {
  if (!adminPlatform.deleteAnnouncement(Number(req.params.id))) {
    res.status(404).json({ error: 'اعلان پیدا نشد' }); return;
  }
  res.json({ ok: true });
});

adminRouter.get('/settings', (_req, res) => {
  const defaults: Record<string, string> = {
    shopEnabled: '1', playdatesEnabled: '1', vetConsultEnabled: '1', botForceJoin: '1',
    paymentCardEnabled: '1', paymentStarsEnabled: '1', maintenanceMode: '0',
  };
  res.json({ settings: { ...defaults, ...adminPlatform.getSettings() } });
});

adminRouter.put('/settings', (req, res) => {
  const body = req.body?.settings && typeof req.body.settings === 'object' ? req.body.settings : req.body;
  if (!body || typeof body !== 'object') { res.status(400).json({ error: 'settings نامعتبر' }); return; }
  const patch: Record<string, string> = {};
  for (const [k, v] of Object.entries(body as Record<string, unknown>)) patch[k] = String(v ?? '');
  res.json({ settings: adminPlatform.setSettings(patch) });
});

adminRouter.get('/logs', (req, res) => {
  const level = typeof req.query.level === 'string' ? req.query.level : undefined;
  const source = typeof req.query.source === 'string' ? req.query.source : undefined;
  const limit = req.query.limit ? Number(req.query.limit) : 100;
  const beforeId = req.query.beforeId ? Number(req.query.beforeId) : undefined;
  res.json({
    stats: dbService.getAppErrorLogStats(),
    logs: dbService.listAppErrorLogs({
      level, source,
      limit: Number.isFinite(limit) ? limit : 100,
      beforeId: Number.isFinite(beforeId) ? beforeId : undefined,
    }),
  });
});

adminRouter.delete('/logs', (req, res) => {
  const olderThanDays = req.query.olderThanDays ? Number(req.query.olderThanDays) : undefined;
  const cleared = dbService.clearAppErrorLogs(Number.isFinite(olderThanDays) ? olderThanDays : undefined);
  res.json({ ok: true, cleared });
});

adminRouter.post('/logs', (req, res) => {
  const message = typeof req.body?.message === 'string' ? req.body.message.trim() : '';
  if (!message) { res.status(400).json({ error: 'message الزامی است' }); return; }
  const level = req.body?.level === 'warn' || req.body?.level === 'info' || req.body?.level === 'error' ? req.body.level : 'error';
  logAppEvent({
    level,
    source: typeof req.body?.source === 'string' ? req.body.source : 'external',
    message,
    stack: typeof req.body?.stack === 'string' ? req.body.stack : null,
    path: typeof req.body?.path === 'string' ? req.body.path : null,
    method: typeof req.body?.method === 'string' ? req.body.method : null,
    statusCode: typeof req.body?.statusCode === 'number' ? req.body.statusCode : null,
    meta: req.body?.meta && typeof req.body.meta === 'object' ? (req.body.meta as Record<string, unknown>) : null,
  });
  res.status(201).json({ ok: true });
});

function checkTcpPort(host: string, port: number, timeoutMs = 1200): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = net.connect({ host, port });
    const done = (ok: boolean) => { try { socket.destroy(); } catch { /* */ } resolve(ok); };
    socket.setTimeout(timeoutMs);
    socket.on('connect', () => done(true));
    socket.on('timeout', () => done(false));
    socket.on('error', () => done(false));
  });
}

async function probeService(url: string | undefined, defaultPort: number): Promise<{ ok: boolean; detail: string }> {
  if (!url) return { ok: false, detail: 'پیکربندی نشده' };
  try {
    const u = new URL(url);
    const host = u.hostname || '127.0.0.1';
    const port = Number(u.port || defaultPort);
    const ok = await checkTcpPort(host, port);
    return { ok, detail: ok ? `${host}:${port}` : `غیرقابل دسترس ${host}:${port}` };
  } catch (err) {
    return { ok: false, detail: (err as Error).message };
  }
}

function diskCheck(dir: string) {
  try {
    const st = fs.statfsSync(dir);
    const total = Number(st.blocks) * Number(st.bsize);
    const free = Number(st.bavail) * Number(st.bsize);
    const freeGb = Math.round((free / 1024 ** 3) * 100) / 100;
    const totalGb = Math.round((total / 1024 ** 3) * 100) / 100;
    return { ok: free > 512 * 1024 * 1024, detail: `${freeGb} / ${totalGb} GB آزاد`, freeGb, totalGb };
  } catch (err) {
    return { ok: false, detail: (err as Error).message };
  }
}

adminRouter.get('/monitoring', async (_req, res) => {
  const mem = process.memoryUsage();
  const loadAvg = os.loadavg().map((n) => Math.round(n * 100) / 100);
  const [redis, postgres] = await Promise.all([
    probeService(process.env.REDIS_URL, 6379),
    probeService(process.env.DATABASE_URL?.startsWith('postgres') ? process.env.DATABASE_URL : undefined, 5432),
  ]);
  const counts = dbService.getOpsCounts();
  const logStats = dbService.getAppErrorLogStats();
  const disk = diskCheck(process.cwd());
  const dash = adminPlatform.getDashboardStats();
  const checks: Record<string, { ok: boolean; detail: string; freeGb?: number; totalGb?: number }> = {
    api: { ok: true, detail: 'فعال' },
    telegramBot: { ok: Boolean(infra.telegram.botToken), detail: infra.telegram.botToken ? 'توکن تنظیم شده' : 'TELEGRAM_BOT_TOKEN نیست' },
    sqlite: { ok: true, detail: hasPostgresConfig() ? 'legacy/fallback' : 'اصلی' },
    postgres, redis,
    s3: { ok: hasS3Config(), detail: hasS3Config() ? 'پیکربندی شده' : 'پیکربینی نشده' },
    elasticsearch: { ok: hasElasticsearchConfig(), detail: hasElasticsearchConfig() ? 'پیکربندی شده' : 'پیکربندی نشده' },
    disk,
  };
  const unhealthy = Object.entries(checks).filter(([, v]) => !v.ok).map(([k]) => k);
  const criticalUnhealthy = unhealthy.filter((k) => !['elasticsearch', 's3', 'postgres', 'redis'].includes(k));
  res.json({
    ok: criticalUnhealthy.length === 0,
    generatedAt: new Date().toISOString(),
    uptimeSec: Math.floor((Date.now() - STARTED_AT) / 1000),
    node: process.version,
    platform: `${os.type()} ${os.release()}`,
    hostname: os.hostname(),
    loadAvg,
    memory: {
      rssMb: Math.round(mem.rss / (1024 * 1024)),
      heapUsedMb: Math.round(mem.heapUsed / (1024 * 1024)),
      heapTotalMb: Math.round(mem.heapTotal / (1024 * 1024)),
      externalMb: Math.round(mem.external / (1024 * 1024)),
      systemFreeMb: Math.round(os.freemem() / (1024 * 1024)),
      systemTotalMb: Math.round(os.totalmem() / (1024 * 1024)),
    },
    counts: {
      users: counts.users, pets: counts.pets, playdates: counts.playdates,
      playdatesAccepted: counts.playdatesAccepted, chatMessages: counts.chatMessages,
      openGames: counts.openGames, shopOrders: dash.shopOrders, vetConsults: dash.vetConsults,
    },
    logs: { total: logStats.total, errors24h: logStats.errors24h, warns24h: logStats.warns24h, lastErrorAt: logStats.lastErrorAt },
    checks, unhealthy, redisConfigured: hasRedisConfig(),
  });
});

adminRouter.post('/wallet/credit', (req, res) => {
  const userId = Number(req.body?.userId);
  const currencyRaw = String(req.body?.currency ?? '').trim().toLowerCase();
  const amount = Number(req.body?.amount);
  const currency = currencyRaw === 'ton' || currencyRaw === 'stars' || currencyRaw === 'coins' || currencyRaw === 'toman' ? currencyRaw : null;
  if (!Number.isFinite(userId) || userId <= 0) { res.status(400).json({ error: 'userId نامعتبر است' }); return; }
  if (!currency) { res.status(400).json({ error: 'currency باید ton | stars | coins | toman باشد' }); return; }
  if (!Number.isFinite(amount) || amount === 0) { res.status(400).json({ error: 'amount نامعتبر است' }); return; }
  const result = dbService.creditWallet(userId, currency, amount);
  if (!result.ok) {
    res.status(result.reason === 'missing_user' ? 404 : 400).json({
      error: result.reason === 'missing_user' ? 'کاربر پیدا نشد' : 'مبلغ یا موجودی کافی نیست',
    });
    return;
  }
  res.json({ ok: true, user: result.user, wallet: result.user.wallet });
});
