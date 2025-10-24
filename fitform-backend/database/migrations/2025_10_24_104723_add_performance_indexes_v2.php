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
        // Add composite indexes for better query performance
        
        // Users table optimizations
        Schema::table('users', function (Blueprint $table) {
            // Composite index for role and status filtering
            $table->index(['role', 'account_status'], 'users_role_status_idx');
            
            // Index for email searches
            $table->index('email', 'users_email_idx');
            
            // Index for name searches
            $table->index('name', 'users_name_idx');
            
            // Index for phone searches
            $table->index('phone', 'users_phone_idx');
        });

        // Rentals table optimizations
        Schema::table('rentals', function (Blueprint $table) {
            // Composite index for user and status
            $table->index(['user_id', 'status'], 'rentals_user_status_idx');
            
            // Index for status filtering
            $table->index('status', 'rentals_status_idx');
            
            // Index for date range queries
            $table->index(['rental_date', 'return_date'], 'rentals_dates_idx');
            
            // Index for quotation amount sorting
            $table->index('quotation_amount', 'rentals_amount_idx');
        });

        // Purchases table optimizations
        Schema::table('purchases', function (Blueprint $table) {
            // Composite index for user and status
            $table->index(['user_id', 'status'], 'purchases_user_status_idx');
            
            // Index for status filtering
            $table->index('status', 'purchases_status_idx');
            
            // Index for date queries
            $table->index('purchase_date', 'purchases_date_idx');
            
            // Index for quotation amount sorting
            $table->index('quotation_amount', 'purchases_amount_idx');
        });

        // Appointments table optimizations
        Schema::table('appointments', function (Blueprint $table) {
            // Composite index for user and status
            $table->index(['user_id', 'status'], 'appointments_user_status_idx');
            
            // Index for status filtering
            $table->index('status', 'appointments_status_idx');
            
            // Index for date range queries
            $table->index(['appointment_date', 'appointment_time'], 'appointments_datetime_idx');
        });

        // Rental purchase history optimizations
        Schema::table('rental_purchase_history', function (Blueprint $table) {
            // Composite index for user and order type
            $table->index(['user_id', 'order_type'], 'rph_user_type_idx');
            
            // Index for order type filtering
            $table->index('order_type', 'rph_order_type_idx');
            
            // Index for status filtering
            $table->index('status', 'rph_status_idx');
            
            // Composite index for order type and status
            $table->index(['order_type', 'status'], 'rph_type_status_idx');
        });

        // Notifications table optimizations
        Schema::table('notifications', function (Blueprint $table) {
            // Composite index for user and read status
            $table->index(['user_id', 'read_at'], 'notifications_user_read_idx');
            
            // Index for read status
            $table->index('read_at', 'notifications_read_idx');
            
            // Index for created date
            $table->index('created_at', 'notifications_created_idx');
        });

        // Catalog items optimizations
        Schema::table('catalog_items', function (Blueprint $table) {
            // Index for clothing type filtering
            $table->index('clothing_type', 'catalog_type_idx');
            
            // Index for featured items
            $table->index('featured', 'catalog_featured_idx');
            
            // Index for sort order
            $table->index('sort_order', 'catalog_sort_idx');
            
            // Composite index for type and featured
            $table->index(['clothing_type', 'featured'], 'catalog_type_featured_idx');
        });

        // Measurement history optimizations
        Schema::table('measurement_history', function (Blueprint $table) {
            // Composite index for user and date
            $table->index(['user_id', 'created_at'], 'measurements_user_date_idx');
            
            // Index for user filtering
            $table->index('user_id', 'measurements_user_idx');
        });

        // Add full-text search indexes for better search performance
        DB::statement('ALTER TABLE users ADD FULLTEXT(name, email)');
        DB::statement('ALTER TABLE rentals ADD FULLTEXT(item_name, notes)');
        DB::statement('ALTER TABLE purchases ADD FULLTEXT(item_name, notes)');
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Drop indexes in reverse order
        
        // Users table
        Schema::table('users', function (Blueprint $table) {
            $table->dropIndex('users_role_status_idx');
            $table->dropIndex('users_email_idx');
            $table->dropIndex('users_name_idx');
            $table->dropIndex('users_phone_idx');
        });

        // Rentals table
        Schema::table('rentals', function (Blueprint $table) {
            $table->dropIndex('rentals_user_status_idx');
            $table->dropIndex('rentals_status_idx');
            $table->dropIndex('rentals_dates_idx');
            $table->dropIndex('rentals_amount_idx');
        });

        // Purchases table
        Schema::table('purchases', function (Blueprint $table) {
            $table->dropIndex('purchases_user_status_idx');
            $table->dropIndex('purchases_status_idx');
            $table->dropIndex('purchases_date_idx');
            $table->dropIndex('purchases_amount_idx');
        });

        // Appointments table
        Schema::table('appointments', function (Blueprint $table) {
            $table->dropIndex('appointments_user_status_idx');
            $table->dropIndex('appointments_status_idx');
            $table->dropIndex('appointments_datetime_idx');
        });

        // Rental purchase history
        Schema::table('rental_purchase_history', function (Blueprint $table) {
            $table->dropIndex('rph_user_type_idx');
            $table->dropIndex('rph_order_type_idx');
            $table->dropIndex('rph_status_idx');
            $table->dropIndex('rph_type_status_idx');
        });

        // Notifications table
        Schema::table('notifications', function (Blueprint $table) {
            $table->dropIndex('notifications_user_read_idx');
            $table->dropIndex('notifications_read_idx');
            $table->dropIndex('notifications_created_idx');
        });

        // Catalog items
        Schema::table('catalog_items', function (Blueprint $table) {
            $table->dropIndex('catalog_type_idx');
            $table->dropIndex('catalog_featured_idx');
            $table->dropIndex('catalog_sort_idx');
            $table->dropIndex('catalog_type_featured_idx');
        });

        // Measurement history
        Schema::table('measurement_history', function (Blueprint $table) {
            $table->dropIndex('measurements_user_date_idx');
            $table->dropIndex('measurements_user_idx');
        });

        // Drop full-text indexes
        DB::statement('ALTER TABLE users DROP INDEX name');
        DB::statement('ALTER TABLE rentals DROP INDEX item_name');
        DB::statement('ALTER TABLE purchases DROP INDEX item_name');
    }
};