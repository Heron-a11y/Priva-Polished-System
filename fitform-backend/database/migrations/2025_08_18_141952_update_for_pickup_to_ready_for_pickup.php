<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // Update any existing orders with 'for_pickup' status to 'ready_for_pickup'
        DB::table('rentals')
            ->where('status', 'for_pickup')
            ->update(['status' => 'ready_for_pickup']);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Revert back to 'for_pickup' if needed
        DB::table('rentals')
            ->where('status', 'ready_for_pickup')
            ->update(['status' => 'for_pickup']);
    }
};
