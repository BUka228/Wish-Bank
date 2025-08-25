// Database types - safe for client-side import
export interface User {
  id: string;
  telegram_id: string;
  name: string;
  username?: string;
  green_balance: number;
  blue_balance: number;
  red_balance: number;
  mana_balance: number;
  legacy_migration_completed: boolean;
  rank: string;
  experience_points: number;
  daily_quota_used: number;
  weekly_quota_used: number;
  monthly_quota_used: number;
  last_quota_reset: Date;
  created_at: Date;
  updated_at: Date;
}

export interface Wish {
  id: string;
  type: 'green' | 'blue' | 'red';
  description: string;
  author_id: string;
  assignee_id?: string;
  status: 'active' | 'completed' | 'cancelled';
  category: string;
  is_shared: boolean;
  is_gift: boolean;
  is_historical: boolean;
  shared_approved_by?: string;
  priority: number;
  aura?: string;
  created_at: Date;
  completed_at?: Date;
  metadata?: any;
}

export interface Transaction {
  id: string;
  user_id: string;
  type: 'credit' | 'debit';
  wish_type: 'green' | 'blue' | 'red';
  amount: number;
  mana_amount: number;
  reason: string;
  reference_id?: string;
  transaction_category: string;
  transaction_source: string;
  enhancement_id?: string;
  experience_gained: number;
  created_at: Date;
  metadata?: any;
}

export interface Quest {
  id: string;
  title: string;
  description: string;
  author_id: string;
  assignee_id: string;
  category: string;
  difficulty: 'easy' | 'medium' | 'hard' | 'epic';
  reward_type: string;
  reward_amount: number;
  experience_reward: number;
  status: 'active' | 'completed' | 'expired' | 'cancelled';
  due_date?: Date;
  created_at: Date;
  completed_at?: Date;
  metadata: any;
}

export interface RandomEvent {
  id: string;
  user_id: string;
  title: string;
  description: string;
  reward_type: string;
  reward_amount: number;
  experience_reward: number;
  status: 'active' | 'completed' | 'expired';
  expires_at: Date;
  created_at: Date;
  completed_at?: Date;
  completed_by?: string;
  metadata: any;
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
  special_privileges: any;
  emoji?: string;
  created_at: Date;
}

export interface EconomySetting {
  id: string;
  setting_key: string;
  setting_value: any;
  description?: string;
  updated_at: Date;
}