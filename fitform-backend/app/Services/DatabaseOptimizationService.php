<?php

namespace App\Services;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;
use Illuminate\Database\Eloquent\Builder;

class DatabaseOptimizationService
{
    /**
     * Optimize database queries with proper indexing and caching
     */
    public static function optimizeQuery(Builder $query, array $options = [])
    {
        $defaultOptions = [
            'use_index' => [],
            'cache' => true,
            'cache_ttl' => 300,
            'cache_key' => null,
            'batch_size' => 1000,
            'eager_load' => []
        ];

        $options = array_merge($defaultOptions, $options);

        // Add index hints if provided
        if (!empty($options['use_index'])) {
            $query->getQuery()->useIndex($options['use_index']);
        }

        // Add eager loading to prevent N+1 queries
        if (!empty($options['eager_load'])) {
            $query->with($options['eager_load']);
        }

        // Apply caching if enabled
        if ($options['cache'] && $options['cache_key']) {
            $cacheKey = $options['cache_key'];
            $ttl = $options['cache_ttl'];

            return Cache::remember($cacheKey, $ttl, function () use ($query) {
                return $query->get();
            });
        }

        return $query->get();
    }

    /**
     * Optimize user queries with proper relationships
     */
    public static function getOptimizedUsers(array $filters = [])
    {
        $cacheKey = 'optimized_users_' . md5(serialize($filters));
        
        return Cache::remember($cacheKey, 300, function () use ($filters) {
            $query = \App\Models\User::select([
                'id', 'name', 'email', 'phone', 'role', 'account_status',
                'created_at', 'updated_at', 'profile_image'
            ])
            ->withCount([
                'appointments',
                'rentals',
                'purchases'
            ]);

            // Apply filters
            if (isset($filters['status']) && $filters['status'] !== 'all') {
                $query->where('account_status', $filters['status']);
            }

            if (isset($filters['role']) && $filters['role'] !== 'all') {
                $query->where('role', $filters['role']);
            }

            if (isset($filters['search']) && !empty($filters['search'])) {
                $search = $filters['search'];
                $query->where(function ($q) use ($search) {
                    $q->where('name', 'like', "%{$search}%")
                      ->orWhere('email', 'like', "%{$search}%")
                      ->orWhere('phone', 'like', "%{$search}%");
                });
            }

            return $query->get();
        });
    }

    /**
     * Optimize rental queries with relationships
     */
    public static function getOptimizedRentals(array $filters = [])
    {
        $cacheKey = 'optimized_rentals_' . md5(serialize($filters));
        
        return Cache::remember($cacheKey, 180, function () use ($filters) {
            $query = \App\Models\Rental::select([
                'id', 'user_id', 'item_name', 'status', 'rental_date',
                'return_date', 'quotation_amount', 'created_at', 'updated_at'
            ])
            ->with(['user:id,name,email']);

            // Apply filters
            if (isset($filters['user_id'])) {
                $query->where('user_id', $filters['user_id']);
            }

            if (isset($filters['status']) && $filters['status'] !== 'all') {
                $query->where('status', $filters['status']);
            }

            if (isset($filters['date_from'])) {
                $query->where('rental_date', '>=', $filters['date_from']);
            }

            if (isset($filters['date_to'])) {
                $query->where('rental_date', '<=', $filters['date_to']);
            }

            return $query->get();
        });
    }

    /**
     * Optimize purchase queries with relationships
     */
    public static function getOptimizedPurchases(array $filters = [])
    {
        $cacheKey = 'optimized_purchases_' . md5(serialize($filters));
        
        return Cache::remember($cacheKey, 180, function () use ($filters) {
            $query = \App\Models\Purchase::select([
                'id', 'user_id', 'item_name', 'status', 'purchase_date',
                'quotation_amount', 'created_at', 'updated_at'
            ])
            ->with(['user:id,name,email']);

            // Apply filters
            if (isset($filters['user_id'])) {
                $query->where('user_id', $filters['user_id']);
            }

            if (isset($filters['status']) && $filters['status'] !== 'all') {
                $query->where('status', $filters['status']);
            }

            if (isset($filters['date_from'])) {
                $query->where('purchase_date', '>=', $filters['date_from']);
            }

            if (isset($filters['date_to'])) {
                $query->where('purchase_date', '<=', $filters['date_to']);
            }

            return $query->get();
        });
    }

