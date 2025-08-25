import { NextApiRequest, NextApiResponse } from 'next';
import { manaEngine } from '../../../lib/mana-engine';
import { getUserFromRequest } from '../../../lib/telegram-auth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const user = await getUserFromRequest(req);
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { amount, reason } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ 
        error: 'Amount is required and must be positive' 
      });
    }

    if (!reason) {
      return res.status(400).json({ 
        error: 'Reason is required' 
      });
    }

    // Validate the operation first
    const validation = await manaEngine.validateManaOperation(user.id, amount, 'spend');
    
    if (!validation.canProceed) {
      return res.status(400).json({ 
        error: validation.errors.join(', '),
        currentBalance: validation.currentBalance
      });
    }

    // Attempt to spend mana
    const success = await manaEngine.spendMana(user.id, amount, reason);

    if (!success) {
      return res.status(400).json({ 
        error: 'Недостаточно Маны',
        currentBalance: validation.currentBalance
      });
    }

    // Get updated balance
    const newBalance = await manaEngine.getUserMana(user.id);

    return res.status(200).json({
      success: true,
      amountSpent: amount,
      newBalance,
      reason
    });

  } catch (error) {
    console.error('Spend mana error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}