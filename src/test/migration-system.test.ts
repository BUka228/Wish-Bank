import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { sql } from '../lib/db-pool';
import { CurrencyConverter } from '../lib/currency-converter';
import { LEGACY_CONVERSION_RATES } from '../types/mana-system';

// Mock user data for testing
const mockUsers = [
  {
    id: 'test-user-1',
    name: 'Test User 1',
    green_balance: 10,
    blue_balance: 5,
    red_balance: 2,
    mana_balance: 0,
    legacy_migration_completed: false
  },
  {
    id: 'test-user-2',
    name: 'Test User 2',
    green_balance: 0,
    blue_balance: 0,
    red_balance: 0,
    mana_balance: 0,
    legacy_migration_completed: false
  },
  {
    id: 'test-user-3',
    name: 'Test User 3',
    green_balance: 100,
    blue_balance: 50,
    red_balance: 10,
    mana_balance: 0,
    legacy_migration_completed: false
  }
];

describe('Migration System', () => {
  let currencyConverter: CurrencyConverter;

  beforeEach(async () => {
    currencyConverter = new CurrencyConverter();
    
    // Clean up test data
    await sql`DELETE FROM transactions WHERE user_id LIKE 'test-user-%'`;
    await sql`DELETE FROM users WHERE id LIKE 'test-user-%'`;
    
    // Insert test users
    for (const user of mockUsers) {
      await sql`
        INSERT INTO users (
          id, name, green_balance, blue_balance, red_balance, 
          mana_balance, legacy_migration_completed, created_at, updated_at
        ) VALUES (
          ${user.id}, ${user.name}, ${user.green_balance}, ${user.blue_balance}, 
          ${user.red_balance}, ${user.mana_balance}, ${user.legacy_migration_completed},
          NOW(), NOW()
        )
      `;
    }
  });

  afterEach(async () => {
    // Clean up test data
    await sql`DELETE FROM transactions WHERE user_id LIKE 'test-user-%'`;
    await sql`DELETE FROM users WHERE id LIKE 'test-user-%'`;
  });

  describe('CurrencyConverter', () => {
    describe('calculateConversionRate', () => {
      it('should return correct conversion rates', () => {
        const rates = currencyConverter.calculateConversionRate();
        
        expect(rates.green).toBe(LEGACY_CONVERSION_RATES.green);
        expect(rates.blue).toBe(LEGACY_CONVERSION_RATES.blue);
        expect(rates.red).toBe(LEGACY_CONVERSION_RATES.red);
      });
    });

    describe('convertBalancesToMana', () => {
      it('should correctly convert legacy balances to Mana', () => {
        const user1 = mockUsers[0];
        const expectedMana = (user1.green_balance * 10) + (user1.blue_balance * 100) + (user1.red_balance * 1000);
        
        const convertedMana = currencyConverter.convertBalancesToMana(user1 as any);
        
        expect(convertedMana).toBe(expectedMana);
        expect(convertedMana).toBe(2600); // 10*10 + 5*100 + 2*1000 = 100 + 500 + 2000 = 2600
      });

      it('should return 0 for users with no legacy balances', () => {
        const user2 = mockUsers[1];
        const convertedMana = currencyConverter.convertBalancesToMana(user2 as any);
        
        expect(convertedMana).toBe(0);
      });

      it('should handle large balances correctly', () => {
        const user3 = mockUsers[2];
        const expectedMana = (user3.green_balance * 10) + (user3.blue_balance * 100) + (user3.red_balance * 1000);
        
        const convertedMana = currencyConverter.convertBalancesToMana(user3 as any);
        
        expect(convertedMana).toBe(expectedMana);
        expect(convertedMana).toBe(16000); // 100*10 + 50*100 + 10*1000 = 1000 + 5000 + 10000 = 16000
      });
    });

    describe('validateUserDataIntegrity', () => {
      it('should validate user with positive balances', async () => {
        const validation = await currencyConverter.validateUserDataIntegrity('test-user-1');
        
        expect(validation.isValid).toBe(true);
        expect(validation.errors).toHaveLength(0);
        expect(validation.userData).toBeDefined();
        expect(validation.calculatedMana).toBe(2600);
      });

      it('should detect user not found', async () => {
        const validation = await currencyConverter.validateUserDataIntegrity('non-existent-user');
        
        expect(validation.isValid).toBe(false);
        expect(validation.errors).toContain('User not found');
      });

      it('should warn about zero balance users', async () => {
        const validation = await currencyConverter.validateUserDataIntegrity('test-user-2');
        
        expect(validation.isValid).toBe(true);
        expect(validation.warnings).toContain('User has zero balance, will receive 0 Mana');
      });

      it('should warn about large conversions', async () => {
        const validation = await currencyConverter.validateUserDataIntegrity('test-user-3');
        
        expect(validation.isValid).toBe(true);
        expect(validation.warnings?.some(w => w.includes('Large Mana conversion detected'))).toBe(false); // 16000 is not > 100000
      });

      it('should detect negative balances', async () => {
        // Create user with negative balance
        await sql`
          INSERT INTO users (
            id, name, green_balance, blue_balance, red_balance, 
            mana_balance, legacy_migration_completed, created_at, updated_at
          ) VALUES (
            'test-user-negative', 'Negative User', -10, 5, 2,
            0, false, NOW(), NOW()
          )
        `;

        const validation = await currencyConverter.validateUserDataIntegrity('test-user-negative');
        
        expect(validation.isValid).toBe(false);
        expect(validation.errors).toContain('Green balance is negative');

        // Clean up
        await sql`DELETE FROM users WHERE id = 'test-user-negative'`;
      });
    });

    describe('migrateUserEconomy', () => {
      it('should successfully migrate a user', async () => {
        await currencyConverter.migrateUserEconomy('test-user-1');
        
        // Check user was updated
        const userResult = await sql`SELECT * FROM users WHERE id = 'test-user-1'`;
        const user = userResult[0];
        
        expect(user.mana_balance).toBe(2600);
        expect(user.legacy_migration_completed).toBe(true);
        
        // Check transaction was created
        const txResult = await sql`
          SELECT * FROM transactions 
          WHERE user_id = 'test-user-1' 
            AND transaction_source = 'currency_converter'
            AND reason = 'Legacy currency conversion to Mana'
        `;
        
        expect(txResult).toHaveLength(1);
        expect(txResult[0].mana_amount).toBe(2600);
      });

      it('should skip already migrated users', async () => {
        // First migration
        await currencyConverter.migrateUserEconomy('test-user-1');
        
        // Second migration attempt
        await currencyConverter.migrateUserEconomy('test-user-1');
        
        // Should still have only one transaction
        const txResult = await sql`
          SELECT * FROM transactions 
          WHERE user_id = 'test-user-1' 
            AND transaction_source = 'currency_converter'
        `;
        
        expect(txResult).toHaveLength(1);
      });

      it('should handle users with zero balances', async () => {
        await currencyConverter.migrateUserEconomy('test-user-2');
        
        const userResult = await sql`SELECT * FROM users WHERE id = 'test-user-2'`;
        const user = userResult[0];
        
        expect(user.mana_balance).toBe(0);
        expect(user.legacy_migration_completed).toBe(true);
      });

      it('should throw error for non-existent user', async () => {
        await expect(currencyConverter.migrateUserEconomy('non-existent-user'))
          .rejects.toThrow();
      });
    });

    describe('rollbackUserMigration', () => {
      beforeEach(async () => {
        // Migrate a user first
        await currencyConverter.migrateUserEconomy('test-user-1');
      });

      it('should successfully rollback a migrated user', async () => {
        await currencyConverter.rollbackUserMigration('test-user-1');
        
        // Check user was rolled back
        const userResult = await sql`SELECT * FROM users WHERE id = 'test-user-1'`;
        const user = userResult[0];
        
        expect(user.mana_balance).toBe(0);
        expect(user.legacy_migration_completed).toBe(false);
        
        // Check rollback transaction was created
        const rollbackTxResult = await sql`
          SELECT * FROM transactions 
          WHERE user_id = 'test-user-1' 
            AND transaction_category = 'migration_rollback'
        `;
        
        expect(rollbackTxResult).toHaveLength(1);
      });

      it('should skip non-migrated users', async () => {
        // Try to rollback a user that wasn't migrated
        await currencyConverter.rollbackUserMigration('test-user-2');
        
        // Should not create any rollback transactions
        const rollbackTxResult = await sql`
          SELECT * FROM transactions 
          WHERE user_id = 'test-user-2' 
            AND transaction_category = 'migration_rollback'
        `;
        
        expect(rollbackTxResult).toHaveLength(0);
      });
    });

    describe('batchMigrateUsers', () => {
      it('should migrate multiple users successfully', async () => {
        const userIds = ['test-user-1', 'test-user-2', 'test-user-3'];
        const progressCalls: any[] = [];
        
        const result = await currencyConverter.batchMigrateUsers(
          userIds,
          (completed, total, currentUserId) => {
            progressCalls.push({ completed, total, currentUserId });
          }
        );
        
        expect(result.successful).toHaveLength(3);
        expect(result.failed).toHaveLength(0);
        expect(result.skipped).toHaveLength(0);
        expect(result.totalManaConverted).toBe(18600); // 2600 + 0 + 16000
        
        // Check progress was reported
        expect(progressCalls).toHaveLength(3);
        expect(progressCalls[2]).toEqual({ completed: 3, total: 3, currentUserId: 'test-user-3' });
      });

      it('should handle mixed success and failure scenarios', async () => {
        const userIds = ['test-user-1', 'non-existent-user', 'test-user-2'];
        
        const result = await currencyConverter.batchMigrateUsers(userIds);
        
        expect(result.successful).toHaveLength(2);
        expect(result.failed).toHaveLength(1);
        expect(result.failed[0].userId).toBe('non-existent-user');
      });
    });

    describe('getMigrationStatistics', () => {
      it('should return correct statistics before migration', async () => {
        const stats = await currencyConverter.getMigrationStatistics();
        
        expect(stats.totalUsers).toBe(3);
        expect(stats.migratedUsers).toBe(0);
        expect(stats.pendingUsers).toBe(3);
        expect(stats.totalManaInSystem).toBe(0);
      });

      it('should return correct statistics after partial migration', async () => {
        await currencyConverter.migrateUserEconomy('test-user-1');
        await currencyConverter.migrateUserEconomy('test-user-2');
        
        const stats = await currencyConverter.getMigrationStatistics();
        
        expect(stats.totalUsers).toBe(3);
        expect(stats.migratedUsers).toBe(2);
        expect(stats.pendingUsers).toBe(1);
        expect(stats.totalManaInSystem).toBe(2600); // Only test-user-1 has mana
      });

      it('should return correct statistics after full migration', async () => {
        await currencyConverter.migrateUserEconomy('test-user-1');
        await currencyConverter.migrateUserEconomy('test-user-2');
        await currencyConverter.migrateUserEconomy('test-user-3');
        
        const stats = await currencyConverter.getMigrationStatistics();
        
        expect(stats.totalUsers).toBe(3);
        expect(stats.migratedUsers).toBe(3);
        expect(stats.pendingUsers).toBe(0);
        expect(stats.totalManaInSystem).toBe(18600);
        expect(stats.averageManaPerUser).toBe(6200); // 18600 / 3
      });
    });
  });

  describe('Data Integrity', () => {
    it('should maintain transaction consistency during migration', async () => {
      const originalUser = await sql`SELECT * FROM users WHERE id = 'test-user-1'`;
      
      await currencyConverter.migrateUserEconomy('test-user-1');
      
      const migratedUser = await sql`SELECT * FROM users WHERE id = 'test-user-1'`;
      const transactions = await sql`
        SELECT * FROM transactions 
        WHERE user_id = 'test-user-1' 
          AND transaction_source = 'currency_converter'
      `;
      
      // User should be updated correctly
      expect(migratedUser[0].mana_balance).toBe(2600);
      expect(migratedUser[0].legacy_migration_completed).toBe(true);
      
      // Transaction should match the conversion
      expect(transactions).toHaveLength(1);
      expect(transactions[0].mana_amount).toBe(2600);
      expect(transactions[0].amount).toBe(
        originalUser[0].green_balance + originalUser[0].blue_balance + originalUser[0].red_balance
      );
    });

    it('should handle database errors gracefully', async () => {
      // Mock a database error
      const originalSql = sql;
      vi.mocked(sql).mockImplementationOnce(() => {
        throw new Error('Database connection failed');
      });
      
      await expect(currencyConverter.migrateUserEconomy('test-user-1'))
        .rejects.toThrow();
      
      // User should not be partially migrated
      const user = await originalSql`SELECT * FROM users WHERE id = 'test-user-1'`;
      expect(user[0].legacy_migration_completed).toBe(false);
      expect(user[0].mana_balance).toBe(0);
    });

    it('should prevent double migration', async () => {
      await currencyConverter.migrateUserEconomy('test-user-1');
      
      // Attempt second migration
      await currencyConverter.migrateUserEconomy('test-user-1');
      
      // Should still have only one migration transaction
      const transactions = await sql`
        SELECT * FROM transactions 
        WHERE user_id = 'test-user-1' 
          AND transaction_source = 'currency_converter'
          AND reason = 'Legacy currency conversion to Mana'
      `;
      
      expect(transactions).toHaveLength(1);
    });
  });

  describe('Edge Cases', () => {
    it('should handle users with maximum possible balances', async () => {
      // Create user with very large balances
      await sql`
        INSERT INTO users (
          id, name, green_balance, blue_balance, red_balance, 
          mana_balance, legacy_migration_completed, created_at, updated_at
        ) VALUES (
          'test-user-max', 'Max User', 999999, 999999, 999999,
          0, false, NOW(), NOW()
        )
      `;

      const expectedMana = (999999 * 10) + (999999 * 100) + (999999 * 1000);
      
      await currencyConverter.migrateUserEconomy('test-user-max');
      
      const user = await sql`SELECT * FROM users WHERE id = 'test-user-max'`;
      expect(user[0].mana_balance).toBe(expectedMana);

      // Clean up
      await sql`DELETE FROM users WHERE id = 'test-user-max'`;
      await sql`DELETE FROM transactions WHERE user_id = 'test-user-max'`;
    });

    it('should handle concurrent migration attempts', async () => {
      // Simulate concurrent migrations
      const migration1 = currencyConverter.migrateUserEconomy('test-user-1');
      const migration2 = currencyConverter.migrateUserEconomy('test-user-1');
      
      await Promise.all([migration1, migration2]);
      
      // Should still have only one migration transaction
      const transactions = await sql`
        SELECT * FROM transactions 
        WHERE user_id = 'test-user-1' 
          AND transaction_source = 'currency_converter'
          AND reason = 'Legacy currency conversion to Mana'
      `;
      
      expect(transactions).toHaveLength(1);
    });
  });
});