/**
 * Система валидации для операций с Маной
 * Обеспечивает комплексную проверку всех операций перед их выполнением
 */

import { 
  ManaValidationError,
  EnhancementValidationError,
  InsufficientManaError,
  EnhancementPermissionError,
  MaxEnhancementLevelError
} from './mana-errors';
import { 
  EnhancementType, 
  AuraType, 
  MANA_TEXTS,
  DEFAULT_ENHANCEMENT_COSTS 
} from '../types/mana-system';

// Интерфейсы для результатов валидации
export interface ManaOperationValidation {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  canProceed: boolean;
  requiredMana: number;
  availableMana: number;
  afterOperationBalance: number;
}

export interface EnhancementValidation {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  canApply: boolean;
  cost: number;
  currentLevel?: number;
  targetLevel?: number;
  maxLevelReached: boolean;
  hasPermission: boolean;
  wishExists: boolean;
  wishStatus?: string;
}

export interface UserValidation {
  isValid: boolean;
  errors: string[];
  userExists: boolean;
  userId?: string;
}

export interface WishValidation {
  isValid: boolean;
  errors: string[];
  wishExists: boolean;
  wishId?: string;
  authorId?: string;
  status?: string;
  canBeEnhanced: boolean;
}

/**
 * Основной класс валидации системы Маны
 */
export class ManaValidator {
  private static instance: ManaValidator;

  private constructor() {}

  public static getInstance(): ManaValidator {
    if (!ManaValidator.instance) {
      ManaValidator.instance = new ManaValidator();
    }
    return ManaValidator.instance;
  }

  /**
   * Валидировать пользователя
   */
  validateUser(userId: any): UserValidation {
    const errors: string[] = [];
    let isValid = true;
    let userExists = false;

    // Проверить наличие ID пользователя
    if (!userId) {
      errors.push('ID пользователя обязателен');
      isValid = false;
    } else if (typeof userId !== 'string') {
      errors.push('ID пользователя должен быть строкой');
      isValid = false;
    } else if (userId.trim().length === 0) {
      errors.push('ID пользователя не может быть пустым');
      isValid = false;
    } else {
      userExists = true;
    }

    return {
      isValid,
      errors,
      userExists,
      userId: userExists ? userId : undefined
    };
  }

  /**
   * Валидировать желание
   */
  validateWish(wishId: any, authorId?: string, status?: string): WishValidation {
    const errors: string[] = [];
    let isValid = true;
    let wishExists = false;
    let canBeEnhanced = false;

    // Проверить наличие ID желания
    if (!wishId) {
      errors.push('ID желания обязателен');
      isValid = false;
    } else if (typeof wishId !== 'string') {
      errors.push('ID желания должен быть строкой');
      isValid = false;
    } else if (wishId.trim().length === 0) {
      errors.push('ID желания не может быть пустым');
      isValid = false;
    } else {
      wishExists = true;
    }

    // Проверить статус желания для возможности усиления
    if (wishExists && status) {
      if (status === 'active') {
        canBeEnhanced = true;
      } else {
        errors.push('Можно усиливать только активные желания');
        canBeEnhanced = false;
      }
    }

    return {
      isValid,
      errors,
      wishExists,
      wishId: wishExists ? wishId : undefined,
      authorId,
      status,
      canBeEnhanced
    };
  }

  /**
   * Валидировать количество Маны
   */
  validateManaAmount(amount: any): { isValid: boolean; errors: string[]; amount?: number } {
    const errors: string[] = [];
    let isValid = true;

    if (amount === null || amount === undefined) {
      errors.push('Количество Маны обязательно');
      isValid = false;
    } else if (typeof amount !== 'number') {
      errors.push('Количество Маны должно быть числом');
      isValid = false;
    } else if (isNaN(amount)) {
      errors.push('Количество Маны должно быть валидным числом');
      isValid = false;
    } else if (amount <= 0) {
      errors.push('Количество Маны должно быть положительным');
      isValid = false;
    } else if (!Number.isInteger(amount)) {
      errors.push('Количество Маны должно быть целым числом');
      isValid = false;
    } else if (amount > 1000000) {
      errors.push('Количество Маны слишком большое (максимум: 1,000,000)');
      isValid = false;
    }

    return {
      isValid,
      errors,
      amount: isValid ? amount : undefined
    };
  }

