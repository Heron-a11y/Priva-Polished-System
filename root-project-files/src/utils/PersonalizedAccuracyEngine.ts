/**
 * Personalized Accuracy Engine
 * 
 * Integrates user calibration with measurement processing
 * to provide personalized accuracy improvements
 */

import { userCalibrationManager, UserProfile } from './UserCalibrationManager';
import { measurementAccuracy } from './MeasurementAccuracy';
import { PerformanceMonitor } from './PerformanceMonitor';

export interface PersonalizedMeasurement {
  rawMeasurement: {
    shoulderWidth: number;
    height: number;
    confidence: number;
    timestamp: number;
  };
  personalizedMeasurement: {
    shoulderWidth: number;
    height: number;
    confidence: number;
    accuracy: number;
  };
  calibrationApplied: boolean;
  userProfile: UserProfile | null;
  improvements: {
    accuracyGain: number;
    confidenceBoost: number;
    personalizedCorrections: string[];
  };
}

export interface AccuracyLearningData {
  measurementId: string;
  userId: string;
  timestamp: number;
  rawAccuracy: number;
  personalizedAccuracy: number;
  userFeedback?: {
    knownHeight?: number;
    knownShoulderWidth?: number;
    accuracyRating: number; // 1-5 scale
  };
  context: {
    lighting: 'excellent' | 'good' | 'fair' | 'poor';
    distance: 'optimal' | 'too_close' | 'too_far';
    pose: 'optimal' | 'acceptable' | 'poor';
    deviceModel: string;
  };
}

class PersonalizedAccuracyEngine {
  private static instance: PersonalizedAccuracyEngine;
  private measurementAccuracyInstance: any;
  private performanceMonitor: PerformanceMonitor;
  private learningData: AccuracyLearningData[] = [];
  private maxLearningData = 1000;
  
  private constructor() {
    this.measurementAccuracyInstance = measurementAccuracy;
    this.performanceMonitor = PerformanceMonitor.getInstance();
  }
  
  static getInstance(): PersonalizedAccuracyEngine {
    if (!PersonalizedAccuracyEngine.instance) {
      PersonalizedAccuracyEngine.instance = new PersonalizedAccuracyEngine();
    }
    return PersonalizedAccuracyEngine.instance;
  }
  
  /**
   * Process measurement with personalized accuracy
   */
  async processPersonalizedMeasurement(
    userId: string,
    rawMeasurement: {
      shoulderWidth: number;
      height: number;
      confidence: number;
      timestamp: number;
    },
    context: {
      lighting: 'excellent' | 'good' | 'fair' | 'poor';
      distance: 'optimal' | 'too_close' | 'too_far';
      pose: 'optimal' | 'acceptable' | 'poor';
    }
  ): Promise<PersonalizedMeasurement> {
    try {
      // Get user profile
      const userProfile = userCalibrationManager.getUserProfile(userId);
      
      // Apply user calibration if available
      const calibratedMeasurement = userCalibrationManager.applyUserCalibration(
        userId,
        rawMeasurement
      );
      
      // Calculate accuracy improvements
      const improvements = this.calculateAccuracyImprovements(
        rawMeasurement,
        calibratedMeasurement,
        userProfile,
        context
      );
      
      // Create personalized measurement
      const personalizedMeasurement: PersonalizedMeasurement = {
        rawMeasurement,
        personalizedMeasurement: {
          shoulderWidth: calibratedMeasurement.shoulderWidth,
          height: calibratedMeasurement.height,
          confidence: calibratedMeasurement.confidence,
          accuracy: improvements.accuracyGain
        },
        calibrationApplied: calibratedMeasurement.applied,
        userProfile,
        improvements
      };
      
      // Record learning data
      this.recordLearningData(userId, rawMeasurement, calibratedMeasurement, context);
      
      return personalizedMeasurement;
      
    } catch (error) {
      console.error('Personalized measurement processing error:', error);
      
      // Return fallback measurement
      return {
        rawMeasurement,
        personalizedMeasurement: {
          shoulderWidth: rawMeasurement.shoulderWidth,
          height: rawMeasurement.height,
          confidence: rawMeasurement.confidence,
          accuracy: 0
        },
        calibrationApplied: false,
        userProfile: null,
        improvements: {
          accuracyGain: 0,
          confidenceBoost: 0,
          personalizedCorrections: ['Calibration not available']
        }
      };
    }
  }
  
