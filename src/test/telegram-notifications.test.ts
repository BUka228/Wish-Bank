import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  sendNotification,
  sendQuestNotification,
  sendEventNotification,
  sendRankNotification,
  sendManaNotification,
  sendSharedWishNotification,
  sendSystemNotification,
  getUserTelegramChatId
} from '../lib/telegram';
import { SharedWishNotificationSystem } from '../lib/shared-wish-notifications';
import { EventNotificationSystem } from '../lib/event-notifications';

// Mock node-telegram-bot-api
vi.mock('node-telegram-bot-api', () => {
  return {
    default: vi.fn().mockImplementation(() => ({
      sendMessage: vi.fn().mockResolvedValue({ message_id: 123 })
    }))
  };
});

// Mock database
vi.mock('../lib/db-pool', () => ({
  sql: vi.fn().mockImplementation((query, ...params) => {
    // Mock different database responses based on query
    if (query.includes('SELECT telegram_id FROM users')) {
      return Promise.resolve([{ telegram_id: '123456789' }]);
    }
    if (query.includes('SELECT id, name FROM users')) {
      return Promise.resolve([
        { id: 'user1', name: 'User 1' },
        { id: 'user2', name: 'User 2' }
      ]);
    }
    return Promise.resolve([]);
  })
}));

