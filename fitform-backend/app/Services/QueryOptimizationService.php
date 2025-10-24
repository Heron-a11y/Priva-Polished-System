<?php

namespace App\Services;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Cache;
use Illuminate\Database\Eloquent\Builder;

class QueryOptimizationService
{
    /**
     * Optimize queries with proper indexing hints
     */
    public static function optimizeQuery(Builder $query, array $indexes = [])
    {
        // Add index hints if provided
        if (!empty($indexes)) {
            $query->getQuery()->useIndex($indexes);
        }
        
        return $query;
    }

    /**
     * Get optimized customer data with pre-loaded relationships
     */
    public static function getOptimizedCustomers($filters = [])
    {
        $cacheKey = 'optimized_customers_' . md5(serialize($filters));
        
        return Cache::remember($cacheKey, 300, function () use ($filters) {
            $query = \App\Models\User::whereIn('role', ['customer', 'admin'])
                ->where('email', '!=', 'admin@fitform.com')
                ->withCount([
                    'appointments',
                    'rentals', 
                    'purchases'
                ])
                ->select([
                    'id', 'name', 'email', 'phone', 'role', 'account_status',
                    'created_at', 'updated_at', 'profile_image'
                ]);

            // Apply filters
            if (isset($filters['status']) && $filters['status'] !== 'all') {
                $query->where('account_status', $filters['status']);
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
     * Get optimized rental data with relationships
     */
    public static function getOptimizedRentals($userId = null)
    {
        $cacheKey = 'optimized_rentals_' . ($userId ?? 'all');
        
        return Cache::remember($cacheKey, 180, function () use ($userId) {
            $query = \App\Models\Rental::with(['user:id,name,email'])
                ->select([
                    'id', 'user_id', 'item_name', 'status', 'rental_date', 
                    'return_date', 'quotation_amount', 'created_at', 'updated_at'
                ]);

            if ($userId) {
                $query->where('user_id', $userId);
            }

            return $query->get();
        });
    }

    /**
     * Get optimized purchase data with relationships
     */
    public static function getOptimizedPurchases($userId = null)
    {
        $cacheKey = 'optimized_purchases_' . ($userId ?? 'all');
        
        return Cache::remember($cacheKey, 180, function () use ($userId) {
            $query = \App\Models\Purchase::with(['user:id,name,email'])
                ->select([
                    'id', 'user_id', 'item_name', 'status', 'purchase_date',
                    'quotation_amount', 'created_at', 'updated_at'
                ]);

            if ($userId) {
                $query->where('user_id', $userId);
            }

            return $query->get();
        });
    }

    /**
     * Batch load related data to avoid N+1 queries
     */
    public static function batchLoadRelations(array $items, array $relations)
    {
        if (empty($items)) {
            return $items;
        }

        $ids = collect($items)->pluck('id')->toArray();
        
        foreach ($relations as $relation) {
            $relatedData = \App\Models\User::whereIn('id', $ids)
                ->with($relation)
                ->get()
                ->keyBy('id');

            foreach ($items as &$item) {
                if (isset($relatedData[$item['id']])) {
                    $item[$relation] = $relatedData[$item['id']]->$relation;
                }
            }
        }

        return $items;
    }

    /**
     * Optimize database connection pool
     */
    public static function optimizeConnectionPool()
    {
        try {
            // Set optimal connection pool settings
            DB::statement("SET SESSION wait_timeout = 28800");
            DB::statement("SET SESSION interactive_timeout = 28800");
            DB::statement("SET SESSION max_connections = 100");
            
            return true;
        } catch (\Exception $e) {
            \Log::error('Failed to optimize connection pool: ' . $e->getMessage());
            return false;
        }
    }

    /**
     * Get query execution plan for optimization
     */
    public static function getQueryPlan($sql)
    {
        try {
            $result = DB::select("EXPLAIN " . $sql);
            return $result;
        } catch (\Exception $e) {
            \Log::error('Failed to get query plan: ' . $e->getMessage());
            return null;
        }
    }

    /**
     * Clear performance-related caches
     */
    public static function clearPerformanceCaches()
    {
        $patterns = [
            'optimized_customers_*',
            'optimized_rentals_*',
            'optimized_purchases_*',
            'db_metrics',
            'performance_*'
        ];

        foreach ($patterns as $pattern) {
            Cache::forget($pattern);
        }

        return true;
    }
}

