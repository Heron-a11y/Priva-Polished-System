const { getDefaultConfig } = require('expo/metro-config'); 
const config = getDefaultConfig(__dirname); 
config.server = { ...config.server, port: 8081, host: '0.0.0.0' }; 
module.exports = config; 
