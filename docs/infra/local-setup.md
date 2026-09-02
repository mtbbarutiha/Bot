# راه‌اندازی سریع زیرساخت محلی

این راهنما سرویس‌های پشتیبان petdate را با Docker Compose بالا می‌آورد. API فعلی همچنان از **SQLite** استفاده می‌کند؛ این سرویس‌ها برای مهاجرت تدریجی به PostgreSQL، Redis و ذخیره‌سازی تصاویر آماده‌اند.

## پیش‌نیاز

- [Docker](https://docs.docker.com/get-docker/) و Docker Compose v2
- Node.js 18+ و npm (برای اسکریپت‌های ریشه پروژه)

## ۱. متغیرهای محیطی

از ریشه مخزن:

```bash
cp .env.example .env
```

مقادیر پیش‌فرض با `docker-compose.yml` هم‌خوان هستند. در صورت نیاز `DATABASE_URL`، `REDIS_URL` و متغیرهای `S3_*` را ویرایش کنید.

## ۲. بالا آوردن سرویس‌ها

```bash
npm run infra:up
```

این دستور سه سرویس اصلی را در پس‌زمینه اجرا می‌کند:

| سرویس | پورت | کاربرد |
|--------|------|--------|
| PostgreSQL + PostGIS | 5432 | دیتابیس اصلی (آینده) |
| Redis | 6379 | کش و سرعت مچ/آنلاین |
| MinIO | 9000 (API)، 9001 (کنسول) | ذخیره تصاویر (S3-compatible) |

ورود به کنسول MinIO: http://localhost:9001 — کاربر/رمز پیش‌فرض: `petdate` / `petdate_secret`

## ۳. Elasticsearch (اختیاری — فاز بعد)

برای جستجوی پیشرفته (هنوز در API استفاده نمی‌شود):

```bash
docker compose --profile search up -d
```

آدرس پیش‌فرض: `http://localhost:9200` (`ELASTICSEARCH_URL` در `.env`).

## ۴. مشاهده لاگ‌ها و خاموش کردن

```bash
npm run infra:logs    # دنبال کردن لاگ همه سرویس‌ها
npm run infra:down    # توقف و حذف کانتینرها (داده volumeها باقی می‌ماند)
```

## ۵. اتصال API

تنظیمات زیرساخت در `packages/api/src/config/infra.ts` از `.env` خوانده می‌شود. تا زمانی که مهاجرت از SQLite انجام نشده، API همان فایل `petdate.db` را استفاده می‌کند.

برای تست اتصال Postgres (مثال):

```bash
psql "postgresql://petdate:petdate@localhost:5432/petdate" -c "SELECT PostGIS_Version();"
```

## عیب‌یابی

- **پورت اشغال است:** پورت‌های 5432، 6379 یا 9000 را در `docker-compose.yml` یا `.env` تغییر دهید.
- **کانتینر healthy نمی‌شود:** `docker compose ps` و `npm run infra:logs` را بررسی کنید.
- **داده از بین رفت:** `npm run infra:down` volumeها را حذف نمی‌کند؛ برای پاک‌سازی کامل: `docker compose down -v` (احتیاط: همه داده محلی پاک می‌شود).

جزئیات معماری: [../ARCHITECTURE.md](../ARCHITECTURE.md).
