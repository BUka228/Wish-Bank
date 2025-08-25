import { NextApiRequest, NextApiResponse } from 'next';
import { enhancementEngine } from '../../../lib/enhancement-engine';
import { getUserFromRequest } from '../../../lib/telegram-auth';
import { MANA_TEXTS } from '../../../types/mana-system';
import { 
  isManaSystemError, 
  getUserErrorMessage, 
  createErrorResponse,
  logManaError,
  EnhancementValidationError,
  InsufficientManaError,
  EnhancementError
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

    const { wishId, type, level, auraType } = req.body;

    // Validate basic parameters
    const wishValidation = manaValidator.validateWish(wishId);
    if (!wishValidation.isValid) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_WISH_ID',
          message: wishValidation.errors.join(', '),
          userMessage: wishValidation.errors.join(', ')
        }
      });
    }

    const typeValidation = manaValidator.validateEnhancementType(type);
    if (!typeValidation.isValid) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_ENHANCEMENT_TYPE',
          message: typeValidation.errors.join(', '),
          userMessage: typeValidation.errors.join(', ')
        }
      });
    }

    // Validate enhancement before applying
    const validation = await enhancementEngine.validateEnhancement(
      wishId, 
      user.id, 
      type, 
      level, 
      auraType
    );

    if (!validation.isValid || !validation.canApply) {
      return res.status(400).json({ 
        success: false,
        error: {
          code: 'ENHANCEMENT_VALIDATION_ERROR',
          message: validation.errors.join(', '),
          userMessage: validation.errors.join(', ')
        },
        data: {
          validation,
          cost: validation.cost,
          currentLevel: validation.currentLevel
        }
      });
    }

    let enhancement;
    let successMessage = '';

    if (type === 'priority') {
      const levelValidation = manaValidator.validatePriorityLevel(level, validation.currentLevel || 0);
      if (!levelValidation.isValid) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_PRIORITY_LEVEL',
            message: levelValidation.errors.join(', '),
            userMessage: levelValidation.errors.join(', ')
          }
        });
      }

      enhancement = await enhancementEngine.applyPriorityEnhancement(wishId, level);
      successMessage = `${MANA_TEXTS.priority} желания повышен до уровня ${level}`;
    } else if (type === 'aura') {
      const auraValidation = manaValidator.validateAuraType(auraType);
      if (!auraValidation.isValid) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_AURA_TYPE',
            message: auraValidation.errors.join(', '),
            userMessage: auraValidation.errors.join(', ')
          }
        });
      }

      enhancement = await enhancementEngine.applyAuraEnhancement(wishId, auraType);
      const auraName = MANA_TEXTS.auraTypes[auraType as keyof typeof MANA_TEXTS.auraTypes] || auraType;
      successMessage = `${MANA_TEXTS.aura} "${auraName}" применена к желанию`;
    }

    // Get updated user balance
    const newBalance = await enhancementEngine.getUserEnhancementStats(user.id);

    return res.status(200).json({
      success: true,
      data: {
        enhancement,
        cost: validation.cost,
        enhancementStats: newBalance
      },
      message: successMessage
    });

  } catch (error) {
    logManaError(error, { 
      operation: 'enhance_wish',
      endpoint: '/api/wishes/enhance',
      wishId: req.body?.wishId,
      type: req.body?.type,
      level: req.body?.level,
      auraType: req.body?.auraType
    });

    // Handle specific enhancement errors with appropriate status codes
    let statusCode = 500;
    if (error instanceof InsufficientManaError) {
      statusCode = 400;
    } else if (error instanceof EnhancementError || error instanceof EnhancementValidationError) {
      statusCode = 400;
    } else if (isManaSystemError(error)) {
      statusCode = 400;
    }

    const errorResponse = createErrorResponse(error, statusCode);
    return res.status(statusCode).json(errorResponse);
  }
}