/**
 * Centralized AR Configuration System
 * 
 * This file contains all configurable values for the AR Body Measurements system.
 * Values can be overridden via environment variables or platform-specific settings.
 */

export interface ARConfig {
  // Core AR Framework Settings
  ar: {
    minConfidenceThreshold: number;
    minPlaneDetectionConfidence: number;
    minBodyLandmarksRequired: number;
    maxMeasurementRetries: number;
    measurementTimeoutMs: number;
  };

  // Performance & Processing Settings
  performance: {
    frameProcessingInterval: {
      highEnd: number;
      midRange: number;
      lowEnd: number;
    };
    maxHistorySize: number;
    smoothingThreshold: number;
    requiredFramesForValidation: number;
    maxVarianceThreshold: number;
    minConsistencyFrames: number;
  };

  // Memory Management Settings
  memory: {
    maxTemporalConsistencyHistory: number;
    maxErrorLogEntries: number;
    maxConfidenceFactors: number;
    maxFrameValidationBuffer: number;
  };

  // Error Recovery Settings
  recovery: {
    maxRecoveryAttempts: number;
    recoveryCooldownMs: number;
    errorResetCooldownMs: number;
  };

  // Logging Settings
  logging: {
    level: 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';
    enableSensitiveDataLogging: boolean;
    maxLogEntries: number;
    enablePerformanceLogging: boolean;
  };

  // Measurement Validation Settings
  validation: {
    shoulderWidth: {
      optimalMin: number;
      optimalMax: number;
      acceptableMin: number;
      acceptableMax: number;
    };
    height: {
      optimalMin: number;
      optimalMax: number;
      acceptableMin: number;
      acceptableMax: number;
    };
    bodyProportions: {
      minHeightToShoulderRatio: number;
      maxHeightToShoulderRatio: number;
      acceptableMinRatio: number;
      acceptableMaxRatio: number;
    };
  };

  // Platform-Specific Overrides
  platform: {
    android?: Partial<ARConfig>;
    ios?: Partial<ARConfig>;
  };
}

// Default configuration values
const defaultConfig: ARConfig = {
  ar: {
    minConfidenceThreshold: 0.7,
    minPlaneDetectionConfidence: 0.8,
    minBodyLandmarksRequired: 8,
    maxMeasurementRetries: 3,
    measurementTimeoutMs: 10000,
  },

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

  memory: {
    maxTemporalConsistencyHistory: 10,
    maxErrorLogEntries: 50,
    maxConfidenceFactors: 20,
    maxFrameValidationBuffer: 10,
  },

  recovery: {
    maxRecoveryAttempts: 3,
    recoveryCooldownMs: 2000,
    errorResetCooldownMs: 4000,
  },

  logging: {
    level: 'INFO',
    enableSensitiveDataLogging: false,
    maxLogEntries: 100,
    enablePerformanceLogging: true,
  },

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

  platform: {},
};

// Environment variable mapping
const envMappings: Record<string, string> = {
  'AR_MIN_CONFIDENCE_THRESHOLD': 'ar.minConfidenceThreshold',
  'AR_FRAME_PROCESSING_INTERVAL_HIGH': 'performance.frameProcessingInterval.highEnd',
  'AR_FRAME_PROCESSING_INTERVAL_MID': 'performance.frameProcessingInterval.midRange',
  'AR_FRAME_PROCESSING_INTERVAL_LOW': 'performance.frameProcessingInterval.lowEnd',
  'AR_MAX_VARIANCE_THRESHOLD': 'performance.maxVarianceThreshold',
  'AR_MAX_RECOVERY_ATTEMPTS': 'recovery.maxRecoveryAttempts',
  'AR_LOG_LEVEL': 'logging.level',
  'AR_ENABLE_SENSITIVE_LOGGING': 'logging.enableSensitiveDataLogging',
  'AR_ENABLE_PERFORMANCE_LOGGING': 'logging.enablePerformanceLogging',
};

/**
 * Get environment variable value with type conversion
 */
