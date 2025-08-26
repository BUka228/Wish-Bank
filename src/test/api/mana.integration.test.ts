import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createMocks } from 'node-mocks-http';
import balanceHandler from '../../pages/api/mana/balance';
import spendHandler from '../../pages/api/mana/spend';
import enhanceHandler from '../../pages/api/wishes/enhance';
import * as telegramAuth from '../../lib/telegram-auth';
import { manaEngine } from '../../lib/mana-engine';
import { enhancementEngine } from '../../lib/enhancement-engine';

// Mock dependencies
vi.mock('../../lib/telegram-auth');
vi.mock('../../lib/mana-engine');
vi.mock('../../lib/enhancement-engine');

describe('Mana API Integration Tests', () => {
  const mockUser = {
    id: 'user-123',
    telegram_id: '123456789',
    username: 'testuser',
    first_name: 'Test',
    last_name: 'User',
    mana_balance: 150,
    created_at: new Date('2024-01-01T00:00:00Z'),
    rank: 'Рядовой',
    experience_points: 50
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(telegramAuth.getUserFromRequest).mockResolvedValue(mockUser);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('GET /api/mana/balance', () => {
    it('should return user mana balance successfully', async () => {
      const { req, res } = createMocks({
        method: 'GET'
      });

      vi.mocked(manaEngine.getUserMana).mockResolvedValue(150);

      await balanceHandler(req, res);

      expect(res._getStatusCode()).toBe(200);
      const data = JSON.parse(res._getData());
      expect(data.balance).toBe(150);
      expect(manaEngine.getUserMana).toHaveBeenCalledWith('user-123');
    });

    it('should return detailed stats when requested', async () => {
      const { req, res } = createMocks({
        method: 'GET',
        query: { detailed: 'true' }
      });

      const mockStats = {
        current_balance: 150,
        total_earned: 500,
        total_spent: 350,
        transaction_count: 25,
        last_transaction: new Date('2024-01-15T10:00:00Z')
      };

      vi.mocked(manaEngine.getUserMana).mockResolvedValue(150);
      vi.mocked(manaEngine.getUserManaStats).mockResolvedValue(mockStats);

      await balanceHandler(req, res);

      expect(res._getStatusCode()).toBe(200);
      const data = JSON.parse(res._getData());
      expect(data.balance).toBe(150);
      expect(data.stats.current_balance).toBe(mockStats.current_balance);
      expect(data.stats.total_earned).toBe(mockStats.total_earned);
      expect(data.stats.total_spent).toBe(mockStats.total_spent);
      expect(data.stats.transaction_count).toBe(mockStats.transaction_count);
      expect(new Date(data.stats.last_transaction)).toEqual(mockStats.last_transaction);
      expect(manaEngine.getUserManaStats).toHaveBeenCalledWith('user-123');
    });

    it('should return 401 for unauthorized requests', async () => {
      const { req, res } = createMocks({
        method: 'GET'
      });

      vi.mocked(telegramAuth.getUserFromRequest).mockResolvedValue(null);

      await balanceHandler(req, res);

      expect(res._getStatusCode()).toBe(401);
      const data = JSON.parse(res._getData());
      expect(data.error).toBe('Unauthorized');
    });

    it('should return 405 for non-GET requests', async () => {
      const { req, res } = createMocks({
        method: 'POST'
      });

      await balanceHandler(req, res);

      expect(res._getStatusCode()).toBe(405);
      const data = JSON.parse(res._getData());
      expect(data.error).toBe('Method not allowed');
    });

    it('should handle mana engine errors gracefully', async () => {
      const { req, res } = createMocks({
        method: 'GET'
      });

      vi.mocked(manaEngine.getUserMana).mockRejectedValue(new Error('Database error'));

      await balanceHandler(req, res);

      expect(res._getStatusCode()).toBe(500);
      const data = JSON.parse(res._getData());
      expect(data.error).toBe('Internal server error');
    });
  });

  describe('POST /api/mana/spend', () => {
    it('should spend mana successfully', async () => {
      const { req, res } = createMocks({
        method: 'POST',
        body: {
          amount: 50,
          reason: 'priority_enhancement'
        }
      });

      const mockValidation = {
        isValid: true,
        errors: [],
        currentBalance: 150,
        canProceed: true
      };

      vi.mocked(manaEngine.validateManaOperation).mockResolvedValue(mockValidation);
      vi.mocked(manaEngine.spendMana).mockResolvedValue(true);
      vi.mocked(manaEngine.getUserMana).mockResolvedValue(100); // New balance after spending

      await spendHandler(req, res);

      expect(res._getStatusCode()).toBe(200);
      const data = JSON.parse(res._getData());
      expect(data.success).toBe(true);
      expect(data.amountSpent).toBe(50);
      expect(data.newBalance).toBe(100);
      expect(data.reason).toBe('priority_enhancement');

      expect(manaEngine.validateManaOperation).toHaveBeenCalledWith('user-123', 50, 'spend');
      expect(manaEngine.spendMana).toHaveBeenCalledWith('user-123', 50, 'priority_enhancement');
    });

    it('should return 400 for insufficient mana', async () => {
      const { req, res } = createMocks({
        method: 'POST',
        body: {
          amount: 200,
          reason: 'priority_enhancement'
        }
      });

      const mockValidation = {
        isValid: true,
        errors: ['Недостаточно Маны'],
        currentBalance: 150,
        canProceed: false
      };

      vi.mocked(manaEngine.validateManaOperation).mockResolvedValue(mockValidation);

      await spendHandler(req, res);

      expect(res._getStatusCode()).toBe(400);
      const data = JSON.parse(res._getData());
      expect(data.error).toBe('Недостаточно Маны');
      expect(data.currentBalance).toBe(150);
    });

    it('should return 400 for invalid amount', async () => {
      const { req, res } = createMocks({
        method: 'POST',
        body: {
          amount: 0,
          reason: 'test'
        }
      });

      await spendHandler(req, res);

      expect(res._getStatusCode()).toBe(400);
      const data = JSON.parse(res._getData());
      expect(data.error).toBe('Amount is required and must be positive');
    });

    it('should return 400 for missing reason', async () => {
      const { req, res } = createMocks({
        method: 'POST',
        body: {
          amount: 50
        }
      });

      await spendHandler(req, res);

      expect(res._getStatusCode()).toBe(400);
      const data = JSON.parse(res._getData());
      expect(data.error).toBe('Reason is required');
    });

    it('should return 401 for unauthorized requests', async () => {
      const { req, res } = createMocks({
        method: 'POST',
        body: {
          amount: 50,
          reason: 'test'
        }
      });

      vi.mocked(telegramAuth.getUserFromRequest).mockResolvedValue(null);

      await spendHandler(req, res);

      expect(res._getStatusCode()).toBe(401);
      const data = JSON.parse(res._getData());
      expect(data.error).toBe('Unauthorized');
    });

    it('should return 405 for non-POST requests', async () => {
      const { req, res } = createMocks({
        method: 'GET'
      });

      await spendHandler(req, res);

      expect(res._getStatusCode()).toBe(405);
      const data = JSON.parse(res._getData());
      expect(data.error).toBe('Method not allowed');
    });

    it('should handle spend failure gracefully', async () => {
      const { req, res } = createMocks({
        method: 'POST',
        body: {
          amount: 50,
          reason: 'test'
        }
      });

      const mockValidation = {
        isValid: true,
        errors: [],
        currentBalance: 150,
        canProceed: true
      };

      vi.mocked(manaEngine.validateManaOperation).mockResolvedValue(mockValidation);
      vi.mocked(manaEngine.spendMana).mockResolvedValue(false); // Spend fails

      await spendHandler(req, res);

      expect(res._getStatusCode()).toBe(400);
      const data = JSON.parse(res._getData());
      expect(data.error).toBe('Недостаточно Маны');
      expect(data.currentBalance).toBe(150);
    });
  });

  describe('POST /api/wishes/enhance', () => {
    const mockWishId = 'wish-456';

    it('should apply priority enhancement successfully', async () => {
      const { req, res } = createMocks({
        method: 'POST',
        body: {
          wishId: mockWishId,
          type: 'priority',
          level: 3
        }
      });

      const mockValidation = {
        isValid: true,
        errors: [],
        canApply: true,
        cost: 50
      };

      const mockEnhancement = {
        id: 'enhancement-123',
        wish_id: mockWishId,
        type: 'priority',
        level: 3,
        cost: 50,
        applied_at: new Date(),
        applied_by: 'user-123'
      };

      vi.mocked(enhancementEngine.validateEnhancement).mockResolvedValue(mockValidation);
      vi.mocked(enhancementEngine.applyPriorityEnhancement).mockResolvedValue(mockEnhancement);

      await enhanceHandler(req, res);

      expect(res._getStatusCode()).toBe(200);
      const data = JSON.parse(res._getData());
      expect(data.success).toBe(true);
      expect(data.enhancement.id).toBe(mockEnhancement.id);
      expect(data.enhancement.wish_id).toBe(mockEnhancement.wish_id);
      expect(data.enhancement.type).toBe(mockEnhancement.type);
      expect(data.enhancement.level).toBe(mockEnhancement.level);
      expect(data.enhancement.cost).toBe(mockEnhancement.cost);
      expect(new Date(data.enhancement.applied_at)).toEqual(mockEnhancement.applied_at);
      expect(data.message).toBe('Приоритет желания повышен до уровня 3');

      expect(enhancementEngine.validateEnhancement).toHaveBeenCalledWith(
        mockWishId, 'user-123', 'priority', 3, undefined
      );
      expect(enhancementEngine.applyPriorityEnhancement).toHaveBeenCalledWith(mockWishId, 3);
    });

    it('should apply aura enhancement successfully', async () => {
      const { req, res } = createMocks({
        method: 'POST',
        body: {
          wishId: mockWishId,
          type: 'aura',
          auraType: 'tech'
        }
      });

      const mockValidation = {
        isValid: true,
        errors: [],
        canApply: true,
        cost: 50
      };

      const mockEnhancement = {
        id: 'enhancement-124',
        wish_id: mockWishId,
        type: 'aura',
        level: 1,
        aura_type: 'romantic',
        cost: 50,
        applied_at: new Date(),
        applied_by: 'user-123'
      };

      vi.mocked(enhancementEngine.validateEnhancement).mockResolvedValue(mockValidation);
      vi.mocked(enhancementEngine.applyAuraEnhancement).mockResolvedValue(mockEnhancement);

      await enhanceHandler(req, res);

      expect(res._getStatusCode()).toBe(200);
      const data = JSON.parse(res._getData());
      expect(data.success).toBe(true);
      expect(data.enhancement.id).toBe(mockEnhancement.id);
      expect(data.enhancement.wish_id).toBe(mockEnhancement.wish_id);
      expect(data.enhancement.type).toBe(mockEnhancement.type);
      expect(data.enhancement.level).toBe(mockEnhancement.level);
      expect(data.enhancement.aura_type).toBe(mockEnhancement.aura_type);
      expect(data.enhancement.cost).toBe(mockEnhancement.cost);
      expect(new Date(data.enhancement.applied_at)).toEqual(mockEnhancement.applied_at);
      expect(data.message).toBe('Аура "tech" применена к желанию');

      expect(enhancementEngine.validateEnhancement).toHaveBeenCalledWith(
        mockWishId, 'user-123', 'aura', undefined, 'tech'
      );
      expect(enhancementEngine.applyAuraEnhancement).toHaveBeenCalledWith(mockWishId, 'tech');
    });

    it('should return 400 for validation failures', async () => {
      const { req, res } = createMocks({
        method: 'POST',
        body: {
          wishId: mockWishId,
          type: 'priority',
          level: 3
        }
      });

      const mockValidation = {
        isValid: false,
        errors: ['Недостаточно Маны'],
        canApply: false,
        cost: 50
      };

      vi.mocked(enhancementEngine.validateEnhancement).mockResolvedValue(mockValidation);

      await enhanceHandler(req, res);

      expect(res._getStatusCode()).toBe(400);
      const data = JSON.parse(res._getData());
      expect(data.error).toBe('Недостаточно Маны');
      expect(data.validation).toEqual(mockValidation);
    });

    it('should return 400 for missing wishId', async () => {
      const { req, res } = createMocks({
        method: 'POST',
        body: {
          type: 'priority',
          level: 3
        }
      });

      await enhanceHandler(req, res);

      expect(res._getStatusCode()).toBe(400);
      const data = JSON.parse(res._getData());
      expect(data.error).toBe('wishId is required');
    });

    it('should return 400 for invalid enhancement type', async () => {
      const { req, res } = createMocks({
        method: 'POST',
        body: {
          wishId: mockWishId,
          type: 'invalid'
        }
      });

      await enhanceHandler(req, res);

      expect(res._getStatusCode()).toBe(400);
      const data = JSON.parse(res._getData());
      expect(data.error).toBe('type must be either "priority" or "aura"');
    });

    it('should return 400 for invalid priority level', async () => {
      const { req, res } = createMocks({
        method: 'POST',
        body: {
          wishId: mockWishId,
          type: 'priority',
          level: 0
        }
      });

      const mockValidation = {
        isValid: true,
        errors: [],
        canApply: true,
        cost: 50
      };

      vi.mocked(enhancementEngine.validateEnhancement).mockResolvedValue(mockValidation);

      await enhanceHandler(req, res);

      expect(res._getStatusCode()).toBe(400);
      const data = JSON.parse(res._getData());
      expect(data.error).toBe('level is required for priority enhancement and must be between 1 and 5');
    });

    it('should return 400 for invalid aura type', async () => {
      const { req, res } = createMocks({
        method: 'POST',
        body: {
          wishId: mockWishId,
          type: 'aura',
          auraType: 'invalid'
        }
      });

      const mockValidation = {
        isValid: true,
        errors: [],
        canApply: true,
        cost: 50
      };

      vi.mocked(enhancementEngine.validateEnhancement).mockResolvedValue(mockValidation);

      await enhanceHandler(req, res);

      expect(res._getStatusCode()).toBe(400);
      const data = JSON.parse(res._getData());
      expect(data.error).toBe('auraType is required for aura enhancement and must be one of: tech, gaming, nature, cosmic');
    });

    it('should return 401 for unauthorized requests', async () => {
      const { req, res } = createMocks({
        method: 'POST',
        body: {
          wishId: mockWishId,
          type: 'priority',
          level: 3
        }
      });

      vi.mocked(telegramAuth.getUserFromRequest).mockResolvedValue(null);

      await enhanceHandler(req, res);

      expect(res._getStatusCode()).toBe(401);
      const data = JSON.parse(res._getData());
      expect(data.error).toBe('Unauthorized');
    });

    it('should return 405 for non-POST requests', async () => {
      const { req, res } = createMocks({
        method: 'GET'
      });

      await enhanceHandler(req, res);

      expect(res._getStatusCode()).toBe(405);
      const data = JSON.parse(res._getData());
      expect(data.error).toBe('Method not allowed');
    });

    it('should handle enhancement engine errors gracefully', async () => {
      const { req, res } = createMocks({
        method: 'POST',
        body: {
          wishId: mockWishId,
          type: 'priority',
          level: 3
        }
      });

      vi.mocked(enhancementEngine.validateEnhancement).mockRejectedValue(new Error('Database error'));

      await enhanceHandler(req, res);

      expect(res._getStatusCode()).toBe(500);
      const data = JSON.parse(res._getData());
      expect(data.error).toBe('Internal server error');
    });
  });

  describe('API Error Handling', () => {
    it('should handle InsufficientManaError in enhancement API', async () => {
      const { req, res } = createMocks({
        method: 'POST',
        body: {
          wishId: 'wish-456',
          type: 'priority',
          level: 3
        }
      });

      const mockValidation = {
        isValid: true,
        errors: [],
        canApply: true,
        cost: 50
      };

      const { InsufficientManaError } = await import('../../types/mana-system');
      
      vi.mocked(enhancementEngine.validateEnhancement).mockResolvedValue(mockValidation);
      vi.mocked(enhancementEngine.applyPriorityEnhancement).mockRejectedValue(
        new InsufficientManaError(50, 30)
      );

      await enhanceHandler(req, res);

      expect(res._getStatusCode()).toBe(400);
      const data = JSON.parse(res._getData());
      expect(data.error).toBe('Недостаточно Маны для применения усиления');
    });

    it('should handle EnhancementError in enhancement API', async () => {
      const { req, res } = createMocks({
        method: 'POST',
        body: {
          wishId: 'wish-456',
          type: 'priority',
          level: 3
        }
      });

      const mockValidation = {
        isValid: true,
        errors: [],
        canApply: true,
        cost: 50
      };

      const { EnhancementError } = await import('../../types/mana-system');
      
      vi.mocked(enhancementEngine.validateEnhancement).mockResolvedValue(mockValidation);
      vi.mocked(enhancementEngine.applyPriorityEnhancement).mockRejectedValue(
        new EnhancementError('Wish not found', 'wish-456')
      );

      await enhanceHandler(req, res);

      expect(res._getStatusCode()).toBe(400);
      const data = JSON.parse(res._getData());
      expect(data.error).toContain('Wish not found');
    });
  });

  describe('API Performance and Load Testing', () => {
    it('should handle multiple concurrent balance requests', async () => {
      vi.mocked(manaEngine.getUserMana).mockResolvedValue(150);

      const requests = Array.from({ length: 10 }, () => {
        const { req, res } = createMocks({ method: 'GET' });
        return balanceHandler(req, res);
      });

      const startTime = Date.now();
      await Promise.all(requests);
      const endTime = Date.now();

      expect(endTime - startTime).toBeLessThan(1000); // Should complete within 1 second
      expect(manaEngine.getUserMana).toHaveBeenCalledTimes(10);
    });

    it('should handle multiple concurrent spend requests', async () => {
      const mockValidation = {
        isValid: true,
        errors: [],
        currentBalance: 1000,
        canProceed: true
      };

      vi.mocked(manaEngine.validateManaOperation).mockResolvedValue(mockValidation);
      vi.mocked(manaEngine.spendMana).mockResolvedValue(true);
      vi.mocked(manaEngine.getUserMana).mockResolvedValue(950);

      const requests = Array.from({ length: 5 }, (_, i) => {
        const { req, res } = createMocks({
          method: 'POST',
          body: {
            amount: 10,
            reason: `concurrent_spend_${i}`
          }
        });
        return spendHandler(req, res);
      });

      await Promise.allSettled(requests);

      expect(manaEngine.spendMana).toHaveBeenCalledTimes(5);
    });
  });
});