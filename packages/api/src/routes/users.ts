import { Router } from 'express';
import type { OnboardingStatus, UserRole } from '@petdate/shared';
import { ONBOARDING_STATUS_LABELS, USER_ROLES } from '@petdate/shared';
import { dbService } from '../db';

export const usersRouter = Router();

function isUserRole(value: unknown): value is UserRole {
  return typeof value === 'string' && USER_ROLES.includes(value as UserRole);
}

usersRouter.post('/register', (req, res) => {
  const { telegramId, name, username } = req.body;
  if (!name) {
    res.status(400).json({ error: 'نام الزامی است' });
    return;
  }
  const user = dbService.findOrCreateUser({ telegramId, name, username });
  res.json(user);
});

usersRouter.get('/telegram/:telegramId', (req, res) => {
  const user = dbService.getUserByTelegramId(req.params.telegramId);
  if (!user) {
    res.status(404).json({ error: 'کاربر پیدا نشد' });
    return;
  }
  res.json(user);
});

function isOnboardingStatus(value: unknown): value is OnboardingStatus {
  return typeof value === 'string' && value in ONBOARDING_STATUS_LABELS;
}

usersRouter.patch('/telegram/:telegramId/role', (req, res) => {
  const { role } = req.body;
  if (!isUserRole(role)) {
    res.status(400).json({ error: 'نقش نامعتبر است' });
    return;
  }
  const user = dbService.setUserRoleByTelegramId(req.params.telegramId, role);
  if (!user) {
    res.status(404).json({ error: 'کاربر پیدا نشد' });
    return;
  }
  res.json(user);
});

usersRouter.patch('/telegram/:telegramId/onboarding', (req, res) => {
  const { onboarding } = req.body;
  if (!isOnboardingStatus(onboarding)) {
    res.status(400).json({ error: 'وضعیت آنبوردینگ نامعتبر است' });
    return;
  }
  const user = dbService.setUserOnboardingByTelegramId(req.params.telegramId, onboarding);
  if (!user) {
    res.status(404).json({ error: 'کاربر پیدا نشد' });
    return;
  }
  res.json(user);
});

usersRouter.patch('/:id/role', (req, res) => {
  const { role } = req.body;
  if (!isUserRole(role)) {
    res.status(400).json({ error: 'نقش نامعتبر است' });
    return;
  }
  const user = dbService.setUserRole(Number(req.params.id), role);
  if (!user) {
    res.status(404).json({ error: 'کاربر پیدا نشد' });
    return;
  }
  res.json(user);
});

usersRouter.patch('/:id/onboarding', (req, res) => {
  const { onboarding } = req.body;
  if (!isOnboardingStatus(onboarding)) {
    res.status(400).json({ error: 'وضعیت آنبوردینگ نامعتبر است' });
    return;
  }
  const user = dbService.setUserOnboarding(Number(req.params.id), onboarding);
  if (!user) {
    res.status(404).json({ error: 'کاربر پیدا نشد' });
    return;
  }
  res.json(user);
});

usersRouter.patch('/:id/section', (req, res) => {
  const { sectionId } = req.body;
  const user = dbService.setUserSection(Number(req.params.id), sectionId ?? null);
  if (!user) {
    res.status(404).json({ error: 'کاربر پیدا نشد' });
    return;
  }
  res.json(user);
});
