# Quest Economy System Deployment Guide

## Overview

This guide provides comprehensive instructions for deploying the Quest Economy System to production environments. The system includes database migrations, environment configuration, monitoring setup, and rollback procedures.

## Prerequisites

### System Requirements

- **Node.js**: 18.x or higher
- **PostgreSQL**: 14.x or higher
- **Redis**: 6.x or higher (for caching)
- **Memory**: Minimum 2GB RAM (4GB recommended)
- **Storage**: Minimum 20GB SSD (50GB recommended)
- **Network**: HTTPS support required
- **SSL Certificate**: Valid SSL certificate for domain

### Development Tools

```bash
# Required global packages
npm install -g pm2          # Process manager
npm install -g @vercel/cli  # Vercel CLI (if using Vercel)
npm install -g pnpm         # Package manager (alternative to npm)
```

## Environment Configuration

### Environment Variables

Create production environment files:

**`.env.production`**
```bash
# Database Configuration
DATABASE_URL=postgresql://username:password@host:5432/database_name
DATABASE_POOL_MIN=2
DATABASE_POOL_MAX=20
DATABASE_TIMEOUT=30000
DATABASE_SSL=true

# Redis Configuration (for caching)
REDIS_URL=redis://username:password@host:6379
REDIS_TIMEOUT=5000
REDIS_MAX_RETRIES=3

# Application Configuration
NODE_ENV=production
PORT=3000
NEXT_PUBLIC_APP_URL=https://your-domain.com
NEXTAUTH_URL=https://your-domain.com
NEXTAUTH_SECRET=your-nextauth-secret-here

# Telegram Bot Configuration
TELEGRAM_BOT_TOKEN=your_bot_token_here
TELEGRAM_WEBHOOK_URL=https://your-domain.com/api/telegram/webhook

# Quest Economy System Configuration
QUEST_SYSTEM_ENABLED=true
ECONOMY_SYSTEM_ENABLED=true
RANK_SYSTEM_ENABLED=true
RANDOM_EVENTS_ENABLED=true

# Feature Flags
FEATURE_SHARED_WISHES=true
FEATURE_GIFT_SYSTEM=true
FEATURE_HISTORICAL_WISHES=true
FEATURE_ADVANCED_ANALYTICS=true

# Performance Configuration
CACHE_TTL_DEFAULT=300
CACHE_TTL_USER_RANKS=3600
CACHE_TTL_ECONOMY_SETTINGS=86400
ENABLE_QUERY_OPTIMIZATION=true

# Monitoring and Logging
LOG_LEVEL=info
ENABLE_PERFORMANCE_MONITORING=true
ENABLE_ERROR_TRACKING=true
SENTRY_DSN=your-sentry-dsn-here

# Security Configuration
RATE_LIMIT_ENABLED=true
RATE_LIMIT_WINDOW=60
RATE_LIMIT_MAX_REQUESTS=100
CORS_ORIGIN=https://your-domain.com

# Background Jobs Configuration
ENABLE_BACKGROUND_JOBS=true
QUEST_EXPIRATION_CHECK_INTERVAL=300000
EVENT_GENERATION_INTERVAL=600000
QUOTA_RESET_CHECK_INTERVAL=3600000
RANK_CALCULATION_INTERVAL=1800000``
`

### Environment Validation

Create an environment validation script:

**`scripts/validate-environment.js`**
```javascript
const requiredEnvVars = [
  'DATABASE_URL',
  'TELEGRAM_BOT_TOKEN',
  'NEXTAUTH_SECRET',
  'NEXT_PUBLIC_APP_URL'
];

const optionalEnvVars = [
  'REDIS_URL',
  'SENTRY_DSN',
  'LOG_LEVEL'
];

function validateEnvironment() {
  const missing = [];
  const warnings = [];
  
  // Check required variables
  requiredEnvVars.forEach(varName => {
    if (!process.env[varName]) {
      missing.push(varName);
    }
  });
  
  // Check optional variables
  optionalEnvVars.forEach(varName => {
    if (!process.env[varName]) {
      warnings.push(varName);
    }
  });
  
  if (missing.length > 0) {
    console.error('❌ Missing required environment variables:');
    missing.forEach(varName => console.error(`  - ${varName}`));
    process.exit(1);
  }
  
  if (warnings.length > 0) {
    console.warn('⚠️  Missing optional environment variables:');
    warnings.forEach(varName => console.warn(`  - ${varName}`));
  }
  
  console.log('✅ Environment validation passed');
}

validateEnvironment();
```

