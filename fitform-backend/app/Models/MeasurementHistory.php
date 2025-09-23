<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class MeasurementHistory extends Model
{
    use HasFactory;

    protected $table = 'measurement_history';

    protected $fillable = [
        'user_id',
        'measurement_type',
        'measurements',
        'unit_system',
        'confidence_score',
        'body_landmarks',
        'notes',
    ];

    protected $casts = [
        'measurements' => 'array',
        'body_landmarks' => 'array',
        'confidence_score' => 'decimal:2',
    ];

    /**
     * Get the user that owns the measurement history.
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Get formatted measurements for display.
     */
    public function getFormattedMeasurementsAttribute(): array
    {
        $formatted = [];
        $unit = $this->unit_system;
        
        foreach ($this->measurements as $key => $value) {
            $formatted[$key] = [
                'value' => $value,
                'unit' => $unit,
                'display' => $this->formatMeasurement($value, $unit)
            ];
        }
        
        return $formatted;
    }

    /**
     * Format measurement value with unit.
     */
    private function formatMeasurement($value, $unit): string
    {
        switch ($unit) {
            case 'inches':
                return $value . ' in';
            case 'feet':
                if (is_array($value)) {
                    return $value['feet'] . "'" . $value['inches'] . '"';
                }
                return $value . ' ft';
            case 'cm':
            default:
                return $value . ' cm';
        }
    }

    /**
     * Get the measurement date in a readable format.
     */
    public function getFormattedDateAttribute(): string
    {
        return $this->created_at->format('M d, Y \a\t g:i A');
    }

    /**
     * Scope to get measurements by type.
     */
    public function scopeByType($query, $type)
    {
        return $query->where('measurement_type', $type);
    }

    /**
     * Scope to get recent measurements.
     */
    public function scopeRecent($query, $days = 30)
    {
        return $query->where('created_at', '>=', now()->subDays($days));
    }
}
