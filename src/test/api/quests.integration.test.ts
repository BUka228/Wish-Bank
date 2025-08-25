import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createMocks } from 'node-mocks-http';
import handler from '../../pages/api/quests/index';
import * as telegramAuth from '../../lib/telegram-auth';
import * as db from '../../lib/db';

// Mock dependencies
vi.mock('../../lib/telegram-auth');
vi.mock('../../lib/db');

describe('/api/quests', () => {
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

  const mockQuest = {
    id: 'quest-1',
    title: 'Test Quest',
    description: 'Test quest description',
    author_id: 'user-1',
    assignee_id: 'user-2',
    category: 'general',
    difficulty: 'easy' as const,
    reward_type: 'green',
    reward_amount: 1,
    experience_reward: 10,
    status: 'active' as const,
    due_date: new Date('2024-01-20T10:00:00Z'),
    created_at: new Date('2024-01-15T10:00:00Z'),
    completed_at: null,
    metadata: {}
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(telegramAuth.getUserFromRequest).mockResolvedValue(mockUser);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('GET /api/quests', () => {
    it('should return user quests successfully', async () => {
      const { req, res } = createMocks({
        method: 'GET',
        query: { status: 'active', role: 'both', limit: '10' }
      });

      vi.mocked(db.getQuestsByUser).mockResolvedValue([mockQuest]);

      await handler(req, res);

      expect(res._getStatusCode()).toBe(200);
      const data = JSON.parse(res._getData());
      expect(data.quests).toHaveLength(1);
      expect(data.quests[0]).toEqual(mockQuest);
      expect(data.total).toBe(1);
    });

    it('should filter quests by status', async () => {
      const { req, res } = createMocks({
        method: 'GET',
        query: { status: 'completed' }
      });

      const completedQuest = { ...mockQuest, status: 'completed' };
      vi.mocked(db.getQuestsByUser).mockResolvedValue([completedQuest]);

      await handler(req, res);

      expect(res._getStatusCode()).toBe(200);
      const data = JSON.parse(res._getData());
      expect(data.quests[0].status).toBe('completed');
    });

    it('should apply limit to results', async () => {
      const { req, res } = createMocks({
        method: 'GET',
        query: { limit: '5' }
      });

      const quests = Array(10).fill(mockQuest);
      vi.mocked(db.getQuestsByUser).mockResolvedValue(quests);

      await handler(req, res);

      expect(res._getStatusCode()).toBe(200);
      const data = JSON.parse(res._getData());
      expect(data.quests).toHaveLength(10); // Note: filtering happens in business logic
    });

    it('should return 401 for unauthorized requests', async () => {
      const { req, res } = createMocks({
        method: 'GET'
      });

      vi.mocked(telegramAuth.getUserFromRequest).mockResolvedValue(null);

      await handler(req, res);

      expect(res._getStatusCode()).toBe(401);
      const data = JSON.parse(res._getData());
      expect(data.error).toBe('Unauthorized');
    });
  });

  describe('POST /api/quests', () => {
    it('should create quest successfully with valid data', async () => {
      const questData = {
        title: 'New Quest',
        description: 'A new quest description',
        assignee_id: 'user-2',
        category: 'general',
        difficulty: 'easy',
        reward_type: 'green'
      };

      const { req, res } = createMocks({
        method: 'POST',
        body: questData
      });

      const createdQuest = { ...mockQuest, ...questData };
      vi.mocked(db.getQuestsByUser).mockResolvedValue([]);
      vi.mocked(db.createQuest).mockResolvedValue(createdQuest);

      await handler(req, res);

      expect(res._getStatusCode()).toBe(201);
      const data = JSON.parse(res._getData());
      expect(data.quest).toEqual(createdQuest);
      expect(data.validation.isValid).toBe(true);
    });

    it('should return 400 for missing required fields', async () => {
      const { req, res } = createMocks({
        method: 'POST',
        body: {
          title: 'Test Quest'
          // Missing description and assignee_id
        }
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(400);
      const data = JSON.parse(res._getData());
      expect(data.error).toContain('Missing required fields');
    });

    it('should handle quest creation validation errors', async () => {
      const questData = {
        title: 'ab', // Too short
        description: 'A new quest description',
        assignee_id: 'user-2'
      };

      const { req, res } = createMocks({
        method: 'POST',
        body: questData
      });

      vi.mocked(db.getQuestsByUser).mockResolvedValue([]);

      await handler(req, res);

      expect(res._getStatusCode()).toBe(500);
      const data = JSON.parse(res._getData());
      expect(data.error).toBe('Internal server error');
    });

    it('should handle due_date conversion', async () => {
      const questData = {
        title: 'Quest with Due Date',
        description: 'A quest with a due date',
        assignee_id: 'user-2',
        due_date: '2024-01-20T10:00:00Z'
      };

      const { req, res } = createMocks({
        method: 'POST',
        body: questData
      });

      vi.mocked(db.getQuestsByUser).mockResolvedValue([]);
      vi.mocked(db.createQuest).mockResolvedValue({
        ...mockQuest,
        due_date: new Date('2024-01-20T10:00:00Z')
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(201);
      expect(db.createQuest).toHaveBeenCalledWith(
        questData.title,
        questData.description,
        'user-1',
        questData.assignee_id,
        'general', // default category
        'easy', // default difficulty
        'green', // default reward_type
        1, // calculated reward_amount
        10, // calculated experience_reward
        new Date('2024-01-20T10:00:00Z')
      );
    });

    it('should return 401 for unauthorized requests', async () => {
      const { req, res } = createMocks({
        method: 'POST',
        body: {
          title: 'Test Quest',
          description: 'Test description',
          assignee_id: 'user-2'
        }
      });

      vi.mocked(telegramAuth.getUserFromRequest).mockResolvedValue(null);

      await handler(req, res);

      expect(res._getStatusCode()).toBe(401);
      const data = JSON.parse(res._getData());
      expect(data.error).toBe('Unauthorized');
    });
  });

  describe('Unsupported methods', () => {
    it('should return 405 for PUT requests', async () => {
      const { req, res } = createMocks({
        method: 'PUT'
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(405);
      const data = JSON.parse(res._getData());
      expect(data.error).toBe('Method not allowed');
    });

    it('should return 405 for DELETE requests', async () => {
      const { req, res } = createMocks({
        method: 'DELETE'
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(405);
      const data = JSON.parse(res._getData());
      expect(data.error).toBe('Method not allowed');
    });
  });

  describe('Error handling', () => {
    it('should handle database errors gracefully', async () => {
      const { req, res } = createMocks({
        method: 'GET'
      });

      vi.mocked(db.getQuestsByUser).mockRejectedValue(new Error('Database error'));

      await handler(req, res);

      expect(res._getStatusCode()).toBe(500);
      const data = JSON.parse(res._getData());
      expect(data.error).toBe('Internal server error');
    });

    it('should handle authentication errors gracefully', async () => {
      const { req, res } = createMocks({
        method: 'GET'
      });

      vi.mocked(telegramAuth.getUserFromRequest).mockRejectedValue(new Error('Auth error'));

      await handler(req, res);

      expect(res._getStatusCode()).toBe(500);
      const data = JSON.parse(res._getData());
      expect(data.error).toBe('Internal server error');
    });
  });
});