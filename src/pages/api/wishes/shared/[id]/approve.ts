import { NextApiRequest, NextApiResponse } from 'next';
import { db } from '@/lib/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'POST') {
    try {
      const { id } = req.query;
      const { userId } = req.body;

      if (!id || typeof id !== 'string') {
        return res.status(400).json({ error: 'Wish ID is required' });
      }

      if (!userId) {
        return res.status(400).json({ error: 'User ID is required' });
      }

      // Get the wish to verify it's a shared wish and user has permission to approve
      const wishResult = await db.query`
        SELECT * FROM wishes WHERE id = ${id} AND is_shared = true
      `;

      if (wishResult.length === 0) {
        return res.status(404).json({ error: 'Shared wish not found' });
      }

      const wish = wishResult[0];

      // Check if user is the assignee (can approve wishes assigned to them)
      // or if they're the partner of the author
      if (wish.assignee_id !== userId && wish.author_id !== userId) {
        return res.status(403).json({ error: 'No permission to approve this wish' });
      }

      // Approve the shared wish
      const result = await db.query`
        UPDATE wishes 
        SET shared_approved_by = ${userId}, status = 'active', updated_at = NOW()
        WHERE id = ${id}
        RETURNING *
      `;

      const updatedWish = result[0];
      res.status(200).json({ wish: updatedWish });
    } catch (error) {
      console.error('Error approving shared wish:', error);
      res.status(500).json({ error: 'Failed to approve shared wish' });
    }
  } else {
    res.setHeader('Allow', ['POST']);
    res.status(405).json({ error: 'Method not allowed' });
  }
}