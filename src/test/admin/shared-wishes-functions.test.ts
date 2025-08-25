/**
 * Unit tests for shared wishes functions
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  createSharedWish,
  getSharedWishById,
  getSharedWishes,
  updateSharedWish,
  deleteSharedWish,
  getSharedWishParticipants,
  updateParticipantStatus,
  addUserToSharedWish,
  removeUserFromSharedWish,
  getUserSharedWishes,
  cleanupExpiredSharedWishes
} from '../../lib/shared-wishes-functions';

// Mock the database pool and audit functions
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

vi.mock('../../lib/admin-audit-functions', () => ({
  logSharedWishCreation: vi.fn(),
  logSharedWishManagement: vi.fn()
}));

describe('Shared Wishes Functions', () => {
  const MOCK_ADMIN_USER_ID = 'admin-123';
  const MOCK_USER_ID = 'user-456';
  const MOCK_WISH_ID = 'wish-789';
  const MOCK_SHARED_WISH_ID = 'shared-wish-abc';

  let mockSql: any;
  let mockDb: any;
  let logSharedWishCreation: any;
  let logSharedWishManagement: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    const dbPool = await import('../../lib/db-pool');
    mockSql = vi.mocked(dbPool.sql);
    mockDb = vi.mocked(dbPool.db);
    
    const auditFunctions = await import('../../lib/admin-audit-functions');
    logSharedWishCreation = vi.mocked(auditFunctions.logSharedWishCreation);
    logSharedWishManagement = vi.mocked(auditFunctions.logSharedWishManagement);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('createSharedWish', () => {
    const mockSharedWishData = {
      wishId: MOCK_WISH_ID,
      createdByAdmin: MOCK_ADMIN_USER_ID,
      isGlobal: true,
      collectiveReward: 100,
      metadata: { priority: 'high' }
    };

    it('should create global shared wish successfully', async () => {
      const mockSqlClient = vi.fn();
      mockSqlClient.mockResolvedValueOnce([{ id: MOCK_SHARED_WISH_ID }]); // INSERT shared wish
      mockTransaction.mockImplementation(async (callback) => {
        return await callback(mockSqlClient);
      });

      const result = await createSharedWish(
        mockSharedWishData,
        'Creating test shared wish',
        '127.0.0.1',
        'test-agent'
      );

      expect(result).toBe(MOCK_SHARED_WISH_ID);
      expect(mockSqlClient).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.stringContaining('INSERT INTO shared_wishes')
        ])
      );
      expect(logSharedWishCreation).toHaveBeenCalledWith(
        MOCK_ADMIN_USER_ID,
        MOCK_SHARED_WISH_ID,
        mockSharedWishData,
        'Creating test shared wish',
        '127.0.0.1',
        'test-agent'
      );
    });

    it('should create targeted shared wish with specific users', async () => {
      const targetedWishData = {
        ...mockSharedWishData,
        isGlobal: false,
        targetUsers: [MOCK_USER_ID, 'user-2']
      };

      const mockSqlClient = vi.fn();
      mockSqlClient.mockResolvedValueOnce([{ id: MOCK_SHARED_WISH_ID }]); // INSERT shared wish
      mockSqlClient.mockResolvedValue([]); // INSERT participants
      mockTransaction.mockImplementation(async (callback) => {
        return await callback(mockSqlClient);
      });

      const result = await createSharedWish(targetedWishData, 'Creating targeted wish');

      expect(result).toBe(MOCK_SHARED_WISH_ID);
      expect(mockSqlClient).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.stringContaining('INSERT INTO shared_wish_participants')
        ])
      );
    });

    it('should handle creation with expiration date', async () => {
      const expiringWishData = {
        ...mockSharedWishData,
        expiresAt: new Date('2024-12-31T23:59:59Z')
      };

      const mockSqlClient = vi.fn();
      mockSqlClient.mockResolvedValueOnce([{ id: MOCK_SHARED_WISH_ID }]);
      mockTransaction.mockImplementation(async (callback) => {
        return await callback(mockSqlClient);
      });

      const result = await createSharedWish(expiringWishData, 'Creating expiring wish');

      expect(result).toBe(MOCK_SHARED_WISH_ID);
      expect(mockSqlClient).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.stringContaining('INSERT INTO shared_wishes')
        ])
      );
    });
  });

  describe('getSharedWishById', () => {
    const mockSharedWishRow = {
      id: MOCK_SHARED_WISH_ID,
      wish_id: MOCK_WISH_ID,
      wish_description: 'Test shared wish',
      wish_category: 'general',
      created_by_admin: MOCK_ADMIN_USER_ID,
      admin_name: 'Admin User',
      admin_username: 'admin',
      is_global: true,
      target_users: [],
      participation_count: 5,
      completion_progress: 25,
      collective_reward: 100,
      expires_at: null,
      created_at: '2024-01-15T10:00:00Z',
      metadata: { priority: 'high' },
      status: 'active'
    };

    it('should retrieve shared wish by ID', async () => {
      mockSql.mockResolvedValueOnce([mockSharedWishRow]);

      const result = await getSharedWishById(MOCK_SHARED_WISH_ID);

      expect(result).toEqual({
        id: MOCK_SHARED_WISH_ID,
        wishId: MOCK_WISH_ID,
        wishDescription: 'Test shared wish',
        wishCategory: 'general',
        createdByAdmin: MOCK_ADMIN_USER_ID,
        adminName: 'Admin User',
        adminUsername: 'admin',
        isGlobal: true,
        targetUsers: [],
        participationCount: 5,
        completionProgress: 25,
        collectiveReward: 100,
        expiresAt: null,
        createdAt: mockSharedWishRow.created_at,
        metadata: { priority: 'high' },
        status: 'active'
      });
    });

    it('should return null for non-existent shared wish', async () => {
      mockSql.mockResolvedValueOnce([]);

      const result = await getSharedWishById('non-existent');

      expect(result).toBe(null);
    });

    it('should handle expired shared wish status', async () => {
      const expiredWishRow = {
        ...mockSharedWishRow,
        expires_at: '2024-01-01T00:00:00Z',
        status: 'expired'
      };
      mockSql.mockResolvedValueOnce([expiredWishRow]);

      const result = await getSharedWishById(MOCK_SHARED_WISH_ID);

      expect(result?.status).toBe('expired');
    });

    it('should handle completed shared wish status', async () => {
      const completedWishRow = {
        ...mockSharedWishRow,
        completion_progress: 100,
        status: 'completed'
      };
      mockSql.mockResolvedValueOnce([completedWishRow]);

      const result = await getSharedWishById(MOCK_SHARED_WISH_ID);

      expect(result?.status).toBe('completed');
    });
  });

  describe('getSharedWishes', () => {
    const mockSharedWishRows = [
      {
        id: MOCK_SHARED_WISH_ID,
        wish_id: MOCK_WISH_ID,
        wish_description: 'Test shared wish',
        wish_category: 'general',
        created_by_admin: MOCK_ADMIN_USER_ID,
        admin_name: 'Admin User',
        admin_username: 'admin',
        is_global: true,
        target_users: [],
        participation_count: 5,
        completion_progress: 25,
        collective_reward: 100,
        expires_at: null,
        created_at: '2024-01-15T10:00:00Z',
        metadata: { priority: 'high' },
        status: 'active'
      }
    ];

    it('should retrieve all shared wishes without filters', async () => {
      mockSql.mockResolvedValueOnce(mockSharedWishRows);

      const result = await getSharedWishes();

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(MOCK_SHARED_WISH_ID);
      expect(mockSql).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.stringContaining('SELECT'),
          expect.stringContaining('shared_wishes'),
          expect.stringContaining('ORDER BY sw.created_at DESC'),
          expect.stringContaining('LIMIT 50 OFFSET 0')
        ])
      );
    });

    it('should retrieve shared wishes with admin filter', async () => {
      mockSql.mockResolvedValueOnce(mockSharedWishRows);

      const result = await getSharedWishes({ adminId: MOCK_ADMIN_USER_ID });

      expect(result).toHaveLength(1);
      expect(mockSql).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.stringContaining('WHERE')
        ])
      );
    });

    it('should retrieve shared wishes with status filter', async () => {
      mockSql.mockResolvedValueOnce(mockSharedWishRows);

      const result = await getSharedWishes({ status: 'active' });

      expect(result).toHaveLength(1);
      expect(mockSql).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.stringContaining('WHERE')
        ])
      );
    });

    it('should retrieve shared wishes with pagination', async () => {
      mockSql.mockResolvedValueOnce(mockSharedWishRows);

      const result = await getSharedWishes({ limit: 10, offset: 20 });

      expect(result).toHaveLength(1);
      expect(mockSql).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.stringContaining('LIMIT 10 OFFSET 20')
        ])
      );
    });

    it('should handle empty results', async () => {
      mockSql.mockResolvedValueOnce([]);

      const result = await getSharedWishes();

      expect(result).toEqual([]);
    });
  });

  describe('updateSharedWish', () => {
    const mockCurrentWish = {
      id: MOCK_SHARED_WISH_ID,
      wishId: MOCK_WISH_ID,
      wishDescription: 'Test shared wish',
      wishCategory: 'general',
      createdByAdmin: MOCK_ADMIN_USER_ID,
      adminName: 'Admin User',
      adminUsername: 'admin',
      isGlobal: true,
      targetUsers: [],
      participationCount: 5,
      completionProgress: 25,
      collectiveReward: 100,
      expiresAt: null,
      createdAt: new Date('2024-01-15T10:00:00Z'),
      metadata: { priority: 'high' },
      status: 'active'
    };

    beforeEach(() => {
      // Mock getSharedWishById
      vi.doMock('../../lib/shared-wishes-functions', async () => {
        const actual = await vi.importActual('../../lib/shared-wishes-functions');
        return {
          ...actual,
          getSharedWishById: vi.fn().mockResolvedValue(mockCurrentWish)
        };
      });
    });

    it('should update shared wish successfully', async () => {
      mockSql.mockResolvedValueOnce([]); // UPDATE query

      const updates = {
        collectiveReward: 200,
        metadata: { priority: 'urgent' }
      };

      await updateSharedWish(
        MOCK_SHARED_WISH_ID,
        updates,
        MOCK_ADMIN_USER_ID,
        'Increasing reward',
        '127.0.0.1',
        'test-agent'
      );

      expect(mockSql).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.stringContaining('UPDATE shared_wishes SET')
        ])
      );
      expect(logSharedWishManagement).toHaveBeenCalledWith(
        MOCK_ADMIN_USER_ID,
        MOCK_SHARED_WISH_ID,
        'EDIT',
        'Increasing reward',
        expect.any(Object),
        updates,
        '127.0.0.1',
        'test-agent'
      );
    });

    it('should handle no updates gracefully', async () => {
      await updateSharedWish(
        MOCK_SHARED_WISH_ID,
        {},
        MOCK_ADMIN_USER_ID,
        'No changes'
      );

      expect(mockSql).not.toHaveBeenCalled();
      expect(logSharedWishManagement).not.toHaveBeenCalled();
    });

    it('should throw error for non-existent shared wish', async () => {
      // Mock getSharedWishById to return null
      vi.doMock('../../lib/shared-wishes-functions', async () => {
        const actual = await vi.importActual('../../lib/shared-wishes-functions');
        return {
          ...actual,
          getSharedWishById: vi.fn().mockResolvedValue(null)
        };
      });

      await expect(
        updateSharedWish(
          'non-existent',
          { collectiveReward: 200 },
          MOCK_ADMIN_USER_ID,
          'Update attempt'
        )
      ).rejects.toThrow('Shared wish not found');
    });
  });

  describe('deleteSharedWish', () => {
    const mockCurrentWish = {
      id: MOCK_SHARED_WISH_ID,
      wishId: MOCK_WISH_ID,
      wishDescription: 'Test shared wish',
      wishCategory: 'general',
      createdByAdmin: MOCK_ADMIN_USER_ID,
      adminName: 'Admin User',
      adminUsername: 'admin',
      isGlobal: true,
      targetUsers: [],
      participationCount: 5,
      completionProgress: 25,
      collectiveReward: 100,
      expiresAt: null,
      createdAt: new Date('2024-01-15T10:00:00Z'),
      metadata: { priority: 'high' },
      status: 'active'
    };

    it('should delete shared wish successfully', async () => {
      const mockSqlClient = vi.fn();
      mockSqlClient.mockResolvedValue([]); // DELETE queries
      mockTransaction.mockImplementation(async (callback) => {
        return await callback(mockSqlClient);
      });

      // Mock getSharedWishById
      vi.doMock('../../lib/shared-wishes-functions', async () => {
        const actual = await vi.importActual('../../lib/shared-wishes-functions');
        return {
          ...actual,
          getSharedWishById: vi.fn().mockResolvedValue(mockCurrentWish)
        };
      });

      await deleteSharedWish(
        MOCK_SHARED_WISH_ID,
        MOCK_ADMIN_USER_ID,
        'Removing inappropriate wish',
        '127.0.0.1',
        'test-agent'
      );

      expect(mockSqlClient).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.stringContaining('DELETE FROM shared_wish_participants')
        ])
      );
      expect(mockSqlClient).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.stringContaining('DELETE FROM shared_wishes')
        ])
      );
      expect(logSharedWishManagement).toHaveBeenCalledWith(
        MOCK_ADMIN_USER_ID,
        MOCK_SHARED_WISH_ID,
        'DELETE',
        'Removing inappropriate wish',
        mockCurrentWish,
        undefined,
        '127.0.0.1',
        'test-agent'
      );
    });

    it('should throw error for non-existent shared wish', async () => {
      // Mock getSharedWishById to return null
      vi.doMock('../../lib/shared-wishes-functions', async () => {
        const actual = await vi.importActual('../../lib/shared-wishes-functions');
        return {
          ...actual,
          getSharedWishById: vi.fn().mockResolvedValue(null)
        };
      });

      await expect(
        deleteSharedWish('non-existent', MOCK_ADMIN_USER_ID, 'Delete attempt')
      ).rejects.toThrow('Shared wish not found');
    });
  });

  describe('getSharedWishParticipants', () => {
    const mockParticipants = [
      {
        id: 'participant-1',
        shared_wish_id: MOCK_SHARED_WISH_ID,
        user_id: MOCK_USER_ID,
        participation_status: 'active',
        progress_contribution: 10,
        joined_at: '2024-01-15T10:00:00Z',
        completed_at: null,
        user_name: 'Test User',
        username: 'testuser'
      }
    ];

    it('should retrieve shared wish participants', async () => {
      mockSql.mockResolvedValueOnce(mockParticipants);

      const result = await getSharedWishParticipants(MOCK_SHARED_WISH_ID);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        id: 'participant-1',
        sharedWishId: MOCK_SHARED_WISH_ID,
        userId: MOCK_USER_ID,
        participationStatus: 'active',
        progressContribution: 10,
        joinedAt: mockParticipants[0].joined_at,
        completedAt: null
      });
    });

    it('should handle empty participants list', async () => {
      mockSql.mockResolvedValueOnce([]);

      const result = await getSharedWishParticipants(MOCK_SHARED_WISH_ID);

      expect(result).toEqual([]);
    });
  });

  describe('updateParticipantStatus', () => {
    it('should update participant status to completed', async () => {
      mockSql.mockResolvedValueOnce([]);

      await updateParticipantStatus('participant-1', 'completed', 100);

      expect(mockSql).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.stringContaining('UPDATE shared_wish_participants'),
          expect.stringContaining('participation_status ='),
          expect.stringContaining('completed_at = NOW()'),
          expect.stringContaining('progress_contribution =')
        ])
      );
    });

    it('should update participant status without progress contribution', async () => {
      mockSql.mockResolvedValueOnce([]);

      await updateParticipantStatus('participant-1', 'opted_out');

      expect(mockSql).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.stringContaining('UPDATE shared_wish_participants'),
          expect.stringContaining('participation_status =')
        ])
      );
    });
  });

  describe('addUserToSharedWish', () => {
    it('should add user to shared wish', async () => {
      mockSql.mockResolvedValueOnce([]);

      await addUserToSharedWish(MOCK_SHARED_WISH_ID, MOCK_USER_ID);

      expect(mockSql).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.stringContaining('INSERT INTO shared_wish_participants'),
          expect.stringContaining('ON CONFLICT'),
          expect.stringContaining('DO NOTHING')
        ])
      );
    });
  });

  describe('removeUserFromSharedWish', () => {
    it('should remove user from shared wish', async () => {
      mockSql.mockResolvedValueOnce([]);

      await removeUserFromSharedWish(MOCK_SHARED_WISH_ID, MOCK_USER_ID);

      expect(mockSql).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.stringContaining('DELETE FROM shared_wish_participants'),
          expect.stringContaining('WHERE shared_wish_id ='),
          expect.stringContaining('AND user_id =')
        ])
      );
    });
  });

  describe('getUserSharedWishes', () => {
    const mockUserSharedWishes = [
      {
        id: MOCK_SHARED_WISH_ID,
        wish_id: MOCK_WISH_ID,
        wish_description: 'Test shared wish',
        wish_category: 'general',
        created_by_admin: MOCK_ADMIN_USER_ID,
        admin_name: 'Admin User',
        admin_username: 'admin',
        is_global: true,
        target_users: [],
        participation_count: 5,
        completion_progress: 25,
        collective_reward: 100,
        expires_at: null,
        created_at: '2024-01-15T10:00:00Z',
        metadata: { priority: 'high' },
        status: 'active'
      }
    ];

    it('should retrieve user shared wishes', async () => {
      mockSql.mockResolvedValueOnce(mockUserSharedWishes);

      const result = await getUserSharedWishes(MOCK_USER_ID);

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(MOCK_SHARED_WISH_ID);
      expect(mockSql).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.stringContaining('INNER JOIN shared_wish_participants'),
          expect.stringContaining('WHERE swp.user_id =')
        ])
      );
    });

    it('should retrieve user shared wishes with status filter', async () => {
      mockSql.mockResolvedValueOnce(mockUserSharedWishes);

      const result = await getUserSharedWishes(MOCK_USER_ID, 'active');

      expect(result).toHaveLength(1);
      expect(mockSql).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.stringContaining('AND swp.participation_status =')
        ])
      );
    });

    it('should handle empty results', async () => {
      mockSql.mockResolvedValueOnce([]);

      const result = await getUserSharedWishes(MOCK_USER_ID);

      expect(result).toEqual([]);
    });
  });

  describe('cleanupExpiredSharedWishes', () => {
    it('should cleanup expired shared wishes', async () => {
      mockSql.mockResolvedValueOnce([1, 2, 3]); // Mock 3 updated records

      const result = await cleanupExpiredSharedWishes();

      expect(result).toBe(3);
      expect(mockSql).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.stringContaining('UPDATE shared_wish_participants'),
          expect.stringContaining('SET participation_status = \'opted_out\''),
          expect.stringContaining('WHERE shared_wish_id IN'),
          expect.stringContaining('expires_at < NOW()')
        ])
      );
    });

    it('should handle no expired wishes', async () => {
      mockSql.mockResolvedValueOnce([]);

      const result = await cleanupExpiredSharedWishes();

      expect(result).toBe(0);
    });
  });
});