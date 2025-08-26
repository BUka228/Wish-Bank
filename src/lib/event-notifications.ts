import { RandomEvent } from '../types/quest-economy';
import { 
  sendEventNotification,
  getUserTelegramChatId,
  sendSystemNotification
} from './telegram';

/**
 * Event Notification System - Telegram Integration
 * Handles sending Telegram notifications for random events
 */
export class EventNotificationSystem {
  
  /**
   * Send notification when a new event is available
   */
  async sendEventAvailableNotification(event: RandomEvent): Promise<void> {
    try {
      const chatId = await getUserTelegramChatId(event.user_id);
      if (!chatId) {
        console.warn(`No Telegram chat ID found for user ${event.user_id}`);
        return;
      }

      await sendEventNotification(
        chatId,
        'available',
        event.title,
        {
          reward_amount: event.reward_amount,
          reward_type: event.reward_type,
          experience_reward: event.experience_reward,
          expires_at: event.expires_at.toISOString()
        }
      );
    } catch (error) {
      console.error('Failed to send event available notification:', error);
      throw error;
    }
  }

  /**
   * Send notification when an event is completed
   */
  async sendEventCompletedNotification(event: RandomEvent, completedBy: string): Promise<void> {
    try {
      // Notification to the event owner
      const ownerChatId = await getUserTelegramChatId(event.user_id);
      if (ownerChatId) {
        await sendEventNotification(
          ownerChatId,
          'completed',
          event.title,
          {
            reward_amount: event.reward_amount,
            reward_type: event.reward_type,
            experience_reward: event.experience_reward,
            completed_by: completedBy
          }
        );
      }

      // Notification to the partner who completed it
      const partnerChatId = await getUserTelegramChatId(completedBy);
      if (partnerChatId) {
        await sendSystemNotification(
          partnerChatId,
          'Событие засчитано! 👏',
          `Вы засчитали выполнение события "${event.title}" для вашего партнера.`,
          'normal'
        );
      }
    } catch (error) {
      console.error('Failed to send event completed notifications:', error);
      throw error;
    }
  }

  /**
   * Send notification when an event expires
   */
  async sendEventExpiredNotification(event: RandomEvent): Promise<void> {
    try {
      const chatId = await getUserTelegramChatId(event.user_id);
      if (!chatId) {
        console.warn(`No Telegram chat ID found for user ${event.user_id}`);
        return;
      }

      await sendEventNotification(
        chatId,
        'expired',
        event.title,
        {
          expired_at: new Date().toISOString()
        }
      );
    } catch (error) {
      console.error('Failed to send event expired notification:', error);
      throw error;
    }
  }

  /**
   * Send reminder notification for events expiring soon
   */
  async sendEventReminderNotification(event: RandomEvent, hoursRemaining: number): Promise<void> {
    try {
      const chatId = await getUserTelegramChatId(event.user_id);
      if (!chatId) {
        console.warn(`No Telegram chat ID found for user ${event.user_id}`);
        return;
      }

      await sendEventNotification(
        chatId,
        'reminder',
        event.title,
        {
          hours_remaining: hoursRemaining,
          expires_at: event.expires_at.toISOString()
        }
      );
    } catch (error) {
      console.error('Failed to send event reminder notification:', error);
      throw error;
    }
  }

  /**
   * Send notification when a new event is generated after completion
   */
  async sendNewEventGeneratedNotification(userId: string, newEvent: RandomEvent): Promise<void> {
    try {
      const chatId = await getUserTelegramChatId(userId);
      if (!chatId) {
        console.warn(`No Telegram chat ID found for user ${userId}`);
        return;
      }

      await sendSystemNotification(
        chatId,
        'Новое событие сгенерировано! 🎯',
        `После выполнения предыдущего события для вас сгенерировано новое: "${newEvent.title}".`,
        'normal'
      );
    } catch (error) {
      console.error('Failed to send new event generated notification:', error);
      throw error;
    }
  }

  /**
   * Send bulk notifications for system events
   */
  async sendSystemEventNotifications(
    userIds: string[],
    title: string,
    message: string,
    data?: any
  ): Promise<{ sent: number; failed: number }> {
    let sent = 0;
    let failed = 0;

    for (const userId of userIds) {
      try {
        const chatId = await getUserTelegramChatId(userId);
        if (!chatId) {
          console.warn(`No Telegram chat ID found for user ${userId}`);
          failed++;
          continue;
        }

        await sendSystemNotification(chatId, title, message, 'normal');
        sent++;
      } catch (error) {
        console.error(`Failed to send system notification to user ${userId}:`, error);
        failed++;
      }
    }

    return { sent, failed };
  }

  /**
   * Check for events that need reminder notifications
   */
  async checkAndSendEventReminders(): Promise<number> {
    try {
      // Get events that expire within 2 hours and haven't been reminded yet
      const upcomingEvents = await this.getEventsNeedingReminders();
      
      let remindersSent = 0;
      
      for (const event of upcomingEvents) {
        const hoursRemaining = Math.ceil(
          (event.expires_at.getTime() - new Date().getTime()) / (1000 * 60 * 60)
        );
        
        if (hoursRemaining <= 2 && hoursRemaining > 0) {
          await this.sendEventReminderNotification(event, hoursRemaining);
          remindersSent++;
        }
      }
      
      return remindersSent;
    } catch (error) {
      console.error('Error checking event reminders:', error);
      return 0;
    }
  }

  /**
   * Get events that need reminder notifications
   */
  private async getEventsNeedingReminders(): Promise<RandomEvent[]> {
    try {
      const { sql } = await import('./db-pool');
      const twoHoursFromNow = new Date(Date.now() + 2 * 60 * 60 * 1000);
      
      const result = await sql`
        SELECT 
          id,
          user_id,
          title,
          description,
          reward_amount,
          reward_type,
          experience_reward,
          expires_at,
          status,
          created_at
        FROM random_events 
        WHERE 
          status = 'active'
          AND expires_at <= ${twoHoursFromNow}
          AND expires_at > NOW()
          AND last_reminder_sent < (NOW() - INTERVAL '1 hour')
      `;
      
      return result as RandomEvent[];
    } catch (error) {
      console.error('Error getting events needing reminders:', error);
      return [];
    }
  }
}

// Export an instance for use throughout the application
export const eventNotifications = new EventNotificationSystem();