const readline = require('readline');
const fs = require('fs');
const path = require('path');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

async function updateNgrokUrl() {
    console.log('🌐 FitForm - Update Ngrok URL');
    console.log('==============================\n');

    console.log('📋 Instructions:');
    console.log('1. Start your backend: cd fitform-backend && start-backend.bat');
    console.log('2. Start ngrok: cd fitform-backend && start-ngrok-pro.bat');
    console.log('3. Copy the ngrok URL (e.g., https://abc123.ngrok.io)');
    console.log('4. Paste it below\n');

    const ngrokUrl = await askQuestion('Enter your ngrok URL (e.g., https://abc123.ngrok.io): ');

    if (!ngrokUrl || !ngrokUrl.trim()) {
        console.log('❌ No URL provided. Update cancelled.');
        rl.close();
        return;
    }

    const cleanUrl = ngrokUrl.trim().replace(/\/$/, ''); // Remove trailing slash

    // Update network-info.json
    const networkInfoPath = path.join(__dirname, 'network-info.json');
    const networkInfo = {
        ipAddress: cleanUrl,
        backendUrl: cleanUrl,
        expoUrl: `exp://${cleanUrl.replace('https://', '')}`,
        lastUpdated: new Date().toISOString(),
        isNgrok: true,
        isPublicIP: true
    };

    fs.writeFileSync(networkInfoPath, JSON.stringify(networkInfo, null, 2));

    // Update services/api.js
    const apiPath = path.join(__dirname, 'services', 'api.js');
    let apiContent = fs.readFileSync(apiPath, 'utf8');
    
    // Update the API_BASE_URL constant
    apiContent = apiContent.replace(
        /const API_BASE_URL = ['"`][^'"`]*['"`];/,
        `const API_BASE_URL = '${cleanUrl}/api';`
    );

    fs.writeFileSync(apiPath, apiContent);

    console.log('\n✅ Configuration Updated Successfully!');
    console.log(`📱 API Base URL: ${cleanUrl}/api`);
    console.log(`🔗 Expo URL: exp://${cleanUrl.replace('https://', '')}`);
    
    console.log('\n🎯 Next Steps:');
    console.log('1. Make sure your backend is running on port 8000');
    console.log('2. Make sure ngrok is running and showing the same URL');
    console.log('3. Start your frontend: npm run start:tunnel');
    console.log('4. Share the QR code with your classmate');
    
    console.log('\n🧪 Test your setup:');
    console.log(`   Visit: ${cleanUrl}/api`);
    console.log('   You should see your Laravel API response');
    
    console.log('\n🌟 Benefits of Ngrok:');
    console.log('   ✅ Secure HTTPS connection');
    console.log('   ✅ Works from any network');
    console.log('   ✅ No port forwarding needed');
    console.log('   ✅ Professional-grade tunneling');
    
    rl.close();
}

function askQuestion(question) {
    return new Promise((resolve) => {
        rl.question(question, (answer) => {
            resolve(answer.trim());
        });
    });
}

updateNgrokUrl().catch(console.error);
