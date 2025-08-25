import { db, DatabaseMonitor } from './db-pool';
import { 
  ManaEngine as IManaEngine, 
  ManaTransaction, 
  ManaAuditLog,
  MANA_TEXTS 
} from '../types/mana-system';
import { 
  InsufficientManaError,
  ManaOperationError,
  ManaValidationError,
  DatabaseError,
  logManaError,
  getUserErrorMessage
} from './mana-errors';
import { manaValidator } from './mana-validation';
import { manaTransactionManager } from './mana-transaction-manager';
import ManaCache from './mana-cache';
import { manaPerformanceMonitor, withManaPerformanceMonitoring } from './mana-performance-monitor';

/**
 * ManaEngine - Основной движок системы Маны
 * Управляет балансом Маны пользователей, начислением и списанием
 */
export class ManaEngine implements IManaEngine {
  private static instance: ManaEngine;
  private auditLogs: ManaAuditLog[] = [];

  private constructor() {}

  /**
   * Получить единственный экземпляр ManaEngine (Singleton)
   */
  public static getInstance(): ManaEngine {
    if (!ManaEngine.instance) {
      ManaEngine.instance = new ManaEngine();
    }
    return ManaEngine.instance;
  }

  /**
   * Получить текущий баланс Маны пользователя
   */
  async getUserMana(userId: string): Promise<number> {
    return ManaCache.getUserBalance(userId, async () => {
      const endTimer = DatabaseMonitor.startQuery('getUserMana');
      const startTime = Date.now();
      
      try {
        // Валидировать пользователя
        const userValidation = manaValidator.validateUser(userId);
        if (!userValidation.isValid) {
          throw manaValidator.createValidationError(userValidation, { operation: 'getUserMana' });
        }

        const result = await db.execute<{ mana_balance: number }>`
          SELECT mana_balance 
          FROM users 
          WHERE id = ${userId}
        `;

        if (result.length === 0) {
          throw new ManaOperationError('getUserMana', userId, 'User not found');
        }

        const balance = result[0].mana_balance || 0;
        
        // Record database query performance
        manaPerformanceMonitor.recordDatabaseQuery(
          'getUserMana',
          Date.now() - startTime,
          true
        );
        
        // Логирование для аудита
        this.logAuditEvent(userId, 'earn', 0, 'balance_check', { balance });
        
        return balance;
      } catch (error) {
        manaPerformanceMonitor.recordDatabaseQuery(
          'getUserMana',
          Date.now() - startTime,
          false
        );
        logManaError(error, { operation: 'getUserMana', userId });
        throw error;
      } finally {
        endTimer();
      }
    });
  }

  /**
   * Начислить Ману пользователю
   */
  async addMana(userId: string, amount: number, reason: string): Promise<void> {
    const endTimer = DatabaseMonitor.startQuery('addMana');
    const startTime = Date.now();
    let success = false;
    
    try {
      // Получить текущий баланс для валидации
      const currentBalance = await this.getUserMana(userId);
      
      // Валидировать операцию
      const validation = manaValidator.validateManaOperation(
        userId, 
        amount, 
        currentBalance, 
        'add', 
        reason
      );

      if (!validation.isValid || !validation.canProceed) {
        throw manaValidator.createValidationError(validation, { 
          operation: 'addMana',
          amount,
          currentBalance 
        });
      }

      // Выполнить операцию через менеджер транзакций
      const result = await manaTransactionManager.executeAddManaWithRollback({
        userId,
        amount,
        operation: 'add',
        reason,
        previousBalance: currentBalance,
        newBalance: currentBalance + amount
      });

      // Update cache with new balance
      ManaCache.setUserBalance(userId, result.newBalance);
      
      // Invalidate related caches
      ManaCache.onManaTransaction(userId, 'earn');

      success = true;

      // Логирование для аудита
      this.logAuditEvent(userId, 'earn', amount, reason, {
        new_balance: result.newBalance,
        previous_balance: currentBalance,
        transaction_id: result.transactionId
      });

      console.log(`Added ${amount} mana to user ${userId}. New balance: ${result.newBalance}. Reason: ${reason}`);
    } catch (error) {
      logManaError(error, { operation: 'addMana', userId, amount, reason });
      throw error;
    } finally {
      // Record performance metrics
      manaPerformanceMonitor.recordManaOperation(
        'addMana',
        userId,
        Date.now() - startTime,
        success,
        { amount, reason }
      );
      endTimer();
    }
  }

