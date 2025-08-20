import { User } from '../../../../domain/entities/user/user.entity';
import { UserFactory } from '../../../../domain/entities/user/user.factory';
import { UserRepository } from '../../../../domain/repositories/user.repository.interface';
import { DomainEventPublisher } from '../../../ports/output/domain-event-publisher.port';
import { LoggerPort } from '../../../ports/output/logger.port';
import { 
  CreateUserCommand, 
  CreateUserResult, 
  CreateUserDtoMapper,
  ValidationErrorDto 
} from './create-user.dto';
import { 
  UserAlreadyExistsException,
  InvalidEmailException,
  InvalidPasswordException,
  InvalidNameException
} from '../../../../domain/exceptions/domain.exception';

export interface CreateUserDependencies {
  userRepository: UserRepository;
  userFactory: UserFactory;
  domainEventPublisher: DomainEventPublisher;
  logger: LoggerPort;
}

export class CreateUserUseCase {
  constructor(private readonly dependencies: CreateUserDependencies) {}

  async execute(command: CreateUserCommand, requestId?: string): Promise<CreateUserResult> {
    const { userRepository, userFactory, domainEventPublisher, logger } = this.dependencies;

    try {
      logger.info('Starting user creation process', {
        requestId,
        email: command.email,
        name: command.name,
        role: command.role
      });

      // Validate input
      const validationErrors = this.validateCommand(command);
      if (validationErrors.length > 0) {
        logger.warn('User creation validation failed', {
          requestId,
          email: command.email,
          errors: validationErrors
        });
        
        return CreateUserDtoMapper.toErrorResponse(
          new Error('Validation failed'),
          requestId,
          validationErrors
        );
      }

      // Create user through factory
      const user = await userFactory.createUser({
        email: command.email,
        name: command.name,
        password: command.password,
        role: command.role
      });

      // Save user to repository
      await userRepository.save(user);

      // Publish domain events
      await this.publishDomainEvents(user);

      logger.info('User created successfully', {
        requestId,
        userId: user.id.getValue(),
        email: user.email.getValue(),
        role: user.role.getValue()
      });

      return CreateUserDtoMapper.toSuccessResponse(user);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;
      
      logger.error('User creation failed', {
        requestId,
        email: command.email,
        error: errorMessage,
        stack: errorStack
      });

      return CreateUserDtoMapper.toErrorResponse(error as Error, requestId);
    }
  }

  private validateCommand(command: CreateUserCommand): ValidationErrorDto[] {
    const errors: ValidationErrorDto[] = [];

    // Validate name
    try {
      if (!command.name || command.name.trim() === '') {
        errors.push({
          field: 'name',
          message: 'Name is required',
          code: 'FIELD_REQUIRED'
        });
      } else if (command.name.trim().length < 2) {
        errors.push({
          field: 'name',
          message: 'Name must be at least 2 characters long',
          code: 'FIELD_TOO_SHORT'
        });
      } else if (command.name.trim().length > 100) {
        errors.push({
          field: 'name',
          message: 'Name cannot be longer than 100 characters',
          code: 'FIELD_TOO_LONG'
        });
      }
    } catch (error) {
      errors.push({
        field: 'name',
        message: error instanceof Error ? error.message : 'Invalid name',
        code: 'FIELD_INVALID'
      });
    }

    // Validate email
    try {
      if (!command.email || command.email.trim() === '') {
        errors.push({
          field: 'email',
          message: 'Email is required',
          code: 'FIELD_REQUIRED'
        });
      } else {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(command.email)) {
          errors.push({
            field: 'email',
            message: 'Invalid email format',
            code: 'FIELD_INVALID_FORMAT'
          });
        }
      }
    } catch (error) {
      errors.push({
        field: 'email',
        message: error instanceof Error ? error.message : 'Invalid email',
        code: 'FIELD_INVALID'
      });
    }

    // Validate password
    try {
      if (!command.password) {
        errors.push({
          field: 'password',
          message: 'Password is required',
          code: 'FIELD_REQUIRED'
        });
      } else {
        const passwordErrors = this.validatePassword(command.password);
        errors.push(...passwordErrors);
      }
    } catch (error) {
      errors.push({
        field: 'password',
        message: error instanceof Error ? error.message : 'Invalid password',
        code: 'FIELD_INVALID'
      });
    }

    // Validate password confirmation
    if (!command.passwordConfirmation) {
      errors.push({
        field: 'passwordConfirmation',
        message: 'Password confirmation is required',
        code: 'FIELD_REQUIRED'
      });
    } else if (command.password !== command.passwordConfirmation) {
      errors.push({
        field: 'passwordConfirmation',
        message: 'Passwords do not match',
        code: 'FIELD_MISMATCH'
      });
    }

    // Validate role if provided
    if (command.role) {
      const validRoles = ['free', 'paid', 'admin', 'enterprise'];
      if (!validRoles.includes(command.role)) {
        errors.push({
          field: 'role',
          message: 'Invalid role specified',
          code: 'FIELD_INVALID_VALUE'
        });
      }
    }

    return errors;
  }

  private validatePassword(password: string): ValidationErrorDto[] {
    const errors: ValidationErrorDto[] = [];

    if (password.length < 8) {
      errors.push({
        field: 'password',
        message: 'Password must be at least 8 characters long',
        code: 'PASSWORD_TOO_SHORT'
      });
    }

    if (password.length > 128) {
      errors.push({
        field: 'password',
        message: 'Password cannot be longer than 128 characters',
        code: 'PASSWORD_TOO_LONG'
      });
    }

    if (!/[A-Z]/.test(password)) {
      errors.push({
        field: 'password',
        message: 'Password must contain at least one uppercase letter',
        code: 'PASSWORD_MISSING_UPPERCASE'
      });
    }

    if (!/[a-z]/.test(password)) {
      errors.push({
        field: 'password',
        message: 'Password must contain at least one lowercase letter',
        code: 'PASSWORD_MISSING_LOWERCASE'
      });
    }

    if (!/\d/.test(password)) {
      errors.push({
        field: 'password',
        message: 'Password must contain at least one number',
        code: 'PASSWORD_MISSING_NUMBER'
      });
    }

    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
      errors.push({
        field: 'password',
        message: 'Password must contain at least one special character',
        code: 'PASSWORD_MISSING_SPECIAL'
      });
    }

    return errors;
  }

  private async publishDomainEvents(user: User): Promise<void> {
    const { domainEventPublisher } = this.dependencies;
    
    const events = user.domainEvents;
    for (const event of events) {
      await domainEventPublisher.publish(event);
    }
    
    user.clearEvents();
  }
}

// Use case factory for dependency injection
export class CreateUserUseCaseFactory {
  static create(dependencies: CreateUserDependencies): CreateUserUseCase {
    return new CreateUserUseCase(dependencies);
  }
}