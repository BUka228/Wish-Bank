# Data Migration and Seeding Guide

## Overview

This guide covers the data migration and seeding system for the Quest Economy System. The system provides comprehensive tools to migrate existing data and populate the database with rich seed data including Russian quest templates, event pools, military ranks, and economy settings.

## Migration Files

### Core Migration Files

1. **003_data_migration.sql** - Migrates existing wish data to enhanced schema
   - Updates existing wishes with categories and priorities
   - Initializes user ranks and experience points
   - Sets up economy quotas for all users
   - Categorizes existing wishes based on keywords

2. **004_wish_categories_setup.sql** - Sets up comprehensive wish categories
   - 30+ categories with Russian names and emojis
   - Color coding for visual organization
   - Extended categories beyond basic needs

3. **005_quest_event_templates.sql** - Creates template tables and basic templates
   - Quest templates table structure
   - Event templates table structure
   - Basic template examples

4. **006_economy_settings_init.sql** - Initializes economy configuration
   - 40+ economy settings with balanced parameters
   - Helper functions for settings management
   - Anti-abuse and quality control measures

5. **007_rank_system_init.sql** - Sets up Russian military rank system
   - 20 military ranks from Рядовой to Маршал
   - Privilege system with progressive bonuses
   - Helper functions for rank management

6. **008_comprehensive_seed_data.sql** - Rich seed data (auto-generated)
   - 27 quest templates with Russian descriptions
   - 26 random event templates
   - Complete military hierarchy
   - Balanced economy settings

## Scripts

### Migration Runner

```bash
npm run migrate:data
```

**Features:**
- Executes all migration files in correct order
- Tracks migration status to prevent duplicates
- Supports dry-run mode for validation
- Comprehensive error handling and reporting

### Data Validation

```bash
npm run validate:data
```

**Features:**
- Validates all tables and columns exist
- Checks data integrity and completeness
- Provides detailed statistics
- Identifies potential issues

### Seed Data Generator

```bash
node scripts/generate-seed-data.js
```

**Features:**
- Generates comprehensive quest templates
- Creates random event pool
- Sets up military rank system
- Configures economy settings
- Outputs SQL file for migration

## Quest Templates

### Difficulty Levels

#### Easy Quests (10 exp)
- Daily care tasks
- Simple romantic gestures
- Basic household help
- Quick activities (5-15 minutes)

**Examples:**
- Утренний кофе в постель
- Искренний комплимент
- Помыть посуду
- Массаж плеч

#### Medium Quests (25 exp)
- Planned activities
- Cooking projects
- Exercise together
- Time investment (30-60 minutes)

**Examples:**
- Романтический ужин
- Прогулка в парке
- Совместная тренировка
- Генеральная уборка комнаты

#### Hard Quests (50 exp)
- Special occasions
- Learning experiences
- Major projects
- Significant time investment (2+ hours)

**Examples:**
- Сюрприз-свидание
- Мастер-класс для двоих
- Домашний проект
- Активный день на природе

#### Epic Quests (100 exp)
- Major undertakings
- Multi-day projects
- Life-changing experiences
- Substantial commitment

**Examples:**
- Романтический уикенд
- Освоить новое хобби вместе
- Трансформация комнаты
- Спортивный вызов

## Random Events

### Categories

#### Romantic Events
- Spontaneous affection
- Love notes and surprises
- Physical intimacy
- Emotional connection

#### Care Events
- Acts of service
- Thoughtful gestures
- Support and help
- Wellness activities

#### Fun Events
- Entertainment activities
- Playful interactions
- Creative expressions
- Shared experiences

#### Communication Events
- Deep conversations
- Sharing thoughts
- Expressing gratitude
- Active listening

### Duration System
- **1-3 hours**: Quick spontaneous actions
- **4-8 hours**: Planned activities
- **12-24 hours**: Special occasions

## Military Rank System

### Rank Categories

#### Enlisted Ranks (Рядовой состав)
- **Рядовой** (0 exp) - Starting rank
- **Ефрейтор** (100 exp) - Experienced soldier

#### Non-commissioned Officers (Сержантский состав)
- **Младший сержант** (300 exp) - Squad leader
- **Сержант** (600 exp) - Section commander
- **Старший сержант** (1000 exp) - Senior NCO
- **Старшина** (1500 exp) - Master sergeant

#### Warrant Officers (Прапорщики)
- **Прапорщик** (2200 exp) - Technical specialist
- **Старший прапорщик** (3000 exp) - Senior specialist

#### Officers (Офицеры)
- **Младший лейтенант** (4000 exp) - Junior officer
- **Лейтенант** (5500 exp) - Lieutenant
- **Старший лейтенант** (7500 exp) - Senior lieutenant
- **Капитан** (10000 exp) - Captain
- **Майор** (13000 exp) - Major
- **Подполковник** (17000 exp) - Lieutenant colonel
- **Полковник** (22000 exp) - Colonel

