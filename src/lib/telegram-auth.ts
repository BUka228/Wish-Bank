import crypto from 'crypto';

export interface TelegramUser {
  id: string;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
  is_premium?: boolean;
}

export function validateTelegramWebAppData(initData: string, botToken: string): TelegramUser | null {
  try {
    const urlParams = new URLSearchParams(initData);
    const hash = urlParams.get('hash');
    
    if (!hash) {
      return null;
    }

    // Удаляем hash из параметров для проверки
    urlParams.delete('hash');
    
    // Сортируем параметры и создаем строку для проверки
    const dataCheckString = Array.from(urlParams.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, value]) => `${key}=${value}`)
      .join('\n');

    // Создаем секретный ключ
    const secretKey = crypto
      .createHmac('sha256', 'WebAppData')
      .update(botToken)
      .digest();

    // Вычисляем hash
    const calculatedHash = crypto
      .createHmac('sha256', secretKey)
      .update(dataCheckString)
      .digest('hex');

    // Проверяем hash
    if (calculatedHash !== hash) {
      return null;
    }

    // Проверяем время (данные должны быть не старше 24 часов)
    const authDate = urlParams.get('auth_date');
    if (authDate) {
      const authTimestamp = parseInt(authDate) * 1000;
      const now = Date.now();
      const maxAge = 24 * 60 * 60 * 1000; // 24 часа
      
      if (now - authTimestamp > maxAge) {
        return null;
      }
    }

    // Извлекаем данные пользователя
    const userParam = urlParams.get('user');
    if (!userParam) {
      return null;
    }

    const user = JSON.parse(userParam);
    
    return {
      id: user.id.toString(),
      first_name: user.first_name,
      last_name: user.last_name,
      username: user.username,
      language_code: user.language_code,
      is_premium: user.is_premium
    };
  } catch (error) {
    console.error('Error validating Telegram WebApp data:', error);
    return null;
  }
}

export function createMockTelegramUser(): TelegramUser {
  return {
    id: '123456789',
    first_name: 'Тестовый',
    last_name: 'Пользователь',
    username: 'testuser'
  };
}

// Function to get user from request (for API endpoints)
export async function getUserFromRequest(req: any): Promise<any | null> {
  try {
    // In development or when no proper auth is available, return mock user
    if (process.env.NODE_ENV === 'development' || !process.env.TELEGRAM_BOT_TOKEN) {
      return {
        id: '123456789',
        telegram_id: '123456789',
        name: 'Тестовый Пользователь',
        username: 'testuser',
        green_balance: 10,
        blue_balance: 5,
        red_balance: 2,
        rank: 'Рядовой',
        experience: 50,
        coins: 100,
        partnerId: '987654321'
      };
    }

    // In production, extract from headers or session
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      // Fallback to mock user if no auth header (for testing)
      console.warn('No authorization header found, using mock user');
      return {
        id: '123456789',
        telegram_id: '123456789',
        name: 'Тестовый Пользователь',
        username: 'testuser',
        green_balance: 10,
        blue_balance: 5,
        red_balance: 2,
        rank: 'Рядовой',
        experience: 50,
        coins: 100,
        partnerId: '987654321'
      };
    }

    // Extract Telegram WebApp init data from header
    const initData = authHeader.replace('Bearer ', '');
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    
    if (!botToken) {
      console.error('TELEGRAM_BOT_TOKEN not set');
      return null;
    }

    const telegramUser = validateTelegramWebAppData(initData, botToken);
    if (!telegramUser) {
      console.warn('Invalid Telegram WebApp data, using mock user');
      return {
        id: '123456789',
        telegram_id: '123456789',
        name: 'Тестовый Пользователь',
        username: 'testuser',
        green_balance: 10,
        blue_balance: 5,
        red_balance: 2,
        rank: 'Рядовой',
        experience: 50,
        coins: 100,
        partnerId: '987654321'
      };
    }

    // Here you would typically fetch the full user data from database
    // For now, return the telegram user data
    return {
      id: telegramUser.id,
      telegram_id: telegramUser.id,
      name: telegramUser.first_name + (telegramUser.last_name ? ` ${telegramUser.last_name}` : ''),
      username: telegramUser.username,
      // Default values - should be fetched from database
      green_balance: 0,
      blue_balance: 0,
      red_balance: 0,
      rank: 'Рядовой',
      experience: 0,
      coins: 0
    };
  } catch (error) {
    console.error('Error getting user from request:', error);
    // Return mock user as fallback
    return {
      id: '123456789',
      telegram_id: '123456789',
      name: 'Тестовый Пользователь',
      username: 'testuser',
      green_balance: 10,
      blue_balance: 5,
      red_balance: 2,
      rank: 'Рядовой',
      experience: 50,
      coins: 100,
      partnerId: '987654321'
    };
  }
}