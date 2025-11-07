<?php

namespace App\Http\Controllers;

use App\Models\ActivityLog;
use App\Services\ActivityLogService;
use Illuminate\Http\Request;

class ActivityLogController extends PaginatedController
{
    /**
     * Get recent activities for admin dashboard with pagination
     */
    public function getRecentActivities(Request $request)
    {
        try {
            $query = ActivityLog::with('user:id,name,email')
                ->orderBy('created_at', 'desc');

            // Get pagination parameters
            $perPage = min($request->get('per_page', 10), 100);
            $page = $request->get('page', 1);

            // Get total count before pagination
            $total = $query->count();

            // Apply pagination
            $activities = $query->skip(($page - 1) * $perPage)->take($perPage)->get();

            // Transform activities
            $transformedActivities = $activities->map(function ($activity) {
                return [
                    'id' => $activity->id,
                    'event_type' => $activity->event_type,
                    'action' => $activity->action,
                    'description' => $activity->description,
                    'metadata' => $activity->metadata,
                    'user_name' => $activity->user ? $activity->user->name : 'System',
                    'user_email' => $activity->user ? $activity->user->email : null,
                    'user_role' => $activity->user_role,
                    'icon' => $activity->icon,
                    'color' => $activity->color,
                    'time_ago' => $activity->time_ago,
                    'created_at' => $activity->created_at,
                ];
            });

            // Create pagination response
            $pagination = [
                'current_page' => $page,
                'per_page' => $perPage,
                'total' => $total,
                'last_page' => ceil($total / $perPage),
                'from' => ($page - 1) * $perPage + 1,
                'to' => min($page * $perPage, $total),
                'has_more_pages' => $page < ceil($total / $perPage)
            ];

            return response()->json([
                'success' => true,
                'data' => $transformedActivities,
                'pagination' => $pagination
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch recent activities',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get activity statistics
     */
    public function getActivityStats()
    {
        try {
            $stats = ActivityLogService::getActivityStats();
            
            return response()->json([
                'success' => true,
                'data' => $stats
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch activity statistics',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get all activities with pagination
     */
    public function index(Request $request)
    {
        try {
            $query = ActivityLog::with('user:id,name,email');

            // Filter by event type
            if ($request->has('event_type')) {
                $query->where('event_type', $request->event_type);
            }

            // Filter by action
            if ($request->has('action')) {
                $query->where('action', $request->action);
            }

            // Filter by user
            if ($request->has('user_id')) {
                $query->where('user_id', $request->user_id);
            }

            // Filter by date range
            if ($request->has('from_date')) {
                $query->whereDate('created_at', '>=', $request->from_date);
            }

            if ($request->has('to_date')) {
                $query->whereDate('created_at', '<=', $request->to_date);
            }

            $activities = $query->orderBy('created_at', 'desc')
                ->paginate($request->get('per_page', 15));

            return response()->json([
                'success' => true,
                'data' => $activities->items(),
                'pagination' => [
                    'current_page' => $activities->currentPage(),
                    'last_page' => $activities->lastPage(),
                    'per_page' => $activities->perPage(),
                    'total' => $activities->total(),
                ]
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch activities',
                'error' => $e->getMessage()
            ], 500);
        }
    }
}


