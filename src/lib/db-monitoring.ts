import { sql } from './db-pool';

export interface DatabaseMetrics {
  timestamp: Date;
  activeConnections: number;
  databaseSize: number;
  totalQueries: number;
  slowQueries: number;
  tableStats: TableStats[];
  indexStats: IndexStats[];
  performanceIssues: PerformanceIssue[];
}

export interface TableStats {
  tableName: string;
  rowCount: number;
  totalSize: string;
  indexSize: string;
  tableSize: string;
  seqScans: number;
  indexScans: number;
}

export interface IndexStats {
  tableName: string;
  indexName: string;
  indexScans: number;
  tuplesRead: number;
  tuplesFetched: number;
  indexSize: string;
  isUnused: boolean;
}

export interface PerformanceIssue {
  type: 'slow_query' | 'unused_index' | 'missing_index' | 'high_connections' | 'large_table';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  recommendation: string;
  metadata?: any;
}

export class DatabaseMonitor {
  private static instance: DatabaseMonitor;
  private metricsHistory: DatabaseMetrics[] = [];
  private alertThresholds = {
    maxConnections: 80,
    slowQueryThreshold: 1000, // ms
    maxDatabaseSize: 1024 * 1024 * 1024 * 5, // 5GB
    maxTableSize: 1024 * 1024 * 1024, // 1GB
    minIndexUsage: 10,
  };

  static getInstance(): DatabaseMonitor {
    if (!DatabaseMonitor.instance) {
      DatabaseMonitor.instance = new DatabaseMonitor();
    }
    return DatabaseMonitor.instance;
  }

  async collectMetrics(): Promise<DatabaseMetrics> {
    try {
      const [
        connectionStats,
        databaseSizeStats,
        queryStats,
        tableStats,
        indexStats,
        slowQueries
      ] = await Promise.all([
        this.getConnectionStats(),
        this.getDatabaseSize(),
        this.getQueryStats(),
        this.getTableStats(),
        this.getIndexStats(),
        this.getSlowQueries()
      ]);

      const performanceIssues = await this.analyzePerformanceIssues(
        connectionStats,
        databaseSizeStats,
        tableStats,
        indexStats,
        slowQueries
      );

      const metrics: DatabaseMetrics = {
        timestamp: new Date(),
        activeConnections: connectionStats.activeConnections,
        databaseSize: databaseSizeStats.size,
        totalQueries: queryStats.totalQueries,
        slowQueries: slowQueries.length,
        tableStats,
        indexStats,
        performanceIssues
      };

      // Store metrics history (keep last 100 entries)
      this.metricsHistory.push(metrics);
      if (this.metricsHistory.length > 100) {
        this.metricsHistory.shift();
      }

      // Record metrics in database for historical analysis
      await this.recordMetrics(metrics);

      return metrics;
    } catch (error) {
      console.error('Failed to collect database metrics:', error);
      throw error;
    }
  }

  private async getConnectionStats() {
    const result = await sql`
      SELECT 
        count(*) as total_connections,
        count(CASE WHEN state = 'active' THEN 1 END) as active_connections,
        count(CASE WHEN state = 'idle' THEN 1 END) as idle_connections,
        count(CASE WHEN state = 'idle in transaction' THEN 1 END) as idle_in_transaction
      FROM pg_stat_activity
    `;
    return result[0];
  }

  private async getDatabaseSize() {
    const result = await sql`
      SELECT pg_database_size(current_database()) as size
    `;
    return result[0];
  }

  private async getQueryStats() {
    try {
      const result = await sql`
        SELECT 
          sum(calls) as total_queries,
          sum(total_exec_time) as total_time,
          avg(mean_exec_time) as avg_time,
          count(CASE WHEN mean_exec_time > 1000 THEN 1 END) as slow_queries
        FROM pg_stat_statements
      `;
      return result[0] || { totalQueries: 0, totalTime: 0, avgTime: 0, slowQueries: 0 };
    } catch (error) {
      // pg_stat_statements not available
      return { totalQueries: 0, totalTime: 0, avgTime: 0, slowQueries: 0 };
    }
  }

  private async getTableStats(): Promise<TableStats[]> {
    const result = await sql`
      SELECT 
        schemaname||'.'||tablename as table_name,
        n_tup_ins - n_tup_del as row_count,
        pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as total_size,
        pg_size_pretty(pg_indexes_size(schemaname||'.'||tablename)) as index_size,
        pg_size_pretty(pg_relation_size(schemaname||'.'||tablename)) as table_size,
        seq_scan as seq_scans,
        idx_scan as index_scans,
        pg_total_relation_size(schemaname||'.'||tablename) as size_bytes
      FROM pg_stat_user_tables
      WHERE schemaname = 'public'
      ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
    `;

    return result.map(row => ({
      tableName: row.table_name,
      rowCount: row.row_count || 0,
      totalSize: row.total_size,
      indexSize: row.index_size,
      tableSize: row.table_size,
      seqScans: row.seq_scans || 0,
      indexScans: row.index_scans || 0
    }));
  }

