#!/usr/bin/env node

// Загружаем переменные окружения
require('dotenv').config({ path: '.env.local' });

const { neon } = require('@neondatabase/serverless');

// Инициализируем подключение к базе данных
const sql = neon(process.env.DATABASE_URL || process.env.POSTGRES_URL);

async function fixManaBalance() {
  try {
    console.log('Checking mana_balance column...');
    
    // Проверяем, существует ли колонка mana_balance
    const columnExists = await sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'users' AND column_name = 'mana_balance'
    `;

    if (columnExists.length === 0) {
      console.log('Adding mana_balance column...');
      await sql`ALTER TABLE users ADD COLUMN mana_balance INTEGER DEFAULT 0`;
      console.log('✅ mana_balance column added successfully');
    } else {
      console.log('✅ mana_balance column already exists');
    }

    // Проверяем, есть ли пользователи с NULL mana_balance
    const usersWithNullMana = await sql`
      SELECT id, name, mana_balance FROM users WHERE mana_balance IS NULL
    `;

    if (usersWithNullMana.length > 0) {
      console.log(`Found ${usersWithNullMana.length} users with NULL mana_balance, fixing...`);
      await sql`UPDATE users SET mana_balance = 0 WHERE mana_balance IS NULL`;
      console.log('✅ Fixed NULL mana_balance values');
    } else {
      console.log('✅ No users with NULL mana_balance found');
    }

    // Показываем текущее состояние пользователей
    const users = await sql`
      SELECT id, name, mana_balance, telegram_id FROM users LIMIT 5
    `;
    
    console.log('\nCurrent users:');
    users.forEach(user => {
      console.log(`- ${user.name}: ${user.mana_balance} mana (ID: ${user.telegram_id})`);
    });

    console.log('\n✅ Mana balance check completed successfully');
  } catch (error) {
    console.error('❌ Error fixing mana balance:', error);
    process.exit(1);
  }
}

fixManaBalance();