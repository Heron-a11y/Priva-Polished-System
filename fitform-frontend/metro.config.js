const { getDefaultConfig } = require('expo/metro-config'); 

const config = getDefaultConfig(__dirname); 

// Configure Metro bundler settings
config.server = {
  ...config.server,
  port: 8081, // Use port 8081 for consistency
  host: '0.0.0.0', // Allow network access
};

module.exports = config;
