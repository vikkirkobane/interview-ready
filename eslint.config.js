// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require("eslint-config-expo/flat");

module.exports = defineConfig([
  {
    ignores: [
      "dist/**",
      "supabase/**",
      "interview-ready/**",
      "android/**",
      "ios/**",
      ".expo/**",
      "_archive/**",
      "_dev/**",
      "coverage/**",
      "*.logcat",
      "**/*.logcat",
      "*.json",
      "*.jks"
    ],
  },
  expoConfig,
]);
