import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform, Image, Dimensions, Animated, Easing, BackHandler, DeviceEventEmitter } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { 
  LayoutGrid,
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
  Phone,
  MessageCircle,
  Sun,
  Moon,
  Image as ImageIcon,
  Music,
  Video
} from 'lucide-react-native';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import Theme from '../theme/Theme';
import { AdminTabContext } from '../context/AdminTabContext';

// Import Screens
import AdminDashboard from '../screens/admin/AdminDashboard';
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
import PastorEventNavigator from './PastorEventNavigator';
import AdminAboutUsEditor from '../screens/admin/AdminAboutUsEditor';
import AdminContactUsEditor from '../screens/admin/AdminContactUsEditor';
import AdminCODCelebs from '../screens/admin/AdminCODCelebs';
import AdminInbox from '../screens/admin/AdminInbox';
import AdminGalleryNavigator from '../screens/admin/gallery/AdminGalleryNavigator';
import AdminExpenseMain from '../screens/admin/expenses/AdminExpenseMain';
import AdminDonationsMain from '../screens/admin/donations/AdminDonationsMain';
import AdminBibleClassesMain from '../screens/admin/bible_classes/AdminBibleClassesMain';

const { width } = Dimensions.get('window');

export default function AdminNavigator() {
  const { signOut, user, member, setViewMode } = useAuth();
  const { isDark, toggleTheme, colors } = useTheme();
  const [activeTab, setActiveTab] = useState(0);
  const [editingData, setEditingData] = useState(null);
  const openDrawer = () => {
    requestAnimationFrame(() => setActiveTab(0));
  };

  useEffect(() => {
    const backAction = () => {
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

    // Listen for deep link events from Push Notifications
    const navSub = DeviceEventEmitter.addListener('NAVIGATE_ADMIN', (data) => {
      requestAnimationFrame(() => {
        if (typeof data === 'number') {
          setActiveTab(data);
        } else if (data.tabId !== undefined) {
          setActiveTab(data.tabId);
          if (data.innerTab) {
             DeviceEventEmitter.emit('NAVIGATE_ADMIN_INNER', data.innerTab);
          }
        }
      });
    });

    return () => {
      backHandler.remove();
      navSub.remove();
    };
  }, [activeTab]);

  const tabs = [
    { name: 'Dashboard', icon: LayoutGrid, component: AdminDashboard },
    { name: 'Promises', icon: BookOpen, component: AdminPromiseList },
    { name: 'New Promise', icon: Edit3, component: AdminPromiseEditor },
    { name: 'Schedule', icon: Calendar, component: AdminPromiseCalendar },
    { name: 'Sermons', icon: Mic, component: AdminSermonList },
    { name: 'New Sermon', icon: PlusSquare, component: AdminSermonEditor },
    { name: 'Songs', icon: Music, component: AdminSongEditor },
    { name: 'Notifications', icon: Bell, component: AdminNotificationBroadcast },
    { name: 'Pastor Events', icon: Calendar, component: PastorEventNavigator },
    { name: 'Events', icon: MapPin, component: AdminEventList },
    { name: 'New Event', icon: PlusSquare, component: AdminEventEditor },
    { name: 'Prayers', icon: Heart, component: AdminPrayerModeration },
    { name: 'Members', icon: Users, component: AdminMembers },
    { name: 'WhatsApp', icon: MessageCircle, component: AdminInbox },
    { name: 'Celebrations', icon: Gift, component: AdminCODCelebs },
    { name: 'Gallery', icon: ImageIcon, component: AdminGalleryNavigator },
    { name: 'About Us', icon: Info, component: AdminAboutUsEditor },
    { name: 'Contact Us', icon: Phone, component: AdminContactUsEditor },
    { name: 'Expenses', icon: BookOpen, component: AdminExpenseMain },
    { name: 'Donations', icon: Heart, component: AdminDonationsMain },
    { name: 'Bible Classes', icon: Video, component: AdminBibleClassesMain },
  ];
  const ActiveComponent = tabs[activeTab].component;
  const isWhatsApp = tabs[activeTab].name === 'WhatsApp';
  const isDashboard = activeTab === 0;
  const isExpenses = tabs[activeTab].name === 'Expenses';
  const isDonations = tabs[activeTab].name === 'Donations';
  const isBibleClasses = tabs[activeTab].name === 'Bible Classes';
  
  let headerBgColor = '#1a2d5a';
  if (isDashboard) headerBgColor = colors.background;
  else if (isWhatsApp) headerBgColor = '#0b141a';
  else if (isExpenses) headerBgColor = '#FFF9E9';
  else if (isDonations) headerBgColor = '#1B1F3B';
  else if (isBibleClasses) headerBgColor = isDark ? '#0f172a' : '#f8fafc';

  const goBack = () => {
    requestAnimationFrame(() => {
      setActiveTab(0);
    });
  };

  return (
    <AdminTabContext.Provider value={{ activeTab, setActiveTab, editingData, setEditingData, goBack, openDrawer }}>
      <SafeAreaView style={[styles.safeArea, { backgroundColor: headerBgColor }]}>
        {![0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20].includes(activeTab) && (
          <View style={[styles.header, { backgroundColor: headerBgColor }]}>
            <View style={styles.headerTop}>
              <TouchableOpacity onPress={openDrawer} style={styles.hamburgerBtn}>
                <Menu color="#fff" size={26} />
              </TouchableOpacity>
              <Text style={{ fontSize: 18, fontWeight: '700', color: '#fff', marginLeft: 15 }}>{tabs[activeTab].name}</Text>
            </View>
          </View>
        )}

        <View style={styles.content}>
          <ActiveComponent />
        </View>

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
