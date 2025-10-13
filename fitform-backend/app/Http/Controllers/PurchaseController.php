<?php

namespace App\Http\Controllers;

use App\Models\Purchase;
use Illuminate\Http\Request;
use App\Models\Notification;
use App\Models\RentalPurchaseHistory;

class PurchaseController extends Controller
{
    /**
     * Update history entry when purchase status changes
     */
    private function updatePurchaseHistory($purchase)
    {
        $historyEntry = RentalPurchaseHistory::where('user_id', $purchase->user_id)
            ->where('order_type', 'purchase')
            ->where('item_name', $purchase->item_name)
            ->where('order_date', $purchase->purchase_date)
            ->first();
            
        if ($historyEntry) {
            $historyEntry->update([
                'status' => $purchase->status,
                'quotation_amount' => $purchase->quotation_amount,
                'quotation_price' => $purchase->quotation_price,
                'quotation_notes' => $purchase->quotation_notes,
                'quotation_status' => $purchase->quotation_status,
                'quotation_sent_at' => $purchase->quotation_sent_at,
                'quotation_responded_at' => $purchase->quotation_responded_at,
            ]);
        }
    }

    public function index(Request $request)
    {
        $user = $request->user();
        if ($user && isset($user->role) && $user->role === 'admin') {
            $purchases = Purchase::with('user:id,name')->whereNull('deleted_at')->get();
            $purchases->transform(function ($purchase) {
                $purchase->customer_name = $purchase->user ? $purchase->user->name : null;
                unset($purchase->user);
                return $purchase;
            });
            return response()->json(['data' => $purchases]);
        }
        $purchases = Purchase::with('user:id,name')->where('user_id', $user->id)->whereNull('deleted_at')->get();
        $purchases->transform(function ($purchase) {
            $purchase->customer_name = $purchase->user ? $purchase->user->name : null;
            unset($purchase->user);
            return $purchase;
        });
        return response()->json(['data' => $purchases]);
    }

    public function approve($id)
    {
        $purchase = Purchase::findOrFail($id);
        $purchase->status = 'approved';
        $purchase->save();
        Notification::create([
            'user_id' => $purchase->user_id,
            'sender_role' => 'admin',
            'message' => 'Your purchase order #' . $purchase->id . ' has been approved.',
            'read' => false,
            'order_id' => $purchase->id,
            'order_type' => 'Purchase',
        ]);
        return response()->json(['success' => true, 'status' => 'approved']);
    }

    public function decline($id)
    {
        $purchase = Purchase::findOrFail($id);
        $purchase->status = 'declined';
        $purchase->save();
        Notification::create([
            'user_id' => $purchase->user_id,
            'sender_role' => 'admin',
            'message' => 'Your purchase order #' . $purchase->id . ' has been declined.',
            'read' => false,
            'order_id' => $purchase->id,
            'order_type' => 'Purchase',
        ]);
        return response()->json(['success' => true, 'status' => 'declined']);
    }

    public function cancel($id)
    {
        $purchase = Purchase::findOrFail($id);
        
        // Only allow cancellation of orders that haven't been picked up yet
        if (!in_array($purchase->status, ['pending', 'quotation_sent', 'counter_offer_pending', 'in_progress', 'ready_for_pickup'])) {
            return response()->json(['error' => 'Cannot cancel order in current status: ' . $purchase->status], 400);
        }
        
        $purchase->status = 'cancelled';
        $purchase->save();
        
        // Update history entry
        $this->updatePurchaseHistory($purchase);
        
        Notification::create([
            'user_id' => $purchase->user_id,
            'sender_role' => 'customer',
            'message' => 'Your purchase order #' . $purchase->id . ' has been cancelled.',
            'read' => false,
            'order_id' => $purchase->id,
            'order_type' => 'Purchase',
        ]);
        
        return response()->json(['success' => true, 'status' => 'cancelled']);
    }


