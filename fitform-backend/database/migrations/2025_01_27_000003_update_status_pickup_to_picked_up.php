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
        // First, temporarily change the columns to VARCHAR to avoid enum constraints
        DB::statement("ALTER TABLE rentals MODIFY COLUMN status VARCHAR(50) DEFAULT 'pending'");
        DB::statement("ALTER TABLE purchases MODIFY COLUMN status VARCHAR(50) DEFAULT 'pending'");
        
        // Update existing records to use new status values
        DB::statement("UPDATE rentals SET status = 'picked_up' WHERE status = 'pickup'");
        DB::statement("UPDATE purchases SET status = 'picked_up' WHERE status = 'pickup'");
        
        // Now update to the new enum with picked_up status
        DB::statement("ALTER TABLE rentals MODIFY COLUMN status ENUM('pending', 'quotation_sent', 'counter_offer_pending', 'ready_for_pickup', 'picked_up', 'returned', 'declined', 'cancelled') DEFAULT 'pending'");
        DB::statement("ALTER TABLE purchases MODIFY COLUMN status ENUM('pending', 'quotation_sent', 'counter_offer_pending', 'ready_for_pickup', 'picked_up', 'declined', 'cancelled') DEFAULT 'pending'");
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // First, temporarily change the columns to VARCHAR
        DB::statement("ALTER TABLE rentals MODIFY COLUMN status VARCHAR(50) DEFAULT 'pending'");
        DB::statement("ALTER TABLE purchases MODIFY COLUMN status VARCHAR(50) DEFAULT 'pending'");
        
        // Revert existing records back to old status values
        DB::statement("UPDATE rentals SET status = 'pickup' WHERE status = 'picked_up'");
        DB::statement("UPDATE purchases SET status = 'pickup' WHERE status = 'picked_up'");
        
        // Revert to the old enum values
        DB::statement("ALTER TABLE rentals MODIFY COLUMN status ENUM('pending', 'quotation_sent', 'counter_offer_pending', 'ready_for_pickup', 'pickup', 'returned', 'declined', 'cancelled') DEFAULT 'pending'");
        DB::statement("ALTER TABLE purchases MODIFY COLUMN status ENUM('pending', 'quotation_sent', 'counter_offer_pending', 'ready_for_pickup', 'pickup', 'declined', 'cancelled') DEFAULT 'pending'");
    }
};
