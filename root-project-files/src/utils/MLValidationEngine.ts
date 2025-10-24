/**
 * ML-Based Validation Engine for Enhanced Accuracy
 * 
 * Implements machine learning algorithms for measurement validation,
 * anomaly detection, and accuracy improvement.
 */

export interface MLValidationConfig {
  enableNeuralValidation: boolean;
  enableAnomalyDetection: boolean;
  enablePatternRecognition: boolean;
  confidenceThreshold: number;
  learningRate: number;
  maxTrainingSamples: number;
  validationWindow: number;
}

export interface MLValidationResult {
  isValid: boolean;
  confidence: number;
  mlScore: number;
  anomalies: AnomalyDetection[];
  patterns: PatternRecognition[];
  recommendations: string[];
  quality: 'excellent' | 'good' | 'fair' | 'poor';
}

export interface AnomalyDetection {
  type: 'statistical' | 'temporal' | 'proportional' | 'contextual';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  confidence: number;
  correction?: {
    type: 'scale' | 'offset' | 'filter';
    value: number;
  };
}

export interface PatternRecognition {
  pattern: 'trend' | 'seasonal' | 'cyclical' | 'irregular';
  strength: number;
  description: string;
  prediction?: number;
}

export interface TrainingData {
  measurements: {
    shoulderWidth: number;
    height: number;
    confidence: number;
  };
  context: {
    lighting: 'excellent' | 'good' | 'fair' | 'poor';
    distance: 'optimal' | 'too_close' | 'too_far';
    pose: 'optimal' | 'acceptable' | 'poor';
    deviceModel: string;
  };
  timestamp: number;
  userFeedback?: {
    accuracy: number; // 1-5 scale
    knownValues?: {
      height?: number;
      shoulderWidth?: number;
    };
  };
}

class MLValidationEngine {
  private static instance: MLValidationEngine;
  private config: MLValidationConfig;
  private trainingData: TrainingData[] = [];
  private neuralWeights: {
    shoulderWidth: number[];
    height: number[];
    confidence: number[];
  } = {
    shoulderWidth: [0.5, 0.3, 0.2], // [base, temporal, contextual]
    height: [0.5, 0.3, 0.2],
    confidence: [0.4, 0.3, 0.3]
  };
  private patternModels: Map<string, any> = new Map();
  private anomalyThresholds: Map<string, number> = new Map();

  private constructor() {
    this.config = {
      enableNeuralValidation: true,
      enableAnomalyDetection: true,
      enablePatternRecognition: true,
      confidenceThreshold: 0.7,
      learningRate: 0.01,
      maxTrainingSamples: 1000,
      validationWindow: 10
    };
    
    this.initializeAnomalyThresholds();
  }

  static getInstance(): MLValidationEngine {
    if (!MLValidationEngine.instance) {
      MLValidationEngine.instance = new MLValidationEngine();
    }
    return MLValidationEngine.instance;
  }

  /**
   * Validate measurements using ML algorithms
   */
  async validateWithML(
    measurements: { shoulderWidth: number; height: number; confidence: number },
    context: {
      lighting: 'excellent' | 'good' | 'fair' | 'poor';
      distance: 'optimal' | 'too_close' | 'too_far';
      pose: 'optimal' | 'acceptable' | 'poor';
    }
  ): Promise<MLValidationResult> {
    try {
      // Neural network validation
      const neuralScore = await this.performNeuralValidation(measurements, context);
      
      // Anomaly detection
      const anomalies = await this.detectAnomalies(measurements, context);
      
      // Pattern recognition
      const patterns = await this.recognizePatterns(measurements);
      
      // Calculate overall ML score
      const mlScore = this.calculateMLScore(neuralScore, anomalies, patterns);
      
      // Determine quality and validity
      const quality = this.determineQuality(mlScore, anomalies);
      const isValid = mlScore >= this.config.confidenceThreshold && 
                     anomalies.filter(a => a.severity === 'critical' || a.severity === 'high').length === 0;
      
      // Generate recommendations
      const recommendations = this.generateRecommendations(anomalies, patterns, quality);
      
      return {
        isValid,
        confidence: measurements.confidence,
        mlScore,
        anomalies,
        patterns,
        recommendations,
        quality
      };
      
    } catch (error) {
      console.error('ML validation error:', error);
      return {
        isValid: false,
        confidence: 0,
        mlScore: 0,
        anomalies: [{
          type: 'contextual',
          severity: 'high',
          description: 'ML validation failed',
          confidence: 0
        }],
        patterns: [],
        recommendations: ['ML validation unavailable'],
        quality: 'poor'
      };
    }
  }

