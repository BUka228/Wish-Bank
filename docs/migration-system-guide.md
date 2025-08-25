# User Migration System Guide

## Overview

The User Migration System provides a comprehensive solution for migrating users from the legacy three-currency system (green, blue, red wishes) to the new unified Mana system. This system includes data integrity checks, batch processing, rollback capabilities, and detailed monitoring.

## System Components

### 1. Core Migration Scripts

#### `scripts/user-migration-system.js`
The main migration orchestrator that handles:
- Pre-migration data integrity validation
- Batch processing with progress tracking
- Automatic rollback on critical errors
- Detailed logging and monitoring
- Post-migration validation

#### `scripts/migration-monitor.js`
Real-time monitoring and reporting system that provides:
- Live migration progress tracking
- Detailed migration reports
- Data integrity monitoring
- Export capabilities (JSON, CSV, HTML)

#### `scripts/migration-rollback-system.js`
Comprehensive rollback system featuring:
- Selective user rollbacks
- Batch rollback operations
- Emergency rollback mode
- Transaction log preservation options

### 2. Core Library Components

#### `src/lib/currency-converter.ts`
TypeScript library providing:
- Currency conversion calculations
- Individual user migration
- Batch migration operations
- Data integrity validation
- Migration statistics

## Migration Process

### Phase 1: Pre-Migration Preparation

1. **Data Integrity Check**
   ```bash
   node scripts/user-migration-system.js --validate-only
   ```

2. **Fix Data Issues (if any)**
   ```bash
   node scripts/user-migration-system.js --validate-only --auto-fix
   ```

3. **Dry Run Migration**
   ```bash
   node scripts/user-migration-system.js --dry-run
   ```

### Phase 2: Migration Execution

1. **Start Migration Monitoring**
   ```bash
   # In a separate terminal
   node scripts/migration-monitor.js --watch
   ```

2. **Execute Migration**
   ```bash
   node scripts/user-migration-system.js --batch-size 50
   ```

3. **Monitor Progress**
   The monitoring system will show real-time progress including:
   - Users migrated vs total
   - Total Mana converted
   - Data integrity status
   - Error rates

### Phase 3: Post-Migration Validation

1. **Generate Migration Report**
   ```bash
   node scripts/migration-monitor.js --report --export html
   ```

2. **Validate Data Integrity**
   ```bash
   node scripts/validate-currency-migration.js --post-migration
   ```

## Command Reference

### User Migration System

```bash
node scripts/user-migration-system.js [options]
```

**Options:**
- `--dry-run`: Show what would be migrated without making changes
- `--batch-size <n>`: Number of users to process in each batch (default: 50)
- `--user-id <id>`: Migrate specific user only
- `--rollback`: Rollback migration for all users or specific user
- `--validate-only`: Only run validation checks without migration
- `--auto-fix`: Automatically fix data integrity issues
- `--log-level <level>`: Set logging level (debug, info, warn, error)

### Migration Monitor

```bash
node scripts/migration-monitor.js [options]
```

**Options:**
- `--watch`: Monitor migration progress in real-time
- `--report`: Generate detailed migration report
- `--export <format>`: Export report (json, csv, html)
- `--since <date>`: Show migrations since date (YYYY-MM-DD)

### Migration Rollback System

```bash
node scripts/migration-rollback-system.js [options]
```

**Options:**
- `--user-id <id>`: Rollback specific user
- `--batch-size <n>`: Number of users to rollback in each batch (default: 50)
- `--all`: Rollback all migrated users
- `--since <date>`: Rollback users migrated since date (YYYY-MM-DD)
- `--dry-run`: Show what would be rolled back without making changes
- `--emergency`: Emergency rollback mode (faster, less validation)
- `--preserve-logs`: Keep migration transaction logs during rollback

## Conversion Rates

The system uses the following conversion rates:
- **Green Wishes**: 1 = 10 Mana
- **Blue Wishes**: 1 = 100 Mana
- **Red Wishes**: 1 = 1000 Mana

## Data Integrity Checks

The system performs comprehensive data integrity validation:

### Pre-Migration Checks
- ✅ Negative balance detection
- ✅ Already migrated user detection
- ✅ Orphaned mana detection
- ✅ Large conversion warnings

### Post-Migration Checks
- ✅ Mana balance accuracy verification
- ✅ Migration transaction validation
- ✅ User migration status consistency
- ✅ Data consistency across tables

## Error Handling

### Automatic Error Recovery
- **Transaction Rollback**: All operations are wrapped in database transactions
- **Batch Processing**: Errors in one user don't affect others in the batch
- **Critical Error Detection**: System monitors error rates and triggers rollback if >10%
- **Detailed Logging**: All errors are logged with context for debugging

