const fs = require('fs');
const path = require('path');

async function testBackendAccess() {
    console.log('🔍 Testing Backend Accessibility');
    console.log('================================\n');

    // Read current network configuration
    const networkInfoPath = path.join(__dirname, 'network-info.json');
    if (!fs.existsSync(networkInfoPath)) {
        console.log('❌ Network configuration not found. Run setup first:');
        console.log('   npm run setup:public-ip');
        return;
    }

    const networkInfo = JSON.parse(fs.readFileSync(networkInfoPath, 'utf8'));
    console.log('📱 Current Configuration:');
    console.log(`   IP Address: ${networkInfo.ipAddress}`);
    console.log(`   Backend URL: ${networkInfo.backendUrl}`);
    console.log(`   Is Public IP: ${networkInfo.isPublicIP || false}`);
    console.log();

    if (!networkInfo.isPublicIP) {
        console.log('⚠️  You are using a local IP address.');
        console.log('   For external network access, you need to use your public IP.');
        console.log('   Run: npm run setup:public-ip');
        console.log();
    }

    // Test local access
    console.log('🧪 Testing Local Access...');
    try {
        const localResponse = await fetch('http://localhost:8000/api');
        if (localResponse.ok) {
            console.log('✅ Local access: SUCCESS');
        } else {
            console.log(`❌ Local access: FAILED (Status: ${localResponse.status})`);
        }
    } catch (error) {
        console.log('❌ Local access: FAILED (Connection refused)');
        console.log('   Make sure your backend is running on localhost:8000');
    }

    // Test network IP access
    console.log('\n🧪 Testing Network IP Access...');
    try {
        const networkResponse = await fetch(`${networkInfo.backendUrl}/api`);
        if (networkResponse.ok) {
            console.log('✅ Network IP access: SUCCESS');
        } else {
            console.log(`❌ Network IP access: FAILED (Status: ${networkResponse.status})`);
        }
    } catch (error) {
        console.log('❌ Network IP access: FAILED (Connection refused)');
        console.log('   Make sure your backend is running on 0.0.0.0:8000');
    }

    // If using public IP, test external access
    if (networkInfo.isPublicIP) {
        console.log('\n🧪 Testing External Access...');
        console.log('   This will test if your backend is accessible from the internet.');
        console.log('   Make sure port forwarding is configured in your router.');
        
        try {
            const externalResponse = await fetch(`${networkInfo.backendUrl}/api`);
            if (externalResponse.ok) {
                console.log('✅ External access: SUCCESS');
                console.log('   Your backend is accessible from the internet!');
            } else {
                console.log(`❌ External access: FAILED (Status: ${externalResponse.status})`);
                console.log('   Check your backend configuration and port forwarding.');
            }
        } catch (error) {
            console.log('❌ External access: FAILED (Connection refused)');
            console.log('   This usually means port forwarding is not configured correctly.');
            console.log('   Check your router settings and make sure port 8000 is forwarded.');
        }
    }

    console.log('\n📋 Summary:');
    if (networkInfo.isPublicIP) {
        console.log('✅ Using public IP for external access');
        console.log('⚠️  Make sure port forwarding is configured in your router');
        console.log('📱 Use: npm run start:tunnel or start-tunnel.bat');
    } else {
        console.log('⚠️  Using local IP (same network only)');
        console.log('🌐 For external access, run: npm run setup:public-ip');
        console.log('📱 Use: npm run start:external');
    }

    console.log('\n🔧 Available Commands:');
    console.log('   npm run setup:public-ip    - Configure for external access');
    console.log('   npm run start:tunnel       - Start with tunnel mode');
    console.log('   start-tunnel.bat          - Windows batch file for tunnel');
    console.log('   npm run start:external    - Start for same network only');
}

testBackendAccess().catch(console.error);
