/**
 * User Calibration Manager for Personalized Accuracy
 * 
 * This system learns from user measurements to improve accuracy over time
 * by creating personalized calibration profiles.
 */

export interface UserProfile {
  userId: string;
  profileVersion: number;
  createdAt: number;
  lastUpdated: number;
  
  // Physical characteristics
  physicalProfile: {
    estimatedHeight: number;
    estimatedShoulderWidth: number;
    bodyType: 'slim' | 'average' | 'athletic' | 'broad';
    proportions: {
      shoulderToHeightRatio: number;
      armSpanToHeightRatio: number;
    };
  };
  
  // Calibration data
  calibrationData: {
    referenceMeasurements: {
      knownHeight?: number;
      knownShoulderWidth?: number;
      measurementDate: number;
      confidence: number;
    }[];
    scaleFactors: {
      height: number;
      shoulderWidth: number;
      confidence: number;
    };
    accuracyHistory: {
      timestamp: number;
      accuracy: number;
      method: string;
    }[];
  };
  
  // Device-specific adjustments
  deviceAdjustments: {
    deviceModel: string;
    cameraCalibration: {
      focalLength: number;
      distortion: number[];
      principalPoint: { x: number; y: number };
    };
    performanceProfile: {
      optimalFrameRate: number;
      processingQuality: 'high' | 'medium' | 'low';
    };
  };
  
  // Learning parameters
  learningParams: {
    adaptationRate: number; // How quickly to adapt to new data
    confidenceThreshold: number;
    minSamplesForCalibration: number;
    maxCalibrationAge: number; // Days
  };
}

export interface CalibrationSession {
  sessionId: string;
  userId: string;
  startTime: number;
  endTime?: number;
  measurements: CalibrationMeasurement[];
  quality: 'excellent' | 'good' | 'fair' | 'poor';
  status: 'active' | 'completed' | 'failed';
}

export interface CalibrationMeasurement {
  timestamp: number;
  rawMeasurements: {
    shoulderWidth: number;
    height: number;
    confidence: number;
  };
  correctedMeasurements: {
    shoulderWidth: number;
    height: number;
    confidence: number;
  };
  validation: {
    isValid: boolean;
    quality: 'excellent' | 'good' | 'fair' | 'poor';
    corrections: MeasurementCorrection[];
  };
  context: {
    lighting: 'excellent' | 'good' | 'fair' | 'poor';
    distance: 'optimal' | 'too_close' | 'too_far';
    pose: 'optimal' | 'acceptable' | 'poor';
  };
}

export interface MeasurementCorrection {
  type: 'scale' | 'offset' | 'proportional';
  value: number;
  reason: string;
  confidence: number;
}

class UserCalibrationManager {
  private static instance: UserCalibrationManager;
  private userProfiles: Map<string, UserProfile> = new Map();
  private activeCalibrationSessions: Map<string, CalibrationSession> = new Map();
  private learningEnabled = true;
  
  private constructor() {}
  
  static getInstance(): UserCalibrationManager {
    if (!UserCalibrationManager.instance) {
      UserCalibrationManager.instance = new UserCalibrationManager();
    }
    return UserCalibrationManager.instance;
  }
  
