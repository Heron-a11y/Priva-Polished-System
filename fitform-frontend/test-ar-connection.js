/**
 * Test AR Connection Script
 * This script tests the ARSessionManager connection and ARCore functionality
 */

import { NativeModules, Platform } from 'react-native';

console.log('🧪 Testing AR Connection...');
console.log('Platform:', Platform.OS);
console.log('Available native modules:', Object.keys(NativeModules));

// Test ARSessionManager connection
const ARSessionManager = NativeModules.ARSessionManager;

if (ARSessionManager) {
  console.log('✅ ARSessionManager native module found');
  
  // Test AR support
  ARSessionManager.isARSupported()
    .then((isSupported) => {
      console.log('AR Support:', isSupported);
      
      if (isSupported) {
        // Test AR body tracking support
        return ARSessionManager.isARBodyTrackingSupported();
      }
      return { supported: false, reason: 'AR not supported' };
    })
    .then((bodyTrackingResult) => {
      console.log('AR Body Tracking Support:', bodyTrackingResult);
      
      if (bodyTrackingResult.supported) {
        console.log('✅ ARCore body tracking is supported on this device');
        
        // Test starting AR session
        return ARSessionManager.startSession();
      } else {
        console.log('❌ ARCore body tracking not supported:', bodyTrackingResult.reason);
        return false;
      }
    })
    .then((sessionStarted) => {
      console.log('AR Session Started:', sessionStarted);
      
      if (sessionStarted) {
        console.log('✅ AR session started successfully');
        
        // Test getting measurements
        return ARSessionManager.getMeasurements();
      } else {
        console.log('❌ Failed to start AR session');
        return null;
      }
    })
    .then((measurements) => {
      if (measurements) {
        console.log('AR Measurements:', measurements);
        if (measurements.valid) {
          console.log('✅ AR body detection working!');
          console.log('Shoulder Width:', measurements.shoulderWidthCm, 'cm');
          console.log('Height:', measurements.heightCm, 'cm');
          console.log('Confidence:', measurements.confidence);
        } else {
          console.log('❌ AR body detection not working:', measurements.reason);
        }
      }
    })
    .catch((error) => {
      console.error('❌ AR Connection Test Failed:', error);
    });
} else {
  console.log('❌ ARSessionManager native module not found');
  console.log('This means the native module is not properly connected');
  console.log('Available modules:', Object.keys(NativeModules));
}

export default function testARConnection() {
  console.log('🧪 AR Connection Test Complete');
}
