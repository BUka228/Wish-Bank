import { NextApiRequest, NextApiResponse } from 'next';
import { getUserByTelegramId, getUserStats } from '@/lib/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    try {
      const { userId } = req.query;

      if (!userId || typeof userId !== 'string') {
        return res.status(400).json({ error: 'User ID is required' });
      }

      // Get user stats for experience activities
      const stats = await getUserStats(userId);
      
      // Format activities data
      const activities = [
        {
          type: 'quests_created',
          count: stats.total_quests_created,
          experience: stats.total_quests_created * 10, // 10 exp per quest created
          label: 'Квесты созданы'
        },
        {
          type: 'quests_completed',
          count: stats.total_quests_completed,
          experience: stats.total_quests_completed * 25, // 25 exp per quest completed
          label: 'Квесты выполнены'
        },
        {
          type: 'events_completed',
          count: stats.total_events_completed,
          experience: stats.total_events_completed * 15, // 15 exp per event
          label: 'События выполнены'
        },
        {
          type: 'wishes_gifted',
          count: stats.total_wishes_gifted,
          experience: stats.total_wishes_gifted * 5, // 5 exp per gift
          label: 'Подарки отправлены'
        }
      ];

      res.status(200).json({ 
        activities,
        totalExperience: stats.total_experience,
        currentRank: stats.current_rank,
        completionRate: stats.completion_rate
      });
    } catch (error) {
      console.error('Error fetching experience activities:', error);
      res.status(500).json({ error: 'Failed to fetch experience activities' });
    }
  } else {
    res.setHeader('Allow', ['GET']);
    res.status(405).json({ error: 'Method not allowed' });
  }
}