const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Configure Metro for tunnel mode (remove server.host to avoid validation warning)
config.server = {
  ...config.server,
  port: 8081,
  // Remove host configuration - let Expo handle tunnel mode
};

// Configure resolver for tunnel mode
config.resolver = {
  ...config.resolver,
  platforms: ['ios', 'android', 'native', 'web'],
};

module.exports = config;
