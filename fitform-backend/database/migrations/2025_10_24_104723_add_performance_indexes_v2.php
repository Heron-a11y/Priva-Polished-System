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
        // Helper function to check if index exists
        $indexExists = function ($table, $indexName) {
            $indexes = DB::select("SHOW INDEXES FROM `{$table}` WHERE Key_name = ?", [$indexName]);
            return count($indexes) > 0;
        };

        // Helper function to check if column exists
        $columnExists = function ($table, $columnName) {
            $columns = DB::select("SHOW COLUMNS FROM `{$table}` WHERE Field = ?", [$columnName]);
            return count($columns) > 0;
        };

        // Add composite indexes for better query performance
        
        // Users table optimizations
        Schema::table('users', function (Blueprint $table) use ($indexExists, $columnExists) {
            // Composite index for role and status filtering
            if (!$indexExists('users', 'users_role_status_idx')) {
            $table->index(['role', 'account_status'], 'users_role_status_idx');
            }
            
            // Index for email searches
            if (!$indexExists('users', 'users_email_idx')) {
            $table->index('email', 'users_email_idx');
            }
            
            // Index for name searches
            if (!$indexExists('users', 'users_name_idx')) {
            $table->index('name', 'users_name_idx');
            }
            
            // Index for phone searches
            if (!$indexExists('users', 'users_phone_idx') && $columnExists('users', 'phone')) {
            $table->index('phone', 'users_phone_idx');
            }
        });

        // Rentals table optimizations
        Schema::table('rentals', function (Blueprint $table) use ($indexExists, $columnExists) {
            // Composite index for user and status
            if (!$indexExists('rentals', 'rentals_user_status_idx')) {
            $table->index(['user_id', 'status'], 'rentals_user_status_idx');
            }
            
            // Index for status filtering
            if (!$indexExists('rentals', 'rentals_status_idx')) {
            $table->index('status', 'rentals_status_idx');
            }
            
            // Index for date range queries
            if (!$indexExists('rentals', 'rentals_dates_idx') && $columnExists('rentals', 'rental_date') && $columnExists('rentals', 'return_date')) {
            $table->index(['rental_date', 'return_date'], 'rentals_dates_idx');
            }
            
            // Index for quotation amount sorting
            if (!$indexExists('rentals', 'rentals_amount_idx') && $columnExists('rentals', 'quotation_amount')) {
            $table->index('quotation_amount', 'rentals_amount_idx');
            }
        });

        // Purchases table optimizations
        Schema::table('purchases', function (Blueprint $table) use ($indexExists, $columnExists) {
            // Composite index for user and status
            if (!$indexExists('purchases', 'purchases_user_status_idx')) {
            $table->index(['user_id', 'status'], 'purchases_user_status_idx');
            }
            
            // Index for status filtering
            if (!$indexExists('purchases', 'purchases_status_idx')) {
            $table->index('status', 'purchases_status_idx');
            }
            
            // Index for date queries
            if (!$indexExists('purchases', 'purchases_date_idx')) {
            $table->index('purchase_date', 'purchases_date_idx');
            }
            
            // Index for quotation price sorting (purchases uses quotation_price, not quotation_amount)
            if (!$indexExists('purchases', 'purchases_amount_idx') && $columnExists('purchases', 'quotation_price')) {
                $table->index('quotation_price', 'purchases_amount_idx');
            }
        });

        // Appointments table optimizations
        Schema::table('appointments', function (Blueprint $table) use ($indexExists, $columnExists) {
            // Composite index for user and status
            if (!$indexExists('appointments', 'appointments_user_status_idx')) {
            $table->index(['user_id', 'status'], 'appointments_user_status_idx');
            }
            
            // Index for status filtering
            if (!$indexExists('appointments', 'appointments_status_idx')) {
            $table->index('status', 'appointments_status_idx');
            }
            
            // Index for appointment date (appointments table uses DateTime, not separate date and time)
            if (!$indexExists('appointments', 'appointments_datetime_idx') && $columnExists('appointments', 'appointment_date')) {
                $table->index('appointment_date', 'appointments_datetime_idx');
            }
        });

        // Rental purchase history optimizations
        Schema::table('rental_purchase_history', function (Blueprint $table) use ($indexExists, $columnExists) {
            // Composite index for user and order type
            if (!$indexExists('rental_purchase_history', 'rph_user_type_idx')) {
            $table->index(['user_id', 'order_type'], 'rph_user_type_idx');
            }
            
            // Index for order type filtering
            if (!$indexExists('rental_purchase_history', 'rph_order_type_idx')) {
            $table->index('order_type', 'rph_order_type_idx');
            }
            
            // Index for status filtering
            if (!$indexExists('rental_purchase_history', 'rph_status_idx')) {
            $table->index('status', 'rph_status_idx');
            }
            
            // Composite index for order type and status
            if (!$indexExists('rental_purchase_history', 'rph_type_status_idx')) {
            $table->index(['order_type', 'status'], 'rph_type_status_idx');
            }
        });

        // Notifications table optimizations
        Schema::table('notifications', function (Blueprint $table) use ($indexExists, $columnExists) {
            // Composite index for user and read status (notifications uses 'read' boolean, not 'read_at')
            if (!$indexExists('notifications', 'notifications_user_read_idx') && $columnExists('notifications', 'read')) {
                $table->index(['user_id', 'read'], 'notifications_user_read_idx');
            }
            
            // Index for read status
            if (!$indexExists('notifications', 'notifications_read_idx') && $columnExists('notifications', 'read')) {
                $table->index('read', 'notifications_read_idx');
            }
            
            // Index for created date
            if (!$indexExists('notifications', 'notifications_created_idx')) {
            $table->index('created_at', 'notifications_created_idx');
            }
        });

        // Catalog items optimizations
        Schema::table('catalog_items', function (Blueprint $table) use ($indexExists, $columnExists) {
            // Index for clothing type filtering
            if (!$indexExists('catalog_items', 'catalog_type_idx')) {
            $table->index('clothing_type', 'catalog_type_idx');
            }
            
            // Index for featured items (catalog_items uses 'is_featured', not 'featured')
            if (!$indexExists('catalog_items', 'catalog_featured_idx') && $columnExists('catalog_items', 'is_featured')) {
                $table->index('is_featured', 'catalog_featured_idx');
            }
            
            // Index for sort order
            if (!$indexExists('catalog_items', 'catalog_sort_idx') && $columnExists('catalog_items', 'sort_order')) {
            $table->index('sort_order', 'catalog_sort_idx');
            }
            
            // Composite index for type and featured
            if (!$indexExists('catalog_items', 'catalog_type_featured_idx') && $columnExists('catalog_items', 'clothing_type') && $columnExists('catalog_items', 'is_featured')) {
                $table->index(['clothing_type', 'is_featured'], 'catalog_type_featured_idx');
            }
        });

        // Measurement history optimizations
        if (Schema::hasTable('measurement_history')) {
            Schema::table('measurement_history', function (Blueprint $table) use ($indexExists, $columnExists) {
            // Composite index for user and date
                if (!$indexExists('measurement_history', 'measurements_user_date_idx')) {
            $table->index(['user_id', 'created_at'], 'measurements_user_date_idx');
                }
            
            // Index for user filtering
                if (!$indexExists('measurement_history', 'measurements_user_idx')) {
            $table->index('user_id', 'measurements_user_idx');
                }
        });
        }

        // Add full-text search indexes for better search performance (only if they don't exist)
        try {
            $fulltextIndexes = DB::select("SHOW INDEXES FROM `users` WHERE Index_type = 'FULLTEXT'");
            if (empty($fulltextIndexes)) {
        DB::statement('ALTER TABLE users ADD FULLTEXT(name, email)');
            }
        } catch (\Exception $e) {
            // Index might already exist or table structure doesn't support FULLTEXT
        }

        try {
            $fulltextIndexes = DB::select("SHOW INDEXES FROM `rentals` WHERE Index_type = 'FULLTEXT'");
            if (empty($fulltextIndexes)) {
        DB::statement('ALTER TABLE rentals ADD FULLTEXT(item_name, notes)');
            }
        } catch (\Exception $e) {
            // Index might already exist or table structure doesn't support FULLTEXT
        }

        try {
            $fulltextIndexes = DB::select("SHOW INDEXES FROM `purchases` WHERE Index_type = 'FULLTEXT'");
            if (empty($fulltextIndexes)) {
        DB::statement('ALTER TABLE purchases ADD FULLTEXT(item_name, notes)');
            }
        } catch (\Exception $e) {
            // Index might already exist or table structure doesn't support FULLTEXT
        }
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