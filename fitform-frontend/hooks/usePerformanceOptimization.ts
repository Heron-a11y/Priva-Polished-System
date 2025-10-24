import { useEffect, useCallback, useRef, useState } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { cacheService } from '../services/EnhancedCacheService';
import OptimizedApiService from '../services/OptimizedApiService';

interface PerformanceConfig {
  enablePreloading?: boolean;
  enableCaching?: boolean;
  cacheTTL?: number;
  batchSize?: number;
  retryAttempts?: number;
}

export function usePerformanceOptimization(config: PerformanceConfig = {}) {
  const {
    enablePreloading = true,
    enableCaching = true,
    cacheTTL = 300000, // 5 minutes
    batchSize = 5,
    retryAttempts = 2
  } = config;

  const [isOptimized, setIsOptimized] = useState(false);
  const [performanceMetrics, setPerformanceMetrics] = useState({
    cacheHitRate: 0,
    queueSize: 0,
    memoryUsage: 0
  });

  const appStateRef = useRef(AppState.currentState);
  const optimizationTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Monitor app state changes for optimization
  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (appStateRef.current.match(/inactive|background/) && nextAppState === 'active') {
        // App came to foreground, optimize performance
        optimizePerformance();
      } else if (appStateRef.current === 'active' && nextAppState.match(/inactive|background/)) {
        // App going to background, cleanup resources
        cleanupResources();
      }
      
      appStateRef.current = nextAppState;
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription?.remove();
  }, []);

  // Initialize performance optimization
  useEffect(() => {
    if (enablePreloading) {
      initializeOptimization();
    }

    return () => {
      if (optimizationTimeoutRef.current) {
        clearTimeout(optimizationTimeoutRef.current);
      }
    };
  }, [enablePreloading]);

  const initializeOptimization = useCallback(async () => {
    try {
      console.log('🚀 Initializing performance optimization...');
      
      // Preload critical data
      await OptimizedApiService.preloadCriticalData();
      
      // Warm up cache
      if (enableCaching) {
        await cacheService.warmUp();
      }
      
      setIsOptimized(true);
      console.log('✅ Performance optimization initialized');
    } catch (error) {
      console.error('❌ Performance optimization initialization failed:', error);
    }
  }, [enableCaching]);

  const optimizePerformance = useCallback(async () => {
    try {
      console.log('⚡ Optimizing performance...');
      
      // Clear expired cache items
      await cacheService.clear();
      
      // Preload critical data
      await OptimizedApiService.preloadCriticalData();
      
      // Update performance metrics
      updatePerformanceMetrics();
      
      console.log('✅ Performance optimization completed');
    } catch (error) {
      console.error('❌ Performance optimization failed:', error);
    }
  }, []);

  const cleanupResources = useCallback(async () => {
    try {
      console.log('🧹 Cleaning up resources...');
      
      // Clear non-critical caches
      await cacheService.deletePattern('temp:*');
      
      // Clear request queues
      await OptimizedApiService.clearAll();
      
      console.log('✅ Resource cleanup completed');
    } catch (error) {
      console.error('❌ Resource cleanup failed:', error);
    }
  }, []);

  const updatePerformanceMetrics = useCallback(() => {
    try {
      const cacheStats = cacheService.getStats();
      const apiMetrics = OptimizedApiService.getPerformanceMetrics();
      
      setPerformanceMetrics({
        cacheHitRate: cacheStats.hitRate,
        queueSize: apiMetrics.queueSize,
        memoryUsage: cacheStats.memoryUsage
      });
    } catch (error) {
      console.error('❌ Performance metrics update failed:', error);
    }
  }, []);

  // Debounced optimization for frequent calls
  const debouncedOptimize = useCallback(() => {
    if (optimizationTimeoutRef.current) {
      clearTimeout(optimizationTimeoutRef.current);
    }
    
    optimizationTimeoutRef.current = setTimeout(() => {
      optimizePerformance();
    }, 1000); // 1 second debounce
  }, [optimizePerformance]);

  // Optimized API call with automatic caching
  const optimizedApiCall = useCallback(async <T>(
    endpoint: string,
    options: {
      cache?: boolean;
      cacheKey?: string;
      ttl?: number;
      retries?: number;
    } = {}
  ): Promise<T> => {
    const {
      cache = enableCaching,
      cacheKey = endpoint,
      ttl = cacheTTL,
      retries = retryAttempts
    } = options;

    try {
      const result = await OptimizedApiService.get<T>(endpoint, {
        cache,
        cacheKey,
        ttl,
        retries
      });

      // Update metrics after successful call
      updatePerformanceMetrics();
      
      return result;
    } catch (error) {
      console.error(`❌ Optimized API call failed for ${endpoint}:`, error);
      throw error;
    }
  }, [enableCaching, cacheTTL, retryAttempts, updatePerformanceMetrics]);

  // Batch API calls for better performance
  const batchApiCalls = useCallback(async <T>(
    requests: Array<{ endpoint: string; cacheKey: string }>,
    options: {
      batchSize?: number;
      timeout?: number;
    } = {}
  ): Promise<T[]> => {
    const { batchSize: size = batchSize, timeout = 15000 } = options;

    try {
      const results = await OptimizedApiService.batchGet<T>(requests, {
        batchSize: size,
        timeout
      });

      // Update metrics after batch call
      updatePerformanceMetrics();
      
      return results;
    } catch (error) {
      console.error('❌ Batch API calls failed:', error);
      throw error;
    }
  }, [batchSize, updatePerformanceMetrics]);

  // Smart cache invalidation
  const invalidateCache = useCallback(async (patterns: string[]) => {
    try {
      await OptimizedApiService.invalidateCache(patterns);
      updatePerformanceMetrics();
    } catch (error) {
      console.error('❌ Cache invalidation failed:', error);
    }
  }, [updatePerformanceMetrics]);

  // Get current performance status
  const getPerformanceStatus = useCallback(() => {
    return {
      isOptimized,
      metrics: performanceMetrics,
      cacheStats: cacheService.getStats(),
      apiMetrics: OptimizedApiService.getPerformanceMetrics()
    };
  }, [isOptimized, performanceMetrics]);

  return {
    isOptimized,
    performanceMetrics,
    optimizedApiCall,
    batchApiCalls,
    invalidateCache,
    optimizePerformance: debouncedOptimize,
    getPerformanceStatus,
    updatePerformanceMetrics
  };
}

