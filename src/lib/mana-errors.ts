/**
 * Специализированные классы ошибок для системы Маны
 * Обеспечивают детальную обработку ошибок с русскими сообщениями
 */

import { MANA_TEXTS } from '../types/mana-system';

// Базовый класс для всех ошибок системы Маны
export abstract class ManaSystemError extends Error {
  public readonly code: string;
  public readonly userMessage: string;
  public readonly timestamp: Date;
  public readonly context?: Record<string, any>;

  constructor(
    message: string,
    code: string,
    userMessage: string,
    context?: Record<string, any>
  ) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.userMessage = userMessage;
    this.timestamp = new Date();
    this.context = context;

    // Обеспечить правильный стек вызовов
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  /**
   * Получить детальную информацию об ошибке для логирования
   */
  getDetails(): Record<string, any> {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      userMessage: this.userMessage,
      timestamp: this.timestamp,
      context: this.context,
      stack: this.stack
    };
  }

  /**
   * Получить сообщение для пользователя
   */
  getUserMessage(): string {
    return this.userMessage;
  }
}

// Ошибка недостаточности Маны
export class InsufficientManaError extends ManaSystemError {
  public readonly required: number;
  public readonly available: number;

  constructor(required: number, available: number, context?: Record<string, any>) {
    const message = `Insufficient mana: required ${required}, available ${available}`;
    const userMessage = `${MANA_TEXTS.errors.insufficientMana}. Требуется: ${required}, доступно: ${available}`;
    
    super(message, 'INSUFFICIENT_MANA', userMessage, {
      ...context,
      required,
      available,
      deficit: required - available
    });

    this.required = required;
    this.available = available;
  }
}

// Ошибка валидации Маны
export class ManaValidationError extends ManaSystemError {
  public readonly validationErrors: string[];

  constructor(validationErrors: string[], context?: Record<string, any>) {
    const message = `Mana validation failed: ${validationErrors.join(', ')}`;
    const userMessage = `Ошибка валидации: ${validationErrors.join(', ')}`;
    
    super(message, 'MANA_VALIDATION_ERROR', userMessage, {
      ...context,
      validationErrors
    });

    this.validationErrors = validationErrors;
  }
}

// Ошибка операции с Маной
export class ManaOperationError extends ManaSystemError {
  public readonly operation: string;
  public readonly userId: string;

  constructor(
    operation: string, 
    userId: string, 
    message: string, 
    userMessage?: string,
    context?: Record<string, any>
  ) {
    const fullMessage = `Mana operation '${operation}' failed for user ${userId}: ${message}`;
    const fullUserMessage = userMessage || `Не удалось выполнить операцию с Маной: ${message}`;
    
    super(fullMessage, 'MANA_OPERATION_ERROR', fullUserMessage, {
      ...context,
      operation,
      userId
    });

    this.operation = operation;
    this.userId = userId;
  }
}

// Ошибка усиления желания
export class EnhancementError extends ManaSystemError {
  public readonly wishId: string;
  public readonly enhancementType?: string;

  constructor(
    message: string, 
    wishId: string, 
    enhancementType?: string,
    context?: Record<string, any>
  ) {
    const fullMessage = `Enhancement error for wish ${wishId}: ${message}`;
    const userMessage = `${MANA_TEXTS.errors.enhancementFailed}: ${message}`;
    
    super(fullMessage, 'ENHANCEMENT_ERROR', userMessage, {
      ...context,
      wishId,
      enhancementType
    });

    this.wishId = wishId;
    this.enhancementType = enhancementType;
  }
}

// Ошибка валидации усиления
export class EnhancementValidationError extends ManaSystemError {
  public readonly wishId: string;
  public readonly enhancementType: string;
  public readonly validationErrors: string[];

  constructor(
    wishId: string,
    enhancementType: string,
    validationErrors: string[],
    context?: Record<string, any>
  ) {
    const message = `Enhancement validation failed for wish ${wishId}, type ${enhancementType}: ${validationErrors.join(', ')}`;
    const userMessage = `Ошибка валидации усиления: ${validationErrors.join(', ')}`;
    
    super(message, 'ENHANCEMENT_VALIDATION_ERROR', userMessage, {
      ...context,
      wishId,
      enhancementType,
      validationErrors
    });

    this.wishId = wishId;
    this.enhancementType = enhancementType;
    this.validationErrors = validationErrors;
  }
}

// Ошибка прав доступа к усилению
export class EnhancementPermissionError extends ManaSystemError {
  public readonly userId: string;
  public readonly wishId: string;

  constructor(userId: string, wishId: string, context?: Record<string, any>) {
    const message = `User ${userId} does not have permission to enhance wish ${wishId}`;
    const userMessage = 'У вас нет прав для усиления этого желания';
    
    super(message, 'ENHANCEMENT_PERMISSION_ERROR', userMessage, {
      ...context,
      userId,
      wishId
    });

    this.userId = userId;
    this.wishId = wishId;
  }
}

