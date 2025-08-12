<?php

namespace App\Http\Controllers;

use App\Models\SizingStandard;
use App\Models\SizeRecommendation;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Validator;

class SizingController extends Controller
{
    /**
     * Get size recommendations for a customer
     */
    public function getSizeRecommendations(Request $request)
    {
        $user = Auth::user();
        
        if (!$user) {
            return response()->json([
                'success' => false,
                'message' => 'User not authenticated'
            ], 401);
        }
        
        $recommendations = SizeRecommendation::where('user_id', $user->id)
            ->with('sizingStandard')
            ->orderBy('last_updated', 'desc')
            ->get();

        return response()->json([
            'success' => true,
            'data' => $recommendations
        ]);
    }

    /**
     * Get size charts for a specific category and gender
     */
    public function getSizeCharts(Request $request)
    {
        // Log the incoming request for debugging
        \Log::info('getSizeCharts called with parameters:', $request->all());
        
        $validator = Validator::make($request->all(), [
            'category' => 'nullable|string',
            'gender' => 'nullable|string'
        ]);

        if ($validator->fails()) {
            \Log::error('getSizeCharts validation failed:', $validator->errors()->toArray());
            return response()->json([
                'success' => false,
                'errors' => $validator->errors()
            ], 422);
        }

        $query = SizingStandard::where('is_active', true);
        
        \Log::info('Initial query:', ['query' => $query->toSql(), 'bindings' => $query->getBindings()]);
        
        // Add category filter if provided
        if ($request->has('category') && $request->category && $request->category !== 'all') {
            $query->where('category', $request->category);
            \Log::info('Added category filter:', ['category' => $request->category]);
        }
        
        // Add gender filter if provided
        if ($request->has('gender') && $request->gender && $request->gender !== 'all') {
            $query->where('gender', $request->gender);
            \Log::info('Added gender filter:', ['gender' => $request->gender]);
        }

        $standards = $query->get();
        
        \Log::info('Final query result:', [
            'total_count' => $standards->count(),
            'standards' => $standards->map(function($s) { 
                return ['id' => $s->id, 'name' => $s->name, 'category' => $s->category, 'gender' => $s->gender]; 
            })->toArray()
        ]);

        // Log all active standards for debugging
        $allActiveStandards = SizingStandard::where('is_active', true)->get();
        \Log::info('All active standards in database:', [
            'total' => $allActiveStandards->count(),
            'standards' => $allActiveStandards->map(function($s) { 
                return ['id' => $s->id, 'name' => $s->name, 'category' => $s->category, 'gender' => $s->gender]; 
            })->toArray()
        ]);

        return response()->json([
            'success' => true,
            'data' => $standards
        ]);
    }

