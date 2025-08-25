-- Migration: Mana System Performance Optimizations
-- Version: 010
-- Description: Add performance indexes and optimizations for Mana economy system

-- ============================================================================
-- PERFORMANCE INDEXES FOR MANA SYSTEM
-- ============================================================================

-- Composite index for mana balance queries with user status
CREATE INDEX IF NOT EXISTS idx_users_mana_balance_active ON users(mana_balance, id) 
    WHERE mana_balance > 0;

-- Index for high mana balance users (for leaderboards, analytics)
CREATE INDEX IF NOT EXISTS idx_users_high_mana ON users(mana_balance DESC) 
    WHERE mana_balance >= 1000;

-- Composite index for wish priority sorting with status
CREATE INDEX IF NOT EXISTS idx_wishes_priority_status ON wishes(priority DESC, status, created_at DESC) 
    WHERE status = 'active';

-- Index for wishes with aura effects
CREATE INDEX IF NOT EXISTS idx_wishes_aura_active ON wishes(aura, priority DESC) 
    WHERE aura IS NOT NULL AND status = 'active';

-- Composite index for wish enhancements by user and type
CREATE INDEX IF NOT EXISTS idx_enhancements_user_type ON wish_enhancements(applied_by, type, applied_at DESC);

-- Index for enhancement cost analysis
CREATE INDEX IF NOT EXISTS idx_enhancements_cost_analysis ON wish_enhancements(type, cost, applied_at) 
    WHERE cost > 0;

-- Composite index for mana transactions by user and date
CREATE INDEX IF NOT EXISTS idx_transactions_mana_user_date ON transactions(user_id, created_at DESC) 
    WHERE mana_amount > 0;

-- Index for mana transaction source analysis
CREATE INDEX IF NOT EXISTS idx_transactions_mana_source ON transactions(transaction_source, mana_amount, created_at) 
    WHERE mana_amount > 0;

-- Index for enhancement-related transactions
CREATE INDEX IF NOT EXISTS idx_transactions_enhancement_ref ON transactions(enhancement_id, mana_amount) 
    WHERE enhancement_id IS NOT NULL;

-- ============================================================================
-- PARTIAL INDEXES FOR COMMON QUERIES
-- ============================================================================

-- Index for active wishes with priority > 1 (enhanced wishes)
CREATE INDEX IF NOT EXISTS idx_wishes_enhanced_active ON wishes(priority DESC, created_at DESC) 
    WHERE status = 'active' AND priority > 1;

-- Index for recent mana transactions (last 30 days)
CREATE INDEX IF NOT EXISTS idx_transactions_mana_recent ON transactions(user_id, created_at DESC, mana_amount) 
    WHERE mana_amount > 0 AND created_at > NOW() - INTERVAL '30 days';

-- Index for high-value enhancements (cost >= 50 mana)
CREATE INDEX IF NOT EXISTS idx_enhancements_high_value ON wish_enhancements(wish_id, cost, applied_at) 
    WHERE cost >= 50;

-- ============================================================================
-- COVERING INDEXES FOR COMMON QUERIES
-- ============================================================================

-- Covering index for user mana dashboard queries
CREATE INDEX IF NOT EXISTS idx_users_mana_dashboard ON users(id, mana_balance, legacy_migration_completed, created_at);

-- Covering index for wish list with enhancements
CREATE INDEX IF NOT EXISTS idx_wishes_list_enhanced ON wishes(author_id, status, priority DESC, aura, created_at, id);

-- Covering index for enhancement history
CREATE INDEX IF NOT EXISTS idx_enhancements_history ON wish_enhancements(wish_id, type, level, aura_type, cost, applied_at, applied_by);

-- ============================================================================
-- EXPRESSION INDEXES FOR CALCULATED VALUES
-- ============================================================================

-- Index for mana balance ranges (for analytics)
CREATE INDEX IF NOT EXISTS idx_users_mana_range ON users(
    CASE 
        WHEN mana_balance = 0 THEN 'zero'
        WHEN mana_balance BETWEEN 1 AND 99 THEN 'low'
        WHEN mana_balance BETWEEN 100 AND 499 THEN 'medium'
        WHEN mana_balance BETWEEN 500 AND 999 THEN 'high'
        ELSE 'very_high'
    END
);

-- Index for enhancement efficiency (cost per level for priority enhancements)
CREATE INDEX IF NOT EXISTS idx_enhancements_efficiency ON wish_enhancements(
    CASE WHEN type = 'priority' AND level > 0 THEN cost / level ELSE NULL END
) WHERE type = 'priority';

