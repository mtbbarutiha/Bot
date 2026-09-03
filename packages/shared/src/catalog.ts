/** Catalog of pet species and breeds for registration wizards */

export type PetSpeciesCode = 'dog' | 'cat' | 'bird' | 'rabbit' | 'hamster' | 'other';

export interface PetSpecies {
  code: PetSpeciesCode;
  labelFa: string;
  emoji: string;
}

export interface PetBreed {
  id: number;
  speciesCode: PetSpeciesCode;
  nameFa: string;
  nameEn?: string;
}

export const PET_SPECIES: PetSpecies[] = [
  { code: 'dog', labelFa: 'سگ', emoji: '🐕' },
  { code: 'cat', labelFa: 'گربه', emoji: '🐈' },
  { code: 'bird', labelFa: 'پرنده', emoji: '🐦' },
  { code: 'rabbit', labelFa: 'خرگوش', emoji: '🐇' },
  { code: 'hamster', labelFa: 'همستر', emoji: '🐹' },
  { code: 'other', labelFa: 'سایر', emoji: '🐾' },
];

export const PET_BREEDS_SEED: Array<{ speciesCode: PetSpeciesCode; nameFa: string; nameEn?: string }> = [
  { speciesCode: 'dog', nameFa: 'گلدن رتریور', nameEn: 'Golden Retriever' },
  { speciesCode: 'dog', nameFa: 'لابرادور', nameEn: 'Labrador' },
  { speciesCode: 'dog', nameFa: 'هاسکی', nameEn: 'Husky' },
  { speciesCode: 'dog', nameFa: 'ژرمن شپرد', nameEn: 'German Shepherd' },
  { speciesCode: 'dog', nameFa: 'بولداگ فرانسوی', nameEn: 'French Bulldog' },
  { speciesCode: 'dog', nameFa: 'پامرانین', nameEn: 'Pomeranian' },
  { speciesCode: 'dog', nameFa: 'شیتزو', nameEn: 'Shih Tzu' },
  { speciesCode: 'dog', nameFa: 'پودل', nameEn: 'Poodle' },
  { speciesCode: 'dog', nameFa: 'مالینویز', nameEn: 'Malinois' },
  { speciesCode: 'dog', nameFa: 'چی‌واوا', nameEn: 'Chihuahua' },
  { speciesCode: 'dog', nameFa: 'تریر', nameEn: 'Terrier' },
  { speciesCode: 'dog', nameFa: 'میکس / دورگه', nameEn: 'Mixed' },
  { speciesCode: 'cat', nameFa: 'پرشین', nameEn: 'Persian' },
  { speciesCode: 'cat', nameFa: 'سیامی', nameEn: 'Siamese' },
  { speciesCode: 'cat', nameFa: 'بریتیش شورت‌هیر', nameEn: 'British Shorthair' },
  { speciesCode: 'cat', nameFa: 'مین‌کون', nameEn: 'Maine Coon' },
  { speciesCode: 'cat', nameFa: 'اسکاتیش فولد', nameEn: 'Scottish Fold' },
  { speciesCode: 'cat', nameFa: 'بنگال', nameEn: 'Bengal' },
  { speciesCode: 'cat', nameFa: 'راگدال', nameEn: 'Ragdoll' },
  { speciesCode: 'cat', nameFa: 'موکوتاه ایرانی', nameEn: 'Domestic Shorthair' },
  { speciesCode: 'cat', nameFa: 'میکس / دورگه', nameEn: 'Mixed' },
  { speciesCode: 'bird', nameFa: 'طوطی خاکستری', nameEn: 'African Grey' },
  { speciesCode: 'bird', nameFa: 'عروس هلندی', nameEn: 'Cockatiel' },
  { speciesCode: 'bird', nameFa: 'بودجی', nameEn: 'Budgie' },
  { speciesCode: 'bird', nameFa: 'قناری', nameEn: 'Canary' },
  { speciesCode: 'bird', nameFa: 'کاکادو', nameEn: 'Cockatoo' },
  { speciesCode: 'bird', nameFa: 'سایر پرندگان', nameEn: 'Other bird' },
  { speciesCode: 'rabbit', nameFa: 'هولند لوپ', nameEn: 'Holland Lop' },
  { speciesCode: 'rabbit', nameFa: 'مینی رکس', nameEn: 'Mini Rex' },
  { speciesCode: 'rabbit', nameFa: 'انگورا', nameEn: 'Angora' },
  { speciesCode: 'rabbit', nameFa: 'میکس خرگوش', nameEn: 'Mixed rabbit' },
  { speciesCode: 'hamster', nameFa: 'سوری', nameEn: 'Syrian' },
  { speciesCode: 'hamster', nameFa: 'کوتوله کمپل', nameEn: 'Campbell' },
  { speciesCode: 'hamster', nameFa: 'روبو', nameEn: 'Roborovski' },
  { speciesCode: 'other', nameFa: 'سایر حیوانات خانگی', nameEn: 'Other' },
];

export const PET_SPECIES_LABELS: Record<string, string> = Object.fromEntries(
  PET_SPECIES.map((s) => [s.code, `${s.emoji} ${s.labelFa}`])
);

export const PET_GENDER_LABELS: Record<'male' | 'female', string> = {
  male: 'نر',
  female: 'ماده',
};

export const PET_SIZE_LABELS: Record<'small' | 'medium' | 'large', string> = {
  small: 'کوچک',
  medium: 'متوسط',
  large: 'بزرگ',
};
