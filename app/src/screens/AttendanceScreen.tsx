import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { 
  StyleSheet, 
  View, 
  Text, 
  FlatList, 
  TouchableOpacity, 
  ActivityIndicator,
  RefreshControl,
  Dimensions,
  StatusBar,
  Platform,
  ScrollView,
  InteractionManager,
  Alert,
  ToastAndroid,
  Modal,
  TextInput
} from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { 
  ArrowLeft,
  MapPin,
  Clock,
  CalendarCheck,
  CheckCircle2,
  QrCode,
  Eye,
  MoreVertical,
  X,
  Download,
  Share2
} from 'lucide-react-native';
import QRCode from 'react-native-qrcode-svg';
import SalesforceService, { ScheduleEvent } from '../services/SalesforceService';
import AttendanceService, { AttendanceRecord } from '../services/AttendanceService';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import * as Location from 'expo-location';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as MediaLibrary from 'expo-media-library';
import firestore from '@react-native-firebase/firestore';

const { width } = Dimensions.get('window');

type TabType = 'Home' | 'MyAttendance' | 'Events';

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

const formatDateShort = (dateStr: string) => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
};

const getEventTimestamp = (dateStr: string, timeStr: string) => {
  if (!dateStr) return 0;
  try {
    const eventDate = new Date(dateStr);
    if (timeStr && typeof timeStr === 'string' && timeStr.includes(':')) {
      const timePart = timeStr.includes('T') ? timeStr.split('T')[1].split('.')[0] : timeStr;
      const [hours, minutes] = timePart.split(':');
      const h = parseInt(hours, 10);
      const m = parseInt(minutes, 10);
      if (!isNaN(h) && !isNaN(m)) {
        eventDate.setHours(h, m, 0, 0);
      }
    } else {
      eventDate.setHours(0, 0, 0, 0);
    }
    const timestamp = eventDate.getTime();
    return isNaN(timestamp) ? 0 : timestamp;
  } catch (e) {
    return 0;
  }
};

const hasEventStarted = (dateStr: string, timeStr: string, now: Date) => {
  if (!dateStr || !timeStr) return true;
  try {
    const timePart = timeStr.includes('T') ? timeStr.split('T')[1].split('.')[0] : timeStr;
    const [hours, minutes] = timePart.split(':');
    const eventDate = new Date(dateStr);
    eventDate.setHours(parseInt(hours, 10), parseInt(minutes, 10), 0, 0);
    return eventDate <= now;
  } catch (e) {
    return true;
  }
};

const getUpcomingText = (dateStr: string, timeStr: string, now: Date) => {
  if (!dateStr || !timeStr) return 'Upcoming';
  try {
    const timePart = timeStr.includes('T') ? timeStr.split('T')[1].split('.')[0] : timeStr;
    const [hours, minutes] = timePart.split(':');
    const eventDate = new Date(dateStr);
    eventDate.setHours(parseInt(hours, 10), parseInt(minutes, 10), 0, 0);
    
    const diffMs = eventDate.getTime() - now.getTime();
    if (diffMs <= 0) return 'Upcoming';
    
    const diffMins = Math.floor(diffMs / 60000);
    const h = Math.floor(diffMins / 60);
    const m = diffMins % 60;
    
    if (h > 0) return `Starts in ${h}h ${m}m`;
    return `Starts in ${m}m`;
  } catch (e) {
    return 'Upcoming';
  }
};

// ==========================================
// Sub-components
// ==========================================

const CircularProgress = ({ progress, attended, total }: { progress: number, attended: number, total: number }) => {
  const radius = 35;
  const strokeWidth = 8;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (circumference * progress);

  return (
    <View style={styles.progressContainer}>
      <Svg width={90} height={90} viewBox="0 0 100 100">
        <Circle cx="50" cy="50" r={radius} stroke="#e2e8f0" strokeWidth={strokeWidth} fill="none" />
        <Circle
          cx="50"
          cy="50"
          r={radius}
          stroke="#307f68"
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          transform="rotate(-90 50 50)"
        />
      </Svg>
      <View style={styles.progressTextContainer}>
        <Text style={styles.progressPercentage}>{Math.round(progress * 100)}%</Text>
      </View>
    </View>
  );
};

const ProgressCard = ({ attended, total }: { attended: number, total: number }) => {
  const progress = total > 0 ? (attended / total) : 0;
  return (
    <View style={styles.progressCard}>
      <CircularProgress progress={progress} attended={attended} total={total} />
      <View style={styles.progressInfo}>
        <Text style={styles.progressTitle}>{attended} of {total} events</Text>
        <Text style={styles.progressSubtitle}>Total attended</Text>
      </View>
    </View>
  );
};

// ==========================================
// TABS
// ==========================================

