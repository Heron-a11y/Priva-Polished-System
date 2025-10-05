#!/usr/bin/env node

/**
 * Test script for TensorFlow Lite ML integration with ARCore
 * Verifies that ML models and dependencies are properly configured
 */

const fs = require('fs');
const path = require('path');

const PROJECT_ROOT = path.join(__dirname, '..');
const ANDROID_DIR = path.join(PROJECT_ROOT, 'android');
const ASSETS_DIR = path.join(ANDROID_DIR, 'app', 'src', 'main', 'assets', 'ml_models');

// Test configurations
const TESTS = [
    {
        name: 'TensorFlow Lite Dependencies',
        check: () => {
            const buildGradle = path.join(ANDROID_DIR, 'app', 'build.gradle');
            const content = fs.readFileSync(buildGradle, 'utf8');
            
            const requiredDeps = [
                'org.tensorflow:tensorflow-lite:2.12.0',
                'org.tensorflow:tensorflow-lite-gpu:2.12.0',
                'org.tensorflow:tensorflow-lite-support:0.4.4',
                'org.tensorflow:tensorflow-lite-metadata:0.4.4'
            ];
            
            const missing = requiredDeps.filter(dep => !content.includes(dep));
            return {
                passed: missing.length === 0,
                message: missing.length === 0 ? 'All TensorFlow Lite dependencies found' : `Missing dependencies: ${missing.join(', ')}`
            };
        }
    },
    {
        name: 'ML Model Files',
        check: () => {
            const requiredModels = [
                'pose_estimation_model.tflite',
                'movenet_lightning.tflite',
                'movenet_thunder.tflite'
            ];
            
            const existingModels = fs.readdirSync(ASSETS_DIR).filter(file => file.endsWith('.tflite'));
            const missing = requiredModels.filter(model => !existingModels.includes(model));
            
            return {
                passed: missing.length === 0,
                message: missing.length === 0 ? 'All ML model files found' : `Missing models: ${missing.join(', ')}`
            };
        }
    },
    {
        name: 'TensorFlowLiteManager Class',
        check: () => {
            const managerFile = path.join(ANDROID_DIR, 'app', 'src', 'main', 'java', 'com', 'ica_russ', 'arbodymeasurements', 'TensorFlowLiteManager.kt');
            const exists = fs.existsSync(managerFile);
            
            return {
                passed: exists,
                message: exists ? 'TensorFlowLiteManager class found' : 'TensorFlowLiteManager class not found'
            };
        }
    },
    {
        name: 'AR Session Manager Integration',
        check: () => {
            const sessionFile = path.join(ANDROID_DIR, 'app', 'src', 'main', 'java', 'com', 'ica_russ', 'arbodymeasurements', 'ARSessionManagerModule.kt');
            const content = fs.readFileSync(sessionFile, 'utf8');
            
            const hasMLIntegration = content.includes('tensorFlowLiteManager') && 
                                   content.includes('TensorFlowLiteManager') &&
                                   content.includes('isMLInitialized');
            
            return {
                passed: hasMLIntegration,
                message: hasMLIntegration ? 'AR Session Manager has ML integration' : 'AR Session Manager missing ML integration'
            };
        }
    },
    {
        name: 'Assets Directory Structure',
        check: () => {
            const exists = fs.existsSync(ASSETS_DIR);
            const isDirectory = exists && fs.statSync(ASSETS_DIR).isDirectory();
            
            return {
                passed: isDirectory,
                message: isDirectory ? 'ML models assets directory exists' : 'ML models assets directory not found'
            };
        }
    }
];

async function runTests() {
    console.log('🧪 Testing TensorFlow Lite ML Integration...\n');
    
    let passedTests = 0;
    let totalTests = TESTS.length;
    
    for (const test of TESTS) {
        try {
            const result = test.check();
            const status = result.passed ? '✅' : '❌';
            console.log(`${status} ${test.name}: ${result.message}`);
            
            if (result.passed) {
                passedTests++;
            }
        } catch (error) {
            console.log(`❌ ${test.name}: Error - ${error.message}`);
        }
    }
    
    console.log(`\n📊 Test Results: ${passedTests}/${totalTests} tests passed`);
    
    if (passedTests === totalTests) {
        console.log('🎉 All tests passed! ML integration is ready.');
    } else {
        console.log('⚠️ Some tests failed. Please fix the issues above.');
    }
    
    // Additional recommendations
    console.log('\n📋 Next Steps:');
    console.log('1. Download actual ML models from TensorFlow Hub');
    console.log('2. Test the integration on a physical device');
    console.log('3. Monitor performance and memory usage');
    console.log('4. Verify pose estimation accuracy');
}

// Run the tests
runTests().catch(console.error);
