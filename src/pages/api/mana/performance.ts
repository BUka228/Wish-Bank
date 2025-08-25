import { NextApiRequest, NextApiResponse } from 'next';
import { manaPerformanceMonitor } from '../../../lib/mana-performance-monitor';
import ManaCache from '../../../lib/mana-cache';
import { dbMonitor } from '../../../lib/db-monitoring';
import { getUserFromRequest } from '../../../lib/telegram-auth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ 
      success: false,
      error: 'Method not allowed' 
    });
  }

  try {
    const user = await getUserFromRequest(req);
    if (!user) {
      return res.status(401).json({ 
        success: false,
        error: 'Unauthorized' 
      });
    }

    // For now, allow all authenticated users to view performance metrics
    // In production, you might want to restrict this to admin users
    
    const { type = 'dashboard', timeRange = '60' } = req.query;
    const timeRangeMinutes = parseInt(timeRange as string, 10) || 60;

    switch (type) {
      case 'dashboard':
        const dashboardData = manaPerformanceMonitor.getDashboardData();
        return res.status(200).json({
          success: true,
          data: dashboardData
        });

      case 'detailed':
        const detailedStats = manaPerformanceMonitor.getManaPerformanceStats(timeRangeMinutes);
        return res.status(200).json({
          success: true,
          data: {
            timeRange: `${timeRangeMinutes} minutes`,
            ...detailedStats
          }
        });

      case 'cache':
        const cacheStats = ManaCache.getCacheStats();
        return res.status(200).json({
          success: true,
          data: {
            cache: cacheStats,
            recommendations: cacheStats.hitRate < 0.8 ? [
              'Consider increasing cache TTL for frequently accessed data',
              'Implement cache warming for popular users',
              'Review cache invalidation strategies'
            ] : []
          }
        });

      case 'database':
        const dbMetrics = await dbMonitor.collectMetrics();
        const manaSpecificMetrics = {
          manaRelatedTables: dbMetrics.tableStats.filter(table => 
            ['users', 'wishes', 'wish_enhancements', 'transactions'].includes(table.tableName.split('.')[1])
          ),
          manaIndexes: dbMetrics.indexStats.filter(index =>
            index.indexName.includes('mana') || 
            index.indexName.includes('enhancement') ||
            index.indexName.includes('priority') ||
            index.indexName.includes('aura')
          ),
          performanceIssues: dbMetrics.performanceIssues.filter(issue =>
            issue.metadata && (
              JSON.stringify(issue.metadata).includes('mana') ||
              JSON.stringify(issue.metadata).includes('enhancement')
            )
          )
        };

        return res.status(200).json({
          success: true,
          data: {
            database: manaSpecificMetrics,
            timestamp: dbMetrics.timestamp
          }
        });

      case 'recommendations':
        const recommendations = manaPerformanceMonitor.generateOptimizationRecommendations();
        return res.status(200).json({
          success: true,
          data: {
            recommendations,
            priority: recommendations.length > 3 ? 'high' : recommendations.length > 1 ? 'medium' : 'low',
            generatedAt: new Date().toISOString()
          }
        });

      case 'export':
        const exportData = manaPerformanceMonitor.exportMetrics();
        return res.status(200).json({
          success: true,
          data: exportData
        });

      case 'health':
        const healthData = manaPerformanceMonitor.getDashboardData();
        const isHealthy = healthData.systemHealth.healthy;
        const healthScore = healthData.systemHealth.score;
        
        return res.status(isHealthy ? 200 : 503).json({
          success: true,
          data: {
            healthy: isHealthy,
            score: healthScore,
            status: healthScore >= 90 ? 'excellent' : 
                   healthScore >= 70 ? 'good' : 
                   healthScore >= 50 ? 'fair' : 'poor',
            alerts: healthData.alerts,
            timestamp: new Date().toISOString()
          }
        });

      default:
        return res.status(400).json({
          success: false,
          error: 'Invalid performance metric type',
          availableTypes: ['dashboard', 'detailed', 'cache', 'database', 'recommendations', 'export', 'health']
        });
    }

  } catch (error) {
    console.error('Error getting mana performance metrics:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to retrieve performance metrics',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}