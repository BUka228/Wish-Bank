import { NextApiRequest, NextApiResponse } from 'next';
import { neon } from '@neondatabase/serverless';
import { withAdminAuth, AdminUser } from '@/lib/admin-security';

interface UserListItem {
  id: string;
  telegram_id: string;
  name: string;
  username?: string;
  mana_balance: number;
  rank: string;
  experience_points: number;
  daily_quota_used: number;
  weekly_quota_used: number;
  monthly_quota_used: number;
  last_quota_reset: Date;
  created_at: Date;
  updated_at: Date;
  // Statistics
  total_wishes: number;
  completed_wishes: number;
  total_transactions: number;
  total_mana_earned: number;
  total_mana_spent: number;
  last_activity: Date;
}

interface UserListResponse {
  users: UserListItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  filters: {
    search?: string;
    rank?: string;
    minMana?: number;
    maxMana?: number;
  };
}

async function getUserList(
  req: NextApiRequest,
  res: NextApiResponse,
  adminUser: AdminUser
): Promise<void> {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const sql = neon(process.env.DATABASE_URL!);
    
    // Parse query parameters
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100); // Max 100 per page
    const search = req.query.search as string;
    const rank = req.query.rank as string;
    const minMana = req.query.minMana ? parseInt(req.query.minMana as string) : undefined;
    const maxMana = req.query.maxMana ? parseInt(req.query.maxMana as string) : undefined;
    const sortBy = req.query.sortBy as string || 'updated_at';
    const sortOrder = req.query.sortOrder as string || 'desc';
    
    const offset = (page - 1) * limit;

    // Build the base query with statistics
    let baseQuery = `
      SELECT 
        u.id,
        u.telegram_id,
        u.name,
        u.username,
        u.mana_balance,
        u.rank,
        u.experience_points,
        u.daily_quota_used,
        u.weekly_quota_used,
        u.monthly_quota_used,
        u.last_quota_reset,
        u.created_at,
        u.updated_at,
        -- Statistics
        COALESCE(wish_stats.total_wishes, 0) as total_wishes,
        COALESCE(wish_stats.completed_wishes, 0) as completed_wishes,
        COALESCE(trans_stats.total_transactions, 0) as total_transactions,
        COALESCE(trans_stats.total_mana_earned, 0) as total_mana_earned,
        COALESCE(trans_stats.total_mana_spent, 0) as total_mana_spent,
        COALESCE(
          GREATEST(
            u.updated_at,
            wish_stats.last_wish_activity,
            trans_stats.last_transaction
          ), 
          u.created_at
        ) as last_activity
      FROM users u
      LEFT JOIN (
        SELECT 
          author_id,
          COUNT(*) as total_wishes,
          COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_wishes,
          MAX(created_at) as last_wish_activity
        FROM wishes 
        GROUP BY author_id
      ) wish_stats ON u.id = wish_stats.author_id
      LEFT JOIN (
        SELECT 
          user_id,
          COUNT(*) as total_transactions,
          SUM(CASE WHEN mana_amount > 0 THEN mana_amount ELSE 0 END) as total_mana_earned,
          SUM(CASE WHEN mana_amount < 0 THEN ABS(mana_amount) ELSE 0 END) as total_mana_spent,
          MAX(created_at) as last_transaction
        FROM transactions 
        GROUP BY user_id
      ) trans_stats ON u.id = trans_stats.user_id
    `;

    // Build WHERE conditions
    let whereConditions: string[] = [];
    
    if (search) {
      whereConditions.push(`(
        LOWER(u.name) LIKE LOWER('%${search}%') OR 
        LOWER(u.username) LIKE LOWER('%${search}%') OR
        u.telegram_id LIKE '%${search}%'
      )`);
    }
    
    if (rank) {
      whereConditions.push(`u.rank = '${rank}'`);
    }
    
    if (minMana !== undefined) {
      whereConditions.push(`u.mana_balance >= ${minMana}`);
    }
    
    if (maxMana !== undefined) {
      whereConditions.push(`u.mana_balance <= ${maxMana}`);
    }

    // Add WHERE clause if we have conditions
    if (whereConditions.length > 0) {
      baseQuery += ` WHERE ${whereConditions.join(' AND ')}`;
    }

    // Validate and add ORDER BY clause
    const validSortFields = [
      'name', 'username', 'mana_balance', 'rank', 'experience_points',
      'created_at', 'updated_at', 'last_activity', 'total_wishes', 
      'completed_wishes', 'total_mana_earned', 'total_mana_spent'
    ];
    
    const validSortField = validSortFields.includes(sortBy) ? sortBy : 'updated_at';
    const validSortOrder = ['asc', 'desc'].includes(sortOrder.toLowerCase()) ? sortOrder.toUpperCase() : 'DESC';
    
    baseQuery += ` ORDER BY ${validSortField} ${validSortOrder}`;

    // Get total count for pagination
    const countQuery = `
      SELECT COUNT(*) as total
      FROM users u
      ${whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : ''}
    `;

    // Execute queries
    const [usersResult, countResult] = await Promise.all([
      sql`${baseQuery} LIMIT ${limit} OFFSET ${offset}`,
      sql`${countQuery}`
    ]);

    const users: UserListItem[] = usersResult.map((row: any) => ({
      id: row.id,
      telegram_id: row.telegram_id,
      name: row.name,
      username: row.username,
      mana_balance: row.mana_balance,
      rank: row.rank,
      experience_points: row.experience_points,
      daily_quota_used: row.daily_quota_used,
      weekly_quota_used: row.weekly_quota_used,
      monthly_quota_used: row.monthly_quota_used,
      last_quota_reset: new Date(row.last_quota_reset),
      created_at: new Date(row.created_at),
      updated_at: new Date(row.updated_at),
      total_wishes: parseInt(row.total_wishes) || 0,
      completed_wishes: parseInt(row.completed_wishes) || 0,
      total_transactions: parseInt(row.total_transactions) || 0,
      total_mana_earned: parseInt(row.total_mana_earned) || 0,
      total_mana_spent: parseInt(row.total_mana_spent) || 0,
      last_activity: new Date(row.last_activity)
    }));

    const total = parseInt(countResult[0].total);
    const totalPages = Math.ceil(total / limit);

    const response: UserListResponse = {
      users,
      pagination: {
        page,
        limit,
        total,
        totalPages
      },
      filters: {
        search,
        rank,
        minMana,
        maxMana
      }
    };

    res.status(200).json(response);

  } catch (error) {
    console.error('Error fetching user list:', error);
    res.status(500).json({
      error: 'Internal server error while fetching user list',
      code: 'FETCH_USERS_ERROR'
    });
  }
}

export default withAdminAuth(getUserList);