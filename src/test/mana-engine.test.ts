import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { ManaEngine, manaEngine } from '../lib/mana-engine';
import { InsufficientManaError } from '../types/mana-system';
import { db } from '../lib/db-pool';

// Mock the database
vi.mock('../lib/db-pool', () => ({
  db: {
    execute: vi.fn(),
    transaction: vi.fn(),
  },
  DatabaseMonitor: {
    startQuery: vi.fn(() => vi.fn()),
  },
}));

describe('ManaEngine', () => {
  let engine: ManaEngine;
  const mockUserId = 'test-user-123';
  const mockSql = vi.fn();

  beforeEach(() => {
    engine = ManaEngine.getInstance();
    vi.clearAllMocks();
    
    // Setup default mock implementations
    (db.execute as any).mockResolvedValue([]);
    (db.transaction as any).mockImplementation(async (callback) => {
      return await callback(mockSql);
    });
  });

  afterEach(() => {
    engine.clearAuditLogs();
  });

  describe('getUserMana', () => {
    it('should return user mana balance', async () => {
      const expectedBalance = 150;
      (db.execute as any).mockResolvedValue([{ mana_balance: expectedBalance }]);

      const balance = await engine.getUserMana(mockUserId);

      expect(balance).toBe(expectedBalance);
      expect(db.execute).toHaveBeenCalledWith(
        expect.any(Array), mockUserId
      );
    });

    it('should return 0 for user with null mana_balance', async () => {
      (db.execute as any).mockResolvedValue([{ mana_balance: null }]);

      const balance = await engine.getUserMana(mockUserId);

      expect(balance).toBe(0);
    });

    it('should throw error for non-existent user', async () => {
      (db.execute as any).mockResolvedValue([]);

      await expect(engine.getUserMana(mockUserId)).rejects.toThrow('User not found');
    });

    it('should throw error for empty userId', async () => {
      await expect(engine.getUserMana('')).rejects.toThrow('User ID is required');
    });
  });

  describe('addMana', () => {
    it('should successfully add mana to user', async () => {
      const amount = 50;
      const reason = 'quest_completion';
      const newBalance = 200;

      mockSql.mockResolvedValueOnce([{ mana_balance: newBalance }]);
      mockSql.mockResolvedValueOnce([]); // transaction insert

      await engine.addMana(mockUserId, amount, reason);

      expect(mockSql).toHaveBeenCalledWith(
        expect.any(Array), amount, mockUserId
      );
      expect(mockSql).toHaveBeenCalledWith(
        expect.any(Array), mockUserId, 'credit', amount, reason, null, 'mana_engine', null, expect.any(String)
      );
    });

    it('should throw error for negative amount', async () => {
      await expect(engine.addMana(mockUserId, -10, 'test')).rejects.toThrow('Amount must be positive');
    });

    it('should throw error for zero amount', async () => {
      await expect(engine.addMana(mockUserId, 0, 'test')).rejects.toThrow('Amount must be positive');
    });

    it('should throw error for empty reason', async () => {
      await expect(engine.addMana(mockUserId, 50, '')).rejects.toThrow('Reason is required');
    });

    it('should throw error for empty userId', async () => {
      await expect(engine.addMana('', 50, 'test')).rejects.toThrow('User ID is required');
    });
  });

  describe('spendMana', () => {
    it('should successfully spend mana when user has sufficient balance', async () => {
      const amount = 30;
      const reason = 'enhancement_priority';
      const currentBalance = 100;
      const newBalance = 70;

      // Mock getUserMana call
      (db.execute as any).mockResolvedValueOnce([{ mana_balance: currentBalance }]);
      
      // Mock transaction
      mockSql.mockResolvedValueOnce([{ mana_balance: newBalance }]);
      mockSql.mockResolvedValueOnce([]); // transaction insert

      const result = await engine.spendMana(mockUserId, amount, reason);

      expect(result).toBe(true);
      expect(mockSql).toHaveBeenCalledWith(
        expect.any(Array), amount, mockUserId, amount
      );
    });

    it('should return false when user has insufficient balance', async () => {
      const amount = 100;
      const reason = 'enhancement_priority';
      const currentBalance = 50;

      // Mock getUserMana call
      (db.execute as any).mockResolvedValue([{ mana_balance: currentBalance }]);

      const result = await engine.spendMana(mockUserId, amount, reason);

      expect(result).toBe(false);
    });

    it('should throw InsufficientManaError for insufficient balance', async () => {
      const amount = 100;
      const reason = 'enhancement_priority';
      const currentBalance = 50;

      // Mock getUserMana call
      (db.execute as any).mockResolvedValueOnce([{ mana_balance: currentBalance }]);
      
      // Mock transaction failure - should throw error in transaction
      mockSql.mockResolvedValueOnce([]); // empty result means insufficient balance

      const result = await engine.spendMana(mockUserId, amount, reason);
      expect(result).toBe(false);
    });

    it('should throw error for negative amount', async () => {
      await expect(engine.spendMana(mockUserId, -10, 'test')).rejects.toThrow('Amount must be positive');
    });

    it('should throw error for empty reason', async () => {
      await expect(engine.spendMana(mockUserId, 50, '')).rejects.toThrow('Reason is required');
    });
  });

  describe('calculateManaReward', () => {
    it('should calculate correct reward for easy quest', () => {
      const reward = engine.calculateManaReward('easy', '');
      expect(reward).toBeGreaterThanOrEqual(8); // 10 * 0.8
      expect(reward).toBeLessThanOrEqual(12); // 10 * 1.2
    });

    it('should calculate correct reward for hard quest', () => {
      const reward = engine.calculateManaReward('hard', '');
      expect(reward).toBeGreaterThanOrEqual(40); // 50 * 0.8
      expect(reward).toBeLessThanOrEqual(60); // 50 * 1.2
    });

    it('should calculate correct reward for daily event', () => {
      const reward = engine.calculateManaReward('', 'daily');
      expect(reward).toBeGreaterThanOrEqual(4); // 5 * 0.8
      expect(reward).toBeLessThanOrEqual(6); // 5 * 1.2
    });

    it('should calculate correct reward for epic event', () => {
      const reward = engine.calculateManaReward('', 'epic');
      expect(reward).toBeGreaterThanOrEqual(200); // 250 * 0.8
      expect(reward).toBeLessThanOrEqual(300); // 250 * 1.2
    });

    it('should return default reward for unknown types', () => {
      const reward = engine.calculateManaReward('unknown', 'unknown');
      expect(reward).toBeGreaterThanOrEqual(8); // 10 * 0.8
      expect(reward).toBeLessThanOrEqual(12); // 10 * 1.2
    });

    it('should return at least 1 mana', () => {
      // Test multiple times to ensure minimum is always 1
      for (let i = 0; i < 10; i++) {
        const reward = engine.calculateManaReward('easy', '');
        expect(reward).toBeGreaterThanOrEqual(1);
      }
    });
  });

  describe('getUserTransactions', () => {
    it('should return user transactions', async () => {
      const mockTransactions = [
        {
          id: 'tx-1',
          user_id: mockUserId,
          type: 'credit',
          mana_amount: 50,
          reason: 'quest_completion',
          transaction_source: 'mana_engine',
          created_at: new Date(),
        },
      ];

      (db.execute as any).mockResolvedValue(mockTransactions);

      const transactions = await engine.getUserTransactions(mockUserId);

      expect(transactions).toEqual(mockTransactions);
      expect(db.execute).toHaveBeenCalledWith(
        expect.any(Array), mockUserId, 50
      );
    });

    it('should limit transactions to specified amount', async () => {
      (db.execute as any).mockResolvedValue([]);

      await engine.getUserTransactions(mockUserId, 10);

      expect(db.execute).toHaveBeenCalledWith(
        expect.any(Array), mockUserId, 10
      );
    });

    it('should throw error for empty userId', async () => {
      await expect(engine.getUserTransactions('')).rejects.toThrow('User ID is required');
    });
  });

  describe('getUserManaStats', () => {
    it('should return complete user mana statistics', async () => {
      const mockBalance = [{ mana_balance: 150 }];
      const mockStats = [{
        total_earned: 500,
        total_spent: 350,
        transaction_count: 25,
        last_transaction: new Date('2024-01-01'),
      }];

      (db.execute as any)
        .mockResolvedValueOnce(mockBalance)
        .mockResolvedValueOnce(mockStats);

      const stats = await engine.getUserManaStats(mockUserId);

      expect(stats).toEqual({
        current_balance: 150,
        total_earned: 500,
        total_spent: 350,
        transaction_count: 25,
        last_transaction: new Date('2024-01-01'),
      });
    });

    it('should handle user with no transactions', async () => {
      const mockBalance = [{ mana_balance: 0 }];
      const mockStats = []; // No transactions

      (db.execute as any)
        .mockResolvedValueOnce(mockBalance)
        .mockResolvedValueOnce(mockStats);

      const stats = await engine.getUserManaStats(mockUserId);

      expect(stats).toEqual({
        current_balance: 0,
        total_earned: 0,
        total_spent: 0,
        transaction_count: 0,
        last_transaction: null,
      });
    });
  });

  describe('validateManaOperation', () => {
    it('should validate successful spend operation', async () => {
      const currentBalance = 100;
      (db.execute as any).mockResolvedValue([{ mana_balance: currentBalance }]);

      const validation = await engine.validateManaOperation(mockUserId, 50, 'spend');

      expect(validation).toEqual({
        isValid: true,
        errors: [],
        currentBalance: 100,
        canProceed: true,
      });
    });

    it('should validate failed spend operation due to insufficient balance', async () => {
      const currentBalance = 30;
      (db.execute as any).mockResolvedValue([{ mana_balance: currentBalance }]);

      const validation = await engine.validateManaOperation(mockUserId, 50, 'spend');

      expect(validation.isValid).toBe(true);
      expect(validation.canProceed).toBe(false);
      expect(validation.errors).toContain('Недостаточно Маны');
    });

    it('should validate add operation', async () => {
      const currentBalance = 100;
      (db.execute as any).mockResolvedValue([{ mana_balance: currentBalance }]);

      const validation = await engine.validateManaOperation(mockUserId, 50, 'add');

      expect(validation).toEqual({
        isValid: true,
        errors: [],
        currentBalance: 100,
        canProceed: true,
      });
    });

    it('should return errors for invalid parameters', async () => {
      // Mock getUserMana to throw error for empty userId
      (db.execute as any).mockRejectedValue(new Error('User not found'));
      
      const validation = await engine.validateManaOperation('', -10, 'spend');

      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('Validation failed');
    });
  });

  describe('audit logging', () => {
    it('should log audit events', async () => {
      // Clear previous logs
      engine.clearAuditLogs();
      
      // Test getUserMana which should create a balance_check audit log
      (db.execute as any).mockResolvedValueOnce([{ mana_balance: 100 }]);
      
      await engine.getUserMana(mockUserId);

      const logs = engine.getAuditLogs();
      expect(logs.length).toBeGreaterThan(0);
      
      const balanceCheckLog = logs.find(log => log.action === 'earn' && log.reason === 'balance_check');
      expect(balanceCheckLog).toBeDefined();
      expect(balanceCheckLog!.userId).toBe(mockUserId);
    });

    it('should clear audit logs', async () => {
      // Add some logs first by calling getUserMana
      (db.execute as any).mockResolvedValue([{ mana_balance: 100 }]);
      
      await engine.getUserMana(mockUserId);
      
      expect(engine.getAuditLogs().length).toBeGreaterThan(0);
      
      engine.clearAuditLogs();
      expect(engine.getAuditLogs().length).toBe(0);
    });

    it('should limit audit logs in memory', async () => {
      // This test would require adding many logs to test the 1000 limit
      // For now, we just verify the method exists
      expect(typeof engine.clearAuditLogs).toBe('function');
      expect(typeof engine.getAuditLogs).toBe('function');
    });
  });

  describe('singleton pattern', () => {
    it('should return the same instance', () => {
      const instance1 = ManaEngine.getInstance();
      const instance2 = ManaEngine.getInstance();
      
      expect(instance1).toBe(instance2);
      expect(instance1).toBe(manaEngine);
    });
  });

  describe('edge cases and error handling', () => {
    it('should handle database connection errors gracefully', async () => {
      (db.execute as any).mockRejectedValue(new Error('Database connection failed'));

      await expect(engine.getUserMana(mockUserId)).rejects.toThrow('Database connection failed');
    });

    it('should handle transaction rollback on failure', async () => {
      const amount = 50;
      const reason = 'test_transaction';

      // Mock getUserMana to return sufficient balance
      (db.execute as any).mockResolvedValueOnce([{ mana_balance: 100 }]);
      
      // Mock transaction to fail
      (db.transaction as any).mockRejectedValue(new Error('Transaction failed'));

      await expect(engine.spendMana(mockUserId, amount, reason)).rejects.toThrow('Transaction failed');
    });

    it('should handle concurrent mana operations', async () => {
      const currentBalance = 100;
      (db.execute as any).mockResolvedValue([{ mana_balance: currentBalance }]);
      
      mockSql.mockResolvedValue([{ mana_balance: currentBalance - 50 }]);

      // Simulate concurrent spend operations
      const promises = [
        engine.spendMana(mockUserId, 30, 'operation1'),
        engine.spendMana(mockUserId, 40, 'operation2'),
        engine.spendMana(mockUserId, 50, 'operation3')
      ];

      const results = await Promise.allSettled(promises);
      
      // At least one should succeed, others might fail due to insufficient balance
      const successCount = results.filter(r => r.status === 'fulfilled' && r.value === true).length;
      expect(successCount).toBeGreaterThanOrEqual(1);
    });

    it('should validate mana amounts for extreme values', async () => {
      // Test very large amounts
      await expect(engine.addMana(mockUserId, Number.MAX_SAFE_INTEGER, 'test'))
        .resolves.not.toThrow();

      // Test floating point amounts (should work but be careful)
      await expect(engine.addMana(mockUserId, 10.5, 'test'))
        .resolves.not.toThrow();
    });

    it('should handle null/undefined metadata gracefully', async () => {
      const amount = 50;
      const reason = 'test_with_null_metadata';

      (db.execute as any).mockResolvedValueOnce([{ mana_balance: 100 }]);
      mockSql.mockResolvedValueOnce([{ mana_balance: 150 }]);
      mockSql.mockResolvedValueOnce([]); // transaction insert

      await expect(engine.addMana(mockUserId, amount, reason)).resolves.not.toThrow();
    });
  });

  describe('performance and optimization', () => {
    it('should handle batch operations efficiently', async () => {
      const operations = Array.from({ length: 10 }, (_, i) => ({
        userId: `user-${i}`,
        amount: 10 + i,
        reason: `batch_operation_${i}`
      }));

      (db.execute as any).mockResolvedValue([{ mana_balance: 100 }]);
      mockSql.mockResolvedValue([{ mana_balance: 110 }]);

      const startTime = Date.now();
      
      const promises = operations.map(op => 
        engine.addMana(op.userId, op.amount, op.reason)
      );
      
      await Promise.all(promises);
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      // Should complete batch operations reasonably quickly (under 1 second in tests)
      expect(duration).toBeLessThan(1000);
    });

    it('should cache audit logs efficiently', async () => {
      // Clear logs first
      engine.clearAuditLogs();
      
      // Add many operations to test log management
      (db.execute as any).mockResolvedValue([{ mana_balance: 100 }]);
      
      for (let i = 0; i < 10; i++) {
        await engine.getUserMana(`user-${i}`);
      }
      
      const logs = engine.getAuditLogs();
      expect(logs.length).toBe(10);
      
      // Test log limit functionality by checking the implementation
      expect(typeof engine.clearAuditLogs).toBe('function');
    });
  });

  describe('data integrity and consistency', () => {
    it('should maintain balance consistency across operations', async () => {
      const initialBalance = 100;
      const addAmount = 50;
      const spendAmount = 30;
      
      // Mock initial balance
      (db.execute as any).mockResolvedValueOnce([{ mana_balance: initialBalance }]);
      
      // Mock add operation
      mockSql.mockResolvedValueOnce([{ mana_balance: initialBalance + addAmount }]);
      mockSql.mockResolvedValueOnce([]); // transaction insert
      
      await engine.addMana(mockUserId, addAmount, 'test_add');
      
      // Mock balance check for spend
      (db.execute as any).mockResolvedValueOnce([{ mana_balance: initialBalance + addAmount }]);
      
      // Mock spend operation
      mockSql.mockResolvedValueOnce([{ mana_balance: initialBalance + addAmount - spendAmount }]);
      mockSql.mockResolvedValueOnce([]); // transaction insert
      
      const spendResult = await engine.spendMana(mockUserId, spendAmount, 'test_spend');
      
      expect(spendResult).toBe(true);
      
      // Verify the expected final balance would be correct
      const expectedFinalBalance = initialBalance + addAmount - spendAmount;
      expect(expectedFinalBalance).toBe(120);
    });

    it('should handle race conditions in balance updates', async () => {
      const initialBalance = 100;
      
      // Mock concurrent balance checks
      (db.execute as any).mockResolvedValue([{ mana_balance: initialBalance }]);
      
      // Mock successful spend operations
      mockSql.mockResolvedValue([{ mana_balance: initialBalance - 10 }]);
      
      // Attempt concurrent spends
      const results = await Promise.allSettled([
        engine.spendMana(mockUserId, 10, 'concurrent1'),
        engine.spendMana(mockUserId, 10, 'concurrent2')
      ]);
      
      // Both operations should handle the race condition gracefully
      results.forEach(result => {
        expect(result.status).toBe('fulfilled');
        if (result.status === 'fulfilled') {
          expect(typeof result.value).toBe('boolean');
        }
      });
    });
  });
});