const HomeTab = ({ navigation, member, user, onNavigateTab, adminModalVisible, setAdminModalVisible }: any) => {
  const [todayEvents, setTodayEvents] = useState<ScheduleEvent[]>([]);
  const [recentEvents, setRecentEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeQREvent, setActiveQREvent] = useState<any>(null);
  const qrRef = useRef<any>(null);

  const [monthlyTotal, setMonthlyTotal] = useState(0);
  const [monthlyAttended, setMonthlyAttended] = useState(0);
  
  const [activeIndex, setActiveIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);
  const scrollIndex = useRef(0);
  const screenWidth = Dimensions.get('window').width;
  const isActualAdmin = member?.userType?.toLowerCase() === 'admin';

  useEffect(() => {
    if (todayEvents.length <= 1) return;
    
    const interval = setInterval(() => {
      const nextIndex = (scrollIndex.current + 1) % todayEvents.length;
      scrollIndex.current = nextIndex;
      setActiveIndex(nextIndex);
      flatListRef.current?.scrollToIndex({
        index: nextIndex,
        animated: true,
      });
    }, 4000);

    return () => clearInterval(interval);
  }, [todayEvents.length]);

  const fetchEvents = async () => {
    try {
      const todayStart = new Date();
      todayStart.setHours(0,0,0,0);
      
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      thirtyDaysAgo.setHours(0,0,0,0);
      
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0,0,0,0);
      
      const [events, attendedRecords, pastEvts, upcomingEvts, recentAttended, pastEvts100, monthAttendedRecords] = await Promise.all([
        SalesforceService.getTodayEvents(),
        member?.id ? AttendanceService.getMemberAttendanceHistory(member.id, todayStart) : Promise.resolve([]),
        SalesforceService.getPastEvents(10),
        SalesforceService.getUpcomingEvents(10),
        member?.id ? AttendanceService.getMemberAttendanceHistory(member.id, thirtyDaysAgo) : Promise.resolve([]),
        SalesforceService.getPastEvents(100),
        member?.id ? AttendanceService.getMemberAttendanceHistory(member.id, startOfMonth) : Promise.resolve([])
      ]);
      
      // Calculate correct Monthly Progress like MyAttendanceTab
      const allHistoryEvents = [...(events || []), ...(pastEvts100 || [])];
      const monthEvents = allHistoryEvents.filter((e: any) => new Date(e.date) >= startOfMonth);
      const monthAttendedEventIds = new Set((monthAttendedRecords || []).map(r => r.eventId));
      const monthMerged = monthEvents.map((e: any) => ({ ...e, attended: monthAttendedEventIds.has(e.id) }));
      const correctMonthlyTotal = monthEvents.length;
      const correctMonthlyAttended = monthMerged.filter(e => e.attended).length;
      
      const attendedEventIds = new Set(attendedRecords.map(r => r.eventId));
      const mappedEvents = (events || []).map(e => ({
        ...e,
        attended: attendedEventIds.has(e.id)
      }));

      // Combine and filter for this week
      const allEvts = [...(pastEvts||[]), ...(events||[]), ...(upcomingEvts||[])];
      const uniqueMap = new Map();
      allEvts.forEach(e => uniqueMap.set(e.id, e));
      const uniqueEvts = Array.from(uniqueMap.values());
      
      const now = new Date();
      now.setHours(0,0,0,0);
      const currentDay = now.getDay();
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - currentDay);
      const endOfWeek = new Date(now);
      endOfWeek.setDate(now.getDate() + (6 - currentDay));
      
      const thisWeekEvts = uniqueEvts.filter(e => {
        const d = new Date(e.date);
        d.setHours(0,0,0,0);
        return d >= startOfWeek && d <= endOfWeek;
      }).sort((a, b) => getEventTimestamp(a.date, a.startTime) - getEventTimestamp(b.date, b.startTime));

      const recentAttendedIds = new Set(recentAttended.map(r => r.eventId));
      const mappedRecent = thisWeekEvts.map(e => ({
        ...e,
        attended: recentAttendedIds.has(e.id)
      }));

      setTodayEvents(mappedEvents);
      setMonthlyTotal(correctMonthlyTotal);
      setMonthlyAttended(correctMonthlyAttended);
      setRecentEvents(mappedRecent);
    } catch (error) {
      console.error('Error fetching today events:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchEvents();
    }, [member?.id]) // optionally re-fetch if member changes
  );

  const handleDownloadQR = async () => {
    try {
      if (!qrRef.current) return;
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'We need media permissions to save the QR code.');
        return;
      }
      qrRef.current.toDataURL(async (data: string) => {
        const fileUri = FileSystem.documentDirectory + `QR_${activeQREvent?.id || 'Attendance'}.png`;
        await FileSystem.writeAsStringAsync(fileUri, data, { encoding: FileSystem.EncodingType.Base64 });
        await MediaLibrary.saveToLibraryAsync(fileUri);
        if (Platform.OS === 'android') {
          ToastAndroid.show('QR Code saved to gallery', ToastAndroid.SHORT);
        } else {
          Alert.alert('Success', 'QR Code saved to gallery');
        }
      });
    } catch (e) {
      console.error(e);
      Alert.alert('Error', 'Failed to save QR code');
    }
  };

  const handleShareQR = async () => {
    try {
      if (!qrRef.current) return;
      qrRef.current.toDataURL(async (data: string) => {
        const fileUri = FileSystem.cacheDirectory + `QR_${activeQREvent?.id || 'Attendance'}.png`;
        await FileSystem.writeAsStringAsync(fileUri, data, { encoding: FileSystem.EncodingType.Base64 });
        const isAvailable = await Sharing.isAvailableAsync();
        if (isAvailable) {
          await Sharing.shareAsync(fileUri, { dialogTitle: 'Share Attendance QR Code' });
        } else {
          Alert.alert('Error', 'Sharing is not available on this device');
        }
      });
    } catch (e) {
      console.error(e);
      Alert.alert('Error', 'Failed to share QR code');
    }
  };

  const EventItem = React.memo(({ item }: { item: ScheduleEvent & { attended?: boolean } }) => (
    <View style={styles.eventCard}>
      <View style={styles.ecHeader}>
        <View style={styles.statusBadge}>
          <View style={styles.statusDot} />
          <Text style={styles.statusText}>Attendance open</Text>
        </View>
        <Text style={styles.closesText}>Closes {formatTime(item.endTime)}</Text>
      </View>
      <View style={styles.ecBody}>
        <Text style={styles.ecTitle} numberOfLines={2}>{item.title}</Text>
        {(item.titleTelugu || item.title) !== item.title && (
          <Text style={[styles.ecSubtitle, { marginTop: -4, marginBottom: 8 }]} numberOfLines={1}>
            {item.titleTelugu || item.title}
          </Text>
        )}
        <Text style={styles.ecDetailText}>
          {new Date(item.date).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}, {formatTime(item.startTime)}
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
          <MapPin size={12} color="#64748b" style={{ marginRight: 6 }} />
          <Text style={[styles.ecDetailText, { marginTop: 0 }]}>{item.location || 'Unspecified'}</Text>
        </View>
      </View>
      
      {item.attended ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 }}>
          <View style={[styles.badgeBtn, { backgroundColor: '#16a34a', borderColor: '#16a34a', paddingHorizontal: 6, flex: 1 }]}>
            <CheckCircle2 size={14} color="#ffffff" />
            <Text style={[styles.badgeBtnText, { color: '#ffffff' }]} numberOfLines={1}>Attendance Marked</Text>
          </View>
          
          <TouchableOpacity 
            style={[styles.badgeBtn, { backgroundColor: '#1a2d5a', borderColor: '#1a2d5a', flex: 1, paddingHorizontal: 6 }]}
            onPress={() => navigation.navigate('EventAttendees', { eventId: item.id, eventName: item.title })}
          >
            <Text style={[styles.badgeBtnText, { color: '#ffffff' }]} numberOfLines={1}>View Attendees</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 8 }}>
          <TouchableOpacity 
            style={[styles.scanButton, { flex: 1, paddingVertical: 14 }]}
            onPress={() => navigation.navigate('QRScanner', { eventId: item.id, eventName: item.title, locationName: item.location || 'Unspecified' })}
          >
            <QrCode size={20} color="#1a2d5a" />
            <Text style={[styles.scanButtonText, { fontSize: 14 }]} numberOfLines={1}>Scan QR to mark attendance</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={{ width: 50, height: 50, borderRadius: 16, backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center' }}
            onPress={() => navigation.navigate('EventAttendees', { eventId: item.id, eventName: item.title })}
          >
            <Eye size={24} color="#64748b" />
          </TouchableOpacity>
        </View>
      )}
    </View>
  ));

  return (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={styles.listContainer}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchEvents(); }} tintColor="#1a2d5a" />}
    >
      <View style={{ minHeight: 250 }}>
        {todayEvents.length > 0 && (
          <View style={{ marginHorizontal: 24, marginBottom: 12, marginTop: 12, flexDirection: 'row', alignItems: 'center' }}>
            <Text style={{ fontSize: 18, fontWeight: '700', color: '#0f172a' }}>Today's Events</Text>
            <View style={{ backgroundColor: '#1e293b', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 10, marginLeft: 8, minWidth: 20, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ color: '#fff', fontSize: 11, fontWeight: '700' }}>{todayEvents.length}</Text>
            </View>
          </View>
        )}
        <FlatList
          ref={flatListRef}
          data={todayEvents}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <EventItem item={item} />}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          snapToAlignment="center"
          onMomentumScrollEnd={(e) => {
            const index = Math.round(e.nativeEvent.contentOffset.x / screenWidth);
            setActiveIndex(index);
            scrollIndex.current = index;
          }}
          getItemLayout={(data, index) => (
            { length: screenWidth, offset: screenWidth * index, index }
          )}
          ListEmptyComponent={
            loading ? (
              <View style={[styles.emptyState, { marginTop: 40, width: screenWidth }]}>
                <ActivityIndicator size="large" color="#1a2d5a" />
                <Text style={[styles.emptySub, { marginTop: 12 }]}>Loading Events...</Text>
              </View>
            ) : (
              <View style={[styles.emptyState, { width: screenWidth }]}>
                <CalendarCheck size={60} color="#cbd5e1" />
                <Text style={styles.emptyTitle}>No Events Today</Text>
                <Text style={styles.emptySub}>There are no events scheduled for today to log attendance.</Text>
              </View>
            )
          }
        />
      </View>

      {todayEvents.length > 1 && (
        <View style={styles.paginationContainer}>
          {todayEvents.map((_, i) => (
            <View 
              key={i} 
              style={[
                styles.paginationDot, 
                i === activeIndex && styles.paginationDotActive
              ]} 
            />
          ))}
        </View>
      )}
      
      <View style={{ marginHorizontal: 24, marginTop: todayEvents.length > 1 ? 0 : 20, marginBottom: 4 }}>
        <Text style={{ fontSize: 16, fontWeight: '700', color: '#0f172a' }}>Your Monthly Progress</Text>
      </View>
      <ProgressCard attended={monthlyAttended} total={monthlyTotal} />

      {/* THIS WEEK SECTION */}
      {recentEvents.length > 0 && (
        <View style={{ marginTop: 24, marginHorizontal: 24, marginBottom: 20 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <Text style={{ fontSize: 20, fontWeight: '700', color: '#0f172a', fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif' }}>This Week</Text>
            <TouchableOpacity onPress={() => onNavigateTab('MyAttendance')}>
              <Text style={{ fontSize: 14, fontWeight: '600', color: '#92400e' }}>See all</Text>
            </TouchableOpacity>
          </View>
          
          {recentEvents.map((item, index) => (
            <View key={item.id}>
              <View style={[styles.historyRow, { paddingHorizontal: 0, paddingVertical: 12, backgroundColor: 'transparent', marginHorizontal: 0, marginBottom: 0, marginTop: 0 }]}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.historyTitle}>{item.title}</Text>
                  <Text style={styles.historySubtitle}>{formatDateShort(item.date)}, {formatTime(item.startTime)}</Text>
                </View>
                {item.attended ? (
                  <View style={[styles.attendanceBadge, { backgroundColor: '#dcfce7' }]}>
                    <Text style={[styles.attendanceBadgeText, { color: '#16a34a' }]}>Present</Text>
                  </View>
                ) : hasEventStarted(item.date, item.startTime, new Date()) ? (
                  <View style={[styles.attendanceBadge, { backgroundColor: '#fee2e2' }]}>
                    <Text style={[styles.attendanceBadgeText, { color: '#dc2626' }]}>Absent</Text>
                  </View>
                ) : (
                  <View style={[styles.attendanceBadge, { backgroundColor: '#f1f5f9' }]}>
                    <Text style={[styles.attendanceBadgeText, { color: '#64748b' }]}>{getUpcomingText(item.date, item.startTime, new Date())}</Text>
                  </View>
                )}
              </View>
              {index < recentEvents.length - 1 && <View style={styles.divider} />}
            </View>
          ))}
        </View>
      )}
      
      {isActualAdmin && todayEvents.length > 0 && (
        <Modal visible={adminModalVisible} transparent={true} animationType="fade" onRequestClose={() => setAdminModalVisible(false)}>
          <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 }}>
            <View style={{ backgroundColor: '#fff', width: '100%', borderRadius: 16, padding: 20, maxHeight: '80%' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <MapPin size={22} color="#16a34a" />
                  <Text style={{ fontSize: 18, fontWeight: '800', color: '#0f172a' }}>Admin Venue Controls</Text>
                </View>
                <TouchableOpacity onPress={() => setAdminModalVisible(false)} style={{ padding: 4 }}>
                  <Text style={{ fontSize: 20, color: '#64748b' }}>×</Text>
                </TouchableOpacity>
              </View>
              
              <Text style={{ fontSize: 13, color: '#64748b', lineHeight: 18, marginBottom: 16 }}>
                By default, the QR scanner uses the main church coordinates. If an event is at a different venue, tap "Set Location" while physically standing there to lock the scanner to your current GPS coordinates.
              </Text>
              
              <ScrollView showsVerticalScrollIndicator={false}>
                {todayEvents.map((eventItem: any, index: number) => (
                  <View key={eventItem.id} style={{ marginBottom: index === todayEvents.length - 1 ? 0 : 16, backgroundColor: '#f8fafc', padding: 12, borderRadius: 12, borderWidth: 1, borderColor: '#f1f5f9' }}>
                    <Text style={{ fontSize: 14, fontWeight: '700', color: '#1a2d5a', marginBottom: 10 }}>
                      {eventItem.title}
                    </Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                      <TouchableOpacity 
                        style={[styles.scanButton, { flex: 1, backgroundColor: '#f1f5f9', borderColor: '#e2e8f0', borderWidth: 1, paddingVertical: 10 }]}
                        onPress={() => {
                          setAdminModalVisible(false);
                          setActiveQREvent(eventItem);
                        }}
                      >
                        <QrCode size={16} color="#1a2d5a" />
                        <Text style={[styles.scanButtonText, { color: '#1a2d5a', fontSize: 13 }]}>Show QR</Text>
                      </TouchableOpacity>
                      <TouchableOpacity 
                        style={[styles.scanButton, { flex: 1, backgroundColor: '#dcfce7', borderColor: '#86efac', borderWidth: 1, paddingVertical: 10 }]}
                        onPress={async () => {
                          try {
                            const { status } = await Location.requestForegroundPermissionsAsync();
                            if (status !== 'granted') {
                              Alert.alert('Permission Denied', 'Location permission is required.');
                              return;
                            }
                            
                            const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
                            
                            // Reverse geocode
                            let locName = 'Custom Location';
                            try {
                              const geocode = await Location.reverseGeocodeAsync({
                                latitude: loc.coords.latitude,
                                longitude: loc.coords.longitude
                              });
                                if (geocode && geocode.length > 0) {
                                  const g = geocode[0];
                                  locName = g.city || g.subregion || g.district || g.region || 'Custom Location';
                                }
                            } catch (e) {
                              console.warn('Reverse geocode failed', e);
                            }
                            
                            Alert.alert(
                              'Confirm Location',
                              `Set venue for ${eventItem.title} to:\n${locName}?\n\n(Lat: ${loc.coords.latitude.toFixed(5)}, Lng: ${loc.coords.longitude.toFixed(5)})`,
                              [
                                { text: 'Cancel', style: 'cancel' },
                                {
                                  text: 'Confirm',
                                  style: 'default',
                                  onPress: async () => {
                                    try {
                                      await firestore().collection('event_locations').doc(eventItem.id).set({
                                        latitude: loc.coords.latitude,
                                        longitude: loc.coords.longitude,
                                        locationName: locName,
                                        timestamp: firestore.FieldValue.serverTimestamp()
                                      }, { merge: true });
                                      
                                      Alert.alert('Success', `Location locked as "${locName}"!`);
                                    } catch (err: any) {
                                      Alert.alert('Error', `Failed to save location. ${err?.message}`);
                                    }
                                  }
                                }
                              ]
                            );
                          } catch (e: any) {
                            Alert.alert('Error', `Failed to get current location. ${e?.message}`);
                          }
                        }}
                      >
                        <MapPin size={16} color="#16a34a" />
                        <Text style={[styles.scanButtonText, { color: '#16a34a', fontSize: 13 }]}>Set Location</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
              </ScrollView>
            </View>
          </View>
        </Modal>
      )}

      {/* ── QR Code Modal ── */}
      <Modal visible={!!activeQREvent} transparent={true} animationType="fade" onRequestClose={() => setActiveQREvent(null)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', alignItems: 'center', padding: 20 }}>
          <View style={{ backgroundColor: '#fff', borderRadius: 24, padding: 32, alignItems: 'center', width: '100%', maxWidth: 340 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', width: '100%', marginBottom: 24, alignItems: 'flex-start' }}>
              <View style={{ flex: 1, paddingRight: 12 }}>
                <Text style={{ fontSize: 18, fontWeight: '800', color: '#0f172a' }}>Scan for Attendance</Text>
                <Text style={{ fontSize: 14, color: '#64748b', marginTop: 4, lineHeight: 20 }}>{activeQREvent?.title}</Text>
              </View>
              <TouchableOpacity onPress={() => setActiveQREvent(null)} style={{ padding: 6, backgroundColor: '#f1f5f9', borderRadius: 20 }}>
                <X size={20} color="#64748b" />
              </TouchableOpacity>
            </View>
            
            <View style={{ padding: 16, backgroundColor: '#ffffff', borderRadius: 16, elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 12, marginBottom: 24 }}>
              <QRCode 
                getRef={(c) => (qrRef.current = c)}
                value={JSON.stringify({ action: 'ChurchOfGod_Attendance' })}
                size={220}
                color="#0f172a"
                backgroundColor="#ffffff"
              />
            </View>
            
            <View style={{ flexDirection: 'row', gap: 16 }}>
              <TouchableOpacity style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: '#f8fafc', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#e2e8f0' }} onPress={handleDownloadQR}>
                <Download size={24} color="#1e293b" />
              </TouchableOpacity>
              
              <TouchableOpacity style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: '#f8fafc', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#e2e8f0' }} onPress={handleShareQR}>
                <Share2 size={24} color="#1e293b" />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>



    </ScrollView>
  );
};

const MyAttendanceTab = ({ member }: any) => {
  const [period, setPeriod] = useState<'month'|'3months'|'year'>('month');
  const [history, setHistory] = useState<any[]>([]);
  const [attendedCount, setAttendedCount] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000); // Update every minute
    return () => clearInterval(timer);
  }, []);

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const startDate = new Date();
      if (period === 'month') {
        startDate.setDate(1);
      } else if (period === '3months') {
        startDate.setMonth(startDate.getMonth() - 2);
        startDate.setDate(1);
      } else if (period === 'year') {
        startDate.setMonth(0);
        startDate.setDate(1);
      }
      startDate.setHours(0,0,0,0);

      // Fetch all past events and today's events to form the complete history
      const [pastEvents, todayEvents] = await Promise.all([
        SalesforceService.getPastEvents(100),
        SalesforceService.getTodayEvents()
      ]);
      const allHistoryEvents = [...todayEvents, ...pastEvents];
      
      // Filter past events to only those in the period
      const periodEvents = allHistoryEvents.filter((e: any) => new Date(e.date) >= startDate);
      
      // Fetch user's attendance records in this period
      const attendedRecords = member?.id ? await AttendanceService.getMemberAttendanceHistory(member.id, startDate) : [];
      const attendedEventIds = new Set(attendedRecords.map(r => r.eventId));

      const merged = periodEvents.map((e: any) => ({
        ...e,
        attended: attendedEventIds.has(e.id)
      }));

      setTotalCount(periodEvents.length);
      setAttendedCount(merged.filter(e => e.attended).length);
      setHistory(merged);
    } catch (error) {
      console.error('Error fetching history:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { 
    const task = InteractionManager.runAfterInteractions(() => {
      fetchHistory(); 
    });
    return () => task.cancel();
  }, [period]);

  const renderItem = ({ item }: { item: any }) => (
    <View style={styles.historyRow}>
      <View style={{ flex: 1 }}>
        <Text style={styles.historyTitle}>{item.title}</Text>
        <Text style={styles.historySubtitle}>{formatDateShort(item.date)}, {formatTime(item.startTime)}</Text>
      </View>
      {item.attended ? (
        <View style={[styles.attendanceBadge, { backgroundColor: '#dcfce7' }]}>
          <Text style={[styles.attendanceBadgeText, { color: '#16a34a' }]}>Present</Text>
        </View>
      ) : hasEventStarted(item.date, item.startTime, currentTime) ? (
        <View style={[styles.attendanceBadge, { backgroundColor: '#fee2e2' }]}>
          <Text style={[styles.attendanceBadgeText, { color: '#dc2626' }]}>Absent</Text>
        </View>
      ) : (
        <View style={[styles.attendanceBadge, { backgroundColor: '#f1f5f9' }]}>
          <Text style={[styles.attendanceBadgeText, { color: '#64748b' }]}>{getUpcomingText(item.date, item.startTime, currentTime)}</Text>
        </View>
      )}
    </View>
  );

  return (
    <View style={{ flex: 1 }}>
      <View style={styles.pillContainer}>
        {['month', '3months', 'year'].map((p) => (
          <TouchableOpacity 
            key={p} 
            style={[styles.pill, period === p && styles.pillActive]}
            onPress={() => setPeriod(p as any)}
          >
            <Text style={[styles.pillText, period === p && styles.pillTextActive]}>
              {p === 'month' ? 'This month' : p === '3months' ? '3 months' : 'This year'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      
      {loading ? (
        <ActivityIndicator size="large" color="#1a2d5a" style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={history}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          ListHeaderComponent={<ProgressCard attended={attendedCount} total={totalCount} />}
          contentContainerStyle={{ paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
          ItemSeparatorComponent={() => <View style={styles.divider} />}
        />
      )}
    </View>
  );
};

const EventsTab = ({ navigation }: any) => {
  const [type, setType] = useState<'Upcoming'|'Past'>('Upcoming');
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchEvents = async () => {
    setLoading(true);
    try {
      const rawEvents = type === 'Upcoming' 
        ? await SalesforceService.getUpcomingEvents(20)
        : await SalesforceService.getPastEvents(20);
        
      // Fetch attendee counts in parallel
      const counts = await Promise.all(
        rawEvents.map(e => AttendanceService.getEventAttendeeCount(e.id))
      );
      
      const merged = rawEvents.map((e, i) => ({
        ...e,
        attendeesCount: counts[i]
      }));
      setEvents(merged);
    } catch (error) {
      console.error('Error fetching global events:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { 
    const task = InteractionManager.runAfterInteractions(() => {
      fetchEvents(); 
    });
    return () => task.cancel();
  }, [type]);

  const isTodayOrPast = (dateStr: string) => {
    if (!dateStr) return false;
    const eventDate = new Date(dateStr);
    eventDate.setHours(0,0,0,0);
    const today = new Date();
    today.setHours(0,0,0,0);
    return eventDate <= today;
  };

  const renderItem = ({ item }: { item: any }) => (
    <View style={styles.globalEventCard}>
      <View style={styles.geHeader}>
        <View style={styles.geBadge}>
          <Text style={styles.geBadgeText}>{type === 'Past' ? 'Closed' : 'Open'}</Text>
        </View>
        <Text style={styles.geDate}>{new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</Text>
      </View>
      <Text style={styles.geTitle}>{item.title}</Text>
      <Text style={styles.geSubtitle}>{formatTime(item.startTime)} to {formatTime(item.endTime)}</Text>
      
      <View style={styles.geFooter}>
        <Text style={styles.geAttendees}>{item.attendeesCount} present</Text>
        {isTodayOrPast(item.date) && (
          <TouchableOpacity 
            style={styles.geViewBtn}
            onPress={() => navigation.navigate('EventAttendees', { eventId: item.id, eventName: item.title })}
          >
            <Text style={styles.geViewBtnText}>View list</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  return (
    <View style={{ flex: 1 }}>
      <View style={styles.pillContainer}>
        {['Upcoming', 'Past'].map((t) => (
          <TouchableOpacity 
            key={t} 
            style={[styles.pill, type === t && styles.pillActive]}
            onPress={() => setType(t as any)}
          >
            <Text style={[styles.pillText, type === t && styles.pillTextActive]}>{t}</Text>
          </TouchableOpacity>
        ))}
      </View>
      
      {loading ? (
        <ActivityIndicator size="large" color="#1a2d5a" style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={events}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={{ paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
};


// ==========================================
// MAIN SCREEN
// ==========================================

export default function AttendanceScreen({ navigation }: any) {
  const [activeTab, setActiveTab] = useState<TabType>('Home');
  const { member, user } = useAuth();
  const userName = member?.firstName && member?.lastName 
    ? `${member.firstName} ${member.lastName}` 
    : member?.firstName || 'Guest';

  const [adminModalVisible, setAdminModalVisible] = useState(false);
  const isActualAdmin = member?.userType?.toLowerCase() === 'admin';

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  const renderHeaderTitle = () => {
    if (activeTab === 'Home') {
      return (
        <View style={{ flex: 1 }}>
          <Text style={styles.greetingText}>{getGreeting()}</Text>
          <Text style={[styles.userNameText, { color: '#0f172a' }]}>{userName}</Text>
        </View>
      );
    }
    if (activeTab === 'MyAttendance') {
      return (
        <View style={{ flex: 1 }}>
          <Text style={[styles.userNameText, { color: '#0f172a', fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif' }]}>My attendance</Text>
        </View>
      );
    }
    if (activeTab === 'Events') {
      return (
        <View style={{ flex: 1 }}>
          <Text style={[styles.userNameText, { color: '#0f172a', fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif' }]}>Events</Text>
        </View>
      );
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: '#f4f6f8' }]}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
      
      {/* ── Page Header ── */}
      <View style={[styles.header, { marginTop: Platform.OS === 'android' ? StatusBar.currentHeight : 40 }]}>
        {renderHeaderTitle()}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          {isActualAdmin && activeTab === 'Home' && (
            <TouchableOpacity style={styles.backBtn} onPress={() => setAdminModalVisible(true)}>
              <MoreVertical size={24} color="#0f172a" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* ── Custom Tab Bar ── */}
      <View style={styles.tabBar}>
        {(['Home', 'MyAttendance', 'Events'] as TabType[]).map((tab) => (
          <TouchableOpacity 
            key={tab} 
            style={[styles.tabBtn, activeTab === tab && styles.tabBtnActive]}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[styles.tabBtnText, activeTab === tab && styles.tabBtnTextActive]}>
              {tab === 'MyAttendance' ? 'My attendance' : tab}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* ── Content ── */}
      <View style={{ flex: 1 }}>
        {activeTab === 'Home' && <HomeTab navigation={navigation} member={member} user={user} onNavigateTab={(tab: TabType) => setActiveTab(tab)} adminModalVisible={adminModalVisible} setAdminModalVisible={setAdminModalVisible} />}
        {activeTab === 'MyAttendance' && <MyAttendanceTab member={member} />}
        {activeTab === 'Events' && <EventsTab navigation={navigation} />}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 10,
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  greetingText: { fontSize: 16, color: '#334155', fontWeight: '600', marginBottom: 4 },
  userNameText: { fontSize: 28, fontWeight: '800' },
  backBtn: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(0,0,0,0.05)',
    alignItems: 'center', justifyContent: 'center', marginTop: 4,
  },
  
  // Tab Bar
  tabBar: {
    flexDirection: 'row',
    marginHorizontal: 24,
    marginBottom: 16,
    backgroundColor: '#f1f5f9', // lighter background to contrast the border
    borderRadius: 30, // fully rounded pill
    padding: 4,
    borderWidth: 1,
    borderColor: '#cbd5e1', // ash color border
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 26, // fully rounded pill inner
  },
  tabBtnActive: {
    backgroundColor: '#ffffff',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  tabBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748b',
  },
  tabBtnTextActive: {
    color: '#0f172a',
  },

  // Pills (Sub-filters)
  pillContainer: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    marginBottom: 16,
    gap: 12,
  },
  pill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  pillActive: {
    backgroundColor: '#1e293b',
    borderColor: '#1e293b',
  },
  pillText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#475569',
  },
  pillTextActive: {
    color: '#ffffff',
  },

  listContainer: { paddingBottom: 40 },

  // Home Tab Event Card
  eventCard: {
    width: Dimensions.get('window').width - 32,
    marginHorizontal: 16, marginVertical: 10, backgroundColor: '#ffffff', borderRadius: 24,
    padding: 24, elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 }, borderWidth: 1, borderColor: '#f1f5f9',
  },
  ecHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  statusBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fef3c7', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 16, gap: 6 },
  statusDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#b45309' },
  statusText: { fontSize: 13, fontWeight: '700', color: '#b45309' },
  closesText: { fontSize: 13, fontWeight: '500', color: '#64748b' },
  ecBody: { marginBottom: 24 },
  ecTitle: { fontSize: 24, fontWeight: '700', color: '#0f172a', fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif', marginBottom: 8 },
  ecSubtitle: { fontSize: 14, color: '#64748b', fontWeight: '500' },
  ecDetailText: { fontSize: 15, fontWeight: '400', color: '#64748b', lineHeight: 22 },
  scanButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#d9a027', paddingVertical: 16, borderRadius: 16, gap: 10 },
  scanButtonText: { color: '#1a2d5a', fontSize: 16, fontWeight: '700' },
  viewAttendeesBtn: { alignItems: 'center', marginTop: 16, paddingVertical: 4 },
  viewAttendeesText: { color: '#64748b', fontSize: 14, fontWeight: '600', textDecorationLine: 'underline' },
  badgeBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 10, paddingHorizontal: 12, borderRadius: 30, borderWidth: 1, gap: 4 },
  badgeBtnText: { fontSize: 11.5, fontWeight: '700' },

  // Progress Card
  progressCard: {
    marginHorizontal: 24, marginVertical: 10, backgroundColor: '#ffffff', borderRadius: 16,
    padding: 20, elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 }, borderWidth: 1, borderColor: '#f1f5f9',
    flexDirection: 'row', alignItems: 'center', gap: 20, marginBottom: 24,
  },
  progressContainer: { position: 'relative', alignItems: 'center', justifyContent: 'center', width: 90, height: 90 },
  progressTextContainer: { position: 'absolute', justifyContent: 'center', alignItems: 'center' },
  progressPercentage: { fontSize: 22, fontWeight: '800', color: '#0f172a' },
  progressInfo: { flex: 1 },
  progressTitle: { fontSize: 18, fontWeight: '800', color: '#0f172a', marginBottom: 4 },
  progressSubtitle: { fontSize: 14, color: '#64748b', fontWeight: '500' },
  
  // Pagination
  paginationContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
    marginBottom: 20
  },
  paginationDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#cbd5e1'
  },
  paginationDotActive: {
    width: 20,
    backgroundColor: '#1a2d5a'
  },

  // History List (My Attendance)
  historyRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 16, paddingHorizontal: 24,
  },
  historyTitle: { fontSize: 16, fontWeight: '600', color: '#0f172a', marginBottom: 4 },
  historySubtitle: { fontSize: 14, color: '#64748b' },
  attendanceBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
  attendanceBadgeText: { fontSize: 13, fontWeight: '600' },
  divider: { height: 1, backgroundColor: '#e2e8f0', marginHorizontal: 24 },

  // Global Event Card (Events Tab)
  globalEventCard: {
    marginHorizontal: 24, marginVertical: 8, backgroundColor: '#ffffff', borderRadius: 16,
    padding: 20, elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 }, borderWidth: 1, borderColor: '#f1f5f9',
  },
  geHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  geBadge: { backgroundColor: '#e2e8f0', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  geBadgeText: { fontSize: 12, fontWeight: '600', color: '#475569' },
  geDate: { fontSize: 14, color: '#64748b', fontWeight: '500' },
  geTitle: { fontSize: 20, fontWeight: '700', color: '#0f172a', fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif', marginBottom: 4 },
  geSubtitle: { fontSize: 14, color: '#64748b', marginBottom: 20 },
  geFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  geAttendees: { fontSize: 15, fontWeight: '600', color: '#0f172a' },
  geViewBtn: { borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 8 },
  geViewBtnText: { fontSize: 14, fontWeight: '700', color: '#0f172a' },

  emptyState: { padding: 60, alignItems: 'center', marginTop: 60 },
  emptyTitle: { fontSize: 18, fontWeight: '800', color: '#1a2d5a', marginTop: 15 },
  emptySub: { fontSize: 14, color: '#94a3b8', textAlign: 'center', marginTop: 8 },
});
