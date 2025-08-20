import request from 'supertest';
import { Express } from 'express';
import { DataSource } from 'typeorm';
import Application from '../../../src/main';
import { DatabaseConnection } from '../../../src/infrastructure/database/typeorm/typeorm.config';
import { UserOrmEntity } from '../../../src/infrastructure/database/typeorm/entities/user.orm-entity';

describe('User Registration Integration Tests', () => {
  let app: Express;
  let dataSource: DataSource;
  let dbConnection: DatabaseConnection;
  let application: Application;

  beforeAll(async () => {
    // Set test environment
    process.env.NODE_ENV = 'test';
    process.env.DB_DATABASE = 'insightloop_test';
    process.env.DB_SYNCHRONIZE = 'true';
    process.env.LOG_LEVEL = 'error'; // Reduce logging noise

    // Initialize application
    application = new Application();
    await application.initialize();
    app = application.getApp();

    // Get database connection
    dbConnection = DatabaseConnection.getInstance();
    dataSource = dbConnection.getDataSource();
  });

  beforeEach(async () => {
    // Clean database before each test
    await dataSource.getRepository(UserOrmEntity).clear();
  });

  afterAll(async () => {
    // Clean up and close connections
    await dataSource.getRepository(UserOrmEntity).clear();
    await dbConnection.disconnect();
  });

  describe('POST /api/v1/users/register', () => {
    const validUserData = {
      name: 'John Doe',
      email: 'john@example.com',
      password: 'SecurePass123!',
      passwordConfirmation: 'SecurePass123!'
    };

    it('should register a new user successfully', async () => {
      const response = await request(app)
        .post('/api/v1/users/register')
        .send(validUserData)
        .expect(201);

      expect(response.body).toMatchObject({
        success: true,
        data: {
          name: 'John Doe',
          email: 'john@example.com',
          role: 'free',
          status: 'active'
        }
      });

      expect(response.body.data.id).toBeDefined();
      expect(response.body.data.createdAt).toBeDefined();
      expect(response.body.data.updatedAt).toBeDefined();

      // Verify user was saved to database
      const userRepository = dataSource.getRepository(UserOrmEntity);
      const savedUser = await userRepository.findOne({
        where: { email: 'john@example.com' }
      });

      expect(savedUser).toBeTruthy();
      expect(savedUser!.name).toBe('John Doe');
      expect(savedUser!.role).toBe('free');
      expect(savedUser!.status).toBe('active');
    });

    it('should return 400 for missing required fields', async () => {
      const invalidData = {
        email: 'john@example.com',
        password: 'SecurePass123!'
        // missing name and passwordConfirmation
      };

      const response = await request(app)
        .post('/api/v1/users/register')
        .send(invalidData)
        .expect(400);

      expect(response.body).toMatchObject({
        success: false,
        error: {
          type: 'ValidationError',
          code: 'VALIDATION_ERROR'
        }
      });

      expect(response.body.error.details).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            field: 'name',
            code: 'FIELD_REQUIRED'
          }),
          expect.objectContaining({
            field: 'passwordConfirmation',
            code: 'FIELD_REQUIRED'
          })
        ])
      );
    });

    it('should return 400 for invalid email format', async () => {
      const invalidData = {
        ...validUserData,
        email: 'invalid-email'
      };

      const response = await request(app)
        .post('/api/v1/users/register')
        .send(invalidData)
        .expect(400);

      expect(response.body.error.details).toContainEqual(
        expect.objectContaining({
          field: 'email',
          code: 'FIELD_INVALID_FORMAT'
        })
      );
    });

    it('should return 400 for weak password', async () => {
      const invalidData = {
        ...validUserData,
        password: 'weak',
        passwordConfirmation: 'weak'
      };

      const response = await request(app)
        .post('/api/v1/users/register')
        .send(invalidData)
        .expect(400);

      expect(response.body.error.details).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            field: 'password',
            code: 'PASSWORD_TOO_SHORT'
          }),
          expect.objectContaining({
            field: 'password',
            code: 'PASSWORD_MISSING_UPPERCASE'
          })
        ])
      );
    });

    it('should return 400 for password mismatch', async () => {
      const invalidData = {
        ...validUserData,
        passwordConfirmation: 'DifferentPass123!'
      };

      const response = await request(app)
        .post('/api/v1/users/register')
        .send(invalidData)
        .expect(400);

      expect(response.body.error.details).toContainEqual(
        expect.objectContaining({
          field: 'passwordConfirmation',
          code: 'FIELD_MISMATCH'
        })
      );
    });

    it('should return 409 for duplicate email', async () => {
      // First registration
      await request(app)
        .post('/api/v1/users/register')
        .send(validUserData)
        .expect(201);

      // Second registration with same email
      const duplicateData = {
        ...validUserData,
        name: 'Jane Doe'
      };

      const response = await request(app)
        .post('/api/v1/users/register')
        .send(duplicateData)
        .expect(409);

      expect(response.body).toMatchObject({
        success: false,
        error: {
          type: 'UserAlreadyExistsException',
          code: 'USER_ALREADY_EXISTS'
        }
      });
    });

    it('should handle case insensitive email uniqueness', async () => {
      // First registration
      await request(app)
        .post('/api/v1/users/register')
        .send(validUserData)
        .expect(201);

      // Second registration with uppercase email
      const duplicateData = {
        ...validUserData,
        email: 'JOHN@EXAMPLE.COM',
        name: 'Jane Doe'
      };

      const response = await request(app)
        .post('/api/v1/users/register')
        .send(duplicateData)
        .expect(409);

      expect(response.body.error.code).toBe('USER_ALREADY_EXISTS');
    });

    it('should normalize email to lowercase', async () => {
      const userData = {
        ...validUserData,
        email: 'JOHN@EXAMPLE.COM'
      };

      const response = await request(app)
        .post('/api/v1/users/register')
        .send(userData)
        .expect(201);

      expect(response.body.data.email).toBe('john@example.com');

      // Verify in database
      const userRepository = dataSource.getRepository(UserOrmEntity);
      const savedUser = await userRepository.findOne({
        where: { email: 'john@example.com' }
      });

      expect(savedUser!.email).toBe('john@example.com');
    });

    it('should trim whitespace from name', async () => {
      const userData = {
        ...validUserData,
        name: '  John Doe  '
      };

      const response = await request(app)
        .post('/api/v1/users/register')
        .send(userData)
        .expect(201);

      expect(response.body.data.name).toBe('John Doe');

      // Verify in database
      const userRepository = dataSource.getRepository(UserOrmEntity);
      const savedUser = await userRepository.findOne({
        where: { email: 'john@example.com' }
      });

      expect(savedUser!.name).toBe('John Doe');
    });

    it('should include request ID in response headers', async () => {
      const response = await request(app)
        .post('/api/v1/users/register')
        .set('x-request-id', 'test-request-123')
        .send(validUserData)
        .expect(201);

      expect(response.headers['x-request-id']).toBe('test-request-123');
    });

    it('should generate request ID if not provided', async () => {
      const response = await request(app)
        .post('/api/v1/users/register')
        .send(validUserData)
        .expect(201);

      expect(response.headers['x-request-id']).toBeDefined();
    });

    it('should hash password securely', async () => {
      await request(app)
        .post('/api/v1/users/register')
        .send(validUserData)
        .expect(201);

      // Verify password is hashed in database
      const userRepository = dataSource.getRepository(UserOrmEntity);
      const savedUser = await userRepository.findOne({
        where: { email: 'john@example.com' }
      });

      expect(savedUser!.passwordHash).not.toBe(validUserData.password);
      expect(savedUser!.passwordHash).toMatch(/^\$2[aby]\$\d{2}\$/); // bcrypt format
    });

    it('should set default role to free', async () => {
      const response = await request(app)
        .post('/api/v1/users/register')
        .send(validUserData)
        .expect(201);

      expect(response.body.data.role).toBe('free');

      // Verify in database
      const userRepository = dataSource.getRepository(UserOrmEntity);
      const savedUser = await userRepository.findOne({
        where: { email: 'john@example.com' }
      });

      expect(savedUser!.role).toBe('free');
    });

    it('should set default status to active', async () => {
      const response = await request(app)
        .post('/api/v1/users/register')
        .send(validUserData)
        .expect(201);

      expect(response.body.data.status).toBe('active');

      // Verify in database
      const userRepository = dataSource.getRepository(UserOrmEntity);
      const savedUser = await userRepository.findOne({
        where: { email: 'john@example.com' }
      });

      expect(savedUser!.status).toBe('active');
    });

    it('should set timestamps correctly', async () => {
      const beforeRequest = new Date();
      
      const response = await request(app)
        .post('/api/v1/users/register')
        .send(validUserData)
        .expect(201);

      const afterRequest = new Date();
      const createdAt = new Date(response.body.data.createdAt);
      const updatedAt = new Date(response.body.data.updatedAt);

      expect(createdAt.getTime()).toBeGreaterThanOrEqual(beforeRequest.getTime());
      expect(createdAt.getTime()).toBeLessThanOrEqual(afterRequest.getTime());
      expect(updatedAt.getTime()).toBeGreaterThanOrEqual(beforeRequest.getTime());
      expect(updatedAt.getTime()).toBeLessThanOrEqual(afterRequest.getTime());
    });

    it('should handle concurrent registration attempts', async () => {
      // Simulate concurrent requests with same email
      const promises = Array(5).fill(null).map(() => 
        request(app)
          .post('/api/v1/users/register')
          .send(validUserData)
      );

      const responses = await Promise.allSettled(promises);
      
      // One should succeed, others should fail
      const successfulResponses = responses.filter(
        result => result.status === 'fulfilled' && result.value.status === 201
      );
      const failedResponses = responses.filter(
        result => result.status === 'fulfilled' && result.value.status === 409
      );

      expect(successfulResponses).toHaveLength(1);
      expect(failedResponses).toHaveLength(4);
    });
  });

  describe('Rate Limiting', () => {
    it('should enforce rate limiting on registration endpoint', async () => {
      const promises = [];

      // Make 6 requests (limit is 5 per 15 minutes)
      for (let i = 0; i < 6; i++) {
        promises.push(
          request(app)
            .post('/api/v1/users/register')
            .send({
              ...validUserData,
              email: `user${i}@example.com`
            })
        );
      }

      const responses = await Promise.all(promises);
      
      // First 5 should succeed, 6th should be rate limited
      responses.slice(0, 5).forEach(response => {
        expect(response.status).toBe(201);
      });

      expect(responses[5].status).toBe(429);
      expect(responses[5].body.error.code).toBe('RATE_LIMIT_EXCEEDED');
    });
  });

  describe('Security Headers', () => {
    it('should include security headers in response', async () => {
      const response = await request(app)
        .post('/api/v1/users/register')
        .send(validUserData)
        .expect(201);

      expect(response.headers['x-content-type-options']).toBe('nosniff');
      expect(response.headers['x-frame-options']).toBe('DENY');
      expect(response.headers['x-xss-protection']).toBe('0');
    });
  });

  describe('Error Handling', () => {
    it('should handle malformed JSON', async () => {
      const response = await request(app)
        .post('/api/v1/users/register')
        .set('Content-Type', 'application/json')
        .send('{ invalid json }')
        .expect(400);

      expect(response.body.error.code).toBe('INVALID_JSON');
    });

    it('should handle unexpected errors gracefully', async () => {
      // This would require mocking database failure
      // For now, we'll test the error response structure
      const response = await request(app)
        .post('/api/v1/users/register')
        .send({}) // Empty body to trigger validation errors
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toHaveProperty('type');
      expect(response.body.error).toHaveProperty('message');
      expect(response.body.error).toHaveProperty('code');
    });
  });
});