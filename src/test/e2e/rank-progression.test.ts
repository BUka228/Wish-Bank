import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { RankCalculator } from '../../lib/rank-calculator';

describe('Rank Progression E2E Tests', () => {
  let rankCalculator: RankCalculator;

  beforeEach(() => {
    rankCalculator = new RankCalculator();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Complete Rank Progression Workflow', () => {
    it('should handle full rank progression from Рядовой to Ефрейтор', async () => {
      // Step 1: New user starts at Рядовой with 0 experience
      let currentExperience = 0;
      let currentRank = rankCalculator.getCurrentRank(currentExperience);

      expect(currentRank.name).toBe('Рядовой');
      expect(currentRank.min_experience).toBe(0);
      expect(currentRank.special_privileges.maxActiveQuests).toBe(2);
      expect(currentRank.special_privileges.canCreateQuests).toBe(false);

      // Step 2: User completes daily activities and gains experience
      const dailyLoginExp = rankCalculator.calculateExperience('dailyLogin');
      const questCompleteExp = rankCalculator.calculateExperience('questComplete');
      const eventCompleteExp = rankCalculator.calculateExperience('eventComplete');

      currentExperience += dailyLoginExp; // +2
      currentExperience += questCompleteExp; // +20
      currentExperience += eventCompleteExp; // +15
      // Total: 37 experience

      expect(currentExperience).toBe(37);

      // Still at Рядовой rank
      currentRank = rankCalculator.getCurrentRank(currentExperience);
      expect(currentRank.name).toBe('Рядовой');

      // Check progress towards next rank
      let progress = rankCalculator.getRankProgress(currentExperience);
      expect(progress.currentRank.name).toBe('Рядовой');
      expect(progress.nextRank?.name).toBe('Ефрейтор');
      expect(progress.progressPercent).toBe(37); // 37/100 * 100
      expect(progress.experienceToNext).toBe(63); // 100 - 37

      // Step 3: User continues activities over several days
      for (let day = 0; day < 10; day++) {
        currentExperience += dailyLoginExp; // +2 per day
        currentExperience += questCompleteExp; // +20 per day (assuming 1 quest per day)
      }
      // Additional: 10 * (2 + 20) = 220
      // Total: 37 + 220 = 257

      expect(currentExperience).toBe(257);

      // Step 4: Check for promotion
      const oldRank = rankCalculator.getCurrentRank(37); // Previous experience
      const newRank = rankCalculator.getCurrentRank(currentExperience);

      const promotionCheck = rankCalculator.checkForPromotion(37, currentExperience);

      expect(promotionCheck.promoted).toBe(true);
      expect(promotionCheck.oldRank.name).toBe('Рядовой');
      expect(promotionCheck.newRank.name).toBe('Ефрейтор');
      expect(promotionCheck.notification).toBeDefined();
      expect(promotionCheck.notification?.title).toBe('Повышение в звании!');
      expect(promotionCheck.notification?.message).toContain('Ефрейтор');

      // Step 5: Verify new rank privileges
      expect(newRank.name).toBe('Ефрейтор');
      expect(newRank.special_privileges.maxActiveQuests).toBe(3);
      expect(newRank.special_privileges.canCreateQuests).toBe(true);
      expect(newRank.special_privileges.economyMultiplier).toBe(1.1);
      expect(newRank.daily_quota_bonus).toBe(1);

      // Step 6: Check progress towards next rank (Младший сержант)
      progress = rankCalculator.getRankProgress(currentExperience);
      expect(progress.currentRank.name).toBe('Ефрейтор');
      expect(progress.nextRank?.name).toBe('Младший сержант');
      expect(progress.progressPercent).toBe(78.5); // (257-100)/(300-100) * 100 = 78.5%
      expect(progress.experienceToNext).toBe(43); // 300 - 257
    });

    it('should handle mentor bonus calculations for higher ranks', async () => {
      // User at Сержант rank (has mentor_bonus ability)
      const sergeantExperience = 600;
      const sergeantRank = rankCalculator.getCurrentRank(sergeantExperience);

      expect(sergeantRank.name).toBe('Сержант');
      expect(sergeantRank.special_privileges.specialAbilities).toContain('mentor_bonus');

      // Calculate mentor bonus for helping another user
      const baseExperience = 20; // Base quest completion experience
      const mentorBonus = rankCalculator.calculateMentorBonus(baseExperience, sergeantRank);

      expect(mentorBonus).toBe(10); // 50% of 20

      // User at Рядовой rank (no mentor_bonus ability)
      const rookieRank = rankCalculator.getCurrentRank(0);
      const noBonus = rankCalculator.calculateMentorBonus(baseExperience, rookieRank);

      expect(noBonus).toBe(0);
    });

    it('should handle maximum rank progression', async () => {
      // User progresses to maximum rank
      const maxExperience = 2000;
      const maxRank = rankCalculator.getCurrentRank(maxExperience);

      expect(maxRank.name).toBe('Старшина');
      expect(maxRank.special_privileges.maxActiveQuests).toBe(8);
      expect(maxRank.special_privileges.economyMultiplier).toBe(1.5);
      expect(maxRank.special_privileges.specialAbilities).toContain('leadership');

      // Check progress at max rank
      const progress = rankCalculator.getRankProgress(maxExperience);
      expect(progress.currentRank.name).toBe('Старшина');
      expect(progress.nextRank).toBeNull();
      expect(progress.progressPercent).toBe(100);
      expect(progress.experienceToNext).toBe(0);

      // No promotion possible from max rank
      const promotionCheck = rankCalculator.checkForPromotion(1500, maxExperience);
      expect(promotionCheck.promoted).toBe(false); // Already at max
    });
  });

  describe('Privilege Validation Workflow', () => {
    it('should validate rank-based privileges correctly', async () => {
      const ranks = rankCalculator.getAllRanks();

      // Test privilege progression across all ranks
      for (let i = 0; i < ranks.length; i++) {
        const rank = ranks[i];

        // Verify privilege values increase or stay same with higher ranks
        if (i > 0) {
          const previousRank = ranks[i - 1];
          expect(rank.special_privileges.maxActiveQuests).toBeGreaterThanOrEqual(
            previousRank.special_privileges.maxActiveQuests
          );
          expect(rank.special_privileges.economyMultiplier).toBeGreaterThanOrEqual(
            previousRank.special_privileges.economyMultiplier
          );
        }

        // Test privilege checking methods
        expect(rankCalculator.hasPrivilege(rank, 'canCreateQuests')).toBe(
          rank.special_privileges.canCreateQuests
        );
        expect(rankCalculator.getMaxPrivilegeValue(rank, 'maxActiveQuests')).toBe(
          rank.special_privileges.maxActiveQuests
        );
        expect(rankCalculator.getEconomyMultiplier(rank)).toBe(
          rank.special_privileges.economyMultiplier
        );
      }
    });
  });

  describe('Experience Calculation Workflow', () => {
    it('should calculate experience correctly for different activities', async () => {
      const activities = [
        { action: 'questComplete', expectedBase: 20 },
        { action: 'questCreate', expectedBase: 10 },
        { action: 'eventComplete', expectedBase: 15 },
        { action: 'wishFulfill', expectedBase: 25 },
        { action: 'sharedWishApprove', expectedBase: 5 },
        { action: 'dailyLogin', expectedBase: 2 },
        { action: 'helpPartner', expectedBase: 10 },
        { action: 'mentorAction', expectedBase: 15 }
      ] as const;

      for (const activity of activities) {
        const baseExp = rankCalculator.calculateExperience(activity.action);
        expect(baseExp).toBe(activity.expectedBase);

        // Test with multiplier
        const multipliedExp = rankCalculator.calculateExperience(activity.action, 1.5);
        expect(multipliedExp).toBe(Math.floor(activity.expectedBase * 1.5));
      }
    });
  });
});