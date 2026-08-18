import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  Linking,
  Alert,
  Platform,
  Image,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { ChevronLeft, MapPin, Clock, Church, BookOpen } from 'lucide-react-native';
import Svg, { Path, Rect, Circle } from 'react-native-svg';
import firestore from '@react-native-firebase/firestore';
import { WebView } from 'react-native-webview';
import { useTheme } from '../context/ThemeContext';
import Animated, { 
  useSharedValue, 
  useAnimatedProps, 
  useAnimatedStyle,
  withRepeat, 
  withSequence,
  withTiming, 
  Easing, 
  interpolate, 
  Extrapolation 
} from 'react-native-reanimated';

const AnimatedPath = Animated.createAnimatedComponent(Path);
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

const COLORS = {
  facebook: '#1877F2',
  phone: '#4CAF50',
  youtube: '#FF0000',
  email: '#EA4335',
  instagram: '#E1306C',
};

const DEFAULT_COLOR = '#c3cdd3';
const DEFAULT_ICON_COLOR = '#11335b';
const CIRCLE_RADIUS = 28;
const CIRCLE_CIRCUMFERENCE = 2 * Math.PI * CIRCLE_RADIUS;

// Removed duplicates
interface ContactData {
  address: string;
  phoneNumbers: string[];
  emails: string[];
  socialLinks: {
    youtube: string;
    instagram: string;
    facebook: string;
  };
}

const DEFAULT: ContactData = {
  address: 'opposite RTC busstand beside muthoot finance, koilakuntla, nandyal district, andhra pradesh, 518134',
  phoneNumbers: ['+91 99999 00000'],
  emails: ['info@brothersinchristcog.org'],
  socialLinks: {
    youtube: 'https://www.youtube.com/@Brothersinchristfellowship',
    instagram: 'https://www.instagram.com/brothersinchristcog',
    facebook: 'https://www.facebook.com/brothersinchristcog',
  },
};

/* ── Inline SVGs ── */
const PhoneIcon = ({ size = 24, color = "#43474e" }: { size?: number, color?: string }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <Path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
  </Svg>
);

const EmailIcon = ({ size = 24, color = "#43474e" }: { size?: number, color?: string }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <Path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
    <Path d="m22 6-10 7L2 6" />
  </Svg>
);

const NetworkIcon = ({ size = 24, color = "#43474e" }: { size?: number, color?: string }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <Rect x="16" y="16" width="6" height="6" rx="1" />
    <Rect x="2" y="16" width="6" height="6" rx="1" />
    <Rect x="9" y="2" width="6" height="6" rx="1" />
    <Path d="M5 16v-3a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1v3" />
    <Path d="M12 12V8" />
  </Svg>
);

const YoutubeIcon = ({ size = 24, color = "#43474e" }: { size?: number, color?: string }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
    <Path d="M21.58 7.19c-.23-.86-.91-1.54-1.77-1.77C18.25 5 12 5 12 5s-6.25 0-7.81.42c-.86.23-1.54.91-1.77 1.77C2 8.75 2 12 2 12s0 3.25.42 4.81c.23.86.91 1.54 1.77 1.77C5.75 19 12 19 12 19s6.25 0 7.81-.42c.86-.23 1.54-.91 1.77-1.77C22 15.25 22 12 22 12s0-3.25-.42-4.81zM10 15V9l5.2 3z" />
  </Svg>
);

const InstagramIcon = ({ size = 24, color = "#43474e" }: { size?: number, color?: string }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Rect x="2" y="2" width="20" height="20" rx="5" ry="5" stroke={color} strokeWidth="2" />
    <Circle cx="12" cy="12" r="4.5" stroke={color} strokeWidth="2" />
    <Circle cx="17.5" cy="6.5" r="1.5" fill={color} />
  </Svg>
);

const FacebookIcon = ({ size = 24, color = "#43474e" }: { size?: number, color?: string }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <Path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
  </Svg>
);

