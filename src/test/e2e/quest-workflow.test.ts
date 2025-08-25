import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { QuestEngine } from '../../lib/quest-engine';
import { RankCalculator } from '../../lib/rank-calculator';
import * as db from '../../lib/db';

// Mock the database module
vi.mock('../../lib/db');

describe('Quest Workflow E2E Tests', () => {
  let questEngine: QuestEngine;
  let rankCalculator: RankCalculator;

  const mockUser1 = {
    id: 'user-1',
    telegram_id: '123456789',
    username: 'alice',
    first_name: 'Alice',
    last_name: 'Smith',
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

  const mockUser2 = {
    id: 'user-2',
    telegram_id: '987654321',
    username: 'bob',
    first_name: 'Bob',
    last_name: 'Johnson',
    green_balance: 3,
    blue_balance: 5,
    red_balance: 4,
    created_at: new Date('2024-01-01T00:00:00Z'),
    rank: 'Ефрейтор',
    experience_points: 120,
    daily_quota_used: 1,
    weekly_quota_used: 5,
    monthly_quota_used: 10,
    last_quota_reset: new Date('2024-01-15T00:00:00Z')
  };

  beforeEach(() => {
    questEngine = new QuestEngine();
    rankCalculator = new RankCalculator();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Complete Quest Creation and Completion Workflow', () => {
    it('should handle full quest lifecycle from creation to completion', async () => {
      // Step 1: User1 creates a quest for User2
      const questData = {
        title: 'Clean the Kitchen',
        description: 'Please clean the kitchen thoroughly including dishes and counters',
        assignee_id: 'user-2',
        category: 'home',
        difficulty: 'medium' as const,
        reward_type: 'green',
        due_date: new Date('2024-01-20T10:00:00Z')
      };

      const createdQuest = {
        id: 'quest-1',
        title: questData.title,
        description: questData.description,
        author_id: 'user-1',
        assignee_id: 'user-2',
        category: 'home',
        difficulty: 'medium',
        reward_type: 'green',
        reward_amount: 2,
        experience_reward: 25,
        status: 'active' as const,
        due_date: questData.due_date,
        created_at: new Date('2024-01-15T10:00:00Z'),
        completed_at: null,
        metadata: {}
      };

      // Mock database calls for quest creation
      vi.mocked(db.getQuestsByUser).mockResolvedValue([]);
      vi.mocked(db.createQuest).mockResolvedValue(createdQuest);

      const createResult = await questEngine.createQuest('user-1', questData);

      expect(createResult.quest).toEqual(createdQuest);
      expect(createResult.validation.isValid).toBe(true);
      expect(db.createQuest).toHaveBeenCalledWith(
        questData.title,
        questData.description,
        'user-1',
        'user-2',
        'home',
        'medium',
        'green',
        2, // calculated reward amount
        25, // calculated experience reward
        questData.due_date
      );

      // Step 2: User2 views their assigned quests
      vi.mocked(db.getQuestsByUser).mockResolvedValue([createdQuest]);

      const assignedQuests = await questEngine.getUserQuests('user-2', { role: 'assignee' });

      expect(assignedQuests).toHaveLength(1);
      expect(assignedQuests[0].assignee_id).toBe('user-2');
      expect(assignedQuests[0].status).toBe('active');

      // Step 3: User2 completes the quest (User1 marks it as complete)
      const completedQuest = {
        ...createdQuest,
        status: 'completed' as const,
        completed_at: new Date('2024-01-16T10:00:00Z')
      };

      vi.mocked(db.getQuestById).mockResolvedValue(createdQuest);
      vi.mocked(db.completeQuest).mockResolvedValue(completedQuest);
      vi.mocked(db.addTransaction).mockResolvedValue({
        id: 'transaction-1',
        user_id: 'user-2',
        type: 'credit',
        wish_type: 'green',
        amount: 2,
        reason: 'Quest completion reward: Clean the Kitchen',
        created_at: new Date('2024-01-16T10:00:00Z'),
        reference_id: 'quest-1',
        transaction_category: 'quest'
      });

      const completionResult = await questEngine.completeQuest('quest-1', 'user-1');

      expect(completionResult.quest.status).toBe('completed');
      expect(completionResult.rewardsGranted).toBe(true);
      expect(db.addTransaction).toHaveBeenCalledWith(
        'user-2', // assignee gets the reward
        'credit',
        'green',
        2,
        'Quest completion reward: Clean the Kitchen',
        'quest-1'
      );

      // Step 4: Verify quest statistics are updated
      const finalQuests = [completedQuest];
      vi.mocked(db.getQuestsByUser).mockResolvedValue(finalQuests);

      const stats = await questEngine.getQuestStats('user-2');

      expect(stats.assigned).toBe(1);
      expect(stats.completed).toBe(1);
      expect(stats.completionRate).toBe(100);
    });

    it('should handle quest creation validation failures gracefully', async () => {
      // Attempt to create quest with invalid data
      const invalidQuestData = {
        title: 'ab', // Too short
        description: 'short', // Too short
        assignee_id: 'user-1' // Self-assignment
      };

      vi.mocked(db.getQuestsByUser).mockResolvedValue([]);

      await expect(questEngine.createQuest('user-1', invalidQuestData))
        .rejects.toThrow('Quest creation failed');

      // Verify no quest was created
      expect(db.createQuest).not.toHaveBeenCalled();
    });

    it('should handle quest completion permission errors', async () => {
      const activeQuest = {
        id: 'quest-1',
        title: 'Test Quest',
        description: 'Test description',
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

      vi.mocked(db.getQuestById).mockResolvedValue(activeQuest);

      // User2 (assignee) tries to complete their own quest - should fail
      await expect(questEngine.completeQuest('quest-1', 'user-2'))
        .rejects.toThrow('Only the quest author can mark the quest as completed');

      // Verify no completion was recorded
      expect(db.completeQuest).not.toHaveBeenCalled();
      expect(db.addTransaction).not.toHaveBeenCalled();
    });
  });

  describe('Quest Expiration Workflow', () => {
    it('should handle automatic quest expiration', async () => {
      const expiredQuest = {
        id: 'quest-expired',
        title: 'Expired Quest',
        description: 'This quest has expired',
        author_id: 'user-1',
        assignee_id: 'user-2',
        category: 'general',
        difficulty: 'easy' as const,
        reward_type: 'green',
        reward_amount: 1,
        experience_reward: 10,
        status: 'active' as const,
        due_date: new Date('2024-01-14T10:00:00Z'), // Past due
        created_at: new Date('2024-01-13T10:00:00Z'),
        completed_at: null,
        metadata: {}
      };

      // Mock expired quest detection
      vi.mocked(db.getExpiredQuests).mockResolvedValue([expiredQuest]);
      vi.mocked(db.markQuestsAsExpired).mockResolvedValue(1);

      const result = await questEngine.processExpiredQuests();

      expect(result.expiredCount).toBe(1);
      expect(result.notificationsSent).toBe(1);
      expect(db.getExpiredQuests).toHaveBeenCalled();
      expect(db.markQuestsAsExpired).toHaveBeenCalled();
    });
  });

  describe('Quest Update Workflow', () => {
    it('should allow quest author to update quest details', async () => {
      const originalQuest = {
        id: 'quest-update',
        title: 'Original Title',
        description: 'Original description',
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

      const updates = {
        title: 'Updated Title',
        description: 'Updated description'
      };

      const updatedQuest = { ...originalQuest, ...updates };

      vi.mocked(db.getQuestById).mockResolvedValue(originalQuest);
      vi.mocked(db.updateQuest).mockResolvedValue(updatedQuest);

      const result = await questEngine.updateQuest('quest-update', 'user-1', updates);

      expect(result.title).toBe('Updated Title');
      expect(result.description).toBe('Updated description');
      expect(db.updateQuest).toHaveBeenCalledWith('quest-update', updates);
    });

    it('should prevent non-author from updating quest', async () => {
      const quest = {
        id: 'quest-update',
        title: 'Test Quest',
        description: 'Test description',
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

      vi.mocked(db.getQuestById).mockResolvedValue(quest);

      // User2 (assignee) tries to update quest - should fail
      await expect(questEngine.updateQuest('quest-update', 'user-2', { title: 'Hacked Title' }))
        .rejects.toThrow('Only the quest author can update the quest');

      expect(db.updateQuest).not.toHaveBeenCalled();
    });
  });
});