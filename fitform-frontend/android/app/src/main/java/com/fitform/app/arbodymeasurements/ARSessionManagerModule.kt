package com.fitform.app.arbodymeasurements

import android.content.Context
import android.util.Log
import com.google.ar.core.*
import com.google.ar.core.exceptions.*
import com.google.ar.core.ArCoreApk.InstallStatus
import com.facebook.react.bridge.*
import com.facebook.react.modules.core.DeviceEventManagerModule
import kotlinx.coroutines.*
import java.util.concurrent.ConcurrentHashMap
import java.util.concurrent.ConcurrentLinkedQueue
import java.util.concurrent.atomic.AtomicBoolean
import java.util.concurrent.atomic.AtomicInteger
import java.util.concurrent.atomic.AtomicLong

class ARSessionManagerModule(private val reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {
    
    companion object {
        private const val TAG = "ARSessionManager"
        private const val MODULE_NAME = "ARSessionManager"
    }
    
    private var arSession: Session? = null
    private val isSessionActive = AtomicBoolean(false)
    private var currentMeasurements: ARMeasurements? = null
    private val measurementRetryCount = AtomicInteger(0)
    private val frontScanCompleted = AtomicBoolean(false)
    private val sideScanCompleted = AtomicBoolean(false)
    private val measurementHistory = ConcurrentLinkedQueue<ARMeasurements>()
    private val frameValidationBuffer = ConcurrentLinkedQueue<ARMeasurements>()
    private val lastMeasurementTime = AtomicLong(0)
    private val sessionStartTime = AtomicLong(0)
    
    override fun getName(): String = MODULE_NAME
    
    @ReactMethod
    fun startARSession(promise: Promise) {
        try {
            Log.d(TAG, "Starting AR session...")
            
            // Check if ARCore is available
            val availability = ArCoreApk.getInstance().checkAvailability(reactContext)
            if (availability.isTransient) {
                Log.w(TAG, "ARCore availability is transient, trying to install...")
                ArCoreApk.getInstance().requestInstall(reactContext, true)
                promise.reject("ARCore_UNAVAILABLE", "ARCore is not available on this device")
                return
            }
            
            if (availability.isUnsupported) {
                Log.e(TAG, "ARCore is not supported on this device")
                promise.reject("ARCore_UNSUPPORTED", "ARCore is not supported on this device")
                return
            }
            
            // Create AR session
            arSession = Session(reactContext)
            
            // Configure session for body tracking
            val config = Config(arSession)
            config.focusMode = Config.FocusMode.AUTO
            config.updateMode = Config.UpdateMode.LATEST_CAMERA_IMAGE
            config.instantPlacementMode = Config.InstantPlacementMode.DISABLED
            
            // Enable body tracking
            if (arSession!!.isSupported(config)) {
                arSession!!.configure(config)
                arSession!!.resume()
                isSessionActive.set(true)
                sessionStartTime.set(System.currentTimeMillis())
                
                Log.d(TAG, "AR session started successfully")
                promise.resolve("AR session started")
            } else {
                Log.e(TAG, "AR session configuration not supported")
                promise.reject("ARCore_CONFIG_ERROR", "AR session configuration not supported")
            }
            
        } catch (e: Exception) {
            Log.e(TAG, "Error starting AR session", e)
            promise.reject("ARCore_START_ERROR", "Failed to start AR session: ${e.message}")
        }
    }
    
    @ReactMethod
    fun stopARSession(promise: Promise) {
        try {
            Log.d(TAG, "Stopping AR session...")
            
            arSession?.pause()
            arSession?.close()
            arSession = null
            isSessionActive.set(false)
            
            // Clear measurement data
            currentMeasurements = null
            measurementHistory.clear()
            frameValidationBuffer.clear()
            measurementRetryCount.set(0)
            frontScanCompleted.set(false)
            sideScanCompleted.set(false)
            
            Log.d(TAG, "AR session stopped")
            promise.resolve("AR session stopped")
            
        } catch (e: Exception) {
            Log.e(TAG, "Error stopping AR session", e)
            promise.reject("ARCore_STOP_ERROR", "Failed to stop AR session: ${e.message}")
        }
    }
    
    @ReactMethod
    fun getBodyMeasurements(promise: Promise) {
        try {
            if (!isSessionActive.get()) {
                promise.reject("ARCore_SESSION_INACTIVE", "AR session is not active")
                return
            }
            
            val frame = arSession?.update()
            if (frame == null) {
                promise.reject("ARCore_FRAME_ERROR", "No camera frame available")
                return
            }
            
            // Get augmented bodies from the frame
            val augmentedBodies = frame.getUpdatedTrackables(AugmentedBody::class.java)
            val validBodies = augmentedBodies.filter { body -> body.trackingState == TrackingState.TRACKING }
            
            if (validBodies.isEmpty()) {
                val errorResult = WritableNativeMap().apply {
                    putBoolean("isValid", false)
                    putString("errorReason", "No body detected. Please ensure you are visible in the camera view.")
                    putDouble("confidence", 0.0)
                }
                promise.resolve(errorResult)
                return
            }
            
            // Process the first detected body
            val firstBody = validBodies.first()
            val landmarks = extractBodyLandmarksFromAugmentedBody(firstBody)
            
            if (landmarks == null) {
                val errorResult = WritableNativeMap().apply {
                    putBoolean("isValid", false)
                    putString("errorReason", "Unable to detect body landmarks. Please ensure good lighting and clear view of your body.")
                    putDouble("confidence", 0.0)
                }
                promise.resolve(errorResult)
                return
            }
            
            // Calculate measurements
            val measurements = calculateMeasurementsFromLandmarks(landmarks)
            
            // Send measurement update
            sendMeasurementUpdate(measurements)
            
            val result = WritableNativeMap().apply {
                putBoolean("isValid", measurements.isValid)
                putDouble("shoulderWidthCm", measurements.shoulderWidthCm)
                putDouble("heightCm", measurements.heightCm)
                putDouble("confidence", measurements.confidence)
                putDouble("timestamp", measurements.timestamp.toDouble())
                if (!measurements.isValid) {
                    putString("errorReason", measurements.errorReason)
                }
            }
            
            promise.resolve(result)
            
        } catch (e: Exception) {
            Log.e(TAG, "Error getting body measurements", e)
            promise.reject("ARCore_MEASUREMENT_ERROR", "Failed to get body measurements: ${e.message}")
        }
    }
    
    private fun extractBodyLandmarksFromAugmentedBody(augmentedBody: AugmentedBody): BodyLandmarks? {
        try {
            Log.d(TAG, "Extracting body landmarks from AugmentedBody")
            
            // Get the skeleton from the augmented body
            val skeleton = augmentedBody.skeleton
            
            val landmarks = BodyLandmarks()
            
            // Extract key body landmarks from ARCore skeleton
            for (jointType in SkeletonJointType.values()) {
                val jointPose = skeleton.getJointPose(jointType)
                
                if (jointPose != null && jointPose.trackingState == TrackingState.TRACKING) {
                    val position = jointPose.pose.translation
                    
                    // Map ARCore joint types to our landmark structure
                    when (jointType) {
                        SkeletonJointType.HEAD -> landmarks.head = position
                        SkeletonJointType.LEFT_SHOULDER -> landmarks.leftShoulder = position
                        SkeletonJointType.RIGHT_SHOULDER -> landmarks.rightShoulder = position
                        SkeletonJointType.LEFT_ELBOW -> landmarks.leftElbow = position
                        SkeletonJointType.RIGHT_ELBOW -> landmarks.rightElbow = position
                        SkeletonJointType.LEFT_WRIST -> landmarks.leftWrist = position
                        SkeletonJointType.RIGHT_WRIST -> landmarks.rightWrist = position
                        SkeletonJointType.LEFT_HIP -> landmarks.leftHip = position
                        SkeletonJointType.RIGHT_HIP -> landmarks.rightHip = position
                        SkeletonJointType.LEFT_KNEE -> landmarks.leftKnee = position
                        SkeletonJointType.RIGHT_KNEE -> landmarks.rightKnee = position
                        SkeletonJointType.LEFT_ANKLE -> landmarks.leftAnkle = position
                        SkeletonJointType.RIGHT_ANKLE -> landmarks.rightAnkle = position
                        else -> { /* Skip other joint types */ }
                    }
                }
            }
            
            // Validate that we have essential landmarks
            if (landmarks.leftShoulder == null || landmarks.rightShoulder == null ||
                landmarks.leftAnkle == null || landmarks.rightAnkle == null) {
                Log.w(TAG, "Missing essential body landmarks")
                return null
            }
            
            Log.d(TAG, "Successfully extracted body landmarks from AugmentedBody")
            return landmarks
            
        } catch (e: Exception) {
            Log.e(TAG, "Error extracting body landmarks from AugmentedBody", e)
            return null
        }
    }
    
    // Calculate measurements from body landmarks
    private fun calculateMeasurementsFromLandmarks(landmarks: BodyLandmarks): ARMeasurements {
        val shoulderWidth = calculateShoulderWidth(landmarks)
        val height = calculateHeight(landmarks)
        val confidence = calculateConfidence(landmarks)
        
        return ARMeasurements(
            shoulderWidthCm = shoulderWidth,
            heightCm = height,
            confidence = confidence,
            timestamp = System.currentTimeMillis(),
            isValid = confidence > 0.5,
            errorReason = if (confidence <= 0.5) "Low confidence in body detection" else null
        )
    }
    
    private fun calculateShoulderWidth(landmarks: BodyLandmarks): Double {
        val leftShoulder = landmarks.leftShoulder ?: return 0.0
        val rightShoulder = landmarks.rightShoulder ?: return 0.0
        
        val dx = rightShoulder.x - leftShoulder.x
        val dy = rightShoulder.y - leftShoulder.y
        val dz = rightShoulder.z - leftShoulder.z
        
        val distance = Math.sqrt((dx * dx + dy * dy + dz * dz).toDouble())
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
        
        return baseConfidence.coerceIn(0.0, 1.0)
    }
    
    private fun sendMeasurementUpdate(measurements: ARMeasurements) {
        try {
            val params = WritableNativeMap().apply {
                putDouble("shoulderWidthCm", measurements.shoulderWidthCm)
                putDouble("heightCm", measurements.heightCm)
                putDouble("confidence", measurements.confidence)
                putDouble("timestamp", measurements.timestamp.toDouble())
                putBoolean("isValid", measurements.isValid)
                if (measurements.errorReason != null) {
                    putString("errorReason", measurements.errorReason)
                }
            }
            
            reactContext
                .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
                .emit("onBodyMeasurementsUpdate", params)
                
        } catch (e: Exception) {
            Log.e(TAG, "Error sending measurement update", e)
        }
    }
}

// Data structures
data class BodyLandmarks(
    var head: Vector3? = null,
    var leftShoulder: Vector3? = null,
    var rightShoulder: Vector3? = null,
    var leftElbow: Vector3? = null,
    var rightElbow: Vector3? = null,
    var leftWrist: Vector3? = null,
    var rightWrist: Vector3? = null,
    var leftHip: Vector3? = null,
    var rightHip: Vector3? = null,
    var leftKnee: Vector3? = null,
    var rightKnee: Vector3? = null,
    var leftAnkle: Vector3? = null,
    var rightAnkle: Vector3? = null
)

data class ARMeasurements(
    val shoulderWidthCm: Double,
    val heightCm: Double,
    val confidence: Double,
    val timestamp: Long,
    val isValid: Boolean = true,
    val errorReason: String? = null
)
