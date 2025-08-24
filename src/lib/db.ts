import { sql } from '@vercel/postgres';

export interface User {
  id: string;
  telegram_id: string;
  name: string;
  username?: string;
  green_balance: number;
  blue_balance: number;
  red_balance: number;
  created_at: Date;
  updated_at: Date;
}

export interface Wish {
  id: string;
  type: 'green' | 'blue' | 'red';
  description: string;
  author_id: string;
  assignee_id?: string;
  status: 'active' | 'completed' | 'cancelled';
  created_at: Date;
  completed_at?: Date;
  metadata?: any;
}

export interface Transaction {
  id: string;
  user_id: string;
  type: 'credit' | 'debit';
  wish_type: 'green' | 'blue' | 'red';
  amount: number;
  reason: string;
  reference_id?: string;
  created_at: Date;
  metadata?: any;
}

// Инициализация базы данных
export async function initDatabase() {
  try {
    // Создание таблицы пользователей
    await sql`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        telegram_id VARCHAR(50) UNIQUE NOT NULL,
        name VARCHAR(100) NOT NULL,
        username VARCHAR(50),
        green_balance INTEGER DEFAULT 0,
        blue_balance INTEGER DEFAULT 0,
        red_balance INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `;

    // Создание таблицы желаний
    await sql`
      CREATE TABLE IF NOT EXISTS wishes (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        type VARCHAR(10) NOT NULL CHECK (type IN ('green', 'blue', 'red')),
        description TEXT NOT NULL,
        author_id UUID REFERENCES users(id),
        assignee_id UUID REFERENCES users(id),
        status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled')),
        created_at TIMESTAMP DEFAULT NOW(),
        completed_at TIMESTAMP,
        metadata JSONB
      )
    `;

    // Создание таблицы транзакций
    await sql`
      CREATE TABLE IF NOT EXISTS transactions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id),
        type VARCHAR(10) NOT NULL CHECK (type IN ('credit', 'debit')),
        wish_type VARCHAR(10) NOT NULL CHECK (wish_type IN ('green', 'blue', 'red')),
        amount INTEGER NOT NULL,
        reason TEXT NOT NULL,
        reference_id UUID,
        created_at TIMESTAMP DEFAULT NOW(),
        metadata JSONB
      )
    `;

    // Создание индексов для производительности
    await sql`CREATE INDEX IF NOT EXISTS idx_users_telegram_id ON users(telegram_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_wishes_author ON wishes(author_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_wishes_assignee ON wishes(assignee_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_wishes_status ON wishes(status)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_transactions_user ON transactions(user_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_transactions_created ON transactions(created_at)`;

    console.log('Database initialized successfully');
  } catch (error) {
    console.error('Database initialization error:', error);
    throw error;
  }
}

// Пользователи
export async function createUser(telegramId: string, name: string, username?: string): Promise<User> {
  const result = await sql`
    INSERT INTO users (telegram_id, name, username)
    VALUES (${telegramId}, ${name}, ${username})
    ON CONFLICT (telegram_id) 
    DO UPDATE SET name = ${name}, username = ${username}, updated_at = NOW()
    RETURNING *
  `;
  return result.rows[0] as User;
}

export async function getUserByTelegramId(telegramId: string): Promise<User | null> {
  const result = await sql`
    SELECT * FROM users WHERE telegram_id = ${telegramId}
  `;
  return result.rows[0] as User || null;
}

export async function getAllUsers(): Promise<User[]> {
  const result = await sql`
    SELECT * FROM users ORDER BY created_at ASC
  `;
  return result.rows as User[];
}

// Желания
export async function createWish(
  type: 'green' | 'blue' | 'red',
  description: string,
  authorId: string,
  assigneeId?: string
): Promise<Wish> {
  const result = await sql`
    INSERT INTO wishes (type, description, author_id, assignee_id)
    VALUES (${type}, ${description}, ${authorId}, ${assigneeId})
    RETURNING *
  `;
  return result.rows[0] as Wish;
}

export async function getActiveWishes(userId?: string): Promise<Wish[]> {
  const query = userId 
    ? sql`SELECT w.*, u1.name as author_name, u2.name as assignee_name 
          FROM wishes w 
          LEFT JOIN users u1 ON w.author_id = u1.id 
          LEFT JOIN users u2 ON w.assignee_id = u2.id 
          WHERE w.status = 'active' AND (w.author_id = ${userId} OR w.assignee_id = ${userId})
          ORDER BY w.created_at DESC`
    : sql`SELECT w.*, u1.name as author_name, u2.name as assignee_name 
          FROM wishes w 
          LEFT JOIN users u1 ON w.author_id = u1.id 
          LEFT JOIN users u2 ON w.assignee_id = u2.id 
          WHERE w.status = 'active' 
          ORDER BY w.created_at DESC`;
  
  const result = await query;
  return result.rows as Wish[];
}

export async function completeWish(wishId: string): Promise<Wish> {
  const result = await sql`
    UPDATE wishes 
    SET status = 'completed', completed_at = NOW() 
    WHERE id = ${wishId} 
    RETURNING *
  `;
  return result.rows[0] as Wish;
}

// Транзакции и баланс
export async function addTransaction(
  userId: string,
  type: 'credit' | 'debit',
  wishType: 'green' | 'blue' | 'red',
  amount: number,
  reason: string,
  referenceId?: string
): Promise<Transaction> {
  const result = await sql`
    INSERT INTO transactions (user_id, type, wish_type, amount, reason, reference_id)
    VALUES (${userId}, ${type}, ${wishType}, ${amount}, ${reason}, ${referenceId})
    RETURNING *
  `;

  // Обновляем баланс пользователя
  const balanceChange = type === 'credit' ? amount : -amount;
  
  if (wishType === 'green') {
    await sql`
      UPDATE users 
      SET green_balance = green_balance + ${balanceChange}, updated_at = NOW()
      WHERE id = ${userId}
    `;
  } else if (wishType === 'blue') {
    await sql`
      UPDATE users 
      SET blue_balance = blue_balance + ${balanceChange}, updated_at = NOW()
      WHERE id = ${userId}
    `;
  } else if (wishType === 'red') {
    await sql`
      UPDATE users 
      SET red_balance = red_balance + ${balanceChange}, updated_at = NOW()
      WHERE id = ${userId}
    `;
  }

  return result.rows[0] as Transaction;
}

export async function exchangeWishes(
  userId: string,
  fromType: 'green' | 'blue',
  toType: 'blue' | 'red'
): Promise<boolean> {
  const exchangeRate = 10;
  
  try {
    // Начинаем транзакцию
    await sql`BEGIN`;
    
    // Проверяем баланс
    const user = await sql`SELECT * FROM users WHERE id = ${userId}`;
    const currentBalance = user.rows[0][`${fromType}_balance`];
    
    if (currentBalance < exchangeRate) {
      await sql`ROLLBACK`;
      return false;
    }
    
    // Списываем исходные желания
    await addTransaction(userId, 'debit', fromType, exchangeRate, `Exchange to ${toType}`);
    
    // Начисляем новые желания
    await addTransaction(userId, 'credit', toType, 1, `Exchange from ${fromType}`);
    
    await sql`COMMIT`;
    return true;
  } catch (error) {
    await sql`ROLLBACK`;
    throw error;
  }
}

export async function getUserTransactions(userId: string, limit = 50): Promise<Transaction[]> {
  const result = await sql`
    SELECT * FROM transactions 
    WHERE user_id = ${userId} 
    ORDER BY created_at DESC 
    LIMIT ${limit}
  `;
  return result.rows as Transaction[];
}