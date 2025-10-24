/**
 * User Calibration UI Components
 * 
 * Provides intuitive interface for user calibration process
 */

import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, Dimensions } from 'react-native';
import { userCalibrationManager, CalibrationSession, UserProfile } from '../utils/UserCalibrationManager';

const { width, height } = Dimensions.get('window');

interface CalibrationStepProps {
  step: number;
  totalSteps: number;
  title: string;
  instructions: string[];
  onNext: () => void;
  onPrevious: () => void;
  onSkip?: () => void;
  isActive: boolean;
}

export const CalibrationStep: React.FC<CalibrationStepProps> = ({
  step,
  totalSteps,
  title,
  instructions,
  onNext,
  onPrevious,
  onSkip,
  isActive
}) => {
  if (!isActive) return null;

  return (
    <View style={styles.stepContainer}>
      <View style={styles.stepHeader}>
        <Text style={styles.stepTitle}>{title}</Text>
        <Text style={styles.stepCounter}>Step {step} of {totalSteps}</Text>
      </View>
      
      <View style={styles.instructionsContainer}>
        {instructions.map((instruction, index) => (
          <View key={index} style={styles.instructionItem}>
            <Text style={styles.instructionBullet}>•</Text>
            <Text style={styles.instructionText}>{instruction}</Text>
          </View>
        ))}
      </View>
      
      <View style={styles.stepActions}>
        {step > 1 && (
          <TouchableOpacity style={styles.previousButton} onPress={onPrevious}>
            <Text style={styles.buttonText}>Previous</Text>
          </TouchableOpacity>
        )}
        
        <TouchableOpacity style={styles.nextButton} onPress={onNext}>
          <Text style={styles.buttonText}>Next</Text>
        </TouchableOpacity>
        
        {onSkip && (
          <TouchableOpacity style={styles.skipButton} onPress={onSkip}>
            <Text style={styles.skipButtonText}>Skip</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

interface CalibrationSessionProps {
  userId: string;
  onComplete: (profile: UserProfile, accuracy: number) => void;
  onCancel: () => void;
}

export const CalibrationSessionUI: React.FC<CalibrationSessionProps> = ({
  userId,
  onComplete,
  onCancel
}) => {
  const [session, setSession] = useState<CalibrationSession | null>(null);
  const [currentStep, setCurrentStep] = useState(1);
  const [measurementCount, setMeasurementCount] = useState(0);
  const [sessionQuality, setSessionQuality] = useState<'excellent' | 'good' | 'fair' | 'poor'>('fair');
  const [feedback, setFeedback] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);

  const totalSteps = 6;

  const steps = [
    {
      title: "Welcome to Calibration",
      instructions: [
        "This process will improve measurement accuracy for you",
        "We'll take several measurements to learn your body proportions",
        "Please ensure good lighting and stand 2-3 feet from camera",
        "The process takes about 2-3 minutes"
      ]
    },
    {
      title: "Position Setup",
      instructions: [
        "Stand straight with arms at your sides",
        "Look directly at the camera",
        "Ensure your full body is visible in frame",
        "Good lighting is important for accuracy"
      ]
    },
    {
      title: "Front Measurement",
      instructions: [
        "Face the camera directly",
        "Keep your arms slightly away from your body",
        "Stand still for 5 seconds",
        "We'll capture your front profile"
      ]
    },
    {
      title: "Side Measurement",
      instructions: [
        "Turn 90 degrees to your left",
        "Keep your arms at your sides",
        "Stand still for 5 seconds",
        "We'll capture your side profile"
      ]
    },
    {
      title: "Reference Measurement",
      instructions: [
        "If you know your height, we can use it for calibration",
        "Enter your known height (optional but recommended)",
        "This helps us calculate accurate scale factors",
        "You can skip this step if you prefer"
      ]
    },
    {
      title: "Calibration Complete",
      instructions: [
        "Processing your calibration data...",
        "Creating your personalized profile...",
        "This may take a few moments",
        "Your measurements will be more accurate now!"
      ]
    }
  ];

  const startCalibration = useCallback(async () => {
    try {
      setIsProcessing(true);
      const newSession = await userCalibrationManager.startCalibrationSession(userId);
      setSession(newSession);
      setCurrentStep(1);
    } catch (error) {
      Alert.alert('Error', 'Failed to start calibration session');
      console.error('Calibration start error:', error);
    } finally {
      setIsProcessing(false);
    }
  }, [userId]);

  const nextStep = useCallback(() => {
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
    } else {
      completeCalibration();
    }
  }, [currentStep, totalSteps]);

  const previousStep = useCallback(() => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  }, [currentStep]);

  const completeCalibration = useCallback(async () => {
    if (!session) return;

    try {
      setIsProcessing(true);
      const result = await userCalibrationManager.completeCalibrationSession(session.sessionId);
      
      if (result.success && result.profile && result.accuracy) {
        onComplete(result.profile, result.accuracy);
      } else {
        Alert.alert('Calibration Failed', result.feedback);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to complete calibration');
      console.error('Calibration completion error:', error);
    } finally {
      setIsProcessing(false);
    }
  }, [session, onComplete]);

  const addMeasurement = useCallback(async (measurement: any) => {
    if (!session) return;

    try {
      const result = await userCalibrationManager.addCalibrationMeasurement(
        session.sessionId,
        measurement
      );
      
      if (result.success) {
        setMeasurementCount(prev => prev + 1);
        setSessionQuality(result.quality as any);
        setFeedback(result.feedback);
      }
    } catch (error) {
      console.error('Add measurement error:', error);
    }
  }, [session]);

  useEffect(() => {
    if (!session) {
      startCalibration();
    }
  }, [startCalibration, session]);

  const currentStepData = steps[currentStep - 1];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Personalized Calibration</Text>
        <Text style={styles.subtitle}>Improve your measurement accuracy</Text>
      </View>

      <View style={styles.progressContainer}>
        <View style={styles.progressBar}>
          <View 
            style={[
              styles.progressFill, 
              { width: `${(currentStep / totalSteps) * 100}%` }
            ]} 
          />
        </View>
        <Text style={styles.progressText}>
          {Math.round((currentStep / totalSteps) * 100)}% Complete
        </Text>
      </View>

      <CalibrationStep
        step={currentStep}
        totalSteps={totalSteps}
        title={currentStepData.title}
        instructions={currentStepData.instructions}
        onNext={nextStep}
        onPrevious={previousStep}
        onSkip={currentStep === 5 ? () => nextStep() : undefined}
        isActive={true}
      />

      {measurementCount > 0 && (
        <View style={styles.measurementInfo}>
          <Text style={styles.measurementText}>
            Measurements taken: {measurementCount}
          </Text>
          <Text style={styles.qualityText}>
            Quality: {sessionQuality.charAt(0).toUpperCase() + sessionQuality.slice(1)}
          </Text>
          {feedback && (
            <Text style={styles.feedbackText}>{feedback}</Text>
          )}
        </View>
      )}

      {isProcessing && (
        <View style={styles.processingOverlay}>
          <Text style={styles.processingText}>Processing...</Text>
        </View>
      )}

      <TouchableOpacity style={styles.cancelButton} onPress={onCancel}>
        <Text style={styles.cancelButtonText}>Cancel Calibration</Text>
      </TouchableOpacity>
    </View>
  );
};

interface UserProfileDisplayProps {
  profile: UserProfile;
  onEdit: () => void;
  onRecalibrate: () => void;
}

export const UserProfileDisplay: React.FC<UserProfileDisplayProps> = ({
  profile,
  onEdit,
  onRecalibrate
}) => {
  const accuracy = profile.calibrationData.accuracyHistory.length > 0
    ? profile.calibrationData.accuracyHistory
        .slice(-10)
        .reduce((sum, entry) => sum + entry.accuracy, 0) / 
        Math.min(10, profile.calibrationData.accuracyHistory.length) * 100
    : 0;

  return (
    <View style={styles.profileContainer}>
      <Text style={styles.profileTitle}>Your Calibration Profile</Text>
      
      <View style={styles.profileSection}>
        <Text style={styles.sectionTitle}>Physical Profile</Text>
        <View style={styles.profileRow}>
          <Text style={styles.profileLabel}>Estimated Height:</Text>
          <Text style={styles.profileValue}>
            {profile.physicalProfile.estimatedHeight > 0 
              ? `${profile.physicalProfile.estimatedHeight.toFixed(1)} cm`
              : 'Not calibrated'
            }
          </Text>
        </View>
        <View style={styles.profileRow}>
          <Text style={styles.profileLabel}>Estimated Shoulder Width:</Text>
          <Text style={styles.profileValue}>
            {profile.physicalProfile.estimatedShoulderWidth > 0 
              ? `${profile.physicalProfile.estimatedShoulderWidth.toFixed(1)} cm`
              : 'Not calibrated'
            }
          </Text>
        </View>
        <View style={styles.profileRow}>
          <Text style={styles.profileLabel}>Body Type:</Text>
          <Text style={styles.profileValue}>
            {profile.physicalProfile.bodyType.charAt(0).toUpperCase() + 
             profile.physicalProfile.bodyType.slice(1)}
          </Text>
        </View>
      </View>

      <View style={styles.profileSection}>
        <Text style={styles.sectionTitle}>Calibration Data</Text>
        <View style={styles.profileRow}>
          <Text style={styles.profileLabel}>Accuracy:</Text>
          <Text style={styles.profileValue}>{accuracy.toFixed(1)}%</Text>
        </View>
        <View style={styles.profileRow}>
          <Text style={styles.profileLabel}>Scale Factor (Height):</Text>
          <Text style={styles.profileValue}>
            {profile.calibrationData.scaleFactors.height.toFixed(3)}
          </Text>
        </View>
        <View style={styles.profileRow}>
          <Text style={styles.profileLabel}>Scale Factor (Shoulder):</Text>
          <Text style={styles.profileValue}>
            {profile.calibrationData.scaleFactors.shoulderWidth.toFixed(3)}
          </Text>
        </View>
        <View style={styles.profileRow}>
          <Text style={styles.profileLabel}>Last Updated:</Text>
          <Text style={styles.profileValue}>
            {new Date(profile.lastUpdated).toLocaleDateString()}
          </Text>
        </View>
      </View>

      <View style={styles.profileActions}>
        <TouchableOpacity style={styles.editButton} onPress={onEdit}>
          <Text style={styles.buttonText}>Edit Profile</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.recalibrateButton} onPress={onRecalibrate}>
          <Text style={styles.buttonText}>Recalibrate</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 30,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
  },
  progressContainer: {
    marginBottom: 30,
  },
  progressBar: {
    height: 8,
    backgroundColor: '#e0e0e0',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#4CAF50',
    borderRadius: 4,
  },
  progressText: {
    textAlign: 'center',
    marginTop: 8,
    fontSize: 14,
    color: '#666',
  },
  stepContainer: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  stepHeader: {
    marginBottom: 20,
  },
  stepTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  stepCounter: {
    fontSize: 14,
    color: '#666',
  },
  instructionsContainer: {
    marginBottom: 20,
  },
  instructionItem: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  instructionBullet: {
    fontSize: 16,
    color: '#4CAF50',
    marginRight: 8,
    fontWeight: 'bold',
  },
  instructionText: {
    fontSize: 16,
    color: '#333',
    flex: 1,
  },
  stepActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  previousButton: {
    backgroundColor: '#757575',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  nextButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  skipButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  skipButtonText: {
    color: '#666',
    fontSize: 16,
  },
  measurementInfo: {
    backgroundColor: '#e8f5e8',
    padding: 15,
    borderRadius: 8,
    marginBottom: 20,
  },
  measurementText: {
    fontSize: 16,
    color: '#2e7d32',
    fontWeight: '600',
    marginBottom: 4,
  },
  qualityText: {
    fontSize: 14,
    color: '#2e7d32',
    marginBottom: 4,
  },
  feedbackText: {
    fontSize: 14,
    color: '#2e7d32',
    fontStyle: 'italic',
  },
  processingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
  },
  processingText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  cancelButton: {
    backgroundColor: '#f44336',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  profileContainer: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  profileTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 20,
    textAlign: 'center',
  },
  profileSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  profileRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  profileLabel: {
    fontSize: 14,
    color: '#666',
  },
  profileValue: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  profileActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  editButton: {
    backgroundColor: '#2196F3',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  recalibrateButton: {
    backgroundColor: '#FF9800',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
});


