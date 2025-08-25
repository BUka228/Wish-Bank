import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { RankCalculator } from '../lib/rank-calculator';

describe('RankCalculator', () => {
  let rankCalculator: RankCalculator;

  beforeEach(() => {
    rankCalculator = new RankCalculator();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('calculateExperience', () => {
    it('should calculate base experience for different actions', () => {
      expect(rankCalculator.calculateExperience('questComplete')).toBe(20);
      expect(rankCalculator.calculateExperience('questCreate')).toBe(10);
      expect(rankCalculator.calculateExperience('eventComplete')).toBe(15);
      expect(rankCalculator.calculateExperience('wishFulfill')).toBe(25);
      expect(rankCalculator.calculateExperience('sharedWishApprove')).toBe(5);
      expect(rankCalculator.calculateExperience('dailyLogin')).toBe(2);
      expect(rankCalculator.calculateExperience('helpPartner')).toBe(10);
      expect(rankCalculator.calculateExperience('mentorAction')).toBe(15);
    });

    it('should apply multiplier to base experience', () => {
      expect(rankCalculator.calculateExperience('questComplete', 1.5)).toBe(30); // 20 * 1.5
      expect(rankCalculator.calculateExperience('wishFulfill', 0.5)).toBe(12); // 25 * 0.5, floored
      expect(rankCalculator.calculateExperience('dailyLogin', 2.0)).toBe(4); // 2 * 2.0
    });

    it('should return 0 for unknown actions', () => {
      expect(rankCalculator.calculateExperience('unknownAction' as any)).toBe(0);
    });

    it('should floor fractional results', () => {
      expect(rankCalculator.calculateExperience('questComplete', 1.3)).toBe(26); // floor(20 * 1.3) = floor(26)
      expect(rankCalculator.calculateExperience('questComplete', 1.7)).toBe(34); // floor(20 * 1.7) = floor(34)
    });
  });

  describe('getCurrentRank', () => {
    it('should return correct rank for different experience levels', () => {
      expect(rankCalculator.getCurrentRank(0).name).toBe('Рядовой');
      expect(rankCalculator.getCurrentRank(50).name).toBe('Рядовой');
      expect(rankCalculator.getCurrentRank(100).name).toBe('Ефрейтор');
      expect(rankCalculator.getCurrentRank(250).name).toBe('Ефрейтор');
      expect(rankCalculator.getCurrentRank(300).name).toBe('Младший сержант');
      expect(rankCalculator.getCurrentRank(500).name).toBe('Младший сержант');
      expect(rankCalculator.getCurrentRank(600).name).toBe('Сержант');
      expect(rankCalculator.getCurrentRank(800).name).toBe('Сержант');
      expect(rankCalculator.getCurrentRank(1000).name).toBe('Старший сержант');
      expect(rankCalculator.getCurrentRank(1200).name).toBe('Старший сержант');
      expect(rankCalculator.getCurrentRank(1500).name).toBe('Старшина');
      expect(rankCalculator.getCurrentRank(2000).name).toBe('Старшина');
    });

    it('should return rank with correct properties', () => {
      const rank = rankCalculator.getCurrentRank(300);
      
      expect(rank.name).toBe('Младший сержант');
      expect(rank.min_experience).toBe(300);
      expect(rank.daily_quota_bonus).toBe(2);
      expect(rank.weekly_quota_bonus).toBe(5);
      expect(rank.monthly_quota_bonus).toBe(10);
      expect(rank.special_privileges).toHaveProperty('maxActiveQuests');
      expect(rank.special_privileges).toHaveProperty('canCreateQuests');
      expect(rank.emoji).toBe('🏅');
    });
  });

  describe('getRankProgress', () => {
    it('should calculate progress correctly within a rank', () => {
      const progress = rankCalculator.getRankProgress(150); // Ефрейтор (100-299)
      
      expect(progress.currentRank.name).toBe('Ефрейтор');
      expect(progress.nextRank?.name).toBe('Младший сержант');
      expect(progress.progressPercent).toBe(25); // (150-100)/(300-100) * 100 = 25%
      expect(progress.experienceToNext).toBe(150); // 300 - 150
    });

    it('should handle maximum rank correctly', () => {
      const progress = rankCalculator.getRankProgress(2000); // Старшина (max rank)
      
      expect(progress.currentRank.name).toBe('Старшина');
      expect(progress.nextRank).toBeNull();
      expect(progress.progressPercent).toBe(100);
      expect(progress.experienceToNext).toBe(0);
    });

    it('should handle exact rank threshold', () => {
      const progress = rankCalculator.getRankProgress(300); // Exactly at Младший сержант
      
      expect(progress.currentRank.name).toBe('Младший сержант');
      expect(progress.nextRank?.name).toBe('Сержант');
      expect(progress.progressPercent).toBe(0); // Just reached this rank
      expect(progress.experienceToNext).toBe(300); // 600 - 300
    });

    it('should calculate progress near rank promotion', () => {
      const progress = rankCalculator.getRankProgress(590); // Almost Сержант (600)
      
      expect(progress.currentRank.name).toBe('Младший сержант');
      expect(progress.nextRank?.name).toBe('Сержант');
      expect(progress.progressPercent).toBe(96.67); // (590-300)/(600-300) * 100 ≈ 96.67%
      expect(progress.experienceToNext).toBe(10); // 600 - 590
    });
  });

  describe('checkForPromotion', () => {
    it('should detect promotion when crossing rank threshold', () => {
      const result = rankCalculator.checkForPromotion(250, 350);
      
      expect(result.promoted).toBe(true);
      expect(result.oldRank.name).toBe('Ефрейтор');
      expect(result.newRank.name).toBe('Младший сержант');
      expect(result.notification).toBeDefined();
      expect(result.notification?.type).toBe('rank_promoted');
      expect(result.notification?.title).toBe('Повышение в звании!');
      expect(result.notification?.message).toContain('Младший сержант');
    });

    it('should not detect promotion when staying in same rank', () => {
      const result = rankCalculator.checkForPromotion(150, 200);
      
      expect(result.promoted).toBe(false);
      expect(result.oldRank.name).toBe('Ефрейтор');
      expect(result.newRank.name).toBe('Ефрейтор');
      expect(result.notification).toBeUndefined();
    });

    it('should handle multiple rank jumps', () => {
      const result = rankCalculator.checkForPromotion(50, 700); // Рядовой to Сержант
      
      expect(result.promoted).toBe(true);
      expect(result.oldRank.name).toBe('Рядовой');
      expect(result.newRank.name).toBe('Сержант');
      expect(result.notification?.message).toContain('Сержант');
    });

    it('should handle experience decrease (should not happen in practice)', () => {
      const result = rankCalculator.checkForPromotion(400, 200);
      
      expect(result.promoted).toBe(true); // Technically a "promotion" to lower rank
      expect(result.oldRank.name).toBe('Младший сержант');
      expect(result.newRank.name).toBe('Ефрейтор');
    });
  });

  describe('getAllRanks', () => {
    it('should return all available ranks in order', () => {
      const ranks = rankCalculator.getAllRanks();
      
      expect(ranks).toHaveLength(6);
      expect(ranks[0].name).toBe('Рядовой');
      expect(ranks[1].name).toBe('Ефрейтор');
      expect(ranks[2].name).toBe('Младший сержант');
      expect(ranks[3].name).toBe('Сержант');
      expect(ranks[4].name).toBe('Старший сержант');
      expect(ranks[5].name).toBe('Старшина');
      
      // Verify experience requirements are in ascending order
      for (let i = 1; i < ranks.length; i++) {
        expect(ranks[i].min_experience).toBeGreaterThan(ranks[i-1].min_experience);
      }
    });

    it('should return ranks with all required properties', () => {
      const ranks = rankCalculator.getAllRanks();
      
      ranks.forEach(rank => {
        expect(rank).toHaveProperty('id');
        expect(rank).toHaveProperty('name');
        expect(rank).toHaveProperty('min_experience');
        expect(rank).toHaveProperty('daily_quota_bonus');
        expect(rank).toHaveProperty('weekly_quota_bonus');
        expect(rank).toHaveProperty('monthly_quota_bonus');
        expect(rank).toHaveProperty('special_privileges');
        expect(rank).toHaveProperty('emoji');
        expect(rank).toHaveProperty('created_at');
        
        expect(typeof rank.id).toBe('string');
        expect(typeof rank.name).toBe('string');
        expect(typeof rank.min_experience).toBe('number');
        expect(typeof rank.daily_quota_bonus).toBe('number');
        expect(typeof rank.weekly_quota_bonus).toBe('number');
        expect(typeof rank.monthly_quota_bonus).toBe('number');
        expect(typeof rank.special_privileges).toBe('object');
        expect(typeof rank.emoji).toBe('string');
        expect(rank.created_at).toBeInstanceOf(Date);
      });
    });
  });

  describe('getRankPrivileges', () => {
    it('should return privileges for valid rank ID', () => {
      const privileges = rankCalculator.getRankPrivileges('3'); // Младший сержант
      
      expect(privileges).toBeDefined();
      expect(privileges.maxActiveQuests).toBe(4);
      expect(privileges.maxSharedWishes).toBe(3);
      expect(privileges.canCreateQuests).toBe(true);
      expect(privileges.canApproveSharedWishes).toBe(true);
      expect(privileges.economyMultiplier).toBe(1.2);
      expect(privileges.specialAbilities).toContain('quest_creation');
      expect(privileges.specialAbilities).toContain('shared_wish_approval');
    });

    it('should return null for invalid rank ID', () => {
      const privileges = rankCalculator.getRankPrivileges('999');
      
      expect(privileges).toBeNull();
    });
  });

  describe('hasPrivilege', () => {
    it('should correctly check boolean privileges', () => {
      const rank = rankCalculator.getCurrentRank(300); // Младший сержант
      
      expect(rankCalculator.hasPrivilege(rank, 'canCreateQuests')).toBe(true);
      expect(rankCalculator.hasPrivilege(rank, 'canApproveSharedWishes')).toBe(true);
    });

    it('should return false for non-existent privileges', () => {
      const rank = rankCalculator.getCurrentRank(0); // Рядовой
      
      expect(rankCalculator.hasPrivilege(rank, 'nonExistentPrivilege')).toBe(false);
    });

    it('should handle different rank levels', () => {
      const rookie = rankCalculator.getCurrentRank(0); // Рядовой
      const corporal = rankCalculator.getCurrentRank(100); // Ефрейтор
      
      expect(rankCalculator.hasPrivilege(rookie, 'canCreateQuests')).toBe(false);
      expect(rankCalculator.hasPrivilege(corporal, 'canCreateQuests')).toBe(true);
    });
  });

  describe('getMaxPrivilegeValue', () => {
    it('should return correct numeric privilege values', () => {
      const rank = rankCalculator.getCurrentRank(600); // Сержант
      
      expect(rankCalculator.getMaxPrivilegeValue(rank, 'maxActiveQuests')).toBe(5);
      expect(rankCalculator.getMaxPrivilegeValue(rank, 'maxSharedWishes')).toBe(4);
    });

    it('should return values for different ranks', () => {
      const rookie = rankCalculator.getCurrentRank(0); // Рядовой
      const senior = rankCalculator.getCurrentRank(1500); // Старшина
      
      expect(rankCalculator.getMaxPrivilegeValue(rookie, 'maxActiveQuests')).toBe(2);
      expect(rankCalculator.getMaxPrivilegeValue(senior, 'maxActiveQuests')).toBe(8);
    });
  });

  describe('getEconomyMultiplier', () => {
    it('should return correct economy multipliers for different ranks', () => {
      expect(rankCalculator.getEconomyMultiplier(rankCalculator.getCurrentRank(0))).toBe(1.0); // Рядовой
      expect(rankCalculator.getEconomyMultiplier(rankCalculator.getCurrentRank(100))).toBe(1.1); // Ефрейтор
      expect(rankCalculator.getEconomyMultiplier(rankCalculator.getCurrentRank(300))).toBe(1.2); // Младший сержант
      expect(rankCalculator.getEconomyMultiplier(rankCalculator.getCurrentRank(600))).toBe(1.3); // Сержант
      expect(rankCalculator.getEconomyMultiplier(rankCalculator.getCurrentRank(1000))).toBe(1.4); // Старший сержант
      expect(rankCalculator.getEconomyMultiplier(rankCalculator.getCurrentRank(1500))).toBe(1.5); // Старшина
    });
  });

  describe('calculateMentorBonus', () => {
    it('should calculate mentor bonus for ranks with mentor ability', () => {
      const sergeant = rankCalculator.getCurrentRank(600); // Сержант (has mentor_bonus)
      const bonus = rankCalculator.calculateMentorBonus(100, sergeant);
      
      expect(bonus).toBe(50); // 50% of 100
    });

    it('should return 0 for ranks without mentor ability', () => {
      const rookie = rankCalculator.getCurrentRank(0); // Рядовой (no mentor_bonus)
      const bonus = rankCalculator.calculateMentorBonus(100, rookie);
      
      expect(bonus).toBe(0);
    });

    it('should floor fractional bonuses', () => {
      const sergeant = rankCalculator.getCurrentRank(600); // Сержант
      const bonus = rankCalculator.calculateMentorBonus(33, sergeant); // 33 * 0.5 = 16.5
      
      expect(bonus).toBe(16); // Floored
    });
  });

  describe('getRankById', () => {
    it('should return rank for valid ID', () => {
      const rank = rankCalculator.getRankById('2');
      
      expect(rank).toBeDefined();
      expect(rank?.name).toBe('Ефрейтор');
      expect(rank?.id).toBe('2');
    });

    it('should return null for invalid ID', () => {
      const rank = rankCalculator.getRankById('999');
      
      expect(rank).toBeNull();
    });
  });

  describe('getExperienceForRank', () => {
    it('should return correct experience requirement for rank', () => {
      expect(rankCalculator.getExperienceForRank('1')).toBe(0); // Рядовой
      expect(rankCalculator.getExperienceForRank('2')).toBe(100); // Ефрейтор
      expect(rankCalculator.getExperienceForRank('3')).toBe(300); // Младший сержант
      expect(rankCalculator.getExperienceForRank('4')).toBe(600); // Сержант
      expect(rankCalculator.getExperienceForRank('5')).toBe(1000); // Старший сержант
      expect(rankCalculator.getExperienceForRank('6')).toBe(1500); // Старшина
    });

    it('should return 0 for invalid rank ID', () => {
      expect(rankCalculator.getExperienceForRank('999')).toBe(0);
    });
  });

  describe('updateUserRank', () => {
    it('should return false for now (placeholder implementation)', async () => {
      const result = await rankCalculator.updateUserRank('user-1');
      
      expect(result).toBe(false);
    });
  });

  describe('rank hierarchy validation', () => {
    it('should have consistent privilege progression', () => {
      const ranks = rankCalculator.getAllRanks();
      
      for (let i = 1; i < ranks.length; i++) {
        const prevRank = ranks[i-1];
        const currentRank = ranks[i];
        
        // Higher ranks should have equal or better privileges
        expect(currentRank.daily_quota_bonus).toBeGreaterThanOrEqual(prevRank.daily_quota_bonus);
        expect(currentRank.weekly_quota_bonus).toBeGreaterThanOrEqual(prevRank.weekly_quota_bonus);
        expect(currentRank.monthly_quota_bonus).toBeGreaterThanOrEqual(prevRank.monthly_quota_bonus);
        expect(currentRank.special_privileges.maxActiveQuests).toBeGreaterThanOrEqual(prevRank.special_privileges.maxActiveQuests);
        expect(currentRank.special_privileges.maxSharedWishes).toBeGreaterThanOrEqual(prevRank.special_privileges.maxSharedWishes);
        expect(currentRank.special_privileges.economyMultiplier).toBeGreaterThanOrEqual(prevRank.special_privileges.economyMultiplier);
      }
    });

    it('should have Russian military rank names', () => {
      const ranks = rankCalculator.getAllRanks();
      const expectedNames = ['Рядовой', 'Ефрейтор', 'Младший сержант', 'Сержант', 'Старший сержант', 'Старшина'];
      
      ranks.forEach((rank, index) => {
        expect(rank.name).toBe(expectedNames[index]);
        expect(rank.name).toMatch(/[а-яё]/i); // Contains Cyrillic characters
      });
    });

    it('should have appropriate emojis for each rank', () => {
      const ranks = rankCalculator.getAllRanks();
      
      ranks.forEach(rank => {
        expect(rank.emoji).toBeDefined();
        expect(rank.emoji.length).toBeGreaterThan(0);
        // Basic emoji validation (contains non-ASCII characters)
        expect(rank.emoji).toMatch(/[^\x00-\x7F]/);
      });
    });
  });
});