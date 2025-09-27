/**
 * Secure AR Logging System
 * 
 * Provides structured logging with data sanitization and configurable levels.
 * Replaces raw console.log, print(), and Log.d statements throughout the system.
 */

import { arConfig, getConfigValue } from '../config/ARConfig';

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  module: string;
  method: string;
  message: string;
  data?: any;
  sanitized: boolean;
}

interface PerformanceMetrics {
  frameProcessingTime?: number;
  memoryUsage?: number;
  measurementAccuracy?: number;
  errorRate?: number;
}

class ARLogger {
  private static instance: ARLogger;
  private logBuffer: LogEntry[] = [];
  private maxLogEntries: number;
  private currentLogLevel: LogLevel;
  private enableSensitiveDataLogging: boolean;
  private enablePerformanceLogging: boolean;

  private constructor() {
    this.maxLogEntries = getConfigValue('logging.maxLogEntries') || 100;
    this.currentLogLevel = this.parseLogLevel(getConfigValue('logging.level') || 'INFO');
    this.enableSensitiveDataLogging = getConfigValue('logging.enableSensitiveDataLogging') || false;
    this.enablePerformanceLogging = getConfigValue('logging.enablePerformanceLogging') || true;
  }

  static getInstance(): ARLogger {
    if (!ARLogger.instance) {
      ARLogger.instance = new ARLogger();
    }
    return ARLogger.instance;
  }

  private parseLogLevel(level: string): LogLevel {
    switch (level.toUpperCase()) {
      case 'DEBUG': return LogLevel.DEBUG;
      case 'INFO': return LogLevel.INFO;
      case 'WARN': return LogLevel.WARN;
      case 'ERROR': return LogLevel.ERROR;
      default: return LogLevel.INFO;
    }
  }

  private shouldLog(level: LogLevel): boolean {
    return level >= this.currentLogLevel;
  }

  private sanitizeData(data: any): any {
    if (!data || typeof data !== 'object') {
      return data;
    }

    const sanitized = { ...data };
    const sensitiveKeys = [
      'shoulderWidthCm', 'heightCm', 'measurements', 'landmarks',
      'bodyData', 'userData', 'personalData', 'measurementData'
    ];

    // Remove or mask sensitive data
    Object.keys(sanitized).forEach(key => {
      if (sensitiveKeys.some(sensitive => key.toLowerCase().includes(sensitive.toLowerCase()))) {
        if (this.enableSensitiveDataLogging) {
          // In debug mode, show masked values
          if (typeof sanitized[key] === 'number') {
            sanitized[key] = `[MASKED: ${sanitized[key].toFixed(1)}]`;
          } else {
            sanitized[key] = '[MASKED]';
          }
        } else {
          // In production, remove completely
          delete sanitized[key];
        }
      }
    });

    return sanitized;
  }

  private createLogEntry(
    level: LogLevel,
    module: string,
    method: string,
    message: string,
    data?: any
  ): LogEntry {
    const sanitizedData = data ? this.sanitizeData(data) : undefined;
    
    return {
      timestamp: new Date().toISOString(),
      level,
      module,
      method,
      message,
      data: sanitizedData,
      sanitized: !!data && JSON.stringify(data) !== JSON.stringify(sanitizedData),
    };
  }

  private addToBuffer(entry: LogEntry): void {
    this.logBuffer.push(entry);
    
    // Maintain buffer size
    if (this.logBuffer.length > this.maxLogEntries) {
      this.logBuffer = this.logBuffer.slice(-this.maxLogEntries);
    }
  }

  private outputLog(entry: LogEntry): void {
    const levelName = LogLevel[entry.level];
    const prefix = `[AR-${levelName}] [${entry.module}.${entry.method}]`;
    const timestamp = entry.timestamp;
    
    const logMessage = `${prefix} ${entry.message}`;
    const fullMessage = entry.data ? `${logMessage} | Data: ${JSON.stringify(entry.data)}` : logMessage;
    
    // Add sanitization warning if data was sanitized
    const finalMessage = entry.sanitized 
      ? `${fullMessage} | [Data sanitized for security]`
      : fullMessage;

    // Use appropriate console method based on level
    switch (entry.level) {
      case LogLevel.DEBUG:
        console.debug(finalMessage);
        break;
      case LogLevel.INFO:
        console.info(finalMessage);
        break;
      case LogLevel.WARN:
        console.warn(finalMessage);
        break;
      case LogLevel.ERROR:
        console.error(finalMessage);
        break;
    }
  }

  private log(level: LogLevel, module: string, method: string, message: string, data?: any): void {
    if (!this.shouldLog(level)) {
      return;
    }

    const entry = this.createLogEntry(level, module, method, message, data);
    this.addToBuffer(entry);
    this.outputLog(entry);
  }

  // Public logging methods
  debug(module: string, method: string, message: string, data?: any): void {
    this.log(LogLevel.DEBUG, module, method, message, data);
  }

  info(module: string, method: string, message: string, data?: any): void {
    this.log(LogLevel.INFO, module, method, message, data);
  }

  warn(module: string, method: string, message: string, data?: any): void {
    this.log(LogLevel.WARN, module, method, message, data);
  }

  error(module: string, method: string, message: string, data?: any): void {
    this.log(LogLevel.ERROR, module, method, message, data);
  }

