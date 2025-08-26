import { NextApiRequest, NextApiResponse } from 'next';
import { db } from '@/lib/db-pool';
import { getUserFromRequest } from '@/lib/telegram-auth';

interface UserManaInfo {
  id: string;
  username: string;
  mana_balance: number;
  total_earned: number;
  total_spent: number;
  enhancement_count: number;
  last_activity: string;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Метод не поддерживается' });
  }

  try {
    // Проверяем авторизацию (в реальном приложении нужна проверка админских прав)
    const user = await getUserFromRequest(req);
    if (!user) {
      return res.status(401).json({ error: 'Не авторизован' });
    }

    // В реальном приложении здесь должна быть проверка админских прав
    // Для демонстрации пропускаем эту проверку

    // Получаем информацию о пользователях с их балансами Маны
    const users = await db.execute<UserManaInfo>`
      SELECT 
        u.id,
        COALESCE(u.username, u.name) as username,
        COALESCE(u.mana_balance, 0) as mana_balance,
        COALESCE(earned.total_earned, 0) as total_earned,
        COALESCE(spent.total_spent, 0) as total_spent,
        COALESCE(enhancements.enhancement_count, 0) as enhancement_count,
        COALESCE(
          GREATEST(
            u.updated_at,
            earned.last_earn,
            spent.last_spend,
            enhancements.last_enhancement
          ), 
          u.created_at
        ) as last_activity
      FROM users u
      LEFT JOIN (
        SELECT 
          user_id,
          SUM(mana_amount) as total_earned,
          MAX(created_at) as last_earn
        FROM transactions 
        WHERE mana_amount > 0 
        GROUP BY user_id
      ) earned ON u.id = earned.user_id
      LEFT JOIN (
        SELECT 
          user_id,
          SUM(ABS(mana_amount)) as total_spent,
          MAX(created_at) as last_spend
        FROM transactions 
        WHERE mana_amount < 0 
        GROUP BY user_id
      ) spent ON u.id = spent.user_id
      LEFT JOIN (
        SELECT 
          applied_by as user_id,
          COUNT(*) as enhancement_count,
          MAX(applied_at) as last_enhancement
        FROM wish_enhancements 
        GROUP BY applied_by
      ) enhancements ON u.id = enhancements.user_id
      WHERE u.mana_balance IS NOT NULL
      ORDER BY u.mana_balance DESC
    `;

    res.status(200).json({ users });
  } catch (error) {
    console.error('Ошибка получения пользователей:', error);
    res.status(500).json({ 
      error: 'Ошибка сервера при получении данных пользователей' 
    });
  }
}