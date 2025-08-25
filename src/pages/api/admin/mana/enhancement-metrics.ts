import { NextApiRequest, NextApiResponse } from 'next';
import { db } from '@/lib/db-pool';
import { getUserFromRequest } from '@/lib/telegram-auth';

interface EnhancementStats {
  total_enhancements: number;
  priority_enhancements: number;
  aura_enhancements: number;
  total_mana_spent: number;
  average_enhancement_cost: number;
  most_popular_aura: string;
  enhancement_distribution: {
    level: number;
    count: number;
    percentage: number;
  }[];
  aura_distribution: {
    type: string;
    count: number;
    percentage: number;
  }[];
  daily_stats: {
    date: string;
    enhancements: number;
    mana_spent: number;
  }[];
  top_users: {
    user_id: string;
    username: string;
    enhancement_count: number;
    mana_spent: number;
  }[];
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

    const { range = '30d' } = req.query;

    // Определяем временной диапазон
    let dateFilter = '';
    switch (range) {
      case '7d':
        dateFilter = "AND we.applied_at >= NOW() - INTERVAL '7 days'";
        break;
      case '30d':
        dateFilter = "AND we.applied_at >= NOW() - INTERVAL '30 days'";
        break;
      case '90d':
        dateFilter = "AND we.applied_at >= NOW() - INTERVAL '90 days'";
        break;
      case 'all':
      default:
        dateFilter = '';
        break;
    }

    // Выполняем все запросы параллельно
    const [
      totalStats,
      enhancementDistribution,
      auraDistribution,
      dailyStats,
      topUsers,
      mostPopularAura
    ] = await Promise.all([
      // Общая статистика
      db.execute`
        SELECT 
          COUNT(*) as total_enhancements,
          COUNT(CASE WHEN type = 'priority' THEN 1 END) as priority_enhancements,
          COUNT(CASE WHEN type = 'aura' THEN 1 END) as aura_enhancements,
          COALESCE(SUM(cost), 0) as total_mana_spent,
          COALESCE(AVG(cost), 0) as average_enhancement_cost
        FROM wish_enhancements we
        WHERE 1=1
      `,

      // Распределение уровней приоритета
      db.execute`
        SELECT 
          level,
          COUNT(*) as count
        FROM wish_enhancements we
        WHERE type = 'priority'
        GROUP BY level
        ORDER BY level
      `,

      // Распределение типов аур
      db.execute`
        SELECT 
          aura_type as type,
          COUNT(*) as count
        FROM wish_enhancements we
        WHERE type = 'aura' AND aura_type IS NOT NULL
        GROUP BY aura_type
        ORDER BY count DESC
      `,

      // Статистика по дням
      db.execute`
        SELECT 
          DATE(we.applied_at) as date,
          COUNT(*) as enhancements,
          COALESCE(SUM(we.cost), 0) as mana_spent
        FROM wish_enhancements we
        WHERE we.applied_at >= NOW() - INTERVAL '30 days'
        GROUP BY DATE(we.applied_at)
        ORDER BY date DESC
        LIMIT 30
      `,

      // Топ пользователей
      db.execute`
        SELECT 
          we.applied_by as user_id,
          u.username,
          COUNT(*) as enhancement_count,
          COALESCE(SUM(we.cost), 0) as mana_spent
        FROM wish_enhancements we
        JOIN users u ON we.applied_by = u.id
        WHERE 1=1
        GROUP BY we.applied_by, u.username
        ORDER BY enhancement_count DESC, mana_spent DESC
        LIMIT 10
      `,

      // Самая популярная аура
      db.execute`
        SELECT 
          aura_type,
          COUNT(*) as count
        FROM wish_enhancements we
        WHERE type = 'aura' AND aura_type IS NOT NULL
        GROUP BY aura_type
        ORDER BY count DESC
        LIMIT 1
      `
    ]);

    // Обрабатываем результаты
    const stats = totalStats[0] || {
      total_enhancements: 0,
      priority_enhancements: 0,
      aura_enhancements: 0,
      total_mana_spent: 0,
      average_enhancement_cost: 0
    };

    // Рассчитываем проценты для распределения уровней
    const totalPriorityEnhancements = enhancementDistribution.reduce((sum: number, item: any) => sum + parseInt(item.count), 0);
    const enhancementDistributionWithPercentage = enhancementDistribution.map((item: any) => ({
      level: parseInt(item.level),
      count: parseInt(item.count),
      percentage: totalPriorityEnhancements > 0 ? (parseInt(item.count) / totalPriorityEnhancements) * 100 : 0
    }));

    // Рассчитываем проценты для распределения аур
    const totalAuraEnhancements = auraDistribution.reduce((sum: number, item: any) => sum + parseInt(item.count), 0);
    const auraDistributionWithPercentage = auraDistribution.map((item: any) => ({
      type: item.type,
      count: parseInt(item.count),
      percentage: totalAuraEnhancements > 0 ? (parseInt(item.count) / totalAuraEnhancements) * 100 : 0
    }));

    // Форматируем данные для ответа
    const enhancementStats: EnhancementStats = {
      total_enhancements: parseInt(stats.total_enhancements),
      priority_enhancements: parseInt(stats.priority_enhancements),
      aura_enhancements: parseInt(stats.aura_enhancements),
      total_mana_spent: parseInt(stats.total_mana_spent),
      average_enhancement_cost: parseFloat(stats.average_enhancement_cost),
      most_popular_aura: mostPopularAura[0]?.aura_type || '',
      enhancement_distribution: enhancementDistributionWithPercentage,
      aura_distribution: auraDistributionWithPercentage,
      daily_stats: dailyStats.map((item: any) => ({
        date: item.date,
        enhancements: parseInt(item.enhancements),
        mana_spent: parseInt(item.mana_spent)
      })),
      top_users: topUsers.map((item: any) => ({
        user_id: item.user_id,
        username: item.username,
        enhancement_count: parseInt(item.enhancement_count),
        mana_spent: parseInt(item.mana_spent)
      }))
    };

    res.status(200).json({ stats: enhancementStats });
  } catch (error) {
    console.error('Ошибка получения метрик усилений:', error);
    res.status(500).json({ 
      error: 'Ошибка сервера при получении метрик усилений' 
    });
  }
}