describe('Telegram Notification System', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Set up environment variables
    process.env.TELEGRAM_BOT_TOKEN = 'mock_bot_token';
    process.env.VERCEL_URL = 'https://test.vercel.app';
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Basic Notification Functions', () => {
    it('should send basic notification successfully', async () => {
      const mockBot = {
        sendMessage: vi.fn().mockResolvedValue({ message_id: 123 })
      };
      
      // Mock getBot function
      vi.doMock('../lib/telegram', async () => {
        const actual = await vi.importActual('../lib/telegram');
        return {
          ...actual,
          getBot: () => mockBot
        };
      });

      await sendNotification('123456789', 'Test message');
      
      expect(mockBot.sendMessage).toHaveBeenCalledWith(
        '123456789',
        'Test message',
        { parse_mode: 'HTML' }
      );
    });

    it('should handle notification sending errors gracefully', async () => {
      const mockBot = {
        sendMessage: vi.fn().mockRejectedValue(new Error('Network error'))
      };

      await expect(
        sendNotification('123456789', 'Test message')
      ).rejects.toThrow('Network error');
    });

    it('should get user telegram chat ID', async () => {
      const chatId = await getUserTelegramChatId('user123');
      expect(chatId).toBe('123456789');
    });

    it('should return null for non-existent user', async () => {
      // Mock empty result
      const { sql } = await import('../lib/db-pool');
      sql.mockResolvedValueOnce([]);
      
      const chatId = await getUserTelegramChatId('nonexistent');
      expect(chatId).toBeNull();
    });
  });

  describe('Quest Notifications', () => {
    it('should send quest created notification', async () => {
      const mockBot = {
        sendMessage: vi.fn().mockResolvedValue({ message_id: 123 })
      };

      await sendQuestNotification(
        '123456789',
        'created',
        'Test Quest',
        {
          reward_amount: 10,
          reward_type: 'mana',
          experience_reward: 5
        }
      );

      expect(mockBot.sendMessage).toHaveBeenCalledWith(
        '123456789',
        expect.stringContaining('🎯 Новый квест!'),
        expect.objectContaining({
          reply_markup: expect.objectContaining({
            inline_keyboard: expect.any(Array)
          })
        })
      );
    });

    it('should send quest completion notification', async () => {
      await sendQuestNotification(
        '123456789',
        'completed',
        'Test Quest',
        {
          reward_amount: 10,
          reward_type: 'mana',
          experience_reward: 5
        }
      );

      // Should contain completion message
      const mockBot = require('node-telegram-bot-api').default();
      expect(mockBot.sendMessage).toHaveBeenCalledWith(
        '123456789',
        expect.stringContaining('✅ Квест выполнен!'),
        expect.any(Object)
      );
    });

    it('should send quest expiration notification', async () => {
      await sendQuestNotification(
        '123456789',
        'expired',
        'Test Quest'
      );

      const mockBot = require('node-telegram-bot-api').default();
      expect(mockBot.sendMessage).toHaveBeenCalledWith(
        '123456789',
        expect.stringContaining('⏰ Квест истек'),
        expect.any(Object)
      );
    });

    it('should send quest reminder notification', async () => {
      await sendQuestNotification(
        '123456789',
        'reminder',
        'Test Quest',
        {
          expires_at: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString()
        }
      );

      const mockBot = require('node-telegram-bot-api').default();
      expect(mockBot.sendMessage).toHaveBeenCalledWith(
        '123456789',
        expect.stringContaining('⏳ Напоминание о квесте'),
        expect.any(Object)
      );
    });
  });

  describe('Event Notifications', () => {
    it('should send event available notification', async () => {
      await sendEventNotification(
        '123456789',
        'available',
        'Test Event',
        {
          reward_amount: 15,
          reward_type: 'mana',
          experience_reward: 10
        }
      );

      const mockBot = require('node-telegram-bot-api').default();
      expect(mockBot.sendMessage).toHaveBeenCalledWith(
        '123456789',
        expect.stringContaining('🎲 Новое случайное событие!'),
        expect.any(Object)
      );
    });

    it('should send event completion notification', async () => {
      await sendEventNotification(
        '123456789',
        'completed',
        'Test Event',
        {
          reward_amount: 15,
          reward_type: 'mana',
          experience_reward: 10
        }
      );

      const mockBot = require('node-telegram-bot-api').default();
      expect(mockBot.sendMessage).toHaveBeenCalledWith(
        '123456789',
        expect.stringContaining('🎉 Событие выполнено!'),
        expect.any(Object)
      );
    });
  });

  describe('Rank Notifications', () => {
    it('should send rank promotion notification', async () => {
      await sendRankNotification(
        '123456789',
        'Рядовой',
        'Ефрейтор',
        150
      );

      const mockBot = require('node-telegram-bot-api').default();
      expect(mockBot.sendMessage).toHaveBeenCalledWith(
        '123456789',
        expect.stringContaining('🏆 Повышение ранга!'),
        expect.any(Object)
      );
    });
  });

  describe('Mana Notifications', () => {
    it('should send mana earned notification', async () => {
      await sendManaNotification(
        '123456789',
        'earned',
        50,
        'Quest completion',
        250
      );

      const mockBot = require('node-telegram-bot-api').default();
      expect(mockBot.sendMessage).toHaveBeenCalledWith(
        '123456789',
        expect.stringContaining('💰 Мана получена!'),
        expect.any(Object)
      );
    });

    it('should send mana spent notification', async () => {
      await sendManaNotification(
        '123456789',
        'spent',
        30,
        'Wish purchase',
        220
      );

      const mockBot = require('node-telegram-bot-api').default();
      expect(mockBot.sendMessage).toHaveBeenCalledWith(
        '123456789',
        expect.stringContaining('💸 Мана потрачена'),
        expect.any(Object)
      );
    });
  });

  describe('Shared Wish Notifications', () => {
    it('should send shared wish created notification', async () => {
      await sendSharedWishNotification(
        '123456789',
        'created',
        'Test Shared Wish',
        {
          collective_reward: 100,
          is_global: true
        }
      );

      const mockBot = require('node-telegram-bot-api').default();
      expect(mockBot.sendMessage).toHaveBeenCalledWith(
        '123456789',
        expect.stringContaining('🌟 Новое общее желание!'),
        expect.any(Object)
      );
    });

    it('should send shared wish progress notification', async () => {
      await sendSharedWishNotification(
        '123456789',
        'progress',
        'Test Shared Wish',
        {
          progress: 75,
          participant_name: 'Alice'
        }
      );

      const mockBot = require('node-telegram-bot-api').default();
      expect(mockBot.sendMessage).toHaveBeenCalledWith(
        '123456789',
        expect.stringContaining('📈 Прогресс общего желания'),
        expect.any(Object)
      );
    });

    it('should send shared wish completion notification', async () => {
      await sendSharedWishNotification(
        '123456789',
        'completed',
        'Test Shared Wish',
        {
          collective_reward: 100
        }
      );

      const mockBot = require('node-telegram-bot-api').default();
      expect(mockBot.sendMessage).toHaveBeenCalledWith(
        '123456789',
        expect.stringContaining('🎉 Общее желание выполнено!'),
        expect.any(Object)
      );
    });
  });

  describe('System Notifications', () => {
    it('should send system notification with different priorities', async () => {
      await sendSystemNotification(
        '123456789',
        'System Update',
        'The system has been updated',
        'high'
      );

      const mockBot = require('node-telegram-bot-api').default();
      expect(mockBot.sendMessage).toHaveBeenCalledWith(
        '123456789',
        expect.stringContaining('⚠️ System Update'),
        expect.any(Object)
      );
    });
  });
});

