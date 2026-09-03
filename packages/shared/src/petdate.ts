/** petdate domain types — shared by web, API, and Telegram bot */

export type UserRole =
  | 'pet_owner'
  | 'vet'
  | 'no_pet'
  | 'pet_seeker'
  | 'community_seeker'
  | 'trainer'
  | 'pet_sitter';

export type OnboardingStatus =
  | 'role_selected'
  | 'profile_incomplete'
  | 'profile_complete';

export type UserGender = 'male' | 'female';

export interface PetdateUser {
  id: number;
  telegramId?: string;
  phone?: string;
  email?: string;
  name: string;
  username?: string;
  role?: UserRole;
  onboarding: OnboardingStatus;
  locale: string;
  avatarUrl?: string;
  age?: number;
  gender?: UserGender;
  city?: string;
  bio?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProfileDraft {
  name?: string;
  age?: number;
  gender?: UserGender;
  city?: string;
  phone?: string;
  avatarFileId?: string;
  bio?: string;
}

export interface PetProfile {
  id: number;
  ownerId: number;
  name: string;
  species: string;
  breed?: string;
  ageMonths?: number;
  bio?: string;
  vaccinated: boolean;
  neutered: boolean;
  lookingForPlaymate: boolean;
  personality: Record<string, unknown>;
  health: Record<string, unknown>;
  imageUrl?: string;
  city?: string;
  neighborhood?: string;
  createdAt: string;
  updatedAt: string;
}

export type PlaydateStatus = 'pending' | 'accepted' | 'rejected' | 'cancelled';

export interface PlaydateRequest {
  id: number;
  fromPetId: number;
  toPetId: number;
  fromUserId: number;
  toUserId?: number;
  message?: string;
  status: PlaydateStatus;
  scheduledAt?: string;
  location?: string;
  createdAt: string;
  updatedAt: string;
  fromPet?: PetProfile;
  toPet?: PetProfile;
}

export interface BotSession {
  telegramId: string;
  userId?: number;
  role?: UserRole;
  step: BotStep;
  locale: string;
  draftPet?: PetDraft;
  draftProfile?: ProfileDraft;
  selectedPetId?: number;
  selectedToPetId?: number;
  explorePage?: number;
  updatedAt: string;
}

export type BotStep =
  | 'start'
  | 'role_select'
  | 'profile_name'
  | 'profile_age'
  | 'profile_gender'
  | 'profile_city'
  | 'profile_phone'
  | 'profile_photo'
  | 'profile_bio'
  | 'pet_name'
  | 'pet_species'
  | 'pet_breed'
  | 'pet_city'
  | 'playdate_message'
  | 'ready';

export interface PetDraft {
  name?: string;
  species?: string;
  breed?: string;
  city?: string;
}

export const PLAYDATE_STATUS_LABELS: Record<PlaydateStatus, string> = {
  pending: 'در انتظار',
  accepted: 'پذیرفته',
  rejected: 'رد شده',
  cancelled: 'لغو شده',
};

export const USER_ROLES: UserRole[] = [
  'pet_owner',
  'vet',
  'no_pet',
  'pet_seeker',
  'community_seeker',
  'trainer',
  'pet_sitter',
];

export const USER_ROLE_LABELS: Record<UserRole, string> = {
  pet_owner: '🐾 صاحب پت',
  vet: '🩺 دامپزشک',
  no_pet: '🏠 بدون پت',
  pet_seeker: '🔍 دنبال پت',
  community_seeker: '👥 جامعه پت',
  trainer: '🎓 مربی',
  pet_sitter: '🏡 نگهبان پت',
};

export const USER_GENDER_LABELS: Record<UserGender, string> = {
  male: 'آقا',
  female: 'خانم',
};

export const ONBOARDING_STATUS_LABELS: Record<OnboardingStatus, string> = {
  role_selected: 'نقش انتخاب شده',
  profile_incomplete: 'پروفایل ناقص',
  profile_complete: 'پروفایل کامل',
};
