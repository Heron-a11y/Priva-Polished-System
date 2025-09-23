<?php

namespace App\Http\Controllers;

use App\Models\AdminMeasurementHistory;
use App\Models\MeasurementHistory;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Auth;

class AdminMeasurementHistoryController extends Controller
{
    /**
     * Get all measurements for admin view with filtering and pagination
     */
    public function index(Request $request)
    {
        $query = AdminMeasurementHistory::with(['user:id,name,email', 'admin:id,name,email'])
            ->orderBy('created_at', 'desc');

        // Filter by measurement type if provided
        if ($request->has('type') && $request->type !== 'all') {
            $query->where('measurement_type', $request->type);
        }

        // Filter by unit system if provided
        if ($request->has('unit_system') && $request->unit_system !== 'all') {
            $query->where('unit_system', $request->unit_system);
        }

        // Filter by user if provided
        if ($request->has('user_id')) {
            $query->where('user_id', $request->user_id);
        }

        // Filter by admin if provided
        if ($request->has('admin_id')) {
            $query->where('admin_id', $request->admin_id);
        }

        // Filter by status if provided
        if ($request->has('status') && $request->status !== 'all') {
            $query->where('status', $request->status);
        }

        // Filter by date range if provided
        if ($request->has('from_date')) {
            $query->whereDate('created_at', '>=', $request->from_date);
        }
        
        if ($request->has('to_date')) {
            $query->whereDate('created_at', '<=', $request->to_date);
        }

        $measurements = $query->paginate($request->get('per_page', 15));

        return response()->json([
            'data' => $measurements->items(),
            'pagination' => [
                'current_page' => $measurements->currentPage(),
                'last_page' => $measurements->lastPage(),
                'per_page' => $measurements->perPage(),
                'total' => $measurements->total(),
            ]
        ]);
    }

    /**
     * Get statistics for admin measurement history
     */
    public function stats(Request $request)
    {
        $stats = [
            'total_measurements' => AdminMeasurementHistory::count(),
            'ar_measurements' => AdminMeasurementHistory::where('measurement_type', 'ar')->count(),
            'manual_measurements' => AdminMeasurementHistory::where('measurement_type', 'manual')->count(),
            'active_measurements' => AdminMeasurementHistory::where('status', 'active')->count(),
            'archived_measurements' => AdminMeasurementHistory::where('status', 'archived')->count(),
            'viewed_measurements' => AdminMeasurementHistory::whereNotNull('viewed_at')->count(),
            'processed_measurements' => AdminMeasurementHistory::whereNotNull('processed_at')->count(),
            'latest_measurement' => AdminMeasurementHistory::with(['user:id,name,email'])
                ->latest()
                ->first(),
            'measurements_this_month' => AdminMeasurementHistory::whereMonth('created_at', now()->month)
                ->whereYear('created_at', now()->year)
                ->count(),
            'total_users' => AdminMeasurementHistory::distinct('user_id')->count('user_id'),
            'total_admins' => AdminMeasurementHistory::distinct('admin_id')->count('admin_id'),
        ];

        return response()->json([
            'data' => $stats
        ]);
    }

    /**
     * Get a specific measurement by ID
     */
    public function show($id)
    {
        $measurement = AdminMeasurementHistory::with(['user:id,name,email', 'admin:id,name,email'])
            ->findOrFail($id);

        // Mark as viewed if not already viewed
        if (!$measurement->viewed_at) {
            $measurement->markAsViewed(Auth::id());
        }

        return response()->json([
            'data' => $measurement
        ]);
    }

