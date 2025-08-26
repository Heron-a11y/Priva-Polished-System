<?php

/**
 * Database Cleanup Script for Sizing Standards
 * 
 * This script helps safely clean up sizing standards and their dependent records.
 * Run this from the command line: php database/cleanup_sizing_standards.php
 * 
 * WARNING: This will permanently delete data. Use with caution!
 */

require_once __DIR__ . '/../vendor/autoload.php';

use Illuminate\Database\Capsule\Manager as Capsule;
use Illuminate\Database\Schema\Blueprint;

// Load Laravel
$app = require_once __DIR__ . '/../bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

echo "🔍 Sizing Standards Database Cleanup Script\n";
echo "==========================================\n\n";

try {
    // Check current sizing standards
    $standards = Capsule::table('sizing_standards')->get();
    echo "📊 Current Sizing Standards: " . $standards->count() . "\n";
    
    foreach ($standards as $standard) {
        echo "  - ID: {$standard->id}, Name: {$standard->name}, Active: " . ($standard->is_active ? 'Yes' : 'No') . "\n";
        
        // Check dependent records
        $dependentCount = Capsule::table('size_recommendations')
            ->where('sizing_standard_id', $standard->id)
            ->count();
        
        echo "    📏 Dependent size recommendations: {$dependentCount}\n";
    }
    
    echo "\n";
    
    // Ask for confirmation
    echo "⚠️  WARNING: This will permanently delete data!\n";
    echo "Do you want to proceed with cleanup? (yes/no): ";
    
    $handle = fopen("php://stdin", "r");
    $confirmation = trim(fgets($handle));
    fclose($handle);
    
    if (strtolower($confirmation) !== 'yes') {
        echo "❌ Cleanup cancelled.\n";
        exit(0);
    }
    
    echo "\n🧹 Starting cleanup process...\n";
    
    // Option 1: Safe deletion (delete dependent records first)
    echo "\n1️⃣  Safe Deletion Method:\n";
    foreach ($standards as $standard) {
        $dependentCount = Capsule::table('size_recommendations')
            ->where('sizing_standard_id', $standard->id)
            ->count();
        
        if ($dependentCount > 0) {
            echo "  🗑️  Deleting {$dependentCount} dependent size recommendations for standard '{$standard->name}'...\n";
            Capsule::table('size_recommendations')
                ->where('sizing_standard_id', $standard->id)
                ->delete();
        }
        
        echo "  🗑️  Deleting sizing standard '{$standard->name}'...\n";
        Capsule::table('sizing_standards')->where('id', $standard->id)->delete();
    }
    
    echo "\n✅ Cleanup completed successfully!\n";
    
    // Verify cleanup
    $remainingStandards = Capsule::table('sizing_standards')->count();
    $remainingRecommendations = Capsule::table('size_recommendations')->count();
    
    echo "\n📊 Post-cleanup status:\n";
    echo "  - Remaining sizing standards: {$remainingStandards}\n";
    echo "  - Remaining size recommendations: {$remainingRecommendations}\n";
    
} catch (Exception $e) {
    echo "\n❌ Error during cleanup: " . $e->getMessage() . "\n";
    echo "Stack trace:\n" . $e->getTraceAsString() . "\n";
    exit(1);
}

echo "\n🎉 Script completed!\n";
