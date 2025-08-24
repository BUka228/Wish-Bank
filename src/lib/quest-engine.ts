import { 
  Quest, 
  CreateQuestRequest, 
  QuestValidation, 
  User, 
  Rank,
  NotificationData 
} from '../types/quest-economy';
import { 
  createQuest as dbCreateQuest,
  getQuestById,
  updateQuest,
  completeQuest as dbCompleteQuest,
  cancelQuest as dbCancelQuest,
  getQuestsByUser,
  getExpiredQuests,
  markQuestsAsExpired,
  getUserByTelegramId,
  addTransaction
} from './db';

/**
 * Quest Engine - Manages quest lifecycle, validation, and rewards
 * Handles quest creation, completion, expiration, and permission checks
 */
export class QuestEngine {
  
  /**
   * Creates a new quest with validation and reward calculation
   */
  async createQuest(
    authorId: string, 
    questData: CreateQuestRequest
  ): Promise<{ quest: Quest; validation: QuestValidation }> {
    // Validate quest creation permissions
    const validation = await this.validateQuestCreation(authorId, questData);
    
    if (!validation.isValid) {
      throw new Error(`Quest creation failed: ${validation.errors.join(', ')}`);
    }

    // Calculate rewards based on difficulty
    const { rewardAmount, experienceReward } = this.calculateQuestRewards(
      questData.difficulty || 'easy',
      questData.reward_type || 'green'
    );

    // Create the quest
    const quest = await dbCreateQuest(
      questData.title,
      questData.description,
      authorId,
      questData.assignee_id,
      questData.category || 'general',
      questData.difficulty || 'easy',
      questData.reward_type || 'green',
      questData.reward_amount || rewardAmount,
      questData.experience_reward || experienceReward,
      questData.due_date
    );

    // Send notification to assignee
    await this.sendQuestNotification(quest, 'quest_assigned');

    return { quest, validation };
  }

  /**
   * Validates quest creation permissions and constraints
   */
  async validateQuestCreation(
    authorId: string, 
    questData: CreateQuestRequest
  ): Promise<QuestValidation> {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Basic validation
    if (!questData.title || questData.title.trim().length < 3) {
      errors.push('Quest title must be at least 3 characters long');
    }
    
    if (!questData.description || questData.description.trim().length < 10) {
      errors.push('Quest description must be at least 10 characters long');
    }

    if (!questData.assignee_id) {
      errors.push('Quest must have an assignee');
    }

    // Check if assignee exists and is different from author
    if (questData.assignee_id === authorId) {
      errors.push('Cannot assign quest to yourself');
    }

    // Check active quest limits
    const activeQuests = await getQuestsByUser(authorId, 'active');
    const maxActiveQuests = 10; // Base limit, could be enhanced by rank
    
    if (activeQuests.length >= maxActiveQuests) {
      errors.push(`Maximum active quests limit reached (${maxActiveQuests})`);
    }

    // Check difficulty permissions (would need rank system integration)
    const hasPermissionForDifficulty = await this.checkDifficultyPermission(
      authorId, 
      questData.difficulty || 'easy'
    );

    if (!hasPermissionForDifficulty) {
      errors.push(`Insufficient rank to create ${questData.difficulty} difficulty quests`);
    }

    // Validate due date
    if (questData.due_date) {
      const now = new Date();
      const minDate = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 1 day from now
      const maxDate = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000); // 1 year from now

      if (questData.due_date < minDate) {
        errors.push('Quest due date must be at least 1 day in the future');
      }

      if (questData.due_date > maxDate) {
        warnings.push('Quest due date is more than 1 year in the future');
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      canCreateQuest: errors.length === 0,
      maxActiveQuestsReached: activeQuests.length >= maxActiveQuests,
      hasPermissionForDifficulty
    };
  }

  /**
   * Completes a quest with permission checks and reward distribution
   */
  async completeQuest(
    questId: string, 
    completedBy: string
  ): Promise<{ quest: Quest; rewardsGranted: boolean }> {
    // Get the quest
    const quest = await getQuestById(questId);
    if (!quest) {
      throw new Error('Quest not found');
    }

    // Verify permissions - only the quest author can mark it as complete
    if (quest.author_id !== completedBy) {
      throw new Error('Only the quest author can mark the quest as completed');
    }

    // Verify quest is in active state
    if (quest.status !== 'active') {
      throw new Error(`Cannot complete quest with status: ${quest.status}`);
    }

    // Complete the quest in database
    const completedQuest = await dbCompleteQuest(questId, completedBy);

    // Grant rewards to the assignee
    const rewardsGranted = await this.grantQuestRewards(completedQuest);

    // Send completion notifications
    await this.sendQuestNotification(completedQuest, 'quest_completed');

    return { quest: completedQuest, rewardsGranted };
  }

