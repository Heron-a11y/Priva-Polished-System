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
        // Add indexes for rentals table
        Schema::table('rentals', function (Blueprint $table) {
            $table->index(['user_id', 'status'], 'rentals_user_status_idx');
            $table->index(['status', 'created_at'], 'rentals_status_created_idx');
            $table->index(['clothing_type', 'status'], 'rentals_type_status_idx');
            $table->index(['rental_date', 'status'], 'rentals_date_status_idx');
            $table->index(['deleted_at'], 'rentals_deleted_idx');
        });

        // Add indexes for purchases table
        Schema::table('purchases', function (Blueprint $table) {
            $table->index(['user_id', 'status'], 'purchases_user_status_idx');
            $table->index(['status', 'created_at'], 'purchases_status_created_idx');
            $table->index(['clothing_type', 'status'], 'purchases_type_status_idx');
            $table->index(['purchase_date', 'status'], 'purchases_date_status_idx');
            $table->index(['deleted_at'], 'purchases_deleted_idx');
        });

        // Add indexes for rental_purchase_history table
        Schema::table('rental_purchase_history', function (Blueprint $table) {
            $table->index(['user_id', 'order_type'], 'rph_user_type_idx');
            $table->index(['order_type', 'status'], 'rph_type_status_idx');
            $table->index(['status', 'order_date'], 'rph_status_date_idx');
            $table->index(['clothing_type', 'order_type'], 'rph_clothing_type_idx');
            $table->index(['created_at'], 'rph_created_idx');
        });

        // Add indexes for users table
        Schema::table('users', function (Blueprint $table) {
            $table->index(['role', 'account_status'], 'users_role_status_idx');
            $table->index(['account_status', 'created_at'], 'users_status_created_idx');
            $table->index(['email'], 'users_email_idx');
            $table->index(['name'], 'users_name_idx');
        });

        // Add indexes for notifications table
        Schema::table('notifications', function (Blueprint $table) {
            $table->index(['user_id', 'sender_role'], 'notifications_user_sender_idx');
            $table->index(['sender_role', 'read'], 'notifications_sender_read_idx');
            $table->index(['read', 'created_at'], 'notifications_read_created_idx');
            $table->index(['created_at'], 'notifications_created_idx');
        });

        // Add indexes for appointments table
        Schema::table('appointments', function (Blueprint $table) {
            $table->index(['user_id', 'status'], 'appointments_user_status_idx');
            $table->index(['status', 'appointment_date'], 'appointments_status_date_idx');
            $table->index(['appointment_date'], 'appointments_date_idx');
            $table->index(['created_at'], 'appointments_created_idx');
        });

        // Add indexes for catalog_items table
        Schema::table('catalog_items', function (Blueprint $table) {
            $table->index(['clothing_type'], 'catalog_clothing_type_idx');
            $table->index(['sort_order'], 'catalog_sort_idx');
            $table->index(['created_at'], 'catalog_created_idx');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Drop indexes for rentals table
        Schema::table('rentals', function (Blueprint $table) {
            $table->dropIndex('rentals_user_status_idx');
            $table->dropIndex('rentals_status_created_idx');
            $table->dropIndex('rentals_type_status_idx');
            $table->dropIndex('rentals_date_status_idx');
            $table->dropIndex('rentals_deleted_idx');
        });

        // Drop indexes for purchases table
        Schema::table('purchases', function (Blueprint $table) {
            $table->dropIndex('purchases_user_status_idx');
            $table->dropIndex('purchases_status_created_idx');
            $table->dropIndex('purchases_type_status_idx');
            $table->dropIndex('purchases_date_status_idx');
            $table->dropIndex('purchases_deleted_idx');
        });

        // Drop indexes for rental_purchase_history table
        Schema::table('rental_purchase_history', function (Blueprint $table) {
            $table->dropIndex('rph_user_type_idx');
            $table->dropIndex('rph_type_status_idx');
            $table->dropIndex('rph_status_date_idx');
            $table->dropIndex('rph_clothing_type_idx');
            $table->dropIndex('rph_created_idx');
        });

        // Drop indexes for users table
        Schema::table('users', function (Blueprint $table) {
            $table->dropIndex('users_role_status_idx');
            $table->dropIndex('users_status_created_idx');
            $table->dropIndex('users_email_idx');
            $table->dropIndex('users_name_idx');
        });

        // Drop indexes for notifications table
        Schema::table('notifications', function (Blueprint $table) {
            $table->dropIndex('notifications_user_sender_idx');
            $table->dropIndex('notifications_sender_read_idx');
            $table->dropIndex('notifications_read_created_idx');
            $table->dropIndex('notifications_created_idx');
        });

        // Drop indexes for appointments table
        Schema::table('appointments', function (Blueprint $table) {
            $table->dropIndex('appointments_user_status_idx');
            $table->dropIndex('appointments_status_date_idx');
            $table->dropIndex('appointments_date_idx');
            $table->dropIndex('appointments_created_idx');
        });

        // Drop indexes for catalog_items table
        Schema::table('catalog_items', function (Blueprint $table) {
            $table->dropIndex('catalog_clothing_type_idx');
            $table->dropIndex('catalog_sort_idx');
            $table->dropIndex('catalog_created_idx');
        });
    }
};

