<?php

namespace App\Http\Controllers;

use App\Models\Notification;
use Illuminate\Http\Request;

class NotificationController extends PaginatedController
{
    // Get notifications for the logged-in user
    public function index(Request $request)
    {
        $user = $request->user();
        \Log::info('NotificationController@index user', ['id' => $user->id, 'role' => $user->role]);
        
        // Build base query
        $query = Notification::query();
        
        if ($user->role === 'admin') {
            // Show notifications from customers (to any admin)
            $query->where('sender_role', 'customer');
        } else {
            // Show notifications from admin for this customer only
            $query->where('user_id', $user->id)
                  ->where('sender_role', 'admin');
        }
        
        // Configure pagination options
        $options = [
            'search_fields' => ['message'],
            'filter_fields' => ['read', 'sender_role'],
            'sort_fields' => ['created_at', 'read'],
            'default_per_page' => 10,
            'max_per_page' => 100,
            'transform' => function ($notification) {
                return $notification;
            }
        ];
        
        return $this->paginate($query, $request, $options);
    }

    // Mark notifications as read
    public function markAsRead(Request $request)
    {
        $user = $request->user();
        
        // Check if a specific notification_id is provided
        if ($request->has('notification_id')) {
            $notificationId = $request->input('notification_id');
            
            // Find the notification and verify ownership
            $notification = Notification::find($notificationId);
            
            if (!$notification) {
                return response()->json(['success' => false, 'message' => 'Notification not found'], 404);
            }
            
            // Verify ownership based on role
            if ($user->role === 'admin') {
                // Admin can only mark notifications from customers
                if ($notification->sender_role !== 'customer') {
                    return response()->json(['success' => false, 'message' => 'Unauthorized'], 403);
                }
            } else {
                // Customer can only mark their own notifications from admin
                if ($notification->user_id !== $user->id || $notification->sender_role !== 'admin') {
                    return response()->json(['success' => false, 'message' => 'Unauthorized'], 403);
                }
            }
            
            // Mark the specific notification as read
            $notification->update(['read' => true]);
            
            return response()->json(['success' => true, 'message' => 'Notification marked as read']);
        }
        
        // If no notification_id, mark all as read (existing behavior)
        if ($user->role === 'admin') {
            // For admin users, mark all notifications from customers as read
            Notification::where('sender_role', 'customer')
                ->where('read', false)
                ->update(['read' => true]);
        } else {
            // For customer users, mark their notifications from admin as read
            Notification::where('user_id', $user->id)
                ->where('sender_role', 'admin')
                ->where('read', false)
                ->update(['read' => true]);
        }
        
        return response()->json(['success' => true]);
    }
} 