# کیف پول چندارزی (Multi-currency wallet)

کاربر دارای چهار موجودی است که در وب کنار آواتار پروفایل نمایش داده می‌شود.

| ارز | فیلد DB | معنی | واریز |
|-----|---------|------|--------|
| **سکه ربات** | `users.coins` | اقتصاد فعلی همبازی | فعال (جایزه، خرید کارت/Stars در بات) |
| **TON** | `users.wallet_ton` | Telegram Toncoin | فعلاً **فقط نمایش** — واریز on-chain stub |
| **Stars** | `users.wallet_stars` | **موجودی ستاره مشترک با ربات** (نه موجودی بومی Stars حساب تلگرام) | خرید سکه با پرداخت Stars در بات جداست؛ فروشگاه می‌تواند از `wallet_stars` کم کند |
| **تومان** | `users.wallet_toman` | IRT | فعلاً **فقط نمایش** — واریز بانکی به‌زودی |

## همگام‌سازی تلگرام (صفحه `/wallet`)

- اگر `telegram_id` روی کاربر نیست: دکمه «اتصال به تلگرام» لینک یک‌بارمصرف `t.me/Bot?start=wlink_<token>` می‌سازد؛ ربات با `POST /api/auth/telegram/link-complete` حساب را وصل می‌کند.
- اگر وصل است: وضعیت اتصال + موجودی ستاره از همان `GET /api/auth/wallet` (منبع مشترک با ربات) و دکمه همگام‌سازی/تازه‌سازی.
- ورود ربات→وب: لینک HMAC‌شده `/auth/telegram` → `POST /api/auth/telegram/exchange`.

## API

- `GET /api/auth/me` → `user.wallet` و فیلدهای `walletTon` / `walletStars` / `walletToman` / `coins` / `telegramId`
- `GET /api/auth/wallet` → `{ ok, wallet, coins, telegram: { linked, telegramId, username } }`
- `POST /api/auth/telegram/link-start` (Bearer) → deep link اتصال
- `POST /api/auth/telegram/link-complete` → تکمیل اتصال از ربات
- `POST /api/auth/telegram/exchange` → ورود وب از لینک امضاشده ربات
- `POST /api/admin/wallet/credit` (هدر `x-admin-password`)  
  body: `{ userId, currency: "ton"|"stars"|"coins"|"toman", amount }`  
  `amount` می‌تواند منفی باشد (برداشت، در صورت موجودی کافی)

## یادداشت

ستون جداگانه‌ای به نام `wallet_coins` نداریم؛ سکه ربات همان `coins` است تا منطق فعلی بات/لجر نشکند.
موجودی بومی Telegram Stars از Bot Payment API به‌عنوان «بالانس کیف» قابل خواندن نیست؛ همگام‌سازی یعنی همان `wallet_stars` محصول.
