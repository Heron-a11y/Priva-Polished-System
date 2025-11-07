<?php

namespace App\Http\Controllers;

use App\Models\MeasurementHistory;
use App\Models\AdminMeasurementHistory;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Validator;

class MeasurementHistoryController extends Controller
{
    /**
     * Get measurement history for the authenticated user.
     */
    public function index(Request $request)
    {
        $user = $request->user();
        
        $query = MeasurementHistory::where('user_id', $user->id)
            ->orderBy('created_at', 'desc');

        // Filter by measurement type if provided
        if ($request->has('type')) {
            $query->where('measurement_type', $request->type);
        }

        // Filter by unit system if provided
        if ($request->has('unit_system')) {
            $query->where('unit_system', $request->unit_system);
        }

        // Filter by date range if provided
        if ($request->has('from_date')) {
            $query->whereDate('created_at', '>=', $request->from_date);
        }
        
        if ($request->has('to_date')) {
            $query->whereDate('created_at', '<=', $request->to_date);
        }

        $measurements = $query->paginate($request->get('per_page', 10));

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
     * Store a new measurement record.
     */
    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
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

        $user = $request->user();

        $measurement = MeasurementHistory::create([
            'user_id' => $user->id,
            'measurement_type' => $request->measurement_type,
            'measurements' => $request->measurements,
            'unit_system' => $request->unit_system,
            'confidence_score' => $request->confidence_score,
            'body_landmarks' => $request->body_landmarks,
            'notes' => $request->notes,
        ]);

        // If the user is an admin, also save to admin measurement history
        if ($user->role === 'admin') {
            AdminMeasurementHistory::create([
                'user_id' => $user->id,
                'admin_id' => $user->id,
                'measurement_type' => $request->measurement_type,
                'measurements' => $request->measurements,
                'unit_system' => $request->unit_system,
                'confidence_score' => $request->confidence_score,
                'body_landmarks' => $request->body_landmarks,
                'notes' => $request->notes,
                'status' => 'active',
            ]);
        }

        return response()->json([
            'message' => 'Measurement saved successfully',
            'data' => $measurement->load('user:id,name')
        ], 201);
    }

    /**
     * Get a specific measurement record.
     */
    public function show(Request $request, $id)
    {
        $user = $request->user();
        
        $measurement = MeasurementHistory::where('user_id', $user->id)
            ->findOrFail($id);

        return response()->json([
            'data' => $measurement->load('user:id,name')
        ]);
    }

    /**
     * Update a measurement record.
     */
    public function update(Request $request, $id)
    {
        $user = $request->user();
        
        $measurement = MeasurementHistory::where('user_id', $user->id)
            ->findOrFail($id);

        $validator = Validator::make($request->all(), [
            'measurements' => 'sometimes|array',
            'unit_system' => 'sometimes|string|in:cm,inches,feet',
            'notes' => 'nullable|string|max:1000',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Validation failed',
                'errors' => $validator->errors()
            ], 422);
        }

        $measurement->update($request->only(['measurements', 'unit_system', 'notes']));

        return response()->json([
            'message' => 'Measurement updated successfully',
            'data' => $measurement->load('user:id,name')
        ]);
    }

    /**
     * Delete a measurement record.
     */
    public function destroy(Request $request, $id)
    {
        $user = $request->user();
        
        $measurement = MeasurementHistory::where('user_id', $user->id)
            ->findOrFail($id);

        $measurement->delete();

        return response()->json([
            'message' => 'Measurement deleted successfully'
        ]);
    }

    /**
     * Get measurement statistics for the user.
     */
    public function getStats(Request $request)
    {
        $user = $request->user();
        
        $stats = [
            'total_measurements' => MeasurementHistory::where('user_id', $user->id)->count(),
            'ar_measurements' => MeasurementHistory::where('user_id', $user->id)
                ->where('measurement_type', 'ar')->count(),
            'manual_measurements' => MeasurementHistory::where('user_id', $user->id)
                ->where('measurement_type', 'manual')->count(),
            'latest_measurement' => MeasurementHistory::where('user_id', $user->id)
                ->latest()->first(),
            'measurements_this_month' => MeasurementHistory::where('user_id', $user->id)
                ->whereMonth('created_at', now()->month)
                ->whereYear('created_at', now()->year)
                ->count(),
        ];

        return response()->json([
            'data' => $stats
        ]);
    }

    /**
     * Get latest measurement for the user.
     */
    public function getLatest(Request $request)
    {
        $user = $request->user();
        
        $latest = MeasurementHistory::where('user_id', $user->id)
            ->latest()
            ->first();

        if (!$latest) {
            return response()->json([
                'data' => null,
                'message' => 'No measurements found'
            ], 200);
        }

        return response()->json([
            'data' => $latest->load('user:id,name')
        ]);
    }

    /**
     * Get all measurement history for admin (all users).
     */
    public function adminIndex(Request $request)
    {
        $query = MeasurementHistory::with('user:id,name,email')
            ->orderBy('created_at', 'desc');

        // Filter by measurement type if provided
        if ($request->has('type')) {
            $query->where('measurement_type', $request->type);
        }

        // Filter by unit system if provided
        if ($request->has('unit_system')) {
            $query->where('unit_system', $request->unit_system);
        }

        // Filter by user if provided
        if ($request->has('user_id')) {
            $query->where('user_id', $request->user_id);
        }

        // Filter by date range if provided
        if ($request->has('from_date')) {
            $query->whereDate('created_at', '>=', $request->from_date);
        }
        
        if ($request->has('to_date')) {
            $query->whereDate('created_at', '<=', $request->to_date);
        }

        $measurements = $query->paginate($request->get('per_page', 10));

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
     * Get measurement statistics for admin (all users).
     */
    public function adminStats(Request $request)
    {
        try {
            $stats = [
                'total_measurements' => MeasurementHistory::count(),
                'ar_measurements' => MeasurementHistory::where('measurement_type', 'ar')->count(),
                'manual_measurements' => MeasurementHistory::where('measurement_type', 'manual')->count(),
                'latest_measurement' => MeasurementHistory::with('user:id,name,email')->latest()->first(),
                'measurements_this_month' => MeasurementHistory::whereMonth('created_at', now()->month)
                    ->whereYear('created_at', now()->year)
                    ->count(),
                'total_users' => MeasurementHistory::distinct('user_id')->count('user_id'),
            ];

            return response()->json([
                'success' => true,
                'data' => $stats
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch measurement statistics',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Update a measurement record (admin).
     */
    public function adminUpdate(Request $request, $id)
    {
        $measurement = MeasurementHistory::findOrFail($id);

        $validator = Validator::make($request->all(), [
            'measurements' => 'sometimes|array',
            'unit_system' => 'sometimes|string|in:cm,inches,feet',
            'notes' => 'nullable|string|max:1000',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Validation failed',
                'errors' => $validator->errors()
            ], 422);
        }

        $measurement->update($request->only(['measurements', 'unit_system', 'notes']));

        return response()->json([
            'message' => 'Measurement updated successfully',
            'data' => $measurement->load('user:id,name,email')
        ]);
    }

    /**
     * Delete a measurement record (admin).
     */
    public function adminDestroy(Request $request, $id)
    {
        $measurement = MeasurementHistory::findOrFail($id);

        $measurement->delete();

        return response()->json([
            'message' => 'Measurement deleted successfully'
        ]);
    }
}
