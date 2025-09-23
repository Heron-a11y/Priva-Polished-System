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
        // Update purchases table status ENUM to include counter offer statuses
        DB::statement("ALTER TABLE purchases MODIFY COLUMN status ENUM('pending', 'confirmed', 'quotation_sent', 'counter_offer_pending', 'in_progress', 'ready_for_pickup', 'cancelled', 'approved', 'declined', 'rejected') DEFAULT 'pending'");
        
        // Update rentals table status ENUM to include counter offer statuses
        DB::statement("ALTER TABLE rentals MODIFY COLUMN status ENUM('pending', 'confirmed', 'quotation_sent', 'counter_offer_pending', 'in_progress', 'ready_for_pickup', 'cancelled', 'approved', 'declined', 'rejected') DEFAULT 'pending'");
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Revert purchases table status ENUM to previous values
        DB::statement("ALTER TABLE purchases MODIFY COLUMN status ENUM('pending', 'confirmed', 'quotation_sent', 'in_progress', 'ready_for_pickup', 'cancelled', 'approved', 'declined') DEFAULT 'pending'");
        
        // Revert rentals table status ENUM to previous values
        DB::statement("ALTER TABLE rentals MODIFY COLUMN status ENUM('pending', 'confirmed', 'quotation_sent', 'in_progress', 'ready_for_pickup', 'cancelled', 'approved', 'declined') DEFAULT 'pending'");
    }
};
