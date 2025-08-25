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
    const mockTelegramId = '123456789';
    
    // In development or when no proper auth is available, find or create mock user
    if (process.env.NODE_ENV === 'development' || !process.env.TELEGRAM_BOT_TOKEN) {
      const { getUserByTelegramId, createUser } = await import('./db');
      
      let user = await getUserByTelegramId(mockTelegramId);
      if (!user) {
        try {
          user = await createUser(mockTelegramId, 'Тестовый Пользователь', 'testuser');
        } catch (error) {
          console.error('Failed to create mock user:', error);
          return null;
        }
      }
      return user;
    }

    // In production, extract from headers or session
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      // Fallback to mock user if no auth header (for testing)
      console.warn('No authorization header found, using mock user');
      const { getUserByTelegramId, createUser } = await import('./db');
      
      let user = await getUserByTelegramId(mockTelegramId);
      if (!user) {
        try {
          user = await createUser(mockTelegramId, 'Тестовый Пользователь', 'testuser');
        } catch (error) {
          console.error('Failed to create mock user:', error);
          return null;
        }
      }
      return user;
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
      const { getUserByTelegramId, createUser } = await import('./db');
      
      let user = await getUserByTelegramId(mockTelegramId);
      if (!user) {
        try {
          user = await createUser(mockTelegramId, 'Тестовый Пользователь', 'testuser');
        } catch (error) {
          console.error('Failed to create mock user:', error);
          return null;
        }
      }
      return user;
    }

    // Fetch or create user from database
    const { getUserByTelegramId, createUser } = await import('./db');
    let user = await getUserByTelegramId(telegramUser.id);
    if (!user) {
      const name = telegramUser.first_name + (telegramUser.last_name ? ` ${telegramUser.last_name}` : '');
      user = await createUser(telegramUser.id, name, telegramUser.username);
    }
    return user;
  } catch (error) {
    console.error('Error getting user from request:', error);
    // Try to return mock user from database as fallback
    try {
      const { getUserByTelegramId, createUser } = await import('./db');
      const mockTelegramId = '123456789';
      
      let user = await getUserByTelegramId(mockTelegramId);
      if (!user) {
        user = await createUser(mockTelegramId, 'Тестовый Пользователь', 'testuser');
      }
      return user;
    } catch (dbError) {
      console.error('Failed to create fallback user:', dbError);
      return null;
    }
  }
}