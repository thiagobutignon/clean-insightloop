import request from 'supertest';
import { Application as ExpressApp } from 'express';
import { DataSource } from 'typeorm';
import Application from '../../../src/main';
import { DatabaseConnection } from '../../../src/infrastructure/database/typeorm/typeorm.config';
import { UserOrmEntity } from '../../../src/infrastructure/database/typeorm/entities/user.orm-entity';

describe('User E2E Integration Tests', () => {
  let app: ExpressApp;
  let dataSource: DataSource;
  let dbConnection: DatabaseConnection;
  let application: Application;

  const validUserData = {
    name: 'John Doe',
    email: 'john.doe@example.com',
    password: 'SecurePass123!',
    passwordConfirmation: 'SecurePass123!'
  };

  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    process.env.DB_DATABASE = 'insightloop_e2e_test';
    process.env.DB_SYNCHRONIZE = 'true';
    process.env.LOG_LEVEL = 'error';
    process.env.RATE_LIMIT_WINDOW_MS = '60000';
    process.env.RATE_LIMIT_MAX_REQUESTS = '20';

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

  describe('Complete User Registration Journey', () => {
    it('should complete a full user registration flow successfully', async () => {
      // Step 1: Verify user doesn't exist initially
      const initialCount = await dataSource.getRepository(UserOrmEntity).count();
      expect(initialCount).toBe(0);

      // Step 2: Register new user
      const registrationResponse = await request(app)
        .post('/api/v1/users/register')
        .send(validUserData)
        .expect(201);

      // Step 3: Verify response structure
      expect(registrationResponse.body).toMatchObject({
        success: true,
        data: {
          id: expect.any(String),
          name: 'John Doe',
          email: 'john.doe@example.com',
          role: 'free',
          status: 'active',
          createdAt: expect.any(String),
          updatedAt: expect.any(String)
        }
      });

      // Step 4: Verify user was persisted to database
      const userCount = await dataSource.getRepository(UserOrmEntity).count();
      expect(userCount).toBe(1);

      const savedUser = await dataSource.getRepository(UserOrmEntity).findOne({
        where: { email: 'john.doe@example.com' }
      });

      expect(savedUser).toBeTruthy();
      expect(savedUser!.name).toBe('John Doe');
      expect(savedUser!.email).toBe('john.doe@example.com');
      expect(savedUser!.role).toBe('free');
      expect(savedUser!.status).toBe('active');
      expect(savedUser!.passwordHash).toMatch(/^\$2[aby]\$\d{2}\$/); // bcrypt format
      expect(savedUser!.createdAt).toBeInstanceOf(Date);
      expect(savedUser!.updatedAt).toBeInstanceOf(Date);

      // Step 5: Verify password is not in response
      expect(registrationResponse.body.data.password).toBeUndefined();
      expect(registrationResponse.body.data.passwordHash).toBeUndefined();
    });

    it('should handle the complete validation error journey', async () => {
      const invalidUserData = {
        name: '', // Empty name
        email: 'invalid-email', // Invalid email format
        password: 'weak', // Weak password
        passwordConfirmation: 'different' // Mismatched confirmation
      };

      // Step 1: Attempt registration with invalid data
      const response = await request(app)
        .post('/api/v1/users/register')
        .send(invalidUserData)
        .expect(400);

      // Step 2: Verify comprehensive error response
      expect(response.body).toMatchObject({
        success: false,
        error: {
          type: 'ValidationError',
          code: 'VALIDATION_ERROR',
          message: expect.any(String),
          details: expect.any(Array)
        }
      });

      // Step 3: Verify all validation errors are present
      const errorDetails = response.body.error.details;
      const errorFields = errorDetails.map((error: any) => error.field);

      expect(errorFields).toContain('name');
      expect(errorFields).toContain('email');
      expect(errorFields).toContain('password');
      expect(errorFields).toContain('passwordConfirmation');

      // Step 4: Verify specific error codes
      const nameError = errorDetails.find((error: any) => error.field === 'name');
      const emailError = errorDetails.find((error: any) => error.field === 'email');
      const passwordErrors = errorDetails.filter((error: any) => error.field === 'password');
      const confirmationError = errorDetails.find((error: any) => error.field === 'passwordConfirmation');

      expect(nameError.code).toBe('FIELD_REQUIRED');
      expect(emailError.code).toBe('FIELD_INVALID_FORMAT');
      expect(passwordErrors.length).toBeGreaterThan(0);
      expect(confirmationError.code).toBe('FIELD_MISMATCH');

      // Step 5: Verify no user was created
      const userCount = await dataSource.getRepository(UserOrmEntity).count();
      expect(userCount).toBe(0);
    });

    it('should handle duplicate email registration journey', async () => {
      // Step 1: Register first user successfully
      await request(app)
        .post('/api/v1/users/register')
        .send(validUserData)
        .expect(201);

      // Step 2: Verify user exists in database
      const userCount = await dataSource.getRepository(UserOrmEntity).count();
      expect(userCount).toBe(1);

      // Step 3: Attempt to register with same email
      const duplicateUserData = {
        ...validUserData,
        name: 'Jane Smith' // Different name, same email
      };

      const response = await request(app)
        .post('/api/v1/users/register')
        .send(duplicateUserData)
        .expect(409);

      // Step 4: Verify conflict response
      expect(response.body).toMatchObject({
        success: false,
        error: {
          type: 'UserAlreadyExistsException',
          code: 'USER_ALREADY_EXISTS',
          message: expect.stringContaining('already exists')
        }
      });

      // Step 5: Verify still only one user in database
      const finalUserCount = await dataSource.getRepository(UserOrmEntity).count();
      expect(finalUserCount).toBe(1);

      // Step 6: Verify original user data is unchanged
      const originalUser = await dataSource.getRepository(UserOrmEntity).findOne({
        where: { email: validUserData.email }
      });
      expect(originalUser!.name).toBe('John Doe'); // Not changed to Jane Smith
    });
  });

  describe('Data Transformation and Normalization Journey', () => {
    it('should handle email normalization throughout the system', async () => {
      const userData = {
        ...validUserData,
        email: '  JOHN.DOE@EXAMPLE.COM  ' // Uppercase with whitespace
      };

      // Step 1: Register with unnormalized email
      const response = await request(app)
        .post('/api/v1/users/register')
        .send(userData)
        .expect(201);

      // Step 2: Verify response has normalized email
      expect(response.body.data.email).toBe('john.doe@example.com');

      // Step 3: Verify database stores normalized email
      const savedUser = await dataSource.getRepository(UserOrmEntity).findOne({
        where: { email: 'john.doe@example.com' }
      });
      expect(savedUser).toBeTruthy();
      expect(savedUser!.email).toBe('john.doe@example.com');

      // Step 4: Verify duplicate detection works with different cases
      const duplicateWithDifferentCase = {
        ...validUserData,
        name: 'Another User',
        email: 'JOHN.DOE@EXAMPLE.COM'
      };

      await request(app)
        .post('/api/v1/users/register')
        .send(duplicateWithDifferentCase)
        .expect(409); // Should detect as duplicate
    });

    it('should handle name trimming and validation', async () => {
      const userData = {
        ...validUserData,
        name: '  John   Doe  ' // Extra whitespace
      };

      // Step 1: Register with untrimmed name
      const response = await request(app)
        .post('/api/v1/users/register')
        .send(userData)
        .expect(201);

      // Step 2: Verify response has trimmed name
      expect(response.body.data.name).toBe('John Doe');

      // Step 3: Verify database stores trimmed name
      const savedUser = await dataSource.getRepository(UserOrmEntity).findOne({
        where: { email: validUserData.email }
      });
      expect(savedUser!.name).toBe('John Doe');
    });
  });

  describe('Error Recovery and Resilience Journey', () => {
    it('should recover from temporary system issues', async () => {
      // This simulates a scenario where the system recovers from issues
      const multipleAttempts = Array(3).fill(null).map((_, index) => ({
        ...validUserData,
        email: `recovery${index}@example.com`
      }));

      const results = [];

      // Attempt multiple registrations to test system resilience
      for (const userData of multipleAttempts) {
        try {
          const response = await request(app)
            .post('/api/v1/users/register')
            .send(userData)
            .timeout(10000); // 10 second timeout

          results.push({
            success: true,
            status: response.status,
            email: userData.email
          });
        } catch (error) {
          results.push({
            success: false,
            error: (error as Error).message,
            email: userData.email
          });
        }

        // Small delay between requests
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      // At least 2 out of 3 should succeed (showing resilience)
      const successful = results.filter(r => r.success);
      expect(successful.length).toBeGreaterThanOrEqual(2);

      // Verify successful registrations are in database
      for (const success of successful) {
        const user = await dataSource.getRepository(UserOrmEntity).findOne({
          where: { email: (success as any).email }
        });
        expect(user).toBeTruthy();
      }
    });

    it('should handle malformed request recovery', async () => {
      // Step 1: Send malformed JSON
      await request(app)
        .post('/api/v1/users/register')
        .set('Content-Type', 'application/json')
        .send('{ invalid json }')
        .expect(400);

      // Step 2: Verify system is still responsive with valid request
      const response = await request(app)
        .post('/api/v1/users/register')
        .send(validUserData)
        .expect(201);

      expect(response.body.success).toBe(true);

      // Step 3: Verify database is consistent
      const userCount = await dataSource.getRepository(UserOrmEntity).count();
      expect(userCount).toBe(1);
    });
  });

  describe('Cross-Request State Management', () => {
    it('should maintain consistency across multiple registration requests', async () => {
      const users = [
        { ...validUserData, name: 'User One', email: 'user1@example.com' },
        { ...validUserData, name: 'User Two', email: 'user2@example.com' },
        { ...validUserData, name: 'User Three', email: 'user3@example.com' }
      ];

      const registrationResults = [];

      // Register users sequentially to test state management
      for (const userData of users) {
        const response = await request(app)
          .post('/api/v1/users/register')
          .send(userData)
          .expect(201);

        registrationResults.push(response.body.data);

        // Verify each registration is independent
        expect(response.body.data.email).toBe(userData.email);
        expect(response.body.data.name).toBe(userData.name);
      }

      // Verify all users exist in database
      const allUsers = await dataSource.getRepository(UserOrmEntity).find();
      expect(allUsers).toHaveLength(3);

      // Verify each user has unique data
      const emails = allUsers.map(u => u.email).sort();
      const names = allUsers.map(u => u.name).sort();

      expect(emails).toEqual(['user1@example.com', 'user2@example.com', 'user3@example.com']);
      expect(names).toEqual(['User One', 'User Three', 'User Two']);
    });

    it('should handle request isolation correctly', async () => {
      // Simulate concurrent requests that should be isolated
      const concurrentUsers = [
        { ...validUserData, name: 'Concurrent User A', email: 'concurrent-a@example.com' },
        { ...validUserData, name: 'Concurrent User B', email: 'concurrent-b@example.com' }
      ];

      const promises = concurrentUsers.map(userData =>
        request(app)
          .post('/api/v1/users/register')
          .send(userData)
      );

      const results = await Promise.all(promises);

      // Both should succeed
      results.forEach(response => {
        expect(response.status).toBe(201);
        expect(response.body.success).toBe(true);
      });

      // Verify both users are in database with correct data
      const userA = await dataSource.getRepository(UserOrmEntity).findOne({
        where: { email: 'concurrent-a@example.com' }
      });
      const userB = await dataSource.getRepository(UserOrmEntity).findOne({
        where: { email: 'concurrent-b@example.com' }
      });

      expect(userA).toBeTruthy();
      expect(userB).toBeTruthy();
      expect(userA!.name).toBe('Concurrent User A');
      expect(userB!.name).toBe('Concurrent User B');
    });
  });

  describe('HTTP Protocol Compliance', () => {
    it('should return correct HTTP status codes for different scenarios', async () => {
      const testCases = [
        {
          name: 'Valid registration',
          data: { ...validUserData, email: 'valid@example.com' },
          expectedStatus: 201,
          expectedContentType: /application\/json/
        },
        {
          name: 'Invalid data',
          data: { name: '', email: 'invalid', password: 'weak' },
          expectedStatus: 400,
          expectedContentType: /application\/json/
        },
        {
          name: 'Malformed JSON',
          data: '{ invalid }',
          expectedStatus: 400,
          expectedContentType: /application\/json/,
          isRawString: true
        }
      ];

      for (const testCase of testCases) {
        let request_builder = request(app).post('/api/v1/users/register');

        if (testCase.isRawString) {
          request_builder = request_builder
            .set('Content-Type', 'application/json')
            .send(testCase.data);
        } else {
          request_builder = request_builder.send(testCase.data);
        }

        const response = await request_builder.expect(testCase.expectedStatus);

        expect(response.headers['content-type']).toMatch(testCase.expectedContentType);
        expect(response.body).toHaveProperty('success');

        console.log(`✓ ${testCase.name}: Status ${response.status}, Content-Type: ${response.headers['content-type']}`);
      }
    });

    it('should include proper security headers', async () => {
      const response = await request(app)
        .post('/api/v1/users/register')
        .send(validUserData)
        .expect(201);

      // Verify security headers are present
      const securityHeaders = [
        'x-content-type-options',
        'x-frame-options',
        'strict-transport-security',
        'content-security-policy'
      ];

      securityHeaders.forEach(header => {
        expect(response.headers[header]).toBeDefined();
        console.log(`✓ Security header ${header}: ${response.headers[header]}`);
      });
    });

    it('should handle OPTIONS requests correctly', async () => {
      const response = await request(app)
        .options('/api/v1/users/register')
        .expect(204);

      // Should have CORS headers
      expect(response.headers['access-control-allow-methods']).toBeDefined();
      expect(response.headers['access-control-allow-headers']).toBeDefined();
    });
  });

  describe('Real-World Usage Patterns', () => {
    it('should handle typical user registration patterns', async () => {
      // Simulate real-world registration patterns
      const registrationPatterns = [
        // Pattern 1: Immediate successful registration
        { ...validUserData, email: 'pattern1@example.com' },
        
        // Pattern 2: Registration after validation error (user fixes data)
        { name: 'Pattern Two User', email: 'pattern2@example.com', password: 'NewSecurePass123!', passwordConfirmation: 'NewSecurePass123!' },
        
        // Pattern 3: Different email domains
        { ...validUserData, email: 'pattern3@gmail.com', name: 'Gmail User' },
        { ...validUserData, email: 'pattern4@outlook.com', name: 'Outlook User' },
        
        // Pattern 4: International characters in name
        { ...validUserData, email: 'pattern5@example.com', name: 'José María García-López' }
      ];

      const results = [];

      for (const userData of registrationPatterns) {
        const response = await request(app)
          .post('/api/v1/users/register')
          .send(userData)
          .expect(201);

        results.push({
          email: userData.email,
          name: userData.name,
          registrationId: response.body.data.id
        });

        // Small delay to simulate real user behavior
        await new Promise(resolve => setTimeout(resolve, 50));
      }

      // Verify all patterns worked
      expect(results).toHaveLength(registrationPatterns.length);

      // Verify database state
      const allUsers = await dataSource.getRepository(UserOrmEntity).find({
        order: { createdAt: 'ASC' }
      });

      expect(allUsers).toHaveLength(registrationPatterns.length);

      // Verify special characters were handled correctly
      const internationalUser = allUsers.find(u => u.name === 'José María García-López');
      expect(internationalUser).toBeTruthy();
    });

    it('should handle edge cases in user data', async () => {
      const edgeCases = [
        {
          name: 'Minimum length name',
          data: { ...validUserData, name: 'Jo', email: 'edge1@example.com' }
        },
        {
          name: 'Maximum length name',
          data: { ...validUserData, name: 'A'.repeat(100), email: 'edge2@example.com' }
        },
        {
          name: 'Email with plus sign',
          data: { ...validUserData, email: 'user+tag@example.com' }
        },
        {
          name: 'Email with subdomain',
          data: { ...validUserData, email: 'user@mail.example.com' }
        }
      ];

      for (const testCase of edgeCases) {
        const response = await request(app)
          .post('/api/v1/users/register')
          .send(testCase.data)
          .expect(201);

        console.log(`✓ Edge case handled: ${testCase.name}`);
        expect(response.body.success).toBe(true);
      }

      // Verify all edge cases are in database
      const userCount = await dataSource.getRepository(UserOrmEntity).count();
      expect(userCount).toBe(edgeCases.length);
    });
  });
});