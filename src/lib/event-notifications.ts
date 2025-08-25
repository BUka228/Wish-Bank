import { RandomEvent, NotificationData } from '../types/quest-economy';

/**
 * Event Notification System
 * Handles sending notifications for random events
 */
export class EventNotificationSystem {
  
  /**
   * Send notification when a new event is available
   */
  async sendEventAvailableNotification(event: RandomEvent): Promise<void> {
    const notification: NotificationData = {
      type: 'event_available',
      title: 'Новое случайное событие! 🎲',
      message: `У вас появилось новое событие: "${event.title}". Награда: ${event.reward_amount} ${event.reward_type}. Событие истекает через 24 часа.`,
      recipient_id: event.user_id,
      data: {
        reference_id: event.id,
        event_title: event.title,
        reward_amount: event.reward_amount,
        reward_type: event.reward_type,
        experience_reward: event.experience_reward,
        expires_at: event.expires_at.toISOString()
      }
    };

    await this.sendNotification(notification);
  }

  /**
   * Send notification when an event is completed
   */
  async sendEventCompletedNotification(event: RandomEvent, completedBy: string): Promise<void> {
    // Notification to the event owner
    const ownerNotification: NotificationData = {
      type: 'event_completed',
      title: 'Событие выполнено! ✅',
      message: `Ваше событие "${event.title}" было отмечено как выполненное! Награда начислена: ${event.reward_amount} ${event.reward_type} + ${event.experience_reward} опыта.`,
      recipient_id: event.user_id,
      data: {
        sender_id: completedBy,
        reference_id: event.id,
        event_title: event.title,
        reward_amount: event.reward_amount,
        reward_type: event.reward_type,
        experience_reward: event.experience_reward
      }
    };

    // Notification to the partner who completed it
    const partnerNotification: NotificationData = {
      type: 'event_validated',
      title: 'Событие засчитано! 👏',
      message: `Вы засчитали выполнение события "${event.title}" для вашего партнера.`,
      recipient_id: completedBy,
      data: {
        sender_id: event.user_id,
        reference_id: event.id,
        event_title: event.title,
        reward_amount: event.reward_amount,
        reward_type: event.reward_type
      }
    };

    await Promise.all([
      this.sendNotification(ownerNotification),
      this.sendNotification(partnerNotification)
    ]);
  }

  /**
   * Send notification when an event expires
   */
  async sendEventExpiredNotification(event: RandomEvent): Promise<void> {
    const notification: NotificationData = {
      type: 'event_expired',
      title: 'Событие истекло ⏰',
      message: `Событие "${event.title}" истекло и было заменено новым. Проверьте ваши активные события!`,
      recipient_id: event.user_id,
      data: {
        reference_id: event.id,
        event_title: event.title,
        expired_at: new Date().toISOString()
      }
    };

    await this.sendNotification(notification);
  }

  /**
   * Send reminder notification for events expiring soon
   */
  async sendEventReminderNotification(event: RandomEvent, hoursRemaining: number): Promise<void> {
    const notification: NotificationData = {
      type: 'event_reminder',
      title: `Событие истекает через ${hoursRemaining} ч. ⏳`,
      message: `Не забудьте выполнить событие "${event.title}"! Осталось ${hoursRemaining} часов до истечения.`,
      recipient_id: event.user_id,
      data: {
        reference_id: event.id,
        event_title: event.title,
        hours_remaining: hoursRemaining,
        expires_at: event.expires_at.toISOString()
      }
    };

    await this.sendNotification(notification);
  }

  /**
   * Send notification when a new event is generated after completion
   */
  async sendNewEventGeneratedNotification(userId: string, newEvent: RandomEvent): Promise<void> {
    const notification: NotificationData = {
      type: 'new_event_generated',
      title: 'Новое событие сгенерировано! 🎯',
      message: `После выполнения предыдущего события для вас сгенерировано новое: "${newEvent.title}".`,
      recipient_id: userId,
      data: {
        reference_id: newEvent.id,
        event_title: newEvent.title,
        reward_amount: newEvent.reward_amount,
        reward_type: newEvent.reward_type
      }
    };

    await this.sendNotification(notification);
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
        const notification: NotificationData = {
          type: 'system_event',
          title,
          message,
          recipient_id: userId,
          data: data || {}
        };

        await this.sendNotification(notification);
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
    // TODO: Implement database query to get events expiring soon
    // This would need a new database function
    return [];
  }

  /**
   * Send notification through the notification system
   */
  private async sendNotification(notification: NotificationData): Promise<void> {
    try {
      // TODO: Integrate with actual notification service
      // This could be:
      // - Telegram bot notifications
      // - Push notifications
      // - In-app notifications
      // - Email notifications
      
      console.log('Sending event notification:', {
        type: notification.type,
        title: notification.title,
        recipient: notification.recipient_id,
        message: notification.message.substring(0, 100) + '...'
      });
      
      // For now, just log the notification
      // In a real implementation, this would call the notification service
    } catch (error) {
      console.error('Failed to send notification:', error);
      throw error;
    }
  }

  /**
   * Get notification statistics
   */
  async getNotificationStats(): Promise<{
    totalSent: number;
    sentToday: number;
    byType: Record<string, number>;
  }> {
    // TODO: Implement notification statistics from database
    return {
      totalSent: 0,
      sentToday: 0,
      byType: {}
    };
  }
}

// Export singleton instance
export const eventNotificationSystem = new EventNotificationSystem();