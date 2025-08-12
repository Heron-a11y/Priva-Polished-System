<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class SizeRecommendation extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'sizing_standard_id',
        'customer_measurements', // JSON field for customer's body measurements
        'recommended_size',
        'confidence_score', // How confident the system is in the recommendation
        'notes',
        'last_updated',
    ];

    protected $casts = [
        'customer_measurements' => 'array',
        'confidence_score' => 'decimal:2',
        'last_updated' => 'datetime',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function sizingStandard()
    {
        return $this->belongsTo(SizingStandard::class);
    }
}
