<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use App\Models\Rental;
use App\Models\Purchase;
use App\Models\RentalHistory;
use App\Models\PurchaseHistory;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // Populate rental history from existing rentals
        $rentals = Rental::all();
        foreach ($rentals as $rental) {
            RentalHistory::create([
                'user_id' => $rental->user_id,
                'item_name' => $rental->item_name,
                'rental_type' => $rental->rental_type,
                'rental_date' => $rental->rental_date,
                'return_date' => $rental->return_date,
                'status' => $rental->status,
                'clothing_type' => $rental->clothing_type,
                'measurements' => $rental->measurements,
                'notes' => $rental->notes,
                'customer_name' => $rental->customer_name,
                'customer_email' => $rental->customer_email,
                'quotation_amount' => $rental->quotation_amount,
                'quotation_notes' => $rental->quotation_notes,
                'quotation_status' => $rental->quotation_status,
                'quotation_sent_at' => $rental->quotation_sent_at,
                'quotation_responded_at' => $rental->quotation_responded_at,
                'penalty_breakdown' => $rental->penalty_breakdown,
                'total_penalties' => $rental->total_penalties,
                'penalty_status' => $rental->penalty_status,
                'agreement_accepted' => $rental->agreement_accepted,
            ]);
        }

        // Populate purchase history from existing purchases
        $purchases = Purchase::all();
        foreach ($purchases as $purchase) {
            PurchaseHistory::create([
                'user_id' => $purchase->user_id,
                'item_name' => $purchase->item_name,
                'purchase_type' => $purchase->purchase_type,
                'purchase_date' => $purchase->purchase_date,
                'status' => $purchase->status,
                'clothing_type' => $purchase->clothing_type,
                'measurements' => $purchase->measurements,
                'notes' => $purchase->notes,
                'customer_name' => $purchase->customer_name,
                'customer_email' => $purchase->customer_email,
                'quotation_amount' => $purchase->quotation_amount,
                'quotation_price' => $purchase->quotation_price,
                'quotation_notes' => $purchase->quotation_notes,
                'quotation_status' => $purchase->quotation_status,
                'quotation_sent_at' => $purchase->quotation_sent_at,
                'quotation_responded_at' => $purchase->quotation_responded_at,
            ]);
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Clear history tables
        RentalHistory::truncate();
        PurchaseHistory::truncate();
    }
};
