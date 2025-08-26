/**
 * Менеджер транзакций для системы Маны
 * Обеспечивает откат операций при ошибках и целостность данных
 */

import { db } from './db-pool';
import { 
  TransactionError,
  ManaOperationError,
  EnhancementError,
  DatabaseError,
  logManaError
} from './mana-errors';
import { Enhancement, ManaTransaction } from '../types/mana-system';

// Интерфейсы для операций транзакций
export interface TransactionContext {
  id: string;
  startTime: Date;
  operations: TransactionOperation[];
  rollbackAttempted: boolean;
  completed: boolean;
}

export interface TransactionOperation {
  type: 'mana_spend' | 'mana_add' | 'enhancement_create' | 'enhancement_remove' | 'wish_update';
  data: Record<string, any>;
  rollbackData?: Record<string, any>;
  completed: boolean;
}

export interface ManaTransactionData {
  userId: string;
  amount: number;
  operation: 'spend' | 'add';
  reason: string;
  previousBalance: number;
  newBalance: number;
}

export interface EnhancementTransactionData {
  wishId: string;
  userId: string;
  enhancementType: 'priority' | 'aura';
  level?: number;
  auraType?: string;
  cost: number;
  previousLevel?: number;
  previousAura?: string;
}

/**
 * Менеджер транзакций для безопасных операций с Маной
 */
export class ManaTransactionManager {
  private static instance: ManaTransactionManager;
  private activeTransactions: Map<string, TransactionContext> = new Map();

  private constructor() {}

  public static getInstance(): ManaTransactionManager {
    if (!ManaTransactionManager.instance) {
      ManaTransactionManager.instance = new ManaTransactionManager();
    }
    return ManaTransactionManager.instance;
  }

  /**
   * Выполнить операцию с Маной в транзакции
   */
  async executeManaTransaction<T>(
    operation: (sql: any) => Promise<T>,
    context: {
      userId: string;
      operationType: string;
      description: string;
    }
  ): Promise<T> {
    const transactionId = this.generateTransactionId();
    const transactionContext: TransactionContext = {
      id: transactionId,
      startTime: new Date(),
      operations: [],
      rollbackAttempted: false,
      completed: false
    };

    this.activeTransactions.set(transactionId, transactionContext);

    try {
      console.log(`Starting mana transaction ${transactionId}: ${context.description}`);

      const result = await db.transaction(async (sql) => {
        try {
          const operationResult = await operation(sql);
          transactionContext.completed = true;
          
          console.log(`Mana transaction ${transactionId} completed successfully`);
          return operationResult;
        } catch (error) {
          console.error(`Error in mana transaction ${transactionId}:`, error);
          throw error;
        }
      });

      return result;
    } catch (error) {
      transactionContext.rollbackAttempted = true;
      
      logManaError(error, {
        transactionId,
        userId: context.userId,
        operationType: context.operationType,
        description: context.description
      });

      if (error instanceof Error) {
        throw new TransactionError(
          `Transaction failed: ${error.message}`,
          transactionId,
          true,
          {
            userId: context.userId,
            operationType: context.operationType,
            originalError: error.message
          }
        );
      }

      throw new TransactionError(
        'Unknown transaction error',
        transactionId,
        true,
        { userId: context.userId, operationType: context.operationType }
      );
    } finally {
      this.activeTransactions.delete(transactionId);
    }
  }

