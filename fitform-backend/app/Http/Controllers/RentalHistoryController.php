<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\RentalHistory;
use App\Models\Rental;

class RentalHistoryController extends Controller
{
    /**
     * Get rental history for authenticated user
     */
    public function index(Request $request)
    {
        $user = $request->user();
        $rentals = RentalHistory::where('user_id', $user->id)
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json(['data' => $rentals]);
    }

    /**
     * Create rental history entry from rental
     */
    public function createFromRental(Rental $rental)
    {
        return RentalHistory::create([
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

    /**
     * Soft delete rental history entry
     */
    public function destroy(Request $request, $id)
    {
        $user = $request->user();
        $rentalHistory = RentalHistory::where('user_id', $user->id)->findOrFail($id);
        
        $rentalHistory->delete();
        
        return response()->json(['message' => 'Rental history deleted successfully']);
    }
}
