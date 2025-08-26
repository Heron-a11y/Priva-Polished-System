<?php

/**
 * Final Cleanup Script - Remove Remaining Sizing Standards
 * Run this after the main cleanup script
 */

echo "🧹 Final Cleanup - Removing Remaining Sizing Standards\n";
echo "=====================================================\n\n";

// Check if we're in the right directory
if (!file_exists('artisan')) {
    echo "❌ Error: Please run this script from the Laravel project root directory\n";
    exit(1);
}

echo "📁 Found Laravel project. Starting final cleanup...\n\n";

try {
    // Check current state
    echo "🔍 Current database state:\n";
    $output = shell_exec('php artisan tinker --execute="echo \"Sizing Standards: \" . App\Models\SizingStandard::count(); echo \"\\nSize Recommendations: \" . App\Models\SizeRecommendation::count(); echo \"\\n\";"');
    echo $output;
    
    // Now delete the remaining sizing standards
    echo "\n🗑️  Deleting remaining sizing standards...\n";
    $output = shell_exec('php artisan tinker --execute="App\Models\SizingStandard::query()->delete(); echo \"Sizing standards deleted.\";"');
    echo $output . "\n";
    
    // Verify final cleanup
    echo "✅ Final cleanup completed! Verifying...\n";
    $output = shell_exec('php artisan tinker --execute="echo \"Remaining Sizing Standards: \" . App\Models\SizingStandard::count(); echo \"\\nRemaining Size Recommendations: \" . App\Models\SizeRecommendation::count(); echo \"\\n\";"');
    echo $output;
    
    if (strpos($output, 'Sizing Standards: 0') !== false) {
        echo "\n🎉 SUCCESS! All sizing standards have been removed!\n";
        echo "✨ You can now delete records from the sizing_standards table without foreign key errors.\n";
    } else {
        echo "\n⚠️  Some sizing standards may still remain. Check the count above.\n";
    }
    
} catch (Exception $e) {
    echo "\n❌ Error during final cleanup: " . $e->getMessage() . "\n";
    exit(1);
}

echo "\n✨ Final cleanup script completed!\n";
