const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, '..');

const config = getDefaultConfig(projectRoot);

// 1. Watch all files in the monorepo for pnpm symlinks
config.watchFolders = [monorepoRoot];

// 2. Block frontend and backend from being scanned or bundled
config.resolver.blockList = [
  new RegExp(`^${path.resolve(monorepoRoot, 'frontend')}/.*`),
  new RegExp(`^${path.resolve(monorepoRoot, 'backend')}/.*`),
];

// 3. Let Metro know where to resolve packages
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(monorepoRoot, 'node_modules'),
];

// 4. Force single instance of React, React Native, and core packages across all dependencies
const PINNED_PACKAGES = [
  'react',
  'react-native',
  'react-native-paper',
  'react-native-safe-area-context',
  'zustand',
];

const defaultResolver = config.resolver.resolveRequest;

config.resolver.resolveRequest = (context, moduleName, platform) => {
  const isPinned = PINNED_PACKAGES.some(
    (pkg) => moduleName === pkg || moduleName.startsWith(`${pkg}/`)
  );

  if (isPinned) {
    try {
      const filePath = require.resolve(moduleName, { paths: [projectRoot] });
      return {
        filePath,
        type: 'sourceFile',
      };
    } catch {
      // Fall through to default resolver
    }
  }

  if (defaultResolver) {
    return defaultResolver(context, moduleName, platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
