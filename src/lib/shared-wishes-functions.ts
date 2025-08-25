/**
 * Shared Wishes Management Functions
 * Provides utilities for creating and managing shared wishes
 */

import { sql, db } from './db-pool';
import { logSharedWishCreation, logSharedWishManagement } from './admin-audit-functions';

export interface SharedWishCreate {
  wishId: string;
  createdByAdmin: string;
  isGlobal?: boolean;
  targetUsers?: string[];
  collectiveReward?: number;
  expiresAt?: Date;
  metadata?: Record<string, any>;
}

export interface SharedWishUpdate {
  isGlobal?: boolean;
  targetUsers?: string[];
  collectiveReward?: number;
  expiresAt?: Date;
  metadata?: Record<string, any>;
}

export interface SharedWishParticipant {
  id: string;
  sharedWishId: string;
  userId: string;
  participationStatus: 'active' | 'completed' | 'opted_out';
  progressContribution: number;
  joinedAt: Date;
  completedAt?: Date;
}

export interface SharedWishDetails {
  id: string;
  wishId: string;
  wishDescription: string;
  wishCategory: string;
  createdByAdmin: string;
  adminName: string;
  adminUsername: string;
  isGlobal: boolean;
  targetUsers: string[];
  participationCount: number;
  completionProgress: number;
  collectiveReward: number;
  expiresAt?: Date;
  createdAt: Date;
  metadata: Record<string, any>;
  status: 'active' | 'completed' | 'expired';
}

/**
 * Create a new shared wish
 */
export async function createSharedWish(
  data: SharedWishCreate,
  reason: string,
  ipAddress?: string,
  userAgent?: string
): Promise<string> {
  return await db.transaction(async (sqlClient) => {
    // Insert shared wish
    const result = await sqlClient`
      INSERT INTO shared_wishes (
        wish_id,
        created_by_admin,
        is_global,
        target_users,
        collective_reward,
        expires_at,
        metadata
      ) VALUES (
        ${data.wishId},
        ${data.createdByAdmin},
        ${data.isGlobal ?? true},
        ${data.targetUsers || []},
        ${data.collectiveReward || 0},
        ${data.expiresAt || null},
        ${JSON.stringify(data.metadata || {})}
      )
      RETURNING id
    `;
    
    const sharedWishId = result[0].id;
    
    // If not global, add specific target users as participants
    if (!data.isGlobal && data.targetUsers && data.targetUsers.length > 0) {
      for (const userId of data.targetUsers) {
        await sqlClient`
          INSERT INTO shared_wish_participants (shared_wish_id, user_id)
          VALUES (${sharedWishId}, ${userId})
        `;
      }
    }
    
    // Log the action
    await logSharedWishCreation(
      data.createdByAdmin,
      sharedWishId,
      data,
      reason,
      ipAddress,
      userAgent
    );
    
    return sharedWishId;
  });
}

/**
 * Get shared wish details by ID
 */
export async function getSharedWishById(id: string): Promise<SharedWishDetails | null> {
  const result = await sql`
    SELECT 
      sw.id,
      sw.wish_id,
      w.description as wish_description,
      w.category as wish_category,
      sw.created_by_admin,
      au.name as admin_name,
      au.username as admin_username,
      sw.is_global,
      sw.target_users,
      sw.participation_count,
      sw.completion_progress,
      sw.collective_reward,
      sw.expires_at,
      sw.created_at,
      sw.metadata,
      CASE 
        WHEN sw.expires_at IS NOT NULL AND sw.expires_at < NOW() THEN 'expired'
        WHEN sw.completion_progress = 100 THEN 'completed'
        ELSE 'active'
      END as status
    FROM shared_wishes sw
    LEFT JOIN wishes w ON sw.wish_id = w.id
    LEFT JOIN users au ON sw.created_by_admin = au.id
    WHERE sw.id = ${id}
  `;
  
  if (result.length === 0) {
    return null;
  }
  
  const row = result[0];
  return {
    id: row.id,
    wishId: row.wish_id,
    wishDescription: row.wish_description,
    wishCategory: row.wish_category,
    createdByAdmin: row.created_by_admin,
    adminName: row.admin_name,
    adminUsername: row.admin_username,
    isGlobal: row.is_global,
    targetUsers: row.target_users,
    participationCount: row.participation_count,
    completionProgress: row.completion_progress,
    collectiveReward: row.collective_reward,
    expiresAt: row.expires_at,
    createdAt: row.created_at,
    metadata: row.metadata,
    status: row.status
  };
}

/**
 * Get all shared wishes with optional filtering
 */
