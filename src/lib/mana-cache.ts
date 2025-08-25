import { cacheManager } from './cache-manager';
import { performanceMonitor } from './performance-monitor';

/**
 * Specialized cache for Mana system data
 * Provides optimized caching for frequently accessed mana-related data
 */
export class ManaCache {
  private static readonly PREFIXES = {
    USER_BALANCE: 'mana:balance:',
    USER_STATS: 'mana:stats:',
    WISH_ENHANCEMENTS: 'mana:enhancements:',
    ENHANCEMENT_COSTS: 'mana:costs:',
    LEADERBOARD: 'mana:leaderboard:',
    TRANSACTION_HISTORY: 'mana:transactions:',
    SYSTEM_METRICS: 'mana:metrics:',
    PRIORITY_WISHES: 'mana:priority_wishes:',
    AURA_WISHES: 'mana:aura_wishes:'
  };

  private static readonly TTL = {
    USER_BALANCE: 2 * 60 * 1000, // 2 minutes - frequently changing
    USER_STATS: 5 * 60 * 1000, // 5 minutes - less frequently changing
    WISH_ENHANCEMENTS: 10 * 60 * 1000, // 10 minutes - rarely changing
    ENHANCEMENT_COSTS: 30 * 60 * 1000, // 30 minutes - static data
    LEADERBOARD: 5 * 60 * 1000, // 5 minutes - for performance
    TRANSACTION_HISTORY: 3 * 60 * 1000, // 3 minutes - recent data
    SYSTEM_METRICS: 1 * 60 * 1000, // 1 minute - real-time monitoring
    PRIORITY_WISHES: 2 * 60 * 1000, // 2 minutes - frequently accessed
    AURA_WISHES: 5 * 60 * 1000 // 5 minutes - less frequently changing
  };

  // ============================================================================
  // USER BALANCE CACHING
  // ============================================================================

  static async getUserBalance(userId: string, fetchFn: () => Promise<number>): Promise<number> {
    const key = `${this.PREFIXES.USER_BALANCE}${userId}`;
    const startTime = Date.now();
    
    try {
      const result = await cacheManager.getOrSet(key, fetchFn, this.TTL.USER_BALANCE);
      
      performanceMonitor.recordMetric(
        'mana_cache_balance_access',
        Date.now() - startTime,
        'ms',
        { userId, hit: cacheManager.has(key).toString() }
      );
      
      return result;
    } catch (error) {
      performanceMonitor.recordError(
        `Mana balance cache error for user ${userId}`,
        error instanceof Error ? error.stack : String(error)
      );
      throw error;
    }
  }

  static setUserBalance(userId: string, balance: number): void {
    const key = `${this.PREFIXES.USER_BALANCE}${userId}`;
    cacheManager.set(key, balance, this.TTL.USER_BALANCE);
    
    performanceMonitor.recordMetric(
      'mana_cache_balance_set',
      1,
      'count',
      { userId, balance: balance.toString() }
    );
  }

  static invalidateUserBalance(userId: string): void {
    const key = `${this.PREFIXES.USER_BALANCE}${userId}`;
    cacheManager.delete(key);
    
    // Also invalidate related caches
    this.invalidateUserStats(userId);
    this.invalidateLeaderboard();
  }

  // ============================================================================
  // USER STATISTICS CACHING
  // ============================================================================

  static async getUserStats(
    userId: string, 
    fetchFn: () => Promise<any>
  ): Promise<any> {
    const key = `${this.PREFIXES.USER_STATS}${userId}`;
    return cacheManager.getOrSet(key, fetchFn, this.TTL.USER_STATS);
  }

  static setUserStats(userId: string, stats: any): void {
    const key = `${this.PREFIXES.USER_STATS}${userId}`;
    cacheManager.set(key, stats, this.TTL.USER_STATS);
  }

  static invalidateUserStats(userId: string): void {
    const key = `${this.PREFIXES.USER_STATS}${userId}`;
    cacheManager.delete(key);
  }

