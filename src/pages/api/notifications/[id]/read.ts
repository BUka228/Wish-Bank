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

    const { id } = req.query;
    if (!id || typeof id !== 'string') {
      return res.status(400).json({ error: 'Notification ID is required' });
    }

    // Mark notification as read using the database function
    const result = await sql`SELECT mark_notification_read(${id}, ${user.id}) as success`;
    
    if (result[0].success) {
      return res.status(200).json({ 
        success: true, 
        message: 'Notification marked as read' 
      });
    } else {
      return res.status(404).json({ 
        error: 'Notification not found or already read' 
      });
    }

  } catch (error) {
    console.error('Error marking notification as read:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}