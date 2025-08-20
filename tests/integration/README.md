# Integration Tests

This directory contains comprehensive integration tests for the InsightLoop MCP Server v2 user account management system. The tests are organized by category and provide thorough coverage across all system layers.

## Test Structure

```
tests/integration/
├── api/                    # API integration tests (existing)
│   └── user.registration.integration.spec.ts
├── database/              # Database integration tests
│   └── user.database.integration.spec.ts
├── security/              # Security integration tests
│   └── user.security.integration.spec.ts
├── performance/           # Performance integration tests
│   └── user.performance.integration.spec.ts
├── e2e/                   # End-to-end integration tests
│   └── user.e2e.integration.spec.ts
├── error-handling/        # Error handling integration tests
│   └── user.error-handling.integration.spec.ts
├── fixtures/              # Test data and utilities
│   └── user.fixtures.ts
├── jest.integration.config.js  # Integration test configuration
├── README.md              # This file
└── setup.integration.ts   # Integration test setup (existing)
```

## Test Categories

### 1. Database Integration Tests (`database/`)

Tests database interactions, constraints, and data integrity:

- **Race Conditions**: Concurrent operations, deadlock scenarios
- **Transaction Rollbacks**: Nested transactions, failure scenarios
- **Connection Handling**: Pool exhaustion, timeout recovery
- **Data Integrity**: Constraint validation, uniqueness enforcement
- **Performance**: Query optimization, large dataset handling

**Key Features:**
- Real database operations with transaction rollbacks
- Concurrent access testing
- Connection pool management validation
- Performance benchmarking with large datasets

### 2. Security Integration Tests (`security/`)

Comprehensive security testing covering:

- **SQL Injection Prevention**: Various injection patterns
- **Rate Limiting**: IP-based limits, abuse prevention
- **Input Validation**: XSS prevention, data sanitization
- **Authentication Security**: JWT handling, session management
- **Security Headers**: CORS, CSP, security header validation
- **Error Handling**: Information leakage prevention

**Key Features:**
- Real attack pattern simulation
- Security header validation
- Rate limiting enforcement testing
- Input sanitization verification

### 3. Performance Integration Tests (`performance/`)

Load testing and performance validation:

- **Load Testing**: Concurrent request handling
- **Response Times**: Under various load conditions
- **Memory Usage**: Leak detection, resource management
- **Database Performance**: Query optimization under load
- **System Recovery**: Overload and recovery scenarios

**Key Features:**
- Concurrent user simulation (up to 50+ users)
- Memory leak detection
- Performance metrics collection
- Sustained load testing (30+ seconds)
- Database connection pool testing

### 4. End-to-End Integration Tests (`e2e/`)

Complete user journey testing:

- **Registration Flow**: Complete user registration process
- **Data Transformation**: Email normalization, data validation
- **Error Recovery**: System resilience testing
- **Cross-Request State**: Session and state management
- **HTTP Protocol**: Status codes, headers, content types
- **Real-World Patterns**: Typical usage scenarios

**Key Features:**
- Complete user workflows
- Real HTTP protocol testing
- Edge case handling
- International character support
- Business logic validation

### 5. Error Handling Integration Tests (`error-handling/`)

Comprehensive error scenario testing:

- **Network Failures**: Timeouts, connection aborts
- **Database Issues**: Connection failures, constraint violations
- **Input Processing**: Malformed data, encoding issues
- **Rate Limiting**: Abuse prevention, recovery
- **System Recovery**: Resilience and consistency

**Key Features:**
- Network failure simulation
- Malformed input testing
- System recovery validation
- Error message security

## Running Integration Tests

### Prerequisites

1. **Database Setup**: Ensure PostgreSQL is running
2. **Environment Variables**: Configure test environment
3. **Dependencies**: Install all npm dependencies

```bash
# Install dependencies
npm install

# Set up test environment
cp .env.example .env.test

# Configure test database in .env.test
DB_DATABASE=insightloop_test
DB_SYNCHRONIZE=true
LOG_LEVEL=error
```

