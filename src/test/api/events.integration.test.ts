import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createMocks } from 'node-mocks-http';
import currentHandler from '../../pages/api/events/current';
import completeHandler from '../../pages/api/events/[id]/complete';
import generateHandler from '../../pages/api/events/generate';
import * as telegramAuth from '../../lib/telegram-auth';
import * as db from '../../lib/db';

// Mock dependencies
vi.mock('../../lib/telegram-auth');
vi.mock('../../lib/db');

describe('Events API', () => {
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

  const mockEvent = {
    id: 'event-1',
    user_id: 'user-1',
    title: 'Неожиданный сюрприз',
    description: 'Сделайте что-то приятное для партнера без предупреждения',
    reward_type: 'green',
    reward_amount: 2,
    experience_reward: 20,
    status: 'active' as const,
    expires_at: new Date('2024-01-16T10:00:00Z'),
    created_at: new Date('2024-01-15T10:00:00Z'),
    completed_at: null,
    completed_by: null,
    metadata: {}
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(telegramAuth.getUserFromRequest).mockResolvedValue(mockUser);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('GET /api/events/current', () => {
    it('should return existing current event', async () => {
      const { req, res } = createMocks({
        method: 'GET'
      });

      vi.mocked(db.getCurrentEvent).mockResolvedValue(mockEvent);

      await currentHandler(req, res);

      expect(res._getStatusCode()).toBe(200);
      const data = JSON.parse(res._getData());
      expect(data.event).toEqual(mockEvent);
      expect(data.isNew).toBe(false);
    });

    it('should generate new event when none exists', async () => {
      const { req, res } = createMocks({
        method: 'GET'
      });

      vi.mocked(db.getCurrentEvent).mockResolvedValue(null);
      vi.mocked(db.createRandomEvent).mockResolvedValue(mockEvent);

      await currentHandler(req, res);

      expect(res._getStatusCode()).toBe(200);
      const data = JSON.parse(res._getData());
      expect(data.event).toEqual(mockEvent);
      expect(data.isNew).toBe(true);
      expect(db.createRandomEvent).toHaveBeenCalled();
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

      vi.mocked(db.getCurrentEvent).mockRejectedValue(new Error('Database error'));

      await currentHandler(req, res);

      expect(res._getStatusCode()).toBe(500);
      const data = JSON.parse(res._getData());
      expect(data.error).toBe('Internal server error');
    });
  });

  describe('POST /api/events/[id]/complete', () => {
    it('should complete event successfully when validated by partner', async () => {
      const { req, res } = createMocks({
        method: 'POST',
        query: { id: 'event-1' }
      });

      const partnerUser = { ...mockUser, id: 'user-2' };
      vi.mocked(telegramAuth.getUserFromRequest).mockResolvedValue(partnerUser);
      vi.mocked(db.getEventById).mockResolvedValue(mockEvent);
      vi.mocked(db.completeRandomEvent).mockResolvedValue({
        ...mockEvent,
        status: 'completed',
        completed_at: new Date(),
        completed_by: 'user-2'
      });
      vi.mocked(db.addTransaction).mockResolvedValue({
        id: 'transaction-1',
        user_id: 'user-1',
        type: 'credit',
        wish_type: 'green',
        amount: 2,
        reason: 'Random event completion',
        created_at: new Date(),
        reference_id: 'event-1',
        transaction_category: 'event'
      });

      await completeHandler(req, res);

      expect(res._getStatusCode()).toBe(200);
      const data = JSON.parse(res._getData());
      expect(data.event.status).toBe('completed');
      expect(data.event.completed_by).toBe('user-2');
      expect(data.rewardsGranted).toBe(true);
    });

    it('should return 400 for missing event ID', async () => {
      const { req, res } = createMocks({
        method: 'POST',
        query: {}
      });

      await completeHandler(req, res);

      expect(res._getStatusCode()).toBe(400);
      const data = JSON.parse(res._getData());
      expect(data.error).toBe('Event ID is required');
    });

    it('should return 404 for non-existent event', async () => {
      const { req, res } = createMocks({
        method: 'POST',
        query: { id: 'non-existent' }
      });

      vi.mocked(db.getEventById).mockResolvedValue(null);

      await completeHandler(req, res);

      expect(res._getStatusCode()).toBe(404);
      const data = JSON.parse(res._getData());
      expect(data.error).toBe('Event not found');
    });

    it('should return 403 when user tries to complete own event', async () => {
      const { req, res } = createMocks({
        method: 'POST',
        query: { id: 'event-1' }
      });

      vi.mocked(db.getEventById).mockResolvedValue(mockEvent);

      await completeHandler(req, res);

      expect(res._getStatusCode()).toBe(403);
      const data = JSON.parse(res._getData());
      expect(data.error).toBe('Users cannot complete their own events. Only your partner can validate completion.');
    });

    it('should return 400 for expired event', async () => {
      const { req, res } = createMocks({
        method: 'POST',
        query: { id: 'event-1' }
      });

      const expiredEvent = {
        ...mockEvent,
        expires_at: new Date('2024-01-14T10:00:00Z') // Expired
      };

      const partnerUser = { ...mockUser, id: 'user-2' };
      vi.mocked(telegramAuth.getUserFromRequest).mockResolvedValue(partnerUser);
      vi.mocked(db.getEventById).mockResolvedValue(expiredEvent);

      await completeHandler(req, res);

      expect(res._getStatusCode()).toBe(400);
      const data = JSON.parse(res._getData());
      expect(data.error).toBe('Event has expired');
    });

    it('should return 401 for unauthorized requests', async () => {
      const { req, res } = createMocks({
        method: 'POST',
        query: { id: 'event-1' }
      });

      vi.mocked(telegramAuth.getUserFromRequest).mockResolvedValue(null);

      await completeHandler(req, res);

      expect(res._getStatusCode()).toBe(401);
      const data = JSON.parse(res._getData());
      expect(data.error).toBe('Unauthorized');
    });

    it('should return 405 for non-POST requests', async () => {
      const { req, res } = createMocks({
        method: 'GET',
        query: { id: 'event-1' }
      });

      await completeHandler(req, res);

      expect(res._getStatusCode()).toBe(405);
      const data = JSON.parse(res._getData());
      expect(data.error).toBe('Method not allowed');
    });
  });

  describe('POST /api/events/generate', () => {
    it('should generate new event successfully', async () => {
      const { req, res } = createMocks({
        method: 'POST'
      });

      vi.mocked(db.getCurrentEvent).mockResolvedValue(null);
      vi.mocked(db.createRandomEvent).mockResolvedValue(mockEvent);

      await generateHandler(req, res);

      expect(res._getStatusCode()).toBe(201);
      const data = JSON.parse(res._getData());
      expect(data.event).toEqual(mockEvent);
      expect(data.message).toBe('New event generated successfully');
    });

    it('should return 400 when user already has active event', async () => {
      const { req, res } = createMocks({
        method: 'POST'
      });

      vi.mocked(db.getCurrentEvent).mockResolvedValue(mockEvent);

      await generateHandler(req, res);

      expect(res._getStatusCode()).toBe(400);
      const data = JSON.parse(res._getData());
      expect(data.error).toBe('User already has an active event');
    });

    it('should return 401 for unauthorized requests', async () => {
      const { req, res } = createMocks({
        method: 'POST'
      });

      vi.mocked(telegramAuth.getUserFromRequest).mockResolvedValue(null);

      await generateHandler(req, res);

      expect(res._getStatusCode()).toBe(401);
      const data = JSON.parse(res._getData());
      expect(data.error).toBe('Unauthorized');
    });

    it('should return 405 for non-POST requests', async () => {
      const { req, res } = createMocks({
        method: 'GET'
      });

      await generateHandler(req, res);

      expect(res._getStatusCode()).toBe(405);
      const data = JSON.parse(res._getData());
      expect(data.error).toBe('Method not allowed');
    });

    it('should handle generation errors gracefully', async () => {
      const { req, res } = createMocks({
        method: 'POST'
      });

      vi.mocked(db.getCurrentEvent).mockResolvedValue(null);
      vi.mocked(db.createRandomEvent).mockRejectedValue(new Error('Generation failed'));

      await generateHandler(req, res);

      expect(res._getStatusCode()).toBe(500);
      const data = JSON.parse(res._getData());
      expect(data.error).toBe('Internal server error');
    });
  });
});