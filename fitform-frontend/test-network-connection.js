// Network Connection Test Script
// Run this with: node test-network-connection.js

const fetch = require('node-fetch');

async function testNetworkConnection() {
    console.log('🧪 Testing network connections...\n');
    
    const testUrls = [
        'http://192.168.1.105:8000/api/test',
        'http://192.168.1.104:8000/api/test', 
        'http://localhost:8000/api/test'
    ];
    
    for (const url of testUrls) {
        try {
            console.log(`📡 Testing: ${url}`);
            
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 10000);
            
            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json',
                },
                signal: controller.signal,
            });
            
            clearTimeout(timeoutId);
            
            if (response.ok) {
                const data = await response.json();
                console.log(`✅ SUCCESS: ${url}`);
                console.log(`   Status: ${response.status}`);
                console.log(`   Response:`, data);
                console.log('');
            } else {
                console.log(`❌ FAILED: ${url} - HTTP ${response.status}`);
                console.log('');
            }
        } catch (error) {
            if (error.name === 'AbortError') {
                console.log(`⏰ TIMEOUT: ${url} - Connection timeout`);
            } else {
                console.log(`❌ ERROR: ${url} - ${error.message}`);
            }
            console.log('');
        }
    }
    
    console.log('🔍 Network diagnostic complete!');
    console.log('💡 If all tests failed, make sure your backend is running:');
    console.log('   cd fitform-backend && php artisan serve --host=0.0.0.0 --port=8000');
}

testNetworkConnection().catch(console.error);