  /**
   * Выполнить операцию списания Маны с откатом
   */
  async executeSpendManaWithRollback(
    transactionData: ManaTransactionData
  ): Promise<{ success: boolean; newBalance: number; transactionId: string }> {
    const transactionId = this.generateTransactionId();

    return this.executeManaTransaction(
      async (sql) => {
        // Проверить текущий баланс
        const balanceResult = await sql`
          SELECT mana_balance FROM users WHERE id = ${transactionData.userId}
        `;

        if (balanceResult.length === 0) {
          throw new ManaOperationError(
            'spend',
            transactionData.userId,
            'User not found'
          );
        }

        const currentBalance = balanceResult[0].mana_balance;

        if (currentBalance < transactionData.amount) {
          throw new ManaOperationError(
            'spend',
            transactionData.userId,
            `Insufficient mana: required ${transactionData.amount}, available ${currentBalance}`
          );
        }

        // Списать Ману
        const updateResult = await sql`
          UPDATE users 
          SET mana_balance = mana_balance - ${transactionData.amount}
          WHERE id = ${transactionData.userId} AND mana_balance >= ${transactionData.amount}
          RETURNING mana_balance
        `;

        if (updateResult.length === 0) {
          throw new ManaOperationError(
            'spend',
            transactionData.userId,
            'Failed to update mana balance - insufficient funds or concurrent modification'
          );
        }

        const newBalance = updateResult[0].mana_balance;

        // Создать запись транзакции
        await sql`
          INSERT INTO transactions (
            user_id, 
            type, 
            wish_type,
            amount,
            mana_amount, 
            reason, 
            transaction_category,
            transaction_source,
            experience_gained,
            metadata
          ) VALUES (
            ${transactionData.userId},
            'debit',
            NULL,
            0,
            ${transactionData.amount},
            ${transactionData.reason},
            'manual',
            'mana_transaction_manager',
            0,
            ${JSON.stringify({
              transaction_id: transactionId,
              previous_balance: currentBalance,
              new_balance: newBalance,
              operation_type: 'spend'
            })}
          )
        `;

        console.log(`Spent ${transactionData.amount} mana for user ${transactionData.userId}. Balance: ${currentBalance} -> ${newBalance}`);

        return {
          success: true,
          newBalance,
          transactionId
        };
      },
      {
        userId: transactionData.userId,
        operationType: 'spend_mana',
        description: `Spend ${transactionData.amount} mana: ${transactionData.reason}`
      }
    );
  }

  /**
   * Выполнить операцию начисления Маны с откатом
   */
  async executeAddManaWithRollback(
    transactionData: ManaTransactionData
  ): Promise<{ success: boolean; newBalance: number; transactionId: string }> {
    const transactionId = this.generateTransactionId();

    return this.executeManaTransaction(
      async (sql) => {
        // Получить текущий баланс
        const balanceResult = await sql`
          SELECT mana_balance FROM users WHERE id = ${transactionData.userId}
        `;

        if (balanceResult.length === 0) {
          throw new ManaOperationError(
            'add',
            transactionData.userId,
            'User not found'
          );
        }

        const currentBalance = balanceResult[0].mana_balance;

        // Проверить максимальный баланс
        const newBalance = currentBalance + transactionData.amount;
        if (newBalance > 1000000) {
          throw new ManaOperationError(
            'add',
            transactionData.userId,
            `Maximum balance exceeded: ${newBalance} > 1,000,000`
          );
        }

        // Начислить Ману
        const updateResult = await sql`
          UPDATE users 
          SET mana_balance = mana_balance + ${transactionData.amount}
          WHERE id = ${transactionData.userId}
          RETURNING mana_balance
        `;

        if (updateResult.length === 0) {
          throw new ManaOperationError(
            'add',
            transactionData.userId,
            'Failed to update mana balance'
          );
        }

        const finalBalance = updateResult[0].mana_balance;

        // Создать запись транзакции
        await sql`
          INSERT INTO transactions (
            user_id, 
            type, 
            wish_type,
            amount,
            mana_amount, 
            reason, 
            transaction_category,
            transaction_source,
            experience_gained,
            metadata
          ) VALUES (
            ${transactionData.userId},
            'credit',
            NULL,
            0,
            ${transactionData.amount},
            ${transactionData.reason},
            'manual',
            'mana_transaction_manager',
            0,
            ${JSON.stringify({
              transaction_id: transactionId,
              previous_balance: currentBalance,
              new_balance: finalBalance,
              operation_type: 'add'
            })}
          )
        `;

        console.log(`Added ${transactionData.amount} mana for user ${transactionData.userId}. Balance: ${currentBalance} -> ${finalBalance}`);

        return {
          success: true,
          newBalance: finalBalance,
          transactionId
        };
      },
      {
        userId: transactionData.userId,
        operationType: 'add_mana',
        description: `Add ${transactionData.amount} mana: ${transactionData.reason}`
      }
    );
  }

