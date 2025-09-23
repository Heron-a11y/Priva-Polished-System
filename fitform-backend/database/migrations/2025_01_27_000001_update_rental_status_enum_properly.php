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
        DB::statement("ALTER TABLE rentals MODIFY COLUMN status VARCHAR(50) DEFAULT 'pending'");
        
        // Update existing records to use new status values
        DB::statement("UPDATE rentals SET status = 'returned' WHERE status = 'completed'");
        
        // Now update to the new enum with all required values
        DB::statement("ALTER TABLE rentals MODIFY COLUMN status ENUM('pending', 'quotation_sent', 'counter_offer_pending', 'ready_for_pickup', 'pickup', 'returned', 'declined', 'cancelled') DEFAULT 'pending'");
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // First, temporarily change the column to VARCHAR
        DB::statement("ALTER TABLE rentals MODIFY COLUMN status VARCHAR(50) DEFAULT 'pending'");
        
        // Revert existing records back to old status values
        DB::statement("UPDATE rentals SET status = 'completed' WHERE status = 'returned'");
        
        // Revert rentals table status ENUM to previous values
        DB::statement("ALTER TABLE rentals MODIFY COLUMN status ENUM('pending', 'confirmed', 'quotation_sent', 'counter_offer_pending', 'in_progress', 'ready_for_pickup', 'cancelled', 'approved', 'declined', 'rejected') DEFAULT 'pending'");
    }
};
