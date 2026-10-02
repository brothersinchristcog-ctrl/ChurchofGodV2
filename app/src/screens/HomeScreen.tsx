import React, { useEffect, useState, useRef, useCallback } from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  ScrollView, 
  TouchableOpacity,
  Pressable,
  Dimensions,
  ActivityIndicator,
  Image,
  RefreshControl,
  Alert,
  StatusBar,
  Platform,
  Share,
  Modal,
  Linking,
  Animated,
  Easing,
  PanResponder,
  InteractionManager,
  DeviceEventEmitter,
  BackHandler,
  ToastAndroid
} from 'react-native';

import { 
  Bell, 
  Book, 
  Play, 
  ChevronRight, 
  Share2, 
  Mic, 
  Heart, 
  Calendar, 
  MapPin,
  CircleDollarSign as DollarSign,
  BookOpen,
  MessageSquare,
  Users,
  MoreHorizontal,
  CheckCircle,
  Sun,
  Moon,
  Award,
  Music,
  FileText,
  X,
  Phone,
  Mail,
  Info,
  Shield,
  ShieldCheck,
  Check,
  Droplet,
  Image as ImageIcon,
  Video,
  QrCode
} from 'lucide-react-native';

import firestore from '@react-native-firebase/firestore';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import * as Location from 'expo-location';
import { useAuth } from '../context/AuthContext';
import Theme from '../theme/Theme';
import SalesforceService, { DailyPromise, ScheduleEvent, SalesforceMember, Sermon } from '../services/SalesforceService';
import Svg, { Path, Circle, Rect, Polygon, Defs, LinearGradient as SvgLinearGradient, Stop, Text as SvgText } from 'react-native-svg';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import AnimatedCheckCircle from '../components/AnimatedCheckCircle';

const YoutubeIcon = ({ size = 26, color = '#fff' }: { size?: number; color?: string }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
    <Path d="M23.498 6.163a3.003 3.003 0 0 0-2.11-2.11C19.517 3.545 12 3.545 12 3.545s-7.517 0-9.388.507a3.003 3.003 0 0 0-2.11 2.11C0 8.033 0 12 0 12s0 3.967.502 5.837a3.003 3.003 0 0 0 2.11 2.11c1.871.507 9.388.507 9.388.507s7.517 0 9.388-.507a3.003 3.003 0 0 0 2.11-2.11C24 15.967 24 12 24 12s0-3.967-.502-5.837z" />
    <Polygon points="9.5 8.5 15.5 12 9.5 15.5" fill="#ef4444" />
  </Svg>
);

const { width } = Dimensions.get('window');

// Utility to strip HTML tags
const stripHtml = (html: string | undefined): string => {
  if (!html) return '';
  return html.replace(/<[^>]+>/g, '').trim();
};

import { useTheme } from '../context/ThemeContext';
import FloatingCelebrationButton from '../components/FloatingCelebrationButton';

const EventMarqueeItem = React.memo(({ ev, index, isLive, formatTimeStr, onEventPress }: any) => (
  <TouchableOpacity
    key={ev.id || index}
    style={styles.marqueeItem}
    onPress={() => {
      if (isLive && ev.liveUrl) {
        Linking.openURL(ev.liveUrl);
      } else {
        onEventPress(ev);
      }
    }}
    activeOpacity={0.8}
  >
    {/* English block */}
    <View style={[styles.marqueeEventDot, isLive && { backgroundColor: '#dc2626' }]} />
    <Text style={styles.marqueeItemTitle}>{ev.title}</Text>
    <View style={styles.marqueeTimePill}>
      <Text style={styles.marqueeItemTime}>
        ⏰ {formatTimeStr(ev.startTime, 'en')}{ev.endTime ? ` - ${formatTimeStr(ev.endTime, 'en')}` : ''}
      </Text>
    </View>

    {/* Telugu block — always shown, with fallbacks */}
    <Text style={styles.marqueeLangDivider}>  |  </Text>
    <View style={[styles.marqueeEventDotTe, isLive && { backgroundColor: '#dc2626' }]} />
    <Text style={styles.marqueeItemTitleTe}>{ev.titleTelugu || ev.title}</Text>
    <View style={styles.marqueeTimePillTe}>
      <Text style={styles.marqueeItemTimeTe}>
        ⏰ {formatTimeStr(ev.startTime, 'te')}{ev.endTime ? ` - ${formatTimeStr(ev.endTime, 'te')}` : ''}
      </Text>
    </View>

    <Text style={styles.marqueeSeparator}>    ✦    </Text>
  </TouchableOpacity>
));

const EventMarquee = ({ events, onEventPress }: { events: any[], onEventPress: (event: any) => void }) => {
  const [contentWidth, setContentWidth] = useState(0);
  const scrollAnim = React.useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (contentWidth > 0) {
      scrollAnim.setValue(width);
      Animated.loop(
        Animated.timing(scrollAnim, {
          toValue: -contentWidth,
          duration: (contentWidth + width) * 35, // Faster scroll speed
          easing: Easing.linear,
          useNativeDriver: true,
        })
      ).start();
    }
  }, [contentWidth]);

  if (!events || events.length === 0) return null;

  const formatTimeStr = (timeStr: string, lang: 'en' | 'te' = 'en') => {
    if (!timeStr) return '';
    try {
      const timePart = timeStr.includes('T') ? timeStr.split('T')[1].split('.')[0] : timeStr;
      const [hours, minutes] = timePart.split(':');
      const h = parseInt(hours);
      const ampmEn = h >= 12 ? 'PM' : 'AM';
      
      let ampmTe = '';
      if (h < 12) ampmTe = 'ఉదయం'; // Morning
      else if (h < 16) ampmTe = 'మధ్యాహ్నం'; // Afternoon
      else if (h < 20) ampmTe = 'సాయంత్రం'; // Evening
      else ampmTe = 'రాత్రి'; // Night

      const formattedHours = h % 12 || 12;
      
      if (lang === 'te') {
        return `${ampmTe} ${formattedHours}:${minutes}`;
      }
      return `${formattedHours}:${minutes} ${ampmEn}`;
    } catch (e) {
      return timeStr;
    }
  };

  const getEventStatus = (event: ScheduleEvent) => {
    const today = new Date();
    const dateParts = (event.date || '').split('-');
    const eventYear = parseInt(dateParts[0]) || today.getFullYear();
    const eventMonth = parseInt(dateParts[1]) - 1 || 0;
    const eventDay = parseInt(dateParts[2]) || today.getDate();

    const parseTime = (timeStr: string) => {
      if (!timeStr) return null;
      const timePart = timeStr.includes('T') ? timeStr.split('T')[1] : timeStr;
      const [h, m, s] = timePart.split(':').map(Number);
      return new Date(eventYear, eventMonth, eventDay, h || 0, m || 0, s || 0);
    };

    const startDt = parseTime(event.startTime);
    const endDt = parseTime(event.endTime);

    if (!startDt) {
      const eventDate = new Date(eventYear, eventMonth, eventDay, 23, 59, 59);
      return today > eventDate ? 'completed' : 'upcoming';
    }

    if (today < startDt) return 'upcoming';
    if (endDt && today > endDt) return 'completed';
    return 'live';
  };

  const hasLiveEvents = events.some(ev => getEventStatus(ev) === 'live');

  return (
    <View style={styles.marqueeWrapper}>
      {/* Header row */}
      <View style={styles.marqueeTitleRow}>
        <Text style={styles.marqueeTitleEmoji}>🎉</Text>
        <Text style={styles.marqueeTitleText}>TODAY'S EVENTS  •  నేటి కార్యక్రమాలు</Text>
      </View>
      {/* Scrolling ticker */}
      <View style={styles.marqueeTicker}>
        <View style={[styles.marqueeTickerBadge, hasLiveEvents && { backgroundColor: '#dc2626' }]}>
          <Text style={styles.marqueeTickerBadgeTxt}>{hasLiveEvents ? 'LIVE' : 'TODAY'}</Text>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} scrollEnabled={false} style={styles.marqueeContent}>
          <Animated.View
            style={{ flexDirection: 'row', alignItems: 'center', paddingRight: width, transform: [{ translateX: scrollAnim }] }}
            onLayout={(e) => setContentWidth(e.nativeEvent.layout.width)}
          >
            {events.map((ev, index) => {
              const status = getEventStatus(ev);
              const isLive = status === 'live';
              return (
                <EventMarqueeItem 
                  key={ev.id || index} 
                  ev={ev} 
                  index={index} 
                  isLive={isLive} 
                  formatTimeStr={formatTimeStr} 
                  onEventPress={onEventPress} 
                />
              );
            })}
          </Animated.View>
        </ScrollView>
      </View>
    </View>
  );
};

