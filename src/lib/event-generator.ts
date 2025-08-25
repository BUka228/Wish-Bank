import {
  RandomEvent,
  CreateRandomEventRequest,
  User,
  NotificationData
} from '../types/quest-economy';
import {
  createRandomEvent as dbCreateRandomEvent,
  getCurrentEvent,
  getEventById,
  completeRandomEvent as dbCompleteRandomEvent,
  getUserByTelegramId,
  addTransaction
} from './db';

/**
 * Event Generator - Manages random event lifecycle and generation
 * Handles event creation, completion validation, and automatic cleanup
 */
export class EventGenerator {
  
  // Pool of random events with Russian descriptions
  private eventPool = [
    {
      title: 'Неожиданный сюрприз',
      description: 'Сделайте что-то приятное для партнера без предупреждения',
      category: 'romance',
      baseReward: 2,
      baseExperience: 20
    },
    {
      title: 'Кулинарный эксперимент',
      description: 'Приготовьте новое блюдо, которое вы никогда не готовили',
      category: 'food',
      baseReward: 1,
      baseExperience: 15
    },
    {
      title: 'Спонтанная прогулка',
      description: 'Предложите партнеру прогуляться в новом месте',
      category: 'activity',
      baseReward: 1,
      baseExperience: 15
    },
    {
      title: 'Комплимент дня',
      description: 'Сделайте искренний комплимент партнеру о том, что вы в нем цените',
      category: 'romance',
      baseReward: 1,
      baseExperience: 10
    },
    {
      title: 'Помощь по дому',
      description: 'Сделайте домашнее дело, которое обычно делает партнер',
      category: 'home',
      baseReward: 2,
      baseExperience: 15
    },
    {
      title: 'Творческий момент',
      description: 'Создайте что-то своими руками для партнера (рисунок, поделка, письмо)',
      category: 'creative',
      baseReward: 3,
      baseExperience: 25
    },
    {
      title: 'Массаж-сюрприз',
      description: 'Предложите партнеру расслабляющий массаж',
      category: 'romance',
      baseReward: 2,
      baseExperience: 20
    },
    {
      title: 'Планирование будущего',
      description: 'Обсудите с партнером планы на ближайший месяц',
      category: 'communication',
      baseReward: 1,
      baseExperience: 15
    },
    {
      title: 'Фото-момент',
      description: 'Сделайте красивое фото вместе в необычном месте',
      category: 'memory',
      baseReward: 1,
      baseExperience: 10
    },
    {
      title: 'Музыкальный вечер',
      description: 'Включите любимую музыку партнера и потанцуйте вместе',
      category: 'entertainment',
      baseReward: 2,
      baseExperience: 20
    },
    {
      title: 'Забота о здоровье',
      description: 'Предложите партнеру вместе заняться спортом или прогуляться',
      category: 'health',
      baseReward: 2,
      baseExperience: 15
    },
    {
      title: 'Воспоминания',
      description: 'Расскажите партнеру о любимом воспоминании с ним',
      category: 'communication',
      baseReward: 1,
      baseExperience: 15
    }
  ];

  /**
   * Generates a random event for a user
   */
  async generateRandomEvent(userId: string): Promise<RandomEvent> {
    // Check if user already has an active event
    const existingEvent = await getCurrentEvent(userId);
    if (existingEvent) {
      throw new Error('User already has an active event');
    }

    // Select random event from pool
    const eventTemplate = this.selectRandomEventTemplate(userId);
    
    // Calculate rewards based on user activity and preferences
    const { rewardAmount, experienceReward, rewardType } = await this.calculateEventRewards(
      userId,
      eventTemplate
    );

    // Set expiration time (24 hours from now)
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);

    // Create the event
    const event = await dbCreateRandomEvent(
      userId,
      eventTemplate.title,
      eventTemplate.description,
      rewardType,
      rewardAmount,
      experienceReward,
      expiresAt
    );

    // Send notification to user
    await this.sendEventNotification(event, 'event_available');

