import { Request, Response, NextFunction } from 'express';
import { LoggerPort } from '../../../../application/ports/output/logger.port';
import { 
  DomainException,
  UserNotFoundException,
  UserAlreadyExistsException,
  InvalidEmailException,
  InvalidPasswordException,
  InvalidNameException,
  InsufficientPermissionsException
} from '../../../../domain/exceptions/domain.exception';

export interface ErrorMiddlewareOptions {
  logger: LoggerPort;
  includeStackTrace?: boolean;
  enableDetailedErrors?: boolean;
}

/**
 * Global error handling middleware
 */
export function errorMiddleware(options: ErrorMiddlewareOptions) {
  const { logger, includeStackTrace = false, enableDetailedErrors = false } = options;

  return (error: Error, req: Request, res: Response, next: NextFunction): void => {
    const requestId = req.headers['x-request-id'] as string || 'unknown';

    // Log the error
    logger.error('Unhandled error occurred', {
      requestId,
      error: error.message,
      stack: error.stack,
      method: req.method,
      url: req.url,
      userAgent: req.get('User-Agent'),
      ip: req.ip
    });

    // Handle different types of errors
    if (error instanceof DomainException) {
      handleDomainException(error, req, res, requestId, enableDetailedErrors);
    } else if (error.name === 'ValidationError') {
      handleValidationError(error, req, res, requestId);
    } else if (error.name === 'SyntaxError' && 'body' in error) {
      handleJsonSyntaxError(error, req, res, requestId);
    } else if (error.name === 'MulterError') {
      handleMulterError(error, req, res, requestId);
    } else {
      handleGenericError(error, req, res, requestId, includeStackTrace, enableDetailedErrors);
    }
  };
}

/**
 * Handle domain-specific exceptions
 */
function handleDomainException(
  error: DomainException,
  req: Request,
  res: Response,
  requestId: string,
  enableDetailedErrors: boolean
): void {
  const errorMap: { [key: string]: { status: number; code: string } } = {
    'UserNotFoundException': { status: 404, code: 'USER_NOT_FOUND' },
    'UserAlreadyExistsException': { status: 409, code: 'USER_ALREADY_EXISTS' },
    'InvalidEmailException': { status: 400, code: 'INVALID_EMAIL' },
    'InvalidPasswordException': { status: 400, code: 'INVALID_PASSWORD' },
    'InvalidNameException': { status: 400, code: 'INVALID_NAME' },
    'InsufficientPermissionsException': { status: 403, code: 'INSUFFICIENT_PERMISSIONS' }
  };

  const errorInfo = errorMap[error.constructor.name] || { status: 400, code: 'DOMAIN_ERROR' };

  res.status(errorInfo.status).json({
    success: false,
    error: {
      type: error.constructor.name,
      message: enableDetailedErrors ? error.message : getPublicErrorMessage(error),
      code: errorInfo.code
    },
    requestId
  });
}

/**
 * Handle validation errors
 */
function handleValidationError(
  error: Error,
  req: Request,
  res: Response,
  requestId: string
): void {
  res.status(400).json({
    success: false,
    error: {
      type: 'ValidationError',
      message: 'Request validation failed',
      code: 'VALIDATION_ERROR',
      details: extractValidationDetails(error)
    },
    requestId
  });
}

/**
 * Handle JSON syntax errors
 */
function handleJsonSyntaxError(
  error: Error,
  req: Request,
  res: Response,
  requestId: string
): void {
  res.status(400).json({
    success: false,
    error: {
      type: 'SyntaxError',
      message: 'Invalid JSON format',
      code: 'INVALID_JSON'
    },
    requestId
  });
}

/**
 * Handle file upload errors
 */
