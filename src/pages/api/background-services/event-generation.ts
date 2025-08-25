import { NextApiRequest, NextApiResponse } from 'next';
import { backgroundServices } from '../../../lib/background-services';

/**
 * Manual Event Generation API
 * Allows manual triggering of random event generation
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
    // Manually trigger event generation
    await (backgroundServices as any).processEventGeneration();
    
    return res.status(200).json({
      success: true,
      message: 'Event generation processing completed successfully'
    });
  } catch (error) {
    console.error('Event generation processing error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to process event generation'
    });
  }
}