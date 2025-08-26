import { NextApiRequest, NextApiResponse } from 'next';
import { db } from '@/lib/db-pool';
import { getUserFromRequest } from '@/lib/telegram-auth';
import { manaEngine } from '@/lib/mana-engine';

interface AdjustManaRequest {
  userId: string;
  amount: number;
  reason: string;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Метод не поддерживается' });
  }

  try {
    // Проверяем авторизацию (в реальном приложении нужна проверка админских прав)
    const adminUser = await getUserFromRequest(req);
    if (!adminUser) {
      return res.status(401).json({ error: 'Не авторизован' });
    }

    // В реальном приложении здесь должна быть проверка админских прав
    // Для демонстрации пропускаем эту проверку

    const { userId, amount, reason }: AdjustManaRequest = req.body;

    // Валидация входных данных
    if (!userId || typeof amount !== 'number' || !reason) {
      return res.status(400).json({ 
        error: 'Некорректные данные запроса' 
      });
    }

    if (amount < 0) {
      return res.status(400).json({ 
        error: 'Значение маны не может быть отрицательным' 
      });
    }

    // Проверяем существование пользователя
    const userCheck = await db.execute`
      SELECT id, username, mana_balance FROM users WHERE id = ${userId}
    `;

    if (userCheck.length === 0) {
      return res.status(404).json({ error: 'Пользователь не найден' });
    }

    const user = userCheck[0];
    const currentBalance = user.mana_balance || 0;
    const newBalance = amount; // Устанавливаем точное значение, а не добавляем
    const adjustment = newBalance - currentBalance; // Вычисляем разность для корректировки

    // Используем ManaEngine для корректировки баланса
    if (adjustment > 0) {
      // Нужно добавить ману
      await manaEngine.addMana(userId, adjustment, `Админ. установка баланса на ${newBalance}: ${reason}`);
    } else if (adjustment < 0) {
      // Нужно списать ману
      const success = await manaEngine.spendMana(userId, Math.abs(adjustment), `Админ. установка баланса на ${newBalance}: ${reason}`);
      if (!success) {
        return res.status(400).json({ 
          error: `Не удалось установить баланс. Текущий баланс: ${currentBalance}, попытка установить: ${newBalance}` 
        });
      }
    }
    // Если adjustment === 0, то баланс уже соответствует желаемому значению

    // Логируем административное действие
    await db.execute`
      INSERT INTO transactions (
        user_id, 
        mana_amount, 
        transaction_type, 
        description,
        metadata
      ) VALUES (
        ${userId},
        ${adjustment},
        'admin_balance_set',
        ${'Административная установка баланса: ' + reason},
        ${JSON.stringify({
          admin_user_id: adminUser.id,
          admin_username: adminUser.username,
          previous_balance: currentBalance,
          new_balance: newBalance,
          target_balance: amount,
          adjustment_amount: adjustment,
          adjustment_reason: reason
        })}
      )
    `;

    // Получаем обновленную информацию о пользователе
    const updatedUser = await db.execute`
      SELECT id, username, mana_balance FROM users WHERE id = ${userId}
    `;

    res.status(200).json({ 
      success: true,
      message: 'Баланс успешно скорректирован',
      user: updatedUser[0],
      adjustment: {
        target_balance: amount,
        adjustment_amount: adjustment,
        reason,
        previous_balance: currentBalance,
        new_balance: newBalance
      }
    });
  } catch (error) {
    console.error('Ошибка корректировки баланса:', error);
    res.status(500).json({ 
      error: 'Ошибка сервера при корректировке баланса' 
    });
  }
}