## Database Migration Strategy

### Pre-Deployment Database Setup

1. **Create Database Backup**
```bash
# Create full backup before migration
pg_dump -h $DB_HOST -U $DB_USER -d $DB_NAME > backup_$(date +%Y%m%d_%H%M%S).sql

# Verify backup integrity
pg_restore --list backup_$(date +%Y%m%d_%H%M%S).sql
```

2. **Run Migration Validation**
```bash
# Validate all migrations
npm run validate:migrations

# Test migrations on copy of production data
npm run test:migrations:production
```

3. **Execute Migrations**
```bash
# Run migrations with transaction safety
npm run migrate:production

# Verify migration success
npm run validate:schema
```

### Migration Scripts

**`scripts/deploy-migrations.js`**
```javascript
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

class MigrationDeployer {
  constructor(databaseUrl) {
    this.pool = new Pool({
      connectionString: databaseUrl,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
    });
  }
  
  async deployMigrations() {
    const client = await this.pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Get list of migration files
      const migrationDir = path.join(__dirname, 'migrations');
      const migrationFiles = fs.readdirSync(migrationDir)
        .filter(file => file.endsWith('.sql'))
        .sort();
      
      // Check which migrations have been applied
      await this.ensureMigrationTable(client);
      const appliedMigrations = await this.getAppliedMigrations(client);
      
      // Apply new migrations
      for (const file of migrationFiles) {
        if (!appliedMigrations.includes(file)) {
          console.log(`Applying migration: ${file}`);
          await this.applyMigration(client, file);
        }
      }
      
      await client.query('COMMIT');
      console.log('✅ All migrations applied successfully');
      
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('❌ Migration failed:', error);
      throw error;
    } finally {
      client.release();
    }
  }
  
  async ensureMigrationTable(client) {
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        id SERIAL PRIMARY KEY,
        filename VARCHAR(255) NOT NULL UNIQUE,
        applied_at TIMESTAMP DEFAULT NOW()
      )
    `);
  }
  
  async getAppliedMigrations(client) {
    const result = await client.query('SELECT filename FROM schema_migrations');
    return result.rows.map(row => row.filename);
  }
  
  async applyMigration(client, filename) {
    const migrationPath = path.join(__dirname, 'migrations', filename);
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    await client.query(migrationSQL);
    await client.query(
      'INSERT INTO schema_migrations (filename) VALUES ($1)',
      [filename]
    );
  }
}

// Execute if run directly
if (require.main === module) {
  const deployer = new MigrationDeployer(process.env.DATABASE_URL);
  deployer.deployMigrations().catch(console.error);
}

module.exports = MigrationDeployer;
```

## Deployment Procedures

### Vercel Deployment

1. **Configure Vercel Project**
```bash
# Install Vercel CLI
npm install -g @vercel/cli

# Login to Vercel
vercel login

# Link project
vercel link

# Set environment variables
vercel env add DATABASE_URL production
vercel env add TELEGRAM_BOT_TOKEN production
vercel env add NEXTAUTH_SECRET production
# ... add all required environment variables
```

2. **Deploy to Production**
```bash
# Deploy with environment validation
npm run validate:environment
vercel --prod

# Verify deployment
curl -f https://your-domain.com/api/health || exit 1
```

### Traditional Server Deployment

1. **Server Setup**
```bash
# Update system packages
sudo apt update && sudo apt upgrade -y

