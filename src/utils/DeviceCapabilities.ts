/**
 * Device Capabilities Detection and Adaptive Performance
 * 
 * Detects device capabilities and provides adaptive performance settings
 * based on hardware specifications and performance characteristics.
 */

import { Platform } from 'react-native';
import { arConfig } from '../config/ARConfig';
import { logger } from './ARLogger';

export interface DeviceCapabilities {
  performanceTier: 'high-end' | 'mid-range' | 'low-end';
  memoryGB: number;
  processorCores: number;
  hasHighPerformanceGPU: boolean;
  supportsAdvancedAR: boolean;
  recommendedFrameInterval: number;
  maxConcurrentOperations: number;
}

export interface PerformanceMetrics {
  frameProcessingTime: number;
  memoryUsage: number;
  batteryLevel?: number;
  thermalState?: 'normal' | 'fair' | 'serious' | 'critical';
}

class DeviceCapabilitiesManager {
  private static instance: DeviceCapabilitiesManager;
  private capabilities: DeviceCapabilities | null = null;
  private performanceHistory: PerformanceMetrics[] = [];
  private maxPerformanceHistory = 50;

  private constructor() {}

  static getInstance(): DeviceCapabilitiesManager {
    if (!DeviceCapabilitiesManager.instance) {
      DeviceCapabilitiesManager.instance = new DeviceCapabilitiesManager();
    }
    return DeviceCapabilitiesManager.instance;
  }

  /**
   * Detect device capabilities based on platform and hardware
   */
  async detectCapabilities(): Promise<DeviceCapabilities> {
    if (this.capabilities) {
      return this.capabilities;
    }

    try {
      let capabilities: DeviceCapabilities;

      if (Platform.OS === 'android') {
        capabilities = await this.detectAndroidCapabilities();
      } else if (Platform.OS === 'ios') {
        capabilities = await this.detectiOSCapabilities();
      } else {
        // Fallback for other platforms
        capabilities = this.getDefaultCapabilities();
      }

      this.capabilities = capabilities;
      logger.info('DeviceCapabilities', 'detectCapabilities', 'Device capabilities detected', {
        performanceTier: capabilities.performanceTier,
        memoryGB: capabilities.memoryGB,
        processorCores: capabilities.processorCores,
        recommendedFrameInterval: capabilities.recommendedFrameInterval,
      });

      return capabilities;
    } catch (error) {
      logger.error('DeviceCapabilities', 'detectCapabilities', (error as Error).message || 'Unknown error');
      return this.getDefaultCapabilities();
    }
  }

  /**
   * Detect Android device capabilities
   */
  private async detectAndroidCapabilities(): Promise<DeviceCapabilities> {
    // This would typically use native modules to get device specs
    // For now, we'll use heuristics based on available information
    
    const memoryGB = await this.getAndroidMemoryGB();
    const processorCores = await this.getAndroidProcessorCores();
    
    // Determine performance tier based on hardware specs
    let performanceTier: 'high-end' | 'mid-range' | 'low-end';
    let hasHighPerformanceGPU = false;
    let supportsAdvancedAR = true;

    if (memoryGB >= 6 && processorCores >= 8) {
      performanceTier = 'high-end';
      hasHighPerformanceGPU = true;
    } else if (memoryGB >= 4 && processorCores >= 6) {
      performanceTier = 'mid-range';
      hasHighPerformanceGPU = true;
    } else {
      performanceTier = 'low-end';
      hasHighPerformanceGPU = false;
      supportsAdvancedAR = memoryGB >= 3; // Minimum for basic AR
    }

    const recommendedFrameInterval = arConfig.performance.frameProcessingInterval[
      performanceTier === 'high-end' ? 'highEnd' : 
      performanceTier === 'mid-range' ? 'midRange' : 'lowEnd'
    ];
    const maxConcurrentOperations = this.calculateMaxConcurrentOperations(performanceTier);

    return {
      performanceTier,
      memoryGB,
      processorCores,
      hasHighPerformanceGPU,
      supportsAdvancedAR,
      recommendedFrameInterval,
      maxConcurrentOperations,
    };
  }

