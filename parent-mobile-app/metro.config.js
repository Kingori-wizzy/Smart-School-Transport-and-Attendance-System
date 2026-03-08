const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Disable Watchman to use Node.js file watching instead
config.resolver.useWatchman = false;

module.exports = config;