### Running All Integration Tests

```bash
# Run all integration tests
npm run test:integration

# Run with coverage
npm run test:integration -- --coverage

# Run in watch mode
npm run test:integration -- --watch
```

### Running Specific Test Categories

```bash
# Database integration tests
npm run test:integration -- --testPathPattern=database

# Security integration tests
npm run test:integration -- --testPathPattern=security

# Performance integration tests
npm run test:integration -- --testPathPattern=performance

# End-to-end integration tests
npm run test:integration -- --testPathPattern=e2e

# Error handling integration tests
npm run test:integration -- --testPathPattern=error-handling

# API integration tests (existing)
npm run test:integration -- --testPathPattern=api
```

### Running Individual Test Files

```bash
# Run specific test file
npx jest tests/integration/database/user.database.integration.spec.ts

# Run with verbose output
npx jest tests/integration/performance/user.performance.integration.spec.ts --verbose

# Run specific test suite
npx jest --testNamePattern="Load Testing" tests/integration/performance/
```

## Test Environment Configuration

### Environment Variables

```bash
# Test database configuration
NODE_ENV=test
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=password
DB_DATABASE=insightloop_test
DB_SYNCHRONIZE=true

# Test-specific settings
LOG_LEVEL=error
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=20
JWT_SECRET=test-jwt-secret-key

# Performance test settings
PERFORMANCE_TEST_USERS=100
CONCURRENT_REQUEST_LIMIT=50
LOAD_TEST_DURATION=30000
```

### Database Setup

The integration tests use a separate test database:

```sql
-- Create test database
CREATE DATABASE insightloop_test;

-- Grant permissions
GRANT ALL PRIVILEGES ON DATABASE insightloop_test TO postgres;
```

## Test Fixtures and Utilities

### UserFixtures

Pre-built user objects for testing:

```typescript
import { UserFixtures } from '../fixtures/user.fixtures';

// Basic valid user
const user = UserFixtures.validUser();

// Admin user
const admin = UserFixtures.adminUser({ email: 'admin@test.com' });

// Users with different roles
const users = UserFixtures.usersWithDifferentRoles();

// Performance test users
const perfUsers = UserFixtures.performanceTestUsers(100);
```

### UserTestDataBuilder

Fluent API for building test data:

```typescript
import { UserTestDataBuilder } from '../fixtures/user.fixtures';

// Valid registration data
const validData = UserTestDataBuilder.aUser()
  .withEmail('test@example.com')
  .withName('Test User')
  .build();

// Invalid registration data
const invalidData = UserTestDataBuilder.aUser()
  .withInvalidEmail()
  .withWeakPassword()
  .build();

// Multiple users
const users = UserTestDataBuilder.aUser()
  .buildMultiple(10, 'batch');
```

### Response Validators

Standardized response validation:

```typescript
import { ResponseValidators } from '../fixtures/user.fixtures';

// Validate successful registration
ResponseValidators.validateSuccessfulRegistration(response);

// Validate validation errors
ResponseValidators.validateValidationError(response, ['name', 'email']);

// Validate security headers
ResponseValidators.validateSecurityHeaders(response);
```

### Performance Helpers

Performance measurement utilities:

```typescript
import { PerformanceTestHelpers } from '../fixtures/user.fixtures';

// Measure execution time
const { result, duration } = await PerformanceTestHelpers
  .measureExecutionTime(async () => {
    return await someOperation();
  });

// Measure concurrent operations
const { results, totalDuration, averageDuration } = 
  await PerformanceTestHelpers.measureConcurrentOperations(operations);

// Log performance metrics
PerformanceTestHelpers.logPerformanceMetrics('Test Name', metrics);
```

## Performance Benchmarks

### Expected Performance Metrics

#### Registration Endpoint Performance

