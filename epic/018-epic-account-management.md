# Epic 018: Account Management System

## Executive Summary

**Epic Title**: User Account Management System with Clean Architecture
**Business Value**: Enable user registration and authentication foundation for the platform
**Scope**: Backend API with PostgreSQL persistence, following Clean Architecture patterns
**Priority**: Critical (Foundation Epic)
**Estimated Effort**: 3-4 weeks
**Success Metrics**: 
- 100% test coverage for business logic
- API response time < 200ms
- Zero security vulnerabilities
- Complete API documentation

## Business Context

### Problem Statement
The platform requires a robust user account management system to enable user registration, authentication, and role-based access control. This forms the foundation for all user-centric features.

### Business Requirements
- Users must be able to create accounts with email and password
- Email addresses must be unique across the platform
- Support for different user roles (free, paid, admin, enterprise)
- Secure password handling and validation
- Account verification workflow ready

### Success Criteria
- Users can successfully register with valid information
- Email uniqueness is enforced at database level
- Passwords are securely hashed and stored
- Role-based permissions are properly assigned
- API follows RESTful conventions with proper error handling

## Domain Model

### Core Entities

#### User Aggregate
```typescript
// Domain Entity
class User extends Entity<UserId> {
  private constructor(
    id: UserId,
    private email: Email,
    private name: Name, 
    private password: HashedPassword,
    private role: UserRole,
    private status: UserStatus,
    private createdAt: Date,
    private updatedAt: Date
  ) {}

  // Business Rules
  public changeRole(newRole: UserRole, currentUserRole: UserRole): void {
    if (!this.canChangeRoleTo(newRole, currentUserRole)) {
      throw new InsufficientPermissionsException();
    }
    this.role = newRole;
    this.updatedAt = new Date();
  }

  public activate(): void {
    if (this.status === UserStatus.ACTIVE) {
      throw new UserAlreadyActiveException();
    }
    this.status = UserStatus.ACTIVE;
    this.updatedAt = new Date();
  }

  private canChangeRoleTo(newRole: UserRole, currentUserRole: UserRole): boolean {
    // Business logic for role change permissions
    return UserPermissions.canChangeRole(currentUserRole, this.role, newRole);
  }
}
```

#### Value Objects
```typescript
// Email Value Object
class Email extends ValueObject {
  constructor(private readonly value: string) {
    super();
    this.validate();
  }

  private validate(): void {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(this.value)) {
      throw new InvalidEmailException(this.value);
    }
  }

  getValue(): string {
    return this.value;
  }
}

// UserRole Value Object
enum UserRole {
  FREE = 'free',
  PAID = 'paid', 
  ADMIN = 'admin',
  ENTERPRISE = 'enterprise'
}

// HashedPassword Value Object
class HashedPassword extends ValueObject {
  constructor(private readonly hash: string) {
    super();
  }

  static async fromPlainText(plainPassword: string): Promise<HashedPassword> {
    const hash = await bcrypt.hash(plainPassword, 12);
    return new HashedPassword(hash);
  }

  async verify(plainPassword: string): Promise<boolean> {
    return bcrypt.compare(plainPassword, this.hash);
  }
}
```

### Domain Events
```typescript
class UserCreatedEvent extends DomainEvent {
  constructor(
    public readonly userId: string,
    public readonly email: string,
    public readonly name: string,
    public readonly role: UserRole,
    public readonly occurredOn: Date = new Date()
  ) {
    super('UserCreated');
  }
}

class UserRoleChangedEvent extends DomainEvent {
  constructor(
    public readonly userId: string,
    public readonly previousRole: UserRole,
    public readonly newRole: UserRole,
    public readonly changedBy: string,
    public readonly occurredOn: Date = new Date()
  ) {
    super('UserRoleChanged');
  }
}
```

### Repository Interfaces
```typescript
interface IUserRepository {
  findById(id: UserId): Promise<User | null>;
  findByEmail(email: Email): Promise<User | null>;
  save(user: User): Promise<void>;
  exists(email: Email): Promise<boolean>;
  findAll(criteria: UserSearchCriteria): Promise<User[]>;
  delete(id: UserId): Promise<void>;
}
```

