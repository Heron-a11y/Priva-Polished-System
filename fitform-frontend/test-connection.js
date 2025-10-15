// Test Connection Script
// Run this to test and fix network connectivity

import apiService from './services/api';

const testConnection = async () => {
    console.log('🧪 Starting connection test...');
    
    try {
        // Test basic connection
        console.log('1. Testing basic API connection...');
        const basicTest = await apiService.testApiConnection();
        console.log('Basic test result:', basicTest);
        
        if (!basicTest.success) {
            console.log('❌ Basic connection failed, resetting network config...');
            const resetResult = await apiService.resetNetworkConfig();
            console.log('Reset result:', resetResult);
            
            if (resetResult.success) {
                console.log('✅ Network reset successful, testing again...');
                const retryTest = await apiService.testApiConnection();
                console.log('Retry test result:', retryTest);
            }
        }
        
        // Test appointments endpoint (this will likely fail with 401, which is expected)
        console.log('2. Testing appointments endpoint...');
        try {
            const appointmentsTest = await apiService.getAppointments();
            console.log('✅ Appointments test successful:', appointmentsTest);
        } catch (error) {
            if (error.message.includes('Authentication required')) {
                console.log('✅ Appointments endpoint is working (authentication required)');
            } else if (error.message.includes('401')) {
                console.log('✅ Appointments endpoint is working (401 Unauthorized is expected)');
            } else {
                console.log('❌ Appointments endpoint failed:', error.message);
            }
        }
        
        console.log('🎉 Connection test completed!');
        
    } catch (error) {
        console.error('❌ Connection test failed:', error);
    }
};

// Export for use
export default testConnection;

// Auto-run if this file is executed directly
if (typeof window !== 'undefined') {
    testConnection();
}
