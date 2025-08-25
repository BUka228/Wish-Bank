# Quest Economy System Business Logic Documentation

## Overview

This document provides detailed documentation of the business logic algorithms and rules that govern the Quest Economy System. The system implements a sophisticated economy with quests, random events, enhanced wishes, quota management, and rank progression.

## Core Business Rules

### Quest System Rules

#### Quest Creation Rules
1. **User Limitations**: Maximum 10 active quests per user at any time
2. **Daily Limits**: Maximum 5 quests created per day per user
3. **Difficulty Limits**: 
   - Easy: 5 per day
   - Medium: 3 per day
   - Hard: 2 per day
   - Epic: 1 per day
4. **Assignment Rules**: Quests can only be assigned to the user's partner
5. **Self-Assignment**: Users cannot assign quests to themselves

#### Quest Completion Rules
1. **Authorization**: Only the quest author can mark quests as completed
2. **Status Validation**: Only active quests can be completed
3. **Reward Calculation**: Based on difficulty, completion time, and user rank
4. **Experience Award**: Automatic experience points awarded upon completion

#### Quest Expiration Rules
1. **Automatic Expiration**: Quests expire automatically after due date
2. **Grace Period**: 24-hour grace period before marking as expired
3. **Notification System**: Users notified 24 hours before expiration
4. **No Retroactive Completion**: Expired quests cannot be completed

### Random Events System Rules

#### Event Generation Rules
1. **Single Active Event**: Only one active event per user at any time
2. **Generation Timing**: New events generated 4-8 hours after previous completion
3. **Weighted Selection**: Events selected based on user activity and preferences
4. **Expiration Time**: All events expire after 24 hours

#### Event Completion Rules
1. **Partner Validation**: Only the user's partner can mark events as completed
2. **Self-Completion Block**: Users cannot complete their own events
3. **Automatic Cleanup**: Expired events are automatically removed
4. **Reward Distribution**: Rewards granted immediately upon completion

### Enhanced Wishes System Rules

#### Wish Classification Rules
1. **Category Assignment**: All wishes must have a category
2. **Shared Wish Approval**: Shared wishes require partner approval
3. **Historical Wishes**: Can be backdated with partner consent
4. **Gift Wishes**: Automatically assigned without description requirement

#### Shared Wish Management Rules
1. **Creation Process**: Requires approval from both partners
2. **Modification Rights**: Both partners can suggest modifications
3. **Deletion Rights**: Both partners must agree to deletion
4. **Completion Rights**: Either partner can mark as completed

### Economy System Rules

#### Quota Management Rules
1. **Base Quotas**: 
   - Daily: 3 gifts
   - Weekly: 15 gifts
   - Monthly: 50 gifts
2. **Rank Bonuses**: Additional quotas based on military rank
3. **Reset Schedule**:
   - Daily: Reset at midnight local time
   - Weekly: Reset on Monday at midnight
   - Monthly: Reset on 1st day at midnight
4. **Quota Validation**: All gift operations validate against current quotas

#### Gift System Rules
1. **Gift Types**:
   - Small: 1 wish, costs 1 quota point
   - Medium: 3 wishes, costs 2 quota points
   - Large: 5 wishes, costs 3 quota points
2. **Quota Deduction**: Immediate deduction upon gift confirmation
3. **Experience Award**: Givers receive experience points
4. **Notification System**: Recipients notified immediately

### Rank System Rules

#### Experience Calculation Rules
1. **Quest Completion**:
   - Easy: 25 base points
   - Medium: 50 base points
   - Hard: 100 base points
   - Epic: 200 base points
2. **Time Bonuses**:
   - Early completion (>50% time remaining): +20% bonus
   - Late completion (<20% time remaining): -20% penalty
3. **Event Completion**: 30 base points
4. **Gift Giving**: 5 points per gift given
5. **Consistency Bonuses**: Additional points for daily activity streaks

