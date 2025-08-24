import { NextApiRequest, NextApiResponse } from 'next';
import { createWish, getActiveWishes } from '@/lib/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    try {
      const { userId } = req.query;
      const wishes = await getActiveWishes(userId as string);
      res.status(200).json({ wishes });
    } catch (error) {
      console.error('Get wishes error:', error);
      res.status(500).json({ error: 'Failed to get wishes' });
    }
  } else if (req.method === 'POST') {
    try {
      const { type, description, authorId, assigneeId } = req.body;
      
      if (!type || !description || !authorId) {
        return res.status(400).json({ error: 'Missing required fields' });
      }

      const wish = await createWish(type, description, authorId, assigneeId);
      res.status(201).json({ wish });
    } catch (error) {
      console.error('Create wish error:', error);
      res.status(500).json({ error: 'Failed to create wish' });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}