import { NextApiRequest, NextApiResponse } from 'next';
import { performanceMonitor } from '../../../lib/performance-monitor';
import { cacheManager } from '../../../lib/cache-manager';
import { dbMonitor } from '../../../lib/db-monitoring';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { method, query } = req;

  switch (method) {
    case 'GET':
      return handleGetMetrics(req, res);
    case 'POST':
      return handleRecordMetric(req, res);
    case 'DELETE':
      return handleClearMetrics(req, res);
    default:
      return res.status(405).json({ error: 'Method not allowed' });
  }
}

async function handleGetMetrics(req: NextApiRequest, res: NextApiResponse) {
  try {
    const format = req.query.format as string || 'json';
    const timeRange = parseInt(req.query.timeRange as string) || 60;
    const component = req.query.component as string;

    if (format === 'prometheus') {
      const prometheusMetrics = performanceMonitor.exportMetrics('prometheus');
      res.setHeader('Content-Type', 'text/plain');
      return res.status(200).send(prometheusMetrics);
    }

    let metrics;
    
    if (component === 'database') {
      metrics = await dbMonitor.collectMetrics();
    } else if (component === 'cache') {
      metrics = cacheManager.getDetailedStats();
    } else {
      // Get all metrics
      const [appMetrics, cacheStats, dbMetrics] = await Promise.all([
        performanceMonitor.exportMetrics('json'),
        cacheManager.getStats(),
        dbMonitor.collectMetrics().catch(() => null)
      ]);

      metrics = {
        application: appMetrics,
        cache: cacheStats,
        database: dbMetrics,
        timestamp: new Date().toISOString()
      };
    }

    res.status(200).json(metrics);
  } catch (error) {
    console.error('Error getting metrics:', error);
    res.status(500).json({ 
      error: 'Failed to get metrics',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

async function handleRecordMetric(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { name, value, unit = 'ms', tags = {}, metadata } = req.body;

    if (!name || value === undefined) {
      return res.status(400).json({ error: 'Name and value are required' });
    }

    performanceMonitor.recordMetric(name, value, unit, tags, metadata);

    res.status(201).json({ 
      success: true, 
      message: 'Metric recorded successfully' 
    });
  } catch (error) {
    console.error('Error recording metric:', error);
    res.status(500).json({ 
      error: 'Failed to record metric',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

async function handleClearMetrics(req: NextApiRequest, res: NextApiResponse) {
  try {
    const component = req.query.component as string;

    if (component === 'cache') {
      cacheManager.clear();
    } else if (component === 'application') {
      performanceMonitor.clearMetrics();
    } else {
      // Clear all metrics
      performanceMonitor.clearMetrics();
      cacheManager.clear();
    }

    res.status(200).json({ 
      success: true, 
      message: `${component || 'All'} metrics cleared successfully` 
    });
  } catch (error) {
    console.error('Error clearing metrics:', error);
    res.status(500).json({ 
      error: 'Failed to clear metrics',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}