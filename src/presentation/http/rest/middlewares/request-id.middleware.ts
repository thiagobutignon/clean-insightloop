import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';

export interface RequestIdOptions {
  headerName?: string;
  generateId?: () => string;
  setResponseHeader?: boolean;
  attributeName?: string;
}

/**
 * Middleware to add request ID to every request
 */
export function requestIdMiddleware(options: RequestIdOptions = {}) {
  const {
    headerName = 'x-request-id',
    generateId = uuidv4,
    setResponseHeader = true,
    attributeName = 'requestId'
  } = options;

  return (req: Request, res: Response, next: NextFunction): void => {
    // Check if request ID already exists in headers
    let requestId = req.headers[headerName] as string;

    // Generate new ID if not provided or invalid
    if (!requestId || !isValidRequestId(requestId)) {
      requestId = generateId();
    }

    // Set request ID in headers
    req.headers[headerName] = requestId;

    // Add to request object for easy access
    (req as any)[attributeName] = requestId;

    // Set response header if requested
    if (setResponseHeader) {
      res.setHeader(headerName, requestId);
    }

    next();
  };
}

/**
 * Validate request ID format
 */
function isValidRequestId(id: string): boolean {
  // Check if it's a valid UUID v4
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(id);
}

/**
 * Custom request ID generator
 */
export function customRequestIdGenerator(prefix: string = 'req'): () => string {
  return () => {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substr(2, 9);
    return `${prefix}_${timestamp}_${random}`;
  };
}

/**
 * Sequential request ID generator (for testing/debugging)
 */
export function sequentialRequestIdGenerator(): () => string {
  let counter = 0;
  
  return () => {
    counter += 1;
    return `req_${counter.toString().padStart(6, '0')}`;
  };
}

/**
 * Correlation ID middleware for distributed tracing
 */
export function correlationIdMiddleware(options: {
  correlationHeaderName?: string;
  generateCorrelationId?: () => string;
  setResponseHeader?: boolean;
} = {}) {
  const {
    correlationHeaderName = 'x-correlation-id',
    generateCorrelationId = uuidv4,
    setResponseHeader = true
  } = options;

  return (req: Request, res: Response, next: NextFunction): void => {
    // Check for existing correlation ID
    let correlationId = req.headers[correlationHeaderName] as string;

    // Generate new correlation ID if not provided
    if (!correlationId) {
      correlationId = generateCorrelationId();
    }

    // Set correlation ID in headers
    req.headers[correlationHeaderName] = correlationId;

    // Add to request object
    (req as any).correlationId = correlationId;

    // Set response header if requested
    if (setResponseHeader) {
      res.setHeader(correlationHeaderName, correlationId);
    }

    next();
  };
}

/**
 * Session ID middleware
 */
export function sessionIdMiddleware(options: {
  sessionHeaderName?: string;
  generateSessionId?: () => string;
  setResponseHeader?: boolean;
} = {}) {
  const {
    sessionHeaderName = 'x-session-id',
    generateSessionId = () => `sess_${uuidv4()}`,
    setResponseHeader = true
  } = options;

  return (req: Request, res: Response, next: NextFunction): void => {
    // Check for existing session ID
    let sessionId = req.headers[sessionHeaderName] as string;

    // Generate new session ID if not provided
    if (!sessionId) {
      sessionId = generateSessionId();
    }

    // Set session ID in headers
    req.headers[sessionHeaderName] = sessionId;

    // Add to request object
    (req as any).sessionId = sessionId;

    // Set response header if requested
    if (setResponseHeader) {
      res.setHeader(sessionHeaderName, sessionId);
    }

    next();
  };
}

/**
 * Combined tracing middleware
 */
export function tracingMiddleware(options: {
  requestIdOptions?: RequestIdOptions;
  enableCorrelationId?: boolean;
  enableSessionId?: boolean;
} = {}) {
  const {
    requestIdOptions = {},
    enableCorrelationId = true,
    enableSessionId = false
  } = options;

  const middlewares = [
    requestIdMiddleware(requestIdOptions)
  ];

  if (enableCorrelationId) {
    middlewares.push(correlationIdMiddleware());
  }

  if (enableSessionId) {
    middlewares.push(sessionIdMiddleware());
  }

  return (req: Request, res: Response, next: NextFunction): void => {
    let currentIndex = 0;

    function runNext(): void {
      if (currentIndex >= middlewares.length) {
        next();
        return;
      }

      const middleware = middlewares[currentIndex++];
      middleware(req, res, runNext);
    }

    runNext();
  };
}

/**
 * Request context middleware
 */
export function requestContextMiddleware(req: Request, res: Response, next: NextFunction): void {
  // Create request context with metadata
  const context = {
    requestId: (req as any).requestId || req.headers['x-request-id'],
    correlationId: (req as any).correlationId || req.headers['x-correlation-id'],
    sessionId: (req as any).sessionId || req.headers['x-session-id'],
    timestamp: new Date().toISOString(),
    method: req.method,
    url: req.url,
    userAgent: req.get('User-Agent'),
    ip: req.ip || req.connection.remoteAddress,
    referer: req.get('Referer')
  };

  // Add context to request
  (req as any).context = context;

  next();
}

/**
 * Helper to get request ID from request
 */
export function getRequestId(req: Request): string {
  return (req as any).requestId || 
         req.headers['x-request-id'] as string || 
         'unknown';
}

/**
 * Helper to get correlation ID from request
 */
export function getCorrelationId(req: Request): string {
  return (req as any).correlationId || 
         req.headers['x-correlation-id'] as string || 
         'unknown';
}

/**
 * Helper to get full request context
 */
export function getRequestContext(req: Request): any {
  return (req as any).context || {
    requestId: getRequestId(req),
    timestamp: new Date().toISOString(),
    method: req.method,
    url: req.url
  };
}

/**
 * Response time middleware with request ID
 */
export function responseTimeMiddleware(req: Request, res: Response, next: NextFunction): void {
  const startTime = Date.now();

  // Hook into the response to set header before it's sent
  const originalSend = res.send;
  const originalJson = res.json;
  const originalEnd = res.end;

  function setResponseTime() {
    const duration = Date.now() - startTime;
    if (!res.headersSent) {
      res.setHeader('x-response-time', `${duration}ms`);
    }
  }

  // Override response methods to set timing header
  res.send = function(body) {
    setResponseTime();
    return originalSend.call(this, body);
  };

  res.json = function(body) {
    setResponseTime();
    return originalJson.call(this, body);
  };

  res.end = function(chunk?: any, encoding?: any) {
    setResponseTime();
    return originalEnd.call(this, chunk, encoding);
  };

  // Also log when response finishes
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    const requestId = getRequestId(req);
    console.log(`Request ${requestId} completed in ${duration}ms`);
  });

  next();
}