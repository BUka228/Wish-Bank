import { NextApiRequest, NextApiResponse } from 'next';
import { withAdminAuth, validateAndLogAdminAction } from '@/lib/admin-security';
import { createSharedWish } from '@/lib/shared-wishes-functions';
import { sql } from '@/lib/db-pool';

interface CreateSharedWishRequest {
  description: string;
  category: string;
  priority?: number;
  isGlobal?: boolean;
  targetUsers?: string[];
  collectiveReward?: number;
  expiresAt?: string;
  reason: string;
}

interface CreateSharedWishResponse {
  success: boolean;
  sharedWishId?: string;
  message?: string;
  error?: string;
}

async function handler(
  req: NextApiRequest,
  res: NextApiResponse<CreateSharedWishResponse>,
  adminUser: any
) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({
      success: false,
      error: 'Method not allowed'
    });
  }

  try {
    const {
      description,
      category,
      priority = 1,
      isGlobal = true,
      targetUsers = [],
      collectiveReward = 0,
      expiresAt,
      reason
    }: CreateSharedWishRequest = req.body;

    // Validate required fields
    if (!description || !category || !reason) {
      return res.status(400).json({
        success: false,
        error: 'Description, category, and reason are required'
      });
    }

    // Validate description length
    if (description.length > 500) {
      return res.status(400).json({
        success: false,
        error: 'Description must be less than 500 characters'
      });
    }

    // Validate category exists
    const categoryResult = await sql`
      SELECT id FROM wish_categories WHERE name = ${category}
    `;
    
    if (categoryResult.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Invalid category'
      });
    }

    // Validate target users if not global
    if (!isGlobal && (!targetUsers || targetUsers.length === 0)) {
      return res.status(400).json({
        success: false,
        error: 'Target users are required for non-global shared wishes'
      });
    }

    // Validate target users exist
    if (!isGlobal && targetUsers.length > 0) {
      const userCheckResult = await sql`
        SELECT id FROM users WHERE id = ANY(${targetUsers})
      `;
      
      if (userCheckResult.length !== targetUsers.length) {
        return res.status(400).json({
          success: false,
          error: 'One or more target users do not exist'
        });
      }
    }

    // Validate expiration date
    let expirationDate: Date | undefined;
    if (expiresAt) {
      expirationDate = new Date(expiresAt);
      if (isNaN(expirationDate.getTime()) || expirationDate <= new Date()) {
        return res.status(400).json({
          success: false,
          error: 'Expiration date must be a valid future date'
        });
      }
    }

    // Validate collective reward
    if (collectiveReward < 0) {
      return res.status(400).json({
        success: false,
        error: 'Collective reward cannot be negative'
      });
    }

    // Create the base wish first
    const wishResult = await sql`
      INSERT INTO wishes (
        type, 
        description, 
        author_id, 
        category, 
        is_shared, 
        priority, 
        status,
        metadata
      ) VALUES (
        'blue',
        ${description},
        ${adminUser.id},
        ${category},
        true,
        ${priority},
        'active',
        ${JSON.stringify({
          created_by_admin: true,
          admin_approved: true,
          collective_goal: true,
          is_shared_wish: true
        })}
      )
      RETURNING id
    `;

    const wishId = wishResult[0].id;

    // Create the shared wish
    const sharedWishId = await createSharedWish(
      {
        wishId,
        createdByAdmin: adminUser.id,
        isGlobal,
        targetUsers: isGlobal ? [] : targetUsers,
        collectiveReward,
        expiresAt: expirationDate,
        metadata: {
          created_by_admin: true,
          admin_approved: true,
          collective_goal: true,
          priority
        }
      },
      reason,
      getClientIP(req),
      req.headers['user-agent']
    );

    // Log the admin action
    await validateAndLogAdminAction(
      adminUser,
      'SHARED_WISH_CREATE',
      reason,
      undefined,
      undefined,
      {
        sharedWishId,
        wishId,
        description,
        category,
        isGlobal,
        targetUsers,
        collectiveReward,
        expiresAt: expirationDate
      },
      req
    );

    // Send notifications to users
    try {
      const { sharedWishNotifications } = await import('@/lib/shared-wish-notifications');
      const notificationResult = await sharedWishNotifications.sendSharedWishCreatedNotification(
        sharedWishId,
        description,
        isGlobal,
        targetUsers,
        collectiveReward,
        expirationDate
      );
      
      console.log(`Shared wish ${sharedWishId} created - notifications sent to ${notificationResult.sent} users, ${notificationResult.failed} failed`);
    } catch (notificationError) {
      console.error('Failed to send notifications:', notificationError);
      // Don't fail the request if notification sending fails
    }

    return res.status(201).json({
      success: true,
      sharedWishId,
      message: 'Shared wish created successfully'
    });

  } catch (error: any) {
    console.error('Error creating shared wish:', error);
    
    return res.status(500).json({
      success: false,
      error: 'Failed to create shared wish'
    });
  }
}



/**
 * Utility function to get client IP address
 */
function getClientIP(req: NextApiRequest): string {
  const forwarded = req.headers['x-forwarded-for'];
  const ip = forwarded 
    ? (Array.isArray(forwarded) ? forwarded[0] : forwarded.split(',')[0])
    : req.socket.remoteAddress;
  
  return ip || 'unknown';
}

export default withAdminAuth(handler);