// Скрипт для проверки и создания админского пользователя
const { neon } = require('@neondatabase/serverless');

const ADMIN_TELEGRAM_ID = process.env.ADMIN_TELEGRAM_ID || '507387437';
const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL не установлен');
  process.exit(1);
}

const sql = neon(DATABASE_URL);

async function checkAndCreateAdminUser() {
  try {
    console.log(`🔍 Проверяем пользователя с Telegram ID: ${ADMIN_TELEGRAM_ID}`);
    
    // Проверяем, существует ли пользователь
    const existingUser = await sql`
      SELECT id, telegram_id, name, username 
      FROM users 
      WHERE telegram_id = ${ADMIN_TELEGRAM_ID}
    `;
    
    if (existingUser.length > 0) {
      console.log('✅ Админский пользователь найден:');
      console.log('   ID:', existingUser[0].id);
      console.log('   Telegram ID:', existingUser[0].telegram_id);
      console.log('   Имя:', existingUser[0].name);
      console.log('   Username:', existingUser[0].username || 'не указан');
    } else {
      console.log('❌ Админский пользователь не найден. Создаем...');
      
      // Создаем пользователя
      const newUser = await sql`
        INSERT INTO users (telegram_id, name, username, mana_balance)
        VALUES (${ADMIN_TELEGRAM_ID}, 'nikirO1', 'nikirO1', 1000)
        RETURNING id, telegram_id, name, username
      `;
      
      console.log('✅ Админский пользователь создан:');
      console.log('   ID:', newUser[0].id);
      console.log('   Telegram ID:', newUser[0].telegram_id);
      console.log('   Имя:', newUser[0].name);
      console.log('   Username:', newUser[0].username);
    }
    
    // Проверяем переменную окружения
    console.log('\n🔧 Проверка переменных окружения:');
    console.log('   ADMIN_TELEGRAM_ID:', process.env.ADMIN_TELEGRAM_ID || 'не установлен');
    console.log('   NODE_ENV:', process.env.NODE_ENV || 'не установлен');
    
  } catch (error) {
    console.error('❌ Ошибка:', error);
    process.exit(1);
  }
}

checkAndCreateAdminUser();