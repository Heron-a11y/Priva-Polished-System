<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class SizingStandard extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'category', // e.g., 'shirts', 'pants', 'dresses'
        'gender', // 'male', 'female', 'unisex'
        'measurements', // JSON field for size parameters
        'size_categories', // JSON field for size categories (XS, S, M, L, XL, etc.)
        'is_active',
        'updated_by', // admin user ID who last updated
    ];

    protected $casts = [
        'measurements' => 'array',
        'size_categories' => 'array',
        'is_active' => 'boolean',
    ];

    public function updatedBy()
    {
        return $this->belongsTo(User::class, 'updated_by');
    }
}
