# Quest Economy System Tests

This directory contains comprehensive tests for the Quest Economy System.

## Test Structure

### Unit Tests (`src/test/`)
- `quest-engine.test.ts` - Tests for QuestEngine business logic
- `event-generator.test.ts` - Tests for EventGenerator functionality  
- `economy-engine.test.ts` - Tests for EconomyEngine operations
- `rank-calculator.test.ts` - Tests for RankCalculator logic

### Integration Tests (`src/test/api/`)
- `quests.integration.test.ts` - Quest API endpoint tests
- `events.integration.test.ts` - Event API endpoint tests
- `economy.integration.test.ts` - Economy API endpoint tests
- `ranks.integration.test.ts` - Rank API endpoint tests
- `wishes.integration.test.ts` - Wish API endpoint tests

### End-to-End Tests (`src/test/e2e/`)
- `quest-workflow.test.ts` - Complete quest creation and completion workflows
- `gift-workflow.test.ts` - Gift giving and quota management workflows
- `rank-progression.test.ts` - Rank progression and privilege unlocking workflows

## Running Tests

```bash
# Run all tests
npm test

# Run unit tests only
npm test -- src/test/*.test.ts

# Run integration tests only
npm test -- src/test/api

# Run end-to-end tests only
npm test -- src/test/e2e

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode
npm run test:watch
```

## Test Coverage

The test suite covers:
- ✅ Business logic validation
- ✅ API endpoint functionality
- ✅ Complete user workflows
- ✅ Error handling and edge cases
- ✅ Permission and authorization checks
- ✅ Data validation and transformation
- ✅ Quota management and resets
- ✅ Rank progression and privileges

## Test Configuration

Tests use:
- **Vitest** as the test runner
- **jsdom** for DOM environment simulation
- **node-mocks-http** for API endpoint testing
- **vi.mock()** for dependency mocking

Test setup is configured in `src/test/setup.ts` with common mocks and utilities.