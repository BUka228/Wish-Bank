import { NextApiRequest, NextApiResponse } from 'next';
import { manaEngine } from '../../../lib/mana-engine';
import { getUserFromRequest } from '../../../lib/telegram-auth';
import { 
  isManaSystemError, 
  getUserErrorMessage, 
  createErrorResponse,
  logManaError,
  ManaValidationError,
  InsufficientManaError
} from '../../../lib/mana-errors';
import { manaValidator } from '../../../lib/mana-validation';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ 
      success: false,
      error: {
        code: 'METHOD_NOT_ALLOWED',
        message: 'Method not allowed',
        userMessage: 'Метод не поддерживается'
      }
    });
  }

  try {
    const user = await getUserFromRequest(req);
    if (!user) {
      return res.status(401).json({ 
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Unauthorized',
          userMessage: 'Необходима авторизация'
        }
      });
    }

    const { amount, reason } = req.body;

    // Validate input parameters
    const amountValidation = manaValidator.validateManaAmount(amount);
    if (!amountValidation.isValid) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_AMOUNT',
          message: amountValidation.errors.join(', '),
          userMessage: amountValidation.errors.join(', ')
        }
      });
    }

    if (!reason || typeof reason !== 'string' || reason.trim().length === 0) {
      return res.status(400).json({ 
        success: false,
        error: {
          code: 'INVALID_REASON',
          message: 'Reason is required',
          userMessage: 'Причина операции обязательна'
        }
      });
    }

    // Get current balance for validation
    const currentBalance = await manaEngine.getUserMana(user.id);

    // Validate the operation
    const validation = manaValidator.validateManaOperation(
      user.id, 
      amount, 
      currentBalance, 
      'spend', 
      reason
    );
    
    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: validation.errors.join(', '),
          userMessage: validation.errors.join(', ')
        },
        data: {
          currentBalance: validation.availableMana,
          requiredMana: validation.requiredMana
        }
      });
    }

    if (!validation.canProceed) {
      return res.status(400).json({ 
        success: false,
        error: {
          code: 'INSUFFICIENT_MANA',
          message: 'Insufficient mana',
          userMessage: 'Недостаточно Маны'
        },
        data: {
          currentBalance: validation.availableMana,
          requiredMana: validation.requiredMana,
          deficit: validation.requiredMana - validation.availableMana
        }
      });
    }

    // Attempt to spend mana
    const success = await manaEngine.spendMana(user.id, amount, reason);

    if (!success) {
      return res.status(400).json({ 
        success: false,
        error: {
          code: 'SPEND_FAILED',
          message: 'Failed to spend mana',
          userMessage: 'Не удалось списать Ману'
        },
        data: {
          currentBalance: validation.availableMana
        }
      });
    }

    // Get updated balance
    const newBalance = await manaEngine.getUserMana(user.id);

    return res.status(200).json({
      success: true,
      data: {
        amountSpent: amount,
        newBalance,
        previousBalance: currentBalance,
        reason
      },
      message: `Списано ${amount} Маны. Причина: ${reason}`
    });

  } catch (error) {
    logManaError(error, { 
      operation: 'spend_mana',
      endpoint: '/api/mana/spend',
      amount: req.body?.amount,
      reason: req.body?.reason
    });

    const errorResponse = createErrorResponse(error);
    const statusCode = isManaSystemError(error) ? 400 : 500;
    
    return res.status(statusCode).json(errorResponse);
  }
}