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
        // Fix quotation_status ENUM to include 'quoted' value
        DB::statement("ALTER TABLE rental_purchase_history MODIFY COLUMN quotation_status ENUM('pending', 'quoted', 'accepted', 'rejected') DEFAULT 'pending'");
        
        // Also fix the main tables if they have quotation_status columns
        if (Schema::hasColumn('rentals', 'quotation_status')) {
            DB::statement("ALTER TABLE rentals MODIFY COLUMN quotation_status ENUM('pending', 'quoted', 'accepted', 'rejected') DEFAULT 'pending'");
        }
        
        if (Schema::hasColumn('purchases', 'quotation_status')) {
            DB::statement("ALTER TABLE purchases MODIFY COLUMN quotation_status ENUM('pending', 'quoted', 'accepted', 'rejected') DEFAULT 'pending'");
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Revert back to original ENUM values
        DB::statement("ALTER TABLE rental_purchase_history MODIFY COLUMN quotation_status ENUM('pending', 'accepted', 'rejected') DEFAULT 'pending'");
        
        if (Schema::hasColumn('rentals', 'quotation_status')) {
            DB::statement("ALTER TABLE rentals MODIFY COLUMN quotation_status ENUM('pending', 'accepted', 'rejected') DEFAULT 'pending'");
        }
        
        if (Schema::hasColumn('purchases', 'quotation_status')) {
            DB::statement("ALTER TABLE purchases MODIFY COLUMN quotation_status ENUM('pending', 'accepted', 'rejected') DEFAULT 'pending'");
        }
    }
};