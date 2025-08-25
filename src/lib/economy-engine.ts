import {
  User,
  EconomyQuotas,
  GiftWishRequest,
  QuotaValidation,
  EconomyMetrics,
  NotificationData,
  EconomySetting
} from '../types/quest-economy';
import {
  getUserByTelegramId,
  getUserById,
  createUser,
  createGiftWish,
  addTransaction,
  getUserTransactions
} from './db';

/**
 * Economy Engine - Manages quota system, gift functionality, and economic metrics
 * Handles quota validation, resets, gift processing, and economy calculations
 */
export class EconomyEngine {
  
  // Base quota limits (can be enhanced by rank bonuses)
  private baseQuotas = {
    daily: 5,
    weekly: 20,
    monthly: 50
  };

  /**
   * Checks and returns current quota status for a user
   */
  async checkQuotas(userId: string): Promise<EconomyQuotas> {
    // Get user data
    const user = await this.getUserById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    // Check if quotas need to be reset
    await this.resetQuotasIfNeeded(user);

    // Get current quota limits (base + rank bonuses)
    const quotaLimits = await this.calculateQuotaLimits(user);

    // Calculate reset times
    const now = new Date();
    const dailyReset = new Date(now);
    dailyReset.setDate(dailyReset.getDate() + 1);
    dailyReset.setHours(0, 0, 0, 0);

    const weeklyReset = new Date(now);
    const daysUntilMonday = (7 - now.getDay() + 1) % 7 || 7;
    weeklyReset.setDate(weeklyReset.getDate() + daysUntilMonday);
    weeklyReset.setHours(0, 0, 0, 0);

    const monthlyReset = new Date(now.getFullYear(), now.getMonth() + 1, 1);

    return {
      daily: {
        limit: quotaLimits.daily,
        used: user.daily_quota_used,
        reset_time: dailyReset
      },
      weekly: {
        limit: quotaLimits.weekly,
        used: user.weekly_quota_used,
        reset_time: weeklyReset
      },
      monthly: {
        limit: quotaLimits.monthly,
        used: user.monthly_quota_used,
        reset_time: monthlyReset
      }
    };
  }

  /**
   * Validates if a user can gift wishes based on quotas
   */
  async validateGiftQuota(
    userId: string,
    giftAmount: number = 1
  ): Promise<QuotaValidation> {
    const quotas = await this.checkQuotas(userId);
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check daily quota
    if (quotas.daily.used + giftAmount > quotas.daily.limit) {
      errors.push(`Daily quota exceeded. Used: ${quotas.daily.used}/${quotas.daily.limit}, trying to gift: ${giftAmount}`);
    }

    // Check weekly quota
    if (quotas.weekly.used + giftAmount > quotas.weekly.limit) {
      errors.push(`Weekly quota exceeded. Used: ${quotas.weekly.used}/${quotas.weekly.limit}, trying to gift: ${giftAmount}`);
    }

    // Check monthly quota
    if (quotas.monthly.used + giftAmount > quotas.monthly.limit) {
      errors.push(`Monthly quota exceeded. Used: ${quotas.monthly.used}/${quotas.monthly.limit}, trying to gift: ${giftAmount}`);
    }

    // Warnings for high usage
    if (quotas.daily.used + giftAmount > quotas.daily.limit * 0.8) {
      warnings.push(`Approaching daily quota limit (${quotas.daily.used + giftAmount}/${quotas.daily.limit})`);
    }

    const canGift = errors.length === 0;
    let quotaType: 'daily' | 'weekly' | 'monthly' = 'daily';
    let remainingQuota = quotas.daily.limit - quotas.daily.used;
    let resetTime = quotas.daily.reset_time;

    // Find the most restrictive quota
    const weeklyRemaining = quotas.weekly.limit - quotas.weekly.used;
    const monthlyRemaining = quotas.monthly.limit - quotas.monthly.used;

    if (weeklyRemaining < remainingQuota) {
      quotaType = 'weekly';
      remainingQuota = weeklyRemaining;
      resetTime = quotas.weekly.reset_time;
    }

    if (monthlyRemaining < remainingQuota) {
      quotaType = 'monthly';
      remainingQuota = monthlyRemaining;
      resetTime = quotas.monthly.reset_time;
    }

    return {
      isValid: canGift,
      errors,
      warnings,
      canGift,
      quotaType,
      remainingQuota: Math.max(0, remainingQuota),
      resetTime
    };
  }

