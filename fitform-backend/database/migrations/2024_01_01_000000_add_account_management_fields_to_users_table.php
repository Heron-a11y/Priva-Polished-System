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
        Schema::table('users', function (Blueprint $table) {
            $table->enum('account_status', ['active', 'suspended', 'banned'])->default('active')->after('role');
            $table->timestamp('suspension_start')->nullable()->after('account_status');
            $table->timestamp('suspension_end')->nullable()->after('suspension_start');
            $table->text('suspension_reason')->nullable()->after('suspension_end');
            $table->text('ban_reason')->nullable()->after('suspension_reason');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn([
                'account_status',
                'suspension_start',
                'suspension_end',
                'suspension_reason',
                'ban_reason'
            ]);
        });
    }
};


