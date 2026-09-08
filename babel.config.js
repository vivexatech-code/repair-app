module.exports = function (api) {
  api.cache(true);
  return {
    presets: ["babel-preset-expo"],
    plugins: [
      // Must be last — required for worklets and NativeWorklets
      "react-native-reanimated/plugin",
    ],
  };
};
