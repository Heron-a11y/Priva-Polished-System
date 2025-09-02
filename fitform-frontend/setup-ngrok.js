const fs = require('fs');
const path = require('path');

function setupNgrok() {
    console.log('🌐 FitForm - Ngrok Setup for External Access');
    console.log('============================================\n');

    console.log('📋 Ngrok Setup Instructions:');
    console.log('1. Start your backend: cd fitform-backend && start-backend.bat');
    console.log('2. In a new terminal, start ngrok: cd fitform-backend && start-ngrok.bat');
    console.log('3. Copy the ngrok URL (e.g., https://abc123.ngrok.io)');
    console.log('4. Run this script again and paste the URL\n');

    console.log('🔍 Current Configuration:');
    const networkInfoPath = path.join(__dirname, 'network-info.json');
    if (fs.existsSync(networkInfoPath)) {
        const networkInfo = JSON.parse(fs.readFileSync(networkInfoPath, 'utf8'));
        console.log(`   Current Backend URL: ${networkInfo.backendUrl}`);
        console.log(`   Is Public IP: ${networkInfo.isPublicIP || false}`);
    } else {
        console.log('   No network configuration found');
    }

    console.log('\n📝 To use ngrok:');
    console.log('   - Your backend will be accessible at: https://YOUR_NGROK_URL.ngrok.io');
    console.log('   - No port forwarding needed');
    console.log('   - Works from any network automatically');
    console.log('   - Secure HTTPS connection');

    console.log('\n🚀 Quick Start Commands:');
    console.log('   1. Terminal 1: cd fitform-backend && start-backend.bat');
    console.log('   2. Terminal 2: cd fitform-backend && start-ngrok.bat');
    console.log('   3. Copy ngrok URL and update your app configuration');
    console.log('   4. Start frontend: cd fitform-frontend && start-tunnel.bat');
}

setupNgrok();