    /**
     * Create a new admin measurement history entry
     */
    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'user_id' => 'required|exists:users,id',
            'measurement_type' => 'required|string|in:ar,manual',
            'measurements' => 'required|array',
            'unit_system' => 'required|string|in:cm,inches,feet',
            'confidence_score' => 'nullable|numeric|min:0|max:100',
            'body_landmarks' => 'nullable|array',
            'notes' => 'nullable|string|max:1000',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Validation failed',
                'errors' => $validator->errors()
            ], 422);
        }

        $measurement = AdminMeasurementHistory::create([
            'user_id' => $request->user_id,
            'admin_id' => Auth::id(),
            'measurement_type' => $request->measurement_type,
            'measurements' => $request->measurements,
            'unit_system' => $request->unit_system,
            'confidence_score' => $request->confidence_score,
            'body_landmarks' => $request->body_landmarks,
            'notes' => $request->notes,
            'status' => 'active',
        ]);

        return response()->json([
            'message' => 'Measurement history created successfully',
            'data' => $measurement->load(['user:id,name,email', 'admin:id,name,email'])
        ], 201);
    }

    /**
     * Update a measurement
     */
    public function update(Request $request, $id)
    {
        $measurement = AdminMeasurementHistory::findOrFail($id);

        $validator = Validator::make($request->all(), [
            'measurements' => 'sometimes|array',
            'unit_system' => 'sometimes|string|in:cm,inches,feet',
            'notes' => 'nullable|string|max:1000',
            'status' => 'sometimes|string|in:active,archived',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Validation failed',
                'errors' => $validator->errors()
            ], 422);
        }

        $measurement->update($request->only(['measurements', 'unit_system', 'notes', 'status']));

        return response()->json([
            'message' => 'Measurement updated successfully',
            'data' => $measurement->load(['user:id,name,email', 'admin:id,name,email'])
        ]);
    }

    /**
     * Mark measurement as viewed
     */
    public function markAsViewed($id)
    {
        $measurement = AdminMeasurementHistory::findOrFail($id);
        $measurement->markAsViewed(Auth::id());

        return response()->json([
            'message' => 'Measurement marked as viewed',
            'data' => $measurement->load(['user:id,name,email', 'admin:id,name,email'])
        ]);
    }

    /**
     * Mark measurement as processed
     */
    public function markAsProcessed($id)
    {
        $measurement = AdminMeasurementHistory::findOrFail($id);
        $measurement->markAsProcessed(Auth::id());

        return response()->json([
            'message' => 'Measurement marked as processed',
            'data' => $measurement->load(['user:id,name,email', 'admin:id,name,email'])
        ]);
    }

    /**
     * Archive a measurement
     */
    public function archive($id)
    {
        $measurement = AdminMeasurementHistory::findOrFail($id);
        $measurement->archive();

        return response()->json([
            'message' => 'Measurement archived successfully',
            'data' => $measurement->load(['user:id,name,email', 'admin:id,name,email'])
        ]);
    }

    /**
     * Restore a measurement from archive
     */
    public function restore($id)
    {
        $measurement = AdminMeasurementHistory::findOrFail($id);
        $measurement->restore();

        return response()->json([
            'message' => 'Measurement restored successfully',
            'data' => $measurement->load(['user:id,name,email', 'admin:id,name,email'])
        ]);
    }

    /**
     * Delete a measurement
     */
    public function destroy($id)
    {
        $measurement = AdminMeasurementHistory::findOrFail($id);
        $measurement->delete();

        return response()->json([
            'message' => 'Measurement deleted successfully'
        ]);
    }

    /**
     * Sync measurements from regular measurement history to admin measurement history
     */
    public function syncFromMeasurementHistory()
    {
        $regularMeasurements = MeasurementHistory::with('user:id,name,email')->get();
        
        $syncedCount = 0;
        
        foreach ($regularMeasurements as $measurement) {
            // Check if already exists in admin measurement history
            $exists = AdminMeasurementHistory::where('user_id', $measurement->user_id)
                ->where('measurement_type', $measurement->measurement_type)
                ->where('created_at', $measurement->created_at)
                ->exists();
            
            if (!$exists) {
                AdminMeasurementHistory::create([
                    'user_id' => $measurement->user_id,
                    'measurement_type' => $measurement->measurement_type,
                    'measurements' => $measurement->measurements,
                    'unit_system' => $measurement->unit_system,
                    'confidence_score' => $measurement->confidence_score,
                    'body_landmarks' => $measurement->body_landmarks,
                    'notes' => $measurement->notes,
                    'status' => 'active',
                    'created_at' => $measurement->created_at,
                    'updated_at' => $measurement->updated_at,
                ]);
                $syncedCount++;
            }
        }

        return response()->json([
            'message' => "Synced {$syncedCount} measurements to admin measurement history",
            'synced_count' => $syncedCount
        ]);
    }
}