# Install Node.js 18.x
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PM2 process manager
npm install -g pm2

# Install PostgreSQL client
sudo apt-get install -y postgresql-client

# Install Redis (if not using external service)
sudo apt-get install -y redis-server
```

2. **Application Deployment**
```bash
# Clone repository
git clone https://github.com/your-repo/quest-economy-system.git
cd quest-economy-system

# Install dependencies
npm ci --production

# Build application
npm run build

# Run database migrations
npm run migrate:production

# Start application with PM2
pm2 start ecosystem.config.js --env production

# Save PM2 configuration
pm2 save
pm2 startup
```

3. **PM2 Configuration**

**`ecosystem.config.js`**
```javascript
module.exports = {
  apps: [{
    name: 'quest-economy-system',
    script: 'npm',
    args: 'start',
    cwd: '/path/to/your/app',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'development'
    },
    env_production: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true,
    max_memory_restart: '1G',
    node_args: '--max-old-space-size=1024'
  }]
};
```

### Docker Deployment

1. **Dockerfile**
```dockerfile
FROM node:18-alpine AS base

# Install dependencies only when needed
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci --only=production

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN npm run build

# Production image, copy all the files and run next
FROM base AS runner
WORKDIR /app

ENV NODE_ENV production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT 3000

CMD ["node", "server.js"]
```

2. **Docker Compose**
```yaml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - DATABASE_URL=postgresql://postgres:password@db:5432/quest_economy
      - REDIS_URL=redis://redis:6379
    depends_on:
      - db
      - redis
    restart: unless-stopped

  db:
    image: postgres:14
    environment:
      POSTGRES_DB: quest_economy
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: password
    volumes:
      - postgres_data:/var/lib/postgresql/data
    restart: unless-stopped

  redis:
    image: redis:6-alpine
    restart: unless-stopped

volumes:
  postgres_data:
```

## Feature Flags Implementation

### Feature Flag Configuration

**`src/lib/feature-flags.ts`**
```typescript
export interface FeatureFlags {
  questSystem: boolean;
  economySystem: boolean;
  rankSystem: boolean;
  randomEvents: boolean;
  sharedWishes: boolean;
  giftSystem: boolean;
  historicalWishes: boolean;
  advancedAnalytics: boolean;
}

export const defaultFeatureFlags: FeatureFlags = {
  questSystem: true,
  economySystem: true,
  rankSystem: true,
  randomEvents: true,
  sharedWishes: true,
  giftSystem: true,
  historicalWishes: true,
  advancedAnalytics: false
};

export function getFeatureFlags(): FeatureFlags {
  return {
    questSystem: process.env.QUEST_SYSTEM_ENABLED === 'true',
    economySystem: process.env.ECONOMY_SYSTEM_ENABLED === 'true',
    rankSystem: process.env.RANK_SYSTEM_ENABLED === 'true',
    randomEvents: process.env.RANDOM_EVENTS_ENABLED === 'true',
    sharedWishes: process.env.FEATURE_SHARED_WISHES === 'true',
    giftSystem: process.env.FEATURE_GIFT_SYSTEM === 'true',
    historicalWishes: process.env.FEATURE_HISTORICAL_WISHES === 'true',
    advancedAnalytics: process.env.FEATURE_ADVANCED_ANALYTICS === 'true'
  };
}

export function isFeatureEnabled(feature: keyof FeatureFlags): boolean {
  const flags = getFeatureFlags();
  return flags[feature] ?? defaultFeatureFlags[feature];
}
```

### Gradual Rollout Strategy

**`src/lib/rollout-manager.ts`**
```typescript
interface RolloutConfig {
  feature: string;
  percentage: number;
  userGroups?: string[];
  startDate?: Date;
  endDate?: Date;
}

export class RolloutManager {
  private rolloutConfigs: RolloutConfig[] = [];
  
  constructor() {
    this.loadRolloutConfigs();
  }
  
