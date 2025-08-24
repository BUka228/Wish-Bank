# Database Migrations

This directory contains database migration scripts for the Quest Economy System.

## Migration Files

- `001_quest_economy_system.sql` - Main schema migration that adds tables and columns for the quest economy system
- `002_seed_data.sql` - Seed data for ranks, wish categories, and economy settings

## Running Migrations

### Automatic (Recommended)
Migrations are automatically run when the database is initialized via the `/api/init` endpoint or when calling `initDatabase()` function.

### Manual
You can also run migrations manually using the migration runner:

```bash
# Install dependencies first
npm install

# Run all pending migrations
npm run migrate
```

### Production Deployment
For production deployments, you can use the init script:

```bash
npm run init-db
```

## Migration Structure

Each migration file should:
1. Be numbered sequentially (001_, 002_, etc.)
2. Have a descriptive name
3. Use SQL syntax compatible with PostgreSQL
4. Include proper error handling (IF NOT EXISTS, ON CONFLICT, etc.)
5. Be idempotent (safe to run multiple times)

## Adding New Migrations

1. Create a new SQL file with the next sequential number
2. Add your schema changes using proper SQL syntax
3. Test the migration on a development database
4. The migration will be automatically picked up by the migration runner

## Migration Tracking

The system uses a `migrations` table to track which migrations have been executed:

```sql
CREATE TABLE migrations (
  id SERIAL PRIMARY KEY,
  filename VARCHAR(255) NOT NULL UNIQUE,
  executed_at TIMESTAMP DEFAULT NOW()
);
```

## Rollback Strategy

Currently, migrations are forward-only. For rollbacks:
1. Create a new migration that reverses the changes
2. Test thoroughly before applying to production
3. Consider data preservation when dropping columns or tables

## Best Practices

1. **Always use transactions** for complex migrations
2. **Test migrations** on a copy of production data
3. **Backup database** before running migrations in production
4. **Use IF NOT EXISTS** for CREATE statements
5. **Use ON CONFLICT** for INSERT statements with potential duplicates
6. **Add proper indexes** for performance
7. **Document breaking changes** in migration comments