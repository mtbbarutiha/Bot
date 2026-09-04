import { Router } from 'express';
import type { OnboardingStatus, UserRole } from '@petdate/shared';
import { ONBOARDING_STATUS_LABELS, USER_ROLES } from '@petdate/shared';
import { dbService } from '../db';
import { sendPhoneOtp, verifyPhoneOtp } from '../services/phone-otp';

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

usersRouter.get('/id/:id', (req, res) => {
  const user = dbService.getUserById(Number(req.params.id));
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
  const { role, roles } = req.body ?? {};

  if (Array.isArray(roles)) {
    const parsed = roles.filter(isUserRole) as UserRole[];
    if (parsed.length === 0) {
      res.status(400).json({ error: 'حداقل یک نقش معتبر لازم است' });
      return;
    }
    const user = dbService.setUserRolesByTelegramId(req.params.telegramId, parsed);
    if (!user) {
      res.status(404).json({ error: 'کاربر پیدا نشد' });
      return;
    }
    res.json(user);
    return;
  }

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

usersRouter.patch('/:id/role', (req, res) => {
  const { role, roles } = req.body ?? {};

  if (Array.isArray(roles)) {
    const parsed = roles.filter(isUserRole) as UserRole[];
    if (parsed.length === 0) {
      res.status(400).json({ error: 'حداقل یک نقش معتبر لازم است' });
      return;
    }
    const user = dbService.setUserRoles(Number(req.params.id), parsed);
    if (!user) {
      res.status(404).json({ error: 'کاربر پیدا نشد' });
      return;
    }
    res.json(user);
    return;
  }

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

usersRouter.patch('/telegram/:telegramId/profile', (req, res) => {
  const patch = req.body ?? {};
  const user = dbService.updateUserProfileByTelegramId(req.params.telegramId, {
    name: patch.name,
    age: patch.age != null ? Number(patch.age) : undefined,
    gender: patch.gender,
    country: patch.country,
    city: patch.city,
    province: patch.province,
    phone: patch.phone,
    bio: patch.bio,
    interests: Array.isArray(patch.interests) ? patch.interests.map(String) : undefined,
    avatarUrl: patch.avatarUrl,
    coins: patch.coins != null ? Number(patch.coins) : undefined,
    onboarding: patch.onboarding,
    isActive: typeof patch.isActive === 'boolean' ? patch.isActive : undefined,
  });
  if (!user) {
    res.status(404).json({ error: 'کاربر پیدا نشد' });
    return;
  }
  res.json(user);
});

usersRouter.patch('/telegram/:telegramId/active', (req, res) => {
  const isActive = Boolean(req.body?.isActive);
  const user = dbService.setUserActiveByTelegramId(req.params.telegramId, isActive);
  if (!user) {
    res.status(404).json({ error: 'کاربر پیدا نشد' });
    return;
  }
  res.json(user);
});

usersRouter.delete('/telegram/:telegramId', (req, res) => {
  const ok = dbService.deleteUserByTelegramId(req.params.telegramId);
  if (!ok) {
    res.status(404).json({ error: 'کاربر پیدا نشد' });
    return;
  }
  res.json({ ok: true });
});

usersRouter.patch('/:id/profile', (req, res) => {
  const patch = req.body ?? {};
  const user = dbService.updateUserProfile(Number(req.params.id), {
    name: patch.name,
    age: patch.age != null ? Number(patch.age) : undefined,
    gender: patch.gender,
    country: patch.country,
    city: patch.city,
    province: patch.province,
    phone: patch.phone,
    bio: patch.bio,
    interests: Array.isArray(patch.interests) ? patch.interests.map(String) : undefined,
    avatarUrl: patch.avatarUrl,
    coins: patch.coins != null ? Number(patch.coins) : undefined,
    onboarding: patch.onboarding,
    isActive: typeof patch.isActive === 'boolean' ? patch.isActive : undefined,
  });
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

/** صف احراز هویت در انتظار بررسی ادمین */
usersRouter.get('/verification/pending', (_req, res) => {
  res.json(dbService.listPendingVerifications());
});

/** ارسال درخواست احراز هویت (عکس پروفایل / سلفی) */
usersRouter.post('/telegram/:telegramId/verification', (req, res) => {
  const user = dbService.getUserByTelegramId(req.params.telegramId);
  if (!user) {
    res.status(404).json({ error: 'کاربر پیدا نشد' });
    return;
  }
  const photoFileId = String(
    req.body?.photoFileId ?? req.body?.verificationPhotoFileId ?? user.avatarUrl ?? ''
  ).trim();
  const result = dbService.submitVerification(user.id, photoFileId);
  if (!result.ok) {
    const status =
      result.reason === 'missing'
        ? 404
        : result.reason === 'already_verified'
          ? 409
          : 400;
    res.status(status).json({
      ok: false,
      reason: result.reason,
      error:
        result.reason === 'already_verified'
          ? 'قبلاً احراز شده‌ای'
          : result.reason === 'no_photo'
            ? 'عکس احراز لازم است'
            : 'کاربر پیدا نشد',
    });
    return;
  }
  res.json({ ok: true, user: result.user });
});

usersRouter.post('/:id/verification/approve', (req, res) => {
  const reward =
    req.body?.rewardCoins != null ? Number(req.body.rewardCoins) : Number(process.env.FACE_VERIFY_REWARD ?? 100);
  const user = dbService.approveVerification(Number(req.params.id), Number.isFinite(reward) ? reward : 100);
  if (!user) {
    res.status(404).json({ error: 'درخواست احراز پیدا نشد یا در صف نیست' });
    return;
  }
  res.json({ ok: true, user, rewardCoins: Number.isFinite(reward) ? reward : 100 });
});

/** دامپزشک‌های واجد شرایط اتصال سریع (نقش vet؛ ترجیح phoneVerified) */
usersRouter.get('/vets/verified', (_req, res) => {
  res.json(dbService.listVerifiedVets());
});

usersRouter.post('/telegram/:telegramId/coins/debit', (req, res) => {
  const user = dbService.getUserByTelegramId(req.params.telegramId);
  if (!user) {
    res.status(404).json({ error: 'کاربر پیدا نشد' });
    return;
  }
  const amount = Number(req.body?.amount ?? 0);
  if (!Number.isFinite(amount) || amount <= 0) {
    res.status(400).json({ error: 'مقدار نامعتبر' });
    return;
  }
  const updated = dbService.debitCoins(user.id, amount);
  if (!updated) {
    res.status(400).json({ error: 'سکه کافی نیست', reason: 'insufficient' });
    return;
  }
  res.json(updated);
});

usersRouter.post('/telegram/:telegramId/coins/credit', (req, res) => {
  const user = dbService.getUserByTelegramId(req.params.telegramId);
  if (!user) {
    res.status(404).json({ error: 'کاربر پیدا نشد' });
    return;
  }
  const amount = Number(req.body?.amount ?? 0);
  if (!Number.isFinite(amount) || amount <= 0) {
    res.status(400).json({ error: 'مقدار نامعتبر' });
    return;
  }
  const updated = dbService.creditCoins(user.id, amount);
  res.json(updated);
});

/** ارسال OTP احراز موبایل (Candoo) */
usersRouter.post('/telegram/:telegramId/phone/send-otp', async (req, res) => {
  const user = dbService.getUserByTelegramId(req.params.telegramId);
  if (!user) {
    res.status(404).json({ error: 'کاربر پیدا نشد' });
    return;
  }
  const phone = String(req.body?.phone ?? '').trim();
  const result = await sendPhoneOtp(user.id, phone);
  if (!result.ok) {
    const status =
      result.reason === 'invalid_phone'
        ? 400
        : result.reason === 'not_configured'
          ? 503
          : result.reason === 'cooldown'
            ? 429
            : result.reason === 'send_failed'
              ? 502
              : 400;
    res.status(status).json({
      ok: false,
      reason: result.reason,
      error: result.error,
      retryAfterSec: result.retryAfterSec,
    });
    return;
  }
  res.json({
    ok: true,
    phone: result.phone,
    expiresAt: result.expiresAt,
  });
});

/** تأیید OTP احراز موبایل */
usersRouter.post('/telegram/:telegramId/phone/verify-otp', (req, res) => {
  const user = dbService.getUserByTelegramId(req.params.telegramId);
  if (!user) {
    res.status(404).json({ error: 'کاربر پیدا نشد' });
    return;
  }
  const phone = String(req.body?.phone ?? '').trim();
  const code = String(req.body?.code ?? '').trim();
  const result = verifyPhoneOtp(user.id, phone, code);
  if (!result.ok) {
    const status =
      result.reason === 'invalid_phone' || result.reason === 'mismatch'
        ? 400
        : result.reason === 'expired' || result.reason === 'no_otp' || result.reason === 'too_many'
          ? 400
          : 400;
    res.status(status).json({
      ok: false,
      reason: result.reason,
      attemptsLeft: result.attemptsLeft,
      error:
        result.reason === 'mismatch'
          ? `کد نادرست است${result.attemptsLeft != null ? ` (${result.attemptsLeft} تلاش باقی‌مانده)` : ''}`
          : result.reason === 'expired'
            ? 'کد منقضی شده؛ دوباره درخواست بده'
            : result.reason === 'too_many'
              ? 'تعداد تلاش بیش از حد؛ دوباره درخواست کد بده'
              : result.reason === 'no_otp'
                ? 'کدی برای این شماره ثبت نشده'
                : 'تأیید ناموفق',
    });
    return;
  }
  res.json({ ok: true, user: result.user });
});

usersRouter.post('/:id/verification/reject', (req, res) => {
  const note = req.body?.note != null ? String(req.body.note) : undefined;
  const user = dbService.rejectVerification(Number(req.params.id), note);
  if (!user) {
    res.status(404).json({ error: 'درخواست احراز پیدا نشد یا در صف نیست' });
    return;
  }
  res.json({ ok: true, user });
});

/** صف مدارک دامپزشک در انتظار بررسی */
usersRouter.get('/vet-credentials/pending', (_req, res) => {
  res.json(dbService.listPendingVetCredentials());
});

/** آپلود مدرک دامپزشک */
usersRouter.post('/telegram/:telegramId/vet-credential', (req, res) => {
  const user = dbService.getUserByTelegramId(req.params.telegramId);
  if (!user) {
    res.status(404).json({ error: 'کاربر پیدا نشد' });
    return;
  }
  const fileId = String(req.body?.fileId ?? req.body?.vetCredentialFileId ?? '').trim();
  const result = dbService.submitVetCredential(user.id, fileId);
  if (!result.ok) {
    res.status(result.reason === 'missing' ? 404 : 400).json({
      ok: false,
      reason: result.reason,
      error: result.reason === 'no_file' ? 'فایل مدرک لازم است' : 'کاربر پیدا نشد',
    });
    return;
  }
  res.json({ ok: true, user: result.user });
});

usersRouter.post('/:id/vet-credential/approve', (req, res) => {
  const user = dbService.approveVetCredential(Number(req.params.id));
  if (!user) {
    res.status(404).json({ error: 'مدرک در صف نیست' });
    return;
  }
  res.json({ ok: true, user });
});

usersRouter.post('/:id/vet-credential/reject', (req, res) => {
  const user = dbService.rejectVetCredential(Number(req.params.id));
  if (!user) {
    res.status(404).json({ error: 'مدرک در صف نیست' });
    return;
  }
  res.json({ ok: true, user });
});

/** دریافت سکه روزانه */
usersRouter.post('/telegram/:telegramId/coins/daily', (req, res) => {
  const user = dbService.getUserByTelegramId(req.params.telegramId);
  if (!user) {
    res.status(404).json({ error: 'کاربر پیدا نشد' });
    return;
  }
  const amount = req.body?.amount != null ? Number(req.body.amount) : 10;
  const result = dbService.claimDailyCoins(user.id, Number.isFinite(amount) ? amount : 10);
  if (!result.ok) {
    res.status(result.reason === 'already' ? 409 : 404).json({
      error: result.reason === 'already' ? 'امروز سکه روزانه را گرفتی' : 'کاربر پیدا نشد',
      user: result.user,
      reason: result.reason,
    });
    return;
  }
  res.json({ ok: true, awarded: result.awarded, user: result.user });
});

/** وضعیت درخواست فروش باز */
usersRouter.get('/telegram/:telegramId/coins/sell/open', (req, res) => {
  const user = dbService.getUserByTelegramId(req.params.telegramId);
  if (!user) {
    res.status(404).json({ error: 'کاربر پیدا نشد' });
    return;
  }
  res.json({ open: dbService.userHasOpenCoinSell(user.id) });
});

/** ثبت درخواست فروش سکه */
usersRouter.post('/telegram/:telegramId/coins/sell', (req, res) => {
  const user = dbService.getUserByTelegramId(req.params.telegramId);
  if (!user) {
    res.status(404).json({ error: 'کاربر پیدا نشد' });
    return;
  }
  const coins = Number(req.body?.coins);
  const cardNumber = String(req.body?.cardNumber ?? '');
  const rateToman = req.body?.rateToman != null ? Number(req.body.rateToman) : 1000;
  const minCoins = req.body?.minCoins != null ? Number(req.body.minCoins) : 50;

  if (!cardNumber || cardNumber.length < 16) {
    res.status(400).json({ error: 'شماره کارت نامعتبر', reason: 'card' });
    return;
  }

  const result = dbService.submitCoinSell({
    userId: user.id,
    coins,
    rateToman: Number.isFinite(rateToman) ? rateToman : 1000,
    cardNumber,
    minCoins: Number.isFinite(minCoins) ? minCoins : 50,
  });

  if (!result.ok) {
    const status =
      result.reason === 'missing' ? 404 : result.reason === 'pending' ? 409 : 400;
    res.status(status).json({ ok: false, reason: result.reason });
    return;
  }

  res.status(201).json({
    ok: true,
    requestId: result.requestId,
    amountToman: result.amountToman,
    rateToman: result.rateToman,
    user: result.user,
  });
});
