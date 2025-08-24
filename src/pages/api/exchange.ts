import { NextApiRequest, NextApiResponse } from 'next';
import { exchangeWishes } from '@/lib/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { userId, fromType, toType } = req.body;
    
    if (!userId || !fromType || !toType) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Валидация типов обмена
    const validExchanges = [
      { from: 'green', to: 'blue' },
      { from: 'blue', to: 'red' }
    ];

    const isValidExchange = validExchanges.some(
      exchange => exchange.from === fromType && exchange.to === toType
    );

    if (!isValidExchange) {
      return res.status(400).json({ error: 'Invalid exchange type' });
    }

    const success = await exchangeWishes(userId, fromType, toType);
    
    if (!success) {
      return res.status(400).json({ error: 'Insufficient balance for exchange' });
    }

    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Exchange error:', error);
    res.status(500).json({ error: 'Failed to exchange wishes' });
  }
}