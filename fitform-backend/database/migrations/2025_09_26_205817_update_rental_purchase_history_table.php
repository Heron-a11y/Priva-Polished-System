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
            // Add all necessary columns for both rental and purchase history
            $table->unsignedBigInteger('user_id')->after('id');
            $table->string('order_type')->after('user_id'); // 'rental' or 'purchase'
            $table->string('item_name')->nullable()->after('order_type');
            $table->string('order_subtype')->nullable()->after('item_name'); // rental_type or purchase_type
            $table->date('order_date')->after('order_subtype'); // rental_date or purchase_date
            $table->date('return_date')->nullable()->after('order_date'); // only for rentals
            $table->enum('status', ['pending', 'quotation_sent', 'counter_offer_pending', 'in_progress', 'ready_for_pickup', 'picked_up', 'returned', 'declined'])->default('pending')->after('return_date');
            $table->string('clothing_type')->after('status');
            $table->json('measurements')->after('clothing_type');
            $table->text('notes')->nullable()->after('measurements');
            $table->string('customer_name')->after('notes');
            $table->string('customer_email')->after('customer_name');
            $table->decimal('quotation_amount', 10, 2)->nullable()->after('customer_email');
            $table->decimal('quotation_price', 10, 2)->nullable()->after('quotation_amount'); // only for purchases
            $table->text('quotation_notes')->nullable()->after('quotation_price');
            $table->enum('quotation_status', ['pending', 'accepted', 'rejected'])->default('pending')->after('quotation_notes');
            $table->timestamp('quotation_sent_at')->nullable()->after('quotation_status');
            $table->timestamp('quotation_responded_at')->nullable()->after('quotation_sent_at');
            
            // Rental-specific fields
            $table->json('penalty_breakdown')->nullable()->after('quotation_responded_at');
            $table->decimal('total_penalties', 10, 2)->default(0)->after('penalty_breakdown');
            $table->string('penalty_status')->default('none')->after('total_penalties');
            $table->boolean('agreement_accepted')->default(false)->after('penalty_status');
            
            // Soft deletes
            $table->timestamp('deleted_at')->nullable()->after('agreement_accepted');
            
            // Foreign key and indexes
            $table->foreign('user_id')->references('id')->on('users')->onDelete('cascade');
            $table->index(['user_id', 'order_type']);
            $table->index(['user_id', 'status']);
            $table->index(['order_date']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('rental_purchase_history', function (Blueprint $table) {
            $table->dropForeign(['user_id']);
            $table->dropIndex(['user_id', 'order_type']);
            $table->dropIndex(['user_id', 'status']);
            $table->dropIndex(['order_date']);
            
            $table->dropColumn([
                'user_id', 'order_type', 'item_name', 'order_subtype', 'order_date', 'return_date',
                'status', 'clothing_type', 'measurements', 'notes', 'customer_name', 'customer_email',
                'quotation_amount', 'quotation_price', 'quotation_notes', 'quotation_status',
                'quotation_sent_at', 'quotation_responded_at', 'penalty_breakdown', 'total_penalties',
                'penalty_status', 'agreement_accepted', 'deleted_at'
            ]);
        });
    }
};
