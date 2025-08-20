import { User } from '../../src/domain/entities/user/user.entity';
import { 
  Email, 
  Name, 
  HashedPassword, 
  UserRole, 
  UserStatus,
  UserRoleType,
  UserStatusType
} from '../../src/domain/entities/user/user.value-objects';

export class UserFixtures {
  /**
   * Creates a basic valid user for testing
   */
  static validUser(overrides: Partial<{
    email: string;
    name: string;
    password: string;
    role: UserRoleType;
    status: UserStatusType;
  }> = {}): User {
    return User.create(
      new Email(overrides.email || 'test@example.com'),
      new Name(overrides.name || 'Test User'),
      new HashedPassword(overrides.password || '$2b$12$validHashedPassword'),
      overrides.role ? new UserRole(overrides.role) : undefined,
      overrides.status ? new UserStatus(overrides.status) : undefined
    );
  }

  /**
   * Creates a user with admin role
   */
  static adminUser(overrides: Partial<{ email: string; name: string }> = {}): User {
    return this.validUser({
      ...overrides,
      role: UserRoleType.ADMIN
    });
  }

  /**
   * Creates a user with paid role
   */
  static paidUser(overrides: Partial<{ email: string; name: string }> = {}): User {
    return this.validUser({
      ...overrides,
      role: UserRoleType.PAID
    });
  }

  /**
   * Creates a user with enterprise role
   */
  static enterpriseUser(overrides: Partial<{ email: string; name: string }> = {}): User {
    return this.validUser({
      ...overrides,
      role: UserRoleType.ENTERPRISE
    });
  }

  /**
   * Creates an inactive user
   */
  static inactiveUser(overrides: Partial<{ email: string; name: string }> = {}): User {
    return this.validUser({
      ...overrides,
      status: UserStatusType.INACTIVE
    });
  }

  /**
   * Creates a suspended user
   */
  static suspendedUser(overrides: Partial<{ email: string; name: string }> = {}): User {
    return this.validUser({
      ...overrides,
      status: UserStatusType.SUSPENDED
    });
  }

  /**
   * Creates a user pending verification
   */
  static pendingVerificationUser(overrides: Partial<{ email: string; name: string }> = {}): User {
    return this.validUser({
      ...overrides,
      status: UserStatusType.PENDING_VERIFICATION
    });
  }

  /**
   * Creates multiple users with different roles
   */
  static usersWithDifferentRoles(): User[] {
    return [
      this.validUser({ email: 'free@example.com', name: 'Free User' }),
      this.paidUser({ email: 'paid@example.com', name: 'Paid User' }),
      this.enterpriseUser({ email: 'enterprise@example.com', name: 'Enterprise User' }),
      this.adminUser({ email: 'admin@example.com', name: 'Admin User' })
    ];
  }

  /**
   * Creates multiple users with different statuses
   */
  static usersWithDifferentStatuses(): User[] {
    return [
      this.validUser({ email: 'active@example.com', name: 'Active User' }),
      this.inactiveUser({ email: 'inactive@example.com', name: 'Inactive User' }),
      this.suspendedUser({ email: 'suspended@example.com', name: 'Suspended User' }),
      this.pendingVerificationUser({ email: 'pending@example.com', name: 'Pending User' })
    ];
  }

  /**
   * Creates a batch of users for performance testing
   */
  static performanceTestUsers(count: number): User[] {
    return Array(count).fill(null).map((_, index) => 
      this.validUser({
        email: `perf${index}@example.com`,
        name: `Performance User ${index}`
      })
    );
  }

  /**
   * Creates users with edge case names
   */
  static usersWithEdgeCaseNames(): User[] {
    return [
      this.validUser({ email: 'min@example.com', name: 'Jo' }), // Minimum length
      this.validUser({ email: 'max@example.com', name: 'A'.repeat(100) }), // Maximum length
      this.validUser({ email: 'unicode@example.com', name: 'José María García-López' }), // Unicode
      this.validUser({ email: 'apostrophe@example.com', name: "O'Connor" }), // Apostrophe
      this.validUser({ email: 'hyphen@example.com', name: 'Anne-Marie' }), // Hyphen
      this.validUser({ email: 'spaces@example.com', name: 'John Michael Smith' }) // Multiple spaces
    ];
  }

