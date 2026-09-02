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
  createdAt: string;
  updatedAt: string;
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
  /** Populated on list/detail responses */
  fromPet?: PetProfile;
  toPet?: PetProfile;
}

export interface BotSession {
  telegramId: string;
  userId?: number;
  role?: UserRole;
  step: 'start' | 'role_select' | 'profile_hint' | 'ready';
  locale: string;
  updatedAt: string;
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

export const ONBOARDING_STATUS_LABELS: Record<OnboardingStatus, string> = {
  role_selected: 'نقش انتخاب شده',
  profile_incomplete: 'پروفایل ناقص',
  profile_complete: 'پروفایل کامل',
};
