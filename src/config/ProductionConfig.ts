/**
 * Production Configuration for AR Body Measurements
 * This file contains production-specific configuration values
 */

export const productionConfig = {
  // AR Configuration
  ar: {
    minConfidenceThreshold: 0.75,
    minPlaneDetectionConfidence: 0.85,
    minBodyLandmarksRequired: 8,
    maxMeasurementRetries: 3,
    measurementTimeoutMs: 10000,
  },

  // Performance Configuration
  performance: {
    frameProcessingInterval: {
      highEnd: 50,    // 50ms for high-end devices
      midRange: 100,  // 100ms for mid-range devices
      lowEnd: 200,    // 200ms for low-end devices
    },
    maxHistorySize: 5,
    smoothingThreshold: 0.1,
    requiredFramesForValidation: 8,
    maxVarianceThreshold: 2.5,
    minConsistencyFrames: 5,
  },

  // Memory Management
  memory: {
    maxTemporalConsistencyHistory: 10,
    maxErrorLogEntries: 50,
    maxConfidenceFactors: 20,
    maxFrameValidationBuffer: 10,
  },

  // Error Recovery
  recovery: {
    maxRecoveryAttempts: 3,
    recoveryCooldownMs: 2000,
    errorResetCooldownMs: 4000,
  },

  // Logging Configuration
  logging: {
    level: 'INFO' as const,
    enableSensitiveDataLogging: false,
    maxLogEntries: 100,
    enablePerformanceLogging: true,
  },

  // Validation Ranges
  validation: {
    shoulderWidth: {
      optimalMin: 30,
      optimalMax: 60,
      acceptableMin: 25,
      acceptableMax: 70,
    },
    height: {
      optimalMin: 120,
      optimalMax: 220,
      acceptableMin: 100,
      acceptableMax: 250,
    },
    bodyProportions: {
      minHeightToShoulderRatio: 2.5,
      maxHeightToShoulderRatio: 4.0,
      acceptableMinRatio: 2.0,
      acceptableMaxRatio: 5.0,
    },
  },

  // Platform-Specific Overrides
  platform: {
    android: {
      // Android-specific production settings
      ar: {
        minConfidenceThreshold: 0.8, // Higher threshold for Android
        measurementTimeoutMs: 12000, // Longer timeout for Android
      },
      performance: {
        frameProcessingInterval: {
          highEnd: 60,    // Slightly slower for Android
          midRange: 120,
          lowEnd: 250,
        },
      },
    },
    ios: {
      // iOS-specific production settings
      ar: {
        minConfidenceThreshold: 0.75, // Standard threshold for iOS
        measurementTimeoutMs: 10000,
      },
      performance: {
        frameProcessingInterval: {
          highEnd: 50,    // Standard for iOS
          midRange: 100,
          lowEnd: 200,
        },
      },
    },
  },
};

export default productionConfig;





