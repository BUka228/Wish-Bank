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
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
    const offset = (page - 1) * limit;

    // Simple query to get users with basic info
    const usersResult = await sql`
      SELECT 
        id,
        telegram_id,
        name,
        username,
        mana_balance,
        rank,
        experience_points,
        daily_quota_used,
        weekly_quota_used,
        monthly_quota_used,
        last_quota_reset,
        created_at,
        updated_at
      FROM users 
      ORDER BY updated_at DESC 
      LIMIT ${limit} OFFSET ${offset}
    `;

    // Get total count
    const countResult = await sql`SELECT COUNT(*) as total FROM users`;

    const users: UserListItem[] = usersResult.map((row: any) => ({
      id: row.id,
      telegram_id: row.telegram_id,
      name: row.name,
      username: row.username,
      mana_balance: row.mana_balance || 0,
      rank: row.rank || 'Рядовой',
      experience_points: row.experience_points || 0,
      daily_quota_used: row.daily_quota_used || 0,
      weekly_quota_used: row.weekly_quota_used || 0,
      monthly_quota_used: row.monthly_quota_used || 0,
      last_quota_reset: new Date(row.last_quota_reset || row.created_at),
      created_at: new Date(row.created_at),
      updated_at: new Date(row.updated_at),
      // Simple stats - can be enhanced later
      total_wishes: 0,
      completed_wishes: 0,
      total_transactions: 0,
      total_mana_earned: 0,
      total_mana_spent: 0,
      last_activity: new Date(row.updated_at)
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
      filters: {}
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