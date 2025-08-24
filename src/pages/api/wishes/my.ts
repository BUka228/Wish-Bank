import { NextApiRequest, NextApiResponse } from 'next';
import { getUserFromRequest } from '../../../lib/telegram-auth';
import { getWishesByCreator } from '../../../lib/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const user = await getUserFromRequest(req);
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { page = '1', limit = '10', status, category } = req.query;
    
    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);

    const filters: any = { createdBy: user.id };
    if (status) filters.status = status;
    if (category) filters.category = category;

    const wishes = await getWishesByCreator(user.id, filters, pageNum, limitNum);

    return res.status(200).json({
      wishes,
      pagination: {
        page: pageNum,
        limit: limitNum,
        hasMore: wishes.length === limitNum
      }
    });

  } catch (error) {
    console.error('Get my wishes error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}