const readline = require('readline');
const fs = require('fs');
const path = require('path');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

async function getPublicIP() {
    try {
        const response = await fetch('https://api.ipify.org?format=json');
        const data = await response.json();
        return data.ip;
    } catch (error) {
        console.log('❌ Could not automatically detect public IP');
        return null;
    }
}

async function setupPublicIP() {
    console.log('🌐 FitForm - Public IP Setup for External Access');
    console.log('================================================\n');

    // Try to auto-detect public IP
    let publicIP = await getPublicIP();
    
    if (publicIP) {
        console.log(`✅ Detected public IP: ${publicIP}`);
        const useDetected = await askQuestion(`Use detected IP ${publicIP}? (y/n): `);
        if (useDetected.toLowerCase() !== 'y') {
            publicIP = null;
        }
    }

    if (!publicIP) {
        console.log('\n📋 Manual Setup Required:');
        console.log('1. Visit https://whatismyipaddress.com/');
        console.log('2. Copy your public IP address');
        console.log('3. Make sure port 8000 is forwarded in your router\n');
        
        publicIP = await askQuestion('Enter your public IP address: ');
    }

    if (!publicIP || !publicIP.trim()) {
        console.log('❌ No IP address provided. Setup cancelled.');
        rl.close();
        return;
    }

    // Update network-info.json
    const networkInfoPath = path.join(__dirname, 'network-info.json');
    const networkInfo = {
        ipAddress: publicIP.trim(),
        backendUrl: `http://${publicIP.trim()}:8000`,
        expoUrl: `exp://${publicIP.trim()}:19000`,
        lastUpdated: new Date().toISOString(),
        isPublicIP: true
    };

    fs.writeFileSync(networkInfoPath, JSON.stringify(networkInfo, null, 2));

    // Update services/api.js
    const apiPath = path.join(__dirname, 'services', 'api.js');
    let apiContent = fs.readFileSync(apiPath, 'utf8');
    
    // Update the API_BASE_URL constant
    apiContent = apiContent.replace(
        /const API_BASE_URL = ['"`][^'"`]*['"`];/,
        `const API_BASE_URL = 'http://${publicIP.trim()}:8000/api';`
    );

    fs.writeFileSync(apiPath, apiContent);

    console.log('\n✅ Configuration Updated Successfully!');
    console.log(`📱 API Base URL: http://${publicIP.trim()}:8000/api`);
    console.log(`🔗 Expo URL: exp://${publicIP.trim()}:19000`);
    
    console.log('\n📋 Next Steps:');
    console.log('1. Make sure your backend is running on 0.0.0.0:8000');
    console.log('2. Configure port forwarding in your router:');
    console.log(`   - External Port: 8000`);
    console.log(`   - Internal IP: Your local IP (e.g., 192.168.1.55)`);
    console.log(`   - Internal Port: 8000`);
    console.log('3. Start your app with: npm run start:tunnel');
    console.log('4. Share the QR code with your classmate');
    
    console.log('\n⚠️  Important:');
    console.log('- This setup exposes your backend to the internet');
    console.log('- Only use for development/testing');
    console.log('- Consider using ngrok or similar services for production');
    
    rl.close();
}

function askQuestion(question) {
    return new Promise((resolve) => {
        rl.question(question, (answer) => {
            resolve(answer.trim());
        });
    });
}

setupPublicIP().catch(console.error);
