import { performanceMonitor } from './performance-monitor';

export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
  hits: number;
  lastAccessed: number;
}

export interface CacheStats {
  totalEntries: number;
  totalHits: number;
  totalMisses: number;
  hitRate: number;
  memoryUsage: number;
  topKeys: Array<{ key: string; hits: number; size: number }>;
}

export interface CacheConfig {
  maxSize: number;
  defaultTTL: number;
  cleanupInterval: number;
  enableMetrics: boolean;
}

class CacheManager {
  private static instance: CacheManager;
  private cache: Map<string, CacheEntry<any>> = new Map();
  private stats = {
    hits: 0,
    misses: 0,
    sets: 0,
    deletes: 0,
    evictions: 0
  };
  
  private config: CacheConfig = {
    maxSize: 1000,
    defaultTTL: 5 * 60 * 1000, // 5 minutes
    cleanupInterval: 60 * 1000, // 1 minute
    enableMetrics: true
  };

  private cleanupTimer?: NodeJS.Timeout;

  static getInstance(): CacheManager {
    if (!CacheManager.instance) {
      CacheManager.instance = new CacheManager();
    }
    return CacheManager.instance;
  }

  constructor() {
    this.startCleanupTimer();
  }

  // Get value from cache
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    
    if (!entry) {
      this.stats.misses++;
      if (this.config.enableMetrics) {
        performanceMonitor.recordMetric('cache_miss', 1, 'count', { key });
      }
      return null;
    }

