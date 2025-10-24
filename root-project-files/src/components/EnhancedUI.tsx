/**
 * Enhanced User Interface Components for AR Body Measurements
 * Provides improved UX with better feedback and guidance
 */

import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, Dimensions } from 'react-native';

const { width, height } = Dimensions.get('window');

// Enhanced Progress Indicator
interface ProgressIndicatorProps {
  progress: number;
  status: 'scanning' | 'processing' | 'validating' | 'complete';
  quality?: 'excellent' | 'good' | 'fair' | 'poor';
  onComplete?: () => void;
}

export const EnhancedProgressIndicator: React.FC<ProgressIndicatorProps> = ({
  progress,
  status,
  quality = 'good',
  onComplete
}) => {
  const animatedProgress = useRef(new Animated.Value(0)).current;
  const [currentStep, setCurrentStep] = useState(0);

  const steps = [
    { label: 'Initializing', icon: '🔧' },
    { label: 'Detecting Body', icon: '👤' },
    { label: 'Measuring', icon: '📏' },
    { label: 'Validating', icon: '✅' },
    { label: 'Complete', icon: '🎉' }
  ];

  useEffect(() => {
    Animated.timing(animatedProgress, {
      toValue: progress,
      duration: 300,
      useNativeDriver: false
    }).start();

    const stepIndex = Math.floor(progress * steps.length);
    setCurrentStep(stepIndex);
  }, [progress]);

  const getStatusColor = () => {
    switch (quality) {
      case 'excellent': return '#4CAF50';
      case 'good': return '#8BC34A';
      case 'fair': return '#FF9800';
      case 'poor': return '#F44336';
      default: return '#2196F3';
    }
  };

  return (
    <View style={styles.progressContainer}>
      <View style={styles.progressHeader}>
        <Text style={styles.progressTitle}>Measurement Progress</Text>
        <Text style={styles.progressStatus}>{status.toUpperCase()}</Text>
      </View>

      <View style={styles.progressBarContainer}>
        <View style={styles.progressBarBackground}>
          <Animated.View
            style={[
              styles.progressBarFill,
              {
                width: animatedProgress.interpolate({
                  inputRange: [0, 1],
                  outputRange: ['0%', '100%']
                }),
                backgroundColor: getStatusColor()
              }
            ]}
          />
        </View>
        <Text style={styles.progressText}>{Math.round(progress * 100)}%</Text>
      </View>

      <View style={styles.stepsContainer}>
        {steps.map((step, index) => (
          <View
            key={index}
            style={[
              styles.step,
              index <= currentStep && styles.stepActive
            ]}
          >
            <Text style={[
              styles.stepIcon,
              index <= currentStep && styles.stepIconActive
            ]}>
              {step.icon}
            </Text>
            <Text style={[
              styles.stepLabel,
              index <= currentStep && styles.stepLabelActive
            ]}>
              {step.label}
            </Text>
          </View>
        ))}
      </View>

      {progress >= 1 && onComplete && (
        <TouchableOpacity style={styles.completeButton} onPress={onComplete}>
          <Text style={styles.completeButtonText}>View Results</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

// Enhanced Measurement Display
interface MeasurementDisplayProps {
  measurements: {
    shoulderWidthCm: number;
    heightCm: number;
    confidence: number;
  };
  unit: 'cm' | 'inches';
  onUnitChange: (unit: 'cm' | 'inches') => void;
}

export const EnhancedMeasurementDisplay: React.FC<MeasurementDisplayProps> = ({
  measurements,
  unit,
  onUnitChange
}) => {
  const [isAnimating, setIsAnimating] = useState(false);
  const animatedValues = useRef({
    shoulderWidth: new Animated.Value(0),
    height: new Animated.Value(0),
    confidence: new Animated.Value(0)
  }).current;

  useEffect(() => {
    setIsAnimating(true);
    
    Animated.timing(animatedValues.shoulderWidth, {
      toValue: measurements.shoulderWidthCm,
      duration: 1000,
      useNativeDriver: false
    }).start();
    
    Animated.timing(animatedValues.height, {
      toValue: measurements.heightCm,
      duration: 1000,
      useNativeDriver: false
    }).start();
    
    Animated.timing(animatedValues.confidence, {
      toValue: measurements.confidence,
      duration: 1000,
      useNativeDriver: false
    }).start(() => setIsAnimating(false));
  }, [measurements]);

  const convertMeasurement = (value: number, fromUnit: 'cm' | 'inches', toUnit: 'cm' | 'inches'): number => {
    if (fromUnit === toUnit) return value;
    if (fromUnit === 'cm' && toUnit === 'inches') return value / 2.54;
    if (fromUnit === 'inches' && toUnit === 'cm') return value * 2.54;
    return value;
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.9) return '#4CAF50';
    if (confidence >= 0.7) return '#8BC34A';
    if (confidence >= 0.5) return '#FF9800';
    return '#F44336';
  };

  const getConfidenceText = (confidence: number) => {
    if (confidence >= 0.9) return 'Excellent';
    if (confidence >= 0.7) return 'Good';
    if (confidence >= 0.5) return 'Fair';
    return 'Poor';
  };

  return (
    <View style={styles.measurementContainer}>
      <View style={styles.measurementHeader}>
        <Text style={styles.measurementTitle}>Body Measurements</Text>
        <View style={styles.unitSelector}>
          <TouchableOpacity
            style={[styles.unitButton, unit === 'cm' && styles.unitButtonActive]}
            onPress={() => onUnitChange('cm')}
          >
            <Text style={[styles.unitButtonText, unit === 'cm' && styles.unitButtonTextActive]}>
              CM
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.unitButton, unit === 'inches' && styles.unitButtonActive]}
            onPress={() => onUnitChange('inches')}
          >
            <Text style={[styles.unitButtonText, unit === 'inches' && styles.unitButtonTextActive]}>
              IN
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.measurementsGrid}>
        <View style={styles.measurementCard}>
          <Text style={styles.measurementLabel}>Shoulder Width</Text>
          <Animated.Text style={styles.measurementValue}>
            {isAnimating ? '...' : convertMeasurement(measurements.shoulderWidthCm, 'cm', unit).toFixed(1)}
          </Animated.Text>
          <Text style={styles.measurementUnit}>{unit}</Text>
        </View>

        <View style={styles.measurementCard}>
          <Text style={styles.measurementLabel}>Height</Text>
          <Animated.Text style={styles.measurementValue}>
            {isAnimating ? '...' : convertMeasurement(measurements.heightCm, 'cm', unit).toFixed(1)}
          </Animated.Text>
          <Text style={styles.measurementUnit}>{unit}</Text>
        </View>
      </View>

      <View style={styles.confidenceContainer}>
        <Text style={styles.confidenceLabel}>Measurement Confidence</Text>
        <View style={styles.confidenceBar}>
          <View
            style={[
              styles.confidenceFill,
              {
                width: `${measurements.confidence * 100}%`,
                backgroundColor: getConfidenceColor(measurements.confidence)
              }
            ]}
          />
        </View>
        <Text style={styles.confidenceText}>
          {getConfidenceText(measurements.confidence)} ({Math.round(measurements.confidence * 100)}%)
        </Text>
      </View>
    </View>
  );
};

