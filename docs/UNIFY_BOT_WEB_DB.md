# یکسان‌سازی دیتابیس ربات و وب (unify bot↔web DB)

## علت باگ

حذف حساب **soft-delete** بود: `telegram_id` و شماره جدا می‌شد، ولی **پت‌ها روی همان `owner_id` می‌ماندند** و فیلدهایی مثل **ایمیل** پاک نمی‌شد. با ثبت‌نام دوباره (یا merge هویت وب↔تلگرام با ایمیل)، پت‌های قبلی برمی‌گشتند.

ربات دیتابیس جدا برای کاربر/پت ندارد؛ از API می‌خواند. تنها SQLite زنده:

`/opt/petdate/packages/api/data/petdate.db`

`DATABASE_URL` (Postgres) روی VPS ست بود ولی Postgres نصب/فعال نبود — مانیتورینگ به‌اشتباه «postgres» نشان می‌داد؛ داده واقعی همیشه SQLite بود.

## چه چیزی sync شد

| جزء | منبع حقیقت |
|-----|------------|
| کاربران / پت‌ها / چت / کیف | SQLite API (`DATABASE_PATH` مطلق) |
| ربات | فقط HTTP به API + `sessions.json` / Redis برای session UI |
| pm2 `petdate-api` و `petdate-bot` | هر دو `DATABASE_PATH=/opt/petdate/packages/api/data/petdate.db` |

## حذف حساب از این به بعد

1. حذف همه پت‌های کاربر (+ playdateهای وابسته)
2. پاک‌سازی session وب، OTP، contact/block، توکن‌های attach/login
3. حذف consult دامپزشکی مرتبط
4. صفر کردن سکه/کیف و پاک کردن phone/email/telegram/roles
5. ردیف ناشناس `[حذف‌شده #id]` برای تاریخچه FK می‌ماند؛ `/start` کاربر **جدید** با **۰ پت** می‌سازد
