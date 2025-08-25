import { neon } from '@neondatabase/serverless';
import { dbPerformance } from './db-pool';
import { trackDatabaseError } from './error-tracking';

// Проверяем наличие переменной окружения при импорте модуля
if (!process.env.DATABASE_URL && !process.env.POSTGRES_URL) {
  console.warn('Warning: DATABASE_URL or POSTGRES_URL environment variable is not set. Database operations will fail.');
}

// Создаем подключение к базе данных
export const sql = neon(process.env.DATABASE_URL || process.env.POSTGRES_URL || '');

// Экспортируем объект db для совместимости с новыми API
export const db = {
  query: sql
};

import {
  User,
  Wish,
  Transaction,
  Quest,
  RandomEvent,
  WishCategory,
  Rank,
  EconomySetting,
} from '../types/quest-economy';

export interface Quest {
  id: string;
  title: string;
  description: string;
  author_id: string;
  assignee_id: string;
  category: string;
  difficulty: 'easy' | 'medium' | 'hard' | 'epic';
  reward_type: string;
  reward_amount: number;
  experience_reward: number;
  status: 'active' | 'completed' | 'expired' | 'cancelled';
  due_date?: Date;
  created_at: Date;
  completed_at?: Date;
  metadata: any;
}

export interface RandomEvent {
  id: string;
  user_id: string;
  title: string;
  description: string;
  reward_type: string;
  reward_amount: number;
  experience_reward: number;
  status: 'active' | 'completed' | 'expired';
  expires_at: Date;
  created_at: Date;
  completed_at?: Date;
  completed_by?: string;
  metadata: any;
}

export interface WishCategory {
  id: string;
  name: string;
  emoji?: string;
  color?: string;
  created_at: Date;
}

export interface Rank {
  id: string;
  name: string;
  min_experience: number;
  daily_quota_bonus: number;
  weekly_quota_bonus: number;
  monthly_quota_bonus: number;
  special_privileges: any;
  emoji?: string;
  created_at: Date;
}

export interface EconomySetting {
  id: string;
  setting_key: string;
  setting_value: any;
  description?: string;
  updated_at: Date;
}

// Инициализация базы данных
export async function initDatabase() {
  try {
    // The migration scripts will handle all table creation and alteration.
    // This function can be simplified or used to trigger migrations.
    console.log('Running database migrations if needed...');
    // In a real scenario, you would run your migration tool here.
    // For now, we assume the migrations like 009_wish_economy_rework.sql are run manually
    // or by a separate deployment script.
    console.log('Database initialization check complete.');

    // Базовые индексы
    await sql`CREATE INDEX IF NOT EXISTS idx_users_telegram_id ON users(telegram_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_wishes_author ON wishes(author_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_wishes_assignee ON wishes(assignee_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_wishes_status ON wishes(status)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_transactions_user ON transactions(user_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_transactions_created ON transactions(created_at)`;

    // Запуск миграций для расширенной функциональности
    await runQuestEconomyMigrations();

    console.log('Database initialized successfully');
  } catch (error) {
    console.error('Database initialization error:', error);
    throw error;
  }
}

// Функция для запуска миграций квестовой экономической системы
async function runQuestEconomyMigrations() {
  try {
    // Создание таблицы для отслеживания миграций
    await sql`
      CREATE TABLE IF NOT EXISTS migrations (
        id SERIAL PRIMARY KEY,
        filename VARCHAR(255) NOT NULL UNIQUE,
        executed_at TIMESTAMP DEFAULT NOW()
      )
    `;

    // Проверяем, выполнена ли основная миграция
    const existingMigrations = await sql`
      SELECT filename FROM migrations WHERE filename = '001_quest_economy_system.sql'
    `;

    if (existingMigrations.length === 0) {
      // Выполняем основную миграцию
      await executeQuestEconomyMigration();
      await sql`INSERT INTO migrations (filename) VALUES ('001_quest_economy_system.sql')`;
      
      // Выполняем миграцию с seed данными
      await executeSeedDataMigration();
      await sql`INSERT INTO migrations (filename) VALUES ('002_seed_data.sql')`;
      
      console.log('Quest economy system migrations completed successfully');
    }
  } catch (error) {
    console.error('Migration error:', error);
    // Не прерываем инициализацию, если миграции не удались
  }
}

