/**
 * Unit tests for admin security functions
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { 
  validateAdminAccess,
  validateAdminAccessByTelegramId,
  getAdminUser,
  logAdminAction,
  getAdminAuditLog,
  withAdminAuth,
  AdminSecurityError,
  isAdminOperationAllowed,
  getAdminConfigStatus,
  validateAndLogAdminAction
} from '../../lib/admin-security';
import { getUserFromRequest } from '../../lib/telegram-auth';

// Mock dependencies
vi.mock('../../lib/telegram-auth');
vi.mock('@neondatabase/serverless', () => ({
  neon: vi.fn(() => vi.fn())
}));

const mockSql = vi.fn();
vi.mock('@neondatabase/serverless', () => ({
  neon: () => mockSql
}));

describe('Admin Security Functions', () => {
  const MOCK_ADMIN_TELEGRAM_ID = '123456789';
  const MOCK_USER_ID = 'user-123';
  const MOCK_ADMIN_USER_ID = 'admin-123';

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.ADMIN_TELEGRAM_ID = MOCK_ADMIN_TELEGRAM_ID;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('validateAdminAccess', () => {
    it('should return true for admin user', async () => {
      mockSql.mockResolvedValueOnce([{ telegram_id: MOCK_ADMIN_TELEGRAM_ID }]);

      const result = await validateAdminAccess(MOCK_ADMIN_USER_ID);

      expect(result).toBe(true);
      expect(mockSql).toHaveBeenCalled();
    });

    it('should return false for non-admin user', async () => {
      mockSql.mockResolvedValueOnce([{ telegram_id: 'different-id' }]);

      const result = await validateAdminAccess(MOCK_USER_ID);

      expect(result).toBe(false);
    });

    it('should return false for non-existent user', async () => {
      mockSql.mockResolvedValueOnce([]);

      const result = await validateAdminAccess('non-existent');

      expect(result).toBe(false);
    });

    it('should return false on database error', async () => {
      mockSql.mockRejectedValueOnce(new Error('Database error'));

      const result = await validateAdminAccess(MOCK_USER_ID);

      expect(result).toBe(false);
    });
  });

  describe('validateAdminAccessByTelegramId', () => {
    it('should return true for admin telegram ID', async () => {
      const result = await validateAdminAccessByTelegramId(MOCK_ADMIN_TELEGRAM_ID);

      expect(result).toBe(true);
    });

    it('should return false for non-admin telegram ID', async () => {
      const result = await validateAdminAccessByTelegramId('different-id');

      expect(result).toBe(false);
    });

    it('should return false when ADMIN_TELEGRAM_ID is not set', async () => {
      delete process.env.ADMIN_TELEGRAM_ID;

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

      const result = await getAdminUser(MOCK_ADMIN_USER_ID);

      expect(result).toEqual({
        ...mockUser,
        is_admin: true
      });
    });

    it('should return null for non-admin user', async () => {
      mockSql.mockResolvedValueOnce([]);

      const result = await getAdminUser(MOCK_USER_ID);

      expect(result).toBe(null);
    });

    it('should return null on database error', async () => {
      mockSql.mockRejectedValueOnce(new Error('Database error'));

      const result = await getAdminUser(MOCK_USER_ID);

      expect(result).toBe(null);
    });
  });

  describe('logAdminAction', () => {
    it('should log admin action successfully', async () => {
      mockSql.mockResolvedValueOnce([]);

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

      expect(mockSql).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.stringContaining('INSERT INTO admin_audit_log')
        ])
      );
    });

    it('should not throw error on logging failure', async () => {
      mockSql.mockRejectedValueOnce(new Error('Database error'));

      await expect(
        logAdminAction(MOCK_ADMIN_USER_ID, 'TEST_ACTION', 'Test reason')
      ).resolves.not.toThrow();
    });
  });

  describe('getAdminAuditLog', () => {
    it('should retrieve audit log entries', async () => {
      const mockEntries = [
        {
          id: 'log-1',
          admin_user_id: MOCK_ADMIN_USER_ID,
          target_user_id: MOCK_USER_ID,
          action_type: 'TEST_ACTION',
          old_values: '{"old": "value"}',
          new_values: '{"new": "value"}',
          reason: 'Test reason',
          ip_address: '127.0.0.1',
          user_agent: 'test-agent',
          created_at: '2024-01-15T10:00:00Z'
        }
      ];
      mockSql.mockResolvedValueOnce(mockEntries);

      const result = await getAdminAuditLog(10, 0);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        id: 'log-1',
        admin_user_id: MOCK_ADMIN_USER_ID,
        target_user_id: MOCK_USER_ID,
        action_type: 'TEST_ACTION',
        old_values: { old: 'value' },
        new_values: { new: 'value' },
        reason: 'Test reason',
        ip_address: '127.0.0.1',
        user_agent: 'test-agent',
        created_at: new Date('2024-01-15T10:00:00Z')
      });
    });

    it('should return empty array on database error', async () => {
      mockSql.mockRejectedValueOnce(new Error('Database error'));

      const result = await getAdminAuditLog();

      expect(result).toEqual([]);
    });
  });

  describe('withAdminAuth middleware', () => {
    const mockHandler = vi.fn();
    const mockReq = {
      url: '/api/admin/test',
      method: 'GET',
      headers: { 'user-agent': 'test-agent' },
      socket: { remoteAddress: '127.0.0.1' }
    } as any;
    const mockRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn()
    } as any;

    beforeEach(() => {
      vi.clearAllMocks();
    });

    it('should call handler for authenticated admin user', async () => {
      const mockUser = { id: MOCK_ADMIN_USER_ID };
      const mockAdminUser = {
        id: MOCK_ADMIN_USER_ID,
        telegram_id: MOCK_ADMIN_TELEGRAM_ID,
        name: 'Admin User',
        username: 'admin',
        is_admin: true
      };

      vi.mocked(getUserFromRequest).mockResolvedValueOnce(mockUser as any);
      mockSql.mockResolvedValueOnce([{ telegram_id: MOCK_ADMIN_TELEGRAM_ID }]); // validateAdminAccess
      mockSql.mockResolvedValueOnce([mockAdminUser]); // getAdminUser
      mockSql.mockResolvedValueOnce([]); // logAdminAction

      const wrappedHandler = withAdminAuth(mockHandler);
      await wrappedHandler(mockReq, mockRes);

      expect(mockHandler).toHaveBeenCalledWith(mockReq, mockRes, mockAdminUser);
    });

    it('should return 401 for unauthenticated user', async () => {
      vi.mocked(getUserFromRequest).mockResolvedValueOnce(null);

      const wrappedHandler = withAdminAuth(mockHandler);
      await wrappedHandler(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Authentication required',
        code: 'AUTH_REQUIRED'
      });
      expect(mockHandler).not.toHaveBeenCalled();
    });

    it('should return 403 for non-admin user', async () => {
      const mockUser = { id: MOCK_USER_ID };
      vi.mocked(getUserFromRequest).mockResolvedValueOnce(mockUser as any);
      mockSql.mockResolvedValueOnce([{ telegram_id: 'different-id' }]); // validateAdminAccess
      mockSql.mockResolvedValueOnce([]); // logAdminAction for unauthorized attempt

      const wrappedHandler = withAdminAuth(mockHandler);
      await wrappedHandler(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Administrative privileges required',
        code: 'ADMIN_REQUIRED'
      });
      expect(mockHandler).not.toHaveBeenCalled();
    });

    it('should return 500 for unexpected errors', async () => {
      vi.mocked(getUserFromRequest).mockRejectedValueOnce(new Error('Unexpected error'));

      const wrappedHandler = withAdminAuth(mockHandler);
      await wrappedHandler(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Internal server error',
        code: 'INTERNAL_ERROR'
      });
      expect(mockHandler).not.toHaveBeenCalled();
    });
  });

  describe('validateAndLogAdminAction', () => {
    const mockAdminUser = {
      id: MOCK_ADMIN_USER_ID,
      telegram_id: MOCK_ADMIN_TELEGRAM_ID,
      name: 'Admin User',
      username: 'admin',
      is_admin: true
    };

    it('should validate and log admin action successfully', async () => {
      mockSql.mockResolvedValueOnce([]); // logAdminAction

      await validateAndLogAdminAction(
        mockAdminUser,
        'TEST_ACTION',
        'Valid reason',
        MOCK_USER_ID,
        { old: 'value' },
        { new: 'value' }
      );

      expect(mockSql).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.stringContaining('INSERT INTO admin_audit_log')
        ])
      );
    });

    it('should throw error for empty reason', async () => {
      await expect(
        validateAndLogAdminAction(mockAdminUser, 'TEST_ACTION', '')
      ).rejects.toThrow(AdminSecurityError);
    });

    it('should throw error for whitespace-only reason', async () => {
      await expect(
        validateAndLogAdminAction(mockAdminUser, 'TEST_ACTION', '   ')
      ).rejects.toThrow(AdminSecurityError);
    });

    it('should throw error for reason too long', async () => {
      const longReason = 'a'.repeat(501);
      
      await expect(
        validateAndLogAdminAction(mockAdminUser, 'TEST_ACTION', longReason)
      ).rejects.toThrow(AdminSecurityError);
    });
  });

  describe('isAdminOperationAllowed', () => {
    it('should return true in development environment', () => {
      process.env.NODE_ENV = 'development';

      const result = isAdminOperationAllowed();

      expect(result).toBe(true);
    });

    it('should return true in production with admin telegram ID set', () => {
      process.env.NODE_ENV = 'production';
      process.env.ADMIN_TELEGRAM_ID = MOCK_ADMIN_TELEGRAM_ID;

      const result = isAdminOperationAllowed();

      expect(result).toBe(true);
    });

    it('should return false in production without admin telegram ID', () => {
      process.env.NODE_ENV = 'production';
      delete process.env.ADMIN_TELEGRAM_ID;

      const result = isAdminOperationAllowed();

      expect(result).toBe(false);
    });
  });

  describe('getAdminConfigStatus', () => {
    it('should return config status with admin ID in development', () => {
      process.env.NODE_ENV = 'development';
      process.env.ADMIN_TELEGRAM_ID = MOCK_ADMIN_TELEGRAM_ID;

      const result = getAdminConfigStatus();

      expect(result).toEqual({
        isConfigured: true,
        adminTelegramId: MOCK_ADMIN_TELEGRAM_ID,
        environment: 'development'
      });
    });

    it('should not return admin ID in production', () => {
      process.env.NODE_ENV = 'production';
      process.env.ADMIN_TELEGRAM_ID = MOCK_ADMIN_TELEGRAM_ID;

      const result = getAdminConfigStatus();

      expect(result).toEqual({
        isConfigured: true,
        adminTelegramId: undefined,
        environment: 'production'
      });
    });

    it('should return unconfigured status', () => {
      delete process.env.ADMIN_TELEGRAM_ID;

      const result = getAdminConfigStatus();

      expect(result).toEqual({
        isConfigured: false,
        adminTelegramId: undefined,
        environment: process.env.NODE_ENV || 'development'
      });
    });
  });

  describe('AdminSecurityError', () => {
    it('should create error with message and code', () => {
      const error = new AdminSecurityError('Test message', 'TEST_CODE');

      expect(error.message).toBe('Test message');
      expect(error.code).toBe('TEST_CODE');
      expect(error.name).toBe('AdminSecurityError');
      expect(error).toBeInstanceOf(Error);
    });
  });
});