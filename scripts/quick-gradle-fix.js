#!/usr/bin/env node

/**
 * AR Body Measurements - Quick Gradle Fix Script
 * This script provides a quick fix for the most common Gradle issues
 */

const fs = require('fs');
const path = require('path');

console.log('⚡ AR Body Measurements - Quick Gradle Fix');
console.log('==========================================');

// Quick fix for expo-camera
const expoCameraPath = path.join('node_modules', 'expo-camera', 'android', 'build.gradle');
if (fs.existsSync(expoCameraPath)) {
  try {
    let content = fs.readFileSync(expoCameraPath, 'utf8');
    if (content.includes("archiveClassifier = 'sources'")) {
      content = content.replace(
        /archiveClassifier = 'sources'/g,
        "archiveClassifier.set('sources')"
      );
      fs.writeFileSync(expoCameraPath, content, 'utf8');
      console.log('✅ Fixed expo-camera classifier property');
    }
  } catch (error) {
    console.log('⚠️  Could not fix expo-camera:', error.message);
  }
}

// Quick fix for expo module
const expoPath = path.join('node_modules', 'expo', 'android', 'build.gradle');
if (fs.existsSync(expoPath)) {
  try {
    let content = fs.readFileSync(expoPath, 'utf8');
    if (!content.includes('compileSdkVersion')) {
      content = content.replace(
        /android\s*{/,
        'android {\n  compileSdkVersion safeExtGet("compileSdkVersion", 34)'
      );
      fs.writeFileSync(expoPath, content, 'utf8');
      console.log('✅ Fixed expo module compileSdkVersion');
    }
  } catch (error) {
    console.log('⚠️  Could not fix expo module:', error.message);
  }
}

console.log('✅ Quick fix completed!');
console.log('💡 For comprehensive fixes, run: npm run postinstall');