  /**
   * Processes a gift wish with quota validation and deduction
   */
  async giftWish(
    fromUserId: string,
    giftRequest: GiftWishRequest
  ): Promise<{ success: boolean; wishes: any[]; quotaUsed: number }> {
    const giftAmount = giftRequest.amount || 1;

    // Validate quota
    const quotaValidation = await this.validateGiftQuota(fromUserId, giftAmount);
    if (!quotaValidation.canGift) {
      throw new Error(`Cannot gift wishes: ${quotaValidation.errors.join(', ')}`);
    }

    // Verify recipient exists
    const recipient = await this.getUserById(giftRequest.recipient_id);
    if (!recipient) {
      throw new Error('Recipient not found');
    }

    // Verify not gifting to self
    if (fromUserId === giftRequest.recipient_id) {
      throw new Error('Cannot gift wishes to yourself');
    }

    try {
      // Create gift wishes
      const wishes = await createGiftWish(
        giftRequest.type,
        fromUserId,
        giftRequest.recipient_id,
        giftAmount,
        giftRequest.message
      );

      // Deduct from quotas
      await this.deductFromQuotas(fromUserId, giftAmount);

      // Record gift transaction for metrics
      await this.recordGiftTransaction(fromUserId, giftRequest, giftAmount);

      // Send notifications
      await this.sendGiftNotification(fromUserId, giftRequest, giftAmount);

      return {
        success: true,
        wishes,
        quotaUsed: giftAmount
      };
    } catch (error) {
      console.error('Failed to process gift:', error);
      throw new Error('Failed to process gift wish');
    }
  }

  /**
   * Resets quotas if needed based on time periods
   */
  async resetQuotasIfNeeded(user: User): Promise<boolean> {
    const now = new Date();
    const lastReset = new Date(user.last_quota_reset);
    let needsReset = false;

    // Check if we need to reset daily quota (new day)
    if (now.getDate() !== lastReset.getDate() || 
        now.getMonth() !== lastReset.getMonth() || 
        now.getFullYear() !== lastReset.getFullYear()) {
      needsReset = true;
    }

    if (needsReset) {
      await this.performQuotaReset(user.id, now);
      return true;
    }

    return false;
  }

  /**
   * Performs actual quota reset in database
   */
  private async performQuotaReset(userId: string, resetDate: Date): Promise<void> {
    // TODO: Implement database update for quota reset
    // This would update the user's quota fields and last_quota_reset date
    console.log(`Resetting quotas for user ${userId} on ${resetDate.toISOString()}`);
    
    // In a real implementation, this would be:
    // await sql`
    //   UPDATE users 
    //   SET daily_quota_used = 0, 
    //       weekly_quota_used = CASE 
    //         WHEN EXTRACT(DOW FROM ${resetDate}) = 1 THEN 0 
    //         ELSE weekly_quota_used 
    //       END,
    //       monthly_quota_used = CASE 
    //         WHEN EXTRACT(DAY FROM ${resetDate}) = 1 THEN 0 
    //         ELSE monthly_quota_used 
    //       END,
    //       last_quota_reset = ${resetDate}
    //   WHERE id = ${userId}
    // `;
  }

  /**
   * Calculates quota limits including rank bonuses
   */
  private async calculateQuotaLimits(user: User): Promise<{
    daily: number;
    weekly: number;
    monthly: number;
  }> {
    // TODO: Get rank bonuses from rank system
    // For now, use base quotas
    const rankBonuses = await this.getRankBonuses(user.rank);

    return {
      daily: this.baseQuotas.daily + rankBonuses.daily_quota_bonus,
      weekly: this.baseQuotas.weekly + rankBonuses.weekly_quota_bonus,
      monthly: this.baseQuotas.monthly + rankBonuses.monthly_quota_bonus
    };
  }

  /**
   * Gets rank bonuses for quota calculations
   */
  private async getRankBonuses(rank: string): Promise<{
    daily_quota_bonus: number;
    weekly_quota_bonus: number;
    monthly_quota_bonus: number;
  }> {
    // TODO: Implement actual rank bonus lookup from database
    // For now, return default bonuses based on rank
    const rankBonuses = {
      'Рядовой': { daily_quota_bonus: 0, weekly_quota_bonus: 0, monthly_quota_bonus: 0 },
      'Ефрейтор': { daily_quota_bonus: 1, weekly_quota_bonus: 2, monthly_quota_bonus: 5 },
      'Младший сержант': { daily_quota_bonus: 2, weekly_quota_bonus: 5, monthly_quota_bonus: 10 },
      'Сержант': { daily_quota_bonus: 3, weekly_quota_bonus: 8, monthly_quota_bonus: 15 },
      'Старший сержант': { daily_quota_bonus: 4, weekly_quota_bonus: 12, monthly_quota_bonus: 20 }
    };

    return rankBonuses[rank as keyof typeof rankBonuses] || rankBonuses['Рядовой'];
  }

