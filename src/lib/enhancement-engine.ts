import { db, DatabaseMonitor } from './db-pool';
import { manaEngine } from './mana-engine';
import { 
  EnhancementEngine as IEnhancementEngine,
  Enhancement,
  EnhancementType,
  AuraType,
  EnhancementError,
  InsufficientManaError,
  EnhancementValidationResult,
  DEFAULT_ENHANCEMENT_COSTS,
  MANA_TEXTS
} from '../types/mana-system';

/**
 * EnhancementEngine - Система усилений желаний
 * Управляет применением усилений "Приоритет" и "Аура" к желаниям пользователей
 */
export class EnhancementEngine implements IEnhancementEngine {
  private static instance: EnhancementEngine;

  private constructor() {}

  /**
   * Получить единственный экземпляр EnhancementEngine (Singleton)
   */
  public static getInstance(): EnhancementEngine {
    if (!EnhancementEngine.instance) {
      EnhancementEngine.instance = new EnhancementEngine();
    }
    return EnhancementEngine.instance;
  }

  /**
   * Применить усиление "Приоритет" к желанию
   */
  async applyPriorityEnhancement(wishId: string, level: number): Promise<Enhancement> {
    const endTimer = DatabaseMonitor.startQuery('applyPriorityEnhancement');
    
    try {
      if (!wishId) {
        throw new EnhancementError('Wish ID is required', wishId);
      }

      if (level < 1 || level > 5) {
        throw new EnhancementError('Priority level must be between 1 and 5', wishId);
      }

      // Получить информацию о желании и его владельце
      const wishInfo = await this.getWishInfo(wishId);
      if (!wishInfo) {
        throw new EnhancementError('Wish not found', wishId);
      }

      // Проверить права пользователя на усиление желания
      await this.validateUserPermissions(wishInfo.author_id, wishId);

      // Получить текущий уровень приоритета
      const currentEnhancement = await this.getCurrentPriorityEnhancement(wishId);
      const currentLevel = currentEnhancement?.level || 0;

      if (level <= currentLevel) {
        throw new EnhancementError(`Priority level ${level} is not higher than current level ${currentLevel}`, wishId);
      }

      // Рассчитать стоимость усиления
      const cost = this.calculateEnhancementCost('priority', level);

      // Проверить достаточность Маны
      const userMana = await manaEngine.getUserMana(wishInfo.author_id);
      if (userMana < cost) {
        throw new InsufficientManaError(cost, userMana);
      }

      // Выполнить усиление в транзакции
      const enhancement = await db.transaction(async (sql) => {
        // Списать Ману
        const spendSuccess = await manaEngine.spendMana(
          wishInfo.author_id, 
          cost, 
          `priority_enhancement_level_${level}`
        );

        if (!spendSuccess) {
          throw new InsufficientManaError(cost, userMana);
        }

        // Удалить предыдущее усиление приоритета (если есть)
        if (currentEnhancement) {
          await sql`
            DELETE FROM wish_enhancements 
            WHERE wish_id = ${wishId} AND type = 'priority'
          `;
        }

        // Создать новое усиление
        const enhancementResult = await sql<Enhancement>`
          INSERT INTO wish_enhancements (
            wish_id, 
            type, 
            level, 
            cost, 
            applied_by,
            metadata
          ) VALUES (
            ${wishId},
            'priority',
            ${level},
            ${cost},
            ${wishInfo.author_id},
            ${JSON.stringify({ 
              previous_level: currentLevel,
              upgrade_cost: cost,
              applied_at: new Date().toISOString()
            })}
          )
          RETURNING *
        `;

        // Обновить приоритет желания
        await sql`
          UPDATE wishes 
          SET priority = ${level}
          WHERE id = ${wishId}
        `;

        const newEnhancement = enhancementResult[0];
        
        console.log(`Applied priority enhancement level ${level} to wish ${wishId} for user ${wishInfo.author_id}. Cost: ${cost} mana`);
        
        return {
          ...newEnhancement,
          applied_at: new Date(newEnhancement.applied_at)
        };
      });

      return enhancement;
    } catch (error) {
      console.error('Error applying priority enhancement:', error);
      throw error;
    } finally {
      endTimer();
    }
  }

