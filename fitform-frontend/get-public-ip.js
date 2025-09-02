const https = require('https');

async function getPublicIP() {
    return new Promise((resolve, reject) => {
        const req = https.get('https://api.ipify.org?format=json', (res) => {
            let data = '';
            
            res.on('data', (chunk) => {
                data += chunk;
            });
            
            res.on('end', () => {
                try {
                    const result = JSON.parse(data);
                    resolve(result.ip);
                } catch (error) {
                    reject(error);
                }
            });
        });
        
        req.on('error', (error) => {
            reject(error);
        });
        
        req.setTimeout(5000, () => {
            req.destroy();
            reject(new Error('Request timeout'));
        });
    });
}

async function main() {
    try {
        console.log('🔍 Getting your public IP address...');
        const publicIP = await getPublicIP();
        console.log(`✅ Your public IP address is: ${publicIP}`);
        console.log('\n📋 Next steps:');
        console.log(`1. Your backend should be accessible at: http://${publicIP}:8000`);
        console.log('2. Make sure port 8000 is forwarded in your router');
        console.log('3. Run the setup script: npm run setup:public-ip');
        console.log(`4. Enter this IP when prompted: ${publicIP}`);
    } catch (error) {
        console.log('❌ Could not get public IP automatically');
        console.log('📋 Manual steps:');
        console.log('1. Visit: https://whatismyipaddress.com/');
        console.log('2. Copy your public IP address');
        console.log('3. Run: npm run setup:public-ip');
        console.log('4. Enter the IP when prompted');
    }
}

main();
