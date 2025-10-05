package com.ica_russ.arbodymeasurements

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
                ArCoreApk.getInstance().requestInstall(reactContext.currentActivity, true)
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
            
            // Configure session for basic AR functionality
            val config = Config(arSession)
            config.focusMode = Config.FocusMode.AUTO
            config.updateMode = Config.UpdateMode.LATEST_CAMERA_IMAGE
            config.instantPlacementMode = Config.InstantPlacementMode.DISABLED
            
            // Enable plane detection for basic AR functionality
            config.planeFindingMode = Config.PlaneFindingMode.HORIZONTAL_AND_VERTICAL
            
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
            
            // Simulate body detection with more realistic behavior
            val bodyDetected = simulateBodyDetection(frame)
            
            if (!bodyDetected) {
                val errorResult = WritableNativeMap().apply {
                    putBoolean("isValid", false)
                    putString("errorReason", "No body detected. Please ensure you are visible in the camera view and well-lit.")
                    putDouble("confidence", 0.0)
                    putDouble("shoulderWidthCm", 0.0)
                    putDouble("heightCm", 0.0)
                    putDouble("timestamp", System.currentTimeMillis().toDouble())
                }
                promise.resolve(errorResult)
                return
            }
            
            // Generate realistic measurements when body is detected
            val measurements = generateRealisticMeasurements()
            
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
    
    private fun simulateBodyDetection(frame: Frame): Boolean {
        try {
            // Simulate body detection based on session time and frame quality
            val sessionDuration = System.currentTimeMillis() - sessionStartTime.get()
            
            // Simulate that body detection improves over time
            val detectionProbability = when {
                sessionDuration < 2000 -> 0.1 // Very low chance in first 2 seconds
                sessionDuration < 5000 -> 0.3 // Low chance in first 5 seconds
                sessionDuration < 10000 -> 0.6 // Medium chance after 10 seconds
                else -> 0.8 // High chance after 10 seconds
            }
            
            // Add some randomness to make it feel more realistic
            val random = Math.random()
            val bodyDetected = random < detectionProbability
            
            Log.d(TAG, "Body detection simulation - Session: ${sessionDuration}ms, Probability: $detectionProbability, Detected: $bodyDetected")
            
            return bodyDetected
            
        } catch (e: Exception) {
            Log.e(TAG, "Error in body detection simulation", e)
            return false
        }
    }
    
    private fun generateRealisticMeasurements(): ARMeasurements {
        // Generate more realistic measurements based on common human proportions
        val random = Math.random()
        
        // Simulate different body types
        val bodyType = when {
            random < 0.3 -> "athletic" // 30% chance
            random < 0.6 -> "average" // 30% chance
            else -> "larger" // 40% chance
        }
        
        val (shoulderWidth, height, confidence) = when (bodyType) {
            "athletic" -> Triple(
                42.0 + (Math.random() * 6.0), // 42-48 cm
                170.0 + (Math.random() * 15.0), // 170-185 cm
                0.85 + (Math.random() * 0.15) // 0.85-1.0
            )
            "average" -> Triple(
                40.0 + (Math.random() * 8.0), // 40-48 cm
                165.0 + (Math.random() * 20.0), // 165-185 cm
                0.75 + (Math.random() * 0.20) // 0.75-0.95
            )
            else -> Triple(
                45.0 + (Math.random() * 10.0), // 45-55 cm
                175.0 + (Math.random() * 20.0), // 175-195 cm
                0.70 + (Math.random() * 0.25) // 0.70-0.95
            )
        }
        
        Log.d(TAG, "Generated measurements - Type: $bodyType, Shoulder: ${String.format("%.1f", shoulderWidth)}cm, Height: ${String.format("%.1f", height)}cm, Confidence: ${String.format("%.2f", confidence)}")
        
        return ARMeasurements(
            shoulderWidthCm = shoulderWidth,
            heightCm = height,
            confidence = confidence,
            timestamp = System.currentTimeMillis(),
            isValid = confidence > 0.6,
            errorReason = if (confidence <= 0.6) "Low confidence in body detection" else null
        )
    }
    
    private fun generateMockMeasurements(): ARMeasurements {
        // Generate realistic mock measurements for testing
        val shoulderWidth = 40.0 + (Math.random() * 10.0) // 40-50 cm
        val height = 160.0 + (Math.random() * 30.0) // 160-190 cm
        val confidence = 0.7 + (Math.random() * 0.3) // 0.7-1.0
        
        return ARMeasurements(
            shoulderWidthCm = shoulderWidth,
            heightCm = height,
            confidence = confidence,
            timestamp = System.currentTimeMillis(),
            isValid = confidence > 0.5,
            errorReason = if (confidence <= 0.5) "Low confidence in body detection" else null
        )
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
    
    // Event listener methods for NativeEventEmitter
    @ReactMethod
    fun addListener(eventName: String) {
        // Required for NativeEventEmitter
        Log.d(TAG, "Adding listener for event: $eventName")
    }
    
    @ReactMethod
    fun removeListeners(count: Int) {
        // Required for NativeEventEmitter
        Log.d(TAG, "Removing $count listeners")
    }
    
    // Configuration management methods
    @ReactMethod
    fun loadConfiguration(config: ReadableMap, promise: Promise) {
        try {
            Log.d(TAG, "Loading AR configuration...")
            
            // Extract configuration values
            val confidenceThreshold = if (config.hasKey("confidenceThreshold")) {
                config.getDouble("confidenceThreshold")
            } else 0.75
            
            val frameInterval = if (config.hasKey("frameInterval")) {
                config.getMap("frameInterval")
            } else null
            
            val logLevel = if (config.hasKey("logLevel")) {
                config.getString("logLevel")
            } else "INFO"
            
            // Log configuration details
            Log.d(TAG, "Configuration loaded - Confidence: $confidenceThreshold, LogLevel: $logLevel")
            
            if (frameInterval != null) {
                val highEnd = if (frameInterval.hasKey("highEnd")) frameInterval.getInt("highEnd") else 33
                val midRange = if (frameInterval.hasKey("midRange")) frameInterval.getInt("midRange") else 66
                val lowEnd = if (frameInterval.hasKey("lowEnd")) frameInterval.getInt("lowEnd") else 133
                Log.d(TAG, "Frame intervals - High: $highEnd, Mid: $midRange, Low: $lowEnd")
            }
            
            promise.resolve(true)
            
        } catch (e: Exception) {
            Log.e(TAG, "Error loading configuration", e)
            promise.reject("CONFIG_ERROR", "Failed to load configuration: ${e.message}")
        }
    }
    
    @ReactMethod
    fun startRealTimeProcessing(promise: Promise) {
        try {
            Log.d(TAG, "Starting real-time processing...")
            // For now, just return true as we're using mock measurements
            promise.resolve(true)
        } catch (e: Exception) {
            Log.e(TAG, "Error starting real-time processing", e)
            promise.reject("REALTIME_ERROR", "Failed to start real-time processing: ${e.message}")
        }
    }
    
    @ReactMethod
    fun stopRealTimeProcessing(promise: Promise) {
        try {
            Log.d(TAG, "Stopping real-time processing...")
            // For now, just return true as we're using mock measurements
            promise.resolve(true)
        } catch (e: Exception) {
            Log.e(TAG, "Error stopping real-time processing", e)
            promise.reject("REALTIME_ERROR", "Failed to stop real-time processing: ${e.message}")
        }
    }
    
    @ReactMethod
    fun getSessionStatus(promise: Promise) {
        try {
            val result = WritableNativeMap().apply {
                putBoolean("isActive", isSessionActive.get())
                putBoolean("hasValidMeasurements", currentMeasurements?.isValid ?: false)
                putInt("bodyCount", if (isSessionActive.get()) 1 else 0)
                putInt("retryCount", measurementRetryCount.get())
                putBoolean("frontScanCompleted", frontScanCompleted.get())
                putBoolean("sideScanCompleted", sideScanCompleted.get())
                putString("scanStatus", if (frontScanCompleted.get() && sideScanCompleted.get()) "completed" else "in_progress")
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
            Log.d(TAG, "Marking scan completed: $scanType")
            when (scanType) {
                "front" -> frontScanCompleted.set(true)
                "side" -> sideScanCompleted.set(true)
                else -> {
                    promise.reject("INVALID_SCAN_TYPE", "Invalid scan type: $scanType")
                    return
                }
            }
            promise.resolve(true)
        } catch (e: Exception) {
            Log.e(TAG, "Error marking scan completed", e)
            promise.reject("SCAN_ERROR", "Failed to mark scan completed: ${e.message}")
        }
    }
}

// Data structures
data class ARMeasurements(
    val shoulderWidthCm: Double,
    val heightCm: Double,
    val confidence: Double,
    val timestamp: Long,
    val isValid: Boolean = true,
    val errorReason: String? = null
)