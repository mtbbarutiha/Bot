export type PetType = 'dog' | 'cat' | 'bird' | 'rabbit' | 'other';

export type PetSize = 'small' | 'medium' | 'large';

export type PetGender = 'male' | 'female';

export type MatchStatus = 'pending' | 'accepted' | 'rejected';

export interface Pet {
  id: number;
  name: string;
  type: PetType;
  breed: string;
  age: number;
  ageUnit: 'month' | 'year';
  size: PetSize;
  gender: PetGender;
  city: string;
  neighborhood: string;
  ownerName: string;
  ownerId: number;
  imageUrl: string;
  emoji: string;
  bio?: string;
  traits: string[];
  healthNotes?: string;
  vaccinated: boolean;
  neutered: boolean;
  lookingForPlaymate: boolean;
  distanceKm: number;
}

export interface MatchRequest {
  id: number;
  fromPet: Pet;
  toPetId: number;
  message?: string;
  status: MatchStatus;
  createdAt: string;
  scheduledAt?: string;
  location?: string;
}

export interface OwnerProfile {
  id: number;
  name: string;
  city: string;
  pets: Pet[];
}

export const PET_TYPE_LABELS: Record<PetType, string> = {
  dog: 'سگ',
  cat: 'گربه',
  bird: 'پرنده',
  rabbit: 'خرگوش',
  other: 'سایر',
};

export const PET_TYPE_EMOJI: Record<PetType, string> = {
  dog: '🐕',
  cat: '🐈',
  bird: '🐦',
  rabbit: '🐇',
  other: '🐾',
};

export const PET_SIZE_LABELS: Record<PetSize, string> = {
  small: 'کوچک',
  medium: 'متوسط',
  large: 'بزرگ',
};

export const PET_GENDER_LABELS: Record<PetGender, string> = {
  male: 'نر',
  female: 'ماده',
};

export const MATCH_STATUS_LABELS: Record<MatchStatus, string> = {
  pending: 'در انتظار',
  accepted: 'پذیرفته',
  rejected: 'رد شده',
};