-- ============================================================================
-- STATISTICS AND MAINTENANCE
-- ============================================================================

-- Update table statistics for better query planning
ANALYZE users;
ANALYZE wishes;
ANALYZE wish_enhancements;
ANALYZE transactions;

-- ============================================================================
-- PERFORMANCE MONITORING VIEWS
-- ============================================================================

-- View for mana system performance metrics
CREATE OR REPLACE VIEW mana_performance_metrics AS
SELECT 
    'active_users_with_mana' as metric_name,
    COUNT(*) as metric_value,
    'count' as metric_unit,
    NOW() as measured_at
FROM users 
WHERE mana_balance > 0

UNION ALL

SELECT 
    'total_mana_in_circulation' as metric_name,
    COALESCE(SUM(mana_balance), 0) as metric_value,
    'mana' as metric_unit,
    NOW() as measured_at
FROM users

UNION ALL

SELECT 
    'enhanced_wishes_count' as metric_name,
    COUNT(*) as metric_value,
    'count' as metric_unit,
    NOW() as measured_at
FROM wishes 
WHERE status = 'active' AND (priority > 1 OR aura IS NOT NULL)

UNION ALL

SELECT 
    'daily_mana_transactions' as metric_name,
    COUNT(*) as metric_value,
    'count' as metric_unit,
    NOW() as measured_at
FROM transactions 
WHERE mana_amount > 0 AND created_at > NOW() - INTERVAL '24 hours'

UNION ALL

SELECT 
    'average_enhancement_cost' as metric_name,
    COALESCE(AVG(cost), 0) as metric_value,
    'mana' as metric_unit,
    NOW() as measured_at
FROM wish_enhancements 
WHERE applied_at > NOW() - INTERVAL '7 days';

-- View for slow query identification
CREATE OR REPLACE VIEW mana_query_performance AS
SELECT 
    schemaname,
    tablename,
    seq_scan as sequential_scans,
    seq_tup_read as sequential_tuples_read,
    idx_scan as index_scans,
    idx_tup_fetch as index_tuples_fetched,
    CASE 
        WHEN seq_scan + idx_scan = 0 THEN 0
        ELSE ROUND((seq_scan::float / (seq_scan + idx_scan)) * 100, 2)
    END as sequential_scan_percentage
FROM pg_stat_user_tables 
WHERE schemaname = 'public' 
    AND tablename IN ('users', 'wishes', 'wish_enhancements', 'transactions')
ORDER BY sequential_scan_percentage DESC;

-- ============================================================================
-- CONSTRAINTS FOR DATA INTEGRITY AND PERFORMANCE
-- ============================================================================

-- Add constraint to ensure priority levels are valid
ALTER TABLE wishes ADD CONSTRAINT IF NOT EXISTS chk_wishes_priority_range 
    CHECK (priority >= 1 AND priority <= 5);

-- Add constraint to ensure aura types are valid
ALTER TABLE wishes ADD CONSTRAINT IF NOT EXISTS chk_wishes_aura_type 
    CHECK (aura IS NULL OR aura IN ('romantic', 'gaming', 'mysterious'));

-- Add constraint to ensure mana balance is non-negative
ALTER TABLE users ADD CONSTRAINT IF NOT EXISTS chk_users_mana_balance_positive 
    CHECK (mana_balance >= 0);

-- Add constraint to ensure enhancement costs are positive
ALTER TABLE wish_enhancements ADD CONSTRAINT IF NOT EXISTS chk_enhancements_cost_positive 
    CHECK (cost > 0);

-- ============================================================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON INDEX idx_users_mana_balance_active IS 'Optimizes queries for users with mana balance > 0';
COMMENT ON INDEX idx_wishes_priority_status IS 'Optimizes wish sorting by priority for active wishes';
COMMENT ON INDEX idx_enhancements_user_type IS 'Optimizes enhancement queries by user and type';
COMMENT ON INDEX idx_transactions_mana_user_date IS 'Optimizes mana transaction history queries';

COMMENT ON VIEW mana_performance_metrics IS 'Real-time performance metrics for mana system monitoring';
COMMENT ON VIEW mana_query_performance IS 'Query performance analysis for mana-related tables';

-- ============================================================================
-- VACUUM AND REINDEX FOR IMMEDIATE PERFORMANCE IMPROVEMENT
-- ============================================================================

-- Vacuum analyze tables to update statistics
VACUUM ANALYZE users;
VACUUM ANALYZE wishes;
VACUUM ANALYZE wish_enhancements;
VACUUM ANALYZE transactions;