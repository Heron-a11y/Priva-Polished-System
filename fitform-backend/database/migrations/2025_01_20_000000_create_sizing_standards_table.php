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
        Schema::create('sizing_standards', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('category'); // shirts, pants, dresses, etc.
            $table->enum('gender', ['male', 'female', 'unisex']);
            $table->json('measurements'); // size parameters
            $table->json('size_categories'); // XS, S, M, L, XL, etc.
            $table->boolean('is_active')->default(true);
            $table->foreignId('updated_by')->constrained('users');
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('sizing_standards');
    }
};
