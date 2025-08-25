// Central type exports for the application
// This file provides a single point of import for all type definitions

// Quest Economy System Types
export * from './quest-economy';

// Mana System Types
export * from './mana-system';

// Telegram Types
export * from './telegram.d';

// Re-export commonly used types with aliases for convenience
export type {
  User,
  EnhancedWish,
  Quest,
  RandomEvent,
  Transaction,
  Rank,
  WishCategory
} from './quest-economy';

export type {
  ManaUser,
  Enhancement,
  EnhancementType,
  AuraType,
  ManaEngine,
  EnhancementEngine,
  CurrencyConverter,
  ManaTransaction,
  InsufficientManaError,
  EnhancementError,
  MigrationError
} from './mana-system';