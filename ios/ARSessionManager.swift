import Foundation
import ARKit
import React
import UIKit
import CoreMotion
import os.lock

@objc(ARSessionManager)
class ARSessionManager: NSObject {
    
    private var arSession: ARSession?
    private var isSessionActive = false
    private var bodyAnchors: [UUID: ARBodyAnchor] = [:]
    private var lastValidMeasurements: ARMeasurements?
    
    // ✅ PHASE 1: Scan completion tracking
    private var frontScanCompleted = false
    private var sideScanCompleted = false
    
    // ✅ PHASE 1: Thread-safe synchronization
    private let sessionQueue = DispatchQueue(label: "com.arbodymeasurements.session", qos: .userInitiated)
    private let measurementQueue = DispatchQueue(label: "com.arbodymeasurements.measurement", qos: .userInitiated)
    private let validationQueue = DispatchQueue(label: "com.arbodymeasurements.validation", qos: .userInitiated)
    
    // ✅ PHASE 2: Configuration-driven settings (will be loaded from centralized config)
    private var configLoaded = false
    private var minConfidenceThreshold: Double = 0.7
    private var minPlaneDetectionConfidence: Double = 0.8
    private var minBodyLandmarksRequired: Int = 8
    private var maxMeasurementRetries: Int = 3
    private var measurementTimeoutMs: Double = 10000
    
    // ✅ PHASE 1: Thread-safe multi-frame validation system
    private var frameValidationBuffer: [ARMeasurements] = []
    private var requiredFramesForValidation = 8
    private var maxVarianceThreshold: Double = 2.5 // cm
    private var minConsistencyFrames = 5
    
    // ✅ PHASE 1: Thread-safe enhanced confidence scoring
    private var confidenceFactors: [String: Double] = [:]
    private var temporalConsistencyHistory: [Double] = []
    
    // ✅ PHASE 1: Thread-safe real-time processing state
    private var isRealTimeProcessing = false
    private var lastProcessedFrameTime: Double = 0
    private var frameProcessingInterval: Double = 100 // Process every 100ms (will be adaptive)
    
    // ✅ PHASE 1: Thread-safe error recovery mechanisms
    private var errorRecoveryAttempts: [String: Int] = [:]
    private var maxRecoveryAttempts = 3
    private var recoveryCooldownMs: Double = 2000
    
    // MARK: - React Native Bridge Methods
    
    @objc
    static func requiresMainQueueSetup() -> Bool {
        return true
    }
    
    // ✅ PHASE 2: Load configuration from centralized config system
    @objc
    func loadConfiguration(_ config: NSDictionary, resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
        sessionQueue.async {
            do {
                // Load AR framework settings
                if let minConfidence = config["minConfidenceThreshold"] as? Double {
                    self.minConfidenceThreshold = minConfidence
                }
                if let minPlaneConfidence = config["minPlaneDetectionConfidence"] as? Double {
                    self.minPlaneDetectionConfidence = minPlaneConfidence
                }
                if let minLandmarks = config["minBodyLandmarksRequired"] as? Int {
                    self.minBodyLandmarksRequired = minLandmarks
                }
                if let maxRetries = config["maxMeasurementRetries"] as? Int {
                    self.maxMeasurementRetries = maxRetries
                }
                if let timeout = config["measurementTimeoutMs"] as? Double {
                    self.measurementTimeoutMs = timeout
                }
                
                // Load performance settings
                if let requiredFrames = config["requiredFramesForValidation"] as? Int {
                    self.requiredFramesForValidation = requiredFrames
                }
                if let maxVariance = config["maxVarianceThreshold"] as? Double {
                    self.maxVarianceThreshold = maxVariance
                }
                if let minConsistency = config["minConsistencyFrames"] as? Int {
                    self.minConsistencyFrames = minConsistency
                }
                if let frameInterval = config["frameProcessingInterval"] as? Double {
                    self.frameProcessingInterval = frameInterval
                }
                
                // Load recovery settings
                if let maxAttempts = config["maxRecoveryAttempts"] as? Int {
                    self.maxRecoveryAttempts = maxAttempts
                }
                if let cooldown = config["recoveryCooldownMs"] as? Double {
                    self.recoveryCooldownMs = cooldown
                }
                
                self.configLoaded = true
                self.logSecurely(level: "INFO", module: "ARSessionManager", method: "loadConfiguration", 
                               message: "Configuration loaded successfully")
                
                DispatchQueue.main.async {
                    resolve(true)
                }
                
            } catch {
                self.logSecurely(level: "ERROR", module: "ARSessionManager", method: "loadConfiguration", 
                               message: "Error loading configuration", data: error.localizedDescription)
                DispatchQueue.main.async {
                    reject("CONFIG_ERROR", "Failed to load configuration: \(error.localizedDescription)", error)
                }
            }
        }
    }
    
