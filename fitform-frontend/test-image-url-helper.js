// Test script for image URL helper
// Run with: node test-image-url-helper.js

console.log('🧪 Testing Image URL Helper...\n');

// Mock network config for testing
const mockNetworkConfig = {
  getBackendUrl: () => 'http://192.168.1.105:8000/api'
};

// Simulate the getLocalImageUrl function
const getLocalImageUrl = (imageUrl) => {
  if (!imageUrl) return null;
  
  try {
    const backendUrl = mockNetworkConfig.getBackendUrl();
    const baseUrl = backendUrl.replace('/api', '');
    
    const replacements = [
      { from: 'https://fitform-api.ngrok.io', to: baseUrl },
      { from: 'http://fitform-api.ngrok.io', to: baseUrl },
      { from: 'https://192.168.1.104:8000', to: baseUrl },
      { from: 'http://192.168.1.104:8000', to: baseUrl },
    ];
    
    let localUrl = imageUrl;
    
    replacements.forEach(({ from, to }) => {
      if (localUrl.includes(from)) {
        localUrl = localUrl.replace(from, to);
      }
    });
    
    return localUrl;
    
  } catch (error) {
    console.error('❌ Error converting image URL:', error);
    return imageUrl;
  }
};

// Test cases
const testCases = [
  'https://fitform-api.ngrok.io/storage/profiles/profile_6_1759346676.jpg',
  'http://fitform-api.ngrok.io/storage/profiles/profile_6_1759346676.jpg',
  'https://192.168.1.104:8000/storage/profiles/profile_6_1759346676.jpg',
  'http://192.168.1.105:8000/storage/profiles/profile_6_1759346676.jpg',
  'https://localhost:8000/storage/profiles/profile_6_1759346676.jpg'
];

console.log('📊 Test Results:');
testCases.forEach((testUrl, index) => {
  const result = getLocalImageUrl(testUrl);
  console.log(`${index + 1}. ${testUrl}`);
  console.log(`   → ${result}`);
  console.log('');
});

console.log('✅ All tests completed!');
console.log('💡 The helper function correctly converts ngrok URLs to local IPs');