#### Rank Progression Rules
1. **Automatic Promotion**: Ranks updated automatically when experience thresholds met
2. **Military Hierarchy**: Russian military rank structure
3. **Privilege Unlocking**: Higher ranks unlock additional quotas and features
4. **No Demotion**: Ranks cannot be lost once achieved

## Algorithm Implementations

### Quest Reward Calculation Algorithm

```typescript
interface QuestRewardCalculation {
  baseReward: number;
  timeBonus: number;
  difficultyMultiplier: number;
  finalReward: number;
  experiencePoints: number;
}

function calculateQuestReward(
  difficulty: QuestDifficulty,
  createdAt: Date,
  dueDate: Date,
  completedAt: Date,
  userRank: string
): QuestRewardCalculation {
  // Base rewards by difficulty
  const baseRewards = {
    easy: 25,
    medium: 50,
    hard: 100,
    epic: 200
  };
  
  const baseReward = baseRewards[difficulty];
  
  // Calculate time-based bonus/penalty
  const totalTime = dueDate.getTime() - createdAt.getTime();
  const completionTime = completedAt.getTime() - createdAt.getTime();
  const timeRatio = completionTime / totalTime;
  
  let timeBonus = 0;
  if (timeRatio <= 0.5) {
    timeBonus = Math.floor(baseReward * 0.2); // 20% bonus for early completion
  } else if (timeRatio >= 0.8) {
    timeBonus = Math.floor(baseReward * -0.2); // 20% penalty for late completion
  }
  
  // Rank-based multiplier
  const rankMultipliers = {
    'Рядовой': 1.0,
    'Ефрейтор': 1.05,
    'Младший сержант': 1.1,
    'Сержант': 1.15,
    'Старший сержант': 1.2,
    'Старшина': 1.25,
    'Прапорщик': 1.3,
    'Старший прапорщик': 1.35
  };
  
  const difficultyMultiplier = rankMultipliers[userRank] || 1.0;
  const finalReward = Math.floor((baseReward + timeBonus) * difficultyMultiplier);
  
  return {
    baseReward,
    timeBonus,
    difficultyMultiplier,
    finalReward,
    experiencePoints: baseReward // Experience is always base amount
  };
}
```

### Random Event Generation Algorithm

```typescript
interface EventGenerationContext {
  userActivity: UserActivityMetrics;
  partnerActivity: UserActivityMetrics;
  recentEvents: RandomEvent[];
  userPreferences: UserPreferences;
}

function generateRandomEvent(context: EventGenerationContext): RandomEvent {
  // Event templates with weights and categories
  const eventTemplates = [
    {
      category: 'romantic',
      templates: [
        { id: 'surprise_coffee', weight: 30, baseReward: 25 },
        { id: 'love_note', weight: 25, baseReward: 20 },
        { id: 'unexpected_hug', weight: 35, baseReward: 15 },
        { id: 'favorite_meal', weight: 20, baseReward: 35 }
      ]
    },
    {
      category: 'helpful',
      templates: [
        { id: 'household_chore', weight: 40, baseReward: 30 },
        { id: 'errand_run', weight: 30, baseReward: 25 },
        { id: 'problem_solve', weight: 20, baseReward: 40 },
        { id: 'organize_space', weight: 25, baseReward: 35 }
      ]
    },
    {
      category: 'surprise',
      templates: [
        { id: 'unexpected_gift', weight: 20, baseReward: 45 },
        { id: 'plan_activity', weight: 30, baseReward: 40 },
        { id: 'memory_recreation', weight: 15, baseReward: 50 },
        { id: 'skill_showcase', weight: 25, baseReward: 35 }
      ]
    }
  ];
  
  // Calculate category weights based on user activity
  const categoryWeights = eventTemplates.map(category => ({
    ...category,
    adjustedWeight: calculateCategoryWeight(category, context)
  }));
  
  // Select category using weighted random
  const selectedCategory = weightedRandomSelection(categoryWeights);
  
  // Select specific event template
  const selectedTemplate = weightedRandomSelection(selectedCategory.templates);
  
  // Generate event with personalized content
  return {
    id: generateUUID(),
    user_id: context.userActivity.userId,
    title: generateEventTitle(selectedTemplate, context),
    description: generateEventDescription(selectedTemplate, context),
    reward_type: 'wishes',
    reward_amount: calculateEventReward(selectedTemplate, context),
    experience_reward: selectedTemplate.baseReward,
    status: 'active',
    expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000),
    created_at: new Date(),
    metadata: {
      template_id: selectedTemplate.id,
      category: selectedCategory.category,
      generation_context: context.userActivity
    }
  };
}

function calculateCategoryWeight(
  category: EventCategory,
  context: EventGenerationContext
): number {
  let weight = 1.0;
  
  // Boost weight based on user preferences
  if (context.userPreferences[category.category]) {
    weight *= context.userPreferences[category.category];
  }
  
  // Reduce weight if category was used recently
  const recentCategoryEvents = context.recentEvents.filter(
    event => event.metadata?.category === category.category
  );
  
  if (recentCategoryEvents.length > 0) {
    weight *= Math.pow(0.7, recentCategoryEvents.length);
  }
  
  // Boost weight based on partner activity
  if (context.partnerActivity.engagementLevel > 0.8) {
    weight *= 1.2;
  }
  
  return weight;
}
```