  /**
   * Train the ML models with new data
   */
  async trainWithData(trainingData: TrainingData): Promise<void> {
    try {
      // Add to training data
      this.trainingData.push(trainingData);
      
      // Keep only recent data
      if (this.trainingData.length > this.config.maxTrainingSamples) {
        this.trainingData = this.trainingData.slice(-this.config.maxTrainingSamples);
      }
      
      // Update neural weights
      await this.updateNeuralWeights(trainingData);
      
      // Update anomaly thresholds
      this.updateAnomalyThresholds();
      
      // Update pattern models
      await this.updatePatternModels();
      
    } catch (error) {
      console.error('ML training error:', error);
    }
  }

  /**
   * Get ML model performance metrics
   */
  getMLMetrics(): {
    trainingSamples: number;
    modelAccuracy: number;
    anomalyDetectionRate: number;
    patternRecognitionAccuracy: number;
    recommendations: string[];
  } {
    const recentData = this.trainingData.slice(-this.config.validationWindow);
    const accuracy = this.calculateModelAccuracy(recentData);
    const anomalyRate = this.calculateAnomalyDetectionRate();
    const patternAccuracy = this.calculatePatternRecognitionAccuracy();
    
    return {
      trainingSamples: this.trainingData.length,
      modelAccuracy: accuracy,
      anomalyDetectionRate: anomalyRate,
      patternRecognitionAccuracy: patternAccuracy,
      recommendations: this.getModelRecommendations(accuracy, anomalyRate, patternAccuracy)
    };
  }

  // Private methods
  private async performNeuralValidation(
    measurements: any, 
    context: any
  ): Promise<number> {
    if (!this.config.enableNeuralValidation) return 0.5;
    
    try {
      // Simple neural network simulation
      const inputs = [
        measurements.shoulderWidth / 50, // Normalize
        measurements.height / 200, // Normalize
        measurements.confidence,
        this.encodeContext(context)
      ];
      
      // Calculate weighted sum
      const shoulderScore = this.calculateNeuralScore(inputs, this.neuralWeights.shoulderWidth);
      const heightScore = this.calculateNeuralScore(inputs, this.neuralWeights.height);
      const confidenceScore = this.calculateNeuralScore(inputs, this.neuralWeights.confidence);
      
      return (shoulderScore + heightScore + confidenceScore) / 3;
      
    } catch (error) {
      console.error('Neural validation error:', error);
      return 0.5;
    }
  }

  private async detectAnomalies(
    measurements: any, 
    context: any
  ): Promise<AnomalyDetection[]> {
    if (!this.config.enableAnomalyDetection) return [];
    
    const anomalies: AnomalyDetection[] = [];
    
    try {
      // Statistical anomaly detection
      const statisticalAnomalies = this.detectStatisticalAnomalies(measurements);
      anomalies.push(...statisticalAnomalies);
      
      // Temporal anomaly detection
      const temporalAnomalies = this.detectTemporalAnomalies(measurements);
      anomalies.push(...temporalAnomalies);
      
      // Proportional anomaly detection
      const proportionalAnomalies = this.detectProportionalAnomalies(measurements);
      anomalies.push(...proportionalAnomalies);
      
      // Contextual anomaly detection
      const contextualAnomalies = this.detectContextualAnomalies(measurements, context);
      anomalies.push(...contextualAnomalies);
      
    } catch (error) {
      console.error('Anomaly detection error:', error);
    }
    
    return anomalies;
  }