function getEnvValue(key: string, defaultValue: any): any {
  const value = process.env[key];
  if (value === undefined) return defaultValue;

  // Type conversion based on default value type
  if (typeof defaultValue === 'number') {
    return parseFloat(value) || defaultValue;
  }
  if (typeof defaultValue === 'boolean') {
    return value.toLowerCase() === 'true';
  }
  return value;
}

/**
 * Set nested object property using dot notation
 */
function setNestedProperty(obj: any, path: string, value: any): void {
  const keys = path.split('.');
  let current = obj;
  
  for (let i = 0; i < keys.length - 1; i++) {
    if (!(keys[i] in current)) {
      current[keys[i]] = {};
    }
    current = current[keys[i]];
  }
  
  current[keys[keys.length - 1]] = value;
}

/**
 * Load configuration with environment variable overrides
 */
function loadConfig(): ARConfig {
  const config = JSON.parse(JSON.stringify(defaultConfig)); // Deep clone

  // Apply environment variable overrides
  Object.entries(envMappings).forEach(([envKey, configPath]) => {
    const envValue = process.env[envKey];
    if (envValue !== undefined) {
      const defaultValue = getNestedValue(config, configPath);
      const convertedValue = getEnvValue(envKey, defaultValue);
      setNestedProperty(config, configPath, convertedValue);
    }
  });

  return config;
}

/**
 * Get nested object property using dot notation
 */
function getNestedValue(obj: any, path: string): any {
  return path.split('.').reduce((current, key) => current?.[key], obj);
}

/**
 * Get platform-specific configuration
 */
function getPlatformConfig(platform: 'android' | 'ios'): Partial<ARConfig> {
  const config = loadConfig();
  return config.platform[platform] || {};
}

/**
 * Merge platform-specific overrides with base config
 */
function mergePlatformConfig(baseConfig: ARConfig, platform: 'android' | 'ios'): ARConfig {
  const platformOverrides = getPlatformConfig(platform);
  
  // Deep merge platform overrides
  const merged = JSON.parse(JSON.stringify(baseConfig));
  
  function deepMerge(target: any, source: any): void {
    Object.keys(source).forEach(key => {
      if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
        if (!target[key]) target[key] = {};
        deepMerge(target[key], source[key]);
      } else {
        target[key] = source[key];
      }
    });
  }
  
  deepMerge(merged, platformOverrides);
  return merged;
}

// Export the configuration instance
export const arConfig = loadConfig();

// Export utility functions
export const getConfig = (platform?: 'android' | 'ios'): ARConfig => {
  if (platform) {
    return mergePlatformConfig(arConfig, platform);
  }
  return arConfig;
};

export const updateConfig = (updates: Partial<ARConfig>): void => {
  Object.assign(arConfig, updates);
};

export const getConfigValue = (path: string): any => {
  return getNestedValue(arConfig, path);
};

export const setConfigValue = (path: string, value: any): void => {
  setNestedProperty(arConfig, path, value);
};

// Export configuration validation
export const validateConfig = (config: ARConfig): string[] => {
  const errors: string[] = [];

  // Validate AR settings
  if (config.ar.minConfidenceThreshold < 0 || config.ar.minConfidenceThreshold > 1) {
    errors.push('AR minConfidenceThreshold must be between 0 and 1');
  }

  // Validate performance settings
  if (config.performance.frameProcessingInterval.highEnd <= 0) {
    errors.push('High-end frame processing interval must be positive');
  }

  // Validate memory settings
  if (config.memory.maxTemporalConsistencyHistory <= 0) {
    errors.push('Max temporal consistency history must be positive');
  }

  // Validate validation settings
  if (config.validation.shoulderWidth.optimalMin >= config.validation.shoulderWidth.optimalMax) {
    errors.push('Shoulder width optimal min must be less than max');
  }

  return errors;
};

// Log configuration on load (in debug mode only)
if (process.env.NODE_ENV === 'development') {
  console.log('AR Configuration loaded:', {
    logLevel: arConfig.logging.level,
    frameInterval: arConfig.performance.frameProcessingInterval,
    confidenceThreshold: arConfig.ar.minConfidenceThreshold,
  });
}