  // ============================================================================
  // WISH ENHANCEMENTS CACHING
  // ============================================================================

  static async getWishEnhancements(
    wishId: string, 
    fetchFn: () => Promise<any[]>
  ): Promise<any[]> {
    const key = `${this.PREFIXES.WISH_ENHANCEMENTS}${wishId}`;
    return cacheManager.getOrSet(key, fetchFn, this.TTL.WISH_ENHANCEMENTS);
  }

  static setWishEnhancements(wishId: string, enhancements: any[]): void {
    const key = `${this.PREFIXES.WISH_ENHANCEMENTS}${wishId}`;
    cacheManager.set(key, enhancements, this.TTL.WISH_ENHANCEMENTS);
  }

  static invalidateWishEnhancements(wishId: string): void {
    const key = `${this.PREFIXES.WISH_ENHANCEMENTS}${wishId}`;
    cacheManager.delete(key);
    
    // Also invalidate priority and aura wish lists
    this.invalidatePriorityWishes();
    this.invalidateAuraWishes();
  }

  // ============================================================================
  // ENHANCEMENT COSTS CACHING
  // ============================================================================

  static async getEnhancementCosts(
    type: string,
    fetchFn: () => Promise<Record<string, number>>
  ): Promise<Record<string, number>> {
    const key = `${this.PREFIXES.ENHANCEMENT_COSTS}${type}`;
    return cacheManager.getOrSet(key, fetchFn, this.TTL.ENHANCEMENT_COSTS);
  }

  static setEnhancementCosts(type: string, costs: Record<string, number>): void {
    const key = `${this.PREFIXES.ENHANCEMENT_COSTS}${type}`;
    cacheManager.set(key, costs, this.TTL.ENHANCEMENT_COSTS);
  }

  // ============================================================================
  // LEADERBOARD CACHING
  // ============================================================================

  static async getManaLeaderboard(
    type: 'balance' | 'spent' | 'earned',
    limit: number,
    fetchFn: () => Promise<any[]>
  ): Promise<any[]> {
    const key = `${this.PREFIXES.LEADERBOARD}${type}:${limit}`;
    return cacheManager.getOrSet(key, fetchFn, this.TTL.LEADERBOARD);
  }

  static invalidateLeaderboard(): void {
    cacheManager.invalidatePattern(`^${this.PREFIXES.LEADERBOARD}`);
  }

  // ============================================================================
  // TRANSACTION HISTORY CACHING
  // ============================================================================

  static async getUserTransactions(
    userId: string,
    limit: number,
    fetchFn: () => Promise<any[]>
  ): Promise<any[]> {
    const key = `${this.PREFIXES.TRANSACTION_HISTORY}${userId}:${limit}`;
    return cacheManager.getOrSet(key, fetchFn, this.TTL.TRANSACTION_HISTORY);
  }

  static invalidateUserTransactions(userId: string): void {
    cacheManager.invalidatePattern(`${this.PREFIXES.TRANSACTION_HISTORY}${userId}:`);
  }

  // ============================================================================
  // SYSTEM METRICS CACHING
  // ============================================================================

  static async getSystemMetrics(
    metricType: string,
    fetchFn: () => Promise<any>
  ): Promise<any> {
    const key = `${this.PREFIXES.SYSTEM_METRICS}${metricType}`;
    return cacheManager.getOrSet(key, fetchFn, this.TTL.SYSTEM_METRICS);
  }

  static invalidateSystemMetrics(): void {
    cacheManager.invalidatePattern(`^${this.PREFIXES.SYSTEM_METRICS}`);
  }

  // ============================================================================
  // PRIORITY WISHES CACHING
  // ============================================================================

  static async getPriorityWishes(
    userId: string,
    minPriority: number,
    fetchFn: () => Promise<any[]>
  ): Promise<any[]> {
    const key = `${this.PREFIXES.PRIORITY_WISHES}${userId}:${minPriority}`;
    return cacheManager.getOrSet(key, fetchFn, this.TTL.PRIORITY_WISHES);
  }

