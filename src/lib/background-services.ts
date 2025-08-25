import { questEngine } from './quest-engine';
import { eventGenerator } from './event-generator';
import { economyEngine } from './economy-engine';
import { rankCalculator } from './rank-calculator';
import { eventNotificationSystem } from './event-notifications';
import { economyMetricsCollector } from './economy-metrics';
import { 
  getExpiredQuests,
  markQuestsAsExpired,
  getExpiredEvents,
  markEventsAsExpired,
  getAllUsers,
  resetUserQuotas,
  updateUserRank
} from './db';
import { Quest } from '../types/quest-economy';

/**
 * Background Services Manager
 * Handles automated tasks like quest expiration, event generation, quota resets, etc.
 */
export class BackgroundServices {
  private intervals: Map<string, NodeJS.Timeout> = new Map();
  private isRunning = false;

  /**
   * Start all background services
   */
  start(): void {
    if (this.isRunning) {
      console.log('Background services already running');
      return;
    }

    console.log('Starting background services...');
    this.isRunning = true;

    // Quest management - check every 5 minutes
    this.scheduleTask('quest-expiration', () => this.processQuestExpiration(), 5 * 60 * 1000);
    
    // Quest reminders - check every hour
    this.scheduleTask('quest-reminders', () => this.sendQuestReminders(), 60 * 60 * 1000);

    // Random event generation - check every 30 minutes
    this.scheduleTask('event-generation', () => this.processEventGeneration(), 30 * 60 * 1000);
    
    // Event expiration - check every 10 minutes
    this.scheduleTask('event-expiration', () => this.processEventExpiration(), 10 * 60 * 1000);
    
    // Event reminders - check every 30 minutes
    this.scheduleTask('event-reminders', () => this.sendEventReminders(), 30 * 60 * 1000);

    // Economy automation - check every hour
    this.scheduleTask('quota-reset', () => this.processQuotaResets(), 60 * 60 * 1000);
    
    // Rank calculations - check every 6 hours
    this.scheduleTask('rank-calculation', () => this.processRankCalculations(), 6 * 60 * 60 * 1000);

    // Economy metrics - check every 24 hours
    this.scheduleTask('economy-metrics', () => this.collectEconomyMetrics(), 24 * 60 * 60 * 1000);

    console.log('Background services started successfully');
  }

  /**
   * Stop all background services
   */
  stop(): void {
    if (!this.isRunning) {
      console.log('Background services not running');
      return;
    }

    console.log('Stopping background services...');
    
    this.intervals.forEach((interval, name) => {
      clearInterval(interval);
      console.log(`Stopped ${name} service`);
    });
    
    this.intervals.clear();
    this.isRunning = false;
    
    console.log('Background services stopped');
  }

  /**
   * Schedule a recurring task
   */
  private scheduleTask(name: string, task: () => Promise<void>, intervalMs: number): void {
    // Run immediately
    task().catch(error => {
      console.error(`Error in initial ${name} execution:`, error);
    });

    // Schedule recurring execution
    const interval = setInterval(async () => {
      try {
        await task();
      } catch (error) {
        console.error(`Error in ${name} background task:`, error);
      }
    }, intervalMs);

    this.intervals.set(name, interval);
    console.log(`Scheduled ${name} to run every ${intervalMs / 1000} seconds`);
  }

  /**
   * Process quest expiration - Task 7.1
   */
  async processQuestExpiration(): Promise<void> {
    try {
      console.log('Processing quest expiration...');
      
      const result = await questEngine.processExpiredQuests();
      
      if (result.expiredCount > 0) {
        console.log(`Expired ${result.expiredCount} quests, sent ${result.notificationsSent} notifications`);
      }
    } catch (error) {
      console.error('Error processing quest expiration:', error);
      throw error;
    }
  }

  /**
   * Send quest reminder notifications - Task 7.1
   */
  async sendQuestReminders(): Promise<void> {
    try {
      console.log('Processing quest reminders...');
      
      // Get quests that are due within 24 hours
      const upcomingQuests = await this.getUpcomingQuests();
      
      let remindersSent = 0;
      
      for (const quest of upcomingQuests) {
        try {
          await this.sendQuestReminder(quest);
          remindersSent++;
        } catch (error) {
          console.error(`Failed to send reminder for quest ${quest.id}:`, error);
        }
      }
      
      if (remindersSent > 0) {
        console.log(`Sent ${remindersSent} quest reminders`);
      }
    } catch (error) {
      console.error('Error sending quest reminders:', error);
      throw error;
    }
  }

  /**
   * Process random event generation - Task 7.2
   */
  async processEventGeneration(): Promise<void> {
    try {
      console.log('Processing event generation...');
      
      const users = await getAllUsers();
      let eventsGenerated = 0;
      
      for (const user of users) {
        try {
          // Check if user needs a new event
          const needsEvent = await eventGenerator.shouldGenerateEvent(user.id);
          
          if (needsEvent) {
            await eventGenerator.generateRandomEvent(user.id);
            eventsGenerated++;
          }
        } catch (error) {
          console.error(`Failed to generate event for user ${user.id}:`, error);
        }
      }
      
      if (eventsGenerated > 0) {
        console.log(`Generated ${eventsGenerated} new random events`);
      }
    } catch (error) {
      console.error('Error processing event generation:', error);
      throw error;
    }
  }

