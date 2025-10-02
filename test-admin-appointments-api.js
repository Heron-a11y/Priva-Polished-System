const fetch = require('node-fetch');

async function testAdminAppointmentsAPI() {
    try {
        console.log('🧪 Testing Admin Appointments API...');
        
        // First, let's login as admin to get a token
        const loginResponse = await fetch('http://192.168.1.104:8000/api/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
            },
            body: JSON.stringify({
                email: 'admin@fitform.com', // Replace with actual admin email
                password: 'password' // Replace with actual admin password
            })
        });
        
        if (!loginResponse.ok) {
            console.log('❌ Login failed, trying with different credentials...');
            // Try with different admin credentials
            const altLoginResponse = await fetch('http://192.168.1.104:8000/api/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                },
                body: JSON.stringify({
                    email: 'admin@gmail.com',
                    password: 'password'
                })
            });
            
            if (!altLoginResponse.ok) {
                console.log('❌ Alternative login also failed');
                return;
            }
            
            const altLoginData = await altLoginResponse.json();
            console.log('✅ Alternative login successful');
            console.log('📝 Login response:', altLoginData);
            
            if (altLoginData.token) {
                await testAppointmentsAPI(altLoginData.token);
            }
            return;
        }
        
        const loginData = await loginResponse.json();
        console.log('✅ Login successful');
        console.log('📝 Login response:', loginData);
        
        if (loginData.token) {
            await testAppointmentsAPI(loginData.token);
        }
        
    } catch (error) {
        console.error('❌ Error testing API:', error.message);
    }
}

async function testAppointmentsAPI(token) {
    try {
        console.log('\n🔍 Testing Admin Appointments API with token...');
        
        const response = await fetch('http://192.168.1.104:8000/api/admin/appointments', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Accept': 'application/json',
            }
        });
        
        if (!response.ok) {
            console.log('❌ API request failed:', response.status, response.statusText);
            return;
        }
        
        const data = await response.json();
        console.log('✅ API request successful');
        console.log('📊 Appointments data:', JSON.stringify(data, null, 2));
        
        // Check if customer_profile_image is included
        if (data.length > 0) {
            const firstAppointment = data[0];
            console.log('\n🔍 First appointment details:');
            console.log('- ID:', firstAppointment.id);
            console.log('- Customer Name:', firstAppointment.customer_name);
            console.log('- Customer Profile Image:', firstAppointment.customer_profile_image);
            console.log('- Has profile_image field:', 'customer_profile_image' in firstAppointment);
        }
        
    } catch (error) {
        console.error('❌ Error testing appointments API:', error.message);
    }
}

testAdminAppointmentsAPI();
