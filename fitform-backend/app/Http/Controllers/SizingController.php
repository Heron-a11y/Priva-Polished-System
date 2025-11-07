<?php

namespace App\Http\Controllers;

use App\Models\SizingStandard;
use App\Models\SizeRecommendation;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Validator;

class SizingController extends PaginatedController
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
        
        $query = SizeRecommendation::where('user_id', $user->id)
            ->with('sizingStandard')
            ->orderBy('last_updated', 'desc');

        // Configure pagination options
        $options = [
            'search_fields' => ['recommended_size'],
            'filter_fields' => [],
            'sort_fields' => ['last_updated', 'recommended_size', 'confidence_score'],
            'default_per_page' => 10,
            'max_per_page' => 50,
        ];

        return $this->paginate($query, $request, $options);
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

        // Order by category and gender for consistent results
        $query->orderBy('category')->orderBy('gender')->orderBy('name');

        // Configure pagination options
        $options = [
            'search_fields' => ['name', 'category', 'gender'],
            'filter_fields' => ['category', 'gender', 'is_active'],
            'sort_fields' => ['name', 'category', 'gender', 'created_at', 'updated_at'],
            'default_per_page' => 10,
            'max_per_page' => 50,
        ];

        return $this->paginate($query, $request, $options);
    }

    /**
     * Match customer measurements to size categories and get recommendations
     */
    public function matchMeasurements(Request $request)
    {
        // Debug logging
        \Log::info('matchMeasurements called with data:', $request->all());
        \Log::info('Measurements received:', $request->measurements ?? 'No measurements');
        
        // Base validation
        $baseValidator = Validator::make($request->all(), [
            'category' => 'required|string',
            'gender' => 'required|in:male,female,unisex',
            'measurements' => 'required|array',
        ]);

        if ($baseValidator->fails()) {
            \Log::error('Base validation failed:', $baseValidator->errors()->toArray());
            return response()->json([
                'success' => false,
                'errors' => $baseValidator->errors()
            ], 422);
        }

        // Category-specific measurement validation
        $category = $request->category;
        $measurements = $request->measurements;
        
        // Define required measurements for each category
        $requiredMeasurements = $this->getRequiredMeasurementsForCategory($category);
        
        // Validate required measurements for the category
        $measurementRules = [];
        foreach ($requiredMeasurements as $field) {
            $measurementRules["measurements.{$field}"] = 'required|numeric';
        }
        
        $measurementValidator = Validator::make($request->all(), $measurementRules);
        
        if ($measurementValidator->fails()) {
            \Log::error('Measurement validation failed:', $measurementValidator->errors()->toArray());
            return response()->json([
                'success' => false,
                'errors' => $measurementValidator->errors()
            ], 422);
        }

        $user = Auth::user();
        
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
     * Admin: Get all sizing standards with pagination
     */
    public function getSizingStandards(Request $request)
    {
        if (!Auth::user()->isAdmin()) {
            return response()->json([
                'success' => false,
                'message' => 'Unauthorized'
            ], 403);
        }

        $query = SizingStandard::with('updatedBy')
            ->orderBy('is_active', 'desc') // Active standards first
            ->orderBy('category')
            ->orderBy('gender');

        // Configure pagination options
        $options = [
            'search_fields' => ['name', 'category', 'gender'],
            'filter_fields' => ['is_active', 'category', 'gender'],
            'sort_fields' => ['name', 'category', 'gender', 'is_active', 'created_at', 'updated_at'],
            'default_per_page' => 10,
            'max_per_page' => 100,
        ];

        return $this->paginate($query, $request, $options);
    }

    /**
     * Admin: Get all sizing standards (including inactive)
     */
    public function getAllSizingStandards(Request $request)
    {
        if (!Auth::user()->isAdmin()) {
            return response()->json([
                'success' => false,
                'message' => 'Unauthorized'
            ], 403);
        }

        $standards = SizingStandard::with('updatedBy')
            ->orderBy('is_active', 'desc') // Active standards first
            ->orderBy('category')
            ->orderBy('gender')
            ->get();

        return response()->json([
            'success' => true,
            'data' => $standards
        ]);
    }

    /**
     * Admin: Get only active sizing standards
     */
    public function getActiveSizingStandards(Request $request)
    {
        if (!Auth::user()->isAdmin()) {
            return response()->json([
                'success' => false,
                'message' => 'Unauthorized'
            ], 403);
        }

        $standards = SizingStandard::with('updatedBy')
            ->where('is_active', true)
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
     * Admin: Delete sizing standard safely
     */
    public function deleteSizingStandard(Request $request, $id)
    {
        if (!Auth::user()->isAdmin()) {
            return response()->json([
                'success' => false,
                'message' => 'Unauthorized'
            ], 403);
        }

        try {
            $standard = SizingStandard::findOrFail($id);
            
            // Check if there are any size recommendations using this standard
            $dependentRecommendations = SizeRecommendation::where('sizing_standard_id', $id)->count();
            
            if ($dependentRecommendations > 0) {
                // Delete dependent size recommendations first
                SizeRecommendation::where('sizing_standard_id', $id)->delete();
                
                \Log::info('Deleted dependent size recommendations before deleting sizing standard', [
                    'standard_id' => $id,
                    'deleted_recommendations' => $dependentRecommendations
                ]);
            }
            
            // Now safely delete the sizing standard
            $standard->delete();
            
            \Log::info('Sizing standard deleted successfully', [
                'id' => $id,
                'name' => $standard->name,
                'deleted_by' => Auth::id()
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Sizing standard deleted successfully',
                'data' => [
                    'deleted_standard' => $standard->name,
                    'deleted_recommendations' => $dependentRecommendations
                ]
            ]);
            
        } catch (\Exception $e) {
            \Log::error('Error deleting sizing standard:', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
                'standard_id' => $id
            ]);
            
            return response()->json([
                'success' => false,
                'message' => 'Failed to delete sizing standard: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Admin: Soft delete sizing standard (mark as inactive instead of deleting)
     */
    public function deactivateSizingStandard(Request $request, $id)
    {
        if (!Auth::user()->isAdmin()) {
            return response()->json([
                'success' => false,
                'message' => 'Unauthorized'
            ], 403);
        }

        try {
            $standard = SizingStandard::findOrFail($id);
            
            // Mark as inactive instead of deleting
            $standard->update([
                'is_active' => false,
                'updated_by' => Auth::id()
            ]);
            
            \Log::info('Sizing standard deactivated successfully', [
                'id' => $id,
                'name' => $standard->name,
                'deactivated_by' => Auth::id()
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Sizing standard deactivated successfully',
                'data' => $standard
            ]);
            
        } catch (\Exception $e) {
            \Log::error('Error deactivating sizing standard:', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
                'standard_id' => $id
            ]);
            
            return response()->json([
                'success' => false,
                'message' => 'Failed to deactivate sizing standard: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Admin: Reactivate sizing standard
     */
    public function reactivateSizingStandard(Request $request, $id)
    {
        if (!Auth::user()->isAdmin()) {
            return response()->json([
                'success' => false,
                'message' => 'Unauthorized'
            ], 403);
        }

        try {
            $standard = SizingStandard::findOrFail($id);
            
            // Mark as active again
            $standard->update([
                'is_active' => true,
                'updated_by' => Auth::id()
            ]);
            
            \Log::info('Sizing standard reactivated successfully', [
                'id' => $id,
                'name' => $standard->name,
                'reactivated_by' => Auth::id()
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Sizing standard reactivated successfully',
                'data' => $standard
            ]);
            
        } catch (\Exception $e) {
            \Log::error('Error reactivating sizing standard:', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
                'standard_id' => $id
            ]);
            
            return response()->json([
                'success' => false,
                'message' => 'Failed to reactivate sizing standard: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Admin: Check if sizing standard can be safely deleted
     */
    public function checkSizingStandardDeletion(Request $request, $id)
    {
        if (!Auth::user()->isAdmin()) {
            return response()->json([
                'success' => false,
                'message' => 'Unauthorized'
            ], 403);
        }

        try {
            $standard = SizingStandard::findOrFail($id);
            
            // Check for dependent size recommendations
            $dependentRecommendations = SizeRecommendation::where('sizing_standard_id', $id)->count();
            
            // Check for other potential dependencies (you can add more checks here)
            $canDelete = $dependentRecommendations === 0;
            
            return response()->json([
                'success' => true,
                'data' => [
                    'standard_id' => $id,
                    'standard_name' => $standard->name,
                    'can_delete' => $canDelete,
                    'dependent_recommendations' => $dependentRecommendations,
                    'warning_message' => $canDelete ? null : 
                        "This sizing standard has {$dependentRecommendations} size recommendation(s) that will also be deleted."
                ]
            ]);
            
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to check sizing standard: ' . $e->getMessage()
            ], 500);
        }
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

    /**
     * Helper to get required measurements for a specific category
     */
    private function getRequiredMeasurementsForCategory($category)
    {
        switch (strtolower($category)) {
            case 'shirts':
                return ['chest', 'waist', 'length', 'shoulder', 'sleeve'];
            case 'pants':
                return ['waist', 'hips', 'length', 'inseam', 'thigh'];
            case 'dresses':
                return ['chest', 'waist', 'hips', 'length', 'shoulder'];
            case 'jackets':
                return ['chest', 'waist', 'length', 'shoulder', 'sleeve'];
            case 'skirts':
                return ['waist', 'hips', 'length'];
            case 'shoes':
                return ['foot_length'];
            case 'hats':
                return ['head_circumference'];
            case 'suits':
                return ['chest', 'waist', 'hips', 'length', 'shoulder', 'sleeve', 'inseam'];
            case 'activewear':
                return ['chest', 'waist', 'hips', 'length'];
            default:
                // For custom categories, require basic measurements
                return ['chest', 'waist', 'length'];
        }
    }
}
