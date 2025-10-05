/**
 * Enhanced Measurement Accuracy System
 * Provides advanced measurement validation and correction
 */

export interface AccuracyConfig {
  enableTemporalSmoothing: boolean;
  enableOutlierDetection: boolean;
  enableProportionalValidation: boolean;
  smoothingWindow: number;
  outlierThreshold: number;
  minConfidenceThreshold: number;
}

export interface MeasurementValidation {
  isValid: boolean;
  confidence: number;
  corrections: MeasurementCorrection[];
  warnings: string[];
  quality: 'excellent' | 'good' | 'fair' | 'poor';
}

export interface MeasurementCorrection {
  type: 'scale' | 'offset' | 'proportional';
  value: number;
  reason: string;
  confidence: number;
}

export interface AccuracyMetrics {
  averageAccuracy: number;
  consistencyScore: number;
  outlierRate: number;
  temporalStability: number;
}

class MeasurementAccuracy {
  private static instance: MeasurementAccuracy;
  private config: AccuracyConfig;
  private measurementHistory: Array<{
    timestamp: number;
    measurements: any;
    confidence: number;
    quality: string;
  }> = [];
  private maxHistorySize = 50;

  private constructor() {
    this.config = {
      enableTemporalSmoothing: true,
      enableOutlierDetection: true,
      enableProportionalValidation: true,
      smoothingWindow: 5,
      outlierThreshold: 2.0,
      minConfidenceThreshold: 0.6
    };
  }

  static getInstance(): MeasurementAccuracy {
    if (!MeasurementAccuracy.instance) {
      MeasurementAccuracy.instance = new MeasurementAccuracy();
    }
    return MeasurementAccuracy.instance;
  }

  // Validate and correct measurements
  validateMeasurements(measurements: any, confidence: number): MeasurementValidation {
    const corrections: MeasurementCorrection[] = [];
    const warnings: string[] = [];
    let isValid = true;
    let quality: 'excellent' | 'good' | 'fair' | 'poor' = 'poor';

    // Check confidence threshold
    if (confidence < this.config.minConfidenceThreshold) {
      warnings.push(`Low confidence: ${confidence.toFixed(2)} < ${this.config.minConfidenceThreshold}`);
      quality = 'poor';
    }

    // Validate shoulder width
    const shoulderWidthValidation = this.validateShoulderWidth(measurements.shoulderWidthCm);
    if (!shoulderWidthValidation.isValid) {
      if (shoulderWidthValidation.correction) {
        corrections.push(shoulderWidthValidation.correction);
      }
      if (shoulderWidthValidation.warning) {
        warnings.push(shoulderWidthValidation.warning);
      }
      isValid = false;
    }

    // Validate height
    const heightValidation = this.validateHeight(measurements.heightCm);
    if (!heightValidation.isValid) {
      if (heightValidation.correction) {
        corrections.push(heightValidation.correction);
      }
      if (heightValidation.warning) {
        warnings.push(heightValidation.warning);
      }
      isValid = false;
    }

    // Validate proportions
    if (this.config.enableProportionalValidation) {
      const proportionValidation = this.validateProportions(measurements);
      if (!proportionValidation.isValid) {
        corrections.push(...proportionValidation.corrections);
        warnings.push(...proportionValidation.warnings);
        isValid = false;
      }
    }

    // Determine quality
    if (confidence >= 0.9 && warnings.length === 0) {
      quality = 'excellent';
    } else if (confidence >= 0.7 && warnings.length <= 1) {
      quality = 'good';
    } else if (confidence >= 0.5 && warnings.length <= 2) {
      quality = 'fair';
    }

    // Apply temporal smoothing if enabled
    let finalMeasurements = measurements;
    if (this.config.enableTemporalSmoothing && this.measurementHistory.length > 0) {
      finalMeasurements = this.applyTemporalSmoothing(measurements);
    }

    // Store in history
    this.addToHistory(measurements, confidence, quality);

    return {
      isValid,
      confidence,
      corrections,
      warnings,
      quality
    };
  }

  private validateShoulderWidth(width: number): {
    isValid: boolean;
    correction?: MeasurementCorrection;
    warning?: string;
  } {
    // Normal shoulder width range: 35-50 cm
    const minWidth = 35;
    const maxWidth = 50;

    if (width < minWidth) {
      return {
        isValid: false,
        correction: {
          type: 'scale',
          value: minWidth / width,
          reason: 'Shoulder width too small',
          confidence: 0.8
        },
        warning: `Shoulder width ${width.toFixed(1)}cm is below normal range (${minWidth}-${maxWidth}cm)`
      };
    }

    if (width > maxWidth) {
      return {
        isValid: false,
        correction: {
          type: 'scale',
          value: maxWidth / width,
          reason: 'Shoulder width too large',
          confidence: 0.8
        },
        warning: `Shoulder width ${width.toFixed(1)}cm is above normal range (${minWidth}-${maxWidth}cm)`
      };
    }

    return { isValid: true };
  }

