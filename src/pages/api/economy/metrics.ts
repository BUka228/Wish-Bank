import { NextApiRequest, NextApiResponse } from 'next';
import { economyMetricsCollector } from '../../../lib/economy-metrics';

/**
 * Economy Metrics API
 * Provides access to system economy metrics and reports
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    switch (req.method) {
      case 'GET':
        const { type, days } = req.query;
        
        if (type === 'current') {
          // Get current system metrics
          const metrics = await economyMetricsCollector.collectSystemMetrics();
          return res.status(200).json({
            success: true,
            data: metrics
          });
        } else if (type === 'historical') {
          // Get historical metrics
          const daysCount = days ? parseInt(days as string) : 30;
          const historical = await economyMetricsCollector.getHistoricalMetrics(daysCount);
          return res.status(200).json({
            success: true,
            data: historical
          });
        } else if (type === 'report') {
          // Generate metrics report
          const report = await economyMetricsCollector.generateMetricsReport();
          return res.status(200).json({
            success: true,
            data: report
          });
        } else {
          // Default: return current metrics
          const metrics = await economyMetricsCollector.collectSystemMetrics();
          return res.status(200).json({
            success: true,
            data: metrics
          });
        }

      case 'POST':
        // Manually trigger metrics collection
        const metrics = await economyMetricsCollector.collectSystemMetrics();
        await economyMetricsCollector.storeMetrics(metrics);
        
        return res.status(200).json({
          success: true,
          message: 'Metrics collected and stored successfully',
          data: metrics
        });

      default:
        res.setHeader('Allow', ['GET', 'POST']);
        return res.status(405).json({
          success: false,
          error: `Method ${req.method} not allowed`
        });
    }
  } catch (error) {
    console.error('Economy metrics API error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
}