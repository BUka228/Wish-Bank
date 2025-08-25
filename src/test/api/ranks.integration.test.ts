import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createMocks } from 'node-mocks-http';
import currentHandler from '../../pages/api/ranks/current';
import progressHandler from '../../pages/api/ranks/progress';
import * as telegramAuth from '../../lib/telegram-auth';

// Mock dependencies
vi.mock('../../lib/telegram-auth');

describe('Ranks API', () => {
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
    experience_points: 150,
    daily_quota_used: 2,
    weekly_quota_used: 8,
    monthly_quota_used: 15,
    last_quota_reset: new Date('2024-01-15T00:00:00Z'),
    experience: 150 // For compatibility
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(telegramAuth.getUserFromRequest).mockResolvedValue(mockUser);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('GET /api/ranks/current', () => {
    it('should return current rank for user with experience', async () => {
      const { req, res } = createMocks({
        method: 'GET'
      });

      await currentHandler(req, res);

      expect(res._getStatusCode()).toBe(200);
      const data = JSON.parse(res._getData());
      expect(data.rank).toBeDefined();
      expect(data.rank.name).toBe('Ефрейтор'); // 150 experience = Ефрейтор
      expect(data.rank.min_experience).toBe(100);
      expect(data.experience).toBe(150);
    });

    it('should return default rank for user with no experience', async () => {
      const { req, res } = createMocks({
        method: 'GET'
      });

      const userWithNoExp = { ...mockUser, experience_points: 0, experience: 0 };
      vi.mocked(telegramAuth.getUserFromRequest).mockResolvedValue(userWithNoExp);

      await currentHandler(req, res);

      expect(res._getStatusCode()).toBe(200);
      const data = JSON.parse(res._getData());
      expect(data.rank.name).toBe('Рядовой'); // 0 experience = Рядовой
      expect(data.rank.min_experience).toBe(0);
      expect(data.experience).toBe(0);
    });

    it('should handle user with undefined experience', async () => {
      const { req, res } = createMocks({
        method: 'GET'
      });

      const userWithUndefinedExp = { ...mockUser };
      delete userWithUndefinedExp.experience;
      delete userWithUndefinedExp.experience_points;
      vi.mocked(telegramAuth.getUserFromRequest).mockResolvedValue(userWithUndefinedExp);

      await currentHandler(req, res);

      expect(res._getStatusCode()).toBe(200);
      const data = JSON.parse(res._getData());
      expect(data.rank.name).toBe('Рядовой'); // Default to 0 experience
      expect(data.experience).toBe(0);
    });

    it('should return 401 for unauthorized requests', async () => {
      const { req, res } = createMocks({
        method: 'GET'
      });

      vi.mocked(telegramAuth.getUserFromRequest).mockResolvedValue(null);

      await currentHandler(req, res);

      expect(res._getStatusCode()).toBe(401);
      const data = JSON.parse(res._getData());
      expect(data.error).toBe('Unauthorized');
    });

    it('should return 405 for non-GET requests', async () => {
      const { req, res } = createMocks({
        method: 'POST'
      });

      await currentHandler(req, res);

      expect(res._getStatusCode()).toBe(405);
      const data = JSON.parse(res._getData());
      expect(data.error).toBe('Method not allowed');
    });

    it('should handle errors gracefully', async () => {
      const { req, res } = createMocks({
        method: 'GET'
      });

      vi.mocked(telegramAuth.getUserFromRequest).mockRejectedValue(new Error('Auth error'));

      await currentHandler(req, res);

      expect(res._getStatusCode()).toBe(500);
      const data = JSON.parse(res._getData());
      expect(data.error).toBe('Internal server error');
    });
  });

  describe('GET /api/ranks/progress', () => {
    it('should return rank progress for user', async () => {
      const { req, res } = createMocks({
        method: 'GET'
      });

      await progressHandler(req, res);

      expect(res._getStatusCode()).toBe(200);
      const data = JSON.parse(res._getData());
      expect(data.progress).toBeDefined();
      expect(data.progress.currentRank).toBeDefined();
      expect(data.progress.currentRank.name).toBe('Ефрейтор');
      expect(data.progress.nextRank).toBeDefined();
      expect(data.progress.nextRank.name).toBe('Младший сержант');
      expect(data.progress.progressPercent).toBe(25); // (150-100)/(300-100) * 100 = 25%
      expect(data.progress.experienceToNext).toBe(150); // 300 - 150
    });

    it('should handle user at maximum rank', async () => {
      const { req, res } = createMocks({
        method: 'GET'
      });

      const maxRankUser = { ...mockUser, experience_points: 2000, experience: 2000 };
      vi.mocked(telegramAuth.getUserFromRequest).mockResolvedValue(maxRankUser);

      await progressHandler(req, res);

      expect(res._getStatusCode()).toBe(200);
      const data = JSON.parse(res._getData());
      expect(data.progress.currentRank.name).toBe('Старшина');
      expect(data.progress.nextRank).toBeNull();
      expect(data.progress.progressPercent).toBe(100);
      expect(data.progress.experienceToNext).toBe(0);
    });

    it('should handle user at exact rank threshold', async () => {
      const { req, res } = createMocks({
        method: 'GET'
      });

      const exactRankUser = { ...mockUser, experience_points: 300, experience: 300 };
      vi.mocked(telegramAuth.getUserFromRequest).mockResolvedValue(exactRankUser);

      await progressHandler(req, res);

      expect(res._getStatusCode()).toBe(200);
      const data = JSON.parse(res._getData());
      expect(data.progress.currentRank.name).toBe('Младший сержант');
      expect(data.progress.nextRank.name).toBe('Сержант');
      expect(data.progress.progressPercent).toBe(0); // Just reached this rank
      expect(data.progress.experienceToNext).toBe(300); // 600 - 300
    });

    it('should return 401 for unauthorized requests', async () => {
      const { req, res } = createMocks({
        method: 'GET'
      });

      vi.mocked(telegramAuth.getUserFromRequest).mockResolvedValue(null);

      await progressHandler(req, res);

      expect(res._getStatusCode()).toBe(401);
      const data = JSON.parse(res._getData());
      expect(data.error).toBe('Unauthorized');
    });

    it('should return 405 for non-GET requests', async () => {
      const { req, res } = createMocks({
        method: 'POST'
      });

      await progressHandler(req, res);

      expect(res._getStatusCode()).toBe(405);
      const data = JSON.parse(res._getData());
      expect(data.error).toBe('Method not allowed');
    });

    it('should handle errors gracefully', async () => {
      const { req, res } = createMocks({
        method: 'GET'
      });

      vi.mocked(telegramAuth.getUserFromRequest).mockRejectedValue(new Error('Auth error'));

      await progressHandler(req, res);

      expect(res._getStatusCode()).toBe(500);
      const data = JSON.parse(res._getData());
      expect(data.error).toBe('Internal server error');
    });
  });
});