  private validateHeight(height: number): {
    isValid: boolean;
    correction?: MeasurementCorrection;
    warning?: string;
  } {
    // Normal height range: 150-200 cm
    const minHeight = 150;
    const maxHeight = 200;

    if (height < minHeight) {
      return {
        isValid: false,
        correction: {
          type: 'scale',
          value: minHeight / height,
          reason: 'Height too small',
          confidence: 0.8
        },
        warning: `Height ${height.toFixed(1)}cm is below normal range (${minHeight}-${maxHeight}cm)`
      };
    }

    if (height > maxHeight) {
      return {
        isValid: false,
        correction: {
          type: 'scale',
          value: maxHeight / height,
          reason: 'Height too large',
          confidence: 0.8
        },
        warning: `Height ${height.toFixed(1)}cm is above normal range (${minHeight}-${maxHeight}cm)`
      };
    }

    return { isValid: true };
  }

  private validateProportions(measurements: any): {
    isValid: boolean;
    corrections: MeasurementCorrection[];
    warnings: string[];
  } {
    const corrections: MeasurementCorrection[] = [];
    const warnings: string[] = [];
    let isValid = true;

    // Check height to shoulder width ratio
    const heightToShoulderRatio = measurements.heightCm / measurements.shoulderWidthCm;
    const expectedRatio = 3.5; // Typical ratio
    const ratioTolerance = 0.5;

    if (Math.abs(heightToShoulderRatio - expectedRatio) > ratioTolerance) {
      const correctionFactor = expectedRatio / heightToShoulderRatio;
      corrections.push({
        type: 'proportional',
        value: correctionFactor,
        reason: 'Height to shoulder ratio out of normal range',
        confidence: 0.7
      });
      warnings.push(`Height to shoulder ratio ${heightToShoulderRatio.toFixed(2)} is outside normal range (${expectedRatio - ratioTolerance}-${expectedRatio + ratioTolerance})`);
      isValid = false;
    }

    return { isValid, corrections, warnings };
  }

  private applyTemporalSmoothing(measurements: any): any {
    if (this.measurementHistory.length < 2) {
      return measurements;
    }

    const recentMeasurements = this.measurementHistory.slice(-this.config.smoothingWindow);
    const weights = this.calculateWeights(recentMeasurements);

    const smoothedMeasurements = {
      shoulderWidthCm: this.calculateWeightedAverage(
        recentMeasurements.map(m => m.measurements.shoulderWidthCm),
        weights
      ),
      heightCm: this.calculateWeightedAverage(
        recentMeasurements.map(m => m.measurements.heightCm),
        weights
      )
    };

    return smoothedMeasurements;
  }

  private calculateWeights(measurements: any[]): number[] {
    const weights: number[] = [];
    const totalWeight = measurements.reduce((sum, m) => sum + m.confidence, 0);
    
    for (const measurement of measurements) {
      weights.push(measurement.confidence / totalWeight);
    }
    
    return weights;
  }

  private calculateWeightedAverage(values: number[], weights: number[]): number {
    let weightedSum = 0;
    let totalWeight = 0;

    for (let i = 0; i < values.length; i++) {
      weightedSum += values[i] * weights[i];
      totalWeight += weights[i];
    }

    return totalWeight > 0 ? weightedSum / totalWeight : values[values.length - 1];
  }

  private addToHistory(measurements: any, confidence: number, quality: string): void {
    this.measurementHistory.push({
      timestamp: Date.now(),
      measurements,
      confidence,
      quality
    });

    if (this.measurementHistory.length > this.maxHistorySize) {
      this.measurementHistory.shift();
    }
  }

  // Detect outliers in measurement history
  detectOutliers(): Array<{
    index: number;
    measurement: any;
    reason: string;
    severity: 'low' | 'medium' | 'high';
  }> {
    const outliers: Array<{
      index: number;
      measurement: any;
      reason: string;
      severity: 'low' | 'medium' | 'high';
    }> = [];

    if (this.measurementHistory.length < 3) {
      return outliers;
    }

    const shoulderWidths = this.measurementHistory.map(m => m.measurements.shoulderWidthCm);
    const heights = this.measurementHistory.map(m => m.measurements.heightCm);

    const shoulderMean = this.calculateMean(shoulderWidths);
    const shoulderStd = this.calculateStandardDeviation(shoulderWidths, shoulderMean);
    const heightMean = this.calculateMean(heights);
    const heightStd = this.calculateStandardDeviation(heights, heightMean);

    for (let i = 0; i < this.measurementHistory.length; i++) {
      const measurement = this.measurementHistory[i];
      const shoulderZ = Math.abs(measurement.measurements.shoulderWidthCm - shoulderMean) / shoulderStd;
      const heightZ = Math.abs(measurement.measurements.heightCm - heightMean) / heightStd;

      if (shoulderZ > this.config.outlierThreshold || heightZ > this.config.outlierThreshold) {
        const severity = Math.max(shoulderZ, heightZ) > 3 ? 'high' : 
                        Math.max(shoulderZ, heightZ) > 2 ? 'medium' : 'low';
        
        outliers.push({
          index: i,
          measurement,
          reason: `Z-score: shoulder=${shoulderZ.toFixed(2)}, height=${heightZ.toFixed(2)}`,
          severity
        });
      }
    }

    return outliers;
  }

