<?php

use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\Storage;

Route::get('/', function () {
    return view('welcome');
});

// Handle OPTIONS requests for CORS
Route::options('/storage/{path}', function () {
    return response('', 200)
        ->header('Access-Control-Allow-Origin', '*')
        ->header('Access-Control-Allow-Methods', 'GET, OPTIONS')
        ->header('Access-Control-Allow-Headers', 'Content-Type');
})->where('path', '.*');

Route::options('/api/storage/{path}', function () {
    return response('', 200)
        ->header('Access-Control-Allow-Origin', '*')
        ->header('Access-Control-Allow-Methods', 'GET, OPTIONS')
        ->header('Access-Control-Allow-Headers', 'Content-Type');
})->where('path', '.*');

// Storage route to serve uploaded files via API
Route::get('/api/storage/{path}', function ($path) {
    // Use the public disk directly since files are stored in storage/app/public
    $fullPath = $path;
    
    // Check if file exists in storage
    if (!Storage::disk('public')->exists($fullPath)) {
        // Log the missing file for debugging
        \Log::warning('Storage file not found', [
            'requested_path' => $path,
            'full_path' => $fullPath,
            'storage_path' => Storage::disk('public')->path($fullPath)
        ]);
        
        // Return 404 for missing files
        return response()->json([
            'error' => 'File not found',
            'path' => $path
        ], 404);
    }
    
    $file = Storage::disk('public')->get($fullPath);
    $mimeType = Storage::disk('public')->mimeType($fullPath);
    
    return response($file, 200)
        ->header('Content-Type', $mimeType)
        ->header('Cache-Control', 'public, max-age=31536000') // Cache for 1 year
        ->header('Access-Control-Allow-Origin', '*') // Allow CORS
        ->header('Access-Control-Allow-Methods', 'GET, OPTIONS')
        ->header('Access-Control-Allow-Headers', 'Content-Type');
})->where('path', '.*');

// Direct storage route for public access (without /api prefix)
// This route must be registered BEFORE web middleware is applied
Route::get('/storage/{path}', function ($path) {
    \Log::info('Storage route hit', ['path' => $path, 'method' => request()->method()]);
    
    try {
        // Check if file exists
        if (!Storage::disk('public')->exists($path)) {
            \Log::warning('Storage file not found', [
                'requested_path' => $path,
                'storage_path' => Storage::disk('public')->path($path)
            ]);
            
            return response()->json([
                'error' => 'File not found',
                'path' => $path
            ], 404);
        }
        
        \Log::info('Serving storage file', ['path' => $path]);
        
        // Use Storage::response() which handles file serving properly
        return Storage::disk('public')->response($path)
            ->header('Cache-Control', 'public, max-age=31536000')
            ->header('Access-Control-Allow-Origin', '*')
            ->header('Access-Control-Allow-Methods', 'GET, OPTIONS')
            ->header('Access-Control-Allow-Headers', 'Content-Type');
    } catch (\Exception $e) {
        \Log::error('Error serving storage file', [
            'path' => $path,
            'error' => $e->getMessage(),
            'trace' => $e->getTraceAsString()
        ]);
        
        return response()->json([
            'error' => 'Error serving file',
            'message' => $e->getMessage()
        ], 500);
    }
})->where('path', '.*')->middleware([]);
