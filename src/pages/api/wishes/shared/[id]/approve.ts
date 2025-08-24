import { NextApiRequest, NextApiResponse } from 'next';
import { getUserFromRequest } from '../../../../../lib/telegram-auth';
import { approveSharedWish } from '../../../../../lib/db';
import { RankCalculator } from '../../../../../lib/rank-calculator';

const rankCalculator = new RankCalculator();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'PUT') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const user = await getUserFromRequest(req);
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { id } = req.query;
    const sharedWishId = parseInt(id as string);

    if (isNaN(sharedWishId)) {
      return res.status(400).json({ error: 'Invalid shared wish ID' });
    }

    // Check if user has permission to approve shared wishes
    const userRank = rankCalculator.getCurrentRank(user.experience || 0);
    if (!rankCalculator.hasPrivilege(userRank, 'canApproveSharedWishes')) {
      return res.status(403).json({ 
        error: 'Insufficient rank to approve shared wishes' 
      });
    }

    const { approved, assignedTo, comments } = req.body;

    if (typeof approved !== 'boolean') {
      return res.status(400).json({ 
        error: 'Missing required field: approved (boolean)' 
      });
    }

    if (!approved) {
      return res.status(400).json({ error: 'Rejection of shared wishes not implemented yet' });
    }

    const updatedWish = await approveSharedWish(String(sharedWishId), user.id);

    if (!updatedWish) {
      return res.status(404).json({ error: 'Shared wish not found' });
    }

    return res.status(200).json({ 
      wish: updatedWish,
      message: approved ? 'Shared wish approved' : 'Shared wish rejected'
    });

  } catch (error) {
    console.error('Approve shared wish error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}