import type { Game, Section } from '../types';

export const CURRENT_USER = {
  id: 1,
  name: 'محمد',
  sectionId: 1,
  sectionName: 'سکشن فوتبال تهران',
};

export const MOCK_SECTIONS: Section[] = [
  {
    id: 1,
    name: 'سکشن فوتبال تهران',
    description: 'دوستان فوتبال‌باز تهران — بازی‌های هفتگی',
    city: 'تهران',
    memberCount: 24,
    emoji: '⚽',
  },
  {
    id: 2,
    name: 'سکشن والیبال اصفهان',
    description: 'گروه والیبال اصفهان — ساحلی و سالنی',
    city: 'اصفهان',
    memberCount: 18,
    emoji: '🏐',
  },
  {
    id: 3,
    name: 'سکشن بسکتبال شیراز',
    description: 'بسکتبال شیراز — آماتور و حرفه‌ای',
    city: 'شیراز',
    memberCount: 12,
    emoji: '🏀',
  },
  {
    id: 4,
    name: 'سکشن فوتسال کرج',
    description: 'فوتسال آقایان و بانوان کرج',
    city: 'کرج',
    memberCount: 20,
    emoji: '🥅',
  },
];

function daysFromNow(days: number, hour = 18): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  d.setHours(hour, 0, 0, 0);
  return d.toISOString();
}

export const MOCK_GAMES: Game[] = [
  {
    id: 1,
    title: 'فوتبال پنجشنبه شب',
    gameType: 'football',
    sectionId: 1,
    sectionName: 'سکشن فوتبال تهران',
    hostName: 'علی رضایی',
    location: 'زمین چمن پارک ملت',
    scheduledAt: daysFromNow(1, 19),
    maxPlayers: 10,
    currentPlayers: 7,
    status: 'open',
    description: 'نیاز به ۲ دروازه‌بان داریم. کفش چمنی الزامی.',
  },
  {
    id: 2,
    title: 'والیبال شنبه صبح',
    gameType: 'volleyball',
    sectionId: 2,
    sectionName: 'سکشن والیبال اصفهان',
    hostName: 'سارا محمدی',
    location: 'سالن ورزشی آزادی',
    scheduledAt: daysFromNow(3, 9),
    maxPlayers: 12,
    currentPlayers: 8,
    status: 'open',
    description: 'سطح متوسط. همه خوش‌آمدید!',
  },
  {
    id: 3,
    title: 'بسکتبال ۳ به ۳',
    gameType: 'basketball',
    sectionId: 3,
    sectionName: 'سکشن بسکتبال شیراز',
    hostName: 'رضا کریمی',
    location: 'پارک کوهسنگی',
    scheduledAt: daysFromNow(2, 17),
    maxPlayers: 6,
    currentPlayers: 6,
    status: 'full',
    description: 'بازی دوستانه ۳ به ۳',
  },
  {
    id: 4,
    title: 'فوتسال جمعه عصر',
    gameType: 'futsal',
    sectionId: 4,
    sectionName: 'سکشن فوتسال کرج',
    hostName: 'امیر حسینی',
    location: 'سالن فوتسال المپیک',
    scheduledAt: daysFromNow(4, 16),
    maxPlayers: 10,
    currentPlayers: 4,
    status: 'open',
  },
  {
    id: 5,
    title: 'تنیس دوشنبه',
    gameType: 'tennis',
    sectionId: 1,
    sectionName: 'سکشن فوتبال تهران',
    hostName: 'نیما احمدی',
    location: 'باشگاه تنیس ونک',
    scheduledAt: daysFromNow(5, 10),
    maxPlayers: 4,
    currentPlayers: 2,
    status: 'open',
    description: 'دوبل مردان — سطح مبتدی تا متوسط',
  },
  {
    id: 6,
    title: 'شطرنج و بازی فکری',
    gameType: 'board',
    sectionId: 2,
    sectionName: 'سکشن والیبال اصفهان',
    hostName: 'مریم نوری',
    location: 'کافه بازی مرکز شهر',
    scheduledAt: daysFromNow(2, 20),
    maxPlayers: 8,
    currentPlayers: 5,
    status: 'open',
  },
];

export function getGamesForSection(sectionId: number): Game[] {
  return MOCK_GAMES.filter((g) => g.sectionId === sectionId && g.status === 'open');
}

export function getGameById(id: number): Game | undefined {
  return MOCK_GAMES.find((g) => g.id === id);
}

export function getSectionById(id: number): Section | undefined {
  return MOCK_SECTIONS.find((s) => s.id === id);
}

export function formatPersianDate(iso: string): string {
  return new Intl.DateTimeFormat('fa-IR', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso));
}

export function spotsLeft(game: Game): number {
  return game.maxPlayers - game.currentPlayers;
}
