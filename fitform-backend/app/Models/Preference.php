<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Preference extends Model
{
    protected $fillable = [
        'user_id', 'preferred_style', 'preferred_color', 'preferred_size',
        'preferred_material', 'preferred_fit', 'preferred_pattern',
        'preferred_budget', 'preferred_season', 'preferred_length',
        'preferred_sleeve', 'notes'
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }
} 