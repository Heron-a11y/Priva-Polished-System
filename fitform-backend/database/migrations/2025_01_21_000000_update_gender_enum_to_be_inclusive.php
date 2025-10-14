<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // First, we need to modify the existing enum to be more inclusive
        // This requires dropping and recreating the column due to MySQL enum limitations
        
        // Step 1: Add a temporary column with the new enum values
        Schema::table('users', function (Blueprint $table) {
            $table->enum('gender_temp', ['male', 'female', 'other', 'prefer_not_to_say'])->nullable()->after('date_of_birth');
        });
        
        // Step 2: Copy existing data to the new column
        DB::statement('UPDATE users SET gender_temp = gender WHERE gender IS NOT NULL');
        
        // Step 3: Drop the old column
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn('gender');
        });
        
        // Step 4: Rename the temporary column to the original name
        Schema::table('users', function (Blueprint $table) {
            $table->renameColumn('gender_temp', 'gender');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Reverse the process
        Schema::table('users', function (Blueprint $table) {
            $table->enum('gender_temp', ['male', 'female'])->nullable()->after('date_of_birth');
        });
        
        // Copy data back, filtering out non-binary values
        DB::statement('UPDATE users SET gender_temp = gender WHERE gender IN ("male", "female")');
        
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn('gender');
        });
        
        Schema::table('users', function (Blueprint $table) {
            $table->renameColumn('gender_temp', 'gender');
        });
    }
};







