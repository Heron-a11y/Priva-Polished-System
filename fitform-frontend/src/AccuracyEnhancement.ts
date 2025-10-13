/**
 * AR Accuracy Enhancement Module
 * Provides advanced accuracy enhancement for AR body measurements
 */

import { ARUtils, ARBodyLandmark } from './utils/ARUtils';

export interface AccuracyConfig {
  smoothingEnabled: boolean;
  smoothingWindowSize: number;
  confidenceThreshold: number;
  outlierDetectionEnabled: boolean;
  outlierThreshold: number;
  calibrationEnabled: boolean;
}

export interface EnhancedMeasurement {
  value: number;
  confidence: number;
  smoothed: boolean;
  outliers: number[];
  timestamp: number;
}

export class AccuracyEnhancement {
  private config: AccuracyConfig;
  private measurementHistory: number[] = [];
  private calibrationData: { [key: string]: number } = {};

  constructor(config?: Partial<AccuracyConfig>) {
    this.config = {
      smoothingEnabled: true,
      smoothingWindowSize: 5,
      confidenceThreshold: 0.7,
      outlierDetectionEnabled: true,
      outlierThreshold: 2.0,
      calibrationEnabled: false,
      ...config,
    };
  }

  /**
   * Enhance measurement accuracy using multiple techniques
   */
  enhanceMeasurement(
    rawValue: number,
    landmarks: ARBodyLandmark[],
    measurementType: string
  ): EnhancedMeasurement {
    const confidence = ARUtils.calculateConfidence(landmarks);
    
    // Add to history for smoothing
    this.measurementHistory.push(rawValue);
    
    // Keep only recent measurements
    if (this.measurementHistory.length > 20) {
      this.measurementHistory = this.measurementHistory.slice(-20);
    }

    let enhancedValue = rawValue;
    let smoothed = false;
    const outliers: number[] = [];

    // Apply smoothing if enabled
    if (this.config.smoothingEnabled && this.measurementHistory.length >= this.config.smoothingWindowSize) {
      const smoothedValues = ARUtils.smoothMeasurements(
        this.measurementHistory,
        this.config.smoothingWindowSize
      );
      enhancedValue = smoothedValues[smoothedValues.length - 1];
      smoothed = true;
    }

    // Detect outliers
    if (this.config.outlierDetectionEnabled) {
      const outliers = this.detectOutliers(this.measurementHistory);
      if (outliers.length > 0) {
        // Use median instead of mean if outliers detected
        const sortedValues = [...this.measurementHistory].sort((a, b) => a - b);
        const median = sortedValues[Math.floor(sortedValues.length / 2)];
        enhancedValue = median;
      }
    }

    // Apply calibration if enabled
    if (this.config.calibrationEnabled && this.calibrationData[measurementType]) {
      enhancedValue = this.applyCalibration(enhancedValue, measurementType);
    }

    return {
      value: enhancedValue,
      confidence,
      smoothed,
      outliers,
      timestamp: Date.now(),
    };
  }

  /**
   * Detect outliers in measurement data
   */
  private detectOutliers(values: number[]): number[] {
    if (values.length < 3) return [];

    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
    const standardDeviation = Math.sqrt(variance);

    return values.filter(val => 
      Math.abs(val - mean) > this.config.outlierThreshold * standardDeviation
    );
  }

  /**
   * Apply calibration correction
   */
  private applyCalibration(value: number, measurementType: string): number {
    const calibrationFactor = this.calibrationData[measurementType] || 1.0;
    return value * calibrationFactor;
  }

  /**
   * Set calibration data
   */
  setCalibration(measurementType: string, referenceValue: number, measuredValue: number): void {
    this.calibrationData[measurementType] = referenceValue / measuredValue;
  }

  /**
   * Get calibration data
   */
  getCalibration(measurementType: string): number {
    return this.calibrationData[measurementType] || 1.0;
  }

  /**
   * Clear calibration data
   */
  clearCalibration(): void {
    this.calibrationData = {};
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<AccuracyConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * Get current configuration
   */
  getConfig(): AccuracyConfig {
    return { ...this.config };
  }

  /**
   * Reset measurement history
   */
  resetHistory(): void {
    this.measurementHistory = [];
  }

  /**
   * Get measurement statistics
   */
  getStatistics(): {
    count: number;
    mean: number;
    standardDeviation: number;
    min: number;
    max: number;
  } {
    if (this.measurementHistory.length === 0) {
      return { count: 0, mean: 0, standardDeviation: 0, min: 0, max: 0 };
    }

    const mean = this.measurementHistory.reduce((sum, val) => sum + val, 0) / this.measurementHistory.length;
    const variance = this.measurementHistory.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / this.measurementHistory.length;
    const standardDeviation = Math.sqrt(variance);
    const min = Math.min(...this.measurementHistory);
    const max = Math.max(...this.measurementHistory);

    return {
      count: this.measurementHistory.length,
      mean,
      standardDeviation,
      min,
      max,
    };
  }

  /**
   * Validate measurement quality
   */
  validateQuality(measurement: EnhancedMeasurement): {
    quality: 'excellent' | 'good' | 'fair' | 'poor';
    issues: string[];
  } {
    const issues: string[] = [];

    if (measurement.confidence < 0.9) {
      issues.push('Low confidence score');
    }

    if (measurement.outliers.length > 0) {
      issues.push('Outliers detected');
    }

    if (!measurement.smoothed && this.config.smoothingEnabled) {
      issues.push('Smoothing not applied');
    }

    let quality: 'excellent' | 'good' | 'fair' | 'poor';
    if (issues.length === 0) {
      quality = 'excellent';
    } else if (issues.length === 1) {
      quality = 'good';
    } else if (issues.length === 2) {
      quality = 'fair';
    } else {
      quality = 'poor';
    }

    return { quality, issues };
  }
}

export default AccuracyEnhancement;
