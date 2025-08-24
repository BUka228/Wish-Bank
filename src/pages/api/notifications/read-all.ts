import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'POST') {
    try {
      const { userId } = req.body;

      if (!userId) {
        return res.status(400).json({ error: 'User ID is required' });
      }

      // For now, we'll just return success since notifications are generated dynamically
      // In a real implementation, you'd update all notification statuses in the database
      
      res.status(200).json({ success: true });
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      res.status(500).json({ error: 'Failed to mark all notifications as read' });
    }
  } else {
    res.setHeader('Allow', ['POST']);
    res.status(405).json({ error: 'Method not allowed' });
  }
}