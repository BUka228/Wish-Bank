import { NextApiRequest, NextApiResponse } from 'next';
import { backgroundServices } from '../../../lib/background-services';

/**
 * Manual Quest Expiration Processing API
 * Allows manual triggering of quest expiration checks
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({
      success: false,
      error: `Method ${req.method} not allowed`
    });
  }

  try {
    // Manually trigger quest expiration processing
    await (backgroundServices as any).processQuestExpiration();
    
    return res.status(200).json({
      success: true,
      message: 'Quest expiration processing completed successfully'
    });
  } catch (error) {
    console.error('Quest expiration processing error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to process quest expiration'
    });
  }
}