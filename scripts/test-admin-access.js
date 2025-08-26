// Скрипт для тестирования админского доступа
const { neon } = require('@neondatabase/serverless');

const ADMIN_TELEGRAM_ID = process.env.ADMIN_TELEGRAM_ID || '507387437';
const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL не установлен');
  process.exit(1);
}

const sql = neon(DATABASE_URL);

// Копируем функцию validateAdminAccess из admin-security.ts
async function validateAdminAccess(userId) {
  try {
    console.log(`🔍 Проверяем админский доступ для userId: ${userId}`);
    console.log(`🔧 ADMIN_TELEGRAM_ID: ${ADMIN_TELEGRAM_ID}`);
    
    // If userId looks like a Telegram ID (numeric string), search by telegram_id
    // Otherwise, search by UUID
    let result;
    if (/^\d+$/.test(userId)) {
      console.log('📱 userId выглядит как Telegram ID, ищем по telegram_id');
      result = await sql`
        SELECT telegram_id FROM users WHERE telegram_id = ${userId}
      `;
    } else {
      console.log('🆔 userId выглядит как UUID, ищем по id');
      result = await sql`
        SELECT telegram_id FROM users WHERE id = ${userId}
      `;
    }
    
    console.log(`📊 Найдено записей: ${result.length}`);
    if (result.length > 0) {
      console.log(`📋 telegram_id из БД: ${result[0].telegram_id}`);
      console.log(`🔍 Сравниваем: "${result[0].telegram_id}" === "${ADMIN_TELEGRAM_ID}"`);
    }
    
    if (result.length === 0) {
      console.log('❌ Пользователь не найден');
      return false;
    }
    
    const isAdmin = result[0].telegram_id === ADMIN_TELEGRAM_ID;
    console.log(`✅ Результат проверки: ${isAdmin}`);
    return isAdmin;
  } catch (error) {
    console.error('❌ Ошибка при проверке админского доступа:', error);
    return false;
  }
}

async function testAdminAccess() {
  try {
    console.log('🧪 Тестируем админский доступ...\n');
    
    // Тест 1: Проверка по Telegram ID
    console.log('=== Тест 1: Проверка по Telegram ID ===');
    const result1 = await validateAdminAccess('507387437');
    console.log(`Результат: ${result1 ? '✅ АДМИН' : '❌ НЕ АДМИН'}\n`);
    
    // Тест 2: Проверка по UUID
    console.log('=== Тест 2: Проверка по UUID ===');
    const result2 = await validateAdminAccess('9a68130c-2592-4b6e-a6aa-01475caf8d40');
    console.log(`Результат: ${result2 ? '✅ АДМИН' : '❌ НЕ АДМИН'}\n`);
    
    // Тест 3: Проверка неправильного ID
    console.log('=== Тест 3: Проверка неправильного ID ===');
    const result3 = await validateAdminAccess('123456789');
    console.log(`Результат: ${result3 ? '✅ АДМИН' : '❌ НЕ АДМИН'}\n`);
    
  } catch (error) {
    console.error('❌ Ошибка тестирования:', error);
    process.exit(1);
  }
}

testAdminAccess();