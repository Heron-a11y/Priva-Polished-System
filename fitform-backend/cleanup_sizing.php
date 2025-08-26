<?php

/**
 * Simple Sizing Standards Cleanup Script
 * Run this from the command line: php cleanup_sizing.php
 */

echo "🧹 Sizing Standards Cleanup Script\n";
echo "==================================\n\n";

// Check if we're in the right directory
if (!file_exists('artisan')) {
    echo "❌ Error: Please run this script from the Laravel project root directory\n";
    exit(1);
}

echo "📁 Found Laravel project. Starting cleanup...\n\n";

// Run the cleanup using Laravel's database commands
try {
    // First, let's check what's in the database
    echo "🔍 Checking current database state...\n";
    
    // Use Laravel's artisan command to run a custom command
    $output = shell_exec('php artisan tinker --execute="echo \"Sizing Standards: \" . App\Models\SizingStandard::count(); echo \"\\nSize Recommendations: \" . App\Models\SizeRecommendation::count(); echo \"\\n\";"');
    echo $output;
    
    echo "\n⚠️  WARNING: This will permanently delete all sizing standards and recommendations!\n";
    echo "Do you want to proceed? (yes/no): ";
    
    $handle = fopen("php://stdin", "r");
    $confirmation = trim(fgets($handle));
    fclose($handle);
    
    if (strtolower($confirmation) !== 'yes') {
        echo "❌ Cleanup cancelled.\n";
        exit(0);
    }
    
    echo "\n🧹 Starting cleanup process...\n";
    
    // Delete size recommendations first
    echo "🗑️  Deleting size recommendations...\n";
    $output = shell_exec('php artisan tinker --execute="App\Models\SizeRecommendation::truncate(); echo \"Size recommendations deleted.\";"');
    echo $output . "\n";
    
    // Then delete sizing standards
    echo "🗑️  Deleting sizing standards...\n";
    $output = shell_exec('php artisan tinker --execute="App\Models\SizingStandard::truncate(); echo \"Sizing standards deleted.\";"');
    echo $output . "\n";
    
    // Verify cleanup
    echo "✅ Cleanup completed! Verifying...\n";
    $output = shell_exec('php artisan tinker --execute="echo \"Remaining Sizing Standards: \" . App\Models\SizingStandard::count(); echo \"\\nRemaining Size Recommendations: \" . App\Models\SizeRecommendation::count(); echo \"\\n\";"');
    echo $output;
    
    echo "\n🎉 Cleanup completed successfully!\n";
    
} catch (Exception $e) {
    echo "\n❌ Error during cleanup: " . $e->getMessage() . "\n";
    exit(1);
}

echo "\n✨ Script completed!\n";