    public function adminAccept($id)
    {
        $purchase = Purchase::findOrFail($id);
        if ($purchase->status !== 'pending') {
            return response()->json(['error' => 'Order is not pending.'], 400);
        }
        $purchase->status = 'confirmed';
        $purchase->save();
        Notification::create([
            'user_id' => $purchase->user_id,
            'sender_role' => 'admin',
            'message' => 'Your purchase order #' . $purchase->id . ' has been accepted by admin.',
            'read' => false,
            'order_id' => $purchase->id,
            'order_type' => 'Purchase',
        ]);
        return response()->json(['success' => true, 'status' => 'confirmed']);
    }

    public function adminDecline($id)
    {
        $purchase = Purchase::findOrFail($id);
        if ($purchase->status !== 'pending') {
            return response()->json(['error' => 'Order is not pending.'], 400);
        }
        $purchase->status = 'declined';
        $purchase->save();
        Notification::create([
            'user_id' => $purchase->user_id,
            'sender_role' => 'admin',
            'message' => 'Your purchase order #' . $purchase->id . ' has been declined by admin.',
            'read' => false,
            'order_id' => $purchase->id,
            'order_type' => 'Purchase',
        ]);
        return response()->json(['success' => true, 'status' => 'declined']);
    }

    public function setQuotation(Request $request, $id)
    {
        $purchase = Purchase::findOrFail($id);
        if ($purchase->status !== 'pending' && $purchase->status !== 'confirmed') {
            return response()->json(['error' => 'Order must be pending or confirmed before sending quotation.'], 400);
        }
        $data = $request->validate([
            'quotation_price' => 'required|numeric',
            'quotation_schedule' => 'required|date',
            'quotation_notes' => 'nullable|string',
        ]);
        $purchase->quotation_price = $data['quotation_price'];
        $purchase->quotation_schedule = $data['quotation_schedule'];
        $purchase->quotation_notes = $data['quotation_notes'] ?? null;
        $purchase->status = 'quotation_sent';
        $purchase->save();
        
        // Update history entry
        $this->updatePurchaseHistory($purchase);
        Notification::create([
            'user_id' => $purchase->user_id,
            'sender_role' => 'admin',
            'message' => 'A quotation has been sent for your purchase order #' . $purchase->id,
            'read' => false,
            'order_id' => $purchase->id,
            'order_type' => 'Purchase',
        ]);
        return response()->json(['success' => true]);
    }

    public function customerAcceptQuotation($id)
    {
        $purchase = Purchase::findOrFail($id);
        $purchase->status = 'in_progress';
        $purchase->quotation_responded_at = now();
        $purchase->save();
        
        // Update history entry
        $this->updatePurchaseHistory($purchase);
        // Notify all admins
        $admins = \App\Models\User::where('role', 'admin')->get();
        foreach ($admins as $admin) {
            Notification::create([
                'user_id' => $admin->id,
                'sender_role' => 'customer',
                'message' => 'Customer accepted the quotation for purchase order #' . $purchase->id,
                'read' => false,
                'order_id' => $purchase->id,
                'order_type' => 'Purchase',
            ]);
        }
        return response()->json(['success' => true]);
    }

    public function customerRejectQuotation($id)
    {
        $purchase = Purchase::findOrFail($id);
        $purchase->status = 'declined';
        $purchase->quotation_responded_at = now();
        $purchase->save();
        
        // Update history entry
        $this->updatePurchaseHistory($purchase);
        // Notify all admins
        $admins = \App\Models\User::where('role', 'admin')->get();
        foreach ($admins as $admin) {
            Notification::create([
                'user_id' => $admin->id,
                'sender_role' => 'customer',
                'message' => 'Customer rejected the quotation for purchase order #' . $purchase->id . '. Transaction declined.',
                'read' => false,
                'order_id' => $purchase->id,
                'order_type' => 'Purchase',
            ]);
        }
        return response()->json(['success' => true]);
    }