## User Stories

### Epic User Stories

#### US-001: User Registration
**As a** new user
**I want to** create an account with my email and password
**So that** I can access the platform features

**Acceptance Criteria:**
- User provides name, email, password, and password confirmation
- Email must be valid format and unique
- Password must meet security requirements (min 8 chars, special chars, numbers)
- Password confirmation must match
- Default role is assigned as 'free'
- User receives success response with user ID
- UserCreatedEvent is published

**API Contract:**
```http
POST /api/v1/users/register
Content-Type: application/json

{
  "name": "John Doe",
  "email": "john@example.com", 
  "password": "SecurePass123!",
  "passwordConfirmation": "SecurePass123!"
}

Response 201:
{
  "success": true,
  "data": {
    "id": "uuid-here",
    "name": "John Doe",
    "email": "john@example.com",
    "role": "free",
    "status": "active",
    "createdAt": "2024-01-15T10:30:00Z"
  }
}
```

#### US-002: Email Uniqueness Validation
**As a** system administrator
**I want** email addresses to be unique across all users
**So that** each account is distinct and secure

**Acceptance Criteria:**
- Registration fails if email already exists
- Database constraint enforces uniqueness
- Clear error message for duplicate email
- Case-insensitive email comparison

#### US-003: Role-Based User Creation
**As an** administrator
**I want to** assign different roles during user creation
**So that** users have appropriate permissions

**Acceptance Criteria:**
- Support for free, paid, admin, enterprise roles
- Default role is 'free' if not specified
- Only admins can create admin/enterprise users
- Role validation against enum values

## Layer-by-Layer Implementation Plan

### 1. Domain Layer Implementation

#### Tasks:
- **TASK-001**: Create base Entity and ValueObject classes
- **TASK-002**: Implement User entity with business rules
- **TASK-003**: Create Email, Name, HashedPassword value objects
- **TASK-004**: Define UserRole enum and validation
- **TASK-005**: Create domain events (UserCreated, UserRoleChanged)
- **TASK-006**: Define repository interface (IUserRepository)
- **TASK-007**: Create domain exceptions hierarchy
- **TASK-008**: Implement domain services (UserPermissions)

**Files to Create:**
- `/Users/thiagobutignon/dev/insightloop-mcp-server-v2/src/domain/entities/shared/entity.base.ts`
- `/Users/thiagobutignon/dev/insightloop-mcp-server-v2/src/domain/entities/shared/value-object.base.ts`
- `/Users/thiagobutignon/dev/insightloop-mcp-server-v2/src/domain/entities/user/user.entity.ts`
- `/Users/thiagobutignon/dev/insightloop-mcp-server-v2/src/domain/entities/user/user.value-objects.ts`
- `/Users/thiagobutignon/dev/insightloop-mcp-server-v2/src/domain/entities/user/user.factory.ts`
- `/Users/thiagobutignon/dev/insightloop-mcp-server-v2/src/domain/repositories/user.repository.interface.ts`
- `/Users/thiagobutignon/dev/insightloop-mcp-server-v2/src/domain/events/user-created.event.ts`
- `/Users/thiagobutignon/dev/insightloop-mcp-server-v2/src/domain/exceptions/domain.exception.ts`

### 2. Application Layer Implementation

#### Tasks:
- **TASK-009**: Create CreateUser use case with DTOs
- **TASK-010**: Implement input validation schemas
- **TASK-011**: Create application services (AuthService)
- **TASK-012**: Define port interfaces (EmailPort, HashingPort)
- **TASK-013**: Implement DTO mappers (User domain to DTO)
- **TASK-014**: Create error handling middleware
- **TASK-015**: Add logging and monitoring decorators

**Files to Create:**
- `/Users/thiagobutignon/dev/insightloop-mcp-server-v2/src/application/use-cases/user/create-user/create-user.use-case.ts`
- `/Users/thiagobutignon/dev/insightloop-mcp-server-v2/src/application/use-cases/user/create-user/create-user.dto.ts`
- `/Users/thiagobutignon/dev/insightloop-mcp-server-v2/src/application/ports/output/hashing.port.ts`
- `/Users/thiagobutignon/dev/insightloop-mcp-server-v2/src/application/dto/mappers/user.mapper.ts`
- `/Users/thiagobutignon/dev/insightloop-mcp-server-v2/src/application/validators/user.validator.ts`

