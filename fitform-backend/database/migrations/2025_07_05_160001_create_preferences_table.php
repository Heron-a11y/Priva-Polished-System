<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up() {
        Schema::create('preferences', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->unique()->constrained()->onDelete('cascade');
            $table->string('preferred_style')->nullable();
            $table->string('preferred_color')->nullable();
            $table->string('preferred_size')->nullable();
            $table->string('preferred_material')->nullable();
            $table->string('preferred_fit')->nullable();
            $table->string('preferred_pattern')->nullable();
            $table->string('preferred_budget')->nullable(); // e.g., 'Below ₱1000', '₱1000-₱3000', 'No limit'
            $table->string('preferred_season')->nullable(); // e.g., 'Dry', 'Wet', 'All-season'
            $table->string('preferred_length')->nullable();
            $table->string('preferred_sleeve')->nullable();
            $table->string('notes', 300)->nullable();
            $table->timestamps();
        });
    }
    public function down() {
        Schema::dropIfExists('preferences');
    }
}; 