// Выполнение основной миграции
async function executeQuestEconomyMigration() {
  // Расширение таблицы users
  await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS rank VARCHAR(50) DEFAULT 'Рядовой'`;
  await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS experience_points INTEGER DEFAULT 0`;
  await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS daily_quota_used INTEGER DEFAULT 0`;
  await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS weekly_quota_used INTEGER DEFAULT 0`;
  await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS monthly_quota_used INTEGER DEFAULT 0`;
  await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS last_quota_reset DATE DEFAULT CURRENT_DATE`;

  // Создание таблицы квестов
  await sql`
    CREATE TABLE IF NOT EXISTS quests (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      title VARCHAR(200) NOT NULL,
      description TEXT NOT NULL,
      author_id UUID REFERENCES users(id) ON DELETE CASCADE,
      assignee_id UUID REFERENCES users(id) ON DELETE CASCADE,
      category VARCHAR(50) NOT NULL DEFAULT 'general',
      difficulty VARCHAR(20) NOT NULL CHECK (difficulty IN ('easy', 'medium', 'hard', 'epic')),
      reward_type VARCHAR(20) NOT NULL DEFAULT 'green',
      reward_amount INTEGER NOT NULL DEFAULT 1,
      experience_reward INTEGER DEFAULT 0,
      status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'completed', 'expired', 'cancelled')),
      due_date TIMESTAMP,
      created_at TIMESTAMP DEFAULT NOW(),
      completed_at TIMESTAMP,
      metadata JSONB DEFAULT '{}'
    )
  `;

  // Создание таблицы случайных событий
  await sql`
    CREATE TABLE IF NOT EXISTS random_events (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID REFERENCES users(id) ON DELETE CASCADE,
      title VARCHAR(200) NOT NULL,
      description TEXT NOT NULL,
      reward_type VARCHAR(20) NOT NULL DEFAULT 'green',
      reward_amount INTEGER NOT NULL DEFAULT 1,
      experience_reward INTEGER DEFAULT 0,
      status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'completed', 'expired')),
      expires_at TIMESTAMP NOT NULL,
      created_at TIMESTAMP DEFAULT NOW(),
      completed_at TIMESTAMP,
      completed_by UUID REFERENCES users(id),
      metadata JSONB DEFAULT '{}'
    )
  `;

  // Расширение таблицы wishes
  await sql`ALTER TABLE wishes ADD COLUMN IF NOT EXISTS category VARCHAR(50) DEFAULT 'general'`;
  await sql`ALTER TABLE wishes ADD COLUMN IF NOT EXISTS is_shared BOOLEAN DEFAULT FALSE`;
  await sql`ALTER TABLE wishes ADD COLUMN IF NOT EXISTS is_gift BOOLEAN DEFAULT FALSE`;
  await sql`ALTER TABLE wishes ADD COLUMN IF NOT EXISTS is_historical BOOLEAN DEFAULT FALSE`;
  await sql`ALTER TABLE wishes ADD COLUMN IF NOT EXISTS shared_approved_by UUID REFERENCES users(id)`;
  await sql`ALTER TABLE wishes ADD COLUMN IF NOT EXISTS priority INTEGER DEFAULT 1`;

  // Создание таблицы категорий желаний
  await sql`
    CREATE TABLE IF NOT EXISTS wish_categories (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name VARCHAR(100) NOT NULL UNIQUE,
      emoji VARCHAR(10),
      color VARCHAR(20),
      created_at TIMESTAMP DEFAULT NOW()
    )
  `;

  // Создание таблицы рангов
  await sql`
    CREATE TABLE IF NOT EXISTS ranks (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name VARCHAR(100) NOT NULL UNIQUE,
      min_experience INTEGER NOT NULL,
      daily_quota_bonus INTEGER DEFAULT 0,
      weekly_quota_bonus INTEGER DEFAULT 0,
      monthly_quota_bonus INTEGER DEFAULT 0,
      special_privileges JSONB DEFAULT '{}',
      emoji VARCHAR(10),
      created_at TIMESTAMP DEFAULT NOW()
    )
  `;

  // Создание таблицы настроек экономики
  await sql`
    CREATE TABLE IF NOT EXISTS economy_settings (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      setting_key VARCHAR(100) NOT NULL UNIQUE,
      setting_value JSONB NOT NULL,
      description TEXT,
      updated_at TIMESTAMP DEFAULT NOW()
    )
  `;

  // Расширение таблицы транзакций
  await sql`ALTER TABLE transactions ADD COLUMN IF NOT EXISTS transaction_category VARCHAR(50) DEFAULT 'manual'`;
  await sql`ALTER TABLE transactions ADD COLUMN IF NOT EXISTS experience_gained INTEGER DEFAULT 0`;

  // Создание индексов
  await sql`CREATE INDEX IF NOT EXISTS idx_quests_assignee_status ON quests(assignee_id, status)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_quests_author_status ON quests(author_id, status)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_events_user_status ON random_events(user_id, status)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_wishes_category_status ON wishes(category, status)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_users_rank ON users(rank)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_users_experience ON users(experience_points)`;
}

// Выполнение миграции с seed данными
async function executeSeedDataMigration() {
  // Вставка категорий желаний
  const categories = [
    ['Общие', '📋', '#6B7280'],
    ['Романтика', '💕', '#EC4899'],
    ['Развлечения', '🎮', '#8B5CF6'],
    ['Еда', '🍽️', '#F59E0B'],
    ['Путешествия', '✈️', '#06B6D4'],
    ['Спорт', '⚽', '#10B981'],
    ['Дом', '🏠', '#F97316'],
    ['Работа', '💼', '#374151'],
    ['Здоровье', '🏥', '#EF4444'],
    ['Образование', '📚', '#3B82F6'],
    ['Хобби', '🎨', '#A855F7'],
    ['Семья', '👨‍👩‍👧‍👦', '#84CC16']
  ];

  for (const [name, emoji, color] of categories) {
    await sql`
      INSERT INTO wish_categories (name, emoji, color) 
      VALUES (${name}, ${emoji}, ${color})
      ON CONFLICT (name) DO NOTHING
    `;
  }

  // Вставка рангов
  const ranks = [
    ['Рядовой', 0, 0, 0, 0, '🪖', '{}'],
    ['Ефрейтор', 100, 1, 2, 5, '🎖️', '{"can_create_medium_quests": true}'],
    ['Младший сержант', 300, 2, 5, 10, '🏅', '{"can_create_hard_quests": true, "bonus_experience": 0.1}'],
    ['Сержант', 600, 3, 8, 15, '🎗️', '{"can_create_epic_quests": true, "bonus_experience": 0.15}'],
    ['Старший сержант', 1000, 4, 12, 20, '🏆', '{"can_approve_shared_wishes": true, "bonus_experience": 0.2}']
  ];

  for (const [name, minExp, dailyBonus, weeklyBonus, monthlyBonus, emoji, privileges] of ranks) {
    await sql`
      INSERT INTO ranks (name, min_experience, daily_quota_bonus, weekly_quota_bonus, monthly_quota_bonus, emoji, special_privileges) 
      VALUES (${name}, ${minExp}, ${dailyBonus}, ${weeklyBonus}, ${monthlyBonus}, ${emoji}, ${privileges})
      ON CONFLICT (name) DO NOTHING
    `;
  }

  // Вставка настроек экономики
  const settings = [
    ['daily_gift_base_limit', '5', 'Base daily gift limit for all users'],
    ['weekly_gift_base_limit', '20', 'Base weekly gift limit for all users'],
    ['monthly_gift_base_limit', '50', 'Base monthly gift limit for all users'],
    ['quest_experience_multiplier', '{"easy": 10, "medium": 25, "hard": 50, "epic": 100}', 'Experience points for completing quests by difficulty'],
    ['event_experience_base', '15', 'Base experience points for completing random events']
  ];

  for (const [key, value, description] of settings) {
    await sql`
      INSERT INTO economy_settings (setting_key, setting_value, description) 
      VALUES (${key}, ${value}, ${description})
      ON CONFLICT (setting_key) DO NOTHING
    `;
  }

  // Обновление существующих пользователей
  await sql`UPDATE users SET rank = 'Рядовой' WHERE rank IS NULL OR rank = ''`;
}

