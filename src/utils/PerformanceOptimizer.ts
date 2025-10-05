/**
 * Performance Optimizer for AR Body Measurements
 * Handles frame rate optimization, memory management, and performance monitoring
 */

export interface PerformanceConfig {
  targetFrameRate: number;
  maxMemoryUsage: number;
  enableAdaptiveQuality: boolean;
  qualityLevels: {
    high: { frameRate: number; resolution: number };
    medium: { frameRate: number; resolution: number };
    low: { frameRate: number; resolution: number };
  };
}

export interface PerformanceMetrics {
  currentFrameRate: number;
  memoryUsage: number;
  processingTime: number;
  qualityLevel: 'high' | 'medium' | 'low';
  batteryLevel?: number;
  thermalState?: 'normal' | 'fair' | 'serious' | 'critical';
}

class PerformanceOptimizer {
  private static instance: PerformanceOptimizer;
  private config: PerformanceConfig;
  private metrics: PerformanceMetrics;
  private frameHistory: number[] = [];
  private maxHistorySize = 30;
  private lastFrameTime = 0;
  private adaptiveQuality = true;

  private constructor() {
    this.config = {
      targetFrameRate: 30,
      maxMemoryUsage: 512 * 1024 * 1024, // 512MB
      enableAdaptiveQuality: true,
      qualityLevels: {
        high: { frameRate: 60, resolution: 1.0 },
        medium: { frameRate: 30, resolution: 0.8 },
        low: { frameRate: 15, resolution: 0.6 }
      }
    };

    this.metrics = {
      currentFrameRate: 0,
      memoryUsage: 0,
      processingTime: 0,
      qualityLevel: 'high'
    };
  }

  static getInstance(): PerformanceOptimizer {
    if (!PerformanceOptimizer.instance) {
      PerformanceOptimizer.instance = new PerformanceOptimizer();
    }
    return PerformanceOptimizer.instance;
  }

  // Optimize frame processing based on current performance
  optimizeFrameProcessing(frameTime: number): { shouldProcess: boolean; quality: number } {
    const currentTime = Date.now();
    const deltaTime = currentTime - this.lastFrameTime;
    this.lastFrameTime = currentTime;

    // Calculate current frame rate
    if (deltaTime > 0) {
      const frameRate = 1000 / deltaTime;
      this.frameHistory.push(frameRate);
      
      if (this.frameHistory.length > this.maxHistorySize) {
        this.frameHistory.shift();
      }
    }

    // Update metrics
    this.metrics.currentFrameRate = this.getAverageFrameRate();
    this.metrics.processingTime = frameTime;

    // Determine if we should process this frame
    const shouldProcess = this.shouldProcessFrame();
    const quality = this.getOptimalQuality();

    return { shouldProcess, quality };
  }

  private shouldProcessFrame(): boolean {
    const avgFrameRate = this.getAverageFrameRate();
    const targetFrameRate = this.config.targetFrameRate;

    // Skip frames if we're below target frame rate
    if (avgFrameRate < targetFrameRate * 0.8) {
      return false;
    }

    // Process every frame if performance is good
    if (avgFrameRate >= targetFrameRate) {
      return true;
    }

    // Adaptive processing based on performance
    const performanceRatio = avgFrameRate / targetFrameRate;
    return Math.random() < performanceRatio;
  }

  private getOptimalQuality(): number {
    if (!this.adaptiveQuality) {
      return this.config.qualityLevels.high.resolution;
    }

    const avgFrameRate = this.getAverageFrameRate();
    const targetFrameRate = this.config.targetFrameRate;

    if (avgFrameRate >= targetFrameRate * 1.2) {
      this.metrics.qualityLevel = 'high';
      return this.config.qualityLevels.high.resolution;
    } else if (avgFrameRate >= targetFrameRate * 0.8) {
      this.metrics.qualityLevel = 'medium';
      return this.config.qualityLevels.medium.resolution;
    } else {
      this.metrics.qualityLevel = 'low';
      return this.config.qualityLevels.low.resolution;
    }
  }

  private getAverageFrameRate(): number {
    if (this.frameHistory.length === 0) return 0;
    
    const sum = this.frameHistory.reduce((acc, rate) => acc + rate, 0);
    return sum / this.frameHistory.length;
  }

  // Memory management
  optimizeMemoryUsage(): void {
    // Clear old frame history if memory usage is high
    if (this.metrics.memoryUsage > this.config.maxMemoryUsage * 0.8) {
      this.frameHistory = this.frameHistory.slice(-10);
    }
  }

  // Update performance metrics
  updateMetrics(metrics: Partial<PerformanceMetrics>): void {
    this.metrics = { ...this.metrics, ...metrics };
  }

  // Get current performance status
  getPerformanceStatus(): {
    status: 'excellent' | 'good' | 'fair' | 'poor';
    recommendation: string;
    metrics: PerformanceMetrics;
  } {
    const avgFrameRate = this.getAverageFrameRate();
    const targetFrameRate = this.config.targetFrameRate;

    let status: 'excellent' | 'good' | 'fair' | 'poor';
    let recommendation: string;

    if (avgFrameRate >= targetFrameRate * 1.2) {
      status = 'excellent';
      recommendation = 'Performance is excellent. All features enabled.';
    } else if (avgFrameRate >= targetFrameRate) {
      status = 'good';
      recommendation = 'Performance is good. Standard features enabled.';
    } else if (avgFrameRate >= targetFrameRate * 0.7) {
      status = 'fair';
      recommendation = 'Performance is fair. Some features may be limited.';
    } else {
      status = 'poor';
      recommendation = 'Performance is poor. Consider reducing quality settings.';
    }

    return {
      status,
      recommendation,
      metrics: this.metrics
    };
  }

  // Configure performance settings
  updateConfig(newConfig: Partial<PerformanceConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  // Reset performance monitoring
  reset(): void {
    this.frameHistory = [];
    this.lastFrameTime = 0;
    this.metrics = {
      currentFrameRate: 0,
      memoryUsage: 0,
      processingTime: 0,
      qualityLevel: 'high'
    };
  }
}

export const performanceOptimizer = PerformanceOptimizer.getInstance();
export default PerformanceOptimizer;

