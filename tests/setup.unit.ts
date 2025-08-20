import 'reflect-metadata';

// Unit test specific setup
console.log('Setting up unit tests...');

// Mock external dependencies for unit tests
jest.mock('bcrypt', () => ({
  hash: jest.fn().mockResolvedValue('$2b$12$mockedhashedpassword'),
  compare: jest.fn().mockResolvedValue(true),
  genSalt: jest.fn().mockResolvedValue('$2b$12$mockedsalt')
}));

jest.mock('winston', () => ({
  createLogger: jest.fn(() => ({
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
    log: jest.fn()
  })),
  format: {
    combine: jest.fn(),
    timestamp: jest.fn(),
    errors: jest.fn(),
    json: jest.fn(),
    colorize: jest.fn(),
    printf: jest.fn()
  },
  transports: {
    Console: jest.fn(),
    File: jest.fn()
  }
}));

// Mock UUID generation for consistent testing
jest.mock('uuid', () => ({
  v4: jest.fn(() => '550e8400-e29b-41d4-a716-446655440000')
}));

// Global unit test utilities
global.unitTestUtils = {
  createMockLogger: () => ({
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
    log: jest.fn(),
    child: jest.fn().mockReturnThis()
  }),
  
  createMockRepository: () => ({
    findById: jest.fn(),
    findByEmail: jest.fn(),
    save: jest.fn(),
    exists: jest.fn(),
    findAll: jest.fn(),
    count: jest.fn(),
    delete: jest.fn(),
    findByRole: jest.fn(),
    findByDateRange: jest.fn(),
    findRecentlyCreated: jest.fn(),
    findPendingVerification: jest.fn()
  }),
  
  createMockEventPublisher: () => ({
    publish: jest.fn(),
    publishAll: jest.fn(),
    subscribe: jest.fn(),
    unsubscribe: jest.fn()
  }),
  
  createMockHashingService: () => ({
    hash: jest.fn().mockResolvedValue('$2b$12$mockedhashedpassword'),
    verify: jest.fn().mockResolvedValue(true),
    generateSalt: jest.fn().mockResolvedValue('$2b$12$mockedsalt'),
    getRecommendedSaltRounds: jest.fn().mockReturnValue(12)
  }),
  
  createMockUserFactory: () => ({
    createUser: jest.fn(),
    createRegistrationUser: jest.fn(),
    createAdminUser: jest.fn(),
    createUserWithVerification: jest.fn(),
    createUsers: jest.fn()
  }),
  
  mockConsole: () => {
    const originalConsole = console;
    
    beforeEach(() => {
      global.console = {
        ...console,
        log: jest.fn(),
        error: jest.fn(),
        warn: jest.fn(),
        info: jest.fn(),
        debug: jest.fn()
      };
    });
    
    afterEach(() => {
      global.console = originalConsole;
    });
  },
  
  mockDateNow: (mockDate: Date) => {
    const spy = jest.spyOn(Date, 'now').mockReturnValue(mockDate.getTime());
    return spy;
  },
  
  mockMathRandom: (value: number) => {
    const spy = jest.spyOn(Math, 'random').mockReturnValue(value);
    return spy;
  }
};

// Mock timers utility
global.mockTimers = {
  useFakeTimers: () => {
    jest.useFakeTimers();
  },
  
  useRealTimers: () => {
    jest.useRealTimers();
  },
  
  advanceTimersByTime: (ms: number) => {
    jest.advanceTimersByTime(ms);
  },
  
  runAllTimers: () => {
    jest.runAllTimers();
  }
};

// Extend global type definitions
declare global {
  var unitTestUtils: {
    createMockLogger: () => any;
    createMockRepository: () => any;
    createMockEventPublisher: () => any;
    createMockHashingService: () => any;
    createMockUserFactory: () => any;
    mockConsole: () => void;
    mockDateNow: (mockDate: Date) => jest.SpyInstance;
    mockMathRandom: (value: number) => jest.SpyInstance;
  };
  
  var mockTimers: {
    useFakeTimers: () => void;
    useRealTimers: () => void;
    advanceTimersByTime: (ms: number) => void;
    runAllTimers: () => void;
  };
}