  /**
   * Списать Ману у пользователя
   */
  async spendMana(userId: string, amount: number, reason: string): Promise<boolean> {
    const endTimer = DatabaseMonitor.startQuery('spendMana');
    const startTime = Date.now();
    let success = false;
    
    try {
      // Получить текущий баланс
      const currentBalance = await this.getUserMana(userId);
      
      // Валидировать операцию
      const validation = manaValidator.validateManaOperation(
        userId, 
        amount, 
        currentBalance, 
        'spend', 
        reason
      );

      if (!validation.isValid) {
        throw manaValidator.createValidationError(validation, { 
          operation: 'spendMana',
          amount,
          currentBalance 
        });
      }

      if (!validation.canProceed) {
        // Недостаточно Маны - возвращаем false вместо исключения
        console.warn(`Insufficient mana for user ${userId}: required ${amount}, available ${currentBalance}`);
        return false;
      }

      // Выполнить операцию через менеджер транзакций
      const result = await manaTransactionManager.executeSpendManaWithRollback({
        userId,
        amount,
        operation: 'spend',
        reason,
        previousBalance: currentBalance,
        newBalance: currentBalance - amount
      });

      // Update cache with new balance
      ManaCache.setUserBalance(userId, result.newBalance);
      
      // Invalidate related caches
      ManaCache.onManaTransaction(userId, 'spend');

      success = true;

      // Логирование для аудита
      this.logAuditEvent(userId, 'spend', amount, reason, {
        new_balance: result.newBalance,
        previous_balance: currentBalance,
        transaction_id: result.transactionId
      });

      console.log(`Spent ${amount} mana for user ${userId}. New balance: ${result.newBalance}. Reason: ${reason}`);
      return true;
    } catch (error) {
      if (error instanceof InsufficientManaError) {
        console.warn(`Insufficient mana for user ${userId}: ${getUserErrorMessage(error)}`);
        return false;
      }
      
      logManaError(error, { operation: 'spendMana', userId, amount, reason });
      throw error;
    } finally {
      // Record performance metrics
      manaPerformanceMonitor.recordManaOperation(
        'spendMana',
        userId,
        Date.now() - startTime,
        success,
        { amount, reason }
      );
      endTimer();
    }
  }

  /**
   * Рассчитать награду Маны за квесты и события
   */
  calculateManaReward(questDifficulty: string, eventType: string): number {
    // Базовые награды за квесты по сложности
    const questRewards: Record<string, number> = {
      'easy': 10,
      'medium': 25,
      'hard': 50,
      'expert': 100,
      'legendary': 200
    };

    // Базовые награды за события по типу
    const eventRewards: Record<string, number> = {
      'daily': 5,
      'weekly': 20,
      'special': 50,
      'rare': 100,
      'epic': 250
    };

    let baseReward = 0;

    // Определить базовую награду
    if (questDifficulty && questRewards[questDifficulty.toLowerCase()]) {
      baseReward = questRewards[questDifficulty.toLowerCase()];
    } else if (eventType && eventRewards[eventType.toLowerCase()]) {
      baseReward = eventRewards[eventType.toLowerCase()];
    } else {
      // Значение по умолчанию для неизвестных типов
      baseReward = 10;
    }

    // Добавить случайный бонус (±20%)
    const randomMultiplier = 0.8 + Math.random() * 0.4; // 0.8 to 1.2
    const finalReward = Math.round(baseReward * randomMultiplier);

    // Минимальная награда - 1 Мана
    return Math.max(1, finalReward);
  }

