-- Migration: Shared Wish Notification System
-- Description: Creates tables for push notifications, in-app notifications, and user notification settings

-- User notification settings table
CREATE TABLE IF NOT EXISTS user_notification_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    push_notifications BOOLEAN DEFAULT true,
    in_app_notifications BOOLEAN DEFAULT true,
    shared_wish_notifications BOOLEAN DEFAULT true,
    progress_notifications BOOLEAN DEFAULT true,
    reminder_notifications BOOLEAN DEFAULT true,
    email_notifications BOOLEAN DEFAULT false,
    notification_frequency VARCHAR(20) DEFAULT 'immediate' CHECK (notification_frequency IN ('immediate', 'hourly', 'daily')),
    quiet_hours_start TIME,
    quiet_hours_end TIME,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id)
);

-- In-app notifications table
CREATE TABLE IF NOT EXISTS in_app_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL,
    title VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    data JSONB DEFAULT '{}',
    read BOOLEAN DEFAULT false,
    priority VARCHAR(20) DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
    created_at TIMESTAMP DEFAULT NOW(),
    expires_at TIMESTAMP,
    action_url TEXT,
    read_at TIMESTAMP
);

-- Delayed notifications table (for quiet hours and batching)
CREATE TABLE IF NOT EXISTS delayed_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL,
    title VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    data JSONB DEFAULT '{}',
    priority VARCHAR(20) DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
    scheduled_for TIMESTAMP NOT NULL,
    notification_channels JSONB DEFAULT '{}',
    processed BOOLEAN DEFAULT false,
    processed_at TIMESTAMP,
    failed BOOLEAN DEFAULT false,
    error_message TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Push notification tokens table (for future push notification integration)
CREATE TABLE IF NOT EXISTS push_notification_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token TEXT NOT NULL,
    platform VARCHAR(20) NOT NULL CHECK (platform IN ('ios', 'android', 'web')),
    device_info JSONB DEFAULT '{}',
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    last_used TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, token)
);

-- Notification delivery log (for tracking and analytics)
CREATE TABLE IF NOT EXISTS notification_delivery_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    notification_type VARCHAR(50) NOT NULL,
    delivery_method VARCHAR(20) NOT NULL CHECK (delivery_method IN ('in_app', 'push', 'email')),
    status VARCHAR(20) NOT NULL CHECK (status IN ('sent', 'delivered', 'failed', 'bounced')),
    reference_id UUID, -- Can reference shared_wish_id or other entities
    error_message TEXT,
    delivered_at TIMESTAMP DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_in_app_notifications_user_unread ON in_app_notifications(user_id, read, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_in_app_notifications_type ON in_app_notifications(type);
CREATE INDEX IF NOT EXISTS idx_in_app_notifications_expires ON in_app_notifications(expires_at) WHERE expires_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_delayed_notifications_scheduled ON delayed_notifications(scheduled_for, processed);
CREATE INDEX IF NOT EXISTS idx_delayed_notifications_user ON delayed_notifications(user_id);

CREATE INDEX IF NOT EXISTS idx_push_tokens_user_active ON push_notification_tokens(user_id, active);
CREATE INDEX IF NOT EXISTS idx_push_tokens_platform ON push_notification_tokens(platform, active);

CREATE INDEX IF NOT EXISTS idx_notification_log_user_date ON notification_delivery_log(user_id, delivered_at DESC);
CREATE INDEX IF NOT EXISTS idx_notification_log_reference ON notification_delivery_log(reference_id);
CREATE INDEX IF NOT EXISTS idx_notification_log_status ON notification_delivery_log(status, delivered_at DESC);

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_notification_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for user_notification_settings
CREATE TRIGGER trigger_update_notification_settings_updated_at
    BEFORE UPDATE ON user_notification_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_notification_settings_updated_at();

-- Function to clean up expired notifications
CREATE OR REPLACE FUNCTION cleanup_expired_notifications()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    -- Delete expired in-app notifications
    DELETE FROM in_app_notifications 
    WHERE expires_at IS NOT NULL AND expires_at < NOW();
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    -- Delete old processed delayed notifications (older than 7 days)
    DELETE FROM delayed_notifications 
    WHERE processed = true AND processed_at < NOW() - INTERVAL '7 days';
    
    -- Delete old notification delivery logs (older than 30 days)
    DELETE FROM notification_delivery_log 
    WHERE delivered_at < NOW() - INTERVAL '30 days';
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Function to mark notification as read
CREATE OR REPLACE FUNCTION mark_notification_read(notification_id UUID, user_id_param UUID)
RETURNS BOOLEAN AS $$
DECLARE
    updated_count INTEGER;
BEGIN
    UPDATE in_app_notifications 
    SET read = true, read_at = NOW()
    WHERE id = notification_id AND user_id = user_id_param AND read = false;
    
    GET DIAGNOSTICS updated_count = ROW_COUNT;
    
    RETURN updated_count > 0;
END;
$$ LANGUAGE plpgsql;

-- Function to mark all notifications as read for a user
CREATE OR REPLACE FUNCTION mark_all_notifications_read(user_id_param UUID)
RETURNS INTEGER AS $$
DECLARE
    updated_count INTEGER;
BEGIN
    UPDATE in_app_notifications 
    SET read = true, read_at = NOW()
    WHERE user_id = user_id_param AND read = false;
    
    GET DIAGNOSTICS updated_count = ROW_COUNT;
    
    RETURN updated_count;
END;
$$ LANGUAGE plpgsql;

-- Function to get unread notification count for a user
CREATE OR REPLACE FUNCTION get_unread_notification_count(user_id_param UUID)
RETURNS INTEGER AS $$
DECLARE
    unread_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO unread_count
    FROM in_app_notifications 
    WHERE user_id = user_id_param 
    AND read = false 
    AND (expires_at IS NULL OR expires_at > NOW());
    
    RETURN unread_count;
END;
$$ LANGUAGE plpgsql;

-- Insert default notification settings for existing users
INSERT INTO user_notification_settings (user_id)
SELECT id FROM users 
WHERE id NOT IN (SELECT user_id FROM user_notification_settings)
ON CONFLICT (user_id) DO NOTHING;

-- Add comments for documentation
COMMENT ON TABLE user_notification_settings IS 'User preferences for different types of notifications';
COMMENT ON TABLE in_app_notifications IS 'In-app notifications displayed in the notification panel';
COMMENT ON TABLE delayed_notifications IS 'Notifications scheduled for later delivery (quiet hours, batching)';
COMMENT ON TABLE push_notification_tokens IS 'Device tokens for push notifications';
COMMENT ON TABLE notification_delivery_log IS 'Log of all notification deliveries for analytics';

COMMENT ON FUNCTION cleanup_expired_notifications() IS 'Cleans up expired and old notifications';
COMMENT ON FUNCTION mark_notification_read(UUID, UUID) IS 'Marks a specific notification as read';
COMMENT ON FUNCTION mark_all_notifications_read(UUID) IS 'Marks all notifications as read for a user';
COMMENT ON FUNCTION get_unread_notification_count(UUID) IS 'Gets count of unread notifications for a user';