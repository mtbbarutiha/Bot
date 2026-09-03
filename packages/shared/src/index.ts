export * from './petdate';

import type { OnboardingStatus, UserRole } from './petdate';
import type { UserGender } from './petdate';

export type GameType =
  | 'football'
  | 'volleyball'
  | 'basketball'
  | 'futsal'
  | 'tennis'
  | 'board'
  | 'other';

export type GameStatus = 'open' | 'full' | 'cancelled' | 'completed';

export {
  ONBOARDING_STATUS_LABELS,
  PLAYDATE_STATUS_LABELS,
  USER_GENDER_LABELS,
  USER_ROLE_LABELS,
  USER_ROLES,
} from './petdate';
export type {
  BotStep,
  OnboardingStatus,
  PetDraft,
  PlaydateRequest,
  PlaydateStatus,
  PetProfile,
  ProfileDraft,
  UserGender,
} from './petdate';

export interface User {
  id: number;
  telegramId?: string;
  name: string;
  username?: string;
  sectionId?: number;
  role?: UserRole;
  onboarding?: OnboardingStatus;
  age?: number;
  gender?: UserGender;
  city?: string;
  phone?: string;
  bio?: string;
  avatarUrl?: string;
  createdAt: string;
}

export interface Section {
  id: number;
  name: string;
  description?: string;
  city?: string;
  memberCount: number;
  createdAt: string;
}

export interface Game {
  id: number;
  title: string;
  gameType: GameType;
  sectionId?: number;
  sectionName?: string;
  hostUserId: number;
  hostName?: string;
  location: string;
  scheduledAt: string;
  maxPlayers: number;
  currentPlayers: number;
  status: GameStatus;
  description?: string;
  createdAt: string;
}

export interface GamePlayer {
  id: number;
  gameId: number;
  userId: number;
  userName?: string;
  joinedAt: string;
}

export const GAME_TYPE_LABELS: Record<GameType, string> = {
  football: 'فوتبال',
  volleyball: 'والیبال',
  basketball: 'بسکتبال',
  futsal: 'فوتسال',
  tennis: 'تنیس',
  board: 'بازی فکری',
  other: 'سایر',
};

export const GAME_STATUS_LABELS: Record<GameStatus, string> = {
  open: 'باز',
  full: 'تکمیل',
  cancelled: 'لغو شده',
  completed: 'برگزار شده',
};
