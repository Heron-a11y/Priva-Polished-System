<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;
use App\Models\RentalPurchaseHistory;
use App\Models\Rental;
use App\Models\Purchase;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // Populate rental_purchase_history from existing rentals
        if (Schema::hasTable('rentals')) {
            $rentals = Rental::all();
            foreach ($rentals as $rental) {
                RentalPurchaseHistory::create([
                    'user_id' => $rental->user_id,
                    'order_type' => 'rental',
                    'item_name' => $rental->item_name,
                    'order_subtype' => $rental->rental_type,
                    'order_date' => $rental->rental_date,
                    'return_date' => $rental->return_date,
                    'status' => $rental->status,
                    'clothing_type' => $rental->clothing_type,
                    'measurements' => $rental->measurements,
                    'notes' => $rental->notes,
                    'customer_name' => $rental->customer_name,
                    'customer_email' => $rental->customer_email,
                    'quotation_amount' => $rental->quotation_amount,
                    'quotation_notes' => $rental->quotation_notes,
                    'quotation_status' => $rental->quotation_status === 'quoted' ? 'pending' : ($rental->quotation_status ?? 'pending'),
                    'quotation_sent_at' => $rental->quotation_sent_at,
                    'quotation_responded_at' => $rental->quotation_responded_at,
                    'penalty_breakdown' => $rental->penalty_breakdown,
                    'total_penalties' => $rental->total_penalties,
                    'penalty_status' => $rental->penalty_status,
                    'agreement_accepted' => $rental->agreement_accepted,
                    'created_at' => $rental->created_at,
                    'updated_at' => $rental->updated_at,
                ]);
            }
        }

        // Populate rental_purchase_history from existing purchases
        if (Schema::hasTable('purchases')) {
            $purchases = Purchase::all();
            foreach ($purchases as $purchase) {
                RentalPurchaseHistory::create([
                    'user_id' => $purchase->user_id,
                    'order_type' => 'purchase',
                    'item_name' => $purchase->item_name,
                    'order_subtype' => $purchase->purchase_type ?? 'custom',
                    'order_date' => $purchase->purchase_date,
                    'return_date' => null, // purchases don't have return dates
                    'status' => $purchase->status,
                    'clothing_type' => $purchase->clothing_type,
                    'measurements' => $purchase->measurements,
                    'notes' => $purchase->notes,
                    'customer_name' => $purchase->customer_name,
                    'customer_email' => $purchase->customer_email,
                    'quotation_amount' => $purchase->quotation_amount,
                    'quotation_price' => $purchase->quotation_price,
                    'quotation_notes' => $purchase->quotation_notes,
                    'quotation_status' => $purchase->quotation_status ?? 'pending',
                    'quotation_sent_at' => $purchase->quotation_sent_at,
                    'quotation_responded_at' => $purchase->quotation_responded_at,
                    'penalty_breakdown' => null, // purchases don't have penalties
                    'total_penalties' => 0,
                    'penalty_status' => 'none',
                    'agreement_accepted' => false,
                    'created_at' => $purchase->created_at,
                    'updated_at' => $purchase->updated_at,
                ]);
            }
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Clear the history table
        RentalPurchaseHistory::truncate();
    }
};