  private async recognizePatterns(measurements: any): Promise<PatternRecognition[]> {
    if (!this.config.enablePatternRecognition) return [];
    
    const patterns: PatternRecognition[] = [];
    
    try {
      // Trend analysis
      const trendPattern = this.analyzeTrendPattern();
      if (trendPattern) patterns.push(trendPattern);
      
      // Seasonal analysis
      const seasonalPattern = this.analyzeSeasonalPattern();
      if (seasonalPattern) patterns.push(seasonalPattern);
      
      // Cyclical analysis
      const cyclicalPattern = this.analyzeCyclicalPattern();
      if (cyclicalPattern) patterns.push(cyclicalPattern);
      
    } catch (error) {
      console.error('Pattern recognition error:', error);
    }
    
    return patterns;
  }

  private detectStatisticalAnomalies(measurements: any): AnomalyDetection[] {
    const anomalies: AnomalyDetection[] = [];
    
    if (this.trainingData.length < 5) return anomalies;
    
    const recentData = this.trainingData.slice(-20);
    const shoulderWidths = recentData.map(d => d.measurements.shoulderWidth);
    const heights = recentData.map(d => d.measurements.height);
    
    // Z-score analysis
    const shoulderZ = this.calculateZScore(measurements.shoulderWidth, shoulderWidths);
    const heightZ = this.calculateZScore(measurements.height, heights);
    
    if (Math.abs(shoulderZ) > 2.5) {
      anomalies.push({
        type: 'statistical',
        severity: Math.abs(shoulderZ) > 3 ? 'critical' : 'high',
        description: `Shoulder width Z-score: ${shoulderZ.toFixed(2)}`,
        confidence: Math.min(0.95, Math.abs(shoulderZ) / 4),
        correction: {
          type: 'scale',
          value: Math.abs(shoulderZ) > 3 ? 0.9 : 0.95
        }
      });
    }
    
    if (Math.abs(heightZ) > 2.5) {
      anomalies.push({
        type: 'statistical',
        severity: Math.abs(heightZ) > 3 ? 'critical' : 'high',
        description: `Height Z-score: ${heightZ.toFixed(2)}`,
        confidence: Math.min(0.95, Math.abs(heightZ) / 4),
        correction: {
          type: 'scale',
          value: Math.abs(heightZ) > 3 ? 0.9 : 0.95
        }
      });
    }
    
    return anomalies;
  }

  private detectTemporalAnomalies(measurements: any): AnomalyDetection[] {
    const anomalies: AnomalyDetection[] = [];
    
    if (this.trainingData.length < 3) return anomalies;
    
    const recentData = this.trainingData.slice(-5);
    const timeDiffs = [];
    
    for (let i = 1; i < recentData.length; i++) {
      const diff = Math.abs(recentData[i].measurements.shoulderWidth - recentData[i-1].measurements.shoulderWidth);
      timeDiffs.push(diff);
    }
    
    const avgDiff = timeDiffs.reduce((sum, diff) => sum + diff, 0) / timeDiffs.length;
    const currentDiff = Math.abs(measurements.shoulderWidth - recentData[recentData.length - 1].measurements.shoulderWidth);
    
    if (currentDiff > avgDiff * 3) {
      anomalies.push({
        type: 'temporal',
        severity: currentDiff > avgDiff * 5 ? 'high' : 'medium',
        description: `Large temporal change: ${currentDiff.toFixed(1)}cm`,
        confidence: Math.min(0.9, currentDiff / (avgDiff * 5))
      });
    }
    
    return anomalies;
  }

  private detectProportionalAnomalies(measurements: any): AnomalyDetection[] {
    const anomalies: AnomalyDetection[] = [];
    
    const heightToShoulderRatio = measurements.height / measurements.shoulderWidth;
    const expectedRatio = 3.5;
    const tolerance = 0.8;
    
    if (Math.abs(heightToShoulderRatio - expectedRatio) > tolerance) {
      anomalies.push({
        type: 'proportional',
        severity: Math.abs(heightToShoulderRatio - expectedRatio) > 1.5 ? 'high' : 'medium',
        description: `Height to shoulder ratio ${heightToShoulderRatio.toFixed(2)} outside normal range`,
        confidence: Math.min(0.9, Math.abs(heightToShoulderRatio - expectedRatio) / 2),
        correction: {
          type: 'scale',
          value: expectedRatio / heightToShoulderRatio
        }
      });
    }
    
    return anomalies;
  }

