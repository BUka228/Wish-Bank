import {
  User,
  Rank,
  RankPrivileges,
  NotificationData
} from '../types/quest-economy';

/**
 * Rank Calculator - Manages experience points, rank progression, and privileges
 * Handles experience calculation, automatic rank updates, and privilege management
 */
export class RankCalculator {
  
  // Russian military ranks with experience requirements
  private rankHierarchy: Rank[] = [
    {
      id: '1',
      name: 'Рядовой',
      min_experience: 0,
      daily_quota_bonus: 0,
      weekly_quota_bonus: 0,
      monthly_quota_bonus: 0,
      special_privileges: {
        maxActiveQuests: 2,
        maxSharedWishes: 1,
        canCreateQuests: false,
        canApproveSharedWishes: false,
        economyMultiplier: 1.0,
        specialAbilities: []
      },
      emoji: '🪖',
      created_at: new Date()
    },
    {
      id: '2',
      name: 'Ефрейтор',
      min_experience: 100,
      daily_quota_bonus: 1,
      weekly_quota_bonus: 2,
      monthly_quota_bonus: 5,
      special_privileges: {
        maxActiveQuests: 3,
        maxSharedWishes: 2,
        canCreateQuests: true,
        canApproveSharedWishes: false,
        economyMultiplier: 1.1,
        specialAbilities: ['quest_creation']
      },
      emoji: '🎖️',
      created_at: new Date()
    },
    {
      id: '3',
      name: 'Младший сержант',
      min_experience: 300,
      daily_quota_bonus: 2,
      weekly_quota_bonus: 5,
      monthly_quota_bonus: 10,
      special_privileges: {
        maxActiveQuests: 4,
        maxSharedWishes: 3,
        canCreateQuests: true,
        canApproveSharedWishes: true,
        economyMultiplier: 1.2,
        specialAbilities: ['quest_creation', 'shared_wish_approval']
      },
      emoji: '🏅',
      created_at: new Date()
    },
    {
      id: '4',
      name: 'Сержант',
      min_experience: 600,
      daily_quota_bonus: 3,
      weekly_quota_bonus: 8,
      monthly_quota_bonus: 15,
      special_privileges: {
        maxActiveQuests: 5,
        maxSharedWishes: 4,
        canCreateQuests: true,
        canApproveSharedWishes: true,
        economyMultiplier: 1.3,
        specialAbilities: ['quest_creation', 'shared_wish_approval', 'mentor_bonus']
      },
      emoji: '🎗️',
      created_at: new Date()
    },
    {
      id: '5',
      name: 'Старший сержант',
      min_experience: 1000,
      daily_quota_bonus: 4,
      weekly_quota_bonus: 12,
      monthly_quota_bonus: 20,
      special_privileges: {
        maxActiveQuests: 6,
        maxSharedWishes: 5,
        canCreateQuests: true,
        canApproveSharedWishes: true,
        economyMultiplier: 1.4,
        specialAbilities: ['quest_creation', 'shared_wish_approval', 'mentor_bonus', 'event_influence']
      },
      emoji: '🏆',
      created_at: new Date()
    },
    {
      id: '6',
      name: 'Старшина',
      min_experience: 1500,
      daily_quota_bonus: 5,
      weekly_quota_bonus: 15,
      monthly_quota_bonus: 25,
      special_privileges: {
        maxActiveQuests: 8,
        maxSharedWishes: 6,
        canCreateQuests: true,
        canApproveSharedWishes: true,
        economyMultiplier: 1.5,
        specialAbilities: ['quest_creation', 'shared_wish_approval', 'mentor_bonus', 'event_influence', 'leadership']
      },
      emoji: '👑',
      created_at: new Date()
    }
  ];

  // Experience points for different actions
  private experienceValues = {
    questComplete: 20,
    questCreate: 10,
    eventComplete: 15,
    wishFulfill: 25,
    sharedWishApprove: 5,
    dailyLogin: 2,
    helpPartner: 10,
    mentorAction: 15
  };

  /**
   * Calculate experience points for a specific action
   */
  calculateExperience(action: keyof typeof this.experienceValues, multiplier: number = 1): number {
    const baseExp = this.experienceValues[action] || 0;
    return Math.floor(baseExp * multiplier);
  }