    // Check if expired
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      this.stats.misses++;
      if (this.config.enableMetrics) {
        performanceMonitor.recordMetric('cache_miss_expired', 1, 'count', { key });
      }
      return null;
    }

    // Update access stats
    entry.hits++;
    entry.lastAccessed = Date.now();
    this.stats.hits++;
    
    if (this.config.enableMetrics) {
      performanceMonitor.recordMetric('cache_hit', 1, 'count', { key });
    }

    return entry.data;
  }

  // Set value in cache
  set<T>(key: string, data: T, ttl?: number): void {
    const actualTTL = ttl || this.config.defaultTTL;
    
    // Check if we need to evict entries
    if (this.cache.size >= this.config.maxSize && !this.cache.has(key)) {
      this.evictLRU();
    }

    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      ttl: actualTTL,
      hits: 0,
      lastAccessed: Date.now()
    };

    this.cache.set(key, entry);
    this.stats.sets++;

    if (this.config.enableMetrics) {
      const dataSize = this.estimateSize(data);
      performanceMonitor.recordMetric('cache_set', 1, 'count', { key });
      performanceMonitor.recordMetric('cache_entry_size', dataSize, 'bytes', { key });
    }
  }

  // Delete from cache
  delete(key: string): boolean {
    const deleted = this.cache.delete(key);
    if (deleted) {
      this.stats.deletes++;
      if (this.config.enableMetrics) {
        performanceMonitor.recordMetric('cache_delete', 1, 'count', { key });
      }
    }
    return deleted;
  }

  // Check if key exists and is not expired
  has(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;
    
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return false;
    }
    
    return true;
  }

  // Clear all cache entries
  clear(): void {
    const size = this.cache.size;
    this.cache.clear();
    this.stats.deletes += size;
    
    if (this.config.enableMetrics) {
      performanceMonitor.recordMetric('cache_clear', size, 'count');
    }
  }

  // Get or set pattern - fetch data if not in cache
  async getOrSet<T>(
    key: string,
    fetchFn: () => Promise<T>,
    ttl?: number
  ): Promise<T> {
    const cached = this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    const startTime = Date.now();
    try {
      const data = await fetchFn();
      this.set(key, data, ttl);
      
      if (this.config.enableMetrics) {
        const fetchTime = Date.now() - startTime;
        performanceMonitor.recordMetric('cache_fetch_time', fetchTime, 'ms', { key });
      }
      
      return data;
    } catch (error) {
      if (this.config.enableMetrics) {
        performanceMonitor.recordError(
          `Cache fetch failed for key: ${key}`,
          error instanceof Error ? error.stack : String(error)
        );
      }
      throw error;
    }
  }

  // Invalidate cache entries by pattern
  invalidatePattern(pattern: string | RegExp): number {
    const regex = typeof pattern === 'string' ? new RegExp(pattern) : pattern;
    let count = 0;
    
    const keys = Array.from(this.cache.keys());
    for (const key of keys) {
      if (regex.test(key)) {
        this.cache.delete(key);
        count++;
      }
    }
    
    this.stats.deletes += count;
    
    if (this.config.enableMetrics) {
      performanceMonitor.recordMetric('cache_pattern_invalidation', count, 'count', { 
        pattern: pattern.toString() 
      });
    }
    
    return count;
  }

  // Get cache statistics
  getStats(): CacheStats {
    const totalRequests = this.stats.hits + this.stats.misses;
    const hitRate = totalRequests > 0 ? this.stats.hits / totalRequests : 0;
    
    // Calculate memory usage estimate
    let memoryUsage = 0;
    const topKeys: Array<{ key: string; hits: number; size: number }> = [];
    
    const entries = Array.from(this.cache.entries());
    for (const [key, entry] of entries) {
      const size = this.estimateSize(entry);
      memoryUsage += size;
      topKeys.push({ key, hits: entry.hits, size });
    }
    
    // Sort by hits descending
    topKeys.sort((a, b) => b.hits - a.hits);
    
    return {
      totalEntries: this.cache.size,
      totalHits: this.stats.hits,
      totalMisses: this.stats.misses,
      hitRate,
      memoryUsage,
      topKeys: topKeys.slice(0, 10)
    };
  }

  // Get detailed cache information
  getDetailedStats() {
    return {
      ...this.getStats(),
      config: this.config,
      internalStats: { ...this.stats },
      entries: Array.from(this.cache.entries()).map(([key, entry]) => ({
        key,
        timestamp: new Date(entry.timestamp),
        ttl: entry.ttl,
        hits: entry.hits,
        lastAccessed: new Date(entry.lastAccessed),
        expired: Date.now() - entry.timestamp > entry.ttl,
        size: this.estimateSize(entry)
      }))
    };
  }

  // Update cache configuration
  updateConfig(newConfig: Partial<CacheConfig>): void {
    this.config = { ...this.config, ...newConfig };
    
    // Restart cleanup timer if interval changed
    if (newConfig.cleanupInterval) {
      this.stopCleanupTimer();
      this.startCleanupTimer();
    }
  }

  // Preload cache with data
  async preload<T>(entries: Array<{ key: string; fetchFn: () => Promise<T>; ttl?: number }>): Promise<void> {
    const startTime = Date.now();
    const promises = entries.map(async ({ key, fetchFn, ttl }) => {
      try {
        const data = await fetchFn();
        this.set(key, data, ttl);
        return { key, success: true };
      } catch (error) {
        console.warn(`Failed to preload cache key: ${key}`, error);
        return { key, success: false, error };
      }
    });

    const results = await Promise.allSettled(promises);
    const successful = results.filter(r => r.status === 'fulfilled').length;
    
    if (this.config.enableMetrics) {
      const preloadTime = Date.now() - startTime;
      performanceMonitor.recordMetric('cache_preload_time', preloadTime, 'ms');
      performanceMonitor.recordMetric('cache_preload_success', successful, 'count');
      performanceMonitor.recordMetric('cache_preload_total', entries.length, 'count');
    }
  }

  // Export cache data for backup/restore
  export(): { [key: string]: any } {
    const exported: { [key: string]: any } = {};
    
    const entries = Array.from(this.cache.entries());
    for (const [key, entry] of entries) {
      // Only export non-expired entries
      if (Date.now() - entry.timestamp <= entry.ttl) {
        exported[key] = {
          data: entry.data,
          timestamp: entry.timestamp,
          ttl: entry.ttl
        };
      }
    }
    
    return exported;
  }

  // Import cache data from backup
  import(data: { [key: string]: any }): number {
    let imported = 0;
    
    for (const [key, entry] of Object.entries(data)) {
      if (entry && typeof entry === 'object' && 'data' in entry) {
        // Check if entry is still valid
        const age = Date.now() - (entry.timestamp || 0);
        const ttl = entry.ttl || this.config.defaultTTL;
        
        if (age < ttl) {
          this.cache.set(key, {
            data: entry.data,
            timestamp: entry.timestamp || Date.now(),
            ttl,
            hits: 0,
            lastAccessed: Date.now()
          });
          imported++;
        }
      }
    }
    
    if (this.config.enableMetrics) {
      performanceMonitor.recordMetric('cache_import', imported, 'count');
    }
    
    return imported;
  }

  // Private methods
  private evictLRU(): void {
    let oldestKey: string | null = null;
    let oldestTime = Date.now();
    
    const entries = Array.from(this.cache.entries());
    for (const [key, entry] of entries) {
      if (entry.lastAccessed < oldestTime) {
        oldestTime = entry.lastAccessed;
        oldestKey = key;
      }
    }
    
    if (oldestKey) {
      this.cache.delete(oldestKey);
      this.stats.evictions++;
      
      if (this.config.enableMetrics) {
        performanceMonitor.recordMetric('cache_eviction', 1, 'count', { key: oldestKey });
      }
    }
  }

  private cleanup(): void {
    const now = Date.now();
    let cleaned = 0;
    
    const entries = Array.from(this.cache.entries());
    for (const [key, entry] of entries) {
      if (now - entry.timestamp > entry.ttl) {
        this.cache.delete(key);
        cleaned++;
      }
    }
    
    if (cleaned > 0 && this.config.enableMetrics) {
      performanceMonitor.recordMetric('cache_cleanup', cleaned, 'count');
    }
  }

  private startCleanupTimer(): void {
    this.cleanupTimer = setInterval(() => {
      this.cleanup();
    }, this.config.cleanupInterval);
  }

  private stopCleanupTimer(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = undefined;
    }
  }

  private estimateSize(obj: any): number {
    try {
      return JSON.stringify(obj).length * 2; // Rough estimate (UTF-16)
    } catch {
      return 1000; // Default estimate for non-serializable objects
    }
  }

  // Cleanup on process exit
  destroy(): void {
    this.stopCleanupTimer();
    this.clear();
  }
}

