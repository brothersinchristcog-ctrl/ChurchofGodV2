import React, { useEffect, useState } from 'react';
import { Alert, Platform } from 'react-native';
import Constants from 'expo-constants';
import { VersionService, AppVersionConfig } from '../services/VersionService';
import UpdateDialog from './UpdateDialog';

import SpInAppUpdates, { IAUUpdateKind, StartUpdateOptions } from 'sp-react-native-in-app-updates';

export default function UpdateChecker({ children }: { children?: React.ReactNode }) {
  const [config, setConfig] = useState<AppVersionConfig | null>(null);
  const [showDialog, setShowDialog] = useState(false);

  useEffect(() => {
    const checkVersion = async () => {
      let isPlayStoreHandling = false;

      // 1. Check Google Play In-App Updates first (Android Native)
      if (Platform.OS === 'android') {
        try {
          const inAppUpdates = new SpInAppUpdates(false); // isDebug = false
          const result = await inAppUpdates.checkNeedsUpdate();
          
          if (result.shouldUpdate) {
            isPlayStoreHandling = true;
            // Optionally fetch Firestore config just to know if we should FORCE the update
            const appConfig = await VersionService.getAppConfig();
            const updateOptions: StartUpdateOptions = {
              updateType: appConfig?.forceUpdate ? IAUUpdateKind.IMMEDIATE : IAUUpdateKind.FLEXIBLE,
            };

            // If it's a flexible update, we need to listen for when the download finishes
            if (!appConfig?.forceUpdate) {
              inAppUpdates.addStatusUpdateListener((downloadStatus) => {
                // IAUInstallStatus.DOWNLOADED is 11 in Android API
                if (downloadStatus.status === 11) {
                  Alert.alert(
                    'Update Ready',
                    'A new version of the app has been downloaded. Restart now to apply the update?',
                    [
                      { text: 'Not Now', style: 'cancel' },
                      { text: 'Restart', onPress: () => inAppUpdates.installUpdate() }
                    ]
                  );
                }
              });
            }
            
            inAppUpdates.startUpdate(updateOptions);
            return; // Exit early, let the native UI handle the update
          }
        } catch (error) {
          console.log('In-App Update check failed (likely side-loaded or dev client):', error);
        }
      }

      // 2. Fallback to Firestore check if Play Store didn't trigger an update
      const appConfig = await VersionService.getAppConfig();
      if (!appConfig) return;

      const currentVersion = Constants.expoConfig?.version || '1.0.0';
      const comparison = VersionService.compareVersions(appConfig.latestVersion, currentVersion);

      if (comparison > 0) {
        setConfig(appConfig);
        setShowDialog(true);
      }
    };

    checkVersion();
  }, []);

  const handleDismiss = () => {
    setShowDialog(false);
  };

  return (
    <>
      {children}
      {config && (
        <UpdateDialog 
          visible={showDialog} 
          config={config} 
          onDismiss={handleDismiss} 
        />
      )}
    </>
  );
}
