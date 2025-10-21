// Simple Connection Test
// This script tests the API connection without complex network configuration

const testConnection = async () => {
    const baseURL = 'http://192.168.0.36:8000/api';
    
    console.log('🧪 Testing simple connection to:', baseURL);
    
    try {
        // Test basic endpoint
        const testResponse = await fetch(`${baseURL}/test`, {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
            },
            timeout: 10000
        });
        
        if (testResponse.ok) {
            const testData = await testResponse.json();
            console.log('✅ Basic connection successful:', testData);
            
            // Test appointments endpoint (will likely get 401, which is expected)
            try {
                const appointmentsResponse = await fetch(`${baseURL}/appointments`, {
                    method: 'GET',
                    headers: {
                        'Accept': 'application/json',
                        'Content-Type': 'application/json',
                    },
                    timeout: 10000
                });
                
                console.log('📊 Appointments endpoint response:', {
                    status: appointmentsResponse.status,
                    ok: appointmentsResponse.ok
                });
                
                if (appointmentsResponse.status === 401) {
                    console.log('✅ Appointments endpoint is working (401 Unauthorized is expected)');
                } else if (appointmentsResponse.ok) {
                    const appointmentsData = await appointmentsResponse.json();
                    console.log('✅ Appointments endpoint successful:', appointmentsData);
                } else {
                    console.log('❌ Appointments endpoint failed:', appointmentsResponse.status);
                }
                
            } catch (appointmentsError) {
                console.log('❌ Appointments endpoint error:', appointmentsError.message);
            }
            
            return { success: true, message: 'Connection test successful' };
        } else {
            console.log('❌ Basic connection failed:', testResponse.status);
            return { success: false, error: `HTTP ${testResponse.status}` };
        }
        
    } catch (error) {
        console.log('❌ Connection test failed:', error.message);
        return { success: false, error: error.message };
    }
};

// Export for use
export default testConnection;

// Auto-run if this file is executed directly
if (typeof window !== 'undefined') {
    testConnection();
}



