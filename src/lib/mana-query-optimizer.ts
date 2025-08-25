import { db } from './db-pool';
import ManaCache from './mana-cache';
import { manaPerformanceMonitor } from './mana-performance-monitor';

/**
 * Query optimizer for Mana system database operations
 * Provides optimized queries for common mana-related operations
 */
export class ManaQueryOptimizer {
  private static instance: ManaQueryOptimizer;

  static getInstance(): ManaQueryOptimizer {
    if (!ManaQueryOptimizer.instance) {
      ManaQueryOptimizer.instance = new ManaQueryOptimizer();
    }
    return ManaQueryOptimizer.instance;
  }

  // ============================================================================
  // OPTIMIZED WISH QUERIES WITH PRIORITY SORTING
  // ============================================================================

  /**
   * Get wishes sorted by priority with optimized query
   * Uses covering indexes and efficient sorting
   */
  async getWishesByPriority(
    userId: string,
    status: 'active' | 'completed' | 'cancelled' = 'active',
    limit: number = 50,
    offset: number = 0
  ): Promise<any[]> {
    const cacheKey = `priority_wishes:${userId}:${status}:${limit}:${offset}`;
    
    return ManaCache.getPriorityWishes(userId, 1, async () => {
      const startTime = Date.now();
      
      try {
        // Optimized query using covering index
        const result = await db.execute`
          SELECT 
            w.id,
            w.description,
            w.author_id,
            w.assignee_id,
            w.status,
            w.category,
            w.priority,
            w.aura,
            w.created_at,
            we.level as enhancement_level,
            we.cost as enhancement_cost,
            we.applied_at as enhanced_at
          FROM wishes w
          LEFT JOIN wish_enhancements we ON w.id = we.wish_id AND we.type = 'priority'
          WHERE w.author_id = ${userId} 
            AND w.status = ${status}
          ORDER BY w.priority DESC, w.created_at DESC
          LIMIT ${limit} OFFSET ${offset}
        `;

        manaPerformanceMonitor.recordDatabaseQuery(
          'getWishesByPriority',
          Date.now() - startTime,
          true,
          result.length
        );

        return result;
      } catch (error) {
        manaPerformanceMonitor.recordDatabaseQuery(
          'getWishesByPriority',
          Date.now() - startTime,
          false
        );
        throw error;
      }
    });
  }

  /**
   * Get wishes with aura effects using optimized query
   */
  async getWishesWithAura(
    userId: string,
    auraType?: string,
    limit: number = 50
  ): Promise<any[]> {
    return ManaCache.getAuraWishes(userId, auraType, async () => {
      const startTime = Date.now();
      
      try {
        let query;
        if (auraType) {
          query = db.execute`
            SELECT 
              w.id,
              w.description,
              w.author_id,
              w.priority,
              w.aura,
              w.created_at,
              we.aura_type,
              we.cost as aura_cost,
              we.applied_at as aura_applied_at
            FROM wishes w
            JOIN wish_enhancements we ON w.id = we.wish_id AND we.type = 'aura'
            WHERE w.author_id = ${userId} 
              AND w.status = 'active'
              AND we.aura_type = ${auraType}
            ORDER BY w.priority DESC, w.created_at DESC
            LIMIT ${limit}
          `;
        } else {
          query = db.execute`
            SELECT 
              w.id,
              w.description,
              w.author_id,
              w.priority,
              w.aura,
              w.created_at,
              we.aura_type,
              we.cost as aura_cost,
              we.applied_at as aura_applied_at
            FROM wishes w
            JOIN wish_enhancements we ON w.id = we.wish_id AND we.type = 'aura'
            WHERE w.author_id = ${userId} 
              AND w.status = 'active'
              AND w.aura IS NOT NULL
            ORDER BY w.priority DESC, w.created_at DESC
            LIMIT ${limit}
          `;
        }

        const result = await query;

        manaPerformanceMonitor.recordDatabaseQuery(
          'getWishesWithAura',
          Date.now() - startTime,
          true,
          result.length
        );

        return result;
      } catch (error) {
        manaPerformanceMonitor.recordDatabaseQuery(
          'getWishesWithAura',
          Date.now() - startTime,
          false
        );
        throw error;
      }
    });
  }

  // ============================================================================
  // OPTIMIZED MANA BALANCE QUERIES
  // ============================================================================

