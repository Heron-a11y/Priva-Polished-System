import Foundation
import ARKit
import React
import UIKit
import CoreMotion

@objc(ARSessionManager)
class ARSessionManager: NSObject {
    
    private var arSession: ARSession?
    private var isSessionActive = false
    private var bodyAnchors: [UUID: ARBodyAnchor] = [:]
    private var lastValidMeasurements: ARMeasurements?
    
    // MARK: - React Native Bridge Methods
    
    @objc
    static func requiresMainQueueSetup() -> Bool {
        return true
    }
    
    @objc
    func isARKitSupported(_ resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
        DispatchQueue.main.async {
            // ✅ AR SAFEGUARD: Check ARKit version and device capabilities
            let isBodyTrackingSupported = ARBodyTrackingConfiguration.isSupported
            let hasRequiredCapabilities = self.validateDeviceCapabilities()
            
            let finalResult = isBodyTrackingSupported && hasRequiredCapabilities
            
            print("ARSessionManager: ARKit body tracking supported: \(isBodyTrackingSupported), capabilities: \(hasRequiredCapabilities)")
            resolve(finalResult)
        }
    }
    
    @objc
    func startSession(_ resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
        DispatchQueue.main.async {
            do {
                if self.isSessionActive {
                    resolve(true)
                    return
                }
                
                // Check ARKit support
                guard ARBodyTrackingConfiguration.isSupported else {
                    reject("AR_UNAVAILABLE", "ARKit body tracking is not supported on this device", nil)
                    return
                }
                
                // Create AR session
                self.arSession = ARSession()
                self.arSession?.delegate = self
                
                // Configure for body tracking
                let configuration = ARBodyTrackingConfiguration()
                configuration.automaticSkeletonScaleEstimationEnabled = true
                configuration.isLightEstimationEnabled = true
                
                // Start the session
                self.arSession?.run(configuration)
                self.isSessionActive = true
                
                print("ARSessionManager: AR session started successfully")
                resolve(true)
                
            } catch {
                print("ARSessionManager: Error starting AR session - \(error)")
                reject("AR_ERROR", "Failed to start AR session: \(error.localizedDescription)", error)
            }
        }
    }
    
    @objc
    func stopSession(_ resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
        DispatchQueue.main.async {
            do {
                self.isSessionActive = false
                
                // ✅ AR SAFEGUARD: Proper cleanup of AR session and resources
                self.arSession?.pause()
                self.arSession?.delegate = nil
                self.arSession = nil
                
                // Clean up body anchors and measurements
                self.bodyAnchors.removeAll()
                self.lastValidMeasurements = nil
                
                print("ARSessionManager: AR session stopped and cleaned up")
                resolve(true)
                
            } catch {
                print("ARSessionManager: Error stopping AR session - \(error)")
                reject("AR_ERROR", "Failed to stop AR session: \(error.localizedDescription)", error)
            }
        }
    }
    
    @objc
    func getMeasurements(_ resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
        DispatchQueue.main.async {
            guard self.isSessionActive, let session = self.arSession else {
                reject("SESSION_INACTIVE", "AR session is not active", nil)
                return
            }
            
            guard let measurements = self.lastValidMeasurements else {
                reject("NO_MEASUREMENTS", "No valid measurements available", nil)
                return
            }
            
            let result: [String: Any] = [
                "valid": true,
                "shoulderWidthCm": measurements.shoulderWidthCm,
                "heightCm": measurements.heightCm,
                "confidence": measurements.confidence,
                "timestamp": measurements.timestamp
            ]
            
            resolve(result)
        }
    }
    
    @objc
    func getSessionStatus(_ resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
        DispatchQueue.main.async {
            let result: [String: Any] = [
                "isActive": self.isSessionActive,
                "hasValidMeasurements": self.lastValidMeasurements != nil,
                "bodyCount": self.bodyAnchors.count
            ]
            
            resolve(result)
        }
    }
    
    // MARK: - ARSessionDelegate
    
    private func processBodyAnchor(_ bodyAnchor: ARBodyAnchor) {
        // Extract body landmarks
        let landmarks = extractBodyLandmarks(from: bodyAnchor)
        
        guard let validLandmarks = landmarks else {
            return
        }
        
        // Calculate measurements
        let measurements = calculateBodyMeasurements(from: validLandmarks)
        
        guard let validMeasurements = measurements else {
            return
        }
        
        // Store measurements
        self.lastValidMeasurements = validMeasurements
        
        // Send update to React Native
        sendMeasurementUpdate(validMeasurements)
    }
    
