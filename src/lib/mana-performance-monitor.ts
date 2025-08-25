import { performanceMonitor } from './performance-monitor';
import { dbMonitor } from './db-monitoring';
import ManaCache from './mana-cache';

/**
 * Specialized performance monitoring for Mana system
 * Tracks performance metrics specific to mana operations and API endpoints
 */
export class ManaPerformanceMonitor {
  private static instance: ManaPerformanceMonitor;
  private manaMetrics: Map<string, any[]> = new Map();
  private alertThresholds = {
    manaBalanceQueryTime: 100, // ms
    enhancementApplicationTime: 500, // ms
    transactionProcessingTime: 200, // ms
    cacheHitRate: 0.8, // 80%
    apiResponseTime: 1000, // ms
    databaseQueryTime: 300, // ms
  };

  static getInstance(): ManaPerformanceMonitor {
    if (!ManaPerformanceMonitor.instance) {
      ManaPerformanceMonitor.instance = new ManaPerformanceMonitor();
    }
    return ManaPerformanceMonitor.instance;
  }

  // ============================================================================
  // MANA OPERATION MONITORING
  // ============================================================================

  recordManaOperation(
    operation: 'getUserMana' | 'addMana' | 'spendMana' | 'calculateReward',
    userId: string,
    duration: number,
    success: boolean,
    metadata?: any
  ): void {
    const metric = {
      operation,
      userId,
      duration,
      success,
      timestamp: new Date(),
      metadata: metadata || {}
    };

    // Store in local metrics
    if (!this.manaMetrics.has(operation)) {
      this.manaMetrics.set(operation, []);
    }
    this.manaMetrics.get(operation)!.push(metric);

    // Trim history to last 1000 entries per operation
    const metrics = this.manaMetrics.get(operation)!;
    if (metrics.length > 1000) {
      metrics.splice(0, metrics.length - 1000);
    }

    // Record in general performance monitor
    performanceMonitor.recordMetric(
      `mana_${operation}`,
      duration,
      'ms',
      { userId, success: success.toString() },
      metadata
    );

    // Check for performance alerts
    this.checkPerformanceAlerts(operation, duration, success);
  }

  recordEnhancementOperation(
    operation: 'applyPriority' | 'applyAura' | 'validateEnhancement' | 'getEnhancements',
    wishId: string,
    userId: string,
    duration: number,
    success: boolean,
    enhancementType?: string,
    cost?: number
  ): void {
    const metric = {
      operation,
      wishId,
      userId,
      duration,
      success,
      enhancementType,
      cost,
      timestamp: new Date()
    };

    // Store in local metrics
    const key = `enhancement_${operation}`;
    if (!this.manaMetrics.has(key)) {
      this.manaMetrics.set(key, []);
    }
    this.manaMetrics.get(key)!.push(metric);

    // Record in general performance monitor
    performanceMonitor.recordMetric(
      key,
      duration,
      'ms',
      { 
        wishId, 
        userId, 
        success: success.toString(),
        enhancementType: enhancementType || 'unknown',
        cost: cost?.toString() || '0'
      }
    );

    // Check for performance alerts
    if (duration > this.alertThresholds.enhancementApplicationTime) {
      console.warn(`Slow enhancement operation: ${operation} took ${duration}ms for wish ${wishId}`);
    }
  }

  recordCacheOperation(
    operation: 'hit' | 'miss' | 'set' | 'invalidate',
    cacheKey: string,
    duration?: number
  ): void {
    performanceMonitor.recordMetric(
      `mana_cache_${operation}`,
      duration || 1,
      duration ? 'ms' : 'count',
      { cacheKey }
    );
  }

  // ============================================================================
  // API ENDPOINT MONITORING
  // ============================================================================

  createManaAPIMiddleware() {
    return (endpoint: string) => {
      return (handler: Function) => {
        return async (req: any, res: any, ...args: any[]) => {
          const startTime = Date.now();
          const method = req.method || 'GET';
          let statusCode = 200;
          let error: Error | null = null;

          try {
            const result = await handler(req, res, ...args);
            
            // Extract status code from response
            if (res.statusCode) {
              statusCode = res.statusCode;
            }

            return result;
          } catch (err) {
            error = err as Error;
            statusCode = 500;
            throw err;
          } finally {
            const duration = Date.now() - startTime;
            
            // Record API performance
            this.recordAPIPerformance(
              endpoint,
              method,
              statusCode,
              duration,
              this.extractUserId(req),
              error
            );
          }
        };
      };
    };
  }

