<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\RentalPurchaseHistory;
use App\Models\Rental;
use App\Models\Purchase;

class RentalPurchaseHistoryController extends Controller
{
    /**
     * Get combined rental and purchase history for authenticated user
     */
    public function index(Request $request)
    {
        $user = $request->user();
        $history = RentalPurchaseHistory::where('user_id', $user->id)
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json(['data' => $history]);
    }

    /**
     * Create rental history entry from rental
     */
    public function createFromRental(Rental $rental)
    {
        return RentalPurchaseHistory::create([
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
            'quotation_status' => $rental->quotation_status,
            'quotation_sent_at' => $rental->quotation_sent_at,
            'quotation_responded_at' => $rental->quotation_responded_at,
            'penalty_breakdown' => $rental->penalty_breakdown,
            'total_penalties' => $rental->total_penalties,
            'penalty_status' => $rental->penalty_status,
            'agreement_accepted' => $rental->agreement_accepted,
        ]);
    }

    /**
     * Create purchase history entry from purchase
     */
    public function createFromPurchase(Purchase $purchase)
    {
        return RentalPurchaseHistory::create([
            'user_id' => $purchase->user_id,
            'order_type' => 'purchase',
            'item_name' => $purchase->item_name,
            'order_subtype' => $purchase->purchase_type,
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
            'quotation_status' => $purchase->quotation_status,
            'quotation_sent_at' => $purchase->quotation_sent_at,
            'quotation_responded_at' => $purchase->quotation_responded_at,
            'penalty_breakdown' => null, // purchases don't have penalties
            'total_penalties' => 0,
            'penalty_status' => 'none',
            'agreement_accepted' => false,
        ]);
    }

    /**
     * Delete rental/purchase history entry and corresponding main table entry
     */
    public function destroy(Request $request, $id)
    {
        $user = $request->user();
        $history = RentalPurchaseHistory::where('user_id', $user->id)->findOrFail($id);
        
        // Delete from main table based on order type
        if ($history->order_type === 'rental') {
            // Find and delete the corresponding rental order
            $rental = \App\Models\Rental::where('user_id', $user->id)
                ->where('item_name', $history->item_name)
                ->where('rental_date', $history->order_date)
                ->first();
            
            if ($rental) {
                $rental->forceDelete(); // Hard delete from rentals table
            }
        } elseif ($history->order_type === 'purchase') {
            // Find and delete the corresponding purchase order
            $purchase = \App\Models\Purchase::where('user_id', $user->id)
                ->where('item_name', $history->item_name)
                ->where('purchase_date', $history->order_date)
                ->first();
            
            if ($purchase) {
                $purchase->forceDelete(); // Hard delete from purchases table
            }
        }
        
        // Delete from history table
        $history->forceDelete(); // Hard delete from history table
        
        return response()->json(['message' => 'Order permanently deleted from all tables']);
    }
}
