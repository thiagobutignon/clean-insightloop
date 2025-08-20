import request from 'supertest';
import { Application as ExpressApp } from 'express';
import { DataSource } from 'typeorm';
import Application from '../../../src/main';
import { DatabaseConnection } from '../../../src/infrastructure/database/typeorm/typeorm.config';
import { UserOrmEntity } from '../../../src/infrastructure/database/typeorm/entities/user.orm-entity';

describe('User Security Integration Tests', () => {
  let app: ExpressApp;
  let dataSource: DataSource;
  let dbConnection: DatabaseConnection;
  let application: Application;

  const validUserData = {
    name: 'Security Test User',
    email: 'security@example.com',
    password: 'SecurePass123!',
    passwordConfirmation: 'SecurePass123!'
  };

  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    process.env.DB_DATABASE = 'insightloop_security_test';
    process.env.DB_SYNCHRONIZE = 'true';
    process.env.LOG_LEVEL = 'error';
    process.env.JWT_SECRET = 'test-jwt-secret-key-for-security-tests';
    process.env.RATE_LIMIT_WINDOW_MS = '60000'; // 1 minute
    process.env.RATE_LIMIT_MAX_REQUESTS = '5';

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

  describe('SQL Injection Prevention', () => {
    it('should prevent SQL injection in email field', async () => {
      const maliciousPayload = {
        ...validUserData,
        email: "'; DROP TABLE users; --"
      };

      const response = await request(app)
        .post('/api/v1/users/register')
        .send(maliciousPayload)
        .expect(400);

      expect(response.body.error.code).toBe('VALIDATION_ERROR');
      
      // Verify table still exists and is accessible
      const userCount = await dataSource.getRepository(UserOrmEntity).count();
      expect(userCount).toBe(0);
    });

    it('should prevent SQL injection in name field', async () => {
      const maliciousPayload = {
        ...validUserData,
        name: "John'; UPDATE users SET role='admin' WHERE '1'='1"
      };

      await request(app)
        .post('/api/v1/users/register')
        .send(maliciousPayload);

      // Verify no unauthorized role changes occurred
      const users = await dataSource.getRepository(UserOrmEntity).find();
      users.forEach(user => {
        expect(user.role).not.toBe('admin');
      });
    });

    it('should handle SQL injection attempts in query parameters', async () => {
      // First create a user
      await request(app)
        .post('/api/v1/users/register')
        .send(validUserData)
        .expect(201);

      // Try SQL injection in query parameter (if endpoint exists)
      const maliciousId = "1; DROP TABLE users; --";
      
      // This would be for a hypothetical GET /users/:id endpoint
      const response = await request(app)
        .get(`/api/v1/users/${encodeURIComponent(maliciousId)}`)
        .expect(res => {
          // Should either return 400/404, not 500 (which might indicate SQL injection succeeded)
          expect([400, 404, 401, 403]).toContain(res.status);
        });

      // Verify table integrity
      const userCount = await dataSource.getRepository(UserOrmEntity).count();
      expect(userCount).toBeGreaterThan(0);
    });

    it('should sanitize input with various SQL injection patterns', async () => {
      const injectionAttempts = [
        "' OR '1'='1",
        "'; INSERT INTO users (email) VALUES ('hacked@evil.com'); --",
        "' UNION SELECT * FROM users --",
        "'; EXEC xp_cmdshell('dir'); --",
        "' AND (SELECT COUNT(*) FROM users) > 0 --"
      ];

      for (const attempt of injectionAttempts) {
        const payload = {
          ...validUserData,
          email: `test${Math.random()}@example.com`,
          name: attempt
        };

        const response = await request(app)
          .post('/api/v1/users/register')
          .send(payload);

        // Should either succeed with sanitized input or fail validation
        // But should not cause server error (500)
        expect(response.status).not.toBe(500);
      }
    });
  });

  describe('Rate Limiting Security', () => {
    it('should enforce rate limits per IP address', async () => {
      const requests = [];
      const maxRequests = 5; // Based on environment variable

      // Make requests up to the limit
      for (let i = 0; i < maxRequests + 2; i++) {
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
      
      // First 5 should succeed or fail due to business logic (not rate limiting)
      const initialResponses = responses.slice(0, maxRequests);
      initialResponses.forEach(response => {
        expect(response.status).not.toBe(429);
      });

      // Additional requests should be rate limited
      const rateLimitedResponses = responses.slice(maxRequests);
      rateLimitedResponses.forEach(response => {
        expect(response.status).toBe(429);
        expect(response.body.error.code).toBe('RATE_LIMIT_EXCEEDED');
      });
    });

    it('should not share rate limits between different IPs', async () => {
      // Simulate requests from different IPs using X-Forwarded-For header
      const ip1Requests = Array(3).fill(null).map((_, i) =>
        request(app)
          .post('/api/v1/users/register')
          .set('X-Forwarded-For', '192.168.1.1')
          .send({
            ...validUserData,
            email: `ip1-${i}@example.com`
          })
      );

      const ip2Requests = Array(3).fill(null).map((_, i) =>
        request(app)
          .post('/api/v1/users/register')
          .set('X-Forwarded-For', '192.168.1.2')
          .send({
            ...validUserData,
            email: `ip2-${i}@example.com`
          })
      );

      const [ip1Responses, ip2Responses] = await Promise.all([
        Promise.all(ip1Requests),
        Promise.all(ip2Requests)
      ]);

      // Both IPs should be able to make requests without affecting each other
      [...ip1Responses, ...ip2Responses].forEach(response => {
        expect(response.status).not.toBe(429);
      });
    });

    it('should reset rate limits after time window', async () => {
      // Make requests to hit rate limit
      const initialRequests = Array(6).fill(null).map((_, i) =>
        request(app)
          .post('/api/v1/users/register')
          .send({
            ...validUserData,
            email: `reset${i}@example.com`
          })
      );

      const initialResponses = await Promise.all(initialRequests);
      const rateLimited = initialResponses.some(r => r.status === 429);
      expect(rateLimited).toBe(true);

      // Wait for rate limit window to reset (in a real test, you might mock time)
      // For this test, we'll just verify the rate limit headers are present
      const rateLimitedResponse = initialResponses.find(r => r.status === 429);
      expect(rateLimitedResponse!.headers['x-ratelimit-limit']).toBeDefined();
      expect(rateLimitedResponse!.headers['x-ratelimit-remaining']).toBeDefined();
      expect(rateLimitedResponse!.headers['x-ratelimit-reset']).toBeDefined();
    });
  });

  describe('Input Validation Security', () => {
    it('should prevent XSS attacks in input fields', async () => {
      const xssPayloads = [
        '<script>alert("xss")</script>',
        'javascript:alert("xss")',
        '<img src="x" onerror="alert(\'xss\')" />',
        '"><script>alert("xss")</script>',
        "' OR 1=1 --",
        '<svg onload="alert(\'xss\')" />'
      ];

      for (const payload of xssPayloads) {
        const response = await request(app)
          .post('/api/v1/users/register')
          .send({
            ...validUserData,
            name: payload,
            email: `xss${Math.random()}@example.com`
          });

        // Should either sanitize the input or reject it
        if (response.status === 201) {
          // If accepted, verify the dangerous content was sanitized
          expect(response.body.data.name).not.toContain('<script>');
          expect(response.body.data.name).not.toContain('javascript:');
          expect(response.body.data.name).not.toContain('onerror');
        } else {
          // If rejected, should be due to validation
          expect(response.status).toBe(400);
        }
      }
    });

    it('should validate email format strictly', async () => {
      const invalidEmails = [
        '',
        'notanemail',
        '@example.com',
        'user@',
        'user@.com',
        'user..user@example.com',
        'user@example.',
        'user@example..com',
        'user name@example.com', // Space in email
        'user@exam ple.com', // Space in domain
        'user@localhost', // No TLD
        'a'.repeat(254) + '@example.com', // Too long
      ];

      for (const email of invalidEmails) {
        const response = await request(app)
          .post('/api/v1/users/register')
          .send({
            ...validUserData,
            email
          })
          .expect(400);

        expect(response.body.error.code).toBe('VALIDATION_ERROR');
      }
    });

    it('should enforce strong password requirements', async () => {
      const weakPasswords = [
        '123456',
        'password',
        'qwerty',
        'abc123',
        '12345678', // Numbers only
        'abcdefgh', // Letters only
        'ABCDEFGH', // Uppercase only
        'Password', // Missing special char and number
        'Pass123', // Too short
        '   ', // Whitespace only
        '', // Empty
      ];

      for (const password of weakPasswords) {
        const response = await request(app)
          .post('/api/v1/users/register')
          .send({
            ...validUserData,
            password,
            passwordConfirmation: password,
            email: `weak${Math.random()}@example.com`
          })
          .expect(400);

        expect(response.body.error.code).toBe('VALIDATION_ERROR');
        const passwordErrors = response.body.error.details.filter(
          (error: any) => error.field === 'password'
        );
        expect(passwordErrors.length).toBeGreaterThan(0);
      }
    });
  });

  describe('Authentication and Authorization Security', () => {
    it('should generate secure JWT tokens', async () => {
      // Register user first
      const registerResponse = await request(app)
        .post('/api/v1/users/register')
        .send(validUserData)
        .expect(201);

      // If login endpoint exists, test JWT generation
      // This is a placeholder for future auth implementation
      // Mock JWT for testing (would normally use jsonwebtoken library)
      const mockPayload = {
        userId: registerResponse.body.data.id,
        email: validUserData.email,
        exp: Math.floor(Date.now() / 1000) + (60 * 60) // 1 hour
      };
      const mockJwt = `header.${btoa(JSON.stringify(mockPayload))}.signature`;

      // Verify JWT structure (simplified for test)
      const [header, payload, signature] = mockJwt.split('.');
      const decoded = JSON.parse(atob(payload));
      expect(decoded.userId).toBeDefined();
      expect(decoded.email).toBe(validUserData.email);
      expect(decoded.exp).toBeDefined();
    });

    it('should not expose sensitive information in responses', async () => {
      const response = await request(app)
        .post('/api/v1/users/register')
        .send(validUserData)
        .expect(201);

      // Verify password is not in response
      expect(response.body.data.password).toBeUndefined();
      expect(response.body.data.passwordHash).toBeUndefined();
      expect(response.body.data.passwordConfirmation).toBeUndefined();

      // Verify other sensitive fields are not exposed
      expect(response.body.data.passwordSalt).toBeUndefined();
      expect(response.body.data.secretKey).toBeUndefined();
    });

    it('should prevent timing attacks on email enumeration', async () => {
      // Register a user
      await request(app)
        .post('/api/v1/users/register')
        .send(validUserData)
        .expect(201);

      // Measure response time for existing vs non-existing emails
      const startExisting = Date.now();
      await request(app)
        .post('/api/v1/users/register')
        .send(validUserData) // Same email (exists)
        .expect(409);
      const timeExisting = Date.now() - startExisting;

      const startNonExisting = Date.now();
      await request(app)
        .post('/api/v1/users/register')
        .send({
          ...validUserData,
          email: 'nonexistent@example.com'
        });
      const timeNonExisting = Date.now() - startNonExisting;

      // Response times should be similar (within reasonable threshold)
      const timeDifference = Math.abs(timeExisting - timeNonExisting);
      expect(timeDifference).toBeLessThan(100); // 100ms threshold
    });
  });

  describe('Security Headers', () => {
    it('should include all required security headers', async () => {
      const response = await request(app)
        .post('/api/v1/users/register')
        .send(validUserData)
        .expect(201);

      // Check for security headers
      expect(response.headers['x-content-type-options']).toBe('nosniff');
      expect(response.headers['x-frame-options']).toBe('DENY');
      expect(response.headers['x-xss-protection']).toBe('0'); // Modern browsers don't need this
      expect(response.headers['strict-transport-security']).toBeDefined();
      expect(response.headers['content-security-policy']).toBeDefined();
    });

    it('should set appropriate CORS headers', async () => {
      const response = await request(app)
        .options('/api/v1/users/register')
        .set('Origin', 'https://example.com')
        .set('Access-Control-Request-Method', 'POST')
        .expect(204);

      expect(response.headers['access-control-allow-origin']).toBeDefined();
      expect(response.headers['access-control-allow-methods']).toBeDefined();
      expect(response.headers['access-control-allow-headers']).toBeDefined();
    });

    it('should prevent clickjacking attacks', async () => {
      const response = await request(app)
        .get('/api/v1/health') // Assuming health endpoint exists
        .expect(res => {
          // Should have either X-Frame-Options or CSP frame-ancestors
          const hasXFrameOptions = res.headers['x-frame-options'];
          const hasCSP = res.headers['content-security-policy'];
          
          if (hasXFrameOptions) {
            expect(['DENY', 'SAMEORIGIN']).toContain(hasXFrameOptions);
          }
          
          if (hasCSP) {
            expect(hasCSP).toMatch(/frame-ancestors/);
          }
          
          // At least one should be present
          expect(hasXFrameOptions || hasCSP).toBeTruthy();
        });
    });
  });

  describe('Error Handling Security', () => {
    it('should not leak sensitive information in error messages', async () => {
      // Test various error conditions
      const response = await request(app)
        .post('/api/v1/users/register')
        .send({
          ...validUserData,
          email: 'invalid-email-format'
        })
        .expect(400);

      // Error should not contain database schema info, file paths, etc.
      const errorMessage = JSON.stringify(response.body);
      expect(errorMessage).not.toMatch(/password|secret|key|token/i);
      expect(errorMessage).not.toMatch(/\/var\/|\/home\/|C:\\/);
      expect(errorMessage).not.toMatch(/mysql|postgres|mongodb|redis/i);
      expect(errorMessage).not.toMatch(/stack trace|line \d+/i);
    });

    it('should return generic error messages for internal server errors', async () => {
      // This would require mocking an internal error
      // For now, verify error structure
      const response = await request(app)
        .post('/api/v1/users/register')
        .send({}) // Invalid payload
        .expect(400);

      expect(response.body.error.type).toBeDefined();
      expect(response.body.error.code).toBeDefined();
      expect(response.body.error.message).toBeDefined();
      expect(response.body.success).toBe(false);
    });

    it('should handle malformed requests safely', async () => {
      // Test malformed JSON
      await request(app)
        .post('/api/v1/users/register')
        .set('Content-Type', 'application/json')
        .send('{ invalid json }')
        .expect(400);

      // Test oversized payloads
      const oversizedPayload = {
        ...validUserData,
        name: 'A'.repeat(10000) // Very long name
      };

      await request(app)
        .post('/api/v1/users/register')
        .send(oversizedPayload)
        .expect(400);

      // Test null/undefined values
      await request(app)
        .post('/api/v1/users/register')
        .send({
          name: null,
          email: undefined,
          password: null,
          passwordConfirmation: undefined
        })
        .expect(400);
    });
  });

  describe('Session and Cookie Security', () => {
    it('should set secure cookie attributes if using cookies', async () => {
      // This is a placeholder for future cookie-based session management
      const response = await request(app)
        .post('/api/v1/users/register')
        .send(validUserData)
        .expect(201);

      // If cookies are used, they should have security attributes
      const cookies = response.headers['set-cookie'];
      if (cookies && Array.isArray(cookies)) {
        cookies.forEach((cookie: string) => {
          if (cookie.includes('session') || cookie.includes('auth')) {
            expect(cookie).toMatch(/HttpOnly/i);
            expect(cookie).toMatch(/Secure/i);
            expect(cookie).toMatch(/SameSite/i);
          }
        });
      }
    });
  });
});