import { NextApiRequest, NextApiResponse } from 'next';
import { sql } from '@/lib/db-pool';
import { validateTelegramWebAppData } from '@/lib/telegram-auth';

interface NotificationSettings {
  user_id: string;
  push_notifications: boolean;
  in_app_notifications: boolean;
  shared_wish_notifications: boolean;
  progress_notifications: boolean;
  reminder_notifications: boolean;
  email_notifications: boolean;
  notification_frequency: 'immediate' | 'hourly' | 'daily';
  quiet_hours_start?: string;
  quiet_hours_end?: string;
}

interface UpdateSettingsRequest {
  push_notifications?: boolean;
  in_app_notifications?: boolean;
  shared_wish_notifications?: boolean;
  progress_notifications?: boolean;
  reminder_notifications?: boolean;
  email_notifications?: boolean;
  notification_frequency?: 'immediate' | 'hourly' | 'daily';
  quiet_hours_start?: string;
  quiet_hours_end?: string;
}

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
      // Get user notification settings
      const settings = await getUserNotificationSettings(user.id);
      return res.status(200).json({ settings });
    }

    if (req.method === 'PUT') {
      // Update user notification settings
      const updates: UpdateSettingsRequest = req.body;
      
      // Validate updates
      const validationError = validateSettingsUpdate(updates);
      if (validationError) {
        return res.status(400).json({ error: validationError });
      }

      const updatedSettings = await updateUserNotificationSettings(user.id, updates);
      return res.status(200).json({ 
        success: true, 
        settings: updatedSettings,
        message: 'Настройки уведомлений обновлены'
      });
    }

    res.setHeader('Allow', ['GET', 'PUT']);
    return res.status(405).json({ error: 'Method not allowed' });

  } catch (error) {
    console.error('Error in notification settings API:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

async function getUserNotificationSettings(userId: string): Promise<NotificationSettings> {
  try {
    const result = await sql`
      SELECT * FROM user_notification_settings WHERE user_id = ${userId}
    `;

    if (result.length > 0) {
      return result[0] as NotificationSettings;
    }

    // Create default settings if none exist
    const defaultSettings: NotificationSettings = {
      user_id: userId,
      push_notifications: true,
      in_app_notifications: true,
      shared_wish_notifications: true,
      progress_notifications: true,
      reminder_notifications: true,
      email_notifications: false,
      notification_frequency: 'immediate'
    };

    await sql`
      INSERT INTO user_notification_settings (
        user_id,
        push_notifications,
        in_app_notifications,
        shared_wish_notifications,
        progress_notifications,
        reminder_notifications,
        email_notifications,
        notification_frequency
      ) VALUES (
        ${userId},
        ${defaultSettings.push_notifications},
        ${defaultSettings.in_app_notifications},
        ${defaultSettings.shared_wish_notifications},
        ${defaultSettings.progress_notifications},
        ${defaultSettings.reminder_notifications},
        ${defaultSettings.email_notifications},
        ${defaultSettings.notification_frequency}
      )
    `;

    return defaultSettings;
  } catch (error) {
    console.error('Error getting user notification settings:', error);
    throw error;
  }
}

async function updateUserNotificationSettings(
  userId: string, 
  updates: UpdateSettingsRequest
): Promise<NotificationSettings> {
  try {
    // Build update object
    const updateFields: any = {};
    
    if (updates.push_notifications !== undefined) {
      updateFields.push_notifications = updates.push_notifications;
    }
    if (updates.in_app_notifications !== undefined) {
      updateFields.in_app_notifications = updates.in_app_notifications;
    }
    if (updates.shared_wish_notifications !== undefined) {
      updateFields.shared_wish_notifications = updates.shared_wish_notifications;
    }
    if (updates.progress_notifications !== undefined) {
      updateFields.progress_notifications = updates.progress_notifications;
    }
    if (updates.reminder_notifications !== undefined) {
      updateFields.reminder_notifications = updates.reminder_notifications;
    }
    if (updates.email_notifications !== undefined) {
      updateFields.email_notifications = updates.email_notifications;
    }
    if (updates.notification_frequency !== undefined) {
      updateFields.notification_frequency = updates.notification_frequency;
    }
    if (updates.quiet_hours_start !== undefined) {
      updateFields.quiet_hours_start = updates.quiet_hours_start || null;
    }
    if (updates.quiet_hours_end !== undefined) {
      updateFields.quiet_hours_end = updates.quiet_hours_end || null;
    }

    if (Object.keys(updateFields).length === 0) {
      // No updates to make, return current settings
      return await getUserNotificationSettings(userId);
    }

    // Add updated_at
    updateFields.updated_at = new Date();

    // Perform update using individual field updates
    let result;
    if (updates.push_notifications !== undefined) {
      result = await sql`
        UPDATE user_notification_settings 
        SET 
          push_notifications = ${updateFields.push_notifications || false},
          in_app_notifications = ${updateFields.in_app_notifications !== undefined ? updateFields.in_app_notifications : true},
          shared_wish_notifications = ${updateFields.shared_wish_notifications !== undefined ? updateFields.shared_wish_notifications : true},
          progress_notifications = ${updateFields.progress_notifications !== undefined ? updateFields.progress_notifications : true},
          reminder_notifications = ${updateFields.reminder_notifications !== undefined ? updateFields.reminder_notifications : true},
          email_notifications = ${updateFields.email_notifications !== undefined ? updateFields.email_notifications : false},
          notification_frequency = ${updateFields.notification_frequency || 'immediate'},
          quiet_hours_start = ${updateFields.quiet_hours_start},
          quiet_hours_end = ${updateFields.quiet_hours_end},
          updated_at = NOW()
        WHERE user_id = ${userId}
        RETURNING *
      `;
    } else {
      // Get current settings and update only changed fields
      const current = await getUserNotificationSettings(userId);
      result = await sql`
        UPDATE user_notification_settings 
        SET 
          push_notifications = ${updateFields.push_notifications !== undefined ? updateFields.push_notifications : current.push_notifications},
          in_app_notifications = ${updateFields.in_app_notifications !== undefined ? updateFields.in_app_notifications : current.in_app_notifications},
          shared_wish_notifications = ${updateFields.shared_wish_notifications !== undefined ? updateFields.shared_wish_notifications : current.shared_wish_notifications},
          progress_notifications = ${updateFields.progress_notifications !== undefined ? updateFields.progress_notifications : current.progress_notifications},
          reminder_notifications = ${updateFields.reminder_notifications !== undefined ? updateFields.reminder_notifications : current.reminder_notifications},
          email_notifications = ${updateFields.email_notifications !== undefined ? updateFields.email_notifications : current.email_notifications},
          notification_frequency = ${updateFields.notification_frequency || current.notification_frequency},
          quiet_hours_start = ${updateFields.quiet_hours_start !== undefined ? updateFields.quiet_hours_start : current.quiet_hours_start},
          quiet_hours_end = ${updateFields.quiet_hours_end !== undefined ? updateFields.quiet_hours_end : current.quiet_hours_end},
          updated_at = NOW()
        WHERE user_id = ${userId}
        RETURNING *
      `;
    }
    
    if (result.length === 0) {
      throw new Error('Failed to update notification settings');
    }

    return result[0] as NotificationSettings;
  } catch (error) {
    console.error('Error updating user notification settings:', error);
    throw error;
  }
}

function validateSettingsUpdate(updates: UpdateSettingsRequest): string | null {
  // Validate notification frequency
  if (updates.notification_frequency && 
      !['immediate', 'hourly', 'daily'].includes(updates.notification_frequency)) {
    return 'Invalid notification frequency';
  }

  // Validate quiet hours format
  if (updates.quiet_hours_start && !isValidTimeFormat(updates.quiet_hours_start)) {
    return 'Invalid quiet hours start time format (use HH:MM)';
  }

  if (updates.quiet_hours_end && !isValidTimeFormat(updates.quiet_hours_end)) {
    return 'Invalid quiet hours end time format (use HH:MM)';
  }

  // Validate that if one quiet hour is set, both should be set
  if ((updates.quiet_hours_start && !updates.quiet_hours_end) ||
      (!updates.quiet_hours_start && updates.quiet_hours_end)) {
    return 'Both quiet hours start and end times must be set together';
  }

  return null;
}

function isValidTimeFormat(time: string): boolean {
  const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
  return timeRegex.test(time);
}