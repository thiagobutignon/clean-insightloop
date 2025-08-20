import rateLimit from 'express-rate-limit';
import { Request, Response } from 'express';

export interface RateLimitOptions {
  windowMs?: number;
  max?: number;
  message?: string;
  standardHeaders?: boolean;
  legacyHeaders?: boolean;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
  keyGenerator?: (req: Request) => string;
  handler?: (req: Request, res: Response) => void;
}

/**
 * Create rate limiting middleware
 */
export function rateLimitMiddleware(options: RateLimitOptions = {}) {
  const {
    windowMs = 15 * 60 * 1000, // 15 minutes
    max = 100, // 100 requests per window
    message = 'Too many requests, please try again later',
    standardHeaders = true,
    legacyHeaders = false,
    skipSuccessfulRequests = false,
    skipFailedRequests = false,
    keyGenerator,
    handler
  } = options;

  return rateLimit({
    windowMs,
    max,
    standardHeaders,
    legacyHeaders,
    skipSuccessfulRequests,
    skipFailedRequests,
    keyGenerator: keyGenerator || defaultKeyGenerator,
    handler: handler || createDefaultHandler(message),
    message: {
      success: false,
      error: {
        type: 'RateLimitError',
        message,
        code: 'RATE_LIMIT_EXCEEDED'
      }
    }
  });
}

/**
 * Default key generator that combines IP and user agent
 */
function defaultKeyGenerator(req: Request): string {
  const ip = req.ip || req.connection.remoteAddress || 'unknown';
  const userAgent = req.get('User-Agent') || 'unknown';
  
  // Create a simple hash of IP + User Agent for better rate limiting
  const combined = `${ip}:${userAgent}`;
  return Buffer.from(combined).toString('base64');
}

/**
 * Create default rate limit handler
 */
function createDefaultHandler(message: string) {
  return (req: Request, res: Response): void => {
    const requestId = req.headers['x-request-id'] as string || 'unknown';

    res.status(429).json({
      success: false,
      error: {
        type: 'RateLimitError',
        message,
        code: 'RATE_LIMIT_EXCEEDED'
      },
      requestId
    });
  };
}

/**
 * Predefined rate limiters for different endpoints
 */
export const rateLimiters = {
  // Strict rate limiting for authentication endpoints
  auth: rateLimitMiddleware({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // 5 attempts per window
    message: 'Too many authentication attempts, please try again later'
  }),

  // Moderate rate limiting for registration
  registration: rateLimitMiddleware({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 3, // 3 registration attempts per window
    message: 'Too many registration attempts, please try again later'
  }),

  // Standard rate limiting for general API
  api: rateLimitMiddleware({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // 100 requests per window
    message: 'Too many API requests, please try again later'
  }),

  // Lenient rate limiting for health checks
  health: rateLimitMiddleware({
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 60, // 60 requests per minute
    message: 'Too many health check requests'
  }),

  // Very strict for password reset
  passwordReset: rateLimitMiddleware({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 3, // 3 attempts per hour
    message: 'Too many password reset attempts, please try again later'
  }),

  // Strict for password change
  passwordChange: rateLimitMiddleware({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 3, // 3 attempts per window
    message: 'Too many password change attempts, please try again later'
  })
};

/**
 * IP-based rate limiter
 */
export function ipRateLimitMiddleware(options: RateLimitOptions = {}) {
  return rateLimitMiddleware({
    ...options,
    keyGenerator: (req: Request) => req.ip || req.connection.remoteAddress || 'unknown'
  });
}

/**
 * User-based rate limiter (requires authentication)
 */
export function userRateLimitMiddleware(options: RateLimitOptions = {}) {
  return rateLimitMiddleware({
    ...options,
    keyGenerator: (req: Request) => {
      // Assumes user ID is set by authentication middleware
      const userId = (req as any).user?.id;
      return userId || req.ip || 'anonymous';
    }
  });
}

/**
 * Email-based rate limiter for registration/password reset
 */
export function emailRateLimitMiddleware(options: RateLimitOptions = {}) {
  return rateLimitMiddleware({
    ...options,
    keyGenerator: (req: Request) => {
      const email = req.body?.email;
      if (email && typeof email === 'string') {
        return email.toLowerCase();
      }
      return req.ip || 'unknown';
    }
  });
}

/**
 * Sliding window rate limiter for more precise control
 */
export function slidingWindowRateLimiter(options: {
  windowMs: number;
  maxRequests: number;
  message?: string;
}) {
  const { windowMs, maxRequests, message = 'Rate limit exceeded' } = options;
  const requests = new Map<string, number[]>();

  return (req: Request, res: Response, next: any): void => {
    const key = req.ip || 'unknown';
    const now = Date.now();
    const windowStart = now - windowMs;

    // Get existing requests for this key
    let userRequests = requests.get(key) || [];

    // Remove requests outside the window
    userRequests = userRequests.filter(timestamp => timestamp > windowStart);

    // Check if limit exceeded
    if (userRequests.length >= maxRequests) {
      const requestId = req.headers['x-request-id'] as string || 'unknown';
      
      res.status(429).json({
        success: false,
        error: {
          type: 'RateLimitError',
          message,
          code: 'RATE_LIMIT_EXCEEDED'
        },
        requestId
      });
      return;
    }

    // Add current request
    userRequests.push(now);
    requests.set(key, userRequests);

    // Clean up old entries periodically
    if (Math.random() < 0.01) { // 1% chance
      cleanupOldEntries(requests, windowStart);
    }

    next();
  };
}

/**
 * Cleanup old entries from the requests map
 */
function cleanupOldEntries(requests: Map<string, number[]>, windowStart: number): void {
  for (const [key, timestamps] of requests.entries()) {
    const validTimestamps = timestamps.filter(timestamp => timestamp > windowStart);
    
    if (validTimestamps.length === 0) {
      requests.delete(key);
    } else {
      requests.set(key, validTimestamps);
    }
  }
}

/**
 * Dynamic rate limiter that adjusts based on user role
 */
export function dynamicRateLimitMiddleware() {
  return (req: Request, res: Response, next: any): void => {
    const user = (req as any).user;
    let limits = { windowMs: 15 * 60 * 1000, max: 100 }; // Default

    if (user) {
      switch (user.role) {
        case 'free':
          limits = { windowMs: 15 * 60 * 1000, max: 50 };
          break;
        case 'paid':
          limits = { windowMs: 15 * 60 * 1000, max: 200 };
          break;
        case 'enterprise':
          limits = { windowMs: 15 * 60 * 1000, max: 1000 };
          break;
        case 'admin':
          limits = { windowMs: 15 * 60 * 1000, max: 5000 };
          break;
      }
    }

    rateLimitMiddleware(limits)(req, res, next);
  };
}

/**
 * Rate limiter with retry-after header
 */
export function retryAfterRateLimitMiddleware(options: RateLimitOptions = {}) {
  return rateLimitMiddleware({
    ...options,
    handler: (req: Request, res: Response) => {
      const requestId = req.headers['x-request-id'] as string || 'unknown';
      const retryAfter = Math.ceil(options.windowMs! / 1000) || 900; // seconds
      
      res.set('Retry-After', retryAfter.toString());
      res.status(429).json({
        success: false,
        error: {
          type: 'RateLimitError',
          message: options.message || 'Too many requests',
          code: 'RATE_LIMIT_EXCEEDED',
          retryAfter
        },
        requestId
      });
    }
  });
}