### 3. Infrastructure Layer Implementation

#### Tasks:
- **TASK-016**: Setup TypeORM configuration and connection
- **TASK-017**: Create User ORM entity with mappings
- **TASK-018**: Implement UserRepository with TypeORM
- **TASK-019**: Create database migrations for user table
- **TASK-020**: Implement BcryptHashingService
- **TASK-021**: Setup Redis caching for user lookups
- **TASK-022**: Configure environment variables
- **TASK-023**: Add database indexes for performance

**Files to Create:**
- `/Users/thiagobutignon/dev/insightloop-mcp-server-v2/src/infrastructure/database/typeorm/typeorm.config.ts`
- `/Users/thiagobutignon/dev/insightloop-mcp-server-v2/src/infrastructure/database/typeorm/entities/user.orm-entity.ts`
- `/Users/thiagobutignon/dev/insightloop-mcp-server-v2/src/infrastructure/database/typeorm/repositories/user.repository.ts`
- `/Users/thiagobutignon/dev/insightloop-mcp-server-v2/src/infrastructure/database/typeorm/migrations/001-create-users-table.ts`
- `/Users/thiagobutignon/dev/insightloop-mcp-server-v2/src/infrastructure/security/bcrypt/bcrypt.service.ts`

### 4. Presentation Layer Implementation

#### Tasks:
- **TASK-024**: Create UserController with registration endpoint
- **TASK-025**: Setup Express.js application and middleware
- **TASK-026**: Implement authentication middleware
- **TASK-027**: Add input validation middleware
- **TASK-028**: Create error handling middleware
- **TASK-029**: Setup Swagger/OpenAPI documentation
- **TASK-030**: Add rate limiting for registration endpoint
- **TASK-031**: Configure CORS and security headers

**Files to Create:**
- `/Users/thiagobutignon/dev/insightloop-mcp-server-v2/src/presentation/http/rest/controllers/user.controller.ts`
- `/Users/thiagobutignon/dev/insightloop-mcp-server-v2/src/presentation/http/rest/routes/user.routes.ts`
- `/Users/thiagobutignon/dev/insightloop-mcp-server-v2/src/presentation/http/rest/middlewares/validation.middleware.ts`
- `/Users/thiagobutignon/dev/insightloop-mcp-server-v2/src/presentation/http/rest/middlewares/error.middleware.ts`
- `/Users/thiagobutignon/dev/insightloop-mcp-server-v2/src/presentation/http/rest/swagger/swagger.config.ts`

## Agent Task Distribution

### Domain Entity Agent Tasks
- Implement User entity with business logic
- Create value objects (Email, Name, HashedPassword, UserRole)
- Define domain events and exceptions
- Create User factory for entity creation

### Use Case Agent Tasks
- Implement CreateUser use case
- Create DTOs and validation schemas
- Handle business rule validation
- Orchestrate domain services

### Repository Agent Tasks
- Implement IUserRepository interface
- Create TypeORM User repository
- Handle database operations and queries
- Implement caching strategies

### Controller Agent Tasks
- Create UserController with REST endpoints
- Implement request/response handling
- Add input validation and error handling
- Configure middleware and routing

### Database Agent Tasks
- Design user table schema
- Create database migrations
- Setup indexes and constraints
- Configure TypeORM relationships

### Security Agent Tasks
- Implement password hashing service
- Add authentication middleware
- Configure security headers and CORS
- Implement rate limiting

### Test Agent Tasks
- Create unit tests for domain entities
- Implement integration tests for use cases
- Add API endpoint tests
- Create test fixtures and helpers

### API Agent Tasks
- Design RESTful API endpoints
- Create OpenAPI/Swagger documentation
- Define error response formats
- Implement API versioning

## Technical Implementation Tasks

