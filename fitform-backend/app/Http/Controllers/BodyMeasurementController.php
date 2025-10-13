<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Log;

class BodyMeasurementController extends Controller
{
    /**
     * Store body measurements from AR scan
     */
    public function store(Request $request): JsonResponse
    {
        try {
            // Validate the request
            $validator = Validator::make($request->all(), [
                'user_id' => 'required|integer|exists:users,id',
                'height' => 'required|numeric|min:100|max:250',
                'shoulder_width' => 'required|numeric|min:20|max:80',
                'chest' => 'required|numeric|min:60|max:150',
                'waist' => 'required|numeric|min:50|max:120',
                'hips' => 'required|numeric|min:60|max:150',
                'confidence' => 'required|numeric|min:0|max:1',
                'scan_type' => 'required|string|in:ar,manual',
                'device_info' => 'nullable|string',
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Validation failed',
                    'errors' => $validator->errors()
                ], 422);
            }

            $data = $validator->validated();

            // Log the measurement for debugging
            Log::info('AR Body Measurement received', [
                'user_id' => $data['user_id'],
                'measurements' => $data,
                'timestamp' => now()
            ]);

            // Store in database (you can create a measurements table)
            // For now, we'll just return success
            $measurement = [
                'id' => rand(1000, 9999), // Mock ID
                'user_id' => $data['user_id'],
                'height' => $data['height'],
                'shoulder_width' => $data['shoulder_width'],
                'chest' => $data['chest'],
                'waist' => $data['waist'],
                'hips' => $data['hips'],
                'confidence' => $data['confidence'],
                'scan_type' => $data['scan_type'],
                'device_info' => $data['device_info'] ?? null,
                'created_at' => now()->toISOString(),
                'updated_at' => now()->toISOString(),
            ];

            return response()->json([
                'success' => true,
                'message' => 'Body measurements stored successfully',
                'data' => $measurement
            ], 201);

        } catch (\Exception $e) {
            Log::error('Error storing body measurements', [
                'error' => $e->getMessage(),
                'request_data' => $request->all()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to store measurements',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get user's body measurements
     */
    public function index(Request $request): JsonResponse
    {
        try {
            $userId = $request->query('user_id');
            
            if (!$userId) {
                return response()->json([
                    'success' => false,
                    'message' => 'User ID is required'
                ], 400);
            }

            // Mock measurements for now
            $measurements = [
                [
                    'id' => 1,
                    'user_id' => $userId,
                    'height' => 175.5,
                    'shoulder_width' => 47.2,
                    'chest' => 98.5,
                    'waist' => 82.3,
                    'hips' => 94.7,
                    'confidence' => 0.89,
                    'scan_type' => 'ar',
                    'device_info' => 'Samsung Galaxy A26 5G',
                    'created_at' => now()->subDays(1)->toISOString(),
                ],
                [
                    'id' => 2,
                    'user_id' => $userId,
                    'height' => 175.2,
                    'shoulder_width' => 47.0,
                    'chest' => 98.1,
                    'waist' => 82.0,
                    'hips' => 94.5,
                    'confidence' => 0.91,
                    'scan_type' => 'ar',
                    'device_info' => 'Samsung Galaxy A26 5G',
                    'created_at' => now()->toISOString(),
                ]
            ];

            return response()->json([
                'success' => true,
                'data' => $measurements
            ]);

        } catch (\Exception $e) {
            Log::error('Error retrieving body measurements', [
                'error' => $e->getMessage(),
                'user_id' => $request->query('user_id')
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to retrieve measurements',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get latest body measurements for a user
     */
    public function latest(Request $request): JsonResponse
    {
        try {
            $userId = $request->query('user_id');
            
            if (!$userId) {
                return response()->json([
                    'success' => false,
                    'message' => 'User ID is required'
                ], 400);
            }

            // Mock latest measurement
            $latestMeasurement = [
                'id' => 2,
                'user_id' => $userId,
                'height' => 175.2,
                'shoulder_width' => 47.0,
                'chest' => 98.1,
                'waist' => 82.0,
                'hips' => 94.5,
                'confidence' => 0.91,
                'scan_type' => 'ar',
                'device_info' => 'Samsung Galaxy A26 5G',
                'created_at' => now()->toISOString(),
            ];

            return response()->json([
                'success' => true,
                'data' => $latestMeasurement
            ]);

        } catch (\Exception $e) {
            Log::error('Error retrieving latest body measurements', [
                'error' => $e->getMessage(),
                'user_id' => $request->query('user_id')
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to retrieve latest measurements',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Validate body measurements
     */
    public function validate(Request $request): JsonResponse
    {
        try {
            $validator = Validator::make($request->all(), [
                'height' => 'required|numeric|min:100|max:250',
                'shoulder_width' => 'required|numeric|min:20|max:80',
                'chest' => 'required|numeric|min:60|max:150',
                'waist' => 'required|numeric|min:50|max:120',
                'hips' => 'required|numeric|min:60|max:150',
                'confidence' => 'required|numeric|min:0|max:1',
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'valid' => false,
                    'message' => 'Validation failed',
                    'errors' => $validator->errors()
                ], 422);
            }

            $data = $validator->validated();

            // Additional business logic validation
            $warnings = [];
            
            // Check for unrealistic proportions
            if ($data['waist'] > $data['chest']) {
                $warnings[] = 'Waist measurement is larger than chest';
            }
            
            if ($data['hips'] < $data['waist']) {
                $warnings[] = 'Hips measurement is smaller than waist';
            }
            
            if ($data['confidence'] < 0.7) {
                $warnings[] = 'Low confidence score - consider rescanning';
            }

            return response()->json([
                'success' => true,
                'valid' => true,
                'warnings' => $warnings,
                'message' => empty($warnings) ? 'Measurements are valid' : 'Measurements have warnings'
            ]);

        } catch (\Exception $e) {
            Log::error('Error validating body measurements', [
                'error' => $e->getMessage(),
                'request_data' => $request->all()
            ]);

            return response()->json([
                'success' => false,
                'valid' => false,
                'message' => 'Failed to validate measurements',
                'error' => $e->getMessage()
            ], 500);
        }
    }
}