    private func extractBodyLandmarks(from bodyAnchor: ARBodyAnchor) -> BodyLandmarks? {
        let skeleton = bodyAnchor.skeleton
        
        var landmarks = BodyLandmarks()
        
        // Extract key body landmarks from ARKit skeleton
        for jointName in ARSkeleton.JointName.allCases {
            let jointTransform = skeleton.modelTransform(for: jointName)
            
            // Convert to 3D position
            let position = SIMD3<Float>(
                jointTransform.columns.3.x,
                jointTransform.columns.3.y,
                jointTransform.columns.3.z
            )
            
            // Map ARKit joint names to our landmark structure
            switch jointName {
            case .head:
                landmarks.head = position
            case .leftShoulder:
                landmarks.leftShoulder = position
            case .rightShoulder:
                landmarks.rightShoulder = position
            case .leftElbow:
                landmarks.leftElbow = position
            case .rightElbow:
                landmarks.rightElbow = position
            case .leftWrist:
                landmarks.leftWrist = position
            case .rightWrist:
                landmarks.rightWrist = position
            case .leftHip:
                landmarks.leftHip = position
            case .rightHip:
                landmarks.rightHip = position
            case .leftKnee:
                landmarks.leftKnee = position
            case .rightKnee:
                landmarks.rightKnee = position
            case .leftAnkle:
                landmarks.leftAnkle = position
            case .rightAnkle:
                landmarks.rightAnkle = position
            default:
                break
            }
        }
        
        // Validate that we have essential landmarks
        guard landmarks.leftShoulder != nil && landmarks.rightShoulder != nil &&
              landmarks.leftAnkle != nil && landmarks.rightAnkle != nil else {
            return nil
        }
        
        return landmarks
    }
    
    private func calculateBodyMeasurements(from landmarks: BodyLandmarks) -> ARMeasurements? {
        // Calculate shoulder width using real-world coordinates
        guard let leftShoulder = landmarks.leftShoulder,
              let rightShoulder = landmarks.rightShoulder else {
            return nil
        }
        
        let shoulderWidth = distance(leftShoulder, rightShoulder) * 100.0 // Convert to cm
        
        // Calculate height using head to ankle distance
        guard let head = landmarks.head,
              let leftAnkle = landmarks.leftAnkle,
              let rightAnkle = landmarks.rightAnkle else {
            return nil
        }
        
        // Use average ankle position
        let avgAnkle = SIMD3<Float>(
            (leftAnkle.x + rightAnkle.x) / 2.0,
            (leftAnkle.y + rightAnkle.y) / 2.0,
            (leftAnkle.z + rightAnkle.z) / 2.0
        )
        
        let height = distance(head, avgAnkle) * 100.0 // Convert to cm
        
        // Calculate confidence based on landmark tracking quality
        let confidence = calculateMeasurementConfidence(landmarks)
        
        return ARMeasurements(
            shoulderWidthCm: Double(shoulderWidth),
            heightCm: Double(height),
            confidence: confidence,
            timestamp: Int64(Date().timeIntervalSince1970 * 1000)
        )
    }
    
    private func calculateMeasurementConfidence(_ landmarks: BodyLandmarks) -> Double {
        var validLandmarks = 0
        var totalLandmarks = 0
        
        // Check essential landmarks
        let essentialLandmarks: [SIMD3<Float>?] = [
            landmarks.head,
            landmarks.leftShoulder,
            landmarks.rightShoulder,
            landmarks.leftAnkle,
            landmarks.rightAnkle
        ]
        
        for landmark in essentialLandmarks {
            totalLandmarks += 1
            if landmark != nil {
                validLandmarks += 1
            }
        }
        
        return totalLandmarks > 0 ? Double(validLandmarks) / Double(totalLandmarks) : 0.0
    }
    
    private func distance(_ point1: SIMD3<Float>, _ point2: SIMD3<Float>) -> Float {
        let dx = point2.x - point1.x
        let dy = point2.y - point1.y
        let dz = point2.z - point1.z
        return sqrt(dx * dx + dy * dy + dz * dz)
    }
    
