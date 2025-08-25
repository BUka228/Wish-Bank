import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { EconomyEngine } from '../../lib/economy-engine';
import * as db from '../../lib/db';

// Mock the database module
vi.mock('../../lib/db');

describe('Gift Workflow E2E Tests', () => {
  let economyEngine: EconomyEngine;

  const mockUser1 = {
    id: 'user-1',
    telegram_id: '123456789',
    username: 'alice',
    first_name: 'Alice',
    last_name: 'Smith',
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

  const mockUser2 = {
    id: 'user-2',
    telegram_id: '987654321',
    username: 'bob',
    first_name: 'Bob',
    last_name: 'Johnson',
    green_balance: 3,
    blue_balance: 5,
    red_balance: 4,
    created_at: new Date('2024-01-01T00:00:00Z'),
    rank: 'Ефрейтор',
    experience_points: 120,
    daily_quota_used: 1,
    weekly_quota_used: 5,
    monthly_quota_used: 10,
    last_quota_reset: new Date('2024-01-15T00:00:00Z')
  };

  beforeEach(() => {
    economyEngine = new EconomyEngine();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Complete Gift Giving and Quota Management Workflow', () => {
    it('should handle full gift workflow with quota validation', async () => {
      // Step 1: Check initial quotas
      vi.spyOn(economyEngine as any, 'getUserById').mockResolvedValue(mockUser1);

      const initialQuotas = await economyEngine.checkQuotas('user-1');

      expect(initialQuotas.daily.used).toBe(2);
      expect(initialQuotas.daily.limit).toBe(5);
      expect(initialQuotas.daily.used < initialQuotas.daily.limit).toBe(true);

      // Step 2: Validate gift quota before sending
      const giftValidation = await economyEngine.validateGiftQuota('user-1', 2);

      expect(giftValidation.canGift).toBe(true);
      expect(giftValidation.remainingQuota).toBe(3); // 5 - 2 = 3

      // Step 3: Send gift to partner
      const giftRequest = {
        recipient_id: 'user-2',
        type: 'green' as const,
        amount: 2,
        message: 'Thank you for helping with dinner!'
      };

      const mockWishes = [
        { id: 'wish-1', type: 'green', amount: 1 },
        { id: 'wish-2', type: 'green', amount: 1 }
      ];

      vi.mocked(db.createGiftWish).mockResolvedValue(mockWishes);
      vi.mocked(db.addTransaction).mockResolvedValue({
        id: 'transaction-1',
        user_id: 'user-1',
        type: 'debit',
        wish_type: 'green',
        amount: 0,
        reason: 'Gift to partner: 2 green wishes',
        created_at: new Date(),
        reference_id: null,
        transaction_category: 'gift'
      });

      // Mock getUserById for both quota check and recipient check
      vi.spyOn(economyEngine as any, 'getUserById')
        .mockResolvedValueOnce(mockUser1) // For quota check
        .mockResolvedValueOnce(mockUser2); // For recipient check
      vi.spyOn(economyEngine as any, 'deductFromQuotas').mockResolvedValue(undefined);

      const giftResult = await economyEngine.giftWish('user-1', giftRequest);

      expect(giftResult.success).toBe(true);
      expect(giftResult.wishes).toEqual(mockWishes);
      expect(giftResult.quotaUsed).toBe(2);

      // Step 4: Verify quotas are updated after gift
      const updatedUser = { ...mockUser1, daily_quota_used: 4 };
      vi.spyOn(economyEngine as any, 'getUserById').mockResolvedValue(updatedUser);

      const updatedQuotas = await economyEngine.checkQuotas('user-1');

      expect(updatedQuotas.daily.used).toBe(4);
      expect(updatedQuotas.daily.limit).toBe(5);

      // Step 5: Try to send another gift that would exceed quota
      const excessiveGiftValidation = await economyEngine.validateGiftQuota('user-1', 3);

      expect(excessiveGiftValidation.canGift).toBe(false);
      expect(excessiveGiftValidation.errors).toContain('Daily quota exceeded. Used: 4/5, trying to gift: 3');
    });

    it('should handle quota reset workflow', async () => {
      // User with quotas that need reset (last reset was yesterday)
      const userNeedingReset = {
        ...mockUser1,
        daily_quota_used: 5,
        last_quota_reset: new Date('2024-01-14T00:00:00Z') // Yesterday
      };

      vi.spyOn(economyEngine as any, 'getUserById').mockResolvedValue(userNeedingReset);
      vi.spyOn(economyEngine as any, 'performQuotaReset').mockResolvedValue(undefined);

      // Check quotas should trigger reset
      const quotasAfterReset = await economyEngine.checkQuotas('user-1');

      // Verify reset was called
      expect(economyEngine['performQuotaReset']).toHaveBeenCalledWith(
        'user-1',
        new Date('2024-01-15T10:00:00Z') // Current mocked time
      );
    });
  });

  describe('Bulk Gift Workflow', () => {
    it('should handle bulk gift operations with mixed success/failure', async () => {
      const recipients = ['user-2', 'user-3', 'user-4'];

      // Mock successful gifts for first and third recipients, failure for second
      vi.spyOn(economyEngine, 'giftWish')
        .mockResolvedValueOnce({ success: true, wishes: [], quotaUsed: 1 })
        .mockRejectedValueOnce(new Error('Recipient not found'))
        .mockResolvedValueOnce({ success: true, wishes: [], quotaUsed: 1 });

      const result = await economyEngine.processBulkGift(
        'user-1',
        recipients,
        'green',
        1,
        'Holiday gift for everyone!'
      );

      expect(result.successful).toBe(2);
      expect(result.failed).toBe(1);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain('Failed to gift to user-3');
    });
  });

  describe('Economy Metrics Workflow', () => {
    it('should calculate comprehensive economy metrics', async () => {
      const mockTransactions = [
        {
          id: 'tx-1',
          user_id: 'user-1',
          type: 'debit' as const,
          wish_type: 'green' as const,
          amount: 0,
          reason: 'Gift to partner: 1 green wishes',
          created_at: new Date('2024-01-15T08:00:00Z'),
          reference_id: null,
          transaction_category: 'gift'
        },
        {
          id: 'tx-2',
          user_id: 'user-1',
          type: 'credit' as const,
          wish_type: 'blue' as const,
          amount: 0,
          reason: 'Gift from partner: 1 blue wishes',
          created_at: new Date('2024-01-15T09:00:00Z'),
          reference_id: null,
          transaction_category: 'gift'
        }
      ];

      vi.mocked(db.getUserTransactions).mockResolvedValue(mockTransactions);
      vi.spyOn(economyEngine as any, 'getUserById').mockResolvedValue(mockUser1);

      const metrics = await economyEngine.calculateEconomyMetrics('user-1');

      expect(metrics.total_gifts_given).toBe(1);
      expect(metrics.total_gifts_received).toBe(1);
      expect(metrics.quota_utilization.daily).toBe(40); // 2/5 * 100
      expect(metrics.gift_frequency).toBe(1); // 1 gift in the last week
    });
  });
});