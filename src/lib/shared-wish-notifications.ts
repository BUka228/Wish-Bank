/**
 * Shared Wish Notification System - Telegram Integration
 * Handles Telegram notifications for shared wishes
 */

import { sql } from './db-pool';
import { 
  sendSharedWishNotification,
  getUserTelegramChatId,
  sendSystemNotification
} from './telegram';

export interface SharedWishNotificationData {
  type: 'shared_wish_created' | 'shared_wish_progress' | 'shared_wish_completed' | 'shared_wish_expired' | 'shared_wish_reminder';
  title: string;
  message: string;
  recipient_id: string;
  shared_wish_id: string;
  data?: Record<string, any>;
  priority?: 'low' | 'normal' | 'high' | 'urgent';
  expires_at?: Date;
}

/**
 * Shared Wish Notification System Class - Telegram Only
 */
export class SharedWishNotificationSystem {
  
  /**
   * Send notification when a new shared wish is created
   */
  async sendSharedWishCreatedNotification(
    sharedWishId: string,
    wishDescription: string,
    isGlobal: boolean,
    targetUsers: string[] = [],
    collectiveReward: number = 0,
    expiresAt?: Date
  ): Promise<{ sent: number; failed: number }> {
    try {
      // Get target users
      const recipients = isGlobal 
        ? await this.getAllActiveUsers()
        : await this.getUsersByIds(targetUsers);

      let sent = 0;
      let failed = 0;

      for (const user of recipients) {
        try {
          const chatId = await getUserTelegramChatId(user.id);
          if (!chatId) {
            console.warn(`No Telegram chat ID found for user ${user.id}`);
            failed++;
            continue;
          }

          await sendSharedWishNotification(
            chatId,
            'created',
            wishDescription,
            {
              collective_reward: collectiveReward,
              is_global: isGlobal,
              expires_at: expiresAt?.toISOString()
            }
          );
          
          sent++;
        } catch (error) {
          console.error(`Failed to send shared wish notification to user ${user.id}:`, error);
          failed++;
        }
      }

      return { sent, failed };
    } catch (error) {
      console.error('Error sending shared wish created notifications:', error);
      return { sent: 0, failed: 1 };
    }
  }

  /**
   * Send notification about shared wish progress
   */
  async sendSharedWishProgressNotification(
    sharedWishId: string,
    wishDescription: string,
    progress: number,
    participantName: string,
    targetUsers: string[]
  ): Promise<{ sent: number; failed: number }> {
    try {
      const recipients = await this.getUsersByIds(targetUsers);
      let sent = 0;
      let failed = 0;

      for (const user of recipients) {
        try {
          const chatId = await getUserTelegramChatId(user.id);
          if (!chatId) {
            console.warn(`No Telegram chat ID found for user ${user.id}`);
            failed++;
            continue;
          }

          await sendSharedWishNotification(
            chatId,
            'progress',
            wishDescription,
            {
              progress,
              participant_name: participantName
            }
          );
          
          sent++;
        } catch (error) {
          console.error(`Failed to send progress notification to user ${user.id}:`, error);
          failed++;
        }
      }

      return { sent, failed };
    } catch (error) {
      console.error('Error sending shared wish progress notifications:', error);
      return { sent: 0, failed: 1 };
    }
  }

  /**
   * Send notification when shared wish is completed
   */
  async sendSharedWishCompletedNotification(
    sharedWishId: string,
    wishDescription: string,
    targetUsers: string[],
    collectiveReward: number = 0
  ): Promise<{ sent: number; failed: number }> {
    try {
      const recipients = await this.getUsersByIds(targetUsers);
      let sent = 0;
      let failed = 0;

      for (const user of recipients) {
        try {
          const chatId = await getUserTelegramChatId(user.id);
          if (!chatId) {
            console.warn(`No Telegram chat ID found for user ${user.id}`);
            failed++;
            continue;
          }

          await sendSharedWishNotification(
            chatId,
            'completed',
            wishDescription,
            {
              collective_reward: collectiveReward,
              completed_at: new Date().toISOString()
            }
          );
          
          sent++;
        } catch (error) {
          console.error(`Failed to send completion notification to user ${user.id}:`, error);
          failed++;
        }
      }

      return { sent, failed };
    } catch (error) {
      console.error('Error sending shared wish completion notifications:', error);
      return { sent: 0, failed: 1 };
    }
  }

