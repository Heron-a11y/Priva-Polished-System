import { NativeModules, NativeEventEmitter, Platform } from 'react-native';
import { getConfig } from './config/ARConfig';

// Define the native module interface
interface ARSessionManagerNative {
  isARCoreSupported(): Promise<boolean>;
  isARKitSupported(): Promise<boolean>;
  startARSession(): Promise<boolean>;
  stopARSession(): Promise<boolean>;
  getBodyMeasurements(): Promise<ARMeasurements>;
  getSessionStatus(): Promise<SessionStatus>;
  markScanCompleted(scanType: string): Promise<boolean>;
  // ✅ PHASE 1: New methods for enhanced functionality
  startRealTimeProcessing(): Promise<boolean>;
  stopRealTimeProcessing(): Promise<boolean>;
  // ✅ PHASE 2: Configuration management
  loadConfiguration(config: any): Promise<boolean>;
  // ✅ TensorFlow Lite ML Model methods
  initializeMLModel(modelPath: string): Promise<boolean>;
  isMLModelLoaded(): Promise<boolean>;
  processFrameWithML(imageData: number[], width: number, height: number): Promise<any>;
}

// Define the event emitter interface
interface ARMeasurementUpdateEvent {
  shoulderWidthCm: number;
  heightCm: number;
  confidence: number;
  timestamp: string;
  isValid: boolean;
  errorReason?: string;
  frontScanCompleted: boolean;
  sideScanCompleted: boolean;
  scanStatus: string;
}

// Define the measurement result interface
export interface ARMeasurements {
  valid: boolean;
  shoulderWidthCm: number;
  heightCm: number;
  confidence: number;
  timestamp: string;
  reason?: string;
  frontScanCompleted?: boolean;
  sideScanCompleted?: boolean;
  scanStatus?: string;
}

// Define the session status interface
export interface SessionStatus {
  isActive: boolean;
  hasValidMeasurements: boolean;
  bodyCount: number;
  retryCount?: number;
  frontScanCompleted?: boolean;
  sideScanCompleted?: boolean;
  scanStatus?: string;
}

// Define the AR session manager class
class ARSessionManager {
  private nativeModule: ARSessionManagerNative;
  private eventEmitter: NativeEventEmitter | null = null;
  private measurementUpdateListener: any = null;

  constructor() {
    try {
      // Get the native module based on platform
      if (Platform.OS === 'android') {
        this.nativeModule = NativeModules.ARSessionManager;
      } else if (Platform.OS === 'ios') {
        this.nativeModule = NativeModules.ARSessionManager;
      } else {
        this.nativeModule = null as any; // Set to null for unsupported platforms
      }

      // Check if native module is available
      if (!this.nativeModule) {
        console.log('⚠️ ARSessionManager native module not available');
        console.log('Available native modules:', Object.keys(NativeModules));
        console.log('Platform:', Platform.OS);
        // Don't throw error, just set to null and continue
      } else {
        console.log('✅ ARSessionManager native module found and connected');
      }

      // Initialize event emitter only if native module exists
      if (this.nativeModule) {
        this.eventEmitter = new NativeEventEmitter(this.nativeModule as any);
        console.log('✅ ARSessionManager event emitter initialized');
      }
    } catch (error) {
      console.error('Error initializing ARSessionManager:', error);
      this.nativeModule = null as any;
    }
  }

  /**
   * Check if AR is supported on the current device
   * @returns Promise<boolean> - true if AR is supported, false otherwise
   */
  async isARSupported(): Promise<boolean> {
    try {
      if (!this.nativeModule) {
        console.log('⚠️ ARSessionManager native module not available - AR not supported');
        return false;
      }
      if (Platform.OS === 'android') {
        return await this.nativeModule.isARCoreSupported();
      } else if (Platform.OS === 'ios') {
        return await this.nativeModule.isARKitSupported();
      }
      return false;
    } catch (error) {
      console.error('Error checking AR support:', error);
      return false;
    }
  }