// Пользователи
export async function createUser(telegramId: string, name: string, username?: string): Promise<User> {
  const result = await sql`
    INSERT INTO users (telegram_id, name, username, mana, mana_spent, rank, experience_points)
    VALUES (${telegramId}, ${name}, ${username}, 0, 0, 'Рядовой', 0)
    ON CONFLICT (telegram_id) 
    DO UPDATE SET name = ${name}, username = ${username}, updated_at = NOW()
    RETURNING *
  `;
  return result[0] as User;
}

export async function getUserByTelegramId(telegramId: string): Promise<User | null> {
  if (!process.env.DATABASE_URL && !process.env.POSTGRES_URL) {
    throw new Error('DATABASE_URL or POSTGRES_URL environment variable is not set');
  }
  
  try {
    const result = await sql`
      SELECT * FROM users WHERE telegram_id = ${telegramId}
    `;
    return result[0] as User || null;
  } catch (error: any) {
    // Если таблица не существует, пробрасываем ошибку для обработки выше
    if (error.code === '42P01') {
      throw error;
    }
    console.error('Error getting user by telegram ID:', error);
    throw error;
  }
}

export async function getUserById(userId: string): Promise<User | null> {
  if (!process.env.DATABASE_URL && !process.env.POSTGRES_URL) {
    throw new Error('DATABASE_URL or POSTGRES_URL environment variable is not set');
  }

  try {
    const result = await sql`SELECT * FROM users WHERE id = ${userId}`;
    return result[0] as User || null;
  } catch (error) {
    console.error('Error getting user by ID:', error);
    return null;
  }
}

export async function getAllUsers(): Promise<User[]> {
  const result = await sql`SELECT * FROM users ORDER BY created_at ASC`;
  return result as User[];
}

// Enhanced Wish Management Functions
export async function createWish(
  description: string,
  authorId: string,
  assigneeId?: string,
  category: string = 'general',
  isShared: boolean = false,
  isGift: boolean = false,
  isHistorical: boolean = false,
  enchantments: object = {}
): Promise<Wish> {
  const result = await sql`
    INSERT INTO wishes (description, author_id, assignee_id, category, is_shared, is_gift, is_historical, enchantments)
    VALUES (${description}, ${authorId}, ${assigneeId}, ${category}, ${isShared}, ${isGift}, ${isHistorical}, ${JSON.stringify(enchantments)})
    RETURNING *
  `;
  return result[0] as Wish;
}

export async function createSharedWish(
  type: 'green' | 'blue' | 'red',
  description: string,
  authorId: string,
  partnerId: string,
  category: string = 'general',
  priority: number = 1,
  isHistorical: boolean = false
): Promise<Wish> {
  const result = await sql`
    INSERT INTO wishes (type, description, author_id, assignee_id, category, is_shared, priority, is_historical) 
    VALUES (${type}, ${description}, ${authorId}, ${partnerId}, ${category}, true, ${priority}, ${isHistorical}) 
    RETURNING *
  `;
  return result[0] as Wish;
}

export async function approveSharedWish(wishId: string, approverId: string): Promise<Wish> {
  const result = await sql`
    UPDATE wishes 
    SET shared_approved_by = ${approverId}
    WHERE id = ${wishId} AND is_shared = true AND shared_approved_by IS NULL
    RETURNING *
  `;
  
  if (!result[0]) {
    throw new Error('Shared wish not found or already approved');
  }
  
  return result[0] as Wish;
}

export async function createGiftWish(
  fromUserId: string,
  toUserId: string,
  message?: string
): Promise<Wish> {
  const description = message || `A special gift for you!`;
  const result = await sql`
    INSERT INTO wishes (description, author_id, assignee_id, category, is_gift, status)
    VALUES (${description}, ${fromUserId}, ${toUserId}, 'gift', true, 'active')
    RETURNING *
  `;
  return result[0] as Wish;
}

