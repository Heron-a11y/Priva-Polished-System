// Debug Network Issue Script
// Run with: node debug-network-issue.js

console.log('🔍 Debugging Network Configuration Issue...\n');

// Simulate the network configuration
const NETWORK_CONFIG = {
    local: {
        backendUrl: 'http://localhost:8000/api',
        expoUrl: 'exp://localhost:8081',
        description: 'Local development (localhost)',
        priority: 1
    },
    lan: {
        backendUrl: 'http://192.168.1.105:8000/api',
        expoUrl: 'exp://192.168.1.105:8081',
        description: 'LAN access (accessible from same network)',
        priority: 2
    }
};

console.log('📊 Current Network Configuration:');
console.log('Local:', NETWORK_CONFIG.local);
console.log('LAN:', NETWORK_CONFIG.lan);

console.log('\n🧪 Testing IP Updates:');
const testIPs = ['192.168.1.105', '192.168.1.104', 'localhost'];

testIPs.forEach(ip => {
    const updatedUrl = `http://${ip}:8000/api`;
    console.log(`IP ${ip} -> ${updatedUrl}`);
});

console.log('\n💡 Expected Behavior:');
console.log('1. App should try 192.168.1.105:8000 first');
console.log('2. If that fails, try 192.168.1.104:8000');
console.log('3. If that fails, try localhost:8000');
console.log('4. If all fail, show error message');

console.log('\n🔧 Fix Steps:');
console.log('1. Run: complete-fix.bat');
console.log('2. Ensure backend is running: php artisan serve --host=0.0.0.0 --port=8000');
console.log('3. Check Metro logs for "Updated API Base URL" messages');
console.log('4. Look for "Found working IP" success message');
