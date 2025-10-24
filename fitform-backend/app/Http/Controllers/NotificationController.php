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
            'default_per_page' => 20,
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