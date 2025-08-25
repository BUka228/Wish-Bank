-- Migration: Shared Wishes System
-- Description: Creates tables for shared wishes functionality in admin control panel
-- Version: 012
-- Date: 2025-01-27

-- Create shared_wishes table for metadata of shared wishes
CREATE TABLE IF NOT EXISTS shared_wishes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wish_id UUID NOT NULL REFERENCES wishes(id) ON DELETE CASCADE,
    created_by_admin UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    is_global BOOLEAN DEFAULT TRUE,
    target_users UUID[] DEFAULT '{}',
    participation_count INTEGER DEFAULT 0,
    completion_progress INTEGER DEFAULT 0 CHECK (completion_progress >= 0 AND completion_progress <= 100),
    collective_reward INTEGER DEFAULT 0,
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    metadata JSONB DEFAULT '{}',
    
    -- Constraints
    CONSTRAINT shared_wishes_collective_reward_positive CHECK (collective_reward >= 0),
    CONSTRAINT shared_wishes_participation_count_positive CHECK (participation_count >= 0),
    CONSTRAINT shared_wishes_expires_future CHECK (expires_at IS NULL OR expires_at > created_at)
);

-- Create shared_wish_participants table for tracking participation
CREATE TABLE IF NOT EXISTS shared_wish_participants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shared_wish_id UUID NOT NULL REFERENCES shared_wishes(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    participation_status VARCHAR(20) DEFAULT 'active' CHECK (participation_status IN ('active', 'completed', 'opted_out')),
    progress_contribution INTEGER DEFAULT 0 CHECK (progress_contribution >= 0),
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    
    -- Unique constraint to prevent duplicate participation
    UNIQUE(shared_wish_id, user_id)
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_shared_wishes_wish_id ON shared_wishes(wish_id);
CREATE INDEX IF NOT EXISTS idx_shared_wishes_created_by_admin ON shared_wishes(created_by_admin);
CREATE INDEX IF NOT EXISTS idx_shared_wishes_is_global ON shared_wishes(is_global);
CREATE INDEX IF NOT EXISTS idx_shared_wishes_expires_at ON shared_wishes(expires_at) WHERE expires_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_shared_wishes_created_at ON shared_wishes(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_shared_wishes_completion_progress ON shared_wishes(completion_progress);

CREATE INDEX IF NOT EXISTS idx_shared_wish_participants_shared_wish_id ON shared_wish_participants(shared_wish_id);
CREATE INDEX IF NOT EXISTS idx_shared_wish_participants_user_id ON shared_wish_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_shared_wish_participants_status ON shared_wish_participants(participation_status);
CREATE INDEX IF NOT EXISTS idx_shared_wish_participants_joined_at ON shared_wish_participants(joined_at DESC);

-- Create composite indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_shared_wishes_admin_created ON shared_wishes(created_by_admin, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_shared_wish_participants_user_status ON shared_wish_participants(user_id, participation_status);

-- Add comments for documentation
COMMENT ON TABLE shared_wishes IS 'Metadata for shared wishes created by administrators';
COMMENT ON COLUMN shared_wishes.wish_id IS 'Reference to the base wish in the wishes table';
COMMENT ON COLUMN shared_wishes.created_by_admin IS 'Administrator who created this shared wish';
COMMENT ON COLUMN shared_wishes.is_global IS 'Whether this wish is available to all users or specific targets';
COMMENT ON COLUMN shared_wishes.target_users IS 'Array of specific user IDs if not global';
COMMENT ON COLUMN shared_wishes.participation_count IS 'Number of users currently participating';
COMMENT ON COLUMN shared_wishes.completion_progress IS 'Overall completion progress (0-100%)';
COMMENT ON COLUMN shared_wishes.collective_reward IS 'Mana reward for completing the shared wish';
COMMENT ON COLUMN shared_wishes.expires_at IS 'When this shared wish expires (optional)';
COMMENT ON COLUMN shared_wishes.metadata IS 'Additional metadata in JSON format';

COMMENT ON TABLE shared_wish_participants IS 'Tracks user participation in shared wishes';
COMMENT ON COLUMN shared_wish_participants.shared_wish_id IS 'Reference to the shared wish';
COMMENT ON COLUMN shared_wish_participants.user_id IS 'User participating in the shared wish';
COMMENT ON COLUMN shared_wish_participants.participation_status IS 'Current status of participation';
COMMENT ON COLUMN shared_wish_participants.progress_contribution IS 'Individual contribution to overall progress';
COMMENT ON COLUMN shared_wish_participants.joined_at IS 'When the user joined this shared wish';
COMMENT ON COLUMN shared_wish_participants.completed_at IS 'When the user completed their part';

-- Create function to update participation count automatically
CREATE OR REPLACE FUNCTION update_shared_wish_participation_count()
RETURNS TRIGGER AS $
BEGIN
    -- Update participation count when participants are added/removed/changed
    UPDATE shared_wishes 
    SET participation_count = (
        SELECT COUNT(*) 
        FROM shared_wish_participants 
        WHERE shared_wish_id = COALESCE(NEW.shared_wish_id, OLD.shared_wish_id)
        AND participation_status = 'active'
    )
    WHERE id = COALESCE(NEW.shared_wish_id, OLD.shared_wish_id);
    
    RETURN COALESCE(NEW, OLD);
END;
$ LANGUAGE plpgsql;

-- Create triggers to automatically update participation count
CREATE TRIGGER trigger_update_participation_count_insert
    AFTER INSERT ON shared_wish_participants
    FOR EACH ROW
    EXECUTE FUNCTION update_shared_wish_participation_count();

CREATE TRIGGER trigger_update_participation_count_update
    AFTER UPDATE ON shared_wish_participants
    FOR EACH ROW
    EXECUTE FUNCTION update_shared_wish_participation_count();

CREATE TRIGGER trigger_update_participation_count_delete
    AFTER DELETE ON shared_wish_participants
    FOR EACH ROW
    EXECUTE FUNCTION update_shared_wish_participation_count();

-- Create function to calculate completion progress
CREATE OR REPLACE FUNCTION update_shared_wish_completion_progress()
RETURNS TRIGGER AS $
DECLARE
    total_participants INTEGER;
    completed_participants INTEGER;
    progress_percentage INTEGER;
BEGIN
    -- Get total and completed participant counts
    SELECT 
        COUNT(*) FILTER (WHERE participation_status IN ('active', 'completed')),
        COUNT(*) FILTER (WHERE participation_status = 'completed')
    INTO total_participants, completed_participants
    FROM shared_wish_participants 
    WHERE shared_wish_id = COALESCE(NEW.shared_wish_id, OLD.shared_wish_id);
    
    -- Calculate progress percentage
    IF total_participants > 0 THEN
        progress_percentage := ROUND((completed_participants::DECIMAL / total_participants::DECIMAL) * 100);
    ELSE
        progress_percentage := 0;
    END IF;
    
    -- Update completion progress
    UPDATE shared_wishes 
    SET completion_progress = progress_percentage
    WHERE id = COALESCE(NEW.shared_wish_id, OLD.shared_wish_id);
    
    RETURN COALESCE(NEW, OLD);
END;
$ LANGUAGE plpgsql;

-- Create triggers to automatically update completion progress
CREATE TRIGGER trigger_update_completion_progress_insert
    AFTER INSERT ON shared_wish_participants
    FOR EACH ROW
    EXECUTE FUNCTION update_shared_wish_completion_progress();

CREATE TRIGGER trigger_update_completion_progress_update
    AFTER UPDATE OF participation_status ON shared_wish_participants
    FOR EACH ROW
    EXECUTE FUNCTION update_shared_wish_completion_progress();

CREATE TRIGGER trigger_update_completion_progress_delete
    AFTER DELETE ON shared_wish_participants
    FOR EACH ROW
    EXECUTE FUNCTION update_shared_wish_completion_progress();

-- Create view for easy querying of shared wishes with details
CREATE OR REPLACE VIEW shared_wishes_view AS
SELECT 
    sw.id,
    sw.wish_id,
    w.description as wish_description,
    w.category as wish_category,
    sw.created_by_admin,
    au.name as admin_name,
    au.username as admin_username,
    sw.is_global,
    sw.target_users,
    sw.participation_count,
    sw.completion_progress,
    sw.collective_reward,
    sw.expires_at,
    sw.created_at,
    sw.metadata,
    CASE 
        WHEN sw.expires_at IS NOT NULL AND sw.expires_at < NOW() THEN 'expired'
        WHEN sw.completion_progress = 100 THEN 'completed'
        ELSE 'active'
    END as status
FROM shared_wishes sw
LEFT JOIN wishes w ON sw.wish_id = w.id
LEFT JOIN users au ON sw.created_by_admin = au.id
ORDER BY sw.created_at DESC;

COMMENT ON VIEW shared_wishes_view IS 'Convenient view of shared wishes with related data';

-- Create function to automatically add participants for global shared wishes
CREATE OR REPLACE FUNCTION add_global_participants_to_shared_wish()
RETURNS TRIGGER AS $
BEGIN
    -- If this is a global shared wish, add all active users as participants
    IF NEW.is_global = TRUE THEN
        INSERT INTO shared_wish_participants (shared_wish_id, user_id)
        SELECT NEW.id, u.id
        FROM users u
        WHERE u.id != NEW.created_by_admin -- Don't add the admin as participant
        ON CONFLICT (shared_wish_id, user_id) DO NOTHING;
    END IF;
    
    RETURN NEW;
END;
$ LANGUAGE plpgsql;

-- Create trigger to automatically add participants for global wishes
CREATE TRIGGER trigger_add_global_participants
    AFTER INSERT ON shared_wishes
    FOR EACH ROW
    EXECUTE FUNCTION add_global_participants_to_shared_wish();

-- Create function for cleanup of expired shared wishes
CREATE OR REPLACE FUNCTION cleanup_expired_shared_wishes()
RETURNS void AS $
DECLARE
    expired_count INTEGER;
BEGIN
    -- Mark expired shared wishes as completed if they have some progress
    UPDATE shared_wish_participants 
    SET participation_status = 'opted_out'
    WHERE shared_wish_id IN (
        SELECT id FROM shared_wishes 
        WHERE expires_at IS NOT NULL 
        AND expires_at < NOW()
        AND completion_progress < 100
    )
    AND participation_status = 'active';
    
    GET DIAGNOSTICS expired_count = ROW_COUNT;
    
    RAISE NOTICE 'Cleaned up % expired shared wish participants at %', expired_count, NOW();
END;
$ LANGUAGE plpgsql;

-- Grant appropriate permissions (adjust as needed for your setup)
-- GRANT SELECT, INSERT, UPDATE, DELETE ON shared_wishes TO your_app_user;
-- GRANT SELECT, INSERT, UPDATE, DELETE ON shared_wish_participants TO your_app_user;
-- GRANT SELECT ON shared_wishes_view TO your_app_user;

RAISE NOTICE 'Shared wishes system migration completed successfully';