export async function getWishesByUser(userId: string, type: 'created' | 'assigned' | 'shared' = 'created'): Promise<Wish[]> {
  let result;
  
  if (type === 'created') {
    result = await sql`
      SELECT w.*, u1.name as author_name, u2.name as assignee_name 
      FROM wishes w 
      LEFT JOIN users u1 ON w.author_id = u1.id 
      LEFT JOIN users u2 ON w.assignee_id = u2.id 
      WHERE w.author_id = ${userId}
      ORDER BY w.created_at DESC
    `;
  } else if (type === 'assigned') {
    result = await sql`
      SELECT w.*, u1.name as author_name, u2.name as assignee_name 
      FROM wishes w 
      LEFT JOIN users u1 ON w.author_id = u1.id 
      LEFT JOIN users u2 ON w.assignee_id = u2.id 
      WHERE w.assignee_id = ${userId}
      ORDER BY w.created_at DESC
    `;
  } else { // shared
    result = await sql`
      SELECT w.*, u1.name as author_name, u2.name as assignee_name 
      FROM wishes w 
      LEFT JOIN users u1 ON w.author_id = u1.id 
      LEFT JOIN users u2 ON w.assignee_id = u2.id 
      WHERE w.is_shared = true AND (w.author_id = ${userId} OR w.assignee_id = ${userId})
      ORDER BY w.created_at DESC
    `;
  }
  
  return result as Wish[];
}

export async function getActiveWishes(userId?: string): Promise<Wish[]> {
  const result = userId 
    ? await sql`
        SELECT w.*, u1.name as author_name, u2.name as assignee_name 
        FROM wishes w 
        LEFT JOIN users u1 ON w.author_id = u1.id 
        LEFT JOIN users u2 ON w.assignee_id = u2.id 
        WHERE w.status = 'active' AND (w.author_id = ${userId} OR w.assignee_id = ${userId})
        ORDER BY w.priority DESC, w.created_at DESC
      `
    : await sql`
        SELECT w.*, u1.name as author_name, u2.name as assignee_name 
        FROM wishes w 
        LEFT JOIN users u1 ON w.author_id = u1.id 
        LEFT JOIN users u2 ON w.assignee_id = u2.id 
        WHERE w.status = 'active' 
        ORDER BY w.priority DESC, w.created_at DESC
      `;
  
  return result as Wish[];
}

export async function getWishesByCategory(category: string, userId?: string): Promise<Wish[]> {
  const result = userId
    ? await sql`
        SELECT w.*, u1.name as author_name, u2.name as assignee_name 
        FROM wishes w 
        LEFT JOIN users u1 ON w.author_id = u1.id 
        LEFT JOIN users u2 ON w.assignee_id = u2.id 
        WHERE w.category = ${category} AND (w.author_id = ${userId} OR w.assignee_id = ${userId})
        ORDER BY w.priority DESC, w.created_at DESC
      `
    : await sql`
        SELECT w.*, u1.name as author_name, u2.name as assignee_name 
        FROM wishes w 
        LEFT JOIN users u1 ON w.author_id = u1.id 
        LEFT JOIN users u2 ON w.assignee_id = u2.id 
        WHERE w.category = ${category}
        ORDER BY w.priority DESC, w.created_at DESC
      `;
  
  return result as Wish[];
}

export async function completeWish(wishId: string): Promise<Wish> {
  const result = await sql`
    UPDATE wishes 
    SET status = 'completed', completed_at = NOW() 
    WHERE id = ${wishId} 
    RETURNING *
  `;
  return result[0] as Wish;
}

// This function is being replaced by `updateWish`
// export async function updateWishPriority(wishId: string, priority: number): Promise<Wish> { ... }

// Транзакции и баланс
export async function addTransaction(tx: Omit<Transaction, 'id' | 'created_at'>): Promise<Transaction> {
  const {
    user_id,
    type,
    mana_amount,
    description,
    transaction_category,
    related_entity_id,
    related_entity_type,
    experience_gained = 0,
  } = tx;

  const result = await sql`
    INSERT INTO transactions (user_id, type, mana_amount, description, transaction_category, related_entity_id, related_entity_type, experience_gained)
    VALUES (${user_id}, ${type}, ${mana_amount}, ${description}, ${transaction_category}, ${related_entity_id}, ${related_entity_type}, ${experience_gained})
    RETURNING *
  `;

  // Balance updates are now handled by the economy engine to keep logic centralized.
  // The engine will call updateUser directly.

  return result[0] as Transaction;
}

// exchangeWishes is obsolete in the new economy

export async function getUserTransactions(userId: string, limit = 50): Promise<Transaction[]> {
  const result = await sql`
    SELECT * FROM transactions 
    WHERE user_id = ${userId} 
    ORDER BY created_at DESC 
    LIMIT ${limit}
  `;
  return result as Transaction[];
}

// Quest Economy System Functions

// Enhanced Quest Management Functions
export async function createQuest(questData: Omit<Quest, 'id' | 'created_at' | 'completed_at' | 'status'>): Promise<Quest> {
  const {
    title,
    description,
    author_id,
    assignee_id,
    category = 'general',
    difficulty = 'easy',
    mana_reward = 10,
    experience_reward = 10,
    due_date,
    metadata = {}
  } = questData;

  const result = await sql`
    INSERT INTO quests (title, description, author_id, assignee_id, category, difficulty, mana_reward, experience_reward, due_date, metadata)
    VALUES (${title}, ${description}, ${author_id}, ${assignee_id}, ${category}, ${difficulty}, ${mana_reward}, ${experience_reward}, ${due_date}, ${JSON.stringify(metadata)})
    RETURNING *
  `;
  return result[0] as Quest;
}

export async function getQuestsByUser(userId: string, status?: string): Promise<Quest[]> {
  const result = status 
    ? await sql`
        SELECT * FROM quests 
        WHERE (author_id = ${userId} OR assignee_id = ${userId}) AND status = ${status}
        ORDER BY created_at DESC
      `
    : await sql`
        SELECT * FROM quests 
        WHERE (author_id = ${userId} OR assignee_id = ${userId})
        ORDER BY created_at DESC
      `;
  return result as Quest[];
}

