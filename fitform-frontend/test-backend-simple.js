// Simple backend test without external dependencies
const http = require('http');

function testBackend() {
    console.log('🧪 Testing backend connection...');
    
    const options = {
        hostname: 'localhost',
        port: 8000,
        path: '/api/test',
        method: 'GET',
        headers: {
            'Accept': 'application/json',
            'ngrok-skip-browser-warning': 'true'
        }
    };

    const req = http.request(options, (res) => {
        console.log(`✅ Backend Status: ${res.statusCode} ${res.statusMessage}`);
        console.log(`📡 Headers:`, res.headers);
        
        let data = '';
        res.on('data', (chunk) => {
            data += chunk;
        });
        
        res.on('end', () => {
            console.log(`📄 Response: ${data.substring(0, 200)}`);
            if (res.statusCode === 200) {
                console.log('✅ Backend is working!');
            } else {
                console.log('❌ Backend returned error status');
            }
        });
    });

    req.on('error', (err) => {
        console.log('❌ Backend connection failed:', err.message);
        console.log('💡 Make sure backend is running: php artisan serve --host=0.0.0.0 --port=8000');
    });

    req.setTimeout(10000, () => {
        console.log('❌ Backend connection timeout');
        req.destroy();
    });

    req.end();
}

testBackend();
