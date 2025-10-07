<?php
namespace App\Http\Controllers;

use App\Models\Rental;
use Illuminate\Http\Request;
use App\Models\Notification;
use App\Models\RentalPurchaseHistory;
use Carbon\Carbon;

class RentalController extends Controller
{
    /**
     * Update history entry when rental status changes
     */
    private function updateRentalHistory($rental)
    {
        $historyEntry = RentalPurchaseHistory::where('user_id', $rental->user_id)
            ->where('order_type', 'rental')
            ->where('item_name', $rental->item_name)
            ->where('order_date', $rental->rental_date)
            ->first();
            
        if ($historyEntry) {
            $historyEntry->update([
                'status' => $rental->status,
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
    }

    public function index(Request $request)
    {
        $user = $request->user();
        if ($user && isset($user->role) && $user->role === 'admin') {
            $rentals = Rental::with('user:id,name')->whereNull('deleted_at')->get();
            $rentals->transform(function ($rental) {
                $rental->customer_name = $rental->user ? $rental->user->name : null;
                // Add penalty breakdown to each rental
                $rental->penalty_breakdown = $rental->getPenaltyBreakdown();
                unset($rental->user);
                return $rental;
            });
            return response()->json(['data' => $rentals]);
        }
        $rentals = Rental::with('user:id,name')->where('user_id', $user->id)->whereNull('deleted_at')->get();
        $rentals->transform(function ($rental) {
            $rental->customer_name = $rental->user ? $rental->user->name : null;
            // Add penalty breakdown to each rental
            $rental->penalty_breakdown = $rental->getPenaltyBreakdown();
            unset($rental->user);
            return $rental;
        });
        return response()->json(['data' => $rentals]);
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
            'agreement_accepted' => 'nullable|boolean',
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
            'agreement_accepted' => $data['agreement_accepted'] ?? false,
            'agreement_accepted_at' => ($data['agreement_accepted'] ?? false) ? now() : null,
        ];
        
        $rental = Rental::create($rentalData);
        
        // Automatically create history entry
        \App\Models\RentalPurchaseHistory::create([
            'user_id' => $rental->user_id,
            'order_type' => 'rental',
            'item_name' => $rental->item_name,
            'order_subtype' => 'rental', // Default value since rental_type doesn't exist
            'order_date' => $rental->rental_date,
            'return_date' => $rental->return_date,
            'status' => $rental->status,
            'clothing_type' => $rental->clothing_type,
            'measurements' => $rental->measurements,
            'notes' => $rental->notes,
            'customer_name' => $rental->customer_name,
            'customer_email' => $rental->customer_email,
            'quotation_amount' => null, // Will be set when quotation is sent
            'quotation_notes' => null, // Will be set when quotation is sent
            'quotation_status' => 'pending', // Default value
            'quotation_sent_at' => null, // Will be set when quotation is sent
            'quotation_responded_at' => null, // Will be set when customer responds
            'penalty_breakdown' => null, // Will be set if penalties are calculated
            'total_penalties' => 0, // Default value
            'penalty_status' => 'none', // Default value
            'agreement_accepted' => $rental->agreement_accepted,
        ]);
        
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
            'order_id' => $rental->id,
            'order_type' => 'Rental',
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
            'order_id' => $rental->id,
            'order_type' => 'Rental',
        ]);
        return response()->json(['success' => true, 'status' => 'declined']);
    }


