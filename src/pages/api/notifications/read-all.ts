import { NextApiRequest, NextApiResponse } from 'next';
import { sql } from '@/lib/db-pool';
import { validateTelegramWebAppData } from '@/lib/telegram-auth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: 'Method not allowed' });
  }

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

    // Mark all notifications as read using the database function
    const result = await sql`SELECT mark_all_notifications_read(${user.id}) as count`;
    
    const markedCount = result[0].count;

    return res.status(200).json({ 
      success: true, 
      message: `${markedCount} notifications marked as read`,
      count: markedCount
    });

  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}