  private async getIndexStats(): Promise<IndexStats[]> {
    const result = await sql`
      SELECT 
        schemaname||'.'||tablename as table_name,
        indexrelname as index_name,
        idx_scan as index_scans,
        idx_tup_read as tuples_read,
        idx_tup_fetch as tuples_fetched,
        pg_size_pretty(pg_relation_size(schemaname||'.'||indexrelname)) as index_size,
        pg_relation_size(schemaname||'.'||indexrelname) as size_bytes
      FROM pg_stat_user_indexes
      WHERE schemaname = 'public'
      ORDER BY idx_scan DESC
    `;

    return result.map(row => ({
      tableName: row.table_name,
      indexName: row.index_name,
      indexScans: row.index_scans || 0,
      tuplesRead: row.tuples_read || 0,
      tuplesFetched: row.tuples_fetched || 0,
      indexSize: row.index_size,
      isUnused: (row.index_scans || 0) < this.alertThresholds.minIndexUsage && row.size_bytes > 1024 * 1024
    }));
  }

  private async getSlowQueries() {
    try {
      const result = await sql`
        SELECT 
          query,
          calls,
          total_exec_time,
          mean_exec_time,
          max_exec_time
        FROM pg_stat_statements
        WHERE mean_exec_time > ${this.alertThresholds.slowQueryThreshold}
        ORDER BY mean_exec_time DESC
        LIMIT 10
      `;
      return result;
    } catch (error) {
      return [];
    }
  }

  private async analyzePerformanceIssues(
    connectionStats: any,
    databaseSizeStats: any,
    tableStats: TableStats[],
    indexStats: IndexStats[],
    slowQueries: any[]
  ): Promise<PerformanceIssue[]> {
    const issues: PerformanceIssue[] = [];

    // Check connection count
    if (connectionStats.active_connections > this.alertThresholds.maxConnections) {
      issues.push({
        type: 'high_connections',
        severity: 'high',
        description: `High number of active connections: ${connectionStats.active_connections}`,
        recommendation: 'Consider implementing connection pooling or increasing connection limits',
        metadata: { activeConnections: connectionStats.active_connections }
      });
    }

    // Check database size
    if (databaseSizeStats.size > this.alertThresholds.maxDatabaseSize) {
      issues.push({
        type: 'large_table',
        severity: 'medium',
        description: `Database size is large: ${Math.round(databaseSizeStats.size / (1024 * 1024 * 1024))}GB`,
        recommendation: 'Consider archiving old data or implementing data partitioning',
        metadata: { databaseSize: databaseSizeStats.size }
      });
    }

    // Check for slow queries
    if (slowQueries.length > 0) {
      issues.push({
        type: 'slow_query',
        severity: 'high',
        description: `Found ${slowQueries.length} slow queries`,
        recommendation: 'Review and optimize slow queries, consider adding indexes',
        metadata: { slowQueries: slowQueries.slice(0, 5) }
      });
    }

    // Check for unused indexes
    const unusedIndexes = indexStats.filter(idx => idx.isUnused);
    if (unusedIndexes.length > 0) {
      issues.push({
        type: 'unused_index',
        severity: 'low',
        description: `Found ${unusedIndexes.length} potentially unused indexes`,
        recommendation: 'Consider dropping unused indexes to save space and improve write performance',
        metadata: { unusedIndexes: unusedIndexes.slice(0, 5) }
      });
    }

    // Check for tables with high sequential scan ratio
    const tablesWithHighSeqScans = tableStats.filter(table => 
      table.seqScans > 0 && table.indexScans > 0 && 
      (table.seqScans / (table.seqScans + table.indexScans)) > 0.8
    );
    
    if (tablesWithHighSeqScans.length > 0) {
      issues.push({
        type: 'missing_index',
        severity: 'medium',
        description: `Tables with high sequential scan ratio: ${tablesWithHighSeqScans.map(t => t.tableName).join(', ')}`,
        recommendation: 'Consider adding indexes to frequently queried columns',
        metadata: { tables: tablesWithHighSeqScans }
      });
    }

    return issues;
  }

  private async recordMetrics(metrics: DatabaseMetrics): Promise<void> {
    try {
      // Record overall metrics
      await sql`
        INSERT INTO performance_metrics (metric_name, metric_value, metric_unit, metadata)
        VALUES 
          ('active_connections', ${metrics.activeConnections}, 'count', '{}'),
          ('database_size', ${metrics.databaseSize}, 'bytes', '{}'),
          ('total_queries', ${metrics.totalQueries}, 'count', '{}'),
          ('slow_queries', ${metrics.slowQueries}, 'count', '{}'),
          ('performance_issues', ${metrics.performanceIssues.length}, 'count', ${JSON.stringify({ issues: metrics.performanceIssues })})
      `;

      // Record table-specific metrics
      for (const table of metrics.tableStats.slice(0, 10)) { // Top 10 tables
        await sql`
          INSERT INTO performance_metrics (metric_name, metric_value, metric_unit, metadata)
          VALUES (
            'table_row_count',
            ${table.rowCount},
            'count',
            ${JSON.stringify({ tableName: table.tableName, totalSize: table.totalSize })}
          )
        `;
      }
    } catch (error) {
      console.error('Failed to record metrics:', error);
    }
  }

