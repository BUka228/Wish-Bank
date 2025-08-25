/**
 * Integration tests for admin API endpoints
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextApiRequest, NextApiResponse } from 'next';

// Mock the database and auth dependencies
const mockSql = vi.fn();
vi.mock('@neondatabase/serverless', () => ({
  neon: () => mockSql
}));

const mockGetUserFromRequest = vi.fn();
vi.mock('../../lib/telegram-auth', () => ({
  getUserFromRequest: mockGetUserFromRequest
}));

describe('Admin API Endpoints Integration Tests', () => {
  const MOCK_ADMIN_USER = {
    id: 'admin-123',
    telegram_id: '123456789',
    name: 'Admin User',
    username: 'admin'
  };

  const MOCK_TARGET_USER = {
    id: 'user-456',
    name: 'Test User',
    username: 'testuser',
    mana_balance: 100,
    rank: 'Новичок',
    experience_points: 50,
    daily_quota_used: 5,
    weekly_quota_used: 20,
    monthly_quota_used: 80,
    updated_at: '2024-01-15T10:00:00Z'
  };

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.ADMIN_TELEGRAM_ID = '123456789';
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('GET /api/admin/users/list', () => {
    it('should return list of users for admin', async () => {
      // Mock admin authentication
      mockGetUserFromRequest.mockResolvedValueOnce(MOCK_ADMIN_USER);
      mockSql.mockResolvedValueOnce([{ telegram_id: '123456789' }]); // validateAdminAccess
      mockSql.mockResolvedValueOnce([MOCK_ADMIN_USER]); // getAdminUser
      mockSql.mockResolvedValueOnce([]); // logAdminAction
      
      // Mock users list query
      const mockUsers = [
        MOCK_TARGET_USER,
        {
          id: 'user-789',
          name: 'Another User',
          username: 'another',
          mana_balance: 200,
          rank: 'Ученик',
          experience_points: 100,
          daily_quota_used: 3,
          weekly_quota_used: 15,
          monthly_quota_used: 60,
          updated_at: '2024-01-14T15:30:00Z'
        }
      ];
      mockSql.mockResolvedValueOnce(mockUsers); // users list query

      const req = {
        method: 'GET',
        query: {},
        headers: { 'user-agent': 'test-agent' },
        socket: { remoteAddress: '127.0.0.1' }
      } as NextApiRequest;

      const res = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn()
      } as any as NextApiResponse;

      const { default: handler } = await import('../../pages/api/admin/users/list');
      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        users: mockUsers,
        total: mockUsers.length,
        pagination: {
          page: 1,
          limit: 50,
          total: mockUsers.length,
          totalPages: 1
        }
      });
    });

    it('should return 401 for unauthenticated user', async () => {
      mockGetUserFromRequest.mockResolvedValueOnce(null);

      const req = {
        method: 'GET',
        query: {},
        headers: { 'user-agent': 'test-agent' },
        socket: { remoteAddress: '127.0.0.1' }
      } as NextApiRequest;

      const res = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn()
      } as any as NextApiResponse;

      const { default: handler } = await import('../../pages/api/admin/users/list');
      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Authentication required',
        code: 'AUTH_REQUIRED'
      });
    });

    it('should return 403 for non-admin user', async () => {
      const nonAdminUser = { ...MOCK_ADMIN_USER, telegram_id: 'different-id' };
      mockGetUserFromRequest.mockResolvedValueOnce(nonAdminUser);
      mockSql.mockResolvedValueOnce([{ telegram_id: 'different-id' }]); // validateAdminAccess
      mockSql.mockResolvedValueOnce([]); // logAdminAction for unauthorized attempt

      const req = {
        method: 'GET',
        query: {},
        headers: { 'user-agent': 'test-agent' },
        socket: { remoteAddress: '127.0.0.1' }
      } as NextApiRequest;

      const res = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn()
      } as any as NextApiResponse;

      const { default: handler } = await import('../../pages/api/admin/users/list');
      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Administrative privileges required',
        code: 'ADMIN_REQUIRED'
      });
    });
  });

  describe('POST /api/admin/users/[id]/adjust', () => {
    it('should successfully adjust user mana balance', async () => {
      // Mock admin authentication
      mockGetUserFromRequest.mockResolvedValueOnce(MOCK_ADMIN_USER);
      mockSql.mockResolvedValueOnce([{ telegram_id: '123456789' }]); // validateAdminAccess
      mockSql.mockResolvedValueOnce([MOCK_ADMIN_USER]); // getAdminUser
      mockSql.mockResolvedValueOnce([]); // logAdminAction for endpoint access
      
      // Mock user lookup and update
      mockSql.mockResolvedValueOnce([MOCK_TARGET_USER]); // user lookup
      const updatedUser = { ...MOCK_TARGET_USER, mana_balance: 200 };
      mockSql.mockResolvedValueOnce([updatedUser]); // update result
      mockSql.mockResolvedValueOnce([]); // transaction insert
      mockSql.mockResolvedValueOnce([]); // logAdminAction for adjustment

      const req = {
        method: 'POST',
        query: { id: 'user-456' },
        body: {
          mana_balance: 200,
          reason: 'Bonus for good behavior'
        },
        headers: { 'user-agent': 'test-agent' },
        socket: { remoteAddress: '127.0.0.1' }
      } as NextApiRequest;

      const res = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn()
      } as any as NextApiResponse;

      const { default: handler } = await import('../../pages/api/admin/users/[id]/adjust');
      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        user: expect.objectContaining({
          id: 'user-456',
          mana_balance: 200
        }),
        changes: [{
          field: 'mana_balance',
          oldValue: 100,
          newValue: 200
        }],
        auditLogId: 'logged'
      });
    });

    it('should return 400 for invalid parameters', async () => {
      // Mock admin authentication
      mockGetUserFromRequest.mockResolvedValueOnce(MOCK_ADMIN_USER);
      mockSql.mockResolvedValueOnce([{ telegram_id: '123456789' }]); // validateAdminAccess
      mockSql.mockResolvedValueOnce([MOCK_ADMIN_USER]); // getAdminUser
      mockSql.mockResolvedValueOnce([]); // logAdminAction for endpoint access

      const req = {
        method: 'POST',
        query: { id: 'user-456' },
        body: {
          mana_balance: -50, // Invalid negative value
          reason: 'Test adjustment'
        },
        headers: { 'user-agent': 'test-agent' },
        socket: { remoteAddress: '127.0.0.1' }
      } as NextApiRequest;

      const res = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn()
      } as any as NextApiResponse;

      const { default: handler } = await import('../../pages/api/admin/users/[id]/adjust');
      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Invalid parameters',
        code: 'VALIDATION_ERROR',
        details: ['Mana balance cannot be negative']
      });
    });

    it('should return 404 for non-existent user', async () => {
      // Mock admin authentication
      mockGetUserFromRequest.mockResolvedValueOnce(MOCK_ADMIN_USER);
      mockSql.mockResolvedValueOnce([{ telegram_id: '123456789' }]); // validateAdminAccess
      mockSql.mockResolvedValueOnce([MOCK_ADMIN_USER]); // getAdminUser
      mockSql.mockResolvedValueOnce([]); // logAdminAction for endpoint access
      
      // Mock user not found
      mockSql.mockResolvedValueOnce([]); // user lookup returns empty

      const req = {
        method: 'POST',
        query: { id: 'non-existent' },
        body: {
          mana_balance: 200,
          reason: 'Test adjustment'
        },
        headers: { 'user-agent': 'test-agent' },
        socket: { remoteAddress: '127.0.0.1' }
      } as NextApiRequest;

      const res = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn()
      } as any as NextApiResponse;

      const { default: handler } = await import('../../pages/api/admin/users/[id]/adjust');
      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        error: 'User not found',
        code: 'USER_NOT_FOUND'
      });
    });
  });

  describe('POST /api/admin/shared-wishes/create', () => {
    it('should successfully create shared wish', async () => {
      // Mock admin authentication
      mockGetUserFromRequest.mockResolvedValueOnce(MOCK_ADMIN_USER);
      mockSql.mockResolvedValueOnce([{ telegram_id: '123456789' }]); // validateAdminAccess
      mockSql.mockResolvedValueOnce([MOCK_ADMIN_USER]); // getAdminUser
      mockSql.mockResolvedValueOnce([]); // logAdminAction for endpoint access
      
      // Mock wish creation
      const mockWish = {
        id: 'wish-123',
        description: 'Test shared wish',
        category: 'general'
      };
      mockSql.mockResolvedValueOnce([mockWish]); // wish creation
      mockSql.mockResolvedValueOnce([{ id: 'shared-wish-456' }]); // shared wish creation
      mockSql.mockResolvedValueOnce([]); // logAdminAction for creation

      const req = {
        method: 'POST',
        body: {
          description: 'Test shared wish',
          category: 'general',
          isGlobal: true,
          collectiveReward: 100,
          reason: 'Creating test shared wish'
        },
        headers: { 'user-agent': 'test-agent' },
        socket: { remoteAddress: '127.0.0.1' }
      } as NextApiRequest;

      const res = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn()
      } as any as NextApiResponse;

      const { default: handler } = await import('../../pages/api/admin/shared-wishes/create');
      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        sharedWish: expect.objectContaining({
          id: 'shared-wish-456'
        }),
        message: 'Shared wish created successfully'
      });
    });

    it('should return 400 for missing required fields', async () => {
      // Mock admin authentication
      mockGetUserFromRequest.mockResolvedValueOnce(MOCK_ADMIN_USER);
      mockSql.mockResolvedValueOnce([{ telegram_id: '123456789' }]); // validateAdminAccess
      mockSql.mockResolvedValueOnce([MOCK_ADMIN_USER]); // getAdminUser
      mockSql.mockResolvedValueOnce([]); // logAdminAction for endpoint access

      const req = {
        method: 'POST',
        body: {
          // Missing description and reason
          category: 'general'
        },
        headers: { 'user-agent': 'test-agent' },
        socket: { remoteAddress: '127.0.0.1' }
      } as NextApiRequest;

      const res = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn()
      } as any as NextApiResponse;

      const { default: handler } = await import('../../pages/api/admin/shared-wishes/create');
      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Missing required fields',
        code: 'MISSING_FIELDS',
        details: expect.arrayContaining(['description', 'reason'])
      });
    });
  });

  describe('GET /api/admin/shared-wishes/manage', () => {
    it('should return list of shared wishes', async () => {
      // Mock admin authentication
      mockGetUserFromRequest.mockResolvedValueOnce(MOCK_ADMIN_USER);
      mockSql.mockResolvedValueOnce([{ telegram_id: '123456789' }]); // validateAdminAccess
      mockSql.mockResolvedValueOnce([MOCK_ADMIN_USER]); // getAdminUser
      mockSql.mockResolvedValueOnce([]); // logAdminAction for endpoint access
      
      // Mock shared wishes query
      const mockSharedWishes = [
        {
          id: 'shared-wish-1',
          wish_id: 'wish-1',
          wish_description: 'First shared wish',
          wish_category: 'general',
          created_by_admin: 'admin-123',
          admin_name: 'Admin User',
          admin_username: 'admin',
          is_global: true,
          target_users: [],
          participation_count: 5,
          completion_progress: 25,
          collective_reward: 100,
          expires_at: null,
          created_at: '2024-01-15T10:00:00Z',
          metadata: {},
          status: 'active'
        }
      ];
      mockSql.mockResolvedValueOnce(mockSharedWishes); // shared wishes query

      const req = {
        method: 'GET',
        query: {},
        headers: { 'user-agent': 'test-agent' },
        socket: { remoteAddress: '127.0.0.1' }
      } as NextApiRequest;

      const res = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn()
      } as any as NextApiResponse;

      const { default: handler } = await import('../../pages/api/admin/shared-wishes/manage');
      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        sharedWishes: expect.arrayContaining([
          expect.objectContaining({
            id: 'shared-wish-1',
            wishDescription: 'First shared wish'
          })
        ]),
        pagination: expect.any(Object)
      });
    });
  });

  describe('GET /api/admin/audit/logs', () => {
    it('should return audit log entries', async () => {
      // Mock admin authentication
      mockGetUserFromRequest.mockResolvedValueOnce(MOCK_ADMIN_USER);
      mockSql.mockResolvedValueOnce([{ telegram_id: '123456789' }]); // validateAdminAccess
      mockSql.mockResolvedValueOnce([MOCK_ADMIN_USER]); // getAdminUser
      mockSql.mockResolvedValueOnce([]); // logAdminAction for endpoint access
      
      // Mock audit logs query
      const mockAuditLogs = [
        {
          id: 'log-1',
          admin_user_id: 'admin-123',
          admin_name: 'Admin User',
          admin_username: 'admin',
          target_user_id: 'user-456',
          target_user_name: 'Test User',
          target_username: 'testuser',
          action_type: 'USER_PARAMETER_CHANGE',
          old_values: { mana_balance: 100 },
          new_values: { mana_balance: 200 },
          reason: 'Bonus for good behavior',
          ip_address: '127.0.0.1',
          user_agent: 'test-agent',
          created_at: '2024-01-15T10:00:00Z'
        }
      ];
      mockSql.mockResolvedValueOnce(mockAuditLogs); // audit logs query

      const req = {
        method: 'GET',
        query: {},
        headers: { 'user-agent': 'test-agent' },
        socket: { remoteAddress: '127.0.0.1' }
      } as NextApiRequest;

      const res = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn()
      } as any as NextApiResponse;

      const { default: handler } = await import('../../pages/api/admin/audit/logs');
      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        logs: mockAuditLogs,
        pagination: expect.any(Object)
      });
    });

    it('should support filtering by action type', async () => {
      // Mock admin authentication
      mockGetUserFromRequest.mockResolvedValueOnce(MOCK_ADMIN_USER);
      mockSql.mockResolvedValueOnce([{ telegram_id: '123456789' }]); // validateAdminAccess
      mockSql.mockResolvedValueOnce([MOCK_ADMIN_USER]); // getAdminUser
      mockSql.mockResolvedValueOnce([]); // logAdminAction for endpoint access
      
      // Mock filtered audit logs query
      const mockFilteredLogs = [
        {
          id: 'log-1',
          admin_user_id: 'admin-123',
          admin_name: 'Admin User',
          admin_username: 'admin',
          target_user_id: 'user-456',
          target_user_name: 'Test User',
          target_username: 'testuser',
          action_type: 'USER_PARAMETER_CHANGE',
          old_values: { mana_balance: 100 },
          new_values: { mana_balance: 200 },
          reason: 'Bonus for good behavior',
          ip_address: '127.0.0.1',
          user_agent: 'test-agent',
          created_at: '2024-01-15T10:00:00Z'
        }
      ];
      mockSql.mockResolvedValueOnce(mockFilteredLogs); // filtered audit logs query

      const req = {
        method: 'GET',
        query: { actionType: 'USER_PARAMETER_CHANGE' },
        headers: { 'user-agent': 'test-agent' },
        socket: { remoteAddress: '127.0.0.1' }
      } as NextApiRequest;

      const res = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn()
      } as any as NextApiResponse;

      const { default: handler } = await import('../../pages/api/admin/audit/logs');
      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        logs: mockFilteredLogs,
        pagination: expect.any(Object)
      });
    });
  });

  describe('GET /api/admin/audit/analytics', () => {
    it('should return audit analytics', async () => {
      // Mock admin authentication
      mockGetUserFromRequest.mockResolvedValueOnce(MOCK_ADMIN_USER);
      mockSql.mockResolvedValueOnce([{ telegram_id: '123456789' }]); // validateAdminAccess
      mockSql.mockResolvedValueOnce([MOCK_ADMIN_USER]); // getAdminUser
      mockSql.mockResolvedValueOnce([]); // logAdminAction for endpoint access
      
      // Mock analytics queries
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
      mockSql.mockResolvedValueOnce([mockStats]); // stats query
      
      const mockActionTypes = [
        {
          action_type: 'USER_PARAMETER_CHANGE',
          count: 50,
          unique_targets: 15,
          last_used: '2024-01-15T10:00:00Z'
        }
      ];
      mockSql.mockResolvedValueOnce(mockActionTypes); // action types query

      const req = {
        method: 'GET',
        query: {},
        headers: { 'user-agent': 'test-agent' },
        socket: { remoteAddress: '127.0.0.1' }
      } as NextApiRequest;

      const res = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn()
      } as any as NextApiResponse;

      const { default: handler } = await import('../../pages/api/admin/audit/analytics');
      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        analytics: {
          overview: mockStats,
          actionTypes: mockActionTypes,
          trends: expect.any(Object)
        }
      });
    });
  });
});