  /**
   * Start a new calibration session for a user
   */
  async startCalibrationSession(userId: string): Promise<CalibrationSession> {
    const sessionId = `cal_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const session: CalibrationSession = {
      sessionId,
      userId,
      startTime: Date.now(),
      measurements: [],
      quality: 'fair',
      status: 'active'
    };
    
    this.activeCalibrationSessions.set(sessionId, session);
    
    console.log(`Started calibration session ${sessionId} for user ${userId}`);
    return session;
  }
  
  /**
   * Add a measurement to the calibration session
   */
  async addCalibrationMeasurement(
    sessionId: string, 
    measurement: CalibrationMeasurement
  ): Promise<{ success: boolean; quality: string; feedback: string }> {
    const session = this.activeCalibrationSessions.get(sessionId);
    if (!session) {
      return { success: false, quality: 'poor', feedback: 'Session not found' };
    }
    
    // Add measurement to session
    session.measurements.push(measurement);
    
    // Analyze measurement quality
    const quality = this.analyzeMeasurementQuality(measurement);
    const feedback = this.generateCalibrationFeedback(measurement, quality);
    
    // Update session quality
    session.quality = this.calculateSessionQuality(session.measurements) as 'excellent' | 'good' | 'fair' | 'poor';
    
    return { success: true, quality, feedback };
  }
  
  /**
   * Complete calibration session and create/update user profile
   */
  async completeCalibrationSession(sessionId: string): Promise<{
    success: boolean;
    profile?: UserProfile;
    accuracy?: number;
    feedback: string;
  }> {
    const session = this.activeCalibrationSessions.get(sessionId);
    if (!session) {
      return { success: false, feedback: 'Session not found' };
    }
    
    try {
      // Validate session has enough data
      if (session.measurements.length < 5) {
        return { 
          success: false, 
          feedback: 'Need at least 5 measurements for calibration' 
        };
      }
      
      // Calculate calibration parameters
      const calibrationParams = this.calculateCalibrationParameters(session.measurements);
      
      // Get or create user profile
      let profile = this.userProfiles.get(session.userId);
      if (!profile) {
        profile = this.createNewUserProfile(session.userId);
      }
      
      // Update profile with new calibration data
      this.updateUserProfile(profile, session, calibrationParams);
      
      // Save updated profile
      this.userProfiles.set(session.userId, profile);
      
      // Complete session
      session.endTime = Date.now();
      session.status = 'completed';
      
      const accuracy = this.calculateCalibrationAccuracy(profile);
      
      return {
        success: true,
        profile,
        accuracy,
        feedback: `Calibration completed with ${accuracy.toFixed(1)}% accuracy`
      };
      
    } catch (error) {
      console.error('Calibration completion error:', error);
      return { 
        success: false, 
        feedback: `Calibration failed: ${error instanceof Error ? error.message : 'Unknown error'}` 
      };
    }
  }
  
  /**
   * Apply user calibration to a measurement
   */
  applyUserCalibration(
    userId: string, 
    rawMeasurement: { shoulderWidth: number; height: number; confidence: number }
  ): { shoulderWidth: number; height: number; confidence: number; applied: boolean } {
    const profile = this.userProfiles.get(userId);
    if (!profile) {
      return { ...rawMeasurement, applied: false };
    }
    
    // Apply scale factors
    const correctedShoulderWidth = rawMeasurement.shoulderWidth * profile.calibrationData.scaleFactors.shoulderWidth;
    const correctedHeight = rawMeasurement.height * profile.calibrationData.scaleFactors.height;
    
    // Apply confidence adjustment based on user's accuracy history
    const avgAccuracy = this.calculateAverageAccuracy(profile);
    const adjustedConfidence = Math.min(1.0, rawMeasurement.confidence * avgAccuracy);
    
    return {
      shoulderWidth: correctedShoulderWidth,
      height: correctedHeight,
      confidence: adjustedConfidence,
      applied: true
    };
  }
  
  /**
   * Get user profile for display/analysis
   */
  getUserProfile(userId: string): UserProfile | null {
    return this.userProfiles.get(userId) || null;
  }
  
  /**
   * Update user profile with new measurement data
   */
  async updateProfileWithMeasurement(
    userId: string, 
    measurement: { shoulderWidth: number; height: number; confidence: number },
    knownValues?: { height?: number; shoulderWidth?: number }
  ): Promise<void> {
    const profile = this.userProfiles.get(userId);
    if (!profile) return;
    
    // Add to reference measurements if known values provided
    if (knownValues) {
      profile.calibrationData.referenceMeasurements.push({
        knownHeight: knownValues.height,
        knownShoulderWidth: knownValues.shoulderWidth,
        measurementDate: Date.now(),
        confidence: measurement.confidence
      });
      
      // Recalculate scale factors
      this.recalculateScaleFactors(profile);
    }
    
    // Add to accuracy history
    profile.calibrationData.accuracyHistory.push({
      timestamp: Date.now(),
      accuracy: measurement.confidence,
      method: 'user_feedback'
    });
    
    // Update profile
    profile.lastUpdated = Date.now();
    this.userProfiles.set(userId, profile);
  }
  
  // Private helper methods
  private analyzeMeasurementQuality(measurement: CalibrationMeasurement): string {
    const { rawMeasurements, context } = measurement;
    
    let qualityScore = 0;
    
    // Check measurement ranges
    if (rawMeasurements.shoulderWidth >= 30 && rawMeasurements.shoulderWidth <= 60) qualityScore += 25;
    if (rawMeasurements.height >= 120 && rawMeasurements.height <= 220) qualityScore += 25;
    
    // Check context quality
    if (context.lighting === 'excellent') qualityScore += 20;
    else if (context.lighting === 'good') qualityScore += 15;
    else if (context.lighting === 'fair') qualityScore += 10;
    
    if (context.distance === 'optimal') qualityScore += 15;
    else if (context.distance === 'too_close' || context.distance === 'too_far') qualityScore += 5;
    
    if (context.pose === 'optimal') qualityScore += 15;
    else if (context.pose === 'acceptable') qualityScore += 10;
    
    if (qualityScore >= 80) return 'excellent';
    if (qualityScore >= 60) return 'good';
    if (qualityScore >= 40) return 'fair';
    return 'poor';
  }
  
  private generateCalibrationFeedback(measurement: CalibrationMeasurement, quality: string): string {
    const { context } = measurement;
    const feedback: string[] = [];
    
    if (context.lighting === 'poor') feedback.push('Improve lighting conditions');
    if (context.distance === 'too_close') feedback.push('Move further from camera');
    if (context.distance === 'too_far') feedback.push('Move closer to camera');
    if (context.pose === 'poor') feedback.push('Adjust your pose - stand straight');
    
    if (quality === 'excellent') feedback.push('Great measurement quality!');
    else if (quality === 'good') feedback.push('Good measurement, keep going');
    else if (quality === 'fair') feedback.push('Measurement acceptable, but could be better');
    else feedback.push('Please retake measurement with better conditions');
    
    return feedback.join('. ');
  }
  
  private calculateSessionQuality(measurements: CalibrationMeasurement[]): string {
    if (measurements.length === 0) return 'poor';
    
    const qualityScores = measurements.map(m => {
      if (m.validation.quality === 'excellent') return 4;
      if (m.validation.quality === 'good') return 3;
      if (m.validation.quality === 'fair') return 2;
      return 1;
    });
    
    const avgScore = qualityScores.reduce((sum, score) => sum + score, 0) / qualityScores.length;
    
    if (avgScore >= 3.5) return 'excellent';
    if (avgScore >= 2.5) return 'good';
    if (avgScore >= 1.5) return 'fair';
    return 'poor';
  }
  
  private calculateCalibrationParameters(measurements: CalibrationMeasurement[]) {
    // Calculate average measurements
    const avgShoulderWidth = measurements.reduce((sum, m) => sum + m.rawMeasurements.shoulderWidth, 0) / measurements.length;
    const avgHeight = measurements.reduce((sum, m) => sum + m.rawMeasurements.height, 0) / measurements.length;
    
    // Calculate scale factors (simplified - would need reference measurements)
    const scaleFactors = {
      shoulderWidth: 1.0, // Would be calculated based on known reference
      height: 1.0,
      confidence: measurements.reduce((sum, m) => sum + m.rawMeasurements.confidence, 0) / measurements.length
    };
    
    return { avgShoulderWidth, avgHeight, scaleFactors };
  }
  
  private createNewUserProfile(userId: string): UserProfile {
    return {
      userId,
      profileVersion: 1,
      createdAt: Date.now(),
      lastUpdated: Date.now(),
      physicalProfile: {
        estimatedHeight: 0,
        estimatedShoulderWidth: 0,
        bodyType: 'average',
        proportions: {
          shoulderToHeightRatio: 0.25, // Default ratio
          armSpanToHeightRatio: 1.0
        }
      },
      calibrationData: {
        referenceMeasurements: [],
        scaleFactors: { height: 1.0, shoulderWidth: 1.0, confidence: 0.5 },
        accuracyHistory: []
      },
      deviceAdjustments: {
        deviceModel: 'unknown',
        cameraCalibration: {
          focalLength: 0,
          distortion: [0, 0, 0, 0, 0],
          principalPoint: { x: 0, y: 0 }
        },
        performanceProfile: {
          optimalFrameRate: 30,
          processingQuality: 'medium'
        }
      },
      learningParams: {
        adaptationRate: 0.1,
        confidenceThreshold: 0.7,
        minSamplesForCalibration: 5,
        maxCalibrationAge: 30 // days
      }
    };
  }
  
  private updateUserProfile(profile: UserProfile, session: CalibrationSession, params: any): void {
    // Update physical profile estimates
    profile.physicalProfile.estimatedHeight = params.avgHeight;
    profile.physicalProfile.estimatedShoulderWidth = params.avgShoulderWidth;
    
    // Update scale factors
    profile.calibrationData.scaleFactors = params.scaleFactors;
    
    // Add session measurements to reference data
    session.measurements.forEach(measurement => {
      profile.calibrationData.accuracyHistory.push({
        timestamp: measurement.timestamp,
        accuracy: measurement.rawMeasurements.confidence,
        method: 'calibration_session'
      });
    });
    
    profile.lastUpdated = Date.now();
    profile.profileVersion += 1;
  }
  
  private calculateCalibrationAccuracy(profile: UserProfile): number {
    if (profile.calibrationData.accuracyHistory.length === 0) return 0;
    
    const recentAccuracy = profile.calibrationData.accuracyHistory
      .slice(-10) // Last 10 measurements
      .reduce((sum, entry) => sum + entry.accuracy, 0) / Math.min(10, profile.calibrationData.accuracyHistory.length);
    
    return recentAccuracy * 100;
  }
  
  private calculateAverageAccuracy(profile: UserProfile): number {
    if (profile.calibrationData.accuracyHistory.length === 0) return 0.5;
    
    return profile.calibrationData.accuracyHistory
      .reduce((sum, entry) => sum + entry.accuracy, 0) / profile.calibrationData.accuracyHistory.length;
  }
  
  private recalculateScaleFactors(profile: UserProfile): void {
    const referenceMeasurements = profile.calibrationData.referenceMeasurements;
    if (referenceMeasurements.length === 0) return;
    
    // Calculate scale factors based on known reference measurements
    // This is a simplified version - real implementation would be more complex
    const avgScaleFactor = referenceMeasurements.reduce((sum, ref) => {
      return sum + (ref.confidence || 0.5);
    }, 0) / referenceMeasurements.length;
    
    profile.calibrationData.scaleFactors.height = avgScaleFactor;
    profile.calibrationData.scaleFactors.shoulderWidth = avgScaleFactor;
  }
}

// Export singleton instance
export const userCalibrationManager = UserCalibrationManager.getInstance();
