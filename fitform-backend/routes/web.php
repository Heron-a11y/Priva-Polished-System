<?php

use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\Storage;

Route::get('/', function () {
    return view('welcome');
});

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
        ->header('Cache-Control', 'public, max-age=31536000'); // Cache for 1 year
})->where('path', '.*');

// Direct storage route for public access (without /api prefix)
Route::get('/storage/{path}', function ($path) {
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
        ->header('Cache-Control', 'public, max-age=31536000'); // Cache for 1 year
})->where('path', '.*');
