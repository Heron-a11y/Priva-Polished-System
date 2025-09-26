<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\PurchaseHistory;
use App\Models\Purchase;

class PurchaseHistoryController extends Controller
{
    /**
     * Get purchase history for authenticated user
     */
    public function index(Request $request)
    {
        $user = $request->user();
        $purchases = PurchaseHistory::where('user_id', $user->id)
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json(['data' => $purchases]);
    }

    /**
     * Create purchase history entry from purchase
     */
    public function createFromPurchase(Purchase $purchase)
    {
        return PurchaseHistory::create([
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

    /**
     * Soft delete purchase history entry
     */
    public function destroy(Request $request, $id)
    {
        $user = $request->user();
        $purchaseHistory = PurchaseHistory::where('user_id', $user->id)->findOrFail($id);
        
        $purchaseHistory->delete();
        
        return response()->json(['message' => 'Purchase history deleted successfully']);
    }
}