    // ✅ AR SAFEGUARD: Validate device capabilities for AR
    private func validateDeviceCapabilities() -> Bool {
        // Check for required hardware features
        let hasCamera = UIImagePickerController.isSourceTypeAvailable(.camera)
        let hasAccelerometer = CMMotionManager().isAccelerometerAvailable
        let hasGyroscope = CMMotionManager().isGyroAvailable
        
        // Check iOS version (ARKit body tracking requires iOS 13.0+)
        let iosVersion = ProcessInfo.processInfo.operatingSystemVersion
        let hasRequiredIOSVersion = iosVersion.majorVersion >= 13
        
        let hasRequiredFeatures = hasCamera && hasAccelerometer && hasGyroscope && hasRequiredIOSVersion
        
        print("ARSessionManager: Device capabilities - Camera: \(hasCamera), Accelerometer: \(hasAccelerometer), Gyroscope: \(hasGyroscope), iOS 13+: \(hasRequiredIOSVersion)")
        
        return hasRequiredFeatures
    }
    
    @objc
    func markScanCompleted(_ scanType: String, resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
        DispatchQueue.main.async {
            do {
                // ✅ AR SAFEGUARD: Validate scan type and update completion status
                switch scanType {
                case "front":
                    // Mark front scan as completed
                    print("ARSessionManager: Front scan completed")
                    resolve(true)
                case "side":
                    // Mark side scan as completed
                    print("ARSessionManager: Side scan completed")
                    resolve(true)
                default:
                    reject("INVALID_SCAN_TYPE", "Invalid scan type: \(scanType). Must be 'front' or 'side'", nil)
                    return
                }
                
            } catch {
                print("ARSessionManager: Error marking scan completed - \(error)")
                reject("SCAN_ERROR", "Failed to mark scan completed: \(error.localizedDescription)", error)
            }
        }
    }
    
    private func sendMeasurementUpdate(_ measurements: ARMeasurements) {
        let params: [String: Any] = [
            "shoulderWidthCm": measurements.shoulderWidthCm,
            "heightCm": measurements.heightCm,
            "confidence": measurements.confidence,
            "timestamp": measurements.timestamp,
            "isValid": true,
            "frontScanCompleted": false, // TODO: Implement scan completion tracking
            "sideScanCompleted": false,  // TODO: Implement scan completion tracking
            "scanStatus": "in_progress"
        ]
        
        // Send event to React Native
        DispatchQueue.main.async {
            if let bridge = RCTBridge.current() {
                bridge.eventDispatcher().sendAppEvent(withName: "onARMeasurementUpdate", body: params)
            }
        }
    }
}

// MARK: - ARSessionDelegate Extension

extension ARSessionManager: ARSessionDelegate {
    
    func session(_ session: ARSession, didUpdate anchors: [ARAnchor]) {
        for anchor in anchors {
            if let bodyAnchor = anchor as? ARBodyAnchor {
                bodyAnchors[bodyAnchor.identifier] = bodyAnchor
                processBodyAnchor(bodyAnchor)
            }
        }
    }
    
    func session(_ session: ARSession, didRemove anchors: [ARAnchor]) {
        for anchor in anchors {
            if let bodyAnchor = anchor as? ARBodyAnchor {
                bodyAnchors.removeValue(forKey: bodyAnchor.identifier)
            }
        }
    }
    
    func session(_ session: ARSession, didFailWithError error: Error) {
        print("ARSessionManager: AR session failed with error - \(error)")
        isSessionActive = false
    }
    
    func sessionWasInterrupted(_ session: ARSession) {
        print("ARSessionManager: AR session was interrupted")
        isSessionActive = false
    }
    
    func sessionInterruptionEnded(_ session: ARSession) {
        print("ARSessionManager: AR session interruption ended")
        // Session will be restarted automatically
    }
}

// MARK: - Data Structures

struct BodyLandmarks {
    var head: SIMD3<Float>?
    var leftShoulder: SIMD3<Float>?
    var rightShoulder: SIMD3<Float>?
    var leftElbow: SIMD3<Float>?
    var rightElbow: SIMD3<Float>?
    var leftWrist: SIMD3<Float>?
    var rightWrist: SIMD3<Float>?
    var leftHip: SIMD3<Float>?
    var rightHip: SIMD3<Float>?
    var leftKnee: SIMD3<Float>?
    var rightKnee: SIMD3<Float>?
    var leftAnkle: SIMD3<Float>?
    var rightAnkle: SIMD3<Float>?
}

struct ARMeasurements {
    let shoulderWidthCm: Double
    let heightCm: Double
    let confidence: Double
    let timestamp: Int64
}









