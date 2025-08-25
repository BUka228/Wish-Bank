import { NextApiRequest, NextApiResponse } from 'next';
import { getUserByTelegramId, getUserQuotas, getUserStats } from '@/lib/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    try {
      const { userId } = req.query;

      if (!userId || typeof userId !== 'string') {
        return res.status(400).json({ error: 'User ID is required' });
      }

      // Get user data
      const user = await getUserByTelegramId(userId);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      // Get quotas and stats
      const quotas = await getUserQuotas(userId);
      const stats = await getUserStats(userId);

      // Format economy stats
      const economyStats = {
        balances: {
          green: user.green_balance || 0,
          blue: user.blue_balance || 0,
          red: user.red_balance || 0,
          mana: user.mana_balance || 0
        },
        quotas: {
          daily: {
            used: quotas.daily.used,
            limit: quotas.daily.limit,
            remaining: quotas.daily.limit - quotas.daily.used,
            resetTime: quotas.daily.reset_time
          },
          weekly: {
            used: quotas.weekly.used,
            limit: quotas.weekly.limit,
            remaining: quotas.weekly.limit - quotas.weekly.used,
            resetTime: quotas.weekly.reset_time
          },
          monthly: {
            used: quotas.monthly.used,
            limit: quotas.monthly.limit,
            remaining: quotas.monthly.limit - quotas.monthly.used,
            resetTime: quotas.monthly.reset_time
          }
        },
        activity: {
          totalWishesGifted: stats.total_wishes_gifted,
          totalQuestsCreated: stats.total_quests_created,
          totalEventsCompleted: stats.total_events_completed,
          completionRate: stats.completion_rate
        },
        rank: {
          current: stats.current_rank,
          experience: stats.total_experience
        }
      };

      res.status(200).json(economyStats);
    } catch (error) {
      console.error('Error fetching economy stats:', error);
      res.status(500).json({ error: 'Failed to fetch economy stats' });
    }
  } else {
    res.setHeader('Allow', ['GET']);
    res.status(405).json({ error: 'Method not allowed' });
  }
}