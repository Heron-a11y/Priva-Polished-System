import { Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface ErrorLog {
  id: string;
  timestamp: string;
  error: string;
  stack?: string;
  component?: string;
  userId?: string;
  sessionId: string;
  userAgent: string;
  appVersion: string;
  platform: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  resolved: boolean;
  context?: any;
}

export interface ErrorContext {
  component?: string;
  action?: string;
  userId?: string;
  sessionId?: string;
  additionalData?: any;
}

class ErrorHandlingService {
  private sessionId: string;
  private errorLogs: ErrorLog[] = [];
  private maxLogs = 100;
  private isOnline = true;

  constructor() {
    this.sessionId = this.generateSessionId();
    this.loadErrorLogs();
    this.setupNetworkListener();
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private async loadErrorLogs() {
    try {
      const stored = await AsyncStorage.getItem('error_logs');
      if (stored) {
        this.errorLogs = JSON.parse(stored);
      }
    } catch (error) {
      console.warn('Failed to load error logs:', error);
    }
  }

  private async saveErrorLogs() {
    try {
      await AsyncStorage.setItem('error_logs', JSON.stringify(this.errorLogs));
    } catch (error) {
      console.warn('Failed to save error logs:', error);
    }
  }

  private setupNetworkListener() {
    // In a real app, you'd use NetInfo or similar
    // For now, we'll assume online
    this.isOnline = true;
  }

  /**
   * Log an error with context
   */
  public async logError(
    error: Error | string,
    context: ErrorContext = {},
    severity: ErrorLog['severity'] = 'medium'
  ): Promise<string> {
    const errorLog: ErrorLog = {
      id: this.generateErrorId(),
      timestamp: new Date().toISOString(),
      error: typeof error === 'string' ? error : error.message,
      stack: typeof error === 'object' ? error.stack : undefined,
      component: context.component,
      userId: context.userId,
      sessionId: context.sessionId || this.sessionId,
      userAgent: 'React Native App',
      appVersion: '1.0.0', // You'd get this from your app config
      platform: 'mobile',
      severity,
      resolved: false,
      context: context.additionalData
    };

    this.errorLogs.unshift(errorLog);
    
    // Keep only the latest maxLogs
    if (this.errorLogs.length > this.maxLogs) {
      this.errorLogs = this.errorLogs.slice(0, this.maxLogs);
    }

    await this.saveErrorLogs();

    // Send to remote logging service if online
    if (this.isOnline) {
      this.sendToRemoteLogging(errorLog);
    }

    return errorLog.id;
  }

  /**
   * Handle API errors with user-friendly messages
   */
  public handleApiError(error: any, context?: ErrorContext): void {
    let userMessage = 'An unexpected error occurred. Please try again.';
    let severity: ErrorLog['severity'] = 'medium';

    if (error.response) {
      // Server responded with error status
      const status = error.response.status;
      const data = error.response.data;

      switch (status) {
        case 400:
          userMessage = data?.message || 'Invalid request. Please check your input.';
          severity = 'low';
          break;
        case 401:
          userMessage = 'You are not authorized. Please log in again.';
          severity = 'medium';
          break;
        case 403:
          userMessage = 'You do not have permission to perform this action.';
          severity = 'medium';
          break;
        case 404:
          userMessage = 'The requested resource was not found.';
          severity = 'low';
          break;
        case 422:
          userMessage = data?.message || 'Validation error. Please check your input.';
          severity = 'low';
          break;
        case 429:
          userMessage = 'Too many requests. Please wait a moment and try again.';
          severity = 'medium';
          break;
        case 500:
          userMessage = 'Server error. Our team has been notified.';
          severity = 'high';
          break;
        case 503:
          userMessage = 'Service temporarily unavailable. Please try again later.';
          severity = 'high';
          break;
        default:
          userMessage = data?.message || 'An error occurred. Please try again.';
          severity = 'medium';
      }
    } else if (error.request) {
      // Network error
      userMessage = 'Network error. Please check your connection and try again.';
      severity = 'high';
    } else {
      // Other error
      userMessage = 'An unexpected error occurred. Please try again.';
      severity = 'medium';
    }

    // Log the error
    this.logError(error, context, severity);

    // Show user-friendly message
    this.showErrorAlert(userMessage, severity);
  }

  /**
   * Handle network connectivity issues
   */
  public handleNetworkError(): void {
    this.logError(
      new Error('Network connectivity issue'),
      { component: 'NetworkService' },
      'high'
    );

    Alert.alert(
      'Connection Error',
      'Please check your internet connection and try again.',
      [
        { text: 'OK', style: 'default' }
      ]
    );
  }

  /**
   * Handle system downtime
   */
  public handleSystemDown(): void {
    this.logError(
      new Error('System is currently down for maintenance'),
      { component: 'SystemService' },
      'critical'
    );

    Alert.alert(
      'System Maintenance',
      'Our system is currently undergoing maintenance. Please try again later.',
      [
        { text: 'OK', style: 'default' }
      ]
    );
  }

  /**
   * Show error alert with appropriate styling
   */
  private showErrorAlert(message: string, severity: ErrorLog['severity']): void {
    const title = this.getErrorTitle(severity);
    const buttonText = severity === 'critical' ? 'Contact Support' : 'OK';

    Alert.alert(
      title,
      message,
      [
        {
          text: buttonText,
          style: severity === 'critical' ? 'destructive' : 'default',
          onPress: severity === 'critical' ? this.handleContactSupport : undefined
        }
      ]
    );
  }

  private getErrorTitle(severity: ErrorLog['severity']): string {
    switch (severity) {
      case 'low':
        return 'Notice';
      case 'medium':
        return 'Error';
      case 'high':
        return 'Warning';
      case 'critical':
        return 'Critical Error';
      default:
        return 'Error';
    }
  }

  private handleContactSupport = (): void => {
    // Implement contact support logic
    console.log('Contact support requested');
  };

  /**
   * Send error to remote logging service
   */
  private async sendToRemoteLogging(errorLog: ErrorLog): Promise<void> {
    try {
      // Here you would send to your logging service (Sentry, LogRocket, etc.)
      console.log('Sending error to remote logging:', errorLog);
      
      // Example: Send to your backend
      // await fetch('/api/errors', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(errorLog)
      // });
    } catch (error) {
      console.warn('Failed to send error to remote logging:', error);
    }
  }

  /**
   * Generate unique error ID
   */
  private generateErrorId(): string {
    return `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get error logs
   */
  public getErrorLogs(): ErrorLog[] {
    return [...this.errorLogs];
  }

  /**
   * Get error logs by severity
   */
  public getErrorLogsBySeverity(severity: ErrorLog['severity']): ErrorLog[] {
    return this.errorLogs.filter(log => log.severity === severity);
  }

  /**
   * Mark error as resolved
   */
  public async markErrorResolved(errorId: string): Promise<void> {
    const errorLog = this.errorLogs.find(log => log.id === errorId);
    if (errorLog) {
      errorLog.resolved = true;
      await this.saveErrorLogs();
    }
  }

  /**
   * Clear resolved errors
   */
  public async clearResolvedErrors(): Promise<void> {
    this.errorLogs = this.errorLogs.filter(log => !log.resolved);
    await this.saveErrorLogs();
  }

  /**
   * Clear all error logs
   */
  public async clearAllErrorLogs(): Promise<void> {
    this.errorLogs = [];
    await this.saveErrorLogs();
  }

  /**
   * Get error statistics
   */
  public getErrorStatistics(): {
    total: number;
    bySeverity: Record<ErrorLog['severity'], number>;
    resolved: number;
    unresolved: number;
  } {
    const total = this.errorLogs.length;
    const resolved = this.errorLogs.filter(log => log.resolved).length;
    const unresolved = total - resolved;

    const bySeverity = this.errorLogs.reduce((acc, log) => {
      acc[log.severity] = (acc[log.severity] || 0) + 1;
      return acc;
    }, {} as Record<ErrorLog['severity'], number>);

    return {
      total,
      bySeverity,
      resolved,
      unresolved
    };
  }
}

// Export singleton instance
export const errorHandlingService = new ErrorHandlingService();
export default errorHandlingService;


