import { Request, Response } from 'express';
import { CreateUserUseCase } from '../../../../application/use-cases/user/create-user/create-user.use-case';
import { 
  CreateUserCommand, 
  CreateUserResult,
  isCreateUserErrorResponse,
  CreateUserValidationRules 
} from '../../../../application/use-cases/user/create-user/create-user.dto';
import { UserValidator } from '../../../../application/validators/user.validator';
import { LoggerPort } from '../../../../application/ports/output/logger.port';
import { UserRoleType } from '../../../../domain/entities/user/user.value-objects';

export interface UserControllerDependencies {
  createUserUseCase: CreateUserUseCase;
  logger: LoggerPort;
}

export class UserController {
  constructor(private readonly dependencies: UserControllerDependencies) {}

  /**
   * Register a new user
   * POST /api/v1/users/register
   */
  async register(req: Request, res: Response): Promise<void> {
    const { logger } = this.dependencies;
    const requestId = req.headers['x-request-id'] as string || 'unknown';

    try {
      logger.info('User registration request received', {
        requestId,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        email: req.body.email
      });

      // Validate request body
      const validationResult = UserValidator.validateCreateUser(req.body);
      if (validationResult.error) {
        const errors = UserValidator.formatValidationErrors(validationResult.error);
        
        logger.warn('User registration validation failed', {
          requestId,
          errors,
          email: req.body.email
        });

        res.status(400).json({
          success: false,
          error: {
            type: 'ValidationError',
            message: 'Invalid input data',
            code: 'VALIDATION_ERROR',
            details: errors
          },
          requestId
        });
        return;
      }

      // Create command from validated data
      const command: CreateUserCommand = {
        name: validationResult.value.name,
        email: validationResult.value.email,
        password: validationResult.value.password,
        passwordConfirmation: validationResult.value.passwordConfirmation,
        role: validationResult.value.role || UserRoleType.FREE
      };

      // Execute use case
      const result: CreateUserResult = await this.dependencies.createUserUseCase.execute(
        command,
        requestId
      );

      // Handle response
      if (isCreateUserErrorResponse(result)) {
        const statusCode = this.getErrorStatusCode(result.error.code);
        
        logger.warn('User registration failed', {
          requestId,
          error: result.error,
          email: command.email
        });

        res.status(statusCode).json(result);
        return;
      }

      logger.info('User registration successful', {
        requestId,
        userId: result.data.id,
        email: result.data.email,
        role: result.data.role
      });

      res.status(201).json(result);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;
      
      logger.error('Unexpected error during user registration', {
        requestId,
        error: errorMessage,
        stack: errorStack,
        email: req.body?.email
      });

      res.status(500).json({
        success: false,
        error: {
          type: 'InternalServerError',
          message: 'An unexpected error occurred',
          code: 'INTERNAL_SERVER_ERROR'
        },
        requestId
      });
    }
  }

  /**
   * Get user profile
   * GET /api/v1/users/profile
   */
  async getProfile(req: Request, res: Response): Promise<void> {
    // This would be implemented with authentication middleware
    // For now, returning a placeholder response
    
    res.status(200).json({
      success: true,
      data: {
        message: 'Profile endpoint - to be implemented'
      }
    });
  }

  /**
   * Update user profile
   * PUT /api/v1/users/profile
   */
  async updateProfile(req: Request, res: Response): Promise<void> {
    // This would be implemented with update use case
    // For now, returning a placeholder response
    
    res.status(200).json({
      success: true,
      data: {
        message: 'Update profile endpoint - to be implemented'
      }
    });
  }

  /**
   * Change user password
   * POST /api/v1/users/change-password
   */
  async changePassword(req: Request, res: Response): Promise<void> {
    // This would be implemented with change password use case
    // For now, returning a placeholder response
    
    res.status(200).json({
      success: true,
      data: {
        message: 'Change password endpoint - to be implemented'
      }
    });
  }

  /**
   * Health check endpoint
   * GET /api/v1/users/health
   */
  async healthCheck(req: Request, res: Response): Promise<void> {
    const { logger } = this.dependencies;
    
    try {
      logger.info('Health check endpoint called');
      
      // Basic health check - could be expanded to check dependencies
      res.status(200).json({
        success: true,
        data: {
          status: 'healthy',
          timestamp: new Date().toISOString(),
          version: process.env.APP_VERSION || '1.0.0'
        }
      });

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;
      
      logger.error('Health check failed', {
        error: errorMessage,
        stack: errorStack
      });

      res.status(500).json({
        success: false,
        error: {
          type: 'HealthCheckError',
          message: 'Service unhealthy',
          code: 'SERVICE_UNHEALTHY'
        }
      });
    }
  }

  // Private helper methods

  private getErrorStatusCode(errorCode: string): number {
    const statusCodeMap: { [key: string]: number } = {
      'USER_ALREADY_EXISTS': 409,
      'INVALID_EMAIL': 400,
      'INVALID_PASSWORD': 400,
      'INVALID_NAME': 400,
      'VALIDATION_ERROR': 400,
      'UNAUTHORIZED': 401,
      'FORBIDDEN': 403,
      'NOT_FOUND': 404,
      'INTERNAL_SERVER_ERROR': 500
    };

    return statusCodeMap[errorCode] || 500;
  }

  /**
   * Extract client information from request
   */
  private extractClientInfo(req: Request): {
    ip: string;
    userAgent: string;
    referer?: string;
  } {
    return {
      ip: req.ip || req.connection.remoteAddress || 'unknown',
      userAgent: req.get('User-Agent') || 'unknown',
      referer: req.get('Referer')
    };
  }

  /**
   * Sanitize request body for logging
   */
  private sanitizeRequestBody(body: any): any {
    const sanitized = { ...body };
    
    // Remove sensitive fields
    if (sanitized.password) sanitized.password = '***';
    if (sanitized.passwordConfirmation) sanitized.passwordConfirmation = '***';
    if (sanitized.currentPassword) sanitized.currentPassword = '***';
    if (sanitized.newPassword) sanitized.newPassword = '***';
    
    return sanitized;
  }

  /**
   * Generate request ID if not present
   */
  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}