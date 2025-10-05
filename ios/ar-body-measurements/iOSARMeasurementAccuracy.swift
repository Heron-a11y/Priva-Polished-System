//
//  iOSARMeasurementAccuracy.swift
//  ar-body-measurements
//
//  Enhanced iOS AR Measurement Accuracy
//  Copyright © 2024 AR Body Measurements. All rights reserved.
//

import Foundation
import ARKit
import CoreMotion
import Vision
import CoreML
import os.lock

@objc(iOSARMeasurementAccuracy)
class iOSARMeasurementAccuracy: NSObject {
    
    // MARK: - iOS Measurement Accuracy
    
    private var measurementHistory: [MeasurementData] = []
    private var accuracyMetrics: AccuracyMetrics = AccuracyMetrics()
    private var calibrationData: CalibrationData?
    private var deviceCapabilities: DeviceCapabilities?
    
    // MARK: - iOS ARKit 6.0 Enhancements
    
    private var supportsARKit6: Bool = false
    private var supportsBodyTracking3D: Bool = false
    private var supportsHandTracking: Bool = false
    private var supportsFaceTracking: Bool = false
    
    // MARK: - iOS Measurement Validation
    
    private var validationRules: [ValidationRule] = []
    private var accuracyThresholds: AccuracyThresholds = AccuracyThresholds()
    private var measurementCorrections: [MeasurementCorrection] = []
    
    // MARK: - iOS Device-Specific Accuracy
    
    private var deviceModel: String = ""
    private var accuracyTier: String = ""
    private var recommendedAccuracy: Double = 0.95
    
    // MARK: - iOS AR Session Accuracy
    
    private var arSession: ARSession?
    private var bodyTrackingConfig: ARBodyTrackingConfiguration?
    private var worldTrackingConfig: ARWorldTrackingConfiguration?
    
    // MARK: - iOS Measurement Accuracy Initialization
    
    @objc
    func initializeMeasurementAccuracy() -> Bool {
        // Detect device capabilities
        detectDeviceCapabilities()
        
        // Initialize ARKit 6.0 features
        initializeARKit6Features()
        
        // Setup validation rules
        setupValidationRules()
        
        // Setup accuracy thresholds
        setupAccuracyThresholds()
        
        // Initialize measurement history
        measurementHistory = []
        
        print("iOSARMeasurementAccuracy: Measurement accuracy initialized")
        return true
    }
    
    // MARK: - iOS Device Capabilities Detection
    
    private func detectDeviceCapabilities() {
        deviceModel = getDeviceModel()
        
        // Enhanced device capability detection
        if deviceModel.contains("iPhone 16 Pro") || deviceModel.contains("iPhone 15 Pro") {
            accuracyTier = "ultra-high"
            recommendedAccuracy = 0.98
        } else if deviceModel.contains("iPhone 14 Pro") || deviceModel.contains("iPhone 13 Pro") {
            accuracyTier = "high"
            recommendedAccuracy = 0.95
        } else if deviceModel.contains("iPhone 12 Pro") || deviceModel.contains("iPhone 11 Pro") {
            accuracyTier = "medium-high"
            recommendedAccuracy = 0.92
        } else if deviceModel.contains("iPhone 11") || deviceModel.contains("iPhone X") {
            accuracyTier = "medium"
            recommendedAccuracy = 0.88
        } else {
            accuracyTier = "low"
            recommendedAccuracy = 0.85
        }
        
        print("iOSARMeasurementAccuracy: Device capabilities detected - \(deviceModel), tier: \(accuracyTier)")
    }
    