  /**
   * Detect iOS device capabilities
   */
  private async detectiOSCapabilities(): Promise<DeviceCapabilities> {
    // iOS devices have more predictable performance characteristics
    const deviceModel = await this.getiOSDeviceModel();
    
    let performanceTier: 'high-end' | 'mid-range' | 'low-end';
    let memoryGB: number;
    let processorCores: number;
    let hasHighPerformanceGPU: boolean;
    let supportsAdvancedAR: boolean;

    // iPhone performance tiers based on model
    if (deviceModel.includes('iPhone 15') || deviceModel.includes('iPhone 14 Pro') || 
        deviceModel.includes('iPhone 13 Pro') || deviceModel.includes('iPhone 12 Pro')) {
      performanceTier = 'high-end';
      memoryGB = 6;
      processorCores = 6;
      hasHighPerformanceGPU = true;
      supportsAdvancedAR = true;
    } else if (deviceModel.includes('iPhone 14') || deviceModel.includes('iPhone 13') || 
               deviceModel.includes('iPhone 12') || deviceModel.includes('iPhone 11 Pro')) {
      performanceTier = 'mid-range';
      memoryGB = 4;
      processorCores = 6;
      hasHighPerformanceGPU = true;
      supportsAdvancedAR = true;
    } else if (deviceModel.includes('iPhone 11') || deviceModel.includes('iPhone XS') || 
               deviceModel.includes('iPhone XR') || deviceModel.includes('iPhone X')) {
      performanceTier = 'mid-range';
      memoryGB = 3;
      processorCores = 6;
      hasHighPerformanceGPU = true;
      supportsAdvancedAR = true;
    } else {
      // Older devices or unknown models
      performanceTier = 'low-end';
      memoryGB = 2;
      processorCores = 4;
      hasHighPerformanceGPU = false;
      supportsAdvancedAR = false;
    }

    const recommendedFrameInterval = arConfig.performance.frameProcessingInterval[
      performanceTier === 'high-end' ? 'highEnd' : 
      performanceTier === 'mid-range' ? 'midRange' : 'lowEnd'
    ];
    const maxConcurrentOperations = this.calculateMaxConcurrentOperations(performanceTier);

    return {
      performanceTier,
      memoryGB,
      processorCores,
      hasHighPerformanceGPU,
      supportsAdvancedAR,
      recommendedFrameInterval,
      maxConcurrentOperations,
    };
  }

  /**
   * Get default capabilities for unknown devices
   */
  private getDefaultCapabilities(): DeviceCapabilities {
    return {
      performanceTier: 'mid-range',
      memoryGB: 4,
      processorCores: 6,
      hasHighPerformanceGPU: true,
      supportsAdvancedAR: true,
      recommendedFrameInterval: arConfig.performance.frameProcessingInterval.midRange,
      maxConcurrentOperations: 3,
    };
  }

  /**
   * Get Android memory in GB (placeholder implementation)
   */
  private async getAndroidMemoryGB(): Promise<number> {
    // This would typically use a native module to get actual memory
    // For now, return a reasonable default
    return 4;
  }

  /**
   * Get Android processor cores (placeholder implementation)
   */
  private async getAndroidProcessorCores(): Promise<number> {
    // This would typically use a native module to get actual core count
    // For now, return a reasonable default
    return 6;
  }

  /**
   * Get iOS device model (placeholder implementation)
   */
  private async getiOSDeviceModel(): Promise<string> {
    // This would typically use a native module to get device model
    // For now, return a reasonable default
    return 'iPhone 13';
  }

  /**
   * Calculate maximum concurrent operations based on performance tier
   */
  private calculateMaxConcurrentOperations(tier: 'high-end' | 'mid-range' | 'low-end'): number {
    switch (tier) {
      case 'high-end': return 5;
      case 'mid-range': return 3;
      case 'low-end': return 2;
      default: return 3;
    }
  }

  /**
   * Get current device capabilities
   */
  getCapabilities(): DeviceCapabilities | null {
    return this.capabilities;
  }

  /**
   * Update performance metrics for adaptive optimization
   */
  updatePerformanceMetrics(metrics: PerformanceMetrics): void {
    this.performanceHistory.push(metrics);
    
    // Maintain history size
    if (this.performanceHistory.length > this.maxPerformanceHistory) {
      this.performanceHistory = this.performanceHistory.slice(-this.maxPerformanceHistory);
    }

    // Check if we need to adjust performance settings
    this.checkPerformanceAdjustment();
  }

  /**
   * Check if performance adjustment is needed based on recent metrics
   */
  private checkPerformanceAdjustment(): void {
    if (this.performanceHistory.length < 10) {
      return; // Need more data
    }

    const recentMetrics = this.performanceHistory.slice(-10);
    const avgFrameTime = recentMetrics.reduce((sum, m) => sum + m.frameProcessingTime, 0) / recentMetrics.length;
    const avgMemoryUsage = recentMetrics.reduce((sum, m) => sum + m.memoryUsage, 0) / recentMetrics.length;

    const currentCapabilities = this.capabilities;
    if (!currentCapabilities) return;

    // If performance is degrading, suggest reducing frame rate
    if (avgFrameTime > currentCapabilities.recommendedFrameInterval * 1.5) {
      logger.warn('DeviceCapabilities', 'checkPerformanceAdjustment', 
        'Performance degradation detected, consider reducing frame rate', {
        avgFrameTime,
        recommendedInterval: currentCapabilities.recommendedFrameInterval,
        avgMemoryUsage,
      });
    }

    // If memory usage is high, suggest reducing concurrent operations
    if (avgMemoryUsage > currentCapabilities.memoryGB * 0.8) {
      logger.warn('DeviceCapabilities', 'checkPerformanceAdjustment', 
        'High memory usage detected, consider reducing concurrent operations', {
        avgMemoryUsage,
        memoryLimit: currentCapabilities.memoryGB,
      });
    }
  }

