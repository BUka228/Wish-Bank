/**
 * Unit tests for admin audit functions
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  logAdminAction,
  getAuditLogs,
  getAuditLogStats,
  getActionTypeStats,
  logUserParameterChange,
  logSharedWishCreation,
  logSharedWishManagement,
  cleanupOldAuditLogs,
  exportAuditLogs
} from '../../lib/admin-audit-functions';

// Mock the database pool
vi.mock('../../lib/db-pool', () => {
  const mockSql = vi.fn();
  const mockTransaction = vi.fn();
  const mockDb = {
    transaction: mockTransaction
  };
  
  return {
    sql: mockSql,
    db: mockDb
  };
});

describe('Admin Audit Functions', () => {
  const MOCK_ADMIN_USER_ID = 'admin-123';
  const MOCK_TARGET_USER_ID = 'user-456';
  const MOCK_SHARED_WISH_ID = 'wish-789';

  let mockSql: any;
  let mockDb: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    const dbPool = await import('../../lib/db-pool');
    mockSql = vi.mocked(dbPool.sql);
    mockDb = vi.mocked(dbPool.db);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('logAdminAction', () => {
    it('should log admin action successfully', async () => {
      mockSql.mockResolvedValueOnce([]);

      const entry = {
        adminUserId: MOCK_ADMIN_USER_ID,
        targetUserId: MOCK_TARGET_USER_ID,
        actionType: 'USER_PARAMETER_CHANGE',
        oldValues: { mana_balance: 100 },
        newValues: { mana_balance: 150 },
        reason: 'Test adjustment',
        ipAddress: '127.0.0.1',
        userAgent: 'test-agent'
      };

      await logAdminAction(entry);

      expect(mockSql).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.stringContaining('INSERT INTO admin_audit_log')
        ])
      );
    });

    it('should handle logging failure gracefully', async () => {
      mockSql.mockRejectedValueOnce(new Error('Database error'));

      const entry = {
        adminUserId: MOCK_ADMIN_USER_ID,
        actionType: 'TEST_ACTION',
        reason: 'Test reason'
      };

      // Should not throw error
      await expect(logAdminAction(entry)).resolves.not.toThrow();
    });

    it('should handle null values correctly', async () => {
      mockSql.mockResolvedValueOnce([]);

      const entry = {
        adminUserId: MOCK_ADMIN_USER_ID,
        actionType: 'TEST_ACTION',
        reason: 'Test reason'
        // targetUserId, oldValues, newValues, ipAddress, userAgent are undefined
      };

      await logAdminAction(entry);

      expect(mockSql).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.stringContaining('INSERT INTO admin_audit_log')
        ])
      );
    });
  });

  describe('getAuditLogs', () => {
    const mockAuditLogEntry = {
      id: 'log-1',
      admin_user_id: MOCK_ADMIN_USER_ID,
      admin_name: 'Admin User',
      admin_username: 'admin',
      target_user_id: MOCK_TARGET_USER_ID,
      target_user_name: 'Target User',
      target_username: 'target',
      action_type: 'USER_PARAMETER_CHANGE',
      old_values: { mana_balance: 100 },
      new_values: { mana_balance: 150 },
      reason: 'Test adjustment',
      ip_address: '127.0.0.1',
      user_agent: 'test-agent',
      created_at: '2024-01-15T10:00:00Z'
    };

    it('should retrieve audit logs without filters', async () => {
      mockSql.mockResolvedValueOnce([mockAuditLogEntry]);

      const result = await getAuditLogs();

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(mockAuditLogEntry);
      expect(mockSql).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.stringContaining('SELECT'),
          expect.stringContaining('admin_audit_log'),
          expect.stringContaining('ORDER BY'),
          expect.stringContaining('LIMIT 50 OFFSET 0')
        ])
      );
    });

    it('should retrieve audit logs with admin filter', async () => {
      mockSql.mockResolvedValueOnce([mockAuditLogEntry]);

      const result = await getAuditLogs({ adminUserId: MOCK_ADMIN_USER_ID });

      expect(result).toHaveLength(1);
      expect(mockSql).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.stringContaining('WHERE')
        ])
      );
    });

    it('should retrieve audit logs with multiple filters', async () => {
      mockSql.mockResolvedValueOnce([mockAuditLogEntry]);

      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-31');

      const result = await getAuditLogs({
        adminUserId: MOCK_ADMIN_USER_ID,
        targetUserId: MOCK_TARGET_USER_ID,
        actionType: 'USER_PARAMETER_CHANGE',
        startDate,
        endDate,
        limit: 25,
        offset: 10
      });

      expect(result).toHaveLength(1);
      expect(mockSql).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.stringContaining('WHERE'),
          expect.stringContaining('AND'),
          expect.stringContaining('LIMIT 25 OFFSET 10')
        ])
      );
    });

    it('should handle empty results', async () => {
      mockSql.mockResolvedValueOnce([]);

      const result = await getAuditLogs();

      expect(result).toEqual([]);
    });
  });

  describe('getAuditLogStats', () => {
    const mockStats = {
      total_actions: 100,
      unique_action_types: 5,
      affected_users: 20,
      first_action: '2024-01-01T00:00:00Z',
      last_action: '2024-01-15T10:00:00Z',
      actions_last_24h: 5,
      actions_last_week: 25,
      actions_last_month: 75
    };

    it('should retrieve audit log statistics', async () => {
      mockSql.mockResolvedValueOnce([mockStats]);

      const result = await getAuditLogStats();

      expect(result).toEqual(mockStats);
      expect(mockSql).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.stringContaining('COUNT(*) as total_actions'),
          expect.stringContaining('admin_audit_log')
        ])
      );
    });

    it('should retrieve audit log statistics for specific admin', async () => {
      mockSql.mockResolvedValueOnce([mockStats]);

      const result = await getAuditLogStats(MOCK_ADMIN_USER_ID);

      expect(result).toEqual(mockStats);
      expect(mockSql).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.stringContaining('WHERE admin_user_id')
        ])
      );
    });
  });

  describe('getActionTypeStats', () => {
    const mockActionStats = [
      {
        action_type: 'USER_PARAMETER_CHANGE',
        count: 50,
        unique_targets: 15,
        last_used: '2024-01-15T10:00:00Z'
      },
      {
        action_type: 'SHARED_WISH_CREATED',
        count: 25,
        unique_targets: 0,
        last_used: '2024-01-14T15:30:00Z'
      }
    ];

    it('should retrieve action type statistics', async () => {
      mockSql.mockResolvedValueOnce(mockActionStats);

      const result = await getActionTypeStats();

      expect(result).toEqual(mockActionStats);
      expect(mockSql).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.stringContaining('GROUP BY action_type'),
          expect.stringContaining('ORDER BY count DESC'),
          expect.stringContaining('LIMIT 10')
        ])
      );
    });

    it('should retrieve action type statistics for specific admin with custom limit', async () => {
      mockSql.mockResolvedValueOnce(mockActionStats);

      const result = await getActionTypeStats(MOCK_ADMIN_USER_ID, 5);

      expect(result).toEqual(mockActionStats);
      expect(mockSql).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.stringContaining('WHERE admin_user_id'),
          expect.stringContaining('LIMIT 5')
        ])
      );
    });
  });

  describe('logUserParameterChange', () => {
    it('should log user parameter change', async () => {
      mockSql.mockResolvedValueOnce([]);

      await logUserParameterChange(
        MOCK_ADMIN_USER_ID,
        MOCK_TARGET_USER_ID,
        'mana_balance',
        100,
        150,
        'Test adjustment',
        '127.0.0.1',
        'test-agent'
      );

      expect(mockSql).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.stringContaining('INSERT INTO admin_audit_log')
        ])
      );
    });
  });

  describe('logSharedWishCreation', () => {
    it('should log shared wish creation', async () => {
      mockSql.mockResolvedValueOnce([]);

      const wishData = {
        description: 'Test shared wish',
        category: 'general',
        isGlobal: true
      };

      await logSharedWishCreation(
        MOCK_ADMIN_USER_ID,
        MOCK_SHARED_WISH_ID,
        wishData,
        'Creating test shared wish',
        '127.0.0.1',
        'test-agent'
      );

      expect(mockSql).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.stringContaining('INSERT INTO admin_audit_log')
        ])
      );
    });
  });

  describe('logSharedWishManagement', () => {
    it('should log shared wish edit action', async () => {
      mockSql.mockResolvedValueOnce([]);

      const oldValues = { description: 'Old description' };
      const newValues = { description: 'New description' };

      await logSharedWishManagement(
        MOCK_ADMIN_USER_ID,
        MOCK_SHARED_WISH_ID,
        'EDIT',
        'Updating description',
        oldValues,
        newValues,
        '127.0.0.1',
        'test-agent'
      );

      expect(mockSql).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.stringContaining('INSERT INTO admin_audit_log')
        ])
      );
    });

    it('should log shared wish delete action', async () => {
      mockSql.mockResolvedValueOnce([]);

      await logSharedWishManagement(
        MOCK_ADMIN_USER_ID,
        MOCK_SHARED_WISH_ID,
        'DELETE',
        'Removing inappropriate wish'
      );

      expect(mockSql).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.stringContaining('INSERT INTO admin_audit_log')
        ])
      );
    });

    it('should log shared wish expire action', async () => {
      mockSql.mockResolvedValueOnce([]);

      await logSharedWishManagement(
        MOCK_ADMIN_USER_ID,
        MOCK_SHARED_WISH_ID,
        'EXPIRE',
        'Manually expiring wish'
      );

      expect(mockSql).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.stringContaining('INSERT INTO admin_audit_log')
        ])
      );
    });
  });

  describe('cleanupOldAuditLogs', () => {
    it('should clean up old audit logs with default retention', async () => {
      mockSql.mockResolvedValueOnce([1, 2, 3]); // Mock 3 deleted records

      const result = await cleanupOldAuditLogs();

      expect(result).toBe(3);
      expect(mockSql).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.stringContaining('DELETE FROM admin_audit_log'),
          expect.stringContaining('730 days')
        ])
      );
    });

    it('should clean up old audit logs with custom retention', async () => {
      mockSql.mockResolvedValueOnce([1, 2]); // Mock 2 deleted records

      const result = await cleanupOldAuditLogs(365);

      expect(result).toBe(2);
      expect(mockSql).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.stringContaining('365 days')
        ])
      );
    });

    it('should handle no records to delete', async () => {
      mockSql.mockResolvedValueOnce([]); // No records deleted

      const result = await cleanupOldAuditLogs();

      expect(result).toBe(0);
    });
  });

  describe('exportAuditLogs', () => {
    const mockExportData = [
      {
        id: 'log-1',
        admin_user_id: MOCK_ADMIN_USER_ID,
        admin_name: 'Admin User',
        admin_username: 'admin',
        target_user_id: MOCK_TARGET_USER_ID,
        target_user_name: 'Target User',
        target_username: 'target',
        action_type: 'USER_PARAMETER_CHANGE',
        old_values: { mana_balance: 100 },
        new_values: { mana_balance: 150 },
        reason: 'Test adjustment',
        ip_address: '127.0.0.1',
        user_agent: 'test-agent',
        created_at: '2024-01-15T10:00:00Z'
      }
    ];

    it('should export audit logs for date range', async () => {
      mockSql.mockResolvedValueOnce(mockExportData);

      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-31');

      const result = await exportAuditLogs(startDate, endDate);

      expect(result).toEqual(mockExportData);
      expect(mockSql).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.stringContaining('WHERE aal.created_at >='),
          expect.stringContaining('AND aal.created_at <='),
          expect.stringContaining('ORDER BY aal.created_at DESC')
        ])
      );
    });

    it('should export audit logs for specific admin and date range', async () => {
      mockSql.mockResolvedValueOnce(mockExportData);

      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-31');

      const result = await exportAuditLogs(startDate, endDate, MOCK_ADMIN_USER_ID);

      expect(result).toEqual(mockExportData);
      expect(mockSql).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.stringContaining('AND aal.admin_user_id =')
        ])
      );
    });

    it('should handle empty export results', async () => {
      mockSql.mockResolvedValueOnce([]);

      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-31');

      const result = await exportAuditLogs(startDate, endDate);

      expect(result).toEqual([]);
    });
  });
});