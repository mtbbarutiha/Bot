import type { MatchRequest, OwnerProfile, Pet } from '../types';

export const CURRENT_OWNER: OwnerProfile = {
  id: 1,
  name: 'محمد',
  city: 'تهران',
  pets: [
    {
      id: 101,
      name: 'رکس',
      type: 'dog',
      breed: 'گلدن رتریور',
      age: 2,
      ageUnit: 'year',
      size: 'large',
      gender: 'male',
      city: 'تهران',
      neighborhood: 'ونک',
      ownerName: 'محمد',
      ownerId: 1,
      emoji: '🐕',
      bio: 'خیلی بازیگوش و دوست‌داشتنی. عاشق توپ و پارک!',
      traits: ['بازیگوش', 'اجتماعی', 'آموزش‌دیده'],
      vaccinated: true,
      neutered: true,
      lookingForPlaymate: true,
      distanceKm: 0,
    },
  ],
};

export const MY_PET = CURRENT_OWNER.pets[0];

export const MOCK_PETS: Pet[] = [
  {
    id: 1,
    name: 'لوسی',
    type: 'dog',
    breed: 'هاسکی',
    age: 3,
    ageUnit: 'year',
    size: 'large',
    gender: 'female',
    city: 'تهران',
    neighborhood: 'نیاوران',
    ownerName: 'سارا',
    ownerId: 2,
    emoji: '🐕‍🦺',
    bio: 'انرژی بالا! دوست داره با سگ‌های بزرگ بازی کنه.',
    traits: ['پرانرژی', 'بازیگوش'],
    vaccinated: true,
    neutered: true,
    lookingForPlaymate: true,
    distanceKm: 1.2,
  },
  {
    id: 2,
    name: 'میمو',
    type: 'cat',
    breed: 'پرشین',
    age: 1,
    ageUnit: 'year',
    size: 'small',
    gender: 'male',
    city: 'تهران',
    neighborhood: 'جردن',
    ownerName: 'علی',
    ownerId: 3,
    emoji: '🐈',
    bio: 'آروم ولی بازیگوش با گربه‌های دیگه.',
    traits: ['آرام', 'بازیگوش'],
    vaccinated: true,
    neutered: false,
    lookingForPlaymate: true,
    distanceKm: 0.8,
  },
  {
    id: 3,
    name: 'ماکس',
    type: 'dog',
    breed: 'ژرمن شپرد',
    age: 4,
    ageUnit: 'year',
    size: 'large',
    gender: 'male',
    city: 'تهران',
    neighborhood: 'سعادت‌آباد',
    ownerName: 'رضا',
    ownerId: 4,
    emoji: '🐕',
    bio: 'سگ نگهبان ولی با بچه‌ها و پت‌های دیگه مهربونه.',
    traits: ['وفادار', 'محافظ'],
    vaccinated: true,
    neutered: true,
    lookingForPlaymate: true,
    distanceKm: 2.5,
  },
  {
    id: 4,
    name: 'پونی',
    type: 'rabbit',
    breed: 'هلندی',
    age: 8,
    ageUnit: 'month',
    size: 'small',
    gender: 'female',
    city: 'تهران',
    neighborhood: 'پونک',
    ownerName: 'مریم',
    ownerId: 5,
    emoji: '🐇',
    bio: 'خرگوش کوچولوی بازیگوش. دنبال همبازی خرگوش یا گربه آروم.',
    traits: ['بازیگوش', 'خجالتی'],
    vaccinated: false,
    neutered: false,
    lookingForPlaymate: true,
    distanceKm: 3.1,
  },
  {
    id: 5,
    name: 'چیچی',
    type: 'bird',
    breed: 'عروس هلندی',
    age: 2,
    ageUnit: 'year',
    size: 'small',
    gender: 'male',
    city: 'تهران',
    neighborhood: 'ولنجک',
    ownerName: 'نیما',
    ownerId: 6,
    emoji: '🦜',
    bio: 'عاشق آواز و بازی. دنبال پرنده هم‌جنس.',
    traits: ['اجتماعی', 'آوازخوان'],
    vaccinated: false,
    neutered: false,
    lookingForPlaymate: true,
    distanceKm: 1.8,
  },
  {
    id: 6,
    name: 'بوبی',
    type: 'dog',
    breed: 'پودل',
    age: 1,
    ageUnit: 'year',
    size: 'small',
    gender: 'male',
    city: 'تهران',
    neighborhood: 'زعفرانیه',
    ownerName: 'الهام',
    ownerId: 7,
    emoji: '🐩',
    bio: 'پودل کوچولوی باهوش. عاشق بازی با سگ‌های کوچیک.',
    traits: ['باهوش', 'بازیگوش', 'آموزش‌دیده'],
    vaccinated: true,
    neutered: true,
    lookingForPlaymate: true,
    distanceKm: 2.0,
  },
];

export const MOCK_MATCHES: MatchRequest[] = [
  {
    id: 1,
    fromPet: MOCK_PETS[0],
    toPetId: MY_PET.id,
    message: 'سلام! لوسی عاشق گلدن‌هاست. بریم پارک؟',
    status: 'pending',
    createdAt: new Date(Date.now() - 3600000).toISOString(),
  },
  {
    id: 2,
    fromPet: MOCK_PETS[5],
    toPetId: MY_PET.id,
    message: 'بوبی هم سگ کوچیک دوست داره بازی کنه!',
    status: 'pending',
    createdAt: new Date(Date.now() - 7200000).toISOString(),
  },
  {
    id: 3,
    fromPet: MOCK_PETS[2],
    toPetId: MY_PET.id,
    message: 'ماکس آماده ملاقاته 🐾',
    status: 'accepted',
    createdAt: new Date(Date.now() - 86400000).toISOString(),
  },
];

export function getPetById(id: number): Pet | undefined {
  if (id === MY_PET.id) return MY_PET;
  return MOCK_PETS.find((p) => p.id === id);
}

export function getNearbyPets(excludeId?: number): Pet[] {
  return MOCK_PETS
    .filter((p) => p.lookingForPlaymate && p.id !== excludeId)
    .sort((a, b) => a.distanceKm - b.distanceKm);
}

export function getCompatiblePets(myPet: Pet): Pet[] {
  return getNearbyPets(myPet.id).filter((p) => {
    if (p.type !== myPet.type && !(p.type === 'cat' && myPet.type === 'rabbit')) return false;
    if (myPet.size === 'small' && p.size === 'large') return false;
    if (myPet.size === 'large' && p.size === 'small' && p.type === 'dog') return false;
    return true;
  });
}

export function formatAge(pet: Pet): string {
  const unit = pet.ageUnit === 'year' ? 'سال' : 'ماه';
  return `${pet.age} ${unit}`;
}

export function formatDistance(km: number): string {
  if (km === 0) return 'همینجا';
  if (km < 1) return `${Math.round(km * 1000)} متر`;
  return `${km.toFixed(1)} کیلومتر`;
}

export function formatTimeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const hours = Math.floor(diff / 3600000);
  if (hours < 1) return 'چند دقیقه پیش';
  if (hours < 24) return `${hours} ساعت پیش`;
  return `${Math.floor(hours / 24)} روز پیش`;
}
