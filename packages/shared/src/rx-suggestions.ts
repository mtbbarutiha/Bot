/**
 * پیشنهاد داروهای پرتکرار برای بیماری‌های رایج پت (سگ/گربه).
 * فقط پیشنهاد UI برای دامپزشک — دوز و مدت باید توسط پزشک تکمیل شود.
 */

export interface RxMedicationSuggestion {
  /** شناسه پایدار داخل دسته (برای callback) */
  id: string;
  /** نام نمایشی فارسی */
  nameFa: string;
  /** نام رایج/علمی کوتاه (اختیاری) */
  nameEn?: string;
  /** نکته کوتاه برای پزشک (اختیاری) */
  note?: string;
}

export interface RxConditionCategory {
  id: string;
  /** برچسب فارسی دکمه */
  labelFa: string;
  emoji: string;
  medications: RxMedicationSuggestion[];
}

/** الگوی خط نسخه پس از انتخاب دارو — پزشک دوز را پر می‌کند */
export function formatRxMedicationTemplate(med: RxMedicationSuggestion): string {
  const name = med.nameEn ? `${med.nameFa} (${med.nameEn})` : med.nameFa;
  const note = med.note ? ` | نکته: ${med.note}` : '';
  return `• ${name} — دوز: … | هر … ساعت | مدت: … روز${note}`;
}

export const RX_CONDITION_CATEGORIES: RxConditionCategory[] = [
  {
    id: 'gi',
    labelFa: 'اسهال / گوارش',
    emoji: '🤢',
    medications: [
      { id: 'metro', nameFa: 'مترونیدازول', nameEn: 'Metronidazole' },
      { id: 'probiotic', nameFa: 'پروبیوتیک دامپزشکی', nameEn: 'Probiotic' },
      { id: 'famotidine', nameFa: 'فاموتیدین', nameEn: 'Famotidine' },
      { id: 'sucralfate', nameFa: 'سوکرالفات', nameEn: 'Sucralfate' },
      { id: 'maropitant', nameFa: 'ماروپیتانت', nameEn: 'Maropitant (Cerenia)' },
      {
        id: 'kaolin',
        nameFa: 'کائولین-پکتین',
        nameEn: 'Kaolin-Pectin',
        note: 'حمایتی؛ علت اسهال را بررسی کنید',
      },
    ],
  },
  {
    id: 'skin',
    labelFa: 'عفونت پوست / قارچ',
    emoji: '🦠',
    medications: [
      { id: 'cephalexin', nameFa: 'سفالکسین', nameEn: 'Cephalexin' },
      { id: 'amoxclav', nameFa: 'آموکسی‌سیلین-کلاوولانات', nameEn: 'Amox-Clav' },
      { id: 'ketoconazole', nameFa: 'کتوکونازول', nameEn: 'Ketoconazole' },
      { id: 'itraconazole', nameFa: 'ایتراکونازول', nameEn: 'Itraconazole' },
      { id: 'chlorhex', nameFa: 'شامپو کلرهگزیدین', nameEn: 'Chlorhexidine shampoo' },
      { id: 'mupirocin', nameFa: 'پماد موپیروسین', nameEn: 'Mupirocin' },
    ],
  },
  {
    id: 'parasite',
    labelFa: 'انگل / کک و کنه',
    emoji: '🦟',
    medications: [
      { id: 'fenbendazole', nameFa: 'فنبندازول', nameEn: 'Fenbendazole' },
      { id: 'praziquantel', nameFa: 'پرازی‌کوانتل', nameEn: 'Praziquantel' },
      { id: 'milbemycin', nameFa: 'میلبرمایسین', nameEn: 'Milbemycin' },
      { id: 'selamectin', nameFa: 'سلامکتین', nameEn: 'Selamectin' },
      { id: 'fipronil', nameFa: 'فیپرونیل موضعی', nameEn: 'Fipronil' },
      {
        id: 'ivermectin',
        nameFa: 'ایورمکتین',
        nameEn: 'Ivermectin',
        note: 'در نژادهای حساس با احتیاط',
      },
    ],
  },
  {
    id: 'uti',
    labelFa: 'عفونت ادراری',
    emoji: '🚽',
    medications: [
      { id: 'amoxclav', nameFa: 'آموکسی‌سیلین-کلاوولانات', nameEn: 'Amox-Clav' },
      { id: 'cephalexin', nameFa: 'سفالکسین', nameEn: 'Cephalexin' },
      { id: 'enrofloxacin', nameFa: 'انروفلوکساسین', nameEn: 'Enrofloxacin' },
      { id: 'tmp_smx', nameFa: 'تریمتوپریم-سولفامتوکسازول', nameEn: 'TMP-SMX' },
      {
        id: 'marbofloxacin',
        nameFa: 'ماربوفلوکساسین',
        nameEn: 'Marbofloxacin',
        note: 'ترجیحاً بر اساس کشت',
      },
    ],
  },
  {
    id: 'pain',
    labelFa: 'درد / التهاب',
    emoji: '😣',
    medications: [
      {
        id: 'meloxicam',
        nameFa: 'ملوکسیکام',
        nameEn: 'Meloxicam',
        note: 'با غذا؛ در کم‌آبی منع',
      },
      { id: 'carprofen', nameFa: 'کارپروفن', nameEn: 'Carprofen' },
      { id: 'tramadol', nameFa: 'ترامادول', nameEn: 'Tramadol' },
      { id: 'gabapentin', nameFa: 'گاباپنتین', nameEn: 'Gabapentin' },
      {
        id: 'paracetamol',
        nameFa: 'استامینوفن',
        nameEn: 'Paracetamol',
        note: 'فقط سگ — برای گربه سمی است',
      },
    ],
  },
  {
    id: 'eyeear',
    labelFa: 'چشم / گوش',
    emoji: '👁',
    medications: [
      { id: 'cipro_eye', nameFa: 'قطره چشمی سیپروفلوکساسین', nameEn: 'Ciprofloxacin eye' },
      { id: 'tetra_eye', nameFa: 'پماد چشمی تتراسایکلین', nameEn: 'Tetracycline ointment' },
      { id: 'tobra_eye', nameFa: 'قطره چشمی توبرامایسین', nameEn: 'Tobramycin' },
      { id: 'otic_ab', nameFa: 'قطره گوش آنتی‌بیوتیک', nameEn: 'Otic antibiotic' },
      { id: 'otic_clean', nameFa: 'محلول شستشوی گوش', nameEn: 'Ear cleaner' },
    ],
  },
  {
    id: 'allergy',
    labelFa: 'آلرژی',
    emoji: '🤧',
    medications: [
      { id: 'prednisolone', nameFa: 'پردنیزولون', nameEn: 'Prednisolone' },
      { id: 'cetirizine', nameFa: 'ستیریزین', nameEn: 'Cetirizine' },
      { id: 'loratadine', nameFa: 'لوراتادین', nameEn: 'Loratadine' },
      { id: 'chlorpheniramine', nameFa: 'کلرفنیرامین', nameEn: 'Chlorpheniramine' },
      {
        id: 'oclacitinib',
        nameFa: 'آپوکوئل',
        nameEn: 'Oclacitinib (Apoquel)',
        note: 'نیاز به نسخه تخصصی',
      },
    ],
  },
];

export function getRxCategoryById(id: string): RxConditionCategory | undefined {
  return RX_CONDITION_CATEGORIES.find((c) => c.id === id);
}

export function getRxMedication(
  categoryId: string,
  medId: string
): RxMedicationSuggestion | undefined {
  return getRxCategoryById(categoryId)?.medications.find((m) => m.id === medId);
}
