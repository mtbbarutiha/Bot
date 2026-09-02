import Database from 'better-sqlite3';
import path from 'path';
import type { Game, GamePlayer, GameStatus, GameType, Section, User } from '@petdate/shared';

const dbPath = process.env.DATABASE_PATH || path.join(__dirname, '..', 'data', 'petdate.db');

let db: Database.Database;

export function getDb(): Database.Database {
  if (!db) {
    const fs = require('fs');
    const dir = path.dirname(dbPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    db = new Database(dbPath);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
    initSchema();
    seedIfEmpty();
  }
  return db;
}

function initSchema() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS sections (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      city TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      telegram_id TEXT UNIQUE,
      name TEXT NOT NULL,
      username TEXT,
      section_id INTEGER REFERENCES sections(id),
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS games (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      game_type TEXT NOT NULL,
      section_id INTEGER REFERENCES sections(id),
      host_user_id INTEGER NOT NULL REFERENCES users(id),
      location TEXT NOT NULL,
      scheduled_at TEXT NOT NULL,
      max_players INTEGER NOT NULL DEFAULT 10,
      status TEXT NOT NULL DEFAULT 'open',
      description TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS game_players (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      game_id INTEGER NOT NULL REFERENCES games(id),
      user_id INTEGER NOT NULL REFERENCES users(id),
      joined_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(game_id, user_id)
    );
  `);
}

function seedIfEmpty() {
  const count = db.prepare('SELECT COUNT(*) as c FROM sections').get() as { c: number };
  if (count.c > 0) return;

  const insertSection = db.prepare(
    'INSERT INTO sections (name, description, city) VALUES (?, ?, ?)'
  );
  insertSection.run('سکشن فوتبال تهران', 'دوستان فوتبال‌باز تهران', 'تهران');
  insertSection.run('سکشن والیبال اصفهان', 'گروه والیبال اصفهان', 'اصفهان');
  insertSection.run('سکشن بسکتبال شیراز', 'بسکتبال شیراز', 'شیراز');

  const insertUser = db.prepare(
    'INSERT INTO users (telegram_id, name, username, section_id) VALUES (?, ?, ?, ?)'
  );
  insertUser.run('demo_host', 'علی رضایی', 'ali_rezaei', 1);
  insertUser.run('demo_player', 'سارا محمدی', 'sara_m', 1);

  const insertGame = db.prepare(`
    INSERT INTO games (title, game_type, section_id, host_user_id, location, scheduled_at, max_players, description)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(18, 0, 0, 0);
  insertGame.run(
    'فوتبال پنجشنبه شب',
    'football',
    1,
    1,
    'زمین چمن پارک ملت',
    tomorrow.toISOString(),
    10,
    'نیاز به ۲ دروازه‌بان داریم'
  );

  db.prepare('INSERT INTO game_players (game_id, user_id) VALUES (?, ?)').run(1, 1);
}

function mapUser(row: Record<string, unknown>): User {
  return {
    id: row.id as number,
    telegramId: row.telegram_id as string | undefined,
    name: row.name as string,
    username: row.username as string | undefined,
    sectionId: row.section_id as number | undefined,
    createdAt: row.created_at as string,
  };
}

function mapSection(row: Record<string, unknown>): Section {
  const memberCount = db
    .prepare('SELECT COUNT(*) as c FROM users WHERE section_id = ?')
    .get(row.id) as { c: number };
  return {
    id: row.id as number,
    name: row.name as string,
    description: row.description as string | undefined,
    city: row.city as string | undefined,
    memberCount: memberCount.c,
    createdAt: row.created_at as string,
  };
}

function mapGame(row: Record<string, unknown>): Game {
  const players = db
    .prepare('SELECT COUNT(*) as c FROM game_players WHERE game_id = ?')
    .get(row.id) as { c: number };
  const section = row.section_id
    ? (db.prepare('SELECT name FROM sections WHERE id = ?').get(row.section_id) as { name: string } | undefined)
    : undefined;
  const host = db
    .prepare('SELECT name FROM users WHERE id = ?')
    .get(row.host_user_id) as { name: string } | undefined;
  return {
    id: row.id as number,
    title: row.title as string,
    gameType: row.game_type as GameType,
    sectionId: row.section_id as number | undefined,
    sectionName: section?.name,
    hostUserId: row.host_user_id as number,
    hostName: host?.name,
    location: row.location as string,
    scheduledAt: row.scheduled_at as string,
    maxPlayers: row.max_players as number,
    currentPlayers: players.c,
    status: row.status as GameStatus,
    description: row.description as string | undefined,
    createdAt: row.created_at as string,
  };
}

export const dbService = {
  findOrCreateUser(data: { telegramId?: string; name: string; username?: string }): User {
    if (data.telegramId) {
      const existing = db
        .prepare('SELECT * FROM users WHERE telegram_id = ?')
        .get(data.telegramId) as Record<string, unknown> | undefined;
      if (existing) {
        if (data.name && existing.name !== data.name) {
          db.prepare('UPDATE users SET name = ?, username = ? WHERE id = ?').run(
            data.name,
            data.username ?? existing.username,
            existing.id
          );
        }
        return mapUser(
          (db.prepare('SELECT * FROM users WHERE telegram_id = ?').get(data.telegramId) as Record<
            string,
            unknown
          >) ?? existing
        );
      }
    }
    const result = db
      .prepare('INSERT INTO users (telegram_id, name, username) VALUES (?, ?, ?)')
      .run(data.telegramId ?? null, data.name, data.username ?? null);
    return mapUser(
      db.prepare('SELECT * FROM users WHERE id = ?').get(result.lastInsertRowid) as Record<string, unknown>
    );
  },

  getUserById(id: number): User | null {
    const row = db.prepare('SELECT * FROM users WHERE id = ?').get(id) as Record<string, unknown> | undefined;
    return row ? mapUser(row) : null;
  },

  getUserByTelegramId(telegramId: string): User | null {
    const row = db
      .prepare('SELECT * FROM users WHERE telegram_id = ?')
      .get(telegramId) as Record<string, unknown> | undefined;
    return row ? mapUser(row) : null;
  },

  setUserSection(userId: number, sectionId: number | null): User | null {
    db.prepare('UPDATE users SET section_id = ? WHERE id = ?').run(sectionId, userId);
    return this.getUserById(userId);
  },

  listSections(): Section[] {
    return (db.prepare('SELECT * FROM sections ORDER BY name').all() as Record<string, unknown>[]).map(
      mapSection
    );
  },

  getSection(id: number): Section | null {
    const row = db.prepare('SELECT * FROM sections WHERE id = ?').get(id) as Record<string, unknown> | undefined;
    return row ? mapSection(row) : null;
  },

  createSection(data: { name: string; description?: string; city?: string }): Section {
    const result = db
      .prepare('INSERT INTO sections (name, description, city) VALUES (?, ?, ?)')
      .run(data.name, data.description ?? null, data.city ?? null);
    return mapSection(
      db.prepare('SELECT * FROM sections WHERE id = ?').get(result.lastInsertRowid) as Record<string, unknown>
    );
  },

  listGames(filters?: { sectionId?: number; status?: GameStatus; gameType?: GameType }): Game[] {
    let sql = `
      SELECT g.* FROM games g
      WHERE 1=1
    `;
    const params: unknown[] = [];

    if (filters?.sectionId) {
      sql += ' AND g.section_id = ?';
      params.push(filters.sectionId);
    }
    if (filters?.status) {
      sql += ' AND g.status = ?';
      params.push(filters.status);
    }
    if (filters?.gameType) {
      sql += ' AND g.game_type = ?';
      params.push(filters.gameType);
    }

    sql += ' ORDER BY g.scheduled_at ASC';
    return (db.prepare(sql).all(...params) as Record<string, unknown>[]).map(mapGame);
  },

  getGame(id: number): Game | null {
    const row = db.prepare('SELECT * FROM games WHERE id = ?').get(id) as Record<string, unknown> | undefined;
    return row ? mapGame(row) : null;
  },

  createGame(data: {
    title: string;
    gameType: GameType;
    sectionId?: number;
    hostUserId: number;
    location: string;
    scheduledAt: string;
    maxPlayers: number;
    description?: string;
  }): Game {
    const result = db
      .prepare(
        `INSERT INTO games (title, game_type, section_id, host_user_id, location, scheduled_at, max_players, description)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        data.title,
        data.gameType,
        data.sectionId ?? null,
        data.hostUserId,
        data.location,
        data.scheduledAt,
        data.maxPlayers,
        data.description ?? null
      );
    const gameId = result.lastInsertRowid as number;
    db.prepare('INSERT INTO game_players (game_id, user_id) VALUES (?, ?)').run(gameId, data.hostUserId);
    return mapGame(db.prepare('SELECT * FROM games WHERE id = ?').get(gameId) as Record<string, unknown>);
  },

  joinGame(gameId: number, userId: number): { game: Game; error?: string } {
    const game = this.getGame(gameId);
    if (!game) return { game: game!, error: 'بازی پیدا نشد' };
    if (game.status !== 'open') return { game, error: 'این بازی دیگر باز نیست' };
    if (game.currentPlayers >= game.maxPlayers) return { game, error: 'ظرفیت بازی تکمیل شده' };

    const existing = db
      .prepare('SELECT id FROM game_players WHERE game_id = ? AND user_id = ?')
      .get(gameId, userId);
    if (existing) return { game, error: 'شما قبلاً عضو این بازی هستید' };

    db.prepare('INSERT INTO game_players (game_id, user_id) VALUES (?, ?)').run(gameId, userId);
    const updated = this.getGame(gameId)!;
    if (updated.currentPlayers >= updated.maxPlayers) {
      db.prepare("UPDATE games SET status = 'full' WHERE id = ?").run(gameId);
    }
    return { game: this.getGame(gameId)! };
  },

  getGamePlayers(gameId: number): GamePlayer[] {
    const rows = db
      .prepare(
        `SELECT gp.*, u.name as user_name FROM game_players gp
         JOIN users u ON u.id = gp.user_id
         WHERE gp.game_id = ?
         ORDER BY gp.joined_at`
      )
      .all(gameId) as Record<string, unknown>[];
    return rows.map((row) => ({
      id: row.id as number,
      gameId: row.game_id as number,
      userId: row.user_id as number,
      userName: row.user_name as string,
      joinedAt: row.joined_at as string,
    }));
  },
};
