import { NextApiRequest, NextApiResponse } from 'next';
import { enhancementEngine } from '../../../../lib/enhancement-engine';
import { manaEngine } from '../../../../lib/mana-engine';
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
    const { type, level, auraType } = req.query;
    const wishId = id as string;

    if (!wishId) {
      return res.status(400).json({ error: 'Wish ID is required' });
    }

    if (!type || !['priority', 'aura'].includes(type as string)) {
      return res.status(400).json({ 
        error: 'type parameter is required and must be either "priority" or "aura"' 
      });
    }

    // Get current user mana balance
    const userMana = await manaEngine.getUserMana(user.id);

    // Validate the enhancement
    const validation = await enhancementEngine.validateEnhancement(
      wishId,
      user.id,
      type as 'priority' | 'aura',
      level ? parseInt(level as string) : undefined,
      auraType as string
    );

    // Get current enhancements
    const enhancements = await enhancementEngine.getWishEnhancements(wishId);
    const priorityEnhancement = enhancements.find(e => e.type === 'priority');
    const auraEnhancement = enhancements.find(e => e.type === 'aura');

    return res.status(200).json({
      validation,
      userMana,
      currentEnhancements: {
        priority: {
          level: priorityEnhancement?.level || 0,
          maxLevel: 5
        },
        aura: {
          type: auraEnhancement?.aura_type || null,
          hasAura: !!auraEnhancement
        }
      },
      availableAuraTypes: ['romantic', 'gaming', 'mysterious'],
      costs: {
        priority: {
          1: enhancementEngine.calculateEnhancementCost('priority', 1),
          2: enhancementEngine.calculateEnhancementCost('priority', 2),
          3: enhancementEngine.calculateEnhancementCost('priority', 3),
          4: enhancementEngine.calculateEnhancementCost('priority', 4),
          5: enhancementEngine.calculateEnhancementCost('priority', 5)
        },
        aura: enhancementEngine.calculateEnhancementCost('aura', 1)
      }
    });

  } catch (error) {
    console.error('Get enhancement info error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}