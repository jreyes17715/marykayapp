module.exports = function (api) {
  api.cache.using(() => process.env.NODE_ENV);
  const isTest = process.env.NODE_ENV === 'test';

  // FIX: babel-preset-expo-resolution — babel-preset-expo is not a top-level
  // dependency in Expo 54; it lives inside expo/node_modules/babel-preset-expo.
  // Referencing it by bare name fails when babel.config.js overrides Expo's
  // internal config. expo/internal/babel-preset is a thin re-export that
  // resolves correctly via expo's own require() in both Metro and jest.
  // Was: 'babel-preset-expo' (top-level, not found) → Now: 'expo/internal/babel-preset'
  return {
    presets: [
      [
        'expo/internal/babel-preset',
        // In test: disable reanimated plugin to avoid missing
        // react-native-worklets/plugin which is not installed
        isTest ? { reanimated: false } : {},
      ],
    ],
  };
};
