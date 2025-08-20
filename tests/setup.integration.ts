import 'reflect-metadata';
import { config } from 'dotenv';
import { DatabaseConnection } from '../src/infrastructure/database/typeorm/typeorm.config';

// Load test environment variables
config({ path: '.env.test' });

// Set test environment
process.env.NODE_ENV = 'test';
process.env.DB_DATABASE = 'insightloop_test';
process.env.DB_SYNCHRONIZE = 'true';
process.env.LOG_LEVEL = 'error';

let dbConnection: DatabaseConnection;

// Global setup for integration tests
beforeAll(async () => {
  try {
    // Initialize database connection
    dbConnection = DatabaseConnection.getInstance();
    await dbConnection.connect();
    
    // Run migrations
    await dbConnection.runMigrations();
    
    console.log('Integration test database setup completed');
  } catch (error) {
    console.error('Failed to setup integration test database:', error);
    throw error;
  }
}, 60000);

// Global teardown for integration tests
afterAll(async () => {
  try {
    if (dbConnection) {
      await dbConnection.disconnect();
    }
    console.log('Integration test database teardown completed');
  } catch (error) {
    console.error('Failed to teardown integration test database:', error);
  }
}, 30000);

// Global test utilities for integration tests
global.integrationTestUtils = {
  getDataSource: () => dbConnection.getDataSource(),
  
  clearAllTables: async () => {
    const dataSource = dbConnection.getDataSource();
    const entities = dataSource.entityMetadatas;
    
    // Disable foreign key checks
    await dataSource.query('SET FOREIGN_KEY_CHECKS = 0');
    
    // Clear all tables
    for (const entity of entities) {
      await dataSource.query(`DELETE FROM ${entity.tableName}`);
    }
    
    // Re-enable foreign key checks
    await dataSource.query('SET FOREIGN_KEY_CHECKS = 1');
  },
  
  createTestUser: async (userData: any = {}) => {
    const dataSource = dbConnection.getDataSource();
    const userRepo = dataSource.getRepository('UserOrmEntity');
    
    const defaultUser = {
      id: 'test-user-' + Date.now(),
      email: 'test@example.com',
      name: 'Test User',
      passwordHash: '$2b$12$hashedpassword',
      role: 'free',
      status: 'active',
      emailVerified: true,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    const user = userRepo.create({ ...defaultUser, ...userData });
    return await userRepo.save(user);
  },
  
  waitForDatabase: async (maxAttempts: number = 10) => {
    for (let i = 0; i < maxAttempts; i++) {
      try {
        const isHealthy = await dbConnection.healthCheck();
        if (isHealthy) {
          return true;
        }
      } catch (error) {
        // Ignore errors and retry
      }
      
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    throw new Error('Database not ready after maximum attempts');
  }
};

// Extend global type definitions
declare global {
  var integrationTestUtils: {
    getDataSource: () => any;
    clearAllTables: () => Promise<void>;
    createTestUser: (userData?: any) => Promise<any>;
    waitForDatabase: (maxAttempts?: number) => Promise<boolean>;
  };
}