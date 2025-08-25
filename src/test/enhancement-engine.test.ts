import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { enhancementEngine } from '../lib/enhancement-engine';
import { manaEngine } from '../lib/mana-engine';
import { db } from '../lib/db-pool';
import { 
  Enhancement, 
  EnhancementError, 
  InsufficientManaError,
  DEFAULT_ENHANCEMENT_COSTS 
} from '../types/mana-system';

// Mock dependencies
vi.mock('../lib/db-pool', () => ({
  db: {
    execute: vi.fn(),
    transaction: vi.fn()
  },
  DatabaseMonitor: {
    startQuery: vi.fn(() => vi.fn())
  }
}));

vi.mock('../lib/mana-engine', () => ({
  manaEngine: {
    getUserMana: vi.fn(),
    spendMana: vi.fn()
  }
}));

describe('EnhancementEngine', () => {
  const mockUserId = 'user-123';
  const mockWishId = 'wish-456';
  const mockEnhancementId = 'enhancement-789';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('calculateEnhancementCost', () => {
    it('should calculate correct priority enhancement costs', () => {
      expect(enhancementEngine.calculateEnhancementCost('priority', 1)).toBe(10);
      expect(enhancementEngine.calculateEnhancementCost('priority', 2)).toBe(25);
      expect(enhancementEngine.calculateEnhancementCost('priority', 3)).toBe(50);
      expect(enhancementEngine.calculateEnhancementCost('priority', 4)).toBe(100);
      expect(enhancementEngine.calculateEnhancementCost('priority', 5)).toBe(200);
    });

    it('should calculate correct aura enhancement cost', () => {
      expect(enhancementEngine.calculateEnhancementCost('aura', 1)).toBe(50);
    });

    it('should throw error for unknown enhancement type', () => {
      expect(() => enhancementEngine.calculateEnhancementCost('unknown', 1))
        .toThrow('Unknown enhancement type: unknown');
    });
  });

  describe('applyPriorityEnhancement', () => {
    const mockWishInfo = { author_id: mockUserId, status: 'active' };

    beforeEach(() => {
      // Mock database responses
      (db.execute as any).mockImplementation((query: any) => {
        if (query.toString().includes('SELECT author_id, status FROM wishes')) {
          return Promise.resolve([mockWishInfo]);
        }
        if (query.toString().includes('SELECT * FROM wish_enhancements')) {
          return Promise.resolve([]); // No existing enhancements
        }
        return Promise.resolve([]);
      });

      (db.transaction as any).mockImplementation(async (callback: any) => {
        const mockSql = vi.fn().mockImplementation((query: any) => {
          if (query.toString().includes('INSERT INTO wish_enhancements')) {
            return Promise.resolve([{
              id: mockEnhancementId,
              wish_id: mockWishId,
              type: 'priority',
              level: 2,
              cost: 25,
              applied_at: new Date(),
              applied_by: mockUserId,
              metadata: {}
            }]);
          }
          if (query.toString().includes('DELETE FROM wish_enhancements')) {
            return Promise.resolve([]);
          }
          if (query.toString().includes('UPDATE wishes')) {
            return Promise.resolve([]);
          }
          return Promise.resolve([]);
        });

        return callback(mockSql);
      });

      (manaEngine.getUserMana as any).mockResolvedValue(100);
      (manaEngine.spendMana as any).mockResolvedValue(true);
    });

    it('should apply priority enhancement successfully', async () => {
      const result = await enhancementEngine.applyPriorityEnhancement(mockWishId, 2);

      expect(result).toMatchObject({
        wish_id: mockWishId,
        type: 'priority',
        level: 2,
        cost: 25
      });

      expect(manaEngine.spendMana).toHaveBeenCalledWith(
        mockUserId, 
        25, 
        'priority_enhancement_level_2'
      );
    });

    it('should throw error for invalid wish ID', async () => {
      await expect(enhancementEngine.applyPriorityEnhancement('', 2))
        .rejects.toThrow(EnhancementError);
    });

    it('should throw error for invalid priority level', async () => {
      await expect(enhancementEngine.applyPriorityEnhancement(mockWishId, 0))
        .rejects.toThrow('Priority level must be between 1 and 5');

      await expect(enhancementEngine.applyPriorityEnhancement(mockWishId, 6))
        .rejects.toThrow('Priority level must be between 1 and 5');
    });

    it('should throw error for insufficient mana', async () => {
      (manaEngine.getUserMana as any).mockResolvedValue(10); // Less than required 25

      await expect(enhancementEngine.applyPriorityEnhancement(mockWishId, 2))
        .rejects.toThrow(InsufficientManaError);
    });

    it('should throw error when wish not found', async () => {
      (db.execute as any).mockResolvedValue([]); // No wish found

      await expect(enhancementEngine.applyPriorityEnhancement(mockWishId, 2))
        .rejects.toThrow('Wish not found');
    });
  });

  describe('applyAuraEnhancement', () => {
    const mockWishInfo = { author_id: mockUserId, status: 'active' };

    beforeEach(() => {
      (db.execute as any).mockImplementation((query: any) => {
        if (query.toString().includes('SELECT author_id, status FROM wishes')) {
          return Promise.resolve([mockWishInfo]);
        }
        if (query.toString().includes('SELECT * FROM wish_enhancements')) {
          return Promise.resolve([]); // No existing aura
        }
        return Promise.resolve([]);
      });

      (db.transaction as any).mockImplementation(async (callback: any) => {
        const mockSql = vi.fn().mockImplementation((query: any) => {
          if (query.toString().includes('INSERT INTO wish_enhancements')) {
            return Promise.resolve([{
              id: mockEnhancementId,
              wish_id: mockWishId,
              type: 'aura',
              level: 1,
              aura_type: 'romantic',
              cost: 50,
              applied_at: new Date(),
              applied_by: mockUserId,
              metadata: {}
            }]);
          }
          if (query.toString().includes('UPDATE wishes')) {
            return Promise.resolve([]);
          }
          return Promise.resolve([]);
        });

        return callback(mockSql);
      });

      (manaEngine.getUserMana as any).mockResolvedValue(100);
      (manaEngine.spendMana as any).mockResolvedValue(true);
    });

    it('should apply aura enhancement successfully', async () => {
      const result = await enhancementEngine.applyAuraEnhancement(mockWishId, 'romantic');

      expect(result).toMatchObject({
        wish_id: mockWishId,
        type: 'aura',
        aura_type: 'romantic',
        cost: 50
      });

      expect(manaEngine.spendMana).toHaveBeenCalledWith(
        mockUserId, 
        50, 
        'aura_enhancement_romantic'
      );
    });

    it('should throw error for invalid aura type', async () => {
      await expect(enhancementEngine.applyAuraEnhancement(mockWishId, 'invalid'))
        .rejects.toThrow('Invalid aura type: invalid');
    });

    it('should throw error when aura already exists', async () => {
      // Mock existing aura
      (db.execute as any).mockImplementation((query: any) => {
        if (query.toString().includes('SELECT author_id, status FROM wishes')) {
          return Promise.resolve([mockWishInfo]);
        }
        if (query.toString().includes('SELECT * FROM wish_enhancements')) {
          return Promise.resolve([{ type: 'aura', aura_type: 'gaming' }]);
        }
        return Promise.resolve([]);
      });

      await expect(enhancementEngine.applyAuraEnhancement(mockWishId, 'romantic'))
        .rejects.toThrow('Wish already has an aura enhancement');
    });

    it('should accept valid aura types', async () => {
      const validAuraTypes = ['romantic', 'gaming', 'mysterious'];
      
      for (const auraType of validAuraTypes) {
        // Reset mocks for each iteration
        (db.execute as any).mockImplementation((query: any) => {
          if (query.toString().includes('SELECT author_id, status FROM wishes')) {
            return Promise.resolve([mockWishInfo]);
          }
          if (query.toString().includes('SELECT * FROM wish_enhancements')) {
            return Promise.resolve([]);
          }
          return Promise.resolve([]);
        });

        await expect(enhancementEngine.applyAuraEnhancement(mockWishId, auraType))
          .resolves.toBeDefined();
      }
    });
  });

  describe('getWishEnhancements', () => {
    it('should return wish enhancements', async () => {
      const mockEnhancements = [
        {
          id: 'enh-1',
          wish_id: mockWishId,
          type: 'priority',
          level: 3,
          cost: 50,
          applied_at: new Date(),
          applied_by: mockUserId,
          metadata: {}
        },
        {
          id: 'enh-2',
          wish_id: mockWishId,
          type: 'aura',
          level: 1,
          aura_type: 'gaming',
          cost: 50,
          applied_at: new Date(),
          applied_by: mockUserId,
          metadata: {}
        }
      ];

      (db.execute as any).mockResolvedValue(mockEnhancements);

      const result = await enhancementEngine.getWishEnhancements(mockWishId);

      expect(result).toHaveLength(2);
      expect(result[0].type).toBe('priority');
      expect(result[1].type).toBe('aura');
    });

    it('should throw error for empty wish ID', async () => {
      await expect(enhancementEngine.getWishEnhancements(''))
        .rejects.toThrow('Wish ID is required');
    });
  });

  describe('validateEnhancement', () => {
    const mockWishInfo = { author_id: mockUserId, status: 'active' };

    beforeEach(() => {
      (db.execute as any).mockImplementation((query: any) => {
        if (query.toString().includes('SELECT author_id, status FROM wishes')) {
          return Promise.resolve([mockWishInfo]);
        }
        if (query.toString().includes('SELECT * FROM wish_enhancements')) {
          return Promise.resolve([]);
        }
        return Promise.resolve([]);
      });

      (manaEngine.getUserMana as any).mockResolvedValue(100);
    });

    it('should validate priority enhancement successfully', async () => {
      const result = await enhancementEngine.validateEnhancement(
        mockWishId, 
        mockUserId, 
        'priority', 
        2
      );

      expect(result.isValid).toBe(true);
      expect(result.canApply).toBe(true);
      expect(result.cost).toBe(25);
      expect(result.errors).toHaveLength(0);
    });

    it('should validate aura enhancement successfully', async () => {
      const result = await enhancementEngine.validateEnhancement(
        mockWishId, 
        mockUserId, 
        'aura', 
        undefined, 
        'romantic'
      );

      expect(result.isValid).toBe(true);
      expect(result.canApply).toBe(true);
      expect(result.cost).toBe(50);
      expect(result.errors).toHaveLength(0);
    });

    it('should fail validation for insufficient mana', async () => {
      (manaEngine.getUserMana as any).mockResolvedValue(5); // Less than required

      const result = await enhancementEngine.validateEnhancement(
        mockWishId, 
        mockUserId, 
        'priority', 
        2
      );

      expect(result.canApply).toBe(false);
      expect(result.errors).toContain('Недостаточно Маны');
    });

    it('should fail validation for invalid parameters', async () => {
      const result = await enhancementEngine.validateEnhancement(
        '', 
        '', 
        'invalid' as any
      );

      expect(result.isValid).toBe(false);
      expect(result.canApply).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('getUserEnhancementStats', () => {
    it('should return user enhancement statistics', async () => {
      const mockStats = {
        total_enhancements: 5,
        priority_enhancements: 3,
        aura_enhancements: 2,
        total_mana_spent: 200,
        most_used_aura: 'romantic',
        average_priority_level: 2.5
      };

      (db.execute as any).mockResolvedValue([mockStats]);

      const result = await enhancementEngine.getUserEnhancementStats(mockUserId);

      expect(result).toEqual({
        total_enhancements: 5,
        priority_enhancements: 3,
        aura_enhancements: 2,
        total_mana_spent: 200,
        most_used_aura: 'romantic',
        average_priority_level: 2.5
      });
    });

    it('should throw error for empty user ID', async () => {
      await expect(enhancementEngine.getUserEnhancementStats(''))
        .rejects.toThrow('User ID is required');
    });
  });

  describe('getNextPriorityCost', () => {
    it('should return cost for next priority level', async () => {
      // Mock current priority level 2
      (db.execute as any).mockResolvedValue([{ level: 2 }]);

      const result = await enhancementEngine.getNextPriorityCost(mockWishId);

      expect(result).toBe(50); // Cost for level 3
    });

    it('should return null when max level reached', async () => {
      // Mock current priority level 5 (max)
      (db.execute as any).mockResolvedValue([{ level: 5 }]);

      const result = await enhancementEngine.getNextPriorityCost(mockWishId);

      expect(result).toBeNull();
    });

    it('should return cost for level 1 when no enhancement exists', async () => {
      (db.execute as any).mockResolvedValue([]); // No existing enhancement

      const result = await enhancementEngine.getNextPriorityCost(mockWishId);

      expect(result).toBe(10); // Cost for level 1
    });
  });
});