<?php

namespace App\Services;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Cache;

class PerformanceMonitoringService
{
    /**
     * Monitor query performance
     */
    public static function logSlowQueries($threshold = 1000)
    {
        DB::listen(function ($query) use ($threshold) {
            if ($query->time > $threshold) {
                Log::warning('Slow Query Detected', [
                    'sql' => $query->sql,
                    'bindings' => $query->bindings,
                    'time' => $query->time . 'ms',
                    'connection' => $query->connectionName
                ]);
            }
        });
    }

    /**
     * Get database performance metrics
     */
    public static function getDatabaseMetrics()
    {
        try {
            $metrics = Cache::remember('db_metrics', 300, function () {
                return [
                    'total_queries' => self::getTotalQueries(),
                    'slow_queries' => self::getSlowQueries(),
                    'table_sizes' => self::getTableSizes(),
                    'index_usage' => self::getIndexUsage(),
                    'connection_pool' => self::getConnectionPoolStatus()
                ];
            });

            return $metrics;
        } catch (\Exception $e) {
            Log::error('Failed to get database metrics: ' . $e->getMessage());
            return null;
        }
    }

    /**
     * Get total number of queries executed
     */
    private static function getTotalQueries()
    {
        try {
            $result = DB::select("SHOW STATUS LIKE 'Queries'");
            return $result[0]->Value ?? 0;
        } catch (\Exception $e) {
            return 0;
        }
    }

    /**
     * Get slow queries count
     */
    private static function getSlowQueries()
    {
        try {
            $result = DB::select("SHOW STATUS LIKE 'Slow_queries'");
            return $result[0]->Value ?? 0;
        } catch (\Exception $e) {
            return 0;
        }
    }

    /**
     * Get table sizes
     */
    private static function getTableSizes()
    {
        try {
            $tables = ['rentals', 'purchases', 'rental_purchase_history', 'users', 'notifications', 'appointments'];
            $sizes = [];

            foreach ($tables as $table) {
                $result = DB::select("
                    SELECT 
                        table_name,
                        ROUND(((data_length + index_length) / 1024 / 1024), 2) AS size_mb,
                        table_rows
                    FROM information_schema.TABLES 
                    WHERE table_schema = DATABASE() 
                    AND table_name = ?
                ", [$table]);

                if (!empty($result)) {
                    $sizes[$table] = [
                        'size_mb' => $result[0]->size_mb,
                        'rows' => $result[0]->table_rows
                    ];
                }
            }

            return $sizes;
        } catch (\Exception $e) {
            return [];
        }
    }

    /**
     * Get index usage statistics
     */
    private static function getIndexUsage()
    {
        try {
            $result = DB::select("
                SELECT 
                    table_name,
                    index_name,
                    cardinality,
                    sub_part,
                    packed,
                    nullable,
                    index_type
                FROM information_schema.STATISTICS 
                WHERE table_schema = DATABASE()
                AND table_name IN ('rentals', 'purchases', 'rental_purchase_history', 'users', 'notifications')
                ORDER BY table_name, cardinality DESC
            ");

            return $result;
        } catch (\Exception $e) {
            return [];
        }
    }

    /**
     * Get connection pool status
     */
    private static function getConnectionPoolStatus()
    {
        try {
            $result = DB::select("SHOW STATUS LIKE 'Threads_connected'");
            $connected = $result[0]->Value ?? 0;

            $result = DB::select("SHOW STATUS LIKE 'Max_used_connections'");
            $maxUsed = $result[0]->Value ?? 0;

            $result = DB::select("SHOW VARIABLES LIKE 'max_connections'");
            $maxConnections = $result[0]->Value ?? 0;

            return [
                'current_connections' => $connected,
                'max_used_connections' => $maxUsed,
                'max_connections' => $maxConnections,
                'usage_percentage' => $maxConnections > 0 ? round(($maxUsed / $maxConnections) * 100, 2) : 0
            ];
        } catch (\Exception $e) {
            return [];
        }
    }

    /**
     * Get pagination performance metrics
     */
    public static function getPaginationMetrics()
    {
        try {
            $metrics = Cache::remember('pagination_metrics', 600, function () {
                return [
                    'rentals_pagination' => self::getTablePaginationMetrics('rentals'),
                    'purchases_pagination' => self::getTablePaginationMetrics('purchases'),
                    'history_pagination' => self::getTablePaginationMetrics('rental_purchase_history'),
                    'users_pagination' => self::getTablePaginationMetrics('users'),
                    'notifications_pagination' => self::getTablePaginationMetrics('notifications')
                ];
            });

            return $metrics;
        } catch (\Exception $e) {
            Log::error('Failed to get pagination metrics: ' . $e->getMessage());
            return null;
        }
    }

    /**
     * Get pagination metrics for a specific table
     */
    private static function getTablePaginationMetrics($table)
    {
        try {
            $totalRows = DB::table($table)->count();
            $avgPageSize = 20; // Default page size
            $totalPages = ceil($totalRows / $avgPageSize);

            return [
                'total_rows' => $totalRows,
                'estimated_pages' => $totalPages,
                'avg_page_size' => $avgPageSize,
                'last_updated' => now()
            ];
        } catch (\Exception $e) {
            return null;
        }
    }

    /**
     * Optimize database performance
     */
    public static function optimizeDatabase()
    {
        try {
            // Analyze tables for better query planning
            $tables = ['rentals', 'purchases', 'rental_purchase_history', 'users', 'notifications', 'appointments'];
            
            foreach ($tables as $table) {
                DB::statement("ANALYZE TABLE {$table}");
            }

            // Optimize tables to reclaim space
            foreach ($tables as $table) {
                DB::statement("OPTIMIZE TABLE {$table}");
            }

            Log::info('Database optimization completed');
            return true;
        } catch (\Exception $e) {
            Log::error('Database optimization failed: ' . $e->getMessage());
            return false;
        }
    }

    /**
     * Get performance recommendations
     */
    public static function getPerformanceRecommendations()
    {
        $recommendations = [];

        try {
            $metrics = self::getDatabaseMetrics();
            
            if ($metrics) {
                // Check for large tables
                foreach ($metrics['table_sizes'] as $table => $size) {
                    if ($size['size_mb'] > 100) {
                        $recommendations[] = [
                            'type' => 'large_table',
                            'table' => $table,
                            'size_mb' => $size['size_mb'],
                            'recommendation' => "Consider archiving old data from {$table} table"
                        ];
                    }
                }

                // Check connection pool usage
                if ($metrics['connection_pool']['usage_percentage'] > 80) {
                    $recommendations[] = [
                        'type' => 'connection_pool',
                        'usage_percentage' => $metrics['connection_pool']['usage_percentage'],
                        'recommendation' => 'Consider increasing max_connections or optimizing connection usage'
                    ];
                }

                // Check for slow queries
                if ($metrics['slow_queries'] > 10) {
                    $recommendations[] = [
                        'type' => 'slow_queries',
                        'count' => $metrics['slow_queries'],
                        'recommendation' => 'Review and optimize slow queries'
                    ];
                }
            }

            return $recommendations;
        } catch (\Exception $e) {
            Log::error('Failed to get performance recommendations: ' . $e->getMessage());
            return [];
        }
    }
}