export async function getQuestById(questId: string): Promise<Quest | null> {
  const result = await sql`
    SELECT * FROM quests WHERE id = ${questId}
  `;
  return result[0] as Quest || null;
}

export async function updateQuest(questId: string, updates: Partial<Quest>): Promise<Quest> {
  const setClauses = Object.entries(updates)
    .map(([key, value]) => {
      if (value !== undefined) {
        // This is not safe for production, needs proper parameterization
        return `${key} = '${typeof value === 'object' ? JSON.stringify(value) : value}'`;
      }
      return null;
    })
    .filter(Boolean);

  if (setClauses.length === 0) {
    return getQuestById(questId);
  }

  const query = `UPDATE quests SET ${setClauses.join(', ')}, updated_at = NOW() WHERE id = '${questId}' RETURNING *`;

  const result = await sql.unsafe(query); // Use with caution
  return result[0] as Quest;
}

export async function completeQuest(questId: string, completedBy: string): Promise<Quest> {
  const result = await sql`
    UPDATE quests 
    SET status = 'completed', completed_at = NOW()
    WHERE id = ${questId} AND author_id = ${completedBy}
    RETURNING *
  `;
  
  if (!result[0]) {
    throw new Error('Quest not found or user not authorized to complete it');
  }
  
  return result[0] as Quest;
}

export async function cancelQuest(questId: string, userId: string): Promise<Quest> {
  const result = await sql`
    UPDATE quests 
    SET status = 'cancelled'
    WHERE id = ${questId} AND author_id = ${userId}
    RETURNING *
  `;
  
  if (!result[0]) {
    throw new Error('Quest not found or user not authorized to cancel it');
  }
  
  return result[0] as Quest;
}

export async function getExpiredQuests(): Promise<Quest[]> {
  const result = await sql`
    SELECT * FROM quests 
    WHERE status = 'active' AND due_date < NOW()
    ORDER BY due_date ASC
  `;
  return result as Quest[];
}

export async function markQuestsAsExpired(): Promise<number> {
  const result = await sql`
    UPDATE quests 
    SET status = 'expired'
    WHERE status = 'active' AND due_date < NOW()
  `;
  return result.length || 0;
}

// Enhanced Random Event Functions
export async function createRandomEvent(eventData: Omit<RandomEvent, 'id' | 'created_at' | 'completed_at' | 'status'>): Promise<RandomEvent> {
  const {
    user_id,
    title,
    description,
    mana_reward = 10,
    experience_reward = 15,
    expires_at,
    metadata = {}
  } = eventData;

  const result = await sql`
    INSERT INTO random_events (user_id, title, description, mana_reward, experience_reward, expires_at, metadata)
    VALUES (${user_id}, ${title}, ${description}, ${mana_reward}, ${experience_reward}, ${expires_at}, ${JSON.stringify(metadata)})
    RETURNING *
  `;
  return result[0] as RandomEvent;
}

export async function getCurrentEvent(userId: string): Promise<RandomEvent | null> {
  const result = await sql`
    SELECT * FROM random_events 
    WHERE user_id = ${userId} AND status = 'active'
    ORDER BY created_at DESC
    LIMIT 1
  `;
  return result[0] as RandomEvent || null;
}

export async function getEventById(eventId: string): Promise<RandomEvent | null> {
  const result = await sql`
    SELECT * FROM random_events WHERE id = ${eventId}
  `;
  return result[0] as RandomEvent || null;
}

export async function completeRandomEvent(eventId: string, completedBy: string): Promise<RandomEvent> {
  // First check if the event exists and get the user_id
  const event = await getEventById(eventId);
  if (!event) {
    throw new Error('Event not found');
  }
  
  // Ensure the completer is not the same as the event owner
  if (event.user_id === completedBy) {
    throw new Error('Users cannot complete their own events');
  }
  
  const result = await sql`
    UPDATE random_events 
    SET status = 'completed', completed_at = NOW(), completed_by = ${completedBy}
    WHERE id = ${eventId} AND status = 'active'
    RETURNING *
  `;
  
  if (!result[0]) {
    throw new Error('Event not found or already completed');
  }
  
  return result[0] as RandomEvent;
}

export async function getExpiredEvents(): Promise<RandomEvent[]> {
  const result = await sql`
    SELECT * FROM random_events 
    WHERE status = 'active' AND expires_at < NOW()
    ORDER BY expires_at ASC
  `;
  return result as RandomEvent[];
}

export async function markEventsAsExpired(): Promise<number> {
  const result = await sql`
    UPDATE random_events 
    SET status = 'expired'
    WHERE status = 'active' AND expires_at < NOW()
  `;
  return result.length || 0;
}

export async function getUserEventHistory(userId: string, limit: number = 50): Promise<RandomEvent[]> {
  const result = await sql`
    SELECT * FROM random_events 
    WHERE user_id = ${userId}
    ORDER BY created_at DESC
    LIMIT ${limit}
  `;
  return result as RandomEvent[];
}

// Wish Categories
export async function getWishCategories(): Promise<WishCategory[]> {
  const result = await sql`SELECT * FROM wish_categories ORDER BY name`;
  return result as WishCategory[];
}

export async function createWishCategory(name: string, emoji?: string, color?: string): Promise<WishCategory> {
  const result = await sql`
    INSERT INTO wish_categories (name, emoji, color)
    VALUES (${name}, ${emoji}, ${color})
    RETURNING *
  `;
  return result[0] as WishCategory;
}