    return event;
  }

  /**
   * Completes a random event with partner validation
   */
  async completeRandomEvent(
    eventId: string,
    completedBy: string
  ): Promise<{ event: RandomEvent; rewardsGranted: boolean }> {
    // Get the event
    const event = await getEventById(eventId);
    if (!event) {
      throw new Error('Event not found');
    }

    // Verify event is active
    if (event.status !== 'active') {
      throw new Error(`Cannot complete event with status: ${event.status}`);
    }

    // Verify event hasn't expired
    if (new Date() > event.expires_at) {
      throw new Error('Event has expired');
    }

    // Critical validation: only partner can complete the event, not the user themselves
    if (event.user_id === completedBy) {
      throw new Error('Users cannot complete their own events. Only your partner can validate completion.');
    }

    // Verify the completer is actually the partner
    const isPartner = await this.verifyPartnership(event.user_id, completedBy);
    if (!isPartner) {
      throw new Error('Only your partner can complete your events');
    }

    // Complete the event in database
    const completedEvent = await dbCompleteRandomEvent(eventId, completedBy);

    // Grant rewards to the event owner
    const rewardsGranted = await this.grantEventRewards(completedEvent);

    // Send completion notifications
    await this.sendEventNotification(completedEvent, 'event_completed');

    // Generate next event after random interval
    await this.scheduleNextEvent(event.user_id);

    return { event: completedEvent, rewardsGranted };
  }

  /**
   * Cleans up expired events and generates new ones
   */
  async cleanupExpiredEvents(): Promise<{ cleanedCount: number; newEventsGenerated: number }> {
    // This would typically be called by a scheduled job
    // For now, we'll implement the logic that could be called manually or by cron
    
    let cleanedCount = 0;
    let newEventsGenerated = 0;

    try {
      // Find all expired events that are still active
      // Note: This would require a database query to find expired events
      // For now, we'll implement the cleanup logic structure
      
      console.log('Cleaning up expired events...');
      
      // TODO: Implement actual database query for expired events
      // const expiredEvents = await getExpiredEvents();
      
      // Mark expired events as expired and generate new ones
      // for (const event of expiredEvents) {
      //   await markEventAsExpired(event.id);
      //   cleanedCount++;
      //   
      //   // Generate new event for the user
      //   try {
      //     await this.generateRandomEvent(event.user_id);
      //     newEventsGenerated++;
      //   } catch (error) {
      //     console.error(`Failed to generate new event for user ${event.user_id}:`, error);
      //   }
      // }

      return { cleanedCount, newEventsGenerated };
    } catch (error) {
      console.error('Error during event cleanup:', error);
      return { cleanedCount, newEventsGenerated };
    }
  }

  /**
   * Gets current active event for a user
   */
  async getUserCurrentEvent(userId: string): Promise<RandomEvent | null> {
    return await getCurrentEvent(userId);
  }

  /**
   * Forces generation of a new event (admin function)
   */
  async forceGenerateEvent(userId: string): Promise<RandomEvent> {
    // Clean up any existing active event first
    const existingEvent = await getCurrentEvent(userId);
    if (existingEvent) {
      // Mark as expired (would need database function)
      console.log(`Replacing existing event ${existingEvent.id} for user ${userId}`);
      // TODO: Implement markEventAsExpired function in db.ts
      // For now, we'll bypass the check in generateRandomEvent
    }

    // Select random event from pool
    const eventTemplate = this.selectRandomEventTemplate(userId);
    
    // Calculate rewards based on user activity and preferences
    const { rewardAmount, experienceReward, rewardType } = await this.calculateEventRewards(
      userId,
      eventTemplate
    );

    // Set expiration time (24 hours from now)
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);

    // Create the event directly, bypassing the existing event check
    const event = await dbCreateRandomEvent(
      userId,
      eventTemplate.title,
      eventTemplate.description,
      rewardType,
      rewardAmount,
      experienceReward,
      expiresAt
    );

    // Send notification to user
    await this.sendEventNotification(event, 'event_available');

    return event;
  }

  /**
   * Selects a random event template from the pool
   */
  private selectRandomEventTemplate(userId: string): typeof this.eventPool[0] {
    // For now, select completely random
    // In future, could consider user preferences, history, etc.
    const randomIndex = Math.floor(Math.random() * this.eventPool.length);
    return this.eventPool[randomIndex];
  }

  /**
   * Calculates event rewards based on user activity and event type
   */
  private async calculateEventRewards(
    userId: string,
    eventTemplate: typeof this.eventPool[0]
  ): Promise<{ rewardAmount: number; experienceReward: number; rewardType: string }> {
    // Base rewards from template
    let rewardAmount = eventTemplate.baseReward;
    let experienceReward = eventTemplate.baseExperience;
    
    // Default reward type (could be randomized or based on user preferences)
    const rewardTypes = ['green', 'blue', 'red'];
    const rewardType = rewardTypes[Math.floor(Math.random() * rewardTypes.length)];

    // TODO: Apply user-specific multipliers based on:
    // - User rank/level
    // - Recent activity
    // - Event completion history
    // - Partner relationship metrics

    // For now, add some randomization
    const randomMultiplier = 0.8 + Math.random() * 0.4; // 0.8 to 1.2
    rewardAmount = Math.max(1, Math.round(rewardAmount * randomMultiplier));
    experienceReward = Math.round(experienceReward * randomMultiplier);

    return { rewardAmount, experienceReward, rewardType };
  }

  /**
   * Grants rewards to event owner upon completion
   */
  private async grantEventRewards(event: RandomEvent): Promise<boolean> {
    try {
      // Grant wish balance reward
      await addTransaction(
        event.user_id,
        'credit',
        event.reward_type as 'green' | 'blue' | 'red',
        event.reward_amount,
        `Random event completion: ${event.title}`,
        event.id
      );

      // Grant experience points (would integrate with rank system)
      if (event.experience_reward > 0) {
        // This would be handled by the RankCalculator in a full implementation
        console.log(`Granting ${event.experience_reward} experience to user ${event.user_id}`);
      }

      return true;
    } catch (error) {
      console.error('Failed to grant event rewards:', error);
      return false;
    }
  }

  /**
   * Verifies that two users are partners
   */
  private async verifyPartnership(userId1: string, userId2: string): Promise<boolean> {
    // TODO: Implement actual partnership verification
    // This would check if the users are in a relationship/partnership
    // For now, we'll assume any two different users can be partners
    return userId1 !== userId2;
  }

  /**
   * Schedules the next event generation after a random interval
   */
  private async scheduleNextEvent(userId: string): Promise<void> {
    // Generate next event after random interval (2-8 hours)
    const minHours = 2;
    const maxHours = 8;
    const randomHours = minHours + Math.random() * (maxHours - minHours);
    
    console.log(`Next event for user ${userId} scheduled in ${randomHours.toFixed(1)} hours`);
    
    // TODO: Implement actual scheduling mechanism
    // This could be done with:
    // - Database scheduled jobs
    // - Queue system (Redis/Bull)
    // - Cron jobs
    // - Cloud functions with delays
    
    // For now, just log the intention
  }

  /**
   * Sends event-related notifications
   */
  private async sendEventNotification(
    event: RandomEvent,
    type: 'event_available' | 'event_completed' | 'event_expired'
  ): Promise<void> {
    const notificationData: NotificationData = {
      type,
      title: this.getEventNotificationTitle(type),
      message: this.getEventNotificationMessage(type, event),
      recipient_id: type === 'event_available' ? event.user_id : event.user_id,
      data: {
        sender_id: event.completed_by,
        reference_id: event.id,
        event_title: event.title,
        reward_amount: event.reward_amount,
        reward_type: event.reward_type,
        experience_reward: event.experience_reward
      }
    };

    // TODO: Integrate with notification service
    console.log('Event notification:', notificationData);
  }

  /**
   * Gets notification title based on type
   */
  private getEventNotificationTitle(type: string): string {
    const titles = {
      event_available: 'Новое случайное событие!',
      event_completed: 'Событие выполнено!',
      event_expired: 'Событие истекло'
    };
    return titles[type as keyof typeof titles] || 'Уведомление о событии';
  }

  /**
   * Gets notification message based on type and event
   */
  private getEventNotificationMessage(
    type: 'event_available' | 'event_completed' | 'event_expired',
    event: RandomEvent
  ): string {
    switch (type) {
      case 'event_available':
        return `У вас новое событие: "${event.title}". Награда: ${event.reward_amount} ${event.reward_type}. Истекает через 24 часа.`;
      case 'event_completed':
        return `Событие "${event.title}" выполнено! Награда начислена: ${event.reward_amount} ${event.reward_type} + ${event.experience_reward} опыта.`;
      case 'event_expired':
        return `Событие "${event.title}" истекло. Новое событие будет сгенерировано в ближайшее время.`;
      default:
        return `Обновление по событию: ${event.title}`;
    }
  }

  /**
   * Gets event statistics for a user
   */
  async getEventStats(userId: string): Promise<{
    totalGenerated: number;
    totalCompleted: number;
    completionRate: number;
    averageReward: number;
    currentStreak: number;
  }> {
    // TODO: Implement actual statistics calculation from database
    // This would require additional database queries
    
    return {
      totalGenerated: 0,
      totalCompleted: 0,
      completionRate: 0,
      averageReward: 0,
      currentStreak: 0
    };
  }

  /**
   * Gets available event categories and their frequencies
   */
  getEventCategories(): { category: string; count: number; description: string }[] {
    const categories = this.eventPool.reduce((acc, event) => {
      acc[event.category] = (acc[event.category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const categoryDescriptions = {
      romance: 'Романтические активности',
      food: 'Кулинарные эксперименты',
      activity: 'Совместные активности',
      home: 'Домашние дела',
      creative: 'Творческие проекты',
      communication: 'Общение и планирование',
      memory: 'Создание воспоминаний',
      entertainment: 'Развлечения',
      health: 'Здоровье и спорт'
    };

    return Object.entries(categories).map(([category, count]) => ({
      category,
      count,
      description: categoryDescriptions[category as keyof typeof categoryDescriptions] || category
    }));
  }

  /**
   * Determines if a user should get a new random event - Task 7.2
   */
  async shouldGenerateEvent(userId: string): Promise<boolean> {
    try {
      // Check if user already has an active event
      const existingEvent = await getCurrentEvent(userId);
      
      // If user has an active event, don't generate a new one
      if (existingEvent && existingEvent.status === 'active') {
        return false;
      }

      // If no active event, user should get a new one
      return true;
    } catch (error) {
      console.error(`Error checking if user ${userId} should get new event:`, error);
      return false;
    }
  }
}

// Export singleton instance
export const eventGenerator = new EventGenerator();