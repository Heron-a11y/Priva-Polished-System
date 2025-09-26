<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class RentalHistory extends Model
{
    use SoftDeletes;

    protected $table = 'rental_history';

    protected $fillable = [
        'user_id',
        'item_name',
        'rental_type',
        'rental_date',
        'return_date',
        'status',
        'clothing_type',
        'measurements',
        'notes',
        'customer_name',
        'customer_email',
        'quotation_amount',
        'quotation_notes',
        'quotation_status',
        'quotation_sent_at',
        'quotation_responded_at',
        'penalty_breakdown',
        'total_penalties',
        'penalty_status',
        'agreement_accepted'
    ];

    protected $casts = [
        'measurements' => 'array',
        'penalty_breakdown' => 'array',
        'quotation_sent_at' => 'datetime',
        'quotation_responded_at' => 'datetime',
        'rental_date' => 'date',
        'return_date' => 'date',
        'agreement_accepted' => 'boolean',
        'quotation_amount' => 'decimal:2',
        'total_penalties' => 'decimal:2'
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
