# Background Services Documentation

## Overview

The background services system provides automated management for the quest economy system, including quest expiration, random event generation, quota resets, and metrics collection.

## Services Included

### 1. Quest Management (Task 7.1)
- **Quest Expiration**: Automatically checks for and expires overdue quests every 5 minutes
- **Quest Reminders**: Sends reminder notifications for upcoming quest deadlines every hour
- **Status Updates**: Automatically updates quest statuses and sends notifications

### 2. Random Event Automation (Task 7.2)
- **Event Generation**: Generates new random events for users every 30 minutes
- **Event Expiration**: Cleans up expired events and generates replacements every 10 minutes
- **Event Reminders**: Sends reminder notifications for events expiring soon every 30 minutes
- **Notification System**: Comprehensive event notification system

### 3. Economy Automation (Task 7.3)
- **Quota Resets**: Automatically resets daily/weekly/monthly quotas every hour
- **Rank Calculations**: Updates user ranks based on experience every 6 hours
- **Metrics Collection**: Collects comprehensive economy metrics every 24 hours

## Usage

### Starting Background Services

#### Automatic Start (Production)
Background services start automatically in production environments.

#### Manual Start (Development)
Set environment variable:
```bash
ENABLE_BACKGROUND_SERVICES=true
```

Or use the API:
```bash
curl -X POST http://localhost:3000/api/background-services \
  -H "Content-Type: application/json" \
  -d '{"action": "start"}'
```

#### Programmatic Start
```typescript
import { backgroundServices } from './src/lib/background-services';
backgroundServices.start();
```

### Stopping Background Services

```bash
curl -X POST http://localhost:3000/api/background-services \
  -H "Content-Type: application/json" \
  -d '{"action": "stop"}'
```

### Checking Service Status

```bash
curl http://localhost:3000/api/background-services
```

Response:
```json
{
  "success": true,
  "data": {
    "isRunning": true,
    "services": [
      "quest-expiration",
      "quest-reminders", 
      "event-generation",
      "event-expiration",
      "event-reminders",
      "quota-reset",
      "rank-calculation",
      "economy-metrics"
    ]
  }
}
```

## Manual Task Execution

### Quest Expiration
```bash
curl -X POST http://localhost:3000/api/background-services/quest-expiration
```

### Event Generation
```bash
curl -X POST http://localhost:3000/api/background-services/event-generation
```

### Economy Tasks
```bash
# Quota reset
curl -X POST http://localhost:3000/api/background-services/economy-automation \
  -H "Content-Type: application/json" \
  -d '{"action": "quota-reset"}'

# Rank calculation
curl -X POST http://localhost:3000/api/background-services/economy-automation \
  -H "Content-Type: application/json" \
  -d '{"action": "rank-calculation"}'

# Metrics collection
curl -X POST http://localhost:3000/api/background-services/economy-automation \
  -H "Content-Type: application/json" \
  -d '{"action": "metrics-collection"}'
```

## Metrics and Monitoring

### Get Current Metrics
```bash
curl http://localhost:3000/api/economy/metrics?type=current
```

### Get Historical Metrics
```bash
curl http://localhost:3000/api/economy/metrics?type=historical&days=30
```

### Generate Metrics Report
```bash
curl http://localhost:3000/api/economy/metrics?type=report
```

### Manual Metrics Collection
```bash
curl -X POST http://localhost:3000/api/economy/metrics
```

## Service Intervals

| Service | Interval | Purpose |
|---------|----------|---------|
| Quest Expiration | 5 minutes | Check for expired quests |
| Quest Reminders | 1 hour | Send quest deadline reminders |
| Event Generation | 30 minutes | Generate new random events |
| Event Expiration | 10 minutes | Clean up expired events |
| Event Reminders | 30 minutes | Send event expiration reminders |
| Quota Reset | 1 hour | Reset user quotas when needed |
| Rank Calculation | 6 hours | Update user ranks |
| Economy Metrics | 24 hours | Collect system metrics |

## Error Handling

All background services include comprehensive error handling:
- Individual task failures don't stop other services
- Errors are logged with detailed information
- Services continue running even if individual executions fail
- Failed operations are retried on the next interval

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `ENABLE_BACKGROUND_SERVICES` | `false` | Enable services in development |
| `NODE_ENV` | - | Services auto-start in production |

## Files Structure

```
src/lib/
├── background-services.ts      # Main background services manager
├── init-background-services.ts # Initialization and shutdown
├── event-notifications.ts     # Event notification system
├── economy-metrics.ts         # Metrics collection system
└── ...

src/pages/api/background-services/
├── index.ts                   # Service control API
├── quest-expiration.ts        # Manual quest expiration
├── event-generation.ts        # Manual event generation
└── economy-automation.ts      # Manual economy tasks

src/pages/api/economy/
└── metrics.ts                 # Metrics API
```

## Integration with Existing Systems

The background services integrate with:
- **Quest Engine**: For quest expiration and reminders
- **Event Generator**: For random event lifecycle
- **Economy Engine**: For quota management and metrics
- **Rank Calculator**: For automatic rank updates
- **Notification System**: For all automated notifications

## Production Deployment

1. Services start automatically in production
2. Use process managers (PM2, Docker) for reliability
3. Monitor service health via the status API
4. Set up alerts for service failures
5. Regular metrics review for system health

## Troubleshooting

### Services Not Starting
- Check environment variables
- Verify database connectivity
- Check logs for initialization errors

### Individual Task Failures
- Check specific task logs
- Verify database functions exist
- Test manual task execution

### High Resource Usage
- Adjust service intervals if needed
- Monitor database query performance
- Consider caching for frequently accessed data

## Future Enhancements

- Database-based job scheduling
- Queue system integration (Redis/Bull)
- Advanced metrics and alerting
- Service health monitoring dashboard
- Configurable service intervals
- Distributed service execution