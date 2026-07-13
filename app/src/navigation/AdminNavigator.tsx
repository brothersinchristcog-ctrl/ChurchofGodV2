import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform, Image, Dimensions, Animated, Easing, BackHandler } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { 
  BookOpen, 
  Edit3, 
  Calendar, 
  Mic, 
  PlusSquare, 
  Eye, 
  Bell, 
  MapPin, 
  Heart,
  LogOut,
  Menu,
  Users,
  Gift,
  Smartphone,
  Info,
  Phone
} from 'lucide-react-native';
import { useAuth } from '../context/AuthContext';
import Theme from '../theme/Theme';
import { AdminTabContext } from '../context/AdminTabContext';

// Import Screens
import AdminPromiseList from '../screens/admin/AdminPromiseList';
import AdminPromiseEditor from '../screens/admin/AdminPromiseEditor';
import AdminPromiseCalendar from '../screens/admin/AdminPromiseCalendar';
import AdminSermonList from '../screens/admin/AdminSermonList';
import AdminSermonEditor from '../screens/admin/AdminSermonEditor';
import AdminAppPreview from '../screens/admin/AdminAppPreview';
import AdminNotificationBroadcast from '../screens/admin/AdminNotificationBroadcast';
import AdminEventList from '../screens/admin/AdminEventList';
import AdminEventEditor from '../screens/admin/AdminEventEditor';
import AdminPrayerModeration from '../screens/admin/AdminPrayerModeration';
import AdminSongEditor from '../screens/admin/AdminSongEditor';
import AdminMembers from '../screens/admin/AdminMembers';
import AdminCelebrations from '../screens/admin/AdminCelebrations';
import PastorEventNavigator from './PastorEventNavigator';
import AdminAboutUsEditor from '../screens/admin/AdminAboutUsEditor';
import AdminContactUsEditor from '../screens/admin/AdminContactUsEditor';
import AdminCODCelebs from '../screens/admin/AdminCODCelebs';

const { width } = Dimensions.get('window');

