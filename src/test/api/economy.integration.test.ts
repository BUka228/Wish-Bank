import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createMocks } from 'node-mocks-http';
import quotasHandler from '../../pages/api/economy/quotas';
import giftHandler from '../../pages/api/economy/gift';
import settingsHandler from '../../pages/api/economy/settings';
import * as telegramAuth from '../../lib/telegram-auth';
import * as db from '../../lib/db';

// Mock dependencies
vi.mock('../../lib/telegram-auth');
vi.mock('../../lib/db');

describe('Economy API', () => {
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

  const mockQuotas = {
    daily: {
      limit: 5,
      used: 2,
      reset_time: new Date('2024-01-16T00:00:00Z')
    },
    weekly: {
      limit: 20,
      used: 8,
      reset_time: new Date('2024-01-22T00:00:00Z')
    },
    monthly: {
      limit: 50,
      used: 15,
      reset_time: new Date('2024-02-01T00:00:00Z')
    }
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(telegramAuth.getUserFromRequest).mockResolvedValue(mockUser);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('GET /api/economy/quotas', () => {
    it('should return user quotas successfully', async () => {
      const { req, res } = createMocks({
        method: 'GET'
      });

      // Mock the EconomyEngine's getUserById method
      const economyEngine = await import('../../lib/economy-engine');
      vi.spyOn(economyEngine.economyEngine as any, 'getUserById').mockResolvedValue(mockUser);

      await quotasHandler(req, res);

      expect(res._getStatusCode()).toBe(200);
      const data = JSON.parse(res._getData());
      expect(data.quotas).toBeDefined();
      expect(data.quotas).toHaveProperty('daily');
      expect(data.quotas).toHaveProperty('weekly');
      expect(data.quotas).toHaveProperty('monthly');
    });

    it('should return 401 for unauthorized requests', async () => {
      const { req, res } = createMocks({
        method: 'GET'
      });

      vi.mocked(telegramAuth.getUserFromRequest).mockResolvedValue(null);

      await quotasHandler(req, res);

      expect(res._getStatusCode()).toBe(401);
      const data = JSON.parse(res._getData());
      expect(data.error).toBe('Unauthorized');
    });

    it('should return 405 for non-GET requests', async () => {
      const { req, res } = createMocks({
        method: 'POST'
      });

      await quotasHandler(req, res);

      expect(res._getStatusCode()).toBe(405);
      const data = JSON.parse(res._getData());
      expect(data.error).toBe('Method not allowed');
    });

    it('should handle errors gracefully', async () => {
      const { req, res } = createMocks({
        method: 'GET'
      });

      const economyEngine = await import('../../lib/economy-engine');
      vi.spyOn(economyEngine.economyEngine as any, 'getUserById').mockRejectedValue(new Error('Database error'));

      await quotasHandler(req, res);

      expect(res._getStatusCode()).toBe(500);
      const data = JSON.parse(res._getData());
      expect(data.error).toBe('Internal server error');
    });
  });

  describe('POST /api/economy/gift', () => {
    it('should process gift successfully', async () => {
      const giftData = {
        recipient_id: 'user-2',
        type: 'green',
        amount: 1,
        message: 'Test gift'
      };

      const { req, res } = createMocks({
        method: 'POST',
        body: giftData
      });

      const mockWishes = [{ id: 'wish-1', type: 'green', amount: 1 }];
      vi.mocked(db.createGiftWish).mockResolvedValue(mockWishes);
      vi.mocked(db.addTransaction).mockResolvedValue({
        id: 'transaction-1',
        user_id: 'user-1',
        type: 'debit',
        wish_type: 'green',
        amount: 0,
        reason: 'Gift to partner',
        created_at: new Date(),
        reference_id: null,
        transaction_category: 'gift'
      });

      // Mock economy engine methods
      const economyEngine = await import('../../lib/economy-engine');
      vi.spyOn(economyEngine.economyEngine as any, 'getUserById')
        .mockResolvedValueOnce(mockUser) // For quota check
        .mockResolvedValueOnce({ ...mockUser, id: 'user-2' }); // For recipient check
      vi.spyOn(economyEngine.economyEngine as any, 'deductFromQuotas').mockResolvedValue(undefined);

      await giftHandler(req, res);

      expect(res._getStatusCode()).toBe(200);
      const data = JSON.parse(res._getData());
      expect(data.success).toBe(true);
      expect(data.wishes).toEqual(mockWishes);
      expect(data.quotaUsed).toBe(1);
    });

    it('should return 400 for missing required fields', async () => {
      const { req, res } = createMocks({
        method: 'POST',
        body: {
          type: 'green'
          // Missing recipient_id
        }
      });

      await giftHandler(req, res);

      expect(res._getStatusCode()).toBe(400);
      const data = JSON.parse(res._getData());
      expect(data.error).toContain('Missing required fields');
    });

    it('should return 400 for invalid gift type', async () => {
      const { req, res } = createMocks({
        method: 'POST',
        body: {
          recipient_id: 'user-2',
          type: 'invalid',
          amount: 1
        }
      });

      await giftHandler(req, res);

      expect(res._getStatusCode()).toBe(400);
      const data = JSON.parse(res._getData());
      expect(data.error).toBe('Invalid gift type. Must be green, blue, or red');
    });

    it('should return 400 for invalid amount', async () => {
      const { req, res } = createMocks({
        method: 'POST',
        body: {
          recipient_id: 'user-2',
          type: 'green',
          amount: 0
        }
      });

      await giftHandler(req, res);

      expect(res._getStatusCode()).toBe(400);
      const data = JSON.parse(res._getData());
      expect(data.error).toBe('Amount must be between 1 and 10');
    });

    it('should handle quota exceeded errors', async () => {
      const { req, res } = createMocks({
        method: 'POST',
        body: {
          recipient_id: 'user-2',
          type: 'green',
          amount: 10 // Exceeds quota
        }
      });

      const economyEngine = await import('../../lib/economy-engine');
      vi.spyOn(economyEngine.economyEngine as any, 'getUserById').mockResolvedValue({
        ...mockUser,
        daily_quota_used: 5 // Already at limit
      });

      await giftHandler(req, res);

      expect(res._getStatusCode()).toBe(400);
      const data = JSON.parse(res._getData());
      expect(data.error).toContain('quota');
    });

    it('should return 401 for unauthorized requests', async () => {
      const { req, res } = createMocks({
        method: 'POST',
        body: {
          recipient_id: 'user-2',
          type: 'green',
          amount: 1
        }
      });

      vi.mocked(telegramAuth.getUserFromRequest).mockResolvedValue(null);

      await giftHandler(req, res);

      expect(res._getStatusCode()).toBe(401);
      const data = JSON.parse(res._getData());
      expect(data.error).toBe('Unauthorized');
    });

    it('should return 405 for non-POST requests', async () => {
      const { req, res } = createMocks({
        method: 'GET'
      });

      await giftHandler(req, res);

      expect(res._getStatusCode()).toBe(405);
      const data = JSON.parse(res._getData());
      expect(data.error).toBe('Method not allowed');
    });
  });

  describe('GET /api/economy/settings', () => {
    it('should return economy settings successfully', async () => {
      const { req, res } = createMocks({
        method: 'GET'
      });

      await settingsHandler(req, res);

      expect(res._getStatusCode()).toBe(200);
      const data = JSON.parse(res._getData());
      expect(data.settings).toBeDefined();
      expect(data.settings).toHaveProperty('daily_gift_base_limit');
      expect(data.settings).toHaveProperty('weekly_gift_base_limit');
      expect(data.settings).toHaveProperty('monthly_gift_base_limit');
      expect(data.settings).toHaveProperty('gift_types');
      expect(data.settings.gift_types).toEqual(['green', 'blue', 'red']);
    });

    it('should return 401 for unauthorized requests', async () => {
      const { req, res } = createMocks({
        method: 'GET'
      });

      vi.mocked(telegramAuth.getUserFromRequest).mockResolvedValue(null);

      await settingsHandler(req, res);

      expect(res._getStatusCode()).toBe(401);
      const data = JSON.parse(res._getData());
      expect(data.error).toBe('Unauthorized');
    });

    it('should return 405 for non-GET requests', async () => {
      const { req, res } = createMocks({
        method: 'POST'
      });

      await settingsHandler(req, res);

      expect(res._getStatusCode()).toBe(405);
      const data = JSON.parse(res._getData());
      expect(data.error).toBe('Method not allowed');
    });

    it('should handle errors gracefully', async () => {
      const { req, res } = createMocks({
        method: 'GET'
      });

      const economyEngine = await import('../../lib/economy-engine');
      vi.spyOn(economyEngine.economyEngine, 'getEconomySettings').mockRejectedValue(new Error('Settings error'));

      await settingsHandler(req, res);

      expect(res._getStatusCode()).toBe(500);
      const data = JSON.parse(res._getData());
      expect(data.error).toBe('Internal server error');
    });
  });
});