### Manual Error Recovery
- **Individual User Rollback**: Rollback specific users if issues are detected
- **Batch Rollback**: Rollback groups of users migrated in a specific timeframe
- **Emergency Rollback**: Fast rollback mode for critical situations

## Monitoring and Reporting

### Real-Time Monitoring
The monitoring system provides live updates on:
- Migration progress percentage
- Users processed per minute
- Total Mana converted
- Error rates and types
- Data integrity status

### Detailed Reports
Generated reports include:
- Migration statistics
- User-by-user migration details
- Error summaries
- Data integrity analysis
- Performance metrics

### Export Formats
Reports can be exported in multiple formats:
- **JSON**: Machine-readable format for further processing
- **CSV**: Spreadsheet-compatible format
- **HTML**: Human-readable web format with styling

## Safety Features

### Rollback Capabilities
- **Selective Rollback**: Rollback individual users or groups
- **Time-based Rollback**: Rollback users migrated since a specific date
- **Emergency Rollback**: Fast rollback for critical situations
- **Transaction Preservation**: Option to keep audit trails during rollback

### Data Protection
- **Dry Run Mode**: Test migrations without making changes
- **Batch Processing**: Limit concurrent operations to prevent system overload
- **Transaction Integrity**: All operations are atomic and consistent
- **Audit Trails**: Complete transaction history for all operations

## Performance Considerations

### Batch Processing
- Default batch size: 50 users
- Configurable batch sizes for different system loads
- Automatic delays between batches to prevent database overload

### Database Optimization
- Indexed queries for fast user lookups
- Efficient transaction processing
- Connection pooling for optimal resource usage

### Memory Management
- Streaming processing for large user sets
- Garbage collection optimization
- Resource cleanup after each batch

## Troubleshooting

### Common Issues

#### Migration Stuck or Slow
```bash
# Check system resources
node scripts/migration-monitor.js --report

# Reduce batch size
node scripts/user-migration-system.js --batch-size 10
```

#### Data Integrity Issues
```bash
# Identify issues
node scripts/user-migration-system.js --validate-only

# Auto-fix issues
node scripts/user-migration-system.js --validate-only --auto-fix
```

#### High Error Rates
```bash
# Check error details
node scripts/migration-monitor.js --report

# Emergency rollback if needed
node scripts/migration-rollback-system.js --emergency --all
```

### Log Analysis
Migration logs are stored in:
- `migration-YYYY-MM-DD.log`: Main migration logs
- `rollback-YYYY-MM-DD.log`: Rollback operation logs

Each log entry includes:
- Timestamp
- Log level (DEBUG, INFO, WARN, ERROR)
- Message
- Contextual data (JSON format)

## Testing

### Unit Tests
```bash
npm test src/test/migration-system.test.ts
```

### Integration Tests
```bash
# Test with small dataset
node scripts/user-migration-system.js --user-id test-user-1 --dry-run

# Test batch processing
node scripts/user-migration-system.js --batch-size 5 --dry-run
```

### Load Testing
```bash
# Test with larger batches
node scripts/user-migration-system.js --batch-size 100 --dry-run

# Monitor performance
node scripts/migration-monitor.js --watch
```

## Best Practices

### Before Migration
1. **Backup Database**: Always backup before starting migration
2. **Test Environment**: Run full migration in test environment first
3. **Resource Planning**: Ensure adequate system resources
4. **Monitoring Setup**: Set up monitoring before starting migration

### During Migration
1. **Monitor Progress**: Keep monitoring system running
2. **Check Error Rates**: Watch for unusual error patterns
3. **System Resources**: Monitor CPU, memory, and database performance
4. **Communication**: Keep stakeholders informed of progress

### After Migration
1. **Validate Results**: Run comprehensive post-migration validation
2. **Generate Reports**: Create detailed migration reports
3. **Archive Logs**: Store migration logs for future reference
4. **Update Documentation**: Document any issues or lessons learned

## Security Considerations

### Access Control
- Migration scripts require database admin privileges
- Log files may contain sensitive user data
- Restrict access to migration tools and logs

### Data Privacy
- Migration logs are anonymized where possible
- Personal data is not included in exported reports
- Audit trails maintain data lineage

### Compliance
- All operations are logged for audit purposes
- Data integrity is maintained throughout the process
- Rollback capabilities ensure data can be restored if needed

## Support and Maintenance

### Regular Maintenance
- Monitor migration system performance
- Update conversion rates if needed
- Archive old migration logs
- Review and update documentation

### Emergency Procedures
1. **Stop Migration**: Kill migration process if critical issues arise
2. **Emergency Rollback**: Use emergency rollback mode for fast recovery
3. **Data Recovery**: Restore from backup if necessary
4. **Incident Response**: Document and analyze any critical issues

For additional support or questions about the migration system, refer to the development team or system administrators.