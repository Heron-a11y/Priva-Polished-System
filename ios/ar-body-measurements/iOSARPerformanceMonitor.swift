//
//  iOSARPerformanceMonitor.swift
//  ar-body-measurements
//
//  Enhanced iOS AR Performance Monitoring
//  Copyright © 2024 AR Body Measurements. All rights reserved.
//

import Foundation
import ARKit
import CoreMotion
import os.lock
import os

@objc(iOSARPerformanceMonitor)
class iOSARPerformanceMonitor: NSObject {
    
    // MARK: - iOS Performance Monitoring
    
    private var isMonitoring = false
    private var performanceMetrics: [String: Any] = [:]
    private var frameRateHistory: [Double] = []
    private var memoryUsageHistory: [Double] = []
    private var thermalStateHistory: [Int] = []
    private var batteryLevelHistory: [Double] = []
    
    // MARK: - iOS Device Capabilities
    
    private var deviceModel: String = ""
    private var performanceTier: String = ""
    private var maxFrameRate: Int = 60
    private var maxMemoryUsage: Double = 0.8
    
    // MARK: - iOS Performance Optimization
    
    private var adaptiveQuality: Bool = true
    private var thermalThrottling: Bool = false
    private var batteryOptimization: Bool = false
    private var memoryOptimization: Bool = false
    
    // MARK: - iOS AR Session Monitoring
    
    private var arSession: ARSession?
    private var motionManager: CMMotionManager?
    private var performanceTimer: Timer?
    
    // MARK: - iOS Performance Metrics
    
    @objc
    func startPerformanceMonitoring() -> Bool {
        guard !isMonitoring else { return true }
        
        isMonitoring = true
        
        // Initialize device capabilities
        detectDeviceCapabilities()
        
        // Start performance monitoring
        startPerformanceTimer()
        
        // Start motion monitoring
        startMotionMonitoring()
        
        // Start thermal monitoring
        startThermalMonitoring()
        
        // Start battery monitoring
        startBatteryMonitoring()
        
        print("iOSARPerformanceMonitor: Performance monitoring started")
        return true
    }
    
    @objc
    func stopPerformanceMonitoring() {
        guard isMonitoring else { return }
        
        isMonitoring = false
        
        // Stop performance timer
        performanceTimer?.invalidate()
        performanceTimer = nil
        
        // Stop motion monitoring
        motionManager?.stopDeviceMotionUpdates()
        motionManager?.stopAccelerometerUpdates()
        motionManager?.stopGyroUpdates()
        
        print("iOSARPerformanceMonitor: Performance monitoring stopped")
    }
    
    @objc
    func getPerformanceMetrics() -> [String: Any] {
        return [
            "isMonitoring": isMonitoring,
            "deviceModel": deviceModel,
            "performanceTier": performanceTier,
            "maxFrameRate": maxFrameRate,
            "maxMemoryUsage": maxMemoryUsage,
            "adaptiveQuality": adaptiveQuality,
            "thermalThrottling": thermalThrottling,
            "batteryOptimization": batteryOptimization,
            "memoryOptimization": memoryOptimization,
            "currentFrameRate": getCurrentFrameRate(),
            "currentMemoryUsage": getCurrentMemoryUsage(),
            "currentThermalState": getCurrentThermalState(),
            "currentBatteryLevel": getCurrentBatteryLevel(),
            "performanceHistory": [
                "frameRate": frameRateHistory,
                "memoryUsage": memoryUsageHistory,
                "thermalState": thermalStateHistory,
                "batteryLevel": batteryLevelHistory
            ]
        ]
    }
    
    // MARK: - iOS Device Capabilities Detection
    
