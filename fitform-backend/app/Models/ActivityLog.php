<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class ActivityLog extends Model
{
    use HasFactory;
    
    protected $fillable = [
        'event_type',
        'action',
        'description',
        'metadata',
        'user_id',
        'user_role',
        'ip_address',
        'user_agent'
    ];

    protected $casts = [
        'metadata' => 'array',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    /**
     * Get the user who performed the action
     */
    public function user()
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Scope for recent activities
     */
    public function scopeRecent($query, $days = 7)
    {
        return $query->where('created_at', '>=', now()->subDays($days));
    }

    /**
     * Scope for specific event types
     */
    public function scopeEventType($query, $eventType)
    {
        return $query->where('event_type', $eventType);
    }

    /**
     * Scope for specific actions
     */
    public function scopeAction($query, $action)
    {
        return $query->where('action', $action);
    }

    /**
     * Get formatted time ago
     */
    public function getTimeAgoAttribute()
    {
        return $this->created_at->diffForHumans();
    }

    /**
     * Get activity icon based on event type
     */
    public function getIconAttribute()
    {
        $icons = [
            'appointment' => 'calendar',
            'order' => 'file-tray',
            'measurement' => 'scan',
            'catalog' => 'shirt',
            'user' => 'person',
            'system' => 'settings'
        ];

        return $icons[$this->event_type] ?? 'ellipse';
    }

    /**
     * Get activity color based on event type
     */
    public function getColorAttribute()
    {
        $colors = [
            'appointment' => '#014D40',
            'order' => '#2196F3',
            'measurement' => '#9C27B0',
            'catalog' => '#FF5722',
            'user' => '#4CAF50',
            'system' => '#FF9800'
        ];

        return $colors[$this->event_type] ?? '#6B7280';
    }
}


