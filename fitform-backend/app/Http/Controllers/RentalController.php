<?php
namespace App\Http\Controllers;

use App\Models\Rental;
use Illuminate\Http\Request;
use App\Models\Notification;

class RentalController extends Controller
{
    public function index(Request $request)
    {
        $rentals = Rental::with('user:id,name')->get();
        $rentals->transform(function ($rental) {
            $rental->customer_name = $rental->user ? $rental->user->name : null;
            unset($rental->user);
            return $rental;
        });
        return response()->json($rentals);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'item_name' => 'required|string',
            'rental_date' => 'required|date',
            'clothing_type' => 'required|string',
            'measurements' => 'required|array',
            'notes' => 'nullable|string',
            'customer_email' => 'required|email',
        ]);
        $data['user_id'] = $request->user()->id;
        $data['customer_name'] = $request->user()->name;
        $data['status'] = 'pending';
        $rental = Rental::create($data);
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
        $rental->save();
        Notification::create([
            'user_id' => $rental->user_id,
            'sender_role' => 'admin',
            'message' => 'Your rental order #' . $rental->id . ' has been cancelled.',
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
        $rental->status = 'in_progress';
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
} 