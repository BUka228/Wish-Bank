import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { EconomyEngine } from '../lib/economy-engine';
import * as db from '../lib/db';

// Mock the database module
vi.mock('../lib/db', () => ({
  getUserByTelegramId: vi.fn(),
  createGiftWish: vi.fn(),
  addTransaction: vi.fn(),
  getUserTransactions: vi.fn(),
}));

// Mock the economy-metrics module
vi.mock('../lib/economy-metrics', () => ({
  economyMetricsCollector: {
    collectSystemMetrics: vi.fn()
  }
}));

describe('EconomyEngine', () => {
  let economyEngine: EconomyEngine;
  const mockUser = {
    id: 'user-1',
    telegram_id: '123456789',
    username: 'testuser',
    first_name: 'Test',
    last_name: 'User',
    green_balance: 5,
    blue_balance: 3,
    red_balance: 2,
    created_at: new Date('2024-01-01T00:00:00Z'),
    rank: 'Рядовой',
    experience_points: 50,
    daily_quota_used: 2,
    weekly_quota_used: 8,
    monthly_quota_used: 15,
    last_quota_reset: new Date('2024-01-15T00:00:00Z')
  };

  const mockTransaction = {
    id: 'transaction-1',
    user_id: 'user-1',
    type: 'credit' as const,
    wish_type: 'green' as const,
    amount: 1,
    reason: 'Gift from partner',
    created_at: new Date('2024-01-15T10:00:00Z'),
    reference_id: null,
    transaction_category: 'gift'
  };

  beforeEach(() => {
    economyEngine = new EconomyEngine();
    vi.clearAllMocks();
    
    // Mock getUserById method
    vi.spyOn(economyEngine as any, 'getUserById').mockResolvedValue(mockUser);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('checkQuotas', () => {
    it('should return current quota status for user', async () => {
      const quotas = await economyEngine.checkQuotas('user-1');

      expect(quotas).toHaveProperty('daily');
      expect(quotas).toHaveProperty('weekly');
      expect(quotas).toHaveProperty('monthly');

      expect(quotas.daily.limit).toBe(5); // Base daily quota
      expect(quotas.daily.used).toBe(2); // From mock user
      expect(quotas.weekly.limit).toBe(20); // Base weekly quota
      expect(quotas.weekly.used).toBe(8); // From mock user
      expect(quotas.monthly.limit).toBe(50); // Base monthly quota
      expect(quotas.monthly.used).toBe(15); // From mock user

      expect(quotas.daily.reset_time).toBeInstanceOf(Date);
      expect(quotas.weekly.reset_time).toBeInstanceOf(Date);
      expect(quotas.monthly.reset_time).toBeInstanceOf(Date);
    });

    it('should throw error for non-existent user', async () => {
      vi.spyOn(economyEngine as any, 'getUserById').mockResolvedValue(null);

      await expect(economyEngine.checkQuotas('non-existent'))
        .rejects.toThrow('User not found');
    });
  });

  describe('validateGiftQuota', () => {
    it('should validate successful gift within quotas', async () => {
      const validation = await economyEngine.validateGiftQuota('user-1', 1);

      expect(validation.isValid).toBe(true);
      expect(validation.canGift).toBe(true);
      expect(validation.errors).toHaveLength(0);
      expect(validation.remainingQuota).toBe(3); // 5 - 2 = 3 remaining daily
      expect(validation.quotaType).toBe('daily');
    });

    it('should reject gift when daily quota exceeded', async () => {
      const validation = await economyEngine.validateGiftQuota('user-1', 5); // Trying to gift 5, but only 3 remaining

      expect(validation.isValid).toBe(false);
      expect(validation.canGift).toBe(false);
      expect(validation.errors).toContain('Daily quota exceeded. Used: 2/5, trying to gift: 5');
    });

    it('should reject gift when weekly quota exceeded', async () => {
      // Mock user with high weekly usage
      const highWeeklyUser = { ...mockUser, weekly_quota_used: 19 };
      vi.spyOn(economyEngine as any, 'getUserById').mockResolvedValue(highWeeklyUser);

      const validation = await economyEngine.validateGiftQuota('user-1', 3); // Would exceed weekly limit

      expect(validation.isValid).toBe(false);
      expect(validation.canGift).toBe(false);
      expect(validation.errors).toContain('Weekly quota exceeded. Used: 19/20, trying to gift: 3');
    });

    it('should reject gift when monthly quota exceeded', async () => {
      // Mock user with high monthly usage
      const highMonthlyUser = { ...mockUser, monthly_quota_used: 49 };
      vi.spyOn(economyEngine as any, 'getUserById').mockResolvedValue(highMonthlyUser);

      const validation = await economyEngine.validateGiftQuota('user-1', 3); // Would exceed monthly limit

      expect(validation.isValid).toBe(false);
      expect(validation.canGift).toBe(false);
      expect(validation.errors).toContain('Monthly quota exceeded. Used: 49/50, trying to gift: 3');
    });

    it('should provide warnings when approaching quota limits', async () => {
      // Mock user close to daily limit
      const nearLimitUser = { ...mockUser, daily_quota_used: 4 };
      vi.spyOn(economyEngine as any, 'getUserById').mockResolvedValue(nearLimitUser);

      const validation = await economyEngine.validateGiftQuota('user-1', 1);

      expect(validation.isValid).toBe(true);
      expect(validation.warnings).toContain('Approaching daily quota limit (5/5)');
    });

    it('should identify most restrictive quota type', async () => {
      // Mock user where weekly is most restrictive
      const restrictiveUser = { 
        ...mockUser, 
        daily_quota_used: 1, // 4 remaining
        weekly_quota_used: 18, // 2 remaining (most restrictive)
        monthly_quota_used: 10 // 40 remaining
      };
      vi.spyOn(economyEngine as any, 'getUserById').mockResolvedValue(restrictiveUser);

      const validation = await economyEngine.validateGiftQuota('user-1', 1);

      expect(validation.quotaType).toBe('weekly');
      expect(validation.remainingQuota).toBe(2);
    });
  });

  describe('giftWish', () => {
    const giftRequest = {
      recipient_id: 'user-2',
      type: 'green' as const,
      amount: 1,
      message: 'Test gift'
    };

    it('should process gift successfully when quotas allow', async () => {
      const mockWishes = [{ id: 'wish-1', type: 'green', amount: 1 }];
      
      vi.mocked(db.createGiftWish).mockResolvedValue(mockWishes);
      vi.mocked(db.addTransaction).mockResolvedValue(mockTransaction);
      vi.spyOn(economyEngine as any, 'getUserById')
        .mockResolvedValueOnce(mockUser) // For quota check
        .mockResolvedValueOnce({ ...mockUser, id: 'user-2' }); // For recipient check
      vi.spyOn(economyEngine as any, 'deductFromQuotas').mockResolvedValue(undefined);

      const result = await economyEngine.giftWish('user-1', giftRequest);

      expect(result.success).toBe(true);
      expect(result.wishes).toEqual(mockWishes);
      expect(result.quotaUsed).toBe(1);
      expect(db.createGiftWish).toHaveBeenCalledWith(
        'green',
        'user-1',
        'user-2',
        1,
        'Test gift'
      );
    });

    it('should reject gift when quota validation fails', async () => {
      // Mock user with no remaining quota
      const noQuotaUser = { ...mockUser, daily_quota_used: 5 };
      vi.spyOn(economyEngine as any, 'getUserById').mockResolvedValue(noQuotaUser);

      await expect(economyEngine.giftWish('user-1', giftRequest))
        .rejects.toThrow('Cannot gift wishes: Daily quota exceeded');

      expect(db.createGiftWish).not.toHaveBeenCalled();
    });

    it('should reject gift to non-existent recipient', async () => {
      vi.spyOn(economyEngine as any, 'getUserById')
        .mockResolvedValueOnce(mockUser) // For quota check
        .mockResolvedValueOnce(null); // Recipient not found

      await expect(economyEngine.giftWish('user-1', giftRequest))
        .rejects.toThrow('Recipient not found');
    });

    it('should reject self-gifting', async () => {
      const selfGiftRequest = { ...giftRequest, recipient_id: 'user-1' };

      await expect(economyEngine.giftWish('user-1', selfGiftRequest))
        .rejects.toThrow('Cannot gift wishes to yourself');
    });
  });

  describe('resetQuotasIfNeeded', () => {
    it('should reset quotas when new day', async () => {
      const oldUser = { 
        ...mockUser, 
        last_quota_reset: new Date('2024-01-14T00:00:00Z') // Yesterday
      };
      vi.spyOn(economyEngine as any, 'performQuotaReset').mockResolvedValue(undefined);

      const result = await economyEngine.resetQuotasIfNeeded(oldUser);

      expect(result).toBe(true);
      expect(economyEngine['performQuotaReset']).toHaveBeenCalledWith(
        'user-1',
        new Date('2024-01-15T10:00:00Z') // Current mocked time
      );
    });

    it('should not reset quotas when same day', async () => {
      const sameUser = { 
        ...mockUser, 
        last_quota_reset: new Date('2024-01-15T08:00:00Z') // Same day, earlier time
      };
      vi.spyOn(economyEngine as any, 'performQuotaReset').mockResolvedValue(undefined);

      const result = await economyEngine.resetQuotasIfNeeded(sameUser);

      expect(result).toBe(false);
      expect(economyEngine['performQuotaReset']).not.toHaveBeenCalled();
    });
  });

  describe('calculateEconomyMetrics', () => {
    it('should calculate user economy metrics', async () => {
      const mockTransactions = [
        { ...mockTransaction, type: 'debit', reason: 'Gift to partner' },
        { ...mockTransaction, id: 'transaction-2', type: 'credit', reason: 'Gift from partner' },
        { ...mockTransaction, id: 'transaction-3', type: 'debit', reason: 'Gift to partner', wish_type: 'blue' }
      ];
      
      vi.mocked(db.getUserTransactions).mockResolvedValue(mockTransactions);

      const metrics = await economyEngine.calculateEconomyMetrics('user-1');

      expect(metrics.total_gifts_given).toBe(2); // 2 debit transactions
      expect(metrics.total_gifts_received).toBe(1); // 1 credit transaction
      expect(metrics.quota_utilization.daily).toBe(40); // 2/5 * 100 = 40%
      expect(metrics.quota_utilization.weekly).toBe(40); // 8/20 * 100 = 40%
      expect(metrics.quota_utilization.monthly).toBe(30); // 15/50 * 100 = 30%
      expect(['green', 'blue', 'red']).toContain(metrics.most_gifted_type);
      expect(typeof metrics.gift_frequency).toBe('number');
    });
  });

  describe('getEconomySettings', () => {
    it('should return economy settings', async () => {
      const settings = await economyEngine.getEconomySettings();

      expect(settings).toHaveProperty('daily_gift_base_limit');
      expect(settings).toHaveProperty('weekly_gift_base_limit');
      expect(settings).toHaveProperty('monthly_gift_base_limit');
      expect(settings).toHaveProperty('gift_types');
      expect(settings).toHaveProperty('max_gift_amount_per_transaction');
      expect(settings).toHaveProperty('quota_reset_times');

      expect(settings.daily_gift_base_limit).toBe(5);
      expect(settings.weekly_gift_base_limit).toBe(20);
      expect(settings.monthly_gift_base_limit).toBe(50);
      expect(settings.gift_types).toEqual(['green', 'blue', 'red']);
      expect(settings.max_gift_amount_per_transaction).toBe(10);
    });
  });

  describe('processBulkGift', () => {
    it('should process bulk gifts to multiple recipients', async () => {
      const recipients = ['user-2', 'user-3', 'user-4'];
      
      // Mock successful gifts
      vi.spyOn(economyEngine, 'giftWish').mockResolvedValue({
        success: true,
        wishes: [{ id: 'wish-1', type: 'green', amount: 1 }],
        quotaUsed: 1
      });

      const result = await economyEngine.processBulkGift(
        'user-1',
        recipients,
        'green',
        1,
        'Bulk gift message'
      );

      expect(result.successful).toBe(3);
      expect(result.failed).toBe(0);
      expect(result.errors).toHaveLength(0);
      expect(economyEngine.giftWish).toHaveBeenCalledTimes(3);
    });

    it('should handle partial failures in bulk gifts', async () => {
      const recipients = ['user-2', 'user-3', 'user-4'];
      
      // Mock mixed success/failure
      vi.spyOn(economyEngine, 'giftWish')
        .mockResolvedValueOnce({ success: true, wishes: [], quotaUsed: 1 })
        .mockRejectedValueOnce(new Error('Quota exceeded'))
        .mockResolvedValueOnce({ success: true, wishes: [], quotaUsed: 1 });

      const result = await economyEngine.processBulkGift(
        'user-1',
        recipients,
        'green',
        1
      );

      expect(result.successful).toBe(2);
      expect(result.failed).toBe(1);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain('Failed to gift to user-3');
    });
  });

  describe('getOptimalGiftTiming', () => {
    it('should provide gift timing recommendations', async () => {
      vi.mocked(db.getUserTransactions).mockResolvedValue([]);

      const timing = await economyEngine.getOptimalGiftTiming('user-1');

      expect(timing).toHaveProperty('bestTimeOfDay');
      expect(timing).toHaveProperty('bestDayOfWeek');
      expect(timing).toHaveProperty('recommendedAmount');
      expect(timing).toHaveProperty('reasoning');

      expect(typeof timing.bestTimeOfDay).toBe('string');
      expect(typeof timing.bestDayOfWeek).toBe('string');
      expect(typeof timing.recommendedAmount).toBe('number');
      expect(typeof timing.reasoning).toBe('string');
      expect(timing.recommendedAmount).toBeGreaterThan(0);
    });

    it('should recommend higher amount when quota usage is low', async () => {
      // Mock user with low quota usage
      const lowUsageUser = { ...mockUser, daily_quota_used: 1 };
      vi.spyOn(economyEngine as any, 'getUserById').mockResolvedValue(lowUsageUser);
      vi.mocked(db.getUserTransactions).mockResolvedValue([]);

      const timing = await economyEngine.getOptimalGiftTiming('user-1');

      expect(timing.recommendedAmount).toBe(2);
      expect(timing.reasoning).toContain('plenty of daily quota remaining');
    });
  });

  describe('checkAndResetQuotas', () => {
    it('should check and reset quotas for user', async () => {
      vi.spyOn(economyEngine, 'resetQuotasIfNeeded').mockResolvedValue(true);

      const result = await economyEngine.checkAndResetQuotas('user-1');

      expect(result).toBe(true);
      expect(economyEngine.resetQuotasIfNeeded).toHaveBeenCalledWith(mockUser);
    });

    it('should handle user not found', async () => {
      vi.spyOn(economyEngine as any, 'getUserById').mockResolvedValue(null);

      const result = await economyEngine.checkAndResetQuotas('non-existent');

      expect(result).toBe(false);
    });

    it('should handle errors gracefully', async () => {
      vi.spyOn(economyEngine as any, 'getUserById').mockRejectedValue(new Error('Database error'));

      const result = await economyEngine.checkAndResetQuotas('user-1');

      expect(result).toBe(false);
    });
  });

  describe('collectSystemMetrics', () => {
    it('should collect system-wide economy metrics', async () => {
      const mockSystemMetrics = {
        users: { total: 100, active: 80 },
        transactions: { total: 1000 },
        balances: { averageGreen: 5.5, averageBlue: 3.2, averageRed: 2.1 },
        quotas: { averageDailyUsage: 60, averageWeeklyUsage: 45, averageMonthlyUsage: 30 },
        gifts: { totalToday: 25, totalThisWeek: 150, totalThisMonth: 600 }
      };

      // Mock the economy metrics collector
      const { economyMetricsCollector } = await import('../lib/economy-metrics');
      vi.mocked(economyMetricsCollector.collectSystemMetrics).mockResolvedValue(mockSystemMetrics);

      const result = await economyEngine.collectSystemMetrics();

      expect(result.totalUsers).toBe(100);
      expect(result.activeUsers).toBe(80);
      expect(result.totalTransactions).toBe(1000);
      expect(result.averageBalance.green).toBe(5.5);
      expect(result.averageBalance.blue).toBe(3.2);
      expect(result.averageBalance.red).toBe(2.1);
      expect(result.quotaUtilization.daily).toBe(60);
      expect(result.quotaUtilization.weekly).toBe(45);
      expect(result.quotaUtilization.monthly).toBe(30);
      expect(result.totalGiftsToday).toBe(25);
      expect(result.totalGiftsThisWeek).toBe(150);
      expect(result.totalGiftsThisMonth).toBe(600);
    });

    it('should handle errors in metrics collection', async () => {
      const { economyMetricsCollector } = await import('../lib/economy-metrics');
      vi.mocked(economyMetricsCollector.collectSystemMetrics).mockRejectedValue(new Error('Metrics error'));

      await expect(economyEngine.collectSystemMetrics())
        .rejects.toThrow('Metrics error');
    });
  });
});