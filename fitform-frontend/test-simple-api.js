// Test Simple API Service
// This tests the simplified API service

import simpleApiService from './simple-api-service';

const testSimpleAPI = async () => {
    console.log('🧪 Testing Simple API Service...');
    
    try {
        // Test 1: Basic connection
        console.log('1. Testing basic connection...');
        const connectionTest = await simpleApiService.testConnection();
        console.log('Connection test result:', connectionTest);
        
        if (!connectionTest.success) {
            console.log('❌ Basic connection failed');
            return { success: false, error: 'Basic connection failed' };
        }
        
        // Test 2: Test appointments endpoint (will likely get 401, which is expected)
        console.log('2. Testing appointments endpoint...');
        try {
            const appointmentsTest = await simpleApiService.getAppointments();
            console.log('✅ Appointments test successful:', appointmentsTest);
        } catch (error) {
            if (error.message.includes('Authentication required')) {
                console.log('✅ Appointments endpoint is working (authentication required)');
            } else if (error.message.includes('401')) {
                console.log('✅ Appointments endpoint is working (401 Unauthorized is expected)');
            } else {
                console.log('❌ Appointments endpoint failed:', error.message);
                return { success: false, error: error.message };
            }
        }
        
        console.log('🎉 Simple API test completed successfully!');
        return { success: true, message: 'All tests passed' };
        
    } catch (error) {
        console.error('❌ Simple API test failed:', error);
        return { success: false, error: error.message };
    }
};

// Export for use
export default testSimpleAPI;

// Auto-run if this file is executed directly
if (typeof window !== 'undefined') {
    testSimpleAPI();
}


