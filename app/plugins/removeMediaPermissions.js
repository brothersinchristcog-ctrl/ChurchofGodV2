/**
 * Custom Expo Config Plugin: removeMediaPermissions
 *
 * This plugin runs LAST and forcefully strips READ_MEDIA_IMAGES,
 * READ_MEDIA_VIDEO, and READ_MEDIA_VISUAL_USER_SELECTED from the
 * Android manifest — even if expo-image-picker or expo-media-library
 * try to add them during the build.
 *
 * This is required to pass Google Play's Photo and Video Permissions policy
 * for apps targeting Android 13+ (API 33+) that use the Android Photo Picker.
 */
const { withAndroidManifest } = require('@expo/config-plugins');

const BLOCKED_PERMISSIONS = [
  'android.permission.READ_MEDIA_IMAGES',
  'android.permission.READ_MEDIA_VIDEO',
  'android.permission.READ_MEDIA_VISUAL_USER_SELECTED',
  'android.permission.READ_MEDIA_AUDIO',
];

const withRemoveMediaPermissions = (config) => {
  return withAndroidManifest(config, (config) => {
    const manifest = config.modResults.manifest;

    const before = (manifest['uses-permission'] || []).length;

    // Remove any permission in our blocked list
    manifest['uses-permission'] = (manifest['uses-permission'] || []).filter(
      (permission) => {
        const name = permission.$?.['android:name'];
        const blocked = BLOCKED_PERMISSIONS.includes(name);
        if (blocked) {
          console.log(`[removeMediaPermissions] Blocked permission: ${name}`);
        }
        return !blocked;
      }
    );

    // Also handle uses-permission-sdk-23 entries (some libraries use this)
    if (manifest['uses-permission-sdk-23']) {
      manifest['uses-permission-sdk-23'] = manifest['uses-permission-sdk-23'].filter(
        (permission) => {
          const name = permission.$?.['android:name'];
          return !BLOCKED_PERMISSIONS.includes(name);
        }
      );
    }

    const after = (manifest['uses-permission'] || []).length;
    console.log(`[removeMediaPermissions] Permissions: ${before} → ${after}`);

    return config;
  });
};

module.exports = withRemoveMediaPermissions;
