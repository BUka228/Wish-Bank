import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createMocks } from 'node-mocks-http';
import handler from '../../pages/api/quests/index';
import * as telegramAuth from '../../lib/telegram-auth';
import * as db from '../../lib/db';
import { User, Quest } from '../../types/quest-economy';

// Mock dependencies
vi.mock('../../lib/telegram-auth');
vi.mock('../../lib/db');

describe('/api/quests', () => {
    const mockUser: User = {
        id: 'user-1',
        telegram_id: '123456789',
        name: 'Test User',
        mana: 100,
        mana_spent: 50,
        rank: 'Рядовой',
        experience_points: 50,
        daily_quota_used: 2,
        weekly_quota_used: 8,
        monthly_quota_used: 15,
        last_quota_reset: new Date('2024-01-15T00:00:00Z'),
        created_at: new Date(),
        updated_at: new Date(),
    };

    const mockQuest: Quest = {
        id: 'quest-1',
        title: 'Test Quest',
        description: 'Test quest description',
        author_id: 'user-1',
        assignee_id: 'user-2',
        category: 'general',
        difficulty: 'easy',
        mana_reward: 15,
        experience_reward: 10,
        status: 'active',
        due_date: new Date('2024-01-20T10:00:00Z'),
        created_at: new Date('2024-01-15T10:00:00Z'),
        completed_at: null,
        metadata: {}
    };

    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(telegramAuth.getUserFromRequest).mockResolvedValue(mockUser);
    });

    describe('GET /api/quests', () => {
        it('should return user quests successfully', async () => {
            const { req, res } = createMocks({
                method: 'GET',
                query: { status: 'active' },
            });
            vi.mocked(db.getQuestsByUser).mockResolvedValue([mockQuest]);

            await handler(req, res);

            expect(res._getStatusCode()).toBe(200);
            const data = JSON.parse(res._getData());
            expect(data.quests[0].id).toBe(mockQuest.id);
        });
    });

    describe('POST /api/quests', () => {
        it('should create a quest successfully', async () => {
            const questData = {
                title: 'New Quest',
                description: 'A new quest description',
                assignee_id: 'user-2',
            };
            const { req, res } = createMocks({
                method: 'POST',
                body: questData,
            });

            vi.mocked(db.getQuestsByUser).mockResolvedValue([]); // For validation inside engine
            vi.mocked(db.createQuest).mockResolvedValue({ ...mockQuest, ...questData });

            await handler(req, res);

            expect(res._getStatusCode()).toBe(201);
            const data = JSON.parse(res._getData());
            expect(data.quest.title).toBe('New Quest');
        });

        it('should handle validation errors from the engine', async () => {
            const { req, res } = createMocks({
                method: 'POST',
                body: { title: 'short' }, // Invalid data
            });

            await handler(req, res);

            expect(res._getStatusCode()).toBe(400);
            const data = JSON.parse(res._getData());
            expect(data.message).toContain('Missing required fields');
        });
    });
});