  /**
   * Deducts gift amount from user quotas
   */
  private async deductFromQuotas(userId: string, amount: number): Promise<void> {
    // TODO: Implement database update to deduct from quotas
    console.log(`Deducting ${amount} from quotas for user ${userId}`);
    
    // In a real implementation:
    // await sql`
    //   UPDATE users 
    //   SET daily_quota_used = daily_quota_used + ${amount},
    //       weekly_quota_used = weekly_quota_used + ${amount},
    //       monthly_quota_used = monthly_quota_used + ${amount}
    //   WHERE id = ${userId}
    // `;
  }

  /**
   * Records gift transaction for metrics and tracking
   */
  private async recordGiftTransaction(
    fromUserId: string,
    giftRequest: GiftWishRequest,
    amount: number
  ): Promise<void> {
    try {
      await addTransaction(
        fromUserId,
        'debit',
        'green', // Placeholder - gifts don't actually debit balance
        0, // No actual balance change for gifts
        `Gift to partner: ${amount} ${giftRequest.type} wishes`,
        undefined // No reference ID for gifts
      );
    } catch (error) {
      console.error('Failed to record gift transaction:', error);
    }
  }

  /**
   * Sends gift notification to recipient
   */
  private async sendGiftNotification(
    fromUserId: string,
    giftRequest: GiftWishRequest,
    amount: number
  ): Promise<void> {
    const notificationData: NotificationData = {
      type: 'wish_gifted',
      title: 'Получен подарок!',
      message: `Вам подарили ${amount} ${giftRequest.type} ${amount === 1 ? 'желание' : 'желаний'}${giftRequest.message ? `: ${giftRequest.message}` : ''}`,
      recipient_id: giftRequest.recipient_id,
      data: {
        sender_id: fromUserId,
        gift_type: giftRequest.type,
        gift_amount: amount,
        gift_message: giftRequest.message
      }
    };

    // TODO: Integrate with notification service
    console.log('Gift notification:', notificationData);
  }

  /**
   * Calculates economy metrics for a user
   */
  async calculateEconomyMetrics(userId: string): Promise<EconomyMetrics> {
    // Get user transactions for analysis
    const transactions = await getUserTransactions(userId, 100);
    
    // Filter gift-related transactions
    const giftTransactions = transactions.filter(t => 
      t.reason.includes('Gift') || t.transaction_category === 'gift'
    );

    const giftsGiven = giftTransactions.filter(t => t.type === 'debit').length;
    const giftsReceived = giftTransactions.filter(t => t.type === 'credit').length;

    // Calculate quota utilization
    const quotas = await this.checkQuotas(userId);
    const quotaUtilization = {
      daily: quotas.daily.limit > 0 ? (quotas.daily.used / quotas.daily.limit) * 100 : 0,
      weekly: quotas.weekly.limit > 0 ? (quotas.weekly.used / quotas.weekly.limit) * 100 : 0,
      monthly: quotas.monthly.limit > 0 ? (quotas.monthly.used / quotas.monthly.limit) * 100 : 0
    };

    // Analyze most gifted type
    const typeCount = { green: 0, blue: 0, red: 0 };
    giftTransactions.forEach(t => {
      if (t.type === 'debit') {
        typeCount[t.wish_type as keyof typeof typeCount]++;
      }
    });

    const mostGiftedType = Object.entries(typeCount).reduce((a, b) => 
      typeCount[a[0] as keyof typeof typeCount] > typeCount[b[0] as keyof typeof typeCount] ? a : b
    )[0] as 'green' | 'blue' | 'red';

    // Calculate gift frequency (gifts per week)
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    const recentGifts = giftTransactions.filter(t => 
      new Date(t.created_at) > oneWeekAgo && t.type === 'debit'
    ).length;

    return {
      total_gifts_given: giftsGiven,
      total_gifts_received: giftsReceived,
      quota_utilization: quotaUtilization,
      most_gifted_type: mostGiftedType || 'green',
      gift_frequency: recentGifts
    };
  }

  /**
   * Gets economy settings from database
   */
  async getEconomySettings(): Promise<Record<string, any>> {
    // TODO: Implement database query for economy settings
    // For now, return default settings
    return {
      daily_gift_base_limit: this.baseQuotas.daily,
      weekly_gift_base_limit: this.baseQuotas.weekly,
      monthly_gift_base_limit: this.baseQuotas.monthly,
      gift_types: ['green', 'blue', 'red'],
      max_gift_amount_per_transaction: 10,
      quota_reset_times: {
        daily: '00:00',
        weekly: 'monday_00:00',
        monthly: 'first_day_00:00'
      }
    };
  }

