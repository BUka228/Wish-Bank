import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextApiRequest, NextApiResponse } from 'next';
import handler from '../../pages/api/admin/mana/adjust';

// Mock dependencies
vi.mock('../../lib/db-pool', () => ({
  db: {
    execute: vi.fn()
  }
}));

vi.mock('../../lib/telegram-auth', () => ({
  getUserFromRequest: vi.fn()
}));

vi.mock('../../lib/mana-engine', () => ({
  manaEngine: {
    addMana: vi.fn(),
    spendMana: vi.fn()
  }
}));

import { db } from '../../lib/db-pool';
import { getUserFromRequest } from '../../lib/telegram-auth';
import { manaEngine } from '../../lib/mana-engine';

describe('Mana Balance Setting API', () => {
  let mockReq: Partial<NextApiRequest>;
  let mockRes: Partial<NextApiResponse>;

  beforeEach(() => {
    vi.clearAllMocks();
    
    mockReq = {
      method: 'POST',
      body: {}
    };

    mockRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis()
    };

    // Mock admin user
    (getUserFromRequest as any).mockResolvedValue({
      id: 'admin123',
      username: 'admin'
    });
  });

  it('should set balance to exact value (increase from current balance)', async () => {
    const currentBalance = 50;
    const targetBalance = 100;
    const expectedAdjustment = 50; // 100 - 50 = 50 to add

    // Mock user lookup
    (db.execute as any).mockResolvedValueOnce([{
      id: 'user123',
      username: 'testuser',
      mana_balance: currentBalance
    }]);

    // Mock updated user lookup
    (db.execute as any).mockResolvedValueOnce([{
      id: 'user123',
      username: 'testuser',
      mana_balance: targetBalance
    }]);

    // Mock transaction logging
    (db.execute as any).mockResolvedValueOnce([]);

    mockReq.body = {
      userId: 'user123',
      amount: targetBalance,
      reason: 'Test balance setting'
    };

    await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

    // Verify that addMana was called with the correct adjustment amount
    expect(manaEngine.addMana).toHaveBeenCalledWith(
      'user123',
      expectedAdjustment,
      'Админ. установка баланса на 100: Test balance setting'
    );

    expect(mockRes.status).toHaveBeenCalledWith(200);
    expect(mockRes.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        adjustment: expect.objectContaining({
          target_balance: targetBalance,
          adjustment_amount: expectedAdjustment,
          previous_balance: currentBalance,
          new_balance: targetBalance
        })
      })
    );
  });

  it('should set balance to exact value (decrease from current balance)', async () => {
    const currentBalance = 100;
    const targetBalance = 30;
    const expectedAdjustment = -70; // 30 - 100 = -70 to spend

    // Mock user lookup
    (db.execute as any).mockResolvedValueOnce([{
      id: 'user123',
      username: 'testuser',
      mana_balance: currentBalance
    }]);

    // Mock spendMana success
    (manaEngine.spendMana as any).mockResolvedValue(true);

    // Mock updated user lookup
    (db.execute as any).mockResolvedValueOnce([{
      id: 'user123',
      username: 'testuser',
      mana_balance: targetBalance
    }]);

    // Mock transaction logging
    (db.execute as any).mockResolvedValueOnce([]);

    mockReq.body = {
      userId: 'user123',
      amount: targetBalance,
      reason: 'Test balance reduction'
    };

    await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

    // Verify that spendMana was called with the correct amount
    expect(manaEngine.spendMana).toHaveBeenCalledWith(
      'user123',
      Math.abs(expectedAdjustment),
      'Админ. установка баланса на 30: Test balance reduction'
    );

    expect(mockRes.status).toHaveBeenCalledWith(200);
  });

  it('should handle case when target balance equals current balance', async () => {
    const currentBalance = 50;
    const targetBalance = 50;
    const expectedAdjustment = 0;

    // Mock user lookup
    (db.execute as any).mockResolvedValueOnce([{
      id: 'user123',
      username: 'testuser',
      mana_balance: currentBalance
    }]);

    // Mock updated user lookup
    (db.execute as any).mockResolvedValueOnce([{
      id: 'user123',
      username: 'testuser',
      mana_balance: targetBalance
    }]);

    // Mock transaction logging
    (db.execute as any).mockResolvedValueOnce([]);

    mockReq.body = {
      userId: 'user123',
      amount: targetBalance,
      reason: 'Test same balance'
    };

    await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

    // Neither addMana nor spendMana should be called when adjustment is 0
    expect(manaEngine.addMana).not.toHaveBeenCalled();
    expect(manaEngine.spendMana).not.toHaveBeenCalled();

    expect(mockRes.status).toHaveBeenCalledWith(200);
    expect(mockRes.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        adjustment: expect.objectContaining({
          target_balance: targetBalance,
          adjustment_amount: expectedAdjustment,
          previous_balance: currentBalance,
          new_balance: targetBalance
        })
      })
    );
  });

  it('should reject negative balance values', async () => {
    mockReq.body = {
      userId: 'user123',
      amount: -10,
      reason: 'Test negative balance'
    };

    await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

    expect(mockRes.status).toHaveBeenCalledWith(400);
    expect(mockRes.json).toHaveBeenCalledWith({
      error: 'Значение маны не может быть отрицательным'
    });
  });

  it('should handle spendMana failure', async () => {
    const currentBalance = 100;
    const targetBalance = 30;

    // Mock user lookup
    (db.execute as any).mockResolvedValueOnce([{
      id: 'user123',
      username: 'testuser',
      mana_balance: currentBalance
    }]);

    // Mock spendMana failure
    (manaEngine.spendMana as any).mockResolvedValue(false);

    mockReq.body = {
      userId: 'user123',
      amount: targetBalance,
      reason: 'Test spend failure'
    };

    await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

    expect(mockRes.status).toHaveBeenCalledWith(400);
    expect(mockRes.json).toHaveBeenCalledWith({
      error: `Не удалось установить баланс. Текущий баланс: ${currentBalance}, попытка установить: ${targetBalance}`
    });
  });
});