  private loadRolloutConfigs() {
    // Load from environment or database
    this.rolloutConfigs = [
      {
        feature: 'advancedAnalytics',
        percentage: 10, // Start with 10% of users
        startDate: new Date('2024-02-01'),
        endDate: new Date('2024-02-15')
      },
      {
        feature: 'sharedWishes',
        percentage: 50, // 50% rollout
        userGroups: ['beta_testers'],
        startDate: new Date('2024-01-15')
      }
    ];
  }
  
  isFeatureEnabledForUser(feature: string, userId: string): boolean {
    const config = this.rolloutConfigs.find(c => c.feature === feature);
    if (!config) {
      return isFeatureEnabled(feature as keyof FeatureFlags);
    }
    
    // Check date range
    const now = new Date();
    if (config.startDate && now < config.startDate) return false;
    if (config.endDate && now > config.endDate) return false;
    
    // Check user groups
    if (config.userGroups) {
      // Implementation depends on your user group system
      return this.isUserInGroups(userId, config.userGroups);
    }
    
    // Check percentage rollout
    const userHash = this.hashUserId(userId);
    return (userHash % 100) < config.percentage;
  }
  
  private hashUserId(userId: string): number {
    let hash = 0;
    for (let i = 0; i < userId.length; i++) {
      const char = userId.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }
  
  private isUserInGroups(userId: string, groups: string[]): boolean {
    // Implement based on your user group system
    return false;
  }
}
```

## Monitoring and Health Checks

### Health Check Endpoint

**`src/pages/api/health.ts`**
```typescript
import { NextApiRequest, NextApiResponse } from 'next';
import { db } from '@/lib/db';
import { redis } from '@/lib/cache-manager';

interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  version: string;
  services: {
    database: ServiceStatus;
    redis: ServiceStatus;
    backgroundJobs: ServiceStatus;
  };
  metrics: {
    uptime: number;
    memoryUsage: NodeJS.MemoryUsage;
    activeConnections: number;
  };
}

interface ServiceStatus {
  status: 'up' | 'down' | 'degraded';
  responseTime?: number;
  error?: string;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse<HealthStatus>) {
  const startTime = Date.now();
  
  try {
    // Check database connectivity
    const dbStatus = await checkDatabaseHealth();
    
    // Check Redis connectivity
    const redisStatus = await checkRedisHealth();
    
    // Check background jobs
    const jobsStatus = await checkBackgroundJobsHealth();
    
    // Gather system metrics
    const metrics = {
      uptime: process.uptime(),
      memoryUsage: process.memoryUsage(),
      activeConnections: await getActiveConnectionCount()
    };
    
    // Determine overall status
    const services = { database: dbStatus, redis: redisStatus, backgroundJobs: jobsStatus };
    const overallStatus = determineOverallStatus(services);
    
    const healthStatus: HealthStatus = {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '1.0.0',
      services,
      metrics
    };
    
    const statusCode = overallStatus === 'healthy' ? 200 : overallStatus === 'degraded' ? 200 : 503;
    res.status(statusCode).json(healthStatus);
    
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '1.0.0',
      services: {
        database: { status: 'down', error: error.message },
        redis: { status: 'down' },
        backgroundJobs: { status: 'down' }
      },
      metrics: {
        uptime: process.uptime(),
        memoryUsage: process.memoryUsage(),
        activeConnections: 0
      }
    });
  }
}

async function checkDatabaseHealth(): Promise<ServiceStatus> {
  const startTime = Date.now();
  try {
    await db.query('SELECT 1');
    return {
      status: 'up',
      responseTime: Date.now() - startTime
    };
  } catch (error) {
    return {
      status: 'down',
      error: error.message
    };
  }
}

async function checkRedisHealth(): Promise<ServiceStatus> {
  const startTime = Date.now();
  try {
    await redis.ping();
    return {
      status: 'up',
      responseTime: Date.now() - startTime
    };
  } catch (error) {
    return {
      status: 'down',
      error: error.message
    };
  }
}

