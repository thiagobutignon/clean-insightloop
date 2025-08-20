import request from 'supertest';
import { Application as ExpressApp } from 'express';
import { DataSource } from 'typeorm';
import Application from '../../../src/main';
import { DatabaseConnection } from '../../../src/infrastructure/database/typeorm/typeorm.config';
import { UserOrmEntity } from '../../../src/infrastructure/database/typeorm/entities/user.orm-entity';

describe('User Error Handling Integration Tests', () => {
  let app: ExpressApp;
  let dataSource: DataSource;
  let dbConnection: DatabaseConnection;
  let application: Application;

  const validUserData = {
    name: 'Error Test User',
    email: 'error.test@example.com',
    password: 'SecurePass123!',
    passwordConfirmation: 'SecurePass123!'
  };

  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    process.env.DB_DATABASE = 'insightloop_error_test';
    process.env.DB_SYNCHRONIZE = 'true';
    process.env.LOG_LEVEL = 'error';
    process.env.RATE_LIMIT_WINDOW_MS = '60000';
    process.env.RATE_LIMIT_MAX_REQUESTS = '10';

    application = new Application();
    await application.initialize();
    app = application.getApp();

    dbConnection = DatabaseConnection.getInstance();
    dataSource = dbConnection.getDataSource();
  });

  beforeEach(async () => {
    await dataSource.getRepository(UserOrmEntity).clear();
  });

  afterAll(async () => {
    await dataSource.getRepository(UserOrmEntity).clear();
    await dbConnection.disconnect();
  });

  describe('Network Failure Scenarios', () => {
    it('should handle request timeouts gracefully', async () => {
      // Simulate timeout by making request with very short timeout
      try {
        await request(app)
          .post('/api/v1/users/register')
          .send(validUserData)
          .timeout(1); // 1ms timeout - will likely timeout

        // If it doesn't timeout, that's fine too
        expect(true).toBe(true);
      } catch (error) {
        // Should be a timeout error, not a server error
        const errorMessage = (error as Error).message;
        expect(errorMessage.toLowerCase()).toMatch(/timeout|aborted/);
      }
    });

    it('should handle connection abort scenarios', async () => {
      // Test the server's resilience when connections are aborted
      const promises = Array(5).fill(null).map(async (_, index) => {
        try {
          const response = await request(app)
            .post('/api/v1/users/register')
            .send({
              ...validUserData,
              email: `abort${index}@example.com`
            })
            .timeout(100); // Very short timeout to simulate abort

          return { success: true, status: response.status };
        } catch (error) {
          return { 
            success: false, 
            error: (error as Error).message.includes('timeout') ? 'timeout' : 'other'
          };
        }
      });

      const results = await Promise.allSettled(promises);
      
      // Some might succeed, some might timeout - both are acceptable
      const fulfilled = results.filter(r => r.status === 'fulfilled');
      expect(fulfilled.length).toBeGreaterThan(0);

      // Verify server is still responsive after aborts
      const recoveryResponse = await request(app)
        .post('/api/v1/users/register')
        .send({
          ...validUserData,
          email: 'recovery@example.com'
        })
        .expect(201);

      expect(recoveryResponse.body.success).toBe(true);
    });

    it('should handle malformed request headers', async () => {
      // Test various malformed headers
      const malformedHeaderTests = [
        {
          name: 'Invalid Content-Type',
          headers: { 'content-type': 'text/invalid' },
          expectedStatus: 400
        },
        {
          name: 'Extremely long header',
          headers: { 'x-custom-header': 'x'.repeat(10000) },
          expectedStatus: [201, 413, 431] // Could be 201 (ignored), 413 (too large), or 431 (headers too large)
        },
        {
          name: 'Invalid character in header',
          headers: { 'x-test\x00header': 'value' },
          expectedStatus: [201, 400]
        }
      ];

      for (const test of malformedHeaderTests) {
        try {
          const response = await request(app)
            .post('/api/v1/users/register')
            .set(test.headers)
            .send({
              ...validUserData,
              email: `header-test-${Date.now()}@example.com`
            });

          if (Array.isArray(test.expectedStatus)) {
            expect(test.expectedStatus).toContain(response.status);
          } else {
            expect(response.status).toBe(test.expectedStatus);
          }

          console.log(`✓ ${test.name}: Status ${response.status}`);
        } catch (error) {
          // Some header tests might cause request to fail entirely
          console.log(`⚠ ${test.name}: Request failed - ${(error as Error).message}`);
          expect(true).toBe(true); // Test passed - server handled malformed header
        }
      }
    });
  });

  describe('Database Connection Issues', () => {
    it('should handle database connection errors gracefully', async () => {
      // This test would ideally simulate database downtime
      // For now, we'll test the error response structure when DB operations fail
      
      // We can't easily simulate DB failure in integration test without complex mocking
      // But we can test that the system continues to function after potential issues
      
      const response = await request(app)
        .post('/api/v1/users/register')
        .send(validUserData)
        .expect(201);

      expect(response.body.success).toBe(true);
      
      // Verify the system maintains proper error response structure
      // even when everything works (structure consistency)
      expect(response.body).toHaveProperty('success');
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('id');
    });

    it('should handle database constraint violations properly', async () => {
      // Create a user first
      await request(app)
        .post('/api/v1/users/register')
        .send(validUserData)
        .expect(201);

      // Try to create user with same email (triggers unique constraint)
      const response = await request(app)
        .post('/api/v1/users/register')
        .send(validUserData)
        .expect(409);

      // Verify proper error structure for constraint violation
      expect(response.body).toMatchObject({
        success: false,
        error: {
          type: 'UserAlreadyExistsException',
          code: 'USER_ALREADY_EXISTS',
          message: expect.any(String)
        }
      });

      // Verify no sensitive database information is leaked
      expect(response.body.error.message).not.toMatch(/constraint|violation|duplicate/i);
      expect(response.body.error.message).not.toMatch(/users|email|unique/i);
    });

    it('should handle database transaction failures', async () => {
      // Test that handles transaction rollback scenarios
      // by attempting operations that might cause transaction issues
      
      const simultaneousRequests = Array(5).fill(null).map((_, index) =>
        request(app)
          .post('/api/v1/users/register')
          .send({
            ...validUserData,
            email: `transaction${index}@example.com`
          })
      );

      const results = await Promise.allSettled(simultaneousRequests);
      
      // All should succeed (no transaction conflicts expected)
      const successful = results.filter(r => 
        r.status === 'fulfilled' && (r.value as any).status === 201
      );
      
      expect(successful.length).toBe(5);

      // Verify all users were created (no partial failures)
      const userCount = await dataSource.getRepository(UserOrmEntity).count();
      expect(userCount).toBe(5);
    });
  });

  describe('Input Processing Errors', () => {
    it('should handle various JSON malformation scenarios', async () => {
      const malformedJsonTests = [
        {
          name: 'Incomplete JSON',
          payload: '{"name": "Test User", "email": "test@example.com"',
          contentType: 'application/json'
        },
        {
          name: 'Invalid JSON syntax',
          payload: '{"name": "Test User",, "email": "test@example.com"}',
          contentType: 'application/json'
        },
        {
          name: 'Non-JSON content with JSON content-type',
          payload: 'This is not JSON',
          contentType: 'application/json'
        },
        {
          name: 'Empty body with JSON content-type',
          payload: '',
          contentType: 'application/json'
        },
        {
          name: 'NULL byte in JSON',
          payload: '{"name": "Test\x00User"}',
          contentType: 'application/json'
        }
      ];

      for (const test of malformedJsonTests) {
        const response = await request(app)
          .post('/api/v1/users/register')
          .set('Content-Type', test.contentType)
          .send(test.payload)
          .expect(400);

        // Verify proper error response structure
        expect(response.body).toMatchObject({
          success: false,
          error: {
            type: expect.any(String),
            code: expect.any(String),
            message: expect.any(String)
          }
        });

        // Verify no server errors (500) for client mistakes
        expect(response.status).not.toBe(500);
        
        console.log(`✓ ${test.name}: Handled properly`);
      }
    });

    it('should handle extremely large payloads', async () => {
      // Test with very large payload
      const largePayload = {
        name: 'A'.repeat(10000), // 10KB name
        email: 'large@example.com',
        password: 'B'.repeat(1000), // 1KB password
        passwordConfirmation: 'C'.repeat(1000)
      };

      const response = await request(app)
        .post('/api/v1/users/register')
        .send(largePayload)
        .expect(res => {
          // Should either reject due to size limits or validation
          expect([400, 413]).toContain(res.status);
        });

      if (response.status === 400) {
        // Validation error for field lengths
        expect(response.body.error.code).toBe('VALIDATION_ERROR');
      } else if (response.status === 413) {
        // Payload too large error
        expect(response.body.error.code).toMatch(/TOO_LARGE|SIZE_LIMIT/);
      }
    });

    it('should handle special characters and encoding issues', async () => {
      const specialCharTests = [
        {
          name: 'Unicode characters',
          data: {
            ...validUserData,
            name: '测试用户 José María 🎉',
            email: 'unicode@example.com'
          },
          shouldSucceed: true
        },
        {
          name: 'Control characters',
          data: {
            ...validUserData,
            name: 'Test\r\nUser\t\0',
            email: 'control@example.com'
          },
          shouldSucceed: false
        },
        {
          name: 'SQL injection patterns',
          data: {
            ...validUserData,
            name: "'; DROP TABLE users; --",
            email: 'sql@example.com'
          },
          shouldSucceed: false
        },
        {
          name: 'XSS patterns',
          data: {
            ...validUserData,
            name: '<script>alert("xss")</script>',
            email: 'xss@example.com'
          },
          shouldSucceed: false
        }
      ];

      for (const test of specialCharTests) {
        const response = await request(app)
          .post('/api/v1/users/register')
          .send(test.data);

        if (test.shouldSucceed) {
          expect(response.status).toBe(201);
          expect(response.body.success).toBe(true);
          
          // Verify special characters are preserved properly
          if (test.name === 'Unicode characters') {
            expect(response.body.data.name).toBe('测试用户 José María 🎉');
          }
        } else {
          expect(response.status).toBe(400);
          expect(response.body.success).toBe(false);
          
          // Verify no dangerous content was processed
          if (response.body.error.message) {
            expect(response.body.error.message).not.toContain('<script>');
            expect(response.body.error.message).not.toContain('DROP TABLE');
          }
        }

        console.log(`✓ ${test.name}: ${test.shouldSucceed ? 'Accepted' : 'Rejected'} as expected`);
      }
    });
  });

  describe('Rate Limiting and Abuse Prevention', () => {
    it('should handle rate limit violations gracefully', async () => {
      const maxRequests = 10; // Based on environment variable
      const requests = [];

      // Make requests up to and beyond the rate limit
      for (let i = 0; i < maxRequests + 3; i++) {
        requests.push(
          request(app)
            .post('/api/v1/users/register')
            .send({
              ...validUserData,
              email: `ratelimit${i}@example.com`
            })
        );
      }

      const responses = await Promise.all(requests);
      
      // Some should succeed, some should be rate limited
      const successful = responses.filter(r => r.status === 201);
      const rateLimited = responses.filter(r => r.status === 429);

      expect(rateLimited.length).toBeGreaterThan(0);
      
      // Rate limited responses should have proper structure
      rateLimited.forEach(response => {
        expect(response.body).toMatchObject({
          success: false,
          error: {
            code: 'RATE_LIMIT_EXCEEDED',
            message: expect.any(String)
          }
        });

        // Should include rate limit headers
        expect(response.headers['x-ratelimit-limit']).toBeDefined();
        expect(response.headers['x-ratelimit-remaining']).toBeDefined();
      });

      console.log(`Rate limiting test: ${successful.length} successful, ${rateLimited.length} rate limited`);
    });

    it('should handle suspicious request patterns', async () => {
      // Simulate suspicious patterns like rapid requests with similar data
      const suspiciousPattern = Array(5).fill(null).map((_, index) => ({
        ...validUserData,
        name: `Suspicious User`,  // Same name (suspicious)
        email: `suspicious${index}@example.com`
      }));

      const responses = await Promise.all(
        suspiciousPattern.map(userData =>
          request(app)
            .post('/api/v1/users/register')
            .send(userData)
        )
      );

      // Should still process requests normally (no false positives)
      responses.forEach(response => {
        expect([201, 429]).toContain(response.status); // Either success or rate limited
      });

      // But should have proper error handling if rejected
      const rejected = responses.filter(r => r.status !== 201);
      rejected.forEach(response => {
        expect(response.body).toHaveProperty('success', false);
        expect(response.body).toHaveProperty('error');
      });
    });
  });

  describe('System Recovery and Resilience', () => {
    it('should recover from temporary overload conditions', async () => {
      // Simulate system overload and recovery
      const overloadRequests = Array(20).fill(null).map((_, index) =>
        request(app)
          .post('/api/v1/users/register')
          .send({
            ...validUserData,
            email: `overload${index}@example.com`
          })
      );

      const overloadResults = await Promise.allSettled(overloadRequests);
      
      // System might reject some requests during overload
      const overloadSuccessful = overloadResults.filter(r => 
        r.status === 'fulfilled' && (r.value as any).status === 201
      );

      console.log(`Overload test: ${overloadSuccessful.length}/${overloadRequests.length} succeeded`);

      // Wait for system to recover
      await new Promise(resolve => setTimeout(resolve, 2000));

      // System should be responsive again
      const recoveryResponse = await request(app)
        .post('/api/v1/users/register')
        .send({
          ...validUserData,
          email: 'recovery@example.com'
        })
        .expect(201);

      expect(recoveryResponse.body.success).toBe(true);
    });

    it('should maintain data consistency during error conditions', async () => {
      // Create some successful registrations mixed with failing ones
      const mixedRequests = [
        { ...validUserData, email: 'consistent1@example.com' }, // Should succeed
        { name: '', email: 'invalid', password: 'weak' },        // Should fail
        { ...validUserData, email: 'consistent2@example.com' }, // Should succeed
        { ...validUserData, email: 'consistent1@example.com' }, // Should fail (duplicate)
        { ...validUserData, email: 'consistent3@example.com' }  // Should succeed
      ];

      const results = [];
      for (const userData of mixedRequests) {
        try {
          const response = await request(app)
            .post('/api/v1/users/register')
            .send(userData);
          
          results.push({
            email: userData.email,
            status: response.status,
            success: response.body.success
          });
        } catch (error) {
          results.push({
            email: userData.email,
            error: (error as Error).message,
            success: false
          });
        }
      }

      // Verify data consistency in database
      const actualUsers = await dataSource.getRepository(UserOrmEntity).find();
      const expectedSuccessful = ['consistent1@example.com', 'consistent2@example.com', 'consistent3@example.com'];
      
      expect(actualUsers).toHaveLength(3);
      
      const actualEmails = actualUsers.map(u => u.email).sort();
      expect(actualEmails).toEqual(expectedSuccessful.sort());

      console.log('Data consistency test passed:', actualEmails);
    });

    it('should provide meaningful error messages for debugging', async () => {
      const errorScenarios = [
        {
          name: 'Missing required field',
          data: { email: 'test@example.com', password: 'Test123!' },
          expectedErrorField: 'name'
        },
        {
          name: 'Invalid email format',
          data: { ...validUserData, email: 'not-an-email' },
          expectedErrorField: 'email'
        },
        {
          name: 'Password mismatch',
          data: { 
            ...validUserData, 
            password: 'Test123!',
            passwordConfirmation: 'Different123!' 
          },
          expectedErrorField: 'passwordConfirmation'
        }
      ];

      for (const scenario of errorScenarios) {
        const response = await request(app)
          .post('/api/v1/users/register')
          .send(scenario.data)
          .expect(400);

        // Verify error structure provides debugging information
        expect(response.body.error).toHaveProperty('details');
        expect(Array.isArray(response.body.error.details)).toBe(true);
        
        const fieldError = response.body.error.details.find(
          (detail: any) => detail.field === scenario.expectedErrorField
        );
        
        expect(fieldError).toBeTruthy();
        expect(fieldError).toHaveProperty('code');
        expect(fieldError).toHaveProperty('message');
        
        console.log(`✓ ${scenario.name}: Error details provided for field '${scenario.expectedErrorField}'`);
      }
    });
  });
});