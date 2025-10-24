
// ✅ CRITICAL FIX: Startup Safety Wrapper
// This prevents crashes during app initialization

import { Platform } from 'react-native';

export class StartupSafetyWrapper {
  private static instance: StartupSafetyWrapper;
  private isInitialized = false;
  private initializationPromise: Promise<boolean> | null = null;
  
  static getInstance(): StartupSafetyWrapper {
    if (!StartupSafetyWrapper.instance) {
      StartupSafetyWrapper.instance = new StartupSafetyWrapper();
    }
    return StartupSafetyWrapper.instance;
  }
  
  async safeInitialize<T>(
    moduleName: string,
    initFunction: () => Promise<T>,
    fallback?: T
  ): Promise<T | null> {
    try {
      if (!this.isInitialized) {
        if (!this.initializationPromise) {
          this.initializationPromise = this.initializeApp();
        }
        await this.initializationPromise;
      }
      
      return await initFunction();
    } catch (error) {
      console.error(`StartupSafetyWrapper: Failed to initialize ${moduleName}:`, error);
      return fallback || null;
    }
  }
  
  private async initializeApp(): Promise<boolean> {
    try {
      // Wait for React Native to be fully loaded
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Platform-specific initialization
      if (Platform.OS === 'android') {
        await this.initializeAndroid();
      } else if (Platform.OS === 'ios') {
        await this.initializeiOS();
      }
      
      this.isInitialized = true;
      return true;
    } catch (error) {
      console.error('StartupSafetyWrapper: App initialization failed:', error);
      return false;
    }
  }
  
  private async initializeAndroid(): Promise<void> {
    // Android-specific initialization
    console.log('StartupSafetyWrapper: Initializing Android...');
  }
  
  private async initializeiOS(): Promise<void> {
    // iOS-specific initialization
    console.log('StartupSafetyWrapper: Initializing iOS...');
  }
}

export const startupSafety = StartupSafetyWrapper.getInstance();
