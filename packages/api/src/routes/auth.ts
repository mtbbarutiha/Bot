import fs from 'fs';
import { Router } from 'express';
import multer from 'multer';
import type { OnboardingStatus, UserGender, UserRole } from '@petdate/shared';
import { USER_ROLES, normalizeRoles, userHasRole } from '@petdate/shared';
import { dbService } from '../db';
import {
  completeTelegramAttach,
  createTelegramAttachLink,
  exchangeTelegramWebLink,
} from '../services/telegram-web-link';
import {
  MAX_USER_AVATAR_BYTES,
  mimeFromUserAvatarKey,
  resolveUserAvatarPath,
  saveUserAvatar,
} from '../services/user-avatar-store';
import { rateLimit } from '../middleware/rate-limit';
import {
  getUserFromBearer,
  requestWebOtp,
  verifyWebOtp,
  type WebOtpChannel,
} from '../services/web-otp';

export const authRouter = Router();

const otpRequestLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 8,
  keyFn: (req) => `${String(req.body?.channel ?? '')}:${String(req.body?.target ?? '').trim()}`,
  message: 'درخواست کد زیاد شده. ۱۵ دقیقه صبر کن و دوباره تلاش کن.',
});

const otpVerifyLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  keyFn: (req) => `${String(req.body?.channel ?? '')}:${String(req.body?.target ?? '').trim()}`,
  message: 'تلاش‌های ورود زیاد است. کمی بعد دوباره تلاش کن.',
});

const avatarUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_USER_AVATAR_BYTES, files: 1 },
});

/**
 * Bot deep-link → web session (HMAC with TELEGRAM_BOT_TOKEN).
 * Keeps the same users row so pets/wallet sync between Telegram and the site.
 */
authRouter.post('/telegram/exchange', async (req, res) => {
  const result = await exchangeTelegramWebLink({
    telegramId: String(req.body?.telegramId ?? req.body?.tg ?? ''),
    exp: req.body?.exp,
    sig: String(req.body?.sig ?? ''),
  });
  if (!result.ok) {
    const status = result.reason === 'expired' ? 410 : 400;
    res.status(status).json(result);
    return;
  }
  res.json({ ok: true, token: result.token, user: result.user });
});

/**
 * Logged-in web user: create a one-time bot deep link to attach Telegram (wallet sync).
 */
authRouter.post('/telegram/link-start', (req, res) => {
  const session = getUserFromBearer(req.header('authorization') ?? undefined);
  if (!session) {
    res.status(401).json({ error: 'وارد نشده‌اید' });
    return;
  }
  const result = createTelegramAttachLink(session.user.id);
  if (!result.ok) {
    const status = result.reason === 'not_configured' ? 503 : 400;
    res.status(status).json(result);
    return;
  }
  res.json(result);
});

/**
 * Bot completes web→Telegram attach after /start wlink_<token>.
 * Auth is the one-time token (same pattern as other bot→API open calls).
 */
authRouter.post('/telegram/link-complete', async (req, res) => {
  const result = await completeTelegramAttach({
    token: String(req.body?.token ?? ''),
    telegramId: String(req.body?.telegramId ?? req.body?.tg ?? ''),
    username: req.body?.username != null ? String(req.body.username) : undefined,
    name: req.body?.name != null ? String(req.body.name) : undefined,
  });
  if (!result.ok) {
    const status =
      result.reason === 'expired'
        ? 410
        : result.reason === 'already_linked_other'
          ? 409
          : 400;
    res.status(status).json(result);
    return;
  }
  res.json({
    ok: true,
    user: result.user,
    merged: result.merged,
    wallet: result.wallet,
  });
});

function parseChannel(value: unknown): WebOtpChannel | null {
  return value === 'phone' || value === 'email' ? value : null;
}

