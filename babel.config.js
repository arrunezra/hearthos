module.exports = {
  presets: ['module:@react-native/babel-preset', 'nativewind/babel'],
  plugins: [
    '@babel/plugin-transform-class-static-block',
    [
      'module-resolver',
      {
        root: ['./'],
        alias: {
          '@': './',
          'src': './src',
          'assets': './assets',
          'tailwind.config': './tailwind.config.js',
        },
      },
    ],
    // CRITICAL: This plugin MUST be the absolute last item in the array
    "react-native-worklets/plugin",
  ],
};