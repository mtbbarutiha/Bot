# petdate

پیدا کردن همبازی برای پت — monorepo for the Pet Date Telegram bot, API, and web app.

## Packages

- `packages/api` — backend API
- `packages/bot` — Telegram bot
- `packages/web` — desktop/web OTP login and landing
- `packages/shared` — shared types and utilities

## Quick start

```bash
npm install
npm run infra:up
npm run dev:api
npm run dev:bot
npm run dev
```

See `MOBILE.md` for opening the web UI on a phone.