    public function customerCounterOffer(Request $request, $id)
    {
        $purchase = Purchase::findOrFail($id);
        
        // Only allow counter offers if quotation has been sent or counter offer was rejected
        // Prevent counter offers if transaction is already complete
        if ($purchase->status !== 'quotation_sent' && $purchase->status !== 'rejected') {
            return response()->json(['error' => 'Counter offer can only be made after quotation is sent.'], 400);
        }
        
        // Prevent counter offers if transaction is already complete
        if ($purchase->status === 'in_progress' || $purchase->status === 'ready_for_pickup') {
            return response()->json(['error' => 'Counter offer cannot be made as the transaction is already complete.'], 400);
        }

        $data = $request->validate([
            'counter_offer_amount' => 'required|numeric|min:0',
            'counter_offer_notes' => 'nullable|string|max:1000',
        ]);

        $purchase->counter_offer_amount = $data['counter_offer_amount'];
        $purchase->counter_offer_notes = $data['counter_offer_notes'] ?? null;
        $purchase->counter_offer_sent_at = now();
        $purchase->counter_offer_status = 'pending';
        $purchase->status = 'counter_offer_pending';
        $purchase->save();

        // Notify all admins
        $admins = \App\Models\User::where('role', 'admin')->get();
        foreach ($admins as $admin) {
            Notification::create([
                'user_id' => $admin->id,
                'sender_role' => 'customer',
                'message' => 'Customer made a counter offer of ₱' . number_format($data['counter_offer_amount'], 2) . ' for purchase order #' . $purchase->id,
                'read' => false,
                'order_id' => $purchase->id,
                'order_type' => 'Purchase',
            ]);
        }

        return response()->json(['success' => true, 'message' => 'Counter offer submitted successfully']);
    }

    public function adminAcceptCounterOffer($id)
    {
        $purchase = Purchase::findOrFail($id);
        
        if ($purchase->counter_offer_status !== 'pending' || $purchase->status !== 'counter_offer_pending') {
            return response()->json(['error' => 'No pending counter offer found.'], 400);
        }

        $purchase->quotation_price = $purchase->counter_offer_amount;
        $purchase->counter_offer_status = 'accepted';
        $purchase->status = 'in_progress';
        $purchase->save();

        // Notify customer
        Notification::create([
            'user_id' => $purchase->user_id,
            'sender_role' => 'admin',
            'message' => 'Your counter offer of ₱' . number_format($purchase->counter_offer_amount, 2) . ' for purchase order #' . $purchase->id . ' has been accepted!',
            'read' => false,
            'order_id' => $purchase->id,
            'order_type' => 'Purchase',
        ]);

        return response()->json(['success' => true, 'message' => 'Counter offer accepted']);
    }

    public function adminRejectCounterOffer($id)
    {
        $purchase = Purchase::findOrFail($id);
        
        if ($purchase->counter_offer_status !== 'pending' || $purchase->status !== 'counter_offer_pending') {
            return response()->json(['error' => 'No pending counter offer found.'], 400);
        }

        $purchase->counter_offer_status = 'rejected';
        $purchase->status = 'declined';
        $purchase->save();

        // Notify customer
        Notification::create([
            'user_id' => $purchase->user_id,
            'sender_role' => 'admin',
            'message' => 'Your counter offer for purchase order #' . $purchase->id . ' has been rejected. Transaction declined.',
            'read' => false,
            'order_id' => $purchase->id,
            'order_type' => 'Purchase',
        ]);

        return response()->json(['success' => true, 'message' => 'Counter offer rejected']);
    }

    public function markReadyForPickup($id)
    {
        $purchase = Purchase::findOrFail($id);
        if ($purchase->status !== 'in_progress') {
            return response()->json(['error' => 'Order is not in progress.'], 400);
        }
        $purchase->status = 'ready_for_pickup';
        $purchase->save();
        Notification::create([
            'user_id' => $purchase->user_id,
            'sender_role' => 'admin',
            'message' => 'Your purchase order #' . $purchase->id . ' is ready for pickup!',
            'read' => false,
            'order_id' => $purchase->id,
            'order_type' => 'Purchase',
        ]);
        return response()->json(['success' => true, 'status' => 'ready_for_pickup']);
    }

