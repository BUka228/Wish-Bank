import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { QuestEngine } from '../lib/quest-engine';
import * as db from '../lib/db';

// Mock the database module
vi.mock('../lib/db', () => ({
  createQuest: vi.fn(),
  getQuestById: vi.fn(),
  updateQuest: vi.fn(),
  completeQuest: vi.fn(),
  cancelQuest: vi.fn(),
  getQuestsByUser: vi.fn(),
  getExpiredQuests: vi.fn(),
  markQuestsAsExpired: vi.fn(),
  getUserByTelegramId: vi.fn(),
  addTransaction: vi.fn(),
}));

describe('QuestEngine', () => {
  let questEngine: QuestEngine;
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
    questEngine = new QuestEngine();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('createQuest', () => {
    it('should create a quest successfully with valid data', async () => {
      const questData = {
        title: 'Test Quest',
        description: 'Test quest description',
        assignee_id: 'user-2',
        category: 'general',
        difficulty: 'easy' as const,
        reward_type: 'green',
        due_date: new Date('2024-01-20T10:00:00Z')
      };

      vi.mocked(db.getQuestsByUser).mockResolvedValue([]);
      vi.mocked(db.createQuest).mockResolvedValue(mockQuest);

      const result = await questEngine.createQuest('user-1', questData);

      expect(result.quest).toEqual(mockQuest);
      expect(result.validation.isValid).toBe(true);
      expect(db.createQuest).toHaveBeenCalledWith(
        questData.title,
        questData.description,
        'user-1',
        questData.assignee_id,
        questData.category,
        questData.difficulty,
        questData.reward_type,
        1, // calculated reward amount
        10, // calculated experience reward
        questData.due_date
      );
    });

    it('should reject quest creation with invalid title', async () => {
      const questData = {
        title: 'ab', // Too short
        description: 'Test quest description',
        assignee_id: 'user-2'
      };

      vi.mocked(db.getQuestsByUser).mockResolvedValue([]);

      await expect(questEngine.createQuest('user-1', questData))
        .rejects.toThrow('Quest creation failed: Quest title must be at least 3 characters long');
    });

    it('should reject quest creation with invalid description', async () => {
      const questData = {
        title: 'Valid Title',
        description: 'short', // Too short
        assignee_id: 'user-2'
      };

      vi.mocked(db.getQuestsByUser).mockResolvedValue([]);

      await expect(questEngine.createQuest('user-1', questData))
        .rejects.toThrow('Quest creation failed: Quest description must be at least 10 characters long');
    });

    it('should reject self-assignment', async () => {
      const questData = {
        title: 'Valid Title',
        description: 'Valid description',
        assignee_id: 'user-1' // Same as author
      };

      vi.mocked(db.getQuestsByUser).mockResolvedValue([]);

      await expect(questEngine.createQuest('user-1', questData))
        .rejects.toThrow('Quest creation failed: Cannot assign quest to yourself');
    });

    it('should reject when max active quests reached', async () => {
      const questData = {
        title: 'Valid Title',
        description: 'Valid description',
        assignee_id: 'user-2'
      };

      // Mock 10 active quests (max limit)
      const activeQuests = Array(10).fill(mockQuest);
      vi.mocked(db.getQuestsByUser).mockResolvedValue(activeQuests);

      await expect(questEngine.createQuest('user-1', questData))
        .rejects.toThrow('Quest creation failed: Maximum active quests limit reached (10)');
    });

    it('should calculate rewards correctly for different difficulties', async () => {
      const questData = {
        title: 'Medium Quest',
        description: 'A medium difficulty quest',
        assignee_id: 'user-2',
        difficulty: 'medium' as const,
        reward_type: 'blue'
      };

      vi.mocked(db.getQuestsByUser).mockResolvedValue([]);
      vi.mocked(db.createQuest).mockResolvedValue({
        ...mockQuest,
        difficulty: 'medium',
        reward_amount: 2,
        experience_reward: 25
      });

      const result = await questEngine.createQuest('user-1', questData);

      expect(db.createQuest).toHaveBeenCalledWith(
        questData.title,
        questData.description,
        'user-1',
        questData.assignee_id,
        'general', // default category
        questData.difficulty,
        questData.reward_type,
        2, // medium difficulty multiplier (2x)
        25, // medium difficulty experience (25)
        undefined
      );
    });
  });

  describe('completeQuest', () => {
    it('should complete quest successfully when author marks it complete', async () => {
      vi.mocked(db.getQuestById).mockResolvedValue(mockQuest);
      vi.mocked(db.completeQuest).mockResolvedValue({
        ...mockQuest,
        status: 'completed',
        completed_at: new Date()
      });
      vi.mocked(db.addTransaction).mockResolvedValue({
        id: 'transaction-1',
        user_id: 'user-2',
        type: 'credit',
        wish_type: 'green',
        amount: 1,
        reason: 'Quest completion reward: Test Quest',
        created_at: new Date(),
        reference_id: 'quest-1',
        transaction_category: 'quest'
      });

      const result = await questEngine.completeQuest('quest-1', 'user-1');

      expect(result.quest.status).toBe('completed');
      expect(result.rewardsGranted).toBe(true);
      expect(db.completeQuest).toHaveBeenCalledWith('quest-1', 'user-1');
      expect(db.addTransaction).toHaveBeenCalledWith(
        'user-2', // assignee gets the reward
        'credit',
        'green',
        1,
        'Quest completion reward: Test Quest',
        'quest-1'
      );
    });

    it('should reject completion by non-author', async () => {
      vi.mocked(db.getQuestById).mockResolvedValue(mockQuest);

      await expect(questEngine.completeQuest('quest-1', 'user-2'))
        .rejects.toThrow('Only the quest author can mark the quest as completed');
    });

    it('should reject completion of non-active quest', async () => {
      vi.mocked(db.getQuestById).mockResolvedValue({
        ...mockQuest,
        status: 'completed'
      });

      await expect(questEngine.completeQuest('quest-1', 'user-1'))
        .rejects.toThrow('Cannot complete quest with status: completed');
    });

    it('should reject completion of non-existent quest', async () => {
      vi.mocked(db.getQuestById).mockResolvedValue(null);

      await expect(questEngine.completeQuest('quest-1', 'user-1'))
        .rejects.toThrow('Quest not found');
    });
  });

  describe('cancelQuest', () => {
    it('should cancel quest successfully when author cancels it', async () => {
      vi.mocked(db.getQuestById).mockResolvedValue(mockQuest);
      vi.mocked(db.cancelQuest).mockResolvedValue({
        ...mockQuest,
        status: 'cancelled'
      });

      const result = await questEngine.cancelQuest('quest-1', 'user-1');

      expect(result.status).toBe('cancelled');
      expect(db.cancelQuest).toHaveBeenCalledWith('quest-1', 'user-1');
    });

    it('should reject cancellation by non-author', async () => {
      vi.mocked(db.getQuestById).mockResolvedValue(mockQuest);

      await expect(questEngine.cancelQuest('quest-1', 'user-2'))
        .rejects.toThrow('Only the quest author can cancel the quest');
    });

    it('should reject cancellation of completed quest', async () => {
      vi.mocked(db.getQuestById).mockResolvedValue({
        ...mockQuest,
        status: 'completed'
      });

      await expect(questEngine.cancelQuest('quest-1', 'user-1'))
        .rejects.toThrow('Cannot cancel quest with status: completed');
    });
  });

  describe('processExpiredQuests', () => {
    it('should process expired quests and send notifications', async () => {
      const expiredQuests = [mockQuest, { ...mockQuest, id: 'quest-2' }];
      vi.mocked(db.getExpiredQuests).mockResolvedValue(expiredQuests);
      vi.mocked(db.markQuestsAsExpired).mockResolvedValue(2);

      const result = await questEngine.processExpiredQuests();

      expect(result.expiredCount).toBe(2);
      expect(result.notificationsSent).toBe(2);
      expect(db.getExpiredQuests).toHaveBeenCalled();
      expect(db.markQuestsAsExpired).toHaveBeenCalled();
    });

    it('should handle no expired quests', async () => {
      vi.mocked(db.getExpiredQuests).mockResolvedValue([]);

      const result = await questEngine.processExpiredQuests();

      expect(result.expiredCount).toBe(0);
      expect(result.notificationsSent).toBe(0);
      expect(db.markQuestsAsExpired).not.toHaveBeenCalled();
    });
  });

  describe('updateQuest', () => {
    it('should update quest successfully when author updates it', async () => {
      const updates = {
        title: 'Updated Title',
        description: 'Updated description'
      };

      vi.mocked(db.getQuestById).mockResolvedValue(mockQuest);
      vi.mocked(db.updateQuest).mockResolvedValue({
        ...mockQuest,
        ...updates
      });

      const result = await questEngine.updateQuest('quest-1', 'user-1', updates);

      expect(result.title).toBe('Updated Title');
      expect(db.updateQuest).toHaveBeenCalledWith('quest-1', updates);
    });

    it('should reject update by non-author', async () => {
      vi.mocked(db.getQuestById).mockResolvedValue(mockQuest);

      await expect(questEngine.updateQuest('quest-1', 'user-2', { title: 'New Title' }))
        .rejects.toThrow('Only the quest author can update the quest');
    });

    it('should reject update of completed quest', async () => {
      vi.mocked(db.getQuestById).mockResolvedValue({
        ...mockQuest,
        status: 'completed'
      });

      await expect(questEngine.updateQuest('quest-1', 'user-1', { title: 'New Title' }))
        .rejects.toThrow('Cannot update quest with status: completed');
    });
  });

  describe('getUserQuests', () => {
    it('should return user quests with filtering', async () => {
      const userQuests = [
        { ...mockQuest, author_id: 'user-1', assignee_id: 'user-2' }, 
        { ...mockQuest, id: 'quest-2', author_id: 'user-2', assignee_id: 'user-1' }
      ];
      vi.mocked(db.getQuestsByUser).mockResolvedValue(userQuests);

      const result = await questEngine.getUserQuests('user-1', { role: 'author' });

      expect(result).toHaveLength(1);
      expect(result[0].author_id).toBe('user-1');
    });

    it('should apply limit when specified', async () => {
      const userQuests = Array(5).fill(mockQuest);
      vi.mocked(db.getQuestsByUser).mockResolvedValue(userQuests);

      const result = await questEngine.getUserQuests('user-1', { limit: 3 });

      expect(result).toHaveLength(3);
    });
  });

  describe('getQuestStats', () => {
    it('should calculate quest statistics correctly', async () => {
      const userQuests = [
        { ...mockQuest, author_id: 'user-1', assignee_id: 'user-2', status: 'active' },
        { ...mockQuest, id: 'quest-2', author_id: 'user-2', assignee_id: 'user-1', status: 'completed' },
        { ...mockQuest, id: 'quest-3', author_id: 'user-1', assignee_id: 'user-2', status: 'expired' }
      ];
      vi.mocked(db.getQuestsByUser).mockResolvedValue(userQuests);

      const stats = await questEngine.getQuestStats('user-1');

      expect(stats.created).toBe(2); // user-1 created 2 quests
      expect(stats.assigned).toBe(1); // user-1 was assigned 1 quest
      expect(stats.completed).toBe(1); // 1 quest completed overall
      expect(stats.active).toBe(1); // 1 quest active overall
      expect(stats.expired).toBe(1); // 1 quest expired overall
      expect(stats.completionRate).toBe(100); // 1/1 assigned quests completed = 100%
    });
  });

  describe('validateQuestCreation', () => {
    it('should validate quest creation with warnings for far future due date', async () => {
      const questData = {
        title: 'Valid Title',
        description: 'Valid description',
        assignee_id: 'user-2',
        due_date: new Date('2025-01-15T10:00:00Z') // 1 year in future
      };

      vi.mocked(db.getQuestsByUser).mockResolvedValue([]);

      const validation = await questEngine.validateQuestCreation('user-1', questData);

      expect(validation.isValid).toBe(true);
      expect(validation.warnings).toContain('Quest due date is more than 1 year in the future');
    });

    it('should reject quest with due date too soon', async () => {
      const questData = {
        title: 'Valid Title',
        description: 'Valid description',
        assignee_id: 'user-2',
        due_date: new Date('2024-01-15T12:00:00Z') // Only 2 hours from now
      };

      vi.mocked(db.getQuestsByUser).mockResolvedValue([]);

      const validation = await questEngine.validateQuestCreation('user-1', questData);

      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('Quest due date must be at least 1 day in the future');
    });
  });
});