  /**
   * Get optimal frame processing interval based on current performance
   */
  getOptimalFrameInterval(): number {
    if (!this.capabilities) {
      return arConfig.performance.frameProcessingInterval.midRange;
    }

    // If we have performance history, adjust based on recent performance
    if (this.performanceHistory.length >= 5) {
      const recentMetrics = this.performanceHistory.slice(-5);
      const avgFrameTime = recentMetrics.reduce((sum, m) => sum + m.frameProcessingTime, 0) / recentMetrics.length;
      
      // If frames are taking too long, increase interval
      if (avgFrameTime > this.capabilities.recommendedFrameInterval * 1.2) {
        return Math.min(this.capabilities.recommendedFrameInterval * 1.5, 300);
      }
      
      // If frames are very fast, we can reduce interval
      if (avgFrameTime < this.capabilities.recommendedFrameInterval * 0.7) {
        return Math.max(this.capabilities.recommendedFrameInterval * 0.8, 30);
      }
    }

    return this.capabilities.recommendedFrameInterval;
  }

  /**
   * Get optimal memory bounds for collections
   */
  getOptimalMemoryBounds(): {
    maxTemporalConsistencyHistory: number;
    maxFrameValidationBuffer: number;
    maxErrorLogEntries: number;
  } {
    if (!this.capabilities) {
      return {
        maxTemporalConsistencyHistory: arConfig.memory.maxTemporalConsistencyHistory,
        maxFrameValidationBuffer: arConfig.memory.maxFrameValidationBuffer,
        maxErrorLogEntries: arConfig.memory.maxErrorLogEntries,
      };
    }

    // Adjust based on available memory
    const memoryMultiplier = Math.min(this.capabilities.memoryGB / 4, 2); // Cap at 2x

    return {
      maxTemporalConsistencyHistory: Math.floor(arConfig.memory.maxTemporalConsistencyHistory * memoryMultiplier),
      maxFrameValidationBuffer: Math.floor(arConfig.memory.maxFrameValidationBuffer * memoryMultiplier),
      maxErrorLogEntries: Math.floor(arConfig.memory.maxErrorLogEntries * memoryMultiplier),
    };
  }

  /**
   * Check if device supports advanced AR features
   */
  supportsAdvancedAR(): boolean {
    return this.capabilities?.supportsAdvancedAR ?? true;
  }

  /**
   * Get performance tier
   */
  getPerformanceTier(): 'high-end' | 'mid-range' | 'low-end' {
    return this.capabilities?.performanceTier ?? 'mid-range';
  }

  /**
   * Reset capabilities (for testing or device change)
   */
  resetCapabilities(): void {
    this.capabilities = null;
    this.performanceHistory = [];
    logger.info('DeviceCapabilities', 'resetCapabilities', 'Device capabilities reset');
  }

  /**
   * Get performance statistics
   */
  getPerformanceStats(): {
    avgFrameTime: number;
    avgMemoryUsage: number;
    performanceTrend: 'improving' | 'stable' | 'degrading';
    recommendation: string;
  } {
    if (this.performanceHistory.length === 0) {
      return {
        avgFrameTime: 0,
        avgMemoryUsage: 0,
        performanceTrend: 'stable',
        recommendation: 'Insufficient data for analysis',
      };
    }

    const recent = this.performanceHistory.slice(-10);
    const older = this.performanceHistory.slice(-20, -10);

    const recentAvgFrameTime = recent.reduce((sum, m) => sum + m.frameProcessingTime, 0) / recent.length;
    const recentAvgMemory = recent.reduce((sum, m) => sum + m.memoryUsage, 0) / recent.length;

    let performanceTrend: 'improving' | 'stable' | 'degrading' = 'stable';
    let recommendation = 'Performance is stable';

    if (older.length > 0) {
      const olderAvgFrameTime = older.reduce((sum, m) => sum + m.frameProcessingTime, 0) / older.length;
      const frameTimeChange = (recentAvgFrameTime - olderAvgFrameTime) / olderAvgFrameTime;

      if (frameTimeChange > 0.1) {
        performanceTrend = 'degrading';
        recommendation = 'Consider reducing frame processing frequency';
      } else if (frameTimeChange < -0.1) {
        performanceTrend = 'improving';
        recommendation = 'Performance is improving, can increase processing frequency';
      }
    }

    return {
      avgFrameTime: recentAvgFrameTime,
      avgMemoryUsage: recentAvgMemory,
      performanceTrend,
      recommendation,
    };
  }
}

// Export singleton instance
export const deviceCapabilities = DeviceCapabilitiesManager.getInstance();

// Export convenience functions
export const getDeviceCapabilities = () => deviceCapabilities.getCapabilities();
export const getOptimalFrameInterval = () => deviceCapabilities.getOptimalFrameInterval();
export const getOptimalMemoryBounds = () => deviceCapabilities.getOptimalMemoryBounds();
export const supportsAdvancedAR = () => deviceCapabilities.supportsAdvancedAR();
export const getPerformanceTier = () => deviceCapabilities.getPerformanceTier();

export default deviceCapabilities;


