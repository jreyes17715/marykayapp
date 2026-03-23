module.exports = function (api) {
  api.cache.using(() => process.env.NODE_ENV);
  const isTest = process.env.NODE_ENV === 'test';

  if (isTest) {
    // In test: use internal preset with reanimated disabled
    // to avoid missing react-native-worklets/plugin
    return {
      presets: [
        ['expo/internal/babel-preset', { reanimated: false }],
      ],
    };
  }

  // In dev/prod: standard Expo preset (used by Metro)
  return {
    presets: ['babel-preset-expo'],
  };
};
