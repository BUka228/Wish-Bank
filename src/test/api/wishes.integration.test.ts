import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createMocks } from 'node-mocks-http';
import categoriesHandler from '../../pages/api/wishes/categories';
import sharedHandler from '../../pages/api/wishes/shared/index';
import * as telegramAuth from '../../lib/telegram-auth';
import * as db from '../../lib/db';

// Mock dependencies
vi.mock('../../lib/telegram-auth');
vi.mock('../../lib/db');

describe('Wishes API', () => {
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

  const mockCategories = [
    { id: 'cat-1', name: 'Романтика', emoji: '💕', color: '#ff69b4' },
    { id: 'cat-2', name: 'Еда', emoji: '🍽️', color: '#ffa500' },
    { id: 'cat-3', name: 'Развлечения', emoji: '🎮', color: '#00bfff' }
  ];

  const mockSharedWish = {
    id: 'wish-1',
    title: 'Shared Wish',
    description: 'A shared wish for both partners',
    creator_id: 'user-1',
    assignee_id: 'user-2',
    category: 'romance',
    is_shared: true,
    shared_approved_by: null,
    status: 'pending',
    created_at: new Date('2024-01-15T10:00:00Z')
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(telegramAuth.getUserFromRequest).mockResolvedValue(mockUser);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('GET /api/wishes/categories', () => {
    it('should return wish categories successfully', async () => {
      const { req, res } = createMocks({
        method: 'GET'
      });

      vi.mocked(db.getWishCategories).mockResolvedValue(mockCategories);

      await categoriesHandler(req, res);

      expect(res._getStatusCode()).toBe(200);
      const data = JSON.parse(res._getData());
      expect(data.categories).toEqual(mockCategories);
    });

    it('should return empty array when no categories exist', async () => {
      const { req, res } = createMocks({
        method: 'GET'
      });

      vi.mocked(db.getWishCategories).mockResolvedValue([]);

      await categoriesHandler(req, res);

      expect(res._getStatusCode()).toBe(200);
      const data = JSON.parse(res._getData());
      expect(data.categories).toEqual([]);
    });
  });
}); 
   it('should return 401 for unauthorized requests', async () => {
      const { req, res } = createMocks({
        method: 'GET'
      });

      vi.mocked(telegramAuth.getUserFromRequest).mockResolvedValue(null);

      await categoriesHandler(req, res);

      expect(res._getStatusCode()).toBe(401);
      const data = JSON.parse(res._getData());
      expect(data.error).toBe('Unauthorized');
    });

    it('should return 405 for non-GET requests', async () => {
      const { req, res } = createMocks({
        method: 'POST'
      });

      await categoriesHandler(req, res);

      expect(res._getStatusCode()).toBe(405);
      const data = JSON.parse(res._getData());
      expect(data.error).toBe('Method not allowed');
    });

    it('should handle database errors gracefully', async () => {
      const { req, res } = createMocks({
        method: 'GET'
      });

      vi.mocked(db.getWishCategories).mockRejectedValue(new Error('Database error'));

      await categoriesHandler(req, res);

      expect(res._getStatusCode()).toBe(500);
      const data = JSON.parse(res._getData());
      expect(data.error).toBe('Internal server error');
    });
  });

  describe('GET /api/wishes/shared', () => {
    it('should return shared wishes successfully', async () => {
      const { req, res } = createMocks({
        method: 'GET'
      });

      vi.mocked(db.getSharedWishes).mockResolvedValue([mockSharedWish]);

      await sharedHandler(req, res);

      expect(res._getStatusCode()).toBe(200);
      const data = JSON.parse(res._getData());
      expect(data.wishes).toEqual([mockSharedWish]);
    });

    it('should filter shared wishes by status', async () => {
      const { req, res } = createMocks({
        method: 'GET',
        query: { status: 'approved' }
      });

      const approvedWish = { ...mockSharedWish, status: 'approved', shared_approved_by: 'user-2' };
      vi.mocked(db.getSharedWishes).mockResolvedValue([approvedWish]);

      await sharedHandler(req, res);

      expect(res._getStatusCode()).toBe(200);
      const data = JSON.parse(res._getData());
      expect(data.wishes[0].status).toBe('approved');
    });

    it('should return empty array when no shared wishes exist', async () => {
      const { req, res } = createMocks({
        method: 'GET'
      });

      vi.mocked(db.getSharedWishes).mockResolvedValue([]);

      await sharedHandler(req, res);

      expect(res._getStatusCode()).toBe(200);
      const data = JSON.parse(res._getData());
      expect(data.wishes).toEqual([]);
    });
  });

  describe('POST /api/wishes/shared', () => {
    it('should create shared wish successfully', async () => {
      const wishData = {
        title: 'New Shared Wish',
        description: 'A new shared wish',
        category: 'romance'
      };

      const { req, res } = createMocks({
        method: 'POST',
        body: wishData
      });

      const createdWish = { ...mockSharedWish, ...wishData };
      vi.mocked(db.createSharedWish).mockResolvedValue(createdWish);

      await sharedHandler(req, res);

      expect(res._getStatusCode()).toBe(201);
      const data = JSON.parse(res._getData());
      expect(data.wish).toEqual(createdWish);
      expect(data.message).toBe('Shared wish created successfully. Waiting for partner approval.');
    });

    it('should return 400 for missing required fields', async () => {
      const { req, res } = createMocks({
        method: 'POST',
        body: {
          title: 'Test Wish'
          // Missing description
        }
      });

      await sharedHandler(req, res);

      expect(res._getStatusCode()).toBe(400);
      const data = JSON.parse(res._getData());
      expect(data.error).toContain('Missing required fields');
    });

    it('should handle creation errors gracefully', async () => {
      const { req, res } = createMocks({
        method: 'POST',
        body: {
          title: 'Test Wish',
          description: 'Test description',
          category: 'romance'
        }
      });

      vi.mocked(db.createSharedWish).mockRejectedValue(new Error('Creation failed'));

      await sharedHandler(req, res);

      expect(res._getStatusCode()).toBe(500);
      const data = JSON.parse(res._getData());
      expect(data.error).toBe('Internal server error');
    });
  });
});