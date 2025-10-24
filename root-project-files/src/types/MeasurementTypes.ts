// ✅ IMPROVEMENT: Enhanced type definitions for better type safety

export interface MeasurementUpdate {
  shoulderWidthCm: number;
  heightCm: number;
  confidence: number;
  timestamp: string;
  isValid: boolean;
  errorReason?: string;
  frontScanCompleted: boolean;
  sideScanCompleted: boolean;
  scanStatus: string;
  confidenceFactors?: ConfidenceFactors;
}

export interface ConfidenceFactors {
  base: number;           // AR framework confidence
  temporal: number;       // Consistency over time
  realism: number;        // Measurement realism
  stability: number;      // Multi-frame stability
  symmetry?: number;      // Body symmetry
  lighting?: number;     // Lighting conditions
  distance?: number;      // Optimal distance
}

export interface BodyLandmark {
  x: number;
  y: number;
  z: number;
  confidence: number;
}

export interface BodyLandmarks {
  nose: BodyLandmark;
  leftShoulder: BodyLandmark;
  rightShoulder: BodyLandmark;
  leftElbow: BodyLandmark;
  rightElbow: BodyLandmark;
  leftWrist: BodyLandmark;
  rightWrist: BodyLandmark;
  leftHip: BodyLandmark;
  rightHip: BodyLandmark;
  leftKnee: BodyLandmark;
  rightKnee: BodyLandmark;
  leftAnkle: BodyLandmark;
  rightAnkle: BodyLandmark;
}

export interface MeasurementFeedback {
  status: 'scanning' | 'processing' | 'validating' | 'complete';
  progress: number;
  quality: 'excellent' | 'good' | 'fair' | 'poor';
  instructions: string[];
  confidence: number;
}

export interface PerformanceMetrics {
  frameProcessingTime: number;
  memoryUsage: number;
  batteryLevel?: number;
  thermalState?: 'normal' | 'fair' | 'serious' | 'critical';
  measurementAccuracy?: number;
  errorRate?: number;
  timestamp?: number;
}

export interface MeasurementContext {
  lighting: 'excellent' | 'good' | 'fair' | 'poor';
  distance: 'optimal' | 'too_close' | 'too_far';
  stability: 'excellent' | 'good' | 'fair' | 'poor';
  bodyVisibility: 'full' | 'partial' | 'obscured';
}

export interface ARSessionStatus {
  isActive: boolean;
  hasValidMeasurements: boolean;
  bodyCount: number;
  retryCount?: number;
  frontScanCompleted?: boolean;
  sideScanCompleted?: boolean;
  scanStatus?: string;
  performanceMetrics?: PerformanceMetrics;
}
