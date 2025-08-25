#!/usr/bin/env node

/**
 * Environment validation script for Quest Economy System
 * Validates all required and optional environment variables before deployment
 */

const requiredEnvVars = [
  'DATABASE_URL',
  'TELEGRAM_BOT_TOKEN',
  'NEXTAUTH_SECRET',
  'NEXT_PUBLIC_APP_URL'
];

const optionalEnvVars = [
  'REDIS_URL',
  'SENTRY_DSN',
  'LOG_LEVEL',
  'TELEGRAM_WEBHOOK_URL',
  'RATE_LIMIT_MAX_REQUESTS',
  'CACHE_TTL_DEFAULT'
];

const featureFlags = [
  'QUEST_SYSTEM_ENABLED',
  'ECONOMY_SYSTEM_ENABLED',
  'RANK_SYSTEM_ENABLED',
  'RANDOM_EVENTS_ENABLED',
  'FEATURE_SHARED_WISHES',
  'FEATURE_GIFT_SYSTEM',
  'FEATURE_HISTORICAL_WISHES',
  'FEATURE_ADVANCED_ANALYTICS'
];

const performanceVars = [
  'DATABASE_POOL_MIN',
  'DATABASE_POOL_MAX',
  'DATABASE_TIMEOUT',
  'REDIS_TIMEOUT',
  'CACHE_TTL_USER_RANKS',
  'CACHE_TTL_ECONOMY_SETTINGS'
];

const securityVars = [
  'RATE_LIMIT_ENABLED',
  'RATE_LIMIT_WINDOW',
  'CORS_ORIGIN',
  'DATABASE_SSL'
];

/**
 * Validate environment configuration
 */
function validateEnvironment() {
  console.log('🔍 Validating environment configuration...\n');
  
  const missing = [];
  const warnings = [];
  const errors = [];
  
  // Check required variables
  console.log('📋 Checking required environment variables:');
  requiredEnvVars.forEach(varName => {
    if (!process.env[varName]) {
      missing.push(varName);
      console.log(`  ❌ ${varName}: MISSING`);
    } else {
      console.log(`  ✅ ${varName}: SET`);
      
      // Validate specific formats
      const validationError = validateVariableFormat(varName, process.env[varName]);
      if (validationError) {
        errors.push(`${varName}: ${validationError}`);
      }
    }
  });
  
  // Check optional variables
  console.log('\n🔧 Checking optional environment variables:');
  optionalEnvVars.forEach(varName => {
    if (!process.env[varName]) {
      warnings.push(varName);
      console.log(`  ⚠️  ${varName}: NOT SET`);
    } else {
      console.log(`  ✅ ${varName}: SET`);
    }
  });
  
  // Check feature flags
  console.log('\n🚩 Checking feature flags:');
  featureFlags.forEach(varName => {
    const value = process.env[varName];
    if (value === undefined) {
      console.log(`  ⚠️  ${varName}: NOT SET (will use default)`);
    } else if (value === 'true' || value === 'false') {
      console.log(`  ✅ ${varName}: ${value}`);
    } else {
      errors.push(`${varName}: Must be 'true' or 'false', got '${value}'`);
      console.log(`  ❌ ${varName}: INVALID VALUE (${value})`);
    }
  });
  
  // Check performance configuration
  console.log('\n⚡ Checking performance configuration:');
  performanceVars.forEach(varName => {
    const value = process.env[varName];
    if (value === undefined) {
      console.log(`  ⚠️  ${varName}: NOT SET (will use default)`);
    } else {
      const numValue = parseInt(value);
      if (isNaN(numValue) || numValue <= 0) {
        errors.push(`${varName}: Must be a positive integer, got '${value}'`);
        console.log(`  ❌ ${varName}: INVALID VALUE (${value})`);
      } else {
        console.log(`  ✅ ${varName}: ${value}`);
      }
    }
  });
  
  // Check security configuration
  console.log('\n🔒 Checking security configuration:');
  securityVars.forEach(varName => {
    const value = process.env[varName];
    if (value === undefined) {
      console.log(`  ⚠️  ${varName}: NOT SET (will use default)`);
    } else {
      console.log(`  ✅ ${varName}: SET`);
    }
  });
  
  // Environment-specific validations
  validateEnvironmentSpecific(errors, warnings);
  
  // Report results
  console.log('\n📊 Validation Summary:');
  console.log(`  Required variables: ${requiredEnvVars.length - missing.length}/${requiredEnvVars.length} set`);
  console.log(`  Optional variables: ${optionalEnvVars.length - warnings.length}/${optionalEnvVars.length} set`);
  console.log(`  Validation errors: ${errors.length}`);
  console.log(`  Warnings: ${warnings.length}`);
  
  // Handle missing required variables
  if (missing.length > 0) {
    console.error('\n❌ Missing required environment variables:');
    missing.forEach(varName => {
      console.error(`  - ${varName}`);
      console.error(`    ${getVariableDescription(varName)}`);
    });
    process.exit(1);
  }
  
  // Handle validation errors
  if (errors.length > 0) {
    console.error('\n❌ Environment validation errors:');
    errors.forEach(error => console.error(`  - ${error}`));
    process.exit(1);
  }
  
  // Handle warnings
  if (warnings.length > 0) {
    console.warn('\n⚠️  Missing optional environment variables:');
    warnings.forEach(varName => {
      console.warn(`  - ${varName}`);
      console.warn(`    ${getVariableDescription(varName)}`);
    });
  }
  
  console.log('\n✅ Environment validation passed');
  
  // Show configuration summary
  showConfigurationSummary();
}

