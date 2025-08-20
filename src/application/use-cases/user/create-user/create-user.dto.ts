import { UserRoleType, UserStatusType } from '../../../../domain/entities/user/user.value-objects';

// Input DTOs
export interface CreateUserCommand {
  name: string;
  email: string;
  password: string;
  passwordConfirmation: string;
  role?: UserRoleType;
}

export interface CreateUserRequest {
  name: string;
  email: string;
  password: string;
  passwordConfirmation: string;
  role?: UserRoleType;
  // Request metadata
  ipAddress?: string;
  userAgent?: string;
  requestId?: string;
}

// Output DTOs
export interface UserResponseDto {
  id: string;
  name: string;
  email: string;
  role: UserRoleType;
  status: UserStatusType;
  createdAt: string;
  updatedAt: string;
}

export interface CreateUserResponse {
  success: boolean;
  data: UserResponseDto;
  message?: string;
}

// Error DTOs
export interface ValidationErrorDto {
  field: string;
  message: string;
  code: string;
}

export interface CreateUserErrorResponse {
  success: false;
  error: {
    type: string;
    message: string;
    code: string;
    details?: ValidationErrorDto[];
  };
  requestId?: string;
}

// Success response type
export type CreateUserResult = CreateUserResponse | CreateUserErrorResponse;

// Validation schemas (for use with Joi or similar)
export const CreateUserValidationRules = {
  name: {
    required: true,
    minLength: 2,
    maxLength: 100,
    pattern: /^[a-zA-ZÀ-ÿ\s\-']+$/,
    message: 'Name must be 2-100 characters long and contain only letters, spaces, hyphens, and apostrophes'
  },
  email: {
    required: true,
    maxLength: 320,
    pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    message: 'Please provide a valid email address'
  },
  password: {
    required: true,
    minLength: 8,
    maxLength: 128,
    patterns: {
      uppercase: /[A-Z]/,
      lowercase: /[a-z]/,
      number: /\d/,
      special: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/
    },
    message: 'Password must be 8-128 characters long and contain at least one uppercase letter, one lowercase letter, one number, and one special character'
  },
  passwordConfirmation: {
    required: true,
    mustMatch: 'password',
    message: 'Password confirmation must match password'
  },
  role: {
    required: false,
    enum: Object.values(UserRoleType),
    message: 'Role must be one of: free, paid, admin, enterprise'
  }
};

// Helper functions for DTO creation
export class CreateUserDtoMapper {
  static toUserResponseDto(user: any): UserResponseDto {
    return {
      id: user.id.getValue(),
      name: user.name.getValue(),
      email: user.email.getValue(),
      role: user.role.getValue(),
      status: user.status.getValue(),
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString()
    };
  }

  static toSuccessResponse(user: any): CreateUserResponse {
    return {
      success: true,
      data: this.toUserResponseDto(user),
      message: 'User created successfully'
    };
  }

  static toErrorResponse(
    error: Error, 
    requestId?: string, 
    validationErrors?: ValidationErrorDto[]
  ): CreateUserErrorResponse {
    return {
      success: false,
      error: {
        type: error.constructor.name,
        message: error.message,
        code: this.getErrorCode(error),
        details: validationErrors
      },
      requestId
    };
  }

  private static getErrorCode(error: Error): string {
    const errorCodeMap: { [key: string]: string } = {
      'UserAlreadyExistsException': 'USER_ALREADY_EXISTS',
      'InvalidEmailException': 'INVALID_EMAIL',
      'InvalidPasswordException': 'INVALID_PASSWORD',
      'InvalidNameException': 'INVALID_NAME',
      'ValidationError': 'VALIDATION_ERROR',
      'InternalServerError': 'INTERNAL_SERVER_ERROR'
    };

    return errorCodeMap[error.constructor.name] || 'UNKNOWN_ERROR';
  }
}

// Type guards
export function isCreateUserErrorResponse(
  response: CreateUserResult
): response is CreateUserErrorResponse {
  return response.success === false;
}

export function isCreateUserSuccessResponse(
  response: CreateUserResult
): response is CreateUserResponse {
  return response.success === true;
}