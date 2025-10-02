const http = require('http');
const https = require('https');

function testConnection(url, timeout = 10000) {
    return new Promise((resolve) => {
        const isHttps = url.startsWith('https://');
        const client = isHttps ? https : http;
        
        const options = {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
                'ngrok-skip-browser-warning': 'true',
                'User-Agent': 'FitForm-Mobile/1.0'
            },
            timeout: timeout
        };

        const req = client.request(url, options, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                resolve({
                    success: true,
                    status: res.statusCode,
                    headers: res.headers,
                    data: data
                });
            });
        });

        req.on('error', (err) => {
            resolve({
                success: false,
                error: err.message
            });
        });

        req.on('timeout', () => {
            req.destroy();
            resolve({
                success: false,
                error: 'Request timeout'
            });
        });

        req.end();
    });
}

async function testConnections() {
    console.log('🔍 Debugging FitForm Connection Issues');
    console.log('=====================================');
    
    const testUrls = [
        'http://localhost:8000/api/test',
        'http://127.0.0.1:8000/api/test',
        'https://41bf0b31a9a6.ngrok-free.app/api/test',
        'https://41bf0b31a9a6.ngrok-free.app/api',
    ];
    
    for (const url of testUrls) {
        console.log(`\n🧪 Testing: ${url}`);
        
        const result = await testConnection(url);
        
        if (result.success) {
            console.log(`   Status: ${result.status}`);
            console.log(`   Headers:`, result.headers);
            console.log(`   ✅ SUCCESS: ${result.data.substring(0, 200)}`);
        } else {
            console.log(`   ❌ ERROR: ${result.error}`);
        }
    }
    
    console.log('\n🔧 Troubleshooting Steps:');
    console.log('1. Make sure backend is running: php artisan serve --host=0.0.0.0 --port=8000');
    console.log('2. Make sure ngrok is running: ngrok start --config=ngrok.yml --all');
    console.log('3. Check ngrok web interface: http://localhost:4040');
    console.log('4. Verify backend is accessible locally first');
}

testConnections().catch(console.error);
