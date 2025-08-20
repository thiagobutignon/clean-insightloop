import { Request, Response, NextFunction } from 'express';
import * as Joi from 'joi';

export interface ValidationOptions {
  abortEarly?: boolean;
  allowUnknown?: boolean;
  stripUnknown?: boolean;
  skipFunctions?: boolean;
}

/**
 * Express middleware for request validation using Joi schemas
 */
export function validationMiddleware(
  schema: Joi.ObjectSchema,
  options: ValidationOptions = {}
) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const validationOptions: Joi.ValidationOptions = {
      abortEarly: options.abortEarly ?? false,
      allowUnknown: options.allowUnknown ?? false,
      stripUnknown: options.stripUnknown ?? true,
      skipFunctions: options.skipFunctions ?? true,
      ...options
    };

    const { error, value } = schema.validate(req.body, validationOptions);

    if (error) {
      const validationErrors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message,
        code: detail.type.toUpperCase().replace(/\./g, '_')
      }));

      res.status(400).json({
        success: false,
        error: {
          type: 'ValidationError',
          message: 'Request validation failed',
          code: 'VALIDATION_ERROR',
          details: validationErrors
        },
        requestId: req.headers['x-request-id']
      });
      return;
    }

    // Replace request body with validated and sanitized data
    req.body = value;
    next();
  };
}

/**
 * Middleware to validate query parameters
 */
export function queryValidationMiddleware(
  schema: Joi.ObjectSchema,
  options: ValidationOptions = {}
) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const validationOptions: Joi.ValidationOptions = {
      abortEarly: options.abortEarly ?? false,
      allowUnknown: options.allowUnknown ?? false,
      stripUnknown: options.stripUnknown ?? true,
      ...options
    };

    const { error, value } = schema.validate(req.query, validationOptions);

    if (error) {
      const validationErrors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message,
        code: detail.type.toUpperCase().replace(/\./g, '_')
      }));

      res.status(400).json({
        success: false,
        error: {
          type: 'QueryValidationError',
          message: 'Query parameter validation failed',
          code: 'QUERY_VALIDATION_ERROR',
          details: validationErrors
        },
        requestId: req.headers['x-request-id']
      });
      return;
    }

    // Replace query parameters with validated data
    req.query = value;
    next();
  };
}

/**
 * Middleware to validate route parameters
 */
export function paramsValidationMiddleware(
  schema: Joi.ObjectSchema,
  options: ValidationOptions = {}
) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const validationOptions: Joi.ValidationOptions = {
      abortEarly: options.abortEarly ?? false,
      allowUnknown: options.allowUnknown ?? false,
      stripUnknown: options.stripUnknown ?? true,
      ...options
    };

    const { error, value } = schema.validate(req.params, validationOptions);

    if (error) {
      const validationErrors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message,
        code: detail.type.toUpperCase().replace(/\./g, '_')
      }));

      res.status(400).json({
        success: false,
        error: {
          type: 'ParamsValidationError',
          message: 'Route parameter validation failed',
          code: 'PARAMS_VALIDATION_ERROR',
          details: validationErrors
        },
        requestId: req.headers['x-request-id']
      });
      return;
    }

    // Replace params with validated data
    req.params = value;
    next();
  };
}

/**
 * Comprehensive validation middleware that validates body, query, and params
 */
export function fullValidationMiddleware(schemas: {
  body?: Joi.ObjectSchema;
  query?: Joi.ObjectSchema;
  params?: Joi.ObjectSchema;
}, options: ValidationOptions = {}) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const validationOptions: Joi.ValidationOptions = {
      abortEarly: options.abortEarly ?? false,
      allowUnknown: options.allowUnknown ?? false,
      stripUnknown: options.stripUnknown ?? true,
      ...options
    };

    const errors: any[] = [];

    // Validate body
    if (schemas.body) {
      const { error, value } = schemas.body.validate(req.body, validationOptions);
      if (error) {
        errors.push(...error.details.map(detail => ({
          field: `body.${detail.path.join('.')}`,
          message: detail.message,
          code: detail.type.toUpperCase().replace(/\./g, '_'),
          location: 'body'
        })));
      } else {
        req.body = value;
      }
    }

    // Validate query
    if (schemas.query) {
      const { error, value } = schemas.query.validate(req.query, validationOptions);
      if (error) {
        errors.push(...error.details.map(detail => ({
          field: `query.${detail.path.join('.')}`,
          message: detail.message,
          code: detail.type.toUpperCase().replace(/\./g, '_'),
          location: 'query'
        })));
      } else {
        req.query = value;
      }
    }

    // Validate params
    if (schemas.params) {
      const { error, value } = schemas.params.validate(req.params, validationOptions);
      if (error) {
        errors.push(...error.details.map(detail => ({
          field: `params.${detail.path.join('.')}`,
          message: detail.message,
          code: detail.type.toUpperCase().replace(/\./g, '_'),
          location: 'params'
        })));
      } else {
        req.params = value;
      }
    }

    if (errors.length > 0) {
      res.status(400).json({
        success: false,
        error: {
          type: 'ValidationError',
          message: 'Request validation failed',
          code: 'VALIDATION_ERROR',
          details: errors
        },
        requestId: req.headers['x-request-id']
      });
      return;
    }

    next();
  };
}

/**
 * Helper function to create custom validation error response
 */
export function createValidationError(
  message: string,
  details: any[],
  requestId?: string
) {
  return {
    success: false,
    error: {
      type: 'ValidationError',
      message,
      code: 'VALIDATION_ERROR',
      details
    },
    requestId
  };
}

/**
 * Common validation schemas for reuse
 */
export const commonSchemas = {
  uuid: Joi.string().uuid({ version: 'uuidv4' }),
  email: Joi.string().email({ tlds: { allow: false } }).max(320),
  password: Joi.string().min(8).max(128)
    .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?])/),
  name: Joi.string().trim().min(2).max(100)
    .pattern(/^[a-zA-ZÀ-ÿ\s\-']+$/),
  pagination: {
    limit: Joi.number().integer().min(1).max(100).default(20),
    offset: Joi.number().integer().min(0).default(0)
  },
  dateRange: {
    startDate: Joi.date().iso(),
    endDate: Joi.date().iso().min(Joi.ref('startDate'))
  }
};

/**
 * Middleware to sanitize request data
 */
export function sanitizationMiddleware(req: Request, res: Response, next: NextFunction): void {
  // Sanitize strings in request body
  if (req.body && typeof req.body === 'object') {
    req.body = sanitizeObject(req.body);
  }

  // Sanitize query parameters
  if (req.query && typeof req.query === 'object') {
    req.query = sanitizeObject(req.query);
  }

  next();
}

/**
 * Recursively sanitize object properties
 */
function sanitizeObject(obj: any): any {
  if (typeof obj !== 'object' || obj === null) {
    return typeof obj === 'string' ? sanitizeString(obj) : obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObject(item));
  }

  const sanitized: any = {};
  for (const [key, value] of Object.entries(obj)) {
    sanitized[key] = sanitizeObject(value);
  }

  return sanitized;
}

/**
 * Sanitize individual string values
 */
function sanitizeString(str: string): string {
  return str
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove script tags
    .replace(/<[^>]*>/g, '') // Remove HTML tags
    .trim();
}