  private calculateMean(values: number[]): number {
    return values.reduce((sum, value) => sum + value, 0) / values.length;
  }

  private calculateStandardDeviation(values: number[], mean: number): number {
    const variance = values.reduce((sum, value) => sum + Math.pow(value - mean, 2), 0) / values.length;
    return Math.sqrt(variance);
  }

  // Get accuracy metrics
  getAccuracyMetrics(): AccuracyMetrics {
    if (this.measurementHistory.length === 0) {
      return {
        averageAccuracy: 0,
        consistencyScore: 0,
        outlierRate: 0,
        temporalStability: 0
      };
    }

    const confidences = this.measurementHistory.map(m => m.confidence);
    const averageAccuracy = this.calculateMean(confidences);

    const consistencyScore = this.calculateConsistencyScore();
    const outliers = this.detectOutliers();
    const outlierRate = outliers.length / this.measurementHistory.length;

    const temporalStability = this.calculateTemporalStability();

    return {
      averageAccuracy,
      consistencyScore,
      outlierRate,
      temporalStability
    };
  }

  private calculateConsistencyScore(): number {
    if (this.measurementHistory.length < 2) return 1;

    const shoulderWidths = this.measurementHistory.map(m => m.measurements.shoulderWidthCm);
    const heights = this.measurementHistory.map(m => m.measurements.heightCm);

    const shoulderVariance = this.calculateVariance(shoulderWidths);
    const heightVariance = this.calculateVariance(heights);

    // Lower variance = higher consistency
    const shoulderConsistency = Math.max(0, 1 - shoulderVariance / 100);
    const heightConsistency = Math.max(0, 1 - heightVariance / 1000);

    return (shoulderConsistency + heightConsistency) / 2;
  }

  private calculateVariance(values: number[]): number {
    const mean = this.calculateMean(values);
    return values.reduce((sum, value) => sum + Math.pow(value - mean, 2), 0) / values.length;
  }

  private calculateTemporalStability(): number {
    if (this.measurementHistory.length < 3) return 1;

    let stabilityScore = 0;
    const windowSize = Math.min(3, this.measurementHistory.length - 1);

    for (let i = windowSize; i < this.measurementHistory.length; i++) {
      const recent = this.measurementHistory.slice(i - windowSize, i);
      const current = this.measurementHistory[i];

      const shoulderTrend = this.calculateTrend(recent.map(m => m.measurements.shoulderWidthCm));
      const heightTrend = this.calculateTrend(recent.map(m => m.measurements.heightCm));

      const shoulderStability = Math.abs(shoulderTrend) < 0.1 ? 1 : Math.max(0, 1 - Math.abs(shoulderTrend));
      const heightStability = Math.abs(heightTrend) < 0.1 ? 1 : Math.max(0, 1 - Math.abs(heightTrend));

      stabilityScore += (shoulderStability + heightStability) / 2;
    }

    return stabilityScore / (this.measurementHistory.length - windowSize);
  }

  private calculateTrend(values: number[]): number {
    if (values.length < 2) return 0;

    let trend = 0;
    for (let i = 1; i < values.length; i++) {
      trend += (values[i] - values[i - 1]) / values[i - 1];
    }

    return trend / (values.length - 1);
  }

  // Apply corrections to measurements
  applyCorrections(measurements: any, corrections: MeasurementCorrection[]): any {
    let correctedMeasurements = { ...measurements };

    for (const correction of corrections) {
      switch (correction.type) {
        case 'scale':
          correctedMeasurements.shoulderWidthCm *= correction.value;
          correctedMeasurements.heightCm *= correction.value;
          break;
        case 'offset':
          correctedMeasurements.shoulderWidthCm += correction.value;
          correctedMeasurements.heightCm += correction.value;
          break;
        case 'proportional':
          // Apply proportional correction
          const scaleFactor = correction.value;
          correctedMeasurements.shoulderWidthCm *= scaleFactor;
          correctedMeasurements.heightCm *= scaleFactor;
          break;
      }
    }

    return correctedMeasurements;
  }

  // Update configuration
  updateConfig(newConfig: Partial<AccuracyConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  // Clear measurement history
  clearHistory(): void {
    this.measurementHistory = [];
  }

  // Get measurement history
  getMeasurementHistory(): Array<{
    timestamp: number;
    measurements: any;
    confidence: number;
    quality: string;
  }> {
    return [...this.measurementHistory];
  }
}

export const measurementAccuracy = MeasurementAccuracy.getInstance();
export default MeasurementAccuracy;