    /**
     * Get optimized statistics with single queries
     */
    public static function getOptimizedStats()
    {
        $cacheKey = 'optimized_stats';
        
        return Cache::remember($cacheKey, 600, function () {
            // Get all statistics in a single query
            $stats = DB::select("
                SELECT 
                    (SELECT COUNT(*) FROM users WHERE role IN ('customer', 'admin') AND email != 'admin@fitform.com') as total_users,
                    (SELECT COUNT(*) FROM users WHERE role IN ('customer', 'admin') AND email != 'admin@fitform.com' AND account_status = 'active') as active_users,
                    (SELECT COUNT(*) FROM users WHERE role IN ('customer', 'admin') AND email != 'admin@fitform.com' AND account_status = 'suspended') as suspended_users,
                    (SELECT COUNT(*) FROM users WHERE role IN ('customer', 'admin') AND email != 'admin@fitform.com' AND account_status = 'banned') as banned_users,
                    (SELECT COUNT(*) FROM rentals) as total_rentals,
                    (SELECT COUNT(*) FROM rentals WHERE status = 'pending') as pending_rentals,
                    (SELECT COUNT(*) FROM rentals WHERE status = 'completed') as completed_rentals,
                    (SELECT COUNT(*) FROM purchases) as total_purchases,
                    (SELECT COUNT(*) FROM purchases WHERE status = 'pending') as pending_purchases,
                    (SELECT COUNT(*) FROM purchases WHERE status = 'completed') as completed_purchases,
                    (SELECT COUNT(*) FROM appointments) as total_appointments,
                    (SELECT COUNT(*) FROM appointments WHERE status = 'pending') as pending_appointments,
                    (SELECT COUNT(*) FROM appointments WHERE status = 'confirmed') as confirmed_appointments
            ");

            return $stats[0] ?? (object)[];
        });
    }

    /**
     * Optimize database connection settings
     */
    public static function optimizeConnection()
    {
        try {
            // Set optimal MySQL settings
            DB::statement("SET SESSION sql_mode = 'STRICT_TRANS_TABLES,NO_ZERO_DATE,NO_ZERO_IN_DATE,ERROR_FOR_DIVISION_BY_ZERO'");
            DB::statement("SET SESSION wait_timeout = 28800");
            DB::statement("SET SESSION interactive_timeout = 28800");
            DB::statement("SET SESSION max_connections = 100");
            DB::statement("SET SESSION query_cache_size = 268435456");
            DB::statement("SET SESSION query_cache_type = 1");
            
            return true;
        } catch (\Exception $e) {
            Log::error('Database connection optimization failed: ' . $e->getMessage());
            return false;
        }
    }

    /**
     * Analyze and optimize slow queries
     */
    public static function analyzeSlowQueries()
    {
        try {
            $slowQueries = DB::select("
                SELECT 
                    query_time,
                    lock_time,
                    rows_sent,
                    rows_examined,
                    sql_text
                FROM mysql.slow_log 
                WHERE start_time > DATE_SUB(NOW(), INTERVAL 1 HOUR)
                ORDER BY query_time DESC
                LIMIT 10
            ");

            return $slowQueries;
        } catch (\Exception $e) {
            Log::error('Slow query analysis failed: ' . $e->getMessage());
            return [];
        }
    }

    /**
     * Get database performance metrics
     */
    public static function getDatabaseMetrics()
    {
        try {
            $metrics = Cache::remember('db_performance_metrics', 300, function () {
                $result = DB::select("
                    SELECT 
                        VARIABLE_NAME,
                        VARIABLE_VALUE
                    FROM information_schema.GLOBAL_STATUS 
                    WHERE VARIABLE_NAME IN (
                        'Queries',
                        'Slow_queries',
                        'Connections',
                        'Max_used_connections',
                        'Threads_connected',
                        'Threads_running',
                        'Innodb_buffer_pool_hit_rate'
                    )
                ");

                $metrics = [];
                foreach ($result as $row) {
                    $metrics[$row->VARIABLE_NAME] = $row->VARIABLE_VALUE;
                }

                return $metrics;
            });

            return $metrics;
        } catch (\Exception $e) {
            Log::error('Database metrics retrieval failed: ' . $e->getMessage());
            return [];
        }
    }

    /**
     * Clear performance-related caches
     */
    public static function clearPerformanceCaches()
    {
        try {
            $patterns = [
                'optimized_users_*',
                'optimized_rentals_*',
                'optimized_purchases_*',
                'optimized_stats',
                'db_performance_metrics'
            ];

            foreach ($patterns as $pattern) {
                Cache::forget($pattern);
            }

            return true;
        } catch (\Exception $e) {
            Log::error('Performance cache clearing failed: ' . $e->getMessage());
            return false;
        }
    }

    /**
     * Optimize table indexes
     */
    public static function optimizeIndexes()
    {
        try {
            $tables = ['users', 'rentals', 'purchases', 'appointments', 'rental_purchase_history'];
            
            foreach ($tables as $table) {
                DB::statement("OPTIMIZE TABLE {$table}");
            }

            return true;
        } catch (\Exception $e) {
            Log::error('Index optimization failed: ' . $e->getMessage());
            return false;
        }
    }
}