### Economy Quota Calculation Algorithm

```typescript
interface QuotaCalculationResult {
  baseQuotas: QuotaLimits;
  rankBonuses: QuotaLimits;
  finalQuotas: QuotaLimits;
  resetTimes: QuotaResetTimes;
}

function calculateUserQuotas(
  user: EnhancedUser,
  rank: Rank,
  currentTime: Date = new Date()
): QuotaCalculationResult {
  // Base quota limits for all users
  const baseQuotas = {
    daily: 3,
    weekly: 15,
    monthly: 50
  };
  
  // Rank-based bonuses
  const rankBonuses = {
    daily: rank.daily_quota_bonus,
    weekly: rank.weekly_quota_bonus,
    monthly: rank.monthly_quota_bonus
  };
  
  // Calculate final quotas
  const finalQuotas = {
    daily: baseQuotas.daily + rankBonuses.daily,
    weekly: baseQuotas.weekly + rankBonuses.weekly,
    monthly: baseQuotas.monthly + rankBonuses.monthly
  };
  
  // Calculate reset times
  const resetTimes = {
    daily: getNextMidnight(currentTime),
    weekly: getNextMonday(currentTime),
    monthly: getNextMonthStart(currentTime)
  };
  
  return {
    baseQuotas,
    rankBonuses,
    finalQuotas,
    resetTimes
  };
}

function validateGiftOperation(
  user: EnhancedUser,
  giftType: GiftType,
  quotas: QuotaCalculationResult
): GiftValidationResult {
  const giftCosts = {
    small: 1,
    medium: 2,
    large: 3
  };
  
  const cost = giftCosts[giftType];
  
  // Check daily quota
  if (user.daily_quota_used + cost > quotas.finalQuotas.daily) {
    return {
      valid: false,
      reason: 'DAILY_QUOTA_EXCEEDED',
      resetTime: quotas.resetTimes.daily
    };
  }
  
  // Check weekly quota
  if (user.weekly_quota_used + cost > quotas.finalQuotas.weekly) {
    return {
      valid: false,
      reason: 'WEEKLY_QUOTA_EXCEEDED',
      resetTime: quotas.resetTimes.weekly
    };
  }
  
  // Check monthly quota
  if (user.monthly_quota_used + cost > quotas.finalQuotas.monthly) {
    return {
      valid: false,
      reason: 'MONTHLY_QUOTA_EXCEEDED',
      resetTime: quotas.resetTimes.monthly
    };
  }
  
  return {
    valid: true,
    cost,
    quotasAfterGift: {
      daily: user.daily_quota_used + cost,
      weekly: user.weekly_quota_used + cost,
      monthly: user.monthly_quota_used + cost
    }
  };
}
```

### Rank Progression Algorithm

