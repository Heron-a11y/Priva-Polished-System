/**
 * AR Utility Functions
 * Common utilities for AR functionality
 */

export interface ARPoint {
  x: number;
  y: number;
  z: number;
}

export interface ARMeasurement {
  value: number;
  unit: string;
  confidence: number;
  timestamp: number;
}

export interface ARBodyLandmark {
  name: string;
  position: ARPoint;
  confidence: number;
  visible: boolean;
}

export class ARUtils {
  /**
   * Calculate distance between two 3D points
   */
  static calculateDistance(point1: ARPoint, point2: ARPoint): number {
    const dx = point2.x - point1.x;
    const dy = point2.y - point1.y;
    const dz = point2.z - point1.z;
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  }

  /**
   * Convert centimeters to inches
   */
  static cmToInches(cm: number): number {
    return cm / 2.54;
  }

  /**
   * Convert inches to centimeters
   */
  static inchesToCm(inches: number): number {
    return inches * 2.54;
  }

  /**
   * Validate measurement value
   */
  static validateMeasurement(value: number, min: number, max: number): boolean {
    return value >= min && value <= max;
  }

  /**
   * Calculate body measurements from landmarks
   */
  static calculateBodyMeasurements(landmarks: ARBodyLandmark[]): {
    height: number;
    shoulderWidth: number;
    chest: number;
    waist: number;
    hips: number;
  } {
    // Mock calculation - in real implementation, this would use actual landmark positions
    const height = 175 + Math.random() * 10;
    const shoulderWidth = 45 + Math.random() * 5;
    const chest = 95 + Math.random() * 10;
    const waist = 80 + Math.random() * 8;
    const hips = 90 + Math.random() * 8;

    return {
      height,
      shoulderWidth,
      chest,
      waist,
      hips,
    };
  }

  /**
   * Smooth measurement values using moving average
   */
  static smoothMeasurements(measurements: number[], windowSize: number = 5): number[] {
    if (measurements.length < windowSize) {
      return measurements;
    }

    const smoothed: number[] = [];
    for (let i = 0; i < measurements.length; i++) {
      const start = Math.max(0, i - Math.floor(windowSize / 2));
      const end = Math.min(measurements.length, start + windowSize);
      const window = measurements.slice(start, end);
      const average = window.reduce((sum, val) => sum + val, 0) / window.length;
      smoothed.push(average);
    }

    return smoothed;
  }

  /**
   * Calculate confidence score based on landmark visibility
   */
  static calculateConfidence(landmarks: ARBodyLandmark[]): number {
    if (landmarks.length === 0) return 0;

    const visibleLandmarks = landmarks.filter(landmark => landmark.visible);
    const visibilityRatio = visibleLandmarks.length / landmarks.length;
    
    const averageConfidence = visibleLandmarks.reduce(
      (sum, landmark) => sum + landmark.confidence, 
      0
    ) / visibleLandmarks.length;

    return visibilityRatio * averageConfidence;
  }

  /**
   * Format measurement for display
   */
  static formatMeasurement(value: number, unit: string, decimals: number = 1): string {
    return `${value.toFixed(decimals)} ${unit}`;
  }

  /**
   * Check if measurements are realistic
   */
  static validateBodyProportions(measurements: {
    height: number;
    shoulderWidth: number;
    chest: number;
    waist: number;
    hips: number;
  }): { valid: boolean; warnings: string[] } {
    const warnings: string[] = [];

    // Check height range
    if (measurements.height < 100 || measurements.height > 250) {
      warnings.push('Height seems unrealistic');
    }

    // Check proportions
    if (measurements.waist > measurements.chest) {
      warnings.push('Waist measurement is larger than chest');
    }

    if (measurements.hips < measurements.waist) {
      warnings.push('Hips measurement is smaller than waist');
    }

    // Check shoulder width relative to height
    const shoulderToHeightRatio = measurements.shoulderWidth / measurements.height;
    if (shoulderToHeightRatio < 0.2 || shoulderToHeightRatio > 0.4) {
      warnings.push('Shoulder width seems disproportionate to height');
    }

    return {
      valid: warnings.length === 0,
      warnings,
    };
  }

  /**
   * Generate mock landmarks for testing
   */
  static generateMockLandmarks(): ARBodyLandmark[] {
    return [
      {
        name: 'head_top',
        position: { x: 0, y: 0, z: 0 },
        confidence: 0.9,
        visible: true,
      },
      {
        name: 'left_shoulder',
        position: { x: -0.2, y: -0.3, z: 0 },
        confidence: 0.85,
        visible: true,
      },
      {
        name: 'right_shoulder',
        position: { x: 0.2, y: -0.3, z: 0 },
        confidence: 0.85,
        visible: true,
      },
      {
        name: 'left_hip',
        position: { x: -0.15, y: -0.6, z: 0 },
        confidence: 0.8,
        visible: true,
      },
      {
        name: 'right_hip',
        position: { x: 0.15, y: -0.6, z: 0 },
        confidence: 0.8,
        visible: true,
      },
    ];
  }
}

export default ARUtils;
