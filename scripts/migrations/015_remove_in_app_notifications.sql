-- Migration: Remove in-app notification tables
-- This migration removes database tables related to in-app notifications
-- since the system now uses Telegram-only notifications

-- Remove in-app notifications table
DROP TABLE IF EXISTS in_app_notifications;

-- Remove notification settings table
DROP TABLE IF EXISTS notification_settings;

-- Remove delayed notifications table
DROP TABLE IF EXISTS delayed_notifications;

-- Remove notification preferences table
DROP TABLE IF EXISTS notification_preferences;

-- Clean up any notification-related indexes
DROP INDEX IF EXISTS idx_in_app_notifications_user_id;
DROP INDEX IF EXISTS idx_in_app_notifications_created_at;
DROP INDEX IF EXISTS idx_in_app_notifications_read;
DROP INDEX IF EXISTS idx_notification_settings_user_id;
DROP INDEX IF EXISTS idx_delayed_notifications_delivery_time;
DROP INDEX IF EXISTS idx_delayed_notifications_user_id;

-- Update users table to ensure telegram_id column exists for notifications
-- (This is needed for Telegram notifications to work)
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS telegram_id BIGINT,
ADD COLUMN IF NOT EXISTS telegram_username VARCHAR(255);

-- Create index on telegram_id for efficient lookups
CREATE INDEX IF NOT EXISTS idx_users_telegram_id ON users(telegram_id);

-- Remove any notification-related foreign key constraints from other tables
-- (Check and remove if they exist)
ALTER TABLE shared_wishes DROP CONSTRAINT IF EXISTS fk_shared_wishes_notification_settings;
ALTER TABLE random_events DROP CONSTRAINT IF EXISTS fk_random_events_notification_settings;