  /**
   * Process event expiration and cleanup - Task 7.2
   */
  async processEventExpiration(): Promise<void> {
    try {
      console.log('Processing event expiration...');
      
      const expiredEvents = await getExpiredEvents();
      
      if (expiredEvents.length > 0) {
        const expiredCount = await markEventsAsExpired();
        console.log(`Expired ${expiredCount} events`);
        
        // Generate new events for users whose events expired
        for (const event of expiredEvents) {
          try {
            await eventGenerator.generateRandomEvent(event.user_id);
          } catch (error) {
            console.error(`Failed to generate replacement event for user ${event.user_id}:`, error);
          }
        }
      }
    } catch (error) {
      console.error('Error processing event expiration:', error);
      throw error;
    }
  }

  /**
   * Process quota resets - Task 7.3
   */
  async processQuotaResets(): Promise<void> {
    try {
      console.log('Processing quota resets...');
      
      const users = await getAllUsers();
      let quotasReset = 0;
      
      for (const user of users) {
        try {
          const wasReset = await economyEngine.checkAndResetQuotas(user.id);
          if (wasReset) {
            quotasReset++;
          }
        } catch (error) {
          console.error(`Failed to reset quotas for user ${user.id}:`, error);
        }
      }
      
      if (quotasReset > 0) {
        console.log(`Reset quotas for ${quotasReset} users`);
      }
    } catch (error) {
      console.error('Error processing quota resets:', error);
      throw error;
    }
  }

  /**
   * Process automatic rank calculations - Task 7.3
   */
  async processRankCalculations(): Promise<void> {
    try {
      console.log('Processing rank calculations...');
      
      const users = await getAllUsers();
      let ranksUpdated = 0;
      
      for (const user of users) {
        try {
          const newRank = await rankCalculator.updateUserRank(user.id);
          if (newRank) {
            ranksUpdated++;
          }
        } catch (error) {
          console.error(`Failed to update rank for user ${user.id}:`, error);
        }
      }
      
      if (ranksUpdated > 0) {
        console.log(`Updated ranks for ${ranksUpdated} users`);
      }
    } catch (error) {
      console.error('Error processing rank calculations:', error);
      throw error;
    }
  }

  /**
   * Collect economy metrics - Task 7.3
   */
  async collectEconomyMetrics(): Promise<void> {
    try {
      console.log('Collecting economy metrics...');
      
      const metrics = await economyMetricsCollector.collectSystemMetrics();
      
      // Log metrics for monitoring
      console.log('Economy metrics collected:', {
        totalUsers: metrics.users.total,
        activeUsers: metrics.users.active,
        quotaUtilization: metrics.quotas.totalQuotaUtilization,
        newUsersThisWeek: metrics.users.newThisWeek
      });
      
      // Store metrics in database for historical tracking
      await economyMetricsCollector.storeMetrics(metrics);
      
      // Generate and log report
      const report = await economyMetricsCollector.generateMetricsReport();
      console.log('Metrics Report:', report.summary);
      
      if (report.alerts.length > 0) {
        console.warn('Metrics Alerts:', report.alerts);
      }
      
      if (report.recommendations.length > 0) {
        console.log('Metrics Recommendations:', report.recommendations);
      }
    } catch (error) {
      console.error('Error collecting economy metrics:', error);
      throw error;
    }
  }

  /**
   * Get quests that are due within 24 hours
   */
  private async getUpcomingQuests(): Promise<Quest[]> {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    // This would need a new database function
    // For now, we'll implement a basic version
    return [];
  }

  /**
   * Send reminder notification for a quest
   */
  private async sendQuestReminder(quest: Quest): Promise<void> {
    // Implementation would integrate with notification system
    console.log(`Sending reminder for quest: ${quest.title} (due: ${quest.due_date})`);
  }

  /**
   * Send event reminder notifications - Task 7.2
   */
  async sendEventReminders(): Promise<void> {
    try {
      console.log('Processing event reminders...');
      
      const remindersSent = await eventNotificationSystem.checkAndSendEventReminders();
      
      if (remindersSent > 0) {
        console.log(`Sent ${remindersSent} event reminders`);
      }
    } catch (error) {
      console.error('Error sending event reminders:', error);
      throw error;
    }
  }

  /**
   * Store economy metrics in database
   */
  private async storeMetrics(metrics: any): Promise<void> {
    // Implementation would store metrics in a metrics table
    console.log('Storing metrics:', metrics);
  }

  /**
   * Get service status
   */
  getStatus(): { isRunning: boolean; services: string[] } {
    const services: string[] = [];
    this.intervals.forEach((_, name) => {
      services.push(name);
    });
    
    return {
      isRunning: this.isRunning,
      services
    };
  }
}

// Export singleton instance
export const backgroundServices = new BackgroundServices();