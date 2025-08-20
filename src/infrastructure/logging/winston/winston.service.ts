import * as winston from 'winston';
import { LoggerPort, LogLevel, LogContext } from '../../../application/ports/output/logger.port';

export class WinstonLoggerService implements LoggerPort {
  private logger: winston.Logger;

  constructor(options?: {
    level?: string;
    format?: winston.Logform.Format;
    transports?: winston.transport[];
    defaultMeta?: any;
  }) {
    this.logger = winston.createLogger({
      level: options?.level || process.env.LOG_LEVEL || 'info',
      format: options?.format || this.createDefaultFormat(),
      transports: options?.transports || this.createDefaultTransports(),
      defaultMeta: options?.defaultMeta || this.createDefaultMeta(),
      exitOnError: false
    });

    // Handle uncaught exceptions and rejections only in production
    if (process.env.NODE_ENV === 'production') {
      this.logger.exceptions.handle(
        new winston.transports.File({ 
          filename: 'logs/exceptions.log',
          handleExceptions: true,
          handleRejections: false
        })
      );

      this.logger.rejections.handle(
        new winston.transports.File({ 
          filename: 'logs/rejections.log',
          handleRejections: true,
          handleExceptions: false
        })
      );
    }
  }

  error(message: string, context?: LogContext): void {
    this.logger.error(message, context);
  }

  warn(message: string, context?: LogContext): void {
    this.logger.warn(message, context);
  }

  info(message: string, context?: LogContext): void {
    this.logger.info(message, context);
  }

  debug(message: string, context?: LogContext): void {
    this.logger.debug(message, context);
  }

  log(level: LogLevel, message: string, context?: LogContext): void {
    this.logger.log(level, message, context);
  }

  child(context: LogContext): LoggerPort {
    return new WinstonLoggerService({
      level: this.logger.level,
      format: this.logger.format,
      transports: this.logger.transports,
      defaultMeta: { ...this.logger.defaultMeta, ...context }
    });
  }

  // Additional utility methods

  /**
   * Log HTTP request
   */
  logRequest(req: any, context?: LogContext): void {
    this.info('HTTP Request', {
      method: req.method,
      url: req.url,
      userAgent: req.get('User-Agent'),
      ip: req.ip,
      requestId: req.headers['x-request-id'],
      ...context
    });
  }

  /**
   * Log HTTP response
   */
  logResponse(req: any, res: any, duration: number, context?: LogContext): void {
    const level = res.statusCode >= 400 ? LogLevel.ERROR : LogLevel.INFO;
    
    this.log(level, 'HTTP Response', {
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      requestId: req.headers['x-request-id'],
      ...context
    });
  }

  /**
   * Log database query
   */
  logQuery(query: string, parameters?: any[], duration?: number, context?: LogContext): void {
    this.debug('Database Query', {
      query: this.sanitizeQuery(query),
      parameters: this.sanitizeParameters(parameters),
      duration: duration ? `${duration}ms` : undefined,
      ...context
    });
  }

  /**
   * Log authentication events
   */
  logAuth(event: string, userId?: string, email?: string, context?: LogContext): void {
    this.info('Authentication Event', {
      event,
      userId,
      email,
      ...context
    });
  }

  /**
   * Log security events
   */
  logSecurity(event: string, severity: 'low' | 'medium' | 'high' | 'critical', context?: LogContext): void {
    const level = severity === 'critical' || severity === 'high' ? LogLevel.ERROR : LogLevel.WARN;
    
    this.log(level, 'Security Event', {
      event,
      severity,
      ...context
    });
  }

  /**
   * Log business events
   */
  logBusiness(event: string, context?: LogContext): void {
    this.info('Business Event', {
      event,
      ...context
    });
  }

  /**
   * Log performance metrics
   */
  logPerformance(operation: string, duration: number, context?: LogContext): void {
    const level = duration > 1000 ? LogLevel.WARN : LogLevel.DEBUG;
    
    this.log(level, 'Performance Metric', {
      operation,
      duration: `${duration}ms`,
      ...context
    });
  }

  // Private helper methods

  private createDefaultFormat(): winston.Logform.Format {
    const isProduction = process.env.NODE_ENV === 'production';

    if (isProduction) {
      return winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json()
      );
    } else {
      return winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.colorize(),
        winston.format.printf(({ timestamp, level, message, ...meta }) => {
          const metaStr = Object.keys(meta).length ? JSON.stringify(meta, null, 2) : '';
          return `${timestamp} [${level}]: ${message} ${metaStr}`;
        })
      );
    }
  }

  private createDefaultTransports(): winston.transport[] {
    const transports: winston.transport[] = [];

    // Console transport
    transports.push(
      new winston.transports.Console({
        level: process.env.NODE_ENV === 'production' ? 'info' : 'debug'
      })
    );

    // File transports for production
    if (process.env.NODE_ENV === 'production') {
      transports.push(
        new winston.transports.File({
          filename: 'logs/error.log',
          level: 'error',
          maxsize: 5242880, // 5MB
          maxFiles: 5
        }),
        new winston.transports.File({
          filename: 'logs/combined.log',
          maxsize: 5242880, // 5MB
          maxFiles: 5
        })
      );
    }

    return transports;
  }

  private createDefaultMeta(): any {
    return {
      service: 'insightloop-mcp-server',
      version: process.env.APP_VERSION || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      hostname: process.env.HOSTNAME || 'localhost',
      pid: process.pid
    };
  }

  private sanitizeQuery(query: string): string {
    // Remove or mask sensitive data from query strings
    return query
      .replace(/password\s*=\s*'[^']*'/gi, "password='***'")
      .replace(/password\s*=\s*"[^"]*"/gi, 'password="***"')
      .replace(/token\s*=\s*'[^']*'/gi, "token='***'")
      .replace(/token\s*=\s*"[^"]*"/gi, 'token="***"');
  }

  private sanitizeParameters(parameters?: any[]): any[] {
    if (!parameters) return [];

    return parameters.map((param, index) => {
      if (typeof param === 'string' && param.length > 50) {
        return `${param.substring(0, 50)}...`;
      }
      return param;
    });
  }

  /**
   * Create structured log for correlation
   */
  createCorrelationLogger(correlationId: string): LoggerPort {
    return this.child({ correlationId });
  }

  /**
   * Create user-specific logger
   */
  createUserLogger(userId: string, email?: string): LoggerPort {
    return this.child({ userId, email });
  }

  /**
   * Create request-specific logger
   */
  createRequestLogger(requestId: string, method: string, url: string): LoggerPort {
    return this.child({ requestId, method, url });
  }

  /**
   * Flush all transports
   */
  async flush(): Promise<void> {
    return new Promise((resolve) => {
      this.logger.on('finish', resolve);
      this.logger.end();
    });
  }

  /**
   * Close all transports
   */
  close(): void {
    try {
      // Remove exception and rejection handlers to prevent write after end errors
      if (process.env.NODE_ENV === 'production') {
        this.logger.exceptions.unhandle();
        this.logger.rejections.unhandle();
      }
      
      // Close all transports
      this.logger.transports.forEach(transport => {
        if (transport.close) {
          transport.close();
        }
      });
      
      this.logger.close();
    } catch (error) {
      // Silently handle any errors during cleanup
      console.error('Error closing logger:', error);
    }
  }
}