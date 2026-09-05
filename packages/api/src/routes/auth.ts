import { Router } from 'express';
import type { OnboardingStatus, UserGender, UserRole } from '@petdate/shared';
import { USER_ROLES, normalizeRoles, primaryRole } from '@petdate/shared';
import { dbService } from '../db';
import {
  getUserFromBearer,
  requestWebOtp,
  verifyWebOtp,
  type WebOtpChannel,
} from '../services/web-otp';

export const authRouter = Router();

function parseChannel(value: unknown): WebOtpChannel | null {
  return value === 'phone' || value === 'email' ? value : null;
}

authRouter.post('/otp/request', async (req, res) => {
  const channel = parseChannel(req.body?.channel);
  const target = String(req.body?.target ?? '').trim();
  if (!channel) {
    res.status(400).json({ error: 'channel باید phone یا email باشد' });
    return;
  }
  if (!target) {
    res.status(400).json({ error: 'شماره یا ایمیل الزامی است' });
    return;
  }

  const result = await requestWebOtp(channel, target);
  if (!result.ok) {
    res.status(result.reason === 'cooldown' ? 429 : 400).json(result);
    return;
  }
  res.json(result);
});

authRouter.post('/otp/verify', (req, res) => {
  const channel = parseChannel(req.body?.channel);
  const target = String(req.body?.target ?? '').trim();
  const code = String(req.body?.code ?? '').trim();
  if (!channel || !target || !code) {
    res.status(400).json({ error: 'channel، target و code الزامی‌اند' });
    return;
  }

  const result = verifyWebOtp(channel, target, code);
  if (!result.ok) {
    res.status(400).json(result);
    return;
  }
  res.json({ ok: true, token: result.token, user: result.user });
});

authRouter.get('/me', (req, res) => {
  const session = getUserFromBearer(req.header('authorization') ?? undefined);
  if (!session) {
    res.status(401).json({ error: 'وارد نشده‌اید' });
    return;
  }
  res.json({ ok: true, user: session.user });
});

authRouter.post('/logout', (req, res) => {
  const session = getUserFromBearer(req.header('authorization') ?? undefined);
  if (session) dbService.deleteWebSession(session.token);
  res.json({ ok: true });
});

authRouter.patch('/profile', (req, res) => {
  const session = getUserFromBearer(req.header('authorization') ?? undefined);
  if (!session) {
    res.status(401).json({ error: 'وارد نشده‌اید' });
    return;
  }

  const body = req.body ?? {};
  const patch: Parameters<typeof dbService.updateUserProfile>[1] = {};
  if (body.name != null) patch.name = String(body.name).trim();
  if (body.age != null && Number.isFinite(Number(body.age))) patch.age = Number(body.age);
  if (body.gender === 'male' || body.gender === 'female') {
    patch.gender = body.gender as UserGender;
  }
  if (body.country != null) patch.country = String(body.country);
  if (body.province != null) patch.province = String(body.province);
  if (body.city != null) patch.city = String(body.city);
  if (body.bio != null) patch.bio = String(body.bio);
  if (Array.isArray(body.interests)) patch.interests = body.interests.map(String);
  if (body.avatarUrl != null) patch.avatarUrl = String(body.avatarUrl);
  if (
    body.onboarding === 'role_selected' ||
    body.onboarding === 'profile_incomplete' ||
    body.onboarding === 'profile_complete'
  ) {
    patch.onboarding = body.onboarding as OnboardingStatus;
  }

  const updated = dbService.updateUserProfile(session.user.id, patch);
  if (!updated) {
    res.status(404).json({ error: 'کاربر پیدا نشد' });
    return;
  }
  res.json({ ok: true, user: updated });
});

authRouter.patch('/roles', (req, res) => {
  const session = getUserFromBearer(req.header('authorization') ?? undefined);
  if (!session) {
    res.status(401).json({ error: 'وارد نشده‌اید' });
    return;
  }

  const rolesRaw = Array.isArray(req.body?.roles) ? req.body.roles : [];
  const roles = normalizeRoles(
    rolesRaw.filter((r: unknown): r is UserRole => USER_ROLES.includes(r as UserRole))
  );
  if (!roles.length) {
    res.status(400).json({ error: 'حداقل یک نقش معتبر لازم است' });
    return;
  }

  let updated = dbService.setUserRoles(session.user.id, roles);
  const primary = primaryRole(roles);
  if (primary) {
    updated = dbService.setUserPrimaryRole(session.user.id, primary) ?? updated;
  }
  if (!updated) {
    res.status(404).json({ error: 'کاربر پیدا نشد' });
    return;
  }
  res.json({ ok: true, user: updated });
});
