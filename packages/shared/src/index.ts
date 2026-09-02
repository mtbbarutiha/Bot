export * from './petdate';

import type { UserRole } from './petdate';

export type GameType =
  | 'football'
  | 'volleyball'
  | 'basketball'
  | 'futsal'
  | 'tennis'
  | 'board'
  | 'other';

export type GameStatus = 'open' | 'full' | 'cancelled' | 'completed';

export interface User {
  id: number;
  telegramId?: string;
  name: string;
  username?: string;
  sectionId?: number;
  role?: UserRole;
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
