import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createMocks } from 'node-mocks-http';
import categoriesHandler from '../../pages/api/wishes/categories';
import sharedHandler from '../../pages/api/wishes/shared/index';
import enchantHandler from '../../pages/api/wishes/[id]/enchant';
import * as telegramAuth from '../../lib/telegram-auth';
import * as db from '../../lib/db';
import { User, Wish, WishCategory } from '../../types/quest-economy';
import { economyEngine } from '../../lib/economy-engine';

// Mock dependencies
vi.mock('../../lib/telegram-auth');
vi.mock('../../lib/db');
vi.mock('../../lib/economy-engine');

describe('Wishes API', () => {
  const mockUser: User = {
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

  const mockCategories: WishCategory[] = [
    { id: 'cat-1', name: 'Романтика', emoji: '💕', color: '#ff69b4', created_at: new Date() },
  ];

  const mockWish: Wish = {
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

  beforeEach(() => {
    vi.clearAllMocks();
    // vi.mocked(telegramAuth.getUserFromRequest).mockResolvedValue(mockUser);
    vi.mocked(telegramAuth.getUserIdFromRequest).mockResolvedValue(mockUser.id);
  });

  describe('GET /api/wishes/categories', () => {
    it('should return wish categories successfully', async () => {
      const { req, res } = createMocks({ method: 'GET' });
      vi.mocked(db.getWishCategories).mockResolvedValue(mockCategories);
      await categoriesHandler(req, res);
      expect(res._getStatusCode()).toBe(200);
      expect(JSON.parse(res._getData()).categories).toEqual(mockCategories);
    });
  });

  describe('POST /api/wishes/[id]/enchant', () => {
    it('should successfully enchant a wish', async () => {
      const { req, res } = createMocks({
        method: 'POST',
        query: { id: 'wish-1' },
        body: { enchantment_type: 'priority', level: 2 },
      });
      const enchantedWish = { ...mockWish, enchantments: { priority: 2 } };
      vi.mocked(economyEngine.enchantWish).mockResolvedValue(enchantedWish);

      await enchantHandler(req, res);

      expect(res._getStatusCode()).toBe(200);
      expect(JSON.parse(res._getData()).enchantments.priority).toBe(2);
    });
  });
});
