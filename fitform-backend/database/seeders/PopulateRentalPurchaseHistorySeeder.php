<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Rental;
use App\Models\Purchase;
use App\Models\RentalPurchaseHistory;
use Illuminate\Support\Facades\DB;

class PopulateRentalPurchaseHistorySeeder extends Seeder
{
    /**
     * Run the database seeds.
     * Populates rental_purchase_history from existing rentals and purchases
     */
    public function run(): void
    {
        $this->command->info('🔄 Starting to populate rental purchase history from existing orders...');
        
        // Count existing history
        $existingHistoryCount = RentalPurchaseHistory::count();
        $this->command->info("📊 Current history records: {$existingHistoryCount}");
        
        // First, populate order_id for existing history records that don't have it
        $this->command->info('🔗 Populating order_id for existing history records...');
        
        // Update rental history entries without order_id
        $rentalHistoryWithoutOrderId = RentalPurchaseHistory::where('order_type', 'rental')
            ->whereNull('order_id')
            ->get();
        
        foreach ($rentalHistoryWithoutOrderId as $history) {
            $rental = Rental::where('user_id', $history->user_id)
                ->where('item_name', $history->item_name)
                ->where('rental_date', $history->order_date)
                ->first();
            
            if ($rental) {
                $history->update(['order_id' => $rental->id]);
                $this->command->info("  ✅ Updated rental history ID {$history->id} with order_id {$rental->id}");
            }
        }
        
        // Update purchase history entries without order_id
        $purchaseHistoryWithoutOrderId = RentalPurchaseHistory::where('order_type', 'purchase')
            ->whereNull('order_id')
            ->get();
        
        foreach ($purchaseHistoryWithoutOrderId as $history) {
            $purchase = Purchase::where('user_id', $history->user_id)
                ->where('item_name', $history->item_name)
                ->where('purchase_date', $history->order_date)
                ->first();
            
            if ($purchase) {
                $history->update(['order_id' => $purchase->id]);
                $this->command->info("  ✅ Updated purchase history ID {$history->id} with order_id {$purchase->id}");
            }
        }
        
        // Get all rentals
        $rentals = Rental::withTrashed()->get();
        $this->command->info("📦 Found {$rentals->count()} rental orders");
        
        $rentalHistoryCreated = 0;
        $rentalHistoryUpdated = 0;
        
        foreach ($rentals as $rental) {
            // Check if history entry already exists
            $existingHistory = RentalPurchaseHistory::where('order_id', $rental->id)
                ->where('order_type', 'rental')
                ->first();
            
            if ($existingHistory) {
                // Update existing entry
                $existingHistory->update([
                    'user_id' => $rental->user_id,
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
                    'order_date' => $rental->rental_date,
                    'return_date' => $rental->return_date,
                    'item_name' => $rental->item_name,
                ]);
                $rentalHistoryUpdated++;
            } else {
                // Create new history entry
                RentalPurchaseHistory::create([
                    'user_id' => $rental->user_id,
                    'order_id' => $rental->id,
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
                    'quotation_status' => $rental->quotation_status ?? 'pending',
                    'quotation_sent_at' => $rental->quotation_sent_at,
                    'quotation_responded_at' => $rental->quotation_responded_at,
                    'penalty_breakdown' => $rental->penalty_breakdown,
                    'total_penalties' => $rental->total_penalties ?? 0,
                    'penalty_status' => $rental->penalty_status ?? 'none',
                    'agreement_accepted' => $rental->agreement_accepted ?? false,
                ]);
                $rentalHistoryCreated++;
            }
        }
        
        $this->command->info("✅ Processed {$rentals->count()} rentals: {$rentalHistoryCreated} created, {$rentalHistoryUpdated} updated");
        
        // Get all purchases
        $purchases = Purchase::withTrashed()->get();
        $this->command->info("📦 Found {$purchases->count()} purchase orders");
        
        $purchaseHistoryCreated = 0;
        $purchaseHistoryUpdated = 0;
        
        foreach ($purchases as $purchase) {
            // Check if history entry already exists
            $existingHistory = RentalPurchaseHistory::where('order_id', $purchase->id)
                ->where('order_type', 'purchase')
                ->first();
            
            if ($existingHistory) {
                // Update existing entry
                $existingHistory->update([
                    'user_id' => $purchase->user_id,
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
                    'order_date' => $purchase->purchase_date,
                    'item_name' => $purchase->item_name,
                ]);
                $purchaseHistoryUpdated++;
            } else {
                // Create new history entry
                RentalPurchaseHistory::create([
                    'user_id' => $purchase->user_id,
                    'order_id' => $purchase->id,
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
                    'quotation_amount' => $purchase->quotation_amount,
                    'quotation_price' => $purchase->quotation_price,
                    'quotation_notes' => $purchase->quotation_notes,
                    'quotation_status' => $purchase->quotation_status ?? 'pending',
                    'quotation_sent_at' => $purchase->quotation_sent_at,
                    'quotation_responded_at' => $purchase->quotation_responded_at,
                    'penalty_breakdown' => null,
                    'total_penalties' => 0,
                    'penalty_status' => 'none',
                    'agreement_accepted' => false,
                ]);
                $purchaseHistoryCreated++;
            }
        }
        
        $this->command->info("✅ Processed {$purchases->count()} purchases: {$purchaseHistoryCreated} created, {$purchaseHistoryUpdated} updated");
        
        // Final count
        $finalHistoryCount = RentalPurchaseHistory::count();
        $this->command->info("📊 Final history records: {$finalHistoryCount}");
        $this->command->info("✅ History population completed!");
    }
}

