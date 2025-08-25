#!/usr/bin/env node

/**
 * Data Migration Validation Script for Quest Economy System
 * Validates that all data migrations were executed correctly
 */

const { neon } = require('@neondatabase/serverless');

// Database connection
const sql = neon(process.env.DATABASE_URL || process.env.POSTGRES_URL || '');

/**
 * Validation tests
 */
const VALIDATION_TESTS = [
  {
    name: 'Users table has new columns',
    test: async () => {
      const result = await sql`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'users' 
        AND column_name IN ('rank', 'experience_points', 'daily_quota_used', 'weekly_quota_used', 'monthly_quota_used', 'last_quota_reset')
      `;
      return result.length === 6;
    }
  },
  {
    name: 'Wishes table has new columns',
    test: async () => {
      const result = await sql`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'wishes' 
        AND column_name IN ('category', 'is_shared', 'is_gift', 'is_historical', 'shared_approved_by', 'priority')
      `;
      return result.length === 6;
    }
  },
  {
    name: 'All new tables exist',
    test: async () => {
      const result = await sql`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name IN ('quests', 'random_events', 'wish_categories', 'ranks', 'economy_settings', 'quest_templates', 'event_templates')
      `;
      return result.length === 7;
    }
  },
  {
    name: 'Wish categories are populated',
    test: async () => {
      const result = await sql`SELECT COUNT(*) as count FROM wish_categories`;
      return result[0].count >= 12; // At least 12 basic categories
    }
  },
  {
    name: 'Ranks are populated',
    test: async () => {
      const result = await sql`SELECT COUNT(*) as count FROM ranks`;
      return result[0].count >= 10; // At least 10 ranks
    }
  },
  {
    name: 'Economy settings are populated',
    test: async () => {
      const result = await sql`SELECT COUNT(*) as count FROM economy_settings`;
      return result[0].count >= 20; // At least 20 settings
    }
  },
  {
    name: 'Quest templates are populated',
    test: async () => {
      const result = await sql`SELECT COUNT(*) as count FROM quest_templates`;
      return result[0].count >= 15; // At least 15 templates
    }
  },
  {
    name: 'Event templates are populated',
    test: async () => {
      const result = await sql`SELECT COUNT(*) as count FROM event_templates`;
      return result[0].count >= 15; // At least 15 templates
    }
  },
  {
    name: 'Users have default ranks',
    test: async () => {
      const result = await sql`
        SELECT COUNT(*) as count 
        FROM users 
        WHERE rank IS NULL OR rank = ''
      `;
      return result[0].count === 0;
    }
  },
  {
    name: 'Users have initialized quotas',
    test: async () => {
      const result = await sql`
        SELECT COUNT(*) as count 
        FROM users 
        WHERE daily_quota_used IS NULL 
        OR weekly_quota_used IS NULL 
        OR monthly_quota_used IS NULL 
        OR last_quota_reset IS NULL
      `;
      return result[0].count === 0;
    }
  },
  {
    name: 'Wishes have categories assigned',
    test: async () => {
      const result = await sql`
        SELECT COUNT(*) as count 
        FROM wishes 
        WHERE category IS NULL OR category = ''
      `;
      return result[0].count === 0;
    }
  },
  {
    name: 'Wishes have priorities assigned',
    test: async () => {
      const result = await sql`
        SELECT COUNT(*) as count 
        FROM wishes 
        WHERE priority IS NULL OR priority = 0
      `;
      return result[0].count === 0;
    }
  },
  {
    name: 'Transactions have categories',
    test: async () => {
      const result = await sql`
        SELECT COUNT(*) as count 
        FROM transactions 
        WHERE transaction_category IS NULL
      `;
      return result[0].count === 0;
    }
  },
  {
    name: 'Database functions exist',
    test: async () => {
      const result = await sql`
        SELECT routine_name 
        FROM information_schema.routines 
        WHERE routine_schema = 'public' 
        AND routine_name IN ('get_economy_setting', 'update_economy_setting', 'get_user_rank', 'get_next_rank_info', 'get_rank_privileges', 'user_has_privilege')
      `;
      return result.length === 6;
    }
  },
  {
    name: 'Database view exists',
    test: async () => {
      const result = await sql`
        SELECT table_name 
        FROM information_schema.views 
        WHERE table_schema = 'public' 
        AND table_name = 'user_rank_info'
      `;
      return result.length === 1;
    }
  }
];

/**
 * Run a single validation test
 */