```typescript
interface RankProgressionResult {
  currentRank: Rank;
  nextRank: Rank | null;
  progressToNext: RankProgress | null;
  promotionEligible: boolean;
  experienceNeeded: number;
}

function calculateRankProgression(
  currentExperience: number,
  ranks: Rank[]
): RankProgressionResult {
  // Sort ranks by experience requirement
  const sortedRanks = ranks.sort((a, b) => a.min_experience - b.min_experience);
  
  // Find current rank (highest rank user qualifies for)
  const currentRank = sortedRanks
    .reverse()
    .find(rank => currentExperience >= rank.min_experience) || sortedRanks[0];
  
  // Find next rank
  const currentRankIndex = sortedRanks.findIndex(rank => rank.id === currentRank.id);
  const nextRank = currentRankIndex < sortedRanks.length - 1 
    ? sortedRanks[currentRankIndex + 1] 
    : null;
  
  // Calculate progress to next rank
  let progressToNext = null;
  let experienceNeeded = 0;
  
  if (nextRank) {
    const experienceInCurrentRank = currentExperience - currentRank.min_experience;
    const experienceNeededForNext = nextRank.min_experience - currentRank.min_experience;
    const progressPercentage = (experienceInCurrentRank / experienceNeededForNext) * 100;
    
    progressToNext = {
      current: currentExperience,
      currentRankMin: currentRank.min_experience,
      nextRankMin: nextRank.min_experience,
      experienceInRank: experienceInCurrentRank,
      experienceNeededForNext: experienceNeededForNext,
      percentage: Math.min(100, Math.max(0, progressPercentage))
    };
    
    experienceNeeded = nextRank.min_experience - currentExperience;
  }
  
  return {
    currentRank,
    nextRank,
    progressToNext,
    promotionEligible: experienceNeeded <= 0,
    experienceNeeded: Math.max(0, experienceNeeded)
  };
}

function calculateExperienceGain(
  action: ExperienceAction,
  context: ExperienceContext
): ExperienceGainResult {
  const baseExperience = {
    quest_easy: 25,
    quest_medium: 50,
    quest_hard: 100,
    quest_epic: 200,
    event_completion: 30,
    gift_given: 5,
    daily_login: 10,
    streak_bonus: 5
  };
  
  let experience = baseExperience[action.type] || 0;
  
  // Apply multipliers based on context
  if (context.streakDays > 0) {
    const streakMultiplier = Math.min(1.5, 1 + (context.streakDays * 0.1));
    experience = Math.floor(experience * streakMultiplier);
  }
  
  // Apply rank-based bonuses
  if (context.userRank && context.userRank !== 'Рядовой') {
    const rankBonus = getRankExperienceBonus(context.userRank);
    experience = Math.floor(experience * (1 + rankBonus));
  }
  
  // Apply time-based bonuses for quests
  if (action.type.startsWith('quest_') && action.completionTime) {
    const timeBonus = calculateQuestTimeBonus(action.completionTime);
    experience = Math.floor(experience * (1 + timeBonus));
  }
  
  return {
    baseExperience: baseExperience[action.type] || 0,
    bonusExperience: experience - (baseExperience[action.type] || 0),
    totalExperience: experience,
    multipliers: {
      streak: context.streakDays > 0 ? Math.min(1.5, 1 + (context.streakDays * 0.1)) : 1,
      rank: context.userRank ? (1 + getRankExperienceBonus(context.userRank)) : 1,
      time: action.completionTime ? (1 + calculateQuestTimeBonus(action.completionTime)) : 1
    }
  };
}
```

## Data Validation Rules

### Input Validation

