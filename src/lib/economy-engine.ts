import {
  User,
  EnhancedWish,
  EconomyQuotas,
  GiftWishRequest,
  EnchantWishRequest,
  QuotaValidation,
  EconomyMetrics,
  NotificationData,
  EnchantmentCosts,
  PriorityCostMultiplier,
  Transaction,
} from '../types/quest-economy';
import {
  getUserById,
  getWishById,
  updateUser,
  updateWish,
  addTransaction,
  getUserTransactions,
  getEconomySettings,
  updateEconomySetting,
} from './db'; // Assuming db functions are updated/created

/**
 * Economy Engine - Manages the Mana-based economy, wish enchanting, and gifting quotas.
 */
export class EconomyEngine {
  private baseQuotas = {
    daily: 5,
    weekly: 20,
    monthly: 50,
  };

  // --- NEW: Wish Enchanting System ---

  /**
   * Applies an enchantment to a wish, deducting mana from the user.
   */
  async enchantWish(userId: string, request: EnchantWishRequest): Promise<EnhancedWish> {
    const user = await getUserById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    const wish = await getWishById(request.wish_id);
    if (!wish || wish.author_id !== userId) {
      throw new Error('Wish not found or user does not have permission to enchant it.');
    }

    const { enchantment_type, level = 1, value } = request;

    const cost = await this.calculateEnchantmentCost(enchantment_type, level);
    if (user.mana < cost) {
      throw new Error(`Insufficient mana. Required: ${cost}, Available: ${user.mana}`);
    }

    const newEnchantments = { ...wish.enchantments };
    switch (enchantment_type) {
      case 'priority':
        newEnchantments.priority = level;
        break;
      case 'aura':
        if (!value || !['romantic', 'urgent', 'playful', 'mysterious'].includes(value)) {
          throw new Error('Invalid aura value provided.');
        }
        newEnchantments.aura = value as any;
        break;
      default:
        throw new Error('Unknown enchantment type.');
    }

    user.mana -= cost;
    user.mana_spent += cost;
    await updateUser(user);

    wish.enchantments = newEnchantments;
    const updatedWish = await updateWish(wish);

    await this.recordManaTransaction({
      user_id: userId,
      type: 'debit',
      mana_amount: cost,
      description: `Enchanted wish '${wish.description.substring(0, 20)}...' with ${enchantment_type}`,
      transaction_category: 'enchantment',
      related_entity_id: wish.id,
      related_entity_type: 'wish',
    });

    return updatedWish;
  }

  /**
   * Calculates the cost of a specific enchantment.
   */
  private async calculateEnchantmentCost(type: keyof EnchantmentCosts, level: number = 1): Promise<number> {
    const settings = await getEconomySettings();
    const baseCosts: EnchantmentCosts = settings.enchantment_costs;
    const priorityMultiplier: PriorityCostMultiplier = settings.priority_cost_multiplier;

    if (!baseCosts || !baseCosts[type]) {
      throw new Error(`No cost defined for enchantment type: ${type}`);
    }
    const baseCost = baseCosts[type];

    if (type === 'priority') {
      const multiplier = priorityMultiplier[level];
      if (multiplier === undefined) throw new Error(`Invalid priority level: ${level}`);
      return baseCost * multiplier;
    }
    return baseCost;
  }

  /**
   * Grants mana to a user and records the transaction.
   */
  async grantMana(userId: string, amount: number, reason: string, category: string, referenceId?: string): Promise<void> {
    const user = await getUserById(userId);
    if (!user) throw new Error('User not found');

    user.mana += amount;
    await updateUser(user);

    await this.recordManaTransaction({
      user_id: userId,
      type: 'credit',
      mana_amount: amount,
      description: reason,
      transaction_category: category,
      related_entity_id: referenceId,
      related_entity_type: category.split('_')[0],
    });
  }

  // --- Gifting & Quota System (Refactored) ---

