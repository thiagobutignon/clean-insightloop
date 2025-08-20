import { CreateUserUseCase } from '../../../../src/application/use-cases/user/create-user/create-user.use-case';
import { 
  CreateUserCommand, 
  CreateUserDtoMapper, 
  isCreateUserErrorResponse 
} from '../../../../src/application/use-cases/user/create-user/create-user.dto';
import { UserRepository } from '../../../../src/domain/repositories/user.repository.interface';
import { UserFactory } from '../../../../src/domain/entities/user/user.factory';
import { DomainEventPublisher } from '../../../../src/application/ports/output/domain-event-publisher.port';
import { LoggerPort } from '../../../../src/application/ports/output/logger.port';
import { User } from '../../../../src/domain/entities/user/user.entity';
import { 
  Email, 
  Name, 
  HashedPassword, 
  UserRole, 
  UserRoleType 
} from '../../../../src/domain/entities/user/user.value-objects';
import { UserAlreadyExistsException } from '../../../../src/domain/exceptions/domain.exception';

describe('CreateUserUseCase', () => {
  let useCase: CreateUserUseCase;
  let mockUserRepository: jest.Mocked<UserRepository>;
  let mockUserFactory: jest.Mocked<UserFactory>;
  let mockEventPublisher: jest.Mocked<DomainEventPublisher>;
  let mockLogger: jest.Mocked<LoggerPort>;

  beforeEach(() => {
    // Create mocks
    mockUserRepository = {
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
    };

    mockUserFactory = {
      createUser: jest.fn(),
      createRegistrationUser: jest.fn(),
      createAdminUser: jest.fn(),
      createUserWithVerification: jest.fn(),
      createUsers: jest.fn()
    } as any;

    mockEventPublisher = {
      publish: jest.fn(),
      publishAll: jest.fn(),
      subscribe: jest.fn(),
      unsubscribe: jest.fn()
    };

    mockLogger = {
      error: jest.fn(),
      warn: jest.fn(),
      info: jest.fn(),
      debug: jest.fn(),
      log: jest.fn(),
      child: jest.fn()
    };

    // Create use case instance
    useCase = new CreateUserUseCase({
      userRepository: mockUserRepository,
      userFactory: mockUserFactory,
      domainEventPublisher: mockEventPublisher,
      logger: mockLogger
    });
  });

  describe('Successful User Creation', () => {
    it('should create user successfully with valid data', async () => {
      // Arrange
      const command: CreateUserCommand = {
        name: 'John Doe',
        email: 'john@example.com',
        password: 'SecurePass123!',
        passwordConfirmation: 'SecurePass123!',
        role: UserRoleType.FREE
      };

      const mockUser = User.create(
        new Email('john@example.com'),
        new Name('John Doe'),
        new HashedPassword('$2b$12$hashedpassword'),
        UserRole.free()
      );

      mockUserFactory.createUser.mockResolvedValue(mockUser);
      mockUserRepository.save.mockResolvedValue();
      mockEventPublisher.publish.mockResolvedValue();

      // Act
      const result = await useCase.execute(command, 'test-request-id');

      // Assert
      expect(result.success).toBe(true);
      if (!isCreateUserErrorResponse(result)) {
        expect(result.data.email).toBe('john@example.com');
        expect(result.data.name).toBe('John Doe');
        expect(result.data.role).toBe(UserRoleType.FREE);
      }

      expect(mockUserFactory.createUser).toHaveBeenCalledWith({
        email: command.email,
        name: command.name,
        password: command.password,
        role: command.role
      });
      expect(mockUserRepository.save).toHaveBeenCalledWith(mockUser);
      expect(mockEventPublisher.publish).toHaveBeenCalled();
      expect(mockLogger.info).toHaveBeenCalledWith(
        'User created successfully',
        expect.objectContaining({
          requestId: 'test-request-id',
          userId: mockUser.id.getValue(),
          email: 'john@example.com'
        })
      );
    });

    it('should create user with default role when not specified', async () => {
      // Arrange
      const command: CreateUserCommand = {
        name: 'John Doe',
        email: 'john@example.com',
        password: 'SecurePass123!',
        passwordConfirmation: 'SecurePass123!'
        // role not specified
      };

      const mockUser = User.create(
        new Email('john@example.com'),
        new Name('John Doe'),
        new HashedPassword('$2b$12$hashedpassword'),
        UserRole.free()
      );

      mockUserFactory.createUser.mockResolvedValue(mockUser);
      mockUserRepository.save.mockResolvedValue();
      mockEventPublisher.publish.mockResolvedValue();

      // Act
      const result = await useCase.execute(command);

      // Assert
      expect(result.success).toBe(true);
      expect(mockUserFactory.createUser).toHaveBeenCalledWith(
        expect.objectContaining({
          role: UserRoleType.FREE
        })
      );
    });

    it('should publish domain events after user creation', async () => {
      // Arrange
      const command: CreateUserCommand = {
        name: 'John Doe',
        email: 'john@example.com',
        password: 'SecurePass123!',
        passwordConfirmation: 'SecurePass123!'
      };

      const mockUser = User.create(
        new Email('john@example.com'),
        new Name('John Doe'),
        new HashedPassword('$2b$12$hashedpassword')
      );

      mockUserFactory.createUser.mockResolvedValue(mockUser);
      mockUserRepository.save.mockResolvedValue();
      mockEventPublisher.publish.mockResolvedValue();

      // Act
      await useCase.execute(command);

      // Assert
      expect(mockEventPublisher.publish).toHaveBeenCalledTimes(1);
      expect(mockUser.domainEvents).toHaveLength(0); // Events should be cleared after publishing
    });
  });

  describe('Validation Errors', () => {
    it('should return validation error for empty name', async () => {
      // Arrange
      const command: CreateUserCommand = {
        name: '',
        email: 'john@example.com',
        password: 'SecurePass123!',
        passwordConfirmation: 'SecurePass123!'
      };

      // Act
      const result = await useCase.execute(command);

      // Assert
      expect(result.success).toBe(false);
      if (isCreateUserErrorResponse(result)) {
        expect(result.error.code).toBe('VALIDATION_ERROR');
        expect(result.error.details).toContainEqual(
          expect.objectContaining({
            field: 'name',
            code: 'FIELD_REQUIRED'
          })
        );
      }

      expect(mockUserFactory.createUser).not.toHaveBeenCalled();
      expect(mockUserRepository.save).not.toHaveBeenCalled();
    });

    it('should return validation error for invalid email', async () => {
      // Arrange
      const command: CreateUserCommand = {
        name: 'John Doe',
        email: 'invalid-email',
        password: 'SecurePass123!',
        passwordConfirmation: 'SecurePass123!'
      };

      // Act
      const result = await useCase.execute(command);

      // Assert
      expect(result.success).toBe(false);
      if (isCreateUserErrorResponse(result)) {
        expect(result.error.details).toContainEqual(
          expect.objectContaining({
            field: 'email',
            code: 'FIELD_INVALID_FORMAT'
          })
        );
      }
    });

    it('should return validation error for weak password', async () => {
      // Arrange
      const command: CreateUserCommand = {
        name: 'John Doe',
        email: 'john@example.com',
        password: 'weak',
        passwordConfirmation: 'weak'
      };

      // Act
      const result = await useCase.execute(command);

      // Assert
      expect(result.success).toBe(false);
      if (isCreateUserErrorResponse(result)) {
        expect(result.error.details).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              field: 'password',
              code: 'PASSWORD_TOO_SHORT'
            })
          ])
        );
      }
    });

    it('should return validation error for password mismatch', async () => {
      // Arrange
      const command: CreateUserCommand = {
        name: 'John Doe',
        email: 'john@example.com',
        password: 'SecurePass123!',
        passwordConfirmation: 'DifferentPass123!'
      };

      // Act
      const result = await useCase.execute(command);

      // Assert
      expect(result.success).toBe(false);
      if (isCreateUserErrorResponse(result)) {
        expect(result.error.details).toContainEqual(
          expect.objectContaining({
            field: 'passwordConfirmation',
            code: 'FIELD_MISMATCH'
          })
        );
      }
    });

    it('should return multiple validation errors', async () => {
      // Arrange
      const command: CreateUserCommand = {
        name: '',
        email: 'invalid-email',
        password: 'weak',
        passwordConfirmation: 'different'
      };

      // Act
      const result = await useCase.execute(command);

      // Assert
      expect(result.success).toBe(false);
      if (isCreateUserErrorResponse(result)) {
        expect(result.error.details!.length).toBeGreaterThan(1);
        expect(result.error.details).toEqual(
          expect.arrayContaining([
            expect.objectContaining({ field: 'name' }),
            expect.objectContaining({ field: 'email' }),
            expect.objectContaining({ field: 'password' }),
            expect.objectContaining({ field: 'passwordConfirmation' })
          ])
        );
      }
    });
  });

  describe('Business Logic Errors', () => {
    it('should handle user already exists error', async () => {
      // Arrange
      const command: CreateUserCommand = {
        name: 'John Doe',
        email: 'john@example.com',
        password: 'SecurePass123!',
        passwordConfirmation: 'SecurePass123!'
      };

      mockUserFactory.createUser.mockRejectedValue(
        new UserAlreadyExistsException('john@example.com')
      );

      // Act
      const result = await useCase.execute(command, 'test-request-id');

      // Assert
      expect(result.success).toBe(false);
      if (isCreateUserErrorResponse(result)) {
        expect(result.error.type).toBe('UserAlreadyExistsException');
        expect(result.error.code).toBe('USER_ALREADY_EXISTS');
      }

      expect(mockUserRepository.save).not.toHaveBeenCalled();
      expect(mockEventPublisher.publish).not.toHaveBeenCalled();
      expect(mockLogger.error).toHaveBeenCalled();
    });
  });

  describe('System Errors', () => {
    it('should handle repository save error', async () => {
      // Arrange
      const command: CreateUserCommand = {
        name: 'John Doe',
        email: 'john@example.com',
        password: 'SecurePass123!',
        passwordConfirmation: 'SecurePass123!'
      };

      const mockUser = User.create(
        new Email('john@example.com'),
        new Name('John Doe'),
        new HashedPassword('$2b$12$hashedpassword')
      );

      mockUserFactory.createUser.mockResolvedValue(mockUser);
      mockUserRepository.save.mockRejectedValue(new Error('Database connection failed'));

      // Act
      const result = await useCase.execute(command, 'test-request-id');

      // Assert
      expect(result.success).toBe(false);
      if (isCreateUserErrorResponse(result)) {
        expect(result.error.type).toBe('Error');
        expect(result.error.message).toBe('Database connection failed');
      }

      expect(mockEventPublisher.publish).not.toHaveBeenCalled();
      expect(mockLogger.error).toHaveBeenCalledWith(
        'User creation failed',
        expect.objectContaining({
          requestId: 'test-request-id',
          error: 'Database connection failed'
        })
      );
    });

    it('should handle event publishing error gracefully', async () => {
      // Arrange
      const command: CreateUserCommand = {
        name: 'John Doe',
        email: 'john@example.com',
        password: 'SecurePass123!',
        passwordConfirmation: 'SecurePass123!'
      };

      const mockUser = User.create(
        new Email('john@example.com'),
        new Name('John Doe'),
        new HashedPassword('$2b$12$hashedpassword')
      );

      mockUserFactory.createUser.mockResolvedValue(mockUser);
      mockUserRepository.save.mockResolvedValue();
      mockEventPublisher.publish.mockRejectedValue(new Error('Event bus error'));

      // Act
      const result = await useCase.execute(command);

      // Assert
      expect(result.success).toBe(false);
      if (isCreateUserErrorResponse(result)) {
        expect(result.error.message).toBe('Event bus error');
      }

      expect(mockUserRepository.save).toHaveBeenCalled(); // User should still be saved
      expect(mockLogger.error).toHaveBeenCalled();
    });
  });

  describe('Logging', () => {
    it('should log start of user creation process', async () => {
      // Arrange
      const command: CreateUserCommand = {
        name: 'John Doe',
        email: 'john@example.com',
        password: 'SecurePass123!',
        passwordConfirmation: 'SecurePass123!'
      };

      const mockUser = User.create(
        new Email('john@example.com'),
        new Name('John Doe'),
        new HashedPassword('$2b$12$hashedpassword')
      );

      mockUserFactory.createUser.mockResolvedValue(mockUser);
      mockUserRepository.save.mockResolvedValue();
      mockEventPublisher.publish.mockResolvedValue();

      // Act
      await useCase.execute(command, 'test-request-id');

      // Assert
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Starting user creation process',
        expect.objectContaining({
          requestId: 'test-request-id',
          email: 'john@example.com',
          name: 'John Doe'
        })
      );
    });

    it('should log validation failures', async () => {
      // Arrange
      const command: CreateUserCommand = {
        name: '',
        email: 'john@example.com',
        password: 'SecurePass123!',
        passwordConfirmation: 'SecurePass123!'
      };

      // Act
      await useCase.execute(command, 'test-request-id');

      // Assert
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'User creation validation failed',
        expect.objectContaining({
          requestId: 'test-request-id',
          email: 'john@example.com',
          errors: expect.any(Array)
        })
      );
    });
  });

  describe('Edge Cases', () => {
    it('should handle missing request ID gracefully', async () => {
      // Arrange
      const command: CreateUserCommand = {
        name: 'John Doe',
        email: 'john@example.com',
        password: 'SecurePass123!',
        passwordConfirmation: 'SecurePass123!'
      };

      const mockUser = User.create(
        new Email('john@example.com'),
        new Name('John Doe'),
        new HashedPassword('$2b$12$hashedpassword')
      );

      mockUserFactory.createUser.mockResolvedValue(mockUser);
      mockUserRepository.save.mockResolvedValue();
      mockEventPublisher.publish.mockResolvedValue();

      // Act
      const result = await useCase.execute(command); // No request ID

      // Assert
      expect(result.success).toBe(true);
      // Should still work without request ID
    });

    it('should trim and normalize input data', async () => {
      // Arrange
      const command: CreateUserCommand = {
        name: '  John Doe  ',
        email: '  JOHN@EXAMPLE.COM  ',
        password: 'SecurePass123!',
        passwordConfirmation: 'SecurePass123!'
      };

      // Mock validation to pass
      const mockUser = User.create(
        new Email('john@example.com'),
        new Name('John Doe'),
        new HashedPassword('$2b$12$hashedpassword')
      );

      mockUserFactory.createUser.mockResolvedValue(mockUser);
      mockUserRepository.save.mockResolvedValue();
      mockEventPublisher.publish.mockResolvedValue();

      // Act
      const result = await useCase.execute(command);

      // Assert
      expect(result.success).toBe(true);
      // The factory should receive normalized data
      expect(mockUserFactory.createUser).toHaveBeenCalledWith(
        expect.objectContaining({
          email: 'john@example.com', // lowercase
          name: 'John Doe' // trimmed
        })
      );
    });
  });
});