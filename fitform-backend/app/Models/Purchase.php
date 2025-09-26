<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Purchase extends Model
{
    use SoftDeletes;
    protected $fillable = [
        'user_id', 'item_name', 'clothing_type', 'measurements', 'notes', 'customer_name', 'customer_email', 'purchase_date', 'status',
        'quotation_price', 'quotation_schedule', 'quotation_notes', 'quotation_responded_at', 'counter_offer_amount', 'counter_offer_notes', 'counter_offer_sent_at', 'counter_offer_status'
    ];

    protected $casts = [
        'measurements' => 'array',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }
} 