/**
 * Validate specific variable formats
 */
function validateVariableFormat(varName, value) {
  switch (varName) {
    case 'DATABASE_URL':
      if (!value.startsWith('postgresql://') && !value.startsWith('postgres://')) {
        return 'Must be a valid PostgreSQL connection string';
      }
      break;
      
    case 'NEXT_PUBLIC_APP_URL':
      try {
        new URL(value);
        if (process.env.NODE_ENV === 'production' && !value.startsWith('https://')) {
          return 'Must use HTTPS in production';
        }
      } catch {
        return 'Must be a valid URL';
      }
      break;
      
    case 'TELEGRAM_BOT_TOKEN':
      if (!/^\d+:[A-Za-z0-9_-]+$/.test(value)) {
        return 'Must be a valid Telegram bot token format';
      }
      break;
      
    case 'NEXTAUTH_SECRET':
      if (value.length < 32) {
        return 'Must be at least 32 characters long';
      }
      break;
      
    case 'REDIS_URL':
      if (value && !value.startsWith('redis://') && !value.startsWith('rediss://')) {
        return 'Must be a valid Redis connection string';
      }
      break;
  }
  
  return null;
}

/**
 * Environment-specific validations
 */
function validateEnvironmentSpecific(errors, warnings) {
  const nodeEnv = process.env.NODE_ENV;
  
  if (nodeEnv === 'production') {
    // Production-specific validations
    if (!process.env.SENTRY_DSN) {
      warnings.push('SENTRY_DSN not set - error tracking disabled in production');
    }
    
    if (!process.env.REDIS_URL) {
      warnings.push('REDIS_URL not set - caching will be limited in production');
    }
    
    if (process.env.LOG_LEVEL === 'debug') {
      warnings.push('LOG_LEVEL set to debug in production - consider using info or warn');
    }
    
    // Check HTTPS requirement
    const appUrl = process.env.NEXT_PUBLIC_APP_URL;
    if (appUrl && !appUrl.startsWith('https://')) {
      errors.push('NEXT_PUBLIC_APP_URL must use HTTPS in production');
    }
    
  } else if (nodeEnv === 'development') {
    // Development-specific validations
    if (!process.env.DATABASE_URL?.includes('localhost') && !process.env.DATABASE_URL?.includes('127.0.0.1')) {
      warnings.push('DATABASE_URL does not appear to be local - ensure you are not connecting to production');
    }
  }
}

