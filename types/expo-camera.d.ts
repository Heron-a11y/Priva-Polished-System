declare module 'expo-camera' {
  import React from 'react';
  
  export interface CameraViewProps {
    style?: any;
    facing?: 'front' | 'back';
    ref?: (ref: any) => void;
    onCameraReady?: () => void;
    onMountError?: (error: any) => void;
  }
  
  export const CameraView: React.ComponentType<CameraViewProps>;
  export const useCameraPermissions: () => [{ granted: boolean }, () => Promise<boolean>];
  export type CameraType = 'front' | 'back';
}
