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
        Schema::create('activity_logs', function (Blueprint $table) {
            $table->id();
            $table->string('event_type'); // 'appointment', 'order', 'measurement', 'catalog', 'user', 'system'
            $table->string('action'); // 'created', 'updated', 'deleted', 'confirmed', 'cancelled', etc.
            $table->string('description');
            $table->json('metadata')->nullable(); // Additional data about the event
            $table->unsignedBigInteger('user_id')->nullable(); // User who performed the action
            $table->string('user_role')->nullable(); // 'admin', 'customer'
            $table->string('ip_address')->nullable();
            $table->string('user_agent')->nullable();
            $table->timestamps();
            
            // Indexes for better performance
            $table->index(['event_type', 'created_at']);
            $table->index(['user_id', 'created_at']);
            $table->index('created_at');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('activity_logs');
    }
};


