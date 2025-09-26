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
        Schema::create('rental_history', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('user_id');
            $table->string('item_name');
            $table->string('rental_type');
            $table->date('rental_date');
            $table->date('return_date');
            $table->enum('status', ['pending', 'quotation_sent', 'counter_offer_pending', 'in_progress', 'ready_for_pickup', 'picked_up', 'returned', 'declined'])->default('pending');
            $table->string('clothing_type');
            $table->json('measurements');
            $table->text('notes')->nullable();
            $table->string('customer_name');
            $table->string('customer_email');
            $table->decimal('quotation_amount', 10, 2)->nullable();
            $table->text('quotation_notes')->nullable();
            $table->enum('quotation_status', ['pending', 'accepted', 'rejected'])->default('pending');
            $table->timestamp('quotation_sent_at')->nullable();
            $table->timestamp('quotation_responded_at')->nullable();
            $table->json('penalty_breakdown')->nullable();
            $table->decimal('total_penalties', 10, 2)->default(0);
            $table->string('penalty_status')->default('none');
            $table->boolean('agreement_accepted')->default(false);
            $table->timestamp('deleted_at')->nullable();
            $table->timestamps();
            
            $table->foreign('user_id')->references('id')->on('users')->onDelete('cascade');
            $table->index(['user_id', 'status']);
            $table->index(['rental_date']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('rental_history');
    }
};
