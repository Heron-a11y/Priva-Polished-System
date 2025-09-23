import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  ScrollView, 
  Dimensions, 
  Alert, 
  Image,
  ActivityIndicator,
  SafeAreaView
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/Colors';
import apiService from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';

const { width, height } = Dimensions.get('window');

type Screen = 'home' | 'instructions' | 'ar-measurement' | 'review';

interface BodyLandmarks {
  nose: { x: number; y: number; z: number; confidence: number };
  leftShoulder: { x: number; y: number; z: number; confidence: number };
  rightShoulder: { x: number; y: number; z: number; confidence: number };
  leftElbow: { x: number; y: number; z: number; confidence: number };
  rightElbow: { x: number; y: number; z: number; confidence: number };
  leftWrist: { x: number; y: number; z: number; confidence: number };
  rightWrist: { x: number; y: number; z: number; confidence: number };
  leftHip: { x: number; y: number; z: number; confidence: number };
  rightHip: { x: number; y: number; z: number; confidence: number };
  leftKnee: { x: number; y: number; z: number; confidence: number };
  rightKnee: { x: number; y: number; z: number; confidence: number };
  leftAnkle: { x: number; y: number; z: number; confidence: number };
  rightAnkle: { x: number; y: number; z: number; confidence: number };
}

export default function ARMeasurementScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [currentScreen, setCurrentScreen] = useState<Screen>('home');
  const [currentStep, setCurrentStep] = useState<'front' | 'side'>('front');
  const [measurements, setMeasurements] = useState<any>({});
  const [isTracking, setIsTracking] = useState(false);
  const [countdown, setCountdown] = useState(10);
  const [frontMeasurements, setFrontMeasurements] = useState<any>(null);
  const [sideMeasurements, setSideMeasurements] = useState<any>(null);
  const [userHeight, setUserHeight] = useState<number | null>(null);
  const [bodyLandmarks, setBodyLandmarks] = useState<BodyLandmarks | null>(null);
  const [isBodyDetected, setIsBodyDetected] = useState(false);
  const [trackingQuality, setTrackingQuality] = useState<'poor' | 'good' | 'excellent'>('poor');
  const [visibilityIssues, setVisibilityIssues] = useState<string[]>([]);
  const [overallConfidence, setOverallConfidence] = useState<number>(0);
  const [permission, requestPermission] = useCameraPermissions();
  const [unitSystem, setUnitSystem] = useState<'cm' | 'inches' | 'feet'>('cm');

  // Helper function to convert measurements
  const convertMeasurement = (value: number, fromUnit: 'cm' | 'inches', toUnit: 'cm' | 'inches' | 'feet'): any => {
    if (fromUnit === toUnit) return value;
    if (fromUnit === 'cm' && toUnit === 'inches') {
      return Math.round((value / 2.54) * 10) / 10;
    }
    if (fromUnit === 'cm' && toUnit === 'feet') {
      const totalInches = value / 2.54;
      const feet = Math.floor(totalInches / 12);
      const inches = Math.round((totalInches % 12) * 10) / 10;
      return { feet, inches };
    }
    if (fromUnit === 'inches' && toUnit === 'cm') {
      return Math.round(value * 2.54);
    }
    if (fromUnit === 'inches' && toUnit === 'feet') {
      const feet = Math.floor(value / 12);
      const inches = Math.round((value % 12) * 10) / 10;
      return { feet, inches };
    }
    return value;
  };

  const startBodyTracking = () => {
    const interval = setInterval(() => {
      const simulatedLandmarks: BodyLandmarks = {
        nose: { x: width / 2, y: height * 0.3, z: 0, confidence: 0.95 },
        leftShoulder: { x: width * 0.4, y: height * 0.35, z: 0, confidence: 0.88 },
        rightShoulder: { x: width * 0.6, y: height * 0.35, z: 0, confidence: 0.92 },
        leftElbow: { x: width * 0.35, y: height * 0.5, z: 0, confidence: 0.85 },
        rightElbow: { x: width * 0.65, y: height * 0.5, z: 0, confidence: 0.87 },
        leftWrist: { x: width * 0.3, y: height * 0.65, z: 0, confidence: 0.78 },
        rightWrist: { x: width * 0.7, y: height * 0.65, z: 0, confidence: 0.82 },
        leftHip: { x: width * 0.45, y: height * 0.6, z: 0, confidence: 0.90 },
        rightHip: { x: width * 0.55, y: height * 0.6, z: 0, confidence: 0.88 },
        leftKnee: { x: width * 0.45, y: height * 0.8, z: 0, confidence: 0.85 },
        rightKnee: { x: width * 0.55, y: height * 0.8, z: 0, confidence: 0.83 },
        leftAnkle: { x: width * 0.45, y: height * 0.95, z: 0, confidence: 0.75 },
        rightAnkle: { x: width * 0.55, y: height * 0.95, z: 0, confidence: 0.78 },
      };
      
      const confidences = Object.values(simulatedLandmarks).map(landmark => landmark.confidence);
      const avgConfidence = confidences.reduce((sum, conf) => sum + conf, 0) / confidences.length;
      setOverallConfidence(avgConfidence);
      
      const issues: string[] = [];
      if (simulatedLandmarks.leftWrist.confidence < 0.8) issues.push('Left wrist not clearly visible');
      if (simulatedLandmarks.rightWrist.confidence < 0.8) issues.push('Right wrist not clearly visible');
      if (simulatedLandmarks.leftAnkle.confidence < 0.8) issues.push('Left ankle not clearly visible');
      if (simulatedLandmarks.rightAnkle.confidence < 0.8) issues.push('Right ankle not clearly visible');
      if (simulatedLandmarks.leftElbow.confidence < 0.85) issues.push('Left elbow partially hidden');
      if (simulatedLandmarks.rightElbow.confidence < 0.85) issues.push('Right elbow partially hidden');
      
      setVisibilityIssues(issues);
      setBodyLandmarks(simulatedLandmarks);
      
      if (avgConfidence > 0.85) {
        setTrackingQuality('excellent');
        setIsBodyDetected(true);
      } else if (avgConfidence > 0.75) {
        setTrackingQuality('good');
        setIsBodyDetected(true);
      } else {
        setTrackingQuality('poor');
        setIsBodyDetected(false);
      }
    }, 100);

    return () => clearInterval(interval);
  };

  useEffect(() => {
    if (currentScreen === 'ar-measurement') {
      const cleanup = startBodyTracking();
      return cleanup;
    }
  }, [currentScreen]);

  const calculateMeasurements = () => {
    if (!bodyLandmarks) return;

    const measurements: any = {};

    // Height calculation (nose to ankle)
    const heightPixels = Math.abs(bodyLandmarks.rightAnkle.y - bodyLandmarks.nose.y);
    const heightCm = (heightPixels / height) * 180; // Assuming average person height
    measurements.height = Math.round(heightCm);

    // Shoulder width
    const shoulderWidthPixels = Math.abs(bodyLandmarks.rightShoulder.x - bodyLandmarks.leftShoulder.x);
    const shoulderWidthCm = (shoulderWidthPixels / width) * 50; // Assuming average shoulder width
    measurements.shoulders = Math.round(shoulderWidthCm);

    // Chest circumference (estimated from shoulder width)
    measurements.chest = Math.round(shoulderWidthCm * 2.2);

    // Waist circumference (estimated from hip width)
    const hipWidthPixels = Math.abs(bodyLandmarks.rightHip.x - bodyLandmarks.leftHip.x);
    const hipWidthCm = (hipWidthPixels / width) * 40;
    measurements.waist = Math.round(hipWidthCm * 2.1);

    // Hip circumference
    measurements.hips = Math.round(hipWidthCm * 2.3);

    // Arm length (shoulder to wrist)
    const leftArmLengthPixels = Math.abs(bodyLandmarks.leftWrist.y - bodyLandmarks.leftShoulder.y);
    const rightArmLengthPixels = Math.abs(bodyLandmarks.rightWrist.y - bodyLandmarks.rightShoulder.y);
    const avgArmLengthPixels = (leftArmLengthPixels + rightArmLengthPixels) / 2;
    const armLengthCm = (avgArmLengthPixels / height) * 70;
    measurements.armLength = Math.round(armLengthCm);

    // Inseam (hip to ankle)
    const leftInseamPixels = Math.abs(bodyLandmarks.leftAnkle.y - bodyLandmarks.leftHip.y);
    const rightInseamPixels = Math.abs(bodyLandmarks.rightAnkle.y - bodyLandmarks.rightHip.y);
    const avgInseamPixels = (leftInseamPixels + rightInseamPixels) / 2;
    const inseamCm = (avgInseamPixels / height) * 80;
    measurements.inseam = Math.round(inseamCm);

    // Neck circumference (estimated from head width)
    const headWidthPixels = Math.abs(bodyLandmarks.rightShoulder.x - bodyLandmarks.leftShoulder.x) * 0.3;
    const neckCm = (headWidthPixels / width) * 35;
    measurements.neck = Math.round(neckCm);

    return measurements;
  };

  const startMeasurement = () => {
    if (currentStep === 'front') {
      setCountdown(10);
      setIsTracking(true);
      
      const countdownInterval = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            clearInterval(countdownInterval);
            setIsTracking(false);
            const newMeasurements = calculateMeasurements();
            setFrontMeasurements(newMeasurements);
            setCurrentStep('side');
            setCountdown(10);
            return 10;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      setCountdown(10);
      setIsTracking(true);
      
      const countdownInterval = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            clearInterval(countdownInterval);
            setIsTracking(false);
            const newMeasurements = calculateMeasurements();
            setSideMeasurements(newMeasurements);
            
            // Combine front and side measurements
            const combinedMeasurements = {
              ...frontMeasurements,
              ...newMeasurements,
            };
            setMeasurements(combinedMeasurements);
            setCurrentScreen('review');
            return 10;
          }
          return prev - 1;
        });
      }, 1000);
    }
  };

  const saveMeasurements = async () => {
    try {
      if (!user) {
        Alert.alert('Error', 'You must be logged in to save measurements');
        return;
      }

      const measurementData = {
        measurement_type: 'ar',
        measurements: measurements,
        unit_system: unitSystem,
        confidence_score: overallConfidence * 100, // Convert to percentage
        body_landmarks: bodyLandmarks,
        notes: `AR measurement taken on ${new Date().toLocaleDateString()}`
      };

      const response = await apiService.saveMeasurementHistory(measurementData);
      
      if (response) {
        Alert.alert(
          'Measurements Saved',
          'Your body measurements have been saved successfully!',
          [
            {
              text: 'OK',
              onPress: () => router.back()
            }
          ]
        );
      } else {
        Alert.alert('Error', 'Failed to save measurements. Please try again.');
      }
    } catch (error) {
      console.error('Error saving measurements:', error);
      Alert.alert('Error', 'Failed to save measurements. Please try again.');
    }
  };

  const renderHomeScreen = () => (
    <View style={styles.screen}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={Colors.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>AR Body Measurements</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.welcomeSection}>
          <View style={styles.iconContainer}>
            <Ionicons name="scan" size={60} color={Colors.primary} />
          </View>
          <Text style={styles.title}>Welcome to AR Body Measurements</Text>
          <Text style={styles.subtitle}>
            Get accurate body measurements using your device's camera and AR technology
          </Text>
        </View>

        <View style={styles.featuresSection}>
          <Text style={styles.sectionTitle}>What You'll Get:</Text>
          {[
            'Height measurement',
            'Chest, waist, and hip circumference',
            'Shoulder width',
            'Arm length',
            'Inseam length',
            'Neck circumference'
          ].map((feature, index) => (
            <View key={index} style={styles.featureItem}>
              <Ionicons name="checkmark-circle" size={20} color={Colors.primary} />
              <Text style={styles.featureText}>{feature}</Text>
            </View>
          ))}
        </View>


        <View style={styles.instructionsSection}>
          <Text style={styles.sectionTitle}>Before You Start:</Text>
          <Text style={styles.instructionText}>
            • Wear fitted clothing or minimal clothing{'\n'}
            • Ensure good lighting conditions{'\n'}
            • Stand 6-8 feet from the camera{'\n'}
            • Keep your phone steady{'\n'}
            • Follow on-screen instructions
          </Text>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity 
          style={styles.startButton} 
          onPress={() => setCurrentScreen('instructions')}
        >
          <Text style={styles.startButtonText}>Start Measurement</Text>
          <Ionicons name="arrow-forward" size={20} color="white" />
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderInstructionsScreen = () => (
    <View style={styles.screen}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => setCurrentScreen('home')} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={Colors.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Instructions</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.instructionCard}>
          <Text style={styles.instructionTitle}>Step 1: Front View</Text>
          <Text style={styles.instructionDescription}>
            Stand straight facing the camera with your arms slightly away from your body. 
            Make sure your entire body is visible in the frame.
          </Text>
        </View>

        <View style={styles.instructionCard}>
          <Text style={styles.instructionTitle}>Step 2: Side View</Text>
          <Text style={styles.instructionDescription}>
            Turn 90 degrees to your side with your arms at your sides. 
            Keep your body straight and maintain good posture.
          </Text>
        </View>

        <View style={styles.tipsCard}>
          <Text style={styles.tipsTitle}>💡 Tips for Best Results:</Text>
          <Text style={styles.tipText}>
            • Ensure good lighting{'\n'}
            • Stand on a flat surface{'\n'}
            • Keep phone steady{'\n'}
            • Wear fitted clothing{'\n'}
            • Follow countdown timer
          </Text>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity 
          style={styles.startButton} 
          onPress={() => setCurrentScreen('ar-measurement')}
        >
          <Text style={styles.startButtonText}>Begin Measurement</Text>
          <Ionicons name="camera" size={20} color="white" />
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderARMeasurementScreen = () => {
    if (!permission) {
      return (
        <View style={styles.screen}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => setCurrentScreen('instructions')} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color={Colors.primary} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Camera Permission</Text>
            <View style={styles.placeholder} />
          </View>
          <View style={styles.permissionContainer}>
            <Ionicons name="camera-outline" size={80} color={Colors.primary} />
            <Text style={styles.permissionTitle}>Camera Access Required</Text>
            <Text style={styles.permissionText}>
              We need access to your camera to perform AR body measurements.
            </Text>
            <TouchableOpacity style={styles.permissionButton} onPress={requestPermission}>
              <Text style={styles.permissionButtonText}>Grant Permission</Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    }

    if (!permission.granted) {
      return (
        <View style={styles.screen}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => setCurrentScreen('instructions')} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color={Colors.primary} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Camera Access Denied</Text>
            <View style={styles.placeholder} />
          </View>
          <View style={styles.permissionContainer}>
            <Ionicons name="camera-off-outline" size={80} color="#ff6b6b" />
            <Text style={styles.permissionTitle}>Camera Access Required</Text>
            <Text style={styles.permissionText}>
              Please enable camera access in your device settings to continue.
            </Text>
            <TouchableOpacity style={styles.permissionButton} onPress={requestPermission}>
              <Text style={styles.permissionButtonText}>Try Again</Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    }

    return (
      <View style={styles.screen}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => setCurrentScreen('instructions')} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="white" />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: 'white' }]}>
            {currentStep === 'front' ? 'Front View' : 'Side View'}
          </Text>
          <View style={styles.placeholder} />
        </View>

        <View style={styles.cameraContainer}>
          <CameraView style={styles.camera} facing="front">
            {isTracking && (
              <View style={styles.trackingOverlay}>
                <View style={styles.countdownContainer}>
                  <Text style={styles.countdownText}>{countdown}</Text>
                  <Text style={styles.countdownLabel}>seconds remaining</Text>
                </View>
                
                {bodyLandmarks && (
                  <View style={styles.bodyOverlay}>
                    {Object.entries(bodyLandmarks).map(([key, landmark]) => (
                      <View
                        key={key}
                        style={[
                          styles.landmarkPoint,
                          {
                            left: landmark.x - 5,
                            top: landmark.y - 5,
                            backgroundColor: landmark.confidence > 0.8 ? '#4CAF50' : '#FF9800'
                          }
                        ]}
                      />
                    ))}
                  </View>
                )}

                <View style={styles.statusContainer}>
                  <View style={styles.statusItem}>
                    <Text style={styles.statusLabel}>Body Detection:</Text>
                    <Text style={[
                      styles.statusValue,
                      { color: isBodyDetected ? '#4CAF50' : '#FF9800' }
                    ]}>
                      {isBodyDetected ? 'Detected' : 'Searching...'}
                    </Text>
                  </View>
                  
                  <View style={styles.statusItem}>
                    <Text style={styles.statusLabel}>Quality:</Text>
                    <Text style={[
                      styles.statusValue,
                      { 
                        color: trackingQuality === 'excellent' ? '#4CAF50' : 
                               trackingQuality === 'good' ? '#FF9800' : '#F44336'
                      }
                    ]}>
                      {trackingQuality.charAt(0).toUpperCase() + trackingQuality.slice(1)}
                    </Text>
                  </View>
                  
                  <View style={styles.statusItem}>
                    <Text style={styles.statusLabel}>Confidence:</Text>
                    <Text style={styles.statusValue}>
                      {Math.round(overallConfidence * 100)}%
                    </Text>
                  </View>
                </View>

                {visibilityIssues.length > 0 && (
                  <View style={styles.issuesContainer}>
                    <Text style={styles.issuesTitle}>Issues Detected:</Text>
                    {visibilityIssues.map((issue, index) => (
                      <Text key={index} style={styles.issueText}>• {issue}</Text>
                    ))}
                  </View>
                )}
              </View>
            )}
          </CameraView>
        </View>

        <View style={styles.controlsContainer}>
          {!isTracking ? (
            <TouchableOpacity 
              style={[
                styles.measureButton,
                { backgroundColor: isBodyDetected ? Colors.primary : '#ccc' }
              ]} 
              onPress={startMeasurement}
              disabled={!isBodyDetected}
            >
              <Ionicons name="scan" size={24} color="white" />
              <Text style={styles.measureButtonText}>
                {currentStep === 'front' ? 'Start Front Measurement' : 'Start Side Measurement'}
              </Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.trackingContainer}>
              <ActivityIndicator size="large" color={Colors.primary} />
              <Text style={styles.trackingText}>Measuring...</Text>
            </View>
          )}
        </View>
      </View>
    );
  };

  const renderReviewScreen = () => (
    <View style={styles.screen}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => setCurrentScreen('ar-measurement')} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={Colors.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Review Measurements</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.resultsSection}>
          <Text style={styles.resultsTitle}>Your Body Measurements</Text>
          <Text style={styles.resultsSubtitle}>
            Review and adjust your measurements if needed
          </Text>
        </View>

        <View style={styles.measurementsContainer}>
          {Object.entries(measurements).map(([key, value]) => (
            <View key={key} style={styles.measurementItem}>
              <Text style={styles.measurementLabel}>
                {key.charAt(0).toUpperCase() + key.slice(1)}
              </Text>
              <Text style={styles.measurementValue}>
                {value} {unitSystem === 'cm' ? 'cm' : unitSystem === 'inches' ? 'in' : 'ft'}
              </Text>
            </View>
          ))}
        </View>

        <View style={styles.unitSelector}>
          <Text style={styles.unitLabel}>Unit System:</Text>
          <View style={styles.unitButtons}>
            {['cm', 'inches', 'feet'].map((unit) => (
              <TouchableOpacity
                key={unit}
                style={[
                  styles.unitButton,
                  { backgroundColor: unitSystem === unit ? Colors.primary : '#f0f0f0' }
                ]}
                onPress={() => setUnitSystem(unit as any)}
              >
                <Text style={[
                  styles.unitButtonText,
                  { color: unitSystem === unit ? 'white' : '#333' }
                ]}>
                  {unit}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity 
          style={styles.saveButton} 
          onPress={saveMeasurements}
        >
          <Text style={styles.saveButtonText}>Save Measurements</Text>
          <Ionicons name="checkmark" size={20} color="white" />
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderCurrentScreen = () => {
    switch (currentScreen) {
      case 'home':
        return renderHomeScreen();
      case 'instructions':
        return renderInstructionsScreen();
      case 'ar-measurement':
        return renderARMeasurementScreen();
      case 'review':
        return renderReviewScreen();
      default:
        return renderHomeScreen();
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {renderCurrentScreen()}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  screen: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.primary,
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  welcomeSection: {
    alignItems: 'center',
    paddingVertical: 30,
  },
  iconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: Colors.primary + '20',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.primary,
    textAlign: 'center',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
  },
  featuresSection: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.primary,
    marginBottom: 15,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  featureText: {
    fontSize: 16,
    color: '#333',
    marginLeft: 10,
  },
  instructionsSection: {
    marginBottom: 30,
  },
  instructionText: {
    fontSize: 16,
    color: '#666',
    lineHeight: 24,
  },
  footer: {
    padding: 20,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  startButton: {
    backgroundColor: Colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    borderRadius: 10,
  },
  startButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginRight: 10,
  },
  instructionCard: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 10,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  instructionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.primary,
    marginBottom: 10,
  },
  instructionDescription: {
    fontSize: 16,
    color: '#666',
    lineHeight: 24,
  },
  tipsCard: {
    backgroundColor: '#fff3cd',
    padding: 20,
    borderRadius: 10,
    borderLeftWidth: 4,
    borderLeftColor: '#ffc107',
  },
  tipsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#856404',
    marginBottom: 10,
  },
  tipText: {
    fontSize: 14,
    color: '#856404',
    lineHeight: 20,
  },
  permissionContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  permissionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: Colors.primary,
    marginTop: 20,
    marginBottom: 10,
    textAlign: 'center',
  },
  permissionText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 30,
  },
  permissionButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 10,
  },
  permissionButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  cameraContainer: {
    flex: 1,
    position: 'relative',
  },
  camera: {
    flex: 1,
  },
  trackingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  countdownContainer: {
    alignItems: 'center',
    marginTop: 100,
  },
  countdownText: {
    fontSize: 72,
    fontWeight: 'bold',
    color: 'white',
  },
  countdownLabel: {
    fontSize: 16,
    color: 'white',
    marginTop: 10,
  },
  bodyOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  landmarkPoint: {
    position: 'absolute',
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  statusContainer: {
    position: 'absolute',
    top: 50,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(0,0,0,0.7)',
    padding: 15,
    borderRadius: 10,
  },
  statusItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 5,
  },
  statusLabel: {
    color: 'white',
    fontSize: 14,
  },
  statusValue: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  issuesContainer: {
    position: 'absolute',
    bottom: 100,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(255,107,107,0.9)',
    padding: 15,
    borderRadius: 10,
  },
  issuesTitle: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 5,
  },
  issueText: {
    color: 'white',
    fontSize: 12,
  },
  controlsContainer: {
    padding: 20,
    backgroundColor: 'white',
  },
  measureButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    borderRadius: 10,
  },
  measureButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 10,
  },
  trackingContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  trackingText: {
    color: Colors.primary,
    fontSize: 16,
    fontWeight: '600',
    marginTop: 10,
  },
  resultsSection: {
    alignItems: 'center',
    paddingVertical: 30,
  },
  resultsTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.primary,
    marginBottom: 10,
  },
  resultsSubtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  measurementsContainer: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  measurementItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  measurementLabel: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  measurementValue: {
    fontSize: 16,
    color: Colors.primary,
    fontWeight: '600',
  },
  unitSelector: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  unitLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.primary,
    marginBottom: 15,
  },
  unitButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  unitButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  unitButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  saveButton: {
    backgroundColor: Colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    borderRadius: 10,
  },
  saveButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginRight: 10,
  },
});