  async getMetricsHistory(hours: number = 24): Promise<DatabaseMetrics[]> {
    const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000);
    return this.metricsHistory.filter(m => m.timestamp > cutoff);
  }

  async generatePerformanceReport(): Promise<string> {
    const metrics = await this.collectMetrics();
    const history = this.getMetricsHistory(24);
    
    let report = '# Database Performance Report\n\n';
    report += `Generated: ${metrics.timestamp.toISOString()}\n\n`;
    
    // Current Status
    report += '## Current Status\n';
    report += `- Active Connections: ${metrics.activeConnections}\n`;
    report += `- Database Size: ${Math.round(metrics.databaseSize / (1024 * 1024))}MB\n`;
    report += `- Total Queries: ${metrics.totalQueries}\n`;
    report += `- Slow Queries: ${metrics.slowQueries}\n\n`;
    
    // Performance Issues
    if (metrics.performanceIssues.length > 0) {
      report += '## Performance Issues\n';
      for (const issue of metrics.performanceIssues) {
        report += `### ${issue.type.toUpperCase()} (${issue.severity})\n`;
        report += `${issue.description}\n`;
        report += `**Recommendation:** ${issue.recommendation}\n\n`;
      }
    } else {
      report += '## Performance Issues\nNo issues detected.\n\n';
    }
    
    // Top Tables
    report += '## Top Tables by Size\n';
    for (const table of metrics.tableStats.slice(0, 5)) {
      report += `- ${table.tableName}: ${table.totalSize} (${table.rowCount} rows)\n`;
    }
    report += '\n';
    
    // Index Usage
    const unusedIndexes = metrics.indexStats.filter(idx => idx.isUnused);
    if (unusedIndexes.length > 0) {
      report += '## Unused Indexes\n';
      for (const index of unusedIndexes.slice(0, 5)) {
        report += `- ${index.indexName} on ${index.tableName}: ${index.indexSize}\n`;
      }
      report += '\n';
    }
    
    // Trends (if we have history)
    const historyData = await this.getMetricsHistory(24);
    if (historyData.length > 1) {
      const oldest = historyData[0];
      const newest = historyData[historyData.length - 1];
      
      report += '## 24-Hour Trends\n';
      report += `- Connection Growth: ${newest.activeConnections - oldest.activeConnections}\n`;
      report += `- Query Growth: ${newest.totalQueries - oldest.totalQueries}\n`;
      report += `- Database Growth: ${Math.round((newest.databaseSize - oldest.databaseSize) / (1024 * 1024))}MB\n\n`;
    }
    
    return report;
  }

  async runHealthCheck(): Promise<{ healthy: boolean; issues: string[] }> {
    const issues: string[] = [];
    
    try {
      const metrics = await this.collectMetrics();
      
      // Check critical issues
      const criticalIssues = metrics.performanceIssues.filter(i => i.severity === 'critical');
      if (criticalIssues.length > 0) {
        issues.push(`${criticalIssues.length} critical performance issues detected`);
      }
      
      // Check connection health
      if (metrics.activeConnections > this.alertThresholds.maxConnections) {
        issues.push(`High connection count: ${metrics.activeConnections}`);
      }
      
      // Check for slow queries
      if (metrics.slowQueries > 10) {
        issues.push(`High number of slow queries: ${metrics.slowQueries}`);
      }
      
      return {
        healthy: issues.length === 0,
        issues
      };
    } catch (error) {
      return {
        healthy: false,
        issues: [`Database monitoring failed: ${error instanceof Error ? error.message : 'Unknown error'}`]
      };
    }
  }

  setAlertThresholds(thresholds: Partial<typeof this.alertThresholds>) {
    this.alertThresholds = { ...this.alertThresholds, ...thresholds };
  }

  getAlertThresholds() {
    return { ...this.alertThresholds };
  }
}

// Singleton instance
export const dbMonitor = DatabaseMonitor.getInstance();

// Utility functions for common monitoring tasks
export async function checkDatabaseHealth(): Promise<boolean> {
  try {
    const healthCheck = await dbMonitor.runHealthCheck();
    return healthCheck.healthy;
  } catch (error) {
    console.error('Database health check failed:', error);
    return false;
  }
}

export async function getDatabaseMetrics(): Promise<DatabaseMetrics | null> {
  try {
    return await dbMonitor.collectMetrics();
  } catch (error) {
    console.error('Failed to get database metrics:', error);
    return null;
  }
}

export async function generatePerformanceReport(): Promise<string> {
  try {
    return await dbMonitor.generatePerformanceReport();
  } catch (error) {
    console.error('Failed to generate performance report:', error);
    return 'Failed to generate performance report';
  }
}