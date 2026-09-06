/**
 * PetDate shop catalog — category/param structure inspired by petkharid.com,
 * Pepito imagery, prices in تومان (wallet primary currency).
 */

const P = '/pepito/uploads';

export type ShopPetType = 'dog' | 'cat' | 'bird' | 'all';

export interface ShopCategory {
  slug: string;
  labelFa: string;
  petType: Exclude<ShopPetType, 'all'>;
  description: string;
  emoji: string;
}

export interface ShopBrand {
  id: string;
  labelFa: string;
  labelEn?: string;
}

export interface ShopProduct {
  id: string;
  slug: string;
  title: string;
  brandId: string;
  categorySlug: string;
  petTypes: Array<Exclude<ShopPetType, 'all'>>;
  /** قیمت فعلی تومان */
  priceToman: number;
  /** قیمت قبل از تخفیف (تومان) — اگر بیشتر از price باشد نشان‌دهنده تخفیف */
  compareAtToman?: number;
  image: string;
  badge?: 'hot' | 'sale' | 'new' | 'limited';
  inStock: boolean;
  /** پارامترهای کارت محصول (وزن، رنگ، سایز، …) */
  params: Record<string, string>;
  description: string;
  featured?: boolean;
}

export const SHOP_PET_TYPES: { id: ShopPetType; labelFa: string }[] = [
  { id: 'all', labelFa: 'همه' },
  { id: 'dog', labelFa: 'سگ' },
  { id: 'cat', labelFa: 'گربه' },
  { id: 'bird', labelFa: 'پرنده' },
];

/** Top-level + subcategory tree modeled on petkharid menus */
export const SHOP_CATEGORIES: ShopCategory[] = [
  // —— سگ ——
  { slug: 'dog-food', labelFa: 'غذای سگ', petType: 'dog', description: 'غذای خشک، کنسرو و سوپ سگ', emoji: '🦴' },
  { slug: 'dog-treats', labelFa: 'تشویقی و مکمل غذایی سگ', petType: 'dog', description: 'تشویقی، اسنک و مکمل', emoji: '🍖' },
  { slug: 'dog-grooming', labelFa: 'وسایل بهداشتی سگ', petType: 'dog', description: 'شامپو، برس و نظافت', emoji: '🧴' },
  { slug: 'dog-toys', labelFa: 'اسباب بازی سگ', petType: 'dog', description: 'توپ، لاتکس و اسباب‌بازی تعاملی', emoji: '🎾' },
  { slug: 'dog-bowls', labelFa: 'ظروف و لوازم جانبی سگ', petType: 'dog', description: 'ظرف غذا و آب', emoji: '🥣' },
  { slug: 'dog-carriers-travel', labelFa: 'وسایل حمل و سفر سگ', petType: 'dog', description: 'باکس، کیف و کوله', emoji: '🧳' },
  { slug: 'dog-collars', labelFa: 'قلاده سگ و لوازم جانبی', petType: 'dog', description: 'قلاده، لید و هارنس', emoji: '🦮' },
  { slug: 'dog-clothing', labelFa: 'پوشاک و لباس سگ', petType: 'dog', description: 'لباس و اکسسوری', emoji: '👕' },
  { slug: 'dog-flea-tick', labelFa: 'ضد کک و کنه سگ', petType: 'dog', description: 'پیشگیری از انگل', emoji: '🛡️' },
  { slug: 'dog-beds', labelFa: 'جای خواب سگ', petType: 'dog', description: 'تشک، مت و جای خواب', emoji: '🛏️' },
  // —— گربه ——
  { slug: 'cat-food', labelFa: 'غذای گربه', petType: 'cat', description: 'غذای خشک، کنسرو و پوچ', emoji: '🐟' },
  { slug: 'cat-treats', labelFa: 'تشویقی گربه و مکمل غذایی', petType: 'cat', description: 'تشویقی، بستنی و مکمل', emoji: '🍦' },
  { slug: 'cat-grooming', labelFa: 'لوازم بهداشتی گربه', petType: 'cat', description: 'شامپو، برس و مراقبت', emoji: '🫧' },
  { slug: 'cat-toys', labelFa: 'اسباب بازی گربه', petType: 'cat', description: 'موش، میله و اسباب‌بازی', emoji: '🐭' },
  { slug: 'cat-trees', labelFa: 'درخت گربه و اسکرچر', petType: 'cat', description: 'درخت، اسکرچر و کاندو', emoji: '🌳' },
  { slug: 'cat-bowls', labelFa: 'ظروف و لوازم جانبی گربه', petType: 'cat', description: 'ظرف غذا و آبخوری', emoji: '🍽️' },
  { slug: 'cat-litter', labelFa: 'لوازم دستشویی گربه', petType: 'cat', description: 'خاک، سینی و بیلچه', emoji: '🚽' },
  { slug: 'cat-carriers-travel', labelFa: 'وسایل حمل و سفر گربه', petType: 'cat', description: 'باکس و کوله حمل', emoji: '🎒' },
  { slug: 'cat-beds', labelFa: 'جای خواب گربه', petType: 'cat', description: 'لانه و تشک خواب', emoji: '😺' },
  { slug: 'cat-flea-tick', labelFa: 'ضد کک و کنه گربه', petType: 'cat', description: 'ضد انگل گربه', emoji: '✨' },
  // —— پرنده ——
  { slug: 'bird-food', labelFa: 'غذای پرنده', petType: 'bird', description: 'دان، پلت و مخلوط غذایی', emoji: '🐦' },
  { slug: 'bird-accessories', labelFa: 'لوازم پرنده', petType: 'bird', description: 'قفس، نشیمن و لوازم جانبی', emoji: '🪺' },
];