    public function setQuotation(Request $request, $id)
    {
        $rental = Rental::findOrFail($id);
        if ($rental->status !== 'pending' && $rental->status !== 'confirmed') {
            return response()->json(['error' => 'Order must be pending or confirmed before sending quotation.'], 400);
        }
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
        
        // Update history entry
        $this->updateRentalHistory($rental);
        
        Notification::create([
            'user_id' => $rental->user_id,
            'sender_role' => 'admin',
            'message' => 'A quotation has been sent for your rental order #' . $rental->id,
            'read' => false,
            'order_id' => $rental->id,
            'order_type' => 'Rental',
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
        
        // Update history entry
        $this->updateRentalHistory($rental);
        // Notify all admins
        $admins = \App\Models\User::where('role', 'admin')->get();
        foreach ($admins as $admin) {
            Notification::create([
                'user_id' => $admin->id,
                'sender_role' => 'customer',
                'message' => 'Customer accepted the quotation for rental order #' . $rental->id,
                'read' => false,
                'order_id' => $rental->id,
                'order_type' => 'Rental',
            ]);
        }
        return response()->json(['success' => true]);
    }

    public function customerRejectQuotation($id)
    {
        $rental = Rental::findOrFail($id);
        $rental->quotation_status = 'rejected';
        $rental->status = 'declined';
        $rental->quotation_responded_at = now();
        $rental->save();
        
        // Update history entry
        $this->updateRentalHistory($rental);
        // Notify all admins
        $admins = \App\Models\User::where('role', 'admin')->get();
        foreach ($admins as $admin) {
            Notification::create([
                'user_id' => $admin->id,
                'sender_role' => 'customer',
                'message' => 'Customer rejected the quotation for rental order #' . $rental->id . '. Transaction declined.',
                'read' => false,
                'order_id' => $rental->id,
                'order_type' => 'Rental',
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
            'order_id' => $rental->id,
            'order_type' => 'Rental',
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
            'order_id' => $rental->id,
            'order_type' => 'Rental',
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
            'include_cancellation' => 'nullable|boolean',
        ]);

        $totalPenalties = $rental->calculateTotalPenalties($data['damage_level'], (bool)($data['include_cancellation'] ?? false));
        
        $rental->total_penalties = $totalPenalties;
        $rental->penalty_status = 'pending';
        $rental->penalty_notes = $data['penalty_notes'] ?? null;
        $rental->penalty_calculated_at = now();
        $rental->save();

        // Update history entry to reflect penalty information
        $this->updateRentalHistory($rental);

        // Notify customer with specific context (delay vs damage)
        $hasDelay = $rental->calculateDelayPenalties() > 0;
        $hasDamage = ($data['damage_level'] ?? 'none') !== 'none';
        if ($hasDelay && $hasDamage) {
            $message = 'Delay and damage penalties calculated for your rental order #' . $rental->id . ' — Total: ₱' . number_format((float)$totalPenalties, 2);
        } elseif ($hasDelay) {
            $message = 'Delay penalties calculated for your rental order #' . $rental->id . ' — Total: ₱' . number_format((float)$totalPenalties, 2);
        } elseif ($hasDamage) {
            $message = 'Damage penalties calculated for your rental order #' . $rental->id . ' — Total: ₱' . number_format((float)$totalPenalties, 2);
        } else {
            $message = 'Penalties calculated for your rental order #' . $rental->id . ' — Total: ₱' . number_format((float)$totalPenalties, 2);
        }

        Notification::create([
            'user_id' => $rental->user_id,
            'sender_role' => 'admin',
            'message' => $message,
            'read' => false,
            'order_id' => $rental->id,
            'order_type' => 'Rental',
        ]);

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
            'order_id' => $rental->id,
            'order_type' => 'Rental',
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

    /**
     * Mark rental as ready for pickup
     */
    public function markReadyForPickup($id)
    {
        $rental = Rental::findOrFail($id);
        if ($rental->status !== 'in_progress') {
            return response()->json(['error' => 'Order is not in progress.'], 400);
        }
        $rental->status = 'ready_for_pickup';
        $rental->save();
        Notification::create([
            'user_id' => $rental->user_id,
            'sender_role' => 'admin',
            'message' => 'Your rental order #' . $rental->id . ' is ready for pickup!',
            'read' => false,
            'order_id' => $rental->id,
            'order_type' => 'Rental',
        ]);
        return response()->json(['success' => true, 'status' => 'ready_for_pickup']);
    }

    /**
     * Get rental history for customer
     */
    public function getHistory(Request $request)
    {
        $user = $request->user();
        $rentals = Rental::where('user_id', $user->id)
            ->orderBy('created_at', 'desc')
            ->get();

        $rentals->transform(function ($rental) {
            $rental->penalty_breakdown = $rental->getPenaltyBreakdown();
            return $rental;
        });

        return response()->json(['data' => $rentals]);
    }

    /**
     * Customer counter offer for rental quotation
     */
    public function customerCounterOffer(Request $request, $id)
    {
        $rental = Rental::findOrFail($id);
        
        // Only allow counter offers if quotation has been sent or counter offer was rejected
        // Prevent counter offers if transaction is already complete
        if ($rental->status !== 'quotation_sent' && $rental->status !== 'rejected') {
            return response()->json(['error' => 'Counter offer can only be made after quotation is sent.'], 400);
        }
        
        // Prevent counter offers if transaction is already complete
        if ($rental->status === 'in_progress' || $rental->status === 'ready_for_pickup') {
            return response()->json(['error' => 'Counter offer cannot be made as the transaction is already complete.'], 400);
        }

        $data = $request->validate([
            'counter_offer_amount' => 'required|numeric|min:0',
            'counter_offer_notes' => 'nullable|string|max:1000',
        ]);

        $rental->counter_offer_amount = $data['counter_offer_amount'];
        $rental->counter_offer_notes = $data['counter_offer_notes'] ?? null;
        $rental->counter_offer_sent_at = now();
        $rental->counter_offer_status = 'pending';
        $rental->status = 'counter_offer_pending';
        $rental->save();

        // Notify all admins
        $admins = \App\Models\User::where('role', 'admin')->get();
        foreach ($admins as $admin) {
            Notification::create([
                'user_id' => $admin->id,
                'sender_role' => 'customer',
                'message' => 'Customer made a counter offer of ₱' . number_format($data['counter_offer_amount'], 2) . ' for rental order #' . $rental->id,
                'read' => false,
                'order_id' => $rental->id,
                'order_type' => 'Rental',
            ]);
        }

        return response()->json(['success' => true, 'message' => 'Counter offer submitted successfully']);
    }

    /**
     * Admin accept counter offer for rental
     */
    public function adminAcceptCounterOffer($id)
    {
        $rental = Rental::findOrFail($id);
        
        if ($rental->counter_offer_status !== 'pending' || $rental->status !== 'counter_offer_pending') {
            return response()->json(['error' => 'No pending counter offer found.'], 400);
        }

        $rental->quotation_amount = $rental->counter_offer_amount;
        $rental->counter_offer_status = 'accepted';
        $rental->status = 'ready_for_pickup';
        $rental->save();

        // Notify customer
        Notification::create([
            'user_id' => $rental->user_id,
            'sender_role' => 'admin',
            'message' => 'Your counter offer of ₱' . number_format($rental->counter_offer_amount, 2) . ' for rental order #' . $rental->id . ' has been accepted!',
            'read' => false,
            'order_id' => $rental->id,
            'order_type' => 'Rental',
        ]);

        return response()->json(['success' => true, 'message' => 'Counter offer accepted']);
    }

    /**
     * Admin reject counter offer for rental
     */
    public function adminRejectCounterOffer($id)
    {
        $rental = Rental::findOrFail($id);
        
        if ($rental->counter_offer_status !== 'pending' || $rental->status !== 'counter_offer_pending') {
            return response()->json(['error' => 'No pending counter offer found.'], 400);
        }

        $rental->counter_offer_status = 'rejected';
        $rental->status = 'declined';
        $rental->save();

        // Notify customer
        Notification::create([
            'user_id' => $rental->user_id,
            'sender_role' => 'admin',
            'message' => 'Your counter offer for rental order #' . $rental->id . ' has been rejected. Transaction declined.',
            'read' => false,
            'order_id' => $rental->id,
            'order_type' => 'Rental',
        ]);

        return response()->json(['success' => true, 'message' => 'Counter offer rejected']);
    }

    /**
     * Mark rental as picked up
     */
    public function markAsPickedUp($id)
    {
        $rental = Rental::findOrFail($id);
        
        if ($rental->status !== 'ready_for_pickup') {
            return response()->json(['error' => 'Rental must be ready for pickup before marking as picked up.'], 400);
        }

        $rental->status = 'picked_up';
        $rental->save();

        // Notify customer
        Notification::create([
            'user_id' => $rental->user_id,
            'sender_role' => 'admin',
            'message' => 'Your rental order #' . $rental->id . ' has been marked as picked up.',
            'read' => false,
            'order_id' => $rental->id,
            'order_type' => 'Rental',
        ]);

        return response()->json(['success' => true, 'status' => 'picked_up']);
    }

    /**
     * Mark rental as returned
     */
    public function markAsReturned($id)
    {
        $rental = Rental::findOrFail($id);
        
        if ($rental->status !== 'picked_up') {
            return response()->json(['error' => 'Rental must be picked up before marking as returned.'], 400);
        }

        $rental->status = 'returned';
        $rental->save();

        // Notify customer
        Notification::create([
            'user_id' => $rental->user_id,
            'sender_role' => 'admin',
            'message' => 'Your rental order #' . $rental->id . ' has been marked as returned. Thank you!',
            'read' => false,
            'order_id' => $rental->id,
            'order_type' => 'Rental',
        ]);

        return response()->json(['success' => true, 'status' => 'returned']);
    }

    public function destroy(Request $request, $id)
    {
        try {
            \Log::info('Delete rental request received', ['id' => $id, 'headers' => $request->headers->all()]);
            
            $rental = Rental::findOrFail($id);
            
            // Check if user can delete this rental (only if it's their own rental or if they're admin)
            $user = $request->user();
            \Log::info('User authentication check', ['user' => $user ? $user->id : 'null']);
            
            if (!$user) {
                \Log::warning('Unauthenticated delete request');
                return response()->json(['error' => 'Unauthenticated'], 401);
            }
            
            if ($user->role !== 'admin' && $rental->user_id !== $user->id) {
                \Log::warning('Unauthorized delete request', ['user_id' => $user->id, 'rental_user_id' => $rental->user_id]);
                return response()->json(['error' => 'Unauthorized'], 403);
            }

            // Only allow deletion of pending or declined orders
            if (!in_array($rental->status, ['pending', 'declined'])) {
                \Log::warning('Attempt to delete non-deletable rental', ['status' => $rental->status]);
                return response()->json(['error' => 'Cannot delete orders that are in progress or completed'], 400);
            }

            $rental->forceDelete(); // Hard delete from database
            \Log::info('Rental permanently deleted', ['id' => $id]);
            
            return response()->json(['message' => 'Rental order permanently deleted']);
        } catch (\Exception $e) {
            \Log::error('Error deleting rental', ['id' => $id, 'error' => $e->getMessage()]);
            return response()->json(['error' => 'Server error: ' . $e->getMessage()], 500);
        }
    }
} 