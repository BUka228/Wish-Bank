import { NextApiRequest, NextApiResponse } from 'next';
import { db } from '@/lib/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    try {
      const { userId } = req.query;

      if (!userId || typeof userId !== 'string') {
        return res.status(400).json({ error: 'User ID is required' });
      }

      // Get wishes created by the user
      const result = await db.query`
        SELECT w.*, u.name as assignee_name, wc.name as category_name, wc.emoji as category_emoji
         FROM wishes w
         LEFT JOIN users u ON w.assignee_id = u.id
         LEFT JOIN wish_categories wc ON w.category = wc.name
         WHERE w.author_id = ${userId} AND w.is_shared = false
         ORDER BY w.created_at DESC
      `;

      const wishes = result.map(row => ({
        id: row.id,
        type: row.type,
        description: row.description,
        status: row.status,
        author_id: row.author_id,
        assignee_id: row.assignee_id,
        assignee_name: row.assignee_name,
        category: row.category || 'general',
        category_name: row.category_name,
        category_emoji: row.category_emoji,
        is_shared: row.is_shared,
        is_gift: row.is_gift,
        is_historical: row.is_historical,
        priority: row.priority || 1,
        created_at: row.created_at,
        completed_at: row.completed_at
      }));

      res.status(200).json({ wishes });
    } catch (error) {
      console.error('Error fetching user wishes:', error);
      res.status(500).json({ error: 'Failed to fetch wishes' });
    }
  } else {
    res.setHeader('Allow', ['GET']);
    res.status(405).json({ error: 'Method not allowed' });
  }
}