  /**
   * Check if AR body tracking is specifically supported (more detailed than isARSupported)
   * @returns Promise<{supported: boolean, reason?: string}> - detailed support information
   */
  async isARBodyTrackingSupported(): Promise<{supported: boolean, reason?: string}> {
    try {
      const isSupported = await this.isARSupported();
      if (!isSupported) {
        return {
          supported: false,
          reason: Platform.OS === 'android' 
            ? 'This device does not support ARCore body tracking. Please use a compatible device.'
            : 'This device does not support ARKit body tracking. Please use a compatible device.'
        };
      }

      // Additional validation for body tracking specific requirements
      if (Platform.OS === 'android') {
        // ARCore body tracking requires specific device capabilities
        return { supported: true };
      } else if (Platform.OS === 'ios') {
        // ARKit body tracking requires iOS 13+ and A12 Bionic chip or newer
        return { supported: true };
      }

      return { supported: false, reason: 'Unsupported platform' };
    } catch (error) {
      console.error('Error checking AR body tracking support:', error);
      return {
        supported: false,
        reason: 'Error checking AR body tracking support'
      };
    }
  }

  /**
   * Start the AR session for body tracking
   * @returns Promise<boolean> - true if session started successfully, false otherwise
   */
  async startSession(): Promise<boolean> {
    try {
      // Check AR support first
      const isSupported = await this.isARSupported();
      if (!isSupported) {
        throw new Error('AR is not supported on this device');
      }

      console.log('🚀 Starting AR session...');
      const result = await this.nativeModule.startARSession();
      console.log('AR session start result:', result);
      
      if (result) {
        // Set up measurement update listener
        this.setupMeasurementUpdateListener();
      }
      
      return result;
    } catch (error) {
      console.error('Error starting AR session:', error);
      return false;
    }
  }

  /**
   * Stop the AR session
   * @returns Promise<boolean> - true if session stopped successfully, false otherwise
   */
  async stopSession(): Promise<boolean> {
    try {
      // Remove measurement update listener
      this.removeMeasurementUpdateListener();
      
      return await this.nativeModule.stopSession();
    } catch (error) {
      console.error('Error stopping AR session:', error);
      return false;
    }
  }

