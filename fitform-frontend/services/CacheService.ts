import AsyncStorage from '@react-native-async-storage/async-storage';

export interface CacheItem<T = any> {
  data: T;
  timestamp: number;
  expiry: number;
  key: string;
  version: string;
}

export interface CacheOptions {
  ttl?: number; // Time to live in milliseconds
  version?: string;
  maxSize?: number;
  compression?: boolean;
}

export interface CacheStats {
  totalItems: number;
  totalSize: number;
  hitRate: number;
  missRate: number;
  oldestItem: number;
  newestItem: number;
}

class CacheService {
  private cache: Map<string, CacheItem> = new Map();
  private stats = {
    hits: 0,
    misses: 0,
    totalRequests: 0
  };
  private maxCacheSize = 50; // Maximum number of items in memory cache
  private defaultTTL = 5 * 60 * 1000; // 5 minutes default TTL

  constructor() {
    this.loadCacheFromStorage();
    this.setupCleanupInterval();
  }

  /**
   * Get item from cache
   */
  public async get<T>(key: string): Promise<T | null> {
    this.stats.totalRequests++;
    
    // Check memory cache first
    const memoryItem = this.cache.get(key);
    if (memoryItem && !this.isExpired(memoryItem)) {
      this.stats.hits++;
      return memoryItem.data as T;
    }

    // Check persistent storage
    try {
      const storedItem = await AsyncStorage.getItem(`cache_${key}`);
      if (storedItem) {
        const cacheItem: CacheItem = JSON.parse(storedItem);
        if (!this.isExpired(cacheItem)) {
          // Move to memory cache
          this.cache.set(key, cacheItem);
          this.stats.hits++;
          return cacheItem.data as T;
        } else {
          // Remove expired item
          await AsyncStorage.removeItem(`cache_${key}`);
        }
      }
    } catch (error) {
      console.warn('Failed to get item from cache:', error);
    }

    this.stats.misses++;
    return null;
  }

  /**
   * Set item in cache
   */
  public async set<T>(
    key: string, 
    data: T, 
    options: CacheOptions = {}
  ): Promise<void> {
    const {
      ttl = this.defaultTTL,
      version = '1.0',
      compression = false
    } = options;

    const now = Date.now();
    const cacheItem: CacheItem<T> = {
      data,
      timestamp: now,
      expiry: now + ttl,
      key,
      version
    };

    // Store in memory cache
    this.cache.set(key, cacheItem);

    // Store in persistent storage
    try {
      const serialized = JSON.stringify(cacheItem);
      await AsyncStorage.setItem(`cache_${key}`, serialized);
    } catch (error) {
      console.warn('Failed to store item in cache:', error);
    }

    // Cleanup if cache is too large
    this.cleanupIfNeeded();
  }

  /**
   * Remove item from cache
   */
  public async remove(key: string): Promise<void> {
    this.cache.delete(key);
    try {
      await AsyncStorage.removeItem(`cache_${key}`);
    } catch (error) {
      console.warn('Failed to remove item from cache:', error);
    }
  }

  /**
   * Clear all cache
   */
  public async clear(): Promise<void> {
    this.cache.clear();
    try {
      const keys = await AsyncStorage.getAllKeys();
      const cacheKeys = keys.filter(key => key.startsWith('cache_'));
      await AsyncStorage.multiRemove(cacheKeys);
    } catch (error) {
      console.warn('Failed to clear cache:', error);
    }
  }

  /**
   * Check if item exists and is not expired
   */
  public async has(key: string): Promise<boolean> {
    const item = await this.get(key);
    return item !== null;
  }