| Metric | Target | Notes |
|--------|--------|-------|
| Average Response Time | < 300ms | Under normal load |
| 95th Percentile | < 500ms | 95% of requests |
| Maximum Response Time | < 1000ms | Under peak load |
| Concurrent Users | 20+ | Simultaneous registrations |
| Requests per Second | 50+ | Sustained throughput |
| Error Rate | < 5% | Under sustained load |

#### Database Performance

| Operation | Target | Notes |
|-----------|--------|-------|
| Email Lookup | < 50ms | Indexed query |
| User Creation | < 100ms | Including validation |
| Duplicate Check | < 25ms | Unique constraint |
| Transaction Rollback | < 200ms | Error recovery |

#### Memory Usage

| Metric | Target | Notes |
|--------|--------|-------|
| Memory Growth | < 50% | During sustained load |
| Memory Leaks | 0 | No uncontrolled growth |
| GC Performance | Minimal impact | < 10ms pauses |

## Security Test Coverage

### Attack Vectors Tested

1. **SQL Injection**
   - Classic injection patterns
   - Union-based attacks
   - Boolean-based blind injection
   - Time-based blind injection

2. **Cross-Site Scripting (XSS)**
   - Reflected XSS attempts
   - Stored XSS attempts
   - DOM-based XSS patterns

3. **Input Validation**
   - Buffer overflow attempts
   - Unicode exploitation
   - Control character injection
   - Path traversal attempts

4. **Rate Limiting**
   - Brute force simulation
   - Distributed attack patterns
   - Rate limit bypass attempts

5. **Information Disclosure**
   - Error message analysis
   - Response timing analysis
   - Header information leakage

## Troubleshooting

### Common Issues

#### Database Connection Errors

```bash
# Check if PostgreSQL is running
sudo service postgresql status

# Check test database exists
psql -h localhost -U postgres -l | grep insightloop_test

# Recreate test database
dropdb insightloop_test && createdb insightloop_test
```

#### Rate Limiting Issues

```bash
# Reset rate limits (if using Redis)
redis-cli FLUSHALL

# Or restart the application
npm run dev
```

#### Memory Issues

```bash
# Run with garbage collection exposed
node --expose-gc node_modules/.bin/jest --config tests/integration/jest.integration.config.js

# Monitor memory usage
node --inspect node_modules/.bin/jest --config tests/integration/jest.integration.config.js
```

#### Performance Test Failures

- Check system resources (CPU, memory)
- Reduce concurrent user count
- Increase timeout values
- Verify database performance

### Test Data Cleanup

```bash
# Clean test database
npm run test:integration -- --detectOpenHandles --forceExit

# Manual cleanup
psql -h localhost -U postgres -d insightloop_test -c "TRUNCATE TABLE users CASCADE;"
```

## Best Practices

### Writing Integration Tests

1. **Isolation**: Each test should be independent
2. **Cleanup**: Always clean up test data
3. **Realistic Data**: Use realistic test scenarios
4. **Error Handling**: Test both success and failure paths
5. **Performance**: Include performance assertions
6. **Security**: Test security boundaries

### Test Organization

1. **Descriptive Names**: Use clear test descriptions
2. **Logical Grouping**: Group related tests together
3. **Setup/Teardown**: Use appropriate lifecycle hooks
4. **Documentation**: Document complex test scenarios

### Performance Testing

1. **Baseline**: Establish performance baselines
2. **Monitoring**: Monitor system resources
3. **Gradual Load**: Gradually increase load
4. **Recovery**: Test system recovery

## Contributing

When adding new integration tests:

1. Follow the existing test structure
2. Use the provided fixtures and utilities
3. Include both positive and negative test cases
4. Add performance assertions where applicable
5. Update this documentation

## Continuous Integration

These integration tests are designed to run in CI/CD pipelines:

- Proper database setup and teardown
- Environment variable configuration
- Performance regression detection
- Security vulnerability scanning
- Coverage reporting

For CI configuration examples, see `.github/workflows/` directory.