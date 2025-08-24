import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'POST') {
    try {
      const { id } = req.query;

      if (!id || typeof id !== 'string') {
        return res.status(400).json({ error: 'Notification ID is required' });
      }

      // For now, we'll just return success since notifications are generated dynamically
      // In a real implementation, you'd update the notification status in the database
      
      res.status(200).json({ success: true });
    } catch (error) {
      console.error('Error marking notification as read:', error);
      res.status(500).json({ error: 'Failed to mark notification as read' });
    }
  } else {
    res.setHeader('Allow', ['POST']);
    res.status(405).json({ error: 'Method not allowed' });
  }
}