  /**
   * Cancels a quest with permission checks
   */
  async cancelQuest(questId: string, userId: string): Promise<Quest> {
    const quest = await getQuestById(questId);
    if (!quest) {
      throw new Error('Quest not found');
    }

    // Only author can cancel the quest
    if (quest.author_id !== userId) {
      throw new Error('Only the quest author can cancel the quest');
    }

    // Cannot cancel completed or expired quests
    if (quest.status === 'completed' || quest.status === 'expired') {
      throw new Error(`Cannot cancel quest with status: ${quest.status}`);
    }

    return await dbCancelQuest(questId, userId);
  }

  /**
   * Handles automatic quest expiration
   */
  async processExpiredQuests(): Promise<{ expiredCount: number; notificationsSent: number }> {
    const expiredQuests = await getExpiredQuests();
    
    if (expiredQuests.length === 0) {
      return { expiredCount: 0, notificationsSent: 0 };
    }

    // Mark quests as expired
    const expiredCount = await markQuestsAsExpired();

    // Send expiration notifications
    let notificationsSent = 0;
    for (const quest of expiredQuests) {
      try {
        await this.sendQuestNotification(quest, 'quest_expired');
        notificationsSent++;
      } catch (error) {
        console.error(`Failed to send expiration notification for quest ${quest.id}:`, error);
      }
    }

    return { expiredCount, notificationsSent };
  }

  /**
   * Updates quest details with validation
   */
  async updateQuest(
    questId: string,
    userId: string,
    updates: Partial<CreateQuestRequest>
  ): Promise<Quest> {
    const quest = await getQuestById(questId);
    if (!quest) {
      throw new Error('Quest not found');
    }

    // Only author can update the quest
    if (quest.author_id !== userId) {
      throw new Error('Only the quest author can update the quest');
    }

    // Cannot update completed or expired quests
    if (quest.status === 'completed' || quest.status === 'expired') {
      throw new Error(`Cannot update quest with status: ${quest.status}`);
    }

    // Validate updates if difficulty is being changed
    if (updates.difficulty && updates.difficulty !== quest.difficulty) {
      const hasPermission = await this.checkDifficultyPermission(userId, updates.difficulty);
      if (!hasPermission) {
        throw new Error(`Insufficient rank to set difficulty to ${updates.difficulty}`);
      }
    }

    // Recalculate rewards if difficulty or reward type changed
    if (updates.difficulty || updates.reward_type) {
      const { rewardAmount, experienceReward } = this.calculateQuestRewards(
        updates.difficulty || quest.difficulty,
        updates.reward_type || quest.reward_type
      );
      
      if (!updates.reward_amount) {
        updates.reward_amount = rewardAmount;
      }
      if (!updates.experience_reward) {
        updates.experience_reward = experienceReward;
      }
    }

    return await updateQuest(questId, updates);
  }

  /**
   * Calculates quest rewards based on difficulty and type
   */
  private calculateQuestRewards(
    difficulty: 'easy' | 'medium' | 'hard' | 'epic',
    rewardType: string
  ): { rewardAmount: number; experienceReward: number } {
    const difficultyMultipliers = {
      easy: { reward: 1, experience: 10 },
      medium: { reward: 2, experience: 25 },
      hard: { reward: 3, experience: 50 },
      epic: { reward: 5, experience: 100 }
    };

    const multiplier = difficultyMultipliers[difficulty];
    
    // Base reward amount varies by type
    const baseRewards = {
      green: 1,
      blue: 1,
      red: 1
    };

    const baseReward = baseRewards[rewardType as keyof typeof baseRewards] || 1;

    return {
      rewardAmount: baseReward * multiplier.reward,
      experienceReward: multiplier.experience
    };
  }

  /**
   * Grants rewards to quest assignee upon completion
   */
  private async grantQuestRewards(quest: Quest): Promise<boolean> {
    try {
      // Grant wish balance reward
      await addTransaction(
        quest.assignee_id,
        'credit',
        quest.reward_type as 'green' | 'blue' | 'red',
        quest.reward_amount,
        `Quest completion reward: ${quest.title}`,
        quest.id
      );

      // Grant experience points (would integrate with rank system)
      if (quest.experience_reward > 0) {
        // This would be handled by the RankCalculator in a full implementation
        console.log(`Granting ${quest.experience_reward} experience to user ${quest.assignee_id}`);
      }

      return true;
    } catch (error) {
      console.error('Failed to grant quest rewards:', error);
      return false;
    }
  }

