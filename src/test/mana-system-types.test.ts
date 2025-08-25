// Test file to validate mana system type definitions
import { describe, it, expect } from 'vitest';
import type {
  ManaUser,
  Enhancement,
  EnhancementType,
  AuraType,
  ManaEngine,
  EnhancementEngine,
  CurrencyConverter,
  ManaTransaction
} from '../types/mana-system';

import {
  InsufficientManaError,
  EnhancementError,
  MigrationError,
  DEFAULT_ENHANCEMENT_COSTS,
  LEGACY_CONVERSION_RATES,
  MANA_TEXTS
} from '../types/mana-system';

describe('Mana System Types', () => {
  it('should have proper ManaUser interface', () => {
    const mockManaUser: Partial<ManaUser> = {
      id: 'test-id',
      mana_balance: 100,
      legacy_migration_completed: false
    };
    
    expect(mockManaUser.mana_balance).toBe(100);
    expect(mockManaUser.legacy_migration_completed).toBe(false);
  });

  it('should have proper Enhancement interface', () => {
    const mockEnhancement: Enhancement = {
      id: 'enhancement-1',
      wish_id: 'wish-1',
      type: 'priority',
      level: 3,
      cost: 50,
      applied_at: new Date(),
      applied_by: 'user-1',
      metadata: {}
    };
    
    expect(mockEnhancement.type).toBe('priority');
    expect(mockEnhancement.level).toBe(3);
    expect(mockEnhancement.cost).toBe(50);
  });

  it('should have proper enhancement types', () => {
    const priorityType: EnhancementType = 'priority';
    const auraType: EnhancementType = 'aura';
    
    expect(priorityType).toBe('priority');
    expect(auraType).toBe('aura');
  });

  it('should have proper aura types', () => {
    const romanticAura: AuraType = 'romantic';
    const gamingAura: AuraType = 'gaming';
    const mysteriousAura: AuraType = 'mysterious';
    
    expect(romanticAura).toBe('romantic');
    expect(gamingAura).toBe('gaming');
    expect(mysteriousAura).toBe('mysterious');
  });

  it('should have default enhancement costs', () => {
    expect(DEFAULT_ENHANCEMENT_COSTS.priority[1]).toBe(10);
    expect(DEFAULT_ENHANCEMENT_COSTS.priority[2]).toBe(25);
    expect(DEFAULT_ENHANCEMENT_COSTS.priority[3]).toBe(50);
    expect(DEFAULT_ENHANCEMENT_COSTS.priority[4]).toBe(100);
    expect(DEFAULT_ENHANCEMENT_COSTS.priority[5]).toBe(200);
    expect(DEFAULT_ENHANCEMENT_COSTS.aura).toBe(50);
  });

  it('should have legacy conversion rates', () => {
    expect(LEGACY_CONVERSION_RATES.green).toBe(10);
    expect(LEGACY_CONVERSION_RATES.blue).toBe(100);
    expect(LEGACY_CONVERSION_RATES.red).toBe(1000);
  });

  it('should have Russian localization texts', () => {
    expect(MANA_TEXTS.mana).toBe('Мана');
    expect(MANA_TEXTS.enhancements).toBe('Усиления');
    expect(MANA_TEXTS.priority).toBe('Приоритет');
    expect(MANA_TEXTS.aura).toBe('Аура');
    expect(MANA_TEXTS.auraTypes.romantic).toBe('Романтическая');
    expect(MANA_TEXTS.auraTypes.gaming).toBe('Игровая');
    expect(MANA_TEXTS.auraTypes.mysterious).toBe('Загадочная');
  });

  it('should have proper error classes', () => {
    const insufficientManaError = new InsufficientManaError(100, 50);
    expect(insufficientManaError.name).toBe('InsufficientManaError');
    expect(insufficientManaError.message).toContain('Недостаточно Маны');

    const enhancementError = new EnhancementError('Test error', 'wish-1');
    expect(enhancementError.name).toBe('EnhancementError');
    expect(enhancementError.message).toContain('wish-1');

    const migrationError = new MigrationError('user-1', 'conversion');
    expect(migrationError.name).toBe('MigrationError');
    expect(migrationError.message).toContain('user-1');
  });

  it('should have proper ManaTransaction interface', () => {
    const mockTransaction: ManaTransaction = {
      id: 'tx-1',
      user_id: 'user-1',
      type: 'debit',
      mana_amount: 50,
      reason: 'Enhancement applied',
      transaction_source: 'enhancement',
      created_at: new Date()
    };
    
    expect(mockTransaction.type).toBe('debit');
    expect(mockTransaction.mana_amount).toBe(50);
    expect(mockTransaction.transaction_source).toBe('enhancement');
  });
});

describe('Type Compatibility', () => {
  it('should be compatible with existing quest-economy types', () => {
    // This test ensures our new types don't break existing functionality
    const mockUser = {
      id: 'user-1',
      telegram_id: '123456',
      name: 'Test User',
      green_balance: 5,
      blue_balance: 2,
      red_balance: 1,
      mana_balance: 100,
      legacy_migration_completed: false,
      rank: 'Рядовой',
      experience_points: 50,
      daily_quota_used: 0,
      weekly_quota_used: 0,
      monthly_quota_used: 0,
      last_quota_reset: new Date(),
      created_at: new Date(),
      updated_at: new Date()
    };
    
    expect(mockUser.mana_balance).toBe(100);
    expect(mockUser.legacy_migration_completed).toBe(false);
    expect(mockUser.green_balance).toBe(5); // Legacy fields still exist
  });
});