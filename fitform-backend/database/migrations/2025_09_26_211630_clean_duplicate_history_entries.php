<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // Clear all existing history entries
        DB::table('rental_purchase_history')->truncate();
        
        // Re-populate with unique entries from rentals table
        $rentals = DB::table('rentals')->get();
        foreach ($rentals as $rental) {
            DB::table('rental_purchase_history')->insert([
                'user_id' => $rental->user_id,
                'order_type' => 'rental',
                'item_name' => $rental->item_name,
                'order_subtype' => 'rental',
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
                'penalty_breakdown' => null,
                'total_penalties' => $rental->total_penalties,
                'penalty_status' => $rental->penalty_status,
                'agreement_accepted' => $rental->agreement_accepted,
                'created_at' => $rental->created_at,
                'updated_at' => $rental->updated_at,
            ]);
        }
        
        // Re-populate with unique entries from purchases table
        $purchases = DB::table('purchases')->get();
        foreach ($purchases as $purchase) {
            DB::table('rental_purchase_history')->insert([
                'user_id' => $purchase->user_id,
                'order_type' => 'purchase',
                'item_name' => $purchase->item_name,
                'order_subtype' => $purchase->purchase_type ?? 'custom',
                'order_date' => $purchase->purchase_date,
                'return_date' => null,
                'status' => $purchase->status,
                'clothing_type' => $purchase->clothing_type,
                'measurements' => $purchase->measurements,
                'notes' => $purchase->notes,
                'customer_name' => $purchase->customer_name,
                'customer_email' => $purchase->customer_email,
                'quotation_amount' => null,
                'quotation_price' => $purchase->quotation_price,
                'quotation_notes' => $purchase->quotation_notes,
                'quotation_status' => 'pending',
                'quotation_sent_at' => null,
                'quotation_responded_at' => $purchase->quotation_responded_at,
                'penalty_breakdown' => null,
                'total_penalties' => 0,
                'penalty_status' => 'none',
                'agreement_accepted' => false,
                'created_at' => $purchase->created_at,
                'updated_at' => $purchase->updated_at,
            ]);
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // This migration cleans up duplicates, so we don't need to reverse it
        // The history table will remain clean
    }
};