  /**
   * Creates users with edge case emails
   */
  static usersWithEdgeCaseEmails(): User[] {
    return [
      this.validUser({ email: 'simple@example.com', name: 'Simple Email' }),
      this.validUser({ email: 'with.dots@example.com', name: 'Dots Email' }),
      this.validUser({ email: 'with+plus@example.com', name: 'Plus Email' }),
      this.validUser({ email: 'subdomain@mail.example.com', name: 'Subdomain Email' }),
      this.validUser({ email: 'numbers123@example.com', name: 'Numbers Email' }),
      this.validUser({ email: 'dashes-allowed@example.com', name: 'Dashes Email' })
    ];
  }
}

/**
 * Test data builder for creating request payloads
 */
export class UserTestDataBuilder {
  private data: any = {
    name: 'Default User',
    email: 'default@example.com',
    password: 'SecurePass123!',
    passwordConfirmation: 'SecurePass123!'
  };

  static aUser(): UserTestDataBuilder {
    return new UserTestDataBuilder();
  }

  withName(name: string): this {
    this.data.name = name;
    return this;
  }

  withEmail(email: string): this {
    this.data.email = email;
    return this;
  }

  withPassword(password: string): this {
    this.data.password = password;
    this.data.passwordConfirmation = password; // Keep them matching by default
    return this;
  }

  withPasswordConfirmation(passwordConfirmation: string): this {
    this.data.passwordConfirmation = passwordConfirmation;
    return this;
  }

  withMismatchedPasswords(): this {
    this.data.passwordConfirmation = 'DifferentPassword123!';
    return this;
  }

  withInvalidEmail(): this {
    this.data.email = 'invalid-email-format';
    return this;
  }

  withWeakPassword(): this {
    this.data.password = 'weak';
    this.data.passwordConfirmation = 'weak';
    return this;
  }

  withEmptyName(): this {
    this.data.name = '';
    return this;
  }

  withLongName(): this {
    this.data.name = 'A'.repeat(101); // Exceeds maximum length
    return this;
  }

  withUnicodeCharacters(): this {
    this.data.name = '测试用户 José María 🎉';
    this.data.email = 'unicode@测试.com';
    return this;
  }

  withSqlInjectionAttempt(): this {
    this.data.name = "'; DROP TABLE users; --";
    this.data.email = "admin'; DELETE FROM users; --@example.com";
    return this;
  }

  withXssAttempt(): this {
    this.data.name = '<script>alert("xss")</script>';
    this.data.email = '<script>alert("xss")</script>@example.com';
    return this;
  }

  withExtremelyLongFields(): this {
    this.data.name = 'A'.repeat(10000);
    this.data.email = 'B'.repeat(1000) + '@example.com';
    this.data.password = 'C'.repeat(10000);
    this.data.passwordConfirmation = 'D'.repeat(10000);
    return this;
  }

  build(): any {
    return { ...this.data };
  }

  buildMultiple(count: number, emailPrefix = 'test'): any[] {
    return Array(count).fill(null).map((_, index) => ({
      ...this.data,
      email: `${emailPrefix}${index}@example.com`,
      name: `${this.data.name} ${index}`
    }));
  }
}

/**
 * Response validation helpers
 */
export class ResponseValidators {
  static validateSuccessfulRegistration(response: any): void {
    expect(response.status).toBe(201);
    expect(response.body).toMatchObject({
      success: true,
      data: {
        id: expect.any(String),
        name: expect.any(String),
        email: expect.any(String),
        role: expect.any(String),
        status: expect.any(String),
        createdAt: expect.any(String),
        updatedAt: expect.any(String)
      }
    });

    // Security validations
    expect(response.body.data.password).toBeUndefined();
    expect(response.body.data.passwordHash).toBeUndefined();
    expect(response.body.data.passwordConfirmation).toBeUndefined();
  }

  static validateValidationError(response: any, expectedFields: string[] = []): void {
    expect(response.status).toBe(400);
    expect(response.body).toMatchObject({
      success: false,
      error: {
        type: 'ValidationError',
        code: 'VALIDATION_ERROR',
        message: expect.any(String),
        details: expect.any(Array)
      }
    });

    if (expectedFields.length > 0) {
      const errorFields = response.body.error.details.map((detail: any) => detail.field);
      expectedFields.forEach(field => {
        expect(errorFields).toContain(field);
      });
    }
  }

  static validateConflictError(response: any): void {
    expect(response.status).toBe(409);
    expect(response.body).toMatchObject({
      success: false,
      error: {
        type: 'UserAlreadyExistsException',
        code: 'USER_ALREADY_EXISTS',
        message: expect.any(String)
      }
    });
  }

  static validateRateLimitError(response: any): void {
    expect(response.status).toBe(429);
    expect(response.body).toMatchObject({
      success: false,
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: expect.any(String)
      }
    });