  /**
   * Выполнить применение усиления с откатом
   */
  async executeEnhancementWithRollback(
    transactionData: EnhancementTransactionData
  ): Promise<{ success: boolean; enhancement: Enhancement; remainingMana: number; transactionId: string }> {
    const transactionId = this.generateTransactionId();

    return this.executeManaTransaction(
      async (sql) => {
        // Проверить баланс пользователя
        const balanceResult = await sql`
          SELECT mana_balance FROM users WHERE id = ${transactionData.userId}
        `;

        if (balanceResult.length === 0) {
          throw new EnhancementError(
            'User not found',
            transactionData.wishId,
            transactionData.enhancementType
          );
        }

        const currentBalance = balanceResult[0].mana_balance;

        if (currentBalance < transactionData.cost) {
          throw new EnhancementError(
            `Insufficient mana: required ${transactionData.cost}, available ${currentBalance}`,
            transactionData.wishId,
            transactionData.enhancementType
          );
        }

        // Списать Ману
        const spendResult = await sql`
          UPDATE users 
          SET mana_balance = mana_balance - ${transactionData.cost}
          WHERE id = ${transactionData.userId} AND mana_balance >= ${transactionData.cost}
          RETURNING mana_balance
        `;

        if (spendResult.length === 0) {
          throw new EnhancementError(
            'Failed to spend mana for enhancement',
            transactionData.wishId,
            transactionData.enhancementType
          );
        }

        const remainingMana = spendResult[0].mana_balance;

        // Удалить предыдущее усиление того же типа (если есть)
        if (transactionData.enhancementType === 'priority' && transactionData.previousLevel) {
          await sql`
            DELETE FROM wish_enhancements 
            WHERE wish_id = ${transactionData.wishId} AND type = 'priority'
          `;
        }

        // Создать новое усиление
        const enhancementResult = await sql`
          INSERT INTO wish_enhancements (
            wish_id, 
            type, 
            level, 
            aura_type,
            cost, 
            applied_by,
            metadata
          ) VALUES (
            ${transactionData.wishId},
            ${transactionData.enhancementType},
            ${transactionData.level || 1},
            ${transactionData.auraType || null},
            ${transactionData.cost},
            ${transactionData.userId},
            ${JSON.stringify({
              transaction_id: transactionId,
              previous_level: transactionData.previousLevel,
              previous_aura: transactionData.previousAura,
              applied_at: new Date().toISOString()
            })}
          )
          RETURNING *
        `;

        const enhancement = enhancementResult[0];

        // Обновить желание
        if (transactionData.enhancementType === 'priority') {
          await sql`
            UPDATE wishes 
            SET priority = ${transactionData.level}
            WHERE id = ${transactionData.wishId}
          `;
        } else if (transactionData.enhancementType === 'aura') {
          await sql`
            UPDATE wishes 
            SET aura = ${transactionData.auraType}
            WHERE id = ${transactionData.wishId}
          `;
        }

        // Создать запись транзакции
        await sql`
          INSERT INTO transactions (
            user_id, 
            type, 
            wish_type,
            amount,
            mana_amount, 
            reason, 
            transaction_category,
            transaction_source,
            enhancement_id,
            experience_gained,
            metadata
          ) VALUES (
            ${transactionData.userId},
            'debit',
            NULL,
            0,
            ${transactionData.cost},
            'enhancement_${transactionData.enhancementType}',
            'enhancement',
            'mana_transaction_manager',
            ${enhancement.id},
            0,
            ${JSON.stringify({
              transaction_id: transactionId,
              wish_id: transactionData.wishId,
              enhancement_type: transactionData.enhancementType,
              level: transactionData.level,
              aura_type: transactionData.auraType,
              previous_balance: currentBalance,
              new_balance: remainingMana
            })}
          )
        `;

        console.log(`Applied ${transactionData.enhancementType} enhancement to wish ${transactionData.wishId}. Cost: ${transactionData.cost}, Remaining mana: ${remainingMana}`);

        return {
          success: true,
          enhancement: {
            ...enhancement,
            applied_at: new Date(enhancement.applied_at)
          },
          remainingMana,
          transactionId
        };
      },
      {
        userId: transactionData.userId,
        operationType: 'apply_enhancement',
        description: `Apply ${transactionData.enhancementType} enhancement to wish ${transactionData.wishId}`
      }
    );
  }