authRouter.post('/otp/request', otpRequestLimit, async (req, res) => {
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

authRouter.post('/otp/verify', otpVerifyLimit, (req, res) => {
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

/** کیف پول چندارزی — TON / Stars / سکه ربات / تومان (همان منبع ربات) */
authRouter.get('/wallet', (req, res) => {
  const session = getUserFromBearer(req.header('authorization') ?? undefined);
  if (!session) {
    res.status(401).json({ error: 'وارد نشده‌اید' });
    return;
  }
  const user = dbService.getUserById(session.user.id) ?? session.user;
  const wallet = dbService.getWallet(user.id);
  if (!wallet) {
    res.status(404).json({ error: 'کاربر پیدا نشد' });
    return;
  }
  res.json({
    ok: true,
    wallet,
    /** coins همان سکه ربات است؛ برای سازگاری با کلاینت‌های قدیمی */
    coins: wallet.coins,
    telegram: {
      linked: Boolean(user.telegramId),
      telegramId: user.telegramId ?? null,
      username: user.username ?? null,
    },
  });
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

/** Upload profile avatar (multipart field: `file`). Auth required. Sets user.avatarUrl. */
authRouter.post('/avatar', (req, res) => {
  const session = getUserFromBearer(req.header('authorization') ?? undefined);
  if (!session) {
    res.status(401).json({ error: 'وارد نشده‌اید' });
    return;
  }

  avatarUpload.single('file')(req, res, (uploadErr) => {
    if (uploadErr) {
      const tooLarge =
        uploadErr instanceof multer.MulterError && uploadErr.code === 'LIMIT_FILE_SIZE';
      res.status(tooLarge ? 413 : 400).json({
        error: tooLarge
          ? 'حجم عکس بیش از حد مجاز است (حداکثر ۸ مگابایت)'
          : 'آپلود عکس ناموفق بود',
      });
      return;
    }

    const file = req.file;
    if (!file?.buffer?.length) {
      res.status(400).json({ error: 'فایل عکس الزامی است' });
      return;
    }

    try {
      const saved = saveUserAvatar({
        userId: session.user.id,
        originalName: file.originalname || 'avatar.jpg',
        mimeType: file.mimetype,
        buffer: file.buffer,
      });
      const updated = dbService.updateUserProfile(session.user.id, {
        avatarUrl: saved.urlPath,
        avatarCustom: true,
      });
      if (!updated) {
        res.status(404).json({ error: 'کاربر پیدا نشد' });
        return;
      }
      res.status(201).json({
        ok: true,
        url: saved.urlPath,
        storageKey: saved.storageKey,
        mimeType: file.mimetype,
        user: updated,
      });
    } catch (err) {
      if (err instanceof Error && err.message === 'FILE_TOO_LARGE') {
        res.status(413).json({ error: 'حجم عکس بیش از حد مجاز است (حداکثر ۸ مگابایت)' });
        return;
      }
      if (err instanceof Error && err.message === 'INVALID_MIME') {
        res.status(400).json({ error: 'فقط عکس (JPG، PNG، WebP، GIF) مجاز است' });
        return;
      }
      console.warn('user avatar upload failed:', (err as Error).message);
      res.status(500).json({ error: 'ذخیره عکس ناموفق بود' });
    }
  });
});

/** Serve an uploaded user avatar by storage key `userId/filename`. */
authRouter.get('/avatar/:userId/:filename', (req, res) => {
  const userId = String(req.params.userId || '');
  const filename = String(req.params.filename || '');
  const storageKey = `${userId}/${filename}`;
  const abs = resolveUserAvatarPath(storageKey);
  if (!abs || !fs.existsSync(abs)) {
    res.status(404).json({ error: 'عکس پیدا نشد' });
    return;
  }
  res.setHeader('Content-Type', mimeFromUserAvatarKey(storageKey));
  res.setHeader('Cache-Control', 'public, max-age=86400');
  res.send(fs.readFileSync(abs));
});

/** وضعیت آنلاین/آفلاین دامپزشک (وب — هم‌تراز ربات) */
authRouter.patch('/vet-online', (req, res) => {
  const session = getUserFromBearer(req.header('authorization') ?? undefined);
  if (!session) {
    res.status(401).json({ error: 'وارد نشده‌اید' });
    return;
  }
  if (!userHasRole(session.user, 'vet')) {
    res.status(403).json({ error: 'این بخش مخصوص دامپزشکان است' });
    return;
  }
  const online = Boolean(req.body?.online);
  const existing = dbService.getUserById(session.user.id) ?? session.user;
  if (online && existing.vetEnabled === false) {
    res.status(403).json({
      error: 'حساب دامپزشکی شما توسط مدیر غیرفعال شده است',
      reason: 'vet_disabled',
    });
    return;
  }
  const updated = dbService.setVetOnline(session.user.id, online);
  if (!updated) {
    res.status(400).json({ error: 'تغییر وضعیت آنلاین ممکن نشد' });
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

  const body = req.body ?? {};
  const roleCandidate =
    typeof body.role === 'string' && USER_ROLES.includes(body.role as UserRole)
      ? (body.role as UserRole)
      : null;

  // سوییچ نقش فعال بدون تغییر لیست نقش‌ها (مثل ربات: primaryOnly)
  if (body.primaryOnly === true) {
    if (!roleCandidate) {
      res.status(400).json({ error: 'نقش نامعتبر است' });
      return;
    }
    const updated = dbService.setUserPrimaryRole(session.user.id, roleCandidate);
    if (!updated) {
      res.status(400).json({ error: 'این نقش جزو نقش‌های شما نیست' });
      return;
    }
    res.json({ ok: true, user: updated });
    return;
  }

  const rolesRaw = Array.isArray(body.roles) ? body.roles : [];
  const roles = normalizeRoles(
    rolesRaw.filter((r: unknown): r is UserRole => USER_ROLES.includes(r as UserRole))
  );
  if (!roles.length) {
    res.status(400).json({ error: 'حداقل یک نقش معتبر لازم است' });
    return;
  }

  // setUserRoles نقش فعال قبلی را اگر هنوز در لیست باشد حفظ می‌کند
  let updated = dbService.setUserRoles(session.user.id, roles);
  if (!updated) {
    res.status(404).json({ error: 'کاربر پیدا نشد' });
    return;
  }

  // اختیاری: نقش فعال مشخص‌شده بعد از به‌روزرسانی لیست
  if (roleCandidate && roles.includes(roleCandidate)) {
    updated = dbService.setUserPrimaryRole(session.user.id, roleCandidate) ?? updated;
  }

  res.json({ ok: true, user: updated });
});
