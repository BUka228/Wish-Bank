import { NextApiRequest, NextApiResponse } from 'next';
import { withAdminAuth, validateAndLogAdminAction } from '@/lib/admin-security';
import { 
  getSharedWishes, 
  getSharedWishById, 
  updateSharedWish, 
  deleteSharedWish,
  getSharedWishParticipants,
  updateParticipantStatus,
  addUserToSharedWish,
  removeUserFromSharedWish
} from '@/lib/shared-wishes-functions';

interface ManageSharedWishesResponse {
  success: boolean;
  data?: any;
  message?: string;
  error?: string;
}

async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ManageSharedWishesResponse>,
  adminUser: any
) {
  try {
    switch (req.method) {
      case 'GET':
        return await handleGetSharedWishes(req, res, adminUser);
      case 'PUT':
        return await handleUpdateSharedWish(req, res, adminUser);
      case 'DELETE':
        return await handleDeleteSharedWish(req, res, adminUser);
      case 'POST':
        return await handleManageParticipants(req, res, adminUser);
      default:
        res.setHeader('Allow', ['GET', 'PUT', 'DELETE', 'POST']);
        return res.status(405).json({
          success: false,
          error: 'Method not allowed'
        });
    }
  } catch (error: any) {
    console.error('Error in shared wishes management:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
}

/**
 * Handle GET requests - retrieve shared wishes with filtering and pagination
 */
async function handleGetSharedWishes(
  req: NextApiRequest,
  res: NextApiResponse<ManageSharedWishesResponse>,
  adminUser: any
) {
  const {
    id,
    status,
    isGlobal,
    limit = '50',
    offset = '0',
    includeParticipants = 'false'
  } = req.query;

  // Get specific shared wish by ID
  if (id && typeof id === 'string') {
    const sharedWish = await getSharedWishById(id);
    
    if (!sharedWish) {
      return res.status(404).json({
        success: false,
        error: 'Shared wish not found'
      });
    }

    let participants: any[] = [];
    if (includeParticipants === 'true') {
      participants = await getSharedWishParticipants(id);
    }

    return res.status(200).json({
      success: true,
      data: {
        sharedWish,
        participants
      }
    });
  }

  // Get list of shared wishes with filters
  const filters: any = {
    limit: parseInt(limit as string, 10),
    offset: parseInt(offset as string, 10)
  };

  if (status && typeof status === 'string') {
    filters.status = status as 'active' | 'completed' | 'expired';
  }

  if (isGlobal !== undefined) {
    filters.isGlobal = isGlobal === 'true';
  }

  const sharedWishes = await getSharedWishes(filters);

  return res.status(200).json({
    success: true,
    data: {
      sharedWishes,
      pagination: {
        limit: filters.limit,
        offset: filters.offset,
        total: sharedWishes.length
      }
    }
  });
}

/**
 * Handle PUT requests - update shared wish
 */
async function handleUpdateSharedWish(
  req: NextApiRequest,
  res: NextApiResponse<ManageSharedWishesResponse>,
  adminUser: any
) {
  const { id } = req.query;
  const {
    isGlobal,
    targetUsers,
    collectiveReward,
    expiresAt,
    metadata,
    reason
  } = req.body;

  if (!id || typeof id !== 'string') {
    return res.status(400).json({
      success: false,
      error: 'Shared wish ID is required'
    });
  }

  if (!reason) {
    return res.status(400).json({
      success: false,
      error: 'Reason is required for updates'
    });
  }

  // Validate the shared wish exists
  const existingWish = await getSharedWishById(id);
  if (!existingWish) {
    return res.status(404).json({
      success: false,
      error: 'Shared wish not found'
    });
  }

  // Prepare update data
  const updates: any = {};
  
  if (isGlobal !== undefined) {
    updates.isGlobal = isGlobal;
  }
  
  if (targetUsers !== undefined) {
    updates.targetUsers = targetUsers;
  }
  
  if (collectiveReward !== undefined) {
    if (collectiveReward < 0) {
      return res.status(400).json({
        success: false,
        error: 'Collective reward cannot be negative'
      });
    }
    updates.collectiveReward = collectiveReward;
  }
  
  if (expiresAt !== undefined) {
    if (expiresAt) {
      const expirationDate = new Date(expiresAt);
      if (isNaN(expirationDate.getTime()) || expirationDate <= new Date()) {
        return res.status(400).json({
          success: false,
          error: 'Expiration date must be a valid future date'
        });
      }
      updates.expiresAt = expirationDate;
    } else {
      updates.expiresAt = null;
    }
  }
  
  if (metadata !== undefined) {
    updates.metadata = metadata;
  }

  // Update the shared wish
  await updateSharedWish(
    id,
    updates,
    adminUser.id,
    reason,
    getClientIP(req),
    req.headers['user-agent']
  );

  // Log the admin action
  await validateAndLogAdminAction(
    adminUser,
    'SHARED_WISH_UPDATE',
    reason,
    undefined,
    existingWish,
    updates,
    req
  );

  return res.status(200).json({
    success: true,
    message: 'Shared wish updated successfully'
  });
}

/**
 * Handle DELETE requests - delete shared wish
 */
async function handleDeleteSharedWish(
  req: NextApiRequest,
  res: NextApiResponse<ManageSharedWishesResponse>,
  adminUser: any
) {
  const { id } = req.query;
  const { reason } = req.body;

  if (!id || typeof id !== 'string') {
    return res.status(400).json({
      success: false,
      error: 'Shared wish ID is required'
    });
  }

  if (!reason) {
    return res.status(400).json({
      success: false,
      error: 'Reason is required for deletion'
    });
  }

  // Validate the shared wish exists
  const existingWish = await getSharedWishById(id);
  if (!existingWish) {
    return res.status(404).json({
      success: false,
      error: 'Shared wish not found'
    });
  }

  // Delete the shared wish
  await deleteSharedWish(
    id,
    adminUser.id,
    reason,
    getClientIP(req),
    req.headers['user-agent']
  );

  // Log the admin action
  await validateAndLogAdminAction(
    adminUser,
    'SHARED_WISH_DELETE',
    reason,
    undefined,
    existingWish,
    undefined,
    req
  );

  return res.status(200).json({
    success: true,
    message: 'Shared wish deleted successfully'
  });
}

/**
 * Handle POST requests - manage participants
 */
async function handleManageParticipants(
  req: NextApiRequest,
  res: NextApiResponse<ManageSharedWishesResponse>,
  adminUser: any
) {
  const { action, sharedWishId, userId, participantId, status, progressContribution, reason } = req.body;

  if (!action || !reason) {
    return res.status(400).json({
      success: false,
      error: 'Action and reason are required'
    });
  }

  switch (action) {
    case 'add_participant':
      if (!sharedWishId || !userId) {
        return res.status(400).json({
          success: false,
          error: 'Shared wish ID and user ID are required'
        });
      }

      await addUserToSharedWish(sharedWishId, userId);
      
      await validateAndLogAdminAction(
        adminUser,
        'SHARED_WISH_ADD_PARTICIPANT',
        reason,
        userId,
        undefined,
        { sharedWishId, userId },
        req
      );

      return res.status(200).json({
        success: true,
        message: 'Participant added successfully'
      });

    case 'remove_participant':
      if (!sharedWishId || !userId) {
        return res.status(400).json({
          success: false,
          error: 'Shared wish ID and user ID are required'
        });
      }

      await removeUserFromSharedWish(sharedWishId, userId);
      
      await validateAndLogAdminAction(
        adminUser,
        'SHARED_WISH_REMOVE_PARTICIPANT',
        reason,
        userId,
        { sharedWishId, userId },
        undefined,
        req
      );

      return res.status(200).json({
        success: true,
        message: 'Participant removed successfully'
      });

    case 'update_participant_status':
      if (!participantId || !status) {
        return res.status(400).json({
          success: false,
          error: 'Participant ID and status are required'
        });
      }

      if (!['active', 'completed', 'opted_out'].includes(status)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid status. Must be active, completed, or opted_out'
        });
      }

      await updateParticipantStatus(participantId, status, progressContribution);
      
      await validateAndLogAdminAction(
        adminUser,
        'SHARED_WISH_UPDATE_PARTICIPANT',
        reason,
        undefined,
        undefined,
        { participantId, status, progressContribution },
        req
      );

      return res.status(200).json({
        success: true,
        message: 'Participant status updated successfully'
      });

    default:
      return res.status(400).json({
        success: false,
        error: 'Invalid action. Must be add_participant, remove_participant, or update_participant_status'
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