  /**
   * Checks if user has permission to create quests of given difficulty
   */
  private async checkDifficultyPermission(
    userId: string,
    difficulty: 'easy' | 'medium' | 'hard' | 'epic'
  ): Promise<boolean> {
    // For now, allow all difficulties
    // In full implementation, this would check user rank and privileges
    const difficultyRequirements = {
      easy: 'Рядовой',
      medium: 'Ефрейтор', 
      hard: 'Младший сержант',
      epic: 'Сержант'
    };

    // TODO: Integrate with rank system to check actual user rank
    // For now, return true for easy/medium, false for hard/epic
    return difficulty === 'easy' || difficulty === 'medium';
  }

  /**
   * Sends quest-related notifications
   */
  private async sendQuestNotification(
    quest: Quest,
    type: 'quest_assigned' | 'quest_completed' | 'quest_expired'
  ): Promise<void> {
    const notificationData: NotificationData = {
      type,
      title: this.getNotificationTitle(type),
      message: this.getNotificationMessage(type, quest),
      recipient_id: type === 'quest_assigned' ? quest.assignee_id : quest.author_id,
      data: {
        sender_id: type === 'quest_assigned' ? quest.author_id : quest.assignee_id,
        reference_id: quest.id,
        quest_title: quest.title,
        quest_difficulty: quest.difficulty,
        reward_amount: quest.reward_amount,
        reward_type: quest.reward_type
      }
    };

    // TODO: Integrate with notification service
    console.log('Quest notification:', notificationData);
  }

  /**
   * Gets notification title based on type
   */
  private getNotificationTitle(type: string): string {
    const titles = {
      quest_assigned: 'Новый квест назначен',
      quest_completed: 'Квест выполнен',
      quest_expired: 'Квест просрочен'
    };
    return titles[type as keyof typeof titles] || 'Уведомление о квесте';
  }

  /**
   * Gets notification message based on type and quest
   */
  private getNotificationMessage(
    type: 'quest_assigned' | 'quest_completed' | 'quest_expired',
    quest: Quest
  ): string {
    switch (type) {
      case 'quest_assigned':
        return `Вам назначен новый квест: "${quest.title}". Награда: ${quest.reward_amount} ${quest.reward_type}`;
      case 'quest_completed':
        return `Квест "${quest.title}" был отмечен как выполненный. Награда начислена!`;
      case 'quest_expired':
        return `Квест "${quest.title}" просрочен и был автоматически закрыт.`;
      default:
        return `Обновление по квесту: ${quest.title}`;
    }
  }

  /**
   * Gets quests for a user with optional filtering
   */
  async getUserQuests(
    userId: string,
    options: {
      status?: 'active' | 'completed' | 'expired' | 'cancelled';
      role?: 'author' | 'assignee' | 'both';
      limit?: number;
    } = {}
  ): Promise<Quest[]> {
    const quests = await getQuestsByUser(userId, options.status);
    
    // Filter by role if specified
    if (options.role === 'author') {
      return quests.filter(q => q.author_id === userId);
    } else if (options.role === 'assignee') {
      return quests.filter(q => q.assignee_id === userId);
    }
    
    // Apply limit if specified
    if (options.limit) {
      return quests.slice(0, options.limit);
    }
    
    return quests;
  }

  /**
   * Gets quest statistics for a user
   */
  async getQuestStats(userId: string): Promise<{
    created: number;
    assigned: number;
    completed: number;
    active: number;
    expired: number;
    completionRate: number;
  }> {
    const allQuests = await getQuestsByUser(userId);
    
    const created = allQuests.filter(q => q.author_id === userId).length;
    const assigned = allQuests.filter(q => q.assignee_id === userId).length;
    const completed = allQuests.filter(q => q.status === 'completed').length;
    const active = allQuests.filter(q => q.status === 'active').length;
    const expired = allQuests.filter(q => q.status === 'expired').length;
    
    const completionRate = assigned > 0 ? (completed / assigned) * 100 : 0;
    
    return {
      created,
      assigned,
      completed,
      active,
      expired,
      completionRate: Math.round(completionRate * 100) / 100
    };
  }
}

// Export singleton instance
export const questEngine = new QuestEngine();