#!/usr/bin/env node

/**
 * AR Body Measurements - Test Gradle Fix Script
 * This script tests if the Gradle fixes are working properly
 */

const fs = require('fs');
const path = require('path');

console.log('🧪 AR Body Measurements - Testing Gradle Fixes');
console.log('==============================================');

// Test 1: Check expo-camera build.gradle
console.log('[TEST] Checking expo-camera build.gradle...');
const expoCameraBuildGradle = path.join('node_modules', 'expo-camera', 'android', 'build.gradle');
if (fs.existsSync(expoCameraBuildGradle)) {
  const content = fs.readFileSync(expoCameraBuildGradle, 'utf8');
  if (content.includes("archiveClassifier.set('sources')")) {
    console.log('✅ expo-camera classifier fix: PASSED');
  } else {
    console.log('❌ expo-camera classifier fix: FAILED');
  }
} else {
  console.log('⚠️  expo-camera build.gradle not found');
}

// Test 2: Check expo-constants build.gradle
console.log('[TEST] Checking expo-constants build.gradle...');
const expoConstantsBuildGradle = path.join('node_modules', 'expo-constants', 'android', 'build.gradle');
if (fs.existsSync(expoConstantsBuildGradle)) {
  const content = fs.readFileSync(expoConstantsBuildGradle, 'utf8');
  if (content.includes("archiveClassifier.set('sources')")) {
    console.log('✅ expo-constants classifier fix: PASSED');
  } else {
    console.log('❌ expo-constants classifier fix: FAILED');
  }
} else {
  console.log('⚠️  expo-constants build.gradle not found');
}

// Test 3: Check expo-dev-menu build.gradle
console.log('[TEST] Checking expo-dev-menu build.gradle...');
const expoDevMenuBuildGradle = path.join('node_modules', 'expo-dev-menu', 'android', 'build.gradle');
if (fs.existsSync(expoDevMenuBuildGradle)) {
  const content = fs.readFileSync(expoDevMenuBuildGradle, 'utf8');
  if (content.includes("archiveClassifier.set('sources')")) {
    console.log('✅ expo-dev-menu classifier fix: PASSED');
  } else {
    console.log('❌ expo-dev-menu classifier fix: FAILED');
  }
} else {
  console.log('⚠️  expo-dev-menu build.gradle not found');
}

// Test 4: Check expo build.gradle
console.log('[TEST] Checking expo build.gradle...');
const expoBuildGradle = path.join('node_modules', 'expo', 'android', 'build.gradle');
if (fs.existsSync(expoBuildGradle)) {
  const content = fs.readFileSync(expoBuildGradle, 'utf8');
  if (content.includes('compileSdkVersion safeExtGet("compileSdkVersion", 34)')) {
    console.log('✅ expo compileSdkVersion fix: PASSED');
  } else {
    console.log('❌ expo compileSdkVersion fix: FAILED');
  }
} else {
  console.log('⚠️  expo build.gradle not found');
}

// Test 5: Check main project build.gradle
console.log('[TEST] Checking main project build.gradle...');
const mainBuildGradle = path.join('android', 'build.gradle');
if (fs.existsSync(mainBuildGradle)) {
  const content = fs.readFileSync(mainBuildGradle, 'utf8');
  if (content.includes("compileSdkVersion = Integer.parseInt(findProperty('android.compileSdkVersion') ?: '34')")) {
    console.log('✅ main project compileSdkVersion: PASSED');
  } else {
    console.log('❌ main project compileSdkVersion: FAILED');
  }
  
  if (content.includes("classpath('com.android.tools.build:gradle:8.0.2')")) {
    console.log('✅ Android Gradle Plugin version: PASSED');
  } else {
    console.log('❌ Android Gradle Plugin version: FAILED');
  }
} else {
  console.log('⚠️  main project build.gradle not found');
}

// Test 6: Check Gradle wrapper
console.log('[TEST] Checking Gradle wrapper...');
const gradleWrapperProps = path.join('android', 'gradle', 'wrapper', 'gradle-wrapper.properties');
if (fs.existsSync(gradleWrapperProps)) {
  const content = fs.readFileSync(gradleWrapperProps, 'utf8');
  if (content.includes('gradle-8.0.2-all.zip')) {
    console.log('✅ Gradle wrapper version: PASSED');
  } else {
    console.log('❌ Gradle wrapper version: FAILED');
  }
} else {
  console.log('⚠️  Gradle wrapper properties not found');
}

console.log('');
console.log('[INFO] Test completed!');
console.log('[INFO] If all tests passed, your Gradle build should work properly.');
console.log('[INFO] If any tests failed, run: npm run postinstall');
