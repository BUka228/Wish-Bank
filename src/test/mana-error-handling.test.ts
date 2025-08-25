/**
 * Тесты системы обработки ошибок для системы Маны
 * Проверяют корректность валидации, обработки ошибок и откатов транзакций
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { 
  InsufficientManaError,
  ManaValidationError,
  ManaOperationError,
  EnhancementError,
  EnhancementValidationError,
  EnhancementPermissionError,
  MaxEnhancementLevelError,
  MigrationError,
  TransactionError,
  DatabaseError,
  isManaSystemError,
  getUserErrorMessage,
  createErrorResponse,
  logManaError
} from '../lib/mana-errors';
import { manaValidator } from '../lib/mana-validation';
import { manaTransactionManager } from '../lib/mana-transaction-manager';

describe('Mana Error Handling System', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Error Classes', () => {
    it('should create InsufficientManaError with correct properties', () => {
      const error = new InsufficientManaError(100, 50);
      
      expect(error).toBeInstanceOf(Error);
      expect(error.name).toBe('InsufficientManaError');
      expect(error.code).toBe('INSUFFICIENT_MANA');
      expect(error.required).toBe(100);
      expect(error.available).toBe(50);
      expect(error.getUserMessage()).toContain('Недостаточно Маны');
      expect(error.getUserMessage()).toContain('100');
      expect(error.getUserMessage()).toContain('50');
    });

    it('should create ManaValidationError with validation errors', () => {
      const validationErrors = ['Количество должно быть положительным', 'ID пользователя обязателен'];
      const error = new ManaValidationError(validationErrors);
      
      expect(error).toBeInstanceOf(Error);
      expect(error.name).toBe('ManaValidationError');
      expect(error.code).toBe('MANA_VALIDATION_ERROR');
      expect(error.validationErrors).toEqual(validationErrors);
      expect(error.getUserMessage()).toContain('Ошибка валидации');
    });

    it('should create EnhancementError with wish context', () => {
      const wishId = 'wish-123';
      const message = 'Invalid enhancement type';
      const error = new EnhancementError(message, wishId, 'priority');
      
      expect(error).toBeInstanceOf(Error);
      expect(error.name).toBe('EnhancementError');
      expect(error.code).toBe('ENHANCEMENT_ERROR');
      expect(error.wishId).toBe(wishId);
      expect(error.enhancementType).toBe('priority');
      expect(error.message).toContain(wishId);
    });

    it('should create TransactionError with rollback information', () => {
      const transactionId = 'tx-123';
      const error = new TransactionError('Transaction failed', transactionId, true);
      
      expect(error).toBeInstanceOf(Error);
      expect(error.name).toBe('TransactionError');
      expect(error.code).toBe('TRANSACTION_ERROR');
      expect(error.transactionId).toBe(transactionId);
      expect(error.rollbackAttempted).toBe(true);
    });
  });

  describe('Error Utilities', () => {
    it('should identify mana system errors correctly', () => {
      const manaError = new InsufficientManaError(100, 50);
      const standardError = new Error('Standard error');
      
      expect(isManaSystemError(manaError)).toBe(true);
      expect(isManaSystemError(standardError)).toBe(false);
    });

    it('should extract user error messages correctly', () => {
      const manaError = new InsufficientManaError(100, 50);
      const standardError = new Error('Standard error');
      
      const manaMessage = getUserErrorMessage(manaError);
      const standardMessage = getUserErrorMessage(standardError);
      
      expect(manaMessage).toContain('Недостаточно Маны');
      expect(standardMessage).toBe('Произошла неожиданная ошибка. Попробуйте позже.');
    });

    it('should create proper error responses for API', () => {
      const error = new InsufficientManaError(100, 50);
      const response = createErrorResponse(error, 400);
      
      expect(response.success).toBe(false);
      expect(response.error.code).toBe('INSUFFICIENT_MANA');
      expect(response.error.userMessage).toContain('Недостаточно Маны');
      expect(response.error.timestamp).toBeDefined();
    });
  });

  describe('Mana Validator', () => {
    it('should validate user ID correctly', () => {
      const validUser = manaValidator.validateUser('user-123');
      const invalidUser = manaValidator.validateUser('');
      const nullUser = manaValidator.validateUser(null);
      
      expect(validUser.isValid).toBe(true);
      expect(validUser.userExists).toBe(true);
      expect(validUser.userId).toBe('user-123');
      
      expect(invalidUser.isValid).toBe(false);
      expect(invalidUser.errors).toContain('ID пользователя обязателен');
      
      expect(nullUser.isValid).toBe(false);
      expect(nullUser.errors).toContain('ID пользователя обязателен');
    });

    it('should validate mana amounts correctly', () => {
      const validAmount = manaValidator.validateManaAmount(100);
      const negativeAmount = manaValidator.validateManaAmount(-50);
      const zeroAmount = manaValidator.validateManaAmount(0);
      const nonIntegerAmount = manaValidator.validateManaAmount(50.5);
      const tooLargeAmount = manaValidator.validateManaAmount(2000000);
      
      expect(validAmount.isValid).toBe(true);
      expect(validAmount.amount).toBe(100);
      
      expect(negativeAmount.isValid).toBe(false);
      expect(negativeAmount.errors).toContain('Количество Маны должно быть положительным');
      
      expect(zeroAmount.isValid).toBe(false);
      expect(zeroAmount.errors).toContain('Количество Маны должно быть положительным');
      
      expect(nonIntegerAmount.isValid).toBe(false);
      expect(nonIntegerAmount.errors).toContain('Количество Маны должно быть целым числом');
      
      expect(tooLargeAmount.isValid).toBe(false);
      expect(tooLargeAmount.errors).toContain('Количество Маны слишком большое (максимум: 1,000,000)');
    });

    it('should validate mana operations correctly', () => {
      const userId = 'user-123';
      const amount = 100;
      const currentBalance = 200;
      const reason = 'Test operation';
      
      const validSpend = manaValidator.validateManaOperation(
        userId, amount, currentBalance, 'spend', reason
      );
      
      expect(validSpend.isValid).toBe(true);
      expect(validSpend.canProceed).toBe(true);
      expect(validSpend.afterOperationBalance).toBe(100);
      
      const insufficientSpend = manaValidator.validateManaOperation(
        userId, 300, currentBalance, 'spend', reason
      );
      
      expect(insufficientSpend.isValid).toBe(true);
      expect(insufficientSpend.canProceed).toBe(false);
      expect(insufficientSpend.errors).toContain('Недостаточно Маны');
    });

    it('should validate enhancement types correctly', () => {
      const validPriority = manaValidator.validateEnhancementType('priority');
      const validAura = manaValidator.validateEnhancementType('aura');
      const invalidType = manaValidator.validateEnhancementType('invalid');
      const nullType = manaValidator.validateEnhancementType(null);
      
      expect(validPriority.isValid).toBe(true);
      expect(validPriority.type).toBe('priority');
      
      expect(validAura.isValid).toBe(true);
      expect(validAura.type).toBe('aura');
      
      expect(invalidType.isValid).toBe(false);
      expect(invalidType.errors).toContain('Неверный тип усиления: invalid');
      
      expect(nullType.isValid).toBe(false);
      expect(nullType.errors).toContain('Тип усиления обязателен');
    });

    it('should validate priority levels correctly', () => {
      const validLevel = manaValidator.validatePriorityLevel(3, 2);
      const sameLevel = manaValidator.validatePriorityLevel(2, 2);
      const lowerLevel = manaValidator.validatePriorityLevel(1, 2);
      const tooHighLevel = manaValidator.validatePriorityLevel(6, 0);
      const invalidLevel = manaValidator.validatePriorityLevel('invalid', 0);
      
      expect(validLevel.isValid).toBe(true);
      expect(validLevel.level).toBe(3);
      expect(validLevel.isUpgrade).toBe(true);
      
      expect(sameLevel.isValid).toBe(false);
      expect(sameLevel.errors[0]).toContain('должен быть выше текущего');
      
      expect(lowerLevel.isValid).toBe(false);
      expect(lowerLevel.errors[0]).toContain('должен быть выше текущего');
      
      expect(tooHighLevel.isValid).toBe(false);
      expect(tooHighLevel.errors[0]).toContain('должен быть от 1 до 5');
      
      expect(invalidLevel.isValid).toBe(false);
      expect(invalidLevel.errors[0]).toContain('должен быть числом');
    });

    it('should validate aura types correctly', () => {
      const validRomantic = manaValidator.validateAuraType('romantic');
      const validGaming = manaValidator.validateAuraType('gaming');
      const validMysterious = manaValidator.validateAuraType('mysterious');
      const invalidAura = manaValidator.validateAuraType('invalid');
      const nullAura = manaValidator.validateAuraType(null);
      
      expect(validRomantic.isValid).toBe(true);
      expect(validRomantic.auraType).toBe('romantic');
      
      expect(validGaming.isValid).toBe(true);
      expect(validGaming.auraType).toBe('gaming');
      
      expect(validMysterious.isValid).toBe(true);
      expect(validMysterious.auraType).toBe('mysterious');
      
      expect(invalidAura.isValid).toBe(false);
      expect(invalidAura.errors).toContain('Неверный тип ауры: invalid');
      
      expect(nullAura.isValid).toBe(false);
      expect(nullAura.errors).toContain('Тип ауры обязателен');
    });

    it('should validate migration data correctly', () => {
      const validMigration = manaValidator.validateMigrationData(
        'user-123', 10, 5, 2
      );
      
      expect(validMigration.isValid).toBe(true);
      expect(validMigration.totalMana).toBe(2600); // 10*10 + 5*100 + 2*1000 = 100 + 500 + 2000
      
      const invalidMigration = manaValidator.validateMigrationData(
        '', -5, 'invalid', 2
      );
      
      expect(invalidMigration.isValid).toBe(false);
      expect(invalidMigration.errors.length).toBeGreaterThan(0);
    });

    it('should create validation errors correctly', () => {
      const validation = { errors: ['Error 1', 'Error 2'] };
      const error = manaValidator.createValidationError(validation, { test: true });
      
      expect(error).toBeInstanceOf(ManaValidationError);
      expect(error.validationErrors).toEqual(['Error 1', 'Error 2']);
      expect(error.context).toEqual(expect.objectContaining({ test: true }));
    });
  });

  describe('Transaction Manager', () => {
    it('should generate unique transaction IDs', () => {
      const id1 = (manaTransactionManager as any).generateTransactionId();
      const id2 = (manaTransactionManager as any).generateTransactionId();
      
      expect(id1).toMatch(/^mana_tx_\d+_[a-z0-9]+$/);
      expect(id2).toMatch(/^mana_tx_\d+_[a-z0-9]+$/);
      expect(id1).not.toBe(id2);
    });

    it('should track active transactions', () => {
      const activeTransactions = manaTransactionManager.getActiveTransactions();
      expect(Array.isArray(activeTransactions)).toBe(true);
    });

    it('should cleanup completed transactions', () => {
      expect(() => manaTransactionManager.cleanupCompletedTransactions()).not.toThrow();
    });
  });

  describe('Error Logging', () => {
    it('should log mana errors without throwing', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      const error = new InsufficientManaError(100, 50);
      expect(() => logManaError(error, { test: true })).not.toThrow();
      
      expect(consoleSpy).toHaveBeenCalledWith(
        'Mana System Error:',
        expect.objectContaining({
          name: 'InsufficientManaError',
          code: 'INSUFFICIENT_MANA'
        })
      );
      
      consoleSpy.mockRestore();
    });

    it('should log standard errors without throwing', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      const error = new Error('Standard error');
      expect(() => logManaError(error, { test: true })).not.toThrow();
      
      expect(consoleSpy).toHaveBeenCalledWith(
        'Unexpected Error in Mana System:',
        expect.objectContaining({
          message: 'Standard error'
        })
      );
      
      consoleSpy.mockRestore();
    });
  });

  describe('Russian Localization', () => {
    it('should provide Russian error messages', () => {
      const insufficientError = new InsufficientManaError(100, 50);
      const validationError = new ManaValidationError(['Тестовая ошибка']);
      const enhancementError = new EnhancementError('Test error', 'wish-123');
      
      expect(insufficientError.getUserMessage()).toMatch(/Недостаточно Маны/);
      expect(validationError.getUserMessage()).toMatch(/Ошибка валидации/);
      expect(enhancementError.getUserMessage()).toMatch(/Не удалось применить усиление/);
    });

    it('should provide fallback messages for unknown errors', () => {
      const standardError = new Error('Unknown error');
      const message = getUserErrorMessage(standardError);
      
      expect(message).toBe('Произошла неожиданная ошибка. Попробуйте позже.');
    });
  });

  describe('Error Context and Metadata', () => {
    it('should preserve error context in all error types', () => {
      const context = { userId: 'user-123', operation: 'test' };
      
      const error = new ManaOperationError('test', 'user-123', 'Test error', 'Тест', context);
      const details = error.getDetails();
      
      expect(details.context).toEqual(expect.objectContaining(context));
      expect(details.timestamp).toBeInstanceOf(Date);
      expect(details.name).toBe('ManaOperationError');
    });

    it('should handle errors without context gracefully', () => {
      const error = new InsufficientManaError(100, 50);
      const details = error.getDetails();
      
      expect(details.context).toBeDefined();
      expect(details.context.required).toBe(100);
      expect(details.context.available).toBe(50);
    });
  });
});

describe('Integration Error Handling', () => {
  it('should handle cascading validation errors', () => {
    // Test multiple validation failures
    const userValidation = manaValidator.validateUser('');
    const amountValidation = manaValidator.validateManaAmount(-50);
    
    expect(userValidation.isValid).toBe(false);
    expect(amountValidation.isValid).toBe(false);
    
    // Both should have meaningful error messages
    expect(userValidation.errors.length).toBeGreaterThan(0);
    expect(amountValidation.errors.length).toBeGreaterThan(0);
  });

  it('should maintain error chain in complex operations', () => {
    const wishId = 'invalid-wish';
    const userId = '';
    const level = -1;
    
    const validation = manaValidator.validatePriorityEnhancement(
      wishId, userId, level, 0, 100, 'other-user', 'active'
    );
    
    expect(validation.isValid).toBe(false);
    expect(validation.canApply).toBe(false);
    expect(validation.errors.length).toBeGreaterThan(1); // Multiple validation failures
  });
});