<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Notification;
use Carbon\Carbon;

class NotificationSeeder extends Seeder
{
    public function run()
    {
        // Only create notifications if they don't already exist
        $admin = \App\Models\User::where('role', 'admin')->first();
        $customer = \App\Models\User::where('role', 'customer')->first();
        
        if ($admin) {
            \App\Models\Notification::firstOrCreate(
            [
                    'user_id' => $admin->id,
                'message' => 'Welcome admin! You have a new rental order.',
                ],
                [
                'read' => false,
                'created_at' => Carbon::now(),
                'updated_at' => Carbon::now(),
                ]
            );
        }
        
        if ($customer) {
            \App\Models\Notification::firstOrCreate(
            [
                    'user_id' => $customer->id,
                'message' => 'Your quotation has been approved.',
                ],
                [
                'read' => false,
                'created_at' => Carbon::now(),
                'updated_at' => Carbon::now(),
                ]
            );
        }
    }
} 