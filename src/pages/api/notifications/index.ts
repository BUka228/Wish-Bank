import { NextApiRequest, NextApiResponse } from 'next';
import { sql } from '@/lib/db-pool';
import { validateTelegramWebAppData } from '@/lib/telegram-auth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    // Validate Telegram Web App data
    const telegramData = req.headers.authorization?.replace('Bearer ', '');
    if (!telegramData) {
      return res.status(401).json({ error: 'Authorization required' });
    }

    const user = validateTelegramWebAppData(telegramData, process.env.TELEGRAM_BOT_TOKEN || '');
    if (!user) {
      return res.status(401).json({ error: 'Invalid authorization' });
    }

    if (req.method === 'GET') {
      // Get in-app notifications and legacy notifications
      const inAppNotifications = await getInAppNotifications(user.id);
      const legacyNotifications = await generateLegacyNotifications(user.id);
      
      // Combine and sort by timestamp
      const allNotifications = [...inAppNotifications, ...legacyNotifications]
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

      res.status(200).json({ notifications: allNotifications });
    } else {
      res.setHeader('Allow', ['GET']);
      res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
}

async function getInAppNotifications(userId: string) {
  try {
    const result = await sql`
      SELECT 
        id,
        type,
        title,
        message,
        data,
        read,
        priority,
        created_at as timestamp,
        action_url
      FROM in_app_notifications 
      WHERE user_id = ${userId}
      AND (expires_at IS NULL OR expires_at > NOW())
      ORDER BY created_at DESC 
      LIMIT 50
    `;

    return result.map(notification => ({
      id: notification.id,
      type: notification.type,
      title: notification.title,
      message: notification.message,
      icon: getNotificationIcon(notification.type),
      timestamp: notification.timestamp,
      read: notification.read,
      actionUrl: notification.action_url,
      priority: notification.priority,
      data: notification.data
    }));
  } catch (error) {
    console.error('Error getting in-app notifications:', error);
    return [];
  }
}

async function generateLegacyNotifications(userId: string) {
  const notifications = [];

  try {
    // Check for active quests assigned to user
    const activeQuests = await sql`
      SELECT * FROM quests WHERE assignee_id = ${userId} AND status = 'active' ORDER BY created_at DESC LIMIT 5
    `;

    for (const quest of activeQuests) {
      if (quest.due_date) {
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
    }

    // Check for current random events
    const currentEvent = await sql`
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
    const pendingSharedWishes = await sql`
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
    const user = await sql`SELECT * FROM users WHERE id = ${userId}`;
    if (user.length > 0) {
      const userData = user[0];
      const currentRank = await sql`
        SELECT * FROM ranks WHERE name = ${userData.rank || 'Рядовой'}
      `;
      
      if (currentRank.length > 0) {
        const nextRank = await sql`
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

    return notifications;
  } catch (error) {
    console.error('Error generating legacy notifications:', error);
    return [];
  }
}

function getNotificationIcon(type: string): string {
  const icons: Record<string, string> = {
    'shared_wish_created': '🌟',
    'shared_wish_progress': '📈',
    'shared_wish_completed': '🎉',
    'shared_wish_reminder': '⏰',
    'shared_wish_expired': '⏰',
    'quest': '⚔️',
    'event': '🎲',
    'wish': '⭐',
    'rank': '🏆',
    'economy': '💰'
  };
  return icons[type] || '📢';
}