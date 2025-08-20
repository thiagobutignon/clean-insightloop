export enum LogLevel {
  ERROR = 'error',
  WARN = 'warn', 
  INFO = 'info',
  DEBUG = 'debug'
}

export interface LogContext {
  [key: string]: any;
}

export interface LoggerPort {
  /**
   * Log an error message
   */
  error(message: string, context?: LogContext): void;

  /**
   * Log a warning message
   */
  warn(message: string, context?: LogContext): void;

  /**
   * Log an info message
   */
  info(message: string, context?: LogContext): void;

  /**
   * Log a debug message
   */
  debug(message: string, context?: LogContext): void;

  /**
   * Log with a specific level
   */
  log(level: LogLevel, message: string, context?: LogContext): void;

  /**
   * Create a child logger with additional context
   */
  child(context: LogContext): LoggerPort;
}