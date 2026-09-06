# Web «ارتباط با پزشک» ↔ Bot «ارتباط سریع با پزشک»

Live URL: http://185.110.189.218/vet-consult

Web mirrors the **production Telegram bot** quick-vet flow (`packages/bot/src/handlers/services.ts`).

## Mirrored steps

| Step | Bot | Web |
|------|-----|-----|
| Entry | Menu `⚡ ارتباط سریع با پزشک` | Nav / home → `/vet-consult` |
| Login | `/start` user | AuthGuard (OTP session) |
| Pet prerequisite | `ensurePatientHasPetForVet` — block + guide to add pet | Same copy + CTA to `/add-pet` |
| Cost | `QUICK_VET_COST` (1 سکه ربات) | Same constant from `@petdate/shared` |
| Insufficient coins | Alert + guide to «🪙 سکه» | Error + deep-link to Telegram bot wallet |
| Connect CTA | `🩺 به یه پزشک آنلاین وصلم کن` | Same button label |
| Match vets | `listVerifiedVets()` — online, enabled, prefer phone-verified; exclude self; require `telegramId` | Same API via `POST /api/consultations/quick-connect` |
| Debit | `debitUserCoins` before notify | `dbService.debitCoins` in quick-connect |
| Create requests | One `vet_consultations` row per online vet (`notes: اتصال سریع آنلاین`) | Same |
| Notify vets | Telegram message + `✅ قبول` / `❌ رد` (`vet:consult:accept|reject`) | Same payload from API (`telegram-vet-consult-notify`) |
| Notify fail | Refund coins | Same refund + error |
| Success copy | sent count + coins deducted + wait | Same Persian lines |
| Chat handoff | Bot `startVetChat` in Telegram | Web shows waiting / connected status + deep-link to `@Petdatebot` (chat remains Telegram-only, not a fake web consult product) |
| Status poll | TG messages | Web polls `GET /api/consultations?patientUserId=` for `active` |

## Intentionally not faked on web

- No chat/call/video pricing cards (old placeholder removed)
- No schedule / date booking UI
- Consult chat, Rx, medical record stay on the bot after accept

## API

- `POST /api/consultations/quick-connect` — full bot-parity connect
- `GET /api/consultations?patientUserId=` — patient status list (extended from vet-only filter)
