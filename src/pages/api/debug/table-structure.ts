import { NextApiRequest, NextApiResponse } from 'next';
import { sql } from '@/lib/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Проверяем структуру таблицы wishes
    const wishesStructure = await sql`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'wishes' 
      ORDER BY ordinal_position
    `;

    // Проверяем, есть ли записи в таблице migrations
    const migrations = await sql`
      SELECT filename, executed_at 
      FROM migrations 
      ORDER BY executed_at DESC
    `;

    res.status(200).json({
      wishesStructure,
      migrations,
      message: 'Table structure retrieved successfully'
    });
  } catch (error) {
    console.error('Debug API error:', error);
    res.status(500).json({ 
      error: 'Failed to get table structure',
      details: error.message 
    });
  }
}