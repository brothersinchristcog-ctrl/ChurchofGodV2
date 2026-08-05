import React, { useEffect, useState } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import { Home, Heart, BookOpen, HandCoins, User } from 'lucide-react-native';
import { ActivityIndicator, View, Text, StyleSheet, Alert, Platform, TouchableOpacity, Pressable, AppState, Image, Modal, TouchableWithoutFeedback } from 'react-native';
import firestore from '@react-native-firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Lock, Phone, Bell, MessageCircle, X } from 'lucide-react-native';
import PillNavBar from './PillNavBar';

import { AuthProvider, useAuth } from '../context/AuthContext';
import { ThemeProvider } from '../context/ThemeContext';
import Theme from '../theme/Theme';
import AdminNavigator from './AdminNavigator'; 
import NotificationService from '../services/NotificationService';
import SecurityService from '../services/SecurityService';
import CelebrationPopup from '../components/CelebrationPopup';


// Auth & Onboarding
import AuthNavigator from './AuthNavigator';
import SplashScreen from '../screens/auth/SplashScreen';
import OnboardingScreen from '../screens/auth/OnboardingScreen';

// App Updates
import UpdateChecker from '../components/UpdateChecker';

// Member Screens
import HomeScreen from '../screens/HomeScreen';
import ProfileScreen from '../screens/ProfileScreen';
import PromiseArchiveScreen from '../screens/PromiseArchiveScreen';
import DailyVideoScreen from '../screens/DailyVideoScreen';
import EventsScreen from '../screens/EventsScreen';
import PrayerWallScreen from '../screens/PrayerWallScreen';
import GivingScreen from '../screens/GivingScreen';
import SermonsScreen from '../screens/SermonsScreen';
import SongsScreen from '../screens/SongsScreen';
import EventDetailsScreen from '../screens/EventDetailsScreen';
import UpdatesScreen from '../screens/UpdatesScreen';
import BibleScreen from '../screens/BibleScreen';
import BibleChaptersScreen from '../screens/BibleChaptersScreen';
import BibleReaderScreen from '../screens/BibleReaderScreen';
import BiblePlansScreen from '../screens/BiblePlansScreen';
import BibleSearchScreen from '../screens/BibleSearchScreen';
import MemberNotesScreen from '../screens/MemberNotesScreen';
import MembersScreen from '../screens/MembersScreen';
import SermonVideoScreen from '../screens/SermonVideoScreen';
import AboutUsScreen from '../screens/AboutUsScreen';
import ContactUsScreen from '../screens/ContactUsScreen';
import MemberGalleryDashboard from '../screens/MemberGalleryDashboard';
import MemberGalleryAlbumDetail from '../screens/MemberGalleryAlbumDetail';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

import { Mic, Book, User as UserIcon } from 'lucide-react-native';

const CustomTabBarButton = ({ children, onPress }: any) => (
  <TouchableOpacity
    style={{
      top: -15,
      justifyContent: 'center',
      alignItems: 'center',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 0.25,
      shadowRadius: 10,
      elevation: 5,
    }}
    onPress={onPress}
  >
    <View style={{
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: '#c0392b',
      justifyContent: 'center',
      alignItems: 'center',
    }}>
      {children}
    </View>
  </TouchableOpacity>
);