  /**
   * Перевести Ману от одного пользователя к другому
   */
  async transferMana(fromUserId: string, toUserId: string, amount: number, reason: string): Promise<{
    success: boolean;
    fromBalance: number;
    toBalance: number;
  }> {
    const endTimer = DatabaseMonitor.startQuery('transferMana');
    const startTime = Date.now();
    
    try {
      // Валидация входных данных
      await manaValidator.validateUser(fromUserId);
      await manaValidator.validateUser(toUserId);
      manaValidator.validateManaAmount(amount);
      
      if (fromUserId === toUserId) {
        throw new ManaValidationError(['Cannot transfer mana to yourself']);
      }

      // Проверяем баланс отправителя
      const fromBalance = await this.getUserMana(fromUserId);
      if (fromBalance < amount) {
        throw new InsufficientManaError(amount, fromBalance, { userId: fromUserId });
      }

      // Выполняем трансфер в транзакции
      const result = await manaTransactionManager.executeManaTransaction(
        async (sql) => {
          // Списываем у отправителя
          await this.spendMana(fromUserId, amount, `Transfer to user: ${reason}`);
          
          // Начисляем получателю
          await this.addMana(toUserId, amount, `Transfer from user: ${reason}`);
          
          // Получаем новые балансы
          const newFromBalance = await this.getUserMana(fromUserId);
          const newToBalance = await this.getUserMana(toUserId);
          
          return {
            success: true,
            fromBalance: newFromBalance,
            toBalance: newToBalance
          };
        },
        {
          userId: fromUserId,
          operationType: 'transfer',
          description: `Transfer ${amount} mana to ${toUserId}: ${reason}`
        }
      );

      // Очищаем кэш для обоих пользователей
      ManaCache.invalidateAllUserData(fromUserId);
      ManaCache.invalidateAllUserData(toUserId);

      // Логируем операцию
      this.logAuditEvent(fromUserId, 'spend', amount, `Transfer to ${toUserId}: ${reason}`, {
        recipientId: toUserId,
        transferType: 'outgoing'
      });
      
      this.logAuditEvent(toUserId, 'earn', amount, `Transfer from ${fromUserId}: ${reason}`, {
        senderId: fromUserId,
        transferType: 'incoming'
      });

      // Мониторинг производительности
      manaPerformanceMonitor.recordManaOperation('addMana', toUserId, Date.now() - startTime, true, {
        operation: 'transferMana',
        fromUserId,
        amount,
        reason
      });
      
      return result;
    } catch (error: any) {
      endTimer();
      manaPerformanceMonitor.recordManaOperation('addMana', toUserId, Date.now() - startTime, false, {
        operation: 'transferMana',
        fromUserId,
        amount,
        reason,
        error: error.message
      });
      
      logManaError(error, { operation: 'transferMana', fromUserId, toUserId, amount, reason });
      throw error;
    } finally {
      endTimer();
    }
  }

  /**
   * Получить историю транзакций пользователя
   */
  async getUserTransactions(userId: string, limit: number = 50): Promise<ManaTransaction[]> {
    const endTimer = DatabaseMonitor.startQuery('getUserTransactions');
    
    try {
      if (!userId) {
        throw new Error('User ID is required');
      }

      const result = await db.execute<ManaTransaction>`
        SELECT 
          id,
          user_id,
          type,
          mana_amount,
          reason,
          reference_id,
          transaction_source,
          enhancement_id,
          created_at,
          metadata
        FROM transactions 
        WHERE user_id = ${userId} AND mana_amount > 0
        ORDER BY created_at DESC
        LIMIT ${limit}
      `;

      return result;
    } catch (error) {
      console.error('Error getting user transactions:', error);
      throw error;
    } finally {
      endTimer();
    }
  }

  /**
   * Получить статистику Маны пользователя
   */
  async getUserManaStats(userId: string): Promise<{
    current_balance: number;
    total_earned: number;
    total_spent: number;
    transaction_count: number;
    last_transaction: Date | null;
  }> {
    const endTimer = DatabaseMonitor.startQuery('getUserManaStats');
    
    try {
      if (!userId) {
        throw new Error('User ID is required');
      }

      const [balanceResult, statsResult] = await Promise.all([
        db.execute<{ mana_balance: number }>`
          SELECT mana_balance FROM users WHERE id = ${userId}
        `,
        db.execute<{
          total_earned: number;
          total_spent: number;
          transaction_count: number;
          last_transaction: Date;
        }>`
          SELECT 
            COALESCE(SUM(CASE WHEN type = 'credit' THEN mana_amount ELSE 0 END), 0) as total_earned,
            COALESCE(SUM(CASE WHEN type = 'debit' THEN mana_amount ELSE 0 END), 0) as total_spent,
            COUNT(*) as transaction_count,
            MAX(created_at) as last_transaction
          FROM transactions 
          WHERE user_id = ${userId} AND mana_amount > 0
        `
      ]);

      const balance = balanceResult[0]?.mana_balance || 0;
      const stats = statsResult[0] || {
        total_earned: 0,
        total_spent: 0,
        transaction_count: 0,
        last_transaction: null
      };

      return {
        current_balance: balance,
        total_earned: Number(stats.total_earned),
        total_spent: Number(stats.total_spent),
        transaction_count: Number(stats.transaction_count),
        last_transaction: stats.last_transaction
      };
    } catch (error) {
      console.error('Error getting user mana stats:', error);
      throw error;
    } finally {
      endTimer();
    }
  }

