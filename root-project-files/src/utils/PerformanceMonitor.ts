// ✅ IMPROVEMENT: Comprehensive performance monitoring system

import { PerformanceMetrics, MeasurementContext } from '../types/MeasurementTypes';

export interface PerformanceStats {
  avgFrameProcessingTime: number;
  avgMemoryUsage: number;
  avgBatteryDrain: number;
  measurementAccuracy: number;
  errorRate: number;
  performanceTrend: 'improving' | 'stable' | 'degrading';
  recommendation: string;
}

export class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private metrics: PerformanceMetrics[] = [];
  private maxMetricsHistory = 100;
  private startTime = Date.now();

  static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }

  recordMetrics(metrics: PerformanceMetrics): void {
    this.metrics.push({
      ...metrics,
      timestamp: Date.now()
    });

    // Keep only recent metrics
    if (this.metrics.length > this.maxMetricsHistory) {
      this.metrics = this.metrics.slice(-this.maxMetricsHistory);
    }
  }

  getPerformanceStats(): PerformanceStats {
    if (this.metrics.length === 0) {
      return {
        avgFrameProcessingTime: 0,
        avgMemoryUsage: 0,
        avgBatteryDrain: 0,
        measurementAccuracy: 0,
        errorRate: 0,
        performanceTrend: 'stable',
        recommendation: 'No data available'
      };
    }

    const avgFrameProcessingTime = this.metrics.reduce((sum, m) => sum + (m.frameProcessingTime || 0), 0) / this.metrics.length;
    const avgMemoryUsage = this.metrics.reduce((sum, m) => sum + (m.memoryUsage || 0), 0) / this.metrics.length;
    const avgBatteryDrain = this.metrics.reduce((sum, m) => sum + (m.batteryLevel || 0), 0) / this.metrics.length;
    const measurementAccuracy = this.metrics.reduce((sum, m) => sum + (m.measurementAccuracy || 0), 0) / this.metrics.length;
    const errorRate = this.metrics.reduce((sum, m) => sum + (m.errorRate || 0), 0) / this.metrics.length;

    const performanceTrend = this.calculatePerformanceTrend();
    const recommendation = this.generateRecommendation(avgFrameProcessingTime, avgMemoryUsage, avgBatteryDrain);

    return {
      avgFrameProcessingTime,
      avgMemoryUsage,
      avgBatteryDrain,
      measurementAccuracy,
      errorRate,
      performanceTrend,
      recommendation
    };
  }

  private calculatePerformanceTrend(): 'improving' | 'stable' | 'degrading' {
    if (this.metrics.length < 10) return 'stable';

    const recent = this.metrics.slice(-10);
    const older = this.metrics.slice(-20, -10);

    if (recent.length === 0 || older.length === 0) return 'stable';

    const recentAvg = recent.reduce((sum, m) => sum + (m.frameProcessingTime || 0), 0) / recent.length;
    const olderAvg = older.reduce((sum, m) => sum + (m.frameProcessingTime || 0), 0) / older.length;

    const improvement = (olderAvg - recentAvg) / olderAvg;

    if (improvement > 0.1) return 'improving';
    if (improvement < -0.1) return 'degrading';
    return 'stable';
  }

  private generateRecommendation(
    frameTime: number,
    memoryUsage: number,
    batteryLevel: number
  ): string {
    const recommendations: string[] = [];

    if (frameTime > 200) {
      recommendations.push('Consider reducing processing frequency');
    }

    if (memoryUsage > 300) {
      recommendations.push('Memory usage is high - consider cleanup');
    }

    if (batteryLevel < 20) {
      recommendations.push('Low battery - enable power saving mode');
    }

    if (recommendations.length === 0) {
      return 'Performance is optimal';
    }

    return recommendations.join('; ');
  }

  getOptimalSettings(): {
    frameProcessingInterval: number;
    maxHistorySize: number;
    enableAdvancedFeatures: boolean;
  } {
    const stats = this.getPerformanceStats();

    let frameProcessingInterval = 100;
    let maxHistorySize = 10;
    let enableAdvancedFeatures = true;

    if (stats.avgFrameProcessingTime > 150) {
      frameProcessingInterval = 200;
      maxHistorySize = 5;
    }

    if (stats.avgMemoryUsage > 250) {
      maxHistorySize = 5;
      enableAdvancedFeatures = false;
    }

    if (stats.avgBatteryDrain < 30) {
      frameProcessingInterval = 300;
      enableAdvancedFeatures = false;
    }

    return {
      frameProcessingInterval,
      maxHistorySize,
      enableAdvancedFeatures
    };
  }

  reset(): void {
    this.metrics = [];
    this.startTime = Date.now();
  }
}