#### Generals (Генералы)
- **Генерал-майор** (30000 exp) - Brigadier general
- **Генерал-лейтенант** (40000 exp) - Major general
- **Генерал-полковник** (55000 exp) - Lieutenant general
- **Генерал армии** (75000 exp) - General of the army

#### Marshal (Маршал)
- **Маршал** (100000 exp) - Marshal of the nation

### Privilege System

Each rank unlocks:
- **Quota bonuses**: Additional daily/weekly/monthly gifts
- **Experience bonuses**: Multipliers for earned experience
- **Quest privileges**: Access to higher difficulty quests
- **Special abilities**: Unique features and permissions

## Economy Settings

### Core Parameters

#### Quota System
- **Daily limits**: 5-100 gifts per day (rank dependent)
- **Weekly limits**: 20-250 gifts per week
- **Monthly limits**: 50-500 gifts per month
- **Reset mechanics**: Automatic quota renewal

#### Experience System
- **Quest multipliers**: 10x (easy) to 100x (epic)
- **Event base**: 15 points per event
- **Gift rewards**: 2 points per gift given
- **Completion bonuses**: 3-15 points by wish type

#### Exchange Rates
- **Green to Blue**: 10:1 ratio
- **Blue to Red**: 10:1 ratio
- **Experience bonus**: +1 point per exchange

### Quality Control

#### Content Validation
- **Minimum lengths**: 3-10 characters for descriptions
- **Maximum lengths**: 200-500 characters
- **Spam prevention**: Rate limiting and duplicate detection

#### Anti-abuse Measures
- **Activity thresholds**: Maximum actions per hour
- **Cooldown periods**: Minimum time between actions
- **Suspicious activity**: Automated detection and alerts

## Usage Instructions

### Initial Setup

1. **Run core migrations** (if not already done):
   ```bash
   npm run migrate
   ```

2. **Run data migrations**:
   ```bash
   npm run migrate:data
   ```

3. **Validate migration results**:
   ```bash
   npm run validate:data
   ```

### Customization

#### Adding New Quest Templates

1. Edit `scripts/generate-seed-data.js`
2. Add templates to `generateQuestTemplates()` function
3. Regenerate seed data: `node scripts/generate-seed-data.js`
4. Run migration: `npm run migrate:data`

#### Modifying Economy Settings

1. Update settings in `generateEconomySettings()` function
2. Regenerate and migrate seed data
3. Or update directly in database via admin interface

#### Adding New Categories

1. Add categories to `004_wish_categories_setup.sql`
2. Or insert directly into `wish_categories` table

### Maintenance

#### Regular Tasks
- Monitor quota usage and adjust limits
- Review and update quest templates
- Balance experience rewards
- Clean up expired events and quests

#### Performance Optimization
- Monitor database query performance
- Update indexes as needed
- Archive old completed data
- Optimize frequently accessed queries

## Troubleshooting

### Common Issues

#### Migration Failures
- Check database connection
- Verify environment variables
- Review error logs for specific issues
- Use dry-run mode to validate SQL

#### Data Inconsistencies
- Run validation script to identify issues
- Check foreign key constraints
- Verify data types and formats
- Review migration order

#### Performance Problems
- Monitor slow queries
- Check index usage
- Review table sizes
- Consider data archiving

### Recovery Procedures

#### Rollback Migration
```bash
node scripts/run-data-migrations.js rollback filename.sql
```

#### Reset Seed Data
1. Delete from template tables
2. Regenerate seed data
3. Re-run migrations

#### Data Repair
1. Identify inconsistent data
2. Create repair scripts
3. Test in development environment
4. Apply fixes to production

## Best Practices

### Development
- Always test migrations in development first
- Use dry-run mode to validate SQL
- Keep migration files small and focused
- Document all changes thoroughly

### Production
- Backup database before migrations
- Run migrations during low-traffic periods
- Monitor system performance after changes
- Have rollback procedures ready

### Maintenance
- Regular data validation checks
- Monitor quota usage patterns
- Update templates based on user feedback
- Keep economy settings balanced

## API Integration

The migrated data integrates with existing APIs:

- **Quest API**: Uses quest templates for suggestions
- **Event API**: Draws from event template pool
- **Rank API**: Calculates ranks using migration data
- **Economy API**: Applies settings from economy configuration

## Future Enhancements

### Planned Features
- Seasonal quest templates
- Dynamic difficulty adjustment
- Achievement system integration
- Advanced analytics and reporting

### Extensibility
- Plugin system for custom templates
- API for external template sources
- User-generated content integration
- Machine learning for personalization

---

For technical support or questions about the migration system, refer to the development team or check the project documentation.