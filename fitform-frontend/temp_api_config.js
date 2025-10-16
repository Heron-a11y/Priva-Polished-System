// Temporary API configuration fix
// This file helps resolve network connectivity issues

const API_CONFIG = {
    // Current working IP (detected from your system)
    baseURL: 'http://192.168.1.56:8000/api',
    
    // Fallback URLs in case of network issues
    fallbackURLs: [
        'http://192.168.1.56:8000/api',
        'http://localhost:8000/api',
        'http://127.0.0.1:8000/api'
    ],
    
    // Network test endpoint
    testEndpoint: '/test',
    
    // Authentication endpoints
    authEndpoints: {
        login: '/login',
        register: '/register',
        logout: '/logout',
        me: '/me'
    },
    
    // Appointments endpoints
    appointmentEndpoints: {
        list: '/appointments',
        create: '/appointments',
        update: '/appointments',
        delete: '/appointments'
    }
};

export default API_CONFIG;