# کیف پول چندارزی (Multi-currency wallet)

کاربر دارای چهار موجودی است که در وب کنار آواتار پروفایل نمایش داده می‌شود.

| ارز | فیلد DB | معنی | واریز |
|-----|---------|------|--------|
| **سکه ربات** | `users.coins` | اقتصاد فعلی همبازی | فعال (جایزه، خرید کارت/Stars در بات) |
| **TON** | `users.wallet_ton` | Telegram Toncoin | فعلاً **فقط نمایش** — واریز on-chain stub |
| **Stars** | `users.wallet_stars` | ستاره نگه‌داری‌شده | فعلاً **فقط نمایش** — پرداخت Stars در بات برای *خرید سکه* جداست |
| **تومان** | `users.wallet_toman` | IRT | فعلاً **فقط نمایش** — واریز بانکی به‌زودی |

## API

- `GET /api/auth/me` → `user.wallet` و فیلدهای `walletTon` / `walletStars` / `walletToman` / `coins`
- `GET /api/auth/wallet` → `{ ok, wallet, coins }`
- `POST /api/admin/wallet/credit` (هدر `x-admin-password`)  
  body: `{ userId, currency: "ton"|"stars"|"coins"|"toman", amount }`  
  `amount` می‌تواند منفی باشد (برداشت، در صورت موجودی کافی)

## یادداشت

ستون جداگانه‌ای به نام `wallet_coins` نداریم؛ سکه ربات همان `coins` است تا منطق فعلی بات/لجر نشکند.
