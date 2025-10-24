import apiService from './api';
import { cacheService } from './cacheService';

interface OptimizedApiOptions {
  cache?: boolean;
  cacheKey?: string;
  ttl?: number;
  retries?: number;
  timeout?: number;
  batchSize?: number;
}

class OptimizedApiService {
  private requestQueue: Map<string, Promise<any>> = new Map();
  private batchQueue: Map<string, any[]> = new Map();
  private batchTimeouts: Map<string, NodeJS.Timeout> = new Map();

  /**
   * Optimized GET request with caching and deduplication
   */
  async get<T>(
    endpoint: string, 
    options: OptimizedApiOptions = {}
  ): Promise<T> {
    const {
      cache = true,
      cacheKey = endpoint,
      ttl = 300000, // 5 minutes
      retries = 2,
      timeout = 10000
    } = options;

    // Check cache first
    if (cache) {
      const cached = await cacheService.get<T>(cacheKey);
      if (cached !== null) {
        console.log(`✅ Cache hit for ${cacheKey}`);
        return cached;
      }
    }

    // Check if request is already in progress (deduplication)
    if (this.requestQueue.has(cacheKey)) {
      console.log(`🔄 Request already in progress for ${cacheKey}`);
      return this.requestQueue.get(cacheKey)!;
    }

    // Create request promise
    const requestPromise = this.executeRequest<T>(endpoint, {
      retries,
      timeout,
      cache,
      cacheKey,
      ttl
    });

    // Store in queue
    this.requestQueue.set(cacheKey, requestPromise);

    try {
      const result = await requestPromise;
      return result;
    } finally {
      // Remove from queue when done
      this.requestQueue.delete(cacheKey);
    }
  }