export const SHOP_BRANDS: ShopBrand[] = [
  { id: 'royal-canin', labelFa: 'رویال کنین', labelEn: 'Royal Canin' },
  { id: 'josera', labelFa: 'جوسرا', labelEn: 'Josera' },
  { id: 'gourmet', labelFa: 'گورمت', labelEn: 'Gourmet' },
  { id: 'reflex', labelFa: 'رفلکس', labelEn: 'Reflex' },
  { id: 'nutripet', labelFa: 'نوتری پت', labelEn: 'Nutri Pet' },
  { id: 'mofeed', labelFa: 'مفید', labelEn: 'MoFeed' },
  { id: 'wellfed', labelFa: 'ولفيد', labelEn: 'Wellfed' },
  { id: 'winston', labelFa: 'وینستون', labelEn: 'Winston' },
  { id: 'red-spring', labelFa: 'رد اسپرینگ', labelEn: 'Red Spring' },
  { id: 'mpets', labelFa: 'ام‌پتس', labelEn: 'MPets' },
  { id: 'hagen', labelFa: 'هاگن', labelEn: 'Hagen' },
  { id: 'petdate', labelFa: 'پت‌دیت', labelEn: 'PetDate' },
];

/** Realistic seeded catalog — titles/params structure like petkharid product cards */
export const SHOP_PRODUCTS: ShopProduct[] = [
  {
    id: 'p1',
    slug: 'gourmet-gold-mousse-chicken',
    title: 'کنسرو موس گربه گورمت گلد با طعم مرغ',
    brandId: 'gourmet',
    categorySlug: 'cat-food',
    petTypes: ['cat'],
    priceToman: 285_000,
    image: `${P}/01-1.png`,
    badge: 'hot',
    inStock: true,
    params: { وزن: '۸۵ گرم' },
    description: 'موس نرم و خوش‌خوراک برای گربه‌های بدغذا — طعم مرغ.',
    featured: true,
  },
  {
    id: 'p2',
    slug: 'winston-dog-poultry-pasta',
    title: 'ووم سگ وینستون با طعم گوشت ماکیان و پاستا',
    brandId: 'winston',
    categorySlug: 'dog-food',
    petTypes: ['dog'],
    priceToman: 390_000,
    image: `${P}/02.png`,
    badge: 'new',
    inStock: true,
    params: { وزن: '۱۵۰ گرم' },
    description: 'وعده مرطوب کامل برای سگ بالغ با پاستا و گوشت ماکیان.',
    featured: true,
  },
  {
    id: 'p3',
    slug: 'wellfed-cat-chicken-tuna',
    title: 'تشویقی گربه ولفد با طعم فیله مرغ و تن ماهی',
    brandId: 'wellfed',
    categorySlug: 'cat-treats',
    petTypes: ['cat'],
    priceToman: 360_000,
    image: `${P}/03-1.png`,
    badge: 'hot',
    inStock: true,
    params: { وزن: '۵۰ گرم' },
    description: 'تشویقی نرم با گوشت تازه — مناسب آموزش و پاداش.',
    featured: true,
  },
  {
    id: 'p4',
    slug: 'cookie-mouse-cat-toy',
    title: 'اسباب بازی گربه عروسک موش کوکی',
    brandId: 'petdate',
    categorySlug: 'cat-toys',
    petTypes: ['cat'],
    priceToman: 160_000,
    image: `${P}/1-1.jpg`,
    inStock: true,
    params: { رنگ: 'بنفش' },
    description: 'عروسک موش نرم برای بازی و شکار خانگی.',
    featured: true,
  },
  {
    id: 'p5',
    slug: 'pet-yar-brush',
    title: 'برس موی سگ و گربه پت یار با دکمه تخلیه',
    brandId: 'petdate',
    categorySlug: 'dog-grooming',
    petTypes: ['dog', 'cat'],
    priceToman: 850_000,
    image: `${P}/04.png`,
    inStock: true,
    params: { رنگ: 'آبی' },
    description: 'برس خودتمیزشونده برای ریزش مو کمتر روی مبلمان.',
  },
  {
    id: 'p6',
    slug: 'steel-pet-bowl',
    title: 'ظرف غذای سگ و گربه استیل',
    brandId: 'petdate',
    categorySlug: 'dog-bowls',
    petTypes: ['dog', 'cat'],
    priceToman: 644_000,
    compareAtToman: 700_000,
    image: `${P}/05.png`,
    badge: 'sale',
    inStock: true,
    params: { اندازه: 'سایز ۳' },
    description: 'ظرف استیل ضدزنگ با پایه ضدلغزش.',
    featured: true,
  },
  {
    id: 'p7',
    slug: 'josera-kitten-dry',
    title: 'غذای خشک بچه گربه جوسی کت جوسرا با طعم مرغ',
    brandId: 'josera',
    categorySlug: 'cat-food',
    petTypes: ['cat'],
    priceToman: 3_300_000,
    image: `${P}/06-1.png`,
    badge: 'hot',
    inStock: true,
    params: { وزن: '۱٫۹ کیلوگرم' },
    description: 'فرمول آلمانی بدون گلوتن برای بچه گربه.',
    featured: true,
  },
  {
    id: 'p8',
    slug: 'merryland-pet-mat',
    title: 'مت و تشک سگ و گربه مریلند',
    brandId: 'petdate',
    categorySlug: 'dog-beds',
    petTypes: ['dog', 'cat'],
    priceToman: 807_500,
    compareAtToman: 950_000,
    image: `${P}/07.png`,
    badge: 'sale',
    inStock: true,
    params: { اندازه: 'large', رنگ: 'آبی روشن' },
    description: 'تشک نرم قابل شست‌وشو برای استراحت روزانه.',
  },
  {
    id: 'p9',
    slug: 'red-spring-dog-shampoo',
    title: 'شامپو سگ رد اسپرینگ با عصاره بلوبری',
    brandId: 'red-spring',
    categorySlug: 'dog-grooming',
    petTypes: ['dog'],
    priceToman: 345_000,
    image: `${P}/08.png`,
    inStock: true,
    params: { حجم: '۲۵۰ میلی‌لیتر' },
    description: 'شامپوی ملایم برای پوست حساس و موی براق.',
  },
  {
    id: 'p10',
    slug: 'nutripet-dog-chunk',
    title: 'کنسرو چانک سگ بالغ نوتری پت با طعم کدو حلوایی',
    brandId: 'nutripet',
    categorySlug: 'dog-food',
    petTypes: ['dog'],
    priceToman: 190_000,
    image: `${P}/09-2.jpg`,
    inStock: true,
    params: { وزن: '۴۲۵ گرم' },
    description: 'کنسرو چانک در سس — وعده کامل برای سگ بالغ.',
  },
  {
    id: 'p11',
    slug: 'mpets-long-hair-shampoo',
    title: 'شامپو سگ مناسب موهای بلند ام‌پتس',
    brandId: 'mpets',
    categorySlug: 'dog-grooming',
    petTypes: ['dog'],
    priceToman: 893_000,
    compareAtToman: 950_000,
    badge: 'sale',
    image: `${P}/01.png`,
    inStock: true,
    params: { حجم: '۲۵۰ میلی‌لیتر' },
    description: 'مراقبت تخصصی موهای بلند و گره‌دار.',
  },
  {
    id: 'p12',
    slug: 'mofeed-indoor-cat',
    title: 'غذای خشک گربه بالغ مفید Indoor با طعم گوشت گاو و مرغ',
    brandId: 'mofeed',
    categorySlug: 'cat-food',
    petTypes: ['cat'],
    priceToman: 667_400,
    compareAtToman: 710_000,
    badge: 'sale',
    image: `${P}/02.jpg`,
    inStock: true,
    params: { وزن: '۲ کیلوگرم' },
    description: 'فرمول Indoor برای گربه‌های خانگی کم‌فعال.',
  },
  {
    id: 'p13',
    slug: 'hello-cat-litter',
    title: 'خاک گربه ایر فرش Hello Cat',
    brandId: 'petdate',
    categorySlug: 'cat-litter',
    petTypes: ['cat'],
    priceToman: 390_000,
    image: `${P}/03.png`,
    inStock: true,
    params: { وزن: '۷ کیلوگرم' },
    description: 'خاک جاذب بو با گرد کم — مناسب آپارتمان.',
    featured: true,
  },
  {
    id: 'p14',
    slug: 'muwa-latex-chicken-toy',
    title: 'اسباب بازی لاتکسی سگ MUWA صدادار طرح مرغ',
    brandId: 'petdate',
    categorySlug: 'dog-toys',
    petTypes: ['dog'],
    priceToman: 900_000,
    image: `${P}/04.jpg`,
    inStock: true,
    params: { رنگ: 'قرمز' },
    description: 'لاتکس مقاوم با صدای جیرجیر برای بازی فعال.',
  },
  {
    id: 'p15',
    slug: 'zariks-space-backpack',
    title: 'کوله پشتی فضایی طلق‌دار برزنتی بزرگ زاریکس',
    brandId: 'petdate',
    categorySlug: 'cat-carriers-travel',
    petTypes: ['cat', 'dog'],
    priceToman: 2_000_000,
    image: `${P}/05.jpg`,
    badge: 'limited',
    inStock: true,
    params: { رنگ: 'سرمه‌ای' },
    description: 'کوله حمل با پنجره طلقی — مناسب سفر شهری.',
    featured: true,
  },
  {
    id: 'p16',
    slug: 'hachiko-dog-tray',
    title: 'سینی ادرار سگ پایه‌دار کوچک هاچیکو',
    brandId: 'petdate',
    categorySlug: 'dog-beds',
    petTypes: ['dog'],
    priceToman: 1_100_000,
    image: `${P}/06.png`,
    inStock: false,
    params: { سایز: 'کوچک' },
    description: 'سینی آموزش ادرار با پایه برای سگ‌های کوچک.',
  },
  {
    id: 'p17',
    slug: 'royal-canin-adult-dog',
    title: 'غذای خشک سگ بالغ رویال کنین Medium Adult',
    brandId: 'royal-canin',
    categorySlug: 'dog-food',
    petTypes: ['dog'],
    priceToman: 4_850_000,
    image: `${P}/01.jpg`,
    badge: 'hot',
    inStock: true,
    params: { وزن: '۴ کیلوگرم' },
    description: 'فرمول تخصصی نژاد متوسط — توصیه دامپزشکان.',
    featured: true,
  },
  {
    id: 'p18',
    slug: 'reflex-cat-adult',
    title: 'غذای خشک گربه بالغ رفلکس با طعم مرغ',
    brandId: 'reflex',
    categorySlug: 'cat-food',
    petTypes: ['cat'],
    priceToman: 1_250_000,
    image: `${P}/03.jpg`,
    inStock: true,
    params: { وزن: '۱٫۵ کیلوگرم' },
    description: 'غذای اقتصادی باکیفیت برای رژیم روزانه گربه.',
  },
  {
    id: 'p19',
    slug: 'dog-leather-collar',
    title: 'قلاده چرمی سگ قابل تنظیم',
    brandId: 'petdate',
    categorySlug: 'dog-collars',
    petTypes: ['dog'],
    priceToman: 195_000,
    image: `${P}/04.png`,
    badge: 'new',
    inStock: true,
    params: { سایز: 'متوسط', رنگ: 'قهوه‌ای' },
    description: 'قلاده چرمی نرم با حلقه فلزی مقاوم.',
  },
  {
    id: 'p20',
    slug: 'dog-raincoat',
    title: 'بارانی سبک سگ — سایز متوسط',
    brandId: 'petdate',
    categorySlug: 'dog-clothing',
    petTypes: ['dog'],
    priceToman: 420_000,
    image: `${P}/08.png`,
    inStock: true,
    params: { سایز: 'M', رنگ: 'زرد' },
    description: 'پوشاک ضدآب برای پیاده‌روی بارانی.',
  },
  {
    id: 'p21',
    slug: 'dog-flea-spot',
    title: 'قطره‌ ضد کک و کنه سگ — بسته ۳ عددی',
    brandId: 'petdate',
    categorySlug: 'dog-flea-tick',
    petTypes: ['dog'],
    priceToman: 780_000,
    image: `${P}/07.png`,
    inStock: true,
    params: { وزن‌پت: 'تا ۱۰ کیلوگرم' },
    description: 'پیشگیری ماهانه از انگل‌های خارجی.',
  },
  {
    id: 'p22',
    slug: 'cat-scratcher-tree',
    title: 'درخت گربه دو طبقه با اسکرچر کنفی',
    brandId: 'petdate',
    categorySlug: 'cat-trees',
    petTypes: ['cat'],
    priceToman: 3_600_000,
    image: `${P}/pet3.png`,
    badge: 'hot',
    inStock: true,
    params: { ارتفاع: '۱۲۰ سانتی‌متر' },
    description: 'فضای پرش و خراش برای تخلیه انرژی گربه.',
    featured: true,
  },
  {
    id: 'p23',
    slug: 'cat-flea-collar',
    title: 'قلاده ضد کک گربه — ۸ ماه محافظت',
    brandId: 'petdate',
    categorySlug: 'cat-flea-tick',
    petTypes: ['cat'],
    priceToman: 510_000,
    image: `${P}/06.jpg`,
    inStock: true,
    params: { مدت: '۸ ماه' },
    description: 'قلاده سبک با محافظت طولانی‌مدت.',
  },
  {
    id: 'p24',
    slug: 'hagen-parrot-pellets',
    title: 'پلت طوطی روزانه هاگن تروپیکان',
    brandId: 'hagen',
    categorySlug: 'bird-food',
    petTypes: ['bird'],
    priceToman: 1_890_000,
    image: `${P}/02.png`,
    badge: 'new',
    inStock: true,
    params: { وزن: '۸۲۰ گرم' },
    description: 'پلت متعادل روزانه برای طوطی‌های متوسط.',
    featured: true,
  },
  {
    id: 'p25',
    slug: 'bird-seed-mix',
    title: 'مخلوط دانه عروس هلندی و بودجی',
    brandId: 'petdate',
    categorySlug: 'bird-food',
    petTypes: ['bird'],
    priceToman: 285_000,
    image: `${P}/03-1.png`,
    inStock: true,
    params: { وزن: '۱ کیلوگرم' },
    description: 'مخلوط تازه دانه برای پرندگان زینتی کوچک.',
  },
  {
    id: 'p26',
    slug: 'bird-perch-set',
    title: 'ست نشیمن چوبی قفس پرنده',
    brandId: 'petdate',
    categorySlug: 'bird-accessories',
    petTypes: ['bird'],
    priceToman: 175_000,
    image: `${P}/01-1.png`,
    inStock: true,
    params: { تعداد: '۳ عدد' },
    description: 'نشیمن‌های چوبی طبیعی در اندازه‌های مختلف.',
  },
  {
    id: 'p27',
    slug: 'cat-bed-cave',
    title: 'جای خواب غاری شکل گربه',
    brandId: 'petdate',
    categorySlug: 'cat-beds',
    petTypes: ['cat'],
    priceToman: 980_000,
    image: `${P}/about.jpg`,
    inStock: true,
    params: { رنگ: 'کرم' },
    description: 'لانه نرم برای حس امنیت و خواب عمیق.',
  },
  {
    id: 'p28',
    slug: 'dog-travel-carrier',
    title: 'باکس حمل سگ متوسط — تهویه دو طرفه',
    brandId: 'petdate',
    categorySlug: 'dog-carriers-travel',
    petTypes: ['dog'],
    priceToman: 2_450_000,
    image: `${P}/05.png`,
    inStock: true,
    params: { سایز: 'متوسط' },
    description: 'باکس استاندارد برای سفر و مراجعه به دامپزشک.',
  },
];