    // Rate limit headers should be present
    expect(response.headers['x-ratelimit-limit']).toBeDefined();
    expect(response.headers['x-ratelimit-remaining']).toBeDefined();
  }

  static validateSecurityHeaders(response: any): void {
    const requiredHeaders = [
      'x-content-type-options',
      'x-frame-options',
      'strict-transport-security',
      'content-security-policy'
    ];

    requiredHeaders.forEach(header => {
      expect(response.headers[header]).toBeDefined();
    });
  }
}

/**
 * Database test helpers
 */
export class DatabaseTestHelpers {
  static async clearUserTable(dataSource: any): Promise<void> {
    await dataSource.getRepository('UserOrmEntity').clear();
  }

  static async getUserCount(dataSource: any): Promise<number> {
    return await dataSource.getRepository('UserOrmEntity').count();
  }

  static async findUserByEmail(dataSource: any, email: string): Promise<any> {
    return await dataSource.getRepository('UserOrmEntity').findOne({
      where: { email }
    });
  }

  static async createTestUsersInBatches(
    dataSource: any, 
    users: any[], 
    batchSize: number = 50
  ): Promise<void> {
    const repository = dataSource.getRepository('UserOrmEntity');
    
    for (let i = 0; i < users.length; i += batchSize) {
      const batch = users.slice(i, i + batchSize);
      await repository.save(batch);
    }
  }
}

/**
 * Performance measurement helpers
 */
export class PerformanceTestHelpers {
  static measureExecutionTime<T>(operation: () => Promise<T>): Promise<{ result: T; duration: number }> {
    const startTime = Date.now();
    return operation().then(result => ({
      result,
      duration: Date.now() - startTime
    }));
  }

  static async measureConcurrentOperations<T>(
    operations: (() => Promise<T>)[],
    concurrency: number = 10
  ): Promise<{ results: T[]; totalDuration: number; averageDuration: number }> {
    const startTime = Date.now();
    const results: T[] = [];
    
    // Execute operations in batches
    for (let i = 0; i < operations.length; i += concurrency) {
      const batch = operations.slice(i, i + concurrency);
      const batchResults = await Promise.all(batch.map(op => op()));
      results.push(...batchResults);
    }
    
    const totalDuration = Date.now() - startTime;
    const averageDuration = totalDuration / operations.length;
    
    return { results, totalDuration, averageDuration };
  }

  static logPerformanceMetrics(
    testName: string,
    metrics: {
      totalRequests: number;
      successful: number;
      failed: number;
      totalDuration: number;
      averageDuration: number;
      requestsPerSecond: number;
    }
  ): void {
    console.log(`
📊 Performance Metrics for ${testName}:
   ├── Total Requests: ${metrics.totalRequests}
   ├── Successful: ${metrics.successful} (${((metrics.successful / metrics.totalRequests) * 100).toFixed(1)}%)
   ├── Failed: ${metrics.failed} (${((metrics.failed / metrics.totalRequests) * 100).toFixed(1)}%)
   ├── Total Duration: ${metrics.totalDuration}ms
   ├── Average Duration: ${metrics.averageDuration.toFixed(2)}ms
   └── Requests/Second: ${metrics.requestsPerSecond.toFixed(2)}
    `);
  }
}

/**
 * Memory usage helpers for detecting leaks
 */
export class MemoryTestHelpers {
  static takeMemorySnapshot(): NodeJS.MemoryUsage {
    if (global.gc) {
      global.gc();
    }
    return process.memoryUsage();
  }

  static calculateMemoryGrowth(initial: NodeJS.MemoryUsage, final: NodeJS.MemoryUsage): {
    heapUsedGrowth: number;
    heapTotalGrowth: number;
    rssGrowth: number;
    percentageGrowth: number;
  } {
    return {
      heapUsedGrowth: final.heapUsed - initial.heapUsed,
      heapTotalGrowth: final.heapTotal - initial.heapTotal,
      rssGrowth: final.rss - initial.rss,
      percentageGrowth: ((final.heapUsed - initial.heapUsed) / initial.heapUsed) * 100
    };
  }

  static formatMemoryUsage(memory: NodeJS.MemoryUsage): string {
    const formatMB = (bytes: number) => `${(bytes / 1024 / 1024).toFixed(2)}MB`;
    
    return `
Memory Usage:
├── RSS: ${formatMB(memory.rss)}
├── Heap Total: ${formatMB(memory.heapTotal)}
├── Heap Used: ${formatMB(memory.heapUsed)}
└── External: ${formatMB(memory.external)}
    `;
  }
}