// Ranks
export async function getRanks(): Promise<Rank[]> {
  const result = await sql`SELECT * FROM ranks ORDER BY min_experience`;
  return result as Rank[];
}

export async function getUserRank(experiencePoints: number): Promise<Rank | null> {
  const result = await sql`
    SELECT * FROM ranks 
    WHERE min_experience <= ${experiencePoints}
    ORDER BY min_experience DESC
    LIMIT 1
  `;
  return result[0] as Rank || null;
}

// Economy Settings
export async function getEconomySettings(): Promise<EconomySetting[]> {
  const result = await sql`SELECT * FROM economy_settings`;
  return result as EconomySetting[];
}

export async function updateEconomySetting(key: string, value: any, description?: string): Promise<EconomySetting> {
  const result = await sql`
    INSERT INTO economy_settings (setting_key, setting_value, description)
    VALUES (${key}, ${JSON.stringify(value)}, ${description})
    ON CONFLICT (setting_key) 
    DO UPDATE SET setting_value = ${JSON.stringify(value)}, description = ${description}, updated_at = NOW()
    RETURNING *
  `;
  return result[0] as EconomySetting;
}

// Enhanced Rank System Functions
export async function calculateUserRank(userId: string): Promise<{ currentRank: Rank | null; nextRank: Rank | null; experienceToNext: number }> {
  const user = await sql`SELECT * FROM users WHERE id = ${userId}`;
  if (!user[0]) {
    throw new Error('User not found');
  }

  const currentRank = await getUserRank(user[0].experience_points);
  const allRanks = await getRanks();
  
  // Find next rank
  const nextRank = allRanks.find(rank => rank.min_experience > user[0].experience_points);
  const experienceToNext = nextRank ? nextRank.min_experience - user[0].experience_points : 0;

  return {
    currentRank,
    nextRank: nextRank || null,
    experienceToNext
  };
}

export async function createRank(
  name: string,
  minExperience: number,
  dailyQuotaBonus: number = 0,
  weeklyQuotaBonus: number = 0,
  monthlyQuotaBonus: number = 0,
  specialPrivileges: Record<string, any> = {},
  emoji?: string
): Promise<Rank> {
  const result = await sql`
    INSERT INTO ranks (name, min_experience, daily_quota_bonus, weekly_quota_bonus, monthly_quota_bonus, special_privileges, emoji)
    VALUES (${name}, ${minExperience}, ${dailyQuotaBonus}, ${weeklyQuotaBonus}, ${monthlyQuotaBonus}, ${JSON.stringify(specialPrivileges)}, ${emoji})
    RETURNING *
  `;
  return result[0] as Rank;
}

export async function getRankPrivileges(rankName: string): Promise<Record<string, any>> {
  const result = await sql`
    SELECT special_privileges FROM ranks WHERE name = ${rankName}
  `;
  return result[0]?.special_privileges || {};
}

// Enhanced Economy Functions
export async function validateGiftQuota(userId: string, giftCount: number = 1): Promise<{
  canGift: boolean;
  quotaType: 'daily' | 'weekly' | 'monthly' | null;
  remainingQuota: number;
  resetTime: Date | null;
}> {
  const quotas = await getUserQuotas(userId);
  
  // Check daily quota first
  if (quotas.daily.used + giftCount > quotas.daily.limit) {
    return {
      canGift: false,
      quotaType: 'daily',
      remainingQuota: quotas.daily.limit - quotas.daily.used,
      resetTime: quotas.daily.reset_time
    };
  }
  
  // Check weekly quota
  if (quotas.weekly.used + giftCount > quotas.weekly.limit) {
    return {
      canGift: false,
      quotaType: 'weekly',
      remainingQuota: quotas.weekly.limit - quotas.weekly.used,
      resetTime: quotas.weekly.reset_time
    };
  }
  
  // Check monthly quota
  if (quotas.monthly.used + giftCount > quotas.monthly.limit) {
    return {
      canGift: false,
      quotaType: 'monthly',
      remainingQuota: quotas.monthly.limit - quotas.monthly.used,
      resetTime: quotas.monthly.reset_time
    };
  }
  
  return {
    canGift: true,
    quotaType: null,
    remainingQuota: Math.min(
      quotas.daily.limit - quotas.daily.used,
      quotas.weekly.limit - quotas.weekly.used,
      quotas.monthly.limit - quotas.monthly.used
    ),
    resetTime: null
  };
}

export async function processGiftTransaction(
  fromUserId: string,
  toUserId: string,
  type: 'green' | 'blue' | 'red',
  amount: number = 1,
  message?: string
): Promise<{ wishes: Wish[]; experienceGained: number }> {
  // Validate quota
  const quotaCheck = await validateGiftQuota(fromUserId, amount);
  if (!quotaCheck.canGift) {
    throw new Error(`Gift quota exceeded: ${quotaCheck.quotaType} limit reached`);
  }

  try {
    await sql`BEGIN`;

    // Create gift wishes
    const wishes = await createGiftWish(type, fromUserId, toUserId, amount, message);

    // Update quotas
    await updateUserQuotas(fromUserId, amount, amount, amount);

    // Calculate and add experience
    const experienceGained = amount * 5; // 5 experience per gift
    await updateUserExperience(fromUserId, experienceGained);

    // Add transaction record
    await addTransaction(
      toUserId,
      'credit',
      type,
      amount,
      `Gift from partner: ${message || 'No message'}`,
      wishes[0]?.id
    );

    await sql`COMMIT`;

    return { wishes, experienceGained };
  } catch (error) {
    await sql`ROLLBACK`;
    throw error;
  }
}