const InfographicNav = ({ navigation, setShowMorePopup, isDark }: any) => {
  const { width } = Dimensions.get('window');
  
  // Height of the container
  const H = 140; 
  
  // Curve points for the arch
  const startX = -20;
  const startY = 70;
  const endX = width + 20;
  const endY = 70;
  const controlX = width / 2;
  const controlY = -30;

  const dCombined = `M ${startX} ${startY} Q ${controlX} ${controlY} ${endX} ${endY}`;

  // Positions for the buttons
  const cyMid = 25; 
  const cySide = 50;
  
  const cx1 = width * 0.20;
  const cx2 = width * 0.5;
  const cx3 = width * 0.80;

  const renderNode = (
    cx: number, cy: number, 
    title: string, 
    desc: string, 
    icon: any, 
    onPress: () => void
  ) => {
    const r = 26; // radius of the button
    
    return (
      <View style={{ position: 'absolute', left: cx - 60, top: cy - r, width: 120, alignItems: 'center' }}>
        <TouchableOpacity 
          style={{ 
            width: r * 2, 
            height: r * 2, 
            borderRadius: r, 
            backgroundColor: isDark ? '#1e293b' : '#fff', 
            alignItems: 'center', 
            justifyContent: 'center',
            borderWidth: 3,
            borderColor: isDark ? '#64748b' : '#94a3b8',
            shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 6, elevation: 6,
            marginBottom: 10
          }}
          onPress={onPress}
          activeOpacity={0.8}
        >
          {icon}
        </TouchableOpacity>
        <Text style={{ fontSize: 13, fontWeight: '800', color: isDark ? '#f8fafc' : '#1a2d5a', textAlign: 'center', marginBottom: 2 }}>{title}</Text>
        <Text style={{ fontSize: 10, color: isDark ? '#94a3b8' : '#64748b', textAlign: 'center' }}>{desc}</Text>
      </View>
    );
  };

  return (
    <View style={{ width, height: H, alignSelf: 'center', marginVertical: 10 }}>
      <Svg width={width} height={H} style={{ position: 'absolute' }}>
        <Defs>
          {isDark ? (
            <SvgLinearGradient id="gradCurved" x1="0" y1="0" x2="1" y2="0">
              <Stop offset="0" stopColor="#60a5fa" stopOpacity="1" />
              <Stop offset="0.5" stopColor="#3b82f6" stopOpacity="1" />
              <Stop offset="1" stopColor="#60a5fa" stopOpacity="1" />
            </SvgLinearGradient>
          ) : (
            <SvgLinearGradient id="gradCurved" x1="0" y1="0" x2="1" y2="0">
              <Stop offset="0" stopColor="#ff512f" stopOpacity="1" />
              <Stop offset="0.25" stopColor="#dd2476" stopOpacity="1" />
              <Stop offset="0.5" stopColor="#8b5cf6" stopOpacity="1" />
              <Stop offset="0.75" stopColor="#3b82f6" stopOpacity="1" />
              <Stop offset="1" stopColor="#2dd4bf" stopOpacity="1" />
            </SvgLinearGradient>
          )}
        </Defs>
        {/* Simple dashed arch curve */}
        <Path d={dCombined} fill="none" stroke="url(#gradCurved)" strokeWidth={2} strokeDasharray="6,6" strokeLinecap="round" />
      </Svg>

      {renderNode(cx1, cySide, 'About us', 'Our mission', <Users size={22} color="#ff512f" />, () => navigation.navigate('AboutUs'))}
      {renderNode(cx2, cyMid, 'Contact us', 'Get in touch', <MessageSquare size={22} color="#8b5cf6" />, () => navigation.navigate('ContactUs'))}
      {renderNode(cx3, cySide, 'Church gallery', 'Our memories', <ImageIcon size={22} color="#2dd4bf" />, () => navigation.navigate('MemberGalleryDashboard'))}
    </View>
  );
};

const UpcomingEventItem = React.memo(({ item, index, eventsLength, navigation, formatTime, formatTeluguDate, isActualAdmin }: any) => (
  <View>
    <TouchableOpacity 
      style={styles.ebItem} 
      onPress={() => navigation.navigate('EventDetails', { event: item })}
    >
      <View style={styles.ebThumbnailContainer}>
        <Image 
          source={{ uri: item.image || 'https://images.unsplash.com/photo-1438232992991-995b7058bbb3?q=80&w=400' }}
          style={styles.ebThumbnail}
          resizeMode="cover"
        />
      </View>
      <View style={styles.ebInfo}>
        <Text style={styles.ebTitle} numberOfLines={2}>
          {item.title} || {item.titleTelugu || item.title}
        </Text>
        
        <View style={styles.highlightRow}>
          <View style={styles.dateBadge}>
            <Calendar size={11} color="#1a2d5a" />
            <Text style={styles.badgeTextMain}>
              {new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} || {formatTeluguDate(item.date)}
            </Text>
          </View>
        </View>

        <View style={[styles.highlightRow, { marginTop: 4 }]}>
          <View style={styles.timeBadge}>
            <Play size={8} color="#c0392b" fill="#c0392b" style={{ transform: [{ rotate: '90deg' }] }} />
            <Text style={styles.timeBadgeText}>{formatTime(item.startTime)} – {formatTime(item.endTime)}</Text>
          </View>
        </View>

        <View style={[styles.ebMetaRow, { marginTop: 6, alignItems: 'flex-start' }]}>
          <MapPin size={11} color="#64748b" style={{ marginTop: 2 }} />
          <Text style={styles.ebMetaText}>{item.address || item.location || 'Church Main Hall'}</Text>
        </View>
        
        <Text style={styles.ebDetailsLink}>Details →</Text>
      </View>
    </TouchableOpacity>


    {index < eventsLength - 1 && <View style={styles.ebDivider} />}
  </View>
));

function Embers() {
  const embers = useRef([...Array(22)].map(() => ({
    scale: new Animated.Value(0),
    translateY: new Animated.Value(0),
    translateX: new Animated.Value(0),
    opacity: new Animated.Value(0),
  }))).current;

  useEffect(() => {
    embers.forEach((ember) => {
      const animateEmber = () => {
        const drift = (Math.random() - 0.5) * 40;
        const duration = 4000 + Math.random() * 4000;
        
        ember.scale.setValue(1);
        ember.translateY.setValue(0);
        ember.translateX.setValue(0);
        ember.opacity.setValue(0);
        
        Animated.sequence([
          Animated.delay(Math.random() * 7000),
          Animated.parallel([
            Animated.timing(ember.opacity, {
              toValue: 1,
              duration: duration * 0.15,
              useNativeDriver: true,
            }),
            Animated.timing(ember.translateY, {
              toValue: -200,
              duration: duration,
              easing: Easing.linear,
              useNativeDriver: true,
            }),
            Animated.timing(ember.translateX, {
              toValue: drift,
              duration: duration,
              easing: Easing.linear,
              useNativeDriver: true,
            }),
            Animated.sequence([
              Animated.delay(duration * 0.5),
              Animated.timing(ember.opacity, {
                toValue: 0,
                duration: duration * 0.5,
                useNativeDriver: true,
              })
            ]),
            Animated.timing(ember.scale, {
              toValue: 0.4,
              duration: duration,
              easing: Easing.linear,
              useNativeDriver: true,
            })
          ])
        ]).start(({ finished }) => {
          if (finished) animateEmber();
        });
      };
      
      animateEmber();
    });
  }, []);

  return (
    <View style={[StyleSheet.absoluteFill, { overflow: 'hidden', borderRadius: 30 }]} pointerEvents="none">
      {embers.map((ember, i) => {
        const size = 2 + Math.random() * 3;
        const left = 10 + Math.random() * 80;
        return (
          <Animated.View
            key={i}
            style={{
              position: 'absolute',
              bottom: -6,
              left: `${left}%`,
              width: size,
              height: size,
              borderRadius: size / 2,
              backgroundColor: '#ffe6b0',
              opacity: ember.opacity,
              transform: [
                { translateY: ember.translateY },
                { translateX: ember.translateX },
                { scale: ember.scale }
              ]
            }}
          />
        );
      })}
    </View>
  );
};

const AnimatedSweepLine = () => {
  const sweepAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.timing(sweepAnim, {
        toValue: 1,
        duration: 6000, // Very slow, elegant speed
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start();
  }, [sweepAnim]);

  const translateX = sweepAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-150, width + 50],
  });

  return (
    <Animated.View style={{ 
      position: 'absolute', 
      top: 0,
      bottom: 0, 
      left: 0, 
      width: 150, // Small glowing head
      transform: [{ translateX }] 
    }}>
      <LinearGradient
        colors={['transparent', '#60a5fa', '#fff', '#60a5fa', 'transparent']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={{ flex: 1 }}
      />
    </Animated.View>
  );
};

