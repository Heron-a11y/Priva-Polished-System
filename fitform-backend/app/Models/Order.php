<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Order extends Model
{
    protected $fillable = [
        'user_id', 'order_date', 'status', 'total_amount', 'notes'
    ];

    protected $casts = [
        'order_date' => 'date',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