  private recordAPIPerformance(
    endpoint: string,
    method: string,
    statusCode: number,
    duration: number,
    userId?: string,
    error?: Error | null
  ): void {
    // Record in general performance monitor
    performanceMonitor.recordAPIMetric(
      endpoint,
      method,
      statusCode,
      duration,
      userId,
      undefined,
      error?.message
    );

    // Record mana-specific metrics
    const metric = {
      endpoint,
      method,
      statusCode,
      duration,
      userId,
      error: error?.message,
      timestamp: new Date()
    };

    const key = 'mana_api_calls';
    if (!this.manaMetrics.has(key)) {
      this.manaMetrics.set(key, []);
    }
    this.manaMetrics.get(key)!.push(metric);

    // Check for performance alerts
    if (duration > this.alertThresholds.apiResponseTime) {
      console.warn(`Slow Mana API: ${method} ${endpoint} took ${duration}ms`);
    }

    if (statusCode >= 400) {
      console.error(`Mana API Error: ${method} ${endpoint} returned ${statusCode}`, error?.message);
    }
  }

  // ============================================================================
  // DATABASE QUERY MONITORING
  // ============================================================================

  recordDatabaseQuery(
    queryType: 'getUserMana' | 'updateManaBalance' | 'createEnhancement' | 'getEnhancements' | 'createTransaction' | 'getWishesByPriority' | 'getWishesWithAura' | 'getManaLeaderboard' | 'getUserManaStatistics' | 'batchUpdateManaBalances',
    duration: number,
    success: boolean,
    rowsAffected?: number
  ): void {
    performanceMonitor.recordMetric(
      `mana_db_${queryType}`,
      duration,
      'ms',
      { 
        success: success.toString(),
        rowsAffected: rowsAffected?.toString() || '0'
      }
    );

    // Check for slow queries
    if (duration > this.alertThresholds.databaseQueryTime) {
      console.warn(`Slow Mana database query: ${queryType} took ${duration}ms`);
    }
  }

  // ============================================================================
  // PERFORMANCE ANALYSIS
  // ============================================================================

  getManaPerformanceStats(timeRangeMinutes: number = 60): {
    operationStats: any;
    enhancementStats: any;
    apiStats: any;
    cacheStats: any;
    alerts: string[];
  } {
    const cutoff = new Date(Date.now() - timeRangeMinutes * 60 * 1000);
    const alerts: string[] = [];

    // Analyze operation performance
    const operationStats = this.analyzeOperationPerformance(cutoff);
    
    // Analyze enhancement performance
    const enhancementStats = this.analyzeEnhancementPerformance(cutoff);
    
    // Analyze API performance
    const apiStats = this.analyzeAPIPerformance(cutoff);
    
    // Get cache statistics
    const cacheStats = ManaCache.getCacheStats();
    
    // Check for alerts
    if (cacheStats.hitRate < this.alertThresholds.cacheHitRate) {
      alerts.push(`Low cache hit rate: ${Math.round(cacheStats.hitRate * 100)}%`);
    }

    if (operationStats.averageResponseTime > this.alertThresholds.manaBalanceQueryTime) {
      alerts.push(`Slow mana operations: ${operationStats.averageResponseTime}ms average`);
    }

    return {
      operationStats,
      enhancementStats,
      apiStats,
      cacheStats,
      alerts
    };
  }

  private analyzeOperationPerformance(cutoff: Date): any {
    const operations = ['getUserMana', 'addMana', 'spendMana', 'calculateReward'];
    const stats: any = {};

    for (const operation of operations) {
      const metrics = this.manaMetrics.get(operation) || [];
      const recentMetrics = metrics.filter(m => m.timestamp > cutoff);
      
      if (recentMetrics.length > 0) {
        const durations = recentMetrics.map(m => m.duration);
        const successCount = recentMetrics.filter(m => m.success).length;
        
        stats[operation] = {
          totalCalls: recentMetrics.length,
          successRate: successCount / recentMetrics.length,
          averageTime: durations.reduce((a, b) => a + b, 0) / durations.length,
          minTime: Math.min(...durations),
          maxTime: Math.max(...durations),
          p95Time: this.calculatePercentile(durations, 95)
        };
      }
    }

    return stats;
  }

