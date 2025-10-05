// AR Body Measurements - Type Definitions

export interface ARMeasurement {
  id: string;
  timestamp: number;
  confidence: number;
  measurements: BodyMeasurements;
  metadata: ARMeasurementMetadata;
}

export interface BodyMeasurements {
  chest: number;
  waist: number;
  hips: number;
  shoulders: number;
  armLength: number;
  legLength: number;
  height: number;
  units: 'cm' | 'in' | 'ft';
}

export interface ARMeasurementMetadata {
  deviceInfo: DeviceInfo;
  sessionInfo: SessionInfo;
  qualityMetrics: QualityMetrics;
}

export interface DeviceInfo {
  platform: 'ios' | 'android';
  version: string;
  model: string;
  arSupport: boolean;
  arVersion: string;
}

export interface SessionInfo {
  sessionId: string;
  startTime: number;
  duration: number;
  frameCount: number;
  errorCount: number;
}

export interface QualityMetrics {
  averageConfidence: number;
  trackingStability: number;
  measurementAccuracy: number;
  frameRate: number;
}

export interface ARSessionConfig {
  minConfidenceThreshold: number;
  frameProcessingInterval: number;
  maxVarianceThreshold: number;
  maxRecoveryAttempts: number;
  enableLogging: boolean;
  enablePerformanceLogging: boolean;
}

export interface ARFrameData {
  timestamp: number;
  confidence: number;
  bodyPose: BodyPose;
  measurements: Partial<BodyMeasurements>;
  quality: number;
}

export interface BodyPose {
  joints: BodyJoint[];
  skeleton: SkeletonConnection[];
}

export interface BodyJoint {
  name: string;
  position: Vector3D;
  confidence: number;
  isTracked: boolean;
}

export interface SkeletonConnection {
  from: string;
  to: string;
  confidence: number;
}

export interface Vector3D {
  x: number;
  y: number;
  z: number;
}

export interface ARSessionState {
  isRunning: boolean;
  isPaused: boolean;
  error: string | null;
  frameCount: number;
  lastFrameTime: number;
}

export interface ARSessionCallbacks {
  onFrameProcessed?: (frameData: ARFrameData) => void;
  onMeasurementComplete?: (measurement: ARMeasurement) => void;
  onError?: (error: Error) => void;
  onSessionStarted?: () => void;
  onSessionStopped?: () => void;
}

export interface ARCapabilities {
  supportsBodyTracking: boolean;
  supportsFaceTracking: boolean;
  supportsHandTracking: boolean;
  maxSimultaneousTrackedBodies: number;
  supportedResolutions: string[];
  supportedFrameRates: number[];
}
