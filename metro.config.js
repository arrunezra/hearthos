// const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');
// const { withNativeWind } = require('nativewind/metro');

// const config = getDefaultConfig(__dirname);

// module.exports = withNativeWind(config, { input: './global.css', inlineRem: 16 });

const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');
const { withNativeWind } = require('nativewind/metro');
// 🚀 1. Import the Reanimated native configuration wrapper module
const { wrapWithReanimatedMetroConfig } = require('react-native-reanimated/metro-config');

/**
 * Metro configuration
 * https://metrobundler.dev/docs/configuration
 *
 * @type {import('metro-config').MetroConfig}
 */
const defaultConfig = getDefaultConfig(__dirname);

const customConfig = {
    resolver: {
        // Ensures modern library ecosystem extensions (.mjs files) are parsed cleanly
        sourceExts: [...defaultConfig.resolver.sourceExts, 'mjs'],
        // 🧠 CRITICAL OPTIMIZATION: Stop Metro from scanning native build output directories
        blockList: [
            /node_modules\/.*\/node_modules\/react-native\/.*/,
            /android\/.*/,
            /ios\/.*/,
            /\.git\/.*/
        ],
        maxWorkers: 2,
    },
};

// 2. Merge default React Native config parameters with custom engine expansions
const mergedConfig = mergeConfig(defaultConfig, customConfig);

// 3. Wrap with Reanimated worklet compilation optimization hooks
const reanimatedConfig = wrapWithReanimatedMetroConfig(mergedConfig);

// 4. Finally, export everything wrapped inside the NativeWind configuration engine
module.exports = withNativeWind(reanimatedConfig, { input: './global.css', inlineRem: 16 });