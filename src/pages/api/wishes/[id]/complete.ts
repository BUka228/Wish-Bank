import { NextApiRequest, NextApiResponse } from 'next';
import { completeWish } from '@/lib/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { id } = req.query;
    
    if (!id || typeof id !== 'string') {
      return res.status(400).json({ error: 'Invalid wish ID' });
    }

    const wish = await completeWish(id);
    res.status(200).json({ wish });
  } catch (error) {
    console.error('Complete wish error:', error);
    res.status(500).json({ error: 'Failed to complete wish' });
  }
}