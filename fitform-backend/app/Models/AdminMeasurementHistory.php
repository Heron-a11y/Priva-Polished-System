<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class AdminMeasurementHistory extends Model
{
    use HasFactory;

    protected $table = 'admin_measurement_history';

    protected $fillable = [
        'user_id',
        'admin_id',
        'measurement_type',
        'measurements',
        'unit_system',
        'confidence_score',
        'body_landmarks',
        'notes',
        'status',
        'viewed_at',
        'processed_at',
    ];

    protected $casts = [
        'measurements' => 'array',
        'body_landmarks' => 'array',
        'confidence_score' => 'decimal:2',
        'viewed_at' => 'datetime',
        'processed_at' => 'datetime',
    ];

    /**
     * Get the user who created the measurement
     */
    public function user()
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    /**
     * Get the admin who viewed/processed the measurement
     */
    public function admin()
    {
        return $this->belongsTo(User::class, 'admin_id');
    }

    /**
     * Scope for active measurements
     */
    public function scopeActive($query)
    {
        return $query->where('status', 'active');
    }

    /**
     * Scope for archived measurements
     */
    public function scopeArchived($query)
    {
        return $query->where('status', 'archived');
    }

    /**
     * Scope for AR measurements
     */
    public function scopeAr($query)
    {
        return $query->where('measurement_type', 'ar');
    }

    /**
     * Scope for manual measurements
     */
    public function scopeManual($query)
    {
        return $query->where('measurement_type', 'manual');
    }

    /**
     * Scope for measurements by unit system
     */
    public function scopeByUnitSystem($query, $unitSystem)
    {
        return $query->where('unit_system', $unitSystem);
    }

    /**
     * Scope for measurements by user
     */
    public function scopeByUser($query, $userId)
    {
        return $query->where('user_id', $userId);
    }

    /**
     * Scope for measurements by admin
     */
    public function scopeByAdmin($query, $adminId)
    {
        return $query->where('admin_id', $adminId);
    }

    /**
     * Mark measurement as viewed
     */
    public function markAsViewed($adminId = null)
    {
        $this->update([
            'viewed_at' => now(),
            'admin_id' => $adminId ?? $this->admin_id,
        ]);
    }

    /**
     * Mark measurement as processed
     */
    public function markAsProcessed($adminId = null)
    {
        $this->update([
            'processed_at' => now(),
            'admin_id' => $adminId ?? $this->admin_id,
        ]);
    }

    /**
     * Archive measurement
     */
    public function archive()
    {
        $this->update(['status' => 'archived']);
    }

    /**
     * Restore measurement from archive
     */
    public function restore()
    {
        $this->update(['status' => 'active']);
    }
}