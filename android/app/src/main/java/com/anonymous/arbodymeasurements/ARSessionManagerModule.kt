package com.anonymous.arbodymeasurements

import android.content.Context
import android.util.Log
import com.google.ar.core.*
import com.google.ar.core.exceptions.*
import com.facebook.react.bridge.*
import com.facebook.react.modules.core.DeviceEventManagerModule
import kotlinx.coroutines.*
import java.util.concurrent.ConcurrentHashMap

class ARSessionManagerModule(private val reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {
    
    companion object {
        private const val TAG = "ARSessionManager"
        private const val MODULE_NAME = "ARSessionManager"
        
        // AR Safeguards - Minimum thresholds for accurate measurements
        private const val MIN_CONFIDENCE_THRESHOLD = 0.7f
        private const val MIN_PLANE_DETECTION_CONFIDENCE = 0.8f
        private const val MIN_BODY_LANDMARKS_REQUIRED = 8
        private const val MAX_MEASUREMENT_RETRIES = 3
        private const val MEASUREMENT_TIMEOUT_MS = 10000L
    }
    
    private var arSession: Session? = null
    private var isSessionActive = false
    private var currentMeasurements: ARMeasurements? = null
    private var measurementRetryCount = 0
    private var frontScanCompleted = false
    private var sideScanCompleted = false
    private val measurementScope = CoroutineScope(Dispatchers.Main + SupervisorJob())
    
    // ✅ AR SAFEGUARD: Smoothing buffers for reducing jitter while maintaining accuracy
    private val measurementHistory = mutableListOf<ARMeasurements>()
    private val maxHistorySize = 5
    private val smoothingThreshold = 0.1 // 10% change threshold for smoothing
    
    override fun getName(): String = MODULE_NAME
    
    @ReactMethod
    fun isARCoreSupported(promise: Promise) {
        try {
            val activity = reactContext.currentActivity
            if (activity == null) {
                promise.resolve(false)
                return
            }
            
            // ✅ AR SAFEGUARD: Check ARCore version compatibility
            val availability = ArCoreApk.getInstance().checkAvailability(activity)
            val isSupported = availability.isSupported
            
            // Additional device capability validation
            val hasRequiredCapabilities = validateDeviceCapabilities()
            
            val finalResult = isSupported && hasRequiredCapabilities
            
            Log.d(TAG, "ARCore availability: $availability, supported: $isSupported, capabilities: $hasRequiredCapabilities")
            promise.resolve(finalResult)
            
        } catch (e: Exception) {
            Log.e(TAG, "Error checking ARCore support", e)
            promise.resolve(false)
        }
    }
    
    @ReactMethod
    fun startSession(promise: Promise) {
        try {
            if (isSessionActive) {
                promise.resolve(true)
                return
            }
            
            val activity = reactContext.currentActivity
            if (activity == null) {
                promise.reject("NO_ACTIVITY", "No current activity available")
                return
            }
            
            // ✅ AR SAFEGUARD: Validate camera permissions before starting AR session
            if (!validateCameraPermissions()) {
                promise.reject("CAMERA_PERMISSION_DENIED", "Camera permission required for AR body measurement")
                return
            }
            
            // Check ARCore availability
            val availability = ArCoreApk.getInstance().checkAvailability(activity)
            if (!availability.isSupported) {
                promise.reject("AR_NOT_SUPPORTED", "ARCore is not supported on this device")
                return
            }
            
            // Request ARCore installation if needed
            if (availability.isTransient) {
                try {
                    val installStatus = ArCoreApk.getInstance().requestInstall(activity, true)
                    if (installStatus != InstallStatus.INSTALLED) {
                        promise.reject("AR_INSTALL_REQUIRED", "ARCore installation required")
                        return
                    }
                } catch (e: UnavailableException) {
                    promise.reject("AR_UNAVAILABLE", "ARCore unavailable: ${e.message}")
                    return
                }
            }
            
            // Create AR session with proper body tracking configuration
            arSession = Session(activity)
            val config = Config(arSession)
            
            // Configure for real ARCore body tracking with safeguards
            config.focusMode = Config.FocusMode.AUTO
            config.updateMode = Config.UpdateMode.LATEST_CAMERA_IMAGE
            config.instantPlacementMode = Config.InstantPlacementMode.LOCAL_Y_UP
            
            // Enable body tracking if supported (ARCore 1.25+)
            try {
                if (config.isSupported(Config.Feature.BODY_TRACKING)) {
                    config.enableFeature(Config.Feature.BODY_TRACKING)
                    Log.d(TAG, "ARCore body tracking enabled")
                } else {
                    Log.w(TAG, "ARCore body tracking not supported on this device")
                }
            } catch (e: Exception) {
                Log.w(TAG, "Could not enable ARCore body tracking: ${e.message}")
            }
            
            arSession?.configure(config)
            arSession?.resume()
            
            isSessionActive = true
            Log.d(TAG, "AR session started successfully")
            promise.resolve(true)
            
        } catch (e: Exception) {
            Log.e(TAG, "Error starting AR session", e)
            promise.reject("SESSION_ERROR", "Failed to start AR session: ${e.message}")
        }
    }
    
    @ReactMethod
    fun stopSession(promise: Promise) {
        try {
            isSessionActive = false
            
            // ✅ AR SAFEGUARD: Proper cleanup of AR session and resources
            arSession?.pause()
            arSession?.close()
            arSession = null
            
            // Clean up measurements and state
            currentMeasurements = null
            measurementRetryCount = 0
            frontScanCompleted = false
            sideScanCompleted = false
            
            // ✅ AR SAFEGUARD: Clear measurement history for fresh start
            measurementHistory.clear()
            
            // Cancel any ongoing coroutines
            measurementScope.coroutineContext.cancelChildren()
            
            Log.d(TAG, "AR session stopped and cleaned up")
            promise.resolve(true)
            
        } catch (e: Exception) {
            Log.e(TAG, "Error stopping AR session", e)
            promise.reject("SESSION_ERROR", "Failed to stop AR session: ${e.message}")
        }
    }
    
    @ReactMethod
    fun getMeasurements(promise: Promise) {
        try {
            if (!isSessionActive || arSession == null) {
                promise.reject("SESSION_INACTIVE", "AR session is not active")
                return
            }
            
            val measurements = currentMeasurements
            if (measurements == null) {
                promise.reject("NO_MEASUREMENTS", "No valid measurements available")
                return
            }
            
            val result = WritableNativeMap().apply {
                putBoolean("valid", measurements.isValid)
                putDouble("shoulderWidthCm", measurements.shoulderWidthCm)
                putDouble("heightCm", measurements.heightCm)
                putDouble("confidence", measurements.confidence)
                putString("timestamp", measurements.timestamp.toString())
                putBoolean("frontScanCompleted", measurements.frontScanCompleted)
                putBoolean("sideScanCompleted", measurements.sideScanCompleted)
                putString("scanStatus", measurements.scanStatus)
                if (measurements.errorReason != null) {
                    putString("reason", measurements.errorReason)
                }
            }
            
            promise.resolve(result)
            
        } catch (e: Exception) {
            Log.e(TAG, "Error getting measurements", e)
            promise.reject("MEASUREMENT_ERROR", "Failed to get measurements: ${e.message}")
        }
    }
    
    @ReactMethod
    fun getSessionStatus(promise: Promise) {
        try {
            val result = WritableNativeMap().apply {
                putBoolean("isActive", isSessionActive)
                putBoolean("hasValidMeasurements", currentMeasurements != null)
                putInt("bodyCount", if (isSessionActive) 1 else 0)
                putInt("retryCount", measurementRetryCount)
                putBoolean("frontScanCompleted", frontScanCompleted)
                putBoolean("sideScanCompleted", sideScanCompleted)
                putString("scanStatus", if (frontScanCompleted && sideScanCompleted) "completed" else "in_progress")
            }
            
            promise.resolve(result)
            
        } catch (e: Exception) {
            Log.e(TAG, "Error getting session status", e)
            promise.reject("STATUS_ERROR", "Failed to get session status: ${e.message}")
        }
    }
    
    @ReactMethod
    fun markScanCompleted(scanType: String, promise: Promise) {
        try {
            when (scanType) {
                "front" -> frontScanCompleted = true
                "side" -> sideScanCompleted = true
                else -> {
                    promise.reject("INVALID_SCAN_TYPE", "Invalid scan type: $scanType")
                    return
                }
            }
            
            Log.d(TAG, "Scan completed: $scanType")
            promise.resolve(true)
            
        } catch (e: Exception) {
            Log.e(TAG, "Error marking scan completed", e)
            promise.reject("SCAN_ERROR", "Failed to mark scan completed: ${e.message}")
        }
    }
    
    // AR Safeguard: Process frame with comprehensive validation
    private fun processFrameForBodyTrackingWithSafeguards(frame: Frame): ARMeasurements? {
        try {
            // ✅ AR SAFEGUARD: Ensure AR planes are detected before scanning
            if (!validateARPlaneDetection(frame)) {
                Log.w(TAG, "AR plane detection failed - user needs to move device")
                return ARMeasurements(
                    shoulderWidthCm = 0.0,
                    heightCm = 0.0,
                    confidence = 0.0,
                    timestamp = System.currentTimeMillis(),
                    isValid = false,
                    errorReason = "Move your device slowly to detect surfaces before measuring"
                )
            }
            
            // ✅ AR SAFEGUARD: Check if ARCore body tracking is actually supported
            if (!isARCoreBodyTrackingAvailable()) {
                Log.w(TAG, "ARCore body tracking not supported on this device")
                return ARMeasurements(
                    shoulderWidthCm = 0.0,
                    heightCm = 0.0,
                    confidence = 0.0,
                    timestamp = System.currentTimeMillis(),
                    isValid = false,
                    errorReason = "This device does not support AR body tracking. Please use a compatible device."
                )
            }
            
            // Get AugmentedBody anchors from the frame - only real body tracking data
            val augmentedBodies = frame.updatedAnchors
                .filter { it.trackingState == TrackingState.TRACKING }
                .filterIsInstance<com.google.ar.core.AugmentedBody>()
            
            if (augmentedBodies.isEmpty()) {
                Log.w(TAG, "No AugmentedBody anchors detected - body tracking not available")
                return ARMeasurements(
                    shoulderWidthCm = 0.0,
                    heightCm = 0.0,
                    confidence = 0.0,
                    timestamp = System.currentTimeMillis(),
                    isValid = false,
                    errorReason = "No body detected. Please ensure you are visible in the camera frame."
                )
            }
            
            // Process the first detected AugmentedBody
            val augmentedBody = augmentedBodies.first()
            val bodyLandmarks = extractBodyLandmarksWithValidation(augmentedBody)
            
            if (bodyLandmarks == null) {
                Log.w(TAG, "Failed to extract valid body landmarks from AugmentedBody")
                return ARMeasurements(
                    shoulderWidthCm = 0.0,
                    heightCm = 0.0,
                    confidence = 0.0,
                    timestamp = System.currentTimeMillis(),
                    isValid = false,
                    errorReason = "Unable to detect body landmarks. Please ensure good lighting and clear view of your body."
                )
            }
            
            // ✅ AR SAFEGUARD: Validate user positioning for accurate measurements
            val positioningError = validateUserPositioning(bodyLandmarks)
            if (positioningError != null) {
                Log.w(TAG, "User positioning issue: $positioningError")
                return ARMeasurements(
                    shoulderWidthCm = 0.0,
                    heightCm = 0.0,
                    confidence = 0.0,
                    timestamp = System.currentTimeMillis(),
                    isValid = false,
                    errorReason = positioningError
                )
            }
            
            // AR Safeguard: Validate minimum landmarks required
            if (!validateMinimumLandmarks(bodyLandmarks)) {
                Log.w(TAG, "Insufficient landmarks for accurate measurement")
                return ARMeasurements(
                    shoulderWidthCm = 0.0,
                    heightCm = 0.0,
                    confidence = 0.0,
                    timestamp = System.currentTimeMillis(),
                    isValid = false,
                    errorReason = "Insufficient body landmarks detected. Please ensure full body is visible."
                )
            }
            
            // Calculate measurements with validation
            val shoulderWidth = calculateShoulderWidth(bodyLandmarks)
            val height = calculateHeight(bodyLandmarks)
            val confidence = calculateConfidence(bodyLandmarks)
            
            if (shoulderWidth > 0 && height > 0 && confidence >= MIN_CONFIDENCE_THRESHOLD) {
                val rawMeasurements = ARMeasurements(
                    shoulderWidthCm = shoulderWidth,
                    heightCm = height,
                    confidence = confidence,
                    timestamp = System.currentTimeMillis(),
                    isValid = true,
                    frontScanCompleted = frontScanCompleted,
                    sideScanCompleted = sideScanCompleted,
                    scanStatus = if (frontScanCompleted && sideScanCompleted) "completed" else "in_progress"
                )
                
                // ✅ AR SAFEGUARD: Apply smoothing to reduce jitter while maintaining accuracy
                return applySmoothingToMeasurements(rawMeasurements)
            }
            
            return null
            
        } catch (e: Exception) {
            Log.e(TAG, "Error processing frame for body tracking with safeguards", e)
            return null
        }
    }
    
    private fun extractBodyLandmarksWithValidation(bodyAnchor: Anchor): BodyLandmarks? {
        try {
            // ✅ AR SAFEGUARD: Use real ARCore body tracking APIs
            return extractARCoreBodyLandmarks(bodyAnchor)
        } catch (e: Exception) {
            Log.e(TAG, "Error extracting body landmarks", e)
            return null
        }
    }
    
    private fun extractARCoreBodyLandmarks(bodyAnchor: Anchor): BodyLandmarks? {
        try {
            // ✅ AR SAFEGUARD: Real ARCore body tracking implementation
            // Use actual ARCore body tracking APIs - NO SIMULATED DATA
            
            // Check if this is actually a body anchor with real body tracking data
            if (bodyAnchor !is com.google.ar.core.AugmentedBody) {
                Log.w(TAG, "Anchor is not an AugmentedBody - body tracking not supported on this device")
                return null
            }
            
            val augmentedBody = bodyAnchor as com.google.ar.core.AugmentedBody
            
            // Extract real body joints from ARCore body tracking
            val landmarks = BodyLandmarks()
            
            // Get actual body joint positions from ARCore
            try {
                // Head joint
                val headPose = augmentedBody.getJointPose(com.google.ar.core.AugmentedBody.JointType.HEAD)
                if (headPose != null) {
                    val headPosition = headPose.pose.translation
                    landmarks.head = Vector3(headPosition[0], headPosition[1], headPosition[2])
                }
                
                // Shoulder joints
                val leftShoulderPose = augmentedBody.getJointPose(com.google.ar.core.AugmentedBody.JointType.LEFT_SHOULDER)
                if (leftShoulderPose != null) {
                    val leftShoulderPosition = leftShoulderPose.pose.translation
                    landmarks.leftShoulder = Vector3(leftShoulderPosition[0], leftShoulderPosition[1], leftShoulderPosition[2])
                }
                
                val rightShoulderPose = augmentedBody.getJointPose(com.google.ar.core.AugmentedBody.JointType.RIGHT_SHOULDER)
                if (rightShoulderPose != null) {
                    val rightShoulderPosition = rightShoulderPose.pose.translation
                    landmarks.rightShoulder = Vector3(rightShoulderPosition[0], rightShoulderPosition[1], rightShoulderPosition[2])
                }
                
                // Elbow joints
                val leftElbowPose = augmentedBody.getJointPose(com.google.ar.core.AugmentedBody.JointType.LEFT_ELBOW)
                if (leftElbowPose != null) {
                    val leftElbowPosition = leftElbowPose.pose.translation
                    landmarks.leftElbow = Vector3(leftElbowPosition[0], leftElbowPosition[1], leftElbowPosition[2])
                }
                
                val rightElbowPose = augmentedBody.getJointPose(com.google.ar.core.AugmentedBody.JointType.RIGHT_ELBOW)
                if (rightElbowPose != null) {
                    val rightElbowPosition = rightElbowPose.pose.translation
                    landmarks.rightElbow = Vector3(rightElbowPosition[0], rightElbowPosition[1], rightElbowPosition[2])
                }
                
                // Wrist joints
                val leftWristPose = augmentedBody.getJointPose(com.google.ar.core.AugmentedBody.JointType.LEFT_WRIST)
                if (leftWristPose != null) {
                    val leftWristPosition = leftWristPose.pose.translation
                    landmarks.leftWrist = Vector3(leftWristPosition[0], leftWristPosition[1], leftWristPosition[2])
                }
                
                val rightWristPose = augmentedBody.getJointPose(com.google.ar.core.AugmentedBody.JointType.RIGHT_WRIST)
                if (rightWristPose != null) {
                    val rightWristPosition = rightWristPose.pose.translation
                    landmarks.rightWrist = Vector3(rightWristPosition[0], rightWristPosition[1], rightWristPosition[2])
                }
                
                // Hip joints
                val leftHipPose = augmentedBody.getJointPose(com.google.ar.core.AugmentedBody.JointType.LEFT_HIP)
                if (leftHipPose != null) {
                    val leftHipPosition = leftHipPose.pose.translation
                    landmarks.leftHip = Vector3(leftHipPosition[0], leftHipPosition[1], leftHipPosition[2])
                }
                
                val rightHipPose = augmentedBody.getJointPose(com.google.ar.core.AugmentedBody.JointType.RIGHT_HIP)
                if (rightHipPose != null) {
                    val rightHipPosition = rightHipPose.pose.translation
                    landmarks.rightHip = Vector3(rightHipPosition[0], rightHipPosition[1], rightHipPosition[2])
                }
                
                // Knee joints
                val leftKneePose = augmentedBody.getJointPose(com.google.ar.core.AugmentedBody.JointType.LEFT_KNEE)
                if (leftKneePose != null) {
                    val leftKneePosition = leftKneePose.pose.translation
                    landmarks.leftKnee = Vector3(leftKneePosition[0], leftKneePosition[1], leftKneePosition[2])
                }
                
                val rightKneePose = augmentedBody.getJointPose(com.google.ar.core.AugmentedBody.JointType.RIGHT_KNEE)
                if (rightKneePose != null) {
                    val rightKneePosition = rightKneePose.pose.translation
                    landmarks.rightKnee = Vector3(rightKneePosition[0], rightKneePosition[1], rightKneePosition[2])
                }
                
                // Ankle joints
                val leftAnklePose = augmentedBody.getJointPose(com.google.ar.core.AugmentedBody.JointType.LEFT_ANKLE)
                if (leftAnklePose != null) {
                    val leftAnklePosition = leftAnklePose.pose.translation
                    landmarks.leftAnkle = Vector3(leftAnklePosition[0], leftAnklePosition[1], leftAnklePosition[2])
                }
                
                val rightAnklePose = augmentedBody.getJointPose(com.google.ar.core.AugmentedBody.JointType.RIGHT_ANKLE)
                if (rightAnklePose != null) {
                    val rightAnklePosition = rightAnklePose.pose.translation
                    landmarks.rightAnkle = Vector3(rightAnklePosition[0], rightAnklePosition[1], rightAnklePosition[2])
                }
                
                Log.d(TAG, "Extracted real ARCore body landmarks from AugmentedBody")
                return landmarks
                
            } catch (e: Exception) {
                Log.e(TAG, "Error extracting specific body joints from ARCore", e)
                return null
            }
            
        } catch (e: Exception) {
            Log.e(TAG, "Error extracting ARCore body landmarks - body tracking not supported", e)
            return null
        }
    }
    
    private fun isARCoreBodyTrackingAvailable(): Boolean {
        return try {
            val activity = reactContext.currentActivity
            if (activity == null) {
                Log.w(TAG, "No activity available for ARCore body tracking check")
                return false
            }
            
            // Check ARCore availability first
            val availability = ArCoreApk.getInstance().checkAvailability(activity)
            if (!availability.isSupported) {
                Log.w(TAG, "ARCore not supported on this device")
                return false
            }
            
            // Create a temporary session to check body tracking support
            val session = Session(activity)
            val config = Config(session)
            val isBodyTrackingSupported = config.isSupported(Config.Feature.BODY_TRACKING)
            
            // Clean up the temporary session
            session.close()
            
            Log.d(TAG, "ARCore body tracking support check: $isBodyTrackingSupported")
            isBodyTrackingSupported
            
        } catch (e: Exception) {
            Log.w(TAG, "ARCore body tracking not available", e)
            false
        }
    }
    
    // ✅ AR SAFEGUARD: Validate device capabilities for AR
    private fun validateDeviceCapabilities(): Boolean {
        return try {
            val activity = reactContext.currentActivity
            if (activity == null) return false
            
            val packageManager = activity.packageManager
            
            // Check for required hardware features
            val hasCamera = packageManager.hasSystemFeature(android.content.pm.PackageManager.FEATURE_CAMERA)
            val hasAccelerometer = packageManager.hasSystemFeature(android.content.pm.PackageManager.FEATURE_SENSOR_ACCELEROMETER)
            val hasGyroscope = packageManager.hasSystemFeature(android.content.pm.PackageManager.FEATURE_SENSOR_GYROSCOPE)
            
            // Check OpenGL ES version
            val hasOpenGLES = packageManager.hasSystemFeature(android.content.pm.PackageManager.FEATURE_OPENGLES)
            
            val hasRequiredFeatures = hasCamera && hasAccelerometer && hasGyroscope && hasOpenGLES
            
            Log.d(TAG, "Device capabilities - Camera: $hasCamera, Accelerometer: $hasAccelerometer, Gyroscope: $hasGyroscope, OpenGL ES: $hasOpenGLES")
            
            return hasRequiredFeatures
        } catch (e: Exception) {
            Log.e(TAG, "Error validating device capabilities", e)
            false
        }
    }
    
    // ✅ AR SAFEGUARD: Validate camera permissions before AR session
    private fun validateCameraPermissions(): Boolean {
        return try {
            val activity = reactContext.currentActivity
            if (activity == null) return false
            
            val packageManager = activity.packageManager
            val cameraPermission = packageManager.checkPermission(
                android.Manifest.permission.CAMERA,
                activity.packageName
            )
            
            cameraPermission == android.content.pm.PackageManager.PERMISSION_GRANTED
        } catch (e: Exception) {
            Log.e(TAG, "Error checking camera permissions", e)
            false
        }
    }
    
    // ✅ AR SAFEGUARD: Enhanced AR plane detection validation
    private fun validateARPlaneDetection(frame: Frame): Boolean {
        return try {
            val planes = frame.getUpdatedTrackables(Plane::class.java)
            val horizontalPlanes = planes.filter { 
                it.type == Plane.Type.HORIZONTAL_UPWARD_FACING && 
                it.trackingState == TrackingState.TRACKING 
            }
            
            val hasValidPlane = horizontalPlanes.any { plane ->
                plane.centerPose.translation.let { translation ->
                    // Check if plane is at reasonable distance (0.5m to 5m)
                    val distance = Math.sqrt(
                        translation[0] * translation[0] + 
                        translation[1] * translation[1] + 
                        translation[2] * translation[2]
                    )
                    distance in 0.5..5.0
                }
            }
            
            Log.d(TAG, "AR plane detection: $hasValidPlane (${horizontalPlanes.size} planes)")
            hasValidPlane
            
        } catch (e: Exception) {
            Log.e(TAG, "Error validating AR plane detection", e)
            false
        }
    }
    
    // ✅ AR SAFEGUARD: User positioning guidance for accurate measurements
    private fun validateUserPositioning(bodyLandmarks: BodyLandmarks): String? {
        return try {
            val head = bodyLandmarks.head ?: return "Head not detected"
            val leftShoulder = bodyLandmarks.leftShoulder ?: return "Left shoulder not detected"
            val rightShoulder = bodyLandmarks.rightShoulder ?: return "Right shoulder not detected"
            
            // Check if user is at appropriate distance (1-3 meters)
            val distance = Math.sqrt(
                head.x * head.x + head.y * head.y + head.z * head.z
            )
            
            when {
                distance < 1.0f -> "Please step back - you're too close to the camera"
                distance > 3.0f -> "Please step closer - you're too far from the camera"
                else -> null
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error validating user positioning", e)
            "Error validating user position"
        }
    }
    
    // AR Safeguard: Validate minimum landmarks required
    private fun validateMinimumLandmarks(landmarks: BodyLandmarks): Boolean {
        val requiredLandmarks = listOf(
            landmarks.head,
            landmarks.leftShoulder,
            landmarks.rightShoulder,
            landmarks.leftHip,
            landmarks.rightHip,
            landmarks.leftKnee,
            landmarks.rightKnee,
            landmarks.leftAnkle,
            landmarks.rightAnkle
        )
        
        val validLandmarks = requiredLandmarks.count { it != null }
        val isValid = validLandmarks >= MIN_BODY_LANDMARKS_REQUIRED
        
        Log.d(TAG, "Landmark validation: $validLandmarks/$MIN_BODY_LANDMARKS_REQUIRED required landmarks detected")
        return isValid
    }
    
    private fun calculateShoulderWidth(landmarks: BodyLandmarks): Double {
        val leftShoulder = landmarks.leftShoulder ?: return 0.0
        val rightShoulder = landmarks.rightShoulder ?: return 0.0
        
        val dx = rightShoulder.x - leftShoulder.x
        val dy = rightShoulder.y - leftShoulder.y
        val dz = rightShoulder.z - leftShoulder.z
        
        val distance = Math.sqrt(dx * dx + dy * dy + dz * dz)
        return distance * 100.0 // Convert to centimeters
    }
    
    private fun calculateHeight(landmarks: BodyLandmarks): Double {
        val head = landmarks.head ?: return 0.0
        val leftAnkle = landmarks.leftAnkle ?: return 0.0
        val rightAnkle = landmarks.rightAnkle ?: return 0.0
        
        val avgAnkleY = (leftAnkle.y + rightAnkle.y) / 2.0f
        val height = head.y - avgAnkleY
        
        return height * 100.0 // Convert to centimeters
    }
    
    private fun calculateConfidence(landmarks: BodyLandmarks): Double {
        val requiredLandmarks = listOf(
            landmarks.head,
            landmarks.leftShoulder,
            landmarks.rightShoulder,
            landmarks.leftHip,
            landmarks.rightHip,
            landmarks.leftKnee,
            landmarks.rightKnee,
            landmarks.leftAnkle,
            landmarks.rightAnkle
        )
        
        val validLandmarks = requiredLandmarks.count { it != null }
        val baseConfidence = validLandmarks.toDouble() / requiredLandmarks.size
        
        // ✅ AR SAFEGUARD: Additional accuracy validation
        val accuracyBonus = validateMeasurementAccuracy(landmarks)
        
        return (baseConfidence + accuracyBonus).coerceAtMost(1.0)
    }
    
    // ✅ AR SAFEGUARD: Validate measurement accuracy against expected ranges
    private fun validateMeasurementAccuracy(landmarks: BodyLandmarks): Double {
        var accuracyScore = 0.0
        
        try {
            // Validate shoulder width (should be reasonable for human body)
            val shoulderWidth = calculateShoulderWidth(landmarks)
            if (shoulderWidth in 30.0..60.0) {
                accuracyScore += 0.1
            }
            
            // Validate height (should be reasonable for human body)
            val height = calculateHeight(landmarks)
            if (height in 120.0..220.0) {
                accuracyScore += 0.1
            }
            
            // Validate body proportions (height should be significantly larger than shoulder width)
            if (height > shoulderWidth * 2.5) {
                accuracyScore += 0.1
            }
            
            // Validate landmark consistency (left and right sides should be roughly symmetric)
            val leftShoulder = landmarks.leftShoulder
            val rightShoulder = landmarks.rightShoulder
            if (leftShoulder != null && rightShoulder != null) {
                val shoulderSymmetry = Math.abs(leftShoulder.y - rightShoulder.y)
                if (shoulderSymmetry < 0.1f) { // Within 10cm
                    accuracyScore += 0.1
                }
            }
            
        } catch (e: Exception) {
            Log.e(TAG, "Error validating measurement accuracy", e)
        }
        
        return accuracyScore
    }
    
    // ✅ AR SAFEGUARD: Apply smoothing to reduce jitter while maintaining accuracy
    private fun applySmoothingToMeasurements(newMeasurements: ARMeasurements): ARMeasurements {
        try {
            // Add new measurement to history
            measurementHistory.add(newMeasurements)
            
            // Keep only recent measurements
            if (measurementHistory.size > maxHistorySize) {
                measurementHistory.removeAt(0)
            }
            
            // If we don't have enough history, return the raw measurement
            if (measurementHistory.size < 3) {
                return newMeasurements
            }
            
            // Calculate smoothed values using weighted average
            val weights = listOf(0.1, 0.2, 0.3, 0.4) // More weight to recent measurements
            val validMeasurements = measurementHistory.takeLast(4)
            
            var weightedShoulderWidth = 0.0
            var weightedHeight = 0.0
            var weightedConfidence = 0.0
            var totalWeight = 0.0
            
            validMeasurements.forEachIndexed { index, measurement ->
                val weight = if (index < weights.size) weights[index] else 0.1
                weightedShoulderWidth += measurement.shoulderWidthCm * weight
                weightedHeight += measurement.heightCm * weight
                weightedConfidence += measurement.confidence * weight
                totalWeight += weight
            }
            
            val smoothedShoulderWidth = weightedShoulderWidth / totalWeight
            val smoothedHeight = weightedHeight / totalWeight
            val smoothedConfidence = weightedConfidence / totalWeight
            
            // Validate that smoothing didn't introduce unrealistic values
            val finalShoulderWidth = if (smoothedShoulderWidth in 20.0..80.0) smoothedShoulderWidth else newMeasurements.shoulderWidthCm
            val finalHeight = if (smoothedHeight in 100.0..250.0) smoothedHeight else newMeasurements.heightCm
            val finalConfidence = smoothedConfidence.coerceIn(0.0, 1.0)
            
            Log.d(TAG, "Applied smoothing: shoulder ${newMeasurements.shoulderWidthCm} -> $finalShoulderWidth, height ${newMeasurements.heightCm} -> $finalHeight")
            
            return newMeasurements.copy(
                shoulderWidthCm = finalShoulderWidth,
                heightCm = finalHeight,
                confidence = finalConfidence
            )
            
        } catch (e: Exception) {
            Log.e(TAG, "Error applying smoothing to measurements", e)
            return newMeasurements
        }
    }
    
    private fun sendMeasurementUpdate(measurements: ARMeasurements) {
        try {
            val params = WritableNativeMap().apply {
                putDouble("shoulderWidthCm", measurements.shoulderWidthCm)
                putDouble("heightCm", measurements.heightCm)
                putDouble("confidence", measurements.confidence)
                putString("timestamp", measurements.timestamp.toString())
                putBoolean("isValid", measurements.isValid)
                putBoolean("frontScanCompleted", measurements.frontScanCompleted)
                putBoolean("sideScanCompleted", measurements.sideScanCompleted)
                putString("scanStatus", measurements.scanStatus)
                if (measurements.errorReason != null) {
                    putString("errorReason", measurements.errorReason)
                }
            }
            
            reactContext
                .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
                .emit("onARMeasurementUpdate", params)
                
        } catch (e: Exception) {
            Log.e(TAG, "Error sending measurement update", e)
        }
    }
    
    data class Vector3(val x: Float, val y: Float, val z: Float)
    
    data class BodyLandmarks(
        val head: Vector3? = null,
        val leftShoulder: Vector3? = null,
        val rightShoulder: Vector3? = null,
        val leftElbow: Vector3? = null,
        val rightElbow: Vector3? = null,
        val leftWrist: Vector3? = null,
        val rightWrist: Vector3? = null,
        val leftHip: Vector3? = null,
        val rightHip: Vector3? = null,
        val leftKnee: Vector3? = null,
        val rightKnee: Vector3? = null,
        val leftAnkle: Vector3? = null,
        val rightAnkle: Vector3? = null
    )
    
    data class ARMeasurements(
        val shoulderWidthCm: Double,
        val heightCm: Double,
        val confidence: Double,
        val timestamp: Long,
        val isValid: Boolean = false,
        val errorReason: String? = null,
        val frontScanCompleted: Boolean = false,
        val sideScanCompleted: Boolean = false,
        val scanStatus: String = "idle"
    )
}