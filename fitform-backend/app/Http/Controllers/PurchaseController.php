<?php

namespace App\Http\Controllers;

use App\Models\Purchase;
use Illuminate\Http\Request;
use App\Models\Notification;
use App\Models\RentalPurchaseHistory;
use App\Services\ActivityLogService;

class PurchaseController extends PaginatedController
{
    /**
     * Update history entry when purchase status changes
     */
    private function updatePurchaseHistory($purchase)
    {
        // First try to find by order_id (most reliable)
        $historyEntry = RentalPurchaseHistory::where('order_id', $purchase->id)
            ->where('order_type', 'purchase')
            ->first();
            
        // If not found by order_id, try the old method for backward compatibility
        if (!$historyEntry) {
            $historyEntry = RentalPurchaseHistory::where('user_id', $purchase->user_id)
                ->where('order_type', 'purchase')
                ->where('item_name', $purchase->item_name)
                ->where('order_date', $purchase->purchase_date)
                ->first();
                
            // If found by old method, update the order_id for future reference
            if ($historyEntry) {
                $historyEntry->update(['order_id' => $purchase->id]);
            }
        }
            
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
            
            \Log::info('Purchase history updated', [
                'purchase_id' => $purchase->id,
                'history_id' => $historyEntry->id,
                'status' => $purchase->status
            ]);
        } else {
            \Log::warning('Purchase history entry not found', [
                'purchase_id' => $purchase->id,
                'user_id' => $purchase->user_id,
                'item_name' => $purchase->item_name,
                'purchase_date' => $purchase->purchase_date
            ]);
        }
    }

    public function index(Request $request)
    {
        $user = $request->user();
        
        // Build base query
        $query = Purchase::with('user:id,name')->whereNull('deleted_at');
        
        // Apply user-specific filtering
        if ($user && isset($user->role) && $user->role === 'admin') {
            // Admin can see all purchases
        } else {
            // Regular users can only see their own purchases
            $query->where('user_id', $user->id);
        }
        
        // Configure pagination options
        $options = [
            'search_fields' => ['item_name', 'customer_name', 'customer_email', 'clothing_type'],
            'filter_fields' => ['status', 'clothing_type', 'user_id'],
            'sort_fields' => ['created_at', 'purchase_date', 'status', 'item_name'],
            'default_per_page' => 15,
            'max_per_page' => 50,
            'transform' => function ($purchase) {
                $purchase->customer_name = $purchase->user ? $purchase->user->name : null;
                unset($purchase->user);
                return $purchase;
            }
        ];
        
        return $this->paginate($query, $request, $options);
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
        // Get customer information for notifications
        $customer = \App\Models\User::find($purchase->user_id);
        $customerName = $customer ? $customer->name : 'Unknown Customer';
        
        // Notify all admins
        $admins = \App\Models\User::where('role', 'admin')->get();
        foreach ($admins as $admin) {
            Notification::create([
                'user_id' => $admin->id,
                'sender_role' => 'customer',
                'message' => $customerName . ' accepted the quotation for purchase order #' . $purchase->id,
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
        // Get customer information for notifications
        $customer = \App\Models\User::find($purchase->user_id);
        $customerName = $customer ? $customer->name : 'Unknown Customer';
        
        // Notify all admins
        $admins = \App\Models\User::where('role', 'admin')->get();
        foreach ($admins as $admin) {
            Notification::create([
                'user_id' => $admin->id,
                'sender_role' => 'customer',
                'message' => $customerName . ' rejected the quotation for purchase order #' . $purchase->id . '. Transaction declined.',
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

        // Get customer information for notifications
        $customer = \App\Models\User::find($purchase->user_id);
        $customerName = $customer ? $customer->name : 'Unknown Customer';
        
        // Notify all admins
        $admins = \App\Models\User::where('role', 'admin')->get();
        foreach ($admins as $admin) {
            Notification::create([
                'user_id' => $admin->id,
                'sender_role' => 'customer',
                'message' => $customerName . ' made a counter offer of ₱' . number_format($data['counter_offer_amount'], 2) . ' for purchase order #' . $purchase->id,
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

    public function store(\App\Http\Requests\PurchaseRequest $request)
    {
        // Additional business rule validation
        $validationService = new \App\Services\ValidationService();
        $businessErrors = $validationService->validateBusinessRules($request->validated(), 'purchase');
        
        if (!empty($businessErrors)) {
            return response()->json([
                'success' => false,
                'message' => 'Business rule validation failed',
                'errors' => $businessErrors
            ], 422);
        }
        
        $data = $request->validated();
        $data['user_id'] = $request->user()->id;
        $data['customer_name'] = $request->user()->name;
        $data['status'] = 'pending';
        $purchase = Purchase::create($data);
        
        // Get customer information for notifications
        $customer = \App\Models\User::find($purchase->user_id);
        $customerName = $customer ? $customer->name : 'Unknown Customer';
        
        // Log activity for purchase creation
        try {
            ActivityLogService::logOrder(
                'created',
                "New purchase order created by {$customerName} for {$purchase->item_name}",
                [
                    'purchase_id' => $purchase->id,
                    'customer_name' => $customerName,
                    'customer_email' => $purchase->customer_email,
                    'item_name' => $purchase->item_name,
                    'clothing_type' => $purchase->clothing_type,
                    'purchase_date' => $purchase->purchase_date
                ],
                $purchase->user_id,
                'customer',
                $request
            );
            \Log::info('Activity logged successfully for purchase: ' . $purchase->id);
        } catch (\Exception $e) {
            \Log::error('Failed to log activity for purchase: ' . $purchase->id . ' - ' . $e->getMessage());
        }
        
        // Notify all admins about new purchase order
        $admins = \App\Models\User::where('role', 'admin')->get();
        foreach ($admins as $admin) {
            Notification::create([
                'user_id' => $admin->id,
                'sender_role' => 'customer',
                'message' => $customerName . ' created a new purchase order #' . $purchase->id . ' for ' . $purchase->item_name,
                'read' => false,
                'order_id' => $purchase->id,
                'order_type' => 'Purchase',
            ]);
        }
        
        // Automatically create history entry
        \App\Models\RentalPurchaseHistory::create([
            'user_id' => $purchase->user_id,
            'order_id' => $purchase->id, // Link to the purchase record
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

    /**
     * Generate receipt for purchase
     */
    public function generateReceipt(Request $request, $id)
    {
        try {
            $purchase = Purchase::findOrFail($id);
            $user = $request->user();
            
            // Check if user can access this purchase
            if ($user->role !== 'admin' && $purchase->user_id !== $user->id) {
                return response()->json(['error' => 'Unauthorized'], 403);
            }
            
            // Check if purchase is in correct status for receipt generation
            if ($purchase->status !== 'picked_up') {
                return response()->json([
                    'success' => false,
                    'message' => 'Receipt can only be generated for picked up purchases'
                ], 400);
            }
            
            // Generate receipt data
            $receiptData = [
                'purchase_id' => $purchase->id,
                'customer_name' => $purchase->customer_name,
                'customer_email' => $purchase->customer_email,
                'item_name' => $purchase->item_name,
                'clothing_type' => $purchase->clothing_type,
                'purchase_date' => $purchase->purchase_date,
                'status' => $purchase->status,
                'quotation_amount' => $purchase->quotation_amount,
                'quotation_price' => $purchase->quotation_price,
                'quotation_notes' => $purchase->quotation_notes,
                'generated_at' => now(),
                'receipt_number' => 'PURCH-' . str_pad($purchase->id, 6, '0', STR_PAD_LEFT)
            ];
            
            // In a real implementation, you would generate a PDF receipt here
            // For now, we'll return the receipt data with a mock URL
            $receiptUrl = url("/api/receipts/purchase/{$purchase->id}/" . time());
            
            \Log::info('Receipt generated for purchase', [
                'purchase_id' => $purchase->id,
                'customer' => $purchase->customer_name,
                'receipt_url' => $receiptUrl
            ]);
            
            return response()->json([
                'success' => true,
                'message' => 'Receipt generated successfully',
                'receipt_data' => $receiptData,
                'receipt_url' => $receiptUrl
            ]);
            
        } catch (\Exception $e) {
            \Log::error('Error generating purchase receipt', [
                'purchase_id' => $id,
                'error' => $e->getMessage()
            ]);
            
            return response()->json([
                'success' => false,
                'message' => 'Failed to generate receipt',
                'error' => $e->getMessage()
            ], 500);
        }
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