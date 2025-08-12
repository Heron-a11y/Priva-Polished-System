<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up() {
        Schema::table('rentals', function (Blueprint $table) {
            $table->string('clothing_type')->nullable();
            $table->json('measurements')->nullable();
            $table->text('notes')->nullable();
            $table->string('customer_name')->nullable();
            $table->string('customer_email')->nullable();
        });
    }
    public function down() {
        Schema::table('rentals', function (Blueprint $table) {
            $table->dropColumn(['clothing_type', 'measurements', 'notes', 'customer_name', 'customer_email']);
        });
    }
}; 