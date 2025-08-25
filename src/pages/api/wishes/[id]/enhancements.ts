import { NextApiRequest, NextApiResponse } from 'next';
import { enhancementEngine } from '../../../../lib/enhancement-engine';
import { getUserFromRequest } from '../../../../lib/telegram-auth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const user = await getUserFromRequest(req);
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { id } = req.query;
    const wishId = id as string;

    if (!wishId) {
      return res.status(400).json({ error: 'Wish ID is required' });
    }

    // Get all enhancements for the wish
    const enhancements = await enhancementEngine.getWishEnhancements(wishId);

    // Get next priority cost if applicable
    const nextPriorityCost = await enhancementEngine.getNextPriorityCost(wishId);

    // Get current enhancement levels
    const priorityEnhancement = enhancements.find(e => e.type === 'priority');
    const auraEnhancement = enhancements.find(e => e.type === 'aura');

    return res.status(200).json({
      enhancements,
      currentLevels: {
        priority: priorityEnhancement?.level || 0,
        aura: auraEnhancement?.aura_type || null
      },
      costs: {
        nextPriorityLevel: nextPriorityCost,
        aura: auraEnhancement ? null : enhancementEngine.calculateEnhancementCost('aura', 1)
      }
    });

  } catch (error) {
    console.error('Get wish enhancements error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}