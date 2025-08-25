import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createMocks } from 'node-mocks-http';
import enhancementsHandler from '../../pages/api/wishes/[id]/enhancements';
import * as telegramAuth from '../../lib/telegram-auth';
import { enhancementEngine } from '../../lib/enhancement-engine';

// Mock dependencies
vi.mock('../../lib/telegram-auth');
vi.mock('../../lib/enhancement-engine');

describe('Wish Enhancements API Integration Tests', () => {
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

  const mockWishId = 'wish-456';

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(telegramAuth.getUserFromRequest).mockResolvedValue(mockUser);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('GET /api/wishes/[id]/enhancements', () => {
    it('should return wish enhancements successfully', async () => {
      const { req, res } = createMocks({
        method: 'GET',
        query: { id: mockWishId }
      });

      const mockEnhancements = [
        {
          id: 'enhancement-1',
          wish_id: mockWishId,
          type: 'priority',
          level: 3,
          cost: 50,
          applied_at: new Date('2024-01-15T10:00:00Z'),
          applied_by: 'user-123',
          metadata: {}
        },
        {
          id: 'enhancement-2',
          wish_id: mockWishId,
          type: 'aura',
          level: 1,
          aura_type: 'romantic',
          cost: 50,
          applied_at: new Date('2024-01-15T11:00:00Z'),
          applied_by: 'user-123',
          metadata: {}
        }
      ];

      vi.mocked(enhancementEngine.getWishEnhancements).mockResolvedValue(mockEnhancements);

      await enhancementsHandler(req, res);

      expect(res._getStatusCode()).toBe(200);
      const data = JSON.parse(res._getData());
      expect(data.enhancements).toEqual(mockEnhancements);
      expect(data.enhancements).toHaveLength(2);
      expect(enhancementEngine.getWishEnhancements).toHaveBeenCalledWith(mockWishId);
    });

    it('should return empty array for wish with no enhancements', async () => {
      const { req, res } = createMocks({
        method: 'GET',
        query: { id: mockWishId }
      });

      vi.mocked(enhancementEngine.getWishEnhancements).mockResolvedValue([]);

      await enhancementsHandler(req, res);

      expect(res._getStatusCode()).toBe(200);
      const data = JSON.parse(res._getData());
      expect(data.enhancements).toEqual([]);
    });

    it('should return 400 for missing wish ID', async () => {
      const { req, res } = createMocks({
        method: 'GET',
        query: {}
      });

      await enhancementsHandler(req, res);

      expect(res._getStatusCode()).toBe(400);
      const data = JSON.parse(res._getData());
      expect(data.error).toBe('Wish ID is required');
    });

    it('should return 401 for unauthorized requests', async () => {
      const { req, res } = createMocks({
        method: 'GET',
        query: { id: mockWishId }
      });

      vi.mocked(telegramAuth.getUserFromRequest).mockResolvedValue(null);

      await enhancementsHandler(req, res);

      expect(res._getStatusCode()).toBe(401);
      const data = JSON.parse(res._getData());
      expect(data.error).toBe('Unauthorized');
    });

    it('should handle enhancement engine errors gracefully', async () => {
      const { req, res } = createMocks({
        method: 'GET',
        query: { id: mockWishId }
      });

      vi.mocked(enhancementEngine.getWishEnhancements).mockRejectedValue(new Error('Database error'));

      await enhancementsHandler(req, res);

      expect(res._getStatusCode()).toBe(500);
      const data = JSON.parse(res._getData());
      expect(data.error).toBe('Internal server error');
    });
  });

  describe('DELETE /api/wishes/[id]/enhancements', () => {
    it('should remove enhancement successfully (admin only)', async () => {
      const { req, res } = createMocks({
        method: 'DELETE',
        query: { id: mockWishId },
        body: { enhancementId: 'enhancement-123' }
      });

      // Mock admin user
      const adminUser = { ...mockUser, id: 'admin-user', rank: 'Администратор' };
      vi.mocked(telegramAuth.getUserFromRequest).mockResolvedValue(adminUser);

      vi.mocked(enhancementEngine.removeEnhancement).mockResolvedValue(undefined);

      await enhancementsHandler(req, res);

      expect(res._getStatusCode()).toBe(200);
      const data = JSON.parse(res._getData());
      expect(data.success).toBe(true);
      expect(data.message).toBe('Enhancement removed successfully');
      expect(enhancementEngine.removeEnhancement).toHaveBeenCalledWith('enhancement-123', 'admin-user');
    });

    it('should return 400 for missing enhancement ID', async () => {
      const { req, res } = createMocks({
        method: 'DELETE',
        query: { id: mockWishId },
        body: {}
      });

      const adminUser = { ...mockUser, id: 'admin-user', rank: 'Администратор' };
      vi.mocked(telegramAuth.getUserFromRequest).mockResolvedValue(adminUser);

      await enhancementsHandler(req, res);

      expect(res._getStatusCode()).toBe(400);
      const data = JSON.parse(res._getData());
      expect(data.error).toBe('Enhancement ID is required');
    });

    it('should return 403 for non-admin users', async () => {
      const { req, res } = createMocks({
        method: 'DELETE',
        query: { id: mockWishId },
        body: { enhancementId: 'enhancement-123' }
      });

      // Regular user (not admin)
      await enhancementsHandler(req, res);

      expect(res._getStatusCode()).toBe(403);
      const data = JSON.parse(res._getData());
      expect(data.error).toBe('Admin access required');
    });
  });

  describe('POST /api/wishes/[id]/enhancements/validate', () => {
    it('should validate priority enhancement successfully', async () => {
      const { req, res } = createMocks({
        method: 'POST',
        query: { id: mockWishId },
        body: {
          action: 'validate',
          type: 'priority',
          level: 3
        }
      });

      const mockValidation = {
        isValid: true,
        errors: [],
        canApply: true,
        cost: 50,
        currentLevel: 2
      };

      vi.mocked(enhancementEngine.validateEnhancement).mockResolvedValue(mockValidation);

      await enhancementsHandler(req, res);

      expect(res._getStatusCode()).toBe(200);
      const data = JSON.parse(res._getData());
      expect(data.validation).toEqual(mockValidation);
      expect(enhancementEngine.validateEnhancement).toHaveBeenCalledWith(
        mockWishId, 'user-123', 'priority', 3, undefined
      );
    });

    it('should validate aura enhancement successfully', async () => {
      const { req, res } = createMocks({
        method: 'POST',
        query: { id: mockWishId },
        body: {
          action: 'validate',
          type: 'aura',
          auraType: 'gaming'
        }
      });

      const mockValidation = {
        isValid: true,
        errors: [],
        canApply: true,
        cost: 50
      };

      vi.mocked(enhancementEngine.validateEnhancement).mockResolvedValue(mockValidation);

      await enhancementsHandler(req, res);

      expect(res._getStatusCode()).toBe(200);
      const data = JSON.parse(res._getData());
      expect(data.validation).toEqual(mockValidation);
      expect(enhancementEngine.validateEnhancement).toHaveBeenCalledWith(
        mockWishId, 'user-123', 'aura', undefined, 'gaming'
      );
    });

    it('should return validation errors', async () => {
      const { req, res } = createMocks({
        method: 'POST',
        query: { id: mockWishId },
        body: {
          action: 'validate',
          type: 'priority',
          level: 6 // Invalid level
        }
      });

      const mockValidation = {
        isValid: false,
        errors: ['Priority level must be between 1 and 5'],
        canApply: false,
        cost: 0
      };

      vi.mocked(enhancementEngine.validateEnhancement).mockResolvedValue(mockValidation);

      await enhancementsHandler(req, res);

      expect(res._getStatusCode()).toBe(200);
      const data = JSON.parse(res._getData());
      expect(data.validation.isValid).toBe(false);
      expect(data.validation.errors).toContain('Priority level must be between 1 and 5');
    });

    it('should return insufficient mana validation', async () => {
      const { req, res } = createMocks({
        method: 'POST',
        query: { id: mockWishId },
        body: {
          action: 'validate',
          type: 'priority',
          level: 5
        }
      });

      const mockValidation = {
        isValid: true,
        errors: ['Недостаточно Маны'],
        canApply: false,
        cost: 200
      };

      vi.mocked(enhancementEngine.validateEnhancement).mockResolvedValue(mockValidation);

      await enhancementsHandler(req, res);

      expect(res._getStatusCode()).toBe(200);
      const data = JSON.parse(res._getData());
      expect(data.validation.canApply).toBe(false);
      expect(data.validation.errors).toContain('Недостаточно Маны');
    });
  });

  describe('GET /api/wishes/[id]/enhancements/costs', () => {
    it('should return enhancement costs', async () => {
      const { req, res } = createMocks({
        method: 'GET',
        query: { id: mockWishId, action: 'costs' }
      });

      vi.mocked(enhancementEngine.getNextPriorityCost).mockResolvedValue(25);

      await enhancementsHandler(req, res);

      expect(res._getStatusCode()).toBe(200);
      const data = JSON.parse(res._getData());
      expect(data.costs).toBeDefined();
      expect(data.costs.priority).toBeDefined();
      expect(data.costs.aura).toBe(50);
      expect(data.costs.nextPriorityLevel).toBe(25);
    });

    it('should return null for max priority level reached', async () => {
      const { req, res } = createMocks({
        method: 'GET',
        query: { id: mockWishId, action: 'costs' }
      });

      vi.mocked(enhancementEngine.getNextPriorityCost).mockResolvedValue(null);

      await enhancementsHandler(req, res);

      expect(res._getStatusCode()).toBe(200);
      const data = JSON.parse(res._getData());
      expect(data.costs.nextPriorityLevel).toBeNull();
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should return 405 for unsupported methods', async () => {
      const { req, res } = createMocks({
        method: 'PUT',
        query: { id: mockWishId }
      });

      await enhancementsHandler(req, res);

      expect(res._getStatusCode()).toBe(405);
      const data = JSON.parse(res._getData());
      expect(data.error).toBe('Method not allowed');
    });

    it('should handle malformed request bodies gracefully', async () => {
      const { req, res } = createMocks({
        method: 'POST',
        query: { id: mockWishId },
        body: 'invalid json'
      });

      await enhancementsHandler(req, res);

      expect(res._getStatusCode()).toBe(400);
    });

    it('should handle concurrent requests to same wish', async () => {
      const requests = Array.from({ length: 5 }, () => {
        const { req, res } = createMocks({
          method: 'GET',
          query: { id: mockWishId }
        });
        return { req, res };
      });

      vi.mocked(enhancementEngine.getWishEnhancements).mockResolvedValue([]);

      const promises = requests.map(({ req, res }) => enhancementsHandler(req, res));
      await Promise.all(promises);

      // All requests should succeed
      requests.forEach(({ res }) => {
        expect(res._getStatusCode()).toBe(200);
      });

      expect(enhancementEngine.getWishEnhancements).toHaveBeenCalledTimes(5);
    });

    it('should handle database timeout errors', async () => {
      const { req, res } = createMocks({
        method: 'GET',
        query: { id: mockWishId }
      });

      vi.mocked(enhancementEngine.getWishEnhancements).mockRejectedValue(
        new Error('Connection timeout')
      );

      await enhancementsHandler(req, res);

      expect(res._getStatusCode()).toBe(500);
      const data = JSON.parse(res._getData());
      expect(data.error).toBe('Internal server error');
    });
  });

  describe('Performance and Load Testing', () => {
    it('should handle high-frequency validation requests', async () => {
      const validationRequests = Array.from({ length: 20 }, (_, i) => {
        const { req, res } = createMocks({
          method: 'POST',
          query: { id: `wish-${i}` },
          body: {
            action: 'validate',
            type: 'priority',
            level: 2
          }
        });
        return { req, res };
      });

      const mockValidation = {
        isValid: true,
        errors: [],
        canApply: true,
        cost: 25
      };

      vi.mocked(enhancementEngine.validateEnhancement).mockResolvedValue(mockValidation);

      const startTime = Date.now();
      const promises = validationRequests.map(({ req, res }) => enhancementsHandler(req, res));
      await Promise.all(promises);
      const endTime = Date.now();

      // Should complete within reasonable time
      expect(endTime - startTime).toBeLessThan(2000);

      // All requests should succeed
      validationRequests.forEach(({ res }) => {
        expect(res._getStatusCode()).toBe(200);
      });
    });

    it('should handle batch enhancement queries efficiently', async () => {
      const batchRequests = Array.from({ length: 10 }, (_, i) => {
        const { req, res } = createMocks({
          method: 'GET',
          query: { id: `wish-${i}` }
        });
        return { req, res };
      });

      vi.mocked(enhancementEngine.getWishEnhancements).mockResolvedValue([]);

      const startTime = Date.now();
      await Promise.all(batchRequests.map(({ req, res }) => enhancementsHandler(req, res)));
      const endTime = Date.now();

      expect(endTime - startTime).toBeLessThan(1000);
      expect(enhancementEngine.getWishEnhancements).toHaveBeenCalledTimes(10);
    });
  });
});