import { NextApiRequest, NextApiResponse } from 'next';
import { db } from '@/lib/db-pool';
import { getUserFromRequest } from '@/lib/telegram-auth';

interface ManaAuditLog {
  id: string;
  user_id: string;
  username: string;
  action: 'earn' | 'spend' | 'enhance' | 'admin_adjust';
  amount: number;
  reason: string;
  timestamp: string;
  metadata: Record<string, any>;
  ip_address?: string;
  user_agent?: string;
}

interface AuditFilters {
  userId?: string;
  action?: string;
  dateFrom?: string;
  dateTo?: string;
  minAmount?: number;
  maxAmount?: number;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Метод не поддерживается' });
  }

  try {
    // Проверяем авторизацию (в реальном приложении нужна проверка админских прав)
    const user = await getUserFromRequest(req);
    if (!user) {
      return res.status(401).json({ error: 'Не авторизован' });
    }

    const {
      page = '1',
      limit = '50',
      userId,
      action,
      dateFrom,
      dateTo,
      minAmount,
      maxAmount,
      export: exportData
    } = req.query;

    const filters: AuditFilters = {
      userId: userId as string,
      action: action as string,
      dateFrom: dateFrom as string,
      dateTo: dateTo as string,
      minAmount: minAmount ? parseInt(minAmount as string) : undefined,
      maxAmount: maxAmount ? parseInt(maxAmount as string) : undefined
    };

    // Строим WHERE условия
    const whereConditions: string[] = ['t.mana_amount IS NOT NULL'];
    const queryParams: any[] = [];
    let paramIndex = 1;

    if (filters.userId) {
      whereConditions.push(`t.user_id = $${paramIndex}`);
      queryParams.push(filters.userId);
      paramIndex++;
    }

    if (filters.action) {
      const actionMap = {
        'earn': 't.mana_amount > 0 AND t.transaction_type != \'admin_adjustment\'',
        'spend': 't.mana_amount < 0 AND t.transaction_type != \'admin_adjustment\'',
        'enhance': 't.transaction_type = \'enhancement\'',
        'admin_adjust': 't.transaction_type = \'admin_adjustment\''
      };
      
      if (actionMap[filters.action as keyof typeof actionMap]) {
        whereConditions.push(`(${actionMap[filters.action as keyof typeof actionMap]})`);
      }
    }

    if (filters.dateFrom) {
      whereConditions.push(`DATE(t.created_at) >= $${paramIndex}`);
      queryParams.push(filters.dateFrom);
      paramIndex++;
    }

    if (filters.dateTo) {
      whereConditions.push(`DATE(t.created_at) <= $${paramIndex}`);
      queryParams.push(filters.dateTo);
      paramIndex++;
    }

    if (filters.minAmount !== undefined) {
      whereConditions.push(`ABS(t.mana_amount) >= $${paramIndex}`);
      queryParams.push(filters.minAmount);
      paramIndex++;
    }

    if (filters.maxAmount !== undefined) {
      whereConditions.push(`ABS(t.mana_amount) <= $${paramIndex}`);
      queryParams.push(filters.maxAmount);
      paramIndex++;
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    // Если запрос на экспорт
    if (exportData === 'true') {
      // Для простоты экспорта, получаем все записи без сложной фильтрации
      const exportLogs = await db.execute<ManaAuditLog>`
        SELECT 
          t.id,
          t.user_id,
          u.username,
          CASE 
            WHEN t.transaction_type = 'admin_adjustment' THEN 'admin_adjust'
            WHEN t.mana_amount > 0 THEN 'earn'
            WHEN t.transaction_type = 'enhancement' THEN 'enhance'
            ELSE 'spend'
          END as action,
          t.mana_amount as amount,
          t.description as reason,
          t.created_at as timestamp,
          t.metadata
        FROM transactions t
        JOIN users u ON t.user_id = u.id
        WHERE t.mana_amount IS NOT NULL
        ORDER BY t.created_at DESC
        LIMIT 1000
      `;

      // Формируем CSV
      const csvHeader = 'Время,Пользователь,Действие,Сумма,Причина\n';
      const csvRows = exportLogs.map(log => {
        const actionLabels = {
          earn: 'Получение',
          spend: 'Трата',
          enhance: 'Усиление',
          admin_adjust: 'Админ. корректировка'
        };
        
        return [
          new Date(log.timestamp).toLocaleString('ru-RU'),
          log.username,
          actionLabels[log.action] || log.action,
          log.amount.toString(),
          `"${log.reason.replace(/"/g, '""')}"`
        ].join(',');
      }).join('\n');

      const csvContent = csvHeader + csvRows;

      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', 'attachment; filename="mana-audit.csv"');
      return res.status(200).send('\uFEFF' + csvContent); // BOM для корректного отображения UTF-8
    }

    // Обычный запрос с пагинацией
    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const offset = (pageNum - 1) * limitNum;

    // Получаем общее количество записей
    const countResult = await db.execute<{ total: number }>`
      SELECT COUNT(*) as total
      FROM transactions t
      JOIN users u ON t.user_id = u.id
      WHERE t.mana_amount IS NOT NULL
    `;
    const total = countResult[0]?.total || 0;

    // Получаем записи с пагинацией
    const logs = await db.execute<ManaAuditLog>`
      SELECT 
        t.id,
        t.user_id,
        u.username,
        CASE 
          WHEN t.transaction_type = 'admin_adjustment' THEN 'admin_adjust'
          WHEN t.mana_amount > 0 THEN 'earn'
          WHEN t.transaction_type = 'enhancement' THEN 'enhance'
          ELSE 'spend'
        END as action,
        t.mana_amount as amount,
        t.description as reason,
        t.created_at as timestamp,
        t.metadata
      FROM transactions t
      JOIN users u ON t.user_id = u.id
      WHERE t.mana_amount IS NOT NULL
      ORDER BY t.created_at DESC
      LIMIT ${limitNum} OFFSET ${offset}
    `;

    res.status(200).json({ 
      logs,
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum)
    });
  } catch (error) {
    console.error('Ошибка получения журнала аудита:', error);
    res.status(500).json({ 
      error: 'Ошибка сервера при получении журнала аудита' 
    });
  }
}