export async function getSharedWishes(
  filters: {
    adminId?: string;
    status?: 'active' | 'completed' | 'expired';
    isGlobal?: boolean;
    limit?: number;
    offset?: number;
  } = {}
): Promise<SharedWishDetails[]> {
  let query = sql`
    SELECT 
      sw.id,
      sw.wish_id,
      w.description as wish_description,
      w.category as wish_category,
      sw.created_by_admin,
      au.name as admin_name,
      au.username as admin_username,
      sw.is_global,
      sw.target_users,
      sw.participation_count,
      sw.completion_progress,
      sw.collective_reward,
      sw.expires_at,
      sw.created_at,
      sw.metadata,
      CASE 
        WHEN sw.expires_at IS NOT NULL AND sw.expires_at < NOW() THEN 'expired'
        WHEN sw.completion_progress = 100 THEN 'completed'
        ELSE 'active'
      END as status
    FROM shared_wishes sw
    LEFT JOIN wishes w ON sw.wish_id = w.id
    LEFT JOIN users au ON sw.created_by_admin = au.id
  `;

  // Apply filters
  const conditions = [];
  if (filters.adminId) {
    conditions.push(sql`sw.created_by_admin = ${filters.adminId}`);
  }
  if (filters.isGlobal !== undefined) {
    conditions.push(sql`sw.is_global = ${filters.isGlobal}`);
  }
  if (filters.status) {
    switch (filters.status) {
      case 'active':
        conditions.push(sql`(sw.expires_at IS NULL OR sw.expires_at > NOW()) AND sw.completion_progress < 100`);
        break;
      case 'completed':
        conditions.push(sql`sw.completion_progress = 100`);
        break;
      case 'expired':
        conditions.push(sql`sw.expires_at IS NOT NULL AND sw.expires_at < NOW() AND sw.completion_progress < 100`);
        break;
    }
  }

  // Build final query with conditions
  if (conditions.length > 0) {
    const whereClause = conditions.reduce((acc, condition, index) => {
      return index === 0 ? sql`WHERE ${condition}` : sql`${acc} AND ${condition}`;
    });
    query = sql`${query} ${whereClause}`;
  }

  query = sql`${query} ORDER BY sw.created_at DESC LIMIT ${filters.limit || 50} OFFSET ${filters.offset || 0}`;
  
  const result = await query;
  
  return result.map((row: any) => ({
    id: row.id,
    wishId: row.wish_id,
    wishDescription: row.wish_description,
    wishCategory: row.wish_category,
    createdByAdmin: row.created_by_admin,
    adminName: row.admin_name,
    adminUsername: row.admin_username,
    isGlobal: row.is_global,
    targetUsers: row.target_users,
    participationCount: row.participation_count,
    completionProgress: row.completion_progress,
    collectiveReward: row.collective_reward,
    expiresAt: row.expires_at,
    createdAt: row.created_at,
    metadata: row.metadata,
    status: row.status
  }));
}

/**
 * Update a shared wish
 */
export async function updateSharedWish(
  id: string,
  updates: SharedWishUpdate,
  adminUserId: string,
  reason: string,
  ipAddress?: string,
  userAgent?: string
): Promise<void> {
  // Get current values for audit log
  const currentWish = await getSharedWishById(id);
  if (!currentWish) {
    throw new Error('Shared wish not found');
  }

  // Build update query dynamically
  const updateParts = [];
  if (updates.isGlobal !== undefined) {
    updateParts.push(sql`is_global = ${updates.isGlobal}`);
  }
  if (updates.targetUsers !== undefined) {
    updateParts.push(sql`target_users = ${updates.targetUsers}`);
  }
  if (updates.collectiveReward !== undefined) {
    updateParts.push(sql`collective_reward = ${updates.collectiveReward}`);
  }
  if (updates.expiresAt !== undefined) {
    updateParts.push(sql`expires_at = ${updates.expiresAt}`);
  }
  if (updates.metadata !== undefined) {
    updateParts.push(sql`metadata = ${JSON.stringify(updates.metadata)}`);
  }

  if (updateParts.length === 0) {
    return; // No updates to make
  }

  const setClause = updateParts.reduce((acc, part, index) => {
    return index === 0 ? part : sql`${acc}, ${part}`;
  });

  await sql`UPDATE shared_wishes SET ${setClause} WHERE id = ${id}`;

  // Log the action
  await logSharedWishManagement(
    adminUserId,
    id,
    'EDIT',
    reason,
    {
      isGlobal: currentWish.isGlobal,
      targetUsers: currentWish.targetUsers,
      collectiveReward: currentWish.collectiveReward,
      expiresAt: currentWish.expiresAt,
      metadata: currentWish.metadata
    },
    updates,
    ipAddress,
    userAgent
  );
}

/**
 * Delete a shared wish
 */
export async function deleteSharedWish(
  id: string,
  adminUserId: string,
  reason: string,
  ipAddress?: string,
  userAgent?: string
): Promise<void> {
  // Get current values for audit log
  const currentWish = await getSharedWishById(id);
  if (!currentWish) {
    throw new Error('Shared wish not found');
  }

  await db.transaction(async (sqlClient) => {
    // Delete participants first (due to foreign key constraint)
    await sqlClient`DELETE FROM shared_wish_participants WHERE shared_wish_id = ${id}`;
    
    // Delete the shared wish
    await sqlClient`DELETE FROM shared_wishes WHERE id = ${id}`;
  });

  // Log the action
  await logSharedWishManagement(
    adminUserId,
    id,
    'DELETE',
    reason,
    currentWish,
    undefined,
    ipAddress,
    userAgent
  );
}

