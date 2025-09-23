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
        Schema::create('admin_measurement_history', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('user_id'); // The user who created the measurement
            $table->unsignedBigInteger('admin_id')->nullable(); // The admin who viewed/processed it
            $table->string('measurement_type'); // 'ar' or 'manual'
            $table->json('measurements'); // Store all measurement data
            $table->string('unit_system'); // 'cm', 'inches', 'feet'
            $table->decimal('confidence_score', 5, 2)->nullable(); // For AR measurements
            $table->json('body_landmarks')->nullable(); // For AR measurements
            $table->text('notes')->nullable();
            $table->string('status')->default('active'); // 'active', 'archived', 'deleted'
            $table->timestamp('viewed_at')->nullable(); // When admin first viewed
            $table->timestamp('processed_at')->nullable(); // When admin processed/acted on it
            $table->timestamps();

            // Foreign key constraints
            $table->foreign('user_id')->references('id')->on('users')->onDelete('cascade');
            $table->foreign('admin_id')->references('id')->on('users')->onDelete('set null');
            
            // Indexes for better performance
            $table->index(['user_id', 'created_at']);
            $table->index(['admin_id', 'created_at']);
            $table->index(['measurement_type', 'created_at']);
            $table->index(['status', 'created_at']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('admin_measurement_history');
    }
};