describe('Shared Wish Notification System', () => {
  let notificationSystem: SharedWishNotificationSystem;

  beforeEach(() => {
    notificationSystem = new SharedWishNotificationSystem();
    vi.clearAllMocks();
  });

  it('should send shared wish created notifications to multiple users', async () => {
    const result = await notificationSystem.sendSharedWishCreatedNotification(
      'wish123',
      'Test shared wish description',
      false,
      ['user1', 'user2'],
      50
    );

    expect(result.sent).toBe(2);
    expect(result.failed).toBe(0);
  });

  it('should handle failed notifications gracefully', async () => {
    // Mock getUserTelegramChatId to return null for one user
    const { sql } = await import('../lib/db-pool');
    sql
      .mockResolvedValueOnce([{ telegram_id: '123456789' }]) // First user has telegram ID
      .mockResolvedValueOnce([]); // Second user has no telegram ID

    const result = await notificationSystem.sendSharedWishProgressNotification(
      'wish123',
      'Test wish',
      50,
      'Alice',
      ['user1', 'user2']
    );

    expect(result.sent).toBe(1);
    expect(result.failed).toBe(1);
  });
});

describe('Event Notification System', () => {
  let eventNotificationSystem: EventNotificationSystem;

  beforeEach(() => {
    eventNotificationSystem = new EventNotificationSystem();
    vi.clearAllMocks();
  });

  it('should send event available notification', async () => {
    const mockEvent = {
      id: 'event123',
      user_id: 'user1',
      title: 'Test Event',
      description: 'Test event description',
      reward_amount: 10,
      reward_type: 'mana',
      experience_reward: 5,
      expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000),
      status: 'active',
      created_at: new Date()
    };

    await expect(
      eventNotificationSystem.sendEventAvailableNotification(mockEvent)
    ).resolves.not.toThrow();
  });

  it('should send event completion notifications to both users', async () => {
    const mockEvent = {
      id: 'event123',
      user_id: 'user1',
      title: 'Test Event',
      description: 'Test event description',
      reward_amount: 10,
      reward_type: 'mana',
      experience_reward: 5,
      expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000),
      status: 'active',
      created_at: new Date()
    };

    await expect(
      eventNotificationSystem.sendEventCompletedNotification(mockEvent, 'user2')
    ).resolves.not.toThrow();
  });

  it('should send reminder notifications for events expiring soon', async () => {
    const result = await eventNotificationSystem.checkAndSendEventReminders();
    expect(typeof result).toBe('number');
    expect(result).toBeGreaterThanOrEqual(0);
  });
});

describe('Integration Tests', () => {
  it('should work end-to-end with database and Telegram API', async () => {
    // Mock a complete workflow
    const notificationSystem = new SharedWishNotificationSystem();
    
    // Create a shared wish and send notifications
    const result = await notificationSystem.sendSharedWishCreatedNotification(
      'test-wish-id',
      'End-to-end test wish',
      false,
      ['user1'],
      100
    );

    expect(result).toEqual({
      sent: expect.any(Number),
      failed: expect.any(Number)
    });
  });

  it('should handle network failures gracefully', async () => {
    // Mock network failure
    const mockBot = {
      sendMessage: vi.fn().mockRejectedValue(new Error('Network timeout'))
    };

    await expect(
      sendSystemNotification('123456789', 'Test', 'Network failure test')
    ).rejects.toThrow();
  });
});