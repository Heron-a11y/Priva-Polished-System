import { cacheService, CacheOptions } from './CacheService';
import { errorHandlingService } from './ErrorHandlingService';
import apiService from './api';

export interface CachedApiOptions extends CacheOptions {
  cacheKey?: string;
  forceRefresh?: boolean;
  onError?: (error: any) => void;
}

class CachedApiService {
  private defaultCacheOptions: CacheOptions = {
    ttl: 5 * 60 * 1000, // 5 minutes
    version: '1.0'
  };

  /**
   * Get cached data or fetch from API
   */
  public async get<T>(
    endpoint: string,
    options: CachedApiOptions = {}
  ): Promise<T> {
    const {
      cacheKey = endpoint,
      forceRefresh = false,
      onError,
      ...cacheOptions
    } = options;

    const finalCacheOptions = { ...this.defaultCacheOptions, ...cacheOptions };

    try {
      // Try to get from cache first (unless force refresh)
      if (!forceRefresh) {
        const cached = await cacheService.get<T>(cacheKey);
        if (cached !== null) {
          console.log(`✅ Cache hit for ${cacheKey}`);
          return cached;
        }
      }

      console.log(`🔄 Fetching fresh data for ${cacheKey}`);
      
      // Fetch from API
      const response = await apiService.request(endpoint);
      
      // Handle different response structures
      let data;
      if (response && typeof response === 'object') {
        if (response.success === false) {
          throw new Error(response.message || 'API request failed');
        }
        // Handle both {data: [...]} and direct array responses
        data = response.data || response;
      } else {
        data = response;
      }
      
      // Cache the response
      await cacheService.set(cacheKey, data, finalCacheOptions);
      console.log(`✅ Cached data for ${cacheKey}`);
      return data;
    } catch (error) {
      console.error(`❌ Error fetching ${cacheKey}:`, error);
      
      // Try to return cached data as fallback
      if (!forceRefresh) {
        const fallback = await cacheService.get<T>(cacheKey);
        if (fallback !== null) {
          console.log(`🔄 Using cached fallback for ${cacheKey}`);
          return fallback;
        }
      }

      // Handle error
      errorHandlingService.handleApiError(error, {
        component: 'CachedApiService',
        action: 'get',
        additionalData: { endpoint, cacheKey }
      });

      if (onError) {
        onError(error);
      }

      throw error;
    }
  }

  /**
   * Get paginated data with caching
   */
  public async getPaginated<T>(
    endpoint: string,
    params: any = {},
    options: CachedApiOptions = {}
  ): Promise<{ data: T[]; pagination: any }> {
    const cacheKey = `${endpoint}_${JSON.stringify(params)}`;
    
    return this.get<{ data: T[]; pagination: any }>(endpoint, {
      ...options,
      cacheKey,
      ttl: 2 * 60 * 1000 // 2 minutes for paginated data
    });
  }

  /**
   * Invalidate cache by pattern
   */
  public async invalidateCache(pattern: string): Promise<void> {
    await cacheService.invalidatePattern(pattern);
    console.log(`🗑️ Invalidated cache pattern: ${pattern}`);
  }

  /**
   * Clear all cache
   */
  public async clearCache(): Promise<void> {
    await cacheService.clear();
    console.log('🗑️ Cleared all cache');
  }

  /**
   * Get cache statistics
   */
  public getCacheStats() {
    return cacheService.getStats();
  }

  /**
   * Preload cache with data
   */
  public async preloadCache<T>(
    endpoint: string,
    fetcher: () => Promise<T>,
    options: CachedApiOptions = {}
  ): Promise<void> {
    const { cacheKey = endpoint, ...cacheOptions } = options;
    const finalCacheOptions = { ...this.defaultCacheOptions, ...cacheOptions };

    try {
      await cacheService.preload(cacheKey, fetcher, finalCacheOptions);
      console.log(`✅ Preloaded cache for ${cacheKey}`);
    } catch (error) {
      console.error(`❌ Failed to preload cache for ${cacheKey}:`, error);
    }
  }

  /**
   * Get cached data only (no API call)
   */
  public async getCachedOnly<T>(cacheKey: string): Promise<T | null> {
    return await cacheService.get<T>(cacheKey);
  }

  /**
   * Set cache data manually
   */
  public async setCache<T>(
    cacheKey: string,
    data: T,
    options: CacheOptions = {}
  ): Promise<void> {
    const finalOptions = { ...this.defaultCacheOptions, ...options };
    await cacheService.set(cacheKey, data, finalOptions);
  }

  /**
   * Remove specific cache item
   */
  public async removeCache(cacheKey: string): Promise<void> {
    await cacheService.remove(cacheKey);
    console.log(`🗑️ Removed cache for ${cacheKey}`);
  }

  /**
   * Check if cache exists and is valid
   */
  public async hasCache(cacheKey: string): Promise<boolean> {
    return await cacheService.has(cacheKey);
  }

  /**
   * Get cache item info
   */
  public getCacheInfo(cacheKey: string) {
    return cacheService.getItemInfo(cacheKey);
  }

  /**
   * Get all cache keys
   */
  public getCacheKeys(): string[] {
    return cacheService.getKeys();
  }

  /**
   * Warm up cache with multiple endpoints
   */
  public async warmUpCache(endpoints: Array<{
    endpoint: string;
    cacheKey?: string;
    options?: CachedApiOptions;
  }>): Promise<void> {
    console.log('🔥 Warming up cache...');
    
    const promises = endpoints.map(async ({ endpoint, cacheKey, options = {} }) => {
      try {
        await this.get(endpoint, { ...options, cacheKey });
      } catch (error) {
        console.warn(`Failed to warm up cache for ${endpoint}:`, error);
      }
    });

    await Promise.allSettled(promises);
    console.log('✅ Cache warm-up completed');
  }

  /**
   * Get cache hit rate
   */
  public getCacheHitRate(): number {
    const stats = cacheService.getStats();
    return stats.hitRate;
  }

  /**
   * Get cache miss rate
   */
  public getCacheMissRate(): number {
    const stats = cacheService.getStats();
    return stats.missRate;
  }
}

// Export singleton instance
export const cachedApiService = new CachedApiService();
export default cachedApiService;