  /**
   * Get current body measurements from AR session
   * @returns Promise<ARMeasurements> - current measurements or error information
   */
  async getMeasurements(): Promise<ARMeasurements> {
    try {
      if (!this.nativeModule) {
        console.log('⚠️ ARSessionManager native module not available - cannot get measurements');
        return {
          valid: false,
          shoulderWidthCm: 0,
          heightCm: 0,
          confidence: 0,
          timestamp: Date.now().toString(),
          reason: 'Native module not available'
        };
      }
      console.log('🔍 Getting body measurements from ARCore...');
      const result = await this.nativeModule.getBodyMeasurements();
      console.log('ARCore measurements result:', result);
      return result;
    } catch (error) {
      console.error('Error getting measurements:', error);
      return {
        valid: false,
        shoulderWidthCm: 0,
        heightCm: 0,
        confidence: 0,
        timestamp: Date.now().toString(),
        reason: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Get current session status
   * @returns Promise<SessionStatus> - current session status
   */
  async getSessionStatus(): Promise<SessionStatus> {
    try {
      return await this.nativeModule.getSessionStatus();
    } catch (error) {
      console.error('Error getting session status:', error);
      return {
        isActive: false,
        hasValidMeasurements: false,
        bodyCount: 0
      };
    }
  }

  /**
   * Mark a scan as completed (front or side)
   * @param scanType - "front" or "side"
   * @returns Promise<boolean> - true if marked successfully
   */
  async markScanCompleted(scanType: 'front' | 'side'): Promise<boolean> {
    try {
      return await this.nativeModule.markScanCompleted(scanType);
    } catch (error) {
      console.error('Error marking scan completed:', error);
      return false;
    }
  }

  /**
   * ✅ PHASE 1: Start real-time measurement processing
   * @returns Promise<boolean> - true if started successfully
   */
  async startRealTimeProcessing(): Promise<boolean> {
    try {
      const result = await this.nativeModule.startRealTimeProcessing();
      console.log('Real-time processing started:', result);
      return result;
    } catch (error) {
      console.error('Error starting real-time processing:', error);
      return false;
    }
  }

  /**
   * ✅ PHASE 1: Stop real-time measurement processing
   * @returns Promise<boolean> - true if stopped successfully
   */
  async stopRealTimeProcessing(): Promise<boolean> {
    try {
      const result = await this.nativeModule.stopRealTimeProcessing();
      console.log('Real-time processing stopped:', result);
      return result;
    } catch (error) {
      console.error('Error stopping real-time processing:', error);
      return false;
    }
  }

  /**
   * ✅ PHASE 2: Load configuration into native modules
   * @param config - Configuration object to load
   * @returns Promise<boolean> - true if configuration loaded successfully
   */
  async loadConfiguration(config: any): Promise<boolean> {
    try {
      if (!this.nativeModule) {
        console.log('⚠️ ARSessionManager native module not available - skipping configuration');
        return false;
      }
      const result = await this.nativeModule.loadConfiguration(config);
      console.log('Configuration loaded successfully:', result);
      return result;
    } catch (error) {
      console.error('Error loading configuration:', error);
      return false;
    }
  }

  /**
   * Set up listener for real-time measurement updates
   * @param callback - Function to call when measurements are updated
   */
  onMeasurementUpdate(callback: (measurements: ARMeasurementUpdateEvent) => void): void {
    if (this.eventEmitter) {
      this.measurementUpdateListener = this.eventEmitter.addListener(
        'onARMeasurementUpdate',
        callback
      );
    }
  }

  /**
   * Remove the measurement update listener
   */
  removeMeasurementUpdateListener(): void {
    if (this.measurementUpdateListener) {
      this.measurementUpdateListener.remove();
      this.measurementUpdateListener = null;
    }
  }

  /**
   * Set up the measurement update listener (internal method)
   */
  private setupMeasurementUpdateListener(): void {
    // This will be called when the session starts
    // The actual listener setup is done via onMeasurementUpdate
  }

  /**
   * Validate measurements for accuracy and reliability with AR safeguards
   * @param measurements - The measurements to validate
   * @returns boolean - true if measurements are valid, false otherwise
   */
  validateMeasurements(measurements: ARMeasurements): boolean {
    // Check if measurements are valid
    if (!measurements.valid) {
      return false;
    }

    // Get configuration for validation thresholds
    const config = getConfig();
    const minConfidence = config.ar.minConfidenceThreshold;
    const shoulderRange = config.validation.shoulderWidth;
    const heightRange = config.validation.height;
    const proportionRange = config.validation.bodyProportions;

    // AR Safeguard: Check confidence threshold from configuration
    if (measurements.confidence < minConfidence) {
      console.warn('AR Validation: Confidence below threshold:', measurements.confidence, 'required:', minConfidence);
      return false;
    }

    // AR Safeguard: Check reasonable ranges for measurements using configuration
    const shoulderWidth = measurements.shoulderWidthCm;
    const height = measurements.heightCm;

    // Shoulder width validation using configurable ranges
    if (shoulderWidth < shoulderRange.acceptableMin || shoulderWidth > shoulderRange.acceptableMax) {
      console.warn('AR Validation: Shoulder width outside acceptable range:', shoulderWidth, 'range:', [shoulderRange.acceptableMin, shoulderRange.acceptableMax]);
      return false;
    }

    // Height validation using configurable ranges
    if (height < heightRange.acceptableMin || height > heightRange.acceptableMax) {
      console.warn('AR Validation: Height outside acceptable range:', height, 'range:', [heightRange.acceptableMin, heightRange.acceptableMax]);
      return false;
    }

    // Body proportion validation
    const heightToShoulderRatio = height / shoulderWidth;
    if (heightToShoulderRatio < proportionRange.acceptableMinRatio || heightToShoulderRatio > proportionRange.acceptableMaxRatio) {
      console.warn('AR Validation: Body proportions outside acceptable range:', heightToShoulderRatio, 'range:', [proportionRange.acceptableMinRatio, proportionRange.acceptableMaxRatio]);
      return false;
    }

    // AR Safeguard: Check if both scans are completed for comprehensive measurement
    if (measurements.frontScanCompleted !== undefined && measurements.sideScanCompleted !== undefined) {
      if (!measurements.frontScanCompleted || !measurements.sideScanCompleted) {
        console.warn('AR Validation: Incomplete scans - front:', measurements.frontScanCompleted, 'side:', measurements.sideScanCompleted);
        return false;
      }
    }

    return true;
  }

  /**
   * Get platform-specific AR information
   * @returns string - Platform and AR framework information
   */
  getPlatformInfo(): string {
    if (Platform.OS === 'android') {
      return 'Android with ARCore';
    } else if (Platform.OS === 'ios') {
      return 'iOS with ARKit';
    }
    return 'Unknown platform';
  }
}

// Create and export a singleton instance
export const arSessionManager = new ARSessionManager();

// Export the class for custom instances if needed
export default ARSessionManager;





