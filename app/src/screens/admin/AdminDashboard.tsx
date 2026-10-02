import React, { useContext, useState, useCallback } from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  ScrollView, 
  TouchableOpacity, 
  Dimensions,
  ImageBackground,
  Image,
  StatusBar,
  Platform,
  BackHandler,
  ToastAndroid
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { 
  BookOpen, Edit3, Calendar, Mic, PlusSquare, Music, 
  Bell, MapPin, Heart, Users, MessageCircle, Gift, 
  ImageIcon, Info, Phone, Smartphone, LogOut, Sun, Moon,
  Video
} from 'lucide-react-native';
import { AdminTabContext } from '../../context/AdminTabContext';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import Svg, { Defs, LinearGradient, Stop, Rect } from 'react-native-svg';
import { LinearGradient as ExpoLinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from '@react-navigation/native';

const { width } = Dimensions.get('window');

const DASHBOARD_SECTIONS = [
  {
    title: 'Promises & Schedule',
    layout: 'featured-top',
    items: [
      { id: 3, label: 'Schedule', icon: Calendar, image: require('../../../assets/images/admin_dashboard/schedule.png'), featured: true },
      { id: 1, label: 'Promises', icon: BookOpen, image: require('../../../assets/images/admin_dashboard/promises.png') },
      { id: 2, label: 'New Promise', icon: Edit3, image: require('../../../assets/images/admin_dashboard/new_promise.png') },
    ]
  },
  {
    title: 'Sermons & Worship',
    layout: 'featured-bottom',
    items: [
      { id: 4, label: 'Sermons', icon: Mic, image: require('../../../assets/images/admin_dashboard/sermons.png') },
      { id: 5, label: 'New Sermon', icon: PlusSquare, image: require('../../../assets/images/admin_dashboard/new_sermon.png') },
      { id: 6, label: 'Songs', icon: Music, image: require('../../../assets/images/admin_dashboard/songs.png'), featured: true }
    ]
  },
  {
    title: 'Events',
    layout: 'featured-top',
    items: [
      { id: 8, label: 'Pastor Events', icon: Calendar, image: require('../../../assets/images/admin_dashboard/pastor_events.png'), featured: true },
      { id: 9, label: 'Events', icon: Calendar, image: require('../../../assets/images/admin_dashboard/events.png') },
      { id: 10, label: 'New Event', icon: PlusSquare, image: require('../../../assets/images/admin_dashboard/new_event.png') }
    ]
  },
  {
    title: 'Members & Notifications',
    layout: 'featured-bottom',
    items: [
      { id: 11, label: 'Prayers', icon: Heart, image: require('../../../assets/images/admin_dashboard/prayers.png') },
      { id: 7, label: 'Notifications', icon: Bell, image: require('../../../assets/images/admin_dashboard/notifications.png') },
      { id: 12, label: 'Members', icon: Users, image: require('../../../assets/images/admin_dashboard/members.png'), featured: true }
    ]
  },
  {
    title: 'Community & Gallery',
    layout: 'featured-bottom',
    items: [
      { id: 14, label: 'Celebrations', icon: Gift, image: require('../../../assets/images/admin_dashboard/celebrations.png') },
      { id: 15, label: 'Gallery', icon: ImageIcon, image: require('../../../assets/images/admin_dashboard/gallery.png') },
      { id: 13, label: 'WhatsApp', icon: MessageCircle, image: require('../../../assets/images/admin_dashboard/whatsapp.png'), featured: true }
    ]
  },
  {
    title: 'Church Ledger',
    layout: 'featured-bottom',
    items: [
      { id: 22, label: 'Subscriptions', icon: Users, image: require('../../../assets/images/admin_dashboard/subscriptions.png'), featured: true },
      { id: 18, label: 'Expenses', icon: BookOpen, image: require('../../../assets/images/admin_dashboard/church_ledger.png') },
      { id: 19, label: 'Donations', icon: Heart, image: require('../../../assets/images/admin_dashboard/donations.png') }
    ]
  },
  {
    title: 'Online Bible Classes & Feedback',
    items: [
      { id: 20, label: 'Bible Classes', icon: Video, image: require('../../../assets/images/admin_dashboard/bible_classes.png') },
      { id: 21, label: 'Feedback', icon: MessageCircle, image: require('../../../assets/images/admin_dashboard/feedback.png') }
    ]
  },
  {
    title: 'Information',
    items: [
      { id: 16, label: 'About Us', icon: Info, image: require('../../../assets/images/admin_dashboard/about_us.png') },
      { id: 17, label: 'Contact Us', icon: Phone, image: require('../../../assets/images/admin_dashboard/contact_us.png') }
    ]
  }
];

export default function AdminDashboard() {
  const { setActiveTab } = useContext(AdminTabContext);
  const { setViewMode, signOut, member } = useAuth();
  const { isDark, colors, toggleTheme } = useTheme();

  const [backPressCount, setBackPressCount] = useState(0);

  useFocusEffect(
    useCallback(() => {
      const onBackPress = () => {
        if (backPressCount === 1) {
          BackHandler.exitApp();
          return true;
        }
        setBackPressCount(1);
        if (Platform.OS === 'android') {
          ToastAndroid.show('Are you sure you want to exit? Press back again to confirm.', ToastAndroid.SHORT);
        }
        setTimeout(() => setBackPressCount(0), 2000);
        return true;
      };

      const backHandler = BackHandler.addEventListener(
        'hardwareBackPress',
        onBackPress
      );

      return () => backHandler.remove();
    }, [backPressCount])
  );

  const renderCard = (item: any, index: number, isTwoCols: boolean) => {
    // Determine card width and gap
    const gap = 16;
    const padding = 16 * 2;
    const cardWidth = isTwoCols 
      ? (width - padding - gap) / 2 
      : (width - padding - (gap * 2)) / 3;

    // Dynamic height for bento box effect
    const cardHeight = 110;

    return (
      <TouchableOpacity 
        key={item.id}
        style={[styles.card, { width: cardWidth, height: cardHeight }]}
        activeOpacity={0.85}
        onPress={() => setActiveTab(item.id)}
      >
        <View style={styles.cardImageBg}>
          <Image 
            source={item.image} 
            style={[
              StyleSheet.absoluteFillObject, 
              {width: '100%', height: '100%'},
              item.id === 17 ? { transform: [{ scale: 1.5 }] } : {}
            ]}
            resizeMode="cover"
          />
          {/* Gradient Overlay */}
          <Svg height="100%" width="100%" style={StyleSheet.absoluteFillObject}>
            <Defs>
              <LinearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0" stopColor="#000" stopOpacity="0.05" />
                <Stop offset="0.5" stopColor="#000" stopOpacity="0.4" />
                <Stop offset="1" stopColor="#000" stopOpacity="0.9" />
              </LinearGradient>
            </Defs>
            <Rect width="100%" height="100%" fill="url(#grad)" />
          </Svg>

          {/* Content */}
          <View style={styles.cardContent}>
            <Text style={styles.cardTitle} numberOfLines={1}>{item.label}</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  // Bento layout: first item is a tall full-width featured card, rest are in a row
  const renderBentoSection = (section: any) => {
    const featured = section.items.find((i: any) => i.featured) || section.items[0];
    const rest = section.items.filter((i: any) => i.id !== featured.id);
    const gap = 12;
    const padding = 16 * 2;
    const rowCardWidth = (width - padding - gap) / 2;
    const isFeaturedBottom = section.layout === 'featured-bottom';

    const renderCardInner = (item: any) => (
      <View style={styles.cardImageBg}>
        {item.id === 3 && (
          <Svg height="100%" width="100%" style={StyleSheet.absoluteFillObject}>
            <Defs>
              <LinearGradient id="scheduleBg" x1="0" y1="0" x2="1" y2="0">
                <Stop offset="0" stopColor="#fccbd2" />
                <Stop offset="1" stopColor="#fbaebb" />
              </LinearGradient>
            </Defs>
            <Rect width="100%" height="100%" fill="url(#scheduleBg)" />
          </Svg>
        )}
        <Image
          source={item.image}
          style={
              item.id === 6 
              ? [StyleSheet.absoluteFillObject, { width: '100%', height: '150%', top: -10 }]
              : item.id === 8
              ? [StyleSheet.absoluteFillObject, { width: '100%', height: '150%', top: '-30%' }]
              : item.id === 9
              ? [StyleSheet.absoluteFillObject, { width: '100%', height: '150%', top: '-20%' }]
              : item.id === 22
              ? [StyleSheet.absoluteFillObject, { width: '100%', height: '100%', backgroundColor: '#5384c6' }]
              : [StyleSheet.absoluteFillObject, { 
                  width: '100%', height: '100%', 
                  backgroundColor: item.id === 1 ? '#fbf0dc' : item.id === 2 ? '#022d56' : item.id === 12 ? '#bcbec0' : [4, 11].includes(item.id) ? '#ffffff' : item.id === 5 ? '#c3e3c5' : 'transparent',
                  ...(item.id === 12 ? { transform: [{ scale: 1.25 }] } : {})
                }]
          }
          resizeMode={[1, 2, 3, 4, 5, 11, 12, 22].includes(item.id) ? "contain" : "cover"}
        />
        <Svg height="100%" width="100%" style={StyleSheet.absoluteFillObject}>
          <Defs>
            <LinearGradient id={`grad${item.id}`} x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor="#000" stopOpacity="0.0" />
              <Stop offset="0.5" stopColor="#000" stopOpacity="0.0" />
              <Stop offset="1" stopColor="#000" stopOpacity="0.3" />
            </LinearGradient>
          </Defs>
          <Rect width="100%" height="100%" fill={`url(#grad${item.id})`} />
        </Svg>
        <View style={styles.cardContent}>
          <Text style={styles.cardTitle} numberOfLines={1}>{item.label}</Text>
        </View>
      </View>
    );

    const FeaturedCard = (
        <TouchableOpacity
          key={`featured-${featured.id}`}
          style={[styles.card, styles.featuredCard, isFeaturedBottom ? { marginTop: 12 } : { marginBottom: 12 }]}
          activeOpacity={0.85}
          onPress={() => setActiveTab(featured.id)}
        >
          {renderCardInner(featured)}
        </TouchableOpacity>
    );

    const RowCards = (
        <View key="row" style={styles.bentoRow}>
          {rest.map((item: any) => (
            <TouchableOpacity
              key={item.id}
              style={[styles.card, { width: rowCardWidth, height: 110 }]}
              activeOpacity={0.85}
              onPress={() => setActiveTab(item.id)}
            >
              {renderCardInner(item)}
            </TouchableOpacity>
          ))}
        </View>
    );

    return (
      <View>
        {isFeaturedBottom ? RowCards : FeaturedCard}
        {isFeaturedBottom ? FeaturedCard : RowCards}
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} backgroundColor="transparent" translucent={true} />
      
      {/* ── Scrollable Screen ── */}
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        
        {/* ── Header ── */}
        <View style={styles.header}>
          <View style={styles.headerCard}>

            {/* ── Top row: identity + toggle ── */}
            <View style={styles.identityRow}>
              <View style={styles.logoRow}>
                <View style={styles.logoCircle}>
                  <Image source={require('../../../assets/logo.png')} style={{width: '100%', height: '100%'}} resizeMode="contain" />
                </View>
                <View style={styles.nameBlock}>
                  <Text style={styles.churchName}>Church of GOD</Text>
                  <Text style={styles.adminName}>{member?.name || 'Administrator'}</Text>
                </View>
              </View>
              <TouchableOpacity onPress={toggleTheme} style={styles.themeToggleBtn} activeOpacity={0.75}>
                {isDark
                  ? <Sun size={18} color="#fcd34d" />
                  : <Moon size={18} color="#c0a020" />
                }
              </TouchableOpacity>
            </View>

            {/* ── Golden divider ── */}
            <View style={styles.goldenDivider} />

            {/* ── Dashboard title section ── */}
            <Text style={styles.dashboardTitle} numberOfLines={1} adjustsFontSizeToFit>Admin Dashboard</Text>
            <Text style={styles.dashboardSub}>Quick access to promises, worship, events, members and the life of the church.</Text>

          </View>
        </View>
        {DASHBOARD_SECTIONS.map((section, idx) => {
          const isTwoCols = section.items.length <= 2;
          const SectionIcon = section.items[0]?.icon;
          return (
            <View key={idx} style={styles.sectionContainer}>
              <View style={styles.sectionHeaderRow}>
                <View style={styles.sectionIconRow}>
                  {SectionIcon && <SectionIcon size={18} color={isDark ? "#fcd34d" : colors.primary} />}
                  <Text style={[styles.sectionTitle, { color: colors.text }]}>{section.title}</Text>
                </View>
              </View>

              {((section as any).layout === 'featured-top' || (section as any).layout === 'featured-bottom')
                ? renderBentoSection(section)
                : (
                  <View style={styles.cardGrid}>
                    {section.items.map((item, index) => renderCard(item, index, isTwoCols))}
                  </View>
                )
              }
            </View>
          );
        })}

        {/* ── Footer Actions ── */}
        <View style={styles.footerRow}>
          <TouchableOpacity style={{ flex: 1 }} onPress={() => setViewMode('member')} activeOpacity={0.8}>
            <ExpoLinearGradient colors={[colors.primary, '#101c38']} style={[styles.badgeBtn, { borderWidth: 0 }]}>
              <Smartphone size={18} color="#fcd34d" />
              <Text style={[styles.badgeBtnText, { color: '#fcd34d' }]}>Member View</Text>
            </ExpoLinearGradient>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.badgeBtn, styles.logoutBadgeBtn]} onPress={signOut} activeOpacity={0.8}>
            <LogOut size={18} color="#ffffff" />
            <Text style={[styles.badgeBtnText, { color: '#ffffff' }]}>Sign out</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0B1120',
  },
  header: {
    paddingTop: Platform.OS === 'ios' ? 32 : 12,
    paddingHorizontal: 8,
    paddingBottom: 24,
  },
  /* ── Single unified header card ── */
  headerCard: {
    backgroundColor: '#131d31',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#1e2d47',
    paddingHorizontal: 18,
    paddingVertical: 18,
  },

  /* ── Identity row ── */
  identityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 18,
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    flex: 1,
  },
  logoCircle: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: '#ffffff',
    borderWidth: 1.5,
    borderColor: 'rgba(252, 211, 77, 0.6)',
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 3,
  },
  nameBlock: {
    gap: 1,
    flex: 1,
  },
  welcomeLabel: {
    color: '#fcd34d',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 2.5,
    marginBottom: 2,
  },
  churchName: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  adminName: {
    color: '#8899b8',
    fontSize: 12,
    fontWeight: '400',
    marginTop: 1,
  },

  /* ── Golden divider ── */
  goldenDivider: {
    height: 1,
    backgroundColor: 'rgba(252, 211, 77, 0.25)',
    marginBottom: 18,
  },

  /* ── Dashboard title ── */
  dashboardTitle: {
    color: '#fcd34d',
    fontSize: 34, // Slightly larger to compensate for cursive
    fontFamily: Platform.OS === 'ios' ? 'Bradley Hand' : 'cursive',
    fontWeight: '800',
    letterSpacing: 0.2,
    marginBottom: 8,
  },
  dashboardSub: {
    color: '#8899b8',
    fontSize: 13,
    fontWeight: '400',
    lineHeight: 20,
  },
  scrollContent: {
    padding: 16,
    paddingTop: 12
  },
  sectionContainer: {
    marginBottom: 32
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12
  },
  sectionIconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginRight: 12
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '800'
  },
  goldenLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#fcd34d',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    opacity: 0.5
  },
  goldenDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#fcd34d',
    marginRight: -2
  },
  cardGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between'
  },
  card: {
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#1e293b',
    marginBottom: 12
  },
  featuredCard: {
    width: '100%',
    height: 100,
    borderRadius: 16,
    overflow: 'hidden',
  },
  featuredLabel: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.45)',
    paddingVertical: 7,
    paddingHorizontal: 12,
  },
  featuredLabelTxt: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '800',
  },
  bentoRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  cardImageBg: {
    width: '100%',
    height: '100%',
    justifyContent: 'flex-end'
  },
  cardImageStyle: {
    opacity: 1
  },
  cardContent: {
    padding: 10,
    paddingTop: 0
  },
  iconCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: 'rgba(252, 211, 77, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8
  },
  cardTitle: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '800'
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    marginTop: 20,
    marginBottom: 20
  },
  badgeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 24,
    gap: 8
  },
  logoutBadgeBtn: {
    backgroundColor: '#ef4444',
  },
  badgeBtnText: {
    color: '#fcd34d',
    fontSize: 14,
    fontWeight: '700'
  },
  themeToggleBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(252, 211, 77, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(252, 211, 77, 0.35)',
    justifyContent: 'center',
    alignItems: 'center',
  }
});