    private func detectDeviceCapabilities() {
        deviceModel = getDeviceModel()
        
        // Enhanced device capability detection
        if deviceModel.contains("iPhone 16 Pro") || deviceModel.contains("iPhone 15 Pro") {
            performanceTier = "ultra-high"
            maxFrameRate = 120
            maxMemoryUsage = 0.9
        } else if deviceModel.contains("iPhone 14 Pro") || deviceModel.contains("iPhone 13 Pro") {
            performanceTier = "high"
            maxFrameRate = 60
            maxMemoryUsage = 0.8
        } else if deviceModel.contains("iPhone 12 Pro") || deviceModel.contains("iPhone 11 Pro") {
            performanceTier = "medium-high"
            maxFrameRate = 60
            maxMemoryUsage = 0.7
        } else if deviceModel.contains("iPhone 11") || deviceModel.contains("iPhone X") {
            performanceTier = "medium"
            maxFrameRate = 30
            maxMemoryUsage = 0.6
        } else {
            performanceTier = "low"
            maxFrameRate = 30
            maxMemoryUsage = 0.5
        }
        
        print("iOSARPerformanceMonitor: Device capabilities detected - \(deviceModel), tier: \(performanceTier)")
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
    
    // MARK: - iOS Performance Monitoring
    
    private func startPerformanceTimer() {
        performanceTimer = Timer.scheduledTimer(withTimeInterval: 1.0, repeats: true) { [weak self] _ in
            self?.updatePerformanceMetrics()
        }
    }
    
    private func updatePerformanceMetrics() {
        // Update frame rate
        let currentFrameRate = getCurrentFrameRate()
        frameRateHistory.append(currentFrameRate)
        if frameRateHistory.count > 60 { // Keep last 60 seconds
            frameRateHistory.removeFirst()
        }
        
        // Update memory usage
        let currentMemoryUsage = getCurrentMemoryUsage()
        memoryUsageHistory.append(currentMemoryUsage)
        if memoryUsageHistory.count > 60 {
            memoryUsageHistory.removeFirst()
        }
        
        // Update thermal state
        let currentThermalState = getCurrentThermalState()
        thermalStateHistory.append(currentThermalState)
        if thermalStateHistory.count > 60 {
            thermalStateHistory.removeFirst()
        }
        
        // Update battery level
        let currentBatteryLevel = getCurrentBatteryLevel()
        batteryLevelHistory.append(currentBatteryLevel)
        if batteryLevelHistory.count > 60 {
            batteryLevelHistory.removeFirst()
        }
        
        // Check for performance issues
        checkPerformanceIssues()
    }
    
    private func checkPerformanceIssues() {
        // Check thermal throttling
        let currentThermalState = getCurrentThermalState()
        if currentThermalState > 2 { // Serious or critical
            thermalThrottling = true
            adaptiveQuality = true
        } else {
            thermalThrottling = false
        }
        
        // Check battery optimization
        let currentBatteryLevel = getCurrentBatteryLevel()
        if currentBatteryLevel < 0.2 { // Less than 20%
            batteryOptimization = true
            adaptiveQuality = true
        } else {
            batteryOptimization = false
        }
        
        // Check memory optimization
        let currentMemoryUsage = getCurrentMemoryUsage()
        if currentMemoryUsage > maxMemoryUsage {
            memoryOptimization = true
            adaptiveQuality = true
        } else {
            memoryOptimization = false
        }
    }
    
    // MARK: - iOS Motion Monitoring
    
    private func startMotionMonitoring() {
        motionManager = CMMotionManager()
        
        if motionManager?.isDeviceMotionAvailable == true {
            motionManager?.deviceMotionUpdateInterval = 0.1
            motionManager?.startDeviceMotionUpdates()
        }
        
        if motionManager?.isAccelerometerAvailable == true {
            motionManager?.accelerometerUpdateInterval = 0.1
            motionManager?.startAccelerometerUpdates()
        }
        
        if motionManager?.isGyroAvailable == true {
            motionManager?.gyroUpdateInterval = 0.1
            motionManager?.startGyroUpdates()
        }
    }
    
    // MARK: - iOS Thermal Monitoring
    
    private func startThermalMonitoring() {
        // Monitor thermal state changes
        NotificationCenter.default.addObserver(
            self,
            selector: #selector(thermalStateChanged),
            name: ProcessInfo.thermalStateDidChangeNotification,
            object: nil
        )
    }
    
    @objc
    private func thermalStateChanged() {
        let thermalState = ProcessInfo.processInfo.thermalState
        print("iOSARPerformanceMonitor: Thermal state changed to \(thermalState.rawValue)")
        
        // Adjust performance based on thermal state
        switch thermalState {
        case .nominal:
            adaptiveQuality = false
        case .fair:
            adaptiveQuality = true
        case .serious:
            adaptiveQuality = true
            thermalThrottling = true
        case .critical:
            adaptiveQuality = true
            thermalThrottling = true
        @unknown default:
            adaptiveQuality = true
        }
    }
    
    // MARK: - iOS Battery Monitoring
    
    private func startBatteryMonitoring() {
        // Monitor battery level changes
        NotificationCenter.default.addObserver(
            self,
            selector: #selector(batteryLevelChanged),
            name: UIDevice.batteryLevelDidChangeNotification,
            object: nil
        )
        
        // Enable battery monitoring
        UIDevice.current.isBatteryMonitoringEnabled = true
    }
    
    @objc
    private func batteryLevelChanged() {
        let batteryLevel = UIDevice.current.batteryLevel
        print("iOSARPerformanceMonitor: Battery level changed to \(batteryLevel)")
        
        // Adjust performance based on battery level
        if batteryLevel < 0.2 {
            batteryOptimization = true
            adaptiveQuality = true
        } else if batteryLevel > 0.5 {
            batteryOptimization = false
        }
    }
    
    // MARK: - iOS Performance Metrics
    
    private func getCurrentFrameRate() -> Double {
        // Calculate current frame rate
        if frameRateHistory.count < 2 {
            return Double(maxFrameRate)
        }
        
        let recentFrames = Array(frameRateHistory.suffix(10))
        return recentFrames.reduce(0, +) / Double(recentFrames.count)
    }
    
    private func getCurrentMemoryUsage() -> Double {
        // Get current memory usage
        let memoryInfo = mach_task_basic_info()
        var count = mach_msg_type_number_t(MemoryLayout<mach_task_basic_info>.size)/4
        
        let kerr: kern_return_t = withUnsafeMutablePointer(to: &memoryInfo) {
            $0.withMemoryRebound(to: integer_t.self, capacity: 1) {
                task_info(mach_task_self_,
                         task_flavor_t(MACH_TASK_BASIC_INFO),
                         $0,
                         &count)
            }
        }
        
        if kerr == KERN_SUCCESS {
            return Double(memoryInfo.resident_size) / Double(1024 * 1024 * 1024) // Convert to GB
        }
        
        return 0.0
    }
    
    private func getCurrentThermalState() -> Int {
        return ProcessInfo.processInfo.thermalState.rawValue
    }
    
    private func getCurrentBatteryLevel() -> Double {
        return Double(UIDevice.current.batteryLevel)
    }
    
    // MARK: - iOS Performance Optimization
    
    @objc
    func optimizePerformance() -> [String: Any] {
        var optimizations: [String: Any] = [:]
        
        // Thermal optimization
        if thermalThrottling {
            optimizations["thermal"] = [
                "enabled": true,
                "adaptiveQuality": true,
                "reducedFrameRate": true
            ]
        }
        
        // Battery optimization
        if batteryOptimization {
            optimizations["battery"] = [
                "enabled": true,
                "adaptiveQuality": true,
                "reducedProcessing": true
            ]
        }
        
        // Memory optimization
        if memoryOptimization {
            optimizations["memory"] = [
                "enabled": true,
                "adaptiveQuality": true,
                "reducedHistory": true
            ]
        }
        
        // Device-specific optimization
        optimizations["device"] = [
            "model": deviceModel,
            "tier": performanceTier,
            "maxFrameRate": maxFrameRate,
            "maxMemoryUsage": maxMemoryUsage
        ]
        
        return optimizations
    }
    
    // MARK: - iOS Performance Recommendations
    
    @objc
    func getPerformanceRecommendations() -> [String: Any] {
        var recommendations: [String: Any] = [:]
        
        // Frame rate recommendations
        let avgFrameRate = frameRateHistory.isEmpty ? 0 : frameRateHistory.reduce(0, +) / Double(frameRateHistory.count)
        if avgFrameRate < Double(maxFrameRate) * 0.8 {
            recommendations["frameRate"] = [
                "issue": "Low frame rate detected",
                "recommendation": "Reduce AR quality or enable adaptive quality",
                "action": "Enable adaptive quality"
            ]
        }
        
        // Memory recommendations
        let avgMemoryUsage = memoryUsageHistory.isEmpty ? 0 : memoryUsageHistory.reduce(0, +) / Double(memoryUsageHistory.count)
        if avgMemoryUsage > maxMemoryUsage {
            recommendations["memory"] = [
                "issue": "High memory usage detected",
                "recommendation": "Reduce memory footprint or enable memory optimization",
                "action": "Enable memory optimization"
            ]
        }
        
        // Thermal recommendations
        let currentThermalState = getCurrentThermalState()
        if currentThermalState > 1 {
            recommendations["thermal"] = [
                "issue": "High thermal state detected",
                "recommendation": "Reduce processing load or enable thermal throttling",
                "action": "Enable thermal throttling"
            ]
        }
        
        // Battery recommendations
        let currentBatteryLevel = getCurrentBatteryLevel()
        if currentBatteryLevel < 0.3 {
            recommendations["battery"] = [
                "issue": "Low battery level detected",
                "recommendation": "Reduce processing load or enable battery optimization",
                "action": "Enable battery optimization"
            ]
        }
        
        return recommendations
    }
    
    deinit {
        stopPerformanceMonitoring()
        NotificationCenter.default.removeObserver(self)
    }
}