  /**
   * Get mana leaderboard with optimized query
   */
  async getManaLeaderboard(
    type: 'balance' | 'spent' | 'earned' = 'balance',
    limit: number = 100
  ): Promise<any[]> {
    return ManaCache.getManaLeaderboard(type, limit, async () => {
      const startTime = Date.now();
      
      try {
        let query;
        
        switch (type) {
          case 'balance':
            query = db.execute`
              SELECT 
                u.id,
                u.username,
                u.mana_balance,
                u.created_at as user_since
              FROM users u
              WHERE u.mana_balance > 0
              ORDER BY u.mana_balance DESC
              LIMIT ${limit}
            `;
            break;
            
          case 'spent':
            query = db.execute`
              SELECT 
                u.id,
                u.username,
                u.mana_balance,
                COALESCE(SUM(CASE WHEN t.type = 'debit' THEN t.mana_amount ELSE 0 END), 0) as total_spent
              FROM users u
              LEFT JOIN transactions t ON u.id = t.user_id AND t.mana_amount > 0
              GROUP BY u.id, u.username, u.mana_balance
              HAVING total_spent > 0
              ORDER BY total_spent DESC
              LIMIT ${limit}
            `;
            break;
            
          case 'earned':
            query = db.execute`
              SELECT 
                u.id,
                u.username,
                u.mana_balance,
                COALESCE(SUM(CASE WHEN t.type = 'credit' THEN t.mana_amount ELSE 0 END), 0) as total_earned
              FROM users u
              LEFT JOIN transactions t ON u.id = t.user_id AND t.mana_amount > 0
              GROUP BY u.id, u.username, u.mana_balance
              HAVING total_earned > 0
              ORDER BY total_earned DESC
              LIMIT ${limit}
            `;
            break;
        }

        const result = await query;

        manaPerformanceMonitor.recordDatabaseQuery(
          'getManaLeaderboard',
          Date.now() - startTime,
          true,
          result.length
        );

        return result;
      } catch (error) {
        manaPerformanceMonitor.recordDatabaseQuery(
          'getManaLeaderboard',
          Date.now() - startTime,
          false
        );
        throw error;
      }
    });
  }

  /**
   * Get user mana statistics with single optimized query
   */
  async getUserManaStatistics(userId: string): Promise<any> {
    return ManaCache.getUserStats(userId, async () => {
      const startTime = Date.now();
      
      try {
        // Single query to get all user mana statistics
        const result = await db.execute`
          WITH user_stats AS (
            SELECT 
              u.mana_balance,
              u.legacy_migration_completed,
              u.created_at as user_since
            FROM users u
            WHERE u.id = ${userId}
          ),
          transaction_stats AS (
            SELECT 
              COALESCE(SUM(CASE WHEN type = 'credit' THEN mana_amount ELSE 0 END), 0) as total_earned,
              COALESCE(SUM(CASE WHEN type = 'debit' THEN mana_amount ELSE 0 END), 0) as total_spent,
              COUNT(*) as transaction_count,
              MAX(created_at) as last_transaction
            FROM transactions 
            WHERE user_id = ${userId} AND mana_amount > 0
          ),
          enhancement_stats AS (
            SELECT 
              COUNT(*) as total_enhancements,
              COUNT(CASE WHEN type = 'priority' THEN 1 END) as priority_enhancements,
              COUNT(CASE WHEN type = 'aura' THEN 1 END) as aura_enhancements,
              COALESCE(SUM(cost), 0) as total_enhancement_cost,
              COALESCE(AVG(CASE WHEN type = 'priority' THEN level END), 0) as avg_priority_level
            FROM wish_enhancements we
            JOIN wishes w ON we.wish_id = w.id
            WHERE w.author_id = ${userId}
          )
          SELECT 
            us.*,
            ts.*,
            es.*
          FROM user_stats us
          CROSS JOIN transaction_stats ts
          CROSS JOIN enhancement_stats es
        `;

        manaPerformanceMonitor.recordDatabaseQuery(
          'getUserManaStatistics',
          Date.now() - startTime,
          true,
          1
        );

        return result[0] || null;
      } catch (error) {
        manaPerformanceMonitor.recordDatabaseQuery(
          'getUserManaStatistics',
          Date.now() - startTime,
          false
        );
        throw error;
      }
    });
  }

  // ============================================================================
  // BATCH OPERATIONS FOR PERFORMANCE
  // ============================================================================

  /**
   * Batch update mana balances for multiple users
   */
  async batchUpdateManaBalances(updates: Array<{ userId: string; newBalance: number; reason: string }>): Promise<void> {
    const startTime = Date.now();
    
    try {
      await db.transaction(async (sql) => {
        // Batch update users table
        for (const update of updates) {
          await sql`
            UPDATE users 
            SET mana_balance = ${update.newBalance}
            WHERE id = ${update.userId}
          `;
          
          // Create transaction record
          await sql`
            INSERT INTO transactions (user_id, type, mana_amount, reason, transaction_source)
            VALUES (
              ${update.userId},
              'credit',
              ${update.newBalance},
              ${update.reason},
              'batch_update'
            )
          `;
          
          // Invalidate cache for this user
          ManaCache.invalidateUserBalance(update.userId);
        }
      });

      manaPerformanceMonitor.recordDatabaseQuery(
        'batchUpdateManaBalances',
        Date.now() - startTime,
        true,
        updates.length
      );

      console.log(`Batch updated mana balances for ${updates.length} users`);
    } catch (error) {
      manaPerformanceMonitor.recordDatabaseQuery(
        'batchUpdateManaBalances',
        Date.now() - startTime,
        false
      );
      throw error;
    }
  }