function handleMulterError(
  error: any,
  req: Request,
  res: Response,
  requestId: string
): void {
  let message = 'File upload error';
  let code = 'FILE_UPLOAD_ERROR';

  switch (error.code) {
    case 'LIMIT_FILE_SIZE':
      message = 'File too large';
      code = 'FILE_TOO_LARGE';
      break;
    case 'LIMIT_FILE_COUNT':
      message = 'Too many files';
      code = 'TOO_MANY_FILES';
      break;
    case 'LIMIT_UNEXPECTED_FILE':
      message = 'Unexpected file field';
      code = 'UNEXPECTED_FILE';
      break;
  }

  res.status(400).json({
    success: false,
    error: {
      type: 'MulterError',
      message,
      code
    },
    requestId
  });
}

/**
 * Handle generic errors
 */
function handleGenericError(
  error: Error,
  req: Request,
  res: Response,
  requestId: string,
  includeStackTrace: boolean,
  enableDetailedErrors: boolean
): void {
  const response: any = {
    success: false,
    error: {
      type: 'InternalServerError',
      message: enableDetailedErrors ? error.message : 'An unexpected error occurred',
      code: 'INTERNAL_SERVER_ERROR'
    },
    requestId
  };

  if (includeStackTrace && enableDetailedErrors) {
    response.error.stack = error.stack;
  }

  res.status(500).json(response);
}

/**
 * Extract validation details from error
 */
function extractValidationDetails(error: any): any[] {
  if (error.details && Array.isArray(error.details)) {
    return error.details.map((detail: any) => ({
      field: detail.path?.join('.') || 'unknown',
      message: detail.message || 'Validation failed',
      code: detail.type?.toUpperCase().replace(/\./g, '_') || 'VALIDATION_FAILED'
    }));
  }

  return [{
    field: 'unknown',
    message: error.message || 'Validation failed',
    code: 'VALIDATION_FAILED'
  }];
}

/**
 * Get public-safe error messages
 */
function getPublicErrorMessage(error: DomainException): string {
  const publicMessages: { [key: string]: string } = {
    'UserNotFoundException': 'User not found',
    'UserAlreadyExistsException': 'An account with this email already exists',
    'InvalidEmailException': 'Please provide a valid email address',
    'InvalidPasswordException': 'Password does not meet security requirements',
    'InvalidNameException': 'Please provide a valid name',
    'InsufficientPermissionsException': 'You do not have permission to perform this action'
  };

  return publicMessages[error.constructor.name] || 'An error occurred';
}

/**
 * Middleware to handle 404 errors
 */
export function notFoundMiddleware(req: Request, res: Response, next: NextFunction): void {
  const requestId = req.headers['x-request-id'] as string || 'unknown';

  res.status(404).json({
    success: false,
    error: {
      type: 'NotFoundError',
      message: `Route ${req.method} ${req.path} not found`,
      code: 'ROUTE_NOT_FOUND'
    },
    requestId
  });
}

/**
 * Middleware to handle async errors
 */
export function asyncErrorHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
) {
  return (req: Request, res: Response, next: NextFunction): void => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * Error response builder utility
 */
export class ErrorResponseBuilder {
  private response: any = {
    success: false,
    error: {}
  };

  constructor(private requestId?: string) {
    if (requestId) {
      this.response.requestId = requestId;
    }
  }

  withType(type: string): this {
    this.response.error.type = type;
    return this;
  }

  withMessage(message: string): this {
    this.response.error.message = message;
    return this;
  }

  withCode(code: string): this {
    this.response.error.code = code;
    return this;
  }

  withDetails(details: any): this {
    this.response.error.details = details;
    return this;
  }

  withField(field: string, message: string, code: string): this {
    if (!this.response.error.details) {
      this.response.error.details = [];
    }
    this.response.error.details.push({ field, message, code });
    return this;
  }

  build(): any {
    return this.response;
  }

  send(res: Response, statusCode: number = 400): void {
    res.status(statusCode).json(this.response);
  }
}

/**
 * Health check error handler
 */
export function healthCheckErrorHandler(
  error: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  if (req.path.includes('/health')) {
    res.status(503).json({
      success: false,
      error: {
        type: 'HealthCheckError',
        message: 'Service unhealthy',
        code: 'SERVICE_UNHEALTHY'
      }
    });
    return;
  }

  next(error);
}