// Statistics and Analytics Functions
export async function getUserStats(userId: string): Promise<{
  total_quests_created: number;
  total_quests_completed: number;
  total_events_completed: number;
  total_wishes_gifted: number;
  total_experience: number;
  current_rank: string;
  completion_rate: number;
}> {
  const user = await sql`SELECT * FROM users WHERE id = ${userId}`;
  if (!user[0]) {
    throw new Error('User not found');
  }

  const questsCreated = await sql`
    SELECT COUNT(*) as count FROM quests WHERE author_id = ${userId}
  `;

  const questsCompleted = await sql`
    SELECT COUNT(*) as count FROM quests WHERE assignee_id = ${userId} AND status = 'completed'
  `;

  const eventsCompleted = await sql`
    SELECT COUNT(*) as count FROM random_events WHERE completed_by = ${userId}
  `;

  const wishesGifted = await sql`
    SELECT COUNT(*) as count FROM wishes WHERE author_id = ${userId} AND is_gift = true
  `;

  const totalQuests = parseInt(questsCreated[0].count);
  const completedQuests = parseInt(questsCompleted[0].count);
  const completionRate = totalQuests > 0 ? (completedQuests / totalQuests) * 100 : 0;

  return {
    total_quests_created: totalQuests,
    total_quests_completed: completedQuests,
    total_events_completed: parseInt(eventsCompleted[0].count),
    total_wishes_gifted: parseInt(wishesGifted[0].count),
    total_experience: user[0].experience_points,
    current_rank: user[0].rank,
    completion_rate: Math.round(completionRate * 100) / 100
  };
}

// Enhanced User Functions
export async function updateUserExperience(userId: string, experienceGained: number): Promise<User> {
  const result = await sql`
    UPDATE users 
    SET experience_points = experience_points + ${experienceGained}, updated_at = NOW()
    WHERE id = ${userId}
    RETURNING *
  `;
  return result[0] as User;
}

export async function updateUserRank(userId: string, newRank: string): Promise<User> {
  const result = await sql`
    UPDATE users 
    SET rank = ${newRank}, updated_at = NOW()
    WHERE id = ${userId}
    RETURNING *
  `;
  return result[0] as User;
}

export async function updateUserQuotas(userId: string, dailyUsed?: number, weeklyUsed?: number, monthlyUsed?: number): Promise<User> {
  // Простая реализация без динамических запросов
  if (dailyUsed !== undefined) {
    await sql`
      UPDATE users 
      SET daily_quota_used = daily_quota_used + ${dailyUsed}, updated_at = NOW()
      WHERE id = ${userId}
    `;
  }
  if (weeklyUsed !== undefined) {
    await sql`
      UPDATE users 
      SET weekly_quota_used = weekly_quota_used + ${weeklyUsed}, updated_at = NOW()
      WHERE id = ${userId}
    `;
  }
  if (monthlyUsed !== undefined) {
    await sql`
      UPDATE users 
      SET monthly_quota_used = monthly_quota_used + ${monthlyUsed}, updated_at = NOW()
      WHERE id = ${userId}
    `;
  }
  
  const result = await sql`
    SELECT * FROM users WHERE id = ${userId}
  `;
  return result[0] as User;
}

export async function resetUserQuotas(userId: string, resetDaily: boolean = false, resetWeekly: boolean = false, resetMonthly: boolean = false): Promise<User> {
  // Простая реализация с отдельными запросами
  if (resetDaily) {
    await sql`
      UPDATE users 
      SET daily_quota_used = 0, updated_at = NOW()
      WHERE id = ${userId}
    `;
  }
  if (resetWeekly) {
    await sql`
      UPDATE users 
      SET weekly_quota_used = 0, updated_at = NOW()
      WHERE id = ${userId}
    `;
  }
  if (resetMonthly) {
    await sql`
      UPDATE users 
      SET monthly_quota_used = 0, updated_at = NOW()
      WHERE id = ${userId}
    `;
  }
  
  const result = await sql`
    UPDATE users 
    SET last_quota_reset = CURRENT_DATE, updated_at = NOW()
    WHERE id = ${userId}
    RETURNING *
  `;
  return result[0] as User;
}

export async function getUserQuotas(userId: string): Promise<{
  daily: { limit: number; used: number; reset_time: Date };
  weekly: { limit: number; used: number; reset_time: Date };
  monthly: { limit: number; used: number; reset_time: Date };
}> {
  const user = await sql`SELECT * FROM users WHERE id = ${userId}`;
  if (!user[0]) {
    throw new Error('User not found');
  }

  const userRank = await getUserRank(user[0].experience_points);
  const baseSettings = await getEconomySetting('daily_gift_base_limit');
  
  const baseDailyLimit = baseSettings ? parseInt(baseSettings.setting_value) : 5;
  const baseWeeklyLimit = baseDailyLimit * 4;
  const baseMonthlyLimit = baseDailyLimit * 10;

  const dailyBonus = userRank?.daily_quota_bonus || 0;
  const weeklyBonus = userRank?.weekly_quota_bonus || 0;
  const monthlyBonus = userRank?.monthly_quota_bonus || 0;

  // Calculate reset times
  const now = new Date();
  const dailyReset = new Date(now);
  dailyReset.setDate(dailyReset.getDate() + 1);
  dailyReset.setHours(0, 0, 0, 0);

  const weeklyReset = new Date(now);
  weeklyReset.setDate(weeklyReset.getDate() + (7 - weeklyReset.getDay()));
  weeklyReset.setHours(0, 0, 0, 0);

  const monthlyReset = new Date(now.getFullYear(), now.getMonth() + 1, 1);

  return {
    daily: {
      limit: baseDailyLimit + dailyBonus,
      used: user[0].daily_quota_used,
      reset_time: dailyReset
    },
    weekly: {
      limit: baseWeeklyLimit + weeklyBonus,
      used: user[0].weekly_quota_used,
      reset_time: weeklyReset
    },
    monthly: {
      limit: baseMonthlyLimit + monthlyBonus,
      used: user[0].monthly_quota_used,
      reset_time: monthlyReset
    }
  };
}