export function formatToman(amount: number): string {
  return `${amount.toLocaleString('fa-IR')} تومان`;
}

export function productDiscountPercent(p: ShopProduct): number | null {
  if (!p.compareAtToman || p.compareAtToman <= p.priceToman) return null;
  return Math.round(((p.compareAtToman - p.priceToman) / p.compareAtToman) * 100);
}

export function getCategory(slug: string): ShopCategory | undefined {
  return SHOP_CATEGORIES.find((c) => c.slug === slug);
}

export function getBrand(id: string): ShopBrand | undefined {
  return SHOP_BRANDS.find((b) => b.id === id);
}

export function getProduct(idOrSlug: string): ShopProduct | undefined {
  return SHOP_PRODUCTS.find((p) => p.id === idOrSlug || p.slug === idOrSlug);
}

export function getFeaturedProducts(): ShopProduct[] {
  return SHOP_PRODUCTS.filter((p) => p.featured);
}

export function categoriesForPet(pet: ShopPetType): ShopCategory[] {
  if (pet === 'all') return SHOP_CATEGORIES;
  return SHOP_CATEGORIES.filter((c) => c.petType === pet);
}

export interface ShopFilters {
  petType?: ShopPetType;
  categorySlug?: string;
  brandId?: string;
  minPrice?: number;
  maxPrice?: number;
  q?: string;
  inStockOnly?: boolean;
}

