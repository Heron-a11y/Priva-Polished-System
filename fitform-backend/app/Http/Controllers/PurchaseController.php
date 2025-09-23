<?php

namespace App\Http\Controllers;

use App\Models\Purchase;
use Illuminate\Http\Request;
use App\Models\Notification;

class PurchaseController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->user();
        if ($user && isset($user->role) && $user->role === 'admin') {
            $purchases = Purchase::with('user:id,name')->get();
            $purchases->transform(function ($purchase) {
                $purchase->customer_name = $purchase->user ? $purchase->user->name : null;
                unset($purchase->user);
                return $purchase;
            });
            return response()->json(['data' => $purchases]);
        }
        $purchases = Purchase::with('user:id,name')->where('user_id', $user->id)->get();
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
        ]);
        return response()->json(['success' => true, 'status' => 'declined']);
    }

    public function cancel($id)
    {
        $purchase = Purchase::findOrFail($id);
        $purchase->status = 'cancelled';
        $purchase->save();
        Notification::create([
            'user_id' => $purchase->user_id,
            'sender_role' => 'admin',
            'message' => 'Your purchase order #' . $purchase->id . ' has been cancelled.',
            'read' => false,
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
        Notification::create([
            'user_id' => $purchase->user_id,
            'sender_role' => 'admin',
            'message' => 'A quotation has been sent for your purchase order #' . $purchase->id,
            'read' => false,
        ]);
        return response()->json(['success' => true]);
    }

    public function customerAcceptQuotation($id)
    {
        $purchase = Purchase::findOrFail($id);
        $purchase->status = 'in_progress';
        $purchase->quotation_responded_at = now();
        $purchase->save();
        // Notify all admins
        $admins = \App\Models\User::where('role', 'admin')->get();
        foreach ($admins as $admin) {
            Notification::create([
                'user_id' => $admin->id,
                'sender_role' => 'customer',
                'message' => 'Customer accepted the quotation for purchase order #' . $purchase->id,
                'read' => false,
            ]);
        }
        return response()->json(['success' => true]);
    }

    public function customerRejectQuotation($id)
    {
        $purchase = Purchase::findOrFail($id);
        $purchase->status = 'cancelled';
        $purchase->quotation_responded_at = now();
        $purchase->save();
        // Notify all admins
        $admins = \App\Models\User::where('role', 'admin')->get();
        foreach ($admins as $admin) {
            Notification::create([
                'user_id' => $admin->id,
                'sender_role' => 'customer',
                'message' => 'Customer rejected the quotation for purchase order #' . $purchase->id,
                'read' => false,
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
        $purchase->status = 'rejected';
        $purchase->save();

        // Notify customer
        Notification::create([
            'user_id' => $purchase->user_id,
            'sender_role' => 'admin',
            'message' => 'Your counter offer for purchase order #' . $purchase->id . ' has been rejected. The original quotation remains valid.',
            'read' => false,
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
} 