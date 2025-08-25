# Quest Economy System API Documentation

## Overview

This document provides comprehensive documentation for the Quest Economy System API endpoints. The system includes quests, random events, enhanced wishes, economy management, and rank progression.

## Authentication

All API endpoints require authentication via Telegram Web App authentication. Include the following headers:

```
Authorization: Bearer <telegram_auth_token>
Content-Type: application/json
```

## Base URL

```
Production: https://your-domain.com/api
Development: http://localhost:3000/api
```

## Quest API Endpoints

### Create Quest
**POST** `/api/quests`

Creates a new quest for assignment to a partner.

**Request Body:**
```json
{
  "title": "Complete morning workout",
  "description": "Do 30 minutes of exercise before 10 AM",
  "assignee_id": "uuid-of-partner",
  "category": "health",
  "difficulty": "medium",
  "reward_type": "wishes",
  "reward_amount": 3,
  "due_date": "2024-12-31T23:59:59Z"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "quest-uuid",
    "title": "Complete morning workout",
    "description": "Do 30 minutes of exercise before 10 AM",
    "author_id": "author-uuid",
    "assignee_id": "assignee-uuid",
    "category": "health",
    "difficulty": "medium",
    "reward_type": "wishes",
    "reward_amount": 3,
    "experience_reward": 50,
    "status": "active",
    "due_date": "2024-12-31T23:59:59Z",
    "created_at": "2024-01-15T10:00:00Z"
  }
}
```

### Get Quests
**GET** `/api/quests`

Retrieves quests with optional filtering and pagination.

**Query Parameters:**
- `status` (optional): Filter by status (`active`, `completed`, `expired`, `cancelled`)
- `category` (optional): Filter by category
- `assignee` (optional): Filter by assignee (`me`, `partner`, `all`)
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20)

**Response:**
```json
{
  "success": true,
  "data": {
    "quests": [
      {
        "id": "quest-uuid",
        "title": "Complete morning workout",
        "status": "active",
        "difficulty": "medium",
        "reward_amount": 3,
        "due_date": "2024-12-31T23:59:59Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 5,
      "totalPages": 1
    }
  }
}
```

### Complete Quest
**POST** `/api/quests/:id/complete`

Marks a quest as completed. Only the quest author can complete quests.

**Response:**
```json
{
  "success": true,
  "data": {
    "quest": {
      "id": "quest-uuid",
      "status": "completed",
      "completed_at": "2024-01-15T15:30:00Z"
    },
    "rewards": {
      "wishes_granted": 3,
      "experience_gained": 50
    }
  }
}
```

### Update Quest
**PUT** `/api/quests/:id`

Updates quest details. Only the author can update quests.

**Request Body:**
```json
{
  "title": "Updated quest title",
  "description": "Updated description",
  "due_date": "2024-12-31T23:59:59Z"
}
```

### Delete Quest
**DELETE** `/api/quests/:id`

Cancels/deletes a quest. Only the author can delete quests.

## Random Events API Endpoints

### Get Current Event
**GET** `/api/events/current`

