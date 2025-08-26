<?php
namespace App\Http\Controllers;

use App\Models\Rental;
use Illuminate\Http\Request;
use App\Models\Notification;
use Carbon\Carbon;

class RentalController extends Controller
{
    public function index(Request $request)
    {
        $rentals = Rental::with('user:id,name')->get();
        $rentals->transform(function ($rental) {
            $rental->customer_name = $rental->user ? $rental->user->name : null;
            // Add penalty breakdown to each rental
            $rental->penalty_breakdown = $rental->getPenaltyBreakdown();
            unset($rental->user);
            return $rental;
        });
        return response()->json($rentals);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'item_name' => 'required|string',
            'rental_type' => 'required|string',
            'start_date' => 'required|date',
            'special_requests' => 'nullable|string',
            'customer_name' => 'required|string',
            'customer_email' => 'required|email',
            'clothing_type' => 'required|string',
            'measurements' => 'required|array',
            'agreement_accepted' => 'required|boolean',
        ]);
        
        $data['user_id'] = $request->user()->id;
        $data['status'] = 'pending';
        
        // Calculate return date (5 days from start date)
        $startDate = \Carbon\Carbon::parse($data['start_date']);
        $returnDate = $startDate->copy()->addDays(5);
        
        // Map frontend fields to database fields
        $rentalData = [
            'user_id' => $data['user_id'],
            'item_name' => $data['item_name'],
            'rental_date' => $data['start_date'],
            'return_date' => $returnDate->format('Y-m-d'),
            'status' => $data['status'],
            'clothing_type' => $data['clothing_type'],
            'measurements' => $data['measurements'],
            'notes' => $data['special_requests'],
            'customer_name' => $data['customer_name'],
            'customer_email' => $data['customer_email'],
            'agreement_accepted' => $data['agreement_accepted'],
            'agreement_accepted_at' => $data['agreement_accepted'] ? now() : null,
        ];
        
        $rental = Rental::create($rentalData);
        return response()->json($rental, 201);
    }

    public function approve($id)
    {
        $rental = Rental::findOrFail($id);
        $rental->status = 'approved';
        $rental->save();
        Notification::create([
            'user_id' => $rental->user_id,
            'sender_role' => 'admin',
            'message' => 'Your rental order #' . $rental->id . ' has been approved.',
            'read' => false,
        ]);
        return response()->json(['success' => true, 'status' => 'approved']);
    }

    public function decline($id)
    {
        $rental = Rental::findOrFail($id);
        $rental->status = 'declined';
        $rental->save();
        Notification::create([
            'user_id' => $rental->user_id,
            'sender_role' => 'admin',
            'message' => 'Your rental order #' . $rental->id . ' has been declined.',
            'read' => false,
        ]);
        return response()->json(['success' => true, 'status' => 'declined']);
    }

    public function cancel($id)
    {
        $rental = Rental::findOrFail($id);
        $rental->status = 'cancelled';
        
        // Apply cancellation fee
        $rental->total_penalties = $rental->cancellation_fee;
        $rental->penalty_status = 'pending';
        $rental->penalty_notes = 'Cancellation fee applied';
        $rental->penalty_calculated_at = now();
        
        $rental->save();
        
        Notification::create([
            'user_id' => $rental->user_id,
            'sender_role' => 'admin',
            'message' => 'Your rental order #' . $rental->id . ' has been cancelled. Cancellation fee: ₱' . $rental->cancellation_fee,
            'read' => false,
        ]);
        return response()->json(['success' => true, 'status' => 'cancelled']);
    }

    public function setQuotation(Request $request, $id)
    {
        $rental = Rental::findOrFail($id);
        $data = $request->validate([
            'quotation_amount' => 'required|numeric',
            'quotation_notes' => 'nullable|string',
        ]);
        $rental->quotation_amount = $data['quotation_amount'];
        $rental->quotation_notes = $data['quotation_notes'] ?? null;
        $rental->quotation_status = 'quoted';
        $rental->status = 'quotation_sent';
        $rental->quotation_sent_at = now();
        
        // Set damage fee max to quotation amount
        $rental->damage_fee_max = $data['quotation_amount'];
        
        $rental->save();
        Notification::create([
            'user_id' => $rental->user_id,
            'sender_role' => 'admin',
            'message' => 'A quotation has been sent for your rental order #' . $rental->id,
            'read' => false,
        ]);
        return response()->json(['success' => true]);
    }

    public function customerAcceptQuotation($id)
    {
        $rental = Rental::findOrFail($id);
        $rental->quotation_status = 'accepted';
        $rental->status = 'ready_for_pickup';
        $rental->quotation_responded_at = now();
        $rental->save();
        // Notify all admins
        $admins = \App\Models\User::where('role', 'admin')->get();
        foreach ($admins as $admin) {
            Notification::create([
                'user_id' => $admin->id,
                'sender_role' => 'customer',
                'message' => 'Customer accepted the quotation for rental order #' . $rental->id,
                'read' => false,
            ]);
        }
        return response()->json(['success' => true]);
    }

    public function customerRejectQuotation($id)
    {
        $rental = Rental::findOrFail($id);
        $rental->quotation_status = 'rejected';
        $rental->status = 'cancelled';
        $rental->quotation_responded_at = now();
        $rental->save();
        // Notify all admins
        $admins = \App\Models\User::where('role', 'admin')->get();
        foreach ($admins as $admin) {
            Notification::create([
                'user_id' => $admin->id,
                'sender_role' => 'customer',
                'message' => 'Customer rejected the quotation for rental order #' . $rental->id,
                'read' => false,
            ]);
        }
        return response()->json(['success' => true]);
    }

    public function adminAccept($id)
    {
        $rental = Rental::findOrFail($id);
        if ($rental->status !== 'pending') {
            return response()->json(['error' => 'Order is not pending.'], 400);
        }
        $rental->status = 'confirmed';
        $rental->save();
        Notification::create([
            'user_id' => $rental->user_id,
            'sender_role' => 'admin',
            'message' => 'Your rental order #' . $rental->id . ' has been accepted by admin.',
            'read' => false,
        ]);
        return response()->json(['success' => true, 'status' => 'confirmed']);
    }

    public function adminDecline($id)
    {
        $rental = Rental::findOrFail($id);
        if ($rental->status !== 'pending') {
            return response()->json(['error' => 'Order is not pending.'], 400);
        }
        $rental->status = 'declined';
        $rental->save();
        Notification::create([
            'user_id' => $rental->user_id,
            'sender_role' => 'admin',
            'message' => 'Your rental order #' . $rental->id . ' has been declined by admin.',
            'read' => false,
        ]);
        return response()->json(['success' => true, 'status' => 'declined']);
    }

    /**
     * Calculate penalties for a rental
     */
    public function calculatePenalties(Request $request, $id)
    {
        $rental = Rental::findOrFail($id);
        $data = $request->validate([
            'damage_level' => 'required|in:none,minor,major,severe',
            'penalty_notes' => 'nullable|string',
        ]);

        $totalPenalties = $rental->calculateTotalPenalties($data['damage_level']);
        
        $rental->total_penalties = $totalPenalties;
        $rental->penalty_status = 'pending';
        $rental->penalty_notes = $data['penalty_notes'] ?? null;
        $rental->penalty_calculated_at = now();
        $rental->save();

        return response()->json([
            'success' => true,
            'total_penalties' => $totalPenalties,
            'penalty_breakdown' => $rental->getPenaltyBreakdown()
        ]);
    }

    /**
     * Mark penalties as paid
     */
    public function markPenaltiesPaid($id)
    {
        $rental = Rental::findOrFail($id);
        $rental->penalty_status = 'paid';
        $rental->penalty_paid_at = now();
        $rental->save();

        Notification::create([
            'user_id' => $rental->user_id,
            'sender_role' => 'admin',
            'message' => 'Penalties for rental order #' . $rental->id . ' have been marked as paid.',
            'read' => false,
        ]);

        return response()->json(['success' => true]);
    }

    /**
     * Get penalty breakdown for a rental
     */
    public function getPenaltyBreakdown($id)
    {
        $rental = Rental::findOrFail($id);
        return response()->json([
            'penalty_breakdown' => $rental->getPenaltyBreakdown(),
            'rental' => $rental
        ]);
    }

    /**
     * Accept user agreement
     */
    public function acceptAgreement($id)
    {
        $rental = Rental::findOrFail($id);
        $rental->agreement_accepted = true;
        $rental->agreement_accepted_at = now();
        $rental->save();

        return response()->json(['success' => true]);
    }
} 