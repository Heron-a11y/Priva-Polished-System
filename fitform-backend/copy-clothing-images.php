<?php

/**
 * Script to copy clothing images from frontend assets to backend storage
 * Run this script whenever you add new clothing images to the frontend assets
 */

$frontendAssetsPath = '../fitform-frontend/assets/images/clothing/';
$backendStoragePath = 'storage/app/public/catalog/';

echo "🔄 Copying clothing images from frontend to backend storage...\n";

// Check if frontend assets directory exists
if (!is_dir($frontendAssetsPath)) {
    echo "❌ Frontend assets directory not found: $frontendAssetsPath\n";
    exit(1);
}

// Create backend storage directory if it doesn't exist
if (!is_dir($backendStoragePath)) {
    mkdir($backendStoragePath, 0755, true);
    echo "📁 Created backend storage directory: $backendStoragePath\n";
}

// Get all image files from frontend assets
$imageFiles = glob($frontendAssetsPath . '*.{jpg,jpeg,png,webp,gif}', GLOB_BRACE);

if (empty($imageFiles)) {
    echo "❌ No image files found in frontend assets directory\n";
    exit(1);
}

$copiedCount = 0;
$skippedCount = 0;

foreach ($imageFiles as $imageFile) {
    $filename = basename($imageFile);
    $destination = $backendStoragePath . $filename;
    
    if (file_exists($destination)) {
        echo "⏭️  Skipped (already exists): $filename\n";
        $skippedCount++;
        continue;
    }
    
    if (copy($imageFile, $destination)) {
        echo "✅ Copied: $filename\n";
        $copiedCount++;
    } else {
        echo "❌ Failed to copy: $filename\n";
    }
}

echo "\n📊 Summary:\n";
echo "   ✅ Copied: $copiedCount files\n";
echo "   ⏭️  Skipped: $skippedCount files\n";
echo "   📁 Total files in storage: " . count(glob($backendStoragePath . '*')) . "\n";

echo "\n🎉 Image copying completed!\n";
echo "💡 Remember to run 'php artisan db:seed --class=CatalogItemSeeder' to update the database\n";

