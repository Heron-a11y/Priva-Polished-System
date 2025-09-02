<?php
/**
 * Test script for Rental & Purchase History endpoints
 * Run this script to test the new history API endpoints
 */

// Test configuration
$baseUrl = 'http://localhost:8000/api';
$testToken = ''; // You'll need to get a valid token from login

echo "Testing Rental & Purchase History Endpoints\n";
echo "==========================================\n\n";

// Function to make HTTP requests
function makeRequest($url, $method = 'GET', $data = null, $token = null) {
    $ch = curl_init();
    
    $headers = ['Content-Type: application/json'];
    if ($token) {
        $headers[] = "Authorization: Bearer $token";
    }
    
    curl_setopt($ch, CURLOPT_URL, $url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
    curl_setopt($ch, CURLOPT_CUSTOMREQUEST, $method);
    
    if ($data && $method !== 'GET') {
        curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
    }
    
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    
    return [
        'status' => $httpCode,
        'response' => json_decode($response, true)
    ];
}

// Test endpoints
$endpoints = [
    'rentals/history' => 'GET',
    'purchases/history' => 'GET'
];

foreach ($endpoints as $endpoint => $method) {
    echo "Testing $method /api/$endpoint\n";
    echo "--------------------------------\n";
    
    $url = "$baseUrl/$endpoint";
    $result = makeRequest($url, $method, null, $testToken);
    
    echo "Status Code: " . $result['status'] . "\n";
    
    if ($result['status'] === 200) {
        echo "✅ Success: Endpoint is working\n";
        if (isset($result['response']) && is_array($result['response'])) {
            echo "Data count: " . count($result['response']) . "\n";
        }
    } elseif ($result['status'] === 401) {
        echo "⚠️  Unauthorized: Authentication required (this is expected without a valid token)\n";
    } else {
        echo "❌ Error: " . ($result['response']['message'] ?? 'Unknown error') . "\n";
    }
    
    echo "\n";
}

echo "Test completed!\n";
echo "Note: To test with authentication, you need to:\n";
echo "1. Login to get a valid token\n";
echo "2. Update the \$testToken variable in this script\n";
echo "3. Run the script again\n";
?>
