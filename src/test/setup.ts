// Test setup file for Vitest
import { vi } from 'vitest';

// Mock environment variables
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
process.env.TELEGRAM_BOT_TOKEN = 'test-token';

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  log: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
};

// Mock Date.now for consistent testing
const mockDate = new Date('2024-01-15T10:00:00Z');
vi.setSystemTime(mockDate);