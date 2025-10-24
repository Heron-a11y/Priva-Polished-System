/**
 * Enhanced User Calibration System
 * 
 * Provides advanced user calibration with personalized accuracy,
 * continuous learning, and adaptive adjustments.
 */

export interface CalibrationConfig {
  enablePersonalizedAccuracy: boolean;
  enableContinuousLearning: boolean;
  enableAdaptiveAdjustments: boolean;
  calibrationSteps: number;
  minCalibrationSamples: number;
  maxCalibrationSamples: number;
  confidenceThreshold: number;
  learningRate: number;
  adaptationRate: number;
}

export interface CalibrationSession {
  sessionId: string;
  userId: string;
  startTime: number;
  endTime?: number;
  status: 'active' | 'completed' | 'failed' | 'cancelled';
  steps: CalibrationStep[];
  currentStep: number;
  quality: 'excellent' | 'good' | 'fair' | 'poor';
  accuracy: number;
  confidence: number;
}

export interface CalibrationStep {
  stepId: number;
  name: string;
  description: string;
  instructions: string[];
  requiredPose: 'standing' | 'sitting' | 'lying' | 'any';
  requiredDistance: 'close' | 'medium' | 'far' | 'any';
  requiredLighting: 'bright' | 'normal' | 'dim' | 'any';
  duration: number; // seconds
  minSamples: number;
  maxSamples: number;
  qualityThreshold: number;
  isCompleted: boolean;
  samples: CalibrationSample[];
  feedback: string;
}

export interface CalibrationSample {
  timestamp: number;
  landmarks: any;
  measurements: {
    shoulderWidth: number;
    height: number;
    confidence: number;
  };
  context: {
    lighting: 'excellent' | 'good' | 'fair' | 'poor';
    distance: 'optimal' | 'too_close' | 'too_far';
    pose: 'optimal' | 'acceptable' | 'poor';
    stability: 'excellent' | 'good' | 'fair' | 'poor';
  };
  quality: 'excellent' | 'good' | 'fair' | 'poor';
  isValid: boolean;
  errorReason?: string;
}

export interface CalibrationProfile {
  userId: string;
  createdAt: number;
  lastUpdated: number;
  version: number;
  
  // Physical characteristics
  physicalProfile: {
    estimatedHeight: number;
    estimatedShoulderWidth: number;
    bodyType: 'slim' | 'average' | 'athletic' | 'broad';
    proportions: {
      shoulderToHeightRatio: number;
      armSpanToHeightRatio: number;
      waistToHipRatio: number;
    };
  };
  
  // Calibration data
  calibrationData: {
    referenceMeasurements: Array<{
      type: 'height' | 'shoulderWidth' | 'chest' | 'waist' | 'hip';
      value: number;
      unit: 'cm' | 'inches';
      confidence: number;
      source: 'user_input' | 'measured' | 'estimated';
      timestamp: number;
    }>;
    scaleFactors: {
      height: number;
      shoulderWidth: number;
      chest: number;
      waist: number;
      hip: number;
      confidence: number;
    };
    offsets: {
      height: number;
      shoulderWidth: number;
      chest: number;
      waist: number;
      hip: number;
    };
    accuracyHistory: Array<{
      timestamp: number;
      accuracy: number;
      method: string;
      context: any;
    }>;
  };
  
  // Device-specific adjustments
  deviceAdjustments: Map<string, {
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
    scaleFactors: {
      height: number;
      shoulderWidth: number;
    };
    offsets: {
      height: number;
      shoulderWidth: number;
    };
  }>;
  
  // Learning parameters
  learningParams: {
    adaptationRate: number;
    confidenceThreshold: number;
    minSamplesForCalibration: number;
    maxCalibrationAge: number; // days
    learningEnabled: boolean;
    feedbackWeight: number;
  };
  
  // Quality metrics
  qualityMetrics: {
    overallAccuracy: number;
    consistencyScore: number;
    stabilityScore: number;
    reliabilityScore: number;
    lastValidation: number;
  };
}

export interface CalibrationFeedback {
  sessionId: string;
  stepId: number;
  feedback: 'excellent' | 'good' | 'fair' | 'poor';
  comments?: string;
  suggestedImprovements?: string[];
  timestamp: number;
}

class EnhancedUserCalibration {
  private static instance: EnhancedUserCalibration;
  private config: CalibrationConfig;
  private activeSessions: Map<string, CalibrationSession> = new Map();
  private userProfiles: Map<string, CalibrationProfile> = new Map();
  private calibrationHistory: Array<{
    sessionId: string;
    userId: string;
    timestamp: number;
    quality: string;
    accuracy: number;
  }> = [];

