// Моковые данные для локальной разработки
export const mockUsers = [
  {
    id: '1',
    telegram_id: '123456789',
    name: 'Алиса',
    username: 'alice',
    green_balance: 5,
    blue_balance: 1,
    red_balance: 0,
    created_at: new Date('2024-01-01'),
    updated_at: new Date()
  },
  {
    id: '2', 
    telegram_id: '987654321',
    name: 'Боб',
    username: 'bob',
    green_balance: 3,
    blue_balance: 0,
    red_balance: 1,
    created_at: new Date('2024-01-01'),
    updated_at: new Date()
  }
];

export const mockWishes = [
  {
    id: '1',
    type: 'green' as const,
    description: 'Сделай мне кофе ☕',
    author_id: '1',
    assignee_id: '2',
    status: 'active' as const,
    created_at: new Date('2024-01-15T10:00:00'),
    author_name: 'Алиса',
    assignee_name: 'Боб'
  },
  {
    id: '2',
    type: 'blue' as const,
    description: 'Приготовь ужин по моему выбору 🍝',
    author_id: '2',
    assignee_id: '1',
    status: 'active' as const,
    created_at: new Date('2024-01-14T18:30:00'),
    author_name: 'Боб',
    assignee_name: 'Алиса'
  }
];

export function getMockTelegramUser() {
  return {
    id: '123456789',
    first_name: 'Тестовый',
    last_name: 'Пользователь',
    username: 'testuser'
  };
}