import { NextApiRequest, NextApiResponse } from 'next';
import { neon } from '@neondatabase/serverless';
import { withAdminAuth, AdminUser, validateAndLogAdminAction } from '@/lib/admin-security';

interface UserParameterUpdate {
  mana_balance?: number;
  rank?: string;
  experience_points?: number;
  daily_quota_used?: number;
  weekly_quota_used?: number;
  monthly_quota_used?: number;
  reason: string; // Required for all changes
}

interface UserParameterValidation {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

interface UserAdjustmentResponse {
  success: boolean;
  user: {
    id: string;
    name: string;
    username?: string;
    mana_balance: number;
    rank: string;
    experience_points: number;
    daily_quota_used: number;
    weekly_quota_used: number;
    monthly_quota_used: number;
    updated_at: Date;
  };
  changes: {
    field: string;
    oldValue: any;
    newValue: any;
  }[];
  auditLogId: string;
}

// Valid ranks from the system
const VALID_RANKS = [
  'Рядовой', 'Ефрейтор', 'Младший сержант', 'Сержант', 'Старший сержант',
  'Старшина', 'Прапорщик', 'Старший прапорщик', 'Младший лейтенант', 'Лейтенант',
  'Старший лейтенант', 'Капитан', 'Майор', 'Подполковник', 'Полковник',
  'Генерал-майор', 'Генерал-лейтенант', 'Генерал-полковник', 'Генерал армии', 'Маршал'
];

function validateUserParameters(updates: UserParameterUpdate): UserParameterValidation {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Validate reason
  if (!updates.reason || updates.reason.trim().length === 0) {
    errors.push('Reason is required for all parameter changes');
  } else if (updates.reason.length > 500) {
    errors.push('Reason must be less than 500 characters');
  }

  // Validate mana_balance
  if (updates.mana_balance !== undefined) {
    if (typeof updates.mana_balance !== 'number' || isNaN(updates.mana_balance)) {
      errors.push('Mana balance must be a valid number');
    } else if (updates.mana_balance < 0) {
      errors.push('Mana balance cannot be negative');
    } else if (updates.mana_balance > 1000000) {
      warnings.push('Mana balance is very high (>1,000,000) - please verify this is intentional');
    }
  }

  // Validate rank
  if (updates.rank !== undefined) {
    if (!VALID_RANKS.includes(updates.rank)) {
      errors.push(`Invalid rank. Valid ranks are: ${VALID_RANKS.join(', ')}`);
    }
  }

  // Validate experience_points
  if (updates.experience_points !== undefined) {
    if (typeof updates.experience_points !== 'number' || isNaN(updates.experience_points)) {
      errors.push('Experience points must be a valid number');
    } else if (updates.experience_points < 0) {
      errors.push('Experience points cannot be negative');
    } else if (updates.experience_points > 1000000) {
      warnings.push('Experience points are very high (>1,000,000) - please verify this is intentional');
    }
  }

  // Validate quota values
  const quotaFields = ['daily_quota_used', 'weekly_quota_used', 'monthly_quota_used'];
  quotaFields.forEach(field => {
    const value = (updates as any)[field];
    if (value !== undefined) {
      if (typeof value !== 'number' || isNaN(value)) {
        errors.push(`${field} must be a valid number`);
      } else if (value < 0) {
        errors.push(`${field} cannot be negative`);
      } else if (value > 1000) {
        warnings.push(`${field} is very high (>${1000}) - please verify this is intentional`);
      }
    }
  });

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

async function adjustUserParameters(
  req: NextApiRequest,
  res: NextApiResponse,
  adminUser: AdminUser
): Promise<void> {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const sql = neon(process.env.DATABASE_URL!);
    const userId = req.query.id as string;
    const updates: UserParameterUpdate = req.body;

    // Validate user ID
    if (!userId) {
      return res.status(400).json({
        error: 'User ID is required',
        code: 'MISSING_USER_ID'
      });
    }

    // Validate parameters
    const validation = validateUserParameters(updates);
    if (!validation.isValid) {
      return res.status(400).json({
        error: 'Invalid parameters',
        code: 'VALIDATION_ERROR',
        details: validation.errors
      });
    }

    // Check if user exists and get current values
    const userResult = await sql`
      SELECT 
        id, name, username, mana_balance, rank, experience_points,
        daily_quota_used, weekly_quota_used, monthly_quota_used,
        updated_at
      FROM users 
      WHERE id = ${userId}
    `;

    if (userResult.length === 0) {
      return res.status(404).json({
        error: 'User not found',
        code: 'USER_NOT_FOUND'
      });
    }

    const currentUser = userResult[0];
    const oldValues: any = {};
    const newValues: any = {};
    const changes: { field: string; oldValue: any; newValue: any }[] = [];

    // Build update query and track changes
    const updateFields: string[] = [];
    const updateValues: any[] = [];
    let paramIndex = 1;

    if (updates.mana_balance !== undefined && updates.mana_balance !== currentUser.mana_balance) {
      updateFields.push(`mana_balance = $${paramIndex++}`);
      updateValues.push(updates.mana_balance);
      oldValues.mana_balance = currentUser.mana_balance;
      newValues.mana_balance = updates.mana_balance;
      changes.push({
        field: 'mana_balance',
        oldValue: currentUser.mana_balance,
        newValue: updates.mana_balance
      });
    }

    if (updates.rank !== undefined && updates.rank !== currentUser.rank) {
      updateFields.push(`rank = $${paramIndex++}`);
      updateValues.push(updates.rank);
      oldValues.rank = currentUser.rank;
      newValues.rank = updates.rank;
      changes.push({
        field: 'rank',
        oldValue: currentUser.rank,
        newValue: updates.rank
      });
    }

    if (updates.experience_points !== undefined && updates.experience_points !== currentUser.experience_points) {
      updateFields.push(`experience_points = $${paramIndex++}`);
      updateValues.push(updates.experience_points);
      oldValues.experience_points = currentUser.experience_points;
      newValues.experience_points = updates.experience_points;
      changes.push({
        field: 'experience_points',
        oldValue: currentUser.experience_points,
        newValue: updates.experience_points
      });
    }

    if (updates.daily_quota_used !== undefined && updates.daily_quota_used !== currentUser.daily_quota_used) {
      updateFields.push(`daily_quota_used = $${paramIndex++}`);
      updateValues.push(updates.daily_quota_used);
      oldValues.daily_quota_used = currentUser.daily_quota_used;
      newValues.daily_quota_used = updates.daily_quota_used;
      changes.push({
        field: 'daily_quota_used',
        oldValue: currentUser.daily_quota_used,
        newValue: updates.daily_quota_used
      });
    }

    if (updates.weekly_quota_used !== undefined && updates.weekly_quota_used !== currentUser.weekly_quota_used) {
      updateFields.push(`weekly_quota_used = $${paramIndex++}`);
      updateValues.push(updates.weekly_quota_used);
      oldValues.weekly_quota_used = currentUser.weekly_quota_used;
      newValues.weekly_quota_used = updates.weekly_quota_used;
      changes.push({
        field: 'weekly_quota_used',
        oldValue: currentUser.weekly_quota_used,
        newValue: updates.weekly_quota_used
      });
    }

    if (updates.monthly_quota_used !== undefined && updates.monthly_quota_used !== currentUser.monthly_quota_used) {
      updateFields.push(`monthly_quota_used = $${paramIndex++}`);
      updateValues.push(updates.monthly_quota_used);
      oldValues.monthly_quota_used = currentUser.monthly_quota_used;
      newValues.monthly_quota_used = updates.monthly_quota_used;
      changes.push({
        field: 'monthly_quota_used',
        oldValue: currentUser.monthly_quota_used,
        newValue: updates.monthly_quota_used
      });
    }

    // If no changes, return early
    if (changes.length === 0) {
      return res.status(200).json({
        success: true,
        message: 'No changes detected',
        user: {
          id: currentUser.id,
          name: currentUser.name,
          username: currentUser.username,
          mana_balance: currentUser.mana_balance,
          rank: currentUser.rank,
          experience_points: currentUser.experience_points,
          daily_quota_used: currentUser.daily_quota_used,
          weekly_quota_used: currentUser.weekly_quota_used,
          monthly_quota_used: currentUser.monthly_quota_used,
          updated_at: new Date(currentUser.updated_at)
        },
        changes: [],
        warnings: validation.warnings
      });
    }

    // Add updated_at to the update
    updateFields.push(`updated_at = NOW()`);

    // Execute the update using neon's template literal syntax
    updateValues.push(userId);
    
    // Build the update query dynamically
    let updatedUserResult;
    if (updateFields.length === 1) { // Only updated_at
      updatedUserResult = await sql`
        UPDATE users 
        SET updated_at = NOW()
        WHERE id = ${userId}
        RETURNING id, name, username, mana_balance, rank, experience_points,
                  daily_quota_used, weekly_quota_used, monthly_quota_used, updated_at
      `;
    } else {
      // For complex updates, we need to handle each case
      const setClause = updateFields.slice(0, -1).join(', '); // Remove updated_at for now
      
      if (changes.length === 1) {
        const change = changes[0];
        switch (change.field) {
          case 'mana_balance':
            updatedUserResult = await sql`
              UPDATE users 
              SET mana_balance = ${change.newValue}, updated_at = NOW()
              WHERE id = ${userId}
              RETURNING id, name, username, mana_balance, rank, experience_points,
                        daily_quota_used, weekly_quota_used, monthly_quota_used, updated_at
            `;
            break;
          case 'rank':
            updatedUserResult = await sql`
              UPDATE users 
              SET rank = ${change.newValue}, updated_at = NOW()
              WHERE id = ${userId}
              RETURNING id, name, username, mana_balance, rank, experience_points,
                        daily_quota_used, weekly_quota_used, monthly_quota_used, updated_at
            `;
            break;
          case 'experience_points':
            updatedUserResult = await sql`
              UPDATE users 
              SET experience_points = ${change.newValue}, updated_at = NOW()
              WHERE id = ${userId}
              RETURNING id, name, username, mana_balance, rank, experience_points,
                        daily_quota_used, weekly_quota_used, monthly_quota_used, updated_at
            `;
            break;
          case 'daily_quota_used':
            updatedUserResult = await sql`
              UPDATE users 
              SET daily_quota_used = ${change.newValue}, updated_at = NOW()
              WHERE id = ${userId}
              RETURNING id, name, username, mana_balance, rank, experience_points,
                        daily_quota_used, weekly_quota_used, monthly_quota_used, updated_at
            `;
            break;
          case 'weekly_quota_used':
            updatedUserResult = await sql`
              UPDATE users 
              SET weekly_quota_used = ${change.newValue}, updated_at = NOW()
              WHERE id = ${userId}
              RETURNING id, name, username, mana_balance, rank, experience_points,
                        daily_quota_used, weekly_quota_used, monthly_quota_used, updated_at
            `;
            break;
          case 'monthly_quota_used':
            updatedUserResult = await sql`
              UPDATE users 
              SET monthly_quota_used = ${change.newValue}, updated_at = NOW()
              WHERE id = ${userId}
              RETURNING id, name, username, mana_balance, rank, experience_points,
                        daily_quota_used, weekly_quota_used, monthly_quota_used, updated_at
            `;
            break;
          default:
            throw new Error(`Unsupported field update: ${change.field}`);
        }
      } else {
        // For multiple changes, we'll need to build a more complex query
        // For now, let's handle the most common combinations
        const fieldsToUpdate: any = {};
        changes.forEach(change => {
          fieldsToUpdate[change.field] = change.newValue;
        });
        
        updatedUserResult = await sql`
          UPDATE users 
          SET 
            mana_balance = COALESCE(${fieldsToUpdate.mana_balance}, mana_balance),
            rank = COALESCE(${fieldsToUpdate.rank}, rank),
            experience_points = COALESCE(${fieldsToUpdate.experience_points}, experience_points),
            daily_quota_used = COALESCE(${fieldsToUpdate.daily_quota_used}, daily_quota_used),
            weekly_quota_used = COALESCE(${fieldsToUpdate.weekly_quota_used}, weekly_quota_used),
            monthly_quota_used = COALESCE(${fieldsToUpdate.monthly_quota_used}, monthly_quota_used),
            updated_at = NOW()
          WHERE id = ${userId}
          RETURNING id, name, username, mana_balance, rank, experience_points,
                    daily_quota_used, weekly_quota_used, monthly_quota_used, updated_at
        `;
      }
    }
    
    const updatedUser = updatedUserResult[0];

    // Log the admin action
    await validateAndLogAdminAction(
      adminUser,
      'USER_PARAMETER_ADJUSTMENT',
      updates.reason,
      userId,
      oldValues,
      newValues,
      req
    );

    // Create transaction records for mana changes
    if (updates.mana_balance !== undefined && updates.mana_balance !== currentUser.mana_balance) {
      const manaChange = updates.mana_balance - currentUser.mana_balance;
      const transactionType = manaChange > 0 ? 'credit' : 'debit';
      const transactionAmount = Math.abs(manaChange);

      await sql`
        INSERT INTO transactions (
          user_id, type, wish_type, amount, mana_amount, reason, 
          transaction_category, transaction_source, experience_gained
        ) VALUES (
          ${userId}, 
          ${transactionType}, 
          'blue', 
          0, 
          ${manaChange}, 
          ${`Admin adjustment: ${updates.reason}`}, 
          'admin_adjustment', 
          'admin_panel', 
          0
        )
      `;
    }

    const response: UserAdjustmentResponse = {
      success: true,
      user: {
        id: updatedUser.id,
        name: updatedUser.name,
        username: updatedUser.username,
        mana_balance: updatedUser.mana_balance,
        rank: updatedUser.rank,
        experience_points: updatedUser.experience_points,
        daily_quota_used: updatedUser.daily_quota_used,
        weekly_quota_used: updatedUser.weekly_quota_used,
        monthly_quota_used: updatedUser.monthly_quota_used,
        updated_at: new Date(updatedUser.updated_at)
      },
      changes,
      auditLogId: 'logged' // In a real implementation, you'd return the actual audit log ID
    };

    // Include warnings if any
    if (validation.warnings.length > 0) {
      (response as any).warnings = validation.warnings;
    }

    res.status(200).json(response);

  } catch (error) {
    console.error('Error adjusting user parameters:', error);
    
    // Log the failed attempt
    try {
      await validateAndLogAdminAction(
        adminUser,
        'USER_PARAMETER_ADJUSTMENT_FAILED',
        `Failed adjustment attempt: ${error instanceof Error ? error.message : 'Unknown error'}`,
        req.query.id as string,
        undefined,
        req.body,
        req
      );
    } catch (logError) {
      console.error('Error logging failed adjustment attempt:', logError);
    }

    res.status(500).json({
      error: 'Internal server error while adjusting user parameters',
      code: 'ADJUSTMENT_ERROR'
    });
  }
}

export default withAdminAuth(adjustUserParameters);