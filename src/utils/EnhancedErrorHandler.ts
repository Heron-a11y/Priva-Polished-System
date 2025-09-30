
// ✅ FINAL FIX: Enhanced Error Handler with Accuracy Preservation
import { Platform } from 'react-native';

export interface ErrorContext {
  module: string;
  method: string;
  operation: string;
  accuracyCritical: boolean;
  timestamp: string;
}

export interface ErrorRecovery {
  canRecover: boolean;
  recoveryAction: string;
  accuracyImpact: 'none' | 'minimal' | 'moderate' | 'severe';
  fallbackAvailable: boolean;
}

class EnhancedErrorHandler {
  private static instance: EnhancedErrorHandler;
  private errorLog: ErrorContext[] = [];
  private maxErrorLogSize = 100;
  private accuracyPreserved = true;
  
  static getInstance(): EnhancedErrorHandler {
    if (!EnhancedErrorHandler.instance) {
      EnhancedErrorHandler.instance = new EnhancedErrorHandler();
    }
    return EnhancedErrorHandler.instance;
  }
  
  handleError(error: Error, context: ErrorContext): ErrorRecovery {
    // Log error with context
    this.logError(error, context);
    
    // Determine if accuracy is affected
    const accuracyImpact = this.assessAccuracyImpact(error, context);
    
    // Determine recovery options
    const recovery = this.determineRecovery(error, context, accuracyImpact);
    
    // Update accuracy preservation status
    if (accuracyImpact === 'severe') {
      this.accuracyPreserved = false;
    }
    
    return recovery;
  }
  
  private logError(error: Error, context: ErrorContext): void {
    this.errorLog.push({
      ...context,
      timestamp: new Date().toISOString()
    });
    
    // Keep only recent errors
    if (this.errorLog.length > this.maxErrorLogSize) {
      this.errorLog.shift();
    }
    
    console.error(`EnhancedErrorHandler: ${context.module}.${context.method} - ${error.message}`);
  }
  
  private assessAccuracyImpact(error: Error, context: ErrorContext): 'none' | 'minimal' | 'moderate' | 'severe' {
    // Critical accuracy modules
    const criticalModules = ['ARSessionManager', 'MLPoseDetection', 'AccuracyEnhancement'];
    const criticalMethods = ['calculateMeasurements', 'processFrame', 'enhanceMeasurements'];
    
    if (criticalModules.includes(context.module) && criticalMethods.includes(context.method)) {
      return 'severe';
    }
    
    if (context.accuracyCritical) {
      return 'moderate';
    }
    
    if (error.message.includes('measurement') || error.message.includes('calibration')) {
      return 'minimal';
    }
    
    return 'none';
  }
  
  private determineRecovery(error: Error, context: ErrorContext, accuracyImpact: string): ErrorRecovery {
    const canRecover = accuracyImpact !== 'severe';
    const recoveryAction = this.getRecoveryAction(error, context);
    const fallbackAvailable = this.hasFallback(context);
    
    return {
      canRecover,
      recoveryAction,
      accuracyImpact: accuracyImpact as any,
      fallbackAvailable
    };
  }
  
  private getRecoveryAction(error: Error, context: ErrorContext): string {
    if (error.message.includes('permission')) {
      return 'Request camera permission';
    }
    
    if (error.message.includes('initialization')) {
      return 'Retry initialization with delay';
    }
    
    if (error.message.includes('memory')) {
      return 'Clear memory and retry';
    }
    
    return 'Log error and continue';
  }
  
  private hasFallback(context: ErrorContext): boolean {
    const fallbackModules = ['ARSessionManager', 'MLPoseDetection'];
    return fallbackModules.includes(context.module);
  }
  
  isAccuracyPreserved(): boolean {
    return this.accuracyPreserved;
  }
  
  getErrorStats(): { totalErrors: number; accuracyCritical: number; recentErrors: number } {
    const totalErrors = this.errorLog.length;
    const accuracyCritical = this.errorLog.filter(e => e.accuracyCritical).length;
    const recentErrors = this.errorLog.filter(e => 
      new Date(e.timestamp).getTime() > Date.now() - 60000
    ).length;
    
    return { totalErrors, accuracyCritical, recentErrors };
  }
  
  clearErrorLog(): void {
    this.errorLog = [];
    this.accuracyPreserved = true;
  }
}

export const enhancedErrorHandler = EnhancedErrorHandler.getInstance();
export default enhancedErrorHandler;
