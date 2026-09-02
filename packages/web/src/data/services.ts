export interface Clinic {
  id: number;
  name: string;
  address: string;
  neighborhood: string;
  phone: string;
  rating: number;
  openHours: string;
  lat: number;
  lng: number;
  services: string[];
}

export interface ShopProduct {
  id: number;
  name: string;
  price: number;
  category: string;
  imageEmoji: string;
  description: string;
  inStock: boolean;
}

export const MOCK_CLINICS: Clinic[] = [
  {
    id: 1,
    name: 'کلینیک دامپزشکی ونک',
    address: 'تهران، ونک، خیابان ملاصدرا',
    neighborhood: 'ونک',
    phone: '۰۲۱-۸۸۷۷۶۶۵۵',
    rating: 4.8,
    openHours: '۹ تا ۲۱',
    lat: 35.7575,
    lng: 51.41,
    services: ['واکسیناسیون', 'جراحی', 'اورژانس'],
  },
  {
    id: 2,
    name: 'بیمارستان حیوانات پارس',
    address: 'تهران، سعادت‌آباد، میدان کاج',
    neighborhood: 'سعادت‌آباد',
    phone: '۰۲۱-۴۴۵۵۶۶۷۷',
    rating: 4.6,
    openHours: '۲۴ ساعته',
    lat: 35.78,
    lng: 51.37,
    services: ['اورژانس', 'آزمایشگاه', 'رادیولوژی'],
  },
  {
    id: 3,
    name: 'کلینیک پت‌لایف',
    address: 'تهران، نیاوران، خیابان باهنر',
    neighborhood: 'نیاوران',
    phone: '۰۲۱-۲۲۳۳۴۴۵۵',
    rating: 4.9,
    openHours: '۱۰ تا ۲۰',
    lat: 35.81,
    lng: 51.47,
    services: ['معاینه', 'گریم', 'مشاوره تغذیه'],
  },
  {
    id: 4,
    name: 'مرکز دامپزشکی شهرک غرب',
    address: 'تهران، شهرک غرب، بلوار فرحزادی',
    neighborhood: 'شهرک غرب',
    phone: '۰۲۱-۸۸۵۵۴۴۳۳',
    rating: 4.5,
    openHours: '۹ تا ۱۹',
    lat: 35.75,
    lng: 51.36,
    services: ['واکسیناسیون', 'دندانپزشکی'],
  },
];

export const MOCK_PRODUCTS: ShopProduct[] = [
  {
    id: 1,
    name: 'غذای خشک سگ بالغ',
    price: 450000,
    category: 'غذا',
    imageEmoji: '🦴',
    description: '۵ کیلوگرم — برند پریمیوم',
    inStock: true,
  },
  {
    id: 2,
    name: 'غذای گربه ماهی',
    price: 320000,
    category: 'غذا',
    imageEmoji: '🐟',
    description: '۲ کیلوگرم — بدون گلوتن',
    inStock: true,
  },
  {
    id: 3,
    name: 'اسباب‌بازی توپ پارک',
    price: 85000,
    category: 'اسباب‌بازی',
    imageEmoji: '⚽',
    description: 'مقاوم و ضد آب',
    inStock: true,
  },
  {
    id: 4,
    name: 'قلاده چرمی',
    price: 195000,
    category: 'لوازم',
    imageEmoji: '🎀',
    description: 'قابل تنظیم — سایز متوسط',
    inStock: true,
  },
  {
    id: 5,
    name: 'خاک گربه ۱۰ کیلو',
    price: 280000,
    category: 'بهداشت',
    imageEmoji: '🧴',
    description: 'جاذب بو — بدون گرد و غبار',
    inStock: false,
  },
  {
    id: 6,
    name: 'ویتامین مولتی پت',
    price: 165000,
    category: 'مکمل',
    imageEmoji: '💊',
    description: '۶۰ قرص — سگ و گربه',
    inStock: true,
  },
];

export function formatPrice(toman: number): string {
  return `${toman.toLocaleString('fa-IR')} تومان`;
}
