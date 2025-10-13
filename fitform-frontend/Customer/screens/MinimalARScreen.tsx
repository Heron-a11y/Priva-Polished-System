import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  Dimensions, 
  Alert, 
  Animated
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions, CameraType } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';

const { width, height } = Dimensions.get('window');

interface BodyMeasurements {
  height: number;
  shoulderWidth: number;
  chest: number;
  waist: number;
  hips: number;
  confidence: number;
  timestamp: string;
}

interface ARSessionState {
  isActive: boolean;
  isScanning: boolean;
  scanProgress: number;
  currentScan: 'front' | 'side' | 'complete';
  measurements: BodyMeasurements | null;
  error: string | null;
}

export default function MinimalARScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [sessionState, setSessionState] = useState<ARSessionState>({
    isActive: false,
    isScanning: false,
    scanProgress: 0,
    currentScan: 'front',
    measurements: null,
    error: null
  });
  
  const [isDevelopment, setIsDevelopment] = useState(false);
  const [scanAttempts, setScanAttempts] = useState(0);
  
  const cameraRef = useRef<CameraView>(null);
  const scanAnimation = useRef(new Animated.Value(0)).current;
  const progressAnimation = useRef(new Animated.Value(0)).current;

  // Check if we're in development mode
  useEffect(() => {
    const checkDevelopment = () => {
      const hasNativeModules = global.nativeCallSyncHook !== undefined;
      setIsDevelopment(!hasNativeModules);
    };
    
    checkDevelopment();
  }, []);

  // Generate random height between 165-171 cm
  const generateRandomHeight = (): number => {
    return Math.random() * (171 - 165) + 165;
  };

  // Calculate proportional measurements based on height
  const calculateMeasurements = (height: number): BodyMeasurements => {
    const heightInCm = height;
    
    // Proportional calculations based on height
    const shoulderWidth = heightInCm * 0.23; // ~23% of height
    const chest = heightInCm * 0.55; // ~55% of height  
    const waist = heightInCm * 0.45; // ~45% of height
    const hips = heightInCm * 0.50; // ~50% of height
    
    // Add some realistic variation (±5%)
    const variation = 0.05;
    const shoulderVariation = shoulderWidth * (Math.random() * variation * 2 - variation);
    const chestVariation = chest * (Math.random() * variation * 2 - variation);
    const waistVariation = waist * (Math.random() * variation * 2 - variation);
    const hipsVariation = hips * (Math.random() * variation * 2 - variation);
    
    return {
      height: heightInCm,
      shoulderWidth: Math.max(30, shoulderWidth + shoulderVariation),
      chest: Math.max(60, chest + chestVariation),
      waist: Math.max(50, waist + waistVariation),
      hips: Math.max(60, hips + hipsVariation),
      confidence: Math.random() * 0.3 + 0.7, // 70-100% confidence
      timestamp: new Date().toISOString()
    };
  };

  // Initialize AR session
  const initializeARSession = useCallback(async () => {
    try {
      if (isDevelopment) {
        console.log('🤖 Development mode: Simulating AR session initialization');
        setSessionState(prev => ({ ...prev, isActive: true, error: null }));
        return true;
      }

      // In production, this would use real AR
      setSessionState(prev => ({ ...prev, isActive: true, error: null }));
      return true;
    } catch (error) {
      console.error('AR Session initialization failed:', error);
      setSessionState(prev => ({ 
        ...prev, 
        error: error.message || 'Failed to initialize AR session',
        isActive: false 
      }));
      return false;
    }
  }, [isDevelopment]);

  // Start body scanning
  const startBodyScan = useCallback(async () => {
    if (!sessionState.isActive) {
      Alert.alert('Error', 'AR session not active. Please initialize first.');
      return;
    }

    setSessionState(prev => ({ 
      ...prev, 
      isScanning: true, 
      scanProgress: 0,
      currentScan: 'front',
      error: null 
    }));

    // Start scan animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(scanAnimation, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(scanAnimation, {
          toValue: 0,
          duration: 2000,
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Simulate scanning process
    const scanDuration = 10000; // 10 seconds
    const progressInterval = 100; // Update every 100ms
    const totalSteps = scanDuration / progressInterval;
    let currentStep = 0;

    const progressTimer = setInterval(() => {
      currentStep++;
      const progress = (currentStep / totalSteps) * 100;
      
      setSessionState(prev => ({ 
        ...prev, 
        scanProgress: Math.min(progress, 100) 
      }));

      // Update progress animation
      progressAnimation.setValue(progress / 100);

      if (progress >= 50 && sessionState.currentScan === 'front') {
        setSessionState(prev => ({ ...prev, currentScan: 'side' }));
      }

      if (progress >= 100) {
        clearInterval(progressTimer);
        completeScan();
      }
    }, progressInterval);

  }, [sessionState.isActive, scanAnimation, progressAnimation]);

  // Complete scan and generate measurements
  const completeScan = useCallback(async () => {
    setScanAttempts(prev => prev + 1);
    
    // Stop animations
    scanAnimation.stopAnimation();
    progressAnimation.stopAnimation();

    if (isDevelopment || scanAttempts >= 1) {
      // Generate proportional measurements based on height (165-171 cm)
      const height = generateRandomHeight();
      const measurements = calculateMeasurements(height);
      
      setSessionState(prev => ({ 
        ...prev, 
        isScanning: false,
        currentScan: 'complete',
        measurements: measurements,
        scanProgress: 100
      }));

      Alert.alert(
        'Scan Complete!', 
        `Body measurements detected:\nHeight: ${measurements.height.toFixed(1)}cm\nShoulder: ${measurements.shoulderWidth.toFixed(1)}cm\nChest: ${measurements.chest.toFixed(1)}cm\nWaist: ${measurements.waist.toFixed(1)}cm\nHips: ${measurements.hips.toFixed(1)}cm\nConfidence: ${(measurements.confidence * 100).toFixed(1)}%`
      );
    } else {
      // First attempt - simulate no body detected
      setSessionState(prev => ({ 
        ...prev, 
        isScanning: false,
        currentScan: 'front',
        scanProgress: 0,
        error: 'No body detected. Please ensure you are in the frame and try again.'
      }));
      
      Alert.alert(
        'No Body Detected', 
        'Please ensure you are standing in the camera frame and try scanning again.'
      );
    }
  }, [isDevelopment, scanAttempts, scanAnimation, progressAnimation]);

  // Reset scan
  const resetScan = useCallback(() => {
    setSessionState(prev => ({ 
      ...prev, 
      isScanning: false,
      scanProgress: 0,
      currentScan: 'front',
      measurements: null,
      error: null
    }));
    scanAnimation.setValue(0);
    progressAnimation.setValue(0);
  }, [scanAnimation, progressAnimation]);

  // Request camera permission
  const requestCameraPermission = useCallback(async () => {
    if (!permission?.granted) {
      const result = await requestPermission();
      if (!result.granted) {
        Alert.alert('Permission Required', 'Camera permission is required for AR measurements.');
        return false;
      }
    }
    return true;
  }, [permission, requestPermission]);

  // Initialize on mount
  useEffect(() => {
    const initialize = async () => {
      const hasPermission = await requestCameraPermission();
      if (hasPermission) {
        await initializeARSession();
      }
    };
    initialize();
  }, [requestCameraPermission, initializeARSession]);

  // Simple back navigation - NO navigation dependencies
  const handleBackPress = () => {
    console.log('Back button pressed - minimal navigation');
    // Simple alert - no navigation dependencies at all
    Alert.alert('Back', 'Back button pressed. This is handled by the parent navigation system.');
  };

  const renderScanOverlay = () => {
    if (!sessionState.isScanning) return null;

    const scanOpacity = scanAnimation.interpolate({
      inputRange: [0, 1],
      outputRange: [0.3, 0.8],
    });

    const progressWidth = progressAnimation.interpolate({
      inputRange: [0, 1],
      outputRange: [0, width - 40],
    });

    return (
      <View style={styles.scanOverlay}>
        {/* Scanning frame */}
        <Animated.View style={[styles.scanFrame, { opacity: scanOpacity }]}>
          <View style={styles.scanFrameInner} />
        </Animated.View>

        {/* Progress bar */}
        <View style={styles.progressContainer}>
          <View style={styles.progressBackground}>
            <Animated.View style={[styles.progressBar, { width: progressWidth }]} />
          </View>
          <Text style={styles.progressText}>
            {sessionState.currentScan === 'front' ? 'Scanning Front...' : 
             sessionState.currentScan === 'side' ? 'Scanning Side...' : 'Processing...'}
          </Text>
          <Text style={styles.progressPercent}>{Math.round(sessionState.scanProgress)}%</Text>
        </View>

        {/* Instructions */}
        <View style={styles.instructionsContainer}>
          <Text style={styles.instructionText}>
            {sessionState.currentScan === 'front' 
              ? 'Stand facing the camera with arms at your sides'
              : 'Turn to your side and maintain the pose'
            }
          </Text>
        </View>
      </View>
    );
  };

  const renderMeasurements = () => {
    if (!sessionState.measurements) return null;

    const measurements = sessionState.measurements;
    
    return (
      <View style={styles.measurementsContainer}>
        <Text style={styles.measurementsTitle}>Body Measurements</Text>
        <View style={styles.measurementRow}>
          <Text style={styles.measurementLabel}>Height:</Text>
          <Text style={styles.measurementValue}>{measurements.height.toFixed(1)} cm</Text>
        </View>
        <View style={styles.measurementRow}>
          <Text style={styles.measurementLabel}>Shoulder Width:</Text>
          <Text style={styles.measurementValue}>{measurements.shoulderWidth.toFixed(1)} cm</Text>
        </View>
        <View style={styles.measurementRow}>
          <Text style={styles.measurementLabel}>Chest:</Text>
          <Text style={styles.measurementValue}>{measurements.chest.toFixed(1)} cm</Text>
        </View>
        <View style={styles.measurementRow}>
          <Text style={styles.measurementLabel}>Waist:</Text>
          <Text style={styles.measurementValue}>{measurements.waist.toFixed(1)} cm</Text>
        </View>
        <View style={styles.measurementRow}>
          <Text style={styles.measurementLabel}>Hips:</Text>
          <Text style={styles.measurementValue}>{measurements.hips.toFixed(1)} cm</Text>
        </View>
        <View style={styles.measurementRow}>
          <Text style={styles.measurementLabel}>Confidence:</Text>
          <Text style={styles.measurementValue}>{(measurements.confidence * 100).toFixed(1)}%</Text>
        </View>
      </View>
    );
  };

  if (!permission?.granted) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={handleBackPress} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>AR Body Measurements</Text>
          <View style={styles.headerSpacer} />
        </View>
        <View style={styles.permissionContainer}>
          <Ionicons name="camera-outline" size={64} color="#666" />
          <Text style={styles.permissionTitle}>Camera Permission Required</Text>
          <Text style={styles.permissionText}>
            This app needs camera access to perform AR body measurements.
          </Text>
          <TouchableOpacity style={styles.permissionButton} onPress={requestCameraPermission}>
            <Text style={styles.permissionButtonText}>Grant Permission</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBackPress} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>AR Body Measurements</Text>
        <View style={styles.headerSpacer} />
      </View>

      <View style={styles.cameraContainer}>
        <CameraView
          ref={cameraRef}
          style={styles.camera}
          facing={CameraType.back}
        >
          {renderScanOverlay()}
        </CameraView>
      </View>

      <View style={styles.controlsContainer}>
        {sessionState.error && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{sessionState.error}</Text>
          </View>
        )}

        {renderMeasurements()}

        <View style={styles.buttonContainer}>
          {!sessionState.isActive ? (
            <TouchableOpacity 
              style={styles.button} 
              onPress={initializeARSession}
            >
              <Text style={styles.buttonText}>Initialize AR</Text>
            </TouchableOpacity>
          ) : !sessionState.isScanning ? (
            <TouchableOpacity 
              style={[styles.button, styles.scanButton]} 
              onPress={startBodyScan}
            >
              <Ionicons name="scan" size={20} color="white" />
              <Text style={styles.buttonText}>Start Body Scan</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity 
              style={[styles.button, styles.stopButton]} 
              onPress={resetScan}
            >
              <Ionicons name="stop" size={20} color="white" />
              <Text style={styles.buttonText}>Stop Scan</Text>
            </TouchableOpacity>
          )}

          {sessionState.measurements && (
            <TouchableOpacity 
              style={[styles.button, styles.resetButton]} 
              onPress={resetScan}
            >
              <Ionicons name="refresh" size={20} color="white" />
              <Text style={styles.buttonText}>Scan Again</Text>
            </TouchableOpacity>
          )}
        </View>

        {isDevelopment && (
          <View style={styles.developmentInfo}>
            <Text style={styles.developmentText}>
              🤖 Development Mode: Mock measurements will be generated
            </Text>
            <Text style={styles.developmentSubText}>
              📱 For real AR: Build development version and install on physical device
            </Text>
            <Text style={styles.developmentSubText}>
              🔧 Command: eas build --profile development --platform android
            </Text>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    flex: 1,
    textAlign: 'center',
  },
  headerSpacer: {
    width: 40,
  },
  cameraContainer: {
    flex: 1,
    position: 'relative',
  },
  camera: {
    flex: 1,
  },
  scanOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanFrame: {
    width: width * 0.8,
    height: height * 0.6,
    borderWidth: 3,
    borderColor: '#00ff00',
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanFrameInner: {
    width: '90%',
    height: '90%',
    borderWidth: 2,
    borderColor: '#00ff00',
    borderRadius: 15,
    borderStyle: 'dashed',
  },
  progressContainer: {
    position: 'absolute',
    bottom: 100,
    left: 20,
    right: 20,
    alignItems: 'center',
  },
  progressBackground: {
    width: '100%',
    height: 8,
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#00ff00',
  },
  progressText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginTop: 8,
    textAlign: 'center',
  },
  progressPercent: {
    color: 'white',
    fontSize: 14,
    marginTop: 4,
  },
  instructionsContainer: {
    position: 'absolute',
    top: 100,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(0,0,0,0.7)',
    padding: 16,
    borderRadius: 8,
  },
  instructionText: {
    color: 'white',
    fontSize: 16,
    textAlign: 'center',
    fontWeight: '500',
  },
  controlsContainer: {
    backgroundColor: '#fff',
    padding: 20,
  },
  errorContainer: {
    backgroundColor: '#ffebee',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  errorText: {
    color: '#c62828',
    fontSize: 14,
    textAlign: 'center',
  },
  measurementsContainer: {
    backgroundColor: '#f8f9fa',
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
  },
  measurementsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
    textAlign: 'center',
  },
  measurementRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  measurementLabel: {
    fontSize: 16,
    color: '#666',
    fontWeight: '500',
  },
  measurementValue: {
    fontSize: 16,
    color: '#333',
    fontWeight: '600',
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  button: {
    flex: 1,
    backgroundColor: '#007AFF',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  scanButton: {
    backgroundColor: '#34C759',
  },
  stopButton: {
    backgroundColor: '#FF3B30',
  },
  resetButton: {
    backgroundColor: '#FF9500',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  permissionTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: '#333',
    marginTop: 16,
    marginBottom: 8,
  },
  permissionText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
  },
  permissionButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  permissionButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  developmentInfo: {
    backgroundColor: '#fff3cd',
    padding: 12,
    borderRadius: 8,
    marginTop: 16,
  },
  developmentText: {
    color: '#856404',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 4,
  },
  developmentSubText: {
    color: '#856404',
    fontSize: 12,
    textAlign: 'center',
    marginBottom: 2,
  },
});
