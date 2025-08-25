// Enhanced Database Models and Interfaces for Quest Economy System

// --- NEW Economy System Interfaces ---

export interface Enchantments {
  priority?: number;
  aura?: 'romantic' | 'urgent' | 'playful' | 'mysterious';
  is_linked?: boolean;
  linked_wish_id?: string;
  is_recurring?: boolean;
  recurrence_interval?: 'daily' | 'weekly' | 'monthly';
}

export interface EnchantmentCosts {
  priority: number;
  aura: number;
  linked_wish: number;
  recurring: number;
}

export interface PriorityCostMultiplier {
  [level: number]: number;
}


// --- Updated Core Models ---

// Base interfaces (extending existing ones)
export interface User {
  id: string;
  telegram_id: string;
  name: string;
  username?: string;
  mana: number;
  mana_spent: number;
  rank: string;
  experience_points: number;
  daily_quota_used: number;
  weekly_quota_used: number;
  monthly_quota_used: number;
  last_quota_reset: Date;
  created_at: Date;
  updated_at: Date;
}

export interface Quest {
  id: string;
  title: string;
  description: string;
  author_id: string;
  assignee_id: string;
  category: string;
  difficulty: 'easy' | 'medium' | 'hard' | 'epic';
  mana_reward: number;
  experience_reward: number;
  status: 'active' | 'completed' | 'expired' | 'cancelled';
  due_date?: Date;
  created_at: Date;
  completed_at?: Date;
  metadata: Record<string, any>;
}

export interface RandomEvent {
  id: string;
  user_id: string;
  title: string;
  description: string;
  mana_reward: number;
  experience_reward: number;
  status: 'active' | 'completed' | 'expired';
  expires_at: Date;
  created_at: Date;
  completed_at?: Date;
  completed_by?: string;
  metadata: Record<string, any>;
}

export interface EnhancedWish {
  id: string;
  description: string;
  author_id: string;
  assignee_id?: string;
  status: 'active' | 'completed' | 'cancelled';
  category: string;
  is_shared: boolean;
  is_gift: boolean;
  is_historical: boolean;
  shared_approved_by?: string;
  enchantments: Enchantments;
  created_at: Date;
  completed_at?: Date;
  metadata?: Record<string, any>;
}

export interface WishCategory {
  id: string;
  name: string;
  emoji?: string;
  color?: string;
  created_at: Date;
}

export interface Rank {
  id: string;
  name: string;
  min_experience: number;
  daily_quota_bonus: number;
  weekly_quota_bonus: number;
  monthly_quota_bonus: number;
  special_privileges: Record<string, any>;
  emoji?: string;
  created_at: Date;
}

// New interfaces for economy system
export interface EconomyQuotas {
  daily: {
    limit: number;
    used: number;
    reset_time: Date;
  };
  weekly: {
    limit: number;
    used: number;
    reset_time: Date;
  };
  monthly: {
    limit: number;
    used: number;
    reset_time: Date;
  };
}

export interface RankPrivileges {
  can_create_medium_quests?: boolean;
  can_create_hard_quests?: boolean;
  can_create_epic_quests?: boolean;
  can_approve_shared_wishes?: boolean;
  bonus_experience?: number;
  special_abilities?: string[];
  exclusive_categories?: string[];
  max_active_quests?: number;
  priority_support?: boolean;
}

// Additional supporting interfaces
export interface EconomySetting {
  id: string;
  setting_key: string;
  setting_value: any;
  description?: string;
  updated_at: Date;
}

export interface Transaction {
  id: string;
  user_id: string;
  type: 'credit' | 'debit';
  mana_amount: number;
  amount: number; // Can be used for non-mana transactions if any, or deprecated.
  description: string;
  reference_id?: string;
  transaction_category: string;
  related_entity_id?: string;
  related_entity_type?: string;
  experience_gained: number;
  created_at: Date;
  metadata?: Record<string, any>;
}

// Request/Response interfaces for API operations
export interface CreateQuestRequest {
  title: string;
  description: string;
  assignee_id: string;
  category?: string;
  difficulty?: 'easy' | 'medium' | 'hard' | 'epic';
  mana_reward?: number;
  experience_reward?: number;
  due_date?: Date;
}

export interface CreateRandomEventRequest {
  title: string;
  description: string;
  mana_reward?: number;
  experience_reward?: number;
  expires_at: Date;
}

export interface CreateSharedWishRequest {
  description: string;
  category?: string;
  is_historical?: boolean;
  created_at?: Date;
}

export interface GiftWishRequest {
  recipient_id: string;
  amount?: number; // Quota cost
  message?: string;
}

export interface EnchantWishRequest {
  wish_id: string;
  enchantment_type: keyof EnchantmentCosts;
  level?: number; // For enchantments like priority
  value?: string; // For enchantments like aura
}

// Filter and query interfaces
export interface QuestFilter {
  status?: 'active' | 'completed' | 'expired' | 'cancelled';
  category?: string;
  difficulty?: 'easy' | 'medium' | 'hard' | 'epic';
  author_id?: string;
  assignee_id?: string;
  due_before?: Date;
  due_after?: Date;
}

export interface WishFilter {
  status?: 'active' | 'completed' | 'cancelled';
  category?: string;
  is_shared?: boolean;
  is_gift?: boolean;
  is_historical?: boolean;
  has_enchantment?: keyof Enchantments;
}

export interface EventFilter {
  status?: 'active' | 'completed' | 'expired';
  user_id?: string;
  expires_before?: Date;
  expires_after?: Date;
}

// Statistics and metrics interfaces
export interface UserStats {
  total_quests_created: number;
  total_quests_completed: number;
  total_events_completed: number;
  total_wishes_gifted: number;
  total_experience: number;
  current_rank: string;
  next_rank?: string;
  experience_to_next_rank?: number;
  completion_rate: number;
  average_quest_completion_time?: number;
}

export interface EconomyMetrics {
  total_gifts_given: number;
  total_gifts_received: number;
  total_mana_spent: number;
  total_mana_earned: number;
  quota_utilization: {
    daily: number;
    weekly: number;
    monthly: number;
  };
  most_used_enchantment?: keyof EnchantmentCosts;
  gift_frequency: number;
}



// Validation interfaces
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings?: string[];
}

export interface QuestValidation extends ValidationResult {
  canCreateQuest: boolean;
  maxActiveQuestsReached: boolean;
  hasPermissionForDifficulty: boolean;
}

export interface QuotaValidation extends ValidationResult {
  canGift: boolean;
  quotaType: 'daily' | 'weekly' | 'monthly';
  remainingQuota: number;
  resetTime: Date;
}

// Notification system interfaces
export interface NotificationData {
  type: 'quest_assigned' | 'quest_completed' | 'quest_expired' | 'event_available' | 'event_completed' | 'event_expired' | 'event_validated' | 'event_reminder' | 'new_event_generated' | 'system_event' | 'wish_gifted' | 'rank_promoted' | 'shared_wish_request';
  title: string;
  message: string;
  recipient_id?: string;
  data?: Record<string, any>;
  created_at?: Date;
}

export interface NotificationPreferences {
  quest_notifications: boolean;
  event_notifications: boolean;
  wish_notifications: boolean;
  rank_notifications: boolean;
  email_notifications: boolean;
  push_notifications: boolean;
}