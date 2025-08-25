/**
 * Shared Wish Notification System
 * Handles push notifications and in-app notifications for shared wishes
 */

import { sql } from './db-pool';
import { NotificationData } from '../types/quest-economy';

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

export interface NotificationSettings {
  user_id: string;
  push_notifications: boolean;
  in_app_notifications: boolean;
  shared_wish_notifications: boolean;
  progress_notifications: boolean;
  reminder_notifications: boolean;
  email_notifications: boolean;
  notification_frequency: 'immediate' | 'hourly' | 'daily';
  quiet_hours_start?: string; // HH:MM format
  quiet_hours_end?: string; // HH:MM format
}

export interface InAppNotification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  message: string;
  data: Record<string, any>;
  read: boolean;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  created_at: Date;
  expires_at?: Date;
  action_url?: string;
}

/**
 * Shared Wish Notification System Class
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
          // Check user notification settings
          const settings = await this.getUserNotificationSettings(user.id);
          if (!settings.shared_wish_notifications) {
            continue;
          }

          const notification: SharedWishNotificationData = {
            type: 'shared_wish_created',
            title: '🌟 Новое общее желание!',
            message: `Создано новое общее желание: "${wishDescription.substring(0, 100)}${wishDescription.length > 100 ? '...' : ''}"${collectiveReward > 0 ? ` Награда: ${collectiveReward} маны` : ''}`,
            recipient_id: user.id,
            shared_wish_id: sharedWishId,
            priority: 'normal',
            expires_at: expiresAt,
            data: {
              shared_wish_id: sharedWishId,
              wish_description: wishDescription,
              is_global: isGlobal,
              collective_reward: collectiveReward,
              expires_at: expiresAt?.toISOString()
            }
          };

          await this.sendNotification(notification, settings);
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
          const settings = await this.getUserNotificationSettings(user.id);
          if (!settings.progress_notifications) {
            continue;
          }

          const notification: SharedWishNotificationData = {
            type: 'shared_wish_progress',
            title: '📈 Прогресс общего желания',
            message: `${participantName} внес вклад в общее желание "${wishDescription.substring(0, 80)}...". Прогресс: ${progress}%`,
            recipient_id: user.id,
            shared_wish_id: sharedWishId,
            priority: 'low',
            data: {
              shared_wish_id: sharedWishId,
              progress,
              participant_name: participantName,
              wish_description: wishDescription
            }
          };

          await this.sendNotification(notification, settings);
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
          const settings = await this.getUserNotificationSettings(user.id);
          if (!settings.shared_wish_notifications) {
            continue;
          }

          const notification: SharedWishNotificationData = {
            type: 'shared_wish_completed',
            title: '🎉 Общее желание выполнено!',
            message: `Общее желание "${wishDescription.substring(0, 80)}..." успешно выполнено!${collectiveReward > 0 ? ` Вы получили ${collectiveReward} маны!` : ''}`,
            recipient_id: user.id,
            shared_wish_id: sharedWishId,
            priority: 'high',
            data: {
              shared_wish_id: sharedWishId,
              wish_description: wishDescription,
              collective_reward: collectiveReward,
              completed_at: new Date().toISOString()
            }
          };

          await this.sendNotification(notification, settings);
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
          const settings = await this.getUserNotificationSettings(user.id);
          if (!settings.reminder_notifications) {
            continue;
          }

          const notification: SharedWishNotificationData = {
            type: 'shared_wish_reminder',
            title: `⏰ Общее желание истекает через ${hoursRemaining}ч`,
            message: `Не забудьте поучаствовать в общем желании "${wishDescription.substring(0, 80)}...". Осталось ${hoursRemaining} часов!`,
            recipient_id: user.id,
            shared_wish_id: sharedWishId,
            priority: 'normal',
            data: {
              shared_wish_id: sharedWishId,
              wish_description: wishDescription,
              hours_remaining: hoursRemaining
            }
          };

          await this.sendNotification(notification, settings);
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
          const settings = await this.getUserNotificationSettings(user.id);
          if (!settings.shared_wish_notifications) {
            continue;
          }

          const notification: SharedWishNotificationData = {
            type: 'shared_wish_expired',
            title: '⏰ Общее желание истекло',
            message: `Общее желание "${wishDescription.substring(0, 80)}..." истекло и больше недоступно для участия.`,
            recipient_id: user.id,
            shared_wish_id: sharedWishId,
            priority: 'low',
            data: {
              shared_wish_id: sharedWishId,
              wish_description: wishDescription,
              expired_at: new Date().toISOString()
            }
          };

          await this.sendNotification(notification, settings);
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
   * Send notification through multiple channels
   */
  private async sendNotification(
    notification: SharedWishNotificationData,
    settings: NotificationSettings
  ): Promise<void> {
    try {
      // Check quiet hours
      if (this.isQuietHours(settings)) {
        // Store notification for later delivery
        await this.storeDelayedNotification(notification, settings);
        return;
      }

      // Send in-app notification
      if (settings.in_app_notifications) {
        await this.sendInAppNotification(notification);
      }

      // Send push notification
      if (settings.push_notifications) {
        await this.sendPushNotification(notification);
      }

      // Send email notification (if enabled and appropriate)
      if (settings.email_notifications && notification.priority === 'high') {
        await this.sendEmailNotification(notification);
      }

    } catch (error) {
      console.error('Failed to send notification:', error);
      throw error;
    }
  }

  /**
   * Send in-app notification
   */
  private async sendInAppNotification(notification: SharedWishNotificationData): Promise<void> {
    try {
      await sql`
        INSERT INTO in_app_notifications (
          user_id,
          type,
          title,
          message,
          data,
          priority,
          expires_at,
          action_url
        ) VALUES (
          ${notification.recipient_id},
          ${notification.type},
          ${notification.title},
          ${notification.message},
          ${JSON.stringify(notification.data || {})},
          ${notification.priority || 'normal'},
          ${notification.expires_at || null},
          ${`/wishes?tab=shared&highlight=${notification.shared_wish_id}`}
        )
      `;
    } catch (error) {
      console.error('Failed to store in-app notification:', error);
      throw error;
    }
  }

  /**
   * Send push notification (placeholder for actual push service integration)
   */
  private async sendPushNotification(notification: SharedWishNotificationData): Promise<void> {
    try {
      // TODO: Integrate with actual push notification service
      // This could be Firebase Cloud Messaging, Apple Push Notification Service, etc.
      
      console.log('Push notification would be sent:', {
        recipient: notification.recipient_id,
        title: notification.title,
        message: notification.message,
        data: notification.data
      });

      // For now, just log the notification
      // In a real implementation, this would call the push service API
      
    } catch (error) {
      console.error('Failed to send push notification:', error);
      throw error;
    }
  }

  /**
   * Send email notification (placeholder)
   */
  private async sendEmailNotification(notification: SharedWishNotificationData): Promise<void> {
    try {
      // TODO: Integrate with email service
      console.log('Email notification would be sent:', {
        recipient: notification.recipient_id,
        subject: notification.title,
        body: notification.message
      });
    } catch (error) {
      console.error('Failed to send email notification:', error);
      throw error;
    }
  }

  /**
   * Get user notification settings
   */
  private async getUserNotificationSettings(userId: string): Promise<NotificationSettings> {
    try {
      const result = await sql`
        SELECT * FROM user_notification_settings WHERE user_id = ${userId}
      `;

      if (result.length > 0) {
        return result[0] as NotificationSettings;
      }

      // Return default settings if none exist
      return {
        user_id: userId,
        push_notifications: true,
        in_app_notifications: true,
        shared_wish_notifications: true,
        progress_notifications: true,
        reminder_notifications: true,
        email_notifications: false,
        notification_frequency: 'immediate'
      };
    } catch (error) {
      console.error('Failed to get user notification settings:', error);
      // Return default settings on error
      return {
        user_id: userId,
        push_notifications: true,
        in_app_notifications: true,
        shared_wish_notifications: true,
        progress_notifications: true,
        reminder_notifications: true,
        email_notifications: false,
        notification_frequency: 'immediate'
      };
    }
  }

  /**
   * Get all active users
   */
  private async getAllActiveUsers(): Promise<Array<{ id: string; name: string; telegram_id: string }>> {
    try {
      const result = await sql`
        SELECT id, name, telegram_id 
        FROM users 
        WHERE created_at > NOW() - INTERVAL '30 days'
        ORDER BY name
      `;
      return result.map((row: any) => ({
        id: row.id,
        name: row.name,
        telegram_id: row.telegram_id
      }));
    } catch (error) {
      console.error('Failed to get active users:', error);
      return [];
    }
  }

  /**
   * Get users by IDs
   */
  private async getUsersByIds(userIds: string[]): Promise<Array<{ id: string; name: string; telegram_id: string }>> {
    try {
      if (userIds.length === 0) {
        return [];
      }

      const result = await sql`
        SELECT id, name, telegram_id 
        FROM users 
        WHERE id = ANY(${userIds})
        ORDER BY name
      `;
      return result.map((row: any) => ({
        id: row.id,
        name: row.name,
        telegram_id: row.telegram_id
      }));
    } catch (error) {
      console.error('Failed to get users by IDs:', error);
      return [];
    }
  }

  /**
   * Check if current time is within quiet hours
   */
  private isQuietHours(settings: NotificationSettings): boolean {
    if (!settings.quiet_hours_start || !settings.quiet_hours_end) {
      return false;
    }

    const now = new Date();
    const currentTime = now.getHours() * 60 + now.getMinutes();
    
    const [startHour, startMin] = settings.quiet_hours_start.split(':').map(Number);
    const [endHour, endMin] = settings.quiet_hours_end.split(':').map(Number);
    
    const startTime = startHour * 60 + startMin;
    const endTime = endHour * 60 + endMin;

    if (startTime <= endTime) {
      return currentTime >= startTime && currentTime <= endTime;
    } else {
      // Quiet hours span midnight
      return currentTime >= startTime || currentTime <= endTime;
    }
  }

  /**
   * Store notification for delayed delivery
   */
  private async storeDelayedNotification(
    notification: SharedWishNotificationData,
    settings: NotificationSettings
  ): Promise<void> {
    try {
      // Calculate delivery time (after quiet hours end)
      const deliveryTime = this.calculateDeliveryTime(settings);

      await sql`
        INSERT INTO delayed_notifications (
          user_id,
          type,
          title,
          message,
          data,
          priority,
          scheduled_for,
          notification_channels
        ) VALUES (
          ${notification.recipient_id},
          ${notification.type},
          ${notification.title},
          ${notification.message},
          ${JSON.stringify(notification.data || {})},
          ${notification.priority || 'normal'},
          ${deliveryTime},
          ${JSON.stringify({
            in_app: settings.in_app_notifications,
            push: settings.push_notifications,
            email: settings.email_notifications
          })}
        )
      `;
    } catch (error) {
      console.error('Failed to store delayed notification:', error);
      throw error;
    }
  }

  /**
   * Calculate delivery time after quiet hours
   */
  private calculateDeliveryTime(settings: NotificationSettings): Date {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (!settings.quiet_hours_end) {
      return now;
    }

    const [endHour, endMin] = settings.quiet_hours_end.split(':').map(Number);
    
    const deliveryTime = new Date(now);
    deliveryTime.setHours(endHour, endMin, 0, 0);

    // If end time has passed today, schedule for tomorrow
    if (deliveryTime <= now) {
      deliveryTime.setDate(deliveryTime.getDate() + 1);
    }

    return deliveryTime;
  }

  /**
   * Process delayed notifications
   */
  async processDelayedNotifications(): Promise<number> {
    try {
      const now = new Date();
      const delayedNotifications = await sql`
        SELECT * FROM delayed_notifications 
        WHERE scheduled_for <= ${now} AND processed = false
        ORDER BY scheduled_for ASC
        LIMIT 100
      `;

      let processed = 0;

      for (const delayed of delayedNotifications) {
        try {
          const channels = JSON.parse(delayed.notification_channels);
          
          if (channels.in_app) {
            await this.sendInAppNotification({
              type: delayed.type,
              title: delayed.title,
              message: delayed.message,
              recipient_id: delayed.user_id,
              shared_wish_id: JSON.parse(delayed.data).shared_wish_id,
              data: JSON.parse(delayed.data),
              priority: delayed.priority
            });
          }

          if (channels.push) {
            await this.sendPushNotification({
              type: delayed.type,
              title: delayed.title,
              message: delayed.message,
              recipient_id: delayed.user_id,
              shared_wish_id: JSON.parse(delayed.data).shared_wish_id,
              data: JSON.parse(delayed.data),
              priority: delayed.priority
            });
          }

          // Mark as processed
          await sql`
            UPDATE delayed_notifications 
            SET processed = true, processed_at = NOW()
            WHERE id = ${delayed.id}
          `;

          processed++;
        } catch (error) {
          console.error(`Failed to process delayed notification ${delayed.id}:`, error);
          
          // Mark as failed
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          await sql`
            UPDATE delayed_notifications 
            SET processed = true, failed = true, error_message = ${errorMessage}
            WHERE id = ${delayed.id}
          `;
        }
      }

      return processed;
    } catch (error) {
      console.error('Error processing delayed notifications:', error);
      return 0;
    }
  }

  /**
   * Check for shared wishes that need reminder notifications
   */
  async checkAndSendReminders(): Promise<number> {
    try {
      // Get shared wishes expiring in 24 hours that haven't been reminded yet
      const expiringWishes = await sql`
        SELECT 
          sw.id,
          sw.wish_id,
          w.description,
          sw.target_users,
          sw.is_global,
          sw.expires_at,
          EXTRACT(EPOCH FROM (sw.expires_at - NOW())) / 3600 as hours_remaining
        FROM shared_wishes sw
        LEFT JOIN wishes w ON sw.wish_id = w.id
        WHERE sw.expires_at IS NOT NULL
        AND sw.expires_at > NOW()
        AND sw.expires_at <= NOW() + INTERVAL '24 hours'
        AND sw.completion_progress < 100
        AND NOT EXISTS (
          SELECT 1 FROM in_app_notifications ian
          WHERE ian.data->>'shared_wish_id' = sw.id::text
          AND ian.type = 'shared_wish_reminder'
          AND ian.created_at > NOW() - INTERVAL '24 hours'
        )
      `;

      let remindersSent = 0;

      for (const wish of expiringWishes) {
        try {
          const hoursRemaining = Math.ceil(wish.hours_remaining);
          const targetUsers = wish.is_global 
            ? (await this.getAllActiveUsers()).map(u => u.id)
            : wish.target_users;

          const result = await this.sendSharedWishReminderNotification(
            wish.id,
            wish.description,
            targetUsers,
            hoursRemaining
          );

          remindersSent += result.sent;
        } catch (error) {
          console.error(`Failed to send reminder for shared wish ${wish.id}:`, error);
        }
      }

      return remindersSent;
    } catch (error) {
      console.error('Error checking and sending reminders:', error);
      return 0;
    }
  }

  /**
   * Get notification statistics
   */
  async getNotificationStats(): Promise<{
    totalSent: number;
    sentToday: number;
    byType: Record<string, number>;
    failureRate: number;
  }> {
    try {
      const totalSent = await sql`
        SELECT COUNT(*) as count FROM in_app_notifications
      `;

      const sentToday = await sql`
        SELECT COUNT(*) as count FROM in_app_notifications
        WHERE created_at >= CURRENT_DATE
      `;

      const byType = await sql`
        SELECT type, COUNT(*) as count 
        FROM in_app_notifications 
        GROUP BY type
      `;

      const failed = await sql`
        SELECT COUNT(*) as count FROM delayed_notifications
        WHERE failed = true
      `;

      const total = await sql`
        SELECT COUNT(*) as count FROM delayed_notifications
      `;

      const failureRate = total[0].count > 0 
        ? (failed[0].count / total[0].count) * 100 
        : 0;

      return {
        totalSent: totalSent[0].count,
        sentToday: sentToday[0].count,
        byType: byType.reduce((acc, row) => {
          acc[row.type] = row.count;
          return acc;
        }, {}),
        failureRate: Math.round(failureRate * 100) / 100
      };
    } catch (error) {
      console.error('Error getting notification stats:', error);
      return {
        totalSent: 0,
        sentToday: 0,
        byType: {},
        failureRate: 0
      };
    }
  }
}

// Export singleton instance
export const sharedWishNotificationSystem = new SharedWishNotificationSystem();