  static invalidatePriorityWishes(): void {
    cacheManager.invalidatePattern(`^${this.PREFIXES.PRIORITY_WISHES}`);
  }

  // ============================================================================
  // AURA WISHES CACHING
  // ============================================================================

  static async getAuraWishes(
    userId: string,
    auraType?: string,
    fetchFn?: () => Promise<any[]>
  ): Promise<any[]> {
    const key = `${this.PREFIXES.AURA_WISHES}${userId}:${auraType || 'all'}`;
    if (!fetchFn) {
      return cacheManager.get(key) || [];
    }
    return cacheManager.getOrSet(key, fetchFn, this.TTL.AURA_WISHES);
  }

  static invalidateAuraWishes(): void {
    cacheManager.invalidatePattern(`^${this.PREFIXES.AURA_WISHES}`);
  }

  // ============================================================================
  // BULK OPERATIONS
  // ============================================================================

  static async preloadUserData(userId: string, fetchFunctions: {
    balance?: () => Promise<number>;
    stats?: () => Promise<any>;
    transactions?: () => Promise<any[]>;
  }): Promise<void> {
    const preloadTasks = [];

    if (fetchFunctions.balance) {
      preloadTasks.push({
        key: `${this.PREFIXES.USER_BALANCE}${userId}`,
        fetchFn: fetchFunctions.balance,
        ttl: this.TTL.USER_BALANCE
      });
    }

    if (fetchFunctions.stats) {
      preloadTasks.push({
        key: `${this.PREFIXES.USER_STATS}${userId}`,
        fetchFn: fetchFunctions.stats,
        ttl: this.TTL.USER_STATS
      });
    }

    if (fetchFunctions.transactions) {
      preloadTasks.push({
        key: `${this.PREFIXES.TRANSACTION_HISTORY}${userId}:50`,
        fetchFn: fetchFunctions.transactions,
        ttl: this.TTL.TRANSACTION_HISTORY
      });
    }

    await cacheManager.preload(preloadTasks);
    
    performanceMonitor.recordMetric(
      'mana_cache_preload',
      preloadTasks.length,
      'count',
      { userId }
    );
  }

  static invalidateAllUserData(userId: string): void {
    const patterns = [
      `${this.PREFIXES.USER_BALANCE}${userId}`,
      `${this.PREFIXES.USER_STATS}${userId}`,
      `${this.PREFIXES.TRANSACTION_HISTORY}${userId}:`,
      `${this.PREFIXES.PRIORITY_WISHES}${userId}:`,
      `${this.PREFIXES.AURA_WISHES}${userId}:`
    ];

    patterns.forEach(pattern => {
      if (pattern.endsWith(':')) {
        cacheManager.invalidatePattern(pattern);
      } else {
        cacheManager.delete(pattern);
      }
    });

    // Also invalidate system-wide caches that might include this user
    this.invalidateLeaderboard();
    this.invalidateSystemMetrics();
    
    performanceMonitor.recordMetric(
      'mana_cache_user_invalidation',
      1,
      'count',
      { userId }
    );
  }

  // ============================================================================
  // CACHE WARMING
  // ============================================================================

  static async warmCache(popularUserIds: string[]): Promise<void> {
    const startTime = Date.now();
    
    try {
      // Warm up enhancement costs (static data)
      const costTasks: Array<{ key: string; fetchFn: () => Promise<any>; ttl?: number }> = [
        {
          key: `${this.PREFIXES.ENHANCEMENT_COSTS}priority`,
          fetchFn: async () => ({ 1: 10, 2: 25, 3: 50, 4: 100, 5: 200 }),
          ttl: this.TTL.ENHANCEMENT_COSTS
        },
        {
          key: `${this.PREFIXES.ENHANCEMENT_COSTS}aura`,
          fetchFn: async () => ({ aura: 50 }),
          ttl: this.TTL.ENHANCEMENT_COSTS
        }
      ];

      await cacheManager.preload(costTasks);

      // Warm up popular user data
      for (const userId of popularUserIds.slice(0, 10)) { // Limit to top 10
        try {
          // These would need actual fetch functions in real implementation
          await this.preloadUserData(userId, {
            // balance: () => manaEngine.getUserMana(userId),
            // stats: () => manaEngine.getUserManaStats(userId)
          });
        } catch (error) {
          console.warn(`Failed to warm cache for user ${userId}:`, error);
        }
      }

      const warmupTime = Date.now() - startTime;
      performanceMonitor.recordMetric(
        'mana_cache_warmup_time',
        warmupTime,
        'ms',
        { userCount: popularUserIds.length.toString() }
      );

      console.log(`Mana cache warmed up in ${warmupTime}ms for ${popularUserIds.length} users`);
    } catch (error) {
      performanceMonitor.recordError(
        'Mana cache warmup failed',
        error instanceof Error ? error.stack : String(error)
      );
      throw error;
    }
  }