function TabNavigator() {
  const { user, signOut } = useAuth();
  const isGuest = user?.isAnonymous;

  const handleGuestInteraction = (e: any) => {
    if (isGuest) {
      e.preventDefault();
      Alert.alert(
        'Sign In Required',
        'Please sign in to access the community features.',
        [
          { text: 'Later', style: 'cancel' },
          { text: 'Sign In', onPress: () => signOut() }
        ]
      );
    }
  };

  const icons: any = {
    Home: Home,
    Promise: Book,
    Sermons: Mic,
    Prayer: Heart,
    Profile: UserIcon
  };

  return (
    <Tab.Navigator
      tabBar={props => <PillNavBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Promise" component={PromiseArchiveScreen} /> 
      <Tab.Screen name="Sermons" component={SermonsScreen} />
      <Tab.Screen 
        name="Prayer" 
        component={PrayerWallScreen} 
        listeners={{ tabPress: handleGuestInteraction }}
      />
      <Tab.Screen 
        name="Profile" 
        component={ProfileScreen} 
        listeners={{ tabPress: handleGuestInteraction }}
      />
    </Tab.Navigator>
  );
}

function Navigation() {
  const { user, member, loading, viewMode, setViewMode } = useAuth();
  const navigation = useNavigation<any>();
  const [onboardingComplete, setOnboardingComplete] = React.useState<boolean | null>(null);
  const [showSplash, setShowSplash] = useState(true);
  const [isLocked, setIsLocked] = useState(false); // Default to false, check on mount
  const [pushNotification, setPushNotification] = useState<any>(null);
  const [adminWhatsappReplies, setAdminWhatsappReplies] = useState<any[]>([]);
  const appState = React.useRef(AppState.currentState);

  const userTypeStr = member?.userType?.toLowerCase() || '';
  const isActualAdmin = userTypeStr === 'admin' || 
                        userTypeStr === 'pastor' || 
                        userTypeStr === 'system administrator' || 
                        userTypeStr.includes('admin') || 
                        userTypeStr.includes('pastor');

  // WhatsApp Global Listener
  useEffect(() => {
    if (!isActualAdmin) return;
    const unsubscribe = firestore().collection('broadcasts')
      .orderBy('createdAt', 'desc')
      .limit(5)
      .onSnapshot((snapshot) => {
        if (snapshot) {
          const replies = snapshot.docs
            .map(doc => ({ id: doc.id, ...doc.data() }))
            .filter((data: any) => data.type === 'whatsapp_reply');
          setAdminWhatsappReplies(replies);
        }
      });
    return () => unsubscribe();
  }, [isActualAdmin]);

  const dismissAdminReply = async (id: string) => {
    try {
      await firestore().collection('broadcasts').doc(id).delete();
    } catch (e) {
      console.error('Error dismissing reply:', e);
    }
  };

  // 1. Initial Security Check & App State Listener
  useEffect(() => {
    const handleSecurity = async () => {
      // Only lock if user is a logged-in member (not guest)
      if (user && !user.isAnonymous) {
        const isEnabled = await SecurityService.isBiometricEnabled();
        const isAvailable = await SecurityService.isBiometricAvailable();
        
        if (isEnabled && isAvailable) {
          setIsLocked(true);
          const success = await SecurityService.authenticate();
          if (success) setIsLocked(false);
        } else {
          setIsLocked(false);
        }
      }
    };

    handleSecurity();

    // Listen for background -> foreground to re-lock
    const subscription = AppState.addEventListener('change', nextAppState => {
      if (
        appState.current.match(/inactive|background/) && 
        nextAppState === 'active' && 
        user && !user.isAnonymous
      ) {
        const checkBiometrics = async () => {
          const isEnabled = await SecurityService.isBiometricEnabled();
          const isAvailable = await SecurityService.isBiometricAvailable();
          
          if (isEnabled && isAvailable) {
            setIsLocked(true);
            const success = await SecurityService.authenticate();
            if (success) setIsLocked(false);
          }
        };
        checkBiometrics();
      }
      appState.current = nextAppState;
    });

    return () => subscription.remove();
  }, [user]);

  // Handle Notifications
  useEffect(() => {
    // 1. When app is in background and user clicks notification
    const unsubscribeOnOpen = NotificationService.messaging().onNotificationOpenedApp(remoteMessage => {
      if (viewMode === 'admin') setViewMode('member');
      setTimeout(() => {
        NotificationService.handleNotificationNavigation(remoteMessage, navigation);
      }, 300);
    });

    // 2. When app is closed and user clicks notification
    NotificationService.messaging().getInitialNotification().then(remoteMessage => {
      if (remoteMessage) {
        if (viewMode === 'admin') setViewMode('member');
        setTimeout(() => {
          NotificationService.handleNotificationNavigation(remoteMessage, navigation);
        }, 300);
      }
    });

    // 3. When app is in foreground and notification arrives
    const unsubscribeForeground = NotificationService.setupForegroundListener(navigation, (remoteMessage) => {
      // SECURITY: Ignore push notifications targeted to a different phone number
      const targetPhone = remoteMessage?.data?.targetPhone;
      if (targetPhone && typeof targetPhone === 'string' && targetPhone.trim().length > 0) {
        const uPhone = user?.phoneNumber || '';
        const mPhone = member?.phone || '';
        const targetClean = targetPhone.replace(/\D/g, '');
        
        const match1 = uPhone && uPhone.replace(/\D/g, '').endsWith(targetClean);
        const match2 = mPhone && mPhone.replace(/\D/g, '').endsWith(targetClean);
        const match3 = targetClean.endsWith(uPhone.replace(/\D/g, '')) && uPhone.length > 5;
        const match4 = targetClean.endsWith(mPhone.replace(/\D/g, '')) && mPhone.length > 5;
        
        if (!match1 && !match2 && !match3 && !match4) {
          console.log('Skipping foreground notification targeted to different phone');
          return; // Skip if not targeted to current user
        }
      }
      setPushNotification(remoteMessage);
    });

    return () => {
      unsubscribeOnOpen();
      unsubscribeForeground();
    };
  }, [navigation, viewMode, setViewMode]);

  useEffect(() => {
    if (user && !loading) {
      const initNotifications = async () => {
        const hasPermission = await NotificationService.requestUserPermission();
        if (hasPermission) {
          await NotificationService.getFcmToken();
        }

        // Proactive self-healing: Ensure user profile document has 'name' and 'phone' in Firestore
        if (!user.isAnonymous) {
          try {
            const firestore = require('@react-native-firebase/firestore').default;
            const doc = await firestore().collection('users').doc(user.uid).get();
            const data = doc.data();
            if (!data?.name || !data?.phone) {
              console.log('🩹 [Self-Healing] Missing user profile details in Firestore. Fetching from Salesforce...');
              const phoneClean = user.phoneNumber || '';
              if (phoneClean) {
                const SalesforceService = require('../services/SalesforceService').default;
                const result = await SalesforceService.checkContactExists(phoneClean);
                if (result && result.exists) {
                  const rawRole = (result.member?.userType || 'Member').toLowerCase();
                  const role = ['admin', 'pastor'].includes(rawRole) ? rawRole : 'member';

                  await firestore().collection('users').doc(user.uid).set({
                    name: result.member?.name || '',
                    phone: phoneClean,
                    role: role,
                    onboardingComplete: true
                  }, { merge: true });
                  console.log('🩹 [Self-Healing] Firestore user profile successfully repaired!');
                }
              }
            }
          } catch (err) {
            console.warn('⚠️ [Self-Healing] Profile recovery skipped:', err);
          }
        }
      };
      initNotifications();
    }
  }, [user, loading]);

  // Existing auth effect
  useEffect(() => {
    const timer = setTimeout(() => setShowSplash(false), 4000);
    
    let unsub: any;

    const checkOnboarding = async () => {
      if (!user) {
        setOnboardingComplete(null);
        return;
      }

      // ── Member / Admin: Skip Onboarding ──
      if (!user.isAnonymous) {
        setOnboardingComplete(true);
        return;
      }

      // ── Guest Mode: Show Onboarding (Reactive via Firestore) ──
      unsub = firestore()
        .collection('users')
        .doc(user.uid)
        .onSnapshot((doc) => {
          if (doc.exists()) {
            setOnboardingComplete(doc.data()?.onboardingComplete === true);
          } else {
            setOnboardingComplete(false);
          }
        }, (err) => {
          console.log('Guest Onboarding Check Error:', err);
          setOnboardingComplete(false); 
        });
    };

    checkOnboarding();
    
    return () => {
      if (unsub) unsub();
      clearTimeout(timer);
    };
  }, [user]);

  if (showSplash || loading) {
    return <SplashScreen />;
  }

  // ── Lock Screen View ──
  if (isLocked && user && !user.isAnonymous) {
    return (
      <View style={lockStyles.container}>
        <View style={lockStyles.card}>
          <View style={lockStyles.iconContainer}>
            <Lock size={40} color="#DAA520" />
          </View>
          <Text style={lockStyles.title}>App Locked</Text>
          <Text style={lockStyles.subtitle}>Please verify your identity to continue</Text>
          <TouchableOpacity 
            style={lockStyles.button}
            onPress={async () => {
              const success = await SecurityService.performSecurityCheck();
              if (success) setIsLocked(false);
            }}
          >
            <Text style={lockStyles.buttonText}>Unlock App</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const isAdmin = isActualAdmin && viewMode === 'admin';

  // Not logged in
  if (!user) {
    return (
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Auth" component={AuthNavigator} />
      </Stack.Navigator>
    );
  }

  // Onboarding not complete (guest)
  if (!onboardingComplete) {
    return (
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Onboarding" component={OnboardingScreen} />
      </Stack.Navigator>
    );
  }

  const memberStack = (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Tabs" component={TabNavigator} />
      <Stack.Screen name="DailyVideo" component={DailyVideoScreen} />
      <Stack.Screen name="Events" component={EventsScreen} />
      <Stack.Screen name="Give" component={GivingScreen} />
      <Stack.Screen name="Sermons" component={SermonsScreen} />
      <Stack.Screen name="Songs" component={SongsScreen} />
      <Stack.Screen name="EventDetails" component={EventDetailsScreen} />
      <Stack.Screen name="Updates" component={UpdatesScreen} />
      <Stack.Screen name="PrayerWall" component={PrayerWallScreen} />
      <Stack.Screen name="Bible" component={BibleScreen} />
      <Stack.Screen name="BibleChapters" component={BibleChaptersScreen} />
      <Stack.Screen 
        name="BibleReader" 
        component={BibleReaderScreen} 
        options={({ route }: any) => ({
          animation: route.params?.direction === 'backward' ? 'slide_from_left' : 
                     route.params?.direction === 'forward' ? 'slide_from_right' : 'default'
        })}
      />
      <Stack.Screen name="BibleSearch" component={BibleSearchScreen} />
      <Stack.Screen name="BiblePlans" component={BiblePlansScreen} />
      <Stack.Screen name="MemberNotes" component={MemberNotesScreen} />
      <Stack.Screen name="Members" component={MembersScreen} />
      <Stack.Screen name="SermonVideo" component={SermonVideoScreen} />
      <Stack.Screen name="AboutUs" component={AboutUsScreen} />
      <Stack.Screen name="ContactUs" component={ContactUsScreen} />
      <Stack.Screen name="MemberGalleryDashboard" component={MemberGalleryDashboard} />
      <Stack.Screen name="MemberGalleryAlbumDetail" component={MemberGalleryAlbumDetail} />
    </Stack.Navigator>
  );

  return (
    <View style={{ flex: 1 }}>
      {isAdmin ? (
        <AdminNavigator />
      ) : (
        memberStack
      )}

      {/* Custom Foreground Push Notification Modal */}
      <Modal visible={!!pushNotification} transparent animationType="slide">
        <TouchableWithoutFeedback onPress={() => setPushNotification(null)}>
          <View style={styles.pushOverlay}>
            <TouchableWithoutFeedback onPress={() => {}}>
              <View style={styles.pushCard}>
                <View style={styles.pushHeader}>
                  <View style={styles.pushIconWrapper}>
                    <Bell size={20} color="#ffffff" />
                  </View>
                  <Text style={styles.pushTitle} numberOfLines={1}>{pushNotification?.notification?.title || 'New Update'}</Text>
                </View>
                <Text style={styles.pushBody}>{pushNotification?.notification?.body}</Text>
                
                <View style={styles.pushActions}>
                  <TouchableOpacity style={styles.pushBtnCancel} onPress={() => setPushNotification(null)}>
                    <Text style={styles.pushBtnCancelTxt}>DISMISS</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.pushBtnOpen} onPress={() => {
                    if (isAdmin) setViewMode('member');
                    setTimeout(() => {
                      NotificationService.handleNotificationNavigation(pushNotification, navigation);
                    }, 300);
                    setPushNotification(null);
                  }}>
                    <Text style={styles.pushBtnOpenTxt}>VIEW</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* ── Global Admin WhatsApp Notification Popups ── */}
      {isActualAdmin && adminWhatsappReplies.length > 0 && (
        <View style={{ position: 'absolute', top: Platform.OS === 'ios' ? 50 : 30, left: 16, right: 16, zIndex: 99999 }}>
          {adminWhatsappReplies.map(reply => (
            <View key={reply.id} style={{ backgroundColor: '#ffffff', borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#10b981', elevation: 15, shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.35, shadowRadius: 8 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <MessageCircle size={18} color="#10b981" />
                  <Text style={{ fontSize: 15, fontWeight: '800', color: '#111827' }}>
                    {reply.title.replace('💬 ', '')}
                  </Text>
                </View>
                <TouchableOpacity onPress={() => dismissAdminReply(reply.id)} style={{ padding: 6, backgroundColor: '#f1f5f9', borderRadius: 20 }}>
                  <X size={16} color="#64748b" />
                </TouchableOpacity>
              </View>
              <Text style={{ fontSize: 14, color: '#4B5563', lineHeight: 22 }}>{reply.content}</Text>
              {reply.date && <Text style={{ fontSize: 11, color: '#9CA3AF', marginTop: 10, fontWeight: '600' }}>{reply.date}</Text>}
            </View>
          ))}
        </View>
      )}
      
      <CelebrationPopup member={member} />

    </View>
  );
}

export default function RootNavigator() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <UpdateChecker>
          <Navigation />
        </UpdateChecker>
      </AuthProvider>
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  activePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a2d5a', 
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    gap: 8
  },
  pillText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.5
  },
  inactiveWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 60,
  },
  inactiveLabel: {
    color: '#1a2d5a',
    fontSize: 9,
    fontWeight: '700',
    marginTop: 4,
    letterSpacing: 0.2
  },
  pushOverlay: {
    flex: 1,
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingTop: Platform.OS === 'ios' ? 50 : 20,
    zIndex: 9999
  },
  pushCard: {
    backgroundColor: '#0f172a',
    width: '92%',
    borderRadius: 8,
    padding: 18,
    elevation: 24,
    shadowColor: '#000',
    shadowOpacity: 0.5,
    shadowRadius: 15,
    shadowOffset: { width: 0, height: 8 },
    flexDirection: 'column',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)'
  },
  pushHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12
  },
  pushIconWrapper: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14
  },
  pushTitle: {
    flex: 1,
    fontSize: 17,
    fontWeight: '800',
    color: '#ffffff'
  },
  pushBody: {
    fontSize: 14,
    color: '#cbd5e1',
    lineHeight: 22,
    marginBottom: 16
  },
  pushActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12
  },
  pushBtnCancel: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.05)'
  },
  pushBtnCancelTxt: {
    color: '#e2e8f0',
    fontWeight: '700',
    fontSize: 13,
    letterSpacing: 0.5
  },
  pushBtnOpen: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    backgroundColor: '#1a2d5a',
    borderRadius: 24,
    elevation: 2,
    shadowColor: '#1a2d5a',
    shadowOpacity: 0.3,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 }
  },
  pushBtnOpenTxt: {
    color: '#ffffff',
    fontWeight: '800',
    fontSize: 13,
    letterSpacing: 0.5
  }
});

const lockStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a192f',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20
  },
  card: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 30,
    padding: 40,
    alignItems: 'center',
    width: '100%',
    maxWidth: 340,
    borderWidth: 1,
    borderColor: 'rgba(218, 165, 32, 0.2)',
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(218, 165, 32, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24
  },
  title: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '800',
    marginBottom: 8
  },
  subtitle: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 20
  },
  button: {
    backgroundColor: '#DAA520',
    paddingHorizontal: 40,
    paddingVertical: 16,
    borderRadius: 15,
    width: '100%',
    alignItems: 'center'
  },
  buttonText: {
    color: '#0a192f',
    fontSize: 16,
    fontWeight: '700'
  }
});
