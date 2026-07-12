const { withAndroidManifest } = require('@expo/config-plugins');
module.exports = function withAndroidAllowBackup(config) {
  return withAndroidManifest(config, async config => {
    const androidManifest = config.modResults.manifest;
    const application = androidManifest.application[0];
    if (!androidManifest.$['xmlns:tools']) {
      androidManifest.$['xmlns:tools'] = 'http://schemas.android.com/tools';
    }
    application.$['tools:replace'] = 'android:allowBackup';
    return config;
  });
};
