import { NextApiRequest, NextApiResponse } from 'next';
import { neon } from '@neondatabase/serverless';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Проверяем подключение к базе данных
    if (!process.env.DATABASE_URL && !process.env.POSTGRES_URL) {
      return res.status(500).json({ 
        status: 'error', 
        message: 'DATABASE_URL not configured' 
      });
    }

    const sql = neon(process.env.DATABASE_URL || process.env.POSTGRES_URL || '');
    
    // Простой запрос для проверки подключения
    await sql`SELECT 1 as test`;
    
    // Проверяем существование таблиц
    const tables = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('users', 'wishes', 'transactions')
    `;
    
    const existingTables = tables.map((t: any) => t.table_name);
    const requiredTables = ['users', 'wishes', 'transactions'];
    const missingTables = requiredTables.filter(table => !existingTables.includes(table));
    
    res.status(200).json({
      status: 'ok',
      database: 'connected',
      tables: {
        existing: existingTables,
        missing: missingTables,
        initialized: missingTables.length === 0
      }
    });
  } catch (error) {
    console.error('Health check error:', error);
    res.status(500).json({ 
      status: 'error', 
      message: 'Database connection failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}