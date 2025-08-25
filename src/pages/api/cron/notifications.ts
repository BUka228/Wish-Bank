import { NextApiRequest, NextApiResponse } from 'next';
import { sharedWishNotificationSystem } from '@/lib/shared-wish-notifications';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Verify this is a legitimate cron request
    const authHeader = req.headers.authorization;
    const expectedToken = process.env.CRON_SECRET;
    
    if (!expectedToken || authHeader !== `Bearer ${expectedToken}`) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const results = {
      delayedNotifications: 0,
      reminders: 0,
      cleanupCount: 0,
      errors: [] as string[]
    };

    try {
      // Process delayed notifications
      results.delayedNotifications = await sharedWishNotificationSystem.processDelayedNotifications();
    } catch (error) {
      console.error('Error processing delayed notifications:', error);
      results.errors.push('Failed to process delayed notifications');
    }

    try {
      // Send reminder notifications
      results.reminders = await sharedWishNotificationSystem.checkAndSendReminders();
    } catch (error) {
      console.error('Error sending reminders:', error);
      results.errors.push('Failed to send reminder notifications');
    }

    try {
      // Clean up expired notifications
      const { sql } = await import('@/lib/db-pool');
      const cleanupResult = await sql`SELECT cleanup_expired_notifications() as count`;
      results.cleanupCount = cleanupResult[0].count;
    } catch (error) {
      console.error('Error cleaning up notifications:', error);
      results.errors.push('Failed to cleanup expired notifications');
    }

    console.log('Notification cron job completed:', results);

    return res.status(200).json({
      success: true,
      message: 'Notification processing completed',
      results
    });

  } catch (error) {
    console.error('Error in notification cron job:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}