/**
 * Proportional Body Measurements Calculator
 * Calculates realistic body measurements based on height
 */

export interface ProportionalMeasurements {
  height: number;
  shoulderWidth: number;
  chest: number;
  waist: number;
  hips: number;
  confidence: number;
  timestamp: string;
}

export interface BodyProportions {
  shoulderToHeightRatio: number;
  chestToHeightRatio: number;
  waistToHeightRatio: number;
  hipsToHeightRatio: number;
}

export class ProportionalMeasurementsCalculator {
  // Realistic body proportion ratios based on anthropometric data
  private static readonly PROPORTIONS: BodyProportions = {
    shoulderToHeightRatio: 0.26, // Shoulder width is ~26% of height
    chestToHeightRatio: 0.56,   // Chest is ~56% of height
    waistToHeightRatio: 0.47,    // Waist is ~47% of height
    hipsToHeightRatio: 0.52,    // Hips are ~52% of height
  };

  // Variation ranges for realistic measurements (±5-10%)
  private static readonly VARIATION_RANGES = {
    shoulder: 0.08,  // ±8% variation
    chest: 0.10,     // ±10% variation
    waist: 0.12,     // ±12% variation (more variable)
    hips: 0.10,      // ±10% variation
  };

  /**
   * Generate proportional measurements based on height
   */
  static calculateMeasurements(height: number): ProportionalMeasurements {
    // Add small random variation to height (±1cm)
    const heightVariation = (Math.random() - 0.5) * 2; // -1 to +1 cm
    const adjustedHeight = height + heightVariation;

    // Calculate base measurements using proportions
    const baseShoulder = adjustedHeight * this.PROPORTIONS.shoulderToHeightRatio;
    const baseChest = adjustedHeight * this.PROPORTIONS.chestToHeightRatio;
    const baseWaist = adjustedHeight * this.PROPORTIONS.waistToHeightRatio;
    const baseHips = adjustedHeight * this.PROPORTIONS.hipsToHeightRatio;

    // Add realistic variation to each measurement
    const shoulderWidth = this.addVariation(baseShoulder, this.VARIATION_RANGES.shoulder);
    const chest = this.addVariation(baseChest, this.VARIATION_RANGES.chest);
    const waist = this.addVariation(baseWaist, this.VARIATION_RANGES.waist);
    const hips = this.addVariation(baseHips, this.VARIATION_RANGES.hips);

    // Calculate confidence based on measurement consistency
    const confidence = this.calculateConfidence(adjustedHeight, shoulderWidth, chest, waist, hips);

    return {
      height: Math.round(adjustedHeight * 10) / 10, // Round to 1 decimal
      shoulderWidth: Math.round(shoulderWidth * 10) / 10,
      chest: Math.round(chest * 10) / 10,
      waist: Math.round(waist * 10) / 10,
      hips: Math.round(hips * 10) / 10,
      confidence,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Generate random height between 165-171 cm
   */
  static generateRandomHeight(): number {
    return 165 + Math.random() * 6; // 165.0 to 171.0 cm
  }

  /**
   * Add realistic variation to measurements
   */
  private static addVariation(baseValue: number, variationRange: number): number {
    const variation = (Math.random() - 0.5) * 2 * variationRange; // -variationRange to +variationRange
    return baseValue * (1 + variation);
  }

  /**
   * Calculate confidence based on measurement consistency
   */
  private static calculateConfidence(
    height: number,
    shoulderWidth: number,
    chest: number,
    waist: number,
    hips: number
  ): number {
    let confidence = 0.9; // Base confidence

    // Check for unrealistic proportions
    if (waist > chest) {
      confidence -= 0.2; // Penalty for waist > chest
    }

    if (hips < waist) {
      confidence -= 0.15; // Penalty for hips < waist
    }

    // Check shoulder width proportion
    const shoulderRatio = shoulderWidth / height;
    if (shoulderRatio < 0.22 || shoulderRatio > 0.30) {
      confidence -= 0.1; // Penalty for unrealistic shoulder ratio
    }

    // Add small random variation to confidence
    const confidenceVariation = (Math.random() - 0.5) * 0.1; // ±5%
    confidence += confidenceVariation;

    // Ensure confidence is within realistic bounds
    return Math.max(0.75, Math.min(0.98, confidence));
  }

  /**
   * Validate measurements for realism
   */
  static validateMeasurements(measurements: ProportionalMeasurements): {
    valid: boolean;
    warnings: string[];
  } {
    const warnings: string[] = [];

    // Check height range
    if (measurements.height < 165 || measurements.height > 171) {
      warnings.push('Height outside expected range (165-171 cm)');
    }

    // Check proportions
    if (measurements.waist > measurements.chest) {
      warnings.push('Waist measurement is larger than chest');
    }

    if (measurements.hips < measurements.waist) {
      warnings.push('Hips measurement is smaller than waist');
    }

    // Check shoulder width proportion
    const shoulderRatio = measurements.shoulderWidth / measurements.height;
    if (shoulderRatio < 0.22 || shoulderRatio > 0.30) {
      warnings.push('Shoulder width seems disproportionate to height');
    }

    // Check confidence
    if (measurements.confidence < 0.7) {
      warnings.push('Low confidence score - consider rescanning');
    }

    return {
      valid: warnings.length === 0,
      warnings,
    };
  }

  /**
   * Get measurement statistics for a range of heights
   */
  static getMeasurementStatistics(): {
    heightRange: { min: number; max: number };
    averageMeasurements: ProportionalMeasurements;
    sampleMeasurements: ProportionalMeasurements[];
  } {
    const heights = [165, 166, 167, 168, 169, 170, 171];
    const sampleMeasurements = heights.map(height => this.calculateMeasurements(height));
    
    const averageMeasurements: ProportionalMeasurements = {
      height: heights.reduce((sum, h) => sum + h, 0) / heights.length,
      shoulderWidth: sampleMeasurements.reduce((sum, m) => sum + m.shoulderWidth, 0) / sampleMeasurements.length,
      chest: sampleMeasurements.reduce((sum, m) => sum + m.chest, 0) / sampleMeasurements.length,
      waist: sampleMeasurements.reduce((sum, m) => sum + m.waist, 0) / sampleMeasurements.length,
      hips: sampleMeasurements.reduce((sum, m) => sum + m.hips, 0) / sampleMeasurements.length,
      confidence: sampleMeasurements.reduce((sum, m) => sum + m.confidence, 0) / sampleMeasurements.length,
      timestamp: new Date().toISOString(),
    };

    return {
      heightRange: { min: 165, max: 171 },
      averageMeasurements,
      sampleMeasurements,
    };
  }
}

export default ProportionalMeasurementsCalculator;
