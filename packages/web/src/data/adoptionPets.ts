/** Pepito adoption pets — shared by landing cards and detail pages */

const P = '/pepito/uploads';

export type AdoptionDetail = { label: string; value: string };

export type AdoptionPet = {
  slug: string;
  name: string;
  img: string;
  bannerImg: string;
  gallery: string[];
  details: AdoptionDetail[];
  about: string;
  traits: string[];
  rules: string;
};

export const ADOPTION_PETS: AdoptionPet[] = [
  {
    slug: 'missy',
    name: 'میسی',
    img: `${P}/01-2.jpg`,
    bannerImg: `${P}/01-2.jpg`,
    gallery: [`${P}/01-2.jpg`, `${P}/01.jpg`, `${P}/09-2.jpg`],
    details: [
      { label: 'جنسیت', value: 'ماده' },
      { label: 'عقیم‌شده', value: 'خیر' },
      { label: 'سن', value: '۵ سال' },
      { label: 'نژاد', value: 'میکس' },
      { label: 'واکسینه‌شده', value: 'بله' },
      { label: 'اندازه', value: 'متوسط' },
    ],
    about: 'میسی سگی مهربان و آرام است و آمادهٔ خانهٔ جدیدش!',
    traits: ['دوستدار سگ‌های دیگر', 'مناسب آپارتمان', 'سازگار با کودکان'],
    rules:
      'پذیرش نیازمند بازدید حضوری، تعهد به مراقبت مسئولانه و تکمیل فرم پذیرش است.',
  },
  {
    slug: 'bella',
    name: 'بلا',
    img: `${P}/02-2.jpg`,
    bannerImg: `${P}/02-2.jpg`,
    gallery: [`${P}/02-2.jpg`, `${P}/02.jpg`, `${P}/09-2.jpg`],
    details: [
      { label: 'جنسیت', value: 'نر' },
      { label: 'عقیم‌شده', value: 'خیر' },
      { label: 'سن', value: '۳ سال' },
      { label: 'نژاد', value: 'میکس' },
      { label: 'واکسینه‌شده', value: 'بله' },
      { label: 'اندازه', value: 'بزرگ' },
    ],
    about: 'بلا پرانرژی و وفادار است؛ عاشق بازی و پیاده‌روی طولانی!',
    traits: ['دوستدار سگ‌های دیگر', 'نیازمند فضای باز', 'سازگار با کودکان'],
    rules:
      'پذیرش نیازمند بازدید حضوری، تعهد به مراقبت مسئولانه و تکمیل فرم پذیرش است.',
  },
  {
    slug: 'kitty',
    name: 'کیتی',
    img: `${P}/03-2.jpg`,
    bannerImg: `${P}/03-2.jpg`,
    gallery: [`${P}/03-2.jpg`, `${P}/03.jpg`, `${P}/09-2.jpg`],
    details: [
      { label: 'جنسیت', value: 'ماده' },
      { label: 'عقیم‌شده', value: 'بله' },
      { label: 'سن', value: '۲ سال' },
      { label: 'نژاد', value: 'میکس' },
      { label: 'واکسینه‌شده', value: 'بله' },
      { label: 'اندازه', value: 'کوچک' },
    ],
    about: 'کیتی بازیگوش و کنجکاو است و به‌راحتی با خانواده خو می‌گیرد.',
    traits: ['دوستدار گربه‌های دیگر', 'مناسب آپارتمان', 'سازگار با کودکان'],
    rules:
      'پذیرش نیازمند بازدید حضوری، تعهد به مراقبت مسئولانه و تکمیل فرم پذیرش است.',
  },
  {
    slug: 'penny',
    name: 'پنی',
    img: `${P}/04-2.jpg`,
    bannerImg: `${P}/5.jpg`,
    gallery: [`${P}/adoption.jpg`, `${P}/04-2.jpg`, `${P}/09-2.jpg`],
    details: [
      { label: 'جنسیت', value: 'نر' },
      { label: 'عقیم‌شده', value: 'خیر' },
      { label: 'سن', value: '۱ سال' },
      { label: 'نژاد', value: 'بیگل' },
      { label: 'واکسینه‌شده', value: 'بله' },
      { label: 'اندازه', value: 'متوسط' },
    ],
    about: 'پنی سگی بسیار شیرین و فعال است و آمادهٔ خانهٔ جدیدش!',
    traits: ['دوستدار سگ‌های دیگر', 'مناسب آپارتمان', 'سازگار با کودکان'],
    rules:
      'پذیرش نیازمند بازدید حضوری، تعهد به مراقبت مسئولانه و تکمیل فرم پذیرش است.',
  },
];

export function getAdoptionPet(slug: string | undefined): AdoptionPet | undefined {
  if (!slug) return undefined;
  return ADOPTION_PETS.find((p) => p.slug === slug);
}
