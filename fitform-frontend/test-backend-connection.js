// Test backend connection
const testBackendConnection = async () => {
    console.log('🧪 Testing backend connection...');
    
    const testUrls = [
        'http://localhost:8000/api/test',
        'http://localhost:8000/api/health',
        'http://localhost:8000/api',
        'http://127.0.0.1:8000/api/test',
        'http://127.0.0.1:8000/api/health',
        'http://127.0.0.1:8000/api'
    ];
    
    for (const url of testUrls) {
        try {
            console.log(`🔍 Testing: ${url}`);
            
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5000);
            
            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                },
                signal: controller.signal
            });
            
            clearTimeout(timeoutId);
            
            console.log(`✅ ${url} - Status: ${response.status}`);
            
            if (response.ok) {
                const data = await response.text();
                console.log(`📄 Response: ${data.substring(0, 200)}...`);
                return { success: true, url, status: response.status, data };
            }
            
        } catch (error) {
            console.log(`❌ ${url} - Error: ${error.message}`);
        }
    }
    
    console.log('❌ No backend connection found');
    return { success: false };
};

// Test login endpoint specifically
const testLoginEndpoint = async () => {
    console.log('🔐 Testing login endpoint...');
    
    const testCredentials = {
        email: 'test@example.com',
        password: 'password123'
    };
    
    try {
        const response = await fetch('http://localhost:8000/api/login', {
            method: 'POST',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(testCredentials)
        });
        
        console.log(`🔐 Login endpoint - Status: ${response.status}`);
        
        const data = await response.text();
        console.log(`📄 Login response: ${data.substring(0, 200)}...`);
        
        return { success: response.ok, status: response.status, data };
        
    } catch (error) {
        console.log(`❌ Login endpoint error: ${error.message}`);
        return { success: false, error: error.message };
    }
};

// Run tests
const runTests = async () => {
    console.log('🚀 Starting backend connection tests...');
    
    const connectionTest = await testBackendConnection();
    const loginTest = await testLoginEndpoint();
    
    console.log('\n📊 Test Results:');
    console.log('Backend Connection:', connectionTest.success ? '✅ Success' : '❌ Failed');
    console.log('Login Endpoint:', loginTest.success ? '✅ Success' : '❌ Failed');
    
    if (!connectionTest.success) {
        console.log('\n💡 Troubleshooting:');
        console.log('1. Make sure the backend is running: php artisan serve --host=0.0.0.0 --port=8000');
        console.log('2. Check if port 8000 is available');
        console.log('3. Verify Laravel backend is properly configured');
    }
};

// Export for use in React Native
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { testBackendConnection, testLoginEndpoint, runTests };
}

// Run if called directly
if (typeof window === 'undefined') {
    runTests();
}