  /**
   * Get or set cache item
   */
  public async getOrSet<T>(
    key: string,
    fetcher: () => Promise<T>,
    options: CacheOptions = {}
  ): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    const data = await fetcher();
    await this.set(key, data, options);
    return data;
  }

  /**
   * Invalidate cache by pattern
   */
  public async invalidatePattern(pattern: string): Promise<void> {
    const regex = new RegExp(pattern);
    
    // Clear from memory cache
    for (const [key] of this.cache) {
      if (regex.test(key)) {
        this.cache.delete(key);
      }
    }

    // Clear from persistent storage
    try {
      const keys = await AsyncStorage.getAllKeys();
      const cacheKeys = keys.filter(key => 
        key.startsWith('cache_') && regex.test(key.replace('cache_', ''))
      );
      await AsyncStorage.multiRemove(cacheKeys);
    } catch (error) {
      console.warn('Failed to invalidate cache pattern:', error);
    }
  }

  /**
   * Get cache statistics
   */
  public getStats(): CacheStats {
    const totalItems = this.cache.size;
    const totalSize = this.calculateCacheSize();
    const hitRate = this.stats.totalRequests > 0 
      ? this.stats.hits / this.stats.totalRequests 
      : 0;
    const missRate = 1 - hitRate;

    const timestamps = Array.from(this.cache.values()).map(item => item.timestamp);
    const oldestItem = timestamps.length > 0 ? Math.min(...timestamps) : 0;
    const newestItem = timestamps.length > 0 ? Math.max(...timestamps) : 0;

    return {
      totalItems,
      totalSize,
      hitRate,
      missRate,
      oldestItem,
      newestItem
    };
  }

  /**
   * Load cache from storage on startup
   */
  private async loadCacheFromStorage(): Promise<void> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const cacheKeys = keys.filter(key => key.startsWith('cache_'));
      
      for (const key of cacheKeys) {
        const storedItem = await AsyncStorage.getItem(key);
        if (storedItem) {
          const cacheItem: CacheItem = JSON.parse(storedItem);
          if (!this.isExpired(cacheItem)) {
            const originalKey = key.replace('cache_', '');
            this.cache.set(originalKey, cacheItem);
          } else {
            // Remove expired item
            await AsyncStorage.removeItem(key);
          }
        }
      }
    } catch (error) {
      console.warn('Failed to load cache from storage:', error);
    }
  }

  /**
   * Check if cache item is expired
   */
  private isExpired(item: CacheItem): boolean {
    return Date.now() > item.expiry;
  }

  /**
   * Cleanup expired items
   */
  private cleanupExpiredItems(): void {
    const now = Date.now();
    const expiredKeys: string[] = [];

    for (const [key, item] of this.cache) {
      if (now > item.expiry) {
        expiredKeys.push(key);
      }
    }

    expiredKeys.forEach(key => {
      this.cache.delete(key);
    });
  }

  /**
   * Cleanup if cache is too large
   */
  private cleanupIfNeeded(): void {
    if (this.cache.size > this.maxCacheSize) {
      // Remove oldest items
      const items = Array.from(this.cache.entries())
        .sort(([, a], [, b]) => a.timestamp - b.timestamp);
      
      const toRemove = items.slice(0, this.cache.size - this.maxCacheSize);
      toRemove.forEach(([key]) => {
        this.cache.delete(key);
      });
    }
  }

  /**
   * Calculate cache size in bytes
   */
  private calculateCacheSize(): number {
    let totalSize = 0;
    for (const item of this.cache.values()) {
      totalSize += JSON.stringify(item).length;
    }
    return totalSize;
  }

  /**
   * Setup cleanup interval
   */
  private setupCleanupInterval(): void {
    // Cleanup expired items every 5 minutes
    setInterval(() => {
      this.cleanupExpiredItems();
    }, 5 * 60 * 1000);
  }

  /**
   * Preload cache with data
   */
  public async preload<T>(
    key: string,
    fetcher: () => Promise<T>,
    options: CacheOptions = {}
  ): Promise<void> {
    try {
      const data = await fetcher();
      await this.set(key, data, options);
    } catch (error) {
      console.warn('Failed to preload cache:', error);
    }
  }

  /**
   * Get cache keys
   */
  public getKeys(): string[] {
    return Array.from(this.cache.keys());
  }

  /**
   * Get cache item info
   */
  public getItemInfo(key: string): CacheItem | null {
    return this.cache.get(key) || null;
  }
}

// Export singleton instance
export const cacheService = new CacheService();
export default cacheService;