  /**
   * Выполнить миграцию пользователя с откатом
   */
  async executeMigrationWithRollback(
    userId: string,
    greenBalance: number,
    blueBalance: number,
    redBalance: number,
    totalMana: number
  ): Promise<{ success: boolean; newManaBalance: number; transactionId: string }> {
    const transactionId = this.generateTransactionId();

    return this.executeManaTransaction(
      async (sql) => {
        // Проверить, не была ли миграция уже выполнена
        const migrationCheck = await sql`
          SELECT legacy_migration_completed, mana_balance 
          FROM users 
          WHERE id = ${userId}
        `;

        if (migrationCheck.length === 0) {
          throw new ManaOperationError(
            'migration',
            userId,
            'User not found'
          );
        }

        if (migrationCheck[0].legacy_migration_completed) {
          throw new ManaOperationError(
            'migration',
            userId,
            'Migration already completed for this user'
          );
        }

        // Обновить баланс Маны и отметить миграцию как завершенную
        const updateResult = await sql`
          UPDATE users 
          SET 
            mana_balance = ${totalMana},
            legacy_migration_completed = true
          WHERE id = ${userId} AND legacy_migration_completed = false
          RETURNING mana_balance
        `;

        if (updateResult.length === 0) {
          throw new ManaOperationError(
            'migration',
            userId,
            'Failed to update user during migration'
          );
        }

        const newManaBalance = updateResult[0].mana_balance;

        // Создать запись транзакции миграции
        await sql`
          INSERT INTO transactions (
            user_id, 
            type, 
            wish_type,
            amount,
            mana_amount, 
            reason, 
            transaction_category,
            transaction_source,
            experience_gained,
            metadata
          ) VALUES (
            ${userId},
            'credit',
            NULL,
            0,
            ${totalMana},
            'legacy_currency_migration',
            'migration',
            'mana_transaction_manager',
            0,
            ${JSON.stringify({
              transaction_id: transactionId,
              migration_data: {
                green_balance: greenBalance,
                blue_balance: blueBalance,
                red_balance: redBalance,
                conversion_rates: { green: 10, blue: 100, red: 1000 },
                total_mana: totalMana
              },
              migration_completed_at: new Date().toISOString()
            })}
          )
        `;

        console.log(`Migration completed for user ${userId}. Converted balances (G:${greenBalance}, B:${blueBalance}, R:${redBalance}) to ${totalMana} mana`);

        return {
          success: true,
          newManaBalance,
          transactionId
        };
      },
      {
        userId,
        operationType: 'migration',
        description: `Migrate legacy currency to mana system`
      }
    );
  }

  /**
   * Получить информацию об активных транзакциях
   */
  getActiveTransactions(): TransactionContext[] {
    return Array.from(this.activeTransactions.values());
  }

  /**
   * Очистить завершенные транзакции
   */
  cleanupCompletedTransactions(): void {
    const now = new Date();
    const maxAge = 5 * 60 * 1000; // 5 минут

    this.activeTransactions.forEach((context, id) => {
      if (context.completed && (now.getTime() - context.startTime.getTime()) > maxAge) {
        this.activeTransactions.delete(id);
      }
    });
  }

  /**
   * Генерировать уникальный ID транзакции
   */
  private generateTransactionId(): string {
    return `mana_tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

// Экспорт единственного экземпляра
export const manaTransactionManager = ManaTransactionManager.getInstance();
export default manaTransactionManager;