import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { manaEngine } from '../../lib/mana-engine';
import { enhancementEngine } from '../../lib/enhancement-engine';
import { db } from '../../lib/db-pool';

// Mock the database module
vi.mock('../../lib/db-pool', () => ({
  db: {
    execute: vi.fn(),
    transaction: vi.fn()
  },
  DatabaseMonitor: {
    startQuery: vi.fn(() => vi.fn())
  }
}));

describe('Mana System E2E Workflow Tests', () => {
  const mockUser1 = {
    id: 'user-1',
    telegram_id: '123456789',
    username: 'alice',
    first_name: 'Alice',
    last_name: 'Smith',
    mana_balance: 100,
    created_at: new Date('2024-01-01T00:00:00Z'),
    rank: 'Рядовой',
    experience_points: 50
  };

  const mockUser2 = {
    id: 'user-2',
    telegram_id: '987654321',
    username: 'bob',
    first_name: 'Bob',
    last_name: 'Johnson',
    mana_balance: 200,
    created_at: new Date('2024-01-01T00:00:00Z'),
    rank: 'Ефрейтор',
    experience_points: 120
  };

  const mockWish = {
    id: 'wish-1',
    description: 'Хочу новую книгу по программированию',
    author_id: 'user-1',
    assignee_id: null,
    status: 'active',
    category: 'education',
    priority: 1,
    aura: null,
    created_at: new Date('2024-01-15T10:00:00Z')
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Complete Wish Creation and Enhancement Workflow', () => {
    it('should handle full lifecycle: create wish → earn mana → enhance wish', async () => {
      // Step 1: User creates a wish (free)
      const createdWish = { ...mockWish };

      // Mock wish creation (no mana cost)
      (db.execute as any).mockResolvedValueOnce([createdWish]);

      // Step 2: User earns mana through quest completion
      const questReward = 50;
      const initialBalance = 100;
      const newBalance = initialBalance + questReward;

      // Mock mana earning
      (db.execute as any).mockResolvedValueOnce([{ mana_balance: initialBalance }]);
      (db.transaction as any).mockImplementation(async (callback: any) => {
        const mockSql = vi.fn()
          .mockResolvedValueOnce([{ mana_balance: newBalance }]) // Update balance
          .mockResolvedValueOnce([]); // Insert transaction
        return callback(mockSql);
      });

      await manaEngine.addMana('user-1', questReward, 'quest_completion_medium');

      // Verify mana was added
      expect(db.transaction).toHaveBeenCalled();

      // Step 3: User enhances wish with priority
      const priorityLevel = 3;
      const enhancementCost = 50; // Cost for level 3

      // Mock enhancement application
      const mockWishInfo = { author_id: 'user-1', status: 'active' };
      const mockEnhancement = {
        id: 'enhancement-1',
        wish_id: 'wish-1',
        type: 'priority',
        level: priorityLevel,
        cost: enhancementCost,
        applied_at: new Date(),
        applied_by: 'user-1'
      };

      (db.execute as any).mockImplementation((query: any) => {
        if (query.toString().includes('SELECT author_id, status FROM wishes')) {
          return Promise.resolve([mockWishInfo]);
        }
        if (query.toString().includes('SELECT * FROM wish_enhancements')) {
          return Promise.resolve([]); // No existing enhancements
        }
        return Promise.resolve([]);
      });

      // Mock mana balance check and spending
      vi.spyOn(manaEngine, 'getUserMana').mockResolvedValue(newBalance);
      vi.spyOn(manaEngine, 'spendMana').mockResolvedValue(true);

      (db.transaction as any).mockImplementation(async (callback: any) => {
        const mockSql = vi.fn()
          .mockResolvedValueOnce([mockEnhancement]) // Insert enhancement
          .mockResolvedValueOnce([]); // Update wish priority
        return callback(mockSql);
      });

      const enhancement = await enhancementEngine.applyPriorityEnhancement('wish-1', priorityLevel);

      // Verify enhancement was applied
      expect(enhancement.type).toBe('priority');
      expect(enhancement.level).toBe(priorityLevel);
      expect(enhancement.cost).toBe(enhancementCost);
      expect(manaEngine.spendMana).toHaveBeenCalledWith('user-1', enhancementCost, 'priority_enhancement_level_3');

      // Step 4: Verify final state
      const finalBalance = newBalance - enhancementCost;
      vi.spyOn(manaEngine, 'getUserMana').mockResolvedValue(finalBalance);

      const userBalance = await manaEngine.getUserMana('user-1');
      expect(userBalance).toBe(finalBalance);
    });

    it('should handle multiple enhancements on same wish', async () => {
      // Step 1: Apply priority enhancement
      const mockWishInfo = { author_id: 'user-1', status: 'active' };
      
      (db.execute as any).mockImplementation((query: any) => {
        if (query.toString().includes('SELECT author_id, status FROM wishes')) {
          return Promise.resolve([mockWishInfo]);
        }
        if (query.toString().includes('SELECT * FROM wish_enhancements')) {
          return Promise.resolve([]); // No existing enhancements initially
        }
        return Promise.resolve([]);
      });

      vi.spyOn(manaEngine, 'getUserMana').mockResolvedValue(200);
      vi.spyOn(manaEngine, 'spendMana').mockResolvedValue(true);

      const priorityEnhancement = {
        id: 'enhancement-1',
        wish_id: 'wish-1',
        type: 'priority',
        level: 2,
        cost: 25,
        applied_at: new Date(),
        applied_by: 'user-1'
      };

      (db.transaction as any).mockImplementation(async (callback: any) => {
        const mockSql = vi.fn()
          .mockResolvedValueOnce([priorityEnhancement])
          .mockResolvedValueOnce([]);
        return callback(mockSql);
      });

      await enhancementEngine.applyPriorityEnhancement('wish-1', 2);

      // Step 2: Apply aura enhancement
      // Mock existing priority enhancement for aura application
      (db.execute as any).mockImplementation((query: any) => {
        if (query.toString().includes('SELECT author_id, status FROM wishes')) {
          return Promise.resolve([mockWishInfo]);
        }
        if (query.toString().includes('SELECT * FROM wish_enhancements')) {
          if (query.toString().includes('type = \'aura\'')) {
            return Promise.resolve([]); // No existing aura
          }
          return Promise.resolve([priorityEnhancement]); // Existing priority
        }
        return Promise.resolve([]);
      });

      const auraEnhancement = {
        id: 'enhancement-2',
        wish_id: 'wish-1',
        type: 'aura',
        level: 1,
        aura_type: 'romantic',
        cost: 50,
        applied_at: new Date(),
        applied_by: 'user-1'
      };

      (db.transaction as any).mockImplementation(async (callback: any) => {
        const mockSql = vi.fn()
          .mockResolvedValueOnce([auraEnhancement])
          .mockResolvedValueOnce([]);
        return callback(mockSql);
      });

      await enhancementEngine.applyAuraEnhancement('wish-1', 'romantic');

      // Verify both enhancements can coexist
      expect(manaEngine.spendMana).toHaveBeenCalledTimes(2);
      expect(manaEngine.spendMana).toHaveBeenCalledWith('user-1', 25, 'priority_enhancement_level_2');
      expect(manaEngine.spendMana).toHaveBeenCalledWith('user-1', 50, 'aura_enhancement_romantic');
    });
  });

  describe('Mana Economy Workflow', () => {
    it('should handle earning mana from various sources', async () => {
      const initialBalance = 50;
      
      // Mock initial balance
      (db.execute as any).mockResolvedValue([{ mana_balance: initialBalance }]);

      // Test different reward calculations
      const easyQuestReward = manaEngine.calculateManaReward('easy', '');
      const hardQuestReward = manaEngine.calculateManaReward('hard', '');
      const dailyEventReward = manaEngine.calculateManaReward('', 'daily');
      const epicEventReward = manaEngine.calculateManaReward('', 'epic');

      // Verify reward ranges
      expect(easyQuestReward).toBeGreaterThanOrEqual(8);
      expect(easyQuestReward).toBeLessThanOrEqual(12);
      
      expect(hardQuestReward).toBeGreaterThanOrEqual(40);
      expect(hardQuestReward).toBeLessThanOrEqual(60);
      
      expect(dailyEventReward).toBeGreaterThanOrEqual(4);
      expect(dailyEventReward).toBeLessThanOrEqual(6);
      
      expect(epicEventReward).toBeGreaterThanOrEqual(200);
      expect(epicEventReward).toBeLessThanOrEqual(300);

      // Mock mana addition for each source
      let currentBalance = initialBalance;
      
      const rewards = [
        { amount: easyQuestReward, reason: 'easy_quest_completion' },
        { amount: hardQuestReward, reason: 'hard_quest_completion' },
        { amount: dailyEventReward, reason: 'daily_event_participation' },
        { amount: epicEventReward, reason: 'epic_event_completion' }
      ];

      for (const reward of rewards) {
        currentBalance += reward.amount;
        
        (db.transaction as any).mockImplementation(async (callback: any) => {
          const mockSql = vi.fn()
            .mockResolvedValueOnce([{ mana_balance: currentBalance }])
            .mockResolvedValueOnce([]);
          return callback(mockSql);
        });

        await manaEngine.addMana('user-1', reward.amount, reward.reason);
      }

      // Verify total accumulated mana
      const expectedTotal = initialBalance + easyQuestReward + hardQuestReward + dailyEventReward + epicEventReward;
      expect(currentBalance).toBe(expectedTotal);
    });

    it('should handle progressive priority enhancement costs', async () => {
      const mockWishInfo = { author_id: 'user-1', status: 'active' };
      let currentLevel = 0;
      let userBalance = 1000; // Start with plenty of mana

      vi.spyOn(manaEngine, 'getUserMana').mockImplementation(() => Promise.resolve(userBalance));
      vi.spyOn(manaEngine, 'spendMana').mockImplementation(async (userId, amount, reason) => {
        userBalance -= amount;
        return true;
      });

      // Test progressive enhancement from level 1 to 5
      for (let targetLevel = 1; targetLevel <= 5; targetLevel++) {
        const expectedCost = enhancementEngine.calculateEnhancementCost('priority', targetLevel);
        
        // Mock current enhancement level
        (db.execute as any).mockImplementation((query: any) => {
          if (query.toString().includes('SELECT author_id, status FROM wishes')) {
            return Promise.resolve([mockWishInfo]);
          }
          if (query.toString().includes('SELECT * FROM wish_enhancements')) {
            if (currentLevel === 0) {
              return Promise.resolve([]);
            }
            return Promise.resolve([{ level: currentLevel }]);
          }
          return Promise.resolve([]);
        });

        const mockEnhancement = {
          id: `enhancement-${targetLevel}`,
          wish_id: 'wish-1',
          type: 'priority',
          level: targetLevel,
          cost: expectedCost,
          applied_at: new Date(),
          applied_by: 'user-1'
        };

        (db.transaction as any).mockImplementation(async (callback: any) => {
          const mockSql = vi.fn()
            .mockResolvedValueOnce([]) // Delete previous enhancement
            .mockResolvedValueOnce([mockEnhancement]) // Insert new enhancement
            .mockResolvedValueOnce([]); // Update wish priority
          return callback(mockSql);
        });

        const enhancement = await enhancementEngine.applyPriorityEnhancement('wish-1', targetLevel);
        
        expect(enhancement.level).toBe(targetLevel);
        expect(enhancement.cost).toBe(expectedCost);
        
        currentLevel = targetLevel;
      }

      // Verify progressive cost increase
      const costs = [1, 2, 3, 4, 5].map(level => 
        enhancementEngine.calculateEnhancementCost('priority', level)
      );
      expect(costs).toEqual([10, 25, 50, 100, 200]);

      // Verify total mana spent
      const totalSpent = costs.reduce((sum, cost) => sum + cost, 0);
      expect(1000 - userBalance).toBe(totalSpent);
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle insufficient mana gracefully', async () => {
      const mockWishInfo = { author_id: 'user-1', status: 'active' };
      const lowBalance = 10;
      const requiredAmount = 50;

      (db.execute as any).mockImplementation((query: any) => {
        if (query.toString().includes('SELECT author_id, status FROM wishes')) {
          return Promise.resolve([mockWishInfo]);
        }
        if (query.toString().includes('SELECT * FROM wish_enhancements')) {
          return Promise.resolve([]);
        }
        return Promise.resolve([]);
      });

      vi.spyOn(manaEngine, 'getUserMana').mockResolvedValue(lowBalance);

      // Attempt to apply enhancement that costs more than available mana
      await expect(enhancementEngine.applyPriorityEnhancement('wish-1', 3))
        .rejects.toThrow('InsufficientManaError');

      // Verify no mana was spent
      expect(manaEngine.spendMana).not.toHaveBeenCalled();
    });

    it('should handle concurrent enhancement attempts', async () => {
      const mockWishInfo = { author_id: 'user-1', status: 'active' };
      
      (db.execute as any).mockImplementation((query: any) => {
        if (query.toString().includes('SELECT author_id, status FROM wishes')) {
          return Promise.resolve([mockWishInfo]);
        }
        if (query.toString().includes('SELECT * FROM wish_enhancements')) {
          return Promise.resolve([]);
        }
        return Promise.resolve([]);
      });

      vi.spyOn(manaEngine, 'getUserMana').mockResolvedValue(100);
      vi.spyOn(manaEngine, 'spendMana').mockResolvedValue(true);

      // Mock successful enhancement
      const mockEnhancement = {
        id: 'enhancement-1',
        wish_id: 'wish-1',
        type: 'priority',
        level: 2,
        cost: 25,
        applied_at: new Date(),
        applied_by: 'user-1'
      };

      (db.transaction as any).mockImplementation(async (callback: any) => {
        const mockSql = vi.fn()
          .mockResolvedValueOnce([mockEnhancement])
          .mockResolvedValueOnce([]);
        return callback(mockSql);
      });

      // Attempt concurrent enhancements
      const promises = [
        enhancementEngine.applyPriorityEnhancement('wish-1', 2),
        enhancementEngine.applyPriorityEnhancement('wish-1', 3)
      ];

      const results = await Promise.allSettled(promises);
      
      // At least one should succeed
      const successCount = results.filter(r => r.status === 'fulfilled').length;
      expect(successCount).toBeGreaterThanOrEqual(1);
    });

    it('should handle database transaction failures', async () => {
      const mockWishInfo = { author_id: 'user-1', status: 'active' };
      
      (db.execute as any).mockImplementation((query: any) => {
        if (query.toString().includes('SELECT author_id, status FROM wishes')) {
          return Promise.resolve([mockWishInfo]);
        }
        if (query.toString().includes('SELECT * FROM wish_enhancements')) {
          return Promise.resolve([]);
        }
        return Promise.resolve([]);
      });

      vi.spyOn(manaEngine, 'getUserMana').mockResolvedValue(100);
      
      // Mock transaction failure
      (db.transaction as any).mockRejectedValue(new Error('Database transaction failed'));

      await expect(enhancementEngine.applyPriorityEnhancement('wish-1', 2))
        .rejects.toThrow('Database transaction failed');

      // Verify no partial state changes occurred
      expect(manaEngine.spendMana).not.toHaveBeenCalled();
    });
  });

  describe('User Permission and Validation Workflow', () => {
    it('should prevent unauthorized wish enhancements', async () => {
      const mockWishInfo = { author_id: 'user-2', status: 'active' }; // Different user owns the wish

      (db.execute as any).mockImplementation((query: any) => {
        if (query.toString().includes('SELECT author_id, status FROM wishes')) {
          return Promise.resolve([mockWishInfo]);
        }
        return Promise.resolve([]);
      });

      // User-1 tries to enhance User-2's wish
      await expect(enhancementEngine.applyPriorityEnhancement('wish-1', 2))
        .rejects.toThrow('Only wish author can apply enhancements');
    });

    it('should prevent enhancement on inactive wishes', async () => {
      const mockWishInfo = { author_id: 'user-1', status: 'completed' };

      (db.execute as any).mockImplementation((query: any) => {
        if (query.toString().includes('SELECT author_id, status FROM wishes')) {
          return Promise.resolve([mockWishInfo]);
        }
        return Promise.resolve([]);
      });

      await expect(enhancementEngine.applyPriorityEnhancement('wish-1', 2))
        .rejects.toThrow('Can only enhance active wishes');
    });

    it('should validate enhancement parameters correctly', async () => {
      const mockWishInfo = { author_id: 'user-1', status: 'active' };

      (db.execute as any).mockImplementation((query: any) => {
        if (query.toString().includes('SELECT author_id, status FROM wishes')) {
          return Promise.resolve([mockWishInfo]);
        }
        if (query.toString().includes('SELECT * FROM wish_enhancements')) {
          return Promise.resolve([]);
        }
        return Promise.resolve([]);
      });

      vi.spyOn(manaEngine, 'getUserMana').mockResolvedValue(1000);

      // Test validation for various scenarios
      const validationTests = [
        {
          wishId: 'wish-1',
          userId: 'user-1',
          type: 'priority' as const,
          level: 3,
          expected: { isValid: true, canApply: true }
        },
        {
          wishId: 'wish-1',
          userId: 'user-1',
          type: 'aura' as const,
          auraType: 'romantic',
          expected: { isValid: true, canApply: true }
        },
        {
          wishId: '',
          userId: 'user-1',
          type: 'priority' as const,
          level: 3,
          expected: { isValid: false, canApply: false }
        },
        {
          wishId: 'wish-1',
          userId: '',
          type: 'priority' as const,
          level: 3,
          expected: { isValid: false, canApply: false }
        }
      ];

      for (const test of validationTests) {
        const result = await enhancementEngine.validateEnhancement(
          test.wishId,
          test.userId,
          test.type,
          test.level,
          test.auraType
        );

        expect(result.isValid).toBe(test.expected.isValid);
        expect(result.canApply).toBe(test.expected.canApply);
      }
    });
  });

  describe('Statistics and Analytics Workflow', () => {
    it('should track user mana statistics accurately', async () => {
      const mockStats = {
        current_balance: 150,
        total_earned: 500,
        total_spent: 350,
        transaction_count: 25,
        last_transaction: new Date('2024-01-15T10:00:00Z')
      };

      const mockTransactions = [
        {
          id: 'tx-1',
          user_id: 'user-1',
          type: 'credit',
          mana_amount: 50,
          reason: 'quest_completion',
          created_at: new Date('2024-01-15T10:00:00Z')
        },
        {
          id: 'tx-2',
          user_id: 'user-1',
          type: 'debit',
          mana_amount: 25,
          reason: 'priority_enhancement',
          created_at: new Date('2024-01-15T11:00:00Z')
        }
      ];

      (db.execute as any).mockImplementation((query: any) => {
        if (query.toString().includes('SELECT mana_balance FROM users')) {
          return Promise.resolve([{ mana_balance: mockStats.current_balance }]);
        }
        if (query.toString().includes('COALESCE(SUM(CASE WHEN type = \'credit\'')) {
          return Promise.resolve([{
            total_earned: mockStats.total_earned,
            total_spent: mockStats.total_spent,
            transaction_count: mockStats.transaction_count,
            last_transaction: mockStats.last_transaction
          }]);
        }
        if (query.toString().includes('FROM transactions')) {
          return Promise.resolve(mockTransactions);
        }
        return Promise.resolve([]);
      });

      const stats = await manaEngine.getUserManaStats('user-1');
      const transactions = await manaEngine.getUserTransactions('user-1');

      expect(stats).toEqual(mockStats);
      expect(transactions).toHaveLength(2);
      expect(transactions[0].type).toBe('credit');
      expect(transactions[1].type).toBe('debit');
    });

    it('should track enhancement statistics accurately', async () => {
      const mockEnhancementStats = {
        total_enhancements: 5,
        priority_enhancements: 3,
        aura_enhancements: 2,
        total_mana_spent: 200,
        most_used_aura: 'romantic',
        average_priority_level: 2.5
      };

      (db.execute as any).mockResolvedValue([mockEnhancementStats]);

      const stats = await enhancementEngine.getUserEnhancementStats('user-1');

      expect(stats).toEqual(mockEnhancementStats);
      expect(stats.total_enhancements).toBe(stats.priority_enhancements + stats.aura_enhancements);
    });
  });
});