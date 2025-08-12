<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up() {
        Schema::create('purchases', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->onDelete('cascade');
            $table->string('item_name');
            $table->string('clothing_type')->nullable();
            $table->json('measurements')->nullable();
            $table->text('notes')->nullable();
            $table->string('customer_name')->nullable();
            $table->string('customer_email')->nullable();
            $table->date('purchase_date');
            $table->decimal('quotation_price', 10, 2)->nullable();
            $table->date('quotation_schedule')->nullable();
            $table->string('quotation_notes')->nullable();
            $table->enum('status', ['pending', 'in_progress', 'ready_for_pickup', 'cancelled'])->default('pending');
            $table->timestamps();
        });
    }
    public function down() {
        Schema::dropIfExists('purchases');
    }
}; 