async function runValidationTest(test) {
  try {
    const result = await test.test();
    return {
      name: test.name,
      passed: result,
      error: null
    };
  } catch (error) {
    return {
      name: test.name,
      passed: false,
      error: error.message
    };
  }
}

/**
 * Get detailed database statistics
 */
async function getDatabaseStats() {
  try {
    const stats = {};
    
    // Table counts
    const tables = ['users', 'wishes', 'transactions', 'quests', 'random_events', 'wish_categories', 'ranks', 'economy_settings', 'quest_templates', 'event_templates'];
    
    for (const table of tables) {
      try {
        const result = await sql.unsafe(`SELECT COUNT(*) as count FROM ${table}`);
        stats[table] = result[0].count;
      } catch (error) {
        stats[table] = `Error: ${error.message}`;
      }
    }
    
    // User rank distribution
    try {
      const rankDist = await sql`
        SELECT rank, COUNT(*) as count 
        FROM users 
        GROUP BY rank 
        ORDER BY COUNT(*) DESC
      `;
      stats.rank_distribution = rankDist;
    } catch (error) {
      stats.rank_distribution = `Error: ${error.message}`;
    }
    
    // Wish category distribution
    try {
      const categoryDist = await sql`
        SELECT category, COUNT(*) as count 
        FROM wishes 
        GROUP BY category 
        ORDER BY COUNT(*) DESC
      `;
      stats.category_distribution = categoryDist;
    } catch (error) {
      stats.category_distribution = `Error: ${error.message}`;
    }
    
    return stats;
  } catch (error) {
    return { error: error.message };
  }
}

/**
 * Main validation function
 */
async function validateDataMigrations() {
  console.log('🔍 Validating Quest Economy System Data Migrations');
  console.log('=================================================');

  // Validate environment
  if (!process.env.DATABASE_URL && !process.env.POSTGRES_URL) {
    console.error('❌ DATABASE_URL or POSTGRES_URL environment variable is required');
    process.exit(1);
  }

  // Test database connection
  try {
    await sql`SELECT 1 as test`;
    console.log('✅ Database connection validated');
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    process.exit(1);
  }

  // Run validation tests
  console.log('\n🧪 Running validation tests...\n');
  
  let passedTests = 0;
  let failedTests = 0;
  const results = [];

  for (const test of VALIDATION_TESTS) {
    const result = await runValidationTest(test);
    results.push(result);
    
    if (result.passed) {
      console.log(`✅ ${result.name}`);
      passedTests++;
    } else {
      console.log(`❌ ${result.name}`);
      if (result.error) {
        console.log(`   Error: ${result.error}`);
      }
      failedTests++;
    }
  }

  // Summary
  console.log('\n📊 Validation Summary:');
  console.log('=====================');
  console.log(`✅ Passed: ${passedTests}`);
  console.log(`❌ Failed: ${failedTests}`);
  console.log(`📦 Total: ${VALIDATION_TESTS.length}`);

  // Database statistics
  console.log('\n📈 Database Statistics:');
  console.log('======================');
  
  const stats = await getDatabaseStats();
  
  if (stats.error) {
    console.log(`❌ Error getting stats: ${stats.error}`);
  } else {
    console.log('\nTable Counts:');
    Object.entries(stats).forEach(([key, value]) => {
      if (key !== 'rank_distribution' && key !== 'category_distribution') {
        console.log(`  ${key}: ${value}`);
      }
    });
    
    if (stats.rank_distribution && Array.isArray(stats.rank_distribution)) {
      console.log('\nUser Rank Distribution:');
      stats.rank_distribution.forEach(rank => {
        console.log(`  ${rank.rank}: ${rank.count} users`);
      });
    }
    
    if (stats.category_distribution && Array.isArray(stats.category_distribution)) {
      console.log('\nWish Category Distribution:');
      stats.category_distribution.slice(0, 10).forEach(category => {
        console.log(`  ${category.category}: ${category.count} wishes`);
      });
    }
  }

  // Final result
  if (failedTests > 0) {
    console.log('\n⚠️  Some validation tests failed. Please check the errors above.');
    process.exit(1);
  } else {
    console.log('\n🎉 All validation tests passed! Data migrations are successful.');
    
    console.log('\n🎯 Migration Validation Complete:');
    console.log('- All required tables and columns exist');
    console.log('- Default data has been populated');
    console.log('- User data has been migrated correctly');
    console.log('- Database functions and views are working');
    console.log('- The quest economy system is ready to use!');
  }
}

// Command line interface
if (require.main === module) {
  validateDataMigrations();
}

module.exports = {
  validateDataMigrations,
  getDatabaseStats,
  VALIDATION_TESTS
};