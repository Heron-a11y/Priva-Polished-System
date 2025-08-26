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
            $table->decimal('cancellation_fee', 10, 2)->default(500.00);
            $table->decimal('daily_delay_fee', 10, 2)->default(100.00);
            $table->decimal('damage_fee_min', 10, 2)->default(200.00);
            $table->decimal('damage_fee_max', 10, 2)->nullable();
            $table->decimal('total_penalties', 10, 2)->default(0.00);
            $table->text('penalty_notes')->nullable();
            $table->enum('penalty_status', ['none', 'pending', 'paid'])->default('none');
            $table->timestamp('penalty_calculated_at')->nullable();
            $table->timestamp('penalty_paid_at')->nullable();
            $table->boolean('agreement_accepted')->default(false);
            $table->timestamp('agreement_accepted_at')->nullable();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('rentals', function (Blueprint $table) {
            $table->dropColumn([
                'cancellation_fee',
                'daily_delay_fee',
                'damage_fee_min',
                'damage_fee_max',
                'total_penalties',
                'penalty_notes',
                'penalty_status',
                'penalty_calculated_at',
                'penalty_paid_at',
                'agreement_accepted',
                'agreement_accepted_at'
            ]);
        });
    }
};
