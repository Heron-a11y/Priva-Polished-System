<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;
use App\Services\EnhancedCacheService;
use App\Services\QueryOptimizationService;

class PerformanceOptimizationMiddleware
{
    /**
     * Handle an incoming request.
     */
    public function handle(Request $request, Closure $next)
    {
        $startTime = microtime(true);
        $startMemory = memory_get_usage();

        // Add performance headers
        $response = $next($request);

        // Calculate performance metrics
        $executionTime = microtime(true) - $startTime;
        $memoryUsage = memory_get_usage() - $startMemory;
        $peakMemory = memory_get_peak_usage();

        // Add performance headers
        $response->headers->set('X-Execution-Time', round($executionTime * 1000, 2) . 'ms');
        $response->headers->set('X-Memory-Usage', $this->formatBytes($memoryUsage));
        $response->headers->set('X-Peak-Memory', $this->formatBytes($peakMemory));

        // Log slow requests
        if ($executionTime > 1.0) { // Log requests taking more than 1 second
            Log::warning('Slow Request Detected', [
                'url' => $request->fullUrl(),
                'method' => $request->method(),
                'execution_time' => round($executionTime * 1000, 2) . 'ms',
                'memory_usage' => $this->formatBytes($memoryUsage),
                'user_agent' => $request->userAgent(),
                'ip' => $request->ip()
            ]);
        }

        // Cache response for GET requests if appropriate
        if ($request->isMethod('GET') && $this->shouldCache($request)) {
            $this->cacheResponse($request, $response);
        }

        return $response;
    }

    /**
     * Determine if the request should be cached
     */
    private function shouldCache(Request $request): bool
    {
        // Don't cache requests with query parameters that change frequently
        $excludedParams = ['page', 'per_page', 'search', 'sort'];
        $queryParams = $request->query();
        
        foreach ($excludedParams as $param) {
            if (isset($queryParams[$param])) {
                return false;
            }
        }

        // Cache static endpoints
        $cacheableEndpoints = [
            '/api/catalog',
            '/api/admin/customers/stats',
            '/api/admin/orders/stats',
            '/api/admin/appointments/stats'
        ];

        foreach ($cacheableEndpoints as $endpoint) {
            if (str_starts_with($request->path(), $endpoint)) {
                return true;
            }
        }

        return false;
    }

    /**
     * Cache the response
     */
    private function cacheResponse(Request $request, $response): void
    {
        try {
            $cacheKey = 'response:' . md5($request->fullUrl());
            $ttl = 300; // 5 minutes

            $cacheData = [
                'content' => $response->getContent(),
                'headers' => $response->headers->all(),
                'status' => $response->getStatusCode()
            ];

            Cache::put($cacheKey, $cacheData, $ttl);
        } catch (\Exception $e) {
            Log::error('Response caching failed: ' . $e->getMessage());
        }
    }

    /**
     * Format bytes to human readable format
     */
    private function formatBytes(int $bytes): string
    {
        $units = ['B', 'KB', 'MB', 'GB'];
        $bytes = max($bytes, 0);
        $pow = floor(($bytes ? log($bytes) : 0) / log(1024));
        $pow = min($pow, count($units) - 1);
        $bytes /= pow(1024, $pow);
        
        return round($bytes, 2) . ' ' . $units[$pow];
    }
}

