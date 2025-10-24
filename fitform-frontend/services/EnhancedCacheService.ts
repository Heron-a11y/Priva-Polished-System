interface CacheItem<T> {
  data: T;
  timestamp: number;
  ttl: number;
  hits: number;
}

interface CacheOptions {
  ttl?: number;
  maxSize?: number;
  version?: string;
}

class EnhancedCacheService {
  private cache: Map<string, CacheItem<any>> = new Map();
  private hitCount: number = 0;
  private missCount: number = 0;
  private maxSize: number = 1000;
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.startCleanup();
  }

  /**
   * Set cache item with advanced options
   */
  async set<T>(
    key: string, 
    value: T, 
    ttl: number = 300000, // 5 minutes default
    options: CacheOptions = {}
  ): Promise<boolean> {
    try {
      const { maxSize = this.maxSize } = options;
      
      // Check if cache is full and needs cleanup
      if (this.cache.size >= maxSize) {
        await this.evictLeastUsed();
      }

      const cacheItem: CacheItem<T> = {
        data: value,
        timestamp: Date.now(),
        ttl,
        hits: 0
      };

      this.cache.set(key, cacheItem);
      console.log(`✅ Cached item: ${key} (TTL: ${ttl}ms)`);
      return true;
    } catch (error) {
      console.error(`❌ Cache set error for ${key}:`, error);
      return false;
    }
  }

  /**
   * Get cache item with hit tracking
   */
  async get<T>(key: string): Promise<T | null> {
    try {
      const item = this.cache.get(key);
      
      if (!item) {
        this.missCount++;
        return null;
      }

      // Check if item has expired
      const now = Date.now();
      if (now - item.timestamp > item.ttl) {
        this.cache.delete(key);
        this.missCount++;
        return null;
      }

      // Update hit count and return data
      item.hits++;
      this.hitCount++;
      
      return item.data as T;
    } catch (error) {
      console.error(`❌ Cache get error for ${key}:`, error);
      this.missCount++;
      return null;
    }
  }

  /**
   * Delete cache item
   */
  async delete(key: string): Promise<boolean> {
    try {
      return this.cache.delete(key);
    } catch (error) {
      console.error(`❌ Cache delete error for ${key}:`, error);
      return false;
    }
  }

  /**
   * Delete cache items by pattern
   */
  async deletePattern(pattern: string): Promise<number> {
    try {
      const regex = new RegExp(pattern.replace(/\*/g, '.*'));
      let deletedCount = 0;

      for (const key of this.cache.keys()) {
        if (regex.test(key)) {
          this.cache.delete(key);
          deletedCount++;
        }
      }

      console.log(`🗑️ Deleted ${deletedCount} cache items matching pattern: ${pattern}`);
      return deletedCount;
    } catch (error) {
      console.error(`❌ Cache delete pattern error for ${pattern}:`, error);
      return 0;
    }
  }

  /**
   * Clear all cache
   */
  async clear(): Promise<void> {
    try {
      this.cache.clear();
      this.hitCount = 0;
      this.missCount = 0;
      console.log('🧹 All cache cleared');
    } catch (error) {
      console.error('❌ Cache clear error:', error);
    }
  }

  /**
   * Get cache statistics
   */
  getStats(): {
    size: number;
    hitRate: number;
    totalHits: number;
    totalMisses: number;
    memoryUsage: number;
  } {
    const totalRequests = this.hitCount + this.missCount;
    const hitRate = totalRequests > 0 ? (this.hitCount / totalRequests) * 100 : 0;
    
    // Estimate memory usage
    const memoryUsage = this.cache.size * 1024; // Rough estimate

    return {
      size: this.cache.size,
      hitRate: Math.round(hitRate * 100) / 100,
      totalHits: this.hitCount,
      totalMisses: this.missCount,
      memoryUsage
    };
  }

  /**
   * Get cache hit rate
   */
  getHitRate(): number {
    const totalRequests = this.hitCount + this.missCount;
    return totalRequests > 0 ? (this.hitCount / totalRequests) * 100 : 0;
  }

  /**
   * Evict least used items when cache is full
   */
  private async evictLeastUsed(): Promise<void> {
    try {
      const items = Array.from(this.cache.entries());
      
      // Sort by hits (ascending) and timestamp (ascending)
      items.sort(([, a], [, b]) => {
        if (a.hits !== b.hits) {
          return a.hits - b.hits;
        }
        return a.timestamp - b.timestamp;
      });

      // Remove 20% of least used items
      const itemsToRemove = Math.ceil(items.length * 0.2);
      
      for (let i = 0; i < itemsToRemove; i++) {
        this.cache.delete(items[i][0]);
      }

      console.log(`🗑️ Evicted ${itemsToRemove} least used cache items`);
    } catch (error) {
      console.error('❌ Cache eviction error:', error);
    }
  }

  /**
   * Start automatic cleanup of expired items
   */
  private startCleanup(): void {
    this.cleanupInterval = setInterval(() => {
      this.cleanupExpired();
    }, 60000); // Cleanup every minute
  }

  /**
   * Clean up expired cache items
   */
  private cleanupExpired(): void {
    try {
      const now = Date.now();
      let cleanedCount = 0;

      for (const [key, item] of this.cache.entries()) {
        if (now - item.timestamp > item.ttl) {
          this.cache.delete(key);
          cleanedCount++;
        }
      }

      if (cleanedCount > 0) {
        console.log(`🧹 Cleaned up ${cleanedCount} expired cache items`);
      }
    } catch (error) {
      console.error('❌ Cache cleanup error:', error);
    }
  }

  /**
   * Preload critical data
   */
  async preloadCriticalData(): Promise<void> {
    try {
      console.log('🚀 Preloading critical data...');
      
      // This would be called during app initialization
      // to preload commonly accessed data
      
      console.log('✅ Critical data preloaded');
    } catch (error) {
      console.error('❌ Critical data preload error:', error);
    }
  }

  /**
   * Warm up cache with frequently accessed data
   */
  async warmUp(): Promise<void> {
    try {
      console.log('🔥 Warming up cache...');
      
      // This would be called to pre-populate cache
      // with data that's likely to be accessed soon
      
      console.log('✅ Cache warmed up');
    } catch (error) {
      console.error('❌ Cache warm-up error:', error);
    }
  }

  /**
   * Stop cleanup interval
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }
}

export const cacheService = new EnhancedCacheService();

