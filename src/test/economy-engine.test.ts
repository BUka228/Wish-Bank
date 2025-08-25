import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { EconomyEngine } from '../lib/economy-engine';
import * as db from '../lib/db';
import { User, EnhancedWish as Wish } from '../types/quest-economy';

// Mock the database module
vi.mock('../lib/db', async () => {
    const actual = await vi.importActual('../lib/db');
    return {
        ...actual,
        getUserById: vi.fn(),
        getWishById: vi.fn(),
        updateUser: vi.fn(),
        updateWish: vi.fn(),
        addTransaction: vi.fn(),
        getUserTransactions: vi.fn(),
        getEconomySettings: vi.fn(),
    };
});

describe('EconomyEngine', () => {
    let economyEngine: EconomyEngine;
    let mockUser: User;
    let mockWish: Wish;

    beforeEach(() => {
        economyEngine = new EconomyEngine();

        mockUser = {
            id: 'user-1',
            telegram_id: '123456789',
            name: 'Test User',
            mana: 100,
            mana_spent: 50,
            rank: 'Рядовой',
            experience_points: 50,
            daily_quota_used: 2,
            weekly_quota_used: 8,
            monthly_quota_used: 15,
            last_quota_reset: new Date('2024-01-15T00:00:00Z'),
            created_at: new Date(),
            updated_at: new Date(),
        };

        mockWish = {
            id: 'wish-1',
            description: 'A test wish',
            author_id: 'user-1',
            status: 'active',
            category: 'general',
            is_shared: false,
            is_gift: false,
            is_historical: false,
            enchantments: { priority: 1 },
            created_at: new Date(),
        };

        const mockSettings = {
            enchantment_costs: { priority: 5, aura: 10, linked_wish: 20, recurring: 50 },
            priority_cost_multiplier: { 1: 0, 2: 1, 3: 2, 4: 4, 5: 8 },
        };

        vi.mocked(db.getUserById).mockResolvedValue(mockUser);
        vi.mocked(db.getWishById).mockResolvedValue(mockWish);
        vi.mocked(db.updateUser).mockImplementation(async (user) => user);
        vi.mocked(db.updateWish).mockImplementation(async (wish) => wish);
        vi.mocked(db.getEconomySettings).mockResolvedValue(mockSettings);
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe('enchantWish', () => {
        it('should successfully enchant a wish with priority', async () => {
            const result = await economyEngine.enchantWish('user-1', {
                wish_id: 'wish-1',
                enchantment_type: 'priority',
                level: 2,
            });

            expect(db.updateUser).toHaveBeenCalledWith(expect.objectContaining({ mana: 95, mana_spent: 55 }));
            expect(db.updateWish).toHaveBeenCalledWith(expect.objectContaining({ enchantments: { priority: 2 } }));
            expect(db.addTransaction).toHaveBeenCalled();
            expect(result.enchantments.priority).toBe(2);
        });

        it('should throw an error for insufficient mana', async () => {
            vi.mocked(db.getUserById).mockResolvedValue({ ...mockUser, mana: 0 });

            await expect(economyEngine.enchantWish('user-1', {
                wish_id: 'wish-1',
                enchantment_type: 'priority',
                level: 2,
            })).rejects.toThrow('Insufficient mana');
        });

        it('should throw an error if user does not own the wish', async () => {
            vi.mocked(db.getWishById).mockResolvedValue({ ...mockWish, author_id: 'user-2' });

            await expect(economyEngine.enchantWish('user-1', {
                wish_id: 'wish-1',
                enchantment_type: 'priority',
                level: 2,
            })).rejects.toThrow('user does not have permission');
        });

        it('should successfully enchant a wish with an aura', async () => {
            const result = await economyEngine.enchantWish('user-1', {
                wish_id: 'wish-1',
                enchantment_type: 'aura',
                value: 'romantic',
            });

            expect(db.updateUser).toHaveBeenCalledWith(expect.objectContaining({ mana: 90, mana_spent: 60 }));
            expect(db.updateWish).toHaveBeenCalledWith(expect.objectContaining({ enchantments: { priority: 1, aura: 'romantic' } }));
            expect(result.enchantments.aura).toBe('romantic');
        });
    });

    describe('grantMana', () => {
        it('should grant mana to a user and record a transaction', async () => {
            await economyEngine.grantMana('user-1', 50, 'Quest reward', 'quest_reward', 'quest-123');

            expect(db.updateUser).toHaveBeenCalledWith(expect.objectContaining({ mana: 150 }));
            expect(db.addTransaction).toHaveBeenCalledWith(expect.objectContaining({
                type: 'credit',
                mana_amount: 50,
                description: 'Quest reward',
                transaction_category: 'quest_reward',
            }));
        });
    });

    describe('calculateEconomyMetrics', () => {
        it('should calculate metrics based on mana and transactions', async () => {
            vi.mocked(db.getUserTransactions).mockResolvedValue([
                { user_id: 'user-1', type: 'credit', mana_amount: 50, description: 'Quest', transaction_category: 'quest_reward', created_at: new Date() },
                { user_id: 'user-1', type: 'debit', mana_amount: 5, description: 'Enchanted wish with priority', transaction_category: 'enchantment', created_at: new Date() },
            ]);

            const metrics = await economyEngine.calculateEconomyMetrics('user-1');

            expect(metrics.total_mana_spent).toBe(50);
            expect(metrics.total_mana_earned).toBe(50);
            expect(metrics.most_used_enchantment).toBe('priority');
        });
    });

    // Quota tests can be simplified as they are mostly unchanged
    describe('validateGiftQuota', () => {
        it('should validate successful gift within quotas', async () => {
            const validation = await economyEngine.validateGiftQuota('user-1', 1);
            expect(validation.isValid).toBe(true);
            expect(validation.remainingQuota).toBe(3);
        });

        it('should reject gift when daily quota exceeded', async () => {
            const validation = await economyEngine.validateGiftQuota('user-1', 4);
            expect(validation.isValid).toBe(false);
            expect(validation.errors).toContain('Daily quota exceeded');
        });
    });
});
