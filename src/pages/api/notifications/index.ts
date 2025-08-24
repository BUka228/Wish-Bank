import { NextApiRequest, NextApiResponse } from 'next';
import { db } from '@/lib/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    try {
      const { userId } = req.query;

      if (!userId || typeof userId !== 'string') {
        return res.status(400).json({ error: 'User ID is required' });
      }

      // Get notifications from database
      // For now, we'll create mock notifications based on user's current state
      const notifications = await generateNotifications(userId);

      res.status(200).json({ notifications });
    } catch (error) {
      console.error('Error fetching notifications:', error);
      res.status(500).json({ error: 'Failed to fetch notifications' });
    }
  } else {
    res.setHeader('Allow', ['GET']);
    res.status(405).json({ error: 'Method not allowed' });
  }
}

async function generateNotifications(userId: string) {
  const notifications = [];

  try {
    // Check for active quests assigned to user
    const activeQuests = await db.query`
      SELECT * FROM quests WHERE assignee_id = ${userId} AND status = 'active' ORDER BY created_at DESC LIMIT 5
    `;

    for (const quest of activeQuests) {
      const dueDate = new Date(quest.due_date);
      const now = new Date();
      const hoursUntilDue = (dueDate.getTime() - now.getTime()) / (1000 * 60 * 60);

      if (hoursUntilDue <= 24 && hoursUntilDue > 0) {
        notifications.push({
          id: `quest-due-${quest.id}`,
          type: 'quest',
          title: 'Квест скоро истекает',
          message: `"${quest.title}" истекает через ${Math.round(hoursUntilDue)} часов`,
          icon: '⏰',
          timestamp: new Date(),
          read: false,
          actionUrl: `/quests/${quest.id}`
        });
      }
    }

    // Check for current random events
    const currentEvent = await db.query`
      SELECT * FROM random_events WHERE user_id = ${userId} AND status = 'active' ORDER BY created_at DESC LIMIT 1
    `;

    if (currentEvent.length > 0) {
      const event = currentEvent[0];
      notifications.push({
        id: `event-active-${event.id}`,
        type: 'event',
        title: 'Новое случайное событие',
        message: event.title,
        icon: '🎲',
        timestamp: new Date(event.created_at),
        read: false,
        actionUrl: '/events'
      });
    }

    // Check for shared wishes pending approval
    const pendingSharedWishes = await db.query`
      SELECT * FROM wishes WHERE is_shared = true AND shared_approved_by IS NULL AND author_id != ${userId} ORDER BY created_at DESC LIMIT 3
    `;

    for (const wish of pendingSharedWishes) {
      notifications.push({
        id: `shared-wish-${wish.id}`,
        type: 'wish',
        title: 'Общее желание ждет подтверждения',
        message: `"${wish.description.substring(0, 50)}..."`,
        icon: '⭐',
        timestamp: new Date(wish.created_at),
        read: false,
        actionUrl: '/wishes?tab=shared'
      });
    }

    // Check for rank progression
    const user = await db.query`SELECT * FROM users WHERE id = ${userId}`;
    if (user.length > 0) {
      const userData = user[0];
      const currentRank = await db.query`
        SELECT * FROM ranks WHERE name = ${userData.rank || 'Рядовой'}
      `;
      
      if (currentRank.length > 0) {
        const nextRank = await db.query`
          SELECT * FROM ranks WHERE min_experience > ${userData.experience_points || 0} ORDER BY min_experience ASC LIMIT 1
        `;
        
        if (nextRank.length > 0) {
          const expNeeded = nextRank[0].min_experience - (userData.experience_points || 0);
          if (expNeeded <= 50) {
            notifications.push({
              id: `rank-progress-${userId}`,
              type: 'rank',
              title: 'Близко к повышению',
              message: `До звания "${nextRank[0].name}" осталось ${expNeeded} опыта`,
              icon: '🏆',
              timestamp: new Date(),
              read: false,
              actionUrl: '/ranks'
            });
          }
        }
      }
    }

    // Sort by timestamp (newest first)
    notifications.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    return notifications;
  } catch (error) {
    console.error('Error generating notifications:', error);
    return [];
  }
}