    /**
     * Mark purchase as picked up
     */
    public function markAsPickedUp($id)
    {
        $purchase = Purchase::findOrFail($id);
        
        if ($purchase->status !== 'ready_for_pickup') {
            return response()->json(['error' => 'Purchase must be ready for pickup before marking as picked up.'], 400);
        }

        $purchase->status = 'picked_up';
        $purchase->save();

        // Notify customer
        Notification::create([
            'user_id' => $purchase->user_id,
            'sender_role' => 'admin',
            'message' => 'Your purchase order #' . $purchase->id . ' has been marked as picked up. Thank you for your purchase!',
            'read' => false,
            'order_id' => $purchase->id,
            'order_type' => 'Purchase',
        ]);

        return response()->json(['success' => true, 'status' => 'picked_up']);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'item_name' => 'required|string',
            'purchase_date' => 'required|date',
            'clothing_type' => 'required|string',
            'measurements' => 'required|array',
            'notes' => 'nullable|string',
            'customer_email' => 'required|email',
        ]);
        $data['user_id'] = $request->user()->id;
        $data['customer_name'] = $request->user()->name;
        $data['status'] = 'pending';
        $purchase = Purchase::create($data);
        
        // Automatically create history entry
        \App\Models\RentalPurchaseHistory::create([
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
            'quotation_amount' => null, // Will be set when quotation is sent
            'quotation_price' => null, // Will be set when quotation is sent
            'quotation_notes' => null, // Will be set when quotation is sent
            'quotation_status' => 'pending', // Default value
            'quotation_sent_at' => null, // Will be set when quotation is sent
            'quotation_responded_at' => null, // Will be set when customer responds
            'penalty_breakdown' => null, // purchases don't have penalties
            'total_penalties' => 0,
            'penalty_status' => 'none',
            'agreement_accepted' => false,
        ]);
        
        return response()->json($purchase, 201);
    }

    /**
     * Get purchase history for customer
     */
    public function getHistory(Request $request)
    {
        $user = $request->user();
        $purchases = Purchase::where('user_id', $user->id)
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json(['data' => $purchases]);
    }

    public function destroy(Request $request, $id)
    {
        try {
            \Log::info('Delete purchase request received', ['id' => $id, 'headers' => $request->headers->all()]);
            
            $purchase = Purchase::findOrFail($id);
            
            // Check if user can delete this purchase (only if it's their own purchase or if they're admin)
            $user = $request->user();
            \Log::info('User authentication check', ['user' => $user ? $user->id : 'null']);
            
            if (!$user) {
                \Log::warning('Unauthenticated delete request');
                return response()->json(['error' => 'Unauthenticated'], 401);
            }
            
            if ($user->role !== 'admin' && $purchase->user_id !== $user->id) {
                \Log::warning('Unauthorized delete request', ['user_id' => $user->id, 'purchase_user_id' => $purchase->user_id]);
                return response()->json(['error' => 'Unauthorized'], 403);
            }

            // Only allow deletion of pending or declined orders
            if (!in_array($purchase->status, ['pending', 'declined'])) {
                \Log::warning('Attempt to delete non-deletable purchase', ['status' => $purchase->status]);
                return response()->json(['error' => 'Cannot delete orders that are in progress or completed'], 400);
            }

            $purchase->forceDelete(); // Hard delete from database
            \Log::info('Purchase permanently deleted', ['id' => $id]);
            
            return response()->json(['message' => 'Purchase order permanently deleted']);
        } catch (\Exception $e) {
            \Log::error('Error deleting purchase', ['id' => $id, 'error' => $e->getMessage()]);
            return response()->json(['error' => 'Server error: ' . $e->getMessage()], 500);
        }
    }
} 