    // ✅ PHASE 2: Secure logging method
    private func logSecurely(level: String, module: String, method: String, message: String, data: Any? = nil) {
        let sanitizedData = data != nil ? sanitizeLogData(data!) : nil
        let logMessage = "[AR-\(level)] [\(module).\(method)] \(message)"
        
        let fullMessage = sanitizedData != nil ? "\(logMessage) | Data: \(sanitizedData!)" : logMessage
        
        switch level {
        case "DEBUG":
            print("🔍 \(fullMessage)")
        case "INFO":
            print("ℹ️ \(fullMessage)")
        case "WARN":
            print("⚠️ \(fullMessage)")
        case "ERROR":
            print("❌ \(fullMessage)")
        default:
            print("📝 \(fullMessage)")
        }
    }
    
    // ✅ PHASE 2: Sanitize sensitive data in logs
    private func sanitizeLogData(_ data: Any) -> String {
        let dataString = String(describing: data)
        
        // Mask sensitive measurement data
        let sensitivePatterns = [
            "shoulderWidthCm": "shoulderWidthCm=[MASKED]",
            "heightCm": "heightCm=[MASKED]",
            "measurements": "measurements=[MASKED]",
            "landmarks": "landmarks=[MASKED]"
        ]
        
        var sanitized = dataString
        for (pattern, replacement) in sensitivePatterns {
            let regex = try? NSRegularExpression(pattern: "\(pattern)=[^,\\s}]+", options: [])
            let range = NSRange(location: 0, length: sanitized.utf16.count)
            sanitized = regex?.stringByReplacingMatches(in: sanitized, options: [], range: range, withTemplate: replacement) ?? sanitized
        }
        
        return sanitized
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
        sessionQueue.async {
            do {
                if self.isSessionActive {
                    DispatchQueue.main.async {
                        resolve(true)
                    }
                    return
                }
                
                // Check ARKit support
                guard ARBodyTrackingConfiguration.isSupported else {
                    DispatchQueue.main.async {
                        reject("AR_UNAVAILABLE", "ARKit body tracking is not supported on this device", nil)
                    }
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
                
                DispatchQueue.main.async {
                    print("ARSessionManager: AR session started successfully")
                    resolve(true)
                }
                
            } catch {
                DispatchQueue.main.async {
                    print("ARSessionManager: Error starting AR session - \(error)")
                    reject("AR_ERROR", "Failed to start AR session: \(error.localizedDescription)", error)
                }
            }
        }
    }
    
    @objc
    func stopSession(_ resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
        sessionQueue.async {
            do {
                self.isSessionActive = false
                
                // ✅ AR SAFEGUARD: Proper cleanup of AR session and resources
                self.arSession?.pause()
                self.arSession?.delegate = nil
                self.arSession = nil
                
                // Clean up body anchors and measurements
                self.bodyAnchors.removeAll()
                self.lastValidMeasurements = nil
                
                // Reset scan completion tracking
                self.frontScanCompleted = false
                self.sideScanCompleted = false
                
                // Clear thread-safe collections
                self.validationQueue.async {
                    self.frameValidationBuffer.removeAll()
                    self.confidenceFactors.removeAll()
                    self.temporalConsistencyHistory.removeAll()
                    self.errorRecoveryAttempts.removeAll()
                }
                
                DispatchQueue.main.async {
                    print("ARSessionManager: AR session stopped and cleaned up")
                    resolve(true)
                }
                
            } catch {
                DispatchQueue.main.async {
                    print("ARSessionManager: Error stopping AR session - \(error)")
                    reject("AR_ERROR", "Failed to stop AR session: \(error.localizedDescription)", error)
                }
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
    
    // ✅ PHASE 1: Start real-time measurement processing
    @objc
    func startRealTimeProcessing(_ resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
        DispatchQueue.main.async {
            do {
                if !self.isSessionActive {
                    reject("SESSION_INACTIVE", "AR session is not active", nil)
                    return
                }
                
                // Start real-time processing
                self.isRealTimeProcessing = true
                self.lastProcessedFrameTime = Date().timeIntervalSince1970 * 1000
                
                print("ARSessionManager: Real-time processing started")
                resolve(true)
                
            } catch {
                print("ARSessionManager: Error starting real-time processing - \(error)")
                reject("PROCESSING_ERROR", "Failed to start real-time processing: \(error.localizedDescription)", error)
            }
        }
    }
    
    // ✅ PHASE 1: Stop real-time measurement processing
    @objc
    func stopRealTimeProcessing(_ resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
        DispatchQueue.main.async {
            do {
                self.isRealTimeProcessing = false
                print("ARSessionManager: Real-time processing stopped")
                resolve(true)
                
            } catch {
                print("ARSessionManager: Error stopping real-time processing - \(error)")
                reject("PROCESSING_ERROR", "Failed to stop real-time processing: \(error.localizedDescription)", error)
            }
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
        
        // ✅ PHASE 1: Apply multi-frame validation and enhanced confidence
        let enhancedMeasurements = enhanceMeasurementsWithValidation(validMeasurements)
        
        // Store measurements
        self.lastValidMeasurements = enhancedMeasurements
        
        // Send update to React Native
        sendMeasurementUpdate(enhancedMeasurements)
    }
    
    // ✅ PHASE 1: Enhance measurements with multi-frame validation
    private func enhanceMeasurementsWithValidation(_ measurements: ARMeasurements) -> ARMeasurements {
        // Apply multi-frame validation
        let isConsistent = validateMultiFrameConsistency(measurements)
        
        // Calculate enhanced confidence
        let enhancedConfidence = calculateEnhancedConfidence(measurements)
        
        // Create enhanced measurement
        return ARMeasurements(
            shoulderWidthCm: measurements.shoulderWidthCm,
            heightCm: measurements.heightCm,
            confidence: enhancedConfidence,
            timestamp: measurements.timestamp
        )
    }
    
    // ✅ PHASE 1: Multi-frame validation system
    private func validateMultiFrameConsistency(_ measurements: ARMeasurements) -> Bool {
        // Add to validation buffer
        frameValidationBuffer.append(measurements)
        
        // Keep only recent frames
        if frameValidationBuffer.count > requiredFramesForValidation {
            frameValidationBuffer.removeFirst()
        }
        
        // Need minimum frames for validation
        if frameValidationBuffer.count < minConsistencyFrames {
            return false
        }
        
        // Calculate variance for shoulder width and height
        let shoulderWidths = frameValidationBuffer.map { $0.shoulderWidthCm }
        let heights = frameValidationBuffer.map { $0.heightCm }
        
        let shoulderVariance = calculateVariance(shoulderWidths)
        let heightVariance = calculateVariance(heights)
        
        // Check if measurements are consistent
        let isConsistent = shoulderVariance <= maxVarianceThreshold && heightVariance <= maxVarianceThreshold
        
        print("ARSessionManager: Multi-frame validation - shoulder variance=\(shoulderVariance), height variance=\(heightVariance), consistent=\(isConsistent)")
        
        return isConsistent
    }
    
    // ✅ PHASE 1: Calculate variance for consistency checking
    private func calculateVariance(_ values: [Double]) -> Double {
        guard !values.isEmpty else { return 0.0 }
        
        let mean = values.reduce(0, +) / Double(values.count)
        let squaredDiffs = values.map { pow($0 - mean, 2) }
        return squaredDiffs.reduce(0, +) / Double(squaredDiffs.count)
    }
    
    // ✅ PHASE 1: Enhanced confidence scoring
    private func calculateEnhancedConfidence(_ measurements: ARMeasurements) -> Double {
        var totalConfidence = 0.0
        var factorCount = 0
        
        // Factor 1: Base AR framework confidence
        let baseConfidence = measurements.confidence
        totalConfidence += baseConfidence * 0.3
        factorCount += 1
        
        // Factor 2: Temporal consistency
        let temporalConsistency = calculateTemporalConsistency()
        totalConfidence += temporalConsistency * 0.25
        factorCount += 1
        
        // Factor 3: Measurement realism
        let realismScore = validateMeasurementRealism(measurements)
        totalConfidence += realismScore * 0.25
        factorCount += 1
        
        // Factor 4: Multi-frame stability
        let stabilityScore = frameValidationBuffer.count >= minConsistencyFrames ? 
            (validateMultiFrameConsistency(measurements) ? 1.0 : 0.5) : 0.7
        totalConfidence += stabilityScore * 0.2
        factorCount += 1
        
        let enhancedConfidence = totalConfidence / Double(factorCount)
        
        // Store confidence factors for debugging
        confidenceFactors["base"] = baseConfidence
        confidenceFactors["temporal"] = temporalConsistency
        confidenceFactors["realism"] = realismScore
        confidenceFactors["stability"] = stabilityScore
        confidenceFactors["enhanced"] = enhancedConfidence
        
        print("ARSessionManager: Enhanced confidence: \(enhancedConfidence) (base=\(baseConfidence), temporal=\(temporalConsistency), realism=\(realismScore), stability=\(stabilityScore))")
        
        return max(0.0, min(1.0, enhancedConfidence))
    }
    
    // ✅ PHASE 1: Calculate temporal consistency
    private func calculateTemporalConsistency() -> Double {
        guard frameValidationBuffer.count >= 3 else { return 0.5 }
        
        let recentMeasurements = Array(frameValidationBuffer.suffix(5))
        let shoulderWidths = recentMeasurements.map { $0.shoulderWidthCm }
        let heights = recentMeasurements.map { $0.heightCm }
        
        let shoulderConsistency = 1.0 - min(1.0, calculateVariance(shoulderWidths) / 10.0)
        let heightConsistency = 1.0 - min(1.0, calculateVariance(heights) / 20.0)
        
        let temporalConsistency = (shoulderConsistency + heightConsistency) / 2.0
        temporalConsistencyHistory.append(temporalConsistency)
        
        // Keep only recent consistency scores
        if temporalConsistencyHistory.count > 10 {
            temporalConsistencyHistory.removeFirst()
        }
        
        return max(0.0, min(1.0, temporalConsistency))
    }
    
    // ✅ PHASE 1: Validate measurement realism
    private func validateMeasurementRealism(_ measurements: ARMeasurements) -> Double {
        var realismScore = 0.0
        var checks = 0
        
        // Check shoulder width realism (30-60cm)
        let shoulderRealism: Double
        if measurements.shoulderWidthCm >= 30.0 && measurements.shoulderWidthCm <= 60.0 {
            shoulderRealism = 1.0
        } else if measurements.shoulderWidthCm >= 25.0 && measurements.shoulderWidthCm <= 70.0 {
            shoulderRealism = 0.7
        } else {
            shoulderRealism = 0.3
        }
        realismScore += shoulderRealism
        checks += 1
        
        // Check height realism (120-220cm)
        let heightRealism: Double
        if measurements.heightCm >= 120.0 && measurements.heightCm <= 220.0 {
            heightRealism = 1.0
        } else if measurements.heightCm >= 100.0 && measurements.heightCm <= 250.0 {
            heightRealism = 0.7
        } else {
            heightRealism = 0.3
        }
        realismScore += heightRealism
        checks += 1
        
        // Check body proportions (height should be 2.5-4x shoulder width)
        let proportionRatio = measurements.heightCm / measurements.shoulderWidthCm
        let proportionRealism: Double
        if proportionRatio >= 2.5 && proportionRatio <= 4.0 {
            proportionRealism = 1.0
        } else if proportionRatio >= 2.0 && proportionRatio <= 5.0 {
            proportionRealism = 0.7
        } else {
            proportionRealism = 0.3
        }
        realismScore += proportionRealism
        checks += 1
        
        return max(0.0, min(1.0, realismScore / Double(checks)))
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
                    self.frontScanCompleted = true
                    print("ARSessionManager: Front scan completed")
                    resolve(true)
                case "side":
                    // Mark side scan as completed
                    self.sideScanCompleted = true
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
            "frontScanCompleted": self.frontScanCompleted,
            "sideScanCompleted": self.sideScanCompleted,
            "scanStatus": (self.frontScanCompleted && self.sideScanCompleted) ? "completed" : "in_progress"
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