let hasDismissedSubModalThisSession = false;

export default function HomeScreen() {
  const navigation = useNavigation<any>();
  const { user, signOut, viewMode, setViewMode, member, setMember } = useAuth();
  const { mode, isDark, toggleTheme, colors } = useTheme();
  const [promise, setPromise] = useState<DailyPromise | null>(null);
  const [todayEvents, setTodayEvents] = useState<ScheduleEvent[]>([]);
  const [events, setEvents] = useState<ScheduleEvent[]>([]);
  const [latestSermon, setLatestSermon] = useState<Sermon | null>(null);
  const [latestPrayer, setLatestPrayer] = useState<any | null>(null);
  const [prayerCount, setPrayerCount] = useState(0);
  const [loading, setLoading] = useState(!member); 
  const [refreshing, setRefreshing] = useState(false);
  const [showGivePopup, setShowGivePopup] = useState(false);
  const [showMorePopup, setShowMorePopup] = useState(false);
  const [showDevotionPopup, setShowDevotionPopup] = useState(false);
  const [isLanguageModalVisible, setIsLanguageModalVisible] = useState(false);
  const { hasAccess } = useAuth(); // from AuthContext

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

  const handleRestrictedNavigate = (screenName: string, action?: () => void) => {
    if (!hasAccess) {
      DeviceEventEmitter.emit('SHOW_SUB_MODAL');
    } else {
      if (action) {
        action();
      } else {
        navigation.navigate(screenName);
      }
    }
  };

  // Popup subscription modal after 3 seconds if not active
  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout>;
    // We only want to trigger this if we definitively know they are not active
    if (!hasAccess) {
      timeout = setTimeout(() => {
        DeviceEventEmitter.emit('SHOW_SUB_MODAL');
      }, 3000);
    }
    return () => {
      if (timeout) clearTimeout(timeout);
    };
  }, [hasAccess]);

  const userTypeStr = member?.userType?.toLowerCase() || '';
  const isActualAdmin = userTypeStr === 'admin' || 
                        userTypeStr === 'pastor' || 
                        userTypeStr === 'system administrator' || 
                        userTypeStr.includes('admin') || 
                        userTypeStr.includes('pastor');

  const pan = useRef(new Animated.ValueXY()).current;
  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return Math.abs(gestureState.dx) > 5 || Math.abs(gestureState.dy) > 5;
      },
      onPanResponderGrant: () => {
        pan.setOffset({
          x: (pan.x as any)._value,
          y: (pan.y as any)._value
        });
        pan.setValue({ x: 0, y: 0 });
      },
      onPanResponderMove: Animated.event(
        [null, { dx: pan.x, dy: pan.y }],
        { useNativeDriver: false }
      ),
      onPanResponderRelease: () => {
        pan.flattenOffset();
      }
    })
  ).current;

  const [promiseThumbnail, setPromiseThumbnail] = useState<string | null>(null);
  const [carouselSlide, setCarouselSlide] = useState(0); // 0 = text, 1 = image
  const carouselScrollRef = useRef<ScrollView>(null);

  const fetchData = () => {
    // 1. Fetch Member & Prayers
    if (user?.phoneNumber) {
      SalesforceService.checkContactExists(user.phoneNumber)
        .then(res => {
          if (res?.exists && res.member) {
            setMember(res.member);
            AsyncStorage.setItem('@cached_member', JSON.stringify(res.member)).catch(() => {});
            SalesforceService.updateLastAppOpened(res.member.id);
            // Fetch prayers based on member ID
            SalesforceService.getPrayerRequests({ contactId: res.member.id })
              .then(prayers => {
                if (prayers && prayers.length > 0) {
                  setLatestPrayer(prayers[0]);
                  setPrayerCount(prayers.length);
                }
              }).catch(console.error);
          }
        }).catch(console.error);
    }

    // 2. Fetch Daily Promise
    SalesforceService.getDailyPromise()
      .then(prom => {
        if (prom) {
          setPromise(prom);
          setPromiseThumbnail(prom.imageUrl || null);
          AsyncStorage.setItem('@cached_daily_promise', JSON.stringify(prom)).catch(() => {});
        } else {
          setPromise(null);
          setPromiseThumbnail(null);
          AsyncStorage.removeItem('@cached_daily_promise').catch(() => {});
        }
      }).catch(console.error);

    // 3. Fetch Today's Events
    SalesforceService.getTodayEvents()
      .then(res => setTodayEvents(res || []))
      .catch(console.error);

    // 4. Fetch Upcoming Events
    SalesforceService.getUpcomingEvents(3)
      .then(res => setEvents(res || []))
      .catch(console.error);

    // 5. Fetch Latest Sermon
    SalesforceService.getSermons(1)
      .then(res => {
        if (res && res.length > 0) setLatestSermon(res[0]);
      }).catch(console.error);

    // Stop refreshing spinner quickly so the UI feels snappy
    setTimeout(() => {
      setLoading(false);
      setRefreshing(false);
    }, 800);
  };

  useEffect(() => {
    const loadCache = async () => {
      try {
        const cachedStr = await AsyncStorage.getItem('@cached_daily_promise');
        if (cachedStr) {
          const prom = JSON.parse(cachedStr);
          setPromise(prom);
          if (prom.imageUrl) setPromiseThumbnail(prom.imageUrl);
        }
      } catch (e) {}
    };
    loadCache();

    const interactionPromise = InteractionManager.runAfterInteractions(() => {
      fetchData();
    });

    return () => interactionPromise.cancel();
  }, [user]);

  // Carousel auto-slide logic
  useEffect(() => {
    setCarouselSlide(0);
    const numSlides = promiseThumbnail ? 3 : 2;
    const interval = setInterval(() => {
      setCarouselSlide(prev => {
        const next = (prev + 1) % numSlides;
        carouselScrollRef.current?.scrollTo({ x: next * (width - 32), animated: true });
        return next;
      });
    }, 5000);
    return () => clearInterval(interval);
  }, [promiseThumbnail]);

  const goToSlide = (idx: number) => {
    setCarouselSlide(idx);
    carouselScrollRef.current?.scrollTo({ x: idx * (width - 32), animated: true });
  };

  const handleOpenMembers = () => {
    if (!member) {
      Alert.alert('Sign In Required', 'Please complete your profile configuration first.');
      return;
    }
    if (!member.accountId) {
      Alert.alert('No Household Linked', 'Your profile is not linked to any household. Please contact the administrator.');
      return;
    }
    navigation.navigate('Members');
  };

  const handleSharePromise = async () => {
    if (!promise) return;
    try {
      const verseEn = stripHtml(promise.verse);
      const verseTe = stripHtml(promise.verseTelugu);
      const message = `Today's Promise · ఈ రోజు వాగ్దానం\n\n"${verseEn}"\n— ${promise.verseReferenceEn || 'Scripture'}\n\n"${verseTe}"\n— ${promise.verseReferenceTe || 'వాగ్దానం'}\n\nWatch Devotional: https://youtu.be/${promise.youtubeId}\n\nBrothers in Christ Fellowship 🙏`;
      await Share.share({ message });
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const getTeluguDay = () => {
    const days = ['ఆదివారం', 'సోమవారం', 'మంగళవారం', 'బుధవారం', 'గురువారం', 'శుక్రవారం', 'శనివారం'];
    return days[new Date().getDay()];
  };

  const formatTime = (timeStr: string) => {
    if (!timeStr) return '--:--';
    try {
      const timePart = timeStr.includes('T') ? timeStr.split('T')[1].split('.')[0] : timeStr;
      const [hours, minutes] = timePart.split(':');
      const h = parseInt(hours);
      const ampm = h >= 12 ? 'PM' : 'AM';
      const formattedHours = h % 12 || 12;
      return `${formattedHours}:${minutes} ${ampm}`;
    } catch (e) {
      return timeStr;
    }
  };

  const formatTeluguDate = (dateStr: string) => {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      const monthsTe = ['జనవరి', 'ఫిబ్రవరి', 'మార్చి', 'ఏప్రిల్', 'మే', 'జూన్', 'జూలై', 'ఆగస్టు', 'సెప్టెంబర్', 'అక్టోబర్', 'నవంబర్', 'డిసెంబర్'];
      return `${monthsTe[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
    } catch (e) {
      return dateStr;
    }
  };

  const scrollY = useRef(new Animated.Value(0)).current;
  const [headerHeight, setHeaderHeight] = useState(Platform.OS === 'ios' ? 230 : 215);
  const [topPartHeight, setTopPartHeight] = useState(Platform.OS === 'ios' ? 112 : 97);

  const [animateAttendance, setAnimateAttendance] = useState(false);
  const attendanceBadgeY = useRef(0);

  useEffect(() => {
    if (animateAttendance) return;
    const id = scrollY.addListener(({ value }) => {
      if (attendanceBadgeY.current > 0 && value + Dimensions.get('window').height * 0.9 > attendanceBadgeY.current) {
        setAnimateAttendance(true);
      }
    });
    return () => scrollY.removeListener(id);
  }, [animateAttendance, scrollY]);

  if (loading && !refreshing) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: '#1a2d5a' }]}>
        <ActivityIndicator size="large" color="#FCD34D" />
        <Text style={styles.screenLoadingText}>Church of GOD — A Gateway to Heaven</Text>
      </View>
    );
  }

  const headerTranslateY = scrollY.interpolate({
    inputRange: [0, Math.max(1, topPartHeight)],
    outputRange: [0, -topPartHeight],
    extrapolate: 'clamp',
  });

  return (
    <View style={[styles.mainContainer, { backgroundColor: isDark ? '#0f172a' : '#f8fafc' }]}>
      <StatusBar barStyle="light-content" backgroundColor="#1a2d5a" />
      
      <Animated.View style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 10,
        transform: [{ translateY: headerTranslateY }]
      }}
      onLayout={(e) => setHeaderHeight(e.nativeEvent.layout.height)}
      >
      <LinearGradient
        colors={isDark ? ['#1e40af', '#3b82f6'] : ['transparent', 'transparent']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={{
          borderBottomLeftRadius: 30,
          borderBottomRightRadius: 30,
          paddingBottom: isDark ? 4 : 0,
          elevation: 8,
          shadowColor: '#030a1e',
          shadowOpacity: 0.75,
          shadowRadius: 15,
          shadowOffset: { width: 0, height: 10 },
          overflow: 'hidden', // Add hidden so sweep doesn't bleed horizontally
        }}
      >
        {isDark && <AnimatedSweepLine />}
        <LinearGradient 
          colors={['#0a2350', '#071638', '#040c22']}
          start={{ x: 0, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={[styles.appHeader, { elevation: 0, shadowOpacity: 0 }]}
        >
          <Embers />
          <View 
            style={styles.headerTopRow}
            onLayout={(e) => setTopPartHeight(e.nativeEvent.layout.height + (Platform.OS === 'ios' ? 60 : 45))}
          >
            <View style={styles.headerLeft}>
              <View style={styles.emblemContainer}>
                <Image 
                  source={require('../../assets/logo.png')} 
                  style={{ width: 48, height: 48, borderRadius: 24 }} 
                  resizeMode="cover" 
                />
              </View>
              <View style={styles.titleCol}>
                <Text style={styles.hdTitle}>Church of GOD</Text>
                <Text style={styles.hdSub}>Kristhunandu Sahodarulu Sahavasamu</Text>
              </View>
            </View>

            <View style={styles.headerRight}>
              <TouchableOpacity style={styles.actionIconButton} onPress={() => navigation.navigate('Updates')}>
                <Svg viewBox="0 0 24 24" fill="none" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" width={16} height={16}>
                  <Path d="M18 8a6 6 0 10-12 0c0 7-3 9-3 9h18s-3-2-3-9" stroke="#e8d9ac" />
                  <Path d="M13.73 21a2 2 0 01-3.46 0" stroke="#e8d9ac" />
                </Svg>
                <View style={styles.notifBadge} />
              </TouchableOpacity>
            </View>
          </View>

          <LinearGradient 
            colors={['rgba(212, 178, 106, 0)', 'rgba(212, 178, 106, 0.7)', 'rgba(212, 178, 106, 0)']} 
            start={{ x: 0, y: 0 }} 
            end={{ x: 1, y: 0 }} 
            style={styles.headerRule} 
          />

          <View style={[styles.greetingSection, { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }]}>
            <View style={{ flex: 1 }}>
              <View style={{ height: 44, justifyContent: 'center' }}>
                <Svg height="100%" width="100%">
                  <Defs>
                    <SvgLinearGradient id="greetingGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                      <Stop offset="0%" stopColor="#fde047" />
                      <Stop offset="50%" stopColor="#f59e0b" />
                      <Stop offset="100%" stopColor="#ef4444" />
                    </SvgLinearGradient>
                  </Defs>
                  <SvgText
                    fill="url(#greetingGrad)"
                    fontSize="34"
                    fontFamily="DancingScript_600SemiBold"
                    y="34"
                  >
                    {getGreeting()},
                  </SvgText>
                </Svg>
              </View>
              <Text style={styles.userNameGold}>{member?.name || user?.displayName || 'Member'}</Text>
            </View>

            <View style={{ alignItems: 'center', marginLeft: 16, marginRight: 24, transform: [{ scale: 1.2 }] }}>
              <View style={{ width: 56, height: 62, justifyContent: 'center', alignItems: 'center' }}>
                <Svg width="100%" height="100%" viewBox="0 0 100 100" style={{ position: 'absolute' }}>
                  <Polygon
                    points="50,5 90,28 90,72 50,95 10,72 10,28"
                    fill="rgba(232, 217, 172, 0.12)"
                    stroke="#e8d9ac"
                    strokeWidth="4"
                  />
                </Svg>
                <View style={{ alignItems: 'center', justifyContent: 'center', marginTop: 1 }}>
                  <Text style={{ color: '#e8d9ac', fontSize: 11, fontWeight: '800', textTransform: 'uppercase' }}>
                    {new Date().toLocaleDateString('en-US', { month: 'short' })}
                  </Text>
                  <Text style={{ color: '#ffffff', fontSize: 18, fontWeight: '800', marginTop: -3 }}>
                    {new Date().getDate()}
                  </Text>
                </View>
              </View>
              <Text style={{ color: '#7f96b8', fontSize: 11, fontWeight: '700', marginTop: 6, letterSpacing: 0.5 }}>
                {new Date().toLocaleDateString('en-US', { weekday: 'long' })}
              </Text>
            </View>
          </View>
        </LinearGradient>
        </LinearGradient>
      </Animated.View>

      <Animated.ScrollView 
        style={styles.scroll} 
        showsVerticalScrollIndicator={false}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: true }
        )}
        scrollEventThrottle={16}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#1a2d5a" progressViewOffset={headerHeight} />
        }
      >
        <View style={{ height: headerHeight }} />
        <EventMarquee events={todayEvents} onEventPress={(event) => navigation.navigate('EventDetails', { event })} />
        <View style={styles.contentPad}>
          {/* ── Daily Promise Carousel ── */}
          <View style={styles.promiseHero}>
            {/* Slides */}
            <ScrollView
              ref={carouselScrollRef}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              scrollEventThrottle={16}
              onMomentumScrollEnd={(e) => {
                const slide = Math.round(e.nativeEvent.contentOffset.x / (width - 32));
                setCarouselSlide(slide);
              }}
              style={{ borderRadius: 20 }}
            >
              {/* Slide 1 — Promise Text */}
              <LinearGradient 
                colors={['#0f172a', '#2b4a92']} 
                start={{ x: 0, y: 0 }} 
                end={{ x: 1, y: 1 }} 
                style={[styles.phSlide, styles.phInner]}
              >
                {/* Top Right Circles Background */}
                <View style={styles.phCircleBg1} />
                <View style={styles.phCircleBg2} />

                <View style={styles.phHeaderCenter}>
                  <Text style={styles.phLabelCenter}>TODAY'S PROMISE</Text>
                  <Text style={styles.phTeSubCenter}>ఈ రోజు వాగ్దానం</Text>
                  <View style={styles.phRedDivider} />
                </View>

                <Text style={styles.phEnLeft}>{promise ? `"${stripHtml(promise.verse)}"` : ''}</Text>
                <Text style={styles.phRefEnLeft}>{promise ? (promise.verseReferenceEn || promise.verseReference || '').toUpperCase() : ''}</Text>
                <Text style={styles.phTeLeft}>{promise?.verseTelugu ? `"${stripHtml(promise.verseTelugu)}"` : ''}</Text>
                <Text style={[styles.phRefEnLeft, { marginBottom: 32 }]}>{promise ? (promise.verseReferenceTe || '').toUpperCase() : ''}</Text>

                <View style={styles.phActionsBottom}>
                  <TouchableOpacity 
                    style={styles.phSmallBtn} 
                    onPress={() => navigation.navigate('DailyVideo', { 
                      youtubeId: promise?.youtubeId,
                      videoTitle: promise?.videoTitle,
                      pastor: promise?.pastor
                    })}
                  >
                    <Play size={14} color="#fff" fill="#fff" />
                    <Text style={styles.phSmallBtnTxt}>Watch</Text>
                  </TouchableOpacity>

                  <TouchableOpacity style={styles.phSmallBtn} onPress={handleSharePromise}>
                    <Share2 size={14} color="#fff" />
                    <Text style={styles.phSmallBtnTxt}>Share</Text>
                  </TouchableOpacity>
                </View>
              </LinearGradient>

              {/* Slide 2 — Thumbnail (only if image exists) */}
              {promiseThumbnail && (
                <View style={[styles.phSlide, { borderRadius: 24, padding: 0, overflow: 'hidden' }]}>
                  <LinearGradient 
                    colors={['#0f172a', '#2b4a92']} 
                    start={{ x: 0, y: 0 }} 
                    end={{ x: 1, y: 1 }} 
                    style={StyleSheet.absoluteFill}
                  />
                  
                  <View style={[styles.phHeaderCenter, { zIndex: 2, padding: 24, paddingBottom: 16 }]}>
                    <Text style={styles.phLabelCenter}>TODAY'S PROMISE</Text>
                    <Text style={styles.phTeSubCenter}>ఈ రోజు వాగ్దానం</Text>
                    <View style={styles.phRedDivider} />
                  </View>

                  <View style={{
                    width: '96%',
                    alignSelf: 'center',
                    aspectRatio: 16 / 9,
                    shadowColor: '#000',
                    shadowOpacity: 0.4,
                    shadowRadius: 25,
                    shadowOffset: { width: 0, height: 10 },
                    elevation: 15,
                    borderRadius: 16,
                    backgroundColor: '#1e293b',
                    marginBottom: 16,
                  }}>
                    <Image
                      source={{ uri: promiseThumbnail }}
                      style={{ width: '100%', height: '100%', borderRadius: 16 }}
                      resizeMode="cover"
                    />
                  </View>
                </View>
              )}
              {/* Service Timings Slide */}
              <LinearGradient 
                colors={['#0f172a', '#2b4a92']} 
                start={{ x: 0, y: 0 }} 
                end={{ x: 1, y: 1 }} 
                style={[styles.phSlide, styles.phInner, { padding: 24 }]}
              >
                <View style={styles.phHeaderCenter}>
                  <Text style={[styles.phLabelCenter, { color: '#cbd5e1', fontSize: 14 }]}>OUR SERVICE TIMINGS</Text>
                  <View style={[styles.phRedDivider, { backgroundColor: '#cbd5e1', width: 60, marginTop: 8 }]} />
                </View>

                <View style={{ marginTop: 20, width: '100%' }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 14 }}>
                    <Text style={{ color: '#fff', fontWeight: '700', fontSize: 14 }}>Sunday Service</Text>
                    <Text style={{ color: '#cbd5e1', fontSize: 13, fontWeight: '500' }}>10:30 AM - 1:00 PM</Text>
                  </View>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 14 }}>
                    <Text style={{ color: '#fff', fontWeight: '700', fontSize: 14 }}>Bible Study</Text>
                    <Text style={{ color: '#cbd5e1', fontSize: 13, fontWeight: '500' }}>6:30 PM - 8:00 PM</Text>
                  </View>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 14 }}>
                    <Text style={{ color: '#fff', fontWeight: '700', fontSize: 14 }}>Women's Fasting</Text>
                    <Text style={{ color: '#cbd5e1', fontSize: 13, fontWeight: '500' }}>11:00 AM - 3:00 PM</Text>
                  </View>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 14 }}>
                    <View>
                      <Text style={{ color: '#fff', fontWeight: '700', fontSize: 14 }}>Special Meeting</Text>
                      <Text style={{ color: '#94a3b8', fontSize: 10, marginTop: 2 }}>(2nd Saturday in every month)</Text>
                    </View>
                    <Text style={{ color: '#cbd5e1', fontSize: 13, fontWeight: '500' }}>10:00 AM - 4:00 PM</Text>
                  </View>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <View>
                      <Text style={{ color: '#fff', fontWeight: '700', fontSize: 14 }}>All Night Prayer</Text>
                      <Text style={{ color: '#94a3b8', fontSize: 10, marginTop: 2 }}>(Last Friday in every month)</Text>
                    </View>
                    <Text style={{ color: '#cbd5e1', fontSize: 13, fontWeight: '500' }}>9:00 PM - 4:00 AM</Text>
                  </View>
                </View>
              </LinearGradient>
            </ScrollView>

            {/* Dot Indicators */}
            <View style={styles.dotRow}>
              {Array.from({ length: promiseThumbnail ? 3 : 2 }).map((_, i) => (
                <TouchableOpacity key={i} onPress={() => goToSlide(i)} style={styles.dotHit}>
                  <View style={[styles.dot, carouselSlide === i && styles.dotActive]} />
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <Text style={[styles.secLbl, isDark && { color: '#fff' }]}>QUICK ACCESS</Text>
          <View style={styles.iconGrid}>
            <GridItem icon={<Mic size={26} color="#fff" />} label="Sermons" color="#1a2d5a" onPress={() => handleRestrictedNavigate('Sermons')} />
            <GridItem icon={<Heart size={26} color="#fff" />} label="Prayer Wall" color="#c0392b" onPress={() => navigation.navigate('Prayer')} />
            <GridItem icon={<Calendar size={26} color="#fff" />} label="Events" color="#0F766E" onPress={() => handleRestrictedNavigate('Events')} />
            <GridItem icon={<DollarSign size={26} color="#fff" />} label="Give / Tithe" color="#f0a500" onPress={() => setShowGivePopup(true)} />
            
            <GridItem icon={<BookOpen size={26} color="#fff" />} label="Bible" color="#7C3AED" onPress={() => handleRestrictedNavigate('Bible')} />
            <GridItem icon={<Music size={26} color="#fff" />} label="Songs" color="#0369a1" onPress={() => handleRestrictedNavigate('Songs')} />
            <GridItem icon={<FileText size={26} color="#fff" />} label="Sermon Notes" color="#BE185D" onPress={() => navigation.navigate('MemberNotes')} />
            <GridItem icon={<Award size={26} color="#fff" />} label="Bible Plans" color="#374151" onPress={() => handleRestrictedNavigate('BiblePlans')} />

            <GridItem icon={<Bell size={26} color="#fff" />} label="Updates" color="#0284c7" onPress={() => navigation.navigate('Updates')} />
            <GridItem icon={<YoutubeIcon size={26} color="#fff" />} label="YouTube Live" color="#ef4444" onPress={() => handleRestrictedNavigate('', () => Linking.openURL('https://www.youtube.com/@Brothersinchristfellowship/live'))} />
            <GridItem icon={<Users size={26} color="#fff" />} label="Members" color="#db2777" onPress={handleOpenMembers} />
            <GridItem icon={<Video size={26} color="#fff" />} label="Bible Classes" color="#b45309" onPress={() => handleRestrictedNavigate('BibleClasses')} />
          </View>

          <View 
            style={{ alignItems: 'center', marginTop: 12, marginBottom: 4 }}
            onLayout={(e) => {
              // Add offset since the badge is inside the scrollview content
              attendanceBadgeY.current = e.nativeEvent.layout.y;
            }}
          >
            <TouchableOpacity 
              style={{
                flexDirection: 'row', 
                alignItems: 'center', 
                backgroundColor: '#16a34a', 
                paddingVertical: 10, 
                paddingHorizontal: 24, 
                borderRadius: 24,
                elevation: 2,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.1,
                shadowRadius: 3
              }} 
              onPress={() => handleRestrictedNavigate('Attendance')}
            >
              <AnimatedCheckCircle size={20} color="#fff" style={{ marginRight: 8 }} animate={animateAttendance} />
              <Text style={{ color: '#fff', fontSize: 16, fontWeight: 'bold' }}>Attendance</Text>
            </TouchableOpacity>
          </View>

          <InfographicNav 
            navigation={navigation} 
            setShowMorePopup={setShowMorePopup} isDark={isDark} />

          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginHorizontal: 24, marginBottom: 12, marginTop: 15 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Calendar size={20} color={isDark ? '#fff' : '#1a2d5a'} style={{ marginRight: 8 }} />
              <Text style={{ fontSize: 18, fontWeight: '800', color: isDark ? '#fff' : '#1a2d5a' }}>Upcoming Events</Text>
            </View>
            <TouchableOpacity onPress={() => handleRestrictedNavigate('Events')}>
              <Text style={{ fontSize: 13, color: isDark ? '#94a3b8' : '#64748b', fontWeight: '600' }}>See all →</Text>
            </TouchableOpacity>
          </View>

          <View style={[styles.eventBanner, { marginTop: 0 }]}>
            <View style={styles.ebList}>
              {events.length > 0 ? (
                events.map((item: any, index: number) => (
                  <UpcomingEventItem 
                    key={item.id} 
                    item={item} 
                    index={index} 
                    eventsLength={events.length}
                    navigation={navigation}
                    formatTime={formatTime}
                    formatTeluguDate={formatTeluguDate}
                    isActualAdmin={isActualAdmin}
                  />
                ))
              ) : (
                <View style={styles.emptyEvents}>
                  <Calendar size={32} color="#94a3b8" />
                  <Text style={styles.emptyEventsTxt}>No upcoming events scheduled</Text>
                  <Text style={styles.emptyEventsSub}>Check back soon for updates!</Text>
                </View>
              )}
            </View>
          </View>

          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginHorizontal: 24, marginBottom: 12, marginTop: 15 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Mic size={20} color={isDark ? '#fff' : '#1a2d5a'} style={{ marginRight: 8 }} />
              <Text style={{ fontSize: 18, fontWeight: '800', color: isDark ? '#fff' : '#1a2d5a' }}>Latest Sermon</Text>
            </View>
            <TouchableOpacity onPress={() => handleRestrictedNavigate('Sermons')}>
              <Text style={{ fontSize: 13, color: isDark ? '#94a3b8' : '#64748b', fontWeight: '600' }}>See all →</Text>
            </TouchableOpacity>
          </View>
          <View style={[styles.sermonCard, { marginTop: 0 }]}>
            <TouchableOpacity style={styles.scBody} onPress={() => navigation.navigate('Sermons')}>
              <View style={styles.scThumb}>
                <View style={styles.playIconOverlay}>
                   <Play size={20} color="#fff" fill="#c0392b" />
                </View>
              </View>
              <View style={styles.scInfo}>
                <Text style={styles.scTitle} numberOfLines={1}>
                  {latestSermon?.title} {latestSermon?.titleTelugu ? `|| ${latestSermon.titleTelugu}` : ''}
                </Text>
                <Text style={styles.scMeta} numberOfLines={1}>{latestSermon?.pastor || 'Pastor Daniel Raju'} · {latestSermon?.date || 'Apr 13'} · {latestSermon?.duration || '42 min'} · 1,240 views</Text>
              </View>
              <View style={styles.playBtnCircle}>
                <Play size={18} color="#1a2d5a" />
              </View>
            </TouchableOpacity>
          </View>

          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginHorizontal: 24, marginBottom: 12, marginTop: 15 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Heart size={20} color={isDark ? '#fff' : '#1a2d5a'} style={{ marginRight: 8 }} />
              <Text style={{ fontSize: 18, fontWeight: '800', color: isDark ? '#fff' : '#1a2d5a' }}>Prayer Wall</Text>
            </View>
            <Text style={{ fontSize: 13, color: isDark ? '#94a3b8' : '#64748b', fontWeight: '600' }}>{prayerCount} requests</Text>
          </View>
          <View style={[styles.prayerCard, { marginTop: 0, marginBottom: 40 }]}>
            <TouchableOpacity style={styles.pcBody} onPress={() => navigation.navigate('Prayer')}>
              <View style={styles.pcTextContainer}>
                <Text style={styles.pcText} numberOfLines={3}>
                  {latestPrayer ? `"${latestPrayer.text}" — ${latestPrayer.name}` : '"Please pray for our community and the growth of our church." — Faith Member'}
                </Text>
              </View>
              <View style={styles.pcFoot}>
                <TouchableOpacity style={styles.prayedBtn} onPress={() => Alert.alert('Prayed', 'Thank you for praying!')}>
                   <CheckCircle size={14} color="#4C1D95" />
                   <Text style={styles.prayedBtnTxt}>I prayed</Text>
                </TouchableOpacity>
                <Text style={styles.pcSeeAll}>See all prayers →</Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>
      </Animated.ScrollView>

      {isActualAdmin && viewMode === 'member' && (
        <Animated.View
          {...panResponder.panHandlers}
          style={[
            styles.adminFloatingBtn,
            { transform: [{ translateX: pan.x }, { translateY: pan.y }] }
          ]}
        >
          <Pressable 
            style={({ pressed }) => [
              { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
              pressed && { opacity: 0.7 }
            ]} 
            onPress={() => setViewMode('admin')}
          >
            <ShieldCheck size={20} color="#FCD34D" style={{ marginRight: 8 }} />
            <Text style={styles.adminBtnText}>Admin View</Text>
          </Pressable>
        </Animated.View>
      )}

      {/* Give / Tithe Coming Soon Modal */}
      <Modal
        visible={showGivePopup}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowGivePopup(false)}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center' }}>
          <View style={{ 
            width: '85%', 
            backgroundColor: isDark ? '#1e293b' : '#fff', 
            borderRadius: 24, 
            padding: 24, 
            alignItems: 'center', 
            elevation: 10, 
            shadowColor: '#000', 
            shadowOffset: { width: 0, height: 4 }, 
            shadowOpacity: 0.3, 
            shadowRadius: 8 
          }}>
            <View style={{ 
              width: 64, 
              height: 64, 
              borderRadius: 32, 
              backgroundColor: 'rgba(240, 165, 0, 0.15)', 
              justifyContent: 'center', 
              alignItems: 'center', 
              marginBottom: 16 
            }}>
              <DollarSign size={32} color="#f0a500" />
            </View>
            <Text style={{ 
              fontSize: 22, 
              fontWeight: '700', 
              color: isDark ? '#f8fafc' : '#0f172a', 
              marginBottom: 8, 
              textAlign: 'center' 
            }}>
              Give / Tithe
            </Text>
            <Text style={{ 
              fontSize: 16, 
              color: isDark ? '#94a3b8' : '#475569', 
              textAlign: 'center', 
              marginBottom: 24, 
              lineHeight: 24 
            }}>
              This feature will be available soon!
            </Text>
            <TouchableOpacity 
              style={{
                backgroundColor: '#f0a500', 
                paddingVertical: 12, 
                paddingHorizontal: 32, 
                borderRadius: 100, 
                width: '100%' 
              }}
              onPress={() => setShowGivePopup(false)}
            >
              <Text style={{ color: '#fff', fontSize: 16, fontWeight: '600', textAlign: 'center' }}>Okay</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* More Features Coming Soon Modal */}
      <Modal
        visible={showMorePopup}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowMorePopup(false)}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center' }}>
          <View style={{ 
            width: '85%', 
            backgroundColor: isDark ? '#1e293b' : '#fff', 
            borderRadius: 24, 
            padding: 24, 
            alignItems: 'center', 
            elevation: 10, 
            shadowColor: '#000', 
            shadowOffset: { width: 0, height: 4 }, 
            shadowOpacity: 0.3, 
            shadowRadius: 8 
          }}>
            <View style={{ 
              width: 64, 
              height: 64, 
              borderRadius: 32, 
              backgroundColor: 'rgba(100, 116, 139, 0.15)', 
              justifyContent: 'center', 
              alignItems: 'center', 
              marginBottom: 16 
            }}>
              <MoreHorizontal size={32} color="#64748b" />
            </View>
            <Text style={{ 
              fontSize: 22, 
              fontWeight: '700', 
              color: isDark ? '#f8fafc' : '#0f172a', 
              marginBottom: 8, 
              textAlign: 'center' 
            }}>
              More Features
            </Text>
            <Text style={{ 
              fontSize: 16, 
              color: isDark ? '#94a3b8' : '#475569', 
              textAlign: 'center', 
              marginBottom: 24, 
              lineHeight: 24 
            }}>
              Exciting new features are coming soon!
            </Text>
            <TouchableOpacity 
              style={{
                backgroundColor: '#1a2d5a',
                paddingVertical: 14,
                paddingHorizontal: 32,
                borderRadius: 100,
                width: '100%',
                alignItems: 'center'
              }}
              onPress={() => setShowMorePopup(false)}
            >
              <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700' }}>Okay</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Devotion Coming Soon Modal */}
      <Modal
        visible={showDevotionPopup}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowDevotionPopup(false)}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center' }}>
          <View style={{ 
            width: '85%', 
            backgroundColor: isDark ? '#1e293b' : '#fff', 
            borderRadius: 24, 
            padding: 24, 
            alignItems: 'center', 
            elevation: 10, 
            shadowColor: '#000', 
            shadowOffset: { width: 0, height: 4 }, 
            shadowOpacity: 0.3, 
            shadowRadius: 8 
          }}>
            <View style={{ 
              width: 64, 
              height: 64, 
              borderRadius: 32, 
              backgroundColor: 'rgba(180, 83, 9, 0.15)', 
              justifyContent: 'center', 
              alignItems: 'center', 
              marginBottom: 16 
            }}>
              <Sun size={32} color="#b45309" />
            </View>
            <Text style={{ 
              fontSize: 22, 
              fontWeight: '700', 
              color: isDark ? '#f8fafc' : '#0f172a', 
              marginBottom: 8, 
              textAlign: 'center' 
            }}>
              Daily Devotion
            </Text>
            <Text style={{ 
              fontSize: 16, 
              color: isDark ? '#94a3b8' : '#475569', 
              textAlign: 'center', 
              marginBottom: 24, 
              lineHeight: 24 
            }}>
              Devotion feeds coming soon!
            </Text>
            <TouchableOpacity 
              style={{
                backgroundColor: '#1a2d5a',
                paddingVertical: 14,
                paddingHorizontal: 32,
                borderRadius: 100,
                width: '100%',
                alignItems: 'center'
              }}
              onPress={() => setShowDevotionPopup(false)}
            >
              <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700' }}>Okay</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Floating Celebration Button — overlaid above all content */}
      <FloatingCelebrationButton navigation={navigation} />

    </View>
  );
}

function GridItem({ icon, label, color, onPress }: { icon: any; label: string; color: string; onPress: () => void }) {
  const { isDark } = useTheme();
  return (
    <TouchableOpacity style={styles.iconItem} onPress={onPress}>
      <View style={[styles.iconBox, { backgroundColor: color }]}>
        {icon}
      </View>
      <Text style={[styles.iconLbl, isDark && { color: '#fff' }]} numberOfLines={2}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  mainContainer: { flex: 1, backgroundColor: '#f8fafc' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#1a2d5a' },
  screenLoadingText: { color: '#FCD34D', marginTop: 15, fontSize: 14, fontWeight: '700' },
  
  scroll: { flex: 1 },
  contentPad: { paddingBottom: 120 },
  
  appHeader: {
    paddingTop: Platform.OS === 'ios' ? 60 : 45,
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    overflow: 'hidden',
    elevation: 8,
    shadowColor: '#030a1e',
    shadowOpacity: 0.75,
    shadowRadius: 15,
    shadowOffset: { width: 0, height: 10 },
  },
  headerTopRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', zIndex: 2 },
  headerLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  emblemContainer: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#071638',
    borderWidth: 1.5,
    borderColor: '#d4b26a',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2,
  },
  titleCol: { marginLeft: 12 },
  hdTitle: { color: '#e8d9ac', fontSize: 19, fontWeight: '600' },
  hdSub: { color: '#7f96b8', fontSize: 11, marginTop: 2 },
  
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  actionIconButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(212,178,106,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(212,178,106,0.35)',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    zIndex: 2,
  },
  notifBadge: { position: 'absolute', top: 6, right: 6, width: 6, height: 6, backgroundColor: '#e0637e', borderRadius: 3 },
  avatarWrapper: { width: 38, height: 38, position: 'relative', zIndex: 2 },
  avatarImg: { width: 38, height: 38, borderRadius: 19, borderWidth: 2, borderColor: '#0a2350' },
  avatarPlaceholder: { width: 38, height: 38, borderRadius: 19, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#0a2350' },
  avatarLetter: { color: '#fff', fontWeight: '800', fontSize: 14 },
  
  headerRule: {
    marginTop: 20,
    marginBottom: 18,
    height: 1.5,
    zIndex: 2,
  },
  greetingSection: { zIndex: 2 },
  greetingText: { 
    fontSize: 34, 
    fontFamily: 'DancingScript_600SemiBold',
    lineHeight: 44,
  },
  userNameGold: { 
    color: '#e8d9ac', 
    fontSize: 22,
    fontWeight: '700', 
    marginTop: 4,
    letterSpacing: 0.5,
  },
  dateText: { color: '#7f96b8', fontSize: 12.5, marginTop: 14 },
  telDateText: { color: '#d4b26a' },

  promiseHero: {
    marginHorizontal: 16,
    marginTop: 20,
    borderRadius: 20,
  },
  phSlide: {
    width: width - 32,
    borderRadius: 20,
    minHeight: 160,
  },
  phInner: {
    backgroundColor: '#1B2138', // Exact deep muted navy from the image
    borderRadius: 24,
    padding: 16,
    elevation: 8,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    position: 'relative',
    overflow: 'hidden',
  },
  phCircleBg1: {
    position: 'absolute',
    top: -60,
    right: -40,
    width: 200,
    height: 200,
    borderRadius: 100,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.25)', // Increased visibility
  },
  phCircleBg2: {
    position: 'absolute',
    top: 20,
    right: -80,
    width: 250,
    height: 250,
    borderRadius: 125,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.25)', // Increased visibility
  },
  phHeaderCenter: {
    alignItems: 'center',
    marginBottom: 16,
  },
  phLabelCenter: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 4,
  },
  phTeSubCenter: {
    color: '#FCD34D',
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 10,
  },
  phRedDivider: {
    width: 30,
    height: 3,
    backgroundColor: '#94a3b8',
    borderRadius: 2,
  },
  phEnLeft: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '400',
    fontStyle: 'italic',
    lineHeight: 28,
    marginBottom: 10,
  },
  phRefEnLeft: {
    color: '#FCD34D',
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 10,
    textAlign: 'center',
  },
  phTeLeft: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '400',
    lineHeight: 26,
    marginBottom: 10, // Reduced margin since reference comes next
  },
  phThumbnailSlide: {
    width: width - 32,
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: 'transparent',
    justifyContent: 'center',
  },
  phThumbnailImg: {
    width: '100%',
    aspectRatio: 16 / 9,
    borderRadius: 24,
  },
  dotRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 10,
    backgroundColor: 'transparent',
    gap: 8,
  },
  dotHit: { padding: 4 },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
  dotActive: {
    width: 22,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FCD34D',
  },

  phActionsBottom: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    alignItems: 'center',
  },
  phSmallBtn: {
    backgroundColor: '#1a2d5a', // App color background
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 20,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1.5,
    borderStyle: 'solid',
    borderColor: '#94a3b8', // Ash/slate color solid line
  },
  phSmallBtnTxt: {
    color: '#fff', // White text for contrast
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },

  marqueeWrapper: {
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: '#0f1e3d',
    borderWidth: 1,
    borderColor: 'rgba(252,211,77,0.2)',
  },
  marqueeTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 5,
    backgroundColor: '#1a2d5a',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(252,211,77,0.25)',
    gap: 8,
  },
  marqueeTitleEmoji: { fontSize: 16 },
  marqueeTitleText: {
    color: '#FCD34D',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1.2,
    flex: 1,
  },
  marqueeTicker: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    overflow: 'hidden',
  },
  marqueeTickerBadge: {
    backgroundColor: '#ef4444',
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginHorizontal: 10,
    borderRadius: 5,
  },
  marqueeTickerBadgeTxt: {
    color: '#fff',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1,
  },
  marqueeContent: { flex: 1, overflow: 'hidden' },
  marqueeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: 4,
  },
  marqueeEventDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#FCD34D',
    marginRight: 8,
  },
  marqueeItemTitle: {
    color: '#ffffff',
    fontSize: 13.5,
    fontWeight: '800',
  },
  marqueeItemTitleTe: {
    color: '#FCD34D',
    fontSize: 12,
    fontWeight: '700',
    marginLeft: 2,
  },
  marqueeTimePill: {
    backgroundColor: 'rgba(252,211,77,0.15)',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginLeft: 10,
    borderWidth: 1,
    borderColor: 'rgba(252,211,77,0.4)',
  },
  marqueeItemTime: { color: '#FCD34D', fontSize: 12, fontWeight: '800' },
  marqueeItemLoc: {
    color: '#94a3b8',
    fontSize: 11.5,
    fontWeight: '500',
    marginLeft: 8,
  },
  marqueeSeparator: { color: 'rgba(252,211,77,0.35)', fontSize: 12, marginHorizontal: 4 },
  marqueeLangDivider: { color: 'rgba(255,255,255,0.25)', fontSize: 14, fontWeight: '300', marginHorizontal: 6 },
  marqueeEventDotTe: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#FCD34D',
    marginRight: 8,
  },
  marqueeTimePillTe: {
    backgroundColor: 'rgba(252,211,77,0.15)',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginLeft: 10,
    borderWidth: 1,
    borderColor: 'rgba(252,211,77,0.4)',
  },
  marqueeItemTimeTe: { color: '#FCD34D', fontSize: 12, fontWeight: '800' },
  marqueeItemLocTe: { color: '#94a3b8', fontSize: 11.5, fontWeight: '500', marginLeft: 8 },

  // Event Banner (Sermon Style)
  eventBanner: { margin: 16, marginTop: 4, backgroundColor: '#fff', borderRadius: 18, overflow: 'hidden', elevation: 4, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 6, borderWidth: 1, borderColor: '#f1f5f9' },
  ebHd: { backgroundColor: '#1a2d5a', paddingVertical: 10, paddingHorizontal: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  ebHdLbl: { fontSize: 12, color: '#fff', fontWeight: '700' },
  ebSeeAll: { fontSize: 11, color: '#aac4e8', fontWeight: '600' },
  ebList: { padding: 0 },
  ebItem: { flexDirection: 'row', padding: 15, alignItems: 'center' },
  ebDivider: { height: 1.5, backgroundColor: '#94a3b8', marginHorizontal: 15, opacity: 0.6 },
  ebThumbnailContainer: { width: 100, height: 56, backgroundColor: 'transparent', justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  ebThumbnail: { width: 100, height: 56, borderRadius: 8 },
  ebInfo: { flex: 1 },
  ebTitle: { fontSize: 13.5, fontWeight: '800', color: '#1a2d5a', marginBottom: 5 },
  ebDetailsLink: { fontSize: 10, fontWeight: '800', color: '#1a2d5a', marginTop: 8 },
  highlightRow: { flexDirection: 'row', alignItems: 'center' },
  dateBadge: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: '#fffbeb', 
    paddingHorizontal: 7, 
    paddingVertical: 3, 
    borderRadius: 5,
    borderWidth: 1,
    borderColor: '#fef3c7',
    gap: 4
  },
  timeBadge: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: '#f8fafc', 
    paddingHorizontal: 7, 
    paddingVertical: 3, 
    borderRadius: 5,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    gap: 4
  },
  badgeTextMain: { fontSize: 9.5, fontWeight: '700', color: '#1a2d5a' },
  badgeTextSub: { fontSize: 9.5, color: '#475569', fontWeight: '500' },
  timeBadgeText: { fontSize: 9, fontWeight: '700', color: '#c0392b' },
  ebMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  
  emptyEvents: { padding: 30, alignItems: 'center', justifyContent: 'center' },
  emptyEventsTxt: { color: '#1a2d5a', fontSize: 13, fontWeight: '700', marginTop: 12 },
  emptyEventsSub: { color: '#94a3b8', fontSize: 11, marginTop: 4 },

  secLbl: { fontSize: 13, fontWeight: '800', color: '#1a2d5a', letterSpacing: 0.5, marginHorizontal: 24, marginBottom: 18, marginTop: 15 },
  iconGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 15, justifyContent: 'space-between' },
  iconItem: { width: (width - 60) / 4, alignItems: 'center', marginBottom: 20 },
  iconBox: { width: 62, height: 62, borderRadius: 18, justifyContent: 'center', alignItems: 'center', marginBottom: 8, elevation: 2, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 4 },
  iconLbl: { fontSize: 11, color: '#475569', fontWeight: '600', textAlign: 'center' },

  // Sermon Card
  sermonCard: { margin: 16, marginTop: 4, backgroundColor: '#fff', borderRadius: 18, overflow: 'hidden', elevation: 4, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 6, borderWidth: 1, borderColor: '#f1f5f9' },
  scHd: { backgroundColor: '#1a2d5a', paddingVertical: 10, paddingHorizontal: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  scHdLblRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  scHdLbl: { fontSize: 12, color: '#fff', fontWeight: '700' },
  scSee: { fontSize: 11, color: '#aac4e8', fontWeight: '600' },
  scBody: { padding: 16, flexDirection: 'row', alignItems: 'center', gap: 15 },
  scThumb: { width: 80, height: 50, backgroundColor: '#0f172a', borderRadius: 10, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
  playIconOverlay: { width: '100%', height: '100%', justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.2)' },
  scInfo: { flex: 1 },
  scTitle: { fontSize: 14, fontWeight: '700', color: '#0f172a', marginBottom: 2 },
  scTitleTe: { fontSize: 12, color: '#334155', marginBottom: 4 },
  scMeta: { fontSize: 10.5, color: '#64748b' },
  playBtnCircle: { width: 36, height: 36, borderRadius: 18, borderWidth: 1.5, borderColor: '#e2e8f0', justifyContent: 'center', alignItems: 'center' },

  // Prayer Card
  prayerCard: { margin: 16, marginTop: 4, backgroundColor: '#fff', borderRadius: 18, overflow: 'hidden', elevation: 4, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 6, borderWidth: 1, borderColor: '#f1f5f9' },
  pcHd: { backgroundColor: '#7C3AED', paddingVertical: 10, paddingHorizontal: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  pcHdLblRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  pcHdLbl: { fontSize: 12, color: '#fff', fontWeight: '700' },
  pcCount: { fontSize: 11, color: 'rgba(255,255,255,0.9)', fontWeight: '600' },
  pcBody: { padding: 16 },
  pcTextContainer: { backgroundColor: '#f8fafc', padding: 15, borderRadius: 12, borderWidth: 1, borderColor: '#f1f5f9', marginBottom: 15 },
  pcText: { fontSize: 13, color: '#334155', lineHeight: 22, fontStyle: 'italic' },
  pcFoot: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  prayedBtn: { backgroundColor: '#f5f3ff', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10, flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderColor: '#ddd6fe' },
  prayedBtnTxt: { color: '#4C1D95', fontSize: 12, fontWeight: '700' },
  pcSeeAll: { fontSize: 11.5, color: '#94a3b8', fontWeight: '600' },

  // Modal Styles for Household Members
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '90%',
    maxHeight: '80%',
    borderRadius: 24,
    overflow: 'hidden',
    elevation: 10,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 15,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
  },
  modalTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  modalSubtitle: {
    fontSize: 11,
    color: '#94a3b8',
    fontWeight: '600',
    marginTop: 1,
  },
  closeBtn: {
    padding: 8,
  },
  modalLoading: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalLoadingText: {
    fontSize: 13,
    fontWeight: '600',
  },
  ebMetaText: {
    fontSize: 10, 
    color: '#64748b', 
    fontWeight: '500', 
    lineHeight: 14
  },
  modalScroll: {
    padding: 20,
  },
  noFamily: {
    padding: 40,
    alignItems: 'center',
  },
  noFamilyText: {
    fontSize: 13,
    textAlign: 'center',
    fontWeight: '600',
  },
  contactCard: {
    paddingVertical: 16,
  },
  contactHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  contactAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#1a2d5a',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  contactAvatarText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '800',
  },
  contactInfo: {
    flex: 1,
  },
  contactName: {
    fontSize: 15,
    fontWeight: '700',
  },
  roleBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#eff6ff',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    marginTop: 4,
  },
  roleBadgeText: {
    color: '#1e40af',
    fontSize: 10,
    fontWeight: '700',
  },
  contactDetails: {
    marginTop: 12,
    paddingLeft: 56,
    gap: 8,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailText: {
    fontSize: 12,
    fontWeight: '600',
  },
  adminFloatingBtn: {
    position: 'absolute',
    bottom: 130,
    right: 20,
    backgroundColor: '#1a2d5a',
    borderRadius: 30,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    elevation: 10,
    zIndex: 9999,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    borderWidth: 1.5,
    borderColor: 'rgba(252,211,77,0.35)',
  },
  adminBtnIconBg: {
    marginRight: 8,
  },
  adminBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  subModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  subModalCard: {
    backgroundColor: '#18181b', // very dark gray/black
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#27272a',
    width: '100%',
    padding: 32,
    paddingTop: 48,
    alignItems: 'flex-start',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 10,
  },
  subModalClose: {
    position: 'absolute',
    top: 20,
    right: 20,
    padding: 4,
  },
  subModalIconWrapper: {
    alignSelf: 'center',
    marginBottom: 32,
  },
  subModalIconGradient: {
    width: 64,
    height: 64,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    transform: [{ rotate: '15deg' }],
  },
  subModalExclamation: {
    color: '#fff',
    fontSize: 40,
    fontWeight: '900',
    transform: [{ rotate: '-15deg' }],
  },
  subModalTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 20,
    lineHeight: 38,
  },
  subModalBody: {
    fontSize: 16,
    color: '#d4d4d8',
    lineHeight: 24,
    marginBottom: 32,
  },
  subModalButton: {
    backgroundColor: '#ffffff',
    width: '100%',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  subModalButtonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: '700',
  }
});