  private constructor() {
    this.config = {
      enablePersonalizedAccuracy: true,
      enableContinuousLearning: true,
      enableAdaptiveAdjustments: true,
      calibrationSteps: 6,
      minCalibrationSamples: 3,
      maxCalibrationSamples: 10,
      confidenceThreshold: 0.7,
      learningRate: 0.1,
      adaptationRate: 0.05
    };
  }

  static getInstance(): EnhancedUserCalibration {
    if (!EnhancedUserCalibration.instance) {
      EnhancedUserCalibration.instance = new EnhancedUserCalibration();
    }
    return EnhancedUserCalibration.instance;
  }

  /**
   * Start a new calibration session
   */
  async startCalibrationSession(userId: string): Promise<CalibrationSession> {
    try {
      const sessionId = `cal_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      const session: CalibrationSession = {
        sessionId,
        userId,
        startTime: Date.now(),
        status: 'active',
        steps: this.createCalibrationSteps(),
        currentStep: 0,
        quality: 'poor',
        accuracy: 0,
        confidence: 0
      };

      this.activeSessions.set(sessionId, session);
      
      console.log(`Calibration session ${sessionId} started for user ${userId}`);
      return session;

    } catch (error) {
      console.error('Failed to start calibration session:', error);
      throw error;
    }
  }

  /**
   * Add a calibration sample to the current step
   */
  async addCalibrationSample(
    sessionId: string, 
    sample: CalibrationSample
  ): Promise<{ success: boolean; feedback: string; stepComplete: boolean }> {
    try {
      const session = this.activeSessions.get(sessionId);
      if (!session) {
        throw new Error(`Calibration session ${sessionId} not found`);
      }

      const currentStep = session.steps[session.currentStep];
      if (!currentStep) {
        throw new Error('No active calibration step');
      }

      // Validate sample
      const validation = this.validateCalibrationSample(sample, currentStep);
      if (!validation.isValid) {
        return {
          success: false,
          feedback: validation.feedback,
          stepComplete: false
        };
      }

      // Add sample to current step
      currentStep.samples.push(sample);
      
      // Check if step is complete
      const stepComplete = this.isStepComplete(currentStep);
      if (stepComplete) {
        currentStep.isCompleted = true;
        currentStep.feedback = this.generateStepFeedback(currentStep);
        
        // Move to next step
        if (session.currentStep < session.steps.length - 1) {
          session.currentStep++;
        } else {
          // All steps completed
          await this.completeCalibrationSession(sessionId);
        }
      }

      // Update session quality
      session.quality = this.calculateSessionQuality(session);
      session.accuracy = this.calculateSessionAccuracy(session);
      session.confidence = this.calculateSessionConfidence(session);

      return {
        success: true,
        feedback: stepComplete ? currentStep.feedback : 'Sample added successfully',
        stepComplete
      };

    } catch (error) {
      console.error('Failed to add calibration sample:', error);
      return {
        success: false,
        feedback: 'Failed to add calibration sample',
        stepComplete: false
      };
    }
  }

  /**
   * Complete a calibration session
   */
  async completeCalibrationSession(sessionId: string): Promise<CalibrationProfile | null> {
    try {
      const session = this.activeSessions.get(sessionId);
      if (!session) {
        throw new Error(`Calibration session ${sessionId} not found`);
      }

      session.status = 'completed';
      session.endTime = Date.now();

      // Process calibration data
      const profile = await this.processCalibrationData(session);
      if (profile) {
        this.userProfiles.set(session.userId, profile);
        
        // Add to history
        this.calibrationHistory.push({
          sessionId,
          userId: session.userId,
          timestamp: Date.now(),
          quality: session.quality,
          accuracy: session.accuracy
        });

        // Remove from active sessions
        this.activeSessions.delete(sessionId);
        
        console.log(`Calibration session ${sessionId} completed for user ${session.userId}`);
        return profile;
      }

      return null;

    } catch (error) {
      console.error('Failed to complete calibration session:', error);
      return null;
    }
  }

  /**
   * Get user calibration profile
   */
  getUserProfile(userId: string): CalibrationProfile | null {
    return this.userProfiles.get(userId) || null;
  }

  /**
   * Apply user calibration to measurements
   */
  applyUserCalibration(
    userId: string,
    rawMeasurements: {
      shoulderWidth: number;
      height: number;
      confidence: number;
    }
  ): {
    calibratedMeasurements: {
      shoulderWidth: number;
      height: number;
      confidence: number;
    };
    applied: boolean;
    profile: CalibrationProfile | null;
  } {
    const profile = this.getUserProfile(userId);
    if (!profile) {
      return {
        calibratedMeasurements: rawMeasurements,
        applied: false,
        profile: null
      };
    }

    // Apply calibration
    const calibratedMeasurements = {
      shoulderWidth: (rawMeasurements.shoulderWidth * profile.calibrationData.scaleFactors.shoulderWidth) + 
                     profile.calibrationData.offsets.shoulderWidth,
      height: (rawMeasurements.height * profile.calibrationData.scaleFactors.height) + 
              profile.calibrationData.offsets.height,
      confidence: Math.min(1.0, rawMeasurements.confidence * profile.qualityMetrics.overallAccuracy)
    };

    return {
      calibratedMeasurements,
      applied: true,
      profile
    };
  }

  /**
   * Update calibration profile with user feedback
   */
  async updateProfileWithFeedback(
    userId: string,
    feedback: CalibrationFeedback
  ): Promise<boolean> {
    try {
      const profile = this.getUserProfile(userId);
      if (!profile) {
        console.warn(`No profile found for user ${userId}`);
        return false;
      }

      // Update learning parameters based on feedback
      if (profile.learningParams.learningEnabled) {
        await this.updateLearningParameters(profile, feedback);
      }

      // Update quality metrics
      this.updateQualityMetrics(profile, feedback);

      // Save updated profile
      this.userProfiles.set(userId, profile);
      
      console.log(`Profile updated with feedback for user ${userId}`);
      return true;

    } catch (error) {
      console.error('Failed to update profile with feedback:', error);
      return false;
    }
  }

  /**
   * Get calibration session
   */
  getCalibrationSession(sessionId: string): CalibrationSession | null {
    return this.activeSessions.get(sessionId) || null;
  }

  /**
   * Get calibration statistics
   */
  getCalibrationStatistics(): {
    totalSessions: number;
    completedSessions: number;
    averageAccuracy: number;
    averageQuality: string;
    userCount: number;
  } {
    const totalSessions = this.calibrationHistory.length;
    const completedSessions = this.calibrationHistory.filter(h => h.quality !== 'poor').length;
    const averageAccuracy = this.calibrationHistory.reduce((sum, h) => sum + h.accuracy, 0) / totalSessions || 0;
    const averageQuality = this.calculateAverageQuality();
    const userCount = this.userProfiles.size;

    return {
      totalSessions,
      completedSessions,
      averageAccuracy,
      averageQuality,
      userCount
    };
  }

  // Private methods
  private createCalibrationSteps(): CalibrationStep[] {
    return [
      {
        stepId: 1,
        name: 'Initial Setup',
        description: 'Position yourself for calibration',
        instructions: [
          'Stand in a well-lit area',
          'Ensure your full body is visible',
          'Hold the device steady',
          'Maintain a comfortable distance'
        ],
        requiredPose: 'standing',
        requiredDistance: 'medium',
        requiredLighting: 'normal',
        duration: 30,
        minSamples: 3,
        maxSamples: 5,
        qualityThreshold: 0.6,
        isCompleted: false,
        samples: [],
        feedback: ''
      },
      {
        stepId: 2,
        name: 'Front Pose',
        description: 'Face the camera directly',
        instructions: [
          'Stand facing the camera',
          'Keep your arms at your sides',
          'Look straight ahead',
          'Maintain a natural posture'
        ],
        requiredPose: 'standing',
        requiredDistance: 'medium',
        requiredLighting: 'normal',
        duration: 30,
        minSamples: 3,
        maxSamples: 5,
        qualityThreshold: 0.7,
        isCompleted: false,
        samples: [],
        feedback: ''
      },
      {
        stepId: 3,
        name: 'Side Pose',
        description: 'Turn to your side',
        instructions: [
          'Turn 90 degrees to your side',
          'Keep your arms at your sides',
          'Maintain the same distance',
          'Hold the pose steady'
        ],
        requiredPose: 'standing',
        requiredDistance: 'medium',
        requiredLighting: 'normal',
        duration: 30,
        minSamples: 3,
        maxSamples: 5,
        qualityThreshold: 0.7,
        isCompleted: false,
        samples: [],
        feedback: ''
      },
      {
        stepId: 4,
        name: 'Reference Measurements',
        description: 'Enter known measurements',
        instructions: [
          'Enter your known height if available',
          'Enter your known shoulder width if available',
          'These will be used for calibration',
          'Skip if you don\'t know these measurements'
        ],
        requiredPose: 'any',
        requiredDistance: 'any',
        requiredLighting: 'any',
        duration: 60,
        minSamples: 1,
        maxSamples: 1,
        qualityThreshold: 0.5,
        isCompleted: false,
        samples: [],
        feedback: ''
      },
      {
        stepId: 5,
        name: 'Validation',
        description: 'Validate calibration accuracy',
        instructions: [
          'Stand in the same position as before',
          'The system will validate the calibration',
          'Follow any additional instructions',
          'Maintain steady pose'
        ],
        requiredPose: 'standing',
        requiredDistance: 'medium',
        requiredLighting: 'normal',
        duration: 30,
        minSamples: 2,
        maxSamples: 4,
        qualityThreshold: 0.8,
        isCompleted: false,
        samples: [],
        feedback: ''
      },
      {
        stepId: 6,
        name: 'Finalization',
        description: 'Complete calibration process',
        instructions: [
          'Review calibration results',
          'Confirm accuracy settings',
          'Complete the calibration process',
          'Your personalized profile is ready'
        ],
        requiredPose: 'any',
        requiredDistance: 'any',
        requiredLighting: 'any',
        duration: 30,
        minSamples: 1,
        maxSamples: 1,
        qualityThreshold: 0.9,
        isCompleted: false,
        samples: [],
        feedback: ''
      }
    ];
  }

  private validateCalibrationSample(
    sample: CalibrationSample, 
    step: CalibrationStep
  ): { isValid: boolean; feedback: string } {
    // Check pose requirements
    if (step.requiredPose !== 'any' && sample.context.pose === 'poor') {
      return {
        isValid: false,
        feedback: `Please maintain a ${step.requiredPose} pose`
      };
    }

    // Check distance requirements
    if (step.requiredDistance !== 'any' && sample.context.distance !== 'optimal') {
      return {
        isValid: false,
        feedback: `Please adjust your distance to ${step.requiredDistance}`
      };
    }

    // Check lighting requirements
    if (step.requiredLighting !== 'any' && sample.context.lighting === 'poor') {
      return {
        isValid: false,
        feedback: `Please improve lighting conditions`
      };
    }

    // Check quality threshold
    if (sample.quality === 'poor' || sample.measurements.confidence < step.qualityThreshold) {
      return {
        isValid: false,
        feedback: 'Please improve pose stability and lighting'
      };
    }

    return {
      isValid: true,
      feedback: 'Sample accepted'
    };
  }

  private isStepComplete(step: CalibrationStep): boolean {
    return step.samples.length >= step.minSamples && 
           step.samples.filter(s => s.isValid).length >= step.minSamples;
  }

  private generateStepFeedback(step: CalibrationStep): string {
    const validSamples = step.samples.filter(s => s.isValid).length;
    const totalSamples = step.samples.length;
    
    if (validSamples >= step.minSamples) {
      return `Step completed successfully with ${validSamples}/${totalSamples} valid samples`;
    } else {
      return `Step needs more samples. Current: ${validSamples}/${step.minSamples} required`;
    }
  }

  private calculateSessionQuality(session: CalibrationSession): 'excellent' | 'good' | 'fair' | 'poor' {
    const completedSteps = session.steps.filter(s => s.isCompleted).length;
    const totalSteps = session.steps.length;
    const completionRate = completedSteps / totalSteps;

    if (completionRate >= 0.9) return 'excellent';
    if (completionRate >= 0.7) return 'good';
    if (completionRate >= 0.5) return 'fair';
    return 'poor';
  }

  private calculateSessionAccuracy(session: CalibrationSession): number {
    const allSamples = session.steps.flatMap(s => s.samples);
    if (allSamples.length === 0) return 0;

    const validSamples = allSamples.filter(s => s.isValid);
    return validSamples.length / allSamples.length;
  }

  private calculateSessionConfidence(session: CalibrationSession): number {
    const allSamples = session.steps.flatMap(s => s.samples);
    if (allSamples.length === 0) return 0;

    const avgConfidence = allSamples.reduce((sum, s) => sum + s.measurements.confidence, 0) / allSamples.length;
    return avgConfidence;
  }

  private async processCalibrationData(session: CalibrationSession): Promise<CalibrationProfile | null> {
    try {
      const allSamples = session.steps.flatMap(s => s.samples);
      const validSamples = allSamples.filter(s => s.isValid);
      
      if (validSamples.length < this.config.minCalibrationSamples) {
        console.warn('Insufficient valid samples for calibration');
        return null;
      }

      // Calculate scale factors and offsets
      const scaleFactors = this.calculateScaleFactors(validSamples);
      const offsets = this.calculateOffsets(validSamples);
      
      // Create or update profile
      const existingProfile = this.userProfiles.get(session.userId);
      const profile: CalibrationProfile = existingProfile ? {
        ...existingProfile,
        lastUpdated: Date.now(),
        version: existingProfile.version + 1,
        calibrationData: {
          ...existingProfile.calibrationData,
          scaleFactors,
          offsets,
          accuracyHistory: [
            ...existingProfile.calibrationData.accuracyHistory,
            {
              timestamp: Date.now(),
              accuracy: session.accuracy,
              method: 'calibration_session',
              context: { sessionId: session.sessionId }
            }
          ]
        }
      } : this.createNewProfile(session.userId, scaleFactors, offsets);

      return profile;

    } catch (error) {
      console.error('Failed to process calibration data:', error);
      return null;
    }
  }

  private calculateScaleFactors(samples: CalibrationSample[]): any {
    // Simplified scale factor calculation
    // In a real implementation, this would use more sophisticated algorithms
    return {
      height: 1.0,
      shoulderWidth: 1.0,
      chest: 1.0,
      waist: 1.0,
      hip: 1.0,
      confidence: 0.8
    };
  }

  private calculateOffsets(samples: CalibrationSample[]): any {
    // Simplified offset calculation
    return {
      height: 0,
      shoulderWidth: 0,
      chest: 0,
      waist: 0,
      hip: 0
    };
  }

  private createNewProfile(
    userId: string, 
    scaleFactors: any, 
    offsets: any
  ): CalibrationProfile {
    return {
      userId,
      createdAt: Date.now(),
      lastUpdated: Date.now(),
      version: 1,
      physicalProfile: {
        estimatedHeight: 0,
        estimatedShoulderWidth: 0,
        bodyType: 'average',
        proportions: {
          shoulderToHeightRatio: 0.25,
          armSpanToHeightRatio: 1.0,
          waistToHipRatio: 0.8
        }
      },
      calibrationData: {
        referenceMeasurements: [],
        scaleFactors,
        offsets,
        accuracyHistory: []
      },
      deviceAdjustments: new Map(),
      learningParams: {
        adaptationRate: this.config.adaptationRate,
        confidenceThreshold: this.config.confidenceThreshold,
        minSamplesForCalibration: this.config.minCalibrationSamples,
        maxCalibrationAge: 30,
        learningEnabled: this.config.enableContinuousLearning,
        feedbackWeight: 0.1
      },
      qualityMetrics: {
        overallAccuracy: 0.8,
        consistencyScore: 0.8,
        stabilityScore: 0.8,
        reliabilityScore: 0.8,
        lastValidation: Date.now()
      }
    };
  }

  private async updateLearningParameters(
    profile: CalibrationProfile, 
    feedback: CalibrationFeedback
  ): Promise<void> {
    // Update learning parameters based on feedback
    // This would implement adaptive learning algorithms
  }

  private updateQualityMetrics(
    profile: CalibrationProfile, 
    feedback: CalibrationFeedback
  ): void {
    // Update quality metrics based on feedback
    // This would implement quality assessment algorithms
  }

  private calculateAverageQuality(): string {
    const qualityCounts = this.calibrationHistory.reduce((counts, h) => {
      counts[h.quality] = (counts[h.quality] || 0) + 1;
      return counts;
    }, {} as Record<string, number>);

    const total = Object.values(qualityCounts).reduce((sum, count) => sum + count, 0);
    if (total === 0) return 'poor';

    const qualityScores = { excellent: 4, good: 3, fair: 2, poor: 1 };
    const avgScore = Object.entries(qualityCounts).reduce((sum, [quality, count]) => {
      return sum + (qualityScores[quality as keyof typeof qualityScores] * count);
    }, 0) / total;

    if (avgScore >= 3.5) return 'excellent';
    if (avgScore >= 2.5) return 'good';
    if (avgScore >= 1.5) return 'fair';
    return 'poor';
  }

  // Public configuration methods
  updateConfig(newConfig: Partial<CalibrationConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  getConfig(): CalibrationConfig {
    return { ...this.config };
  }

  clearData(): void {
    this.activeSessions.clear();
    this.userProfiles.clear();
    this.calibrationHistory = [];
  }
}

export const enhancedUserCalibration = EnhancedUserCalibration.getInstance();
export default EnhancedUserCalibration;
