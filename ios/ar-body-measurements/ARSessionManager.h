//
//  ARSessionManager.h
//  ar-body-measurements
//
//  Created by Enhanced iOS AR Session Manager
//  Copyright © 2024 AR Body Measurements. All rights reserved.
//

#import <React/RCTBridgeModule.h>
#import <React/RCTEventEmitter.h>
#import <ARKit/ARKit.h>
#import <CoreMotion/CoreMotion.h>
#import <Vision/Vision.h>
#import <MetalPerformanceShaders/MetalPerformanceShaders.h>
#import <CoreML/CoreML.h>
#import <AVFoundation/AVFoundation.h>

@interface ARSessionManager : NSObject <RCTBridgeModule, ARSessionDelegate>

// ✅ ENHANCED: iOS-specific AR capabilities
@property (nonatomic, strong) ARSession *arSession;
@property (nonatomic, strong) ARBodyTrackingConfiguration *bodyTrackingConfig;
@property (nonatomic, strong) ARWorldTrackingConfiguration *worldTrackingConfig;
@property (nonatomic, strong) CMMotionManager *motionManager;
@property (nonatomic, strong) VNRequest *visionRequest;
@property (nonatomic, strong) MPSImageProcessor *metalProcessor;
@property (nonatomic, strong) MLModel *coreMLModel;

// ✅ ENHANCED: iOS performance optimization
@property (nonatomic, assign) BOOL isHighPerformanceMode;
@property (nonatomic, assign) BOOL isMetalAccelerationEnabled;
@property (nonatomic, assign) BOOL isCoreMLEnabled;
@property (nonatomic, assign) NSInteger targetFrameRate;
@property (nonatomic, assign) NSInteger maxProcessingThreads;

// ✅ ENHANCED: iOS device capabilities
@property (nonatomic, strong) NSString *deviceModel;
@property (nonatomic, assign) BOOL hasNeuralEngine;
@property (nonatomic, assign) BOOL hasMetalPerformanceShaders;
@property (nonatomic, assign) NSInteger availableMemory;
@property (nonatomic, assign) NSInteger thermalState;

// ✅ ENHANCED: iOS-specific measurement accuracy
@property (nonatomic, assign) double measurementAccuracy;
@property (nonatomic, assign) double confidenceThreshold;
@property (nonatomic, assign) NSInteger validationFrames;
@property (nonatomic, assign) BOOL enableTemporalSmoothing;
@property (nonatomic, assign) BOOL enableOutlierDetection;

// ✅ ENHANCED: iOS deployment readiness
@property (nonatomic, assign) BOOL isDeploymentReady;
@property (nonatomic, strong) NSDictionary *deploymentConfig;
@property (nonatomic, strong) NSArray *supportedDevices;
@property (nonatomic, strong) NSArray *requiredCapabilities;

@end

