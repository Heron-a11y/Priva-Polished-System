// Minimal Expo config plugin to add ARCore dependencies and manifest metadata
const { withAppBuildGradle, withAndroidManifest } = require('@expo/config-plugins');

const withArcoreGradle = (config) => {
  return withAppBuildGradle(config, (config) => {
    const { modResults } = config;
    const gradle = modResults.contents;
    const deps = [
      "implementation 'com.google.ar:core:1.40.0'",
      "implementation 'com.google.ar.sceneform:filament-android:1.17.1'",
    ];
    if (!gradle.includes("com.google.ar:core")) {
      config.modResults.contents = gradle.replace(
        /dependencies\s*\{/,
        (m) => `${m}\n        ${deps.join('\n        ')}\n`
      );
    }
    return config;
  });
};

const withArcoreManifest = (config) => {
  return withAndroidManifest(config, (config) => {
    const { modResults } = config;
    const app = modResults.manifest.application?.[0];
    if (!app) return config;
    app["meta-data"] = app["meta-data"] || [];
    const addMeta = (name, value) => {
      if (!app["meta-data"].some((m) => m.$ && m.$.name === name)) {
        app["meta-data"].push({ $: { "android:name": name, "android:value": value } });
      }
    };
    addMeta('com.google.ar.core', 'required');
    addMeta('com.google.ar.core.supported', 'true');
    config.modResults = modResults;
    return config;
  });
};

module.exports = (config) => {
  config = withArcoreGradle(config);
  config = withArcoreManifest(config);
  return config;
};


