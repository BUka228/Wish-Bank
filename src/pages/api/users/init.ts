import { NextApiRequest, NextApiResponse } from 'next';
import { createUser, getUserByTelegramId, initDatabase } from '@/lib/db';
import { validateTelegramWebAppData, createMockTelegramUser, TelegramUser } from '@/lib/telegram-auth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    let telegramUser: TelegramUser;
    
    // Проверяем, есть ли initData для валидации
    const { initData, ...fallbackUser } = req.body;
    
    if (initData && process.env.TELEGRAM_BOT_TOKEN) {
      // Валидируем данные от Telegram WebApp
      const validatedUser = validateTelegramWebAppData(initData, process.env.TELEGRAM_BOT_TOKEN);
      
      if (!validatedUser) {
        return res.status(401).json({ error: 'Invalid Telegram data' });
      }
      
      telegramUser = validatedUser;
    } else if (process.env.NODE_ENV === 'development' && fallbackUser.id) {
      // В режиме разработки разрешаем использовать переданные данные
      telegramUser = fallbackUser as TelegramUser;
    } else {
      // Используем моковые данные для тестирования
      telegramUser = createMockTelegramUser();
    }
    
    if (!telegramUser.id || !telegramUser.first_name) {
      return res.status(400).json({ error: 'Invalid user data' });
    }

    // Проверяем, существует ли пользователь
    let user;
    try {
      user = await getUserByTelegramId(telegramUser.id);
    } catch (error: any) {
      // Если таблица не существует, инициализируем базу данных
      if (error.code === '42P01') {
        console.log('Database tables not found, initializing...');
        await initDatabase();
        user = null; // После инициализации пользователя точно нет
      } else {
        throw error;
      }
    }
    
    if (!user) {
      // Создаем нового пользователя
      const name = `${telegramUser.first_name}${telegramUser.last_name ? ' ' + telegramUser.last_name : ''}`;
      user = await createUser(telegramUser.id, name, telegramUser.username);
    }

    res.status(200).json({ user });
  } catch (error) {
    console.error('User initialization error:', error);
    res.status(500).json({ error: 'Failed to initialize user' });
  }
}