module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  displayName: 'Integration Tests',
  
  // Test patterns
  testMatch: [
    '**/tests/integration/**/*.spec.ts',
    '**/tests/integration/**/*.test.ts'
  ],
  
  // Setup and teardown
  setupFilesAfterEnv: [
    '<rootDir>/tests/setup.integration.ts'
  ],
  
  // Coverage configuration
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/**/index.ts',
    '!src/main.ts',
    '!src/**/*.interface.ts',
    '!src/**/*.config.ts',
    '!src/**/*.spec.ts',
    '!src/**/*.test.ts'
  ],
  
  coverageDirectory: 'coverage/integration',
  coverageReporters: ['text', 'lcov', 'html', 'json'],
  
  // Performance and resource management
  maxWorkers: '50%',
  testTimeout: 60000, // 1 minute timeout for integration tests
  
  // Module resolution
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@domain/(.*)$': '<rootDir>/src/domain/$1',
    '^@application/(.*)$': '<rootDir>/src/application/$1',
    '^@infrastructure/(.*)$': '<rootDir>/src/infrastructure/$1',
    '^@presentation/(.*)$': '<rootDir>/src/presentation/$1',
    '^@tests/(.*)$': '<rootDir>/tests/$1'
  },
  
  // Error handling
  bail: false,
  errorOnDeprecated: true,
  
  // Debugging and output
  verbose: true,
  silent: false,
  
  // Mock and test utilities
  clearMocks: true,
  restoreMocks: true,
  resetMocks: false, // Keep mocks between tests in integration environment
  
  // File extensions
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  
  // Transform configuration
  transform: {
    '^.+\\.ts$': 'ts-jest'
  },
  
  // Global variables for integration tests
  globals: {
    'ts-jest': {
      tsconfig: {
        target: 'es2020',
        module: 'commonjs',
        moduleResolution: 'node',
        esModuleInterop: true,
        allowSyntheticDefaultImports: true,
        experimentalDecorators: true,
        emitDecoratorMetadata: true,
        skipLibCheck: true,
        forceConsistentCasingInFileNames: true,
        resolveJsonModule: true
      }
    }
  },
  
  // Test categorization
  projects: [
    {
      displayName: 'Database Integration',
      testMatch: ['**/tests/integration/database/**/*.spec.ts'],
      setupFilesAfterEnv: ['<rootDir>/tests/setup.integration.ts']
    },
    {
      displayName: 'Security Integration',
      testMatch: ['**/tests/integration/security/**/*.spec.ts'],
      setupFilesAfterEnv: ['<rootDir>/tests/setup.integration.ts']
    },
    {
      displayName: 'Performance Integration',
      testMatch: ['**/tests/integration/performance/**/*.spec.ts'],
      setupFilesAfterEnv: ['<rootDir>/tests/setup.integration.ts'],
      testTimeout: 120000 // 2 minutes for performance tests
    },
    {
      displayName: 'End-to-End Integration',
      testMatch: ['**/tests/integration/e2e/**/*.spec.ts'],
      setupFilesAfterEnv: ['<rootDir>/tests/setup.integration.ts']
    },
    {
      displayName: 'Error Handling Integration',
      testMatch: ['**/tests/integration/error-handling/**/*.spec.ts'],
      setupFilesAfterEnv: ['<rootDir>/tests/setup.integration.ts']
    },
    {
      displayName: 'API Integration',
      testMatch: ['**/tests/integration/api/**/*.spec.ts'],
      setupFilesAfterEnv: ['<rootDir>/tests/setup.integration.ts']
    }
  ],
  
  // Reporter configuration
  reporters: [
    'default',
    [
      'jest-html-reporters',
      {
        publicPath: './coverage/integration',
        filename: 'integration-test-report.html',
        expand: true,
        hideIcon: false,
        pageTitle: 'Integration Test Report',
        customInfos: [
          {
            title: 'Test Environment',
            value: 'Integration Testing Environment'
          },
          {
            title: 'Database',
            value: process.env.DB_DATABASE || 'insightloop_test'
          },
          {
            title: 'Node Version',
            value: process.version
          }
        ]
      }
    ],
    [
      'jest-junit',
      {
        outputDirectory: './coverage/integration',
        outputName: 'junit-integration.xml',
        suiteName: 'Integration Tests'
      }
    ]
  ]
};