  /**
   * Preload frequently accessed data for performance
   */
  async preloadFrequentData(userIds: string[]): Promise<void> {
    const startTime = Date.now();
    
    try {
      // Preload user balances
      const balances = await db.execute`
        SELECT id, mana_balance
        FROM users
        WHERE id = ANY(${userIds})
      `;

      // Cache the balances
      for (const user of balances) {
        ManaCache.setUserBalance(user.id, user.mana_balance);
      }

      // Preload enhancement costs (static data)
      ManaCache.setEnhancementCosts('priority', {
        1: 10, 2: 25, 3: 50, 4: 100, 5: 200
      });
      ManaCache.setEnhancementCosts('aura', { aura: 50 });

      console.log(`Preloaded data for ${userIds.length} users in ${Date.now() - startTime}ms`);
    } catch (error) {
      console.error('Failed to preload frequent data:', error);
    }
  }

  // ============================================================================
  // QUERY ANALYSIS AND OPTIMIZATION
  // ============================================================================

  /**
   * Analyze query performance for mana-related tables
   */
  async analyzeQueryPerformance(): Promise<any> {
    try {
      const result = await db.execute`
        SELECT 
          schemaname,
          tablename,
          seq_scan,
          seq_tup_read,
          idx_scan,
          idx_tup_fetch,
          n_tup_ins,
          n_tup_upd,
          n_tup_del,
          CASE 
            WHEN seq_scan + idx_scan = 0 THEN 0
            ELSE ROUND((seq_scan::float / (seq_scan + idx_scan)) * 100, 2)
          END as seq_scan_percentage
        FROM pg_stat_user_tables 
        WHERE tablename IN ('users', 'wishes', 'wish_enhancements', 'transactions')
        ORDER BY seq_scan_percentage DESC
      `;

      return result;
    } catch (error) {
      console.error('Failed to analyze query performance:', error);
      return [];
    }
  }

  /**
   * Get index usage statistics for mana-related indexes
   */
  async getIndexUsageStats(): Promise<any> {
    try {
      const result = await db.execute`
        SELECT 
          schemaname,
          tablename,
          indexrelname,
          idx_scan,
          idx_tup_read,
          idx_tup_fetch,
          pg_size_pretty(pg_relation_size(schemaname||'.'||indexrelname)) as index_size
        FROM pg_stat_user_indexes 
        WHERE tablename IN ('users', 'wishes', 'wish_enhancements', 'transactions')
          AND (indexrelname LIKE '%mana%' 
               OR indexrelname LIKE '%priority%' 
               OR indexrelname LIKE '%enhancement%'
               OR indexrelname LIKE '%aura%')
        ORDER BY idx_scan DESC
      `;

      return result;
    } catch (error) {
      console.error('Failed to get index usage stats:', error);
      return [];
    }
  }

  /**
   * Generate optimization recommendations based on query analysis
   */
  async generateOptimizationRecommendations(): Promise<string[]> {
    const recommendations: string[] = [];
    
    try {
      const queryStats = await this.analyzeQueryPerformance();
      const indexStats = await this.getIndexUsageStats();
      
      // Check for high sequential scan ratios
      const highSeqScanTables = queryStats.filter((stat: any) => stat.seq_scan_percentage > 50);
      if (highSeqScanTables.length > 0) {
        recommendations.push(`Consider adding indexes to tables with high sequential scan ratios: ${highSeqScanTables.map((t: any) => t.tablename).join(', ')}`);
      }
      
      // Check for unused indexes
      const unusedIndexes = indexStats.filter((stat: any) => stat.idx_scan < 10);
      if (unusedIndexes.length > 0) {
        recommendations.push(`Consider dropping unused indexes: ${unusedIndexes.map((i: any) => i.indexrelname).join(', ')}`);
      }
      
      // Check for missing indexes on frequently queried columns
      const wishesStats = queryStats.find((stat: any) => stat.tablename === 'wishes');
      if (wishesStats && wishesStats.seq_scan > wishesStats.idx_scan) {
        recommendations.push('Consider adding composite index on wishes(author_id, status, priority DESC) for better wish sorting performance');
      }
      
      // Cache-related recommendations
      const cacheStats = ManaCache.getCacheStats();
      if (cacheStats.hitRate < 0.8) {
        recommendations.push('Increase cache TTL for mana balance queries to improve cache hit rate');
      }
      
    } catch (error) {
      console.error('Failed to generate optimization recommendations:', error);
      recommendations.push('Unable to analyze query performance - check database connection');
    }
    
    return recommendations;
  }
}

// Singleton instance
export const manaQueryOptimizer = ManaQueryOptimizer.getInstance();
export default manaQueryOptimizer;