-- Migration: Database Performance Optimizations
-- Version: 008
-- Description: Add advanced indexes, query optimizations, and performance monitoring

-- Advanced composite indexes for complex queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_quests_assignee_status_due ON quests(assignee_id, status, due_date) 
WHERE status IN ('active', 'expired');

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_quests_author_category_status ON quests(author_id, category, status);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_events_user_expires_status ON random_events(user_id, expires_at, status)
WHERE status = 'active';

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_wishes_assignee_category_priority ON wishes(assignee_id, category, priority DESC)
WHERE status = 'active';

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_wishes_shared_approved ON wishes(is_shared, shared_approved_by)
WHERE is_shared = TRUE;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_transactions_user_category_date ON transactions(user_id, transaction_category, created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_experience_rank ON users(experience_points DESC, rank);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_quota_usage ON users(daily_quota_used, weekly_quota_used, monthly_quota_used, last_quota_reset);

-- Partial indexes for specific query patterns
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_quests_active_due_soon ON quests(due_date, assignee_id)
WHERE status = 'active' AND due_date IS NOT NULL AND due_date <= NOW() + INTERVAL '7 days';

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_events_expiring_soon ON random_events(expires_at, user_id)
WHERE status = 'active' AND expires_at <= NOW() + INTERVAL '2 hours';

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_wishes_high_priority ON wishes(assignee_id, priority DESC, created_at DESC)
WHERE status = 'active' AND priority >= 3;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_transactions_recent_experience ON transactions(user_id, experience_gained, created_at DESC)
WHERE experience_gained > 0 AND created_at >= NOW() - INTERVAL '30 days';

-- JSONB indexes for metadata queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_quests_metadata_gin ON quests USING GIN (metadata);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_events_metadata_gin ON random_events USING GIN (metadata);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_wishes_metadata_gin ON wishes USING GIN (metadata);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_transactions_metadata_gin ON transactions USING GIN (metadata);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_ranks_privileges_gin ON ranks USING GIN (special_privileges);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_economy_settings_value_gin ON economy_settings USING GIN (setting_value);

-- Text search indexes for descriptions
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_quests_description_fts ON quests USING GIN (to_tsvector('russian', title || ' ' || description));
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_events_description_fts ON random_events USING GIN (to_tsvector('russian', title || ' ' || description));
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_wishes_description_fts ON wishes USING GIN (to_tsvector('russian', description));

-- Covering indexes for common SELECT patterns
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_profile_data ON users(id) 
INCLUDE (name, rank, experience_points, green_balance, blue_balance, red_balance);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_quests_list_data ON quests(assignee_id, status) 
INCLUDE (title, category, difficulty, reward_type, reward_amount, due_date, created_at);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_wishes_list_data ON wishes(assignee_id, status) 
INCLUDE (type, description, category, priority, is_shared, created_at);

-- Optimize table statistics for better query planning
ANALYZE users;
ANALYZE wishes;
ANALYZE quests;
ANALYZE random_events;
ANALYZE transactions;
ANALYZE ranks;
ANALYZE wish_categories;
ANALYZE economy_settings;

-- Create materialized view for user statistics (updated periodically)
CREATE MATERIALIZED VIEW IF NOT EXISTS user_statistics AS
SELECT 
    u.id,
    u.name,
    u.rank,
    u.experience_points,
    u.green_balance,
    u.blue_balance,
    u.red_balance,
    COUNT(DISTINCT CASE WHEN q.status = 'active' AND q.assignee_id = u.id THEN q.id END) as active_quests_assigned,
    COUNT(DISTINCT CASE WHEN q.status = 'active' AND q.author_id = u.id THEN q.id END) as active_quests_created,
    COUNT(DISTINCT CASE WHEN q.status = 'completed' AND q.assignee_id = u.id THEN q.id END) as completed_quests,
    COUNT(DISTINCT CASE WHEN w.status = 'active' AND w.assignee_id = u.id THEN w.id END) as active_wishes_assigned,
    COUNT(DISTINCT CASE WHEN w.status = 'active' AND w.author_id = u.id THEN w.id END) as active_wishes_created,
    COUNT(DISTINCT CASE WHEN re.status = 'active' AND re.user_id = u.id THEN re.id END) as active_events,
    COALESCE(SUM(CASE WHEN t.type = 'credit' AND t.created_at >= NOW() - INTERVAL '30 days' THEN t.experience_gained END), 0) as experience_last_30_days,
    u.daily_quota_used,
    u.weekly_quota_used,
    u.monthly_quota_used,
    u.last_quota_reset
FROM users u
LEFT JOIN quests q ON (q.assignee_id = u.id OR q.author_id = u.id)
LEFT JOIN wishes w ON (w.assignee_id = u.id OR w.author_id = u.id)
LEFT JOIN random_events re ON re.user_id = u.id
LEFT JOIN transactions t ON t.user_id = u.id
GROUP BY u.id, u.name, u.rank, u.experience_points, u.green_balance, u.blue_balance, u.red_balance, 
         u.daily_quota_used, u.weekly_quota_used, u.monthly_quota_used, u.last_quota_reset;

-- Index for the materialized view
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_statistics_id ON user_statistics(id);
CREATE INDEX IF NOT EXISTS idx_user_statistics_rank_exp ON user_statistics(rank, experience_points DESC);

-- Create function to refresh user statistics
CREATE OR REPLACE FUNCTION refresh_user_statistics()
RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY user_statistics;
END;
$$ LANGUAGE plpgsql;

-- Create performance monitoring views
CREATE OR REPLACE VIEW quest_performance_metrics AS
SELECT 
    'quests' as table_name,
    COUNT(*) as total_records,
    COUNT(CASE WHEN status = 'active' THEN 1 END) as active_records,
    COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_records,
    COUNT(CASE WHEN status = 'expired' THEN 1 END) as expired_records,
    AVG(EXTRACT(EPOCH FROM (COALESCE(completed_at, NOW()) - created_at))/3600) as avg_completion_hours,
    COUNT(CASE WHEN due_date IS NOT NULL AND due_date < NOW() AND status = 'active' THEN 1 END) as overdue_count
FROM quests;

CREATE OR REPLACE VIEW event_performance_metrics AS
SELECT 
    'random_events' as table_name,
    COUNT(*) as total_records,
    COUNT(CASE WHEN status = 'active' THEN 1 END) as active_records,
    COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_records,
    COUNT(CASE WHEN status = 'expired' THEN 1 END) as expired_records,
    AVG(EXTRACT(EPOCH FROM (COALESCE(completed_at, expires_at) - created_at))/3600) as avg_completion_hours,
    COUNT(CASE WHEN expires_at < NOW() AND status = 'active' THEN 1 END) as expired_active_count
FROM random_events;

CREATE OR REPLACE VIEW wish_performance_metrics AS
SELECT 
    'wishes' as table_name,
    COUNT(*) as total_records,
    COUNT(CASE WHEN status = 'active' THEN 1 END) as active_records,
    COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_records,
    COUNT(CASE WHEN is_shared = true THEN 1 END) as shared_wishes,
    COUNT(CASE WHEN is_gift = true THEN 1 END) as gift_wishes,
    AVG(priority) as avg_priority,
    COUNT(CASE WHEN is_shared = true AND shared_approved_by IS NULL THEN 1 END) as pending_shared_approvals
FROM wishes;

CREATE OR REPLACE VIEW economy_performance_metrics AS
SELECT 
    'economy' as table_name,
    COUNT(DISTINCT user_id) as active_users,
    SUM(green_balance) as total_green_balance,
    SUM(blue_balance) as total_blue_balance,
    SUM(red_balance) as total_red_balance,
    AVG(experience_points) as avg_experience,
    COUNT(CASE WHEN daily_quota_used > 0 THEN 1 END) as users_with_daily_usage,
    COUNT(CASE WHEN last_quota_reset < CURRENT_DATE THEN 1 END) as users_needing_quota_reset
FROM users;

-- Create function to get slow queries (requires pg_stat_statements extension)
CREATE OR REPLACE FUNCTION get_slow_queries(min_duration_ms INTEGER DEFAULT 1000)
RETURNS TABLE (
    query TEXT,
    calls BIGINT,
    total_time DOUBLE PRECISION,
    mean_time DOUBLE PRECISION,
    max_time DOUBLE PRECISION
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        pss.query,
        pss.calls,
        pss.total_exec_time as total_time,
        pss.mean_exec_time as mean_time,
        pss.max_exec_time as max_time
    FROM pg_stat_statements pss
    WHERE pss.mean_exec_time > min_duration_ms
    ORDER BY pss.mean_exec_time DESC
    LIMIT 20;
EXCEPTION
    WHEN undefined_table THEN
        RAISE NOTICE 'pg_stat_statements extension not available. Install with: CREATE EXTENSION pg_stat_statements;';
        RETURN;
END;
$$ LANGUAGE plpgsql;

-- Create function to analyze table sizes and growth
CREATE OR REPLACE FUNCTION get_table_sizes()
RETURNS TABLE (
    table_name TEXT,
    row_count BIGINT,
    total_size TEXT,
    index_size TEXT,
    table_size TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        schemaname||'.'||tablename as table_name,
        n_tup_ins - n_tup_del as row_count,
        pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as total_size,
        pg_size_pretty(pg_indexes_size(schemaname||'.'||tablename)) as index_size,
        pg_size_pretty(pg_relation_size(schemaname||'.'||tablename)) as table_size
    FROM pg_stat_user_tables
    WHERE schemaname = 'public'
    ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
END;
$$ LANGUAGE plpgsql;

-- Create function to get index usage statistics
CREATE OR REPLACE FUNCTION get_index_usage()
RETURNS TABLE (
    table_name TEXT,
    index_name TEXT,
    index_scans BIGINT,
    tuples_read BIGINT,
    tuples_fetched BIGINT,
    index_size TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        schemaname||'.'||tablename as table_name,
        indexrelname as index_name,
        idx_scan as index_scans,
        idx_tup_read as tuples_read,
        idx_tup_fetch as tuples_fetched,
        pg_size_pretty(pg_relation_size(schemaname||'.'||indexrelname)) as index_size
    FROM pg_stat_user_indexes
    WHERE schemaname = 'public'
    ORDER BY idx_scan DESC;
END;
$$ LANGUAGE plpgsql;

-- Create function to identify unused indexes
CREATE OR REPLACE FUNCTION get_unused_indexes()
RETURNS TABLE (
    table_name TEXT,
    index_name TEXT,
    index_size TEXT,
    index_scans BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        schemaname||'.'||tablename as table_name,
        indexrelname as index_name,
        pg_size_pretty(pg_relation_size(schemaname||'.'||indexrelname)) as index_size,
        idx_scan as index_scans
    FROM pg_stat_user_indexes
    WHERE schemaname = 'public' 
    AND idx_scan < 10  -- Less than 10 scans might indicate unused index
    AND pg_relation_size(schemaname||'.'||indexrelname) > 1024 * 1024  -- Larger than 1MB
    ORDER BY pg_relation_size(schemaname||'.'||indexrelname) DESC;
END;
$$ LANGUAGE plpgsql;

-- Create connection pooling configuration recommendations
CREATE OR REPLACE FUNCTION get_connection_recommendations()
RETURNS TABLE (
    setting_name TEXT,
    current_value TEXT,
    recommended_value TEXT,
    description TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        'max_connections'::TEXT,
        current_setting('max_connections'),
        '100'::TEXT,
        'Maximum number of concurrent connections'::TEXT
    UNION ALL
    SELECT 
        'shared_buffers'::TEXT,
        current_setting('shared_buffers'),
        '256MB'::TEXT,
        'Amount of memory for shared buffer cache'::TEXT
    UNION ALL
    SELECT 
        'effective_cache_size'::TEXT,
        current_setting('effective_cache_size'),
        '1GB'::TEXT,
        'Estimate of memory available for disk caching'::TEXT
    UNION ALL
    SELECT 
        'work_mem'::TEXT,
        current_setting('work_mem'),
        '4MB'::TEXT,
        'Memory for internal sort operations and hash tables'::TEXT
    UNION ALL
    SELECT 
        'maintenance_work_mem'::TEXT,
        current_setting('maintenance_work_mem'),
        '64MB'::TEXT,
        'Memory for maintenance operations like VACUUM, CREATE INDEX'::TEXT;
END;
$$ LANGUAGE plpgsql;

-- Create automated maintenance procedures
CREATE OR REPLACE FUNCTION run_maintenance_tasks()
RETURNS TEXT AS $$
DECLARE
    result TEXT := '';
BEGIN
    -- Update table statistics
    ANALYZE users;
    ANALYZE wishes;
    ANALYZE quests;
    ANALYZE random_events;
    ANALYZE transactions;
    result := result || 'Statistics updated. ';
    
    -- Refresh materialized view
    PERFORM refresh_user_statistics();
    result := result || 'User statistics refreshed. ';
    
    -- Clean up expired events
    UPDATE random_events SET status = 'expired' 
    WHERE status = 'active' AND expires_at < NOW();
    result := result || 'Expired events cleaned. ';
    
    -- Clean up expired quests
    UPDATE quests SET status = 'expired' 
    WHERE status = 'active' AND due_date IS NOT NULL AND due_date < NOW();
    result := result || 'Expired quests cleaned. ';
    
    -- Reset quotas for users who need it
    UPDATE users SET 
        daily_quota_used = 0,
        weekly_quota_used = CASE 
            WHEN EXTRACT(DOW FROM last_quota_reset) != EXTRACT(DOW FROM CURRENT_DATE) 
            AND last_quota_reset < CURRENT_DATE - INTERVAL '7 days' THEN 0 
            ELSE weekly_quota_used 
        END,
        monthly_quota_used = CASE 
            WHEN EXTRACT(MONTH FROM last_quota_reset) != EXTRACT(MONTH FROM CURRENT_DATE) THEN 0 
            ELSE monthly_quota_used 
        END,
        last_quota_reset = CURRENT_DATE
    WHERE last_quota_reset < CURRENT_DATE;
    result := result || 'Quotas reset. ';
    
    RETURN result || 'Maintenance completed successfully.';
END;
$$ LANGUAGE plpgsql;

-- Create performance monitoring table for tracking metrics over time
CREATE TABLE IF NOT EXISTS performance_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    metric_name VARCHAR(100) NOT NULL,
    metric_value NUMERIC NOT NULL,
    metric_unit VARCHAR(20),
    recorded_at TIMESTAMP DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS idx_performance_metrics_name_time ON performance_metrics(metric_name, recorded_at DESC);

-- Create function to record performance metrics
CREATE OR REPLACE FUNCTION record_performance_metric(
    p_metric_name TEXT,
    p_metric_value NUMERIC,
    p_metric_unit TEXT DEFAULT NULL,
    p_metadata JSONB DEFAULT '{}'
)
RETURNS void AS $$
BEGIN
    INSERT INTO performance_metrics (metric_name, metric_value, metric_unit, metadata)
    VALUES (p_metric_name, p_metric_value, p_metric_unit, p_metadata);
END;
$$ LANGUAGE plpgsql;

-- Create function to collect and record system metrics
CREATE OR REPLACE FUNCTION collect_system_metrics()
RETURNS void AS $$
DECLARE
    active_connections INTEGER;
    db_size BIGINT;
    total_queries BIGINT;
BEGIN
    -- Record active connections
    SELECT count(*) INTO active_connections FROM pg_stat_activity WHERE state = 'active';
    PERFORM record_performance_metric('active_connections', active_connections, 'count');
    
    -- Record database size
    SELECT pg_database_size(current_database()) INTO db_size;
    PERFORM record_performance_metric('database_size', db_size, 'bytes');
    
    -- Record total queries (if pg_stat_statements is available)
    BEGIN
        SELECT sum(calls) INTO total_queries FROM pg_stat_statements;
        IF total_queries IS NOT NULL THEN
            PERFORM record_performance_metric('total_queries', total_queries, 'count');
        END IF;
    EXCEPTION
        WHEN undefined_table THEN
            -- pg_stat_statements not available, skip
            NULL;
    END;
    
    -- Record table-specific metrics
    PERFORM record_performance_metric('total_users', (SELECT count(*) FROM users), 'count');
    PERFORM record_performance_metric('active_quests', (SELECT count(*) FROM quests WHERE status = 'active'), 'count');
    PERFORM record_performance_metric('active_events', (SELECT count(*) FROM random_events WHERE status = 'active'), 'count');
    PERFORM record_performance_metric('active_wishes', (SELECT count(*) FROM wishes WHERE status = 'active'), 'count');
END;
$$ LANGUAGE plpgsql;

-- Set up automatic statistics collection (to be called by cron or application scheduler)
COMMENT ON FUNCTION collect_system_metrics() IS 'Call this function periodically (e.g., every 5 minutes) to collect performance metrics';
COMMENT ON FUNCTION run_maintenance_tasks() IS 'Call this function daily to perform routine maintenance tasks';
COMMENT ON FUNCTION refresh_user_statistics() IS 'Call this function hourly to refresh the user statistics materialized view';