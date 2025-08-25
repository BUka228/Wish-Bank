import { NextApiRequest, NextApiResponse } from 'next';
import { performanceMonitor } from '../../../lib/performance-monitor';
import { cacheManager } from '../../../lib/cache-manager';
import { dbMonitor } from '../../../lib/db-monitoring';
import { db } from '../../../lib/db-pool';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const timeRange = parseInt(req.query.timeRange as string) || 60; // Default 60 minutes
    
    // Collect performance data from various sources
    const [
      appMetrics,
      cacheStats,
      dbMetrics,
      dbHealth
    ] = await Promise.all([
      performanceMonitor.getDashboardData(),
      cacheManager.getStats(),
      dbMonitor.collectMetrics().catch(() => null),
      db.healthCheck().catch(() => false)
    ]);

    // Get system metrics if available
    const systemMetrics = await getSystemMetrics().catch(() => null);

    const dashboardData = {
      timestamp: new Date().toISOString(),
      timeRange,
      status: {
        overall: dbHealth && appMetrics.stats.errorStats?.totalErrors < 10 ? 'healthy' : 'warning',
        database: dbHealth ? 'healthy' : 'error',
        cache: cacheStats.hitRate > 0.8 ? 'healthy' : 'warning',
        application: appMetrics.stats.errorStats?.totalErrors < 5 ? 'healthy' : 'warning'
      },
      application: {
        ...appMetrics,
        uptime: process.uptime(),
        nodeVersion: process.version,
        platform: process.platform,
        arch: process.arch
      },
      cache: cacheStats,
      database: dbMetrics ? {
        activeConnections: dbMetrics.activeConnections,
        databaseSize: dbMetrics.databaseSize,
        totalQueries: dbMetrics.totalQueries,
        slowQueries: dbMetrics.slowQueries,
        performanceIssues: dbMetrics.performanceIssues,
        topTables: dbMetrics.tableStats.slice(0, 5),
        indexUsage: dbMetrics.indexStats.filter(idx => !idx.isUnused).slice(0, 5)
      } : null,
      system: systemMetrics,
      alerts: generateAlerts(appMetrics, cacheStats, dbMetrics),
      recommendations: generateRecommendations(appMetrics, cacheStats, dbMetrics)
    };

    // Cache the dashboard data for 30 seconds to reduce load
    cacheManager.set('performance_dashboard', dashboardData, 30 * 1000);

    res.status(200).json(dashboardData);
  } catch (error) {
    console.error('Performance dashboard error:', error);
    res.status(500).json({ 
      error: 'Failed to generate performance dashboard',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

async function getSystemMetrics() {
  const memoryUsage = process.memoryUsage();
  const cpuUsage = process.cpuUsage();
  
  return {
    memory: {
      rss: memoryUsage.rss,
      heapTotal: memoryUsage.heapTotal,
      heapUsed: memoryUsage.heapUsed,
      external: memoryUsage.external,
      arrayBuffers: memoryUsage.arrayBuffers
    },
    cpu: {
      user: cpuUsage.user,
      system: cpuUsage.system
    },
    uptime: process.uptime(),
    loadAverage: process.platform !== 'win32' ? require('os').loadavg() : [0, 0, 0],
    freeMemory: require('os').freemem(),
    totalMemory: require('os').totalmem()
  };
}

function generateAlerts(appMetrics: any, cacheStats: any, dbMetrics: any) {
  const alerts = [];

  // Application alerts
  if (appMetrics.stats.errorStats?.totalErrors > 10) {
    alerts.push({
      type: 'error',
      severity: 'high',
      message: `High error count: ${appMetrics.stats.errorStats.totalErrors} errors in the last hour`,
      component: 'application'
    });
  }

  if (appMetrics.stats.apiStats?.averageResponseTime > 2000) {
    alerts.push({
      type: 'performance',
      severity: 'medium',
      message: `Slow API responses: ${Math.round(appMetrics.stats.apiStats.averageResponseTime)}ms average`,
      component: 'api'
    });
  }

  // Cache alerts
  if (cacheStats.hitRate < 0.5) {
    alerts.push({
      type: 'performance',
      severity: 'medium',
      message: `Low cache hit rate: ${Math.round(cacheStats.hitRate * 100)}%`,
      component: 'cache'
    });
  }

  if (cacheStats.memoryUsage > 100 * 1024 * 1024) { // 100MB
    alerts.push({
      type: 'resource',
      severity: 'medium',
      message: `High cache memory usage: ${Math.round(cacheStats.memoryUsage / 1024 / 1024)}MB`,
      component: 'cache'
    });
  }

  // Database alerts
  if (dbMetrics) {
    if (dbMetrics.activeConnections > 50) {
      alerts.push({
        type: 'resource',
        severity: 'high',
        message: `High database connections: ${dbMetrics.activeConnections}`,
        component: 'database'
      });
    }

    if (dbMetrics.slowQueries > 5) {
      alerts.push({
        type: 'performance',
        severity: 'high',
        message: `Multiple slow queries detected: ${dbMetrics.slowQueries}`,
        component: 'database'
      });
    }

    const criticalIssues = dbMetrics.performanceIssues?.filter((issue: any) => issue.severity === 'critical') || [];
    if (criticalIssues.length > 0) {
      alerts.push({
        type: 'critical',
        severity: 'critical',
        message: `Critical database issues: ${criticalIssues.length} issues detected`,
        component: 'database'
      });
    }
  }

  // System alerts
  const memoryUsage = process.memoryUsage();
  if (memoryUsage.heapUsed > 500 * 1024 * 1024) { // 500MB
    alerts.push({
      type: 'resource',
      severity: 'medium',
      message: `High memory usage: ${Math.round(memoryUsage.heapUsed / 1024 / 1024)}MB`,
      component: 'system'
    });
  }

  return alerts;
}

function generateRecommendations(appMetrics: any, cacheStats: any, dbMetrics: any) {
  const recommendations = [];

  // API performance recommendations
  if (appMetrics.slowestAPIs?.length > 0) {
    const slowestAPI = appMetrics.slowestAPIs[0];
    if (slowestAPI.responseTime > 1000) {
      recommendations.push({
        type: 'optimization',
        priority: 'high',
        message: `Optimize ${slowestAPI.endpoint} - taking ${slowestAPI.responseTime}ms`,
        action: 'Add caching or database indexes'
      });
    }
  }

  // Component performance recommendations
  if (appMetrics.slowestComponents?.length > 0) {
    const slowestComponent = appMetrics.slowestComponents[0];
    if (slowestComponent.renderTime > 100) {
      recommendations.push({
        type: 'optimization',
        priority: 'medium',
        message: `Optimize ${slowestComponent.componentName} component - ${slowestComponent.renderTime}ms render time`,
        action: 'Consider memoization or code splitting'
      });
    }
  }

  // Cache recommendations
  if (cacheStats.hitRate < 0.7) {
    recommendations.push({
      type: 'caching',
      priority: 'medium',
      message: 'Improve cache hit rate by caching more frequently accessed data',
      action: 'Review cache TTL settings and add more cache points'
    });
  }

  if (cacheStats.totalEntries > 800) {
    recommendations.push({
      type: 'caching',
      priority: 'low',
      message: 'Cache is near capacity, consider increasing max size or reducing TTL',
      action: 'Adjust cache configuration'
    });
  }

  // Database recommendations
  if (dbMetrics?.performanceIssues) {
    const highPriorityIssues = dbMetrics.performanceIssues.filter((issue: any) => 
      issue.severity === 'high' || issue.severity === 'critical'
    );
    
    for (const issue of highPriorityIssues.slice(0, 3)) {
      recommendations.push({
        type: 'database',
        priority: issue.severity === 'critical' ? 'critical' : 'high',
        message: issue.description,
        action: issue.recommendation
      });
    }
  }

  // General recommendations
  if (appMetrics.stats.errorStats?.totalErrors > 5) {
    recommendations.push({
      type: 'reliability',
      priority: 'high',
      message: 'High error rate detected',
      action: 'Review error logs and implement better error handling'
    });
  }

  return recommendations;
}