async function checkBackgroundJobsHealth(): Promise<ServiceStatus> {
  try {
    // Check if background job processes are running
    const lastJobRun = await getLastBackgroundJobRun();
    const timeSinceLastRun = Date.now() - lastJobRun.getTime();
    
    if (timeSinceLastRun > 10 * 60 * 1000) { // 10 minutes
      return { status: 'degraded', error: 'Background jobs not running recently' };
    }
    
    return { status: 'up' };
  } catch (error) {
    return { status: 'down', error: error.message };
  }
}

function determineOverallStatus(services: Record<string, ServiceStatus>): 'healthy' | 'degraded' | 'unhealthy' {
  const statuses = Object.values(services).map(s => s.status);
  
  if (statuses.every(s => s === 'up')) return 'healthy';
  if (statuses.some(s => s === 'down')) return 'unhealthy';
  return 'degraded';
}
```

### Performance Monitoring

**`src/lib/performance-monitor.ts`**
```typescript
import { performance } from 'perf_hooks';

interface PerformanceMetric {
  name: string;
  duration: number;
  timestamp: Date;
  metadata?: Record<string, any>;
}

export class PerformanceMonitor {
  private metrics: PerformanceMetric[] = [];
  private readonly maxMetrics = 1000;
  
  startTimer(name: string): () => void {
    const startTime = performance.now();
    
    return (metadata?: Record<string, any>) => {
      const duration = performance.now() - startTime;
      this.recordMetric({
        name,
        duration,
        timestamp: new Date(),
        metadata
      });
    };
  }
  
  private recordMetric(metric: PerformanceMetric) {
    this.metrics.push(metric);
    
    // Keep only recent metrics
    if (this.metrics.length > this.maxMetrics) {
      this.metrics = this.metrics.slice(-this.maxMetrics);
    }
    
    // Log slow operations
    if (metric.duration > 1000) { // 1 second
      console.warn(`Slow operation detected: ${metric.name} took ${metric.duration}ms`);
    }
  }
  
  getMetrics(name?: string): PerformanceMetric[] {
    if (name) {
      return this.metrics.filter(m => m.name === name);
    }
    return [...this.metrics];
  }
  
  getAverageTime(name: string): number {
    const nameMetrics = this.getMetrics(name);
    if (nameMetrics.length === 0) return 0;
    
    const total = nameMetrics.reduce((sum, m) => sum + m.duration, 0);
    return total / nameMetrics.length;
  }
  
  getSlowOperations(threshold: number = 1000): PerformanceMetric[] {
    return this.metrics.filter(m => m.duration > threshold);
  }
}

export const performanceMonitor = new PerformanceMonitor();

// Middleware for API route performance monitoring
export function withPerformanceMonitoring(handler: Function) {
  return async (req: any, res: any) => {
    const endTimer = performanceMonitor.startTimer(`API:${req.method}:${req.url}`);
    
    try {
      const result = await handler(req, res);
      endTimer({ status: 'success' });
      return result;
    } catch (error) {
      endTimer({ status: 'error', error: error.message });
      throw error;
    }
  };
}
```

## Rollback Procedures

### Database Rollback

**`scripts/rollback-database.js`**
```javascript
const { Pool } = require('pg');
const fs = require('fs');

class DatabaseRollback {
  constructor(databaseUrl) {
    this.pool = new Pool({ connectionString: databaseUrl });
  }
  