const SOCIAL_ITEMS = [
  { id: 'facebook', label: 'Facebook', Icon: FacebookIcon, color: COLORS.facebook, cx: 32, cy: 40, startAngle: 0 },
  { id: 'phone', label: 'Phone', Icon: PhoneIcon, color: COLORS.phone, cx: 96, cy: 120, startAngle: 180 },
  { id: 'youtube', label: 'YouTube', Icon: YoutubeIcon, color: COLORS.youtube, cx: 160, cy: 40, startAngle: 180 },
  { id: 'email', label: 'Email', Icon: EmailIcon, color: COLORS.email, cx: 224, cy: 120, startAngle: 180 },
  { id: 'instagram', label: 'Instagram', Icon: InstagramIcon, color: COLORS.instagram, cx: 288, cy: 40, startAngle: 180 },
];

const SEGMENTS = [
  { d: "M 32 40 C 64 40, 64 120, 96 120", color: COLORS.facebook },
  { d: "M 96 120 C 128 120, 128 40, 160 40", color: COLORS.phone },
  { d: "M 160 40 C 192 40, 192 120, 224 120", color: COLORS.youtube },
  { d: "M 224 120 C 256 120, 256 40, 288 40", color: COLORS.email },
];

const AnimatedSegmentPath = ({ seg, j, progress }: any) => {
  const startStep = 2 * j + 1;
  const endStep = 2 * j + 2;
  const pathLength = 105;

  const animatedProps = useAnimatedProps(() => {
    const drawProgress = interpolate(
      progress.value,
      [startStep, endStep],
      [0, 1],
      Extrapolation.CLAMP
    );
    return {
      strokeDashoffset: pathLength * (1 - drawProgress),
    };
  });

  return (
    <AnimatedPath
      d={seg.d}
      stroke={seg.color}
      strokeWidth={3}
      fill="none"
      strokeDasharray={pathLength}
      animatedProps={animatedProps}
    />
  );
};

const AnimatedCircleNode = ({ item, i, progress, isDark }: any) => {
  const startStep = 2 * i;
  const endStep = 2 * i + 1;

  const staticCircleProps = useAnimatedProps(() => {
    const isColored = progress.value >= endStep;
    return {
      stroke: isColored ? item.color : (isDark ? '#334155' : DEFAULT_COLOR),
      strokeWidth: isColored ? 2 : 1.5,
    };
  });

  const animatedDrawProps = useAnimatedProps(() => {
    const drawProgress = interpolate(
      progress.value,
      [startStep, endStep],
      [0, 1],
      Extrapolation.CLAMP
    );
    const opacity = progress.value >= endStep ? 0 : 1;
    return {
      strokeDashoffset: CIRCLE_CIRCUMFERENCE * (1 - drawProgress),
      opacity,
    };
  });

  return (
    <React.Fragment>
      <AnimatedCircle 
        cx={item.cx} 
        cy={item.cy} 
        r={CIRCLE_RADIUS} 
        fill={isDark ? '#1e293b' : "#ffffff"} 
        animatedProps={staticCircleProps}
      />
      <AnimatedCircle 
        cx={item.cx} 
        cy={item.cy} 
        r={CIRCLE_RADIUS} 
        fill="none" 
        stroke={item.color}
        strokeWidth={3}
        strokeDasharray={CIRCLE_CIRCUMFERENCE}
        rotation={item.startAngle}
        origin={`${item.cx}, ${item.cy}`}
        animatedProps={animatedDrawProps}
      />
    </React.Fragment>
  );
};

const AnimatedIconWrapper = ({ progress, endStep, color, Icon, isDark }: any) => {
  const activeStyle = useAnimatedStyle(() => ({
    opacity: progress.value >= endStep ? 1 : 0,
    position: 'absolute',
  }));
  
  const inactiveStyle = useAnimatedStyle(() => ({
    opacity: progress.value >= endStep ? 0 : 1,
    position: 'absolute',
  }));

  return (
    <View style={{ width: 28, height: 28, justifyContent: 'center', alignItems: 'center' }}>
      <Animated.View style={inactiveStyle}>
        <Icon size={28} color={isDark ? '#94a3b8' : DEFAULT_ICON_COLOR} />
      </Animated.View>
      <Animated.View style={activeStyle}>
        <Icon size={28} color={color} />
      </Animated.View>
    </View>
  );
};

