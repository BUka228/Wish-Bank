#!/usr/bin/env node

// Admin Panel Validation Test
// This script tests all the fixed endpoints to ensure everything is working correctly

const API_BASE = 'http://localhost:3000';
const ADMIN_TELEGRAM_ID = '507387437';

const tests = [
  {
    name: 'Admin Security Validation (GET)',
    method: 'GET',
    url: '/api/admin/security/validate',
    expectStatus: 200,
    expectJson: true
  },
  {
    name: 'Admin Security Validation (HEAD)',
    method: 'HEAD',
    url: '/api/admin/security/validate',
    expectStatus: 200,
    expectJson: false
  },
  {
    name: 'Admin User List',
    method: 'GET',
    url: '/api/admin/users/list',
    expectStatus: 200,
    expectJson: true,
    checkContent: (data) => Array.isArray(data.users) && data.users.every(u => 'mana_balance' in u)
  },
  {
    name: 'Shared Wishes Management',
    method: 'GET',
    url: '/api/admin/shared-wishes/manage',
    expectStatus: 200,
    expectJson: true,
    checkContent: (data) => data.success === true && Array.isArray(data.data.sharedWishes)
  },
  {
    name: 'Admin Audit Logs',
    method: 'GET',
    url: '/api/admin/audit/logs?limit=5',
    expectStatus: 200,
    expectJson: true,
    checkContent: (data) => data.success === true && Array.isArray(data.data)
  }
];

async function runTest(test) {
  console.log(`🧪 Testing: ${test.name}`);
  
  try {
    const options = {
      method: test.method,
      headers: {
        'X-Telegram-ID': ADMIN_TELEGRAM_ID,
        'Content-Type': 'application/json'
      }
    };

    const response = await fetch(`${API_BASE}${test.url}`, options);
    
    // Check status code
    if (response.status !== test.expectStatus) {
      console.log(`   ❌ Expected status ${test.expectStatus}, got ${response.status}`);
      return false;
    }
    
    // Check if we expect JSON response
    if (test.expectJson) {
      const data = await response.json();
      
      // Run custom content validation if provided
      if (test.checkContent && !test.checkContent(data)) {
        console.log(`   ❌ Content validation failed`);
        console.log(`   📄 Response:`, JSON.stringify(data, null, 2).substring(0, 200) + '...');
        return false;
      }
      
      console.log(`   ✅ Status: ${response.status}, JSON response received`);
    } else {
      console.log(`   ✅ Status: ${response.status}, no response body expected`);
    }
    
    return true;
  } catch (error) {
    console.log(`   ❌ Error: ${error.message}`);
    return false;
  }
}

async function runAllTests() {
  console.log('🚀 Starting Admin Panel Validation Tests...\n');
  
  let passed = 0;
  let total = tests.length;
  
  for (const test of tests) {
    const success = await runTest(test);
    if (success) passed++;
    console.log('');
  }
  
  console.log(`📊 Test Results: ${passed}/${total} tests passed`);
  
  if (passed === total) {
    console.log('🎉 All admin panel fixes are working correctly!');
    process.exit(0);
  } else {
    console.log('❌ Some tests failed. Please check the issues above.');
    process.exit(1);
  }
}

// Check if we're in a Node.js environment with fetch available
if (typeof fetch === 'undefined') {
  console.log('❌ This script requires Node.js 18+ with native fetch support');
  console.log('💡 Alternatively, run: npm install node-fetch');
  process.exit(1);
}

runAllTests().catch(console.error);