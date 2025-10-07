package com.fitform.app

import android.content.Context
import android.graphics.Bitmap
import android.util.Log
import org.tensorflow.lite.Interpreter
import org.tensorflow.lite.support.common.FileUtil
import org.tensorflow.lite.support.image.ImageProcessor
import org.tensorflow.lite.support.image.TensorImage
import org.tensorflow.lite.support.image.ops.ResizeOp
import java.nio.ByteBuffer
import java.nio.ByteOrder
import java.nio.FloatBuffer

/**
 * TensorFlow Lite Manager for ML-based pose estimation
 * Integrates with ARCore for enhanced body tracking
 */
class TensorFlowLiteManager(private val context: Context) {
    
    companion object {
        private const val TAG = "TensorFlowLiteManager"
        private const val MODEL_FILENAME = "pose_estimation_model.tflite"
        private const val INPUT_SIZE = 192
        private const val NUM_KEYPOINTS = 17
        private const val NUM_VALUES_PER_KEYPOINT = 3 // x, y, confidence
    }
    
    private var interpreter: Interpreter? = null
    private var isInitialized = false
    
    // Input and output buffers
    private var inputBuffer: ByteBuffer? = null
    private var outputBuffer: FloatBuffer? = null
    
    // Image processor for preprocessing
    private val imageProcessor = ImageProcessor.Builder()
        .add(ResizeOp(INPUT_SIZE, INPUT_SIZE, ResizeOp.ResizeMethod.BILINEAR))
        .build()
    
    /**
     * Initialize TensorFlow Lite interpreter with the pose estimation model
     */
    fun initialize(): Boolean {
        return try {
            Log.d(TAG, "Initializing TensorFlow Lite interpreter...")
            
            // Load the model from assets
            val modelBuffer = FileUtil.loadMappedFile(context, MODEL_FILENAME)
            
            // Create interpreter options
            val options = Interpreter.Options().apply {
                setNumThreads(4) // Use 4 threads for better performance
                setUseNNAPI(true) // Enable Neural Networks API if available
            }
            
            // Initialize interpreter
            interpreter = Interpreter(modelBuffer, options)
            
            // Prepare input and output buffers
            inputBuffer = ByteBuffer.allocateDirect(INPUT_SIZE * INPUT_SIZE * 3 * 4) // 4 bytes per float
            inputBuffer?.order(ByteOrder.nativeOrder())
            
            outputBuffer = ByteBuffer.allocateDirect(NUM_KEYPOINTS * NUM_VALUES_PER_KEYPOINT * 4)
            outputBuffer?.order(ByteOrder.nativeOrder())
            
            isInitialized = true
            Log.d(TAG, "TensorFlow Lite interpreter initialized successfully")
            true
            
        } catch (e: Exception) {
            Log.e(TAG, "Failed to initialize TensorFlow Lite interpreter", e)
            false
        }
    }
    
    /**
     * Process camera frame for pose estimation
     * @param bitmap Camera frame as bitmap
     * @return Array of pose keypoints with confidence scores
     */
    fun estimatePose(bitmap: Bitmap): Array<FloatArray>? {
        if (!isInitialized || interpreter == null) {
            Log.w(TAG, "TensorFlow Lite not initialized")
            return null
        }
        
        return try {
            // Preprocess image
            val tensorImage = TensorImage.fromBitmap(bitmap)
            val processedImage = imageProcessor.process(tensorImage)
            
            // Prepare input
            inputBuffer?.clear()
            processedImage.buffer?.let { buffer ->
                inputBuffer?.put(buffer)
            }
            
            // Run inference
            interpreter?.run(inputBuffer, outputBuffer)
            
            // Parse output
            val keypoints = parseKeypoints()
            Log.d(TAG, "Pose estimation completed: ${keypoints.size} keypoints detected")
            keypoints
            
        } catch (e: Exception) {
            Log.e(TAG, "Error during pose estimation", e)
            null
        }
    }
    
    /**
     * Parse keypoints from model output
     */
    private fun parseKeypoints(): Array<FloatArray> {
        val keypoints = Array(NUM_KEYPOINTS) { FloatArray(NUM_VALUES_PER_KEYPOINT) }
        
        outputBuffer?.rewind()
        for (i in 0 until NUM_KEYPOINTS) {
            keypoints[i][0] = outputBuffer?.float ?: 0f // x coordinate
            keypoints[i][1] = outputBuffer?.float ?: 0f // y coordinate  
            keypoints[i][2] = outputBuffer?.float ?: 0f // confidence score
        }
        
        return keypoints
    }
    
    /**
     * Calculate body measurements from pose keypoints
     */
    fun calculateBodyMeasurements(keypoints: Array<FloatArray>): BodyMeasurements {
        val measurements = BodyMeasurements()
        
        try {
            // Calculate shoulder width
            val leftShoulder = keypoints[5]  // left_shoulder
            val rightShoulder = keypoints[6] // right_shoulder
            if (leftShoulder[2] > 0.5f && rightShoulder[2] > 0.5f) {
                val shoulderWidth = calculateDistance(leftShoulder, rightShoulder)
                measurements.shoulderWidth = shoulderWidth
            }
            
            // Calculate height
            val nose = keypoints[0]         // nose
            val leftAnkle = keypoints[15]   // left_ankle
            val rightAnkle = keypoints[16]  // right_ankle
            
            if (nose[2] > 0.5f && (leftAnkle[2] > 0.5f || rightAnkle[2] > 0.5f)) {
                val ankleY = if (leftAnkle[2] > rightAnkle[2]) leftAnkle[1] else rightAnkle[1]
                val height = Math.abs(nose[1] - ankleY)
                measurements.height = height
            }
            
            // Calculate confidence based on keypoint visibility
            val visibleKeypoints = keypoints.count { it[2] > 0.5f }
            measurements.confidence = visibleKeypoints.toFloat() / NUM_KEYPOINTS
            
        } catch (e: Exception) {
            Log.e(TAG, "Error calculating body measurements", e)
        }
        
        return measurements
    }
    
    /**
     * Calculate distance between two keypoints
     */
    private fun calculateDistance(point1: FloatArray, point2: FloatArray): Float {
        val dx = point1[0] - point2[0]
        val dy = point1[1] - point2[1]
        return Math.sqrt((dx * dx + dy * dy).toDouble()).toFloat()
    }
    
    /**
     * Clean up resources
     */
    fun cleanup() {
        try {
            interpreter?.close()
            interpreter = null
            isInitialized = false
            Log.d(TAG, "TensorFlow Lite resources cleaned up")
        } catch (e: Exception) {
            Log.e(TAG, "Error during cleanup", e)
        }
    }
    
    /**
     * Check if TensorFlow Lite is ready for use
     */
    fun isReady(): Boolean = isInitialized && interpreter != null
}

/**
 * Data class for body measurements from ML model
 */
data class BodyMeasurements(
    var shoulderWidth: Float = 0f,
    var height: Float = 0f,
    var confidence: Float = 0f,
    var timestamp: Long = System.currentTimeMillis()
)