// Singleton instance
export const cacheManager = CacheManager.getInstance();

// Specialized cache instances for different data types
export class UserCache {
  private static readonly PREFIX = 'user:';
  private static readonly TTL = 10 * 60 * 1000; // 10 minutes

  static async getUser(userId: string, fetchFn: () => Promise<any>) {
    return cacheManager.getOrSet(`${this.PREFIX}${userId}`, fetchFn, this.TTL);
  }

  static setUser(userId: string, userData: any) {
    cacheManager.set(`${this.PREFIX}${userId}`, userData, this.TTL);
  }

  static invalidateUser(userId: string) {
    cacheManager.delete(`${this.PREFIX}${userId}`);
  }

  static invalidateAllUsers() {
    return cacheManager.invalidatePattern(`^${this.PREFIX}`);
  }
}

export class QuestCache {
  private static readonly PREFIX = 'quest:';
  private static readonly LIST_PREFIX = 'quest_list:';
  private static readonly TTL = 5 * 60 * 1000; // 5 minutes

  static async getQuest(questId: string, fetchFn: () => Promise<any>) {
    return cacheManager.getOrSet(`${this.PREFIX}${questId}`, fetchFn, this.TTL);
  }

  static async getQuestList(userId: string, status: string, fetchFn: () => Promise<any>) {
    return cacheManager.getOrSet(`${this.LIST_PREFIX}${userId}:${status}`, fetchFn, this.TTL);
  }

  static invalidateQuest(questId: string) {
    cacheManager.delete(`${this.PREFIX}${questId}`);
  }

  static invalidateUserQuests(userId: string) {
    return cacheManager.invalidatePattern(`${this.LIST_PREFIX}${userId}:`);
  }

  static invalidateAllQuests() {
    return cacheManager.invalidatePattern(`^${this.PREFIX}`);
  }
}

export class WishCache {
  private static readonly PREFIX = 'wish:';
  private static readonly LIST_PREFIX = 'wish_list:';
  private static readonly TTL = 3 * 60 * 1000; // 3 minutes

  static async getWishList(userId: string, type: string, fetchFn: () => Promise<any>) {
    return cacheManager.getOrSet(`${this.LIST_PREFIX}${userId}:${type}`, fetchFn, this.TTL);
  }

  static invalidateUserWishes(userId: string) {
    return cacheManager.invalidatePattern(`${this.LIST_PREFIX}${userId}:`);
  }

  static invalidateAllWishes() {
    return cacheManager.invalidatePattern(`^${this.PREFIX}`);
  }
}

// Cleanup on process exit
process.on('SIGTERM', () => {
  cacheManager.destroy();
});

process.on('SIGINT', () => {
  cacheManager.destroy();
});

export default cacheManager;