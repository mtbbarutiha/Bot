import './load-env';
import express from 'express';
import cors from 'cors';
import type { GameType } from '@petdate/shared';
import { dbService, getDb } from './db';
import {
  hasElasticsearchConfig,
  hasPostgresConfig,
  hasRedisConfig,
  hasS3Config,
  infra,
} from './config/infra';
import { catalogRouter } from './routes/catalog';
import {
  consultationsRouter,
  prescriptionsFileRouter,
  prescriptionWebRouter,
} from './routes/consultations';
import path from 'path';
import { gamesRouter } from './routes/games';
import { petsRouter } from './routes/pets';
import { playdatesRouter } from './routes/playdates';
import { sectionsRouter } from './routes/sections';
import { usersRouter } from './routes/users';
import { authRouter } from './routes/auth';

getDb();

const app = express();
const PORT = Number(process.env.PORT) || 3001;

app.use(cors());
app.use(express.json());

// Brand assets (transparent logo for web Rx)
app.use(
  '/assets/brand',
  express.static(path.join(__dirname, 'assets', 'brand'), {
    maxAge: '1d',
    fallthrough: true,
  })
);
app.use(
  '/assets/brand',
  express.static(path.join(__dirname, '..', 'assets', 'brand'), {
    maxAge: '1d',
  })
);

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, service: 'petdate-api' });
});

app.get('/api/health/candoo', async (_req, res) => {
  const { candooBalance, isCandooConfigured } = await import('./services/candoo');
  if (!isCandooConfigured()) {
    res.status(503).json({ ok: false, configured: false, error: 'Candoo env missing' });
    return;
  }
  // Candoo /balance often 500 even when /send works — report sendReady separately.
  const bal = await candooBalance();
  res.status(200).json({
    ok: true,
    configured: true,
    sendReady: true,
    balanceOk: bal.ok,
    balance: bal.balance,
    balanceStatus: bal.status,
    balanceError: bal.ok ? undefined : bal.error,
  });
});

app.get('/api/health/infra', (_req, res) => {
  res.json({
    ok: true,
    service: 'petdate-api',
    storage: hasPostgresConfig() ? 'postgres' : 'sqlite',
    infra: {
      postgres: hasPostgresConfig(),
      redis: hasRedisConfig(),
      s3: hasS3Config(),
      elasticsearch: hasElasticsearchConfig(),
      telegramBot: Boolean(infra.telegram.botToken),
      webUrl: infra.web.url,
    },
  });
});

app.use('/api/catalog', catalogRouter);
app.use('/api/consultations', consultationsRouter);
app.use('/api/prescriptions', prescriptionsFileRouter);
app.use('/rx', prescriptionWebRouter);
app.use('/api/games', gamesRouter);
app.use('/api/pets', petsRouter);
app.use('/api/playdate-requests', playdatesRouter);
app.use('/api/sections', sectionsRouter);
app.use('/api/auth', authRouter);
app.use('/api/users', usersRouter);

app.get('/api/games-for-section/:sectionId', (req, res) => {
  const sectionId = Number(req.params.sectionId);
  if (Number.isNaN(sectionId)) {
    res.status(400).json({ error: 'شناسه سکشن نامعتبر است' });
    return;
  }
  const section = dbService.getSection(sectionId);
  if (!section) {
    res.status(404).json({ error: 'سکشن پیدا نشد' });
    return;
  }
  const games = dbService.listGames({ sectionId, status: 'open' });
  res.json({ section, games });
});

app.get('/api/my-section-games', (req, res) => {
  const telegramId = req.query.telegramId as string | undefined;
  const userId = req.query.userId ? Number(req.query.userId) : undefined;

  let user = telegramId ? dbService.getUserByTelegramId(telegramId) : null;
  if (!user && userId) user = dbService.getUserById(userId);

  if (!user) {
    res.status(404).json({ error: 'کاربر پیدا نشد' });
    return;
  }
  if (!user.sectionId) {
    res.status(400).json({ error: 'شما هنوز به سکشنی متصل نیستید', user });
    return;
  }

  const section = dbService.getSection(user.sectionId)!;
  const games = dbService.listGames({ sectionId: user.sectionId, status: 'open' });
  res.json({ user, section, games });
});

app.listen(PORT, () => {
  console.log(`🐾 petdate API روی پورت ${PORT} اجرا شد`);
});

export { app, dbService };
