import React, { useEffect, useState, useMemo, useRef } from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  FlatList, 
  TouchableOpacity, 
  ActivityIndicator,
  Dimensions,
  StatusBar,
  TextInput,
  Alert,
  Platform,
  Modal,
  ToastAndroid,
  Image,
  Animated,
  Linking
} from 'react-native';
import { 
  ArrowLeft,
  Search,
  Download,
  QrCode,
  X,
  Share2,
  MapPin,
  Phone
} from 'lucide-react-native';
import QRCode from 'react-native-qrcode-svg';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as MediaLibrary from 'expo-media-library';
import * as Location from 'expo-location';
import AttendanceService, { AttendanceRecord } from '../services/AttendanceService';
import SalesforceService from '../services/SalesforceService';
import firestore from '@react-native-firebase/firestore';
import { useAuth } from '../context/AuthContext';

const { width } = Dimensions.get('window');

type FilterType = 'All' | 'Present' | 'Absent';

interface UnifiedMember {
  id: string;
  name: string;
  status: 'Present' | 'Absent';
  timestamp?: any;
  profilePicture?: string;
  locationName?: string;
  mobile?: string;
  village?: string;
}

export default function EventAttendeesScreen({ navigation, route }: any) {
  const { eventId, eventName } = route.params;
  const { member } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterType>('Present');
  const [showQRModal, setShowQRModal] = useState(false);
  const qrRef = useRef<any>(null);
  
  const [allMembers, setAllMembers] = useState<UnifiedMember[]>([]);
  const [selectedMemberModal, setSelectedMemberModal] = useState<UnifiedMember | null>(null);
  const slideAnim = useRef(new Animated.Value(500)).current;

  useEffect(() => {
    if (selectedMemberModal) {
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        damping: 20,
        stiffness: 150
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: 500,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  }, [selectedMemberModal]);
  const [presentCount, setPresentCount] = useState(0);
  const [absentCount, setAbsentCount] = useState(0);
  const [userPhotos, setUserPhotos] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchData();
  }, [eventId]);

  const fetchUserPhotos = async (): Promise<Record<string, string>> => {
    try {
      const snap = await firestore().collection('users').where('photoURL', '!=', null).get();
      const photos: Record<string, string> = {};
      snap.forEach(doc => {
        const data = doc.data();
        if (data.photoURL) {
          if (data.phone) {
            const cleanPhone = data.phone.replace(/\D/g, '').slice(-10);
            photos[cleanPhone] = data.photoURL;
          }
          if (data.sfContactId) photos[data.sfContactId] = data.photoURL;
          photos[doc.id] = data.photoURL;
        }
      });
      setUserPhotos(photos);
      return photos;
    } catch (error) {
      console.log('Error fetching photos:', error);
      return {};
    }
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch photos first, then data
      const photosMap = await fetchUserPhotos();
      
      const [attendees, sfMembers] = await Promise.all([
        AttendanceService.getEventAttendees(eventId),
        SalesforceService.getAllMembers()
      ]);

      const attendedMap = new Map<string, any>();
      attendees.forEach(a => {
        const id = a.memberId || a.id;
        if (id) {
          attendedMap.set(id, { timestamp: a.timestamp, locationName: a.locationName });
        }
      });

      // Combine SF members and attendees. 
      // If someone attended but isn't in SF members, still include them.
      const unifiedMap = new Map<string, UnifiedMember>();

      sfMembers.forEach((m: any) => {
        let photoUrl = undefined;
        const phoneToUse = m.MobilePhone || m.Phone;
        if (phoneToUse) {
          const cleanPhone = phoneToUse.replace(/\D/g, '').slice(-10);
          photoUrl = photosMap[cleanPhone];
        }
        
        unifiedMap.set(m.Id, {
          id: m.Id,
          name: m.Name,
          status: attendedMap.has(m.Id) ? 'Present' : 'Absent',
          timestamp: attendedMap.get(m.Id)?.timestamp,
          locationName: attendedMap.get(m.Id)?.locationName,
          profilePicture: photoUrl || photosMap[m.Id],
          mobile: m.MobilePhone,
          village: m.MailingCity
        });
      });

      // Add attendees who might not be in the SF members list (guests, deleted members, etc.)
      attendees.forEach(a => {
        const mId = a.memberId || a.id;
        if (mId && !unifiedMap.has(mId)) {
          unifiedMap.set(mId, {
            id: mId,
            name: a.memberName || 'Unknown',
            status: 'Present',
            timestamp: a.timestamp,
            locationName: a.locationName,
          });
        }
      });

      const unifiedList = Array.from(unifiedMap.values());
      
      // Sort: Present first (sorted by time desc), then Absent (sorted by name)
      unifiedList.sort((a, b) => {
        if (a.status === 'Present' && b.status === 'Present') {
           const timeA = a.timestamp?.toDate ? a.timestamp.toDate().getTime() : new Date(a.timestamp || 0).getTime();
           const timeB = b.timestamp?.toDate ? b.timestamp.toDate().getTime() : new Date(b.timestamp || 0).getTime();
           return timeB - timeA;
        }
        if (a.status === 'Present') return -1;
        if (b.status === 'Present') return 1;
        return a.name.localeCompare(b.name);
      });

      setAllMembers(unifiedList);
      setPresentCount(unifiedList.filter(m => m.status === 'Present').length);
      setAbsentCount(unifiedList.filter(m => m.status === 'Absent').length);

    } catch (error) {
      console.error('Error fetching event data:', error);
    } finally {
      setLoading(false);
    }
  };

  const displayList = useMemo(() => {
    let filtered = allMembers;
    
    if (activeFilter === 'Present') filtered = filtered.filter(m => m.status === 'Present');
    if (activeFilter === 'Absent') filtered = filtered.filter(m => m.status === 'Absent');
    
    if (searchQuery.trim().length > 0) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(m => m.name.toLowerCase().includes(q));
    }
    
    return filtered;
  }, [allMembers, activeFilter, searchQuery]);

  const formatTime = (dateObj: any) => {
    if (!dateObj) return '';
    try {
      const date = dateObj.toDate ? dateObj.toDate() : new Date(dateObj);
      return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    } catch (e) {
      return '';
    }
  };

  const getInitials = (name: string) => {
    if (!name) return '?';
    const parts = name.split(' ');
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return name.substring(0, 2).toUpperCase();
  };

  const getAvatarColor = (name: string) => {
    const colors = ['#dbeafe', '#fee2e2', '#dcfce7', '#fef3c7', '#f3e8ff', '#e0e7ff'];
    const textColors = ['#1e40af', '#991b1b', '#166534', '#92400e', '#6b21a8', '#3730a3'];
    let hash = 0;
    for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
    const index = Math.abs(hash) % colors.length;
    return { bg: colors[index], text: textColors[index] };
  };

  const handleExportCSV = () => {
    Alert.alert("Export CSV", "The attendees list has been downloaded to your device.");
  };

  const handleDownloadQR = async () => {
    if (qrRef.current) {
      qrRef.current.toDataURL(async (data: string) => {
        try {
          const { status } = await MediaLibrary.requestPermissionsAsync();
          if (status !== 'granted') {
            Alert.alert('Permission needed', 'Please grant permission to save images to your gallery.');
            return;
          }

          const filepath = FileSystem.documentDirectory + 'church-attendance-qr.png';
          await FileSystem.writeAsStringAsync(filepath, data, {
            encoding: FileSystem.EncodingType.Base64,
          });
          
          await MediaLibrary.saveToLibraryAsync(filepath);
          
          if (Platform.OS === 'android') {
            ToastAndroid.show('QR Code saved to gallery', ToastAndroid.SHORT);
          } else {
            Alert.alert('Success', 'QR Code saved to gallery');
          }
        } catch (error) {
          Alert.alert("Error", "Failed to save QR Code.");
        }
      });
    }
  };

  const handleShareQR = () => {
    if (qrRef.current) {
      qrRef.current.toDataURL(async (data: string) => {
        try {
          const filepath = FileSystem.documentDirectory + 'church-attendance-qr.png';
          await FileSystem.writeAsStringAsync(filepath, data, {
            encoding: FileSystem.EncodingType.Base64,
          });
          
          if (await Sharing.isAvailableAsync()) {
            await Sharing.shareAsync(filepath, {
              mimeType: 'image/png',
              dialogTitle: 'Share QR Code',
            });
          } else {
            Alert.alert("Success", "QR Code has been generated.");
          }
        } catch (error) {
          Alert.alert("Error", "Failed to share QR Code.");
        }
      });
    }
  };

  const setVenueLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Location permission is required to set the venue location.');
        return;
      }
      
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      await firestore().collection('event_locations').doc(eventId).set({
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
        timestamp: firestore.FieldValue.serverTimestamp()
      }, { merge: true });

      if (Platform.OS === 'android') {
        ToastAndroid.show('Venue location has been locked!', ToastAndroid.LONG);
      } else {
        Alert.alert('Success', 'Venue location has been locked! Members must now be within 200m of your current spot to log attendance.');
      }
    } catch (e: any) {
      const errorMsg = e?.message || 'Unknown error occurred.';
      Alert.alert('Error', `Failed to set location.\n\nDetails: ${errorMsg}\n\nMake sure your GPS is enabled.`);
    }
  };

  const renderItem = ({ item }: { item: UnifiedMember }) => {
    const avatar = getAvatarColor(item.name);
    const photoUrl = item.profilePicture || userPhotos[item.id];
    
    return (
      <TouchableOpacity 
        style={styles.attendeeCard} 
        onPress={() => setSelectedMemberModal(item)} 
        activeOpacity={0.7}
        disabled={member?.userType !== 'Admin'}
      >
        {photoUrl ? (
          <Image source={{ uri: photoUrl }} style={styles.avatarImage} />
        ) : (
          <View style={[styles.avatar, { backgroundColor: avatar.bg }]}>
            <Text style={[styles.avatarText, { color: avatar.text }]}>{getInitials(item.name)}</Text>
          </View>
        )}
        <View style={[styles.attendeeInfo, { paddingRight: 12 }]}>
          <Text style={styles.attendeeName} numberOfLines={1}>{item.name}</Text>
          {item.status === 'Present' && item.locationName ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 2 }}>
              <MapPin size={10} color="#64748b" style={{ marginRight: 4, flexShrink: 0 }} />
              <Text style={[styles.timeText, { flexShrink: 1 }]} numberOfLines={1}>
                {item.locationName === 'Location not specified' || item.locationName === 'Main Church Campus' ? 'Unspecified' : item.locationName}
              </Text>
              <Text style={[styles.timeText, { flexShrink: 0 }]}>
                {' • '}{formatTime(item.timestamp)}
              </Text>
            </View>
          ) : item.status === 'Present' ? (
            <Text style={styles.timeText}>{formatTime(item.timestamp)}</Text>
          ) : null}
        </View>
        <View style={[
          styles.badge, 
          { backgroundColor: item.status === 'Present' ? '#dcfce7' : '#f1f5f9' }
        ]}>
          <Text style={[
            styles.badgeText, 
            { color: item.status === 'Present' ? '#16a34a' : '#64748b' }
          ]}>{item.status}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
      
      {/* ── Page Header ── */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <ArrowLeft size={24} color="#0f172a" />
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.headerActionBtn, { backgroundColor: '#f1f5f9', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, flexDirection: 'row', alignItems: 'center', gap: 6 }]}
            onPress={() => setShowQRModal(true)}
          >
            <QrCode size={18} color="#1a2d5a" />
            <Text style={{ fontSize: 14, fontWeight: '600', color: '#1a2d5a' }}>Show QR</Text>
          </TouchableOpacity>
        </View>
        
        <View style={{ paddingRight: 10 }}>
          <Text style={styles.headerTitle} numberOfLines={1} adjustsFontSizeToFit>{eventName}</Text>
          <Text style={styles.headerSub}>{new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</Text>
        </View>
      </View>

      {/* ── QR Code Modal ── */}
      <Modal visible={showQRModal} transparent={true} animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            
            <View style={styles.modalHeaderRow}>
              <View>
                <Text style={styles.modalTitle}>Scan for Attendance</Text>
              </View>
              <TouchableOpacity style={styles.modalCloseIconBtn} onPress={() => setShowQRModal(false)}>
                <X size={24} color="#64748b" />
              </TouchableOpacity>
            </View>
            
            <View style={styles.qrContainer}>
              <QRCode 
                getRef={(c) => (qrRef.current = c)}
                value={JSON.stringify({ action: 'ChurchOfGod_Attendance' })}
                size={220}
                color="#0f172a"
                backgroundColor="#ffffff"
              />
            </View>
            
            <View style={{ flexDirection: 'row', gap: 16 }}>
              <TouchableOpacity style={styles.modalActionIconBtn} onPress={handleDownloadQR}>
                <Download size={24} color="#1e293b" />
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.modalActionIconBtn} onPress={handleShareQR}>
                <Share2 size={24} color="#1e293b" />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── Search Bar ── */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBox}>
          <Search size={20} color="#64748b" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search members"
            placeholderTextColor="#94a3b8"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </View>

      {/* ── Filter Pills ── */}
      <View style={styles.pillContainer}>
        {(['All', 'Present', 'Absent'] as FilterType[]).map((f) => {
          let countStr = '';
          if (f === 'All') countStr = ` ${allMembers.length}`;
          if (f === 'Present') countStr = ` ${presentCount}`;
          if (f === 'Absent') countStr = ` ${absentCount}`;
          
          return (
            <TouchableOpacity 
              key={f} 
              style={[styles.pill, activeFilter === f && styles.pillActive]}
              onPress={() => setActiveFilter(f)}
            >
              <Text style={[styles.pillText, activeFilter === f && styles.pillTextActive]}>
                {f}{countStr}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
      
      {/* ── List ── */}
      {loading ? (
        <View style={styles.loader}>
          <ActivityIndicator size="large" color="#1a2d5a" />
        </View>
      ) : (
        <FlatList
          data={displayList}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
          ItemSeparatorComponent={() => <View style={styles.divider} />}
        />
      )}

      {/* Member Details Modal */}
      <Modal visible={!!selectedMemberModal} transparent={true} animationType="fade" onRequestClose={() => setSelectedMemberModal(null)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)' }}>
          <TouchableOpacity style={{ flex: 1, justifyContent: 'flex-end' }} activeOpacity={1} onPress={() => setSelectedMemberModal(null)}>
            <Animated.View style={{ transform: [{ translateY: slideAnim }] }}>
              <TouchableOpacity activeOpacity={1} style={{ backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: Platform.OS === 'ios' ? 40 : 24 }}>
                <View style={{ width: 40, height: 4, backgroundColor: '#e2e8f0', borderRadius: 2, alignSelf: 'center', marginBottom: 20 }} />
            
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 24 }}>
              {selectedMemberModal?.profilePicture ? (
                <Image source={{ uri: selectedMemberModal.profilePicture }} style={{ width: 64, height: 64, borderRadius: 32, marginRight: 16 }} />
              ) : (
                <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center', marginRight: 16 }}>
                  <Text style={{ fontSize: 24, fontWeight: '700', color: '#64748b' }}>{getInitials(selectedMemberModal?.name || '')}</Text>
                </View>
              )}
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 20, fontWeight: '700', color: '#0f172a', marginBottom: 4 }}>{selectedMemberModal?.name}</Text>
                <View style={[styles.badge, { alignSelf: 'flex-start', backgroundColor: selectedMemberModal?.status === 'Present' ? '#dcfce7' : '#f1f5f9' }]}>
                  <Text style={[styles.badgeText, { color: selectedMemberModal?.status === 'Present' ? '#16a34a' : '#64748b' }]}>{selectedMemberModal?.status}</Text>
                </View>
              </View>
            </View>

            <View style={{ gap: 16 }}>
              <TouchableOpacity 
                style={{ flexDirection: 'row', alignItems: 'center' }}
                activeOpacity={0.7}
                onPress={() => {
                  if (selectedMemberModal?.mobile) {
                    Linking.openURL(`tel:${selectedMemberModal.mobile}`);
                  }
                }}
              >
                <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: '#f8fafc', alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
                  <Phone size={18} color="#0f172a" />
                </View>
                <View>
                  <Text style={{ fontSize: 13, color: '#64748b', marginBottom: 2 }}>Mobile Number</Text>
                  <Text style={{ fontSize: 16, fontWeight: '600', color: '#2563eb' }}>{selectedMemberModal?.mobile || 'Not available'}</Text>
                </View>
              </TouchableOpacity>

              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: '#f8fafc', alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
                  <MapPin size={18} color="#0f172a" />
                </View>
                <View>
                  <Text style={{ fontSize: 13, color: '#64748b', marginBottom: 2 }}>Village / Location</Text>
                  <Text style={{ fontSize: 16, fontWeight: '600', color: '#0f172a' }}>{selectedMemberModal?.village || 'Not available'}</Text>
                </View>
              </View>
            </View>
          </TouchableOpacity>
          </Animated.View>
          </TouchableOpacity>
        </View>
      </Modal>

    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f4f6f8' },
  header: {
    paddingHorizontal: 24,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight! + 10 : 50,
    paddingBottom: 16,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    gap: 6,
  },
  headerActionText: {
    color: '#1a2d5a',
    fontSize: 14,
    fontWeight: '600',
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(0,0,0,0.05)',
    alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#0f172a',
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
    marginBottom: 4
  },
  headerSub: {
    fontSize: 15,
    color: '#64748b'
  },
  iconBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#94a3b8',
    borderRadius: 12,
    backgroundColor: '#ffffff'
  },
  
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 32,
    width: '100%',
    alignItems: 'center',
  },
  modalHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 24,
    alignItems: 'flex-start'
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 4,
  },
  modalSub: {
    fontSize: 14,
    color: '#64748b',
  },
  modalCloseIconBtn: {
    padding: 4,
    marginLeft: 12,
  },
  qrContainer: {
    padding: 16,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
    marginBottom: 24,
  },
  modalActionIconBtn: {
    backgroundColor: '#f1f5f9',
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },

  searchContainer: {
    paddingHorizontal: 24,
    marginBottom: 16,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 16,
    paddingHorizontal: 16,
    height: 52,
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#0f172a',
  },

  pillContainer: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    marginBottom: 16,
    gap: 12,
  },
  pill: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 24,
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

  listContainer: { paddingBottom: 40, paddingHorizontal: 24 },
  
  attendeeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12
  },
  avatarImage: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 12,
    backgroundColor: '#f1f5f9'
  },
  avatarText: {
    fontSize: 18,
    fontWeight: '700'
  },
  attendeeInfo: {
    flex: 1
  },
  attendeeName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0f172a',
    marginBottom: 4
  },
  timeText: {
    fontSize: 13,
    color: '#64748b'
  },
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600'
  },
  divider: {
    height: 1,
    backgroundColor: '#e2e8f0',
  },
  loader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 60
  }
});
