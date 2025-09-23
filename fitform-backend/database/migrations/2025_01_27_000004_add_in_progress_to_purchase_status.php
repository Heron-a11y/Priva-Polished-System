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
        // First, temporarily change the column to VARCHAR to avoid enum constraints
        DB::statement("ALTER TABLE purchases MODIFY COLUMN status VARCHAR(50) DEFAULT 'pending'");
        
        // Update to the new enum with in_progress status
        DB::statement("ALTER TABLE purchases MODIFY COLUMN status ENUM('pending', 'quotation_sent', 'counter_offer_pending', 'in_progress', 'ready_for_pickup', 'picked_up', 'declined', 'cancelled') DEFAULT 'pending'");
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // First, temporarily change the column to VARCHAR
        DB::statement("ALTER TABLE purchases MODIFY COLUMN status VARCHAR(50) DEFAULT 'pending'");
        
        // Revert purchases table status ENUM to previous values
        DB::statement("ALTER TABLE purchases MODIFY COLUMN status ENUM('pending', 'quotation_sent', 'counter_offer_pending', 'ready_for_pickup', 'picked_up', 'declined', 'cancelled') DEFAULT 'pending'");
    }
};
