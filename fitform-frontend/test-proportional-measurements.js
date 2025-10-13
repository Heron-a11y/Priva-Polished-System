/**
 * Proportional Measurements Test Script
 * Tests the dynamic measurement system with height 165-171 cm
 */

console.log('🧮 Testing Proportional Measurements System\n');

// Simulate the ProportionalMeasurementsCalculator
const ProportionalMeasurementsCalculator = {
  PROPORTIONS: {
    shoulderToHeightRatio: 0.26, // Shoulder width is ~26% of height
    chestToHeightRatio: 0.56,     // Chest is ~56% of height
    waistToHeightRatio: 0.47,     // Waist is ~47% of height
    hipsToHeightRatio: 0.52,      // Hips are ~52% of height
  },

  VARIATION_RANGES: {
    shoulder: 0.08,  // ±8% variation
    chest: 0.10,     // ±10% variation
    waist: 0.12,     // ±12% variation (more variable)
    hips: 0.10,      // ±10% variation
  },

  generateRandomHeight() {
    return 165 + Math.random() * 6; // 165.0 to 171.0 cm
  },

  addVariation(baseValue, variationRange) {
    const variation = (Math.random() - 0.5) * 2 * variationRange;
    return baseValue * (1 + variation);
  },

  calculateConfidence(height, shoulderWidth, chest, waist, hips) {
    let confidence = 0.9; // Base confidence

    // Check for unrealistic proportions
    if (waist > chest) {
      confidence -= 0.2;
    }

    if (hips < waist) {
      confidence -= 0.15;
    }

    // Check shoulder width proportion
    const shoulderRatio = shoulderWidth / height;
    if (shoulderRatio < 0.22 || shoulderRatio > 0.30) {
      confidence -= 0.1;
    }

    // Add small random variation to confidence
    const confidenceVariation = (Math.random() - 0.5) * 0.1;
    confidence += confidenceVariation;

    return Math.max(0.75, Math.min(0.98, confidence));
  },

  calculateMeasurements(height) {
    const adjustedHeight = height + (Math.random() - 0.5) * 2; // ±1cm variation

    const baseShoulder = adjustedHeight * this.PROPORTIONS.shoulderToHeightRatio;
    const baseChest = adjustedHeight * this.PROPORTIONS.chestToHeightRatio;
    const baseWaist = adjustedHeight * this.PROPORTIONS.waistToHeightRatio;
    const baseHips = adjustedHeight * this.PROPORTIONS.hipsToHeightRatio;

    const shoulderWidth = this.addVariation(baseShoulder, this.VARIATION_RANGES.shoulder);
    const chest = this.addVariation(baseChest, this.VARIATION_RANGES.chest);
    const waist = this.addVariation(baseWaist, this.VARIATION_RANGES.waist);
    const hips = this.addVariation(baseHips, this.VARIATION_RANGES.hips);

    const confidence = this.calculateConfidence(adjustedHeight, shoulderWidth, chest, waist, hips);

    return {
      height: Math.round(adjustedHeight * 10) / 10,
      shoulderWidth: Math.round(shoulderWidth * 10) / 10,
      chest: Math.round(chest * 10) / 10,
      waist: Math.round(waist * 10) / 10,
      hips: Math.round(hips * 10) / 10,
      confidence: Math.round(confidence * 1000) / 1000,
      timestamp: new Date().toISOString(),
    };
  }
};

// Test function
const testProportionalMeasurements = () => {
  console.log('📊 Testing Proportional Measurements (Height: 165-171 cm)\n');

  // Generate 5 sample measurements
  const samples = [];
  for (let i = 0; i < 5; i++) {
    const height = ProportionalMeasurementsCalculator.generateRandomHeight();
    const measurements = ProportionalMeasurementsCalculator.calculateMeasurements(height);
    samples.push(measurements);
  }

  // Display results
  samples.forEach((measurements, index) => {
    console.log(`📏 Sample ${index + 1}:`);
    console.log(`   Height: ${measurements.height} cm`);
    console.log(`   Shoulder Width: ${measurements.shoulderWidth} cm (${(measurements.shoulderWidth / measurements.height * 100).toFixed(1)}% of height)`);
    console.log(`   Chest: ${measurements.chest} cm (${(measurements.chest / measurements.height * 100).toFixed(1)}% of height)`);
    console.log(`   Waist: ${measurements.waist} cm (${(measurements.waist / measurements.height * 100).toFixed(1)}% of height)`);
    console.log(`   Hips: ${measurements.hips} cm (${(measurements.hips / measurements.height * 100).toFixed(1)}% of height)`);
    console.log(`   Confidence: ${(measurements.confidence * 100).toFixed(1)}%`);
    console.log('');
  });

  // Calculate statistics
  const avgHeight = samples.reduce((sum, m) => sum + m.height, 0) / samples.length;
  const avgShoulder = samples.reduce((sum, m) => sum + m.shoulderWidth, 0) / samples.length;
  const avgChest = samples.reduce((sum, m) => sum + m.chest, 0) / samples.length;
  const avgWaist = samples.reduce((sum, m) => sum + m.waist, 0) / samples.length;
  const avgHips = samples.reduce((sum, m) => sum + m.hips, 0) / samples.length;
  const avgConfidence = samples.reduce((sum, m) => sum + m.confidence, 0) / samples.length;

  console.log('📈 Average Measurements:');
  console.log(`   Height: ${avgHeight.toFixed(1)} cm`);
  console.log(`   Shoulder Width: ${avgShoulder.toFixed(1)} cm (${(avgShoulder / avgHeight * 100).toFixed(1)}% of height)`);
  console.log(`   Chest: ${avgChest.toFixed(1)} cm (${(avgChest / avgHeight * 100).toFixed(1)}% of height)`);
  console.log(`   Waist: ${avgWaist.toFixed(1)} cm (${(avgWaist / avgHeight * 100).toFixed(1)}% of height)`);
  console.log(`   Hips: ${avgHips.toFixed(1)} cm (${(avgHips / avgHeight * 100).toFixed(1)}% of height)`);
  console.log(`   Confidence: ${(avgConfidence * 100).toFixed(1)}%`);

  console.log('\n✅ Proportional Measurements Test Complete!');
  console.log('🎯 All measurements are dynamically calculated based on height');
  console.log('📏 Height range: 165-171 cm');
  console.log('🔄 Each measurement is proportional to the generated height');
  console.log('🎲 Realistic variation added to each measurement');
};

// Run the test
testProportionalMeasurements();

module.exports = { testProportionalMeasurements, ProportionalMeasurementsCalculator };