  /**
   * Применить усиление "Аура" к желанию
   */
  async applyAuraEnhancement(wishId: string, auraType: string): Promise<Enhancement> {
    const endTimer = DatabaseMonitor.startQuery('applyAuraEnhancement');
    
    try {
      if (!wishId) {
        throw new EnhancementError('Wish ID is required', wishId);
      }

      if (!this.isValidAuraType(auraType)) {
        throw new EnhancementError(`Invalid aura type: ${auraType}`, wishId);
      }

      // Получить информацию о желании и его владельце
      const wishInfo = await this.getWishInfo(wishId);
      if (!wishInfo) {
        throw new EnhancementError('Wish not found', wishId);
      }

      // Проверить права пользователя на усиление желания
      await this.validateUserPermissions(wishInfo.author_id, wishId);

      // Проверить, нет ли уже ауры на этом желании
      const existingAura = await this.getCurrentAuraEnhancement(wishId);
      if (existingAura) {
        throw new EnhancementError('Wish already has an aura enhancement', wishId);
      }

      // Рассчитать стоимость усиления
      const cost = this.calculateEnhancementCost('aura', 1);

      // Проверить достаточность Маны
      const userMana = await manaEngine.getUserMana(wishInfo.author_id);
      if (userMana < cost) {
        throw new InsufficientManaError(cost, userMana);
      }

      // Выполнить усиление в транзакции
      const enhancement = await db.transaction(async (sql) => {
        // Списать Ману
        const spendSuccess = await manaEngine.spendMana(
          wishInfo.author_id, 
          cost, 
          `aura_enhancement_${auraType}`
        );

        if (!spendSuccess) {
          throw new InsufficientManaError(cost, userMana);
        }

        // Создать усиление ауры
        const enhancementResult = await sql<Enhancement>`
          INSERT INTO wish_enhancements (
            wish_id, 
            type, 
            level,
            aura_type,
            cost, 
            applied_by,
            metadata
          ) VALUES (
            ${wishId},
            'aura',
            1,
            ${auraType},
            ${cost},
            ${wishInfo.author_id},
            ${JSON.stringify({ 
              aura_type: auraType,
              applied_at: new Date().toISOString()
            })}
          )
          RETURNING *
        `;

        // Обновить ауру желания
        await sql`
          UPDATE wishes 
          SET aura = ${auraType}
          WHERE id = ${wishId}
        `;

        const newEnhancement = enhancementResult[0];
        
        console.log(`Applied aura enhancement "${auraType}" to wish ${wishId} for user ${wishInfo.author_id}. Cost: ${cost} mana`);
        
        return {
          ...newEnhancement,
          applied_at: new Date(newEnhancement.applied_at)
        };
      });

      return enhancement;
    } catch (error) {
      console.error('Error applying aura enhancement:', error);
      throw error;
    } finally {
      endTimer();
    }
  }

  /**
   * Рассчитать стоимость усиления
   */
  calculateEnhancementCost(type: string, currentLevel: number): number {
    if (type === 'priority') {
      return DEFAULT_ENHANCEMENT_COSTS.priority[currentLevel] || 0;
    } else if (type === 'aura') {
      return DEFAULT_ENHANCEMENT_COSTS.aura;
    }
    
    throw new Error(`Unknown enhancement type: ${type}`);
  }

  /**
   * Получить все усиления желания
   */
  async getWishEnhancements(wishId: string): Promise<Enhancement[]> {
    const endTimer = DatabaseMonitor.startQuery('getWishEnhancements');
    
    try {
      if (!wishId) {
        throw new Error('Wish ID is required');
      }

      const result = await db.execute<Enhancement>`
        SELECT 
          id,
          wish_id,
          type,
          level,
          aura_type,
          cost,
          applied_at,
          applied_by,
          metadata
        FROM wish_enhancements 
        WHERE wish_id = ${wishId}
        ORDER BY applied_at DESC
      `;

      return result.map(enhancement => ({
        ...enhancement,
        applied_at: new Date(enhancement.applied_at)
      }));
    } catch (error) {
      console.error('Error getting wish enhancements:', error);
      throw error;
    } finally {
      endTimer();
    }
  }

