<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Rental extends Model
{
    protected $fillable = [
        'user_id', 'item_name', 'rental_date', 'return_date', 'status',
        'clothing_type', 'measurements', 'notes', 'customer_name', 'customer_email',
        'quotation_price', 'quotation_schedule', 'quotation_notes'
    ];

    protected $casts = [
        'measurements' => 'array',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }
} 