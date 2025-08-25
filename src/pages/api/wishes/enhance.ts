import { NextApiRequest, NextApiResponse } from 'next';
import { enhancementEngine } from '../../../lib/enhancement-engine';
import { getUserFromRequest } from '../../../lib/telegram-auth';
import { EnhancementError, InsufficientManaError } from '../../../types/mana-system';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const user = await getUserFromRequest(req);
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { wishId, type, level, auraType } = req.body;

    if (!wishId) {
      return res.status(400).json({ 
        error: 'wishId is required' 
      });
    }

    if (!type || !['priority', 'aura'].includes(type)) {
      return res.status(400).json({ 
        error: 'type must be either "priority" or "aura"' 
      });
    }

    // Validate enhancement before applying
    const validation = await enhancementEngine.validateEnhancement(
      wishId, 
      user.id, 
      type, 
      level, 
      auraType
    );

    if (!validation.isValid || !validation.canApply) {
      return res.status(400).json({ 
        error: validation.errors.join(', '),
        validation
      });
    }

    let enhancement;

    try {
      if (type === 'priority') {
        if (!level || level < 1 || level > 5) {
          return res.status(400).json({ 
            error: 'level is required for priority enhancement and must be between 1 and 5' 
          });
        }
        enhancement = await enhancementEngine.applyPriorityEnhancement(wishId, level);
      } else if (type === 'aura') {
        if (!auraType || !['romantic', 'gaming', 'mysterious'].includes(auraType)) {
          return res.status(400).json({ 
            error: 'auraType is required for aura enhancement and must be one of: romantic, gaming, mysterious' 
          });
        }
        enhancement = await enhancementEngine.applyAuraEnhancement(wishId, auraType);
      }

      return res.status(200).json({
        success: true,
        enhancement,
        message: type === 'priority' 
          ? `Приоритет желания повышен до уровня ${level}`
          : `Аура "${auraType}" применена к желанию`
      });

    } catch (error) {
      if (error instanceof InsufficientManaError) {
        return res.status(400).json({ 
          error: 'Недостаточно Маны для применения усиления',
          details: error.message
        });
      }

      if (error instanceof EnhancementError) {
        return res.status(400).json({ 
          error: error.message
        });
      }

      throw error;
    }

  } catch (error) {
    console.error('Enhance wish error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}