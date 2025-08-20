#!/usr/bin/env node

/**
 * Production Security Validation Test Script
 * 
 * This script simulates production environment validation to ensure
 * all security checks are working correctly.
 */

const originalEnv = { ...process.env };

function resetEnv() {
  // Reset to original environment
  Object.keys(process.env).forEach(key => {
    if (originalEnv[key] !== undefined) {
      process.env[key] = originalEnv[key];
    } else {
      delete process.env[key];
    }
  });
}

function setProductionEnv(overrides = {}) {
  // Set basic production environment
  process.env.NODE_ENV = 'production';
  process.env.PORT = '3000';
  process.env.DB_TYPE = 'postgres';
  process.env.DB_HOST = 'prod-db.example.com';
  process.env.DB_USERNAME = 'produser';
  process.env.DB_PASSWORD = 'secureproductionpassword123';
  process.env.DB_DATABASE = 'proddb';
  process.env.DB_SYNCHRONIZE = 'false';
  process.env.JWT_SECRET = 'a-very-secure-jwt-secret-that-is-definitely-32-characters-or-more';
  process.env.BCRYPT_SALT_ROUNDS = '12';
  process.env.RATE_LIMIT_WINDOW_MS = '900000';
  process.env.RATE_LIMIT_MAX_REQUESTS = '100';
  process.env.LOG_LEVEL = 'info';
  process.env.CORS_ORIGIN = 'https://myapp.com';
  
  // Apply any overrides
  Object.assign(process.env, overrides);
}

async function testValidation(testName, envOverrides, shouldFail = false) {
  console.log(`\n🧪 Testing: ${testName}`);
  
  try {
    resetEnv();
    setProductionEnv(envOverrides);
    
    // Import and create application instance
    delete require.cache[require.resolve('../src/main.ts')];
    const { Application } = require('../src/main.ts');
    
    const app = new Application();
    
    // Only test the validation method, not full initialization
    const validateMethod = app.validateConfiguration || function() {
      throw new Error('validateConfiguration method not found');
    };
    
    await validateMethod.call(app);
    
    if (shouldFail) {
      console.log(`❌ Expected failure but validation passed`);
      return false;
    } else {
      console.log(`✅ Validation passed as expected`);
      return true;
    }
    
  } catch (error) {
    if (shouldFail) {
      console.log(`✅ Expected failure: ${error.message}`);
      return true;
    } else {
      console.log(`❌ Unexpected failure: ${error.message}`);
      return false;
    }
  }
}

async function runSecurityTests() {
  console.log('🔒 Production Security Validation Tests');
  console.log('======================================');
  
  const tests = [
    {
      name: 'Valid production configuration',
      envOverrides: {},
      shouldFail: false
    },
    {
      name: 'Default JWT secret (should fail)',
      envOverrides: { JWT_SECRET: 'your-super-secret-jwt-key-change-in-production' },
      shouldFail: true
    },
    {
      name: 'Short JWT secret (should fail)',
      envOverrides: { JWT_SECRET: 'short' },
      shouldFail: true
    },
    {
      name: 'Weak database password (should fail)',
      envOverrides: { DB_PASSWORD: 'password' },
      shouldFail: true
    },
    {
      name: 'Database sync enabled (should fail)',
      envOverrides: { DB_SYNCHRONIZE: 'true' },
      shouldFail: true
    },
    {
      name: 'Low bcrypt rounds (should fail)',
      envOverrides: { BCRYPT_SALT_ROUNDS: '8' },
      shouldFail: true
    },
    {
      name: 'Wildcard CORS origin (should fail)',
      envOverrides: { CORS_ORIGIN: '*' },
      shouldFail: true
    },
    {
      name: 'Localhost CORS origin (should fail)',
      envOverrides: { CORS_ORIGIN: 'http://localhost:3000' },
      shouldFail: true
    },
    {
      name: 'Missing required production variables (should fail)',
      envOverrides: { JWT_SECRET: undefined },
      shouldFail: true
    }
  ];
  
  let passed = 0;
  let failed = 0;
  
  for (const test of tests) {
    const result = await testValidation(test.name, test.envOverrides, test.shouldFail);
    if (result) {
      passed++;
    } else {
      failed++;
    }
  }
  
  console.log('\n📊 Test Results:');
  console.log('================');
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`📈 Success Rate: ${((passed / (passed + failed)) * 100).toFixed(1)}%`);
  
  // Restore original environment
  resetEnv();
  
  if (failed > 0) {
    console.log('\n⚠️  Some tests failed. Please review the security validation logic.');
    process.exit(1);
  } else {
    console.log('\n🎉 All security validation tests passed!');
  }
}

// Run the tests
runSecurityTests().catch(error => {
  console.error('❌ Test suite failed:', error);
  process.exit(1);
});