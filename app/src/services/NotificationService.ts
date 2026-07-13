import { Platform, PermissionsAndroid, Alert, Linking } from 'react-native';
import { messaging, firestore, auth } from './firebaseConfig';

class NotificationService {
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
      const user = auth().currentUser;
      if (!user) {
        console.log('⚠️ Cannot save token: No user logged in');
        return;
      }

      console.log('📤 Saving token to Firestore for UID:', user.uid);
      await firestore().collection('users').doc(user.uid).set({
        fcmToken: token,
        lastTokenUpdate: firestore.FieldValue.serverTimestamp(),
        platform: Platform.OS,
        onboardingComplete: true // Ensure this record exists correctly
      }, { merge: true });
      console.log('✨ Token saved successfully!');
    } catch (err) {
      console.error('❌ Firestore Token Save Error:', err);
    }
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
        navigation.navigate('Tabs', { screen: 'Home' });
        break;
      case 'birthday':
      case 'anniversary':
      case 'emergency':
        navigation.navigate('Updates', { highlightId: id, highlightType: type });
        break;
      case 'youtube_live':
        {
          const liveUrl = remoteMessage.data?.url || 'https://www.youtube.com/@Brothersinchristfellowship/live';
          Linking.openURL(liveUrl).catch(err => {
            console.error("Couldn't open live stream URL", err);
          });
        }
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
