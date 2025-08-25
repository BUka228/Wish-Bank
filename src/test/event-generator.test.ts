import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { EventGenerator } from '../lib/event-generator';
import * as db from '../lib/db';

// Mock the database module
vi.mock('../lib/db', () => ({
  createRandomEvent: vi.fn(),
  getCurrentEvent: vi.fn(),
  getEventById: vi.fn(),
  completeRandomEvent: vi.fn(),
  getUserByTelegramId: vi.fn(),
  addTransaction: vi.fn(),
}));

describe('EventGenerator', () => {
  let eventGenerator: EventGenerator;
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
    eventGenerator = new EventGenerator();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('generateRandomEvent', () => {
    it('should generate a random event successfully when user has no active event', async () => {
      vi.mocked(db.getCurrentEvent).mockResolvedValue(null);
      vi.mocked(db.createRandomEvent).mockResolvedValue(mockEvent);

      const result = await eventGenerator.generateRandomEvent('user-1');

      expect(result).toEqual(mockEvent);
      expect(db.getCurrentEvent).toHaveBeenCalledWith('user-1');
      expect(db.createRandomEvent).toHaveBeenCalledWith(
        'user-1',
        expect.any(String), // title
        expect.any(String), // description
        expect.any(String), // reward_type
        expect.any(Number), // reward_amount
        expect.any(Number), // experience_reward
        expect.any(Date) // expires_at (24 hours from now)
      );
    });

    it('should reject generation when user already has active event', async () => {
      vi.mocked(db.getCurrentEvent).mockResolvedValue(mockEvent);

      await expect(eventGenerator.generateRandomEvent('user-1'))
        .rejects.toThrow('User already has an active event');

      expect(db.createRandomEvent).not.toHaveBeenCalled();
    });

    it('should set expiration time to 24 hours from now', async () => {
      vi.mocked(db.getCurrentEvent).mockResolvedValue(null);
      vi.mocked(db.createRandomEvent).mockResolvedValue(mockEvent);

      await eventGenerator.generateRandomEvent('user-1');

      const createCall = vi.mocked(db.createRandomEvent).mock.calls[0];
      const expiresAt = createCall[6] as Date;
      const expectedExpiration = new Date('2024-01-16T10:00:00Z'); // 24 hours from mocked time

      expect(expiresAt.getTime()).toBe(expectedExpiration.getTime());
    });
  });

  describe('completeRandomEvent', () => {
    it('should complete event successfully when partner validates it', async () => {
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
        reason: 'Random event completion: Неожиданный сюрприз',
        created_at: new Date(),
        reference_id: 'event-1',
        transaction_category: 'event'
      });

      const result = await eventGenerator.completeRandomEvent('event-1', 'user-2');

      expect(result.event.status).toBe('completed');
      expect(result.event.completed_by).toBe('user-2');
      expect(result.rewardsGranted).toBe(true);
      expect(db.completeRandomEvent).toHaveBeenCalledWith('event-1', 'user-2');
      expect(db.addTransaction).toHaveBeenCalledWith(
        'user-1', // event owner gets the reward
        'credit',
        'green',
        2,
        'Random event completion: Неожиданный сюрприз',
        'event-1'
      );
    });

    it('should reject completion by event owner themselves', async () => {
      vi.mocked(db.getEventById).mockResolvedValue(mockEvent);

      await expect(eventGenerator.completeRandomEvent('event-1', 'user-1'))
        .rejects.toThrow('Users cannot complete their own events. Only your partner can validate completion.');

      expect(db.completeRandomEvent).not.toHaveBeenCalled();
    });

    it('should reject completion of non-existent event', async () => {
      vi.mocked(db.getEventById).mockResolvedValue(null);

      await expect(eventGenerator.completeRandomEvent('event-1', 'user-2'))
        .rejects.toThrow('Event not found');
    });

    it('should reject completion of non-active event', async () => {
      vi.mocked(db.getEventById).mockResolvedValue({
        ...mockEvent,
        status: 'completed'
      });

      await expect(eventGenerator.completeRandomEvent('event-1', 'user-2'))
        .rejects.toThrow('Cannot complete event with status: completed');
    });

    it('should reject completion of expired event', async () => {
      vi.mocked(db.getEventById).mockResolvedValue({
        ...mockEvent,
        expires_at: new Date('2024-01-14T10:00:00Z') // Expired yesterday
      });

      await expect(eventGenerator.completeRandomEvent('event-1', 'user-2'))
        .rejects.toThrow('Event has expired');
    });
  });

  describe('getUserCurrentEvent', () => {
    it('should return current active event for user', async () => {
      vi.mocked(db.getCurrentEvent).mockResolvedValue(mockEvent);

      const result = await eventGenerator.getUserCurrentEvent('user-1');

      expect(result).toEqual(mockEvent);
      expect(db.getCurrentEvent).toHaveBeenCalledWith('user-1');
    });

    it('should return null when user has no active event', async () => {
      vi.mocked(db.getCurrentEvent).mockResolvedValue(null);

      const result = await eventGenerator.getUserCurrentEvent('user-1');

      expect(result).toBeNull();
    });
  });

  describe('forceGenerateEvent', () => {
    it('should generate new event even when user has existing active event', async () => {
      vi.mocked(db.getCurrentEvent).mockResolvedValue(mockEvent);
      // Mock the second call to generateRandomEvent to succeed
      vi.mocked(db.getCurrentEvent).mockResolvedValueOnce(mockEvent).mockResolvedValueOnce(null);
      vi.mocked(db.createRandomEvent).mockResolvedValue({
        ...mockEvent,
        id: 'event-2',
        title: 'Кулинарный эксперимент'
      });

      const result = await eventGenerator.forceGenerateEvent('user-1');

      expect(result.id).toBe('event-2');
      expect(db.getCurrentEvent).toHaveBeenCalledWith('user-1');
      expect(db.createRandomEvent).toHaveBeenCalled();
    });
  });

  describe('cleanupExpiredEvents', () => {
    it('should return cleanup statistics', async () => {
      const result = await eventGenerator.cleanupExpiredEvents();

      expect(result).toHaveProperty('cleanedCount');
      expect(result).toHaveProperty('newEventsGenerated');
      expect(typeof result.cleanedCount).toBe('number');
      expect(typeof result.newEventsGenerated).toBe('number');
    });
  });

  describe('getEventStats', () => {
    it('should return event statistics structure', async () => {
      const stats = await eventGenerator.getEventStats('user-1');

      expect(stats).toHaveProperty('totalGenerated');
      expect(stats).toHaveProperty('totalCompleted');
      expect(stats).toHaveProperty('completionRate');
      expect(stats).toHaveProperty('averageReward');
      expect(stats).toHaveProperty('currentStreak');
      expect(typeof stats.totalGenerated).toBe('number');
      expect(typeof stats.totalCompleted).toBe('number');
      expect(typeof stats.completionRate).toBe('number');
      expect(typeof stats.averageReward).toBe('number');
      expect(typeof stats.currentStreak).toBe('number');
    });
  });

  describe('getEventCategories', () => {
    it('should return available event categories with counts', () => {
      const categories = eventGenerator.getEventCategories();

      expect(Array.isArray(categories)).toBe(true);
      expect(categories.length).toBeGreaterThan(0);
      
      categories.forEach(category => {
        expect(category).toHaveProperty('category');
        expect(category).toHaveProperty('count');
        expect(category).toHaveProperty('description');
        expect(typeof category.category).toBe('string');
        expect(typeof category.count).toBe('number');
        expect(typeof category.description).toBe('string');
      });

      // Check that we have expected categories
      const categoryNames = categories.map(c => c.category);
      expect(categoryNames).toContain('romance');
      expect(categoryNames).toContain('food');
      expect(categoryNames).toContain('activity');
    });
  });

  describe('shouldGenerateEvent', () => {
    it('should return true when user has no active event', async () => {
      vi.mocked(db.getCurrentEvent).mockResolvedValue(null);

      const result = await eventGenerator.shouldGenerateEvent('user-1');

      expect(result).toBe(true);
      expect(db.getCurrentEvent).toHaveBeenCalledWith('user-1');
    });

    it('should return false when user has active event', async () => {
      vi.mocked(db.getCurrentEvent).mockResolvedValue(mockEvent);

      const result = await eventGenerator.shouldGenerateEvent('user-1');

      expect(result).toBe(false);
    });

    it('should return false on database error', async () => {
      vi.mocked(db.getCurrentEvent).mockRejectedValue(new Error('Database error'));

      const result = await eventGenerator.shouldGenerateEvent('user-1');

      expect(result).toBe(false);
    });
  });

  describe('event pool validation', () => {
    it('should have events with required properties', () => {
      const categories = eventGenerator.getEventCategories();
      
      // Verify we have a reasonable number of events
      const totalEvents = categories.reduce((sum, cat) => sum + cat.count, 0);
      expect(totalEvents).toBeGreaterThan(5);
      
      // Verify all categories have Russian descriptions
      categories.forEach(category => {
        expect(category.description).toMatch(/[а-яё]/i); // Contains Cyrillic characters
      });
    });
  });

  describe('reward calculation', () => {
    it('should calculate rewards within reasonable bounds', async () => {
      vi.mocked(db.getCurrentEvent).mockResolvedValue(null);
      vi.mocked(db.createRandomEvent).mockImplementation(async (userId, title, description, rewardType, rewardAmount, experienceReward, expiresAt) => {
        // Verify reward amounts are reasonable
        expect(rewardAmount).toBeGreaterThan(0);
        expect(rewardAmount).toBeLessThanOrEqual(10);
        expect(experienceReward).toBeGreaterThan(0);
        expect(experienceReward).toBeLessThanOrEqual(100);
        expect(['green', 'blue', 'red']).toContain(rewardType);
        
        return mockEvent;
      });

      await eventGenerator.generateRandomEvent('user-1');
    });
  });
});