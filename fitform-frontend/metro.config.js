const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Configure Metro for better stability
config.server = {
  ...config.server,
  port: 8081,
  enhanceMiddleware: (middleware) => {
    return (req, res, next) => {
      // Handle InternalBytecode.js errors
      if (req.url && req.url.includes('InternalBytecode.js')) {
        res.status(404).json({ error: 'File not found' });
        return;
      }
      return middleware(req, res, next);
    };
  },
};

// Configure resolver
config.resolver = {
  ...config.resolver,
  platforms: ['ios', 'android', 'native', 'web'],
  // Ignore problematic files
  blockList: [
    /.*\/InternalBytecode\.js$/,
  ],
};

// Configure transformer
config.transformer = {
  ...config.transformer,
  // Handle source maps better
  getTransformOptions: async () => ({
    transform: {
      experimentalImportSupport: false,
      inlineRequires: true,
    },
  }),
};

module.exports = config;