  private analyzeEnhancementPerformance(cutoff: Date): any {
    const enhancementOps = ['enhancement_applyPriority', 'enhancement_applyAura', 'enhancement_validateEnhancement'];
    const stats: any = {};

    for (const operation of enhancementOps) {
      const metrics = this.manaMetrics.get(operation) || [];
      const recentMetrics = metrics.filter(m => m.timestamp > cutoff);
      
      if (recentMetrics.length > 0) {
        const durations = recentMetrics.map(m => m.duration);
        const successCount = recentMetrics.filter(m => m.success).length;
        const totalCost = recentMetrics.reduce((sum, m) => sum + (m.cost || 0), 0);
        
        stats[operation] = {
          totalApplications: recentMetrics.length,
          successRate: successCount / recentMetrics.length,
          averageTime: durations.reduce((a, b) => a + b, 0) / durations.length,
          totalManaCost: totalCost,
          averageManaCost: recentMetrics.length > 0 ? totalCost / recentMetrics.length : 0
        };
      }
    }

    return stats;
  }

  private analyzeAPIPerformance(cutoff: Date): any {
    const apiMetrics = this.manaMetrics.get('mana_api_calls') || [];
    const recentMetrics = apiMetrics.filter(m => m.timestamp > cutoff);
    
    if (recentMetrics.length === 0) {
      return { totalRequests: 0 };
    }

    const durations = recentMetrics.map(m => m.duration);
    const errorCount = recentMetrics.filter(m => m.statusCode >= 400).length;
    
    // Group by endpoint
    const endpointStats: any = {};
    recentMetrics.forEach(metric => {
      if (!endpointStats[metric.endpoint]) {
        endpointStats[metric.endpoint] = {
          requests: 0,
          totalTime: 0,
          errors: 0
        };
      }
      endpointStats[metric.endpoint].requests++;
      endpointStats[metric.endpoint].totalTime += metric.duration;
      if (metric.statusCode >= 400) {
        endpointStats[metric.endpoint].errors++;
      }
    });

    // Calculate averages for each endpoint
    Object.keys(endpointStats).forEach(endpoint => {
      const stats = endpointStats[endpoint];
      stats.averageTime = stats.totalTime / stats.requests;
      stats.errorRate = stats.errors / stats.requests;
    });

    return {
      totalRequests: recentMetrics.length,
      averageResponseTime: durations.reduce((a, b) => a + b, 0) / durations.length,
      errorRate: errorCount / recentMetrics.length,
      p95ResponseTime: this.calculatePercentile(durations, 95),
      endpointStats
    };
  }

  // ============================================================================
  // PERFORMANCE OPTIMIZATION RECOMMENDATIONS
  // ============================================================================

  generateOptimizationRecommendations(): string[] {
    const recommendations: string[] = [];
    const stats = this.getManaPerformanceStats(60);

    // Cache recommendations
    if (stats.cacheStats.hitRate < 0.8) {
      recommendations.push('Consider increasing cache TTL for mana balance queries');
      recommendations.push('Implement cache warming for frequently accessed user data');
    }

    // Database recommendations
    const slowOperations = Object.entries(stats.operationStats)
      .filter(([_, opStats]: [string, any]) => opStats.averageTime > 100)
      .map(([op, _]) => op);

    if (slowOperations.length > 0) {
      recommendations.push(`Optimize slow operations: ${slowOperations.join(', ')}`);
      recommendations.push('Consider adding database indexes for mana-related queries');
    }

    // API recommendations
    if (stats.apiStats.averageResponseTime > 500) {
      recommendations.push('Consider implementing request batching for mana operations');
      recommendations.push('Add response compression for large mana data payloads');
    }

    // Enhancement recommendations
    const enhancementErrors = Object.values(stats.enhancementStats)
      .filter((stat: any) => stat.successRate < 0.95);

    if (enhancementErrors.length > 0) {
      recommendations.push('Investigate enhancement operation failures');
      recommendations.push('Add retry logic for transient enhancement errors');
    }

    return recommendations;
  }

  // ============================================================================
  // MONITORING DASHBOARD DATA
  // ============================================================================

