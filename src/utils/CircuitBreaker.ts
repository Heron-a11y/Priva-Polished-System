// ✅ IMPROVEMENT: Circuit breaker pattern for enhanced error recovery

export interface CircuitBreakerConfig {
  failureThreshold: number;
  timeout: number;
  resetTimeout: number;
}

export class CircuitBreaker {
  private failureCount = 0;
  private lastFailureTime = 0;
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';
  private config: CircuitBreakerConfig;

  constructor(config: CircuitBreakerConfig) {
    this.config = config;
  }

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailureTime > this.config.resetTimeout) {
        this.state = 'HALF_OPEN';
      } else {
        throw new Error('Circuit breaker is OPEN - operation blocked');
      }
    }

    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess(): void {
    this.failureCount = 0;
    this.state = 'CLOSED';
  }

  private onFailure(): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();
    
    if (this.failureCount >= this.config.failureThreshold) {
      this.state = 'OPEN';
    }
  }

  getState(): 'CLOSED' | 'OPEN' | 'HALF_OPEN' {
    return this.state;
  }

  getFailureCount(): number {
    return this.failureCount;
  }

  reset(): void {
    this.failureCount = 0;
    this.lastFailureTime = 0;
    this.state = 'CLOSED';
  }
}

// ✅ IMPROVEMENT: Enhanced error recovery with circuit breaker
export class EnhancedErrorRecovery {
  private static instance: EnhancedErrorRecovery;
  private circuitBreakers: Map<string, CircuitBreaker> = new Map();

  static getInstance(): EnhancedErrorRecovery {
    if (!EnhancedErrorRecovery.instance) {
      EnhancedErrorRecovery.instance = new EnhancedErrorRecovery();
    }
    return EnhancedErrorRecovery.instance;
  }

  getCircuitBreaker(operation: string): CircuitBreaker {
    if (!this.circuitBreakers.has(operation)) {
      this.circuitBreakers.set(operation, new CircuitBreaker({
        failureThreshold: 3,
        timeout: 5000,
        resetTimeout: 10000
      }));
    }
    return this.circuitBreakers.get(operation)!;
  }

  async executeWithRecovery<T>(
    operation: string,
    primaryOperation: () => Promise<T>,
    fallbackOperation?: () => Promise<T>
  ): Promise<T> {
    const circuitBreaker = this.getCircuitBreaker(operation);
    
    try {
      return await circuitBreaker.execute(primaryOperation);
    } catch (error) {
      console.warn(`Primary operation failed for ${operation}:`, error);
      
      if (fallbackOperation) {
        try {
          console.log(`Attempting fallback for ${operation}`);
          return await fallbackOperation();
        } catch (fallbackError) {
          console.error(`Fallback operation also failed for ${operation}:`, fallbackError);
          throw new Error(`Both primary and fallback operations failed for ${operation}`);
        }
      }
      
      throw error;
    }
  }

  getRecoveryStats(): Record<string, { state: string; failureCount: number }> {
    const stats: Record<string, { state: string; failureCount: number }> = {};
    
    this.circuitBreakers.forEach((breaker, operation) => {
      stats[operation] = {
        state: breaker.getState(),
        failureCount: breaker.getFailureCount()
      };
    });
    
    return stats;
  }
}