```typescript
const validationRules = {
  quest: {
    title: {
      minLength: 3,
      maxLength: 200,
      required: true,
      sanitize: true
    },
    description: {
      minLength: 10,
      maxLength: 1000,
      required: true,
      sanitize: true
    },
    difficulty: {
      enum: ['easy', 'medium', 'hard', 'epic'],
      required: true
    },
    dueDate: {
      type: 'date',
      futureOnly: true,
      maxDaysFromNow: 365,
      minDaysFromNow: 1
    }
  },
  wish: {
    title: {
      minLength: 3,
      maxLength: 200,
      required: true,
      sanitize: true
    },
    category: {
      type: 'uuid',
      required: true,
      validateExists: 'wish_categories'
    },
    priority: {
      type: 'integer',
      min: 1,
      max: 5,
      default: 1
    }
  },
  gift: {
    type: {
      enum: ['small', 'medium', 'large'],
      required: true
    },
    message: {
      maxLength: 500,
      sanitize: true,
      optional: true
    }
  }
};
```

### Business Logic Validation

```typescript
function validateBusinessRules(operation: Operation, context: OperationContext): ValidationResult {
  const validators = {
    createQuest: validateQuestCreation,
    completeQuest: validateQuestCompletion,
    giftWish: validateGiftOperation,
    createSharedWish: validateSharedWishCreation,
    completeEvent: validateEventCompletion
  };
  
  const validator = validators[operation.type];
  if (!validator) {
    return { valid: false, errors: ['Unknown operation type'] };
  }
  
  return validator(operation.data, context);
}

function validateQuestCreation(questData: CreateQuestData, context: OperationContext): ValidationResult {
  const errors = [];
  
  // Check user quest limits
  if (context.userStats.activeQuests >= 10) {
    errors.push('Maximum active quests limit reached (10)');
  }
  
  // Check daily creation limits
  if (context.userStats.questsCreatedToday >= 5) {
    errors.push('Daily quest creation limit reached (5)');
  }
  
  // Check difficulty-specific limits
  const difficultyLimits = { easy: 5, medium: 3, hard: 2, epic: 1 };
  const todayByDifficulty = context.userStats.questsCreatedTodayByDifficulty[questData.difficulty] || 0;
  
  if (todayByDifficulty >= difficultyLimits[questData.difficulty]) {
    errors.push(`Daily ${questData.difficulty} quest limit reached (${difficultyLimits[questData.difficulty]})`);
  }
  
  // Validate assignee is partner
  if (questData.assignee_id !== context.user.partner_id) {
    errors.push('Quests can only be assigned to your partner');
  }
  
  // Validate self-assignment
  if (questData.assignee_id === context.user.id) {
    errors.push('Cannot assign quest to yourself');
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}
```

## Error Handling Strategies

### Error Classification

```typescript
enum ErrorType {
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  BUSINESS_RULE_VIOLATION = 'BUSINESS_RULE_VIOLATION',
  QUOTA_EXCEEDED = 'QUOTA_EXCEEDED',
  PERMISSION_DENIED = 'PERMISSION_DENIED',
  RESOURCE_NOT_FOUND = 'RESOURCE_NOT_FOUND',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  SYSTEM_ERROR = 'SYSTEM_ERROR'
}

class BusinessLogicError extends Error {
  constructor(
    public type: ErrorType,
    public message: string,
    public details?: any,
    public recoverable: boolean = true
  ) {
    super(message);
    this.name = 'BusinessLogicError';
  }
}
```

### Recovery Strategies

```typescript
function handleBusinessLogicError(error: BusinessLogicError, context: OperationContext): ErrorResponse {
  const recoveryStrategies = {
    [ErrorType.QUOTA_EXCEEDED]: handleQuotaExceeded,
    [ErrorType.BUSINESS_RULE_VIOLATION]: handleBusinessRuleViolation,
    [ErrorType.VALIDATION_ERROR]: handleValidationError,
    [ErrorType.PERMISSION_DENIED]: handlePermissionDenied
  };
  
  const handler = recoveryStrategies[error.type];
  if (handler) {
    return handler(error, context);
  }
  
  return {
    success: false,
    error: {
      type: error.type,
      message: error.message,
      recoverable: error.recoverable,
      details: error.details
    }
  };
}
```

This comprehensive business logic documentation provides detailed algorithms and rules for all major system components, ensuring consistent implementation and maintenance.