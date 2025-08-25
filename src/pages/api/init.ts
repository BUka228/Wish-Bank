import { NextApiRequest, NextApiResponse } from 'next';
import { initDatabase, sql } from '@/lib/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    await initDatabase();
    
    // Дополнительная проверка и исправление колонки priority
    try {
      const columnExists = await sql`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'wishes' AND column_name = 'priority'
      `;

      if (columnExists.length === 0) {
        await sql`ALTER TABLE wishes ADD COLUMN priority INTEGER DEFAULT 1`;
        await sql`CREATE INDEX IF NOT EXISTS idx_wishes_priority ON wishes(priority)`;
        console.log('Priority column added successfully');
      }
    } catch (priorityError) {
      console.error('Priority column fix error:', priorityError);
    }
    
    res.status(200).json({ message: 'Database initialized successfully' });
  } catch (error) {
    console.error('Database initialization error:', error);
    res.status(500).json({ error: 'Failed to initialize database' });
  }
}