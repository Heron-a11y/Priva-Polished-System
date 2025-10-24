<?php

namespace App\Services;

use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Redis;
use Illuminate\Support\Facades\Log;

class EnhancedCacheService
{
    /**
     * Multi-level caching with Redis and file cache
     */
    public static function set($key, $value, $ttl = 3600, $tags = [])
    {
        try {
            // Primary cache (Redis)
            if (config('cache.default') === 'redis') {
                Redis::setex($key, $ttl, serialize($value));
            }
            
            // Secondary cache (file)
            Cache::put($key, $value, $ttl);
            
            // Tag-based cache for easy invalidation
            if (!empty($tags)) {
                foreach ($tags as $tag) {
                    $tagKey = "tag:{$tag}";
                    $taggedKeys = Cache::get($tagKey, []);
                    $taggedKeys[] = $key;
                    Cache::put($tagKey, $taggedKeys, $ttl);
                }
            }
            
            return true;
        } catch (\Exception $e) {
            Log::error("Cache set error for key {$key}: " . $e->getMessage());
            return false;
        }
    }

    /**
     * Get from cache with fallback
     */
    public static function get($key, $default = null)
    {
        try {
            // Try Redis first
            if (config('cache.default') === 'redis') {
                $value = Redis::get($key);
                if ($value !== null) {
                    return unserialize($value);
                }
            }
            
            // Fallback to file cache
            return Cache::get($key, $default);
        } catch (\Exception $e) {
            Log::error("Cache get error for key {$key}: " . $e->getMessage());
            return $default;
        }
    }

    /**
     * Cache API responses with smart invalidation
     */
    public static function cacheApiResponse($endpoint, $response, $ttl = 300, $tags = [])
    {
        $key = "api:{$endpoint}";
        $tags[] = 'api_responses';
        
        return self::set($key, $response, $ttl, $tags);
    }

    /**
     * Get cached API response
     */
    public static function getCachedApiResponse($endpoint)
    {
        $key = "api:{$endpoint}";
        return self::get($key);
    }

    /**
     * Cache database query results
     */
    public static function cacheQuery($query, $params, $result, $ttl = 600)
    {
        $key = "query:" . md5($query . serialize($params));
        $tags = ['database_queries'];
        
        return self::set($key, $result, $ttl, $tags);
    }

    /**
     * Get cached query result
     */
    public static function getCachedQuery($query, $params)
    {
        $key = "query:" . md5($query . serialize($params));
        return self::get($key);
    }

    /**
     * Cache user-specific data
     */
    public static function cacheUserData($userId, $dataType, $data, $ttl = 1800)
    {
        $key = "user:{$userId}:{$dataType}";
        $tags = ['user_data', "user:{$userId}"];
        
        return self::set($key, $data, $ttl, $tags);
    }

    /**
     * Get cached user data
     */
    public static function getCachedUserData($userId, $dataType)
    {
        $key = "user:{$userId}:{$dataType}";
        return self::get($key);
    }

    /**
     * Invalidate cache by tags
     */
    public static function invalidateByTags($tags)
    {
        try {
            foreach ($tags as $tag) {
                $tagKey = "tag:{$tag}";
                $taggedKeys = Cache::get($tagKey, []);
                
                foreach ($taggedKeys as $key) {
                    Cache::forget($key);
                    if (config('cache.default') === 'redis') {
                        Redis::del($key);
                    }
                }
                
                Cache::forget($tagKey);
            }
            
            return true;
        } catch (\Exception $e) {
            Log::error("Cache invalidation error: " . $e->getMessage());
            return false;
        }
    }

    /**
     * Warm up frequently accessed caches
     */
    public static function warmUpCaches()
    {
        try {
            // Cache user statistics
            $userStats = \App\Models\User::selectRaw('
                COUNT(*) as total_users,
                COUNT(CASE WHEN account_status = "active" THEN 1 END) as active_users,
                COUNT(CASE WHEN account_status = "suspended" THEN 1 END) as suspended_users,
                COUNT(CASE WHEN account_status = "banned" THEN 1 END) as banned_users
            ')->first();
            
            self::set('stats:users', $userStats, 3600, ['statistics']);
            
            // Cache rental statistics
            $rentalStats = \App\Models\Rental::selectRaw('
                COUNT(*) as total_rentals,
                COUNT(CASE WHEN status = "pending" THEN 1 END) as pending_rentals,
                COUNT(CASE WHEN status = "completed" THEN 1 END) as completed_rentals
            ')->first();
            
            self::set('stats:rentals', $rentalStats, 3600, ['statistics']);
            
            // Cache purchase statistics
            $purchaseStats = \App\Models\Purchase::selectRaw('
                COUNT(*) as total_purchases,
                COUNT(CASE WHEN status = "pending" THEN 1 END) as pending_purchases,
                COUNT(CASE WHEN status = "completed" THEN 1 END) as completed_purchases
            ')->first();
            
            self::set('stats:purchases', $purchaseStats, 3600, ['statistics']);
            
            return true;
        } catch (\Exception $e) {
            Log::error("Cache warm-up error: " . $e->getMessage());
            return false;
        }
    }

    /**
     * Get cache statistics
     */
    public static function getCacheStats()
    {
        try {
            $stats = [
                'redis_memory' => 0,
                'redis_keys' => 0,
                'file_cache_size' => 0
            ];
            
            if (config('cache.default') === 'redis') {
                $info = Redis::info();
                $stats['redis_memory'] = $info['used_memory_human'] ?? '0B';
                $stats['redis_keys'] = $info['db0']['keys'] ?? 0;
            }
            
            return $stats;
        } catch (\Exception $e) {
            Log::error("Cache stats error: " . $e->getMessage());
            return [];
        }
    }

    /**
     * Clear all caches
     */
    public static function clearAll()
    {
        try {
            Cache::flush();
            
            if (config('cache.default') === 'redis') {
                Redis::flushdb();
            }
            
            return true;
        } catch (\Exception $e) {
            Log::error("Cache clear error: " . $e->getMessage());
            return false;
        }
    }
}

