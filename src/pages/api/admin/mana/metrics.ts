import { NextApiRequest, NextApiResponse } from 'next';
import { db } from '@/lib/db-pool';
import { getUserFromRequest } from '@/lib/telegram-auth';

interface ManaMetrics {
  total_users: number;
  total_mana_in_system: number;
  average_balance: number;
  total_enhancements: number;
  daily_transactions: number;
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

    // Получаем общие метрики системы Маны
    const metricsQueries = await Promise.all([
      // Общее количество пользователей с Маной
      db.execute`
        SELECT COUNT(*) as total_users 
        FROM users 
        WHERE mana_balance IS NOT NULL
      `,
      
      // Общее количество Маны в системе
      db.execute`
        SELECT 
          COALESCE(SUM(mana_balance), 0) as total_mana_in_system,
          COALESCE(AVG(mana_balance), 0) as average_balance
        FROM users 
        WHERE mana_balance IS NOT NULL
      `,
      
      // Общее количество усилений
      db.execute`
        SELECT COUNT(*) as total_enhancements 
        FROM wish_enhancements
      `,
      
      // Транзакции за сегодня
      db.execute`
        SELECT COUNT(*) as daily_transactions 
        FROM transactions 
        WHERE DATE(created_at) = CURRENT_DATE 
        AND mana_amount IS NOT NULL
      `
    ]);

    const metrics: ManaMetrics = {
      total_users: metricsQueries[0][0]?.total_users || 0,
      total_mana_in_system: metricsQueries[1][0]?.total_mana_in_system || 0,
      average_balance: metricsQueries[1][0]?.average_balance || 0,
      total_enhancements: metricsQueries[2][0]?.total_enhancements || 0,
      daily_transactions: metricsQueries[3][0]?.daily_transactions || 0
    };

    res.status(200).json({ metrics });
  } catch (error) {
    console.error('Ошибка получения метрик:', error);
    res.status(500).json({ 
      error: 'Ошибка сервера при получении метрик' 
    });
  }
}