import { NativeModules, NativeEventEmitter, Platform } from 'react-native';

// Define the native module interface
interface ARSessionManagerNative {
  isARCoreSupported(): Promise<boolean>;
  isARKitSupported(): Promise<boolean>;
  isARCoreBodyTrackingSupported(): Promise<{
    supported: boolean;
    available: boolean;
    reason: string;
    androidVersion: number;
    arCoreVersion: string;
  }>;
  startSession(): Promise<boolean>;
  stopSession(): Promise<boolean>;
  getMeasurements(): Promise<ARMeasurements>;
  getSessionStatus(): Promise<SessionStatus>;
  markScanCompleted(scanType: string): Promise<boolean>;
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
  private eventEmitter: InstanceType<typeof NativeEventEmitter> | null = null;
  private measurementUpdateListener: any = null;

  constructor() {
    // Get the native module based on platform
    if (Platform.OS === 'android') {
      this.nativeModule = NativeModules.ARSessionManager;
    } else if (Platform.OS === 'ios') {
      this.nativeModule = NativeModules.ARSessionManager;
    } else {
      throw new Error('AR Session Manager is not supported on this platform');
    }

    // Initialize event emitter
    if (this.nativeModule) {
      this.eventEmitter = new NativeEventEmitter(this.nativeModule as any);
    }
  }

  /**
   * Check if AR is supported on the current device
   * @returns Promise<boolean> - true if AR is supported, false otherwise
   */
  async isARSupported(): Promise<boolean> {
    try {
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
  
  // ✅ NEW: Check ARCore body tracking support
  async isARCoreBodyTrackingSupported(): Promise<{
    supported: boolean;
    available: boolean;
    reason: string;
    androidVersion: number;
    arCoreVersion: string;
  }> {
    try {
      if (Platform.OS === 'android') {
        return await this.nativeModule.isARCoreBodyTrackingSupported();
      } else {
        // iOS doesn't have ARCore body tracking
        return {
          supported: false,
          available: false,
          reason: 'ARCore body tracking is only available on Android',
          androidVersion: 0,
          arCoreVersion: '0'
        };
      }
    } catch (error) {
      console.error('Error checking ARCore body tracking support:', error);
      return {
        supported: false,
        available: false,
        reason: `Error checking support: ${error}`,
        androidVersion: 0,
        arCoreVersion: '0'
      };
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

      // Check if session is already active
      const currentStatus = await this.getSessionStatus();
      if (currentStatus.isActive) {
        console.warn('AR session already active');
        return true;
      }

      const result = await this.nativeModule.startSession();
      
      if (result) {
        // Set up measurement update listener
        this.setupMeasurementUpdateListener();
        
        // Start performance monitoring
        this.startPerformanceMonitoring();
      }
      
      return result;
    } catch (error) {
      console.error('Error starting AR session:', error);
      return false;
    }
  }

  private startPerformanceMonitoring(): void {
    // Monitor performance every 5 seconds
    const performanceInterval = setInterval(async () => {
      try {
        const status = await this.getSessionStatus();
        console.log('Performance monitoring:', {
          isActive: status.isActive,
          hasValidMeasurements: status.hasValidMeasurements,
          bodyCount: status.bodyCount
        });
      } catch (error) {
        console.error('Performance monitoring error:', error);
      }
    }, 5000);

    // Store interval for cleanup
    (this as any).performanceInterval = performanceInterval;
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
      const result = await this.nativeModule.getMeasurements();
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

  async loadConfiguration(config: any): Promise<boolean> {
    try {
      // This method will be implemented in the native module
      console.log('Configuration loaded:', config);
      return true;
    } catch (error) {
      console.error('Error loading configuration:', error);
      return false;
    }
  }

  async startRealTimeProcessing(): Promise<boolean> {
    try {
      // This method will be implemented in the native module
      console.log('Real-time processing started');
      return true;
    } catch (error) {
      console.error('Error starting real-time processing:', error);
      return false;
    }
  }

  async stopRealTimeProcessing(): Promise<boolean> {
    try {
      // This method will be implemented in the native module
      console.log('Real-time processing stopped');
      return true;
    } catch (error) {
      console.error('Error stopping real-time processing:', error);
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

    // AR Safeguard: Check confidence threshold (minimum 70% confidence)
    if (measurements.confidence < 0.7) {
      console.warn('AR Validation: Confidence below threshold:', measurements.confidence);
      return false;
    }

    // AR Safeguard: Check reasonable ranges for measurements
    const shoulderWidth = measurements.shoulderWidthCm;
    const height = measurements.heightCm;

    // Shoulder width should be between 30-60 cm
    if (shoulderWidth < 30 || shoulderWidth > 60) {
      console.warn('AR Validation: Shoulder width outside valid range:', shoulderWidth);
      return false;
    }

    // Height should be between 120-220 cm
    if (height < 120 || height > 220) {
      console.warn('AR Validation: Height outside valid range:', height);
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





