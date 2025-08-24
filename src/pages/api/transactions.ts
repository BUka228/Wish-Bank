import { NextApiRequest, NextApiResponse } from 'next';
import { addTransaction, getUserTransactions } from '@/lib/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    try {
      const { userId, limit } = req.query;
      
      if (!userId || typeof userId !== 'string') {
        return res.status(400).json({ error: 'User ID is required' });
      }

      const transactions = await getUserTransactions(userId, limit ? parseInt(limit as string) : 50);
      res.status(200).json({ transactions });
    } catch (error) {
      console.error('Get transactions error:', error);
      res.status(500).json({ error: 'Failed to get transactions' });
    }
  } else if (req.method === 'POST') {
    try {
      const { userId, type, wishType, amount, reason, referenceId } = req.body;
      
      if (!userId || !type || !wishType || !amount || !reason) {
        return res.status(400).json({ error: 'Missing required fields' });
      }

      const transaction = await addTransaction(userId, type, wishType, amount, reason, referenceId);
      res.status(201).json({ transaction });
    } catch (error) {
      console.error('Create transaction error:', error);
      res.status(500).json({ error: 'Failed to create transaction' });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}