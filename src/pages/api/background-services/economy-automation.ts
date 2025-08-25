import { NextApiRequest, NextApiResponse } from 'next';
import { backgroundServices } from '../../../lib/background-services';

/**
 * Manual Economy Automation API
 * Allows manual triggering of quota resets and rank calculations
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
    const { action } = req.body;

    switch (action) {
      case 'quota-reset':
        await (backgroundServices as any).processQuotaResets();
        return res.status(200).json({
          success: true,
          message: 'Quota reset processing completed successfully'
        });

      case 'rank-calculation':
        await (backgroundServices as any).processRankCalculations();
        return res.status(200).json({
          success: true,
          message: 'Rank calculation processing completed successfully'
        });

      case 'metrics-collection':
        await (backgroundServices as any).collectEconomyMetrics();
        return res.status(200).json({
          success: true,
          message: 'Economy metrics collection completed successfully'
        });

      default:
        return res.status(400).json({
          success: false,
          error: 'Invalid action. Use "quota-reset", "rank-calculation", or "metrics-collection"'
        });
    }
  } catch (error) {
    console.error('Economy automation processing error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to process economy automation'
    });
  }
}