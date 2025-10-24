import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { cacheService } from '../services/EnhancedCacheService';
import OptimizedApiService from '../services/OptimizedApiService';

interface PerformanceMetrics {
  cacheHitRate: number;
  queueSize: number;
  batchQueueSize: number;
  memoryUsage: number;
  cacheSize: number;
  totalRequests: number;
  averageResponseTime: number;
}

interface PerformanceMonitorProps {
  visible?: boolean;
  onClose?: () => void;
}

export default function PerformanceMonitor({ 
  visible = false, 
  onClose 
}: PerformanceMonitorProps) {
  const [metrics, setMetrics] = useState<PerformanceMetrics | null>(null);
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [refreshInterval, setRefreshInterval] = useState<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (visible && isMonitoring) {
      startMonitoring();
    } else {
      stopMonitoring();
    }

    return () => {
      stopMonitoring();
    };
  }, [visible, isMonitoring]);

  const startMonitoring = useCallback(() => {
    const interval = setInterval(() => {
      updateMetrics();
    }, 2000); // Update every 2 seconds

    setRefreshInterval(interval);
    updateMetrics(); // Initial update
  }, []);

  const stopMonitoring = useCallback(() => {
    if (refreshInterval) {
      clearInterval(refreshInterval);
      setRefreshInterval(null);
    }
  }, [refreshInterval]);

  const updateMetrics = useCallback(() => {
    try {
      const cacheStats = cacheService.getStats();
      const apiMetrics = OptimizedApiService.getPerformanceMetrics();

      const newMetrics: PerformanceMetrics = {
        cacheHitRate: cacheStats.hitRate,
        queueSize: apiMetrics.queueSize,
        batchQueueSize: apiMetrics.batchQueueSize,
        memoryUsage: cacheStats.memoryUsage,
        cacheSize: cacheStats.size,
        totalRequests: cacheStats.totalHits + cacheStats.totalMisses,
        averageResponseTime: 0 // This would need to be tracked separately
      };

      setMetrics(newMetrics);
    } catch (error) {
      console.error('Performance monitoring error:', error);
    }
  }, []);

  const clearCache = useCallback(async () => {
    Alert.alert(
      'Clear Cache',
      'This will clear all cached data. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            try {
              await cacheService.clear();
              await OptimizedApiService.clearAll();
              updateMetrics();
              Alert.alert('Success', 'Cache cleared successfully');
            } catch (error) {
              Alert.alert('Error', 'Failed to clear cache');
            }
          }
        }
      ]
    );
  }, [updateMetrics]);

  const optimizePerformance = useCallback(async () => {
    try {
      // Preload critical data
      await OptimizedApiService.preloadCriticalData();
      
      // Warm up cache
      await cacheService.warmUp();
      
      updateMetrics();
      Alert.alert('Success', 'Performance optimization completed');
    } catch (error) {
      Alert.alert('Error', 'Performance optimization failed');
    }
  }, [updateMetrics]);

  if (!visible) return null;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Performance Monitor</Text>
        <View style={styles.headerButtons}>
          <TouchableOpacity
            style={[styles.button, isMonitoring ? styles.activeButton : styles.inactiveButton]}
            onPress={() => setIsMonitoring(!isMonitoring)}
          >
            <Ionicons 
              name={isMonitoring ? "pause" : "play"} 
              size={16} 
              color={isMonitoring ? "#fff" : "#666"} 
            />
            <Text style={[styles.buttonText, isMonitoring ? styles.activeButtonText : styles.inactiveButtonText]}>
              {isMonitoring ? 'Pause' : 'Start'}
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Ionicons name="close" size={20} color="#666" />
          </TouchableOpacity>
        </View>
      </View>

      {metrics && (
        <View style={styles.metricsContainer}>
          <View style={styles.metricRow}>
            <Text style={styles.metricLabel}>Cache Hit Rate:</Text>
            <Text style={[styles.metricValue, { color: metrics.cacheHitRate > 70 ? '#4CAF50' : '#FF9800' }]}>
              {metrics.cacheHitRate.toFixed(1)}%
            </Text>
          </View>

          <View style={styles.metricRow}>
            <Text style={styles.metricLabel}>Cache Size:</Text>
            <Text style={styles.metricValue}>{metrics.cacheSize} items</Text>
          </View>

          <View style={styles.metricRow}>
            <Text style={styles.metricLabel}>Memory Usage:</Text>
            <Text style={styles.metricValue}>{(metrics.memoryUsage / 1024).toFixed(1)} KB</Text>
          </View>

          <View style={styles.metricRow}>
            <Text style={styles.metricLabel}>Request Queue:</Text>
            <Text style={styles.metricValue}>{metrics.queueSize} requests</Text>
          </View>

          <View style={styles.metricRow}>
            <Text style={styles.metricLabel}>Batch Queue:</Text>
            <Text style={styles.metricValue}>{metrics.batchQueueSize} batches</Text>
          </View>

          <View style={styles.metricRow}>
            <Text style={styles.metricLabel}>Total Requests:</Text>
            <Text style={styles.metricValue}>{metrics.totalRequests}</Text>
          </View>
        </View>
      )}

      <View style={styles.actionsContainer}>
        <TouchableOpacity style={styles.actionButton} onPress={updateMetrics}>
          <Ionicons name="refresh" size={16} color="#014D40" />
          <Text style={styles.actionButtonText}>Refresh</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionButton} onPress={clearCache}>
          <Ionicons name="trash" size={16} color="#F44336" />
          <Text style={styles.actionButtonText}>Clear Cache</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionButton} onPress={optimizePerformance}>
          <Ionicons name="rocket" size={16} color="#4CAF50" />
          <Text style={styles.actionButtonText}>Optimize</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    zIndex: 9999,
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    gap: 4,
  },
  activeButton: {
    backgroundColor: '#4CAF50',
  },
  inactiveButton: {
    backgroundColor: '#333',
    borderWidth: 1,
    borderColor: '#666',
  },
  buttonText: {
    fontSize: 12,
    fontWeight: '600',
  },
  activeButtonText: {
    color: '#fff',
  },
  inactiveButtonText: {
    color: '#666',
  },
  closeButton: {
    padding: 8,
  },
  metricsContainer: {
    backgroundColor: '#1a1a1a',
    borderRadius: 8,
    padding: 16,
    marginBottom: 20,
  },
  metricRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  metricLabel: {
    fontSize: 14,
    color: '#ccc',
    fontWeight: '500',
  },
  metricValue: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '600',
  },
  actionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    gap: 10,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2a2a2a',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
    flex: 1,
    justifyContent: 'center',
  },
  actionButtonText: {
    fontSize: 12,
    color: '#fff',
    fontWeight: '600',
  },
});

