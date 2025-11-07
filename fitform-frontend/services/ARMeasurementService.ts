import { ProportionalMeasurementsCalculator, ProportionalMeasurements } from '../src/utils/ProportionalMeasurements';

export interface BodyMeasurements {
  height: number;
  shoulder_width: number;
  chest: number;
  waist: number;
  hips: number;
  confidence: number;
  scan_type: 'ar' | 'manual';
  device_info?: string;
}

export interface ARMeasurementResponse {
  success: boolean;
  message: string;
  data?: any;
  errors?: any;
}

class ARMeasurementService {
  private baseURL: string;

  constructor() {
    this.baseURL = 'http://192.168.1.54:8000/api';
  }

  /**
   * Store body measurements from AR scan
   */
  async storeMeasurements(
    userId: number,
    measurements: BodyMeasurements,
    token: string
  ): Promise<ARMeasurementResponse> {
    try {
      const response = await fetch(`${this.baseURL}/body-measurements`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          user_id: userId,
          ...measurements,
          device_info: this.getDeviceInfo(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to store measurements');
      }

      return data;
    } catch (error) {
      console.error('Error storing AR measurements:', error);
      return {
        success: false,
        message: error.message || 'Failed to store measurements',
      };
    }
  }

  /**
   * Get user's body measurements
   */
  async getMeasurements(userId: number, token: string): Promise<ARMeasurementResponse> {
    try {
      const response = await fetch(`${this.baseURL}/body-measurements?user_id=${userId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json',
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to retrieve measurements');
      }

      return data;
    } catch (error) {
      console.error('Error retrieving AR measurements:', error);
      return {
        success: false,
        message: error.message || 'Failed to retrieve measurements',
      };
    }
  }

  /**
   * Get latest body measurements for a user
   */
  async getLatestMeasurements(userId: number, token: string): Promise<ARMeasurementResponse> {
    try {
      const response = await fetch(`${this.baseURL}/body-measurements/latest?user_id=${userId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json',
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to retrieve latest measurements');
      }

      return data;
    } catch (error) {
      console.error('Error retrieving latest AR measurements:', error);
      return {
        success: false,
        message: error.message || 'Failed to retrieve latest measurements',
      };
    }
  }

  /**
   * Validate body measurements
   */
  async validateMeasurements(measurements: BodyMeasurements, token: string): Promise<ARMeasurementResponse> {
    try {
      const response = await fetch(`${this.baseURL}/body-measurements/validate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json',
        },
        body: JSON.stringify(measurements),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to validate measurements');
      }

      return data;
    } catch (error) {
      console.error('Error validating AR measurements:', error);
      return {
        success: false,
        message: error.message || 'Failed to validate measurements',
      };
    }
  }

  /**
   * Generate proportional measurements based on height (165-171 cm)
   */
  generateMockMeasurements(): BodyMeasurements {
    // Generate random height between 165-171 cm
    const height = ProportionalMeasurementsCalculator.generateRandomHeight();
    
    // Calculate proportional measurements
    const proportionalMeasurements = ProportionalMeasurementsCalculator.calculateMeasurements(height);
    
    return {
      height: proportionalMeasurements.height,
      shoulder_width: proportionalMeasurements.shoulderWidth,
      chest: proportionalMeasurements.chest,
      waist: proportionalMeasurements.waist,
      hips: proportionalMeasurements.hips,
      confidence: proportionalMeasurements.confidence,
      scan_type: 'ar',
      device_info: this.getDeviceInfo(),
    };
  }

  /**
   * Get device information
   */
  private getDeviceInfo(): string {
    // In a real app, you'd get this from device APIs
    return 'Samsung Galaxy A26 5G (AR Test)';
  }

  /**
   * Simulate AR body detection with proportional measurements
   */
  async simulateBodyDetection(): Promise<{
    success: boolean;
    measurements?: BodyMeasurements;
    message: string;
  }> {
    return new Promise((resolve) => {
      // Simulate scanning delay
      setTimeout(() => {
        const measurements = this.generateMockMeasurements();
        resolve({
          success: true,
          measurements,
          message: `Body detected successfully - Height: ${measurements.height.toFixed(1)}cm`,
        });
      }, 2000);
    });
  }

  /**
   * Check if measurements are realistic using proportional validation
   */
  validateMeasurementsLocally(measurements: BodyMeasurements): {
    valid: boolean;
    warnings: string[];
  } {
    // Convert to ProportionalMeasurements format for validation
    const proportionalMeasurements: ProportionalMeasurements = {
      height: measurements.height,
      shoulderWidth: measurements.shoulder_width,
      chest: measurements.chest,
      waist: measurements.waist,
      hips: measurements.hips,
      confidence: measurements.confidence,
      timestamp: new Date().toISOString(),
    };

    return ProportionalMeasurementsCalculator.validateMeasurements(proportionalMeasurements);
  }
}

export const arMeasurementService = new ARMeasurementService();
export default arMeasurementService;
