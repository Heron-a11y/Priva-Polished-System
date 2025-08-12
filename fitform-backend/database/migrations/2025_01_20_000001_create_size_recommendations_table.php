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
        Schema::create('size_recommendations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->onDelete('cascade');
            $table->foreignId('sizing_standard_id')->constrained('sizing_standards');
            $table->json('customer_measurements'); // customer's body measurements
            $table->string('recommended_size');
            $table->decimal('confidence_score', 3, 2)->default(0.00); // 0.00 to 1.00
            $table->text('notes')->nullable();
            $table->timestamp('last_updated')->useCurrent();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('size_recommendations');
    }
};
