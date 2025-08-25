import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { QuestEngine } from '../../lib/quest-engine';
import { economyEngine } from '../../lib/economy-engine';
import * as db from '../../lib/db';
import { User, Quest } from '../../types/quest-economy';

// Mock dependencies
vi.mock('../../lib/db');
vi.mock('../../lib/economy-engine');

describe('Quest Workflow E2E Tests', () => {
  let questEngine: QuestEngine;

  const mockUser1: User = {
    id: 'user-1',
    telegram_id: '123456789',
    name: 'Alice',
    mana: 200,
    mana_spent: 10,
    rank: 'Рядовой',
    experience_points: 50,
    daily_quota_used: 2,
    weekly_quota_used: 8,
    monthly_quota_used: 15,
    last_quota_reset: new Date('2024-01-15T00:00:00Z'),
    created_at: new Date(),
    updated_at: new Date(),
  };

  beforeEach(() => {
    questEngine = new QuestEngine();
    vi.clearAllMocks();
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
        due_date: new Date('2024-01-20T10:00:00Z'),
      };

      const createdQuest: Quest = {
        id: 'quest-1',
        author_id: 'user-1',
        status: 'active',
        mana_reward: 30, // Calculated for medium
        experience_reward: 25, // Calculated for medium
        ...questData,
        created_at: new Date('2024-01-15T10:00:00Z'),
        completed_at: null,
        metadata: {},
      };

      vi.mocked(db.getQuestsByUser).mockResolvedValue([]);
      vi.mocked(db.createQuest).mockResolvedValue(createdQuest);

      const createResult = await questEngine.createQuest('user-1', questData);

      expect(createResult.quest.id).toBe('quest-1');
      expect(db.createQuest).toHaveBeenCalledWith(expect.objectContaining({
        title: 'Clean the Kitchen',
        difficulty: 'medium',
      }));

      // Step 2: User1 completes the quest
      const completedQuest = { ...createdQuest, status: 'completed' as const };
      vi.mocked(db.getQuestById).mockResolvedValue(createdQuest);
      vi.mocked(db.completeQuest).mockResolvedValue(completedQuest);
      vi.mocked(economyEngine.grantMana).mockResolvedValue();

      const completionResult = await questEngine.completeQuest('quest-1', 'user-1');

      expect(completionResult.quest.status).toBe('completed');
      expect(completionResult.rewardsGranted).toBe(true);
      expect(economyEngine.grantMana).toHaveBeenCalledWith(
        'user-2', // assignee gets the reward
        30,       // mana_reward
        'Quest completion: Clean the Kitchen',
        'quest_reward',
        'quest-1'
      );
    });
  });
});
