<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::statement("ALTER TABLE purchases MODIFY COLUMN status ENUM('pending', 'confirmed', 'quotation_sent', 'in_progress', 'ready_for_pickup', 'cancelled', 'approved', 'declined') DEFAULT 'pending'");
    }

    public function down(): void
    {
        DB::statement("ALTER TABLE purchases MODIFY COLUMN status ENUM('pending', 'quotation_sent', 'in_progress', 'ready_for_pickup', 'cancelled', 'approved', 'declined') DEFAULT 'pending'");
    }
}; 