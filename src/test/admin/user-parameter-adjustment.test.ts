/**
 * Unit tests for user parameter adjustment functions
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock the dependencies
vi.mock('@neondatabase/serverless', () => ({
  neon: () => vi.fn()
}));

vi.mock('@/lib/admin-security', () => ({
  withAdminAuth: (handler: any) => handler,
  validateAndLogAdminAction: vi.fn()
}));

describe('User Parameter Adjustment Functions', () => {
  const MOCK_ADMIN_USER = {
    id: 'admin-123',
    telegram_id: '123456789',
    name: 'Admin User',
    username: 'admin',
    is_admin: true
  };

  const MOCK_USER_ID = 'user-456';
  let mockSql: any;
  let mockValidateAndLogAdminAction: any;
  let adjustUserParameters: any;
  const MOCK_CURRENT_USER = {
    id: MOCK_USER_ID,
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

  const mockReq = {
    method: 'POST',
    query: { id: MOCK_USER_ID },
    body: {},
    headers: { 'user-agent': 'test-agent' },
    socket: { remoteAddress: '127.0.0.1' }
  } as any;

  const mockRes = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn()
  } as any;

  beforeEach(async () => {
    vi.clearAllMocks();
    mockReq.body = {};
    mockReq.query = { id: MOCK_USER_ID };
    
    // Import mocked modules
    const neon = await import('@neondatabase/serverless');
    mockSql = vi.mocked(neon.neon)();
    
    const adminSecurity = await import('@/lib/admin-security');
    mockValidateAndLogAdminAction = vi.mocked(adminSecurity.validateAndLogAdminAction);
    
    // Import the module after mocking
    const adjustModule = await import('../../pages/api/admin/users/[id]/adjust');
    adjustUserParameters = adjustModule.default;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Parameter Validation', () => {
    it('should reject request without reason', async () => {
      mockReq.body = {
        mana_balance: 200
        // reason is missing
      };

      await adjustUserParameters(mockReq, mockRes, MOCK_ADMIN_USER);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Invalid parameters',
        code: 'VALIDATION_ERROR',
        details: ['Reason is required for all parameter changes']
      });
    });

    it('should reject request with empty reason', async () => {
      mockReq.body = {
        mana_balance: 200,
        reason: '   '
      };

      await adjustUserParameters(mockReq, mockRes, MOCK_ADMIN_USER);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Invalid parameters',
        code: 'VALIDATION_ERROR',
        details: ['Reason is required for all parameter changes']
      });
    });

    it('should reject request with reason too long', async () => {
      mockReq.body = {
        mana_balance: 200,
        reason: 'a'.repeat(501)
      };

      await adjustUserParameters(mockReq, mockRes, MOCK_ADMIN_USER);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Invalid parameters',
        code: 'VALIDATION_ERROR',
        details: ['Reason must be less than 500 characters']
      });
    });

    it('should reject negative mana balance', async () => {
      mockReq.body = {
        mana_balance: -50,
        reason: 'Test adjustment'
      };

      await adjustUserParameters(mockReq, mockRes, MOCK_ADMIN_USER);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Invalid parameters',
        code: 'VALIDATION_ERROR',
        details: ['Mana balance cannot be negative']
      });
    });

    it('should reject invalid mana balance type', async () => {
      mockReq.body = {
        mana_balance: 'invalid',
        reason: 'Test adjustment'
      };

      await adjustUserParameters(mockReq, mockRes, MOCK_ADMIN_USER);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Invalid parameters',
        code: 'VALIDATION_ERROR',
        details: ['Mana balance must be a valid number']
      });
    });

    it('should reject invalid rank', async () => {
      mockReq.body = {
        rank: 'InvalidRank',
        reason: 'Test adjustment'
      };

      await adjustUserParameters(mockReq, mockRes, MOCK_ADMIN_USER);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Invalid parameters',
        code: 'VALIDATION_ERROR',
        details: [expect.stringContaining('Invalid rank. Valid ranks are:')]
      });
    });

    it('should reject negative experience points', async () => {
      mockReq.body = {
        experience_points: -10,
        reason: 'Test adjustment'
      };

      await adjustUserParameters(mockReq, mockRes, MOCK_ADMIN_USER);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Invalid parameters',
        code: 'VALIDATION_ERROR',
        details: ['Experience points cannot be negative']
      });
    });

    it('should reject negative quota values', async () => {
      mockReq.body = {
        daily_quota_used: -5,
        reason: 'Test adjustment'
      };

      await adjustUserParameters(mockReq, mockRes, MOCK_ADMIN_USER);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Invalid parameters',
        code: 'VALIDATION_ERROR',
        details: ['daily_quota_used cannot be negative']
      });
    });

    it('should accept valid parameters with warnings for high values', async () => {
      mockSql.mockResolvedValueOnce([MOCK_CURRENT_USER]); // User lookup
      mockSql.mockResolvedValueOnce([{ ...MOCK_CURRENT_USER, mana_balance: 1500000 }]); // Update result
      mockSql.mockResolvedValueOnce([]); // Transaction insert

      mockReq.body = {
        mana_balance: 1500000,
        reason: 'Test high value adjustment'
      };

      await adjustUserParameters(mockReq, mockRes, MOCK_ADMIN_USER);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          warnings: ['Mana balance is very high (>1,000,000) - please verify this is intentional']
        })
      );
    });
  });

  describe('User Parameter Adjustment', () => {
    it('should return 405 for non-POST requests', async () => {
      mockReq.method = 'GET';

      await adjustUserParameters(mockReq, mockRes, MOCK_ADMIN_USER);

      expect(mockRes.status).toHaveBeenCalledWith(405);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Method not allowed' });
    });

    it('should return 400 for missing user ID', async () => {
      mockReq.query = {};

      await adjustUserParameters(mockReq, mockRes, MOCK_ADMIN_USER);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'User ID is required',
        code: 'MISSING_USER_ID'
      });
    });

    it('should return 404 for non-existent user', async () => {
      mockSql.mockResolvedValueOnce([]); // User not found

      mockReq.body = {
        mana_balance: 200,
        reason: 'Test adjustment'
      };

      await adjustUserParameters(mockReq, mockRes, MOCK_ADMIN_USER);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'User not found',
        code: 'USER_NOT_FOUND'
      });
    });

    it('should successfully adjust mana balance', async () => {
      const updatedUser = { ...MOCK_CURRENT_USER, mana_balance: 200 };
      mockSql.mockResolvedValueOnce([MOCK_CURRENT_USER]); // User lookup
      mockSql.mockResolvedValueOnce([updatedUser]); // Update result
      mockSql.mockResolvedValueOnce([]); // Transaction insert

      mockReq.body = {
        mana_balance: 200,
        reason: 'Bonus for good behavior'
      };

      await adjustUserParameters(mockReq, mockRes, MOCK_ADMIN_USER);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        user: expect.objectContaining({
          id: MOCK_USER_ID,
          mana_balance: 200
        }),
        changes: [{
          field: 'mana_balance',
          oldValue: 100,
          newValue: 200
        }],
        auditLogId: 'logged'
      });

      expect(mockValidateAndLogAdminAction).toHaveBeenCalledWith(
        MOCK_ADMIN_USER,
        'USER_PARAMETER_ADJUSTMENT',
        'Bonus for good behavior',
        MOCK_USER_ID,
        { mana_balance: 100 },
        { mana_balance: 200 },
        mockReq
      );
    });

    it('should successfully adjust rank', async () => {
      const updatedUser = { ...MOCK_CURRENT_USER, rank: 'Ученик' };
      mockSql.mockResolvedValueOnce([MOCK_CURRENT_USER]); // User lookup
      mockSql.mockResolvedValueOnce([updatedUser]); // Update result

      mockReq.body = {
        rank: 'Ученик',
        reason: 'Promotion for achievements'
      };

      await adjustUserParameters(mockReq, mockRes, MOCK_ADMIN_USER);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        user: expect.objectContaining({
          id: MOCK_USER_ID,
          rank: 'Ученик'
        }),
        changes: [{
          field: 'rank',
          oldValue: 'Новичок',
          newValue: 'Ученик'
        }],
        auditLogId: 'logged'
      });
    });

    it('should successfully adjust experience points', async () => {
      const updatedUser = { ...MOCK_CURRENT_USER, experience_points: 150 };
      mockSql.mockResolvedValueOnce([MOCK_CURRENT_USER]); // User lookup
      mockSql.mockResolvedValueOnce([updatedUser]); // Update result

      mockReq.body = {
        experience_points: 150,
        reason: 'Experience correction'
      };

      await adjustUserParameters(mockReq, mockRes, MOCK_ADMIN_USER);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        user: expect.objectContaining({
          id: MOCK_USER_ID,
          experience_points: 150
        }),
        changes: [{
          field: 'experience_points',
          oldValue: 50,
          newValue: 150
        }],
        auditLogId: 'logged'
      });
    });

    it('should successfully adjust quota values', async () => {
      const updatedUser = { ...MOCK_CURRENT_USER, daily_quota_used: 10 };
      mockSql.mockResolvedValueOnce([MOCK_CURRENT_USER]); // User lookup
      mockSql.mockResolvedValueOnce([updatedUser]); // Update result

      mockReq.body = {
        daily_quota_used: 10,
        reason: 'Quota adjustment'
      };

      await adjustUserParameters(mockReq, mockRes, MOCK_ADMIN_USER);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        user: expect.objectContaining({
          id: MOCK_USER_ID,
          daily_quota_used: 10
        }),
        changes: [{
          field: 'daily_quota_used',
          oldValue: 5,
          newValue: 10
        }],
        auditLogId: 'logged'
      });
    });

    it('should handle multiple parameter changes', async () => {
      const updatedUser = { 
        ...MOCK_CURRENT_USER, 
        mana_balance: 300, 
        rank: 'Подмастерье',
        experience_points: 200
      };
      mockSql.mockResolvedValueOnce([MOCK_CURRENT_USER]); // User lookup
      mockSql.mockResolvedValueOnce([updatedUser]); // Update result
      mockSql.mockResolvedValueOnce([]); // Transaction insert

      mockReq.body = {
        mana_balance: 300,
        rank: 'Подмастерье',
        experience_points: 200,
        reason: 'Multiple adjustments for promotion'
      };

      await adjustUserParameters(mockReq, mockRes, MOCK_ADMIN_USER);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        user: expect.objectContaining({
          id: MOCK_USER_ID,
          mana_balance: 300,
          rank: 'Подмастерье',
          experience_points: 200
        }),
        changes: [
          {
            field: 'mana_balance',
            oldValue: 100,
            newValue: 300
          },
          {
            field: 'rank',
            oldValue: 'Новичок',
            newValue: 'Подмастерье'
          },
          {
            field: 'experience_points',
            oldValue: 50,
            newValue: 200
          }
        ],
        auditLogId: 'logged'
      });
    });

    it('should return success with no changes when values are identical', async () => {
      mockSql.mockResolvedValueOnce([MOCK_CURRENT_USER]); // User lookup

      mockReq.body = {
        mana_balance: 100, // Same as current
        reason: 'No change needed'
      };

      await adjustUserParameters(mockReq, mockRes, MOCK_ADMIN_USER);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: 'No changes detected',
        user: expect.objectContaining({
          id: MOCK_USER_ID,
          mana_balance: 100
        }),
        changes: [],
        warnings: []
      });
    });

    it('should create transaction record for mana changes', async () => {
      const updatedUser = { ...MOCK_CURRENT_USER, mana_balance: 200 };
      mockSql.mockResolvedValueOnce([MOCK_CURRENT_USER]); // User lookup
      mockSql.mockResolvedValueOnce([updatedUser]); // Update result
      mockSql.mockResolvedValueOnce([]); // Transaction insert

      mockReq.body = {
        mana_balance: 200,
        reason: 'Mana bonus'
      };

      await adjustUserParameters(mockReq, mockRes, MOCK_ADMIN_USER);

      expect(mockSql).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.stringContaining('INSERT INTO transactions')
        ])
      );
    });

    it('should handle database errors gracefully', async () => {
      mockSql.mockRejectedValueOnce(new Error('Database connection failed'));

      mockReq.body = {
        mana_balance: 200,
        reason: 'Test adjustment'
      };

      await adjustUserParameters(mockReq, mockRes, MOCK_ADMIN_USER);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Internal server error while adjusting user parameters',
        code: 'ADJUSTMENT_ERROR'
      });

      expect(mockValidateAndLogAdminAction).toHaveBeenCalledWith(
        MOCK_ADMIN_USER,
        'USER_PARAMETER_ADJUSTMENT_FAILED',
        expect.stringContaining('Failed adjustment attempt'),
        MOCK_USER_ID,
        undefined,
        mockReq.body,
        mockReq
      );
    });
  });

  describe('Transaction Creation', () => {
    it('should create credit transaction for positive mana change', async () => {
      const updatedUser = { ...MOCK_CURRENT_USER, mana_balance: 200 };
      mockSql.mockResolvedValueOnce([MOCK_CURRENT_USER]); // User lookup
      mockSql.mockResolvedValueOnce([updatedUser]); // Update result
      mockSql.mockResolvedValueOnce([]); // Transaction insert

      mockReq.body = {
        mana_balance: 200,
        reason: 'Mana bonus'
      };

      await adjustUserParameters(mockReq, mockRes, MOCK_ADMIN_USER);

      expect(mockSql).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.stringContaining('INSERT INTO transactions'),
          expect.stringContaining('credit')
        ])
      );
    });

    it('should create debit transaction for negative mana change', async () => {
      const updatedUser = { ...MOCK_CURRENT_USER, mana_balance: 50 };
      mockSql.mockResolvedValueOnce([MOCK_CURRENT_USER]); // User lookup
      mockSql.mockResolvedValueOnce([updatedUser]); // Update result
      mockSql.mockResolvedValueOnce([]); // Transaction insert

      mockReq.body = {
        mana_balance: 50,
        reason: 'Mana penalty'
      };

      await adjustUserParameters(mockReq, mockRes, MOCK_ADMIN_USER);

      expect(mockSql).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.stringContaining('INSERT INTO transactions'),
          expect.stringContaining('debit')
        ])
      );
    });

    it('should not create transaction for non-mana changes', async () => {
      const updatedUser = { ...MOCK_CURRENT_USER, rank: 'Ученик' };
      mockSql.mockResolvedValueOnce([MOCK_CURRENT_USER]); // User lookup
      mockSql.mockResolvedValueOnce([updatedUser]); // Update result

      mockReq.body = {
        rank: 'Ученик',
        reason: 'Rank promotion'
      };

      await adjustUserParameters(mockReq, mockRes, MOCK_ADMIN_USER);

      // Should not call transaction insert
      expect(mockSql).toHaveBeenCalledTimes(2); // Only user lookup and update
    });
  });
});