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
        // Add 'cancelled' to the status ENUM
        DB::statement("ALTER TABLE purchases MODIFY COLUMN status ENUM('pending', 'quotation_sent', 'counter_offer_pending', 'in_progress', 'ready_for_pickup', 'picked_up', 'declined', 'cancelled') DEFAULT 'pending'");
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Remove 'cancelled' from the status ENUM
        DB::statement("ALTER TABLE purchases MODIFY COLUMN status ENUM('pending', 'quotation_sent', 'counter_offer_pending', 'in_progress', 'ready_for_pickup', 'picked_up', 'declined') DEFAULT 'pending'");
    }
};
