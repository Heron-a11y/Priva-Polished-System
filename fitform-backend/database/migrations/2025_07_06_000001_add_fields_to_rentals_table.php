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
        Schema::table('rentals', function (Blueprint $table) {
            $table->decimal('quotation_amount', 10, 2)->nullable();
            $table->text('quotation_notes')->nullable();
            $table->enum('quotation_status', ['pending', 'accepted', 'rejected'])->default('pending');
            $table->timestamp('quotation_sent_at')->nullable();
            $table->timestamp('quotation_responded_at')->nullable();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('rentals', function (Blueprint $table) {
            $table->dropColumn([
                'quotation_amount',
                'quotation_notes', 
                'quotation_status',
                'quotation_sent_at',
                'quotation_responded_at'
            ]);
        });
    }
}; 