  /**
   * Send reminder notification for expiring shared wishes
   */
  async sendSharedWishReminderNotification(
    sharedWishId: string,
    wishDescription: string,
    targetUsers: string[],
    hoursRemaining: number
  ): Promise<{ sent: number; failed: number }> {
    try {
      const recipients = await this.getUsersByIds(targetUsers);
      let sent = 0;
      let failed = 0;

      for (const user of recipients) {
        try {
          const chatId = await getUserTelegramChatId(user.id);
          if (!chatId) {
            console.warn(`No Telegram chat ID found for user ${user.id}`);
            failed++;
            continue;
          }

          await sendSharedWishNotification(
            chatId,
            'reminder',
            wishDescription,
            {
              hours_remaining: hoursRemaining
            }
          );
          
          sent++;
        } catch (error) {
          console.error(`Failed to send reminder notification to user ${user.id}:`, error);
          failed++;
        }
      }

      return { sent, failed };
    } catch (error) {
      console.error('Error sending shared wish reminder notifications:', error);
      return { sent: 0, failed: 1 };
    }
  }

  /**
   * Send notification when shared wish expires
   */
  async sendSharedWishExpiredNotification(
    sharedWishId: string,
    wishDescription: string,
    targetUsers: string[]
  ): Promise<{ sent: number; failed: number }> {
    try {
      const recipients = await this.getUsersByIds(targetUsers);
      let sent = 0;
      let failed = 0;

      for (const user of recipients) {
        try {
          const chatId = await getUserTelegramChatId(user.id);
          if (!chatId) {
            console.warn(`No Telegram chat ID found for user ${user.id}`);
            failed++;
            continue;
          }

          await sendSharedWishNotification(
            chatId,
            'expired',
            wishDescription,
            {
              expired_at: new Date().toISOString()
            }
          );
          
          sent++;
        } catch (error) {
          console.error(`Failed to send expiration notification to user ${user.id}:`, error);
          failed++;
        }
      }

      return { sent, failed };
    } catch (error) {
      console.error('Error sending shared wish expiration notifications:', error);
      return { sent: 0, failed: 1 };
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
   * Check for shared wishes that need reminder notifications
   */
  async checkAndSendSharedWishReminders(): Promise<number> {
    try {
      // Get shared wishes that expire within 2 hours and haven't been reminded recently
      const upcomingWishes = await this.getSharedWishesNeedingReminders();
      
      let remindersSent = 0;
      
      for (const wish of upcomingWishes) {
        const hoursRemaining = Math.ceil(
          (wish.expires_at.getTime() - new Date().getTime()) / (1000 * 60 * 60)
        );
        
        if (hoursRemaining <= 2 && hoursRemaining > 0) {
          const result = await this.sendSharedWishReminderNotification(
            wish.id,
            wish.description,
            wish.target_user_ids,
            hoursRemaining
          );
          remindersSent += result.sent;
        }
      }
      
      return remindersSent;
    } catch (error) {
      console.error('Error checking shared wish reminders:', error);
      return 0;
    }
  }

  /**
   * Get shared wishes that need reminder notifications
   */
  private async getSharedWishesNeedingReminders(): Promise<any[]> {
    try {
      const twoHoursFromNow = new Date(Date.now() + 2 * 60 * 60 * 1000);
      
      const result = await sql`
        SELECT 
          id,
          description,
          target_user_ids,
          expires_at
        FROM shared_wishes 
        WHERE 
          status = 'active'
          AND expires_at <= ${twoHoursFromNow}
          AND expires_at > NOW()
          AND last_reminder_sent < (NOW() - INTERVAL '1 hour')
      `;
      
      return result;
    } catch (error) {
      console.error('Error getting shared wishes needing reminders:', error);
      return [];
    }
  }

  /**
   * Get all active users from the database
   */
  private async getAllActiveUsers(): Promise<{ id: string; name: string }[]> {
    try {
      const result = await sql`
        SELECT id, name 
        FROM users 
        WHERE 
          is_active = true 
          AND telegram_id IS NOT NULL
        ORDER BY created_at DESC
      `;
      
      return result as { id: string; name: string; }[];
    } catch (error) {
      console.error('Error getting active users:', error);
      return [];
    }
  }

  /**
   * Get users by their IDs
   */
  private async getUsersByIds(userIds: string[]): Promise<{ id: string; name: string }[]> {
    try {
      if (userIds.length === 0) {
        return [];
      }
      
      const result = await sql`
        SELECT id, name 
        FROM users 
        WHERE 
          id = ANY(${userIds})
          AND telegram_id IS NOT NULL
      `;
      
      return result as { id: string; name: string; }[];
    } catch (error) {
      console.error('Error getting users by IDs:', error);
      return [];
    }
  }
}

// Export an instance for use throughout the application
export const sharedWishNotifications = new SharedWishNotificationSystem();