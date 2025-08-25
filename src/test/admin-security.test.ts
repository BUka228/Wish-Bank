import { describe, it, expect, vi, beforeEach } from 'vitest';
import { 
  validateAdminAccess, 
  validateAdminAccessByTelegramId, 
  AdminSecurityError,
  logAdminAction,
  isAdminOperationAllowed,
  getAdminConfigStatus
} from '../lib/admin-security';

// Mock the database
vi.mock('@neondatabase/serverless', () => ({
  neon: vi.fn(() => vi.fn())
}));

describe('Admin Security', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset environment variables
    delete process.env.ADMIN_TELEGRAM_ID;
    delete process.env.NODE_ENV;
  });

  describe('validateAdminAccessByTelegramId', () => {
    it('should return true for admin telegram ID', async () => {
      // We need to re-import the module after setting the env var
      process.env.ADMIN_TELEGRAM_ID = '123456789';
      
      // Clear the module cache and re-import
      vi.resetModules();
      const { validateAdminAccessByTelegramId } = await import('../lib/admin-security');
      
      const result = await validateAdminAccessByTelegramId('123456789');
      expect(result).toBe(true);
    });

    it('should return false for non-admin telegram ID', async () => {
      process.env.ADMIN_TELEGRAM_ID = '123456789';
      
      // Clear the module cache and re-import
      vi.resetModules();
      const { validateAdminAccessByTelegramId } = await import('../lib/admin-security');
      
      const result = await validateAdminAccessByTelegramId('987654321');
      expect(result).toBe(false);
    });

    it('should return false when admin telegram ID is not set', async () => {
      delete process.env.ADMIN_TELEGRAM_ID;
      
      // Clear the module cache and re-import
      vi.resetModules();
      const { validateAdminAccessByTelegramId } = await import('../lib/admin-security');
      
      const result = await validateAdminAccessByTelegramId('123456789');
      expect(result).toBe(false);
    });
  });

  describe('AdminSecurityError', () => {
    it('should create error with message and code', () => {
      const error = new AdminSecurityError('Test error', 'TEST_CODE');
      
      expect(error.message).toBe('Test error');
      expect(error.code).toBe('TEST_CODE');
      expect(error.name).toBe('AdminSecurityError');
      expect(error instanceof Error).toBe(true);
    });
  });

  describe('isAdminOperationAllowed', () => {
    it('should return true in development environment', () => {
      process.env.NODE_ENV = 'development';
      
      const result = isAdminOperationAllowed();
      expect(result).toBe(true);
    });

    it('should return true in production when admin telegram ID is set', () => {
      process.env.NODE_ENV = 'production';
      process.env.ADMIN_TELEGRAM_ID = '123456789';
      
      const result = isAdminOperationAllowed();
      expect(result).toBe(true);
    });

    it('should return false in production when admin telegram ID is not set', () => {
      process.env.NODE_ENV = 'production';
      
      const result = isAdminOperationAllowed();
      expect(result).toBe(false);
    });
  });

  describe('getAdminConfigStatus', () => {
    it('should return correct config status when admin ID is set', () => {
      process.env.ADMIN_TELEGRAM_ID = '123456789';
      process.env.NODE_ENV = 'development';
      
      const result = getAdminConfigStatus();
      
      expect(result.isConfigured).toBe(true);
      expect(result.adminTelegramId).toBe('123456789');
      expect(result.environment).toBe('development');
    });

    it('should return correct config status when admin ID is not set', () => {
      process.env.NODE_ENV = 'production';
      
      const result = getAdminConfigStatus();
      
      expect(result.isConfigured).toBe(false);
      expect(result.adminTelegramId).toBeUndefined();
      expect(result.environment).toBe('production');
    });

    it('should not expose admin telegram ID in production', () => {
      process.env.ADMIN_TELEGRAM_ID = '123456789';
      process.env.NODE_ENV = 'production';
      
      const result = getAdminConfigStatus();
      
      expect(result.isConfigured).toBe(true);
      expect(result.adminTelegramId).toBeUndefined();
      expect(result.environment).toBe('production');
    });
  });

  describe('logAdminAction', () => {
    it('should not throw error when logging fails', async () => {
      // Mock database to throw error
      const { neon } = await import('@neondatabase/serverless');
      const mockSql = vi.fn().mockRejectedValue(new Error('Database error'));
      (neon as any).mockReturnValue(mockSql);
      
      // Should not throw
      await expect(logAdminAction(
        'admin-id',
        'TEST_ACTION',
        'Test reason'
      )).resolves.toBeUndefined();
    });
  });
});

describe('Admin Security Integration', () => {
  it('should handle complete admin validation flow', async () => {
    process.env.ADMIN_TELEGRAM_ID = '123456789';
    process.env.NODE_ENV = 'development';
    
    // Clear the module cache and re-import
    vi.resetModules();
    const { 
      getAdminConfigStatus, 
      isAdminOperationAllowed, 
      validateAdminAccessByTelegramId 
    } = await import('../lib/admin-security');
    
    // Test configuration
    const config = getAdminConfigStatus();
    expect(config.isConfigured).toBe(true);
    expect(config.environment).toBe('development');
    
    // Test operations allowed
    const operationsAllowed = isAdminOperationAllowed();
    expect(operationsAllowed).toBe(true);
    
    // Test telegram ID validation
    const isValidAdmin = await validateAdminAccessByTelegramId('123456789');
    expect(isValidAdmin).toBe(true);
    
    const isInvalidAdmin = await validateAdminAccessByTelegramId('987654321');
    expect(isInvalidAdmin).toBe(false);
  });
});