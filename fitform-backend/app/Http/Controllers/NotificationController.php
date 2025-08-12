<?php

namespace App\Http\Controllers;

use App\Models\Notification;
use Illuminate\Http\Request;

class NotificationController extends Controller
{
    // Get notifications for the logged-in user
    public function index(Request $request)
    {
        $user = $request->user();
        \Log::info('NotificationController@index user', ['id' => $user->id, 'role' => $user->role]);
        if ($user->role === 'admin') {
            // Show notifications from customers (to any admin)
            $notifications = Notification::where('sender_role', 'customer')
                ->orderBy('created_at', 'desc')
                ->get();
        } else {
            // Show notifications from admin for this customer only
            $notifications = Notification::where('user_id', $user->id)
                ->where('sender_role', 'admin')
                ->orderBy('created_at', 'desc')
                ->get();
        }
        return response()->json(['data' => $notifications]);
    }

    // Mark notifications as read
    public function markAsRead(Request $request)
    {
        $user = $request->user();
        Notification::where('user_id', $user->id)->where('read', false)->update(['read' => true]);
        return response()->json(['success' => true]);
    }
} 