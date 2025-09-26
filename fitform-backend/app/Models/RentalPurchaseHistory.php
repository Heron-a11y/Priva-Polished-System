<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class RentalPurchaseHistory extends Model
{
    use SoftDeletes;

    protected $table = 'rental_purchase_history';

    protected $fillable = [
        'user_id',
        'order_type', // 'rental' or 'purchase'
        'item_name',
        'order_subtype', // rental_type or purchase_type
        'order_date', // rental_date or purchase_date
        'return_date', // only for rentals
        'status',
        'clothing_type',
        'measurements',
        'notes',
        'customer_name',
        'customer_email',
        'quotation_amount',
        'quotation_price', // only for purchases
        'quotation_notes',
        'quotation_status',
        'quotation_sent_at',
        'quotation_responded_at',
        'penalty_breakdown', // only for rentals
        'total_penalties', // only for rentals
        'penalty_status', // only for rentals
        'agreement_accepted' // only for rentals
    ];

    protected $casts = [
        'measurements' => 'array',
        'penalty_breakdown' => 'array',
        'quotation_sent_at' => 'datetime',
        'quotation_responded_at' => 'datetime',
        'order_date' => 'date',
        'return_date' => 'date',
        'agreement_accepted' => 'boolean',
        'quotation_amount' => 'decimal:2',
        'quotation_price' => 'decimal:2',
        'total_penalties' => 'decimal:2'
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    // Helper methods
    public function isRental()
    {
        return $this->order_type === 'rental';
    }

    public function isPurchase()
    {
        return $this->order_type === 'purchase';
    }
}
