-- Migration: Admin Audit Log System
-- Description: Creates tables for logging administrative actions and security
-- Version: 011
-- Date: 2025-01-27

-- Create admin_audit_log table for logging all administrative actions
CREATE TABLE IF NOT EXISTS admin_audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    target_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    action_type VARCHAR(100) NOT NULL,
    old_values JSONB,
    new_values JSONB,
    reason TEXT NOT NULL,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT admin_audit_log_reason_not_empty CHECK (LENGTH(TRIM(reason)) > 0),
    CONSTRAINT admin_audit_log_reason_length CHECK (LENGTH(reason) <= 500),
    CONSTRAINT admin_audit_log_action_type_not_empty CHECK (LENGTH(TRIM(action_type)) > 0)
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_admin_audit_log_admin_user_id ON admin_audit_log(admin_user_id);
CREATE INDEX IF NOT EXISTS idx_admin_audit_log_target_user_id ON admin_audit_log(target_user_id);
CREATE INDEX IF NOT EXISTS idx_admin_audit_log_action_type ON admin_audit_log(action_type);
CREATE INDEX IF NOT EXISTS idx_admin_audit_log_created_at ON admin_audit_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_audit_log_admin_created_at ON admin_audit_log(admin_user_id, created_at DESC);

-- Create composite index for common queries
CREATE INDEX IF NOT EXISTS idx_admin_audit_log_composite ON admin_audit_log(action_type, created_at DESC, admin_user_id);

-- Add comments for documentation
COMMENT ON TABLE admin_audit_log IS 'Logs all administrative actions for security and audit purposes';
COMMENT ON COLUMN admin_audit_log.admin_user_id IS 'ID of the administrator who performed the action';
COMMENT ON COLUMN admin_audit_log.target_user_id IS 'ID of the user affected by the action (if applicable)';
COMMENT ON COLUMN admin_audit_log.action_type IS 'Type of administrative action performed';
COMMENT ON COLUMN admin_audit_log.old_values IS 'Previous values before the change (JSON format)';
COMMENT ON COLUMN admin_audit_log.new_values IS 'New values after the change (JSON format)';
COMMENT ON COLUMN admin_audit_log.reason IS 'Reason provided by administrator for the action';
COMMENT ON COLUMN admin_audit_log.ip_address IS 'IP address from which the action was performed';
COMMENT ON COLUMN admin_audit_log.user_agent IS 'User agent string of the client used';

-- Create a function to automatically clean up old audit logs (optional, for data retention)
CREATE OR REPLACE FUNCTION cleanup_old_audit_logs()
RETURNS void AS $$
BEGIN
    -- Keep audit logs for 2 years by default
    DELETE FROM admin_audit_log 
    WHERE created_at < NOW() - INTERVAL '2 years';
    
    -- Log the cleanup action
    RAISE NOTICE 'Cleaned up audit logs older than 2 years at %', NOW();
END;
$$ LANGUAGE plpgsql;

-- Create a view for easy audit log querying with user names
CREATE OR REPLACE VIEW admin_audit_log_view AS
SELECT 
    aal.id,
    aal.admin_user_id,
    au.name as admin_name,
    au.username as admin_username,
    aal.target_user_id,
    tu.name as target_user_name,
    tu.username as target_username,
    aal.action_type,
    aal.old_values,
    aal.new_values,
    aal.reason,
    aal.ip_address,
    aal.user_agent,
    aal.created_at
FROM admin_audit_log aal
LEFT JOIN users au ON aal.admin_user_id = au.id
LEFT JOIN users tu ON aal.target_user_id = tu.id
ORDER BY aal.created_at DESC;

COMMENT ON VIEW admin_audit_log_view IS 'Convenient view of audit logs with user names included';

-- Insert initial audit log entry to mark the creation of the audit system
DO $$
DECLARE
    admin_user_id UUID;
BEGIN
    -- Try to find the admin user (this might not exist yet, so we'll handle the case gracefully)
    SELECT id INTO admin_user_id FROM users WHERE telegram_id = COALESCE(current_setting('app.admin_telegram_id', true), '123456789') LIMIT 1;
    
    IF admin_user_id IS NOT NULL THEN
        INSERT INTO admin_audit_log (admin_user_id, action_type, reason)
        VALUES (admin_user_id, 'AUDIT_SYSTEM_INITIALIZED', 'Admin audit log system has been created and initialized');
    ELSE
        -- Create a system entry without admin_user_id for initialization
        INSERT INTO admin_audit_log (admin_user_id, action_type, reason)
        SELECT id, 'AUDIT_SYSTEM_INITIALIZED', 'Admin audit log system has been created and initialized'
        FROM users 
        WHERE telegram_id = '123456789' -- Default admin telegram ID
        LIMIT 1;
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        -- If we can't insert the initial log entry, that's okay - the table is still created
        RAISE NOTICE 'Could not insert initial audit log entry: %', SQLERRM;
END $$;

-- Grant appropriate permissions (adjust as needed for your setup)
-- GRANT SELECT, INSERT ON admin_audit_log TO your_app_user;
-- GRANT SELECT ON admin_audit_log_view TO your_app_user;

RAISE NOTICE 'Admin audit log system migration completed successfully';