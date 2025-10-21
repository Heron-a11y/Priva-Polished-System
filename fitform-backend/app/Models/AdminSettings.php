<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class AdminSettings extends Model
{
    use HasFactory;

    protected $fillable = [
        'auto_approve_appointments',
        'max_appointments_per_day',
        'business_start_time',
        'business_end_time',
    ];

    protected $casts = [
        'auto_approve_appointments' => 'boolean',
        'max_appointments_per_day' => 'integer',
        'business_start_time' => 'datetime:H:i',
        'business_end_time' => 'datetime:H:i',
    ];

    /**
     * Get the singleton instance of admin settings
     */
    public static function getSettings()
    {
        $settings = self::first();
        
        if (!$settings) {
            // Create default settings if none exist
            $settings = self::create([
                'auto_approve_appointments' => false,
                'max_appointments_per_day' => 5,
                'business_start_time' => '10:00',
                'business_end_time' => '19:00',
            ]);
        }
        
        return $settings;
    }
}