// Ошибка максимального уровня усиления
export class MaxEnhancementLevelError extends ManaSystemError {
  public readonly wishId: string;
  public readonly currentLevel: number;
  public readonly maxLevel: number;

  constructor(
    wishId: string, 
    currentLevel: number, 
    maxLevel: number,
    context?: Record<string, any>
  ) {
    const message = `Wish ${wishId} already at maximum enhancement level ${currentLevel}/${maxLevel}`;
    const userMessage = `${MANA_TEXTS.errors.maxLevelReached} (${currentLevel}/${maxLevel})`;
    
    super(message, 'MAX_ENHANCEMENT_LEVEL_ERROR', userMessage, {
      ...context,
      wishId,
      currentLevel,
      maxLevel
    });

    this.wishId = wishId;
    this.currentLevel = currentLevel;
    this.maxLevel = maxLevel;
  }
}

// Ошибка миграции данных
export class MigrationError extends ManaSystemError {
  public readonly userId: string;
  public readonly step: string;

  constructor(userId: string, step: string, message: string, context?: Record<string, any>) {
    const fullMessage = `Migration failed for user ${userId} at step '${step}': ${message}`;
    const userMessage = `${MANA_TEXTS.errors.migrationFailed} на этапе: ${step}`;
    
    super(fullMessage, 'MIGRATION_ERROR', userMessage, {
      ...context,
      userId,
      step
    });

    this.userId = userId;
    this.step = step;
  }
}

// Ошибка транзакции
export class TransactionError extends ManaSystemError {
  public readonly transactionId?: string;
  public readonly rollbackAttempted: boolean;

  constructor(
    message: string, 
    transactionId?: string, 
    rollbackAttempted: boolean = false,
    context?: Record<string, any>
  ) {
    const fullMessage = `Transaction error${transactionId ? ` (${transactionId})` : ''}: ${message}`;
    const userMessage = 'Произошла ошибка при выполнении операции. Изменения отменены.';
    
    super(fullMessage, 'TRANSACTION_ERROR', userMessage, {
      ...context,
      transactionId,
      rollbackAttempted
    });

    this.transactionId = transactionId;
    this.rollbackAttempted = rollbackAttempted;
  }
}

// Ошибка конфигурации системы
export class SystemConfigurationError extends ManaSystemError {
  public readonly configKey: string;

  constructor(configKey: string, message: string, context?: Record<string, any>) {
    const fullMessage = `System configuration error for '${configKey}': ${message}`;
    const userMessage = 'Ошибка конфигурации системы. Обратитесь к администратору.';
    
    super(fullMessage, 'SYSTEM_CONFIGURATION_ERROR', userMessage, {
      ...context,
      configKey
    });

    this.configKey = configKey;
  }
}

// Ошибка базы данных
export class DatabaseError extends ManaSystemError {
  public readonly query?: string;
  public readonly originalError?: Error;

  constructor(
    message: string, 
    query?: string, 
    originalError?: Error,
    context?: Record<string, any>
  ) {
    const fullMessage = `Database error: ${message}${query ? ` (Query: ${query})` : ''}`;
    const userMessage = 'Произошла ошибка при работе с базой данных. Попробуйте позже.';
    
    super(fullMessage, 'DATABASE_ERROR', userMessage, {
      ...context,
      query,
      originalError: originalError?.message
    });

    this.query = query;
    this.originalError = originalError;
  }
}

// Утилиты для обработки ошибок

/**
 * Проверить, является ли ошибка ошибкой системы Маны
 */
export function isManaSystemError(error: any): error is ManaSystemError {
  return error instanceof ManaSystemError;
}

/**
 * Извлечь пользовательское сообщение из ошибки
 */
export function getUserErrorMessage(error: any): string {
  if (isManaSystemError(error)) {
    return error.getUserMessage();
  }
  
  // Для стандартных ошибок возвращаем общее сообщение
  return 'Произошла неожиданная ошибка. Попробуйте позже.';
}

/**
 * Логировать ошибку системы Маны
 */
export function logManaError(error: any, additionalContext?: Record<string, any>): void {
  if (isManaSystemError(error)) {
    console.error('Mana System Error:', {
      ...error.getDetails(),
      additionalContext
    });
  } else {
    console.error('Unexpected Error in Mana System:', {
      message: error?.message || 'Unknown error',
      stack: error?.stack,
      additionalContext
    });
  }
}

/**
 * Создать стандартный ответ об ошибке для API
 */
export function createErrorResponse(error: any, statusCode: number = 500): {
  success: false;
  error: {
    code: string;
    message: string;
    userMessage: string;
    timestamp: string;
  };
} {
  const userMessage = getUserErrorMessage(error);
  const code = isManaSystemError(error) ? error.code : 'UNKNOWN_ERROR';
  const message = error?.message || 'Unknown error occurred';

  return {
    success: false,
    error: {
      code,
      message,
      userMessage,
      timestamp: new Date().toISOString()
    }
  };
}

// All error classes are already exported above with their class declarations