import { Router } from 'express';
import { dbService } from '../db';

export const sectionsRouter = Router();

sectionsRouter.get('/', (_req, res) => {
  res.json(dbService.listSections());
});

sectionsRouter.get('/:id', (req, res) => {
  const section = dbService.getSection(Number(req.params.id));
  if (!section) {
    res.status(404).json({ error: 'سکشن پیدا نشد' });
    return;
  }
  res.json(section);
});

sectionsRouter.post('/', (req, res) => {
  const { name, description, city } = req.body;
  if (!name) {
    res.status(400).json({ error: 'نام سکشن الزامی است' });
    return;
  }
  const section = dbService.createSection({ name, description, city });
  res.status(201).json(section);
});

sectionsRouter.get('/:id/games', (req, res) => {
  const sectionId = Number(req.params.id);
  const section = dbService.getSection(sectionId);
  if (!section) {
    res.status(404).json({ error: 'سکشن پیدا نشد' });
    return;
  }
  const games = dbService.listGames({ sectionId, status: 'open' });
  res.json({ section, games });
});