    private func getDeviceModel() -> String {
        var systemInfo = utsname()
        uname(&systemInfo)
        let modelCode = String(bytes: Data(bytes: &systemInfo.machine, count: Int(_SYS_NAMELEN)), encoding: .ascii)?.trimmingCharacters(in: .whitespacesAndNewlines) ?? "Unknown"
        
        // Enhanced device model detection
        switch modelCode {
        case let code where code.hasPrefix("iPhone16,"):
            return "iPhone 16 Pro"
        case let code where code.hasPrefix("iPhone15,"):
            return "iPhone 15 Pro"
        case let code where code.hasPrefix("iPhone14,"):
            return "iPhone 14 Pro"
        case let code where code.hasPrefix("iPhone13,"):
            return "iPhone 13 Pro"
        case let code where code.hasPrefix("iPhone12,"):
            return "iPhone 12 Pro"
        case let code where code.hasPrefix("iPhone11,"):
            return "iPhone 11 Pro"
        case let code where code.hasPrefix("iPhone10,"):
            return "iPhone X"
        case let code where code.hasPrefix("iPad"):
            return "iPad Pro"
        default:
            return "iPhone 13"
        }
    }
    
    // MARK: - iOS ARKit 6.0 Features
    
    private func initializeARKit6Features() {
        if #available(iOS 17.0, *) {
            supportsARKit6 = true
            supportsBodyTracking3D = true
            supportsHandTracking = true
            supportsFaceTracking = true
            
            print("iOSARMeasurementAccuracy: ARKit 6.0 features enabled")
        } else {
            supportsARKit6 = false
            supportsBodyTracking3D = false
            supportsHandTracking = false
            supportsFaceTracking = false
            
            print("iOSARMeasurementAccuracy: ARKit 6.0 features not available")
        }
    }
    
    // MARK: - iOS Validation Rules
    
    private func setupValidationRules() {
        validationRules = [
            ValidationRule(
                name: "shoulderWidth",
                minValue: 25.0,
                maxValue: 70.0,
                optimalMin: 30.0,
                optimalMax: 60.0,
                accuracyWeight: 0.3
            ),
            ValidationRule(
                name: "height",
                minValue: 100.0,
                maxValue: 250.0,
                optimalMin: 120.0,
                optimalMax: 220.0,
                accuracyWeight: 0.4
            ),
            ValidationRule(
                name: "bodyProportions",
                minValue: 2.0,
                maxValue: 5.0,
                optimalMin: 2.5,
                optimalMax: 4.0,
                accuracyWeight: 0.3
            )
        ]
    }
    
    private func setupAccuracyThresholds() {
        accuracyThresholds = AccuracyThresholds(
            excellent: 0.95,
            good: 0.85,
            fair: 0.75,
            poor: 0.65
        )
    }
    
    // MARK: - iOS Measurement Processing
    
    @objc
    func processMeasurement(_ measurement: [String: Any]) -> [String: Any] {
        // Create measurement data
        let measurementData = MeasurementData(
            timestamp: Date().timeIntervalSince1970,
            shoulderWidth: measurement["shoulderWidth"] as? Double ?? 0.0,
            height: measurement["height"] as? Double ?? 0.0,
            confidence: measurement["confidence"] as? Double ?? 0.0,
            deviceModel: deviceModel,
            accuracyTier: accuracyTier
        )
        
        // Add to history
        measurementHistory.append(measurementData)
        if measurementHistory.count > 100 { // Keep last 100 measurements
            measurementHistory.removeFirst()
        }
        
        // Validate measurement
        let validation = validateMeasurement(measurementData)
        
        // Apply corrections if needed
        let correctedMeasurement = applyCorrections(measurementData, validation.corrections)
        
        // Calculate accuracy metrics
        updateAccuracyMetrics()
        
        // Return enhanced measurement
        return [
            "original": measurement,
            "corrected": [
                "shoulderWidth": correctedMeasurement.shoulderWidth,
                "height": correctedMeasurement.height,
                "confidence": correctedMeasurement.confidence
            ],
            "validation": [
                "isValid": validation.isValid,
                "accuracy": validation.accuracy,
                "quality": validation.quality,
                "corrections": validation.corrections.map { $0.toDictionary() }
            ],
            "metrics": [
                "averageAccuracy": accuracyMetrics.averageAccuracy,
                "consistencyScore": accuracyMetrics.consistencyScore,
                "outlierRate": accuracyMetrics.outlierRate,
                "temporalStability": accuracyMetrics.temporalStability
            ]
        ]
    }
    
    // MARK: - iOS Measurement Validation
    
    private func validateMeasurement(_ measurement: MeasurementData) -> ValidationResult {
        var isValid = true
        var accuracy = 0.0
        var quality = "poor"
        var corrections: [MeasurementCorrection] = []
        
        // Validate shoulder width
        let shoulderValidation = validateShoulderWidth(measurement.shoulderWidth)
        if !shoulderValidation.isValid {
            isValid = false
            if let correction = shoulderValidation.correction {
                corrections.append(correction)
            }
        }
        
        // Validate height
        let heightValidation = validateHeight(measurement.height)
        if !heightValidation.isValid {
            isValid = false
            if let correction = heightValidation.correction {
                corrections.append(correction)
            }
        }
        
        // Validate body proportions
        let proportionValidation = validateBodyProportions(measurement.shoulderWidth, measurement.height)
        if !proportionValidation.isValid {
            isValid = false
            corrections.append(contentsOf: proportionValidation.corrections)
        }
        
        // Calculate accuracy
        accuracy = calculateAccuracy(measurement, corrections)
        
        // Determine quality
        if accuracy >= accuracyThresholds.excellent {
            quality = "excellent"
        } else if accuracy >= accuracyThresholds.good {
            quality = "good"
        } else if accuracy >= accuracyThresholds.fair {
            quality = "fair"
        } else {
            quality = "poor"
        }
        
        return ValidationResult(
            isValid: isValid,
            accuracy: accuracy,
            quality: quality,
            corrections: corrections
        )
    }
    
    private func validateShoulderWidth(_ width: Double) -> (isValid: Bool, correction: MeasurementCorrection?) {
        let rule = validationRules.first { $0.name == "shoulderWidth" }!
        
        if width < rule.minValue || width > rule.maxValue {
            let correction = MeasurementCorrection(
                type: "scale",
                value: width < rule.minValue ? rule.optimalMin : rule.optimalMax,
                reason: "Shoulder width out of range",
                confidence: 0.8
            )
            return (false, correction)
        }
        
        return (true, nil)
    }
    
    private func validateHeight(_ height: Double) -> (isValid: Bool, correction: MeasurementCorrection?) {
        let rule = validationRules.first { $0.name == "height" }!
        
        if height < rule.minValue || height > rule.maxValue {
            let correction = MeasurementCorrection(
                type: "scale",
                value: height < rule.minValue ? rule.optimalMin : rule.optimalMax,
                reason: "Height out of range",
                confidence: 0.8
            )
            return (false, correction)
        }
        
        return (true, nil)
    }
    
    private func validateBodyProportions(_ shoulderWidth: Double, _ height: Double) -> (isValid: Bool, corrections: [MeasurementCorrection]) {
        let rule = validationRules.first { $0.name == "bodyProportions" }!
        let ratio = height / shoulderWidth
        var corrections: [MeasurementCorrection] = []
        
        if ratio < rule.minValue || ratio > rule.maxValue {
            let correction = MeasurementCorrection(
                type: "proportional",
                value: ratio < rule.minValue ? rule.optimalMin : rule.optimalMax,
                reason: "Body proportions out of range",
                confidence: 0.7
            )
            corrections.append(correction)
        }
        
        return (ratio >= rule.minValue && ratio <= rule.maxValue, corrections)
    }
    
    // MARK: - iOS Accuracy Calculation
    
    private func calculateAccuracy(_ measurement: MeasurementData, _ corrections: [MeasurementCorrection]) -> Double {
        var accuracy = measurement.confidence
        
        // Apply device-specific accuracy
        accuracy *= recommendedAccuracy
        
        // Apply correction penalties
        for correction in corrections {
            accuracy *= correction.confidence
        }
        
        // Apply temporal consistency
        if measurementHistory.count > 1 {
            let temporalConsistency = calculateTemporalConsistency()
            accuracy *= temporalConsistency
        }
        
        return min(1.0, max(0.0, accuracy))
    }
    
    private func calculateTemporalConsistency() -> Double {
        guard measurementHistory.count > 1 else { return 1.0 }
        
        let recentMeasurements = Array(measurementHistory.suffix(5))
        let shoulderWidths = recentMeasurements.map { $0.shoulderWidth }
        let heights = recentMeasurements.map { $0.height }
        
        let shoulderVariance = calculateVariance(shoulderWidths)
        let heightVariance = calculateVariance(heights)
        
        let consistency = 1.0 - min(1.0, (shoulderVariance + heightVariance) / 100.0)
        return max(0.0, consistency)
    }
    
    private func calculateVariance(_ values: [Double]) -> Double {
        guard values.count > 1 else { return 0.0 }
        
        let mean = values.reduce(0, +) / Double(values.count)
        let squaredDiffs = values.map { pow($0 - mean, 2) }
        return squaredDiffs.reduce(0, +) / Double(squaredDiffs.count)
    }
    
    // MARK: - iOS Measurement Corrections
    
    private func applyCorrections(_ measurement: MeasurementData, _ corrections: [MeasurementCorrection]) -> MeasurementData {
        var correctedMeasurement = measurement
        
        for correction in corrections {
            switch correction.type {
            case "scale":
                if correction.reason.contains("shoulder") {
                    correctedMeasurement.shoulderWidth = correction.value
                } else if correction.reason.contains("height") {
                    correctedMeasurement.height = correction.value
                }
            case "proportional":
                // Apply proportional correction
                let ratio = correction.value
                correctedMeasurement.height = correctedMeasurement.shoulderWidth * ratio
            default:
                break
            }
        }
        
        return correctedMeasurement
    }
    
    // MARK: - iOS Accuracy Metrics
    
    private func updateAccuracyMetrics() {
        guard measurementHistory.count > 0 else { return }
        
        let accuracies = measurementHistory.map { $0.confidence }
        accuracyMetrics.averageAccuracy = accuracies.reduce(0, +) / Double(accuracies.count)
        
        accuracyMetrics.consistencyScore = calculateTemporalConsistency()
        
        accuracyMetrics.outlierRate = calculateOutlierRate()
        
        accuracyMetrics.temporalStability = calculateTemporalStability()
    }
    
    private func calculateOutlierRate() -> Double {
        guard measurementHistory.count > 5 else { return 0.0 }
        
        let recentMeasurements = Array(measurementHistory.suffix(10))
        let shoulderWidths = recentMeasurements.map { $0.shoulderWidth }
        let heights = recentMeasurements.map { $0.height }
        
        let shoulderMean = shoulderWidths.reduce(0, +) / Double(shoulderWidths.count)
        let heightMean = heights.reduce(0, +) / Double(heights.count)
        
        let shoulderStdDev = sqrt(calculateVariance(shoulderWidths))
        let heightStdDev = sqrt(calculateVariance(heights))
        
        var outliers = 0
        for measurement in recentMeasurements {
            let shoulderZ = abs(measurement.shoulderWidth - shoulderMean) / shoulderStdDev
            let heightZ = abs(measurement.height - heightMean) / heightStdDev
            
            if shoulderZ > 2.0 || heightZ > 2.0 {
                outliers += 1
            }
        }
        
        return Double(outliers) / Double(recentMeasurements.count)
    }
    
    private func calculateTemporalStability() -> Double {
        guard measurementHistory.count > 3 else { return 1.0 }
        
        let recentMeasurements = Array(measurementHistory.suffix(5))
        let shoulderWidths = recentMeasurements.map { $0.shoulderWidth }
        let heights = recentMeasurements.map { $0.height }
        
        let shoulderStability = 1.0 - min(1.0, calculateVariance(shoulderWidths) / 50.0)
        let heightStability = 1.0 - min(1.0, calculateVariance(heights) / 100.0)
        
        return (shoulderStability + heightStability) / 2.0
    }
    
    // MARK: - iOS Measurement Accuracy API
    
    @objc
    func getAccuracyMetrics() -> [String: Any] {
        return [
            "averageAccuracy": accuracyMetrics.averageAccuracy,
            "consistencyScore": accuracyMetrics.consistencyScore,
            "outlierRate": accuracyMetrics.outlierRate,
            "temporalStability": accuracyMetrics.temporalStability,
            "deviceModel": deviceModel,
            "accuracyTier": accuracyTier,
            "recommendedAccuracy": recommendedAccuracy,
            "supportsARKit6": supportsARKit6,
            "supportsBodyTracking3D": supportsBodyTracking3D,
            "supportsHandTracking": supportsHandTracking,
            "supportsFaceTracking": supportsFaceTracking
        ]
    }
    
    @objc
    func getMeasurementHistory() -> [String: Any] {
        return [
            "count": measurementHistory.count,
            "recentMeasurements": measurementHistory.suffix(10).map { $0.toDictionary() },
            "accuracyTrend": calculateAccuracyTrend()
        ]
    }
    
    private func calculateAccuracyTrend() -> String {
        guard measurementHistory.count > 5 else { return "stable" }
        
        let recentMeasurements = Array(measurementHistory.suffix(5))
        let olderMeasurements = Array(measurementHistory.suffix(10).prefix(5))
        
        let recentAccuracy = recentMeasurements.map { $0.confidence }.reduce(0, +) / Double(recentMeasurements.count)
        let olderAccuracy = olderMeasurements.map { $0.confidence }.reduce(0, +) / Double(olderMeasurements.count)
        
        if recentAccuracy > olderAccuracy * 1.05 {
            return "improving"
        } else if recentAccuracy < olderAccuracy * 0.95 {
            return "declining"
        } else {
            return "stable"
        }
    }
}

