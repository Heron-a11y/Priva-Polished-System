const https = require('https');
const http = require('http');

async function testExternalAccess() {
    const publicIP = '136.158.78.217';
    const port = 8000;
    const url = `http://${publicIP}:${port}/api`;
    
    console.log('🔍 Testing External Access to Your Backend');
    console.log('==========================================\n');
    
    console.log(`📱 Testing access to: ${url}`);
    console.log('⚠️  This will test if your backend is accessible from the internet');
    console.log('   Make sure port forwarding is configured in your router!\n');
    
    return new Promise((resolve, reject) => {
        const req = http.get(url, (res) => {
            console.log(`✅ SUCCESS! Backend is accessible from the internet`);
            console.log(`   Status: ${res.statusCode}`);
            console.log(`   Headers: ${JSON.stringify(res.headers, null, 2)}`);
            
            let data = '';
            res.on('data', (chunk) => {
                data += chunk;
            });
            
            res.on('end', () => {
                console.log(`\n📄 Response preview: ${data.substring(0, 200)}...`);
                console.log('\n🎉 Your backend is working from the internet!');
                console.log('   Your classmate should now be able to use the app.');
                resolve(true);
            });
        });
        
        req.on('error', (error) => {
            console.log('❌ FAILED! Backend is NOT accessible from the internet');
            console.log(`   Error: ${error.message}`);
            console.log('\n🔧 Troubleshooting steps:');
            console.log('   1. Check if port forwarding is configured in your router');
            console.log('   2. Make sure port 8000 is forwarded to 192.168.1.55:8000');
            console.log('   3. Check if Windows Firewall is blocking port 8000');
            console.log('   4. Try accessing http://136.158.78.217:8000 in a browser');
            reject(error);
        });
        
        req.setTimeout(10000, () => {
            req.destroy();
            console.log('❌ TIMEOUT! Request took too long');
            console.log('   This usually means port forwarding is not working');
            reject(new Error('Request timeout'));
        });
    });
}

async function main() {
    try {
        await testExternalAccess();
        console.log('\n🚀 Next steps:');
        console.log('   1. Start your frontend with tunnel mode:');
        console.log('      cd fitform-frontend');
        console.log('      start-tunnel.bat');
        console.log('   2. Share the QR code with your classmate');
        console.log('   3. The app should now work from any network!');
    } catch (error) {
        console.log('\n❌ External access test failed');
        console.log('   You need to fix the network configuration before tunnel mode will work');
    }
}

main();
