const http = require('http');

function testBackend() {
    console.log('🧪 Testing Backend Accessibility');
    console.log('================================\n');
    
    const tests = [
        { name: 'Localhost', url: 'http://localhost:8000/api' },
        { name: 'Local IP', url: 'http://192.168.1.55:8000/api' },
        { name: 'Public IP', url: 'http://136.158.78.217:8000/api' }
    ];
    
    tests.forEach((test, index) => {
        console.log(`Testing ${test.name}: ${test.url}`);
        
        const req = http.get(test.url, (res) => {
            console.log(`   ✅ ${test.name}: SUCCESS (Status: ${res.statusCode})`);
        });
        
        req.on('error', (error) => {
            if (error.code === 'ECONNREFUSED') {
                console.log(`   ❌ ${test.name}: FAILED (Connection refused - backend not running)`);
            } else {
                console.log(`   ❌ ${test.name}: FAILED (${error.message})`);
            }
        });
        
        req.setTimeout(5000, () => {
            req.destroy();
            if (index === 2) { // Public IP test
                console.log(`   ⚠️  ${test.name}: TIMEOUT (Port forwarding not configured yet)`);
            } else {
                console.log(`   ❌ ${test.name}: TIMEOUT`);
            }
        });
    });
    
    console.log('\n📋 Expected Results:');
    console.log('   ✅ Localhost: Should work (backend running)');
    console.log('   ✅ Local IP: Should work (same network)');
    console.log('   ⚠️  Public IP: Will work after port forwarding is configured');
}

testBackend();