  /**
   * Learn from user feedback to improve accuracy
   */
  async learnFromUserFeedback(
    userId: string,
    measurementId: string,
    feedback: {
      knownHeight?: number;
      knownShoulderWidth?: number;
      accuracyRating: number;
    }
  ): Promise<{ success: boolean; improvements: string[] }> {
    try {
      // Update user profile with feedback
      await userCalibrationManager.updateProfileWithMeasurement(
        userId,
        {
          shoulderWidth: feedback.knownShoulderWidth || 0,
          height: feedback.knownHeight || 0,
          confidence: feedback.accuracyRating / 5.0
        },
        {
          height: feedback.knownHeight,
          shoulderWidth: feedback.knownShoulderWidth
        }
      );
      
      // Record learning data
      const learningEntry: AccuracyLearningData = {
        measurementId,
        userId,
        timestamp: Date.now(),
        rawAccuracy: 0, // Would be calculated from original measurement
        personalizedAccuracy: feedback.accuracyRating / 5.0,
        userFeedback: feedback,
        context: {
          lighting: 'good', // Default context
          distance: 'optimal',
          pose: 'optimal',
          deviceModel: 'unknown'
        }
      };
      
      this.learningData.push(learningEntry);
      
      // Keep only recent learning data
      if (this.learningData.length > this.maxLearningData) {
        this.learningData = this.learningData.slice(-this.maxLearningData);
      }
      
      return {
        success: true,
        improvements: [
          'User feedback recorded',
          'Calibration profile updated',
          'Future measurements will be more accurate'
        ]
      };
      
    } catch (error) {
      console.error('Learning from user feedback error:', error);
      return {
        success: false,
        improvements: ['Failed to process feedback']
      };
    }
  }
  
  /**
   * Get personalized accuracy statistics
   */
  getPersonalizedAccuracyStats(userId: string): {
    overallAccuracy: number;
    accuracyImprovement: number;
    calibrationEffectiveness: number;
    recommendations: string[];
  } {
    const userProfile = userCalibrationManager.getUserProfile(userId);
    const userLearningData = this.learningData.filter(entry => entry.userId === userId);
    
    if (!userProfile || userLearningData.length === 0) {
      return {
        overallAccuracy: 0,
        accuracyImprovement: 0,
        calibrationEffectiveness: 0,
        recommendations: ['Start calibration to improve accuracy']
      };
    }
    
    // Calculate overall accuracy
    const overallAccuracy = userLearningData.reduce((sum, entry) => 
      sum + entry.personalizedAccuracy, 0) / userLearningData.length;
    
    // Calculate accuracy improvement
    const accuracyImprovement = userLearningData.reduce((sum, entry) => 
      sum + (entry.personalizedAccuracy - entry.rawAccuracy), 0) / userLearningData.length;
    
    // Calculate calibration effectiveness
    const calibrationEffectiveness = userProfile.calibrationData.scaleFactors.confidence;
    
    // Generate recommendations
    const recommendations: string[] = [];
    
    if (overallAccuracy < 0.7) {
      recommendations.push('Consider recalibrating for better accuracy');
    }
    
    if (accuracyImprovement < 0.1) {
      recommendations.push('Try providing more reference measurements');
    }
    
    if (calibrationEffectiveness < 0.8) {
      recommendations.push('Improve measurement conditions for better calibration');
    }
    
    if (recommendations.length === 0) {
      recommendations.push('Your calibration is working well!');
    }
    
    return {
      overallAccuracy: overallAccuracy * 100,
      accuracyImprovement: accuracyImprovement * 100,
      calibrationEffectiveness: calibrationEffectiveness * 100,
      recommendations
    };
  }
  
  /**
   * Get accuracy trends over time
   */
  getAccuracyTrends(userId: string, days: number = 30): {
    dailyAccuracy: Array<{ date: string; accuracy: number }>;
    trend: 'improving' | 'stable' | 'declining';
    averageAccuracy: number;
  } {
    const userLearningData = this.learningData.filter(entry => 
      entry.userId === userId && 
      (Date.now() - entry.timestamp) <= (days * 24 * 60 * 60 * 1000)
    );
    
    if (userLearningData.length === 0) {
      return {
        dailyAccuracy: [],
        trend: 'stable',
        averageAccuracy: 0
      };
    }
    
    // Group by day
    const dailyData = new Map<string, number[]>();
    userLearningData.forEach(entry => {
      const date = new Date(entry.timestamp).toISOString().split('T')[0];
      if (!dailyData.has(date)) {
        dailyData.set(date, []);
      }
      dailyData.get(date)!.push(entry.personalizedAccuracy);
    });
    
    // Calculate daily averages
    const dailyAccuracy = Array.from(dailyData.entries()).map(([date, accuracies]) => ({
      date,
      accuracy: accuracies.reduce((sum, acc) => sum + acc, 0) / accuracies.length * 100
    })).sort((a, b) => a.date.localeCompare(b.date));
    
    // Calculate trend
    let trend: 'improving' | 'stable' | 'declining' = 'stable';
    if (dailyAccuracy.length >= 2) {
      const firstHalf = dailyAccuracy.slice(0, Math.floor(dailyAccuracy.length / 2));
      const secondHalf = dailyAccuracy.slice(Math.floor(dailyAccuracy.length / 2));
      
      const firstAvg = firstHalf.reduce((sum, day) => sum + day.accuracy, 0) / firstHalf.length;
      const secondAvg = secondHalf.reduce((sum, day) => sum + day.accuracy, 0) / secondHalf.length;
      
      const change = (secondAvg - firstAvg) / firstAvg;
      if (change > 0.05) trend = 'improving';
      else if (change < -0.05) trend = 'declining';
    }
    
    const averageAccuracy = dailyAccuracy.reduce((sum, day) => sum + day.accuracy, 0) / dailyAccuracy.length;
    
    return {
      dailyAccuracy,
      trend,
      averageAccuracy
    };
  }
  
