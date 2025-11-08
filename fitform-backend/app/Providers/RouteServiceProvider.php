<?php

namespace App\Providers;

use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Foundation\Support\Providers\RouteServiceProvider as ServiceProvider;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\Storage;

class RouteServiceProvider extends ServiceProvider
{
    /**
     * The path to your application's "home" route.
     *
     * Typically, users are redirected here after authentication.
     *
     * @var string
     */
    public const HOME = '/home';

    /**
     * Define your route model bindings, pattern filters, and other route configuration.
     */
    public function boot(): void
    {
        RateLimiter::for('api', function (Request $request) {
            return Limit::perMinute(60)->by($request->user()?->id ?: $request->ip());
        });

        $this->routes(function () {
            // Register public storage routes FIRST, before any middleware groups
            // These routes serve files and MUST be public
            
            // Route for /api/storage/{path} (new format)
            Route::get('/api/storage/{path}', function ($path) {
                try {
                    \Log::info('Public API Storage route accessed', [
                        'path' => $path,
                        'method' => request()->method(),
                        'ip' => request()->ip()
                    ]);
                    
                    if (!Storage::disk('public')->exists($path)) {
                        \Log::warning('Storage file not found', [
                            'requested_path' => $path,
                            'storage_path' => Storage::disk('public')->path($path)
                        ]);
                        return response()->json(['error' => 'File not found'], 404);
                    }
                    
                    \Log::info('Serving file from public API storage route', [
                        'path' => $path,
                        'file_size' => Storage::disk('public')->size($path),
                        'mime_type' => Storage::disk('public')->mimeType($path)
                    ]);
                    
                    $response = Storage::disk('public')->response($path);
                    $response->headers->set('Cache-Control', 'public, max-age=31536000');
                    $response->headers->set('Access-Control-Allow-Origin', '*');
                    $response->headers->set('Access-Control-Allow-Methods', 'GET, OPTIONS');
                    $response->headers->set('Access-Control-Allow-Headers', 'Content-Type');
                    return $response;
                } catch (\Exception $e) {
                    \Log::error('Error serving file from public API storage route', [
                        'path' => $path,
                        'error' => $e->getMessage()
                    ]);
                    return response()->json(['error' => 'Error serving file'], 500);
                }
            })->where('path', '.*');
            
            // Route for /storage/{path} (backward compatibility)
            Route::get('/storage/{path}', function ($path) {
                try {
                    \Log::info('Public Storage route accessed (backward compatibility)', [
                        'path' => $path,
                        'method' => request()->method(),
                        'ip' => request()->ip()
                    ]);
                    
                    if (!Storage::disk('public')->exists($path)) {
                        \Log::warning('Storage file not found', [
                            'requested_path' => $path,
                            'storage_path' => Storage::disk('public')->path($path)
                        ]);
                        return response()->json(['error' => 'File not found'], 404);
                    }
                    
                    \Log::info('Serving file from public storage route', [
                        'path' => $path,
                        'file_size' => Storage::disk('public')->size($path),
                        'mime_type' => Storage::disk('public')->mimeType($path)
                    ]);
                    
                    $response = Storage::disk('public')->response($path);
                    $response->headers->set('Cache-Control', 'public, max-age=31536000');
                    $response->headers->set('Access-Control-Allow-Origin', '*');
                    $response->headers->set('Access-Control-Allow-Methods', 'GET, OPTIONS');
                    $response->headers->set('Access-Control-Allow-Headers', 'Content-Type');
                    return $response;
                } catch (\Exception $e) {
                    \Log::error('Error serving file from public storage route', [
                        'path' => $path,
                        'error' => $e->getMessage()
                    ]);
                    return response()->json(['error' => 'Error serving file'], 500);
                }
            })->where('path', '.*');
            
            Route::middleware('api')
                ->prefix('api')
                ->group(base_path('routes/api.php'));

            Route::middleware('web')
                ->group(base_path('routes/web.php'));
        });
    }
} 