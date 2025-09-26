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
        // Update rentals table status ENUM to remove 'cancelled'
        DB::statement("ALTER TABLE rentals MODIFY COLUMN status ENUM('pending', 'quotation_sent', 'counter_offer_pending', 'ready_for_pickup', 'picked_up', 'returned', 'declined') DEFAULT 'pending'");
        
        // Update purchases table status ENUM to remove 'cancelled'
        DB::statement("ALTER TABLE purchases MODIFY COLUMN status ENUM('pending', 'quotation_sent', 'counter_offer_pending', 'in_progress', 'ready_for_pickup', 'picked_up', 'declined') DEFAULT 'pending'");
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Revert rentals table status ENUM to include 'cancelled'
        DB::statement("ALTER TABLE rentals MODIFY COLUMN status ENUM('pending', 'quotation_sent', 'counter_offer_pending', 'ready_for_pickup', 'picked_up', 'returned', 'declined', 'cancelled') DEFAULT 'pending'");
        
        // Revert purchases table status ENUM to include 'cancelled'
        DB::statement("ALTER TABLE purchases MODIFY COLUMN status ENUM('pending', 'quotation_sent', 'counter_offer_pending', 'in_progress', 'ready_for_pickup', 'picked_up', 'declined', 'cancelled') DEFAULT 'pending'");
    }
};
