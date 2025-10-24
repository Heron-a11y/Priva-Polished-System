/**
 * Enhanced Error Recovery System for AR Body Measurements
 * Provides comprehensive error handling with automatic recovery
 */

export interface ErrorRecoveryConfig {
  maxRetries: number;
  retryDelay: number;
  circuitBreakerThreshold: number;
  fallbackEnabled: boolean;
  accuracyPreservation: boolean;
}

export interface RecoveryAction {
  type: 'retry' | 'fallback' | 'circuit_breaker' | 'graceful_degradation';
  description: string;
  accuracyImpact: 'none' | 'minimal' | 'moderate' | 'severe';
  canProceed: boolean;
}

class EnhancedErrorRecovery {
  private static instance: EnhancedErrorRecovery;
  private config: ErrorRecoveryConfig;
  private errorCounts: Map<string, number> = new Map();
  private circuitBreakerStates: Map<string, 'closed' | 'open' | 'half-open'> = new Map();
  private lastErrorTimes: Map<string, number> = new Map();

  private constructor() {
    this.config = {
      maxRetries: 3,
      retryDelay: 1000,
      circuitBreakerThreshold: 5,
      fallbackEnabled: true,
      accuracyPreservation: true
    };
  }

  static getInstance(): EnhancedErrorRecovery {
    if (!EnhancedErrorRecovery.instance) {
      EnhancedErrorRecovery.instance = new EnhancedErrorRecovery();
    }
    return EnhancedErrorRecovery.instance;
  }

  // Handle error with automatic recovery
  async handleErrorWithRecovery<T>(
    operation: string,
    operationFunction: () => Promise<T>,
    fallbackFunction?: () => Promise<T>
  ): Promise<T | null> {
    const errorKey = operation;
    const errorCount = this.errorCounts.get(errorKey) || 0;
    const circuitBreakerState = this.circuitBreakerStates.get(errorKey) || 'closed';

    // Check circuit breaker
    if (circuitBreakerState === 'open') {
      const lastErrorTime = this.lastErrorTimes.get(errorKey) || 0;
      const timeSinceLastError = Date.now() - lastErrorTime;
      
      if (timeSinceLastError > this.config.retryDelay * 2) {
        this.circuitBreakerStates.set(errorKey, 'half-open');
      } else {
        return this.executeFallback(fallbackFunction);
      }
    }

    // Check retry limit
    if (errorCount >= this.config.maxRetries) {
      this.circuitBreakerStates.set(errorKey, 'open');
      this.lastErrorTimes.set(errorKey, Date.now());
      return this.executeFallback(fallbackFunction);
    }

    try {
      const result = await operationFunction();
      
      // Reset error count on success
      this.errorCounts.set(errorKey, 0);
      this.circuitBreakerStates.set(errorKey, 'closed');
      
      return result;
    } catch (error) {
      // Increment error count
      this.errorCounts.set(errorKey, errorCount + 1);
      this.lastErrorTimes.set(errorKey, Date.now());

      // Determine recovery action
      const recoveryAction = this.determineRecoveryAction(operation, error);
      
      if (recoveryAction.type === 'retry' && errorCount < this.config.maxRetries) {
        // Wait before retry
        await this.delay(this.config.retryDelay);
        return this.handleErrorWithRecovery(operation, operationFunction, fallbackFunction);
      } else {
        return this.executeFallback(fallbackFunction);
      }
    }
  }

  private determineRecoveryAction(operation: string, error: any): RecoveryAction {
    const errorMessage = error.message || error.toString();
    
    // Determine if this is a critical error
    const isCriticalError = this.isCriticalError(errorMessage);
    
    if (isCriticalError) {
      return {
        type: 'circuit_breaker',
        description: 'Critical error detected, activating circuit breaker',
        accuracyImpact: 'severe',
        canProceed: false
      };
    }

    // Check if fallback is available
    if (this.config.fallbackEnabled) {
      return {
        type: 'fallback',
        description: 'Executing fallback operation',
        accuracyImpact: 'moderate',
        canProceed: true
      };
    }

    // Default to retry
    return {
      type: 'retry',
      description: 'Retrying operation',
      accuracyImpact: 'none',
      canProceed: true
    };
  }

  private isCriticalError(errorMessage: string): boolean {
    const criticalPatterns = [
      'out of memory',
      'native module not found',
      'camera not available',
      'permission denied',
      'hardware not supported'
    ];

    return criticalPatterns.some(pattern => 
      errorMessage.toLowerCase().includes(pattern)
    );
  }

  private async executeFallback<T>(fallbackFunction?: () => Promise<T>): Promise<T | null> {
    if (!fallbackFunction) {
      console.warn('No fallback function available');
      return null;
    }

    try {
      return await fallbackFunction();
    } catch (fallbackError) {
      console.error('Fallback function also failed:', fallbackError);
      return null;
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Get recovery statistics
  getRecoveryStats(): {
    totalErrors: number;
    circuitBreakerStates: Record<string, string>;
    errorCounts: Record<string, number>;
  } {
    const totalErrors = Array.from(this.errorCounts.values()).reduce((sum, count) => sum + count, 0);
    
    const circuitBreakerStates: Record<string, string> = {};
    this.circuitBreakerStates.forEach((state, key) => {
      circuitBreakerStates[key] = state;
    });

    const errorCounts: Record<string, number> = {};
    this.errorCounts.forEach((count, key) => {
      errorCounts[key] = count;
    });

    return {
      totalErrors,
      circuitBreakerStates,
      errorCounts
    };
  }

  // Reset error recovery state
  reset(): void {
    this.errorCounts.clear();
    this.circuitBreakerStates.clear();
    this.lastErrorTimes.clear();
  }

  // Update configuration
  updateConfig(newConfig: Partial<ErrorRecoveryConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }
}

export const enhancedErrorRecovery = EnhancedErrorRecovery.getInstance();
export default EnhancedErrorRecovery;



