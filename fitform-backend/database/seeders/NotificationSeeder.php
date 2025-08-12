<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Notification;
use Carbon\Carbon;

class NotificationSeeder extends Seeder
{
    public function run()
    {
        Notification::insert([
            [
                'user_id' => 1,
                'message' => 'Welcome admin! You have a new rental order.',
                'read' => false,
                'created_at' => Carbon::now(),
                'updated_at' => Carbon::now(),
            ],
            [
                'user_id' => 2,
                'message' => 'Your quotation has been approved.',
                'read' => false,
                'created_at' => Carbon::now(),
                'updated_at' => Carbon::now(),
            ],
        ]);
    }
} 