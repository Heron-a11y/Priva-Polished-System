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
        Schema::create('purchase_history', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('user_id');
            $table->string('item_name')->nullable();
            $table->string('purchase_type');
            $table->date('purchase_date');
            $table->enum('status', ['pending', 'quotation_sent', 'counter_offer_pending', 'in_progress', 'ready_for_pickup', 'picked_up', 'declined'])->default('pending');
            $table->string('clothing_type');
            $table->json('measurements');
            $table->text('notes')->nullable();
            $table->string('customer_name');
            $table->string('customer_email');
            $table->decimal('quotation_amount', 10, 2)->nullable();
            $table->decimal('quotation_price', 10, 2)->nullable();
            $table->text('quotation_notes')->nullable();
            $table->enum('quotation_status', ['pending', 'accepted', 'rejected'])->default('pending');
            $table->timestamp('quotation_sent_at')->nullable();
            $table->timestamp('quotation_responded_at')->nullable();
            $table->timestamp('deleted_at')->nullable();
            $table->timestamps();
            
            $table->foreign('user_id')->references('id')->on('users')->onDelete('cascade');
            $table->index(['user_id', 'status']);
            $table->index(['purchase_date']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('purchase_history');
    }
};
