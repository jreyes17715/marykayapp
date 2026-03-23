// Babel config for Jest ONLY — Metro does not read this file.
// Disables reanimated plugin to avoid missing react-native-worklets/plugin.
module.exports = {
  presets: [
    ['expo/internal/babel-preset', { reanimated: false }],
  ],
};
