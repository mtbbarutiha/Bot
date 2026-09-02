import { Router } from 'express';
import type { GameStatus, GameType } from '@petdate/shared';
import { dbService } from '../db';

export const gamesRouter = Router();

gamesRouter.get('/', (req, res) => {
  const sectionId = req.query.sectionId ? Number(req.query.sectionId) : undefined;
  const status = req.query.status as GameStatus | undefined;
  const gameType = req.query.gameType as GameType | undefined;
  const games = dbService.listGames({ sectionId, status, gameType });
  res.json(games);
});

gamesRouter.get('/:id', (req, res) => {
  const game = dbService.getGame(Number(req.params.id));
  if (!game) {
    res.status(404).json({ error: 'بازی پیدا نشد' });
    return;
  }
  const players = dbService.getGamePlayers(game.id);
  res.json({ ...game, players });
});

gamesRouter.post('/', (req, res) => {
  const { title, gameType, sectionId, hostUserId, location, scheduledAt, maxPlayers, description } =
    req.body;

  if (!title || !gameType || !hostUserId || !location || !scheduledAt) {
    res.status(400).json({ error: 'فیلدهای الزامی را پر کنید' });
    return;
  }

  const host = dbService.getUserById(Number(hostUserId));
  if (!host) {
    res.status(404).json({ error: 'میزبان پیدا نشد' });
    return;
  }

  const game = dbService.createGame({
    title,
    gameType,
    sectionId: sectionId ? Number(sectionId) : host.sectionId,
    hostUserId: Number(hostUserId),
    location,
    scheduledAt,
    maxPlayers: maxPlayers ? Number(maxPlayers) : 10,
    description,
  });
  res.status(201).json(game);
});

gamesRouter.post('/:id/join', (req, res) => {
  const { userId, telegramId } = req.body;
  let uid = userId ? Number(userId) : undefined;
  if (!uid && telegramId) {
    const user = dbService.getUserByTelegramId(telegramId);
    if (!user) {
      res.status(404).json({ error: 'کاربر پیدا نشد' });
      return;
    }
    uid = user.id;
  }
  if (!uid) {
    res.status(400).json({ error: 'شناسه کاربر لازم است' });
    return;
  }

  const result = dbService.joinGame(Number(req.params.id), uid);
  if (result.error) {
    res.status(400).json({ error: result.error, game: result.game });
    return;
  }
  res.json(result.game);
});