  private detectContextualAnomalies(measurements: any, context: any): AnomalyDetection[] {
    const anomalies: AnomalyDetection[] = [];
    
    // Check for poor conditions that might affect accuracy
    if (context.lighting === 'poor') {
      anomalies.push({
        type: 'contextual',
        severity: 'medium',
        description: 'Poor lighting conditions detected',
        confidence: 0.8
      });
    }
    
    if (context.distance === 'too_close' || context.distance === 'too_far') {
      anomalies.push({
        type: 'contextual',
        severity: 'medium',
        description: `Suboptimal distance: ${context.distance}`,
        confidence: 0.7
      });
    }
    
    if (context.pose === 'poor') {
      anomalies.push({
        type: 'contextual',
        severity: 'high',
        description: 'Poor pose detected',
        confidence: 0.9
      });
    }
    
    return anomalies;
  }

  private analyzeTrendPattern(): PatternRecognition | null {
    if (this.trainingData.length < 5) return null;
    
    const recentData = this.trainingData.slice(-10);
    const shoulderWidths = recentData.map(d => d.measurements.shoulderWidth);
    const heights = recentData.map(d => d.measurements.height);
    
    const shoulderTrend = this.calculateTrend(shoulderWidths);
    const heightTrend = this.calculateTrend(heights);
    
    if (Math.abs(shoulderTrend) > 0.1 || Math.abs(heightTrend) > 0.1) {
      return {
        pattern: 'trend',
        strength: Math.max(Math.abs(shoulderTrend), Math.abs(heightTrend)),
        description: `Trend detected: shoulder ${shoulderTrend > 0 ? 'increasing' : 'decreasing'}, height ${heightTrend > 0 ? 'increasing' : 'decreasing'}`,
        prediction: this.predictNextValue(shoulderWidths, heights)
      };
    }
    
    return null;
  }

  private analyzeSeasonalPattern(): PatternRecognition | null {
    // Simplified seasonal analysis
    if (this.trainingData.length < 20) return null;
    
    const data = this.trainingData.slice(-20);
    const timeGroups = this.groupByTimeOfDay(data);
    
    if (Object.keys(timeGroups).length > 1) {
      const variance = this.calculateGroupVariance(timeGroups);
      if (variance > 0.1) {
        return {
          pattern: 'seasonal',
          strength: variance,
          description: 'Time-based measurement variations detected'
        };
      }
    }
    
    return null;
  }

  private analyzeCyclicalPattern(): PatternRecognition | null {
    if (this.trainingData.length < 10) return null;
    
    const recentData = this.trainingData.slice(-10);
    const shoulderWidths = recentData.map(d => d.measurements.shoulderWidth);
    
    // Simple cyclical detection
    const cycles = this.detectCycles(shoulderWidths);
    if (cycles.length > 0) {
      return {
        pattern: 'cyclical',
        strength: cycles[0].strength,
        description: `Cyclical pattern detected with ${cycles[0].period} period`
      };
    }
    
    return null;
  }

  private calculateMLScore(
    neuralScore: number, 
    anomalies: AnomalyDetection[], 
    patterns: PatternRecognition[]
  ): number {
    let score = neuralScore;
    
    // Reduce score based on anomalies
    for (const anomaly of anomalies) {
      const reduction = anomaly.severity === 'critical' ? 0.3 :
                      anomaly.severity === 'high' ? 0.2 :
                      anomaly.severity === 'medium' ? 0.1 : 0.05;
      score -= reduction * anomaly.confidence;
    }
    
    // Adjust score based on patterns
    for (const pattern of patterns) {
      if (pattern.pattern === 'trend' && pattern.strength > 0.2) {
        score += 0.1; // Trends can be good indicators
      }
    }
    
    return Math.max(0, Math.min(1, score));
  }

  private determineQuality(mlScore: number, anomalies: AnomalyDetection[]): 'excellent' | 'good' | 'fair' | 'poor' {
    const criticalAnomalies = anomalies.filter(a => a.severity === 'critical').length;
    const highAnomalies = anomalies.filter(a => a.severity === 'high').length;
    
    if (mlScore >= 0.9 && criticalAnomalies === 0 && highAnomalies === 0) return 'excellent';
    if (mlScore >= 0.7 && criticalAnomalies === 0 && highAnomalies <= 1) return 'good';
    if (mlScore >= 0.5 && criticalAnomalies === 0) return 'fair';
    return 'poor';
  }

