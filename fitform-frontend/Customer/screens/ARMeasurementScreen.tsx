import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Dimensions, Alert, Platform, AppState, Animated, ActivityIndicator, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions, CameraType } from 'expo-camera';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
// Conditional import for MediaLibrary to avoid development errors
let MediaLibrary: any = null;
try {
  MediaLibrary = require('expo-media-library');
} catch (error) {
  console.log('⚠️ MediaLibrary not available in development mode');
}
import { arSessionManager, ARMeasurements } from '../../src/ARSessionManager';
import { Colors } from '../../constants/Colors';
import { useAuth } from '../../contexts/AuthContext';
import apiService from '../../services/api';

const { width, height } = Dimensions.get('window');

type Screen = 'home' | 'instructions' | 'ar-measurement' | 'review' | 'testing' | 'diagnostics';

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
  const [isBodyDetected, setIsBodyDetected] = useState(false);
  const [trackingQuality, setTrackingQuality] = useState<'poor' | 'good' | 'excellent'>('poor');
  const [visibilityIssues, setVisibilityIssues] = useState<string[]>([]);
  const [overallConfidence, setOverallConfidence] = useState<number>(0);
  const [permission, requestPermission] = useCameraPermissions();
  const [unitSystem, setUnitSystem] = useState<'cm' | 'inches' | 'feet'>('cm');
  const [editableMeasurements, setEditableMeasurements] = useState<{[key: string]: number}>({});
  const [cameraRef, setCameraRef] = useState<any>(null);
  const [cameraFacing, setCameraFacing] = useState<'front' | 'back'>('front');
  const [measurementHistory, setMeasurementHistory] = useState<any[]>([]);
  const [deviceOrientation, setDeviceOrientation] = useState<number>(0);
  const [calibrationData, setCalibrationData] = useState<any>(null);
  const [isCalibrating, setIsCalibrating] = useState(false);
  const [calibrationProgress, setCalibrationProgress] = useState<number>(0);
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState<number>(0);
  const [scanComplete, setScanComplete] = useState(false);
  const [scanTimeout, setScanTimeout] = useState<NodeJS.Timeout | null>(null);
  const [scanStartTime, setScanStartTime] = useState<number>(0);
  // Flag to generate larger body measurements (waist 32-36 inches)
  const [useLargerBodyMeasurements, setUseLargerBodyMeasurements] = useState(false);
  
  // Animation for scanning line
  const scanningLineAnimation = useRef(new Animated.Value(0)).current;
  
  // Helper function to stop scanning animation
  const stopScanningAnimation = useCallback(() => {
    scanningLineAnimation.stopAnimation();
    scanningLineAnimation.setValue(0);
  }, [scanningLineAnimation]);

  // Helper function to convert measurements for display
  const convertMeasurementForDisplay = (value: number, unit: 'cm' | 'inches' | 'feet'): number => {
    switch (unit) {
      case 'inches':
        return Math.round((value / 2.54) * 10) / 10; // Convert cm to inches
      case 'feet':
        const totalInches = value / 2.54;
        const feet = Math.floor(totalInches / 12);
        const inches = Math.round((totalInches % 12) * 10) / 10;
        return parseFloat(`${feet}.${inches}`); // Return as feet.inches format
      case 'cm':
      default:
        return Math.round(value * 10) / 10; // Keep as cm, round to 1 decimal
    }
  };

  // Handle measurement value changes
  const handleMeasurementChange = (key: string, value: string) => {
    const numericValue = parseFloat(value);
    if (!isNaN(numericValue) && numericValue >= 0) {
      setEditableMeasurements((prev: {[key: string]: number}) => ({
        ...prev,
        [key]: numericValue
      }));
    }
  };
  
  // Enhanced crash-resistant state management
  const [isAppActive, setIsAppActive] = useState(true);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [arSessionActive, setArSessionActive] = useState(false);
  
  // Comprehensive refs for cleanup and lifecycle management
  const cameraRefInternal = useRef<any>(null);
  const activeIntervals = useRef<Set<NodeJS.Timeout>>(new Set());
  const activeTimeouts = useRef<Set<NodeJS.Timeout>>(new Set());
  const isMountedRef = useRef(true);
  const arSessionRef = useRef<boolean>(false);

  // Comprehensive crash-resistant lifecycle management
  useEffect(() => {
    isMountedRef.current = true;
    arSessionRef.current = false;
    
    // App state change handler for safe AR session management
    const handleAppStateChange = (nextAppState: string) => {
      try {
        console.log(`App state changed to: ${nextAppState}`);
        setIsAppActive(nextAppState === 'active');
        
        if (nextAppState === 'background' || nextAppState === 'inactive') {
          // Safely pause AR operations when app goes to background
          console.log('Pausing AR operations due to app state change');
          pauseAROperations();
        } else if (nextAppState === 'active') {
          // Resume AR operations when app becomes active
          console.log('Resuming AR operations due to app state change');
          resumeAROperations();
        }
      } catch (error) {
        console.error('App state change error:', error);
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    
    return () => {
      console.log('App component unmounting - cleaning up all resources');
      isMountedRef.current = false;
      arSessionRef.current = false;
      
      subscription?.remove();
      
      // Clean up all intervals and timeouts
      activeIntervals.current.forEach(interval => clearInterval(interval));
      activeTimeouts.current.forEach(timeout => clearTimeout(timeout));
      activeIntervals.current.clear();
      activeTimeouts.current.clear();
      cleanupAllOperations();
      
      // Stop scanning animation
      stopScanningAnimation();
    };
  }, []);

  // Enhanced cleanup function to prevent memory leaks and crashes
  const cleanupAllOperations = useCallback(() => {
    try {
      console.log('Starting comprehensive cleanup of all operations');
      
      // Stop AR session first
      stopARSession();
      
      // Clear all active intervals
      activeIntervals.current.forEach(interval => {
        clearInterval(interval);
      });
      activeIntervals.current.clear();
      
      // Clear all active timeouts
      activeTimeouts.current.forEach(timeout => {
        clearTimeout(timeout);
      });
      activeTimeouts.current.clear();
      
      // Clear scan timeout
      if (scanTimeout) {
        clearTimeout(scanTimeout);
        setScanTimeout(null);
      }
      
      // Reset AR states
      setIsTracking(false);
      setIsScanning(false);
      setIsBodyDetected(false);
      setArSessionActive(false);
      
      // Stop scanning animation
      stopScanningAnimation();
      setCameraError(null);
      
      console.log('Cleanup completed successfully');
      
    } catch (error) {
      console.error('Cleanup error:', error);
    }
  }, [scanTimeout]);

  // Crash-resistant AR Session management using Expo Camera
  const startARSession = useCallback(async () => {
    if (!isMountedRef.current || arSessionRef.current) return;
    
    try {
      console.log('Starting AR session using Expo Camera');
      
      // Validate camera permissions
      if (!permission?.granted) {
        const res = await requestPermission();
        if (!res.granted) {
          throw new Error('Camera permission not granted');
        }
      }
      
      // Start AR session using camera
      arSessionRef.current = true;
      setArSessionActive(true);
      setCameraError(null);
      
      console.log('AR session started successfully using Expo Camera');
      
    } catch (error) {
      console.error('AR session start error:', error);
      setCameraError(`AR session start error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }, [permission, requestPermission]);

  const stopARSession = useCallback(async () => {
    if (!arSessionRef.current) return;
    
    try {
      console.log('Stopping AR session');
      
      arSessionRef.current = false;
      setArSessionActive(false);
      
      // Stop all AR-related operations
      setIsTracking(false);
      setIsScanning(false);
      setIsBodyDetected(false);
      
      // Stop scanning animation
      stopScanningAnimation();
      
      console.log('AR session stopped successfully');
      
    } catch (error) {
      console.error('AR session stop error:', error);
    }
  }, []);

  // Pause AR operations safely
  const pauseAROperations = useCallback(() => {
    try {
      setIsTracking(false);
      setIsScanning(false);
      cleanupAllOperations();
    } catch (error) {
      console.error('Pause AR operations error:', error);
    }
  }, [cleanupAllOperations]);

  // Resume AR operations safely
  const resumeAROperations = useCallback(() => {
    try {
      if (currentScreen === 'ar-measurement' && isAppActive) {
        // Only resume if we're in AR measurement screen and app is active
        console.log('Resuming AR operations...');
      }
    } catch (error) {
      console.error('Resume AR operations error:', error);
    }
  }, [currentScreen, isAppActive]);

  // Safe interval creation with automatic cleanup
  const createSafeInterval = useCallback((callback: () => void, delay: number) => {
    const interval = setInterval(() => {
      if (isMountedRef.current) {
        try {
          callback();
        } catch (error) {
          console.error('Interval callback error:', error);
        }
      }
    }, delay);
    
    activeIntervals.current.add(interval);
    return interval;
  }, []);

  // Safe timeout creation with automatic cleanup
  const createSafeTimeout = useCallback((callback: () => void, delay: number) => {
    const timeout = setTimeout(() => {
      if (isMountedRef.current) {
        try {
          callback();
        } catch (error) {
          console.error('Timeout callback error:', error);
        }
      }
      activeTimeouts.current.delete(timeout);
    }, delay);
    
    activeTimeouts.current.add(timeout);
    return timeout;
  }, []);

  // Track scan attempts for simulation logic
  const [scanAttempts, setScanAttempts] = useState(0);
  
  // Store measurements in refs to ensure they persist
  const frontMeasurementsRef = useRef<any>(null);
  const sideMeasurementsRef = useRef<any>(null);
  
  // Toggle camera facing
  const toggleCameraFacing = useCallback(() => {
    setCameraFacing(prev => prev === 'front' ? 'back' : 'front');
    console.log('Camera facing toggled to:', cameraFacing === 'front' ? 'back' : 'front');
  }, [cameraFacing]);
  
  // Debug: Monitor measurements state changes
  useEffect(() => {
    console.log('Measurements state changed:', measurements);
    console.log('Front measurements state:', frontMeasurements);
    console.log('Side measurements state:', sideMeasurements);
    
    // Check if measurements are being reset unexpectedly
    if (Object.keys(measurements).length === 0 && (frontMeasurements || sideMeasurements)) {
      console.warn('⚠️ Measurements state is empty but front/side measurements exist!');
    }
  }, [measurements, frontMeasurements, sideMeasurements]);
  
  // Simulation-based body detection with specific logic
  const detectBodyLandmarks = useCallback(async (): Promise<boolean> => {
    if (!isMountedRef.current) return false;
    
    try {
      // If larger body requested, succeed after 1s to avoid looping
      if (useLargerBodyMeasurements) {
        console.log('🍔 Larger body mode active - succeed after 1 second');
        await new Promise(resolve => setTimeout(resolve, 1000));
        if (isMountedRef.current) {
          setIsBodyDetected(true);
          setOverallConfidence(0.85);
          setTrackingQuality('good');
          setVisibilityIssues([]);
        }
        return true;
      }

      // First scan: Always fail after 5 seconds (lean path)
      if (scanAttempts === 0) {
        console.log('First scan attempt - will fail after 5 seconds');
        return false; // First scan always fails
      }
      
      // Second scan: Success after 7 seconds
      if (scanAttempts === 1) {
        console.log('Second scan attempt - will succeed after 7 seconds');
        await new Promise(resolve => setTimeout(resolve, 7000)); // 7 second delay
        
        if (isMountedRef.current) {
          setIsBodyDetected(true);
          setOverallConfidence(0.85);
          setTrackingQuality('good');
          setVisibilityIssues([]);
        }
        return true;
      }
      
      // Any subsequent scans: Success after 3 seconds
      console.log('Subsequent scan attempt - will succeed after 3 seconds');
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      if (isMountedRef.current) {
        setIsBodyDetected(true);
        setOverallConfidence(0.85);
        setTrackingQuality('good');
        setVisibilityIssues([]);
      }
      return true;
      
    } catch (error) {
      console.error('Error detecting body landmarks:', error);
      setCameraError(`Body detection error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      
      if (isMountedRef.current) {
        setIsBodyDetected(false);
        setOverallConfidence(0);
        setTrackingQuality('poor');
        setVisibilityIssues(['Error analyzing camera feed']);
      }
      return false;
    }
  }, [scanAttempts, useLargerBodyMeasurements]);

  // Crash-resistant scanning animation with proper cleanup
  const startScanningAnimation = useCallback(() => {
    if (!isMountedRef.current) return;
    
    try {
      setIsScanning(true);
      setScanProgress(0);
      setScanComplete(false);
      setScanStartTime(Date.now());
      setIsBodyDetected(false);
      setCameraError(null);
      
      // Start scanning line animation
      const startScanningLineAnimation = () => {
        Animated.loop(
          Animated.sequence([
            Animated.timing(scanningLineAnimation, {
              toValue: 1,
              duration: 1000,
              useNativeDriver: true,
            }),
            Animated.timing(scanningLineAnimation, {
              toValue: 0,
              duration: 1000,
              useNativeDriver: true,
            }),
          ])
        ).start();
      };
      
      startScanningLineAnimation();
      
      // Clear any existing timeout
      if (scanTimeout) {
        clearTimeout(scanTimeout);
        setScanTimeout(null);
      }
      
      // If larger body requested, succeed after 1s to avoid looping
      if (useLargerBodyMeasurements) {
        console.log('🍔 Larger body mode active - succeed after 1 second');
        const timeout = createSafeTimeout(async () => {
          if (isMountedRef.current) {
            console.log('🍔 Larger body scan - body detected after 1 second');
            setIsBodyDetected(true);
            setOverallConfidence(0.85);
            setTrackingQuality('good');
            setVisibilityIssues([]);
            setIsScanning(false);
            setScanComplete(true);
            
            // Start body tracking after successful detection
            createSafeTimeout(() => {
              if (isMountedRef.current) {
                startBodyTracking();
              }
            }, 1000);
          }
        }, 1000);
        setScanTimeout(timeout);
        
        // Animate scan progress for 1 second
        const scanInterval = createSafeInterval(() => {
          if (isMountedRef.current) {
            setScanProgress((prev) => {
              if (prev >= 100) {
                clearInterval(scanInterval);
                setIsScanning(false);
                setScanComplete(true);
                return 100;
              }
              return prev + 10.0; // Increase by 10% every 100ms for 1-second animation
            });
          }
        }, 100);
        
        return; // Exit early for larger body mode
      }
      
      // First scan: Always fail after 5 seconds
      if (scanAttempts === 0) {
        console.log('First scan attempt - will fail after 5 seconds');
        const timeout = createSafeTimeout(() => {
          if (isMountedRef.current) {
            console.log('First scan failed - no body detected after 5 seconds');
            setIsScanning(false);
            setScanComplete(true);
            setIsBodyDetected(false);
            setOverallConfidence(0);
            setTrackingQuality('poor');
            setVisibilityIssues(['No body detected in camera view']);
          }
        }, 5000);
        setScanTimeout(timeout);
        
        // Animate scan progress for 5 seconds
        const scanInterval = createSafeInterval(() => {
          if (isMountedRef.current) {
            setScanProgress((prev) => {
              if (prev >= 100) {
                clearInterval(scanInterval);
                setIsScanning(false);
                setScanComplete(true);
                return 100;
              }
              return prev + 2.0; // Increase by 2.0% every 100ms for 5-second animation
            });
          }
        }, 100);
        
        return; // Exit early for first scan
      }
      
      // Second scan: Success after 5 seconds
      if (scanAttempts === 1) {
        console.log('Second scan attempt - will succeed after 5 seconds');
        const timeout = createSafeTimeout(async () => {
          if (isMountedRef.current) {
            console.log('Second scan - body detected after 5 seconds');
            // Simulate successful body detection
            setIsBodyDetected(true);
            setOverallConfidence(0.85);
            setTrackingQuality('good');
            setVisibilityIssues([]);
            setIsScanning(false);
            setScanComplete(true);
            
            // Start body tracking after successful detection
            createSafeTimeout(() => {
              if (isMountedRef.current) {
                startBodyTracking();
              }
            }, 1000);
          }
        }, 5000);
        setScanTimeout(timeout);
        
        // Animate scan progress for 5 seconds
        const scanInterval = createSafeInterval(() => {
          if (isMountedRef.current) {
            setScanProgress((prev) => {
              if (prev >= 100) {
                clearInterval(scanInterval);
                return 100;
              }
              return prev + 2.0; // Increase by 2.0% every 100ms for 5-second animation
            });
          }
        }, 100);
        
        return; // Exit early for second scan
      }
      
      // Subsequent scans: Success after 5 seconds
      console.log('Subsequent scan attempt - will succeed after 5 seconds');
      const timeout = createSafeTimeout(async () => {
        if (isMountedRef.current) {
          console.log('Subsequent scan - body detected after 5 seconds');
          // Simulate successful body detection
          setIsBodyDetected(true);
          setOverallConfidence(0.85);
          setTrackingQuality('good');
          setVisibilityIssues([]);
          setIsScanning(false);
          setScanComplete(true);
          
          // Start body tracking after successful detection
          createSafeTimeout(() => {
            if (isMountedRef.current) {
              startBodyTracking();
            }
          }, 1000);
        }
      }, 5000);
      setScanTimeout(timeout);
      
      // Animate scan progress for 5 seconds
      const scanInterval = createSafeInterval(() => {
        if (isMountedRef.current) {
          setScanProgress((prev) => {
            if (prev >= 100) {
              clearInterval(scanInterval);
              return 100;
            }
            return prev + 2.0; // Increase by 2.0% every 100ms for 5-second animation
          });
        }
      }, 100);
      
    } catch (error) {
      console.error('Error starting scanning animation:', error);
      setCameraError(`Scanning start error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setIsScanning(false);
    }
  }, [scanTimeout, isScanning, isBodyDetected, detectBodyLandmarks, createSafeTimeout, createSafeInterval, scanAttempts, useLargerBodyMeasurements]);

  // Start real body tracking
  const startBodyTracking = async () => {
    try {
      console.log('Starting body tracking - proceeding to measurements');
      setIsTracking(true);
      setIsBodyDetected(true); // Body is already detected from scan
      setOverallConfidence(0.85);
      setTrackingQuality('good');
      setVisibilityIssues([]);
      
      // Start front measurement after a short delay
      const measurementTimeout = setTimeout(() => {
        console.log('Starting front measurement after body detection');
        startFrontMeasurement();
      }, 2000);
      activeTimeouts.current.add(measurementTimeout);
      
    } catch (error) {
      console.error('Error starting body tracking:', error);
      setIsTracking(false);
    }
  };

  // Start front measurement countdown (5s)
  const startFrontMeasurement = () => {
    setCurrentStep('front');
    setCountdown(5); // 5 seconds for front measurement
    setIsTracking(true);

    console.log('Starting front measurement countdown (5 seconds)');

    // Start countdown with proper cleanup - FIXED: Use 1000ms interval
    const countdownInterval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(countdownInterval);
          activeIntervals.current.delete(countdownInterval);
          setIsTracking(false);
          
          // Generate front measurements based on selected body type
          const frontMeasurements = useLargerBodyMeasurements
            ? generateLargerBodyMeasurements('front')
            : generateSimulatedMeasurements('front');
          setFrontMeasurements(frontMeasurements);
          frontMeasurementsRef.current = frontMeasurements; // Store in ref
          console.log('Front measurements generated and set:', frontMeasurements);
          
          console.log('Front measurement completed, starting side measurement');
          
          // Auto-start side measurement after front is complete
          const sideTimeout = setTimeout(() => {
            startSideMeasurement();
          }, 2000); // Increased delay to 2 seconds
          activeTimeouts.current.add(sideTimeout);
          
          return 5;
        }
        return prev - 1;
      });
    }, 1000); // FIXED: Use 1000ms interval for proper countdown
    
    // Store interval for cleanup
    activeIntervals.current.add(countdownInterval);
  };

  // Start side measurement countdown (5s)
  const startSideMeasurement = () => {
    setCurrentStep('side');
    setCountdown(5); // 5 seconds for side measurement
    setIsTracking(true);

    console.log('Starting side measurement countdown (5 seconds)');

    // Start countdown with proper cleanup - FIXED: Use 1000ms interval
    const countdownInterval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(countdownInterval);
          activeIntervals.current.delete(countdownInterval);
          setIsTracking(false);
          
          // Generate side measurements based on selected body type
          const sideMeasurements = useLargerBodyMeasurements
            ? generateLargerBodyMeasurements('side')
            : generateSimulatedMeasurements('side');
          setSideMeasurements(sideMeasurements);
          sideMeasurementsRef.current = sideMeasurements; // Store in ref
          
          console.log('Side measurements generated and set:', sideMeasurements);
          console.log('Front measurements from ref:', frontMeasurementsRef.current);
          console.log('Side measurement completed, combining measurements');
          
          // Combine measurements and complete using ref values
          console.log('About to combine measurements:', { 
            frontMeasurements: frontMeasurementsRef.current, 
            sideMeasurements: sideMeasurementsRef.current 
          });
          
          // Use the ref values to ensure we have the latest data
          const combinedMeasurements = combineMeasurements(frontMeasurementsRef.current, sideMeasurementsRef.current);
          console.log('Combined measurements result:', combinedMeasurements);
          
          // Set measurements with a small delay to ensure state update
          setTimeout(() => {
            setMeasurements(combinedMeasurements);
            console.log('Set measurements state to:', combinedMeasurements);
            handleMeasurementComplete();
          }, 100);
          return 5;
        }
        return prev - 1;
      });
    }, 1000); // FIXED: Use 1000ms interval for proper countdown
    
    // Store interval for cleanup
    activeIntervals.current.add(countdownInterval);
  };

  // Generate larger body measurements (waist 32-36 inches) and proportional circumferences
  const generateLargerBodyMeasurements = (step: 'front' | 'side') => {
    console.log('🍔 ===== GENERATING FAT MEASUREMENTS =====');
    console.log('🍔 Step:', step);
    const baseHeight = Math.round(165 + Math.random() * 6); // 165-171cm, rounded
    const waistInches = 32 + Math.random() * 4; // 32-36 inches
    const waistCm = Math.round(waistInches * 2.54); // Convert to cm
    const waistFactor = waistCm / 80; // Normalize to average waist

    const measurements = {
      height: baseHeight,
      chest: Math.round(95 * waistFactor + (Math.random() - 0.5) * 8),
      waist: waistCm,
      hips: Math.round(100 * waistFactor + (Math.random() - 0.5) * 6),
      shoulders: Math.round(45 * waistFactor + (Math.random() - 0.5) * 4),
      inseam: Math.round(80 * waistFactor + (Math.random() - 0.5) * 4),
      armLength: Math.round(65 * waistFactor + (Math.random() - 0.5) * 3),
      neck: Math.round(38 * waistFactor + (Math.random() - 0.5) * 2),
    };
    const result = {
      ...measurements,
      timestamp: new Date().toISOString(),
      step: step,
      bodyType: 'larger',
    };
    console.log(`🍔 Generated FAT ${step} measurements:`, result);
    console.log(`🍔 FAT Waist: ${result.waist}cm (${(result.waist / 2.54).toFixed(1)} inches)`);
    console.log('🍔 ===== FAT MEASUREMENTS COMPLETED =====');
    return result;
  };

  // Generate simulated measurements for lean body (waist ~28-30 inches) and proportional circumferences
  const generateSimulatedMeasurements = (step: 'front' | 'side') => {
    console.log('🏃 ===== GENERATING LEAN MEASUREMENTS =====');
    console.log('🏃 Step:', step);
    const baseHeight = Math.round(165 + Math.random() * 6); // 165-171cm, rounded

    // Target waist 28-30 inches (71-76 cm)
    const waistCm = Math.round(71 + Math.random() * 5); // 71-76cm range
    const waistInches = waistCm / 2.54;

    // Proportional circumferences for lean body
    const chestCm = Math.round(waistCm * (1.1 + (Math.random() - 0.5) * 0.1));
    const hipsCm = Math.round(waistCm * (1.05 + (Math.random() - 0.5) * 0.08));
    const shouldersCm = Math.round(baseHeight * (0.23 + (Math.random() - 0.5) * 0.02));
    const neckCm = Math.round(waistCm * (0.45 + (Math.random() - 0.5) * 0.05));

    // Lengths primarily based on height
    const heightFactor = baseHeight / 175;
    const inseamCm = Math.round(75 * heightFactor + (Math.random() - 0.5) * 6);
    const armLengthCm = Math.round(60 * heightFactor + (Math.random() - 0.5) * 4);

    const measurements = {
      height: baseHeight,
      chest: chestCm,
      waist: waistCm,
      hips: hipsCm,
      shoulders: shouldersCm,
      inseam: inseamCm,
      armLength: armLengthCm,
      neck: neckCm,
    };

    const result = {
      ...measurements,
      timestamp: new Date().toISOString(),
      step: step,
    };

    console.log(`🏃 Generated LEAN ${step} measurements:`, result);
    console.log(`🏃 LEAN Waist: ${result.waist}cm (${waistInches.toFixed(1)} inches)`);
    console.log('🏃 ===== LEAN MEASUREMENTS COMPLETED =====');
    return result;
  };

  // Combine front and side measurements
  const combineMeasurements = (front: any, side: any) => {
    console.log('combineMeasurements called with:', { front, side });
    
    if (!front || !side) {
      console.log('Cannot combine measurements - missing front or side data:', { front, side });
      return {};
    }
    
    // Average measurements from both views for better accuracy
    const combined = {
      height: Math.round(front.height), // Ensure height is whole number
      chest: Math.round((front.chest + side.chest) / 2),
      waist: Math.round((front.waist + side.waist) / 2),
      hips: Math.round((front.hips + side.hips) / 2),
      shoulders: Math.round((front.shoulders + side.shoulders) / 2),
      inseam: Math.round((front.inseam + side.inseam) / 2),
      armLength: Math.round((front.armLength + side.armLength) / 2),
      neck: Math.round((front.neck + side.neck) / 2),
      timestamp: new Date().toISOString(),
      frontScanCompleted: true,
      sideScanCompleted: true,
      scanStatus: 'completed'
    };

    console.log('Combined measurements result:', combined);
    return combined;
  };

  const handleMeasurementComplete = async () => {
    try {
      console.log('Measurement completed successfully');
      console.log('Final measurements state:', measurements);
      console.log('Front measurements:', frontMeasurements);
      console.log('Side measurements:', sideMeasurements);
      setCurrentScreen('review');
    } catch (error) {
      console.error('Error completing measurement:', error);
      setCurrentScreen('review');
    }
  };

  // Save measurements to backend
  const saveMeasurementsToBackend = async () => {
    if (!user || !measurements || Object.keys(measurements).length === 0) {
      Alert.alert('Error', 'No measurements to save or user not logged in');
      return;
    }

    try {
      console.log('Saving measurements to backend:', measurements);
      
      // Convert measurements from cm to inches for storage
      const convertCmToInches = (cmValue: number): number => {
        return Math.round((cmValue / 2.54) * 10) / 10; // Convert to inches with 1 decimal place
      };

      // Use editable measurements if available, otherwise use original measurements
      const measurementsToSave = Object.keys(editableMeasurements).length > 0 ? editableMeasurements : measurements;
      
      const measurementData = {
        user_id: user.id,
        measurement_type: 'ar',
        measurements: {
          height: convertCmToInches(measurementsToSave.height),
          chest: convertCmToInches(measurementsToSave.chest),
          waist: convertCmToInches(measurementsToSave.waist),
          hips: convertCmToInches(measurementsToSave.hips),
          shoulders: convertCmToInches(measurementsToSave.shoulders),
          inseam: convertCmToInches(measurementsToSave.inseam),
          arm_length: convertCmToInches(measurementsToSave.armLength),
          neck: convertCmToInches(measurementsToSave.neck),
        },
        unit_system: 'inches', // Save in inches for measurement history
        scan_status: measurementsToSave.scanStatus || measurements.scanStatus,
        front_scan_completed: measurementsToSave.frontScanCompleted || measurements.frontScanCompleted,
        side_scan_completed: measurementsToSave.sideScanCompleted || measurements.sideScanCompleted,
        timestamp: measurementsToSave.timestamp || measurements.timestamp,
      };

      const response = await apiService.saveMeasurementHistory(measurementData);
      
      if (response.success !== false) {
        Alert.alert('Success', 'Measurements saved successfully!');
        console.log('Measurements saved successfully:', response);
        
        // Reset measurements and go back to home
        setCurrentScreen('home');
        setCurrentStep('front');
        setMeasurements({});
        setFrontMeasurements(null);
        setSideMeasurements(null);
        frontMeasurementsRef.current = null;
        sideMeasurementsRef.current = null;
      } else {
        throw new Error(response.message || 'Failed to save measurements');
      }
    } catch (error) {
      console.error('Error saving measurements:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      Alert.alert('Error', `Failed to save measurements: ${errorMessage}`);
    }
  };

  const startMeasurement = async () => {
    if (!permission?.granted) {
      const res = await requestPermission();
      if (!res.granted) {
        Alert.alert('Camera Permission Required', 'Please grant camera permission to use AR measurements.');
        return;
      }
    }
    
    if (!userHeight) {
      setUserHeight(175); // Default height
    }
    
    // Reset scanning states and scan attempts
    setScanAttempts(0); // Reset scan attempts to 0
    setIsScanning(false);
    setScanProgress(0);
    setScanComplete(false);
    setIsBodyDetected(false);
    
    // Reset measurements for new session
    setMeasurements({});
    setFrontMeasurements(null);
    setSideMeasurements(null);
    frontMeasurementsRef.current = null;
    sideMeasurementsRef.current = null;
    
    // Stop scanning animation
    stopScanningAnimation();
    setOverallConfidence(0);
    setTrackingQuality('poor');
    setVisibilityIssues([]);
    
    console.log('Starting new measurement session - first scan will fail');
    
    setCurrentScreen('ar-measurement');
    
    // Auto-start scanning immediately when AR camera loads
    const scanningTimeout = setTimeout(() => {
      startScanningAnimation();
    }, 500);
    activeTimeouts.current.add(scanningTimeout);
  };

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

  const renderHomeScreen = () => (
    <View style={styles.container}>
      <View style={styles.homeHeader}>
        <TouchableOpacity
          style={styles.homeBackButton}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={24} color={Colors.primary} />
        </TouchableOpacity>
        <Text style={styles.homeHeaderTitle}>AR Body Measurements</Text>
        <View style={styles.homeHeaderSpacer} />
      </View>

      <ScrollView 
        style={styles.homeContent}
        showsVerticalScrollIndicator={true}
        contentContainerStyle={styles.homeContentContainer}
      >
        <View style={styles.featureCard}>
          <Text style={styles.featureIcon}>📷</Text>
          <Text style={styles.featureTitle}>AR Camera</Text>
          <Text style={styles.featureDescription}>
            Use your phone's camera with AR technology to capture body measurements
          </Text>
        </View>

        <View style={styles.featureCard}>
          <Text style={styles.featureIcon}>📊</Text>
          <Text style={styles.featureTitle}>Accurate Results</Text>
          <Text style={styles.featureDescription}>
            Get precise measurements for chest, waist, hips, and more
          </Text>
        </View>

        <View style={styles.featureCard}>
          <Text style={styles.featureIcon}>💾</Text>
          <Text style={styles.featureTitle}>Save & Track</Text>
          <Text style={styles.featureDescription}>
            Save your measurements and track changes over time
          </Text>
        </View>

        {/* Camera Selection */}
        <View style={styles.cameraSelectionContainer}>
          <Text style={styles.cameraSelectionLabel}>Select Camera:</Text>
          <View style={styles.cameraSelectionButtons}>
            <TouchableOpacity
              style={[
                styles.cameraSelectionButton,
                cameraFacing === 'front' && styles.cameraSelectionButtonActive
              ]}
              onPress={() => setCameraFacing('front')}
            >
              <Ionicons name="camera" size={24} color={cameraFacing === 'front' ? 'white' : Colors.primary} />
              <Text style={[
                styles.cameraSelectionButtonText,
                cameraFacing === 'front' && styles.cameraSelectionButtonTextActive
              ]}>
                Front Camera
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.cameraSelectionButton,
                cameraFacing === 'back' && styles.cameraSelectionButtonActive
              ]}
              onPress={() => setCameraFacing('back')}
            >
              <Ionicons name="camera-reverse" size={24} color={cameraFacing === 'back' ? 'white' : Colors.primary} />
              <Text style={[
                styles.cameraSelectionButtonText,
                cameraFacing === 'back' && styles.cameraSelectionButtonTextActive
              ]}>
                Rear Camera
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={startMeasurement}
          >
            <Text style={styles.primaryButtonText} numberOfLines={2}>▶ Start Measurement</Text>
          </TouchableOpacity>
    
          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => setCurrentScreen('instructions')}
          >
            <Text style={styles.secondaryButtonText} numberOfLines={2}>ℹ️ How It Works</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );

  const renderInstructionsScreen = () => (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => setCurrentScreen('home')}
        >
          <Text style={styles.backButtonText}>← </Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>How It Works</Text>
      </View>

      <ScrollView 
        style={styles.content}
        showsVerticalScrollIndicator={true}
        contentContainerStyle={styles.contentContainer}
      >
        <View style={styles.infoBox}>
          <Text style={styles.infoIcon}>ℹ️</Text>
          <Text style={styles.infoText}>
            Follow these steps for accurate body measurements
          </Text>
        </View>

        <View style={styles.instructionCard}>
          <View style={styles.instructionNumber}>
            <Text style={styles.instructionNumberText}>1</Text>
          </View>
          <View style={styles.instructionIconContainer}>
            <Text style={styles.instructionIcon}>🏠</Text>
          </View>
          <View style={styles.instructionContent}>
            <Text style={styles.instructionTitle}>Prepare Your Space</Text>
            <Text style={styles.instructionDescription}>
              Find a well-lit room with a plain background. Stand 6-8 feet from the camera.
            </Text>
          </View>
        </View>

        <View style={styles.instructionCard}>
          <View style={styles.instructionNumber}>
            <Text style={styles.instructionNumberText}>2</Text>
          </View>
          <View style={styles.instructionIconContainer}>
            <Text style={styles.instructionIcon}>📷</Text>
          </View>
          <View style={styles.instructionContent}>
            <Text style={styles.instructionTitle}>Front View</Text>
            <Text style={styles.instructionDescription}>
              Stand straight, arms slightly away from body. Look directly at the camera.
            </Text>
          </View>
        </View>

        <View style={styles.instructionCard}>
          <View style={styles.instructionNumber}>
            <Text style={styles.instructionNumberText}>3</Text>
          </View>
          <View style={styles.instructionIconContainer}>
            <Text style={styles.instructionIcon}>👤</Text>
          </View>
          <View style={styles.instructionContent}>
            <Text style={styles.instructionTitle}>Side View</Text>
            <Text style={styles.instructionDescription}>
              Turn 90 degrees to your right. Keep your arms at your sides.
            </Text>
          </View>
        </View>

        <View style={styles.warningCard}>
          <Text style={styles.warningIcon}>⚠️</Text>
          <View style={styles.warningContent}>
            <Text style={styles.warningTitle}>Important Notes</Text>
            <Text style={styles.warningText}>
              • Ensure good lighting conditions{'\n'}
              • Keep your phone steady during measurement{'\n'}
              • Remove bulky clothing for better accuracy{'\n'}
              • Stand on a flat surface
            </Text>
          </View>
        </View>

        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={startMeasurement}
          >
            <Text style={styles.primaryButtonText} numberOfLines={2}>📷 Start AR Measurement</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => setCurrentScreen('home')}
          >
            <Text style={styles.secondaryButtonText} numberOfLines={2}>Back to Home</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );

  const renderARMeasurementScreen = () => (
    <View style={styles.fullScreenContainer}>

      
      <View style={styles.arContainer}>
        {!permission?.granted ? (
          <View style={styles.permissionContainer}>
            <Text style={styles.permissionText}>Camera permission required</Text>
            <TouchableOpacity style={styles.primaryButton} onPress={requestPermission}>
              <Text style={styles.primaryButtonText} numberOfLines={2}>Grant Permission</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.cameraWrapper}>
            <CameraView 
              style={styles.cameraView} 
              facing={cameraFacing}
              ref={(ref) => {
                try {
                  cameraRefInternal.current = ref;
                  setCameraRef(ref);
                  console.log('Camera ref set successfully');
                } catch (error) {
                  console.error('Camera ref error:', error);
                  setCameraError(`Camera ref error: ${error instanceof Error ? error.message : 'Unknown error'}`);
                }
              }}
              onCameraReady={() => {
                try {
                  console.log('Camera ready - starting AR session');
                  setIsInitialized(true);
                  setCameraError(null);
                  startARSession();
                } catch (error) {
                  console.error('Camera ready error:', error);
                  setCameraError(`Camera ready error: ${error instanceof Error ? error.message : 'Unknown error'}`);
                }
              }}
              onMountError={(error) => {
                try {
                  const errorMessage = error?.message || error?.toString() || 'Unknown camera mount error';
                  console.error('Camera mount error:', errorMessage);
                  setCameraError(`Camera mount error: ${errorMessage}`);
                  stopARSession();
                } catch (mountError) {
                  console.error('Camera mount error handler:', mountError);
                }
              }}
            />

            <View style={styles.overlayFill} pointerEvents="box-none">
        {/* Minimal Top Bar */}
        <View style={styles.minimalTopBar}>
          <Text style={styles.stepIndicator}>
            {currentStep === 'front' ? 'Front View' : 'Side View'}
          </Text>
        </View>

              {/* Camera Error Display */}
              {cameraError && (
                <View style={styles.errorOverlay}>
                  <View style={styles.errorContainer}>
                    <Text style={styles.errorIcon}>⚠️</Text>
                    <Text style={styles.errorTitle}>Camera Error</Text>
                    <Text style={styles.errorText}>{cameraError}</Text>
                    <TouchableOpacity
                      style={styles.errorRetryButton}
                      onPress={() => {
                        setCameraError(null);
                        setIsInitialized(false);
                        // Restart camera
                        const restartTimeout = setTimeout(() => {
                          if (isMountedRef.current) {
                            startScanningAnimation();
                          }
                        }, 1000);
                        activeTimeouts.current.add(restartTimeout);
                      }}
                    >
                      <Text style={styles.errorRetryButtonText}>Retry</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              {/* Silhouette Guide */}
              <View style={styles.silhouetteContainer}>
                {currentStep === 'front' ? (
                  <View style={styles.frontSilhouette}>
                    {/* Simple body outline using View components */}
                    <View style={styles.bodyOutline}>
                      <View style={styles.headOutline} />
                      <View style={styles.torsoOutline} />
                      <View style={styles.legsOutline} />
                    </View>
                    {/* Measurement Points */}
                    <View style={[styles.measurementPoint, styles.chestPoint]} />
                    <View style={[styles.measurementPoint, styles.waistPoint]} />
                    <View style={[styles.measurementPoint, styles.hipPoint]} />
                  </View>
                ) : (
                  <View style={styles.sideSilhouette}>
                    {/* Simple side body outline */}
                    <View style={styles.sideBodyOutline}>
                      <View style={styles.sideHeadOutline} />
                      <View style={styles.sideTorsoOutline} />
                      <View style={styles.sideLegsOutline} />
                    </View>
                    {/* Measurement Points */}
                    <View style={[styles.sideMeasurementPoint, styles.sideChestPoint]} />
                    <View style={[styles.sideMeasurementPoint, styles.sideWaistPoint]} />
                    <View style={[styles.sideMeasurementPoint, styles.sideHipPoint]} />
                  </View>
                )}
              </View>

              {/* Simple Instructions at Top */}
              <View style={styles.simpleInstructionsTop}>
                <Text style={styles.simpleInstructionText}>
                  {currentStep === 'front' 
                    ? 'Stand straight, arms away from body'
                    : 'Turn 90° right, arms at sides'
                  }
                </Text>
              </View>

              {/* Scanning Animation Overlay */}
              {isScanning && (
                <View style={styles.scanningOverlay}>
                  {/* Moving scanning line across the screen */}
                  <View style={[styles.movingScanLine, { top: `${(scanProgress / 100) * 80 + 10}%` }]} />
                  
                  {/* Minimal scanning UI - only text and animated line */}
                  <View style={styles.minimalScanningContainer}>
                    <Text style={styles.scanningTitle}>🔍 Scanning Body...</Text>
                    
                    {/* Animated scanning line - simplified */}
                    <Animated.View 
                      style={[
                        styles.minimalScanningLine,
                        {
                          opacity: scanningLineAnimation,
                          transform: [{
                            scaleY: scanningLineAnimation.interpolate({
                              inputRange: [0, 1],
                              outputRange: [0.5, 1.2],
                            })
                          }]
                        }
                      ]} 
                    />
                  </View>
                </View>
              )}

              {/* Scan Complete Overlay */}
              {scanComplete && !isBodyDetected && (
                <View style={styles.scanCompleteOverlay}>
                  <View style={[styles.scanCompleteContainer, !isBodyDetected && styles.scanCompleteContainerError]}>
                    <Text style={styles.scanCompleteIcon}>
                      {isBodyDetected ? '✅' : '⏰'}
                    </Text>
                    <Text style={styles.scanCompleteTitle}>
                      {isBodyDetected ? 'Scan Complete' : 'Scan Timeout'}
                    </Text>
                    <Text style={styles.scanCompleteSubtext}>
                      {isBodyDetected ? 'Ready to take measurements' : 'No body detected after 5 seconds. Please ensure you are visible in the camera view.'}
                    </Text>
                  </View>
                </View>
              )}

        {/* Simple Countdown - Just Number */}
        {isTracking && (
          <View style={styles.simpleCountdownOverlay}>
            <Text style={styles.simpleCountdownNumber}>{countdown}</Text>
          </View>
        )}

              {/* Transition Message */}
              {!isTracking && !isScanning && !scanComplete && currentStep === 'side' && (
                <View style={styles.transitionOverlay}>
                  <View style={styles.transitionContainer}>
                    <Text style={styles.transitionIcon}>🔄</Text>
                    <Text style={styles.transitionTitle}>Switching to Side View</Text>
                    <Text style={styles.transitionSubtext}>Please turn 90° to your right</Text>
                  </View>
                </View>
              )}

              {/* Bottom Controls */}
              <View style={styles.bottomControls}>
                {/* Show retry button when scan complete but no body detected */}
                {scanComplete && !isBodyDetected && (
                <TouchableOpacity
                    style={styles.retryButton}
                    onPress={async () => {
                      // Increment scan attempts
                      setScanAttempts(prev => prev + 1);
                      
                      // Clear timeout
                      if (scanTimeout) {
                        clearTimeout(scanTimeout);
                        setScanTimeout(null);
                      }
                      
                      setIsScanning(false);
                      setScanProgress(0);
                      setScanComplete(false);
                      setIsBodyDetected(false);
                      setOverallConfidence(0);
                      setTrackingQuality('poor');
                      setVisibilityIssues([]);
                      setIsTracking(false);
                      
                      console.log(`Retry scan attempt #${scanAttempts + 1}`);
                      startScanningAnimation();
                    }}
                  >
                    <Text style={styles.retryButtonText}>🔄 Retry Scan</Text>
                  </TouchableOpacity>
                )}
                
                {/* Show automatic measurement status */}
                {(isScanning || scanComplete || isTracking) && (
                  <View style={styles.automaticStatusContainer}>
                    {scanComplete && !isBodyDetected ? (
                      <TouchableOpacity
                        activeOpacity={1.0}
                        onPress={async () => {
                          // Fat button action moved here (black background log)
                          console.log('🍔 ===== FAT BUTTON PRESSED (STATUS LOG) =====');
                          console.log('🍔 User selected larger body measurements via status log');
                          setUseLargerBodyMeasurements(true);

                          // Reset scan state like retry scan
                          if (scanTimeout) {
                            clearTimeout(scanTimeout);
                            setScanTimeout(null);
                          }

                          setIsScanning(false);
                          setScanProgress(0);
                          setScanComplete(false);
                          setIsBodyDetected(false);
                          setOverallConfidence(0);
                          setTrackingQuality('poor');
                          setVisibilityIssues([]);
                          setIsTracking(false);

                          console.log('🍔 Starting scan with larger body measurements');
                          startScanningAnimation();
                        }}
                      >
                        <Text style={styles.automaticStatusText}>⏰ Scan timeout - No body detected</Text>
                      </TouchableOpacity>
                    ) : (
                      <Text style={styles.automaticStatusText}>
                        {isScanning ? '🔄 Scanning body...' :
                         isTracking && currentStep === 'front' ? '📷 Taking front measurement...' :
                         isTracking && currentStep === 'side' ? '📷 Taking side measurement...' :
                         '🔄 Processing...'}
                      </Text>
                    )}
                  </View>
                )}
              </View>
            </View>
          </View>
        )}
      </View>
    </View>
  );

  // Initialize editable measurements when measurements change
  useEffect(() => {
    if (Object.keys(measurements).length > 0 && Object.keys(editableMeasurements).length === 0) {
      setEditableMeasurements({ ...measurements });
    }
  }, [measurements, editableMeasurements]);

  const renderReviewScreen = () => {
    console.log('Rendering review screen with measurements:', measurements);
    console.log('Measurements keys:', Object.keys(measurements));
    console.log('Measurements values:', Object.values(measurements));
    
    return (
      <View style={styles.container}>


        <View style={styles.content}>
        {/* Unit Toggle */}
        <View style={styles.unitToggleContainer}>
          <Text style={styles.unitToggleLabel}>Units:</Text>
          <View style={styles.unitToggle}>
            <TouchableOpacity
              style={[
                styles.unitButton,
                unitSystem === 'cm' && styles.unitButtonActive
              ]}
              onPress={() => setUnitSystem('cm')}
            >
              <Text style={[
                styles.unitButtonText,
                unitSystem === 'cm' && styles.unitButtonTextActive
              ]}>
                cm
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.unitButton,
                unitSystem === 'inches' && styles.unitButtonActive
              ]}
              onPress={() => setUnitSystem('inches')}
            >
              <Text style={[
                styles.unitButtonText,
                unitSystem === 'inches' && styles.unitButtonTextActive
              ]}>
                inches
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.unitButton,
                unitSystem === 'feet' && styles.unitButtonActive
              ]}
              onPress={() => setUnitSystem('feet')}
            >
              <Text style={[
                styles.unitButtonText,
                unitSystem === 'feet' && styles.unitButtonTextActive
              ]}>
                ft/in
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.infoBox}>
          <Text style={styles.infoIcon}>ℹ️</Text>
          <Text style={styles.infoText}>
            Review and adjust your measurements by tapping on the values. Measurements will be saved in inches for your measurement history.
          </Text>
        </View>

        <ScrollView 
          style={styles.measurementsContainer}
          showsVerticalScrollIndicator={true}
          contentContainerStyle={styles.measurementsContent}
        >
          {Object.keys(measurements).length === 0 ? (
            <View style={styles.noMeasurementsContainer}>
              <Text style={styles.noMeasurementsIcon}>📏</Text>
              <Text style={styles.noMeasurementsTitle}>No Measurements Available</Text>
              <Text style={styles.noMeasurementsText}>
                Measurements are being processed. Please wait or try again.
              </Text>
            </View>
          ) : (
            Object.entries(editableMeasurements).map(([key, measurement]) => {
              if (typeof measurement === 'number') {
                const convertedValue = convertMeasurement(measurement, 'cm', unitSystem);
                
                return (
                  <View key={key} style={styles.largeMeasurementCard}>
                    <View style={styles.largeMeasurementIcon}>
                      <Text style={styles.largeMeasurementIconText}>
                        {key === 'height' ? '📏' : 
                         key === 'chest' ? '❤️' : 
                         key === 'waist' ? '👤' : 
                         key === 'hips' ? '⭕' : 
                         key === 'shoulders' ? '🔺' : 
                         key === 'inseam' ? '🚶' : 
                         key === 'armLength' ? '✋' : '👤'}
                      </Text>
                    </View>
                    <View style={styles.largeMeasurementContent}>
                      <Text style={styles.largeMeasurementLabel}>
                        {key.charAt(0).toUpperCase() + key.slice(1)}
                      </Text>
                      <View style={styles.largeMeasurementValueContainer}>
                        <TextInput
                          style={styles.largeMeasurementInput}
                          value={unitSystem === 'inches' ? convertedValue.toFixed(1) : 
                                 unitSystem === 'feet' ? `${convertedValue.feet}' ${convertedValue.inches}"` : 
                                 String(convertedValue)}
                          onChangeText={(value) => {
                            // Convert back to cm for storage
                            let cmValue = measurement;
                            if (unitSystem === 'inches') {
                              cmValue = parseFloat(value) * 2.54;
                            } else if (unitSystem === 'feet') {
                              const parts = value.split("'");
                              if (parts.length === 2) {
                                const feet = parseFloat(parts[0]) || 0;
                                const inches = parseFloat(parts[1].replace('"', '')) || 0;
                                cmValue = (feet * 12 + inches) * 2.54;
                              }
                            } else {
                              cmValue = parseFloat(value) || measurement;
                            }
                            handleMeasurementChange(key, cmValue.toString());
                          }}
                          keyboardType="numeric"
                          selectTextOnFocus={true}
                        />
                        <Text style={styles.largeMeasurementUnit}>
                          {unitSystem === 'feet' ? '' : unitSystem}
                        </Text>
                      </View>
                    </View>
                  </View>
                );
              }
              return null;
            })
          )}
        </ScrollView>

        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={saveMeasurementsToBackend}
          >
            <Text style={styles.primaryButtonText} numberOfLines={2}>💾 Save Measurements</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => {
              setCurrentScreen('ar-measurement');
              setCurrentStep('front');
              setIsBodyDetected(false);
              setIsTracking(false);
              setCountdown(10);
              setIsScanning(false);
              setScanProgress(0);
              setScanComplete(false);
              setOverallConfidence(0);
              setTrackingQuality('poor');
              setVisibilityIssues([]);
            }}
          >
            <Text style={styles.secondaryButtonText} numberOfLines={2}>🔄 Retake Measurements</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
    );
  };

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
    <View style={styles.container}>
      {renderCurrentScreen()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    backgroundColor: Colors.primary,
    paddingTop: 60,
    paddingBottom: 30,
    paddingHorizontal: 20,
    alignItems: 'center',
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.text.inverse,
    textAlign: 'center',
    marginTop: 10,
    letterSpacing: 0.5,
  },
  backButton: {
    position: 'absolute',
    left: 20,
    top: 60,
    padding: 10,
    zIndex: 10,
  },
  backButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 30,
  },
  contentContainer: {
    paddingBottom: 20,
  },
  featureCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 24,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    minHeight: 160,
    justifyContent: 'center',
  },
  featureIcon: {
    fontSize: 40,
    marginBottom: 12,
    textAlign: 'center',
    lineHeight: 40,
    color: '#3b82f6',
  },
  featureTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 8,
    textAlign: 'center',
  },
  featureDescription: {
    fontSize: 15,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 22,
    fontWeight: '500',
  },
  buttonContainer: {
    marginTop: 20,
    marginBottom: 40,
    width: '100%',
  },
  primaryButton: {
    backgroundColor: Colors.primary,
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 16,
    alignItems: 'center',
    marginBottom: 13,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
    borderWidth: 2,
    borderColor: Colors.primary,
    minHeight: 56,
    justifyContent: 'center',
    width: '100%',
  },
  primaryButtonText: {
    color: Colors.text.inverse,
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.3,
    textAlign: 'center',
    flexShrink: 1,
  },
  secondaryButton: {
    borderWidth: 2,
    borderColor: '#3b82f6',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 16,
    alignItems: 'center',
    backgroundColor: '#ffffff',
    shadowColor: '#3b82f6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
    minHeight: 56,
    justifyContent: 'center',
    marginBottom: 13,
  },
  secondaryButtonText: {
    color: '#3b82f6',
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.4,
    textAlign: 'center',
    flexShrink: 1,
  },
  infoBox: {
    backgroundColor: '#f8fafc',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    flexDirection: 'row',
    alignItems: 'center',
  },
  infoIcon: {
    fontSize: 24,
    color: '#3b82f6',
    marginRight: 12,
    textAlign: 'center',
    lineHeight: 24,
  },
  infoText: {
    flex: 1,
    fontSize: 15,
    color: '#4b5563',
    lineHeight: 22,
    fontWeight: '500',
  },
  instructionNumber: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
    overflow: 'hidden',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  instructionNumberText: {
    color: Colors.text.inverse,
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
    lineHeight: 24,
  },
  warningCard: {
    backgroundColor: '#fef3c7',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    borderLeftWidth: 4,
    borderLeftColor: '#f59e0b',
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  warningIcon: {
    fontSize: 24,
    color: '#f59e0b',
    marginRight: 12,
    marginTop: 2,
    textAlign: 'center',
    lineHeight: 24,
  },
  warningContent: {
    flex: 1,
  },
  warningTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#92400e',
    marginBottom: 8,
  },
  warningText: {
    fontSize: 14,
    color: '#92400e',
    lineHeight: 20,
  },
  arContainer: {
    flex: 1,
    backgroundColor: '#000',
  },
  cameraWrapper: {
    flex: 1,
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  cameraView: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  overlayFill: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'space-between',
  },
  topStatusBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  topControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  cameraSwitchButton: {
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 20,
    padding: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  statusIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#ff4444',
    marginRight: 8,
  },
  statusDotActive: {
    backgroundColor: '#4CAF50',
  },
  statusText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
  },
  stepIndicator: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  centerInstructions: {
    alignItems: 'center',
    paddingHorizontal: 40,
    marginTop: 20,
    marginBottom: 20,
  },
  countdownOverlay: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -50 }, { translateY: -50 }],
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 30,
    paddingVertical: 20,
    borderRadius: 15,
  },
  countdownNumber: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  countdownLabel: {
    fontSize: 16,
    color: 'white',
    marginTop: 8,
    fontWeight: '500',
  },
  countdownStepText: {
    fontSize: 14,
    color: 'white',
    marginTop: 4,
    fontWeight: '400',
  },
  bottomControls: {
    alignItems: 'center',
    paddingBottom: 40,
    paddingTop: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  permissionText: {
    color: 'white',
    fontSize: 18,
    marginBottom: 20,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: '#FF9800',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 10,
  },
  retryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  measurementsContainer: {
    flex: 1,
  },
  measurementsContent: {
    paddingBottom: 20,
  },
  measurementCard: {
    backgroundColor: Colors.background.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 1,
    borderColor: Colors.border.light,
  },
  measurementIcon: {
    fontSize: 24,
    color: Colors.primary,
    marginRight: 16,
    textAlign: 'center',
    lineHeight: 24,
  },
  measurementContent: {
    flex: 1,
  },
  measurementLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text.secondary,
    marginBottom: 8,
  },
  measurementInput: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  measurementValue: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.text.primary,
    marginRight: 8,
  },
  measurementUnit: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.primary,
  },
  confidenceIndicator: {
    marginTop: 8,
  },
  confidenceText: {
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 4,
    color: Colors.text.secondary,
  },
  confidenceBar: {
    height: 4,
    backgroundColor: Colors.success,
    borderRadius: 2,
  },
  visibilityIssuesContainer: {
    backgroundColor: 'rgba(245, 158, 11, 0.9)',
    borderRadius: 12,
    padding: 12,
    marginTop: 16,
    maxWidth: 300,
  },
  // Silhouette Guide Styles
  silhouetteContainer: {
    position: 'absolute',
    top: '35%',
    left: '50%',
    transform: [{ translateX: -150 }, { translateY: -200 }],
    width: 300,
    height: 500,
    alignItems: 'center',
    justifyContent: 'center',
    opacity: 0.3,
  },
  frontSilhouette: {
    width: 300,
    height: 500,
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sideSilhouette: {
    width: 250,
    height: 500,
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Body outline styles
  bodyOutline: {
    width: 120,
    height: 400,
    position: 'relative',
    alignItems: 'center',
  },
  headOutline: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.5)',
    marginBottom: 10,
  },
  torsoOutline: {
    width: 100,
    height: 200,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.4)',
    borderRadius: 10,
    marginBottom: 10,
  },
  legsOutline: {
    width: 80,
    height: 120,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.4)',
    borderRadius: 5,
  },
  // Side body outline styles
  sideBodyOutline: {
    width: 80,
    height: 400,
    position: 'relative',
    alignItems: 'center',
  },
  sideHeadOutline: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.5)',
    marginBottom: 10,
  },
  sideTorsoOutline: {
    width: 60,
    height: 200,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.4)',
    borderRadius: 8,
    marginBottom: 10,
  },
  sideLegsOutline: {
    width: 60,
    height: 120,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.4)',
    borderRadius: 5,
  },
  // Measurement point styles
  measurementPoint: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#4CAF50',
    borderWidth: 2,
    borderColor: 'white',
    shadowColor: '#4CAF50',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
    elevation: 5,
  },
  chestPoint: {
    top: '25%',
    left: '50%',
    transform: [{ translateX: -4 }],
  },
  waistPoint: {
    top: '45%',
    left: '50%',
    transform: [{ translateX: -4 }],
  },
  hipPoint: {
    top: '60%',
    left: '50%',
    transform: [{ translateX: -4 }],
  },
  // Side measurement point styles
  sideMeasurementPoint: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FF9800',
    borderWidth: 2,
    borderColor: 'white',
    shadowColor: '#FF9800',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
    elevation: 5,
  },
  sideChestPoint: {
    top: '25%',
    left: '50%',
    transform: [{ translateX: -4 }],
  },
  sideWaistPoint: {
    top: '45%',
    left: '50%',
    transform: [{ translateX: -4 }],
  },
  sideHipPoint: {
    top: '60%',
    left: '50%',
    transform: [{ translateX: -4 }],
  },
  // Scanning animation styles
  scanningOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  movingScanLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: '#4CAF50',
    shadowColor: '#4CAF50',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
    elevation: 5,
  },
  minimalScanningContainer: {
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 30,
    paddingVertical: 20,
    borderRadius: 15,
  },
  scanningTitle: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  minimalScanningLine: {
    width: 200,
    height: 3,
    backgroundColor: '#4CAF50',
    borderRadius: 2,
  },
  // Scan complete overlay styles
  scanCompleteOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanCompleteContainer: {
    backgroundColor: 'rgba(76, 175, 80, 0.9)',
    paddingHorizontal: 30,
    paddingVertical: 20,
    borderRadius: 15,
    alignItems: 'center',
    maxWidth: 300,
  },
  scanCompleteContainerError: {
    backgroundColor: 'rgba(244, 67, 54, 0.9)',
  },
  scanCompleteIcon: {
    fontSize: 48,
    marginBottom: 10,
  },
  scanCompleteTitle: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  scanCompleteSubtext: {
    color: 'white',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  // Transition overlay styles
  transitionOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  transitionContainer: {
    backgroundColor: 'rgba(33, 150, 243, 0.9)',
    paddingHorizontal: 30,
    paddingVertical: 20,
    borderRadius: 15,
    alignItems: 'center',
    maxWidth: 300,
  },
  transitionIcon: {
    fontSize: 48,
    marginBottom: 10,
  },
  transitionTitle: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  transitionSubtext: {
    color: 'white',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  // Tracking quality indicator styles
  trackingQualityIndicator: {
    marginTop: 16,
    alignItems: 'center',
  },
  trackingQualityText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    textAlign: 'center',
  },
  trackingQualityBar: {
    height: 6,
    borderRadius: 3,
    width: 200,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  // Automatic status container styles
  automaticStatusContainer: {
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 20,
    marginTop: 10,
  },
  automaticStatusText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  // Error overlay styles
  errorOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    backgroundColor: 'rgba(244, 67, 54, 0.9)',
    paddingHorizontal: 30,
    paddingVertical: 20,
    borderRadius: 15,
    alignItems: 'center',
    maxWidth: 300,
  },
  errorIcon: {
    fontSize: 48,
    marginBottom: 10,
  },
  errorTitle: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  errorText: {
    color: 'white',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 16,
  },
  errorRetryButton: {
    backgroundColor: 'white',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  errorRetryButtonText: {
    color: '#F44336',
    fontSize: 16,
    fontWeight: 'bold',
  },
  // Home screen styles
  homeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    backgroundColor: Colors.primary,
  },
  homeBackButton: {
    padding: 10,
    marginRight: 10,
  },
  homeHeaderTitle: {
    flex: 1,
    fontSize: 24,
    fontWeight: '700',
    color: Colors.text.inverse,
    textAlign: 'center',
  },
  homeHeaderSpacer: {
    width: 44, // Same width as back button to center title
  },
  homeContent: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  homeContentContainer: {
    paddingHorizontal: 20,
    paddingTop: 30,
    paddingBottom: 40,
  },
  // Instructions screen styles
  instructionsHeader: {
    backgroundColor: Colors.primary,
    paddingTop: 60,
    paddingBottom: 30,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  instructionsHeaderTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.text.inverse,
    textAlign: 'center',
  },
  instructionsContent: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  instructionsContentContainer: {
    paddingHorizontal: 20,
    paddingTop: 30,
    paddingBottom: 40,
  },
  // AR back button styles
  arBackButtonContainer: {
    position: 'absolute',
    top: 50,
    left: 20,
    zIndex: 1000,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  arBackButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 25,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  arBackButtonText: {
    color: Colors.text.inverse,
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  // Unit toggle styles
  unitToggleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    paddingHorizontal: 20,
  },
  unitToggleLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text.primary,
    marginRight: 16,
  },
  unitToggle: {
    flexDirection: 'row',
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
    padding: 4,
  },
  unitButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    marginHorizontal: 2,
  },
  unitButtonActive: {
    backgroundColor: Colors.primary,
  },
  unitButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text.secondary,
  },
  unitButtonTextActive: {
    color: Colors.text.inverse,
  },
  // Full screen container
  fullScreenContainer: {
    flex: 1,
    backgroundColor: '#000',
  },
  // No measurements styles
  noMeasurementsContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  noMeasurementsIcon: {
    fontSize: 64,
    marginBottom: 20,
    color: '#9CA3AF',
  },
  noMeasurementsTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#374151',
    marginBottom: 12,
    textAlign: 'center',
  },
  noMeasurementsText: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 24,
  },
  // Enhanced UI Styles
  enhancedTopBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 15,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  topBarLeft: {
    flex: 1,
    gap: 8,
  },
  topBarRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  stepIndicatorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  stepIndicatorDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  enhancedCameraSwitchButton: {
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 22,
    padding: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.4)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  enhancedCenterInstructions: {
    alignItems: 'center',
    paddingHorizontal: 20,
    marginTop: 20,
    gap: 16,
  },
  instructionCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
    marginBottom: 16,
  },
  instructionIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(76, 175, 80, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(76, 175, 80, 0.5)',
  },
  instructionIcon: {
    fontSize: 24,
  },
  instructionContent: {
    flex: 1,
  },
  instructionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000000',
    marginBottom: 4,
  },
  instructionText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    lineHeight: 20,
  },
  instructionDescription: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
  },
  enhancedTrackingIndicator: {
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 16,
    padding: 16,
    width: '100%',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  trackingQualityHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  trackingQualityLabel: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    fontWeight: '500',
  },
  trackingQualityValue: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  trackingQualityBarContainer: {
    height: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  enhancedVisibilityIssues: {
    backgroundColor: 'rgba(245, 158, 11, 0.9)',
    borderRadius: 16,
    padding: 16,
    width: '100%',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
  },
  visibilityIssuesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  visibilityIssuesIcon: {
    fontSize: 16,
  },
  visibilityIssuesTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#92400e',
  },
  visibilityIssueText: {
    color: '#92400e',
    fontSize: 12,
    marginBottom: 4,
  },
  enhancedCountdownOverlay: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -100 }, { translateY: -80 }],
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    paddingHorizontal: 30,
    paddingVertical: 25,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: 'rgba(76, 175, 80, 0.5)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 8,
  },
  countdownContainer: {
    alignItems: 'center',
    gap: 8,
  },
  countdownCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(76, 175, 80, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#4CAF50',
  },
  countdownProgressBar: {
    width: 200,
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 2,
    overflow: 'hidden',
    marginTop: 8,
  },
  countdownProgress: {
    height: '100%',
    backgroundColor: '#4CAF50',
    borderRadius: 2,
  },
  // Simplified UI Styles
  minimalTopBar: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  simpleInstructionsTop: {
    position: 'absolute',
    top: 60,
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  simpleInstructionText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  simpleCountdownOverlay: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -30 }, { translateY: -30 }],
    alignItems: 'center',
    justifyContent: 'center',
  },
  simpleCountdownNumber: {
    fontSize: 120,
    fontWeight: 'bold',
    color: 'white',
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 4,
  },
  // Camera Selection Styles
  cameraSelectionContainer: {
    marginBottom: 20,
    paddingHorizontal: 20,
  },
  cameraSelectionLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 12,
  },
  cameraSelectionButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  cameraSelectionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: Colors.primary,
    backgroundColor: 'white',
    gap: 8,
  },
  cameraSelectionButtonActive: {
    backgroundColor: Colors.primary,
  },
  cameraSelectionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.primary,
  },
  cameraSelectionButtonTextActive: {
    color: 'white',
  },
  // Compact Header Styles
  compactHeader: {
    backgroundColor: Colors.primary,
    paddingTop: 40,
    paddingBottom: 15,
    paddingHorizontal: 20,
    alignItems: 'center',
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  compactHeaderTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text.inverse,
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  // Large Measurement Card Styles
  largeMeasurementCard: {
    backgroundColor: Colors.background.card,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
    borderWidth: 1,
    borderColor: Colors.border.light,
    minHeight: 100,
  },
  largeMeasurementIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  largeMeasurementIconText: {
    fontSize: 28,
  },
  largeMeasurementContent: {
    flex: 1,
  },
  largeMeasurementLabel: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text.secondary,
    marginBottom: 8,
  },
  largeMeasurementValueContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  largeMeasurementValue: {
    fontSize: 32,
    fontWeight: '700',
    color: Colors.text.primary,
    marginRight: 8,
  },
  largeMeasurementInput: {
    fontSize: 32,
    fontWeight: '700',
    color: Colors.text.primary,
    marginRight: 8,
    borderWidth: 1,
    borderColor: Colors.border.light,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: Colors.background.card,
    minWidth: 100,
    textAlign: 'center',
  },
  largeMeasurementUnit: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.primary,
  },
});