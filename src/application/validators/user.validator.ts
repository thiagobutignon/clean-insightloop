import * as Joi from 'joi';
import { UserRoleType } from '../../domain/entities/user/user.value-objects';

// Validation schemas using Joi
export const createUserSchema = Joi.object({
  name: Joi.string()
    .trim()
    .min(2)
    .max(100)
    .pattern(/^[a-zA-ZÀ-ÿ\s\-']+$/)
    .required()
    .messages({
      'string.empty': 'Name is required',
      'string.min': 'Name must be at least 2 characters long',
      'string.max': 'Name cannot be longer than 100 characters',
      'string.pattern.base': 'Name contains invalid characters'
    }),

  email: Joi.string()
    .email({ tlds: { allow: false } })
    .max(320)
    .lowercase()
    .required()
    .messages({
      'string.empty': 'Email is required',
      'string.email': 'Please provide a valid email address',
      'string.max': 'Email cannot be longer than 320 characters'
    }),

  password: Joi.string()
    .min(8)
    .max(128)
    .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?])/)
    .required()
    .messages({
      'string.empty': 'Password is required',
      'string.min': 'Password must be at least 8 characters long',
      'string.max': 'Password cannot be longer than 128 characters',
      'string.pattern.base': 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'
    }),

  passwordConfirmation: Joi.string()
    .valid(Joi.ref('password'))
    .required()
    .messages({
      'any.only': 'Password confirmation must match password',
      'string.empty': 'Password confirmation is required'
    }),

  role: Joi.string()
    .valid(...Object.values(UserRoleType))
    .optional()
    .messages({
      'any.only': 'Role must be one of: free, paid, admin, enterprise'
    })
});

export const updateUserSchema = Joi.object({
  name: Joi.string()
    .trim()
    .min(2)
    .max(100)
    .pattern(/^[a-zA-ZÀ-ÿ\s\-']+$/)
    .optional()
    .messages({
      'string.min': 'Name must be at least 2 characters long',
      'string.max': 'Name cannot be longer than 100 characters',
      'string.pattern.base': 'Name contains invalid characters'
    }),

  email: Joi.string()
    .email({ tlds: { allow: false } })
    .max(320)
    .lowercase()
    .optional()
    .messages({
      'string.email': 'Please provide a valid email address',
      'string.max': 'Email cannot be longer than 320 characters'
    }),

  role: Joi.string()
    .valid(...Object.values(UserRoleType))
    .optional()
    .messages({
      'any.only': 'Role must be one of: free, paid, admin, enterprise'
    })
});

export const changePasswordSchema = Joi.object({
  currentPassword: Joi.string()
    .required()
    .messages({
      'string.empty': 'Current password is required'
    }),

  newPassword: Joi.string()
    .min(8)
    .max(128)
    .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?])/)
    .required()
    .messages({
      'string.empty': 'New password is required',
      'string.min': 'Password must be at least 8 characters long',
      'string.max': 'Password cannot be longer than 128 characters',
      'string.pattern.base': 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'
    }),

  confirmPassword: Joi.string()
    .valid(Joi.ref('newPassword'))
    .required()
    .messages({
      'any.only': 'Password confirmation must match new password',
      'string.empty': 'Password confirmation is required'
    })
});

export const userSearchSchema = Joi.object({
  role: Joi.string()
    .valid(...Object.values(UserRoleType))
    .optional(),

  status: Joi.string()
    .valid('active', 'inactive', 'suspended', 'pending_verification')
    .optional(),

  emailContains: Joi.string()
    .max(100)
    .optional(),

  nameContains: Joi.string()
    .max(100)
    .optional(),

  createdAfter: Joi.date()
    .iso()
    .optional(),

  createdBefore: Joi.date()
    .iso()
    .optional(),

  limit: Joi.number()
    .integer()
    .min(1)
    .max(100)
    .default(20)
    .optional(),

  offset: Joi.number()
    .integer()
    .min(0)
    .default(0)
    .optional()
});

// Validation helper functions
export class UserValidator {
  static validateCreateUser(data: any): Joi.ValidationResult {
    return createUserSchema.validate(data, { abortEarly: false });
  }

  static validateUpdateUser(data: any): Joi.ValidationResult {
    return updateUserSchema.validate(data, { abortEarly: false });
  }

  static validateChangePassword(data: any): Joi.ValidationResult {
    return changePasswordSchema.validate(data, { abortEarly: false });
  }

  static validateUserSearch(data: any): Joi.ValidationResult {
    return userSearchSchema.validate(data, { abortEarly: false });
  }

  static formatValidationErrors(error: Joi.ValidationError): Array<{
    field: string;
    message: string;
    code: string;
  }> {
    return error.details.map(detail => ({
      field: detail.path.join('.'),
      message: detail.message,
      code: detail.type.toUpperCase().replace(/\./g, '_')
    }));
  }

  static isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email) && email.length <= 320;
  }

  static isStrongPassword(password: string): boolean {
    if (password.length < 8 || password.length > 128) {
      return false;
    }

    const hasUppercase = /[A-Z]/.test(password);
    const hasLowercase = /[a-z]/.test(password);
    const hasNumber = /\d/.test(password);
    const hasSpecial = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password);

    return hasUppercase && hasLowercase && hasNumber && hasSpecial;
  }

  static sanitizeUserInput(input: string): string {
    // Basic HTML/script tag sanitization
    return input
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<[^>]*>/g, '')
      .trim();
  }
}