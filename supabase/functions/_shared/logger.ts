/**
 * _shared/logger.ts
 *
 * Structured logging for CALQULUS PMS edge functions.
 *
 * Provides consistent logging across all functions with
 * proper formatting, levels, and context.
 *
 * Usage:
 *   import { logger } from "../_shared/logger.ts";
 *
 *   logger.info("Payment processed", { paymentId: "123", amount: 5000 });
 *   logger.error("Payment failed", { error: "Insufficient funds", paymentId: "123" });
 */

export enum LogLevel {
  DEBUG = "DEBUG",
  INFO = "INFO",
  WARN = "WARN",
  ERROR = "ERROR",
}

export interface LogContext {
  [key: string]: any;
}

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: LogContext;
  function?: string;
}

class Logger {
  private functionName: string;

  constructor(functionName: string = "unknown") {
    this.functionName = functionName;
  }

  private formatMessage(level: LogLevel, message: string, context?: LogContext): string {
    const timestamp = new Date().toISOString();
    const contextStr = context ? ` ${JSON.stringify(context)}` : "";
    return `[${timestamp}] [${level}] [${this.functionName}] ${message}${contextStr}`;
  }

  private log(level: LogLevel, message: string, context?: LogContext): void {
    const formatted = this.formatMessage(level, message, context);
    
    switch (level) {
      case LogLevel.DEBUG:
        console.debug(formatted);
        break;
      case LogLevel.INFO:
        console.log(formatted);
        break;
      case LogLevel.WARN:
        console.warn(formatted);
        break;
      case LogLevel.ERROR:
        console.error(formatted);
        break;
    }
  }

  debug(message: string, context?: LogContext): void {
    this.log(LogLevel.DEBUG, message, context);
  }

  info(message: string, context?: LogContext): void {
    this.log(LogLevel.INFO, message, context);
  }

  warn(message: string, context?: LogContext): void {
    this.log(LogLevel.WARN, message, context);
  }

  error(message: string, context?: LogContext): void {
    this.log(LogLevel.ERROR, message, context);
  }

  /**
   * Create a child logger with additional context.
   */
  child(additionalContext: LogContext): Logger {
    const child = new Logger(this.functionName);
    const originalLog = child.log.bind(child);
    
    child.log = (level: LogLevel, message: string, context?: LogContext) => {
      const mergedContext = { ...additionalContext, ...context };
      originalLog(level, message, mergedContext);
    };
    
    return child;
  }
}

/**
 * Create a logger instance for a specific function.
 */
export function createLogger(functionName: string): Logger {
  return new Logger(functionName);
}

/**
 * Default logger instance (use when function name is not important).
 */
export const logger = new Logger("edge-function");
