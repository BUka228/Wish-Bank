import { NextApiRequest, NextApiResponse } from 'next';
import { sql } from '@/lib/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Проверяем, существует ли колонка priority
    const columnExists = await sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'wishes' AND column_name = 'priority'
    `;

    if (columnExists.length === 0) {
      // Добавляем колонку priority
      await sql`ALTER TABLE wishes ADD COLUMN priority INTEGER DEFAULT 1`;
      
      // Создаем индекс для производительности
      await sql`CREATE INDEX IF NOT EXISTS idx_wishes_priority ON wishes(priority)`;
      
      res.status(200).json({ 
        message: 'Priority column added successfully',
        action: 'added_column'
      });
    } else {
      res.status(200).json({ 
        message: 'Priority column already exists',
        action: 'no_action_needed'
      });
    }
  } catch (error) {
    console.error('Fix priority error:', error);
    res.status(500).json({ 
      error: 'Failed to fix priority column',
      details: error.message 
    });
  }
}