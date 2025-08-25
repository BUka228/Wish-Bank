import { NextApiRequest, NextApiResponse } from 'next';
import { transferMana } from '@/lib/mana-engine';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { fromUserId, toUserId, amount, reason } = req.body;
    
    if (!fromUserId || !toUserId || !amount || !reason) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    if (amount <= 0) {
      return res.status(400).json({ error: 'Amount must be positive' });
    }

    const result = await transferMana(fromUserId, toUserId, amount, reason);
    res.status(200).json(result);
  } catch (error: any) {
    console.error('Mana transfer error:', error);
    res.status(500).json({ error: error.message || 'Failed to transfer mana' });
  }
}