  // ============================================================================
  // CACHE STATISTICS
  // ============================================================================

  static getCacheStats(): {
    totalManaEntries: number;
    hitRate: number;
    memoryUsage: number;
    topManaKeys: Array<{ key: string; hits: number }>;
  } {
    const allStats = cacheManager.getDetailedStats();
    
    // Filter for mana-related entries
    const manaEntries = allStats.entries.filter(entry => 
      Object.values(this.PREFIXES).some(prefix => entry.key.startsWith(prefix))
    );

    const totalHits = manaEntries.reduce((sum, entry) => sum + entry.hits, 0);
    const totalRequests = totalHits + manaEntries.length; // Simplified calculation
    
    return {
      totalManaEntries: manaEntries.length,
      hitRate: totalRequests > 0 ? totalHits / totalRequests : 0,
      memoryUsage: manaEntries.reduce((sum, entry) => sum + entry.size, 0),
      topManaKeys: manaEntries
        .sort((a, b) => b.hits - a.hits)
        .slice(0, 10)
        .map(entry => ({ key: entry.key, hits: entry.hits }))
    };
  }

  // ============================================================================
  // CACHE MAINTENANCE
  // ============================================================================

  static performMaintenance(): void {
    // Clear expired entries
    const stats = this.getCacheStats();
    
    performanceMonitor.recordMetric(
      'mana_cache_maintenance',
      1,
      'count',
      { 
        entriesCount: stats.totalManaEntries.toString(),
        memoryUsage: stats.memoryUsage.toString()
      }
    );

    console.log(`Mana cache maintenance: ${stats.totalManaEntries} entries, ${Math.round(stats.memoryUsage / 1024)}KB memory`);
  }

  // ============================================================================
  // CACHE INVALIDATION STRATEGIES
  // ============================================================================

  static onManaTransaction(userId: string, transactionType: 'earn' | 'spend'): void {
    // Invalidate user-specific caches
    this.invalidateUserBalance(userId);
    this.invalidateUserStats(userId);
    this.invalidateUserTransactions(userId);
    
    // Invalidate system-wide caches
    this.invalidateLeaderboard();
    this.invalidateSystemMetrics();
    
    performanceMonitor.recordMetric(
      'mana_cache_transaction_invalidation',
      1,
      'count',
      { userId, transactionType }
    );
  }

  static onWishEnhancement(wishId: string, userId: string, enhancementType: 'priority' | 'aura'): void {
    // Invalidate wish-specific caches
    this.invalidateWishEnhancements(wishId);
    
    // Invalidate user-specific caches
    this.invalidateUserBalance(userId);
    this.invalidateUserStats(userId);
    this.invalidateUserTransactions(userId);
    
    // Invalidate enhancement-specific caches
    if (enhancementType === 'priority') {
      this.invalidatePriorityWishes();
    } else {
      this.invalidateAuraWishes();
    }
    
    // Invalidate system-wide caches
    this.invalidateLeaderboard();
    this.invalidateSystemMetrics();
    
    performanceMonitor.recordMetric(
      'mana_cache_enhancement_invalidation',
      1,
      'count',
      { wishId, userId, enhancementType }
    );
  }
}

export default ManaCache;