#!/usr/bin/env node

/**
 * Script to download TensorFlow Lite ML models for pose estimation
 * Downloads MoveNet models from TensorFlow Hub
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

const MODELS = {
  'movenet_lightning': {
    url: 'https://tfhub.dev/google/lite-model/movenet/singlepose/lightning/tflite/float16/4',
    filename: 'movenet_lightning.tflite',
    description: 'MoveNet Lightning - Fast pose estimation model'
  },
  'movenet_thunder': {
    url: 'https://tfhub.dev/google/lite-model/movenet/singlepose/thunder/tflite/float16/4',
    filename: 'movenet_thunder.tflite',
    description: 'MoveNet Thunder - Accurate pose estimation model'
  }
};

const ASSETS_DIR = path.join(__dirname, '..', 'android', 'app', 'src', 'main', 'assets', 'ml_models');

async function downloadModel(modelName, modelInfo) {
  return new Promise((resolve, reject) => {
    console.log(`📥 Downloading ${modelInfo.description}...`);
    
    const filePath = path.join(ASSETS_DIR, modelInfo.filename);
    const file = fs.createWriteStream(filePath);
    
    https.get(modelInfo.url, (response) => {
      if (response.statusCode !== 200) {
        reject(new Error(`Failed to download ${modelName}: ${response.statusCode}`));
        return;
      }
      
      response.pipe(file);
      
      file.on('finish', () => {
        file.close();
        console.log(`✅ Downloaded ${modelInfo.filename}`);
        resolve();
      });
      
      file.on('error', (err) => {
        fs.unlink(filePath, () => {}); // Delete partial file
        reject(err);
      });
    }).on('error', (err) => {
      reject(err);
    });
  });
}

async function downloadAllModels() {
  try {
    console.log('🚀 Starting ML model download...');
    
    // Ensure assets directory exists
    if (!fs.existsSync(ASSETS_DIR)) {
      fs.mkdirSync(ASSETS_DIR, { recursive: true });
    }
    
    // Download all models
    for (const [modelName, modelInfo] of Object.entries(MODELS)) {
      try {
        await downloadModel(modelName, modelInfo);
      } catch (error) {
        console.warn(`⚠️ Failed to download ${modelName}: ${error.message}`);
        console.log('💡 You can manually download the model from:', modelInfo.url);
      }
    }
    
    console.log('🎉 ML model download completed!');
    console.log('📁 Models saved to:', ASSETS_DIR);
    console.log('');
    console.log('📋 Next steps:');
    console.log('1. Verify models are in the assets directory');
    console.log('2. Update TensorFlowLiteManager.kt to use the correct model filename');
    console.log('3. Test the ML integration with ARCore');
    
  } catch (error) {
    console.error('❌ Error downloading models:', error.message);
    process.exit(1);
  }
}

// Run the download
downloadAllModels();