    /**
     * Match customer measurements to size categories and get recommendations
     */
    public function matchMeasurements(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'category' => 'required|string',
            'gender' => 'required|in:male,female,unisex',
            'measurements' => 'required|array',
            'measurements.chest' => 'required|numeric',
            'measurements.waist' => 'required|numeric',
            'measurements.hips' => 'required|numeric',
            'measurements.length' => 'required|numeric',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors()
            ], 422);
        }

        $user = Auth::user();
        $measurements = $request->measurements;
        
        // Get the appropriate sizing standard
        $standard = SizingStandard::where('category', $request->category)
            ->where('gender', $request->gender)
            ->where('is_active', true)
            ->first();

        if (!$standard) {
            return response()->json([
                'success' => false,
                'message' => 'No sizing standard found for this category and gender'
            ], 404);
        }

        // Simple size matching algorithm (can be enhanced)
        $recommendedSize = $this->calculateSize($measurements, $standard);
        $confidenceScore = $this->calculateConfidence($measurements, $standard);

        // Save or update the recommendation
        $recommendation = SizeRecommendation::updateOrCreate(
            [
                'user_id' => $user->id,
                'sizing_standard_id' => $standard->id
            ],
            [
                'customer_measurements' => $measurements,
                'recommended_size' => $recommendedSize,
                'confidence_score' => $confidenceScore,
                'last_updated' => now()
            ]
        );

        return response()->json([
            'success' => true,
            'data' => [
                'recommended_size' => $recommendedSize,
                'confidence_score' => $confidenceScore,
                'sizing_standard' => $standard,
                'measurements_used' => $measurements
            ]
        ]);
    }

    /**
     * Admin: Get all sizing standards
     */
    public function getSizingStandards(Request $request)
    {
        if (!Auth::user()->isAdmin()) {
            return response()->json([
                'success' => false,
                'message' => 'Unauthorized'
            ], 403);
        }

        $standards = SizingStandard::with('updatedBy')
            ->orderBy('category')
            ->orderBy('gender')
            ->get();

        return response()->json([
            'success' => true,
            'data' => $standards
        ]);
    }

    /**
     * Admin: Create or update sizing standard
     */
    public function updateSizingStandard(Request $request)
    {
        if (!Auth::user()->isAdmin()) {
            return response()->json([
                'success' => false,
                'message' => 'Unauthorized'
            ], 403);
        }

        // Log the incoming request for debugging
        \Log::info('updateSizingStandard called with data:', $request->all());

        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:255',
            'category' => 'required|string|max:100',
            'gender' => 'required|in:male,female,unisex',
            'measurements' => 'required|array',
            'size_categories' => 'required|array',
            'is_active' => 'boolean'
        ]);

        if ($validator->fails()) {
            \Log::error('updateSizingStandard validation failed:', $validator->errors()->toArray());
            return response()->json([
                'success' => false,
                'errors' => $validator->errors(),
                'message' => 'Validation failed'
            ], 422);
        }

        // Validate that size_categories has the required structure
        $sizeCategories = $request->size_categories;
        if (!is_array($sizeCategories) || empty($sizeCategories)) {
            return response()->json([
                'success' => false,
                'errors' => ['size_categories' => ['Size categories must contain at least one size']],
                'message' => 'Size categories structure validation failed'
            ], 422);
        }

        // Validate each size category has required measurements
        foreach ($sizeCategories as $size => $measurements) {
            if (!is_array($measurements) || empty($measurements)) {
                return response()->json([
                    'success' => false,
                    'errors' => ['size_categories' => ["Size '$size' must have measurements"]],
                    'message' => 'Size categories structure validation failed'
                ], 422);
            }
            
            // Check that each measurement has a numeric value
            foreach ($measurements as $measurementType => $value) {
                if (!is_numeric($value) || $value < 0) {
                    return response()->json([
                        'success' => false,
                        'errors' => ['size_categories' => ["Size '$size' measurement '$measurementType' must be a positive number"]],
                        'message' => 'Invalid measurement values'
                    ], 422);
                }
            }
        }

        // Validate measurements array
        $measurements = $request->measurements;
        if (!is_array($measurements) || empty($measurements)) {
            return response()->json([
                'success' => false,
                'errors' => ['measurements' => ['Measurements must contain at least one measurement']],
                'message' => 'Measurements validation failed'
            ], 422);
        }

        // Check that each measurement has a numeric value
        foreach ($measurements as $measurementType => $value) {
            if (!is_numeric($value) || $value < 0) {
                return response()->json([
                    'success' => false,
                    'errors' => ['measurements' => ["Measurement '$measurementType' must be a positive number"]],
                    'message' => 'Invalid measurement values'
                ], 422);
            }
        }

        try {
            $standard = SizingStandard::updateOrCreate(
                [
                    'category' => $request->category,
                    'gender' => $request->gender
                ],
                [
                    'name' => $request->name,
                    'measurements' => $request->measurements,
                    'size_categories' => $request->size_categories,
                    'is_active' => $request->is_active ?? true,
                    'updated_by' => Auth::id()
                ]
            );

            \Log::info('Sizing standard saved successfully:', ['id' => $standard->id, 'name' => $standard->name]);

            return response()->json([
                'success' => true,
                'data' => $standard,
                'message' => 'Sizing standard updated successfully'
            ]);
        } catch (\Exception $e) {
            \Log::error('Error saving sizing standard:', ['error' => $e->getMessage(), 'trace' => $e->getTraceAsString()]);
            return response()->json([
                'success' => false,
                'message' => 'Failed to save sizing standard: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Admin: Customize size parameters
     */
    public function customizeSizeParameters(Request $request, $id)
    {
        if (!Auth::user()->isAdmin()) {
            return response()->json([
                'success' => false,
                'message' => 'Unauthorized'
            ], 403);
        }

        $standard = SizingStandard::findOrFail($id);
        
        $validator = Validator::make($request->all(), [
            'measurements' => 'required|array',
            'size_categories' => 'required|array'
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors()
            ], 422);
        }

        $standard->update([
            'measurements' => $request->measurements,
            'size_categories' => $request->size_categories,
            'updated_by' => Auth::id()
        ]);

        return response()->json([
            'success' => true,
            'data' => $standard,
            'message' => 'Size parameters customized successfully'
        ]);
    }

    /**
     * Calculate recommended size based on measurements
     */
    private function calculateSize($measurements, $standard)
    {
        // This is a simplified algorithm - can be enhanced with more sophisticated logic
        $sizeCategories = $standard->size_categories;
        $standardMeasurements = $standard->measurements;
        
        // Simple size calculation based on chest measurement
        $chest = $measurements['chest'];
        
        if ($chest <= 36) return 'XS';
        if ($chest <= 38) return 'S';
        if ($chest <= 40) return 'M';
        if ($chest <= 42) return 'L';
        if ($chest <= 44) return 'XL';
        return 'XXL';
    }

    /**
     * Calculate confidence score for the recommendation
     */
    private function calculateConfidence($measurements, $standard)
    {
        // Simple confidence calculation - can be enhanced
        $totalVariance = 0;
        $measurementCount = count($measurements);
        
        foreach ($measurements as $key => $value) {
            if (isset($standard->measurements[$key])) {
                $variance = abs($value - $standard->measurements[$key]);
                $totalVariance += $variance;
            }
        }
        
        $averageVariance = $totalVariance / $measurementCount;
        $confidence = max(0.1, 1 - ($averageVariance / 10)); // Higher variance = lower confidence
        
        return round($confidence, 2);
    }
}
