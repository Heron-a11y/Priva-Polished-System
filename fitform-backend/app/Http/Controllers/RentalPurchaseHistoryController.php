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
        
        // Get rentals with finished statuses
        $rentals = Rental::where('user_id', $user->id)
            ->whereIn('status', ['declined', 'cancelled', 'returned'])
            ->orderBy('created_at', 'desc')
            ->get()
            ->map(function ($rental) {
                return [
                    'id' => $rental->id,
                    'order_type' => 'rental',
                    'item_name' => $rental->item_name,
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
                    'created_at' => $rental->created_at,
                    'updated_at' => $rental->updated_at,
                ];
            });

        // Get purchases with finished statuses
        $purchases = Purchase::where('user_id', $user->id)
            ->whereIn('status', ['declined', 'cancelled', 'picked_up'])
            ->orderBy('created_at', 'desc')
            ->get()
            ->map(function ($purchase) {
                return [
                    'id' => $purchase->id,
                    'order_type' => 'purchase',
                    'item_name' => $purchase->item_name,
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
                    'quotation_status' => $purchase->quotation_status,
                    'quotation_sent_at' => $purchase->quotation_sent_at,
                    'quotation_responded_at' => $purchase->quotation_responded_at,
                    'penalty_breakdown' => null,
                    'total_penalties' => 0,
                    'penalty_status' => 'none',
                    'created_at' => $purchase->created_at,
                    'updated_at' => $purchase->updated_at,
                ];
            });

        // Combine and sort by date
        $history = $rentals->concat($purchases)->sortByDesc('created_at')->values();

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
        
        // Try to find in rentals table first
        $rental = Rental::where('user_id', $user->id)->find($id);
        if ($rental) {
            $rental->forceDelete();
            return response()->json(['message' => 'Rental order permanently deleted']);
        }
        
        // Try to find in purchases table
        $purchase = Purchase::where('user_id', $user->id)->find($id);
        if ($purchase) {
            $purchase->forceDelete();
            return response()->json(['message' => 'Purchase order permanently deleted']);
        }
        
        return response()->json(['message' => 'Order not found'], 404);
    }
}