// MARK: - iOS Data Structures

struct MeasurementData {
    let timestamp: Double
    let shoulderWidth: Double
    let height: Double
    let confidence: Double
    let deviceModel: String
    let accuracyTier: String
    
    func toDictionary() -> [String: Any] {
        return [
            "timestamp": timestamp,
            "shoulderWidth": shoulderWidth,
            "height": height,
            "confidence": confidence,
            "deviceModel": deviceModel,
            "accuracyTier": accuracyTier
        ]
    }
}

struct AccuracyMetrics {
    var averageAccuracy: Double = 0.0
    var consistencyScore: Double = 0.0
    var outlierRate: Double = 0.0
    var temporalStability: Double = 0.0
}

struct CalibrationData {
    let timestamp: Double
    let scaleFactor: Double
    let confidence: Double
    let deviceModel: String
}

struct ValidationRule {
    let name: String
    let minValue: Double
    let maxValue: Double
    let optimalMin: Double
    let optimalMax: Double
    let accuracyWeight: Double
}

struct AccuracyThresholds {
    let excellent: Double
    let good: Double
    let fair: Double
    let poor: Double
}

struct MeasurementCorrection {
    let type: String
    let value: Double
    let reason: String
    let confidence: Double
    
    func toDictionary() -> [String: Any] {
        return [
            "type": type,
            "value": value,
            "reason": reason,
            "confidence": confidence
        ]
    }
}

struct ValidationResult {
    let isValid: Bool
    let accuracy: Double
    let quality: String
    let corrections: [MeasurementCorrection]
}

struct DeviceCapabilities {
    let model: String
    let tier: String
    let accuracy: Double
    let features: [String]
}

