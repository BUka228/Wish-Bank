#!/usr/bin/env node

/**
 * Final Integration Test for Mana Economy System
 * This script tests all key API endpoints and verifies system integration
 */

const http = require('http');
const { URL } = require('url');

// Test configuration
const BASE_URL = 'http://localhost:3000';
const TEST_USER = {
  id: 'test-user-123',
  first_name: 'Test',
  last_name: 'User',
  username: 'testuser'
};

// Test results tracking
let testResults = {
  passed: 0,
  failed: 0,
  tests: []
};

// Helper function to make HTTP requests
function makeRequest(path, method = 'GET', data = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const options = {
      hostname: url.hostname,
      port: url.port || 3000,
      path: url.pathname + url.search,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Integration-Test/1.0'
      }
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          const parsedBody = body ? JSON.parse(body) : {};
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            body: parsedBody
          });
        } catch (e) {
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            body: body
          });
        }
      });
    });

    req.on('error', reject);

    if (data) {
      req.write(JSON.stringify(data));
    }

    req.end();
  });
}

// Test runner
async function runTest(name, testFn) {
  try {
    console.log(`🧪 Running: ${name}`);
    await testFn();
    testResults.passed++;
    testResults.tests.push({ name, status: 'PASSED' });
    console.log(`✅ PASSED: ${name}`);
  } catch (error) {
    testResults.failed++;
    testResults.tests.push({ name, status: 'FAILED', error: error.message });
    console.log(`❌ FAILED: ${name} - ${error.message}`);
  }
}

// Individual test functions
async function testHealthEndpoint() {
  const response = await makeRequest('/api/health');
  if (response.statusCode !== 200) {
    throw new Error(`Expected 200, got ${response.statusCode}`);
  }
}

async function testManaBalanceEndpoint() {
  // This will return 401 without proper auth, which is expected
  const response = await makeRequest('/api/mana/balance');
  if (response.statusCode !== 401) {
    throw new Error(`Expected 401 (unauthorized), got ${response.statusCode}`);
  }
}

async function testManaSpendEndpoint() {
  // This will return 405 for GET method, which is expected
  const response = await makeRequest('/api/mana/spend');
  if (response.statusCode !== 405) {
    throw new Error(`Expected 405 (method not allowed), got ${response.statusCode}`);
  }
}

async function testWishEnhanceEndpoint() {
  // This will return 405 for GET method, which is expected
  const response = await makeRequest('/api/wishes/enhance');
  if (response.statusCode !== 405) {
    throw new Error(`Expected 405 (method not allowed), got ${response.statusCode}`);
  }
}

async function testWishesEndpoint() {
  // This will return 401 without proper auth, which is expected
  const response = await makeRequest('/api/wishes');
  if (response.statusCode !== 401) {
    throw new Error(`Expected 401 (unauthorized), got ${response.statusCode}`);
  }
}

async function testUsersEndpoint() {
  // This will return 401 without proper auth, which is expected
  const response = await makeRequest('/api/users');
  if (response.statusCode !== 401) {
    throw new Error(`Expected 401 (unauthorized), got ${response.statusCode}`);
  }
}

async function testAdminManaUsersEndpoint() {
  // This will return 401 without proper auth, which is expected
  const response = await makeRequest('/api/admin/mana/users');
  if (response.statusCode !== 401) {
    throw new Error(`Expected 401 (unauthorized), got ${response.statusCode}`);
  }
}

async function testManaTransactionsEndpoint() {
  // This will return 401 without proper auth, which is expected
  const response = await makeRequest('/api/mana/transactions');
  if (response.statusCode !== 401) {
    throw new Error(`Expected 401 (unauthorized), got ${response.statusCode}`);
  }
}

// Main test execution
async function runIntegrationTests() {
  console.log('🚀 Starting Mana Economy System Integration Tests\n');
  
  // Test all key API endpoints
  await runTest('Health endpoint responds correctly', testHealthEndpoint);
  await runTest('Mana balance endpoint exists and requires auth', testManaBalanceEndpoint);
  await runTest('Mana spend endpoint exists and requires POST', testManaSpendEndpoint);
  await runTest('Wish enhance endpoint exists and requires POST', testWishEnhanceEndpoint);
  await runTest('Wishes endpoint exists and requires auth', testWishesEndpoint);
  await runTest('Users endpoint exists and requires auth', testUsersEndpoint);
  await runTest('Admin mana users endpoint exists and requires auth', testAdminManaUsersEndpoint);
  await runTest('Mana transactions endpoint exists and requires auth', testManaTransactionsEndpoint);

  // Print results
  console.log('\n📊 Integration Test Results:');
  console.log('═'.repeat(50));
  console.log(`✅ Passed: ${testResults.passed}`);
  console.log(`❌ Failed: ${testResults.failed}`);
  console.log(`📈 Total:  ${testResults.passed + testResults.failed}`);
  
  if (testResults.failed > 0) {
    console.log('\n❌ Failed Tests:');
    testResults.tests
      .filter(t => t.status === 'FAILED')
      .forEach(t => console.log(`   - ${t.name}: ${t.error}`));
  }

  console.log('\n🎯 Integration Status:', testResults.failed === 0 ? '✅ ALL SYSTEMS OPERATIONAL' : '⚠️  SOME ISSUES DETECTED');
  
  return testResults.failed === 0;
}

// Run if called directly
if (require.main === module) {
  runIntegrationTests()
    .then(success => process.exit(success ? 0 : 1))
    .catch(error => {
      console.error('💥 Integration test runner failed:', error);
      process.exit(1);
    });
}

module.exports = { runIntegrationTests };