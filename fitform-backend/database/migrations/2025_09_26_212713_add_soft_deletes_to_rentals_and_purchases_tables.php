<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // Add soft deletes to rentals table
        Schema::table('rentals', function (Blueprint $table) {
            $table->softDeletes();
        });
        
        // Add soft deletes to purchases table
        Schema::table('purchases', function (Blueprint $table) {
            $table->softDeletes();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Remove soft deletes from rentals table
        Schema::table('rentals', function (Blueprint $table) {
            $table->dropSoftDeletes();
        });
        
        // Remove soft deletes from purchases table
        Schema::table('purchases', function (Blueprint $table) {
            $table->dropSoftDeletes();
        });
    }
};
