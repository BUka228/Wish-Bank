import { NextApiRequest, NextApiResponse } from 'next';
import { createUser, getUserByTelegramId } from '@/lib/db';

interface TelegramUser {
  id: string;
  first_name: string;
  last_name?: string;
  username?: string;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const telegramUser: TelegramUser = req.body;
    
    if (!telegramUser.id || !telegramUser.first_name) {
      return res.status(400).json({ error: 'Invalid user data' });
    }

    // Проверяем, существует ли пользователь
    let user = await getUserByTelegramId(telegramUser.id);
    
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