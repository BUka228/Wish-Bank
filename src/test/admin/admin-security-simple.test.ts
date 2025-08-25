/**
 * Simplified unit tests for admin security functions
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the neon database
const mockSql = vi.fn();
vi.mock('@neondatabase/serverless', () => ({
  neon: () => mockSql
}));

// Mock telegram auth
vi.mock('../../lib/telegram-auth', () => ({
  getUserFromRequest: vi.fn()
}));

describe('Admin Security Functions - Core Tests', () => {
  const MOCK_ADMIN_TELEGRAM_ID = '123456789';
  const MOCK_USER_ID = 'user-123';
  const MOCK_ADMIN_USER_ID = 'admin-123';

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.ADMIN_TELEGRAM_ID = MOCK_ADMIN_TELEGRAM_ID;
  });

  describe('validateAdminAccess', () => {
    it('should return true for admin user', async () => {
      mockSql.mockResolvedValueOnce([{ telegram_id: MOCK_ADMIN_TELEGRAM_ID }]);

      const { validateAdminAccess } = await import('../../lib/admin-security');
      const result = await validateAdminAccess(MOCK_ADMIN_USER_ID);

      expect(result).toBe(true);
      expect(mockSql).toHaveBeenCalled();
    });

    it('should return false for non-admin user', async () => {
      mockSql.mockResolvedValueOnce([{ telegram_id: 'different-id' }]);

      const { validateAdminAccess } = await import('../../lib/admin-security');
      const result = await validateAdminAccess(MOCK_USER_ID);

      expect(result).toBe(false);
    });

    it('should return false for non-existent user', async () => {
      mockSql.mockResolvedValueOnce([]);

      const { validateAdminAccess } = await import('../../lib/admin-security');
      const result = await validateAdminAccess('non-existent');

      expect(result).toBe(false);
    });

    it('should return false on database error', async () => {
      mockSql.mockRejectedValueOnce(new Error('Database error'));

      const { validateAdminAccess } = await import('../../lib/admin-security');
      const result = await validateAdminAccess(MOCK_USER_ID);

      expect(result).toBe(false);
    });
  });

  describe('validateAdminAccessByTelegramId', () => {
    it('should return true for admin telegram ID', async () => {
      const { validateAdminAccessByTelegramId } = await import('../../lib/admin-security');
      const result = await validateAdminAccessByTelegramId(MOCK_ADMIN_TELEGRAM_ID);

      expect(result).toBe(true);
    });

    it('should return false for non-admin telegram ID', async () => {
      const { validateAdminAccessByTelegramId } = await import('../../lib/admin-security');
      const result = await validateAdminAccessByTelegramId('different-id');

      expect(result).toBe(false);
    });

    it('should return false when ADMIN_TELEGRAM_ID is not set', async () => {
      delete process.env.ADMIN_TELEGRAM_ID;

      const { validateAdminAccessByTelegramId } = await import('../../lib/admin-security');
      const result = await validateAdminAccessByTelegramId(MOCK_ADMIN_TELEGRAM_ID);

      expect(result).toBe(false);
    });
  });

  describe('getAdminUser', () => {
    it('should return admin user data for valid admin', async () => {
      const mockUser = {
        id: MOCK_ADMIN_USER_ID,
        telegram_id: MOCK_ADMIN_TELEGRAM_ID,
        name: 'Admin User',
        username: 'admin'
      };
      mockSql.mockResolvedValueOnce([mockUser]);

      const { getAdminUser } = await import('../../lib/admin-security');
      const result = await getAdminUser(MOCK_ADMIN_USER_ID);

      expect(result).toEqual({
        ...mockUser,
        is_admin: true
      });
    });

    it('should return null for non-admin user', async () => {
      mockSql.mockResolvedValueOnce([]);

      const { getAdminUser } = await import('../../lib/admin-security');
      const result = await getAdminUser(MOCK_USER_ID);

      expect(result).toBe(null);
    });
  });

  describe('logAdminAction', () => {
    it('should log admin action successfully', async () => {
      mockSql.mockResolvedValueOnce([]);

      const { logAdminAction } = await import('../../lib/admin-security');
      await logAdminAction(
        MOCK_ADMIN_USER_ID,
        'TEST_ACTION',
        'Test reason',
        MOCK_USER_ID,
        { old: 'value' },
        { new: 'value' },
        '127.0.0.1',
        'test-agent'
      );

      expect(mockSql).toHaveBeenCalled();
    });

    it('should not throw error on logging failure', async () => {
      mockSql.mockRejectedValueOnce(new Error('Database error'));

      const { logAdminAction } = await import('../../lib/admin-security');
      await expect(
        logAdminAction(MOCK_ADMIN_USER_ID, 'TEST_ACTION', 'Test reason')
      ).resolves.not.toThrow();
    });
  });

  describe('AdminSecurityError', () => {
    it('should create error with message and code', async () => {
      const { AdminSecurityError } = await import('../../lib/admin-security');
      const error = new AdminSecurityError('Test message', 'TEST_CODE');

      expect(error.message).toBe('Test message');
      expect(error.code).toBe('TEST_CODE');
      expect(error.name).toBe('AdminSecurityError');
      expect(error).toBeInstanceOf(Error);
    });
  });

  describe('isAdminOperationAllowed', () => {
    it('should return true in development environment', async () => {
      process.env.NODE_ENV = 'development';

      const { isAdminOperationAllowed } = await import('../../lib/admin-security');
      const result = isAdminOperationAllowed();

      expect(result).toBe(true);
    });

    it('should return true in production with admin telegram ID set', async () => {
      process.env.NODE_ENV = 'production';
      process.env.ADMIN_TELEGRAM_ID = MOCK_ADMIN_TELEGRAM_ID;

      const { isAdminOperationAllowed } = await import('../../lib/admin-security');
      const result = isAdminOperationAllowed();

      expect(result).toBe(true);
    });

    it('should return false in production without admin telegram ID', async () => {
      process.env.NODE_ENV = 'production';
      delete process.env.ADMIN_TELEGRAM_ID;

      const { isAdminOperationAllowed } = await import('../../lib/admin-security');
      const result = isAdminOperationAllowed();

      expect(result).toBe(false);
    });
  });

  describe('getAdminConfigStatus', () => {
    it('should return config status with admin ID in development', async () => {
      process.env.NODE_ENV = 'development';
      process.env.ADMIN_TELEGRAM_ID = MOCK_ADMIN_TELEGRAM_ID;

      const { getAdminConfigStatus } = await import('../../lib/admin-security');
      const result = getAdminConfigStatus();

      expect(result).toEqual({
        isConfigured: true,
        adminTelegramId: MOCK_ADMIN_TELEGRAM_ID,
        environment: 'development'
      });
    });

    it('should not return admin ID in production', async () => {
      process.env.NODE_ENV = 'production';
      process.env.ADMIN_TELEGRAM_ID = MOCK_ADMIN_TELEGRAM_ID;

      const { getAdminConfigStatus } = await import('../../lib/admin-security');
      const result = getAdminConfigStatus();

      expect(result).toEqual({
        isConfigured: true,
        adminTelegramId: undefined,
        environment: 'production'
      });
    });
  });
});