  /**
   * Валидировать операцию с Маной
   */
  validateManaOperation(
    userId: string,
    amount: number,
    currentBalance: number,
    operation: 'spend' | 'add',
    reason?: string
  ): ManaOperationValidation {
    const errors: string[] = [];
    const warnings: string[] = [];
    let isValid = true;
    let canProceed = true;

    // Валидировать пользователя
    const userValidation = this.validateUser(userId);
    if (!userValidation.isValid) {
      errors.push(...userValidation.errors);
      isValid = false;
    }

    // Валидировать количество
    const amountValidation = this.validateManaAmount(amount);
    if (!amountValidation.isValid) {
      errors.push(...amountValidation.errors);
      isValid = false;
    }

    // Валидировать причину
    if (!reason || reason.trim().length === 0) {
      errors.push('Причина операции обязательна');
      isValid = false;
    } else if (reason.length > 255) {
      errors.push('Причина операции слишком длинная (максимум: 255 символов)');
      isValid = false;
    }

    // Валидировать баланс для операций списания
    if (operation === 'spend' && isValid) {
      if (currentBalance < amount) {
        errors.push(MANA_TEXTS.errors.insufficientMana);
        canProceed = false;
      } else if (currentBalance - amount < 10) {
        warnings.push('После операции у вас останется мало Маны');
      }
    }

    // Валидировать баланс для операций пополнения
    if (operation === 'add' && isValid) {
      const newBalance = currentBalance + amount;
      if (newBalance > 1000000) {
        errors.push('Превышен максимальный баланс Маны (1,000,000)');
        canProceed = false;
      } else if (newBalance > 500000) {
        warnings.push('Ваш баланс Маны становится очень большим');
      }
    }

    const afterOperationBalance = operation === 'spend' 
      ? currentBalance - amount 
      : currentBalance + amount;

    return {
      isValid,
      errors,
      warnings,
      canProceed: isValid && canProceed,
      requiredMana: operation === 'spend' ? amount : 0,
      availableMana: currentBalance,
      afterOperationBalance: Math.max(0, afterOperationBalance)
    };
  }

  /**
   * Валидировать тип усиления
   */
  validateEnhancementType(type: any): { isValid: boolean; errors: string[]; type?: EnhancementType } {
    const errors: string[] = [];
    let isValid = true;

    if (!type) {
      errors.push('Тип усиления обязателен');
      isValid = false;
    } else if (typeof type !== 'string') {
      errors.push('Тип усиления должен быть строкой');
      isValid = false;
    } else if (!['priority', 'aura'].includes(type)) {
      errors.push(`${MANA_TEXTS.errors.invalidEnhancementType}: ${type}`);
      isValid = false;
    }

    return {
      isValid,
      errors,
      type: isValid ? type as EnhancementType : undefined
    };
  }

  /**
   * Валидировать уровень приоритета
   */
  validatePriorityLevel(level: any, currentLevel: number = 0): { 
    isValid: boolean; 
    errors: string[]; 
    level?: number;
    isUpgrade: boolean;
  } {
    const errors: string[] = [];
    let isValid = true;
    let isUpgrade = false;

    if (level === null || level === undefined) {
      errors.push('Уровень приоритета обязателен');
      isValid = false;
    } else if (typeof level !== 'number') {
      errors.push('Уровень приоритета должен быть числом');
      isValid = false;
    } else if (!Number.isInteger(level)) {
      errors.push('Уровень приоритета должен быть целым числом');
      isValid = false;
    } else if (level < 1 || level > 5) {
      errors.push('Уровень приоритета должен быть от 1 до 5');
      isValid = false;
    } else if (level <= currentLevel) {
      errors.push(`Новый уровень (${level}) должен быть выше текущего (${currentLevel})`);
      isValid = false;
    } else {
      isUpgrade = true;
    }

    return {
      isValid,
      errors,
      level: isValid ? level : undefined,
      isUpgrade
    };
  }

  /**
   * Валидировать тип ауры
   */
  validateAuraType(auraType: any): { isValid: boolean; errors: string[]; auraType?: AuraType } {
    const errors: string[] = [];
    let isValid = true;

    if (!auraType) {
      errors.push('Тип ауры обязателен');
      isValid = false;
    } else if (typeof auraType !== 'string') {
      errors.push('Тип ауры должен быть строкой');
      isValid = false;
    } else if (!['tech', 'gaming', 'nature', 'cosmic'].includes(auraType)) {
      errors.push(`Неверный тип ауры: ${auraType}`);
      isValid = false;
    }

    return {
      isValid,
      errors,
      auraType: isValid ? auraType as AuraType : undefined
    };
  }

  /**
   * Валидировать усиление приоритета
   */
  validatePriorityEnhancement(
    wishId: string,
    userId: string,
    level: number,
    currentLevel: number,
    currentBalance: number,
    wishAuthorId: string,
    wishStatus: string
  ): EnhancementValidation {
    const errors: string[] = [];
    const warnings: string[] = [];
    let isValid = true;
    let canApply = true;
    let hasPermission = true;
    let maxLevelReached = false;

    // Валидировать базовые параметры
    const wishValidation = this.validateWish(wishId, wishAuthorId, wishStatus);
    if (!wishValidation.isValid) {
      errors.push(...wishValidation.errors);
      isValid = false;
    }

    const userValidation = this.validateUser(userId);
    if (!userValidation.isValid) {
      errors.push(...userValidation.errors);
      isValid = false;
    }

    const levelValidation = this.validatePriorityLevel(level, currentLevel);
    if (!levelValidation.isValid) {
      errors.push(...levelValidation.errors);
      isValid = false;
    }

    // Проверить права доступа
    if (userId !== wishAuthorId) {
      errors.push('Только автор желания может применять усиления');
      hasPermission = false;
      canApply = false;
    }

    // Проверить максимальный уровень
    if (currentLevel >= 5) {
      errors.push(MANA_TEXTS.errors.maxLevelReached);
      maxLevelReached = true;
      canApply = false;
    }

    // Рассчитать и проверить стоимость
    const cost = DEFAULT_ENHANCEMENT_COSTS.priority[level] || 0;
    if (currentBalance < cost) {
      errors.push(`${MANA_TEXTS.errors.insufficientMana}. Требуется: ${cost}, доступно: ${currentBalance}`);
      canApply = false;
    }

    // Предупреждения
    if (currentBalance - cost < 50) {
      warnings.push('После усиления у вас останется мало Маны');
    }

    if (level === 5) {
      warnings.push('Это максимальный уровень приоритета');
    }

    return {
      isValid,
      errors,
      warnings,
      canApply: isValid && canApply,
      cost,
      currentLevel,
      targetLevel: level,
      maxLevelReached,
      hasPermission,
      wishExists: wishValidation.wishExists,
      wishStatus
    };
  }

