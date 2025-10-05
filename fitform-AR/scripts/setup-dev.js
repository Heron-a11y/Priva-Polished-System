#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🚀 Setting up AR Body Measurements development environment...\n');

// Check if we're in the right directory
if (!fs.existsSync('package.json')) {
  console.error('❌ Please run this script from the project root directory');
  process.exit(1);
}

// Check Node.js version
const nodeVersion = process.version;
const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0]);

if (majorVersion < 18) {
  console.error(`❌ Node.js version ${nodeVersion} is not supported. Please use Node.js 18 or higher.`);
  process.exit(1);
}

console.log(`✅ Node.js version: ${nodeVersion}`);

// Install dependencies
console.log('\n📦 Installing dependencies...');
try {
  execSync('npm install', { stdio: 'inherit' });
  console.log('✅ Dependencies installed successfully');
} catch (error) {
  console.error('❌ Failed to install dependencies:', error.message);
  process.exit(1);
}

// Verify TypeScript compilation
console.log('\n🔍 Verifying TypeScript compilation...');
try {
  execSync('npx tsc --noEmit', { stdio: 'inherit' });
  console.log('✅ TypeScript compilation successful');
} catch (error) {
  console.error('❌ TypeScript compilation failed:', error.message);
  process.exit(1);
}

// Verify build configuration
console.log('\n🔧 Verifying build configuration...');
try {
  execSync('npm run verify-build', { stdio: 'inherit' });
  console.log('✅ Build configuration verified');
} catch (error) {
  console.error('❌ Build verification failed:', error.message);
  process.exit(1);
}

// Validate assets
console.log('\n🖼️ Validating assets...');
try {
  execSync('npm run validate-assets', { stdio: 'inherit' });
  console.log('✅ Assets validated successfully');
} catch (error) {
  console.error('❌ Asset validation failed:', error.message);
  process.exit(1);
}

console.log('\n🎉 Development environment setup complete!');
console.log('\nNext steps:');
console.log('1. Copy env.example to .env and configure your settings');
console.log('2. Run "npm start" to start the development server');
console.log('3. Run "npm run android" or "npm run ios" to build for mobile');
