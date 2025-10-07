<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Carbon\Carbon;

class Rental extends Model
{
    use SoftDeletes;
    protected $fillable = [
        'user_id', 'item_name', 'rental_date', 'return_date', 'status',
        'clothing_type', 'measurements', 'notes', 'customer_name', 'customer_email',
        'quotation_amount', 'quotation_schedule', 'quotation_notes', 'counter_offer_amount', 'counter_offer_notes', 'counter_offer_sent_at', 'counter_offer_status',
        'cancellation_fee', 'daily_delay_fee', 'damage_fee_min', 'damage_fee_max',
        'total_penalties', 'penalty_notes', 'penalty_status', 'penalty_calculated_at',
        'penalty_paid_at', 'agreement_accepted', 'agreement_accepted_at'
    ];

    protected $casts = [
        'measurements' => 'array',
        'rental_date' => 'date',
        'return_date' => 'date',
        'penalty_calculated_at' => 'datetime',
        'penalty_paid_at' => 'datetime',
        'agreement_accepted_at' => 'datetime',
        'agreement_accepted' => 'boolean',
        'counter_offer_sent_at' => 'datetime',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Calculate delay penalties based on return date
     */
    public function calculateDelayPenalties()
    {
        // Delay applies when item is currently with customer (picked up)
        if (!$this->return_date || $this->status !== 'picked_up') {
            return 0;
        }

        $today = Carbon::today();
        $returnDate = Carbon::parse($this->return_date);
        
        if ($today <= $returnDate) {
            return 0; // No delay
        }

        $delayDays = $today->diffInDays($returnDate);
        $dailyFee = $this->daily_delay_fee ?? 100; // Default ₱100/day if not set
        return $delayDays * $dailyFee;
    }

    /**
     * Calculate total penalties including delay and damage
     */
    public function calculateTotalPenalties($damageLevel = 'none', $includeCancellation = false)
    {
        $total = 0;
        
        // Add delay penalties
        $total += $this->calculateDelayPenalties();
        
        // Add damage fees based on level
        switch ($damageLevel) {
            case 'minor':
                $total += $this->damage_fee_min;
                break;
            case 'major':
                $total += $this->damage_fee_max ?? $this->quotation_amount ?? 0;
                break;
            case 'severe':
                $total += $this->quotation_amount ?? 0; // Full payment
                break;
        }
        
        // Add cancellation fee if applicable
        if ($includeCancellation) {
            $total += $this->cancellation_fee ?? 500; // Default ₱500 if not set
        }
        
        return $total;
    }

    /**
     * Get penalty breakdown
     */
    public function getPenaltyBreakdown()
    {
        $delayPenalties = $this->calculateDelayPenalties();
        $delayDays = 0;
        
        if ($delayPenalties > 0) {
            $today = Carbon::today();
            $returnDate = Carbon::parse($this->return_date);
            $delayDays = $today->diffInDays($returnDate);
        }

        return [
            'delay_days' => $delayDays,
            'delay_fee' => $delayPenalties,
            'cancellation_fee' => $this->cancellation_fee,
            'damage_fee_min' => $this->damage_fee_min,
            'damage_fee_max' => $this->damage_fee_max,
            'total_penalties' => $this->total_penalties,
            'penalty_status' => $this->penalty_status
        ];
    }

    /**
     * Check if agreement is required
     */
    public function requiresAgreement()
    {
        return !$this->agreement_accepted;
    }
} 