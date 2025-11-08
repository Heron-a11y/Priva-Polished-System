<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Http\Response;

class StorageController
{
    /**
     * Serve public storage files
     * This method is explicitly public and bypasses all middleware
     * Note: Does NOT extend Controller to avoid any middleware inheritance
     */
    public function serve(Request $request, string $path): Response
    {
        try {
            \Log::info('StorageController::serve called', [
                'path' => $path,
                'method' => $request->method(),
                'ip' => $request->ip(),
                'user_agent' => $request->userAgent()
            ]);
            
            // Check if file exists
            if (!Storage::disk('public')->exists($path)) {
                \Log::warning('Storage file not found in StorageController', [
                    'requested_path' => $path,
                    'storage_path' => Storage::disk('public')->path($path),
                    'files_in_profiles' => Storage::disk('public')->files('profiles')
                ]);
                
                return response()->json(['error' => 'File not found'], 404);
            }
            
            \Log::info('Serving file from StorageController', [
                'path' => $path,
                'file_size' => Storage::disk('public')->size($path),
                'mime_type' => Storage::disk('public')->mimeType($path)
            ]);
            
            // Serve the file with proper headers
            return Storage::disk('public')->response($path)
                ->header('Cache-Control', 'public, max-age=31536000')
                ->header('Access-Control-Allow-Origin', '*')
                ->header('Access-Control-Allow-Methods', 'GET, OPTIONS')
                ->header('Access-Control-Allow-Headers', 'Content-Type');
        } catch (\Exception $e) {
            \Log::error('Error in StorageController::serve', [
                'path' => $path,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            
            return response()->json([
                'error' => 'Error serving file',
                'message' => $e->getMessage()
            ], 500);
        }
    }
}

