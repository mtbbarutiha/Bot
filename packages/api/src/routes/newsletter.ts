import { Router } from 'express';
import { SITE } from '@petdate/shared';
import { dbService } from '../db';
import { rateLimit } from '../middleware/rate-limit';

export const newsletterRouter = Router();

const subscribeLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 12,
  keyFn: (req) => String(req.body?.email ?? req.ip ?? '').trim().toLowerCase(),
  message: 'درخواست عضویت زیاد شده. کمی بعد دوباره تلاش کن.',
});

function isPlausibleEmail(value: string): boolean {
  if (!value || value.length > 254) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

/**
 * Public footer newsletter signup.
 * From identity for later sends: SITE.newsletterEmail (news@petdate.ir).
 */
newsletterRouter.post('/subscribe', subscribeLimit, (req, res) => {
  const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
  const source =
    typeof req.body?.source === 'string' && req.body.source.trim()
      ? req.body.source.trim().slice(0, 64)
      : 'footer';

  if (!isPlausibleEmail(email)) {
    res.status(400).json({ error: 'یک ایمیل معتبر وارد کن.' });
    return;
  }

  const result = dbService.upsertNewsletterSubscriber(email, source);
  res.status(result.created ? 201 : 200).json({
    ok: true,
    created: result.created,
    from: SITE.newsletterEmail,
    message: result.created
      ? 'ثبت شد — خبرها را از news@petdate.ir می‌فرستیم.'
      : 'این ایمیل از قبل عضو خبرنامه است.',
  });
});