### Priority 1 (Critical - Week 1)
1. **Setup Project Infrastructure**
   - Initialize Node.js project with TypeScript
   - Configure ESLint, Prettier, Husky
   - Setup Jest testing framework
   - Configure environment variables

2. **Domain Layer Foundation**
   - Create base classes (Entity, ValueObject, DomainEvent)
   - Implement User entity with core business rules
   - Create value objects for Email, Password, UserRole
   - Define repository interface

3. **Database Setup**
   - Configure PostgreSQL connection
   - Setup TypeORM with User entity mapping
   - Create initial migration for users table
   - Add database constraints and indexes

### Priority 2 (High - Week 2)
4. **Application Layer Core**
   - Implement CreateUser use case
   - Create DTOs and mappers
   - Add input validation with Joi/Zod
   - Implement error handling

5. **Infrastructure Services**
   - Create password hashing service with bcrypt
   - Implement User repository with TypeORM
   - Setup caching layer with Redis
   - Configure logging with Winston

6. **Presentation Layer**
   - Create Express.js application setup
   - Implement UserController with registration endpoint
   - Add middleware for validation and error handling
   - Configure basic security headers

### Priority 3 (Medium - Week 3)
7. **API Documentation**
   - Setup Swagger/OpenAPI documentation
   - Document registration endpoint
   - Add response examples and error codes
   - Create Postman collection

8. **Security Enhancements**
   - Add rate limiting for registration
   - Implement CORS configuration
   - Add request sanitization
   - Setup helmet.js for security headers

9. **Monitoring and Observability**
   - Add structured logging
   - Implement health check endpoint
   - Setup basic metrics collection
   - Add request tracing

### Priority 4 (Low - Week 4)
10. **Performance Optimization**
    - Add database query optimization
    - Implement caching strategies
    - Setup database connection pooling
    - Add performance monitoring

11. **Testing Completion**
    - Achieve 100% unit test coverage
    - Add integration tests for API endpoints
    - Create end-to-end test scenarios
    - Setup test database isolation

12. **Production Readiness**
    - Add Docker containerization
    - Create production environment configuration
    - Setup database backup strategies
    - Add deployment scripts

## Comprehensive Testing Strategy

### Unit Tests (Domain Layer)
```typescript
// tests/unit/domain/entities/user/user.entity.spec.ts
describe('User Entity', () => {
  describe('creation', () => {
    it('should create user with valid data', () => {
      // Test user creation with valid inputs
    });

    it('should throw error for invalid email', () => {
      // Test email validation
    });

    it('should assign default role as free', () => {
      // Test default role assignment
    });
  });

  describe('business rules', () => {
    it('should allow role change by admin', () => {
      // Test role change permissions
    });

    it('should prevent unauthorized role changes', () => {
      // Test business rule enforcement
    });
  });
});
```

### Integration Tests (Application Layer)
```typescript
// tests/integration/application/use-cases/create-user.use-case.spec.ts
describe('CreateUser Use Case', () => {
  beforeEach(async () => {
    // Setup test database and dependencies
  });

  it('should create user successfully', async () => {
    // Test complete user creation flow
  });

  it('should reject duplicate email', async () => {
    // Test email uniqueness constraint
  });

  it('should publish UserCreated event', async () => {
    // Test event publishing
  });
});
```

### API Tests (End-to-End)
```typescript
// tests/e2e/api/user.e2e.spec.ts
describe('User Registration API', () => {
  it('POST /api/v1/users/register - should register new user', async () => {
    const response = await request(app)
      .post('/api/v1/users/register')
      .send({
        name: 'John Doe',
        email: 'john@example.com',
        password: 'SecurePass123!',
        passwordConfirmation: 'SecurePass123!'
      })
      .expect(201);

    expect(response.body.data.email).toBe('john@example.com');
    expect(response.body.data.role).toBe('free');
  });

  it('should return 400 for invalid email', async () => {
    // Test validation error handling
  });

  it('should return 409 for duplicate email', async () => {
    // Test conflict handling
  });
});
```

### Performance Tests
```typescript
// tests/performance/user-registration.perf.spec.ts
describe('User Registration Performance', () => {
  it('should handle 100 concurrent registrations', async () => {
    // Test concurrent user creation
  });

  it('should respond within 200ms', async () => {
    // Test response time requirements
  });
});
```

