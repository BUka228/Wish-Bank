// Tests for Currency Converter
// Testing migration from legacy currency system to Mana

import { describe, it, expect, beforeEach } from 'vitest';
import { CurrencyConverter } from '../lib/currency-converter';
import { User } from '../types/quest-economy';
import { LEGACY_CONVERSION_RATES } from '../types/mana-system';

describe('CurrencyConverter', () => {
  let converter: CurrencyConverter;

  beforeEach(() => {
    converter = new CurrencyConverter();
  });

  describe('calculateConversionRate', () => {
    it('should return correct conversion rates', () => {
      const rates = converter.calculateConversionRate();
      
      expect(rates).toEqual({
        green: 10,
        blue: 100,
        red: 1000
      });
    });

    it('should match LEGACY_CONVERSION_RATES constant', () => {
      const rates = converter.calculateConversionRate();
      expect(rates).toEqual(LEGACY_CONVERSION_RATES);
    });
  });

  describe('convertBalancesToMana', () => {
    it('should convert zero balances to zero mana', () => {
      const user: User = {
        id: 'test-user',
        telegram_id: '123',
        name: 'Test User',
        green_balance: 0,
        blue_balance: 0,
        red_balance: 0,
        mana_balance: 0,
        legacy_migration_completed: false,
        rank: 'Новичок',
        experience_points: 0,
        daily_quota_used: 0,
        weekly_quota_used: 0,
        monthly_quota_used: 0,
        last_quota_reset: new Date(),
        created_at: new Date(),
        updated_at: new Date()
      };

      const mana = converter.convertBalancesToMana(user);
      expect(mana).toBe(0);
    });

    it('should convert green wishes correctly', () => {
      const user: User = {
        id: 'test-user',
        telegram_id: '123',
        name: 'Test User',
        green_balance: 5,
        blue_balance: 0,
        red_balance: 0,
        mana_balance: 0,
        legacy_migration_completed: false,
        rank: 'Новичок',
        experience_points: 0,
        daily_quota_used: 0,
        weekly_quota_used: 0,
        monthly_quota_used: 0,
        last_quota_reset: new Date(),
        created_at: new Date(),
        updated_at: new Date()
      };

      const mana = converter.convertBalancesToMana(user);
      expect(mana).toBe(50); // 5 * 10
    });

    it('should convert blue wishes correctly', () => {
      const user: User = {
        id: 'test-user',
        telegram_id: '123',
        name: 'Test User',
        green_balance: 0,
        blue_balance: 3,
        red_balance: 0,
        mana_balance: 0,
        legacy_migration_completed: false,
        rank: 'Новичок',
        experience_points: 0,
        daily_quota_used: 0,
        weekly_quota_used: 0,
        monthly_quota_used: 0,
        last_quota_reset: new Date(),
        created_at: new Date(),
        updated_at: new Date()
      };

      const mana = converter.convertBalancesToMana(user);
      expect(mana).toBe(300); // 3 * 100
    });

    it('should convert red wishes correctly', () => {
      const user: User = {
        id: 'test-user',
        telegram_id: '123',
        name: 'Test User',
        green_balance: 0,
        blue_balance: 0,
        red_balance: 2,
        mana_balance: 0,
        legacy_migration_completed: false,
        rank: 'Новичок',
        experience_points: 0,
        daily_quota_used: 0,
        weekly_quota_used: 0,
        monthly_quota_used: 0,
        last_quota_reset: new Date(),
        created_at: new Date(),
        updated_at: new Date()
      };

      const mana = converter.convertBalancesToMana(user);
      expect(mana).toBe(2000); // 2 * 1000
    });

    it('should convert mixed balances correctly', () => {
      const user: User = {
        id: 'test-user',
        telegram_id: '123',
        name: 'Test User',
        green_balance: 10,
        blue_balance: 5,
        red_balance: 2,
        mana_balance: 0,
        legacy_migration_completed: false,
        rank: 'Новичок',
        experience_points: 0,
        daily_quota_used: 0,
        weekly_quota_used: 0,
        monthly_quota_used: 0,
        last_quota_reset: new Date(),
        created_at: new Date(),
        updated_at: new Date()
      };

      const mana = converter.convertBalancesToMana(user);
      expect(mana).toBe(2600); // (10*10) + (5*100) + (2*1000) = 100 + 500 + 2000
    });
  });

  // Note: Database-dependent methods are tested in integration tests
  // Here we focus on the core conversion logic
});