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
        Schema::table('notifications', function (Blueprint $table) {
            $table->unsignedBigInteger('order_id')->nullable()->after('user_id');
            $table->enum('order_type', ['Purchase', 'Rental'])->nullable()->after('order_id');
            $table->index(['order_id', 'order_type']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('notifications', function (Blueprint $table) {
            $table->dropIndex(['order_id', 'order_type']);
            $table->dropColumn(['order_id', 'order_type']);
        });
    }
};