  /**
   * Execute the actual request with retries and timeout
   */
  private async executeRequest<T>(
    endpoint: string,
    options: {
      retries: number;
      timeout: number;
      cache: boolean;
      cacheKey: string;
      ttl: number;
    }
  ): Promise<T> {
    const { retries, timeout, cache, cacheKey, ttl } = options;
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        console.log(`🔄 Attempt ${attempt + 1} for ${endpoint}`);
        
        // Create timeout promise
        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error('Request timeout')), timeout);
        });

        // Race between request and timeout
        const response = await Promise.race([
          apiService.get<T>(endpoint),
          timeoutPromise
        ]);

        // Cache successful response
        if (cache && response) {
          await cacheService.set(cacheKey, response, ttl);
          console.log(`✅ Cached response for ${cacheKey}`);
        }

        return response;
      } catch (error) {
        lastError = error as Error;
        console.warn(`⚠️ Attempt ${attempt + 1} failed for ${endpoint}:`, error);
        
        if (attempt < retries) {
          // Exponential backoff
          const delay = Math.pow(2, attempt) * 1000;
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    throw lastError || new Error('Request failed after all retries');
  }

  /**
   * Batch multiple requests together
   */
  async batchGet<T>(
    requests: Array<{ endpoint: string; cacheKey: string }>,
    options: OptimizedApiOptions = {}
  ): Promise<T[]> {
    const { batchSize = 5, timeout = 15000 } = options;
    const results: T[] = [];
    
    // Process requests in batches
    for (let i = 0; i < requests.length; i += batchSize) {
      const batch = requests.slice(i, i + batchSize);
      
      const batchPromises = batch.map(async (request) => {
        try {
          return await this.get<T>(request.endpoint, {
            ...options,
            cacheKey: request.cacheKey
          });
        } catch (error) {
          console.error(`❌ Batch request failed for ${request.endpoint}:`, error);
          return null;
        }
      });

      const batchResults = await Promise.allSettled(batchPromises);
      
      batchResults.forEach((result) => {
        if (result.status === 'fulfilled' && result.value !== null) {
          results.push(result.value);
        }
      });
    }

    return results;
  }

  /**
   * Preload critical data
   */
  async preloadCriticalData(userId?: string): Promise<void> {
    const criticalEndpoints = [
      '/appointments',
      '/rental-purchase-history',
      '/notifications',
      '/profile'
    ];

    if (userId) {
      criticalEndpoints.push(`/users/${userId}/stats`);
    }

    console.log('🚀 Preloading critical data...');
    
    const preloadPromises = criticalEndpoints.map(endpoint => 
      this.get(endpoint, { cache: true, ttl: 300000 }).catch(error => {
        console.warn(`⚠️ Preload failed for ${endpoint}:`, error);
        return null;
      })
    );

    await Promise.allSettled(preloadPromises);
    console.log('✅ Critical data preloaded');
  }

  /**
   * Optimized dashboard data loading
   */
  async loadDashboardData(userId: string): Promise<{
    appointments: any[];
    rentals: any[];
    purchases: any[];
    notifications: any[];
    stats: any;
  }> {
    console.log('🔄 Loading optimized dashboard data...');
    
    const startTime = Date.now();
    
    try {
      // Load all data in parallel with optimized caching
      const [appointments, history, notifications, stats] = await Promise.allSettled([
        this.get('/appointments', { cache: true, ttl: 180000 }), // 3 minutes
        this.get('/rental-purchase-history', { cache: true, ttl: 300000 }), // 5 minutes
        this.get('/notifications', { cache: true, ttl: 120000 }), // 2 minutes
        this.get(`/users/${userId}/stats`, { cache: true, ttl: 600000 }) // 10 minutes
      ]);

      // Process results
      const appointmentsData = appointments.status === 'fulfilled' ? appointments.value : [];
      const historyData = history.status === 'fulfilled' ? history.value : [];
      const notificationsData = notifications.status === 'fulfilled' ? notifications.value : [];
      const statsData = stats.status === 'fulfilled' ? stats.value : {};

      // Separate rentals and purchases from history
      const rentals = Array.isArray(historyData) 
        ? historyData.filter((item: any) => item.order_type === 'rental')
        : [];
      const purchases = Array.isArray(historyData)
        ? historyData.filter((item: any) => item.order_type === 'purchase')
        : [];

      const loadTime = Date.now() - startTime;
      console.log(`✅ Dashboard data loaded in ${loadTime}ms`);

      return {
        appointments: Array.isArray(appointmentsData) ? appointmentsData : [],
        rentals,
        purchases,
        notifications: Array.isArray(notificationsData) ? notificationsData : [],
        stats: statsData
      };
    } catch (error) {
      console.error('❌ Dashboard data loading failed:', error);
      throw error;
    }
  }

  /**
   * Smart cache invalidation
   */
  async invalidateCache(patterns: string[]): Promise<void> {
    console.log('🗑️ Invalidating cache patterns:', patterns);
    
    const invalidationPromises = patterns.map(pattern => 
      cacheService.deletePattern(pattern).catch(error => {
        console.warn(`⚠️ Cache invalidation failed for ${pattern}:`, error);
      })
    );

    await Promise.allSettled(invalidationPromises);
    console.log('✅ Cache invalidation completed');
  }

  /**
   * Get performance metrics
   */
  getPerformanceMetrics(): {
    queueSize: number;
    batchQueueSize: number;
    cacheHitRate: number;
  } {
    return {
      queueSize: this.requestQueue.size,
      batchQueueSize: this.batchQueue.size,
      cacheHitRate: cacheService.getHitRate()
    };
  }

  /**
   * Clear all caches and queues
   */
  async clearAll(): Promise<void> {
    console.log('🧹 Clearing all caches and queues...');
    
    // Clear request queue
    this.requestQueue.clear();
    
    // Clear batch queues
    this.batchQueue.clear();
    
    // Clear batch timeouts
    this.batchTimeouts.forEach(timeout => clearTimeout(timeout));
    this.batchTimeouts.clear();
    
    // Clear cache
    await cacheService.clear();
    
    console.log('✅ All caches and queues cleared');
  }
}

export default new OptimizedApiService();