export async function checkAndResetQuotas(userId: string): Promise<User> {
  const user = await sql`SELECT * FROM users WHERE id = ${userId}`;
  if (!user[0]) {
    throw new Error('User not found');
  }

  const now = new Date();
  const lastReset = new Date(user[0].last_quota_reset);
  
  let needsReset = false;
  let resetDaily = false;
  let resetWeekly = false;
  let resetMonthly = false;

  // Check if daily reset is needed
  if (now.getDate() !== lastReset.getDate() || now.getMonth() !== lastReset.getMonth() || now.getFullYear() !== lastReset.getFullYear()) {
    resetDaily = true;
    needsReset = true;
  }

  // Check if weekly reset is needed (assuming week starts on Sunday)
  const nowWeekStart = new Date(now);
  nowWeekStart.setDate(now.getDate() - now.getDay());
  const lastResetWeekStart = new Date(lastReset);
  lastResetWeekStart.setDate(lastReset.getDate() - lastReset.getDay());
  
  if (nowWeekStart.getTime() > lastResetWeekStart.getTime()) {
    resetWeekly = true;
    needsReset = true;
  }

  // Check if monthly reset is needed
  if (now.getMonth() !== lastReset.getMonth() || now.getFullYear() !== lastReset.getFullYear()) {
    resetMonthly = true;
    needsReset = true;
  }

  if (needsReset) {
    return await resetUserQuotas(userId, resetDaily, resetWeekly, resetMonthly);
  }

  return user[0] as User;
}

// Additional functions needed for API endpoints

export async function updateUser(user: User): Promise<User> {
  const {
    id,
    name,
    username,
    mana,
    mana_spent,
    rank,
    experience_points,
    daily_quota_used,
    weekly_quota_used,
    monthly_quota_used,
    last_quota_reset,
  } = user;

  const result = await sql`
    UPDATE users SET
      name = ${name},
      username = ${username},
      mana = ${mana},
      mana_spent = ${mana_spent},
      rank = ${rank},
      experience_points = ${experience_points},
      daily_quota_used = ${daily_quota_used},
      weekly_quota_used = ${weekly_quota_used},
      monthly_quota_used = ${monthly_quota_used},
      last_quota_reset = ${last_quota_reset},
      updated_at = NOW()
    WHERE id = ${id}
    RETURNING *
  `;
  return result[0] as User;
}

export async function updateWish(wish: Wish): Promise<Wish> {
  const {
    id,
    description,
    category,
    status,
    enchantments
  } = wish;

  const result = await sql`
    UPDATE wishes SET
      description = ${description},
      category = ${category},
      status = ${status},
      enchantments = ${JSON.stringify(enchantments)}
    WHERE id = ${id}
    RETURNING *
  `;
  return result[0] as Wish;
}

export async function getWishesByCreator(creatorId: string, filters: any = {}, page: number = 1, limit: number = 10): Promise<Wish[]> {
  const offset = (page - 1) * limit;
  
  let whereClause = `WHERE author_id = ${creatorId}`;
  if (filters.status) {
    whereClause += ` AND status = '${filters.status}'`;
  }
  if (filters.category) {
    whereClause += ` AND category = '${filters.category}'`;
  }

  const result = await sql`
    SELECT w.*, u1.name as author_name, u2.name as assignee_name 
    FROM wishes w 
    LEFT JOIN users u1 ON w.author_id = u1.id 
    LEFT JOIN users u2 ON w.assignee_id = u2.id 
    WHERE w.author_id = ${creatorId}
    ORDER BY w.created_at DESC
    LIMIT ${limit} OFFSET ${offset}
  `;
  
  return result as Wish[];
}

export async function getWishesByAssignee(assigneeId: string, filters: any = {}, page: number = 1, limit: number = 10): Promise<Wish[]> {
  const offset = (page - 1) * limit;
  
  const result = await sql`
    SELECT w.*, u1.name as author_name, u2.name as assignee_name 
    FROM wishes w 
    LEFT JOIN users u1 ON w.author_id = u1.id 
    LEFT JOIN users u2 ON w.assignee_id = u2.id 
    WHERE w.assignee_id = ${assigneeId}
    ORDER BY w.created_at DESC
    LIMIT ${limit} OFFSET ${offset}
  `;
  
  return result as Wish[];
}

export async function getSharedWishes(filters: any = {}, page: number = 1, limit: number = 10): Promise<Wish[]> {
  const offset = (page - 1) * limit;
  
  let whereClause = 'WHERE is_shared = true';
  if (filters.status) {
    whereClause += ` AND status = '${filters.status}'`;
  }
  if (filters.category) {
    whereClause += ` AND category = '${filters.category}'`;
  }

  const result = await sql`
    SELECT w.*, u1.name as author_name, u2.name as assignee_name 
    FROM wishes w 
    LEFT JOIN users u1 ON w.author_id = u1.id 
    LEFT JOIN users u2 ON w.assignee_id = u2.id 
    WHERE w.is_shared = true
    ORDER BY w.created_at DESC
    LIMIT ${limit} OFFSET ${offset}
  `;
  
  return result as Wish[];
}





