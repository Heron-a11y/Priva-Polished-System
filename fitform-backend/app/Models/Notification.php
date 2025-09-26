<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Notification extends Model
{
    protected $fillable = [
        'user_id', 'sender_role', 'message', 'read', 'order_id', 'order_type'
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }
} 