## Documentation Structure

### API Documentation (OpenAPI/Swagger)
```yaml
# swagger/user.yaml
paths:
  /api/v1/users/register:
    post:
      summary: Register new user
      tags: [Users]
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/CreateUserRequest'
      responses:
        '201':
          description: User created successfully
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/CreateUserResponse'
        '400':
          description: Validation error
        '409':
          description: Email already exists
```

### Technical Documentation
- **API.md**: Complete API reference with examples
- **DATABASE.md**: Database schema and migration guide
- **SECURITY.md**: Security considerations and best practices
- **DEPLOYMENT.md**: Deployment and configuration guide

## Risk Assessment and Mitigation

### Technical Risks
1. **Password Security Risk**
   - **Mitigation**: Use bcrypt with high salt rounds, implement password policy
   
2. **Database Performance Risk**
   - **Mitigation**: Add proper indexes, implement connection pooling, query optimization

3. **Email Uniqueness Race Condition**
   - **Mitigation**: Database unique constraint, proper error handling

### Business Risks
1. **User Experience Risk**
   - **Mitigation**: Clear error messages, comprehensive validation

2. **Scalability Risk**
   - **Mitigation**: Stateless design, caching, horizontal scaling preparation

## Dependencies and Prerequisites

### Technical Dependencies
- Node.js 20+
- TypeScript 5+
- PostgreSQL 15+
- Redis 7+ (for caching)
- Docker (for development)

### External Dependencies
```json
{
  "dependencies": {
    "express": "^4.18.2",
    "typeorm": "^0.3.17",
    "pg": "^8.11.3",
    "bcrypt": "^5.1.1",
    "joi": "^17.9.2",
    "winston": "^3.10.0",
    "redis": "^4.6.8",
    "helmet": "^7.0.0",
    "express-rate-limit": "^6.10.0",
    "swagger-jsdoc": "^6.2.8",
    "swagger-ui-express": "^5.0.0"
  },
  "devDependencies": {
    "@types/node": "^20.5.0",
    "@types/express": "^4.17.17",
    "@types/bcrypt": "^5.0.0",
    "@types/jest": "^29.5.4",
    "jest": "^29.6.2",
    "supertest": "^6.3.3",
    "ts-jest": "^29.1.1",
    "eslint": "^8.47.0",
    "prettier": "^3.0.2",
    "husky": "^8.0.3"
  }
}
```

## Success Metrics and KPIs

### Technical Metrics
- **Code Coverage**: 100% for domain layer, 90% overall
- **API Response Time**: P95 < 200ms for registration
- **Database Query Performance**: < 50ms for user lookups
- **Memory Usage**: < 100MB for baseline application

### Quality Metrics
- **Zero Critical Security Vulnerabilities**
- **ESLint Score**: 0 errors, 0 warnings
- **Type Coverage**: 100% TypeScript coverage
- **Documentation Coverage**: 100% public API documented

### Business Metrics
- **User Registration Success Rate**: > 95%
- **API Uptime**: > 99.9%
- **Error Rate**: < 0.1% for valid requests

## Future Enhancements

### Phase 2 Enhancements
- Email verification workflow
- User profile management
- Password reset functionality
- Account deactivation/deletion

### Phase 3 Enhancements
- Social login integration (OAuth)
- Multi-factor authentication
- Account linking and merging
- Advanced user analytics

### Architectural Evolution
- Event sourcing for complete audit trail
- CQRS for read/write separation
- Microservices decomposition
- GraphQL API layer

## Conclusion

This epic provides a comprehensive foundation for user account management following Clean Architecture principles. The implementation prioritizes security, scalability, and maintainability while ensuring complete test coverage and proper documentation.

The modular design enables easy extension and modification as business requirements evolve, while the agent-based task distribution ensures efficient development and clear ownership of components.

**Next Steps:**
1. Review and approve epic scope
2. Assign agents to respective tasks
3. Setup development environment
4. Begin Phase 1 implementation
5. Establish CI/CD pipeline
6. Monitor progress against success metrics