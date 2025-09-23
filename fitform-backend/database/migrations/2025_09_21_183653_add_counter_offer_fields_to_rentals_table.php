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
            $table->decimal('counter_offer_amount', 10, 2)->nullable()->after('quotation_notes');
            $table->text('counter_offer_notes')->nullable()->after('counter_offer_amount');
            $table->timestamp('counter_offer_sent_at')->nullable()->after('counter_offer_notes');
            $table->string('counter_offer_status')->default('none')->after('counter_offer_sent_at'); // none, pending, accepted, rejected
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('rentals', function (Blueprint $table) {
            $table->dropColumn(['counter_offer_amount', 'counter_offer_notes', 'counter_offer_sent_at', 'counter_offer_status']);
        });
    }
};