export default function AdminNavigator() {
  const { signOut, user, member, setViewMode } = useAuth();
  const [activeTab, setActiveTab] = useState(0);
  const [editingData, setEditingData] = useState(null);
  const [isDrawerVisible, setIsDrawerVisible] = useState(false);
  
  const slideAnim = useRef(new Animated.Value(-width)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const openDrawer = () => {
    setIsDrawerVisible(true);
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 300,
        easing: Easing.out(Easing.poly(3)),
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      })
    ]).start();
  };

  const closeDrawer = () => {
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: -width,
        duration: 250,
        easing: Easing.in(Easing.poly(3)),
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      })
    ]).start(() => {
      setIsDrawerVisible(false);
    });
  };
  useEffect(() => {
    const backAction = () => {
      if (isDrawerVisible) {
        closeDrawer();
        return true;
      }
      if (activeTab !== 0) {
        // Return to the first tab (Promises List) instead of exiting the portal
        requestAnimationFrame(() => {
          setActiveTab(0);
        });
        return true;
      }
      // If already on tab 0, let the app handle the back button normally (e.g. exit admin)
      return false;
    };

    const backHandler = BackHandler.addEventListener(
      'hardwareBackPress',
      backAction
    );

    return () => backHandler.remove();
  }, [activeTab, isDrawerVisible]);

  const tabs = [
    { name: 'Promises', icon: BookOpen, component: AdminPromiseList },
    { name: 'New Promise', icon: Edit3, component: AdminPromiseEditor },
    { name: 'Schedule', icon: Calendar, component: AdminPromiseCalendar },
    { name: 'Sermons', icon: Mic, component: AdminSermonList },
    { name: 'New Sermon', icon: PlusSquare, component: AdminSermonEditor },
    { name: 'New Song', icon: PlusSquare, component: AdminSongEditor },
    { name: 'Notifications', icon: Bell, component: AdminNotificationBroadcast },
    { name: 'Pastor Events', icon: Calendar, component: PastorEventNavigator },
    { name: 'Events', icon: MapPin, component: AdminEventList },
    { name: 'New Event', icon: PlusSquare, component: AdminEventEditor },
    { name: 'Prayers', icon: Heart, component: AdminPrayerModeration },
    { name: 'Members', icon: Users, component: AdminMembers },
    { name: 'Celebrations', icon: Gift, component: AdminCelebrations },
    { name: 'COD Celeb\'s', icon: Gift, component: AdminCODCelebs },
    { name: 'About Us', icon: Info, component: AdminAboutUsEditor },
    { name: 'Contact Us', icon: Phone, component: AdminContactUsEditor },
  ];
  const ActiveComponent = tabs[activeTab].component;
  const goBack = () => {
    requestAnimationFrame(() => {
      setActiveTab(0);
    });
  };

  return (
    <AdminTabContext.Provider value={{ activeTab, setActiveTab, editingData, setEditingData, goBack }}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <TouchableOpacity onPress={openDrawer} style={styles.hamburgerBtn}>
              <Menu color="#fff" size={26} />
            </TouchableOpacity>
            <View style={styles.logoCircle}>
              <Image 
                source={require('../../assets/logo.png')} 
                style={styles.logoImage}
                resizeMode="contain"
              />
            </View>
            <View style={styles.headerText}>
              <Text style={styles.headerTitle}>Church of GOD</Text>
              <Text style={styles.headerSub}>Admin Dashboard</Text>
            </View>
            <View style={styles.roleBadge}>
              <Text style={styles.roleTxt}>Pastor</Text>
            </View>
          </View>
        </View>

        <View style={styles.content}>
          <ActiveComponent />
        </View>

        {/* Full-Height Left Side Drawer Overlay */}
        {isDrawerVisible && (
          <View style={styles.drawerOverlay}>
            <Animated.View style={[StyleSheet.absoluteFill, { opacity: fadeAnim }]}>
              <TouchableOpacity 
                style={styles.drawerBackdrop} 
                activeOpacity={1} 
                onPress={closeDrawer} 
              />
            </Animated.View>
            <Animated.View style={[styles.drawerContent, { transform: [{ translateX: slideAnim }] }]}>
              
              {/* Profile Section */}
              <View style={styles.drawerProfileSection}>
                <View style={styles.drawerAvatar}>
                  <Image source={require('../../assets/logo.png')} style={{ width: 56, height: 56 }} resizeMode="cover" />
                </View>
                <View>
                  <Text style={styles.drawerName}>Church of GOD</Text>
                  <Text style={styles.drawerEmail}>{member?.name || user?.displayName || 'Admin Member'}</Text>
                </View>
              </View>

              <View style={styles.drawerDivider} />

              <ScrollView 
                showsVerticalScrollIndicator={false} 
                style={{ flex: 1 }}
                contentContainerStyle={{ paddingBottom: 100 }}
              >
                <View style={{ paddingVertical: 10 }}>
                  {tabs.map((tab, index) => {
                    const isActive = activeTab === index;
                    return (
                      <TouchableOpacity 
                        key={index} 
                        style={[styles.drawerItem, isActive && styles.drawerItemActive]}
                        onPress={() => {
                          setActiveTab(index);
                          closeDrawer();
                          if ([1, 4, 5, 8].indexOf(index) === -1) setEditingData(null); 
                        }}
                      >
                        <tab.icon 
                          size={20} 
                          color={isActive ? "#FCD34D" : "#fff"} 
                          strokeWidth={isActive ? 2.5 : 1.5}
                        />
                        <Text style={[styles.drawerItemText, isActive && styles.drawerItemTextActive]}>
                          {tab.name}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </ScrollView>

              {/* Footer: Member View + Sign Out */}
              <View style={styles.drawerFooter}>
                <TouchableOpacity
                  style={styles.memberViewBtn}
                  onPress={() => {
                    setViewMode('member');
                    closeDrawer();
                  }}
                >
                  <Smartphone size={18} color="#FCD34D" />
                  <Text style={styles.memberViewTxt}>Member View</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.drawerSignOutBtn} onPress={signOut}>
                  <Text style={styles.drawerSignOutTxt}>Sign out</Text>
                </TouchableOpacity>
              </View>
            </Animated.View>
          </View>
        )}

      </SafeAreaView>
    </AdminTabContext.Provider>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#1a2d5a' },
  container: { flex: 1, backgroundColor: '#f0f2f7' },
  header: { backgroundColor: '#1a2d5a' },
  headerTop: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    paddingHorizontal: 14, 
    paddingVertical: 12,
    gap: 12
  },
  hamburgerBtn: {
    padding: 4,
  },
  logoCircle: { 
    width: 36, 
    height: 36, 
    borderRadius: 18, 
    backgroundColor: '#fff', 
    justifyContent: 'center', 
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 5
  },
  logoImage: { 
    width: 26, 
    height: 26 
  },
  headerText: { flex: 1 },
  headerTitle: { color: '#fff', fontSize: 15, fontWeight: '700' },
  headerSub: { color: '#aac4e8', fontSize: 11, marginTop: 1 },
  roleBadge: { 
    backgroundColor: 'rgba(255,255,255,0.15)', 
    paddingHorizontal: 10, 
    paddingVertical: 4, 
    borderRadius: 12 
  },
  roleTxt: { color: '#fff', fontSize: 10, fontWeight: '700' },

  content: { flex: 1, backgroundColor: '#f0f2f7' },

  // Classic Side Drawer Styles
  drawerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1000,
    flexDirection: 'row',
  },
  drawerBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)', // Dim background
  },
  drawerContent: {
    width: width * 0.75,
    maxWidth: 340,
    backgroundColor: '#1a2d5a', // Original Navy Blue
    paddingTop: Platform.OS === 'ios' ? 50 : 30, // Safe area top padding
    shadowColor: '#000',
    shadowOffset: { width: 5, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 15,
    elevation: 20,
  },
  drawerProfileSection: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 20,
    marginTop: 10,
    gap: 15,
  },
  drawerAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    overflow: 'hidden', // Forces the logo to be a perfect circle
  },
  drawerName: { color: '#fff', fontSize: 18, fontWeight: '700' },
  drawerEmail: { color: '#aac4e8', fontSize: 12, marginTop: 4 },
  drawerDivider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.1)',
    marginHorizontal: 20,
    marginBottom: 5,
  },
  drawerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    marginHorizontal: 10,
    borderRadius: 12,
    marginBottom: 4,
  },
  drawerItemActive: {
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  drawerItemText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
    marginLeft: 16,
  },
  drawerItemTextActive: {
    color: '#FCD34D',
    fontWeight: '800',
  },
  drawerFooter: {
    padding: 20,
    paddingBottom: Platform.OS === 'ios' ? 50 : 45, // Pushed up to safely clear Android nav bar
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  drawerSignOutBtn: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingVertical: 14,
    borderRadius: 20,
    alignItems: 'center',
  },
  drawerSignOutTxt: { 
    color: '#fff', 
    fontWeight: '700', 
    fontSize: 15 
  },
  memberViewBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: 'rgba(252, 211, 77, 0.12)',
    borderWidth: 1.5,
    borderColor: 'rgba(252, 211, 77, 0.35)',
    paddingVertical: 13,
    borderRadius: 20,
    marginBottom: 10,
  },
  memberViewTxt: {
    color: '#FCD34D',
    fontWeight: '800',
    fontSize: 14,
  }
});