/**
 * Get description for environment variable
 */
function getVariableDescription(varName) {
  const descriptions = {
    DATABASE_URL: 'PostgreSQL connection string (postgresql://user:pass@host:port/db)',
    TELEGRAM_BOT_TOKEN: 'Telegram bot token from @BotFather',
    NEXTAUTH_SECRET: 'Secret key for NextAuth.js (minimum 32 characters)',
    NEXT_PUBLIC_APP_URL: 'Public URL of your application',
    REDIS_URL: 'Redis connection string for caching (optional but recommended)',
    SENTRY_DSN: 'Sentry DSN for error tracking',
    LOG_LEVEL: 'Logging level (debug, info, warn, error)',
    TELEGRAM_WEBHOOK_URL: 'Webhook URL for Telegram bot',
    RATE_LIMIT_MAX_REQUESTS: 'Maximum requests per window for rate limiting',
    CACHE_TTL_DEFAULT: 'Default cache TTL in seconds'
  };
  
  return descriptions[varName] || 'No description available';
}

/**
 * Show configuration summary
 */
function showConfigurationSummary() {
  console.log('\n📋 Configuration Summary:');
  console.log(`  Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`  App URL: ${process.env.NEXT_PUBLIC_APP_URL || 'not set'}`);
  console.log(`  Database: ${process.env.DATABASE_URL ? 'configured' : 'not configured'}`);
  console.log(`  Redis: ${process.env.REDIS_URL ? 'configured' : 'not configured'}`);
  console.log(`  Error Tracking: ${process.env.SENTRY_DSN ? 'enabled' : 'disabled'}`);
  console.log(`  Log Level: ${process.env.LOG_LEVEL || 'info'}`);
  
  // Feature flags summary
  console.log('\n🚩 Feature Flags:');
  featureFlags.forEach(flag => {
    const value = process.env[flag];
    const status = value === 'true' ? '✅ enabled' : value === 'false' ? '❌ disabled' : '⚠️  default';
    console.log(`  ${flag}: ${status}`);
  });
}

/**
 * Test database connectivity
 */
async function testDatabaseConnection() {
  if (!process.env.DATABASE_URL) {
    console.log('⏭️  Skipping database test (DATABASE_URL not set)');
    return;
  }
  
  console.log('🔌 Testing database connection...');
  
  try {
    const { Pool } = require('pg');
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
    });
    
    const client = await pool.connect();
    await client.query('SELECT 1');
    client.release();
    await pool.end();
    
    console.log('✅ Database connection successful');
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    process.exit(1);
  }
}

/**
 * Test Redis connectivity
 */
async function testRedisConnection() {
  if (!process.env.REDIS_URL) {
    console.log('⏭️  Skipping Redis test (REDIS_URL not set)');
    return;
  }
  
  console.log('🔌 Testing Redis connection...');
  
  try {
    const redis = require('redis');
    const client = redis.createClient({
      url: process.env.REDIS_URL
    });
    
    await client.connect();
    await client.ping();
    await client.disconnect();
    
    console.log('✅ Redis connection successful');
  } catch (error) {
    console.error('❌ Redis connection failed:', error.message);
    // Don't exit for Redis failures as it's optional
  }
}

/**
 * Main execution
 */
async function main() {
  const command = process.argv[2];
  
  try {
    switch (command) {
      case 'validate':
      case undefined:
        validateEnvironment();
        break;
        
      case 'test-connections':
        validateEnvironment();
        await testDatabaseConnection();
        await testRedisConnection();
        break;
        
      case 'summary':
        showConfigurationSummary();
        break;
        
      default:
        console.log('Usage:');
        console.log('  node validate-environment.js [validate|test-connections|summary]');
        process.exit(1);
    }
    
  } catch (error) {
    console.error('💥 Environment validation failed:', error.message);
    process.exit(1);
  }
}

// Execute if run directly
if (require.main === module) {
  main();
}

module.exports = {
  validateEnvironment,
  testDatabaseConnection,
  testRedisConnection
};