export default function ContactUsScreen() {
  const navigation = useNavigation();
  const { isDark } = useTheme();
  const [data, setData] = useState<ContactData>(DEFAULT);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = firestore()
      .collection('settings')
      .doc('contact')
      .onSnapshot(
        (doc) => {
          if (doc.exists()) {
            const d = doc.data() as ContactData;
            setData({
              address: d.address || DEFAULT.address,
              phoneNumbers: d.phoneNumbers?.length ? d.phoneNumbers : DEFAULT.phoneNumbers,
              emails: d.emails?.length ? d.emails : DEFAULT.emails,
              socialLinks: {
                youtube: d.socialLinks?.youtube || DEFAULT.socialLinks.youtube,
                instagram: d.socialLinks?.instagram || DEFAULT.socialLinks.instagram,
                facebook: d.socialLinks?.facebook || DEFAULT.socialLinks.facebook,
              },
            });
          }
          setLoading(false);
        },
        (err) => {
          console.warn('ContactUs listener error:', err);
          setLoading(false);
        }
      );
    return () => unsub();
  }, []);

  const progress = useSharedValue(0);
  const [isAnimationRunning, setIsAnimationRunning] = useState(false);
  const [bentoY, setBentoY] = useState(0);
  const [cardY, setCardY] = useState(0);
  const screenHeight = Dimensions.get('window').height;

  useEffect(() => {
    const absoluteCardY = bentoY + cardY;
    if (absoluteCardY > 0 && screenHeight > absoluteCardY + 100) {
      setIsAnimationRunning(true);
    }
  }, [bentoY, cardY, screenHeight]);

  useEffect(() => {
    if (isAnimationRunning) {
      progress.value = 0;
      progress.value = withRepeat(
        withSequence(
          withTiming(9, { duration: 15000, easing: Easing.linear }),
          withTiming(9, { duration: 10000 })
        ),
        -1,
        false
      );
    }
  }, [isAnimationRunning]);

  const openUrl = (url: string) => {
    if (!url) {
      Alert.alert('Error', 'No link available.');
      return;
    }
    
    let formattedUrl = url;
    if (!url.startsWith('http') && !url.startsWith('tel:') && !url.startsWith('mailto:')) {
      formattedUrl = `https://${url}`;
    }

    Linking.openURL(formattedUrl).catch(() => Alert.alert('Error', `Could not open the link.`));
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: isDark ? '#0f172a' : '#fbf9f8' }]} edges={['top']}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: isDark ? 'rgba(15, 23, 42, 0.8)' : 'rgba(251, 249, 248, 0.8)' }]}>
        <View style={styles.headerLeft}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <ChevronLeft size={28} color={isDark ? '#fff' : '#11335b'} />
          </TouchableOpacity>
        </View>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={isDark ? '#FCD34D' : '#11335b'} />
        </View>
      ) : (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          scrollEventThrottle={16}
          onScroll={(e) => {
            const scrollY = e.nativeEvent.contentOffset.y;
            const absoluteCardY = bentoY + cardY;
            if (!isAnimationRunning && absoluteCardY > 0 && scrollY + screenHeight > absoluteCardY + 150) {
              setIsAnimationRunning(true);
            }
          }}
        >
          {/* Hero Section */}
          <View style={styles.heroSection}>
            <Image 
               source={require('../../assets/logo.png')} 
               style={[styles.heroLogo, { borderColor: isDark ? '#FCD34D' : 'rgba(195, 198, 207, 0.3)', borderWidth: isDark ? 2 : 0 }]} 
               resizeMode="cover"
            />
            <Text style={[styles.heroTitle, { color: isDark ? '#fff' : '#11335b' }]}>Get in Touch</Text>
            <Text style={[styles.heroSubtitle, { color: isDark ? '#cbd5e1' : '#43474e' }]}>
              We are here to support you on your spiritual journey. Reach out with questions, prayer requests, or just to say hello.
            </Text>
          </View>

          <View style={styles.bentoContainer} onLayout={(e) => setBentoY(e.nativeEvent.layout.y)}>
            {/* Visit Us Card */}
            <View style={[styles.bentoCard, { backgroundColor: isDark ? '#1e293b' : '#ffffff', borderColor: isDark ? '#334155' : 'rgba(195, 198, 207, 0.2)' }]}>
              <View style={styles.bentoCardHeader}>
                <MapPin size={24} color={isDark ? '#FCD34D' : '#735c00'} />
                <Text style={[styles.bentoCardTitle, { color: isDark ? '#fff' : '#11335b' }]}>Visit Us</Text>
              </View>
              <Text style={[styles.addressText, { color: isDark ? '#cbd5e1' : '#43474e' }]}>{data.address}</Text>
              
              <View style={[styles.mapContainer, { overflow: 'hidden', borderColor: isDark ? '#334155' : 'rgba(195, 198, 207, 0.3)' }]}>
                <WebView 
                  source={{ html: `
                    <!DOCTYPE html>
                    <html>
                      <head>
                        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
                        <style>
                          body { margin: 0; padding: 0; overflow: hidden; background-color: ${isDark ? '#1e293b' : '#ffffff'}; }
                          iframe { width: 100vw; height: 100vh; border: none; }
                        </style>
                      </head>
                      <body>
                        <iframe 
                          src="https://maps.google.com/maps?q=${encodeURIComponent(data.address)}&t=&z=15&ie=UTF8&iwloc=&output=embed"
                          frameborder="0" 
                          scrolling="no" 
                          marginheight="0" 
                          marginwidth="0">
                        </iframe>
                      </body>
                    </html>
                  `}}
                  style={{ width: '100%', height: '100%', backgroundColor: isDark ? '#1e293b' : 'transparent' }}
                  scrollEnabled={false}
                  pointerEvents="none"
                />
                <TouchableOpacity 
                  style={[StyleSheet.absoluteFill, { backgroundColor: 'transparent' }]} 
                  activeOpacity={0.5} 
                  onPress={() => openUrl(`https://maps.google.com/?q=${encodeURIComponent(data.address)}`)}
                >
                  <View style={[styles.mapOverlay, { backgroundColor: isDark ? 'rgba(0, 0, 0, 0.2)' : 'rgba(17, 51, 91, 0.05)' }]} />
                </TouchableOpacity>
              </View>
            </View>

            {/* Service Times Card */}
            <View style={[styles.bentoCard, { backgroundColor: isDark ? '#1e293b' : '#ffffff', borderColor: isDark ? '#334155' : 'rgba(195, 198, 207, 0.2)' }]}>
              <View style={styles.bentoCardHeader}>
                <Clock size={24} color={isDark ? '#FCD34D' : '#735c00'} />
                <Text style={[styles.bentoCardTitle, { color: isDark ? '#fff' : '#11335b' }]}>Service Times</Text>
              </View>
              
              <View style={styles.serviceList}>
                {/* Sunday Worship */}
                <View style={styles.serviceItem}>
                  <View style={[styles.serviceIconCircle, { backgroundColor: isDark ? 'rgba(252, 211, 77, 0.1)' : '#f5f3f3' }]}>
                    <Church size={20} color={isDark ? '#FCD34D' : '#11335b'} />
                  </View>
                  <View style={styles.serviceContent}>
                    <Text style={[styles.serviceName, { color: isDark ? '#fff' : '#11335b' }]}>Sunday Worship</Text>
                    <Text style={[styles.serviceDetail, { color: isDark ? '#94a3b8' : '#74777f' }]}>10:30 AM — 1:30 PM</Text>
                  </View>
                </View>
                
                {/* Wednesday Bible Study */}
                <View style={styles.serviceItem}>
                  <View style={[styles.serviceIconCircle, { backgroundColor: isDark ? 'rgba(252, 211, 77, 0.1)' : '#f5f3f3' }]}>
                    <BookOpen size={20} color={isDark ? '#FCD34D' : '#11335b'} />
                  </View>
                  <View style={styles.serviceContent}>
                    <Text style={[styles.serviceName, { color: isDark ? '#fff' : '#11335b' }]}>Wednesday Bible Study</Text>
                    <Text style={[styles.serviceDetail, { color: isDark ? '#94a3b8' : '#74777f' }]}>6:00 PM — 8:00 PM</Text>
                  </View>
                </View>

                {/* Women's Fasting Prayer */}
                <View style={styles.serviceItem}>
                  <View style={[styles.serviceIconCircle, { backgroundColor: isDark ? 'rgba(252, 211, 77, 0.1)' : '#f5f3f3' }]}>
                    <Clock size={20} color={isDark ? '#FCD34D' : '#11335b'} />
                  </View>
                  <View style={styles.serviceContent}>
                    <Text style={[styles.serviceName, { color: isDark ? '#fff' : '#11335b' }]}>Women's Fasting Prayer</Text>
                    <Text style={[styles.serviceDetail, { color: isDark ? '#94a3b8' : '#74777f' }]}>Friday: 11:00 AM — 3:00 PM</Text>
                  </View>
                </View>

                {/* Second Saturday */}
                <View style={[styles.serviceItem, { marginBottom: 0 }]}>
                  <View style={[styles.serviceIconCircle, { backgroundColor: isDark ? 'rgba(252, 211, 77, 0.1)' : '#f5f3f3' }]}>
                    <Church size={20} color={isDark ? '#FCD34D' : '#11335b'} />
                  </View>
                  <View style={styles.serviceContent}>
                    <Text style={[styles.serviceName, { color: isDark ? '#fff' : '#11335b' }]}>Special Meeting</Text>
                    <Text style={[styles.serviceDetail, { color: isDark ? '#94a3b8' : '#74777f' }]}>Every Month 2nd Saturday: 10:00 AM — 4:00 PM</Text>
                  </View>
                </View>
              </View>
            </View>

            {/* Connect With Us Card */}
            <View style={[styles.bentoCard, { backgroundColor: isDark ? '#1e293b' : '#ffffff', borderColor: isDark ? '#334155' : 'rgba(195, 198, 207, 0.2)' }]} onLayout={(e) => setCardY(e.nativeEvent.layout.y)}>
              <View style={styles.bentoCardHeader}>
                <NetworkIcon size={24} color={isDark ? '#FCD34D' : '#735c00'} />
                <Text style={[styles.bentoCardTitle, { color: isDark ? '#fff' : '#11335b' }]}>Connect With Us</Text>
              </View>
              <View style={styles.wavyContainer}>
                {/* Background Wave & Circles */}
                <View style={StyleSheet.absoluteFill}>
                  <Svg width="100%" height="100%" viewBox="0 0 320 190">
                    {/* Static background path */}
                    <Path 
                      d="M 32 40 C 64 40, 64 120, 96 120 C 128 120, 128 40, 160 40 C 192 40, 192 120, 224 120 C 256 120, 256 40, 288 40" 
                      stroke={isDark ? '#334155' : DEFAULT_COLOR} 
                      strokeWidth={1.5} 
                      fill="none" 
                    />
                    
                    {/* Animated moving path segments */}
                    {SEGMENTS.map((seg, j) => (
                      <AnimatedSegmentPath key={`seg-${j}`} seg={seg} j={j} progress={progress} />
                    ))}

                    {/* Colored Circles */}
                    {SOCIAL_ITEMS.map((item, i) => (
                      <AnimatedCircleNode key={`circle-${i}`} item={item} i={i} progress={progress} isDark={isDark} />
                    ))}
                  </Svg>
                </View>

                {/* Icons */}
                {SOCIAL_ITEMS.map((item, idx) => {
                  const endStep = 2 * idx + 1;
                  let itemUrl = '';
                  if (item.id === 'facebook') itemUrl = data.socialLinks.facebook;
                  else if (item.id === 'youtube') itemUrl = data.socialLinks.youtube;
                  else if (item.id === 'instagram') itemUrl = data.socialLinks.instagram;
                  else if (item.id === 'phone') itemUrl = `tel:${data.phoneNumbers[0]}`;
                  else if (item.id === 'email') itemUrl = `mailto:${data.emails[0]}`;

                  return (
                    <TouchableOpacity 
                      key={idx}
                      style={[styles.wavyItem, { left: item.cx - 32, top: item.cy - 28 }]}
                      activeOpacity={0.7}
                      onPress={() => openUrl(itemUrl)}
                    >
                      <View style={styles.wavyIconBox}>
                        <AnimatedIconWrapper progress={progress} endStep={endStep} color={item.color} Icon={item.Icon} isDark={isDark} />
                      </View>
                      <Text style={[styles.wavyText, { color: isDark ? '#fff' : '#1b1c1c' }]}>{item.label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          </View>

          {/* Scripture Quote Footer */}
          <View style={[styles.footerSection, { borderTopColor: isDark ? '#334155' : 'rgba(195, 198, 207, 0.1)' }]}>
            <Text style={[styles.quoteIcon, { color: isDark ? 'rgba(252, 211, 77, 0.2)' : 'rgba(17, 51, 91, 0.4)' }]}>"</Text>
            <Text style={[styles.scriptureQuote, { color: isDark ? '#cbd5e1' : '#43474e' }]}>
              Call to me and I will answer you and tell you great and unsearchable things you do not know.
            </Text>
            <Text style={[styles.scriptureRef, { color: isDark ? '#FCD34D' : '#735c00' }]}>— JEREMIAH 33:3</Text>
          </View>
          
          <View style={{ height: 100 }} />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fbf9f8' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: 'rgba(251, 249, 248, 0.8)',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  backBtn: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '500',
    color: '#11335b',
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerLogo: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(195, 198, 207, 0.3)',
  },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 40, paddingHorizontal: 20 },
  
  heroSection: {
    alignItems: 'center',
    paddingTop: 32,
    paddingBottom: 40,
  },
  heroLogo: {
    width: 96,
    height: 96,
    borderRadius: 48,
    marginBottom: 24,
  },
  heroTitle: {
    fontSize: 36,
    color: '#11335b',
    fontWeight: '500',
    marginBottom: 12,
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
    fontStyle: 'italic',
    textAlign: 'center',
  },
  heroSubtitle: {
    fontSize: 18,
    color: '#43474e',
    textAlign: 'center',
    lineHeight: 28,
  },

  bentoContainer: {
    gap: 24,
  },

  bentoCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(195, 198, 207, 0.2)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  bentoCardSecondary: {
    backgroundColor: 'rgba(254, 214, 91, 0.1)',
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(115, 92, 0, 0.2)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  socialBentoCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(195, 198, 207, 0.2)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },

  bentoCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  bentoCardTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: '#11335b',
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
  },

  addressText: {
    fontSize: 16,
    color: '#43474e',
    lineHeight: 24,
    marginBottom: 20,
  },
  
  mapContainer: {
    height: 160,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(195, 198, 207, 0.3)',
    backgroundColor: '#efeded',
  },
  mapImage: {
    width: '100%',
    height: '100%',
  },
  mapOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(17, 51, 91, 0.05)',
  },

  serviceList: {
    paddingTop: 8,
  },
  serviceItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 16,
    marginBottom: 24,
  },
  serviceIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f5f3f3',
    alignItems: 'center',
    justifyContent: 'center',
  },
  serviceContent: {
    flex: 1,
  },
  serviceName: {
    fontSize: 18,
    color: '#11335b',
    fontWeight: '500',
    marginBottom: 6,
  },
  serviceDetail: {
    fontSize: 14,
    color: '#74777f',
    marginBottom: 4,
  },
  
  wavyContainer: {
    width: 320,
    height: 190,
    alignSelf: 'center',
    marginTop: 20,
    position: 'relative',
  },
  wavyItem: {
    position: 'absolute',
    width: 64,
    height: 90,
    alignItems: 'center',
  },
  wavyIconBox: {
    width: 56,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
  },
  wavyText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#1b1c1c',
    textAlign: 'center',
    marginTop: 4,
  },

  footerSection: {
    marginTop: 64,
    paddingTop: 32,
    borderTopWidth: 1,
    borderTopColor: 'rgba(195, 198, 207, 0.1)',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  quoteIcon: {
    fontSize: 64,
    color: 'rgba(17, 51, 91, 0.4)',
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
    position: 'absolute',
    top: 10,
    left: 20,
  },
  scriptureQuote: {
    fontSize: 22,
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
    color: '#43474e',
    fontStyle: 'italic',
    textAlign: 'center',
    lineHeight: 32,
    zIndex: 1,
  },
  scriptureRef: {
    fontSize: 14,
    color: '#735c00',
    fontWeight: '600',
    letterSpacing: 1.5,
    marginTop: 16,
  }
});
