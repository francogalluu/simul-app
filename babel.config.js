module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      [
        'module-resolver',
        {
          root: ['.'],
          alias: { '@': './src' },
          extensions: ['.ios.js', '.android.js', '.js', '.jsx', '.ts', '.tsx', '.json'],
        },
      ],
      // react-native-reanimated/plugin intentionally NOT listed.
      // babel-preset-expo auto-adds it when react-native-reanimated is installed.
    ],
  };
};