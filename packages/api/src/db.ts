import './load-env';
import Database from 'better-sqlite3';
import path from 'path';
import type {
  CoinAward,
  Game,
  GamePlayer,
  GameStatus,
  GameType,
  OnboardingStatus,
  PaymentMethod,
  PaymentOrder,
  PaymentOrderStatus,
  PetBreed,
  PetGender,
  PetMedicalEntry,
  PetMedicalRecord,
  PetProfile,
  PetSize,
  PetSpecies,
  PlaydateRequest,
  PlaydateStatus,
  ProfileRewardSection,
  Section,
  User,
  UserGender,
  UserRole,
  VerificationStatus,
  VetConsultation,
  VetConsultStatus,
  VetCredentialStatus,
} from '@petdate/shared';
import {
  COIN_REASON,
  FACE_VERIFY_REWARD,
  PET_BREEDS_SEED,
  PET_SPECIES,
  PROFILE_REWARD_SECTIONS,
  PROFILE_SECTION_REWARD,
  SIGNUP_BONUS,
} from '@petdate/shared';

/** Absolute DATABASE_PATH wins; relative paths ignored (cwd varies across worktrees). */
function resolveDbPath(): string {
  const raw = (process.env.DATABASE_PATH || '').trim();
  if (raw && path.isAbsolute(raw)) return raw;
  return path.join(__dirname, '..', 'data', 'petdate.db');
}

const dbPath = resolveDbPath();

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
    seedDemoPetsIfEmpty();
    seedFakeDogOwners();
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

    CREATE TABLE IF NOT EXISTS pets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      owner_id INTEGER NOT NULL REFERENCES users(id),
      name TEXT NOT NULL,
      species TEXT NOT NULL,
      breed TEXT,
      age_months INTEGER,
      bio TEXT,
      vaccinated INTEGER NOT NULL DEFAULT 0,
      neutered INTEGER NOT NULL DEFAULT 0,
      looking_for_playmate INTEGER NOT NULL DEFAULT 1,
      personality TEXT NOT NULL DEFAULT '{}',
      health TEXT NOT NULL DEFAULT '{}',
      image_url TEXT,
      city TEXT,
      neighborhood TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS playdate_requests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      from_pet_id INTEGER NOT NULL REFERENCES pets(id),
      to_pet_id INTEGER NOT NULL REFERENCES pets(id),
      from_user_id INTEGER NOT NULL REFERENCES users(id),
      to_user_id INTEGER REFERENCES users(id),
      message TEXT,
      status TEXT NOT NULL DEFAULT 'pending',
      scheduled_at TEXT,
      location TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS pet_species (
      code TEXT PRIMARY KEY,
      label_fa TEXT NOT NULL,
      emoji TEXT NOT NULL DEFAULT '🐾',
      sort_order INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS pet_breeds (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      species_code TEXT NOT NULL REFERENCES pet_species(code),
      name_fa TEXT NOT NULL,
      name_en TEXT,
      sort_order INTEGER NOT NULL DEFAULT 100,
      UNIQUE(species_code, name_fa)
    );
  `);
  migrateSchema();
  seedSpeciesCatalog();
}

function migrateSchema() {
  const userCols = db.prepare("PRAGMA table_info(users)").all() as { name: string }[];
  const names = new Set(userCols.map((c) => c.name));
  if (!names.has('role')) db.exec('ALTER TABLE users ADD COLUMN role TEXT');
  if (!names.has('roles')) db.exec("ALTER TABLE users ADD COLUMN roles TEXT NOT NULL DEFAULT '[]'");
  if (!names.has('onboarding')) {
    db.exec("ALTER TABLE users ADD COLUMN onboarding TEXT NOT NULL DEFAULT 'role_selected'");
  }
  if (!names.has('age')) db.exec('ALTER TABLE users ADD COLUMN age INTEGER');
  if (!names.has('gender')) db.exec('ALTER TABLE users ADD COLUMN gender TEXT');
  if (!names.has('city')) db.exec('ALTER TABLE users ADD COLUMN city TEXT');
  if (!names.has('phone')) db.exec('ALTER TABLE users ADD COLUMN phone TEXT');
  if (!names.has('phone_verified')) {
    db.exec('ALTER TABLE users ADD COLUMN phone_verified INTEGER NOT NULL DEFAULT 0');
  }
  if (!names.has('phone_verified_at')) {
    db.exec('ALTER TABLE users ADD COLUMN phone_verified_at TEXT');
  }
  if (!names.has('bio')) db.exec('ALTER TABLE users ADD COLUMN bio TEXT');
  if (!names.has('avatar_url')) db.exec('ALTER TABLE users ADD COLUMN avatar_url TEXT');
  if (!names.has('province')) db.exec('ALTER TABLE users ADD COLUMN province TEXT');
  if (!names.has('country')) db.exec("ALTER TABLE users ADD COLUMN country TEXT");
  if (!names.has('interests')) db.exec("ALTER TABLE users ADD COLUMN interests TEXT NOT NULL DEFAULT '[]'");
  if (!names.has('coins')) db.exec('ALTER TABLE users ADD COLUMN coins INTEGER NOT NULL DEFAULT 0');
  if (!names.has('last_daily_coin_at')) db.exec('ALTER TABLE users ADD COLUMN last_daily_coin_at TEXT');
  if (!names.has('signup_bonus_claimed')) {
    db.exec('ALTER TABLE users ADD COLUMN signup_bonus_claimed INTEGER NOT NULL DEFAULT 0');
  }
  if (!names.has('profile_rewards')) {
    db.exec("ALTER TABLE users ADD COLUMN profile_rewards TEXT NOT NULL DEFAULT '[]'");
  }
  if (!names.has('profile_views')) db.exec('ALTER TABLE users ADD COLUMN profile_views INTEGER NOT NULL DEFAULT 0');
  if (!names.has('likes_count')) db.exec('ALTER TABLE users ADD COLUMN likes_count INTEGER NOT NULL DEFAULT 0');
  if (!names.has('is_active')) db.exec('ALTER TABLE users ADD COLUMN is_active INTEGER NOT NULL DEFAULT 1');
  if (!names.has('verification_status')) {
    db.exec("ALTER TABLE users ADD COLUMN verification_status TEXT NOT NULL DEFAULT 'none'");
  }
  if (!names.has('verification_photo_file_id')) {
    db.exec('ALTER TABLE users ADD COLUMN verification_photo_file_id TEXT');
  }
  if (!names.has('verified_at')) db.exec('ALTER TABLE users ADD COLUMN verified_at TEXT');
  if (!names.has('verification_note')) db.exec('ALTER TABLE users ADD COLUMN verification_note TEXT');
  if (!names.has('vet_credential_file_id')) {
    db.exec('ALTER TABLE users ADD COLUMN vet_credential_file_id TEXT');
  }
  if (!names.has('vet_credential_status')) {
    db.exec("ALTER TABLE users ADD COLUMN vet_credential_status TEXT NOT NULL DEFAULT 'none'");
  }

  db.exec(`
    CREATE TABLE IF NOT EXISTS coin_ledger (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      reason TEXT NOT NULL,
      amount INTEGER NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(user_id, reason),
      FOREIGN KEY (user_id) REFERENCES users(id)
    );
  `);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_coin_ledger_user ON coin_ledger (user_id);`);

  db.exec(`
    CREATE TABLE IF NOT EXISTS coin_sell_requests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      coins INTEGER NOT NULL,
      rate_toman INTEGER NOT NULL,
      amount_toman INTEGER NOT NULL,
      card_number TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'open',
      admin_note TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      reviewed_at TEXT,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS payment_orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      package_id TEXT NOT NULL,
      coins INTEGER NOT NULL,
      amount_toman INTEGER,
      amount_stars INTEGER,
      method TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      receipt_file_id TEXT,
      telegram_payment_charge_id TEXT,
      admin_note TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      reviewed_at TEXT,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );
  `);
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_payment_orders_user
    ON payment_orders(user_id, status);
  `);
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_payment_orders_status
    ON payment_orders(status, created_at);
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS vet_consultations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      vet_user_id INTEGER NOT NULL REFERENCES users(id),
      patient_user_id INTEGER NOT NULL REFERENCES users(id),
      pet_id INTEGER REFERENCES pets(id),
      status TEXT NOT NULL DEFAULT 'requested',
      notes TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_vet_consultations_vet
      ON vet_consultations (vet_user_id, created_at DESC);
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS pet_medical_records (
      pet_id INTEGER PRIMARY KEY REFERENCES pets(id) ON DELETE CASCADE,
      notes TEXT,
      vaccinations TEXT,
      allergies TEXT,
      chronic_conditions TEXT,
      last_checkup TEXT,
      medications TEXT,
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);
  db.exec(`
    CREATE TABLE IF NOT EXISTS pet_medical_entries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      pet_id INTEGER NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
      author_user_id INTEGER NOT NULL REFERENCES users(id),
      consult_id INTEGER REFERENCES vet_consultations(id),
      text TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_pet_medical_entries_pet
      ON pet_medical_entries (pet_id, created_at DESC);
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS phone_otps (
      user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      phone TEXT NOT NULL,
      code_hash TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      attempts INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  const petCols = db.prepare("PRAGMA table_info(pets)").all() as { name: string }[];
  const petNames = new Set(petCols.map((c) => c.name));
  if (!petNames.has('gender')) db.exec('ALTER TABLE pets ADD COLUMN gender TEXT');
  if (!petNames.has('size')) db.exec('ALTER TABLE pets ADD COLUMN size TEXT');
  if (!petNames.has('color')) db.exec('ALTER TABLE pets ADD COLUMN color TEXT');

  const breedCols = db.prepare('PRAGMA table_info(pet_breeds)').all() as { name: string }[];
  const breedNames = new Set(breedCols.map((c) => c.name));
  if (!breedNames.has('sort_order')) {
    db.exec('ALTER TABLE pet_breeds ADD COLUMN sort_order INTEGER NOT NULL DEFAULT 100');
  }

  // Backfill roles JSON from legacy single role column
  const roleRows = db
    .prepare(`SELECT id, role, roles FROM users WHERE role IS NOT NULL AND role != ''`)
    .all() as { id: number; role: string; roles: string }[];
  const updateRoles = db.prepare('UPDATE users SET roles = ? WHERE id = ?');
  for (const row of roleRows) {
    const parsed = parseRoles(row.roles, row.role);
    if (!parsed.length) continue;
    const current = (() => {
      try {
        const p = JSON.parse(row.roles || '[]');
        return Array.isArray(p) ? p : [];
      } catch {
        return [];
      }
    })();
    if (current.length === 0) {
      updateRoles.run(JSON.stringify(parsed), row.id);
    }
  }
}

