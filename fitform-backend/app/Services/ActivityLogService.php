<?php

namespace App\Services;

use App\Models\ActivityLog;
use App\Models\User;
use Illuminate\Http\Request;

class ActivityLogService
{
    /**
     * Log an activity
     */
    public static function log(
        string $eventType,
        string $action,
        string $description,
        array $metadata = [],
        ?int $userId = null,
        ?string $userRole = null,
        ?Request $request = null
    ): ActivityLog {
        $logData = [
            'event_type' => $eventType,
            'action' => $action,
            'description' => $description,
            'metadata' => $metadata,
            'user_id' => $userId,
            'user_role' => $userRole,
        ];

        // Add request information if available
        if ($request) {
            $logData['ip_address'] = $request->ip();
            $logData['user_agent'] = $request->userAgent();
        }

        return ActivityLog::create($logData);
    }

    /**
     * Log appointment activities
     */
    public static function logAppointment(
        string $action,
        string $description,
        array $metadata = [],
        ?int $userId = null,
        ?string $userRole = null,
        ?Request $request = null
    ): ActivityLog {
        return self::log('appointment', $action, $description, $metadata, $userId, $userRole, $request);
    }

    /**
     * Log order activities
     */
    public static function logOrder(
        string $action,
        string $description,
        array $metadata = [],
        ?int $userId = null,
        ?string $userRole = null,
        ?Request $request = null
    ): ActivityLog {
        return self::log('order', $action, $description, $metadata, $userId, $userRole, $request);
    }

    /**
     * Log measurement activities
     */
    public static function logMeasurement(
        string $action,
        string $description,
        array $metadata = [],
        ?int $userId = null,
        ?string $userRole = null,
        ?Request $request = null
    ): ActivityLog {
        return self::log('measurement', $action, $description, $metadata, $userId, $userRole, $request);
    }

    /**
     * Log catalog activities
     */
    public static function logCatalog(
        string $action,
        string $description,
        array $metadata = [],
        ?int $userId = null,
        ?string $userRole = null,
        ?Request $request = null
    ): ActivityLog {
        return self::log('catalog', $action, $description, $metadata, $userId, $userRole, $request);
    }

    /**
     * Log user activities
     */
    public static function logUser(
        string $action,
        string $description,
        array $metadata = [],
        ?int $userId = null,
        ?string $userRole = null,
        ?Request $request = null
    ): ActivityLog {
        return self::log('user', $action, $description, $metadata, $userId, $userRole, $request);
    }

    /**
     * Log system activities
     */
    public static function logSystem(
        string $action,
        string $description,
        array $metadata = [],
        ?Request $request = null
    ): ActivityLog {
        return self::log('system', $action, $description, $metadata, null, 'system', $request);
    }

    /**
     * Get recent activities for dashboard
     */
    public static function getRecentActivities(int $limit = 10)
    {
        return ActivityLog::with('user:id,name,email')
            ->orderBy('created_at', 'desc')
            ->limit($limit)
            ->get();
    }

    /**
     * Get activity statistics
     */
    public static function getActivityStats()
    {
        $today = now()->startOfDay();
        $thisWeek = now()->startOfWeek();
        $thisMonth = now()->startOfMonth();

        return [
            'today' => ActivityLog::whereDate('created_at', $today)->count(),
            'this_week' => ActivityLog::where('created_at', '>=', $thisWeek)->count(),
            'this_month' => ActivityLog::where('created_at', '>=', $thisMonth)->count(),
            'total' => ActivityLog::count(),
            'by_event_type' => ActivityLog::selectRaw('event_type, COUNT(*) as count')
                ->groupBy('event_type')
                ->pluck('count', 'event_type'),
            'by_action' => ActivityLog::selectRaw('action, COUNT(*) as count')
                ->groupBy('action')
                ->pluck('count', 'action'),
        ];
    }
}