/**
 * Get participants of a shared wish
 */
export async function getSharedWishParticipants(sharedWishId: string): Promise<SharedWishParticipant[]> {
  const result = await sql`
    SELECT 
      swp.id,
      swp.shared_wish_id,
      swp.user_id,
      swp.participation_status,
      swp.progress_contribution,
      swp.joined_at,
      swp.completed_at,
      u.name as user_name,
      u.username as username
    FROM shared_wish_participants swp
    LEFT JOIN users u ON swp.user_id = u.id
    WHERE swp.shared_wish_id = ${sharedWishId}
    ORDER BY swp.joined_at DESC
  `;

  return result.map((row: any) => ({
    id: row.id,
    sharedWishId: row.shared_wish_id,
    userId: row.user_id,
    participationStatus: row.participation_status,
    progressContribution: row.progress_contribution,
    joinedAt: row.joined_at,
    completedAt: row.completed_at
  }));
}

/**
 * Update participant status
 */
export async function updateParticipantStatus(
  participantId: string,
  status: 'active' | 'completed' | 'opted_out',
  progressContribution?: number
): Promise<void> {
  let query = sql`
    UPDATE shared_wish_participants 
    SET participation_status = ${status}
  `;

  if (status === 'completed') {
    query = sql`${query}, completed_at = NOW()`;
  }

  if (progressContribution !== undefined) {
    query = sql`${query}, progress_contribution = ${progressContribution}`;
  }

  query = sql`${query} WHERE id = ${participantId}`;
  
  await query;
}

/**
 * Add user to shared wish
 */
export async function addUserToSharedWish(sharedWishId: string, userId: string): Promise<void> {
  await sql`
    INSERT INTO shared_wish_participants (shared_wish_id, user_id)
    VALUES (${sharedWishId}, ${userId})
    ON CONFLICT (shared_wish_id, user_id) DO NOTHING
  `;
}

/**
 * Remove user from shared wish
 */
export async function removeUserFromSharedWish(sharedWishId: string, userId: string): Promise<void> {
  await sql`
    DELETE FROM shared_wish_participants 
    WHERE shared_wish_id = ${sharedWishId} AND user_id = ${userId}
  `;
}

/**
 * Get shared wishes for a specific user
 */
export async function getUserSharedWishes(
  userId: string,
  status?: 'active' | 'completed' | 'opted_out'
): Promise<SharedWishDetails[]> {
  let query = sql`
    SELECT DISTINCT
      sw.id,
      sw.wish_id,
      w.description as wish_description,
      w.category as wish_category,
      sw.created_by_admin,
      au.name as admin_name,
      au.username as admin_username,
      sw.is_global,
      sw.target_users,
      sw.participation_count,
      sw.completion_progress,
      sw.collective_reward,
      sw.expires_at,
      sw.created_at,
      sw.metadata,
      CASE 
        WHEN sw.expires_at IS NOT NULL AND sw.expires_at < NOW() THEN 'expired'
        WHEN sw.completion_progress = 100 THEN 'completed'
        ELSE 'active'
      END as status
    FROM shared_wishes sw
    LEFT JOIN wishes w ON sw.wish_id = w.id
    LEFT JOIN users au ON sw.created_by_admin = au.id
    INNER JOIN shared_wish_participants swp ON sw.id = swp.shared_wish_id
    WHERE swp.user_id = ${userId}
  `;

  if (status) {
    query = sql`${query} AND swp.participation_status = ${status}`;
  }

  query = sql`${query} ORDER BY sw.created_at DESC`;
  
  const result = await query;

  return result.map((row: any) => ({
    id: row.id,
    wishId: row.wish_id,
    wishDescription: row.wish_description,
    wishCategory: row.wish_category,
    createdByAdmin: row.created_by_admin,
    adminName: row.admin_name,
    adminUsername: row.admin_username,
    isGlobal: row.is_global,
    targetUsers: row.target_users,
    participationCount: row.participation_count,
    completionProgress: row.completion_progress,
    collectiveReward: row.collective_reward,
    expiresAt: row.expires_at,
    createdAt: row.created_at,
    metadata: row.metadata,
    status: row.status
  }));
}

/**
 * Clean up expired shared wishes
 */
export async function cleanupExpiredSharedWishes(): Promise<number> {
  const result = await sql`
    UPDATE shared_wish_participants 
    SET participation_status = 'opted_out'
    WHERE shared_wish_id IN (
      SELECT id FROM shared_wishes 
      WHERE expires_at IS NOT NULL 
      AND expires_at < NOW()
      AND completion_progress < 100
    )
    AND participation_status = 'active'
  `;

  return result.length || 0;
}