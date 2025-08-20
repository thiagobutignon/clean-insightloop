import 'reflect-metadata';
import { config } from 'dotenv';

// Load test environment variables
config({ path: '.env.test' });

// Set test environment
process.env.NODE_ENV = 'test';
process.env.LOG_LEVEL = 'error';

// Increase timeout for async operations
jest.setTimeout(30000);

// Mock console methods to reduce noise during tests
global.console = {
  ...console,
  // Uncomment to silence console output during tests
  // log: jest.fn(),
  // debug: jest.fn(),
  // info: jest.fn(),
  // warn: jest.fn(),
  // error: jest.fn(),
};

// Global test utilities
global.testUtils = {
  createMockUser: () => ({
    id: 'test-user-id',
    email: 'test@example.com',
    name: 'Test User',
    role: 'free',
    status: 'active',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }),
  
  createValidUserData: () => ({
    name: 'John Doe',
    email: 'john@example.com',
    password: 'SecurePass123!',
    passwordConfirmation: 'SecurePass123!'
  }),
  
  createMockRequestId: () => `test-req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
  
  sleep: (ms: number) => new Promise(resolve => setTimeout(resolve, ms))
};

// Global error handler for unhandled rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  // Don't exit process in tests
});

// Clean up after all tests
afterAll(async () => {
  // Give time for any async operations to complete
  await new Promise(resolve => setTimeout(resolve, 1000));
});

// Add custom matchers for better assertions
expect.extend({
  toBeValidUUID(received: string) {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    const pass = uuidRegex.test(received);
    
    return {
      message: () => 
        pass 
          ? `Expected ${received} not to be a valid UUID`
          : `Expected ${received} to be a valid UUID`,
      pass,
    };
  },
  
  toBeValidEmail(received: string) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const pass = emailRegex.test(received);
    
    return {
      message: () => 
        pass 
          ? `Expected ${received} not to be a valid email`
          : `Expected ${received} to be a valid email`,
      pass,
    };
  },
  
  toBeValidBcryptHash(received: string) {
    const bcryptRegex = /^\$2[aby]\$\d{2}\$[./A-Za-z0-9]{53}$/;
    const pass = bcryptRegex.test(received);
    
    return {
      message: () => 
        pass 
          ? `Expected ${received} not to be a valid bcrypt hash`
          : `Expected ${received} to be a valid bcrypt hash`,
      pass,
    };
  },
  
  toHaveValidTimestamps(received: any) {
    const hasCreatedAt = received.createdAt && !isNaN(Date.parse(received.createdAt));
    const hasUpdatedAt = received.updatedAt && !isNaN(Date.parse(received.updatedAt));
    const pass = hasCreatedAt && hasUpdatedAt;
    
    return {
      message: () => 
        pass 
          ? `Expected object not to have valid timestamps`
          : `Expected object to have valid createdAt and updatedAt timestamps`,
      pass,
    };
  }
});

// Extend Jest matchers type definitions
declare global {
  namespace jest {
    interface Matchers<R> {
      toBeValidUUID(): R;
      toBeValidEmail(): R;
      toBeValidBcryptHash(): R;
      toHaveValidTimestamps(): R;
    }
  }
  
  var testUtils: {
    createMockUser: () => any;
    createValidUserData: () => any;
    createMockRequestId: () => string;
    sleep: (ms: number) => Promise<void>;
  };
}