function seedSpeciesCatalog() {
  const insertSpecies = db.prepare(
    `INSERT OR IGNORE INTO pet_species (code, label_fa, emoji, sort_order) VALUES (?, ?, ?, ?)`
  );
  PET_SPECIES.forEach((s, i) => insertSpecies.run(s.code, s.labelFa, s.emoji, i));

  const upsertBreed = db.prepare(`
    INSERT INTO pet_breeds (species_code, name_fa, name_en, sort_order)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(species_code, name_fa) DO UPDATE SET
      name_en = excluded.name_en,
      sort_order = excluded.sort_order
  `);

  const keepKeys = new Set<string>();
  for (const b of PET_BREEDS_SEED) {
    upsertBreed.run(b.speciesCode, b.nameFa, b.nameEn ?? null, b.sortOrder);
    keepKeys.add(`${b.speciesCode}::${b.nameFa}`);
  }

  // حذف نژادهای قدیمی که دیگر در کاتالوگ نیستند
  const existing = db
    .prepare('SELECT id, species_code, name_fa FROM pet_breeds')
    .all() as Array<{ id: number; species_code: string; name_fa: string }>;
  const del = db.prepare('DELETE FROM pet_breeds WHERE id = ?');
  for (const row of existing) {
    if (!keepKeys.has(`${row.species_code}::${row.name_fa}`)) {
      del.run(row.id);
    }
  }
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

function seedDemoPetsIfEmpty() {
  const count = db.prepare('SELECT COUNT(*) as c FROM pets').get() as { c: number };
  if (count.c > 0) return;

  db.prepare("UPDATE users SET role = 'pet_owner', onboarding = 'profile_complete' WHERE id IN (1, 2)").run();

  const insertPet = db.prepare(`
    INSERT INTO pets (
      owner_id, name, species, breed, gender, age_months, size, color, bio,
      vaccinated, neutered, looking_for_playmate, image_url, city, neighborhood
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insertPet.run(
    1, 'ماکس', 'dog', 'گلدن رتریور', 'male', 24, 'large', 'طلایی',
    'بسیار بازیگوش و اجتماعی', 1, 1, 1,
    DEMO_DOG_PHOTOS[0], 'تهران', 'جردن'
  );
  insertPet.run(
    1, 'لونا', 'cat', 'پرشین', 'female', 18, 'small', 'سفید',
    'آرام و مهربان', 1, 1, 1,
    'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?auto=format&fit=crop&w=800&q=80',
    'تهران', 'ولنجک'
  );
  insertPet.run(
    2, 'راکی', 'dog', 'هاسکی', 'male', 30, 'large', 'خاکستری',
    'دوست داره دویدن', 1, 0, 1,
    DEMO_DOG_PHOTOS[1], 'تهران', 'سعادت‌آباد'
  );
}

/** عکس‌های عمومی سگ (HTTPS) — برای نمایش در تلگرام */
const DEMO_DOG_PHOTOS = [
  'https://images.unsplash.com/photo-1552053831-71594a27632d?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1587300003388-59208cc962cb?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1517849845537-4d257902454a?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1530281700549-e82e7bf110d6?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1548199973-03cce0bbc87b?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1477884213360-7e9d7dcc1e48?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1561037404-61cd46aa615b?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1583511655857-d19b40a7a54e?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1537151608828-ea2b11777ee8?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1583337130417-3346a1be7dee?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1544568100-847a948585b9?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1601758228041-f3b2795255f1?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1507146426996-ef05306b995a?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1598133894008-61f7fdb8cc3a?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1588943211346-0908a1fb0b01?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1576201836106-db1758fd1c97?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1558788353-f76d92427f16?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1529429617124-95b109e86ad8?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1518717756530-d6d9b0b8a0e5?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1596492784531-6e6eb5ea9993?auto=format&fit=crop&w=800&q=80',
] as const;

const FAKE_DOG_OWNERS: Array<{
  telegramId: string;
  name: string;
  username: string;
  city: string;
  province: string;
  gender: UserGender;
  age: number;
  dogs: Array<{
    name: string;
    breed: string;
    gender: PetGender;
    ageMonths: number;
    size: PetSize;
    color: string;
    bio: string;
    city: string;
    neighborhood: string;
  }>;
}> = [
  {
    telegramId: 'fake_owner_01',
    name: 'نیما کریمی',
    username: 'nima_k',
    city: 'تهران',
    province: 'تهران',
    gender: 'male',
    age: 29,
    dogs: [
      { name: 'ماکس', breed: 'گلدن رتریور', gender: 'male', ageMonths: 36, size: 'large', color: 'طلایی', bio: 'عاشق توپ و پارک', city: 'تهران', neighborhood: 'جردن' },
      { name: 'بلا', breed: 'لابرادور', gender: 'female', ageMonths: 24, size: 'large', color: 'شکلاتی', bio: 'مهربون و آرام', city: 'تهران', neighborhood: 'جردن' },
    ],
  },
  {
    telegramId: 'fake_owner_02',
    name: 'سارا احمدی',
    username: 'sara_ahm',
    city: 'تهران',
    province: 'تهران',
    gender: 'female',
    age: 27,
    dogs: [
      { name: 'لونا', breed: 'هاسکی', gender: 'female', ageMonths: 30, size: 'large', color: 'خاکستری-سفید', bio: 'پر انرژی و بازیگوش', city: 'تهران', neighborhood: 'سعادت‌آباد' },
      { name: 'تدی', breed: 'پامرانین', gender: 'male', ageMonths: 18, size: 'small', color: 'نارنجی', bio: 'کوچولو ولی شجاع', city: 'تهران', neighborhood: 'سعادت‌آباد' },
    ],
  },
  {
    telegramId: 'fake_owner_03',
    name: 'رضا موسوی',
    username: 'reza_m',
    city: 'کرج',
    province: 'البرز',
    gender: 'male',
    age: 34,
    dogs: [
      { name: 'راکی', breed: 'ژرمن شپرد', gender: 'male', ageMonths: 48, size: 'large', color: 'مشکی-قهوه‌ای', bio: 'نگهبان خونه‌ست', city: 'کرج', neighborhood: 'گوهردشت' },
      { name: 'میلو', breed: 'بیگل', gender: 'male', ageMonths: 20, size: 'medium', color: 'سه‌رنگ', bio: 'بینی قوی، دنبال بو!', city: 'کرج', neighborhood: 'گوهردشت' },
    ],
  },
  {
    telegramId: 'fake_owner_04',
    name: 'مریم حسینی',
    username: 'maryam_h',
    city: 'اصفهان',
    province: 'اصفهان',
    gender: 'female',
    age: 31,
    dogs: [
      { name: 'کوکا', breed: 'شیتزو', gender: 'female', ageMonths: 22, size: 'small', color: 'سفید', bio: 'دوست داره بغل بشه', city: 'اصفهان', neighborhood: 'جلفا' },
      { name: 'بادی', breed: 'بولداگ فرانسوی', gender: 'male', ageMonths: 28, size: 'medium', color: 'خاکستری', bio: 'خنده‌دار و تنبل', city: 'اصفهان', neighborhood: 'جلفا' },
    ],
  },
  {
    telegramId: 'fake_owner_05',
    name: 'امیر جعفری',
    username: 'amir_j',
    city: 'شیراز',
    province: 'فارس',
    gender: 'male',
    age: 26,
    dogs: [
      { name: 'چیس', breed: 'مرزپایه', gender: 'male', ageMonths: 16, size: 'medium', color: 'مشکی-سفید', bio: 'باحال و سریع', city: 'شیراز', neighborhood: 'معالی‌آباد' },
      { name: 'نالا', breed: 'مالینویز', gender: 'female', ageMonths: 40, size: 'large', color: 'قهوه‌ای', bio: 'ورزشی و باهوش', city: 'شیراز', neighborhood: 'معالی‌آباد' },
    ],
  },
  {
    telegramId: 'fake_owner_06',
    name: 'یگانه رضایی',
    username: 'yegane_r',
    city: 'مشهد',
    province: 'خراسان رضوی',
    gender: 'female',
    age: 24,
    dogs: [
      { name: 'داکوتا', breed: 'هاسکی سیبری', gender: 'female', ageMonths: 26, size: 'large', color: 'سفید', bio: 'چشم آبی داره', city: 'مشهد', neighborhood: 'احمدآباد' },
      { name: 'پوچی', breed: 'چیهواهوا', gender: 'male', ageMonths: 14, size: 'small', color: 'قهوه‌ای', bio: 'جیغ‌جیغو ولی بامزه', city: 'مشهد', neighborhood: 'احمدآباد' },
    ],
  },
  {
    telegramId: 'fake_owner_07',
    name: 'حسین کاظمی',
    username: 'hossein_k',
    city: 'تبریز',
    province: 'آذربایجان شرقی',
    gender: 'male',
    age: 38,
    dogs: [
      { name: 'آتو', breed: 'آکیتا', gender: 'male', ageMonths: 42, size: 'large', color: 'سفید-نارنجی', bio: 'وفادار و جدی', city: 'تبریز', neighborhood: 'ولیعصر' },
      { name: 'سفید', breed: 'ساموید', gender: 'female', ageMonths: 20, size: 'medium', color: 'سفید', bio: 'مثل ابر پنبه‌ای', city: 'تبریز', neighborhood: 'ولیعصر' },
    ],
  },
  {
    telegramId: 'fake_owner_08',
    name: 'النا مرادی',
    username: 'elena_m',
    city: 'تهران',
    province: 'تهران',
    gender: 'female',
    age: 33,
    dogs: [
      { name: 'کویین', breed: 'پودل', gender: 'female', ageMonths: 32, size: 'medium', color: 'کرم', bio: 'مرتب و شیک', city: 'تهران', neighborhood: 'ونک' },
      { name: 'جک', breed: 'جک راسل', gender: 'male', ageMonths: 18, size: 'small', color: 'سفید-قهوه‌ای', bio: 'همیشه در حال دویدن', city: 'تهران', neighborhood: 'ونک' },
    ],
  },
  {
    telegramId: 'fake_owner_09',
    name: 'پویا نوری',
    username: 'pouya_n',
    city: 'اهواز',
    province: 'خوزستان',
    gender: 'male',
    age: 30,
    dogs: [
      { name: 'رکس', breed: 'روتوایلر', gender: 'male', ageMonths: 36, size: 'large', color: 'مشکی-قهوه‌ای', bio: 'قوی و محافظ', city: 'اهواز', neighborhood: 'کیانپارس' },
      { name: 'لیلا', breed: 'داکسوند', gender: 'female', ageMonths: 24, size: 'small', color: 'قهوه‌ای', bio: 'بدن دراز، قلب بزرگ', city: 'اهواز', neighborhood: 'کیانپارس' },
    ],
  },
  {
    telegramId: 'fake_owner_10',
    name: 'نازنین شریفی',
    username: 'nazanin_sh',
    city: 'قم',
    province: 'قم',
    gender: 'female',
    age: 28,
    dogs: [
      { name: 'مالی', breed: 'مالیتیز', gender: 'female', ageMonths: 15, size: 'small', color: 'سفید', bio: 'پر حرف و بامزه', city: 'قم', neighborhood: 'پردیسان' },
      { name: 'برنو', breed: 'باکسر', gender: 'male', ageMonths: 28, size: 'large', color: 'قهوه‌ای', bio: 'بازیگوش و وفادار', city: 'قم', neighborhood: 'پردیسان' },
    ],
  },
];

function seedFakeDogOwners() {
  const existing = db
    .prepare("SELECT id FROM users WHERE telegram_id = 'fake_owner_01'")
    .get() as { id: number } | undefined;

  if (!existing) {
    const insertUser = db.prepare(`
      INSERT INTO users (
        telegram_id, name, username, role, onboarding, age, gender, city, province,
        bio, interests, coins, is_active
      ) VALUES (?, ?, ?, 'pet_owner', 'profile_complete', ?, ?, ?, ?, ?, '[]', 50, 1)
    `);

    const insertPet = db.prepare(`
      INSERT INTO pets (
        owner_id, name, species, breed, gender, age_months, size, color, bio,
        vaccinated, neutered, looking_for_playmate, image_url, city, neighborhood
      ) VALUES (?, ?, 'dog', ?, ?, ?, ?, ?, ?, 1, ?, 1, ?, ?, ?)
    `);

    let photoIdx = 0;
    for (const owner of FAKE_DOG_OWNERS) {
      const result = insertUser.run(
        owner.telegramId,
        owner.name,
        owner.username,
        owner.age,
        owner.gender,
        owner.city,
        owner.province,
        `صاحب پت در ${owner.city}`
      );
      const ownerId = Number(result.lastInsertRowid);

      owner.dogs.forEach((dog, dogIdx) => {
        const imageUrl = DEMO_DOG_PHOTOS[photoIdx % DEMO_DOG_PHOTOS.length];
        photoIdx += 1;
        insertPet.run(
          ownerId,
          dog.name,
          dog.breed,
          dog.gender,
          dog.ageMonths,
          dog.size,
          dog.color,
          dog.bio,
          dogIdx === 0 ? 1 : 0,
          imageUrl,
          dog.city,
          dog.neighborhood
        );
      });
    }

    console.log('🐾 seeded 10 fake owners with 20 dogs (+photos)');
  }

  // پر کردن عکس برای پت‌هایی که هنوز image_url ندارند
  const missing = db
    .prepare(`SELECT id, species FROM pets WHERE image_url IS NULL OR image_url = ''`)
    .all() as Array<{ id: number; species: string }>;
  if (missing.length) {
    const update = db.prepare('UPDATE pets SET image_url = ?, updated_at = datetime(\'now\') WHERE id = ?');
    const catPhoto =
      'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?auto=format&fit=crop&w=800&q=80';
    for (const pet of missing) {
      const photo =
        pet.species === 'cat'
          ? catPhoto
          : DEMO_DOG_PHOTOS[pet.id % DEMO_DOG_PHOTOS.length]!;
      update.run(photo, pet.id);
    }
    console.log(`🐾 backfilled photos for ${missing.length} pets`);
  }

  db.prepare("UPDATE pets SET name = 'داکوتا' WHERE name = 'داکota'").run();
}

function parseInterests(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(String);
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value) as unknown;
      return Array.isArray(parsed) ? parsed.map(String) : [];
    } catch {
      return value
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
    }
  }
  return [];
}

function parseRoles(value: unknown, fallbackRole?: unknown): UserRole[] {
  const fromJson = (() => {
    if (Array.isArray(value)) return value.map(String);
    if (typeof value === 'string' && value.trim()) {
      try {
        const parsed = JSON.parse(value) as unknown;
        return Array.isArray(parsed) ? parsed.map(String) : [];
      } catch {
        return [];
      }
    }
    return [];
  })();
  const roles = fromJson.filter((r): r is UserRole =>
    ['pet_owner', 'vet', 'no_pet', 'pet_seeker', 'community_seeker', 'trainer', 'pet_sitter'].includes(r)
  );
  if (roles.length) return [...new Set(roles)];
  if (
    typeof fallbackRole === 'string' &&
    ['pet_owner', 'vet', 'no_pet', 'pet_seeker', 'community_seeker', 'trainer', 'pet_sitter'].includes(
      fallbackRole
    )
  ) {
    return [fallbackRole as UserRole];
  }
  return [];
}

function parseProfileRewards(value: unknown): string[] {
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value) as unknown;
      if (Array.isArray(parsed)) return parsed.map(String);
    } catch {
      return [];
    }
  }
  if (Array.isArray(value)) return value.map(String);
  return [];
}

function isProfileSectionFilled(section: ProfileRewardSection, u: User): boolean {
  switch (section) {
    case 'name':
      return Boolean(u.name?.trim());
    case 'age':
      return u.age != null && Number(u.age) > 0;
    case 'gender':
      return Boolean(u.gender);
    case 'location':
      return Boolean(
        u.country?.trim() &&
          u.city?.trim() &&
          (u.country !== 'ایران' || Boolean(u.province?.trim()))
      );
    case 'phone':
      return Boolean(u.phone?.trim());
    case 'photo':
      return Boolean(u.avatarUrl?.trim());
    case 'bio':
      return Boolean(u.bio?.trim());
    case 'interests':
      return Boolean(u.interests && u.interests.length > 0);
    default:
      return false;
  }
}

function mapUser(row: Record<string, unknown>): User {
  const roles = parseRoles(row.roles, row.role);
  const role =
    (row.role as UserRole | undefined) ??
    (roles.includes('pet_owner') ? 'pet_owner' : roles[0]);
  return {
    id: row.id as number,
    telegramId: row.telegram_id as string | undefined,
    name: row.name as string,
    username: row.username as string | undefined,
    sectionId: row.section_id as number | undefined,
    role,
    roles,
    onboarding: (row.onboarding as OnboardingStatus | undefined) ?? undefined,
    age: row.age != null ? Number(row.age) : undefined,
    gender: row.gender as UserGender | undefined,
    country: row.country as string | undefined,
    city: row.city as string | undefined,
    province: row.province as string | undefined,
    phone: row.phone as string | undefined,
    phoneVerified: row.phone_verified == null ? false : Boolean(row.phone_verified),
    phoneVerifiedAt: (row.phone_verified_at as string | undefined) ?? undefined,
    bio: row.bio as string | undefined,
    interests: parseInterests(row.interests),
    avatarUrl: row.avatar_url as string | undefined,
    coins: row.coins != null ? Number(row.coins) : 0,
    lastDailyCoinAt: (row.last_daily_coin_at as string | undefined) ?? undefined,
    signupBonusClaimed: Boolean(row.signup_bonus_claimed),
    profileRewards: parseProfileRewards(row.profile_rewards),
    profileViews: row.profile_views != null ? Number(row.profile_views) : 0,
    likesCount: row.likes_count != null ? Number(row.likes_count) : 0,
    isActive: row.is_active == null ? true : Boolean(row.is_active),
    verificationStatus: parseVerificationStatus(row.verification_status),
    verificationPhotoFileId: (row.verification_photo_file_id as string | undefined) ?? undefined,
    verifiedAt: (row.verified_at as string | undefined) ?? undefined,
    verificationNote: (row.verification_note as string | undefined) ?? undefined,
    vetCredentialFileId: (row.vet_credential_file_id as string | undefined) ?? undefined,
    vetCredentialStatus: parseVetCredentialStatus(row.vet_credential_status),
    createdAt: row.created_at as string,
  };
}

function parseVerificationStatus(value: unknown): VerificationStatus {
  if (value === 'pending' || value === 'verified' || value === 'rejected' || value === 'none') {
    return value;
  }
  return 'none';
}

function parseVetCredentialStatus(value: unknown): VetCredentialStatus {
  if (value === 'pending' || value === 'verified' || value === 'none') {
    return value;
  }
  return 'none';
}

function parseJsonObject(value: unknown): Record<string, unknown> {
  if (typeof value === 'string') {
    try {
      return JSON.parse(value) as Record<string, unknown>;
    } catch {
      return {};
    }
  }
  return {};
}

function mapPet(row: Record<string, unknown>): PetProfile {
  return {
    id: row.id as number,
    ownerId: row.owner_id as number,
    name: row.name as string,
    species: row.species as string,
    breed: row.breed as string | undefined,
    gender: row.gender as PetGender | undefined,
    ageMonths: row.age_months as number | undefined,
    size: row.size as PetSize | undefined,
    color: row.color as string | undefined,
    bio: row.bio as string | undefined,
    vaccinated: Boolean(row.vaccinated),
    neutered: Boolean(row.neutered),
    lookingForPlaymate: Boolean(row.looking_for_playmate),
    personality: parseJsonObject(row.personality),
    health: parseJsonObject(row.health),
    imageUrl: row.image_url as string | undefined,
    city: row.city as string | undefined,
    neighborhood: row.neighborhood as string | undefined,
    ownerProvince: (row.owner_province as string | undefined) ?? undefined,
    ownerCity: (row.owner_city as string | undefined) ?? undefined,
    ownerVerified: row.owner_verified != null ? Boolean(row.owner_verified) : undefined,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

function mapPlaydate(row: Record<string, unknown>): PlaydateRequest {
  return {
    id: row.id as number,
    fromPetId: row.from_pet_id as number,
    toPetId: row.to_pet_id as number,
    fromUserId: row.from_user_id as number,
    toUserId: row.to_user_id as number | undefined,
    message: row.message as string | undefined,
    status: row.status as PlaydateStatus,
    scheduledAt: row.scheduled_at as string | undefined,
    location: row.location as string | undefined,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

function mapPaymentOrder(row: Record<string, unknown>): PaymentOrder {
  return {
    id: row.id as number,
    userId: row.user_id as number,
    packageId: row.package_id as string,
    coins: Number(row.coins),
    amountToman: row.amount_toman != null ? Number(row.amount_toman) : undefined,
    amountStars: row.amount_stars != null ? Number(row.amount_stars) : undefined,
    method: row.method as PaymentMethod,
    status: row.status as PaymentOrderStatus,
    receiptFileId: (row.receipt_file_id as string | undefined) ?? undefined,
    telegramPaymentChargeId: (row.telegram_payment_charge_id as string | undefined) ?? undefined,
    adminNote: (row.admin_note as string | undefined) ?? undefined,
    createdAt: row.created_at as string,
    reviewedAt: (row.reviewed_at as string | undefined) ?? undefined,
    userName: (row.user_name as string | undefined) ?? undefined,
    userTelegramId: (row.user_telegram_id as string | undefined) ?? undefined,
    userUsername: (row.user_username as string | undefined) ?? undefined,
  };
}

function mapVetConsultation(row: Record<string, unknown>): VetConsultation {
  return {
    id: row.id as number,
    vetUserId: row.vet_user_id as number,
    patientUserId: row.patient_user_id as number,
    petId: row.pet_id != null ? Number(row.pet_id) : undefined,
    status: row.status as VetConsultStatus,
    notes: (row.notes as string | undefined) ?? undefined,
    createdAt: row.created_at as string,
    patientName: (row.patient_name as string | undefined) ?? undefined,
    patientCity: (row.patient_city as string | undefined) ?? undefined,
    petName: (row.pet_name as string | undefined) ?? undefined,
    petSpecies: (row.pet_species as string | undefined) ?? undefined,
    petBreed: (row.pet_breed as string | undefined) ?? undefined,
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
  findOrCreateUser(data: {
    telegramId?: string;
    name: string;
    username?: string;
  }): { user: User; created: boolean } {
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
        return {
          user: mapUser(
            (db.prepare('SELECT * FROM users WHERE telegram_id = ?').get(data.telegramId) as Record<
              string,
              unknown
            >) ?? existing
          ),
          created: false,
        };
      }
    }
    const result = db
      .prepare('INSERT INTO users (telegram_id, name, username) VALUES (?, ?, ?)')
      .run(data.telegramId ?? null, data.name, data.username ?? null);
    return {
      user: mapUser(
        db.prepare('SELECT * FROM users WHERE id = ?').get(result.lastInsertRowid) as Record<
          string,
          unknown
        >
      ),
      created: true,
    };
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

  setUserRole(userId: number, role: UserRole): User | null {
    const existing = this.getUserById(userId);
    if (!existing) return null;
    const current = existing.roles?.length
      ? existing.roles
      : existing.role
        ? [existing.role]
        : [];
    // سوییچ نقش فعال بدون حذف نقش‌های دیگر
    if (current.includes(role) && current.length > 0) {
      return this.setUserPrimaryRole(userId, role);
    }
    return this.setUserRoles(userId, [role]);
  },

  /** فقط نقش فعال را عوض می‌کند؛ لیست roles حفظ می‌شود */
  setUserPrimaryRole(userId: number, role: UserRole): User | null {
    const existing = this.getUserById(userId);
    if (!existing) return null;
    const current = existing.roles?.length
      ? existing.roles
      : existing.role
        ? [existing.role]
        : [];
    if (!current.includes(role)) return null;
    const reordered = [role, ...current.filter((r) => r !== role)];
    db.prepare('UPDATE users SET role = ?, roles = ? WHERE id = ?').run(
      role,
      JSON.stringify(reordered),
      userId
    );
    return this.getUserById(userId);
  },

  setUserRoles(userId: number, roles: UserRole[]): User | null {
    const normalized = [...new Set(roles.filter(Boolean))];
    if (normalized.length === 0) return null;
    const existing = this.getUserById(userId);
    const keepPrimary =
      existing?.role && normalized.includes(existing.role) ? existing.role : undefined;
    const primary =
      keepPrimary ?? (normalized.includes('pet_owner') ? 'pet_owner' : normalized[0]!);
    db.prepare(
      "UPDATE users SET role = ?, roles = ?, onboarding = 'role_selected' WHERE id = ?"
    ).run(primary, JSON.stringify(normalized), userId);
    return this.getUserById(userId);
  },

  setUserOnboarding(userId: number, onboarding: OnboardingStatus): User | null {
    db.prepare('UPDATE users SET onboarding = ? WHERE id = ?').run(onboarding, userId);
    return this.getUserById(userId);
  },

  setUserOnboardingByTelegramId(telegramId: string, onboarding: OnboardingStatus): User | null {
    const user = this.getUserByTelegramId(telegramId);
    if (!user) return null;
    return this.setUserOnboarding(user.id, onboarding);
  },

  setUserRoleByTelegramId(telegramId: string, role: UserRole): User | null {
    const user = this.getUserByTelegramId(telegramId);
    if (!user) return null;
    return this.setUserRole(user.id, role);
  },

  setUserPrimaryRoleByTelegramId(telegramId: string, role: UserRole): User | null {
    const user = this.getUserByTelegramId(telegramId);
    if (!user) return null;
    return this.setUserPrimaryRole(user.id, role);
  },

  setUserRolesByTelegramId(telegramId: string, roles: UserRole[]): User | null {
    const user = this.getUserByTelegramId(telegramId);
    if (!user) return null;
    return this.setUserRoles(user.id, roles);
  },

  updateUserProfile(
    userId: number,
    patch: Partial<{
      name: string;
      age: number;
      gender: UserGender;
      country: string;
      city: string;
      province: string;
      phone: string;
      bio: string;
      interests: string[];
      avatarUrl: string;
      coins: number;
      onboarding: OnboardingStatus;
      isActive: boolean;
    }>
  ): User | null {
    const existing = this.getUserById(userId);
    if (!existing) return null;

    const fields: string[] = [];
    const values: unknown[] = [];
    if (patch.name !== undefined) { fields.push('name = ?'); values.push(patch.name); }
    if (patch.age !== undefined) { fields.push('age = ?'); values.push(patch.age); }
    if (patch.gender !== undefined) { fields.push('gender = ?'); values.push(patch.gender); }
    if (patch.country !== undefined) { fields.push('country = ?'); values.push(patch.country); }
    if (patch.city !== undefined) { fields.push('city = ?'); values.push(patch.city); }
    if (patch.province !== undefined) { fields.push('province = ?'); values.push(patch.province); }
    if (patch.phone !== undefined) {
      fields.push('phone = ?');
      values.push(patch.phone);
      // تغییر شماره بدون OTP → لغو تأیید قبلی
      if (patch.phone !== existing.phone) {
        fields.push('phone_verified = ?');
        values.push(0);
        fields.push('phone_verified_at = ?');
        values.push(null);
      }
    }
    if (patch.bio !== undefined) { fields.push('bio = ?'); values.push(patch.bio); }
    if (patch.interests !== undefined) {
      fields.push('interests = ?');
      values.push(JSON.stringify(patch.interests));
    }
    if (patch.avatarUrl !== undefined) { fields.push('avatar_url = ?'); values.push(patch.avatarUrl); }
    if (patch.coins !== undefined) { fields.push('coins = ?'); values.push(patch.coins); }
    if (patch.onboarding !== undefined) { fields.push('onboarding = ?'); values.push(patch.onboarding); }
    if (patch.isActive !== undefined) { fields.push('is_active = ?'); values.push(patch.isActive ? 1 : 0); }

    if (fields.length === 0) return existing;
    values.push(userId);
    db.prepare(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`).run(...values);
    const updated = this.getUserById(userId);
    if (!updated) return null;
    const awards = this.claimProfileSectionRewards(existing, updated);
    if (!awards.length) return updated;
    const fresh = this.getUserById(userId) ?? updated;
    return { ...fresh, awardedRewards: awards };
  },

  updateUserProfileByTelegramId(
    telegramId: string,
    patch: Partial<{
      name: string;
      age: number;
      gender: UserGender;
      country: string;
      city: string;
      province: string;
      phone: string;
      bio: string;
      interests: string[];
      avatarUrl: string;
      coins: number;
      onboarding: OnboardingStatus;
      isActive: boolean;
    }>
  ): User | null {
    const user = this.getUserByTelegramId(telegramId);
    if (!user) return null;
    return this.updateUserProfile(user.id, patch);
  },

  setUserActiveByTelegramId(telegramId: string, isActive: boolean): User | null {
    return this.updateUserProfileByTelegramId(telegramId, { isActive });
  },

  /** Soft-delete: anonymize + detach telegram so /start can create a fresh account */
  deleteUserByTelegramId(telegramId: string): boolean {
    const user = this.getUserByTelegramId(telegramId);
    if (!user) return false;
    db.prepare(
      `UPDATE users SET
         telegram_id = NULL,
         username = NULL,
         name = ?,
         phone = NULL,
         phone_verified = 0,
         phone_verified_at = NULL,
         bio = NULL,
         avatar_url = NULL,
         interests = '[]',
         is_active = 0,
         onboarding = 'role_selected',
         role = NULL,
         verification_status = 'none',
         verification_photo_file_id = NULL,
         verified_at = NULL,
         verification_note = NULL,
         vet_credential_file_id = NULL,
         vet_credential_status = 'none'
       WHERE id = ?`
    ).run(`[حذف‌شده #${user.id}]`, user.id);
    db.prepare('DELETE FROM phone_otps WHERE user_id = ?').run(user.id);
    return true;
  },

  upsertPhoneOtp(data: {
    userId: number;
    phone: string;
    codeHash: string;
    expiresAt: string;
  }): void {
    db.prepare(
      `INSERT INTO phone_otps (user_id, phone, code_hash, expires_at, attempts, created_at)
       VALUES (?, ?, ?, ?, 0, datetime('now'))
       ON CONFLICT(user_id) DO UPDATE SET
         phone = excluded.phone,
         code_hash = excluded.code_hash,
         expires_at = excluded.expires_at,
         attempts = 0,
         created_at = datetime('now')`
    ).run(data.userId, data.phone, data.codeHash, data.expiresAt);
  },

  getActivePhoneOtp(userId: number): {
    userId: number;
    phone: string;
    codeHash: string;
    expiresAt: string;
    attempts: number;
    createdAt: string;
  } | null {
    const row = db
      .prepare('SELECT * FROM phone_otps WHERE user_id = ?')
      .get(userId) as Record<string, unknown> | undefined;
    if (!row) return null;
    return {
      userId: row.user_id as number,
      phone: row.phone as string,
      codeHash: row.code_hash as string,
      expiresAt: row.expires_at as string,
      attempts: Number(row.attempts ?? 0),
      createdAt: row.created_at as string,
    };
  },

  bumpPhoneOtpAttempts(userId: number): number {
    db.prepare('UPDATE phone_otps SET attempts = attempts + 1 WHERE user_id = ?').run(userId);
    const row = this.getActivePhoneOtp(userId);
    return row?.attempts ?? 0;
  },

  deletePhoneOtpsForUser(userId: number): void {
    db.prepare('DELETE FROM phone_otps WHERE user_id = ?').run(userId);
  },

  markPhoneVerified(userId: number, phone: string): User | null {
    db.prepare(
      `UPDATE users SET
         phone = ?,
         phone_verified = 1,
         phone_verified_at = datetime('now')
       WHERE id = ?`
    ).run(phone, userId);
    return this.getUserById(userId);
  },

  listPendingVerifications(): User[] {
    return (
      db
        .prepare(
          `SELECT * FROM users
           WHERE verification_status = 'pending'
           ORDER BY id ASC`
        )
        .all() as Record<string, unknown>[]
    ).map(mapUser);
  },

  listPendingVetCredentials(): User[] {
    return (
      db
        .prepare(
          `SELECT * FROM users
           WHERE vet_credential_status = 'pending'
           ORDER BY id ASC`
        )
        .all() as Record<string, unknown>[]
    ).map(mapUser);
  },

  submitVetCredential(
    userId: number,
    fileId: string
  ): { ok: true; user: User } | { ok: false; reason: 'missing' | 'no_file' } {
    const existing = this.getUserById(userId);
    if (!existing) return { ok: false, reason: 'missing' };
    const file = fileId?.trim();
    if (!file) return { ok: false, reason: 'no_file' };
    db.prepare(
      `UPDATE users SET
         vet_credential_status = 'pending',
         vet_credential_file_id = ?
       WHERE id = ?`
    ).run(file, userId);
    return { ok: true, user: this.getUserById(userId)! };
  },

  approveVetCredential(userId: number): User | null {
    const existing = this.getUserById(userId);
    if (!existing || existing.vetCredentialStatus !== 'pending') return null;
    db.prepare(`UPDATE users SET vet_credential_status = 'verified' WHERE id = ?`).run(userId);
    return this.getUserById(userId);
  },

  rejectVetCredential(userId: number): User | null {
    const existing = this.getUserById(userId);
    if (!existing || existing.vetCredentialStatus !== 'pending') return null;
    db.prepare(
      `UPDATE users SET
         vet_credential_status = 'none',
         vet_credential_file_id = NULL
       WHERE id = ?`
    ).run(userId);
    return this.getUserById(userId);
  },

  submitVerification(
    userId: number,
    photoFileId: string
  ): { ok: true; user: User } | { ok: false; reason: 'missing' | 'already_verified' | 'no_photo' } {
    const existing = this.getUserById(userId);
    if (!existing) return { ok: false, reason: 'missing' };
    if (existing.verificationStatus === 'verified') {
      return { ok: false, reason: 'already_verified' };
    }
    const photo = photoFileId?.trim();
    if (!photo) return { ok: false, reason: 'no_photo' };
    db.prepare(
      `UPDATE users SET
         verification_status = 'pending',
         verification_photo_file_id = ?,
         verification_note = NULL,
         verified_at = NULL
       WHERE id = ?`
    ).run(photo, userId);
    // Keep avatar in sync when submitting profile photo for review
    if (!existing.avatarUrl || existing.avatarUrl !== photo) {
      db.prepare('UPDATE users SET avatar_url = ? WHERE id = ?').run(photo, userId);
    }
    return { ok: true, user: this.getUserById(userId)! };
  },

  approveVerification(userId: number, rewardCoins = FACE_VERIFY_REWARD): User | null {
    const existing = this.getUserById(userId);
    if (!existing || existing.verificationStatus !== 'pending') return null;
    const reward = Math.max(0, Number.isFinite(rewardCoins) ? rewardCoins : FACE_VERIFY_REWARD);
    const tx = db.transaction(() => {
      const upd = db
        .prepare(
          `UPDATE users SET
             verification_status = 'verified',
             verified_at = datetime('now'),
             verification_note = NULL
           WHERE id = ? AND verification_status = 'pending'`
        )
        .run(userId);
      if (upd.changes === 0) return null;
      const awards: CoinAward[] = [];
      if (reward > 0) {
        const credited = this.creditCoinsOnce(userId, reward, COIN_REASON.faceVerify);
        if (credited.awarded) {
          awards.push({ reason: COIN_REASON.faceVerify, amount: reward });
        }
      }
      const user = this.getUserById(userId);
      if (!user) return null;
      return { ...user, awardedRewards: awards };
    });
    return tx();
  },

  /**
   * دامپزشک‌های واجد شرایط برای اتصال سریع.
   * احراز چهره الزامی نیست.
   * ترجیح: نقش vet + phone_verified؛ اگر هنوز کسی موبایل تأیید نکرده،
   * همهٔ کاربران فعال با نقش vet برمی‌گردند (برای تست/rollout پیامک).
   */
  listVerifiedVets(): User[] {
    const rows = db
      .prepare(
        `SELECT * FROM users
         WHERE is_active = 1
           AND (
             role = 'vet'
             OR roles LIKE '%"vet"%'
           )
         ORDER BY
           CASE WHEN COALESCE(phone_verified, 0) = 1 THEN 0 ELSE 1 END,
           id DESC`
      )
      .all() as Record<string, unknown>[];
    const vets = rows
      .map(mapUser)
      .filter((u) => {
        const roles = u.roles?.length ? u.roles : u.role ? [u.role] : [];
        return roles.includes('vet');
      });
    const phoneOk = vets.filter((v) => Boolean(v.phoneVerified));
    return phoneOk.length > 0 ? phoneOk : vets;
  },

  /** کم کردن سکه اتمیک؛ اگر موجودی کافی نباشد null */
  debitCoins(userId: number, amount: number): User | null {
    if (amount <= 0) return this.getUserById(userId);
    const result = db
      .prepare(
        `UPDATE users SET coins = coins - ?
         WHERE id = ? AND COALESCE(coins, 0) >= ?`
      )
      .run(amount, userId, amount);
    if (result.changes === 0) return null;
    return this.getUserById(userId);
  },

  creditCoins(userId: number, amount: number, reason?: string): User | null {
    if (amount <= 0) return this.getUserById(userId);
    if (reason) {
      const once = this.creditCoinsOnce(userId, amount, reason);
      return once.user;
    }
    db.prepare(`UPDATE users SET coins = COALESCE(coins, 0) + ? WHERE id = ?`).run(amount, userId);
    return this.getUserById(userId);
  },

  /**
   * واریز idempotent با کلید یکتا در coin_ledger.
   * اگر reason قبلاً ثبت شده باشد، سکه اضافه نمی‌شود.
   */
  creditCoinsOnce(
    userId: number,
    amount: number,
    reason: string
  ): { awarded: boolean; user: User | null; amount: number } {
    const user = this.getUserById(userId);
    if (!user) return { awarded: false, user: null, amount: 0 };
    const safeAmount = Math.floor(amount);
    if (!Number.isFinite(safeAmount) || safeAmount <= 0 || !reason.trim()) {
      return { awarded: false, user, amount: 0 };
    }
    const insert = db
      .prepare(
        `INSERT OR IGNORE INTO coin_ledger (user_id, reason, amount) VALUES (?, ?, ?)`
      )
      .run(userId, reason.trim(), safeAmount);
    if (insert.changes === 0) {
      return { awarded: false, user, amount: 0 };
    }
    db.prepare(`UPDATE users SET coins = COALESCE(coins, 0) + ? WHERE id = ?`).run(
      safeAmount,
      userId
    );
    if (reason.trim() === COIN_REASON.signup) {
      db.prepare('UPDATE users SET signup_bonus_claimed = 1 WHERE id = ?').run(userId);
    }
    if (reason.trim().startsWith('profile:')) {
      const section = reason.trim().slice('profile:'.length);
      const rewards = new Set(user.profileRewards ?? []);
      rewards.add(section);
      db.prepare('UPDATE users SET profile_rewards = ? WHERE id = ?').run(
        JSON.stringify([...rewards]),
        userId
      );
    }
    return { awarded: true, user: this.getUserById(userId), amount: safeAmount };
  },

  claimSignupBonus(userId: number): { awarded: boolean; user: User | null; award?: CoinAward } {
    const result = this.creditCoinsOnce(userId, SIGNUP_BONUS, COIN_REASON.signup);
    if (!result.awarded || !result.user) {
      return { awarded: false, user: result.user };
    }
    return {
      awarded: true,
      user: result.user,
      award: { reason: COIN_REASON.signup, amount: SIGNUP_BONUS },
    };
  },

  /** جایزه بخش‌هایی که تازه از خالی → پر شده‌اند */
  claimProfileSectionRewards(before: User, after: User): CoinAward[] {
    const awards: CoinAward[] = [];
    const claimed = new Set(after.profileRewards ?? before.profileRewards ?? []);
    for (const section of PROFILE_REWARD_SECTIONS) {
      if (claimed.has(section)) continue;
      const wasEmpty = !isProfileSectionFilled(section, before);
      const nowFilled = isProfileSectionFilled(section, after);
      if (!wasEmpty || !nowFilled) continue;
      const result = this.creditCoinsOnce(
        after.id,
        PROFILE_SECTION_REWARD,
        COIN_REASON.profile(section)
      );
      if (result.awarded) {
        awards.push({
          reason: COIN_REASON.profile(section),
          amount: PROFILE_SECTION_REWARD,
          section,
        });
        claimed.add(section);
      }
    }
    return awards;
  },

  rejectVerification(userId: number, note?: string): User | null {
    const existing = this.getUserById(userId);
    if (!existing || existing.verificationStatus !== 'pending') return null;
    db.prepare(
      `UPDATE users SET
         verification_status = 'rejected',
         verified_at = NULL,
         verification_note = ?
       WHERE id = ?`
    ).run(note?.trim() || null, userId);
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

  listPets(filters?: {
    ownerId?: number;
    lookingForPlaymate?: boolean;
    species?: string;
    city?: string;
    province?: string;
    breed?: string;
    excludeOwnerId?: number;
  }): PetProfile[] {
    let sql = `
      SELECT pets.*,
             users.province AS owner_province,
             users.city AS owner_city,
             CASE WHEN users.verification_status = 'verified' THEN 1 ELSE 0 END AS owner_verified
      FROM pets
      LEFT JOIN users ON users.id = pets.owner_id
      WHERE 1=1`;
    const params: unknown[] = [];
    if (filters?.ownerId) {
      sql += ' AND pets.owner_id = ?';
      params.push(filters.ownerId);
    }
    if (filters?.excludeOwnerId) {
      sql += ' AND pets.owner_id != ?';
      params.push(filters.excludeOwnerId);
    }
    if (filters?.lookingForPlaymate !== undefined) {
      sql += ' AND pets.looking_for_playmate = ?';
      params.push(filters.lookingForPlaymate ? 1 : 0);
    }
    if (filters?.species) {
      sql += ' AND pets.species = ?';
      params.push(filters.species);
    }
    if (filters?.city) {
      sql +=
        " AND (LOWER(TRIM(COALESCE(pets.city, ''))) = LOWER(TRIM(?)) OR LOWER(TRIM(COALESCE(users.city, ''))) = LOWER(TRIM(?)))";
      params.push(filters.city, filters.city);
    }
    if (filters?.province) {
      sql += " AND LOWER(TRIM(COALESCE(users.province, ''))) = LOWER(TRIM(?))";
      params.push(filters.province);
    }
    if (filters?.breed) {
      sql += " AND LOWER(TRIM(COALESCE(pets.breed, ''))) = LOWER(TRIM(?))";
      params.push(filters.breed);
    }
    sql += ' ORDER BY pets.updated_at DESC';
    return (db.prepare(sql).all(...params) as Record<string, unknown>[]).map(mapPet);
  },

  getPet(id: number): PetProfile | null {
    const row = db
      .prepare(
        `SELECT pets.*,
                users.province AS owner_province,
                users.city AS owner_city,
                CASE WHEN users.verification_status = 'verified' THEN 1 ELSE 0 END AS owner_verified
         FROM pets
         LEFT JOIN users ON users.id = pets.owner_id
         WHERE pets.id = ?`
      )
      .get(id) as Record<string, unknown> | undefined;
    return row ? mapPet(row) : null;
  },

  hasPendingPlaydate(fromPetId: number, toPetId: number): boolean {
    const row = db
      .prepare(
        `SELECT id FROM playdate_requests
         WHERE from_pet_id = ? AND to_pet_id = ? AND status = 'pending'
         LIMIT 1`
      )
      .get(fromPetId, toPetId) as Record<string, unknown> | undefined;
    return Boolean(row);
  },

  listSpecies(): PetSpecies[] {
    const rows = db
      .prepare('SELECT code, label_fa, emoji FROM pet_species ORDER BY sort_order, code')
      .all() as Record<string, unknown>[];
    return rows.map((row) => ({
      code: row.code as PetSpecies['code'],
      labelFa: row.label_fa as string,
      emoji: (row.emoji as string) || '🐾',
    }));
  },

  listBreeds(speciesCode?: string): PetBreed[] {
    let sql = 'SELECT id, species_code, name_fa, name_en, sort_order FROM pet_breeds';
    const params: unknown[] = [];
    if (speciesCode) {
      sql += ' WHERE species_code = ?';
      params.push(speciesCode);
    }
    sql += ' ORDER BY sort_order ASC, name_fa ASC';
    const rows = db.prepare(sql).all(...params) as Record<string, unknown>[];
    return rows.map((row) => ({
      id: row.id as number,
      speciesCode: row.species_code as PetBreed['speciesCode'],
      nameFa: row.name_fa as string,
      nameEn: (row.name_en as string | null) ?? undefined,
      sortOrder: row.sort_order != null ? Number(row.sort_order) : undefined,
    }));
  },

  createPet(data: {
    ownerId: number;
    name: string;
    species: string;
    breed?: string;
    gender?: PetGender;
    ageMonths?: number;
    size?: PetSize;
    color?: string;
    bio?: string;
    vaccinated?: boolean;
    neutered?: boolean;
    lookingForPlaymate?: boolean;
    personality?: Record<string, unknown>;
    health?: Record<string, unknown>;
    imageUrl?: string;
    city?: string;
    neighborhood?: string;
  }): PetProfile {
    const result = db
      .prepare(
        `INSERT INTO pets (
          owner_id, name, species, breed, gender, age_months, size, color, bio,
          vaccinated, neutered, looking_for_playmate, personality, health,
          image_url, city, neighborhood
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        data.ownerId,
        data.name,
        data.species,
        data.breed ?? null,
        data.gender ?? null,
        data.ageMonths ?? null,
        data.size ?? null,
        data.color ?? null,
        data.bio ?? null,
        data.vaccinated ? 1 : 0,
        data.neutered ? 1 : 0,
        data.lookingForPlaymate !== false ? 1 : 0,
        JSON.stringify(data.personality ?? {}),
        JSON.stringify(data.health ?? {}),
        data.imageUrl ?? null,
        data.city ?? null,
        data.neighborhood ?? null
      );
    return mapPet(db.prepare('SELECT * FROM pets WHERE id = ?').get(result.lastInsertRowid) as Record<string, unknown>);
  },

  updatePet(id: number, patch: Partial<{
    name: string;
    species: string;
    breed: string;
    gender: PetGender;
    ageMonths: number;
    size: PetSize;
    color: string;
    bio: string;
    vaccinated: boolean;
    neutered: boolean;
    lookingForPlaymate: boolean;
    personality: Record<string, unknown>;
    health: Record<string, unknown>;
    imageUrl: string;
    city: string;
    neighborhood: string;
  }>): PetProfile | null {
    const existing = this.getPet(id);
    if (!existing) return null;

    const fields: string[] = [];
    const values: unknown[] = [];

    if (patch.name !== undefined) { fields.push('name = ?'); values.push(patch.name); }
    if (patch.species !== undefined) { fields.push('species = ?'); values.push(patch.species); }
    if (patch.breed !== undefined) { fields.push('breed = ?'); values.push(patch.breed); }
    if (patch.gender !== undefined) { fields.push('gender = ?'); values.push(patch.gender); }
    if (patch.ageMonths !== undefined) { fields.push('age_months = ?'); values.push(patch.ageMonths); }
    if (patch.size !== undefined) { fields.push('size = ?'); values.push(patch.size); }
    if (patch.color !== undefined) { fields.push('color = ?'); values.push(patch.color); }
    if (patch.bio !== undefined) { fields.push('bio = ?'); values.push(patch.bio); }
    if (patch.vaccinated !== undefined) { fields.push('vaccinated = ?'); values.push(patch.vaccinated ? 1 : 0); }
    if (patch.neutered !== undefined) { fields.push('neutered = ?'); values.push(patch.neutered ? 1 : 0); }
    if (patch.lookingForPlaymate !== undefined) { fields.push('looking_for_playmate = ?'); values.push(patch.lookingForPlaymate ? 1 : 0); }
    if (patch.personality !== undefined) { fields.push('personality = ?'); values.push(JSON.stringify(patch.personality)); }
    if (patch.health !== undefined) { fields.push('health = ?'); values.push(JSON.stringify(patch.health)); }
    if (patch.imageUrl !== undefined) { fields.push('image_url = ?'); values.push(patch.imageUrl); }
    if (patch.city !== undefined) { fields.push('city = ?'); values.push(patch.city); }
    if (patch.neighborhood !== undefined) { fields.push('neighborhood = ?'); values.push(patch.neighborhood); }

    if (fields.length === 0) return existing;

    fields.push("updated_at = datetime('now')");
    values.push(id);
    db.prepare(`UPDATE pets SET ${fields.join(', ')} WHERE id = ?`).run(...values);
    return this.getPet(id);
  },

  deletePet(id: number, ownerId?: number): boolean {
    const pet = this.getPet(id);
    if (!pet) return false;
    if (ownerId !== undefined && pet.ownerId !== ownerId) return false;

    db.prepare(
      'DELETE FROM playdate_requests WHERE from_pet_id = ? OR to_pet_id = ?'
    ).run(id, id);
    const result = db.prepare('DELETE FROM pets WHERE id = ?').run(id);
    return result.changes > 0;
  },

  listPlaydateRequests(filters?: {
    userId?: number;
    petId?: number;
    status?: PlaydateStatus;
  }): PlaydateRequest[] {
    let sql = 'SELECT * FROM playdate_requests WHERE 1=1';
    const params: unknown[] = [];

    if (filters?.userId) {
      sql += ' AND (from_user_id = ? OR to_user_id = ?)';
      params.push(filters.userId, filters.userId);
    }
    if (filters?.petId) {
      sql += ' AND (from_pet_id = ? OR to_pet_id = ?)';
      params.push(filters.petId, filters.petId);
    }
    if (filters?.status) {
      sql += ' AND status = ?';
      params.push(filters.status);
    }

    sql += ' ORDER BY created_at DESC';
    return (db.prepare(sql).all(...params) as Record<string, unknown>[]).map(mapPlaydate);
  },

  getPlaydateRequest(id: number): PlaydateRequest | null {
    const row = db.prepare('SELECT * FROM playdate_requests WHERE id = ?').get(id) as Record<string, unknown> | undefined;
    return row ? mapPlaydate(row) : null;
  },

  createPlaydateRequest(data: {
    fromPetId: number;
    toPetId: number;
    fromUserId: number;
    toUserId?: number;
    message?: string;
    scheduledAt?: string;
    location?: string;
  }): PlaydateRequest {
    const result = db
      .prepare(
        `INSERT INTO playdate_requests (
          from_pet_id, to_pet_id, from_user_id, to_user_id, message, scheduled_at, location
        ) VALUES (?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        data.fromPetId,
        data.toPetId,
        data.fromUserId,
        data.toUserId ?? null,
        data.message ?? null,
        data.scheduledAt ?? null,
        data.location ?? null
      );
    return mapPlaydate(
      db.prepare('SELECT * FROM playdate_requests WHERE id = ?').get(result.lastInsertRowid) as Record<string, unknown>
    );
  },

  updatePlaydateStatus(id: number, status: PlaydateStatus): PlaydateRequest | null {
    db.prepare("UPDATE playdate_requests SET status = ?, updated_at = datetime('now') WHERE id = ?").run(status, id);
    return this.getPlaydateRequest(id);
  },

  /** سکه روزانه — یک‌بار در هر روز UTC */
  claimDailyCoins(
    userId: number,
    amount: number
  ):
    | { ok: true; user: User; awarded: number }
    | { ok: false; reason: 'missing' | 'already'; user?: User } {
    const user = this.getUserById(userId);
    if (!user) return { ok: false, reason: 'missing' };

    if (user.lastDailyCoinAt) {
      const last = new Date(user.lastDailyCoinAt);
      const now = new Date();
      if (
        !Number.isNaN(last.getTime()) &&
        last.getUTCFullYear() === now.getUTCFullYear() &&
        last.getUTCMonth() === now.getUTCMonth() &&
        last.getUTCDate() === now.getUTCDate()
      ) {
        return { ok: false, reason: 'already', user };
      }
    }

    const nowIso = new Date().toISOString();
    db.prepare(
      'UPDATE users SET coins = COALESCE(coins, 0) + ?, last_daily_coin_at = ? WHERE id = ?'
    ).run(amount, nowIso, userId);
    const updated = this.getUserById(userId)!;
    return { ok: true, user: updated, awarded: amount };
  },

  userHasOpenCoinSell(userId: number): boolean {
    const row = db
      .prepare(
        `SELECT COUNT(*) as c FROM coin_sell_requests WHERE user_id = ? AND status = 'open'`
      )
      .get(userId) as { c: number };
    return Number(row?.c ?? 0) > 0;
  },

  listVetConsultations(filters: {
    vetUserId: number;
    status?: VetConsultStatus;
  }): VetConsultation[] {
    let sql = `
      SELECT vc.*,
             patient.name AS patient_name,
             patient.city AS patient_city,
             pets.name AS pet_name,
             pets.species AS pet_species,
             pets.breed AS pet_breed
      FROM vet_consultations vc
      LEFT JOIN users patient ON patient.id = vc.patient_user_id
      LEFT JOIN pets ON pets.id = vc.pet_id
      WHERE vc.vet_user_id = ?
    `;
    const params: unknown[] = [filters.vetUserId];
    if (filters.status) {
      sql += ' AND vc.status = ?';
      params.push(filters.status);
    }
    sql += ' ORDER BY vc.created_at DESC, vc.id DESC';
    return (db.prepare(sql).all(...params) as Record<string, unknown>[]).map(mapVetConsultation);
  },

  createVetConsultation(data: {
    vetUserId: number;
    patientUserId: number;
    petId?: number;
    status?: VetConsultStatus;
    notes?: string;
  }): VetConsultation {
    const result = db
      .prepare(
        `INSERT INTO vet_consultations (
          vet_user_id, patient_user_id, pet_id, status, notes
        ) VALUES (?, ?, ?, ?, ?)`
      )
      .run(
        data.vetUserId,
        data.patientUserId,
        data.petId ?? null,
        data.status ?? 'requested',
        data.notes ?? null
      );
    const rows = this.listVetConsultations({ vetUserId: data.vetUserId });
    const created = rows.find((r) => r.id === Number(result.lastInsertRowid));
    return (
      created ?? {
        id: Number(result.lastInsertRowid),
        vetUserId: data.vetUserId,
        patientUserId: data.patientUserId,
        petId: data.petId,
        status: data.status ?? 'requested',
        notes: data.notes,
        createdAt: new Date().toISOString(),
      }
    );
  },

  getVetConsultation(id: number): VetConsultation | null {
    const rows = db
      .prepare(
        `SELECT vc.*,
                pu.name AS patient_name,
                pu.city AS patient_city,
                p.name AS pet_name,
                p.species AS pet_species,
                p.breed AS pet_breed
         FROM vet_consultations vc
         LEFT JOIN users pu ON pu.id = vc.patient_user_id
         LEFT JOIN pets p ON p.id = vc.pet_id
         WHERE vc.id = ?`
      )
      .all(id) as Record<string, unknown>[];
    if (!rows.length) return null;
    return mapVetConsultation(rows[0]!);
  },

  updateVetConsultationStatus(
    id: number,
    status: VetConsultStatus
  ): VetConsultation | null {
    const existing = this.getVetConsultation(id);
    if (!existing) return null;
    db.prepare(`UPDATE vet_consultations SET status = ? WHERE id = ?`).run(status, id);
    return this.getVetConsultation(id);
  },

  submitCoinSell(input: {
    userId: number;
    coins: number;
    rateToman: number;
    cardNumber: string;
    minCoins: number;
  }):
    | { ok: true; requestId: number; amountToman: number; rateToman: number; user: User }
    | { ok: false; reason: 'min' | 'balance' | 'pending' | 'missing' } {
    const coins = Math.floor(input.coins);
    if (!Number.isFinite(coins) || coins < input.minCoins) {
      return { ok: false, reason: 'min' };
    }
    const user = this.getUserById(input.userId);
    if (!user) return { ok: false, reason: 'missing' };
    if (this.userHasOpenCoinSell(input.userId)) return { ok: false, reason: 'pending' };
    if ((user.coins ?? 0) < coins) return { ok: false, reason: 'balance' };

    const amountToman = coins * input.rateToman;
    const tx = db.transaction(() => {
      const debited = db
        .prepare(
          `UPDATE users SET coins = coins - ? WHERE id = ? AND COALESCE(coins, 0) >= ?`
        )
        .run(coins, input.userId, coins);
      if (debited.changes !== 1) throw new Error('BALANCE');
      const result = db
        .prepare(
          `INSERT INTO coin_sell_requests (
            user_id, coins, rate_toman, amount_toman, card_number, status
          ) VALUES (?, ?, ?, ?, ?, 'open')`
        )
        .run(input.userId, coins, input.rateToman, amountToman, input.cardNumber);
      return Number(result.lastInsertRowid);
    });

    try {
      const requestId = tx();
      return {
        ok: true,
        requestId,
        amountToman,
        rateToman: input.rateToman,
        user: this.getUserById(input.userId)!,
      };
    } catch (err) {
      if (err instanceof Error && err.message === 'BALANCE') {
        return { ok: false, reason: 'balance' };
      }
      throw err;
    }
  },

  createPaymentOrder(input: {
    userId: number;
    packageId: string;
    coins: number;
    amountToman?: number;
    amountStars?: number;
    method: PaymentMethod;
    status: PaymentOrderStatus;
  }): PaymentOrder {
    const result = db
      .prepare(
        `INSERT INTO payment_orders (
          user_id, package_id, coins, amount_toman, amount_stars, method, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        input.userId,
        input.packageId,
        input.coins,
        input.amountToman ?? null,
        input.amountStars ?? null,
        input.method,
        input.status
      );
    return this.getPaymentOrder(Number(result.lastInsertRowid))!;
  },

  getPaymentOrder(id: number): PaymentOrder | null {
    const row = db
      .prepare(
        `SELECT po.*,
                u.name AS user_name,
                u.telegram_id AS user_telegram_id,
                u.username AS user_username
         FROM payment_orders po
         LEFT JOIN users u ON u.id = po.user_id
         WHERE po.id = ?`
      )
      .get(id) as Record<string, unknown> | undefined;
    return row ? mapPaymentOrder(row) : null;
  },

  listPendingCardPayments(): PaymentOrder[] {
    return (
      db
        .prepare(
          `SELECT po.*,
                  u.name AS user_name,
                  u.telegram_id AS user_telegram_id,
                  u.username AS user_username
           FROM payment_orders po
           LEFT JOIN users u ON u.id = po.user_id
           WHERE po.method = 'card' AND po.status = 'pending'
           ORDER BY po.created_at ASC, po.id ASC`
        )
        .all() as Record<string, unknown>[]
    ).map(mapPaymentOrder);
  },

  attachPaymentReceipt(
    orderId: number,
    receiptFileId: string
  ):
    | { ok: true; order: PaymentOrder }
    | { ok: false; reason: 'missing' | 'bad_status' | 'no_file' } {
    const fileId = receiptFileId.trim();
    if (!fileId) return { ok: false, reason: 'no_file' };
    const existing = this.getPaymentOrder(orderId);
    if (!existing) return { ok: false, reason: 'missing' };
    if (existing.method !== 'card' || existing.status !== 'awaiting_receipt') {
      return { ok: false, reason: 'bad_status' };
    }
    db.prepare(
      `UPDATE payment_orders
       SET receipt_file_id = ?, status = 'pending'
       WHERE id = ? AND status = 'awaiting_receipt'`
    ).run(fileId, orderId);
    const order = this.getPaymentOrder(orderId);
    if (!order || order.status !== 'pending') return { ok: false, reason: 'bad_status' };
    return { ok: true, order };
  },

  approveCardPayment(
    orderId: number,
    note?: string
  ):
    | { ok: true; order: PaymentOrder; user: User }
    | { ok: false; reason: 'missing' | 'bad_status' } {
    const existing = this.getPaymentOrder(orderId);
    if (!existing) return { ok: false, reason: 'missing' };
    if (existing.method !== 'card' || existing.status !== 'pending') {
      return { ok: false, reason: 'bad_status' };
    }

    const tx = db.transaction(() => {
      const updated = db
        .prepare(
          `UPDATE payment_orders
           SET status = 'approved',
               admin_note = ?,
               reviewed_at = datetime('now')
           WHERE id = ? AND status = 'pending'`
        )
        .run(note?.trim() || null, orderId);
      if (updated.changes !== 1) throw new Error('BAD_STATUS');
      db.prepare(`UPDATE users SET coins = COALESCE(coins, 0) + ? WHERE id = ?`).run(
        existing.coins,
        existing.userId
      );
    });

    try {
      tx();
    } catch (err) {
      if (err instanceof Error && err.message === 'BAD_STATUS') {
        return { ok: false, reason: 'bad_status' };
      }
      throw err;
    }

    const order = this.getPaymentOrder(orderId)!;
    const user = this.getUserById(existing.userId)!;
    return { ok: true, order, user };
  },

  rejectCardPayment(
    orderId: number,
    note?: string
  ):
    | { ok: true; order: PaymentOrder; user: User | null }
    | { ok: false; reason: 'missing' | 'bad_status' } {
    const existing = this.getPaymentOrder(orderId);
    if (!existing) return { ok: false, reason: 'missing' };
    if (existing.method !== 'card' || existing.status !== 'pending') {
      return { ok: false, reason: 'bad_status' };
    }
    const updated = db
      .prepare(
        `UPDATE payment_orders
         SET status = 'rejected',
             admin_note = ?,
             reviewed_at = datetime('now')
         WHERE id = ? AND status = 'pending'`
      )
      .run(note?.trim() || null, orderId);
    if (updated.changes !== 1) return { ok: false, reason: 'bad_status' };
    return {
      ok: true,
      order: this.getPaymentOrder(orderId)!,
      user: this.getUserById(existing.userId),
    };
  },

  completeStarsPayment(input: {
    orderId: number;
    telegramPaymentChargeId: string;
  }):
    | { ok: true; order: PaymentOrder; user: User; credited: boolean }
    | { ok: false; reason: 'missing' | 'bad_status' | 'already' } {
    const existing = this.getPaymentOrder(input.orderId);
    if (!existing) return { ok: false, reason: 'missing' };
    if (existing.method !== 'stars') return { ok: false, reason: 'bad_status' };
    if (existing.status === 'paid') {
      return {
        ok: true,
        order: existing,
        user: this.getUserById(existing.userId)!,
        credited: false,
      };
    }
    if (existing.status !== 'awaiting_stars') return { ok: false, reason: 'bad_status' };

    const chargeId = input.telegramPaymentChargeId.trim();
    const tx = db.transaction(() => {
      const updated = db
        .prepare(
          `UPDATE payment_orders
           SET status = 'paid',
               telegram_payment_charge_id = ?,
               reviewed_at = datetime('now')
           WHERE id = ? AND status = 'awaiting_stars'`
        )
        .run(chargeId || null, input.orderId);
      if (updated.changes !== 1) throw new Error('BAD_STATUS');
      db.prepare(`UPDATE users SET coins = COALESCE(coins, 0) + ? WHERE id = ?`).run(
        existing.coins,
        existing.userId
      );
    });

    try {
      tx();
    } catch (err) {
      if (err instanceof Error && err.message === 'BAD_STATUS') {
        const again = this.getPaymentOrder(input.orderId);
        if (again?.status === 'paid') {
          return {
            ok: true,
            order: again,
            user: this.getUserById(existing.userId)!,
            credited: false,
          };
        }
        return { ok: false, reason: 'bad_status' };
      }
      throw err;
    }

    return {
      ok: true,
      order: this.getPaymentOrder(input.orderId)!,
      user: this.getUserById(existing.userId)!,
      credited: true,
    };
  },

  getPetMedicalRecord(petId: number): PetMedicalRecord {
    const row = db
      .prepare(`SELECT * FROM pet_medical_records WHERE pet_id = ?`)
      .get(petId) as Record<string, unknown> | undefined;
    if (!row) {
      return {
        petId,
        updatedAt: new Date().toISOString(),
      };
    }
    return {
      petId: Number(row.pet_id),
      notes: (row.notes as string) || undefined,
      vaccinations: (row.vaccinations as string) || undefined,
      allergies: (row.allergies as string) || undefined,
      chronicConditions: (row.chronic_conditions as string) || undefined,
      lastCheckup: (row.last_checkup as string) || undefined,
      medications: (row.medications as string) || undefined,
      updatedAt: String(row.updated_at),
    };
  },

  upsertPetMedicalRecord(
    petId: number,
    patch: Partial<Omit<PetMedicalRecord, 'petId' | 'updatedAt'>>
  ): PetMedicalRecord {
    const current = this.getPetMedicalRecord(petId);
    const next = {
      notes: patch.notes !== undefined ? patch.notes : current.notes,
      vaccinations: patch.vaccinations !== undefined ? patch.vaccinations : current.vaccinations,
      allergies: patch.allergies !== undefined ? patch.allergies : current.allergies,
      chronicConditions:
        patch.chronicConditions !== undefined
          ? patch.chronicConditions
          : current.chronicConditions,
      lastCheckup: patch.lastCheckup !== undefined ? patch.lastCheckup : current.lastCheckup,
      medications: patch.medications !== undefined ? patch.medications : current.medications,
    };
    db.prepare(
      `INSERT INTO pet_medical_records (
         pet_id, notes, vaccinations, allergies, chronic_conditions, last_checkup, medications, updated_at
       ) VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
       ON CONFLICT(pet_id) DO UPDATE SET
         notes = excluded.notes,
         vaccinations = excluded.vaccinations,
         allergies = excluded.allergies,
         chronic_conditions = excluded.chronic_conditions,
         last_checkup = excluded.last_checkup,
         medications = excluded.medications,
         updated_at = datetime('now')`
    ).run(
      petId,
      next.notes ?? null,
      next.vaccinations ?? null,
      next.allergies ?? null,
      next.chronicConditions ?? null,
      next.lastCheckup ?? null,
      next.medications ?? null
    );
    return this.getPetMedicalRecord(petId);
  },

  listPetMedicalEntries(petId: number, limit = 20): PetMedicalEntry[] {
    const rows = db
      .prepare(
        `SELECT e.*, u.name AS author_name
         FROM pet_medical_entries e
         LEFT JOIN users u ON u.id = e.author_user_id
         WHERE e.pet_id = ?
         ORDER BY e.created_at DESC, e.id DESC
         LIMIT ?`
      )
      .all(petId, limit) as Record<string, unknown>[];
    return rows.map((row) => ({
      id: Number(row.id),
      petId: Number(row.pet_id),
      authorUserId: Number(row.author_user_id),
      authorName: (row.author_name as string) || undefined,
      consultId: row.consult_id != null ? Number(row.consult_id) : undefined,
      text: String(row.text),
      createdAt: String(row.created_at),
    }));
  },

  addPetMedicalEntry(input: {
    petId: number;
    authorUserId: number;
    text: string;
    consultId?: number;
  }): PetMedicalEntry {
    const result = db
      .prepare(
        `INSERT INTO pet_medical_entries (pet_id, author_user_id, consult_id, text)
         VALUES (?, ?, ?, ?)`
      )
      .run(
        input.petId,
        input.authorUserId,
        input.consultId ?? null,
        input.text.trim()
      );
    const rows = this.listPetMedicalEntries(input.petId, 1);
    return (
      rows.find((e) => e.id === Number(result.lastInsertRowid)) ?? {
        id: Number(result.lastInsertRowid),
        petId: input.petId,
        authorUserId: input.authorUserId,
        consultId: input.consultId,
        text: input.text.trim(),
        createdAt: new Date().toISOString(),
      }
    );
  },

  /** آیا کاربر (دامپزشک با مشاوره فعال یا صاحب پت) به پرونده دسترسی دارد */
  canAccessPetMedical(
    petId: number,
    viewerUserId: number
  ): { ok: true; asOwner: boolean; asVet: boolean } | { ok: false } {
    const pet = this.getPet(petId);
    if (!pet) return { ok: false };
    if (pet.ownerId === viewerUserId) {
      return { ok: true, asOwner: true, asVet: false };
    }
    const active = db
      .prepare(
        `SELECT id FROM vet_consultations
         WHERE pet_id = ? AND vet_user_id = ? AND status = 'active'
         LIMIT 1`
      )
      .get(petId, viewerUserId);
    if (active) return { ok: true, asOwner: false, asVet: true };
    // دامپزشک با مشاوره فعال روی بیمار (حتی بدون pet_id)
    const byPatient = db
      .prepare(
        `SELECT id FROM vet_consultations
         WHERE patient_user_id = ? AND vet_user_id = ? AND status = 'active'
         LIMIT 1`
      )
      .get(pet.ownerId, viewerUserId);
    if (byPatient) return { ok: true, asOwner: false, asVet: true };
    return { ok: false };
  },
};
