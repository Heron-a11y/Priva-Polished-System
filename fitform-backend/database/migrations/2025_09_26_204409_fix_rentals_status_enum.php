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
        // Fix rentals table status ENUM to include all required statuses
        DB::statement("ALTER TABLE rentals MODIFY COLUMN status ENUM('pending', 'quotation_sent', 'counter_offer_pending', 'in_progress', 'ready_for_pickup', 'picked_up', 'returned', 'declined') DEFAULT 'pending'");
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Revert to previous ENUM (without in_progress)
        DB::statement("ALTER TABLE rentals MODIFY COLUMN status ENUM('pending', 'quotation_sent', 'counter_offer_pending', 'ready_for_pickup', 'picked_up', 'returned', 'declined') DEFAULT 'pending'");
    }
};
