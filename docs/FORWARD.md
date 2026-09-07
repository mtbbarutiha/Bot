# مسیر جلو — از ۱۴۰۴/۰۶/۱۶ (2026-09-07)

## ریپوی رسمی
- **https://github.com/mtbbarutiha/Bot** (تنها منبع رسمی؛ `petdat` استفاده نشود)

## برنچ رسمی
- **`cursor/stable-20260907-6c89`** (و `main` روی همین کامیت)
- برنچ‌های قدیمی Cursor محلی پاک شدند تا به نسخهٔ ناقص عقب نرویم.

## از این به بعد فقط CI/CD
1. تغییر روی همین برنچ / PR به `main`
2. GitHub Actions → **CI** (بیلد): https://github.com/mtbbarutiha/Bot/actions
3. GitHub Actions → **Deploy** با `confirm=deploy` و scope=`all`
4. دیپلوی دستی موازی با rsync ناقص ممنوع (باعث برگشت باگ‌ها می‌شود)
