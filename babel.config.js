module.exports = function (api) {
  // Cache per NODE_ENV so test and non-test builds are separate.
  api.cache.using(() => process.env.NODE_ENV);
  // Disable the react-native-reanimated Babel plugin in test environments
  // to avoid the missing react-native-worklets/plugin dependency.
  const isTest = process.env.NODE_ENV === 'test';
  return {
    presets: [
      [
        'expo/internal/babel-preset',
        isTest ? { reanimated: false } : {},
      ],
    ],
  };
};