export function filterProducts(filters: ShopFilters = {}): ShopProduct[] {
  const {
    petType = 'all',
    categorySlug,
    brandId,
    minPrice,
    maxPrice,
    q,
    inStockOnly,
  } = filters;

  const query = q?.trim().toLowerCase();

  return SHOP_PRODUCTS.filter((p) => {
    if (petType !== 'all' && !p.petTypes.includes(petType)) return false;
    if (categorySlug && p.categorySlug !== categorySlug) return false;
    if (brandId && p.brandId !== brandId) return false;
    if (minPrice != null && p.priceToman < minPrice) return false;
    if (maxPrice != null && p.priceToman > maxPrice) return false;
    if (inStockOnly && !p.inStock) return false;
    if (query) {
      const brand = getBrand(p.brandId)?.labelFa ?? '';
      const hay = `${p.title} ${brand} ${Object.values(p.params).join(' ')}`.toLowerCase();
      if (!hay.includes(query)) return false;
    }
    return true;
  });
}

export const SHOP_PRICE_MAX = Math.max(...SHOP_PRODUCTS.map((p) => p.priceToman));

export const BADGE_LABELS: Record<NonNullable<ShopProduct['badge']>, string> = {
  hot: 'پرفروش',
  sale: 'تخفیف',
  new: 'جدید',
  limited: 'محدود',
};
