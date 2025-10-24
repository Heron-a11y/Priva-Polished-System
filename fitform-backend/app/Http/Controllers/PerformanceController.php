<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Services\PerformanceMonitoringService;

class PerformanceController extends Controller
{
    /**
     * Get database performance metrics
     */
    public function getMetrics()
    {
        try {
            $metrics = PerformanceMonitoringService::getDatabaseMetrics();
            
            return response()->json([
                'success' => true,
                'metrics' => $metrics,
                'timestamp' => now()
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to get performance metrics',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get pagination performance metrics
     */
    public function getPaginationMetrics()
    {
        try {
            $metrics = PerformanceMonitoringService::getPaginationMetrics();
            
            return response()->json([
                'success' => true,
                'metrics' => $metrics,
                'timestamp' => now()
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to get pagination metrics',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get performance recommendations
     */
    public function getRecommendations()
    {
        try {
            $recommendations = PerformanceMonitoringService::getPerformanceRecommendations();
            
            return response()->json([
                'success' => true,
                'recommendations' => $recommendations,
                'timestamp' => now()
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to get performance recommendations',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Optimize database performance
     */
    public function optimizeDatabase()
    {
        try {
            $result = PerformanceMonitoringService::optimizeDatabase();
            
            if ($result) {
                return response()->json([
                    'success' => true,
                    'message' => 'Database optimization completed successfully',
                    'timestamp' => now()
                ]);
            } else {
                return response()->json([
                    'success' => false,
                    'message' => 'Database optimization failed'
                ], 500);
            }
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to optimize database',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get system performance overview
     */
    public function getOverview()
    {
        try {
            $overview = [
                'database_metrics' => PerformanceMonitoringService::getDatabaseMetrics(),
                'pagination_metrics' => PerformanceMonitoringService::getPaginationMetrics(),
                'recommendations' => PerformanceMonitoringService::getPerformanceRecommendations(),
                'system_info' => [
                    'php_version' => PHP_VERSION,
                    'laravel_version' => app()->version(),
                    'memory_limit' => ini_get('memory_limit'),
                    'max_execution_time' => ini_get('max_execution_time'),
                    'timestamp' => now()
                ]
            ];

            return response()->json([
                'success' => true,
                'overview' => $overview
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to get system overview',
                'error' => $e->getMessage()
            ], 500);
        }
    }
}


