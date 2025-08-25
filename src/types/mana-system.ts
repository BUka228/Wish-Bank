// Mana Economy System Types
// This file contains all type definitions for the new mana-based economy system

// Core Mana System Interfaces
export interface ManaUser extends Omit<import('./quest-economy').User, 'green_balance' | 'blue_balance' | 'red_balance'> {
  mana_balance: number;
  legacy_migration_completed: boolean;
}

export interface Enhancement {
  id: string;
  wish_id: string;
  type: 'priority' | 'aura';
  level: number;
  aura_type?: string;
  cost: number;
  applied_at: Date;
  applied_by: string;
  metadata: Record<string, any>;
}

export interface EnhancedWish extends Omit<import('./quest-economy').EnhancedWish, 'type'> {
  // Remove the old 'type' field (green/blue/red) as wishes are now free to create
  priority: number; // 1-5, affects sorting
  aura?: string; // "romantic" | "gaming" | "mysterious"
  enhancements: Enhancement[];
}

// Mana Engine Interface
export interface ManaEngine {
  getUserMana(userId: string): Promise<number>;
  addMana(userId: string, amount: number, reason: string): Promise<void>;
  spendMana(userId: string, amount: number, reason: string): Promise<boolean>;
  calculateManaReward(questDifficulty: string, eventType: string): number;
}

// Enhancement Engine Interface
export interface EnhancementEngine {
  applyPriorityEnhancement(wishId: string, level: number): Promise<Enhancement>;
  applyAuraEnhancement(wishId: string, auraType: string): Promise<Enhancement>;
  calculateEnhancementCost(type: string, currentLevel: number): number;
  getWishEnhancements(wishId: string): Promise<Enhancement[]>;
}

// Currency Converter Interface for Migration
export interface CurrencyConverter {
  convertBalancesToMana(user: import('./quest-economy').User): number;
  migrateUserEconomy(userId: string): Promise<void>;
  calculateConversionRate(): { green: number; blue: number; red: number };
}

// Enhancement Types
export type EnhancementType = 'priority' | 'aura';
export type AuraType = 'romantic' | 'gaming' | 'mysterious';

// Enhancement Cost Configuration
export interface EnhancementCosts {
  priority: {
    [level: number]: number; // Level 1: 10, Level 2: 25, Level 3: 50, Level 4: 100, Level 5: 200
  };
  aura: number; // Fixed cost: 50 mana
}

// Mana Transaction Interface
export interface ManaTransaction {
  id: string;
  user_id: string;
  type: 'credit' | 'debit';
  mana_amount: number;
  reason: string;
  reference_id?: string;
  transaction_source: string;
  enhancement_id?: string;
  created_at: Date;
  metadata?: Record<string, any>;
}

// API Request/Response Types
export interface SpendManaRequest {
  amount: number;
  reason: string;
  reference_id?: string;
}

export interface ApplyEnhancementRequest {
  wish_id: string;
  type: EnhancementType;
  level?: number; // For priority enhancements
  aura_type?: AuraType; // For aura enhancements
}

export interface ManaBalanceResponse {
  mana_balance: number;
  user_id: string;
}

export interface EnhancementResponse {
  enhancement: Enhancement;
  remaining_mana: number;
}

// Error Types - Import from dedicated error module
export type { 
  InsufficientManaError,
  EnhancementError,
  MigrationError,
  ManaSystemError,
  ManaValidationError,
  ManaOperationError,
  EnhancementValidationError,
  EnhancementPermissionError,
  MaxEnhancementLevelError,
  TransactionError,
  SystemConfigurationError,
  DatabaseError
} from '../lib/mana-errors';

// Validation Interfaces
export interface ManaValidationResult {
  isValid: boolean;
  errors: string[];
  warnings?: string[];
  canSpend: boolean;
  remainingMana: number;
}

export interface EnhancementValidationResult {
  isValid: boolean;
  errors: string[];
  canApply: boolean;
  cost: number;
  currentLevel?: number;
  maxLevelReached?: boolean;
}

// Audit and Logging
export interface ManaAuditLog {
  userId: string;
  action: 'earn' | 'spend' | 'enhance';
  amount: number;
  reason: string;
  timestamp: Date;
  metadata: Record<string, any>;
}

// Russian Localization Constants
export const MANA_TEXTS = {
  mana: 'Мана',
  enhancements: 'Усиления',
  priority: 'Приоритет',
  aura: 'Аура',
  auraTypes: {
    romantic: 'Романтическая',
    gaming: 'Игровая',
    mysterious: 'Загадочная'
  },
  errors: {
    insufficientMana: 'Недостаточно Маны',
    enhancementFailed: 'Не удалось применить усиление',
    migrationFailed: 'Ошибка миграции',
    maxLevelReached: 'Достигнут максимальный уровень',
    invalidEnhancementType: 'Неверный тип усиления'
  },
  success: {
    manaEarned: 'Получена Мана',
    enhancementApplied: 'Усиление применено',
    migrationCompleted: 'Миграция завершена'
  }
} as const;

// Default Enhancement Costs
export const DEFAULT_ENHANCEMENT_COSTS: EnhancementCosts = {
  priority: {
    1: 10,
    2: 25,
    3: 50,
    4: 100,
    5: 200
  },
  aura: 50
};

// Conversion Rates for Migration
export const LEGACY_CONVERSION_RATES = {
  green: 10,  // 1 green wish = 10 mana
  blue: 100,  // 1 blue wish = 100 mana
  red: 1000   // 1 red wish = 1000 mana
} as const;