  async rollbackToMigration(targetMigration) {
    const client = await this.pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Get applied migrations after target
      const migrationsToRollback = await this.getMigrationsToRollback(client, targetMigration);
      
      // Rollback migrations in reverse order
      for (const migration of migrationsToRollback.reverse()) {
        console.log(`Rolling back migration: ${migration.filename}`);
        await this.rollbackMigration(client, migration);
      }
      
      await client.query('COMMIT');
      console.log('✅ Database rollback completed successfully');
      
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('❌ Database rollback failed:', error);
      throw error;
    } finally {
      client.release();
    }
  }
  
  async getMigrationsToRollback(client, targetMigration) {
    const result = await client.query(`
      SELECT filename, applied_at 
      FROM schema_migrations 
      WHERE applied_at > (
        SELECT applied_at 
        FROM schema_migrations 
        WHERE filename = $1
      )
      ORDER BY applied_at DESC
    `, [targetMigration]);
    
    return result.rows;
  }
  
  async rollbackMigration(client, migration) {
    // Look for rollback script
    const rollbackFile = migration.filename.replace('.sql', '.rollback.sql');
    const rollbackPath = path.join(__dirname, 'migrations', rollbackFile);
    
    if (fs.existsSync(rollbackPath)) {
      const rollbackSQL = fs.readFileSync(rollbackPath, 'utf8');
      await client.query(rollbackSQL);
    } else {
      console.warn(`No rollback script found for ${migration.filename}`);
    }
    
    // Remove from migrations table
    await client.query(
      'DELETE FROM schema_migrations WHERE filename = $1',
      [migration.filename]
    );
  }
}
```

### Application Rollback

**`scripts/rollback-deployment.sh`**
```bash
#!/bin/bash

# Rollback deployment script
set -e

ROLLBACK_VERSION=$1
BACKUP_DIR="/backups"
APP_DIR="/path/to/your/app"

if [ -z "$ROLLBACK_VERSION" ]; then
  echo "Usage: $0 <version_to_rollback_to>"
  exit 1
fi

echo "🔄 Starting rollback to version $ROLLBACK_VERSION"

# Stop current application
echo "Stopping application..."
pm2 stop quest-economy-system

# Backup current version
echo "Backing up current version..."
cp -r $APP_DIR $BACKUP_DIR/current_$(date +%Y%m%d_%H%M%S)

# Restore previous version
echo "Restoring version $ROLLBACK_VERSION..."
if [ -d "$BACKUP_DIR/version_$ROLLBACK_VERSION" ]; then
  rm -rf $APP_DIR
  cp -r $BACKUP_DIR/version_$ROLLBACK_VERSION $APP_DIR
else
  echo "❌ Version $ROLLBACK_VERSION not found in backups"
  exit 1
fi

# Rollback database if needed
echo "Rolling back database..."
cd $APP_DIR
npm run rollback:database $ROLLBACK_VERSION

# Restart application
echo "Restarting application..."
pm2 start quest-economy-system

# Verify rollback
echo "Verifying rollback..."
sleep 10
curl -f http://localhost:3000/api/health || {
  echo "❌ Health check failed after rollback"
  exit 1
}

echo "✅ Rollback completed successfully"
```

## Security Considerations

### Production Security Checklist

- [ ] **Environment Variables**: All sensitive data in environment variables
- [ ] **Database Security**: SSL connections, restricted access, regular backups
- [ ] **API Security**: Rate limiting, input validation, CORS configuration
- [ ] **Authentication**: Secure session management, token validation
- [ ] **HTTPS**: Valid SSL certificate, HSTS headers
- [ ] **Monitoring**: Error tracking, performance monitoring, security alerts
- [ ] **Updates**: Regular dependency updates, security patches
- [ ] **Access Control**: Principle of least privilege, audit logs

### Security Headers Configuration

**`next.config.js`**
```javascript
const securityHeaders = [
  {
    key: 'X-DNS-Prefetch-Control',
    value: 'on'
  },
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload'
  },
  {
    key: 'X-XSS-Protection',
    value: '1; mode=block'
  },
  {
    key: 'X-Frame-Options',
    value: 'DENY'
  },
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff'
  },
  {
    key: 'Referrer-Policy',
    value: 'origin-when-cross-origin'
  }
];

module.exports = {
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: securityHeaders,
      },
    ];
  },
};
```

This comprehensive deployment guide provides all necessary procedures for safely deploying the Quest Economy System to production environments with proper monitoring, rollback capabilities, and security measures.