  /**
   * Валидировать операцию с Маной
   */
  async validateManaOperation(userId: string, amount: number, operation: 'spend' | 'add'): Promise<{
    isValid: boolean;
    errors: string[];
    currentBalance: number;
    canProceed: boolean;
  }> {
    const errors: string[] = [];
    let isValid = true;
    let canProceed = true;

    try {
      // Проверить базовые параметры
      if (!userId) {
        errors.push('User ID is required');
        isValid = false;
      }

      if (amount <= 0) {
        errors.push('Amount must be positive');
        isValid = false;
      }

      // Получить текущий баланс
      const currentBalance = await this.getUserMana(userId);

      // Для операций списания проверить достаточность средств
      if (operation === 'spend' && currentBalance < amount) {
        errors.push(MANA_TEXTS.errors.insufficientMana);
        canProceed = false;
      }

      return {
        isValid,
        errors,
        currentBalance,
        canProceed
      };
    } catch (error) {
      console.error('Error validating mana operation:', error);
      return {
        isValid: false,
        errors: ['Validation failed'],
        currentBalance: 0,
        canProceed: false
      };
    }
  }

  /**
   * Получить логи аудита
   */
  getAuditLogs(limit: number = 100): ManaAuditLog[] {
    return this.auditLogs.slice(-limit);
  }

  /**
   * Очистить логи аудита
   */
  clearAuditLogs(): void {
    this.auditLogs = [];
  }

  /**
   * Создать запись транзакции в базе данных
   */
  private async createTransaction(sql: any, transaction: Omit<ManaTransaction, 'id' | 'created_at'>): Promise<void> {
    await sql`
      INSERT INTO transactions (
        user_id, 
        type, 
        mana_amount, 
        reason, 
        reference_id,
        transaction_source,
        enhancement_id,
        metadata
      ) VALUES (
        ${transaction.user_id},
        ${transaction.type},
        ${transaction.mana_amount},
        ${transaction.reason},
        ${transaction.reference_id || null},
        ${transaction.transaction_source},
        ${transaction.enhancement_id || null},
        ${JSON.stringify(transaction.metadata || {})}
      )
    `;
  }

  /**
   * Логировать событие для аудита
   */
  private logAuditEvent(
    userId: string, 
    action: 'earn' | 'spend' | 'enhance', 
    amount: number, 
    reason: string, 
    metadata: Record<string, any>
  ): void {
    const auditLog: ManaAuditLog = {
      userId,
      action,
      amount,
      reason,
      timestamp: new Date(),
      metadata
    };

    this.auditLogs.push(auditLog);

    // Ограничить размер логов в памяти
    if (this.auditLogs.length > 1000) {
      this.auditLogs = this.auditLogs.slice(-500);
    }
  }
}

// Экспорт единственного экземпляра
export const manaEngine = ManaEngine.getInstance();

// Экспорт удобных функций
export const transferMana = (fromUserId: string, toUserId: string, amount: number, reason: string) =>
  manaEngine.transferMana(fromUserId, toUserId, amount, reason);

export const getUserMana = (userId: string) => manaEngine.getUserMana(userId);
export const addMana = (userId: string, amount: number, reason: string) => manaEngine.addMana(userId, amount, reason);
export const spendMana = (userId: string, amount: number, reason: string) => manaEngine.spendMana(userId, amount, reason);

export default manaEngine;