  // Performance logging
  logPerformance(module: string, method: string, metrics: PerformanceMetrics): void {
    if (!this.enablePerformanceLogging) {
      return;
    }

    this.info(module, method, 'Performance metrics', {
      frameProcessingTime: metrics.frameProcessingTime ? `${metrics.frameProcessingTime}ms` : undefined,
      memoryUsage: metrics.memoryUsage ? `${metrics.memoryUsage}MB` : undefined,
      measurementAccuracy: metrics.measurementAccuracy ? `${(metrics.measurementAccuracy * 100).toFixed(1)}%` : undefined,
      errorRate: metrics.errorRate ? `${(metrics.errorRate * 100).toFixed(1)}%` : undefined,
    });
  }

  // Error logging with stack trace
  logError(module: string, method: string, error: Error | string, context?: any): void {
    const errorMessage = typeof error === 'string' ? error : error.message;
    const errorData = {
      message: errorMessage,
      stack: typeof error === 'object' && error.stack ? error.stack : undefined,
      context: context ? this.sanitizeData(context) : undefined,
    };

    this.error(module, method, `Error occurred: ${errorMessage}`, errorData);
  }

  // Measurement logging (with special sanitization)
  logMeasurement(module: string, method: string, measurements: any, confidence?: number): void {
    const sanitizedMeasurements = {
      isValid: measurements.isValid,
      confidence: confidence || measurements.confidence,
      timestamp: measurements.timestamp,
      scanStatus: measurements.scanStatus,
      // Only log ranges, not exact values
      shoulderWidthRange: measurements.shoulderWidthCm 
        ? `${Math.floor(measurements.shoulderWidthCm / 10) * 10}-${Math.ceil(measurements.shoulderWidthCm / 10) * 10}cm`
        : undefined,
      heightRange: measurements.heightCm
        ? `${Math.floor(measurements.heightCm / 10) * 10}-${Math.ceil(measurements.heightCm / 10) * 10}cm`
        : undefined,
    };

    this.info(module, method, 'Measurement update', sanitizedMeasurements);
  }

  // Configuration logging
  logConfig(module: string, method: string, configChanges: any): void {
    this.debug(module, method, 'Configuration updated', this.sanitizeData(configChanges));
  }

  // Session lifecycle logging
  logSessionEvent(module: string, method: string, event: string, details?: any): void {
    this.info(module, method, `Session event: ${event}`, details ? this.sanitizeData(details) : undefined);
  }

  // Get log buffer for debugging
  getLogBuffer(): LogEntry[] {
    return [...this.logBuffer];
  }

  // Clear log buffer
  clearLogBuffer(): void {
    this.logBuffer = [];
  }

  // Update configuration
  updateConfig(newConfig: Partial<{
    maxLogEntries: number;
    logLevel: string;
    enableSensitiveDataLogging: boolean;
    enablePerformanceLogging: boolean;
  }>): void {
    if (newConfig.maxLogEntries !== undefined) {
      this.maxLogEntries = newConfig.maxLogEntries;
    }
    if (newConfig.logLevel !== undefined) {
      this.currentLogLevel = this.parseLogLevel(newConfig.logLevel);
    }
    if (newConfig.enableSensitiveDataLogging !== undefined) {
      this.enableSensitiveDataLogging = newConfig.enableSensitiveDataLogging;
    }
    if (newConfig.enablePerformanceLogging !== undefined) {
      this.enablePerformanceLogging = newConfig.enablePerformanceLogging;
    }

    this.info('ARLogger', 'updateConfig', 'Logger configuration updated', newConfig);
  }

  // Export logs for debugging (sanitized)
  exportLogs(): string {
    return JSON.stringify(this.logBuffer, null, 2);
  }

  // Get log statistics
  getLogStats(): {
    totalEntries: number;
    levelCounts: Record<string, number>;
    sanitizedCount: number;
    oldestEntry: string | null;
    newestEntry: string | null;
  } {
    const levelCounts: Record<string, number> = {
      DEBUG: 0,
      INFO: 0,
      WARN: 0,
      ERROR: 0,
    };

    let sanitizedCount = 0;
    let oldestEntry: string | null = null;
    let newestEntry: string | null = null;

    this.logBuffer.forEach(entry => {
      levelCounts[LogLevel[entry.level]]++;
      if (entry.sanitized) sanitizedCount++;
      
      if (!oldestEntry || entry.timestamp < oldestEntry) {
        oldestEntry = entry.timestamp;
      }
      if (!newestEntry || entry.timestamp > newestEntry) {
        newestEntry = entry.timestamp;
      }
    });

    return {
      totalEntries: this.logBuffer.length,
      levelCounts,
      sanitizedCount,
      oldestEntry,
      newestEntry,
    };
  }
}

// Export singleton instance
export const logger = ARLogger.getInstance();

// Export convenience functions for common use cases
export const logDebug = (module: string, method: string, message: string, data?: any) => 
  logger.debug(module, method, message, data);

export const logInfo = (module: string, method: string, message: string, data?: any) => 
  logger.info(module, method, message, data);

export const logWarn = (module: string, method: string, message: string, data?: any) => 
  logger.warn(module, method, message, data);

export const logError = (module: string, method: string, error: Error | string, context?: any) => 
  logger.logError(module, method, error, context);

export const logPerformance = (module: string, method: string, metrics: PerformanceMetrics) => 
  logger.logPerformance(module, method, metrics);

export const logMeasurement = (module: string, method: string, measurements: any, confidence?: number) => 
  logger.logMeasurement(module, method, measurements, confidence);

export const logSessionEvent = (module: string, method: string, event: string, details?: any) => 
  logger.logSessionEvent(module, method, event, details);

// Export for React Native bridge
export default logger;





