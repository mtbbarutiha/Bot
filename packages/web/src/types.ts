export type GameType =
  | 'football'
  | 'volleyball'
  | 'basketball'
  | 'futsal'
  | 'tennis'
  | 'board'
  | 'other';

export type GameStatus = 'open' | 'full' | 'cancelled' | 'completed';

export interface Section {
  id: number;
  name: string;
  description?: string;
  city?: string;
  memberCount: number;
  emoji: string;
}

export interface Game {
  id: number;
  title: string;
  gameType: GameType;
  sectionId: number;
  sectionName: string;
  hostName: string;
  location: string;
  scheduledAt: string;
  maxPlayers: number;
  currentPlayers: number;
  status: GameStatus;
  description?: string;
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

export const GAME_TYPE_EMOJI: Record<GameType, string> = {
  football: '⚽',
  volleyball: '🏐',
  basketball: '🏀',
  futsal: '🥅',
  tennis: '🎾',
  board: '🎲',
  other: '🎯',
};

export const GAME_STATUS_LABELS: Record<GameStatus, string> = {
  open: 'باز',
  full: 'تکمیل',
  cancelled: 'لغو شده',
  completed: 'برگزار شده',
};
