/** Shared petdate brand copy — bot, web, channel */

/** Canonical public site (CDN + production). Use env overrides only for local/dev. */
export const SITE = {
  domain: 'petdate.ir',
  origin: 'https://petdate.ir',
  wwwOrigin: 'https://www.petdate.ir',
  email: 'hello@petdate.ir',
  telegramBot: 'https://t.me/Petdatebot',
  telegramBotUsername: 'Petdatebot',
} as const;

export const BRAND = {
  name: 'petdate',
  displayName: 'PET DATE',
  taglineEn: 'PLAY • MEET • FRIENDS',
  taglineFa: 'همبازی برای پت‌ات',
  shortDescriptionFa: '🐾 petdate — همبازی برای پت | PLAY • MEET • FRIENDS',
  descriptionFa:
    '🐾 petdate — پیدا کردن همبازی برای پت، مشاوره دامپزشک و خدمات پت\nPLAY • MEET • FRIENDS',
  welcomeFa: 'به petdate خوش اومدی — همبازی برای پت‌ات',
  botTitle: 'petdate',
  domain: SITE.domain,
  url: SITE.origin,
  email: SITE.email,
} as const;
