declare module 'react-native' {
  import React from 'react';
  
  export interface ViewProps {
    style?: any;
    children?: React.ReactNode;
    [key: string]: any;
  }
  
  export interface TextProps {
    style?: any;
    children?: React.ReactNode;
    [key: string]: any;
  }
  
  export interface TouchableOpacityProps {
    style?: any;
    onPress?: () => void;
    children?: React.ReactNode;
    [key: string]: any;
  }
  
  export interface ScrollViewProps {
    style?: any;
    children?: React.ReactNode;
    [key: string]: any;
  }
  
  export interface AlertStatic {
    alert: (title: string, message?: string, buttons?: any[], options?: any) => void;
  }
  
  export interface PlatformStatic {
    OS: 'ios' | 'android' | 'web' | 'windows' | 'macos';
    select: (specifics: any) => any;
    Version: string | number;
  }
  
  export interface AppStateStatic {
    currentState: string;
    addEventListener: (event: string, listener: (state: string) => void) => any;
    removeEventListener: (event: string, listener: any) => void;
  }
  
  export interface DimensionsStatic {
    get: (dimension: string) => { width: number; height: number };
  }
  
  export interface StyleSheetStatic {
    create: (styles: any) => any;
  }
  
  export interface AnimatedStatic {
    View: React.ComponentType<any>;
    Text: React.ComponentType<any>;
    Value: new (value: number) => any;
    timing: (value: any, config: any) => any;
    sequence: (animations: any[]) => any;
  }
  
  export interface NativeModulesStatic {
    [key: string]: any;
  }
  
  export interface NativeEventEmitterStatic {
    new (nativeModule: any): {
      addListener: (eventType: string, listener: (event: any) => void) => any;
      removeListener: (eventType: string, listener: any) => void;
      removeAllListeners: (eventType: string) => void;
    };
  }
  
  export const View: React.ComponentType<ViewProps>;
  export const Text: React.ComponentType<TextProps>;
  export const TouchableOpacity: React.ComponentType<TouchableOpacityProps>;
  export const ScrollView: React.ComponentType<ScrollViewProps>;
  export const Alert: AlertStatic;
  export const Platform: PlatformStatic;
  export const AppState: AppStateStatic;
  export const Dimensions: DimensionsStatic;
  export const StyleSheet: StyleSheetStatic;
  export const Animated: AnimatedStatic;
  export const NativeModules: NativeModulesStatic;
  export const NativeEventEmitter: NativeEventEmitterStatic;
  
  // Camera components
  export interface CameraViewProps {
    style?: any;
    facing?: 'front' | 'back';
    ref?: (ref: any) => void;
    onCameraReady?: () => void;
    onMountError?: (error: any) => void;
  }
  
  export const CameraView: React.ComponentType<CameraViewProps>;
  
  export default {
    View,
    Text,
    TouchableOpacity,
    ScrollView,
    Alert,
    Platform,
    AppState,
    Dimensions,
    StyleSheet,
    Animated,
    NativeModules,
    NativeEventEmitter
  };
}