  async checkQuotas(userId: string): Promise<EconomyQuotas> {
    const user = await getUserById(userId);
    if (!user) throw new Error('User not found');

    await this.resetQuotasIfNeeded(user);

    const quotaLimits = await this.calculateQuotaLimits(user);
    const now = new Date();
    const dailyReset = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    const weeklyReset = new Date(now.getFullYear(), now.getMonth(), now.getDate() + (7 - now.getDay() + 1) % 7);
    const monthlyReset = new Date(now.getFullYear(), now.getMonth() + 1, 1);

    return {
      daily: { limit: quotaLimits.daily, used: user.daily_quota_used, reset_time: dailyReset },
      weekly: { limit: quotaLimits.weekly, used: user.weekly_quota_used, reset_time: weeklyReset },
      monthly: { limit: quotaLimits.monthly, used: user.monthly_quota_used, reset_time: monthlyReset },
    };
  }

  async validateGiftQuota(userId: string, giftAmount: number = 1): Promise<QuotaValidation> {
    const quotas = await this.checkQuotas(userId);
    const errors: string[] = [];

    if (quotas.daily.used + giftAmount > quotas.daily.limit) errors.push('Daily quota exceeded');
    if (quotas.weekly.used + giftAmount > quotas.weekly.limit) errors.push('Weekly quota exceeded');
    if (quotas.monthly.used + giftAmount > quotas.monthly.limit) errors.push('Monthly quota exceeded');

    const canGift = errors.length === 0;
    const remainingDaily = quotas.daily.limit - quotas.daily.used;
    const remainingWeekly = quotas.weekly.limit - quotas.weekly.used;
    const remainingMonthly = quotas.monthly.limit - quotas.monthly.used;

    return {
      isValid: canGift,
      errors,
      canGift,
      remainingQuota: Math.min(remainingDaily, remainingWeekly, remainingMonthly),
      // Simplified for brevity, a more robust solution would identify which quota is the blocker
      quotaType: 'daily',
      resetTime: quotas.daily.reset_time,
    };
  }

  async giftWish(fromUserId: string, giftRequest: GiftWishRequest): Promise<{ success: boolean; quotaUsed: number }> {
    const quotaCost = giftRequest.amount || 1;
    const quotaValidation = await this.validateGiftQuota(fromUserId, quotaCost);
    if (!quotaValidation.canGift) {
      throw new Error(`Cannot gift: ${quotaValidation.errors.join(', ')}`);
    }

    const recipient = await getUserById(giftRequest.recipient_id);
    if (!recipient) throw new Error('Recipient not found');
    if (fromUserId === giftRequest.recipient_id) throw new Error('Cannot gift to yourself');

    // This assumes a function to create a wish for another user exists
    // await createWishForUser(recipient.id, { description: giftRequest.message, author_id: fromUserId, is_gift: true });

    await this.deductFromQuotas(fromUserId, quotaCost);

    await this.recordManaTransaction({
      user_id: fromUserId,
      type: 'debit',
      mana_amount: 0,
      description: `Gift to partner ${recipient.name}`,
      transaction_category: 'gift_sent',
    });

    await this.sendGiftNotification(fromUserId, giftRequest);
    return { success: true, quotaUsed: quotaCost };
  }

  private async deductFromQuotas(userId: string, amount: number): Promise<void> {
    const user = await getUserById(userId);
    if (!user) return;
    user.daily_quota_used += amount;
    user.weekly_quota_used += amount;
    user.monthly_quota_used += amount;
    await updateUser(user);
  }

  private async resetQuotasIfNeeded(user: User): Promise<void> {
    const now = new Date();
    const lastReset = new Date(user.last_quota_reset);
    if (now.toDateString() === lastReset.toDateString()) return;

    user.daily_quota_used = 0;
    if (now.getDay() === 1) user.weekly_quota_used = 0; // Monday
    if (now.getDate() === 1) user.monthly_quota_used = 0; // 1st of month
    user.last_quota_reset = now;
    
    await updateUser(user);
  }