Retrieves the current active random event for the user.

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "event-uuid",
    "title": "Surprise Coffee Date",
    "description": "Bring your partner their favorite coffee unexpectedly",
    "reward_type": "wishes",
    "reward_amount": 2,
    "experience_reward": 30,
    "status": "active",
    "expires_at": "2024-01-16T10:00:00Z",
    "created_at": "2024-01-15T10:00:00Z"
  }
}
```

### Complete Event
**POST** `/api/events/:id/complete`

Marks a random event as completed. Only the partner can complete events.

**Response:**
```json
{
  "success": true,
  "data": {
    "event": {
      "id": "event-uuid",
      "status": "completed",
      "completed_at": "2024-01-15T15:30:00Z",
      "completed_by": "partner-uuid"
    },
    "rewards": {
      "wishes_granted": 2,
      "experience_gained": 30
    },
    "next_event_in": "4-8 hours"
  }
}
```

### Generate Event (System)
**POST** `/api/events/generate`

System endpoint for generating new random events.

## Enhanced Wishes API Endpoints

### Get My Wishes
**GET** `/api/wishes/my`

Retrieves wishes created by the current user.

**Query Parameters:**
- `status` (optional): Filter by status
- `category` (optional): Filter by category
- `page`, `limit`: Pagination

### Get Assigned Wishes
**GET** `/api/wishes/assigned`

Retrieves wishes assigned to the current user.

### Get Shared Wishes
**GET** `/api/wishes/shared`

Retrieves shared wishes that both partners can see and manage.

**Response:**
```json
{
  "success": true,
  "data": {
    "wishes": [
      {
        "id": "wish-uuid",
        "title": "Weekend getaway",
        "description": "Plan a romantic weekend trip",
        "category": "travel",
        "is_shared": true,
        "shared_approved_by": "partner-uuid",
        "priority": 3,
        "status": "active",
        "created_at": "2024-01-15T10:00:00Z"
      }
    ]
  }
}
```

### Create Shared Wish
**POST** `/api/wishes/shared`

Creates a shared wish that requires partner approval.

**Request Body:**
```json
{
  "title": "Weekend getaway",
  "description": "Plan a romantic weekend trip",
  "category": "travel",
  "priority": 3
}
```

### Approve Shared Wish
**PUT** `/api/wishes/shared/:id/approve`

Approves a pending shared wish.

### Gift Wish
**POST** `/api/wishes/gift`

Gifts a wish to the partner using economy quotas.

**Request Body:**
```json
{
  "type": "small",
  "message": "Just because I love you!"
}
```

### Get Categories
**GET** `/api/wishes/categories`

Retrieves available wish categories.

**Response:**
```json
{
  "success": true,
  "data": {
    "categories": [
      {
        "id": "category-uuid",
        "name": "Романтика",
        "emoji": "💕",
        "color": "#ff69b4"
      },
      {
        "id": "category-uuid",
        "name": "Путешествия",
        "emoji": "✈️",
        "color": "#4169e1"
      }
    ]
  }
}
```

## Economy API Endpoints

### Get Quotas
**GET** `/api/economy/quotas`

Retrieves current quota information for the user.

**Response:**
```json
{
  "success": true,
  "data": {
    "daily": {
      "limit": 5,
      "used": 2,
      "remaining": 3,
      "reset_time": "2024-01-16T00:00:00Z"
    },
    "weekly": {
      "limit": 25,
      "used": 8,
      "remaining": 17,
      "reset_time": "2024-01-21T00:00:00Z"
    },
    "monthly": {
      "limit": 100,
      "used": 15,
      "remaining": 85,
      "reset_time": "2024-02-01T00:00:00Z"
    },
    "rank_bonuses": {
      "daily_bonus": 2,
      "weekly_bonus": 10,
      "monthly_bonus": 30
    }
  }
}
```

### Gift with Quota Validation
**POST** `/api/economy/gift`

Gifts wishes with automatic quota validation and deduction.

**Request Body:**
```json
{
  "recipient_id": "partner-uuid",
  "gift_type": "medium",
  "message": "For being amazing today!"
}
```

### Get Economy Settings
**GET** `/api/economy/settings`

Retrieves current economy configuration.

### Get Economy Metrics
**GET** `/api/economy/metrics`

Retrieves economy analytics and metrics.

## Rank System API Endpoints

### Get All Ranks
**GET** `/api/ranks`

Retrieves all available ranks in the system.

**Response:**
```json
{
  "success": true,
  "data": {
    "ranks": [
      {
        "id": "rank-uuid",
        "name": "Рядовой",
        "min_experience": 0,
        "daily_quota_bonus": 0,
        "weekly_quota_bonus": 0,
        "monthly_quota_bonus": 0,
        "emoji": "🎖️"
      },
      {
        "id": "rank-uuid",
        "name": "Ефрейтор",
        "min_experience": 500,
        "daily_quota_bonus": 1,
        "weekly_quota_bonus": 5,
        "monthly_quota_bonus": 15,
        "emoji": "🏅"
      }
    ]
  }
}
```

### Get Current Rank
**GET** `/api/ranks/current`

Retrieves the current user's rank information.

**Response:**
```json
{
  "success": true,
  "data": {
    "current_rank": {
      "name": "Ефрейтор",
      "emoji": "🏅",
      "experience_required": 500
    },
    "user_experience": 750,
    "next_rank": {
      "name": "Младший сержант",
      "emoji": "🎗️",
      "experience_required": 1200
    },
    "progress_to_next": {
      "current": 750,
      "required": 1200,
      "percentage": 62.5
    }
  }
}
```

### Get Rank Progress
**GET** `/api/ranks/progress`

Retrieves detailed rank progression information.

## Error Responses

All endpoints return consistent error responses:

```json
{
  "success": false,
  "error": {
    "code": "QUOTA_EXCEEDED",
    "message": "Daily quota exceeded",
    "details": {
      "quota_type": "daily",
      "limit": 5,
      "used": 5,
      "reset_time": "2024-01-16T00:00:00Z"
    }
  }
}
```

### Common Error Codes

- `AUTHENTICATION_REQUIRED`: Missing or invalid authentication
- `PERMISSION_DENIED`: User lacks permission for the action
- `RESOURCE_NOT_FOUND`: Requested resource doesn't exist
- `VALIDATION_ERROR`: Request data validation failed
- `QUOTA_EXCEEDED`: Economy quota limit reached
- `RATE_LIMIT_EXCEEDED`: Too many requests
- `INTERNAL_ERROR`: Server error

## Rate Limiting

API endpoints are rate-limited to prevent abuse:

- **General endpoints**: 100 requests per minute per user
- **Quest creation**: 10 requests per minute per user
- **Gift operations**: 20 requests per minute per user
- **System endpoints**: 1000 requests per minute (admin only)

Rate limit headers are included in responses:

```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1642248000
```

## Webhooks

The system supports webhooks for real-time notifications:

### Quest Events
- `quest.created`: New quest assigned
- `quest.completed`: Quest marked as complete
- `quest.expired`: Quest expired without completion

### Event Notifications
- `event.generated`: New random event available
- `event.completed`: Random event completed

### Economy Events
- `gift.received`: Wish gift received
- `quota.reset`: Quotas reset for new period

### Rank Events
- `rank.promoted`: User promoted to new rank
- `experience.gained`: Experience points awarded

## SDK Examples

### JavaScript/TypeScript

```typescript
import { QuestEconomyAPI } from './quest-economy-sdk';