  /**
   * Валидировать возможность применения усиления
   */
  async validateEnhancement(
    wishId: string, 
    userId: string, 
    type: EnhancementType, 
    level?: number, 
    auraType?: string
  ): Promise<EnhancementValidationResult> {
    try {
      const errors: string[] = [];
      let isValid = true;
      let canApply = true;
      let cost = 0;
      let currentLevel = 0;
      let maxLevelReached = false;

      // Базовая валидация параметров
      if (!wishId) {
        errors.push('Wish ID is required');
        isValid = false;
      }

      if (!userId) {
        errors.push('User ID is required');
        isValid = false;
      }

      if (!type || !['priority', 'aura'].includes(type)) {
        errors.push('Valid enhancement type is required');
        isValid = false;
      }

      if (!isValid) {
        return { isValid, errors, canApply: false, cost: 0 };
      }

      // Проверить существование желания
      const wishInfo = await this.getWishInfo(wishId);
      if (!wishInfo) {
        errors.push('Wish not found');
        return { isValid: false, errors, canApply: false, cost: 0 };
      }

      // Проверить права пользователя
      try {
        await this.validateUserPermissions(userId, wishId);
      } catch (error) {
        errors.push(error instanceof Error ? error.message : 'Permission denied');
        canApply = false;
      }

      // Валидация для усиления приоритета
      if (type === 'priority') {
        if (!level || level < 1 || level > 5) {
          errors.push('Priority level must be between 1 and 5');
          isValid = false;
        } else {
          const currentEnhancement = await this.getCurrentPriorityEnhancement(wishId);
          currentLevel = currentEnhancement?.level || 0;
          
          if (level <= currentLevel) {
            errors.push(`Priority level ${level} is not higher than current level ${currentLevel}`);
            canApply = false;
          }

          if (currentLevel >= 5) {
            maxLevelReached = true;
            canApply = false;
            errors.push(MANA_TEXTS.errors.maxLevelReached);
          }

          cost = this.calculateEnhancementCost('priority', level);
        }
      }

      // Валидация для усиления ауры
      if (type === 'aura') {
        if (!auraType || !this.isValidAuraType(auraType)) {
          errors.push('Valid aura type is required');
          isValid = false;
        } else {
          const existingAura = await this.getCurrentAuraEnhancement(wishId);
          if (existingAura) {
            errors.push('Wish already has an aura enhancement');
            canApply = false;
          }

          cost = this.calculateEnhancementCost('aura', 1);
        }
      }

      // Проверить достаточность Маны
      if (canApply && cost > 0) {
        const userMana = await manaEngine.getUserMana(userId);
        if (userMana < cost) {
          errors.push(MANA_TEXTS.errors.insufficientMana);
          canApply = false;
        }
      }

      return {
        isValid,
        errors,
        canApply,
        cost,
        currentLevel: currentLevel > 0 ? currentLevel : undefined,
        maxLevelReached
      };
    } catch (error) {
      console.error('Error validating enhancement:', error);
      return {
        isValid: false,
        errors: ['Validation failed'],
        canApply: false,
        cost: 0
      };
    }
  }

  /**
   * Получить стоимость следующего уровня приоритета для желания
   */
  async getNextPriorityCost(wishId: string): Promise<number | null> {
    try {
      const currentEnhancement = await this.getCurrentPriorityEnhancement(wishId);
      const currentLevel = currentEnhancement?.level || 0;
      
      if (currentLevel >= 5) {
        return null; // Максимальный уровень достигнут
      }

      const nextLevel = currentLevel + 1;
      return this.calculateEnhancementCost('priority', nextLevel);
    } catch (error) {
      console.error('Error getting next priority cost:', error);
      return null;
    }
  }

  /**
   * Получить статистику усилений пользователя
   */
  async getUserEnhancementStats(userId: string): Promise<{
    total_enhancements: number;
    priority_enhancements: number;
    aura_enhancements: number;
    total_mana_spent: number;
    most_used_aura?: string;
    average_priority_level: number;
  }> {
    const endTimer = DatabaseMonitor.startQuery('getUserEnhancementStats');
    
    try {
      if (!userId) {
        throw new Error('User ID is required');
      }

      const result = await db.execute<{
        total_enhancements: number;
        priority_enhancements: number;
        aura_enhancements: number;
        total_mana_spent: number;
        most_used_aura: string;
        average_priority_level: number;
      }>`
        SELECT 
          COUNT(*) as total_enhancements,
          COUNT(CASE WHEN type = 'priority' THEN 1 END) as priority_enhancements,
          COUNT(CASE WHEN type = 'aura' THEN 1 END) as aura_enhancements,
          COALESCE(SUM(cost), 0) as total_mana_spent,
          MODE() WITHIN GROUP (ORDER BY aura_type) as most_used_aura,
          COALESCE(AVG(CASE WHEN type = 'priority' THEN level END), 0) as average_priority_level
        FROM wish_enhancements we
        JOIN wishes w ON we.wish_id = w.id
        WHERE w.author_id = ${userId}
      `;

      const stats = result[0] || {
        total_enhancements: 0,
        priority_enhancements: 0,
        aura_enhancements: 0,
        total_mana_spent: 0,
        most_used_aura: null,
        average_priority_level: 0
      };

      return {
        total_enhancements: Number(stats.total_enhancements),
        priority_enhancements: Number(stats.priority_enhancements),
        aura_enhancements: Number(stats.aura_enhancements),
        total_mana_spent: Number(stats.total_mana_spent),
        most_used_aura: stats.most_used_aura || undefined,
        average_priority_level: Number(stats.average_priority_level)
      };
    } catch (error) {
      console.error('Error getting user enhancement stats:', error);
      throw error;
    } finally {
      endTimer();
    }
  }

