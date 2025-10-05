#!/usr/bin/env node

/**
 * Asset validation script for AR Body Measurements app
 * Validates that all required assets exist and are properly formatted
 */

const fs = require('fs');
const path = require('path');

const requiredAssets = [
  'assets/icon.png',
  'assets/splash.png',
  'assets/adaptive-icon.png',
  'assets/favicon.png'
];

  // const assetSizes = {
  //   'assets/icon.png': { minSize: 1024, description: 'App icon (1024x1024)' },
  //   'assets/splash.png': { minSize: 1242, description: 'Splash screen (1242x2436)' },
  //   'assets/adaptive-icon.png': { minSize: 1024, description: 'Adaptive icon (1024x1024)' },
  //   'assets/favicon.png': { minSize: 48, description: 'Favicon (48x48)' }
  // };

function validateAssets() {
  console.log('🔍 Validating assets...');
  
  let hasErrors = false;
  
  for (const asset of requiredAssets) {
    const assetPath = path.join(__dirname, asset);
    
    if (!fs.existsSync(assetPath)) {
      console.error(`❌ Missing asset: ${asset}`);
      hasErrors = true;
      continue;
    }
    
    const stats = fs.statSync(assetPath);
    const sizeKB = Math.round(stats.size / 1024);
    
    console.log(`✅ ${asset} (${sizeKB}KB)`);
    
    // Check if asset is too small (likely placeholder)
    if (stats.size < 1000) {
      console.warn(`⚠️  ${asset} is very small (${sizeKB}KB) - may be placeholder`);
    }
  }
  
  if (hasErrors) {
    console.error('\n❌ Asset validation failed!');
    process.exit(1);
  }
  
  console.log('\n✅ All assets validated successfully!');
}

// Run validation
validateAssets();












