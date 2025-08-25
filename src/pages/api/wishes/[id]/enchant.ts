import { NextApiRequest, NextApiResponse } from 'next';
import { economyEngine } from '../../../../lib/economy-engine';
import { EnchantWishRequest } from '../../../../types/quest-economy';
// Assuming an auth middleware or helper exists to get the user ID
import { getUserIdFromRequest } from '../../../../lib/telegram-auth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  try {
    const userId = await getUserIdFromRequest(req);
    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const { id: wish_id } = req.query;
    if (typeof wish_id !== 'string') {
      return res.status(400).json({ message: 'Invalid wish ID format' });
    }

    const { enchantment_type, level, value } = req.body;

    if (!enchantment_type || typeof enchantment_type !== 'string') {
      return res.status(400).json({ message: '`enchantment_type` is required and must be a string' });
    }

    const enchantRequest: EnchantWishRequest = {
      wish_id,
      enchantment_type,
      level,
      value,
    };

    const updatedWish = await economyEngine.enchantWish(userId, enchantRequest);

    return res.status(200).json(updatedWish);
  } catch (error: any) {
    console.error(`[API] /wishes/${req.query.id}/enchant:`, error);
    return res.status(500).json({ message: error.message || 'An internal server error occurred' });
  }
}
