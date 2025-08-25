import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createMocks } from 'node-mocks-http';
import currentHandler from '../../pages/api/events/current';
import completeHandler from '../../pages/api/events/[id]/complete';
import generateHandler from '../../pages/api/events/generate';
import * as telegramAuth from '../../lib/telegram-auth';
import * as db from '../../lib/db';
import { User, RandomEvent } from '../../types/quest-economy';

// Mock dependencies
vi.mock('../../lib/telegram-auth');
vi.mock('../../lib/db');

describe('Events API', () => {
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

  const mockEvent: RandomEvent = {
    id: 'event-1',
    user_id: 'user-1',
    title: 'Неожиданный сюрприз',
    description: 'Сделайте что-то приятное для партнера без предупреждения',
    mana_reward: 20,
    experience_reward: 20,
    status: 'active',
    expires_at: new Date('2024-01-16T10:00:00Z'),
    created_at: new Date('2024-01-15T10:00:00Z'),
    completed_at: null,
    completed_by: null,
    metadata: {},
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(telegramAuth.getUserFromRequest).mockResolvedValue(mockUser);
  });

  describe('GET /api/events/current', () => {
    it('should return existing current event', async () => {
      const { req, res } = createMocks({ method: 'GET' });
      vi.mocked(db.getCurrentEvent).mockResolvedValue(mockEvent);

      await currentHandler(req, res);

      expect(res._getStatusCode()).toBe(200);
      const data = JSON.parse(res._getData());
      expect(data.event.id).toEqual(mockEvent.id);
    });
  });

  describe('POST /api/events/[id]/complete', () => {
    it('should complete event successfully when validated by partner', async () => {
      const { req, res } = createMocks({
        method: 'POST',
        query: { id: 'event-1' },
      });

      const partnerUser = { ...mockUser, id: 'user-2' };
      vi.mocked(telegramAuth.getUserFromRequest).mockResolvedValue(partnerUser);
      vi.mocked(db.getEventById).mockResolvedValue(mockEvent);
      vi.mocked(db.completeRandomEvent).mockResolvedValue({ ...mockEvent, status: 'completed' });
      vi.mocked(db.addTransaction).mockResolvedValue(undefined);

      await completeHandler(req, res);

      expect(res._getStatusCode()).toBe(200);
      const data = JSON.parse(res._getData());
      expect(data.event.status).toBe('completed');
    });
  });

  describe('POST /api/events/generate', () => {
    it('should generate new event successfully', async () => {
      const { req, res } = createMocks({ method: 'POST' });
      vi.mocked(db.getCurrentEvent).mockResolvedValue(null);
      vi.mocked(db.createRandomEvent).mockResolvedValue(mockEvent);

      await generateHandler(req, res);

      expect(res._getStatusCode()).toBe(201);
      const data = JSON.parse(res._getData());
      expect(data.event.id).toBe(mockEvent.id);
    });
  });
});