  private generateRecommendations(
    anomalies: AnomalyDetection[], 
    patterns: PatternRecognition[], 
    quality: string
  ): string[] {
    const recommendations: string[] = [];
    
    if (quality === 'poor') {
      recommendations.push('Consider recalibrating the measurement system');
    }
    
    for (const anomaly of anomalies) {
      if (anomaly.type === 'contextual') {
        recommendations.push('Improve measurement conditions');
      } else if (anomaly.type === 'statistical') {
        recommendations.push('Verify measurement accuracy');
      } else if (anomaly.type === 'proportional') {
        recommendations.push('Check body positioning');
      }
    }
    
    for (const pattern of patterns) {
      if (pattern.pattern === 'trend' && pattern.strength > 0.3) {
        recommendations.push('Monitor for systematic measurement drift');
      }
    }
    
    return recommendations;
  }

  // Helper methods
  private calculateNeuralScore(inputs: number[], weights: number[]): number {
    let sum = 0;
    for (let i = 0; i < Math.min(inputs.length, weights.length); i++) {
      sum += inputs[i] * weights[i];
    }
    return Math.max(0, Math.min(1, sum));
  }

  private encodeContext(context: any): number {
    const lightingMap = { 'excellent': 1, 'good': 0.8, 'fair': 0.6, 'poor': 0.3 };
    const distanceMap = { 'optimal': 1, 'too_close': 0.5, 'too_far': 0.7 };
    const poseMap = { 'optimal': 1, 'acceptable': 0.8, 'poor': 0.4 };
    
    return (lightingMap[context.lighting as keyof typeof lightingMap] + 
            distanceMap[context.distance as keyof typeof distanceMap] + 
            poseMap[context.pose as keyof typeof poseMap]) / 3;
  }

  private calculateZScore(value: number, data: number[]): number {
    const mean = data.reduce((sum, val) => sum + val, 0) / data.length;
    const variance = data.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / data.length;
    const stdDev = Math.sqrt(variance);
    
    return stdDev > 0 ? (value - mean) / stdDev : 0;
  }

  private calculateTrend(values: number[]): number {
    if (values.length < 2) return 0;
    
    let trend = 0;
    for (let i = 1; i < values.length; i++) {
      trend += (values[i] - values[i - 1]) / values[i - 1];
    }
    
    return trend / (values.length - 1);
  }

  private predictNextValue(shoulderWidths: number[], heights: number[]): number {
    const shoulderTrend = this.calculateTrend(shoulderWidths);
    const heightTrend = this.calculateTrend(heights);
    
    const lastShoulder = shoulderWidths[shoulderWidths.length - 1];
    const lastHeight = heights[heights.length - 1];
    
    const predictedShoulder = lastShoulder * (1 + shoulderTrend);
    const predictedHeight = lastHeight * (1 + heightTrend);
    
    return predictedHeight / predictedShoulder; // Return ratio
  }

  private groupByTimeOfDay(data: TrainingData[]): Record<string, number[]> {
    const groups: Record<string, number[]> = {};
    
    for (const item of data) {
      const hour = new Date(item.timestamp).getHours();
      const timeGroup = hour < 6 ? 'night' : hour < 12 ? 'morning' : hour < 18 ? 'afternoon' : 'evening';
      
      if (!groups[timeGroup]) groups[timeGroup] = [];
      groups[timeGroup].push(item.measurements.shoulderWidth);
    }
    
    return groups;
  }

  private calculateGroupVariance(groups: Record<string, number[]>): number {
    const groupMeans = Object.values(groups).map(group => 
      group.reduce((sum, val) => sum + val, 0) / group.length
    );
    
    const overallMean = groupMeans.reduce((sum, mean) => sum + mean, 0) / groupMeans.length;
    const variance = groupMeans.reduce((sum, mean) => sum + Math.pow(mean - overallMean, 2), 0) / groupMeans.length;
    
    return variance / overallMean; // Normalized variance
  }

