import { Router } from 'express';
import { dbService } from '../db';

export const presenceRouter = Router();

presenceRouter.use((_req, res, next) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  res.setHeader('Pragma', 'no-cache');
  next();
});

/** Batch presence: GET /api/presence?ids=1,2,3 */
presenceRouter.get('/', (req, res) => {
  const raw = typeof req.query.ids === 'string' ? req.query.ids : '';
  const ids = raw
    .split(',')
    .map((s) => Number(s.trim()))
    .filter((n) => Number.isFinite(n) && n > 0);
  if (!ids.length) {
    res.status(400).json({ error: 'ids الزامی است (مثلاً ids=1,2,3)' });
    return;
  }
  res.json(dbService.getUsersPresence(ids));
});

/** Alternate heartbeat: POST /api/presence/heartbeat { userId } */
presenceRouter.post('/heartbeat', (req, res) => {
  const userId = Number(req.body?.userId);
  if (!Number.isFinite(userId) || userId <= 0) {
    res.status(400).json({ error: 'userId الزامی است' });
    return;
  }
  const lastSeenAt = dbService.touchUserLastSeen(userId);
  if (lastSeenAt == null) {
    res.status(404).json({ error: 'کاربر پیدا نشد' });
    return;
  }
  const presence = dbService.getUserPresence(userId);
  res.json(presence);
});

/** GET /api/presence/:id */
presenceRouter.get('/:id', (req, res) => {
  const userId = Number(req.params.id);
  if (!Number.isFinite(userId) || userId <= 0) {
    res.status(400).json({ error: 'شناسه نامعتبر' });
    return;
  }
  const presence = dbService.getUserPresence(userId);
  if (!presence) {
    res.status(404).json({ error: 'کاربر پیدا نشد' });
    return;
  }
  res.json(presence);
});
