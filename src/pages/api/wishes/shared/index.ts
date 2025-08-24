import { NextApiRequest, NextApiResponse } from 'next';
import { db } from '@/lib/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    try {
      const { userId } = req.query;

      if (!userId || typeof userId !== 'string') {
        return res.status(400).json({ error: 'User ID is required' });
      }

      // Get shared wishes that involve the user (either as author or assignee)
      const result = await db.query`
        SELECT w.*, 
                u1.name as author_name, 
                u2.name as assignee_name,
                wc.name as category_name, 
                wc.emoji as category_emoji
         FROM wishes w
         LEFT JOIN users u1 ON w.author_id = u1.id
         LEFT JOIN users u2 ON w.assignee_id = u2.id
         LEFT JOIN wish_categories wc ON w.category = wc.name
         WHERE w.is_shared = true AND (w.author_id = ${userId} OR w.assignee_id = ${userId})
         ORDER BY w.created_at DESC
      `;

      const wishes = result.map(row => ({
        id: row.id,
        type: row.type,
        description: row.description,
        status: row.status,
        author_id: row.author_id,
        author_name: row.author_name,
        assignee_id: row.assignee_id,
        assignee_name: row.assignee_name,
        category: row.category || 'general',
        category_name: row.category_name,
        category_emoji: row.category_emoji,
        is_shared: row.is_shared,
        is_gift: row.is_gift,
        is_historical: row.is_historical,
        shared_approved_by: row.shared_approved_by,
        priority: row.priority || 1,
        created_at: row.created_at,
        completed_at: row.completed_at
      }));

      res.status(200).json({ wishes });
    } catch (error) {
      console.error('Error fetching shared wishes:', error);
      res.status(500).json({ error: 'Failed to fetch shared wishes' });
    }
  } else if (req.method === 'POST') {
    try {
      const { type, description, authorId, assigneeId, category, priority, isHistorical } = req.body;

      if (!type || !description || !authorId) {
        return res.status(400).json({ error: 'Missing required fields' });
      }

      // Create shared wish (pending approval)
      const result = await db.query`
        INSERT INTO wishes (type, description, author_id, assignee_id, category, is_shared, is_historical, priority, status)
        VALUES (${type}, ${description}, ${authorId}, ${assigneeId}, ${category || 'general'}, true, ${isHistorical || false}, ${priority || 1}, 'pending')
        RETURNING *
      `;

      const wish = result[0];
      res.status(201).json({ wish });
    } catch (error) {
      console.error('Error creating shared wish:', error);
      res.status(500).json({ error: 'Failed to create shared wish' });
    }
  } else {
    res.setHeader('Allow', ['GET', 'POST']);
    res.status(405).json({ error: 'Method not allowed' });
  }
}