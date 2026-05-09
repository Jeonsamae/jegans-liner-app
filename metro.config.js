const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Disable Metro's package exports resolution — Firebase's React Native
// bundle files are missing in some versions, causing bundling to fail.
// Falling back to file-based resolution fixes the issue.
config.resolver.unstable_enablePackageExports = false;

module.exports = config;
