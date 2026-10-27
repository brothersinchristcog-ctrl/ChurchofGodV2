const { withAndroidManifest } = require('@expo/config-plugins');

const withAndroidQueries = (config) => {
  return withAndroidManifest(config, (config) => {
    const manifest = config.modResults.manifest;

    if (!manifest.queries) {
      manifest.queries = [];
    }

    if (manifest.queries.length === 0) {
      manifest.queries.push({
        package: [],
        intent: []
      });
    }

    const queries = manifest.queries[0];
    if (!queries.package) {
      queries.package = [];
    }
    if (!queries.intent) {
      queries.intent = [];
    }

    const packagesToAdd = ['com.whatsapp', 'com.whatsapp.w4b'];

    packagesToAdd.forEach((pkgName) => {
      const hasPackage = queries.package.some(
        (pkg) => pkg.$ && pkg.$['android:name'] === pkgName
      );
      if (!hasPackage) {
        queries.package.push({
          $: { 'android:name': pkgName },
        });
      }
    });

    const hasIntent = queries.intent.some(
      (intent) => 
        intent.action && intent.action.some((a) => a.$ && a.$['android:name'] === 'android.intent.action.VIEW') &&
        intent.data && intent.data.some((d) => d.$ && d.$['android:scheme'] === 'whatsapp')
    );

    if (!hasIntent) {
      queries.intent.push({
        action: [{ $: { 'android:name': 'android.intent.action.VIEW' } }],
        data: [{ $: { 'android:scheme': 'whatsapp' } }]
      });
    }

    return config;
  });
};

module.exports = withAndroidQueries;
