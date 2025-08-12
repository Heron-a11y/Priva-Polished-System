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
        DB::statement("ALTER TABLE rentals MODIFY COLUMN status ENUM('pending', 'confirmed', 'quotation_sent', 'in_progress', 'ready_for_pickup', 'cancelled', 'approved', 'declined') DEFAULT 'pending'");
        DB::statement("ALTER TABLE rentals MODIFY COLUMN quotation_status ENUM('pending', 'quoted', 'accepted', 'rejected') DEFAULT 'pending'");
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        DB::statement("ALTER TABLE rentals MODIFY COLUMN status ENUM('pending', 'active', 'completed', 'cancelled') DEFAULT 'pending'");
        DB::statement("ALTER TABLE rentals MODIFY COLUMN quotation_status ENUM('pending', 'accepted', 'rejected') DEFAULT 'pending'");
    }
};