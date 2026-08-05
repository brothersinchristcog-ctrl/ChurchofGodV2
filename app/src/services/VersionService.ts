import firestore from '@react-native-firebase/firestore';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

export interface AppVersionConfig {
  latestVersion: string;
  minimumVersion: string;
  forceUpdate: boolean;
  playStoreUrl: string;
  releaseNotes: string[];
}

const DEFAULT_CONFIG: AppVersionConfig = {
  latestVersion: '1.0.0',
  minimumVersion: '1.0.0',
  forceUpdate: false,
  playStoreUrl: 'market://details?id=com.brothersinchrist.churchofgod',
  releaseNotes: [
    'Performance improvements',
    'Bug fixes'
  ]
};

export class VersionService {
  /**
   * Compare two semantic versions (e.g. 1.0.5 and 1.0.4).
   * Returns 1 if v1 > v2
   * Returns -1 if v1 < v2
   * Returns 0 if v1 === v2
   */
  static compareVersions(v1: string = '1.0.0', v2: string = '1.0.0'): number {
    // Strip any accidental extra quotes from the strings
    const cleanV1 = v1.replace(/"/g, '');
    const cleanV2 = v2.replace(/"/g, '');
    
    const parts1 = cleanV1.split('.').map(Number);
    const parts2 = cleanV2.split('.').map(Number);
    const maxLen = Math.max(parts1.length, parts2.length);
    
    for (let i = 0; i < maxLen; i++) {
      const num1 = parts1[i] || 0;
      const num2 = parts2[i] || 0;
      if (num1 > num2) return 1;
      if (num1 < num2) return -1;
    }
    return 0;
  }

  static async getAppConfig(): Promise<AppVersionConfig | null> {
    try {
      // Currently only checking for android per requirements.
      if (Platform.OS !== 'android') return null;

      const docRef = firestore().collection('app_config').doc('android');
      const docSnap = await docRef.get();

      if (docSnap.exists ()) {
        const data = docSnap.data();
        return {
          ...DEFAULT_CONFIG,
          ...data
        } as AppVersionConfig;
      }
      
      return null;
    } catch (error) {
      console.log('Error fetching app_config/android from Firestore:', error);
      return null;
    }
  }
}