const api = new QuestEconomyAPI({
  baseURL: 'https://your-domain.com/api',
  authToken: 'your-telegram-auth-token'
});

// Create a quest
const quest = await api.quests.create({
  title: 'Morning workout',
  description: 'Complete 30 minutes of exercise',
  assignee_id: 'partner-uuid',
  category: 'health',
  difficulty: 'medium',
  reward_amount: 3
});

// Get current quotas
const quotas = await api.economy.getQuotas();

// Gift a wish
await api.economy.gift({
  recipient_id: 'partner-uuid',
  gift_type: 'small',
  message: 'Love you!'
});
```

## Business Logic Algorithms

### Quest Reward Calculation

The system calculates quest rewards based on difficulty and completion time:

```typescript
function calculateQuestReward(difficulty: string, completionTime: number, dueDate: Date): number {
  const baseRewards = {
    easy: 25,
    medium: 50,
    hard: 100,
    epic: 200
  };
  
  const baseReward = baseRewards[difficulty] || 25;
  
  // Bonus for early completion
  const timeRemaining = dueDate.getTime() - Date.now();
  const totalTime = dueDate.getTime() - createdAt.getTime();
  const completionRatio = timeRemaining / totalTime;
  
  if (completionRatio > 0.5) {
    return Math.floor(baseReward * 1.2); // 20% bonus
  } else if (completionRatio > 0.2) {
    return baseReward;
  } else {
    return Math.floor(baseReward * 0.8); // 20% penalty
  }
}
```

### Random Event Generation Algorithm

Events are generated using weighted probability based on user activity:

```typescript
function generateRandomEvent(userActivity: UserActivity): RandomEvent {
  const eventPool = [
    { type: 'romantic', weight: 30, baseReward: 30 },
    { type: 'surprise', weight: 25, baseReward: 25 },
    { type: 'helpful', weight: 20, baseReward: 20 },
    { type: 'creative', weight: 15, baseReward: 35 },
    { type: 'adventure', weight: 10, baseReward: 40 }
  ];
  
  // Adjust weights based on user preferences and history
  const adjustedWeights = eventPool.map(event => ({
    ...event,
    weight: event.weight * getUserPreferenceMultiplier(userActivity, event.type)
  }));
  
  const selectedEvent = weightedRandomSelection(adjustedWeights);
  
  return {
    ...selectedEvent,
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
    reward: calculateEventReward(selectedEvent, userActivity)
  };
}
```

### Economy Quota Management

The quota system implements a tiered approach with rank-based bonuses:

```typescript
function calculateUserQuotas(user: EnhancedUser, rank: Rank): EconomyQuotas {
  const baseQuotas = {
    daily: 3,
    weekly: 15,
    monthly: 50
  };
  
  return {
    daily: {
      limit: baseQuotas.daily + rank.daily_quota_bonus,
      used: user.daily_quota_used,
      remaining: Math.max(0, baseQuotas.daily + rank.daily_quota_bonus - user.daily_quota_used),
      resetTime: getNextMidnight()
    },
    weekly: {
      limit: baseQuotas.weekly + rank.weekly_quota_bonus,
      used: user.weekly_quota_used,
      remaining: Math.max(0, baseQuotas.weekly + rank.weekly_quota_bonus - user.weekly_quota_used),
      resetTime: getNextMonday()
    },
    monthly: {
      limit: baseQuotas.monthly + rank.monthly_quota_bonus,
      used: user.monthly_quota_used,
      remaining: Math.max(0, baseQuotas.monthly + rank.monthly_quota_bonus - user.monthly_quota_used),
      resetTime: getNextMonth()
    }
  };
}
```

### Rank Progression Algorithm

Rank progression uses an exponential experience curve:

```typescript
function calculateRankProgression(currentExperience: number): RankProgression {
  const ranks = [
    { name: 'Рядовой', minExp: 0, bonuses: { daily: 0, weekly: 0, monthly: 0 } },
    { name: 'Ефрейтор', minExp: 500, bonuses: { daily: 1, weekly: 5, monthly: 15 } },
    { name: 'Младший сержант', minExp: 1200, bonuses: { daily: 2, weekly: 8, monthly: 25 } },
    { name: 'Сержант', minExp: 2500, bonuses: { daily: 3, weekly: 12, monthly: 35 } },
    { name: 'Старший сержант', minExp: 5000, bonuses: { daily: 4, weekly: 15, monthly: 50 } },
    { name: 'Старшина', minExp: 8000, bonuses: { daily: 5, weekly: 20, monthly: 65 } },
    { name: 'Прапорщик', minExp: 12000, bonuses: { daily: 6, weekly: 25, monthly: 80 } },
    { name: 'Старший прапорщик', minExp: 18000, bonuses: { daily: 8, weekly: 30, monthly: 100 } }
  ];
  
  const currentRank = ranks.reverse().find(rank => currentExperience >= rank.minExp);
  const nextRankIndex = ranks.findIndex(rank => rank.name === currentRank.name) + 1;
  const nextRank = nextRankIndex < ranks.length ? ranks[nextRankIndex] : null;
  
  return {
    currentRank,
    nextRank,
    progress: nextRank ? {
      current: currentExperience,
      required: nextRank.minExp,
      percentage: ((currentExperience - currentRank.minExp) / (nextRank.minExp - currentRank.minExp)) * 100
    } : null
  };
}
```

## Performance Considerations

### Database Query Optimization

The system uses several optimization strategies:

1. **Composite Indexes**: Multi-column indexes for common query patterns
2. **Partial Indexes**: Indexes on filtered subsets of data
3. **Query Planning**: EXPLAIN ANALYZE for query optimization
4. **Connection Pooling**: Managed database connections

### Caching Strategy

```typescript
// Cache configuration
const cacheConfig = {
  userRanks: { ttl: 3600 }, // 1 hour
  economySettings: { ttl: 86400 }, // 24 hours
  activeQuests: { ttl: 300 }, // 5 minutes
  randomEvents: { ttl: 60 }, // 1 minute
  wishCategories: { ttl: 43200 } // 12 hours
};
```

### Rate Limiting

API endpoints implement tiered rate limiting:

```typescript
const rateLimits = {
  general: { requests: 100, window: 60 }, // 100 req/min
  questCreation: { requests: 10, window: 60 }, // 10 req/min
  giftOperations: { requests: 20, window: 60 }, // 20 req/min
  systemEndpoints: { requests: 1000, window: 60 } // 1000 req/min (admin)
};
```

## Testing

All endpoints include comprehensive test coverage:

- **Unit tests**: Business logic validation
- **Integration tests**: API endpoint functionality
- **End-to-end tests**: Complete user workflows

Run tests with:
```bash
npm run test
npm run test:integration
npm run test:e2e
```

### Test Coverage Requirements

- **Unit Tests**: Minimum 90% code coverage
- **Integration Tests**: All API endpoints covered
- **E2E Tests**: Critical user workflows covered
- **Performance Tests**: Load testing for high-traffic scenarios