  /**
   * Валидировать усиление ауры
   */
  validateAuraEnhancement(
    wishId: string,
    userId: string,
    auraType: string,
    currentBalance: number,
    wishAuthorId: string,
    wishStatus: string,
    hasExistingAura: boolean
  ): EnhancementValidation {
    const errors: string[] = [];
    const warnings: string[] = [];
    let isValid = true;
    let canApply = true;
    let hasPermission = true;

    // Валидировать базовые параметры
    const wishValidation = this.validateWish(wishId, wishAuthorId, wishStatus);
    if (!wishValidation.isValid) {
      errors.push(...wishValidation.errors);
      isValid = false;
    }

    const userValidation = this.validateUser(userId);
    if (!userValidation.isValid) {
      errors.push(...userValidation.errors);
      isValid = false;
    }

    const auraValidation = this.validateAuraType(auraType);
    if (!auraValidation.isValid) {
      errors.push(...auraValidation.errors);
      isValid = false;
    }

    // Проверить права доступа
    if (userId !== wishAuthorId) {
      errors.push('Только автор желания может применять усиления');
      hasPermission = false;
      canApply = false;
    }

    // Проверить существующую ауру
    if (hasExistingAura) {
      errors.push('У желания уже есть аура');
      canApply = false;
    }

    // Рассчитать и проверить стоимость
    const cost = DEFAULT_ENHANCEMENT_COSTS.aura;
    if (currentBalance < cost) {
      errors.push(`${MANA_TEXTS.errors.insufficientMana}. Требуется: ${cost}, доступно: ${currentBalance}`);
      canApply = false;
    }

    // Предупреждения
    if (currentBalance - cost < 50) {
      warnings.push('После усиления у вас останется мало Маны');
    }

    return {
      isValid,
      errors,
      warnings,
      canApply: isValid && canApply,
      cost,
      maxLevelReached: false,
      hasPermission,
      wishExists: wishValidation.wishExists,
      wishStatus
    };
  }

  /**
   * Валидировать данные для миграции
   */
  validateMigrationData(
    userId: string,
    greenBalance: number,
    blueBalance: number,
    redBalance: number
  ): { isValid: boolean; errors: string[]; totalMana?: number } {
    const errors: string[] = [];
    let isValid = true;

    // Валидировать пользователя
    const userValidation = this.validateUser(userId);
    if (!userValidation.isValid) {
      errors.push(...userValidation.errors);
      isValid = false;
    }

    // Валидировать балансы
    const balances = [
      { name: 'зеленый', value: greenBalance },
      { name: 'синий', value: blueBalance },
      { name: 'красный', value: redBalance }
    ];

    for (const balance of balances) {
      if (typeof balance.value !== 'number' || isNaN(balance.value)) {
        errors.push(`${balance.name} баланс должен быть числом`);
        isValid = false;
      } else if (balance.value < 0) {
        errors.push(`${balance.name} баланс не может быть отрицательным`);
        isValid = false;
      }
    }

    // Рассчитать общую Ману
    let totalMana = 0;
    if (isValid) {
      totalMana = (greenBalance * 10) + (blueBalance * 100) + (redBalance * 1000);
      
      if (totalMana > 1000000) {
        errors.push('Общий баланс после конвертации превышает максимум (1,000,000 Маны)');
        isValid = false;
      }
    }

    return {
      isValid,
      errors,
      totalMana: isValid ? totalMana : undefined
    };
  }

  /**
   * Создать ошибку валидации на основе результатов
   */
  createValidationError(validation: { errors: string[] }, context?: Record<string, any>): ManaValidationError {
    return new ManaValidationError(validation.errors, context);
  }

  /**
   * Создать ошибку валидации усиления
   */
  createEnhancementValidationError(
    wishId: string,
    enhancementType: string,
    validation: { errors: string[] },
    context?: Record<string, any>
  ): EnhancementValidationError {
    return new EnhancementValidationError(wishId, enhancementType, validation.errors, context);
  }
}

// Экспорт единственного экземпляра
export const manaValidator = ManaValidator.getInstance();
export default manaValidator;