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
        Schema::table('rental_purchase_history', function (Blueprint $table) {
            // Add order_id column to link back to rentals/purchases tables
            $table->unsignedBigInteger('order_id')->nullable()->after('user_id');
            $table->index(['order_id', 'order_type'], 'rph_order_idx');
        });
        
        // Populate order_id for existing records
        $this->populateOrderIds();
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('rental_purchase_history', function (Blueprint $table) {
            $table->dropIndex('rph_order_idx');
            $table->dropColumn('order_id');
        });
    }
    
    /**
     * Populate order_id for existing records by matching on user_id, order_type, item_name, and order_date
     */
    private function populateOrderIds()
    {
        // Update rental history entries
        \DB::statement("
            UPDATE rental_purchase_history h
            INNER JOIN rentals r ON (
                h.user_id = r.user_id 
                AND h.order_type = 'rental' 
                AND h.item_name = r.item_name 
                AND h.order_date = r.rental_date
            )
            SET h.order_id = r.id
            WHERE h.order_type = 'rental' AND h.order_id IS NULL
        ");
        
        // Update purchase history entries
        \DB::statement("
            UPDATE rental_purchase_history h
            INNER JOIN purchases p ON (
                h.user_id = p.user_id 
                AND h.order_type = 'purchase' 
                AND h.item_name = p.item_name 
                AND h.order_date = p.purchase_date
            )
            SET h.order_id = p.id
            WHERE h.order_type = 'purchase' AND h.order_id IS NULL
        ");
    }
};