  /**
   * Get user's current rank based on experience
   */
  getCurrentRank(experience: number): Rank {
    let currentRank = this.rankHierarchy[0];
    
    for (const rank of this.rankHierarchy) {
      if (experience >= rank.min_experience) {
        currentRank = rank;
      } else {
        break;
      }
    }
    
    return currentRank;
  }

  /**
   * Get next rank and progress towards it
   */
  getRankProgress(experience: number): {
    currentRank: Rank;
    nextRank: Rank | null;
    progressPercent: number;
    experienceToNext: number;
  } {
    const currentRank = this.getCurrentRank(experience);
    const currentIndex = this.rankHierarchy.findIndex(r => r.id === currentRank.id);
    const nextRank = currentIndex < this.rankHierarchy.length - 1 
      ? this.rankHierarchy[currentIndex + 1] 
      : null;

    if (!nextRank) {
      return {
        currentRank,
        nextRank: null,
        progressPercent: 100,
        experienceToNext: 0
      };
    }

    const experienceInCurrentRank = experience - currentRank.min_experience;
    const experienceNeededForNext = nextRank.min_experience - currentRank.min_experience;
    const progressPercent = Math.min(100, (experienceInCurrentRank / experienceNeededForNext) * 100);
    const experienceToNext = nextRank.min_experience - experience;

    return {
      currentRank,
      nextRank,
      progressPercent: Math.round(progressPercent * 100) / 100,
      experienceToNext: Math.max(0, experienceToNext)
    };
  }

  /**
   * Check if user should be promoted to a new rank
   */
  checkForPromotion(oldExperience: number, newExperience: number): {
    promoted: boolean;
    oldRank: Rank;
    newRank: Rank;
    notification?: NotificationData;
  } {
    const oldRank = this.getCurrentRank(oldExperience);
    const newRank = this.getCurrentRank(newExperience);

    if (oldRank.id !== newRank.id) {
      return {
        promoted: true,
        oldRank,
        newRank,
        notification: {
          type: 'rank_promoted',
          title: 'Повышение в звании!',
          message: `Поздравляем! Вы получили звание "${newRank.name}"`,
          data: {
            oldRank: oldRank.name,
            newRank: newRank.name,
            newPrivileges: newRank.special_privileges
          }
        }
      };
    }

    return {
      promoted: false,
      oldRank,
      newRank
    };
  }

  /**
   * Get all available ranks
   */
  getAllRanks(): Rank[] {
    return [...this.rankHierarchy];
  }

  /**
   * Get rank privileges for a specific rank
   */
  getRankPrivileges(rankId: string): any | null {
    const rank = this.rankHierarchy.find(r => r.id === rankId);
    return rank ? rank.special_privileges : null;
  }

  /**
   * Check if user has specific privilege
   */
  hasPrivilege(userRank: Rank, privilege: string): boolean {
    return Boolean(userRank.special_privileges[privilege]);
  }

  /**
   * Get maximum value for a numeric privilege
   */
  getMaxPrivilegeValue(userRank: Rank, privilege: 'maxActiveQuests' | 'maxSharedWishes'): number {
    return userRank.special_privileges[privilege] as number;
  }

  /**
   * Get economy multiplier for user's rank
   */
  getEconomyMultiplier(userRank: Rank): number {
    return userRank.special_privileges.economyMultiplier;
  }

  /**
   * Calculate bonus experience for mentoring actions
   */
  calculateMentorBonus(baseExperience: number, mentorRank: Rank): number {
    if (mentorRank.special_privileges.specialAbilities.includes('mentor_bonus')) {
      return Math.floor(baseExperience * 0.5); // 50% bonus for mentors
    }
    return 0;
  }

  /**
   * Get rank by ID
   */
  getRankById(rankId: string): Rank | null {
    return this.rankHierarchy.find(r => r.id === rankId) || null;
  }

  /**
   * Calculate total experience needed to reach a specific rank
   */
  getExperienceForRank(rankId: string): number {
    const rank = this.getRankById(rankId);
    return rank ? rank.min_experience : 0;
  }
}