  /**
   * Удалить усиление (для административных целей)
   */
  async removeEnhancement(enhancementId: string, adminUserId: string): Promise<void> {
    const endTimer = DatabaseMonitor.startQuery('removeEnhancement');
    
    try {
      if (!enhancementId) {
        throw new Error('Enhancement ID is required');
      }

      if (!adminUserId) {
        throw new Error('Admin user ID is required');
      }

      await db.transaction(async (sql) => {
        // Получить информацию об усилении
        const enhancementResult = await sql<Enhancement>`
          SELECT * FROM wish_enhancements WHERE id = ${enhancementId}
        `;

        if (enhancementResult.length === 0) {
          throw new Error('Enhancement not found');
        }

        const enhancement = enhancementResult[0];

        // Удалить усиление
        await sql`
          DELETE FROM wish_enhancements WHERE id = ${enhancementId}
        `;

        // Обновить желание в зависимости от типа усиления
        if (enhancement.type === 'priority') {
          await sql`
            UPDATE wishes 
            SET priority = 1 
            WHERE id = ${enhancement.wish_id}
          `;
        } else if (enhancement.type === 'aura') {
          await sql`
            UPDATE wishes 
            SET aura = NULL 
            WHERE id = ${enhancement.wish_id}
          `;
        }

        console.log(`Removed enhancement ${enhancementId} by admin ${adminUserId}`);
      });
    } catch (error) {
      console.error('Error removing enhancement:', error);
      throw error;
    } finally {
      endTimer();
    }
  }

  // Приватные вспомогательные методы

  /**
   * Получить информацию о желании
   */
  private async getWishInfo(wishId: string): Promise<{ author_id: string; status: string } | null> {
    try {
      const result = await db.execute<{ author_id: string; status: string }>`
        SELECT author_id, status FROM wishes WHERE id = ${wishId}
      `;

      return result[0] || null;
    } catch (error) {
      console.error('Error getting wish info:', error);
      return null;
    }
  }

  /**
   * Валидировать права пользователя на усиление желания
   */
  private async validateUserPermissions(userId: string, wishId: string): Promise<void> {
    const wishInfo = await this.getWishInfo(wishId);
    
    if (!wishInfo) {
      throw new EnhancementError('Wish not found', wishId);
    }

    if (wishInfo.author_id !== userId) {
      throw new EnhancementError('Only wish author can apply enhancements', wishId);
    }

    if (wishInfo.status !== 'active') {
      throw new EnhancementError('Can only enhance active wishes', wishId);
    }
  }

  /**
   * Получить текущее усиление приоритета для желания
   */
  private async getCurrentPriorityEnhancement(wishId: string): Promise<Enhancement | null> {
    try {
      const result = await db.execute<Enhancement>`
        SELECT * FROM wish_enhancements 
        WHERE wish_id = ${wishId} AND type = 'priority'
        ORDER BY applied_at DESC
        LIMIT 1
      `;

      return result[0] || null;
    } catch (error) {
      console.error('Error getting current priority enhancement:', error);
      return null;
    }
  }

  /**
   * Получить текущее усиление ауры для желания
   */
  private async getCurrentAuraEnhancement(wishId: string): Promise<Enhancement | null> {
    try {
      const result = await db.execute<Enhancement>`
        SELECT * FROM wish_enhancements 
        WHERE wish_id = ${wishId} AND type = 'aura'
        ORDER BY applied_at DESC
        LIMIT 1
      `;

      return result[0] || null;
    } catch (error) {
      console.error('Error getting current aura enhancement:', error);
      return null;
    }
  }

  /**
   * Проверить валидность типа ауры
   */
  private isValidAuraType(auraType: string): auraType is AuraType {
    return ['romantic', 'gaming', 'mysterious'].includes(auraType);
  }
}

// Экспорт единственного экземпляра
export const enhancementEngine = EnhancementEngine.getInstance();
export default enhancementEngine;