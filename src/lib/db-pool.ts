import { neon, neonConfig } from '@neondatabase/serverless';

// Configure connection pooling for optimal performance
neonConfig.fetchConnectionCache = true;
neonConfig.useSecureWebSocket = true;

// Connection configuration
const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL || '';

if (!connectionString) {
  console.warn('Warning: DATABASE_URL or POSTGRES_URL environment variable is not set. Database operations will fail.');
}

// Create optimized SQL function
export const sql = neon(connectionString);

// Enhanced database interface
export const db = {
  query: sql,
  
  // Execute query with automatic retry and connection management
  async execute<T = any>(queryTemplate: TemplateStringsArray, ...params: any[]): Promise<T[]> {
    const maxRetries = 3;
    let lastError: Error | null = null;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const result = await sql(queryTemplate, ...params);
        return result as T[];
      } catch (error) {
        lastError = error as Error;
        console.warn(`Database query attempt ${attempt} failed:`, error);
        
        // Wait before retry (exponential backoff)
        if (attempt < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
        }
      }
    }
    
    throw lastError || new Error('Database query failed after all retries');
  },
  
  // Execute transaction with automatic rollback on error
  async transaction<T>(callback: (sqlClient: any) => Promise<T>): Promise<T> {
    try {
      await sql`BEGIN`;
      const result = await callback(sql);
      await sql`COMMIT`;
      return result;
    } catch (error) {
      await sql`ROLLBACK`;
      throw error;
    }
  },
  
  // Health check function
  async healthCheck(): Promise<boolean> {
    try {
      await sql`SELECT 1`;
      return true;
    } catch (error) {
      console.error('Database health check failed:', error);
      return false;
    }
  },
  
  // Get connection statistics (simplified)
  getPoolStats() {
    return {
      totalCount: 1,
      idleCount: 0,
      waitingCount: 0,
    };
  },
  
  // Close connections (simplified)
  async close(): Promise<void> {
    // Neon serverless doesn't require explicit connection closing
    console.log('Database connections closed');
  }
};

// Performance monitoring utilities
export class DatabaseMonitor {
  private static queryTimes: Map<string, number[]> = new Map();
  private static slowQueryThreshold = 1000; // 1 second
  
  static startQuery(queryId: string): () => void {
    const startTime = Date.now();
    
    return () => {
      const duration = Date.now() - startTime;
      
      // Track query times
      if (!this.queryTimes.has(queryId)) {
        this.queryTimes.set(queryId, []);
      }
      this.queryTimes.get(queryId)!.push(duration);
      
      // Log slow queries
      if (duration > this.slowQueryThreshold) {
        console.warn(`Slow query detected: ${queryId} took ${duration}ms`);
      }
    };
  }
  
  static getQueryStats(queryId: string) {
    const times = this.queryTimes.get(queryId) || [];
    if (times.length === 0) return null;
    
    const sum = times.reduce((a, b) => a + b, 0);
    const avg = sum / times.length;
    const min = Math.min(...times);
    const max = Math.max(...times);
    
    return {
      count: times.length,
      average: avg,
      min,
      max,
      total: sum
    };
  }
  
  static getAllStats() {
    const stats: Record<string, any> = {};
    const entries = Array.from(this.queryTimes.keys());
    for (const queryId of entries) {
      stats[queryId] = this.getQueryStats(queryId);
    }
    return stats;
  }
  
  static clearStats() {
    this.queryTimes.clear();
  }
  
  static setSlowQueryThreshold(ms: number) {
    this.slowQueryThreshold = ms;
  }
}

// Cached query utilities
export class QueryCache {
  private static cache: Map<string, { data: any; timestamp: number; ttl: number }> = new Map();
  
  static async get<T>(
    key: string, 
    queryFn: () => Promise<T>, 
    ttlMs: number = 300000 // 5 minutes default
  ): Promise<T> {
    const cached = this.cache.get(key);
    const now = Date.now();
    
    if (cached && (now - cached.timestamp) < cached.ttl) {
      return cached.data;
    }
    
    const data = await queryFn();
    this.cache.set(key, { data, timestamp: now, ttl: ttlMs });
    
    return data;
  }
  
  static invalidate(key: string) {
    this.cache.delete(key);
  }
  
  static invalidatePattern(pattern: string) {
    const regex = new RegExp(pattern);
    const keys = Array.from(this.cache.keys());
    for (const key of keys) {
      if (regex.test(key)) {
        this.cache.delete(key);
      }
    }
  }
  
  static clear() {
    this.cache.clear();
  }
  
  static getStats() {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys())
    };
  }
}

// Database performance utilities
export const dbPerformance = {
  // Monitor query performance
  monitorQuery<T>(queryId: string, queryFn: () => Promise<T>): Promise<T> {
    const endTimer = DatabaseMonitor.startQuery(queryId);
    return queryFn().finally(endTimer);
  },
  
  // Execute query with caching
  async cachedQuery<T>(
    cacheKey: string,
    queryFn: () => Promise<T>,
    ttlMs: number = 300000
  ): Promise<T> {
    return QueryCache.get(cacheKey, queryFn, ttlMs);
  },
  
  // Batch multiple queries for better performance
  async batchQueries<T>(queries: (() => Promise<T>)[]): Promise<T[]> {
    return Promise.all(queries.map(query => query()));
  },
  
  // Get database performance metrics
  async getMetrics() {
    try {
      const [
        connectionStats,
        queryStats,
        cacheStats,
        poolStats
      ] = await Promise.all([
        sql`SELECT count(*) as active_connections FROM pg_stat_activity WHERE state = 'active'`,
        sql`SELECT count(*) as total_queries FROM pg_stat_statements`.catch(() => [{ total_queries: 'N/A' }]),
        Promise.resolve(QueryCache.getStats()),
        Promise.resolve(db.getPoolStats())
      ]);
      
      return {
        connections: connectionStats[0],
        queries: queryStats[0],
        cache: cacheStats,
        pool: poolStats,
        queryPerformance: DatabaseMonitor.getAllStats()
      };
    } catch (error) {
      console.error('Failed to get database metrics:', error);
      return null;
    }
  }
};

// Graceful shutdown handler
process.on('SIGTERM', async () => {
  console.log('Closing database connections...');
  await db.close();
});

process.on('SIGINT', async () => {
  console.log('Closing database connections...');
  await db.close();
});

export default db;