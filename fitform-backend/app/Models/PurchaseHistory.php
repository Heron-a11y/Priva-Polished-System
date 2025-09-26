<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class PurchaseHistory extends Model
{
    use SoftDeletes;

    protected $table = 'purchase_history';

    protected $fillable = [
        'user_id',
        'item_name',
        'purchase_type',
        'purchase_date',
        'status',
        'clothing_type',
        'measurements',
        'notes',
        'customer_name',
        'customer_email',
        'quotation_amount',
        'quotation_price',
        'quotation_notes',
        'quotation_status',
        'quotation_sent_at',
        'quotation_responded_at'
    ];

    protected $casts = [
        'measurements' => 'array',
        'quotation_sent_at' => 'datetime',
        'quotation_responded_at' => 'datetime',
        'purchase_date' => 'date',
        'quotation_amount' => 'decimal:2',
        'quotation_price' => 'decimal:2'
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
