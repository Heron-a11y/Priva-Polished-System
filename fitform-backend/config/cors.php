<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Cross-Origin Resource Sharing (CORS) Configuration
    |--------------------------------------------------------------------------
    |
    | Here you may configure your settings for cross-origin resource sharing
    | or "CORS". This determines what cross-origin operations may execute
    | in web browsers. You are free to adjust these settings as needed.
    |
    | To learn more: https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS
    |
    */

    'paths' => ['api/*', 'sanctum/csrf-cookie'],

    'allowed_methods' => ['*'],

    'allowed_origins' => [
        // Local development
        'http://localhost:8081',
        'http://localhost:19006',
        'http://localhost:3000',
        
        // Expo development server
        'exp://localhost:19000',
        'exp://localhost:19006',
        
        // Common local network IPs (will be updated dynamically)
        'http://192.168.1.*:19006',
        'http://192.168.0.*:19006',
        'http://10.0.0.*:19006',
        'http://172.16.*.*:19006',
        
        // Expo Go patterns
        'exp://192.168.1.*:19000',
        'exp://192.168.0.*:19000',
        'exp://10.0.0.*:19000',
        'exp://172.16.*.*:19000',
    ],

    'allowed_origins_patterns' => [
        // Allow any local network IP for development
        'exp://192\.168\..*:19000',
        'exp://10\.0\..*:19000',
        'exp://172\.16\..*:19000',
        'http://192\.168\..*:19006',
        'http://10\.0\..*:19006',
        'http://172\.16\..*:19006',
    ],

    'allowed_headers' => ['*'],

    'exposed_headers' => [],

    'max_age' => 0,

    'supports_credentials' => true,

]; 