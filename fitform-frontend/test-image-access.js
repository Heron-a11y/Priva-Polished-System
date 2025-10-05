// Test script to check if backend is serving images correctly
const https = require('https');
const http = require('http');

const testUrls = [
  'http://192.168.1.105:8000/storage/profiles/profile_6_1759346676.jpg',
  'http://localhost:8000/storage/profiles/profile_6_1759346676.jpg',
  'http://192.168.1.105:8000/api/test'
];

async function testUrl(url) {
  return new Promise((resolve) => {
    const client = url.startsWith('https') ? https : http;
    
    console.log(`🧪 Testing: ${url}`);
    
    const req = client.get(url, (res) => {
      console.log(`✅ ${url} - Status: ${res.statusCode}`);
      console.log(`📋 Headers:`, res.headers);
      resolve({ success: true, status: res.statusCode, url });
    });
    
    req.on('error', (err) => {
      console.log(`❌ ${url} - Error: ${err.message}`);
      resolve({ success: false, error: err.message, url });
    });
    
    req.setTimeout(5000, () => {
      console.log(`⏰ ${url} - Timeout`);
      req.destroy();
      resolve({ success: false, error: 'Timeout', url });
    });
  });
}

async function runTests() {
  console.log('🔍 Testing backend image serving...\n');
  
  for (const url of testUrls) {
    await testUrl(url);
    console.log('---');
  }
  
  console.log('\n✅ Tests completed!');
}

runTests().catch(console.error);
