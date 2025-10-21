// Simple API Configuration
// This bypasses all complex network detection and uses a fixed configuration

const SIMPLE_API_CONFIG = {
    // Fixed backend URL - no dynamic detection
    baseURL: 'http://192.168.0.36:8000/api',
    
    // Fallback URLs if needed
    fallbackURLs: [
        'http://192.168.0.36:8000/api',
        'http://localhost:8000/api'
    ],
    
    // Test endpoint
    testEndpoint: '/test',
    
    // Get current URL
    getCurrentURL() {
        return this.baseURL;
    },
    
    // Test connection
    async testConnection() {
        try {
            console.log('🧪 Testing connection to:', this.baseURL);
            
            const response = await fetch(`${this.baseURL}/test`, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json',
                },
                timeout: 10000
            });
            
            if (response.ok) {
                const data = await response.json();
                console.log('✅ Connection successful:', data);
                return { success: true, data };
            } else {
                console.log('❌ Connection failed:', response.status);
                return { success: false, error: `HTTP ${response.status}` };
            }
        } catch (error) {
            console.log('❌ Connection error:', error.message);
            return { success: false, error: error.message };
        }
    }
};

export default SIMPLE_API_CONFIG;