  getDashboardData(): any {
    const stats = this.getManaPerformanceStats(60);
    const recommendations = this.generateOptimizationRecommendations();
    
    return {
      timestamp: new Date().toISOString(),
      summary: {
        totalManaOperations: Object.values(stats.operationStats)
          .reduce((sum: number, stat: any) => sum + stat.totalCalls, 0),
        averageResponseTime: stats.apiStats.averageResponseTime || 0,
        cacheHitRate: Math.round(stats.cacheStats.hitRate * 100),
        errorRate: Math.round((stats.apiStats.errorRate || 0) * 100),
        activeAlerts: stats.alerts.length
      },
      performance: {
        operations: stats.operationStats,
        enhancements: stats.enhancementStats,
        api: stats.apiStats,
        cache: stats.cacheStats
      },
      alerts: stats.alerts,
      recommendations,
      systemHealth: {
        healthy: stats.alerts.length === 0,
        score: this.calculateHealthScore(stats)
      }
    };
  }

  private calculateHealthScore(stats: any): number {
    let score = 100;
    
    // Deduct points for alerts
    score -= stats.alerts.length * 10;
    
    // Deduct points for low cache hit rate
    if (stats.cacheStats.hitRate < 0.8) {
      score -= (0.8 - stats.cacheStats.hitRate) * 50;
    }
    
    // Deduct points for slow API responses
    if (stats.apiStats.averageResponseTime > 500) {
      score -= Math.min(30, (stats.apiStats.averageResponseTime - 500) / 100 * 10);
    }
    
    return Math.max(0, Math.round(score));
  }

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  private checkPerformanceAlerts(operation: string, duration: number, success: boolean): void {
    if (!success) {
      console.error(`Mana operation failed: ${operation}`);
    }

    const threshold = this.getOperationThreshold(operation);
    if (duration > threshold) {
      console.warn(`Slow mana operation: ${operation} took ${duration}ms (threshold: ${threshold}ms)`);
    }
  }

  private getOperationThreshold(operation: string): number {
    const thresholds: Record<string, number> = {
      'getUserMana': this.alertThresholds.manaBalanceQueryTime,
      'addMana': this.alertThresholds.transactionProcessingTime,
      'spendMana': this.alertThresholds.transactionProcessingTime,
      'calculateReward': 50
    };
    
    return thresholds[operation] || 200;
  }

  private extractUserId(req: any): string | undefined {
    // Try to extract user ID from request
    return req.user?.id || req.body?.userId || req.query?.userId;
  }

  private calculatePercentile(values: number[], percentile: number): number {
    const sorted = [...values].sort((a, b) => a - b);
    const index = Math.ceil((percentile / 100) * sorted.length) - 1;
    return sorted[Math.max(0, index)];
  }

  // ============================================================================
  // CONFIGURATION
  // ============================================================================

  updateAlertThresholds(thresholds: Partial<typeof this.alertThresholds>): void {
    this.alertThresholds = { ...this.alertThresholds, ...thresholds };
  }

  getAlertThresholds(): typeof this.alertThresholds {
    return { ...this.alertThresholds };
  }

  // ============================================================================
  // CLEANUP
  // ============================================================================

  clearMetrics(): void {
    this.manaMetrics.clear();
  }

  exportMetrics(): any {
    const exported: any = {};
    this.manaMetrics.forEach((value, key) => {
      exported[key] = value.slice(-100); // Last 100 entries per metric
    });
    return {
      timestamp: new Date().toISOString(),
      metrics: exported,
      thresholds: this.alertThresholds
    };
  }
}

// Singleton instance
export const manaPerformanceMonitor = ManaPerformanceMonitor.getInstance();

// Utility function to create monitoring wrapper for mana functions
export function withManaPerformanceMonitoring<T extends (...args: any[]) => Promise<any>>(
  operation: string,
  fn: T,
  extractUserId?: (...args: Parameters<T>) => string
): T {
  return (async (...args: Parameters<T>) => {
    const startTime = Date.now();
    const userId = extractUserId ? extractUserId(...args) : 'unknown';
    let success = true;
    let result: any;

    try {
      result = await fn(...args);
      return result;
    } catch (error) {
      success = false;
      throw error;
    } finally {
      const duration = Date.now() - startTime;
      manaPerformanceMonitor.recordManaOperation(
        operation as any,
        userId,
        duration,
        success,
        { args: args.slice(0, 2) } // Only log first 2 args for privacy
      );
    }
  }) as T;
}

export default manaPerformanceMonitor;