// Enhanced Instructions Component
interface InstructionsProps {
  step: number;
  totalSteps: number;
  instructions: string[];
  onNext: () => void;
  onPrevious: () => void;
  onSkip: () => void;
}

export const EnhancedInstructions: React.FC<InstructionsProps> = ({
  step,
  totalSteps,
  instructions,
  onNext,
  onPrevious,
  onSkip
}) => {
  const [currentInstruction, setCurrentInstruction] = useState(0);
  const animatedOpacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.timing(animatedOpacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true
      }),
      Animated.timing(animatedOpacity, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true
      })
    ]).start();
  }, [currentInstruction]);

  const nextInstruction = () => {
    if (currentInstruction < instructions.length - 1) {
      setCurrentInstruction(currentInstruction + 1);
    } else {
      onNext();
    }
  };

  const previousInstruction = () => {
    if (currentInstruction > 0) {
      setCurrentInstruction(currentInstruction - 1);
    } else {
      onPrevious();
    }
  };

  return (
    <View style={styles.instructionsContainer}>
      <View style={styles.instructionsHeader}>
        <Text style={styles.instructionsTitle}>Setup Instructions</Text>
        <Text style={styles.instructionsStep}>
          Step {step} of {totalSteps}
        </Text>
      </View>

      <Animated.View style={[styles.instructionContent, { opacity: animatedOpacity }]}>
        <Text style={styles.instructionText}>
          {instructions[currentInstruction]}
        </Text>
      </Animated.View>

      <View style={styles.instructionsProgress}>
        <View style={styles.progressDots}>
          {instructions.map((_, index) => (
            <View
              key={index}
              style={[
                styles.progressDot,
                index === currentInstruction && styles.progressDotActive
              ]}
            />
          ))}
        </View>
      </View>

      <View style={styles.instructionsButtons}>
        <TouchableOpacity
          style={[styles.instructionButton, styles.previousButton]}
          onPress={previousInstruction}
          disabled={currentInstruction === 0}
        >
          <Text style={styles.instructionButtonText}>Previous</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.instructionButton, styles.skipButton]}
          onPress={onSkip}
        >
          <Text style={styles.instructionButtonText}>Skip</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.instructionButton, styles.nextButton]}
          onPress={nextInstruction}
        >
          <Text style={styles.instructionButtonText}>
            {currentInstruction === instructions.length - 1 ? 'Start' : 'Next'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

// Enhanced Quality Indicator
interface QualityIndicatorProps {
  quality: 'excellent' | 'good' | 'fair' | 'poor';
  metrics: {
    lighting: 'excellent' | 'good' | 'fair' | 'poor';
    distance: 'optimal' | 'too_close' | 'too_far';
    stability: 'excellent' | 'good' | 'fair' | 'poor';
  };
}

export const EnhancedQualityIndicator: React.FC<QualityIndicatorProps> = ({
  quality,
  metrics
}) => {
  const getQualityColor = (q: string) => {
    switch (q) {
      case 'excellent': return '#4CAF50';
      case 'good': return '#8BC34A';
      case 'fair': return '#FF9800';
      case 'poor': return '#F44336';
      default: return '#9E9E9E';
    }
  };

  const getQualityIcon = (q: string) => {
    switch (q) {
      case 'excellent': return '🌟';
      case 'good': return '👍';
      case 'fair': return '⚠️';
      case 'poor': return '❌';
      default: return '❓';
    }
  };

  return (
    <View style={styles.qualityContainer}>
      <Text style={styles.qualityTitle}>Measurement Quality</Text>
      
      <View style={styles.qualityMain}>
        <Text style={styles.qualityIcon}>{getQualityIcon(quality)}</Text>
        <Text style={[styles.qualityText, { color: getQualityColor(quality) }]}>
          {quality.toUpperCase()}
        </Text>
      </View>

      <View style={styles.qualityMetrics}>
        <View style={styles.qualityMetric}>
          <Text style={styles.qualityMetricLabel}>Lighting</Text>
          <View style={styles.qualityMetricBar}>
            <View
              style={[
                styles.qualityMetricFill,
                { backgroundColor: getQualityColor(metrics.lighting) }
              ]}
            />
          </View>
        </View>

        <View style={styles.qualityMetric}>
          <Text style={styles.qualityMetricLabel}>Distance</Text>
          <View style={styles.qualityMetricBar}>
            <View
              style={[
                styles.qualityMetricFill,
                { backgroundColor: getQualityColor(metrics.distance) }
              ]}
            />
          </View>
        </View>

        <View style={styles.qualityMetric}>
          <Text style={styles.qualityMetricLabel}>Stability</Text>
          <View style={styles.qualityMetricBar}>
            <View
              style={[
                styles.qualityMetricFill,
                { backgroundColor: getQualityColor(metrics.stability) }
              ]}
            />
          </View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  // Progress Indicator Styles
  progressContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    margin: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16
  },
  progressTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333333'
  },
  progressStatus: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666666',
    backgroundColor: '#F5F5F5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4
  },
  progressBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20
  },
  progressBarBackground: {
    flex: 1,
    height: 8,
    backgroundColor: '#E0E0E0',
    borderRadius: 4,
    marginRight: 12
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4
  },
  progressText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333333'
  },
  stepsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20
  },
  step: {
    alignItems: 'center',
    flex: 1
  },
  stepActive: {
    opacity: 1
  },
  stepIcon: {
    fontSize: 20,
    marginBottom: 4,
    opacity: 0.5
  },
  stepIconActive: {
    opacity: 1
  },
  stepLabel: {
    fontSize: 10,
    color: '#666666',
    textAlign: 'center'
  },
  stepLabelActive: {
    color: '#333333',
    fontWeight: '600'
  },
  completeButton: {
    backgroundColor: '#2196F3',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center'
  },
  completeButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600'
  },

  // Measurement Display Styles
  measurementContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    margin: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3
  },
  measurementHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20
  },
  measurementTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333333'
  },
  unitSelector: {
    flexDirection: 'row',
    backgroundColor: '#F5F5F5',
    borderRadius: 8
  },
  unitButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6
  },
  unitButtonActive: {
    backgroundColor: '#2196F3'
  },
  unitButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666666'
  },
  unitButtonTextActive: {
    color: '#FFFFFF'
  },
  measurementsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20
  },
  measurementCard: {
    flex: 1,
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginHorizontal: 4
  },
  measurementLabel: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 8
  },
  measurementValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333333',
    marginBottom: 4
  },
  measurementUnit: {
    fontSize: 12,
    color: '#999999'
  },
  confidenceContainer: {
    marginTop: 16
  },
  confidenceLabel: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 8
  },
  confidenceBar: {
    height: 6,
    backgroundColor: '#E0E0E0',
    borderRadius: 3,
    marginBottom: 8
  },
  confidenceFill: {
    height: '100%',
    borderRadius: 3
  },
  confidenceText: {
    fontSize: 12,
    color: '#666666'
  },

  // Instructions Styles
  instructionsContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    margin: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3
  },
  instructionsHeader: {
    marginBottom: 20
  },
  instructionsTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333333',
    marginBottom: 4
  },
  instructionsStep: {
    fontSize: 14,
    color: '#666666'
  },
  instructionContent: {
    marginBottom: 20
  },
  instructionText: {
    fontSize: 16,
    lineHeight: 24,
    color: '#333333'
  },
  instructionsProgress: {
    marginBottom: 20
  },
  progressDots: {
    flexDirection: 'row',
    justifyContent: 'center'
  },
  progressDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#E0E0E0',
    marginHorizontal: 4
  },
  progressDotActive: {
    backgroundColor: '#2196F3'
  },
  instructionsButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between'
  },
  instructionButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 6,
    minWidth: 80,
    alignItems: 'center'
  },
  previousButton: {
    backgroundColor: '#F5F5F5'
  },
  skipButton: {
    backgroundColor: '#FF9800'
  },
  nextButton: {
    backgroundColor: '#2196F3'
  },
  instructionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF'
  },

  // Quality Indicator Styles
  qualityContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    margin: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3
  },
  qualityTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333333',
    marginBottom: 16
  },
  qualityMain: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20
  },
  qualityIcon: {
    fontSize: 24,
    marginRight: 12
  },
  qualityText: {
    fontSize: 18,
    fontWeight: 'bold'
  },
  qualityMetrics: {
    gap: 12
  },
  qualityMetric: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  qualityMetricLabel: {
    fontSize: 14,
    color: '#666666',
    width: 80
  },
  qualityMetricBar: {
    flex: 1,
    height: 4,
    backgroundColor: '#E0E0E0',
    borderRadius: 2,
    marginLeft: 12
  },
  qualityMetricFill: {
    height: '100%',
    borderRadius: 2
  }
});

export default {
  EnhancedProgressIndicator,
  EnhancedMeasurementDisplay,
  EnhancedInstructions,
  EnhancedQualityIndicator
};

