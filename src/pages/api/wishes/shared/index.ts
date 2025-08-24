import { NextApiRequest, NextApiResponse } from 'next';
import { getUserFromRequest } from '../../../../lib/telegram-auth';
import { getSharedWishes, createSharedWish } from '../../../../lib/db';
import { RankCalculator } from '../../../../lib/rank-calculator';

const rankCalculator = new RankCalculator();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const user = await getUserFromRequest(req);
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    switch (req.method) {
      case 'GET':
        return handleGetSharedWishes(req, res, user);
      case 'POST':
        return handleCreateSharedWish(req, res, user);
      default:
        return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Shared wishes API error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

async function handleGetSharedWishes(req: NextApiRequest, res: NextApiResponse, user: any) {
  const { page = '1', limit = '10', status = 'pending', category } = req.query;
  
  const pageNum = parseInt(page as string);
  const limitNum = parseInt(limit as string);

  const filters: any = { status };
  if (category) filters.category = category;

  const sharedWishes = await getSharedWishes(filters, pageNum, limitNum);

  return res.status(200).json({
    wishes: sharedWishes,
    pagination: {
      page: pageNum,
      limit: limitNum,
      hasMore: sharedWishes.length === limitNum
    }
  });
}

async function handleCreateSharedWish(req: NextApiRequest, res: NextApiResponse, user: any) {
  const { title, description, category, priority, estimatedCost } = req.body;

  if (!title || !description) {
    return res.status(400).json({ 
      error: 'Missing required fields: title, description' 
    });
  }

  // Check if user has permission to create shared wishes
  const userRank = rankCalculator.getCurrentRank(user.experience || 0);
  const maxSharedWishes = rankCalculator.getMaxPrivilegeValue(userRank, 'maxSharedWishes');
  
  // Check current shared wishes count (would need to implement this check)
  // For now, just check if user has the privilege
  if (maxSharedWishes === 0) {
    return res.status(403).json({ 
      error: 'Insufficient rank to create shared wishes' 
    });
  }

  // For shared wishes, we need a partner ID - using a placeholder for now
  const partnerId = user.partner_id || user.id; // This should be properly implemented
  
  const sharedWish = await createSharedWish(
    'green', // Default type, should be from request
    description,
    user.id,
    partnerId,
    category || 'general',
    1, // Default priority
    false // Not historical
  );
  
  return res.status(201).json({ wish: sharedWish });
}