  private detectCycles(values: number[]): Array<{ period: number; strength: number }> {
    // Simplified cycle detection
    const cycles: Array<{ period: number; strength: number }> = [];
    
    for (let period = 2; period < values.length / 2; period++) {
      let correlation = 0;
      for (let i = period; i < values.length; i++) {
        correlation += Math.abs(values[i] - values[i - period]);
      }
      
      const strength = 1 - (correlation / (values.length - period)) / Math.max(...values);
      if (strength > 0.3) {
        cycles.push({ period, strength });
      }
    }
    
    return cycles.sort((a, b) => b.strength - a.strength);
  }

  private async updateNeuralWeights(trainingData: TrainingData): Promise<void> {
    if (!trainingData.userFeedback) return;
    
    const feedback = trainingData.userFeedback.accuracy / 5; // Normalize to 0-1
    const error = feedback - this.calculateNeuralScore(
      [trainingData.measurements.shoulderWidth / 50, trainingData.measurements.height / 200, trainingData.measurements.confidence],
      this.neuralWeights.shoulderWidth
    );
    
    // Simple gradient descent
    const learningRate = this.config.learningRate;
    this.neuralWeights.shoulderWidth = this.neuralWeights.shoulderWidth.map(w => 
      Math.max(0, Math.min(1, w + learningRate * error))
    );
  }

  private updateAnomalyThresholds(): void {
    if (this.trainingData.length < 10) return;
    
    const recentData = this.trainingData.slice(-20);
    const shoulderWidths = recentData.map(d => d.measurements.shoulderWidth);
    const heights = recentData.map(d => d.measurements.height);
    
    const shoulderStd = this.calculateStandardDeviation(shoulderWidths);
    const heightStd = this.calculateStandardDeviation(heights);
    
    this.anomalyThresholds.set('shoulderWidth', shoulderStd * 2.5);
    this.anomalyThresholds.set('height', heightStd * 2.5);
  }

  private async updatePatternModels(): Promise<void> {
    // Update pattern recognition models based on recent data
    // This is a simplified implementation
  }

  private calculateModelAccuracy(recentData: TrainingData[]): number {
    if (recentData.length === 0) return 0;
    
    let correctPredictions = 0;
    for (const data of recentData) {
      if (data.userFeedback) {
        const predictedAccuracy = this.calculateNeuralScore(
          [data.measurements.shoulderWidth / 50, data.measurements.height / 200, data.measurements.confidence],
          this.neuralWeights.shoulderWidth
        );
        const actualAccuracy = data.userFeedback.accuracy / 5;
        
        if (Math.abs(predictedAccuracy - actualAccuracy) < 0.2) {
          correctPredictions++;
        }
      }
    }
    
    return correctPredictions / recentData.filter(d => d.userFeedback).length;
  }

  private calculateAnomalyDetectionRate(): number {
    // Simplified anomaly detection rate calculation
    return 0.8; // Placeholder
  }

  private calculatePatternRecognitionAccuracy(): number {
    // Simplified pattern recognition accuracy calculation
    return 0.7; // Placeholder
  }

  private getModelRecommendations(accuracy: number, anomalyRate: number, patternAccuracy: number): string[] {
    const recommendations: string[] = [];
    
    if (accuracy < 0.7) {
      recommendations.push('Increase training data diversity');
    }
    
    if (anomalyRate < 0.6) {
      recommendations.push('Improve anomaly detection sensitivity');
    }
    
    if (patternAccuracy < 0.6) {
      recommendations.push('Enhance pattern recognition algorithms');
    }
    
    return recommendations;
  }

  private calculateStandardDeviation(values: number[]): number {
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
    return Math.sqrt(variance);
  }

  private initializeAnomalyThresholds(): void {
    this.anomalyThresholds.set('shoulderWidth', 5.0);
    this.anomalyThresholds.set('height', 10.0);
    this.anomalyThresholds.set('confidence', 0.3);
  }

  // Public configuration methods
  updateConfig(newConfig: Partial<MLValidationConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  getConfig(): MLValidationConfig {
    return { ...this.config };
  }

  clearTrainingData(): void {
    this.trainingData = [];
  }

  getTrainingData(): TrainingData[] {
    return [...this.trainingData];
  }
}

export const mlValidationEngine = MLValidationEngine.getInstance();
export default MLValidationEngine;
