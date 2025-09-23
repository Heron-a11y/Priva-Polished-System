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
        Schema::create('measurement_history', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->onDelete('cascade');
            $table->string('measurement_type')->default('ar'); // 'ar', 'manual', etc.
            $table->json('measurements'); // Store all measurement data as JSON
            $table->string('unit_system')->default('cm'); // 'cm', 'inches', 'feet'
            $table->decimal('confidence_score', 5, 2)->nullable(); // Overall confidence score
            $table->json('body_landmarks')->nullable(); // Store body landmark data
            $table->text('notes')->nullable(); // Optional notes
            $table->timestamps();
            
            $table->index(['user_id', 'created_at']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('measurement_history');
    }
};