  /**
   * Suggest calibration improvements
   */
  getCalibrationSuggestions(userId: string): {
    suggestions: string[];
    priority: 'high' | 'medium' | 'low';
    estimatedImprovement: number;
  } {
    const userProfile = userCalibrationManager.getUserProfile(userId);
    const stats = this.getPersonalizedAccuracyStats(userId);
    
    if (!userProfile) {
      return {
        suggestions: ['Start initial calibration process'],
        priority: 'high',
        estimatedImprovement: 30
      };
    }
    
    const suggestions: string[] = [];
    let priority: 'high' | 'medium' | 'low' = 'low';
    let estimatedImprovement = 0;
    
    // Check for low accuracy
    if (stats.overallAccuracy < 70) {
      suggestions.push('Recalibrate with better lighting conditions');
      priority = 'high';
      estimatedImprovement += 20;
    }
    
    // Check for insufficient reference data
    if (userProfile.calibrationData.referenceMeasurements.length < 3) {
      suggestions.push('Add more reference measurements for better calibration');
      priority = 'medium';
      estimatedImprovement += 15;
    }
    
    // Check for old calibration data
    const daysSinceUpdate = (Date.now() - userProfile.lastUpdated) / (24 * 60 * 60 * 1000);
    if (daysSinceUpdate > 30) {
      suggestions.push('Update calibration data (last updated over 30 days ago)');
      priority = 'medium';
      estimatedImprovement += 10;
    }
    
    // Check for poor calibration effectiveness
    if (stats.calibrationEffectiveness < 80) {
      suggestions.push('Improve measurement conditions during calibration');
      priority = 'medium';
      estimatedImprovement += 12;
    }
    
    if (suggestions.length === 0) {
      suggestions.push('Your calibration is working well!');
      priority = 'low';
    }
    
    return {
      suggestions,
      priority,
      estimatedImprovement: Math.min(estimatedImprovement, 50)
    };
  }
  
  // Private helper methods
  private calculateAccuracyImprovements(
    rawMeasurement: any,
    calibratedMeasurement: any,
    userProfile: UserProfile | null,
    context: any
  ): {
    accuracyGain: number;
    confidenceBoost: number;
    personalizedCorrections: string[];
  } {
    const accuracyGain = userProfile ? 
      (calibratedMeasurement.confidence - rawMeasurement.confidence) * 100 : 0;
    
    const confidenceBoost = userProfile ? 
      (calibratedMeasurement.confidence - rawMeasurement.confidence) * 100 : 0;
    
    const personalizedCorrections: string[] = [];
    
    if (userProfile) {
      personalizedCorrections.push('Applied user-specific calibration');
      
      if (userProfile.calibrationData.scaleFactors.height !== 1.0) {
        personalizedCorrections.push('Height scale factor applied');
      }
      
      if (userProfile.calibrationData.scaleFactors.shoulderWidth !== 1.0) {
        personalizedCorrections.push('Shoulder width scale factor applied');
      }
    } else {
      personalizedCorrections.push('No user calibration available');
    }
    
    return {
      accuracyGain,
      confidenceBoost,
      personalizedCorrections
    };
  }
  
  private recordLearningData(
    userId: string,
    rawMeasurement: any,
    calibratedMeasurement: any,
    context: any
  ): void {
    const learningEntry: AccuracyLearningData = {
      measurementId: `meas_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId,
      timestamp: Date.now(),
      rawAccuracy: rawMeasurement.confidence,
      personalizedAccuracy: calibratedMeasurement.confidence,
      context: {
        ...context,
        deviceModel: 'unknown' // Would be detected from device
      }
    };
    
    this.learningData.push(learningEntry);
    
    // Keep only recent data
    if (this.learningData.length > this.maxLearningData) {
      this.learningData = this.learningData.slice(-this.maxLearningData);
    }
  }
}

// Export singleton instance
export const personalizedAccuracyEngine = PersonalizedAccuracyEngine.getInstance();
