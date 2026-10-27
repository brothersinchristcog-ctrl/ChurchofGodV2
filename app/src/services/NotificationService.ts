import { Platform, PermissionsAndroid, Alert, Linking } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { messaging, firestore, auth } from './firebaseConfig';

class NotificationService {
  constructor() {
    try {
      messaging().onTokenRefresh(token => {
        if (token) {
          console.log('🔄 [NotificationService] FCM Token Refreshed:', token);
          this.saveTokenToFirestore(token);
        }
      });
    } catch (_) {}
  }

  messaging() {
    return messaging();
  }

  async requestUserPermission() {
    console.log('🧐 Requesting Notification Permissions...');
    if (Platform.OS === 'android' && Platform.Version >= 33) {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS
      );
      console.log('🤖 Android Notification Status:', granted);
      return granted === PermissionsAndroid.RESULTS.GRANTED;
    }

    const authStatus = await messaging().requestPermission();
    const enabled =
      authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
      authStatus === messaging.AuthorizationStatus.PROVISIONAL;

    console.log('📱 Permission Enabled:', enabled);
    return enabled;
  }

  async getFcmToken() {
    try {
      if (Platform.OS === 'ios') {
        const isRegistered = messaging().isDeviceRegisteredForRemoteMessages;
        if (!isRegistered) {
          await messaging().registerDeviceForRemoteMessages();
        }
      }
      const token = await messaging().getToken();
      if (token) {
        console.log('✅ FCM Token Found:', token);
        await this.saveTokenToFirestore(token);
        return token;
      } else {
        console.log('❌ No FCM token returned from messaging()');
      }
    } catch (error) {
      console.error('❌ FCM Token Error:', error);
    }
    return null;
  }

  async saveTokenToFirestore(token: string) {
    try {
      if (!token) return;
      await AsyncStorage.setItem('@last_fcm_token', token);

      const user = auth().currentUser;
      if (user) {
        console.log('📤 Saving token to Firestore for UID:', user.uid);
        await firestore().collection('users').doc(user.uid).set({
          fcmToken: token,
          lastTokenUpdate: firestore.FieldValue.serverTimestamp(),
          platform: Platform.OS,
          onboardingComplete: true
        }, { merge: true });
        console.log('✨ Token saved successfully for UID:', user.uid);
      } else {
        console.log('ℹ️ No active Firebase Auth user yet, cached token in local storage.');
      }

      // Also ensure matching phone record in Firestore gets the token
      try {
        const cachedMember = await AsyncStorage.getItem('@cached_member');
        if (cachedMember) {
          const parsed = JSON.parse(cachedMember);
          const rawPhone = (parsed?.phone || user?.phoneNumber || '').replace(/\D/g, '');
          const last10 = rawPhone.slice(-10);
          if (last10.length === 10) {
            const querySnap = await firestore().collection('users')
              .where('phone', '>=', last10)
              .where('phone', '<=', last10 + '\uf8ff')
              .get();
            querySnap.forEach(docSnap => {
              docSnap.ref.set({
                fcmToken: token,
                lastTokenUpdate: firestore.FieldValue.serverTimestamp(),
                platform: Platform.OS
              }, { merge: true }).catch(() => {});
            });
          }
        }
      } catch (_) {}
    } catch (err) {
      console.error('❌ Firestore Token Save Error:', err);
    }
  }

  async syncTokenIfLoggedIn() {
    try {
      const cachedToken = await AsyncStorage.getItem('@last_fcm_token');
      if (cachedToken) {
        await this.saveTokenToFirestore(cachedToken);
      } else {
        await this.getFcmToken();
      }
    } catch (_) {}
  }

  // Handle navigation when a notification is clicked
  handleNotificationNavigation(remoteMessage: any, navigation: any) {
    if (!remoteMessage || !navigation) return;

    const { type, id } = remoteMessage.data || {};
    console.log('🚀 Navigating for notification type:', type);

    switch (type) {
      case 'sermon':
        navigation.navigate('Sermons');
        break;
      case 'event':
        navigation.navigate('Events');
        break;
      case 'promise':
        navigation.navigate('Tabs', { screen: 'Promise' });
        break;
      case 'birthday':
      case 'anniversary':
      case 'emergency':
        navigation.navigate('Updates', { highlightId: id, highlightType: type });
        break;
      case 'expense_approval':
        import('react-native').then(({ DeviceEventEmitter }) => {
          DeviceEventEmitter.emit('NAVIGATE_ADMIN', { tabId: 18, innerTab: 'approvals' });
        });
        break;
      case 'youtube_live':
        {
          const liveUrl = remoteMessage.data?.url || 'https://www.youtube.com/@Brothersinchristfellowship/live';
          Linking.openURL(liveUrl).catch(err => {
            console.error("Couldn't open live stream URL", err);
          });
        }
        break;
      case 'BIBLE_CLASS':
        navigation.navigate('BibleClasses');
        break;
      case 'daily_celebration':
        {
          const dateKey = remoteMessage.data?.dateKey;
          const celebrationId = remoteMessage.data?.celebrationId;
          navigation.navigate('DailyCelebrationChat', {
            dateKey: dateKey || undefined,
            highlightCelebrationId: celebrationId
          });
        }
        break;
      case 'daily_scripture_challenge':
      case 'bible_quiz':
      case 'quiz':
        navigation.navigate('BibleQuizHome', {
          autoStartDaily: remoteMessage.data?.autoStartDaily === 'true' || true,
          fromNotification: true
        });
        break;
      default:
        // Fallback: navigate to Updates if it has a broadcast ID
        if (id) {
          navigation.navigate('Updates', { highlightId: id, highlightType: type });
        } else {
          console.log('❓ Unknown notification type, staying on current screen');
        }
    }
  }

  // Handle background notifications
  setupBackgroundHandler() {
    messaging().setBackgroundMessageHandler(async remoteMessage => {
      console.log('Message handled in the background!', remoteMessage);
    });
  }

  // Handle notifications when the app is open
  setupForegroundListener(navigation?: any, onReceive?: (msg: any) => void) {
    return messaging().onMessage(async remoteMessage => {
      console.log('⚡ Foreground Push Notification Received:', remoteMessage);
      
      if (onReceive) {
        onReceive(remoteMessage);
        return;
      }

      const { title, body } = remoteMessage.notification || {};
      if (title || body) {
        Alert.alert(
          title || 'New Update 🔔',
          body || '',
          [
            { text: 'Later', style: 'cancel' },
            { 
              text: 'Open Now', 
              onPress: () => {
                this.handleNotificationNavigation(remoteMessage, navigation);
              } 
            }
          ],
          { cancelable: true }
        );
      }
    });
  }
}

export default new NotificationService();