  private async calculateQuotaLimits(user: User): Promise<{ daily: number, weekly: number, monthly: number }> {
    // This would fetch rank bonuses from the ranks table/service
    const rankBonuses = { daily_quota_bonus: 0, weekly_quota_bonus: 0, monthly_quota_bonus: 0 }; // Placeholder
    return {
      daily: this.baseQuotas.daily + rankBonuses.daily_quota_bonus,
      weekly: this.baseQuotas.weekly + rankBonuses.weekly_quota_bonus,
      monthly: this.baseQuotas.monthly + rankBonuses.monthly_quota_bonus,
    };
  }

  // --- Transactions & Notifications (Updated) ---

  private async recordManaTransaction(tx: Omit<Transaction, 'id' | 'created_at' | 'experience_gained'>): Promise<void> {
    try {
      await addTransaction(tx as Transaction);
    } catch (error) {
      console.error('Failed to record mana transaction:', error);
    }
  }

  private async sendGiftNotification(fromUserId: string, giftRequest: GiftWishRequest): Promise<void> {
    const fromUser = await getUserById(fromUserId);
    const notificationData: NotificationData = {
      type: 'wish_gifted',
      title: 'You received a gift!',
      message: `${fromUser?.name} gifted you a wish: "${giftRequest.message}"`,
      recipient_id: giftRequest.recipient_id,
      data: { sender_id: fromUserId, message: giftRequest.message },
    };
    console.log('Sending notification:', notificationData);
    // await notificationService.send(notificationData);
  }

  // --- Metrics & Settings (Rewritten) ---

  async calculateEconomyMetrics(userId: string): Promise<EconomyMetrics> {
    const user = await getUserById(userId);
    if (!user) throw new Error("User not found");

    const transactions = await getUserTransactions(userId, 200);

    const giftsGiven = transactions.filter(t => t.transaction_category === 'gift_sent').length;
    const giftsReceived = transactions.filter(t => t.transaction_category === 'gift_received').length;
    const totalManaEarned = transactions.filter(t => t.type === 'credit').reduce((sum, t) => sum + t.mana_amount, 0);

    const quotas = await this.checkQuotas(userId);
    const quotaUtilization = {
      daily: quotas.daily.limit > 0 ? (quotas.daily.used / quotas.daily.limit) * 100 : 0,
      weekly: quotas.weekly.limit > 0 ? (quotas.weekly.used / quotas.weekly.limit) * 100 : 0,
      monthly: quotas.monthly.limit > 0 ? (quotas.monthly.used / quotas.monthly.limit) * 100 : 0,
    };

    const enchantmentCounts: { [key: string]: number } = {};
    transactions.filter(t => t.transaction_category === 'enchantment').forEach(t => {
      const type = t.description.split(' ').pop();
      if (type) enchantmentCounts[type] = (enchantmentCounts[type] || 0) + 1;
    });
    const mostUsedEnchantment = Object.keys(enchantmentCounts).length > 0
      ? Object.entries(enchantmentCounts).reduce((a, b) => a[1] > b[1] ? a : b)[0]
      : undefined;

    return {
      total_gifts_given: giftsGiven,
      total_gifts_received: giftsReceived,
      total_mana_spent: user.mana_spent,
      total_mana_earned: totalManaEarned,
      quota_utilization: quotaUtilization,
      most_used_enchantment: mostUsedEnchantment as keyof EnchantmentCosts | undefined,
      gift_frequency: 0, // Placeholder
    };
  }

  async getSettings(): Promise<Record<string, any>> {
    return await getEconomySettings();
  }

  async updateSetting(key: string, value: any, description?: string): Promise<void> {
    await updateEconomySetting(key, value, description);
  }
}

export const economyEngine = new EconomyEngine();