  /**
   * Updates economy settings (admin function)
   */
  async updateEconomySettings(
    settingKey: string,
    settingValue: any,
    description?: string
  ): Promise<void> {
    // TODO: Implement database update for economy settings
    console.log(`Updating economy setting ${settingKey} to:`, settingValue);
    
    // In a real implementation:
    // await sql`
    //   INSERT INTO economy_settings (setting_key, setting_value, description, updated_at)
    //   VALUES (${settingKey}, ${JSON.stringify(settingValue)}, ${description}, NOW())
    //   ON CONFLICT (setting_key) 
    //   DO UPDATE SET setting_value = ${JSON.stringify(settingValue)}, 
    //                 description = ${description}, 
    //                 updated_at = NOW()
    // `;
  }

  /**
   * Gets user by ID (helper method)
   */
  private async getUserById(userId: string): Promise<User | null> {
    return await getUserById(userId);
  }

  /**
   * Processes bulk gift operations (for special events)
   */
  async processBulkGift(
    fromUserId: string,
    recipients: string[],
    giftType: 'green' | 'blue' | 'red',
    amount: number = 1,
    message?: string
  ): Promise<{ successful: number; failed: number; errors: string[] }> {
    let successful = 0;
    let failed = 0;
    const errors: string[] = [];

    for (const recipientId of recipients) {
      try {
        await this.giftWish(fromUserId, {
          recipient_id: recipientId,
          type: giftType,
          amount,
          message
        });
        successful++;
      } catch (error) {
        failed++;
        errors.push(`Failed to gift to ${recipientId}: ${error}`);
      }
    }

    return { successful, failed, errors };
  }

  /**
   * Gets quota usage history for analytics
   */
  async getQuotaUsageHistory(
    userId: string,
    days: number = 30
  ): Promise<Array<{ date: string; daily_used: number; weekly_used: number; monthly_used: number }>> {
    // TODO: Implement quota usage history tracking
    // This would require storing daily snapshots of quota usage
    console.log(`Getting quota usage history for user ${userId} for ${days} days`);
    return [];
  }

  /**
   * Calculates optimal gift timing based on quota usage patterns
   */
  async getOptimalGiftTiming(userId: string): Promise<{
    bestTimeOfDay: string;
    bestDayOfWeek: string;
    recommendedAmount: number;
    reasoning: string;
  }> {
    // TODO: Implement ML-based optimal timing calculation
    // For now, return basic recommendations
    const quotas = await this.checkQuotas(userId);
    const metrics = await this.calculateEconomyMetrics(userId);

    let recommendedAmount = 1;
    let reasoning = 'Standard gift amount';

    if (quotas.daily.used < quotas.daily.limit * 0.5) {
      recommendedAmount = 2;
      reasoning = 'You have plenty of daily quota remaining';
    }

    return {
      bestTimeOfDay: '18:00-20:00',
      bestDayOfWeek: 'Friday',
      recommendedAmount,
      reasoning
    };
  }

  /**
   * Checks and resets quotas if needed - Task 7.3
   */
  async checkAndResetQuotas(userId: string): Promise<boolean> {
    try {
      const user = await this.getUserById(userId);
      if (!user) {
        console.error(`User not found: ${userId}`);
        return false;
      }

      return await this.resetQuotasIfNeeded(user);
    } catch (error) {
      console.error(`Error checking quotas for user ${userId}:`, error);
      return false;
    }
  }

  /**
   * Collects system-wide economy metrics - Task 7.3
   */
  async collectSystemMetrics(): Promise<{
    totalUsers: number;
    activeUsers: number;
    totalTransactions: number;
    averageBalance: { green: number; blue: number; red: number };
    quotaUtilization: { daily: number; weekly: number; monthly: number };
    totalGiftsToday: number;
    totalGiftsThisWeek: number;
    totalGiftsThisMonth: number;
  }> {
    try {
      // Import the metrics collector here to avoid circular dependencies
      const { economyMetricsCollector } = await import('./economy-metrics');
      
      const fullMetrics = await economyMetricsCollector.collectSystemMetrics();
      
      // Transform to the expected format
      const metrics = {
        totalUsers: fullMetrics.users.total,
        activeUsers: fullMetrics.users.active,
        totalTransactions: fullMetrics.transactions.total,
        averageBalance: {
          green: fullMetrics.balances.averageGreen,
          blue: fullMetrics.balances.averageBlue,
          red: fullMetrics.balances.averageRed
        },
        quotaUtilization: {
          daily: fullMetrics.quotas.averageDailyUsage,
          weekly: fullMetrics.quotas.averageWeeklyUsage,
          monthly: fullMetrics.quotas.averageMonthlyUsage
        },
        totalGiftsToday: fullMetrics.gifts.totalToday,
        totalGiftsThisWeek: fullMetrics.gifts.totalThisWeek,
        totalGiftsThisMonth: fullMetrics.gifts.totalThisMonth
      };

      console.log('Collected system metrics:', metrics);
      return metrics;
    } catch (error) {
      console.error('Error collecting system metrics:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const economyEngine = new EconomyEngine();