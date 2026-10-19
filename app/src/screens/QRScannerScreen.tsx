import React, { useState, useEffect, useRef } from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  TouchableOpacity, 
  Dimensions, 
  StatusBar, 
  Platform, 
  Alert, 
  ActivityIndicator, 
  Animated, 
  Vibration,
  ScrollView,
  ToastAndroid
} from 'react-native';
import { Camera, CameraView, useCameraPermissions } from 'expo-camera';
import Svg, { Defs, LinearGradient, Stop, Rect, Mask } from 'react-native-svg';
import { 
  ArrowLeft, 
  CheckCircle2, 
  MapPinOff, 
  X, 
  AlertCircle, 
  Users, 
  Check, 
  UserCheck, 
  Sparkles,
  MapPin,
  Calendar,
  Clock
} from 'lucide-react-native';
import * as Location from 'expo-location';
import firestore from '@react-native-firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import AttendanceService from '../services/AttendanceService';
import SalesforceService from '../services/SalesforceService';
import { getDistanceInMeters } from '../utils/geoUtils';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

const { width, height } = Dimensions.get('window');

export default function QRScannerScreen({ navigation, route }: any) {
  const { eventId, eventName, locationName } = route.params;
  const { member } = useAuth();
  const { isDark } = useTheme();
  const [permission, requestPermission] = useCameraPermissions();
  const [locationPermission, requestLocationPermission] = Location.useForegroundPermissions();
  const [scanned, setScanned] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [alreadyMarked, setAlreadyMarked] = useState(false);
  const [errorDetails, setErrorDetails] = useState<{title: string, message: string, type: 'location' | 'qr'} | null>(null);

  // Family attendance states
  const [familyMembers, setFamilyMembers] = useState<any[]>([]);
  const [loadingFamily, setLoadingFamily] = useState(false);
  const [selectedMemberIds, setSelectedMemberIds] = useState<{ [id: string]: boolean }>({});
  const [alreadyAttendedFamilyIds, setAlreadyAttendedFamilyIds] = useState<{ [id: string]: boolean }>({});
  const [savingFamily, setSavingFamily] = useState(false);
  const [familySaveSuccess, setFamilySaveSuccess] = useState(false);
  const [resolvedLocation, setResolvedLocation] = useState<string>('');
  
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const getContactId = (c: any): string => {
    return (c?.Id || c?.id || '').toString();
  };

  const getContactName = (c: any): string => {
    return c?.Name || `${c?.FirstName || ''} ${c?.LastName || ''}`.trim() || c?.name || 'Family Member';
  };

  // Load family members belonging to current user's household (from cache + Salesforce)
  useEffect(() => {
    let isMounted = true;
    const loadFamily = async () => {
      if (!member?.accountId) return;
      const currentUserId = (member.id || '').toString();
      const cacheKey = `cache_members_${member.accountId}`;
      try {
        // 1. Read from cache first for instant display
        try {
          const cached = await AsyncStorage.getItem(cacheKey);
          if (cached && isMounted) {
            const list = JSON.parse(cached);
            if (Array.isArray(list)) {
              setFamilyMembers(list.filter((c: any) => {
                const cId = getContactId(c);
                return cId && cId !== currentUserId;
              }));
            }
          }
        } catch (e) {}

        // 2. Fetch fresh household members from Salesforce
        const fresh = await SalesforceService.getRelatedContacts(member.accountId);
        if (isMounted && Array.isArray(fresh)) {
          setFamilyMembers(fresh.filter((c: any) => {
            const cId = getContactId(c);
            return cId && cId !== currentUserId;
          }));
          AsyncStorage.setItem(cacheKey, JSON.stringify(fresh)).catch(() => {});
        }
      } catch (err) {
        console.warn('Could not load household family members:', err);
      }
    };

    loadFamily();
    return () => { isMounted = false; };
  }, [member?.accountId, member?.id]);

  // When attendance succeeds, check which family members have already attended this event
  useEffect(() => {
    if (success && familyMembers.length > 0) {
      let isMounted = true;
      const checkExistingFamilyAttendance = async () => {
        setLoadingFamily(true);
        try {
          const statusMap: { [id: string]: boolean } = {};
          await Promise.all(
            familyMembers.map(async (fam) => {
              const cId = getContactId(fam);
              if (!cId) return;
              const attended = await AttendanceService.hasAttended(eventId, cId);
              if (attended) {
                statusMap[cId] = true;
              }
            })
          );
          if (isMounted) {
            setAlreadyAttendedFamilyIds(statusMap);
          }
        } catch (e) {
          console.warn('Failed checking family attendance status:', e);
        } finally {
          if (isMounted) setLoadingFamily(false);
        }
      };
      checkExistingFamilyAttendance();
      return () => { isMounted = false; };
    }
  }, [success, familyMembers, eventId]);

  const getInitials = (name: string) => {
    if (!name) return 'F';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    return name[0].toUpperCase();
  };

  const handleToggleMember = (id: string) => {
    if (!id || alreadyAttendedFamilyIds[id]) return;
    setSelectedMemberIds(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const handleToggleSelectAll = () => {
    const unAttended = familyMembers.filter(m => {
      const cId = getContactId(m);
      return cId && !alreadyAttendedFamilyIds[cId];
    });
    const allSelected = unAttended.length > 0 && unAttended.every(m => selectedMemberIds[getContactId(m)]);
    const newSelected: { [id: string]: boolean } = {};
    if (!allSelected) {
      unAttended.forEach(m => {
        const cId = getContactId(m);
        if (cId) newSelected[cId] = true;
      });
    }
    setSelectedMemberIds(newSelected);
  };

  const handleSaveFamilyAttendance = async (): Promise<boolean> => {
    const idsToMark = Object.keys(selectedMemberIds).filter(
      id => selectedMemberIds[id] && !alreadyAttendedFamilyIds[id]
    );
    if (idsToMark.length === 0) return true;

    setSavingFamily(true);
    try {
      const locationToUse = resolvedLocation || locationName || 'Unspecified';
      const currentUserAudit = member ? { 
        id: (member.id || '').toString(), 
        name: (member.name || '').toString() 
      } : undefined;

      await Promise.all(
        idsToMark.map(async (contactId) => {
          if (!contactId) return;
          const contact = familyMembers.find(f => getContactId(f) === contactId);
          const contactName = getContactName(contact);
          await AttendanceService.logAttendance(
            eventId,
            eventName,
            contactId,
            contactName,
            locationToUse,
            currentUserAudit
          );
        })
      );

      const updated = { ...alreadyAttendedFamilyIds };
      idsToMark.forEach(id => {
        updated[id] = true;
      });
      setAlreadyAttendedFamilyIds(updated);
      setSelectedMemberIds({});
      setFamilySaveSuccess(true);
      Vibration.vibrate(100);
      if (Platform.OS === 'android') {
        ToastAndroid.show('Family attendance recorded successfully!', ToastAndroid.SHORT);
      }
      return true;
    } catch (err) {
      console.error('Error saving family attendance:', err);
      Alert.alert('Error', 'Failed to save attendance for some family members. Please try again.');
      return false;
    } finally {
      setSavingFamily(false);
    }
  };

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(scaleAnim, {
          toValue: 0.9,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [scaleAnim]);

  useEffect(() => {
    if (!permission?.granted) {
      requestPermission();
    }
    if (!locationPermission?.granted) {
      requestLocationPermission();
    }
  }, [permission, locationPermission]);

  const handleBarCodeScanned = async ({ type, data }: any) => {
    if (scanned || loading || success) return;
    setScanned(true);

    try {
      // Validate the QR code
      let parsedData;
      try {
        parsedData = JSON.parse(data);
      } catch (e) {
        setErrorDetails({
          title: 'Invalid QR Code',
          message: 'Please scan the official Church of God attendance QR code.',
          type: 'qr'
        });
        return;
      }

      if (parsedData.action !== 'ChurchOfGod_Attendance') {
        setErrorDetails({
          title: 'Invalid QR Code',
          message: 'Please scan the official Church of God attendance QR code.',
          type: 'qr'
        });
        return;
      }

      if (!member?.id || !member?.name) {
        Alert.alert('Error', 'Unable to identify member. Please complete your profile.', [
          { text: 'Go Back', onPress: () => navigation.goBack() }
        ]);
        return;
      }

      // Vibrate to provide immediate feedback that the scan process started
      Vibration.vibrate(100);

      setLoading(true);

      // Verify Location (Geofencing)
      if (!locationPermission?.granted) {
        setLoading(false);
        setErrorDetails({
          title: 'Location Required',
          message: 'You must grant location permissions to verify you are at the church venue.',
          type: 'location'
        });
        return;
      }

      let userLocation;
      try {
        userLocation = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      } catch (locError) {
        setLoading(false);
        setErrorDetails({
          title: 'Location Error',
          message: 'Unable to fetch your exact location. Ensure GPS is enabled and try again.',
          type: 'location'
        });
        return;
      }

      // Default Church Coordinates
      let targetLat = 15.230898;
      let targetLon = 78.312552;

      // Check if this specific event has overridden coordinates in Firebase
      let customLocationName = null;
      try {
        const eventLocDoc = await firestore().collection('event_locations').doc(eventId).get();
        const data = eventLocDoc.data();
        if (data && data.latitude && data.longitude) {
          targetLat = data.latitude;
          targetLon = data.longitude;
          customLocationName = data.locationName;
        }
      } catch (e) {
        console.warn('Could not fetch custom event location, using default.');
      }

      const distance = getDistanceInMeters(
        userLocation.coords.latitude, 
        userLocation.coords.longitude,
        targetLat,
        targetLon
      );

      // Max allowed radius (e.g., 200 meters)
      const MAX_RADIUS = 200;

      if (distance > MAX_RADIUS) {
        setLoading(false);
        setErrorDetails({
          title: 'Too Far',
          message: `You are too far from the venue. Please move closer. (${Math.round(distance)}m away)`,
          type: 'location'
        });
        return;
      }

      // Check for duplicate attendance
      const alreadyAttended = await AttendanceService.hasAttended(eventId, member.id);
      
      const rawLocationName = customLocationName || locationName || 'Unspecified';
      // Strip any Plus Codes (e.g., 68J7+53M, ) from the string
      const finalLocationName = rawLocationName.replace(/[0-9A-Z]{2,6}\+[0-9A-Z]{2,4}(,\s*)?/g, '').trim() || 'Unspecified';
      setResolvedLocation(finalLocationName);

      if (alreadyAttended) {
        setLoading(false);
        setAlreadyMarked(true);
        return;
      }

      // Log attendance
      await AttendanceService.logAttendance(
        eventId,
        eventName,
        member.id,
        member.name,
        finalLocationName
      );

      setLoading(false);
      setSuccess(true);
    } catch (error) {
      setLoading(false);
      setErrorDetails({
        title: 'Error',
        message: 'Failed to log attendance. Please try again.',
        type: 'qr'
      });
    }
  };

  if (!permission) {
    return <View style={styles.container}><ActivityIndicator size="large" color="#1a2d5a" /></View>;
  }

  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <Text style={styles.message}>We need your permission to show the camera</Text>
        <TouchableOpacity style={styles.button} onPress={requestPermission}>
          <Text style={styles.buttonText}>Grant Permission</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.button, { backgroundColor: '#64748b', marginTop: 10 }]} onPress={() => navigation.goBack()}>
          <Text style={styles.buttonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (alreadyMarked) {
    const today = new Date();
    const formattedDate = today.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    const formattedTime = today.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });

    return (
      <View style={[styles.container, { backgroundColor: '#ffffff' }]}>
        <StatusBar
          barStyle="dark-content"
          backgroundColor="transparent"
          translucent
        />
        <ScrollView
          contentContainerStyle={[
            styles.successScrollContainer,
            { paddingTop: Platform.OS === 'ios' ? 60 : 45, alignItems: 'center' }
          ]}
          showsVerticalScrollIndicator={false}
        >
          {/* Already-marked badge */}
          <View style={[
            styles.successIconContainer,
            { backgroundColor: '#e0f2fe', borderColor: '#93c5fd' }
          ]}>
            <UserCheck size={40} color="#2563eb" />
          </View>

          <Text style={styles.successTitle}>
            You're Already Checked In
          </Text>
          <Text style={styles.successSubtitle}>
            Your attendance for this event has already been recorded. No action needed.
          </Text>

          {/* Event Details Card */}
          <View style={styles.detailsCard}>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Event</Text>
              <Text style={styles.detailValue} numberOfLines={1}>
                {eventName}
              </Text>
            </View>
            <View style={styles.detailDivider} />
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Date</Text>
              <Text style={styles.detailValue}>{formattedDate}</Text>
            </View>
            <View style={styles.detailDivider} />
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Time</Text>
              <Text style={styles.detailValue}>{formattedTime}</Text>
            </View>
          </View>

          {/* Info notice */}
          <View style={{
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: '#eff6ff',
            borderRadius: 14,
            padding: 14,
            marginBottom: 28,
            borderWidth: 1,
            borderColor: '#bfdbfe',
            width: '100%',
          }}>
            <CheckCircle2 size={20} color="#2563eb" style={{ marginRight: 10 }} />
            <Text style={{ flex: 1, fontSize: 13, color: '#1d4ed8', lineHeight: 19 }}>
              Duplicate attendance is not allowed. Your presence is already confirmed for this event.
            </Text>
          </View>

          {/* Family members — if any — still let them mark */}
          {familyMembers.length > 0 && (
            <TouchableOpacity
              onPress={() => { setAlreadyMarked(false); setSuccess(true); }}
              style={[
                styles.familyActionBtn,
                { backgroundColor: '#f1f5f9', borderColor: '#cbd5e1', marginBottom: 12 }
              ]}
            >
              <Users size={18} color="#475569" />
              <Text style={{ marginLeft: 8, fontWeight: '600', fontSize: 15, color: '#475569' }}>
                Mark Family Members
              </Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.successDoneBtn}
          >
            <Text style={styles.successDoneBtnText}>Done</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    );
  }

  if (success) {
    const today = new Date();
    const formattedDate = today.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    const formattedTime = today.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });

    const selectedCount = Object.keys(selectedMemberIds).filter(
      id => selectedMemberIds[id] && !alreadyAttendedFamilyIds[id]
    ).length;

    const unAttendedFamily = familyMembers.filter(m => !alreadyAttendedFamilyIds[m.Id]);
    const isAllSelected = unAttendedFamily.length > 0 && unAttendedFamily.every(m => selectedMemberIds[m.Id]);

    return (
      <View style={[styles.container, { backgroundColor: '#ffffff' }]}>
        <StatusBar
          barStyle="dark-content"
          backgroundColor="transparent"
          translucent
        />

        <ScrollView
          contentContainerStyle={[
            styles.successScrollContainer,
            { paddingTop: Platform.OS === 'ios' ? 60 : 45, paddingBottom: 100 }
          ]}
          showsVerticalScrollIndicator={false}
        >
          {/* Success Check Badge */}
          <View style={styles.successIconContainer}>
            <CheckCircle2 size={40} color="#16a34a" />
          </View>

          <Text style={styles.successTitle}>
            You're marked present
          </Text>
          <Text style={styles.successSubtitle}>
            Your attendance has been recorded successfully.
          </Text>

          {/* Event Details Card */}
          <View style={styles.detailsCard}>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Event</Text>
              <Text style={styles.detailValue} numberOfLines={1}>
                {eventName}
              </Text>
            </View>
            <View style={styles.detailDivider} />
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Date</Text>
              <Text style={styles.detailValue}>{formattedDate}</Text>
            </View>
            <View style={styles.detailDivider} />
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Time</Text>
              <Text style={styles.detailValue}>{formattedTime}</Text>
            </View>
            {resolvedLocation ? (
              <>
                <View style={styles.detailDivider} />
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Location</Text>
                  <Text style={styles.detailValue} numberOfLines={1}>
                    {resolvedLocation}
                  </Text>
                </View>
              </>
            ) : null}
          </View>

          {/* Optional Family Members Attendance Section */}
          {familyMembers.length > 0 && (
            <View style={styles.familySection}>
              <View style={styles.familyHeaderRow}>
                <View style={styles.familyIconWrap}>
                  <Users size={18} color="#3b82f6" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.familyTitle}>
                    Family Attendance
                  </Text>
                  <Text style={styles.familyTitleTe}>
                    కుటుంబ సభ్యుల హాజరు
                  </Text>
                </View>
              </View>
              <Text style={styles.familySub}>
                Select children or family members who attended with you:
              </Text>

              {loadingFamily ? (
                <View style={{ paddingVertical: 20, alignItems: 'center' }}>
                  <ActivityIndicator size="small" color="#3b82f6" />
                  <Text style={{ marginTop: 8, fontSize: 13, color: '#64748b' }}>
                    Checking family attendance status...
                  </Text>
                </View>
              ) : (
                <>
                  {unAttendedFamily.length > 0 && (
                    <View style={styles.familyActionBar}>
                      <Text style={styles.familyCountText}>
                        {familyMembers.length} family member{familyMembers.length > 1 ? 's' : ''} in household
                      </Text>
                      <TouchableOpacity
                        style={styles.selectAllBtn}
                        onPress={handleToggleSelectAll}
                        activeOpacity={0.7}
                      >
                        <Text style={styles.selectAllBtnText}>
                          {isAllSelected ? 'Deselect All' : 'Select All'}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  )}

                  <View style={styles.familyList}>
                    {familyMembers.map((fam) => {
                      const cId = getContactId(fam);
                      const isAttended = !!alreadyAttendedFamilyIds[cId];
                      const isSelected = !!selectedMemberIds[cId];
                      const fullName = getContactName(fam);
                      const relation = fam.Title || fam.User_Type__c || 'Family Member';

                      return (
                        <TouchableOpacity
                          key={cId || fullName}
                          style={[
                            styles.memberItem,
                            isSelected && { backgroundColor: '#f0fdf4' },
                            isAttended && { opacity: 0.85 }
                          ]}
                          onPress={() => handleToggleMember(cId)}
                          disabled={isAttended || savingFamily}
                          activeOpacity={0.7}
                        >
                          <View style={styles.memberAvatar}>
                            <Text style={styles.memberAvatarText}>
                              {getInitials(fullName)}
                            </Text>
                          </View>

                          <View style={styles.memberInfo}>
                            <Text style={styles.memberName} numberOfLines={1}>
                              {fullName}
                            </Text>
                            <View style={styles.relationPill}>
                              <Text style={styles.relationText}>
                                {relation}
                              </Text>
                            </View>
                          </View>

                          {isAttended ? (
                            <View style={styles.attendedBadge}>
                              <UserCheck size={14} color="#16a34a" />
                              <Text style={styles.attendedBadgeText}>Attended</Text>
                            </View>
                          ) : (
                            <View style={[
                              styles.checkbox,
                              isSelected && styles.checkboxSelected
                            ]}>
                              {isSelected && <Check size={15} color="#fff" strokeWidth={3} />}
                            </View>
                          )}
                        </TouchableOpacity>
                      );
                    })}
                  </View>

                  {familySaveSuccess && (
                    <View style={styles.saveSuccessBanner}>
                      <CheckCircle2 size={16} color="#16a34a" />
                      <Text style={styles.saveSuccessText}>
                        Family attendance marked successfully!
                      </Text>
                    </View>
                  )}

                  {selectedCount > 0 && (
                    <TouchableOpacity
                      style={styles.saveFamilyBtn}
                      onPress={handleSaveFamilyAttendance}
                      disabled={savingFamily}
                      activeOpacity={0.8}
                    >
                      {savingFamily ? (
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                          <ActivityIndicator size="small" color="#fff" />
                          <Text style={styles.saveFamilyBtnText}>Recording Attendance...</Text>
                        </View>
                      ) : (
                        <Text style={styles.saveFamilyBtnText}>
                          Mark Attendance for {selectedCount} Member{selectedCount > 1 ? 's' : ''}
                        </Text>
                      )}
                    </TouchableOpacity>
                  )}
                </>
              )}
            </View>
          )}

          {/* Action Buttons — always visible */}
          <View style={{
            flexDirection: 'row',
            gap: 12,
            marginTop: 8,
            marginBottom: 20,
          }}>
            <TouchableOpacity
              style={{
                flex: 1,
                paddingVertical: 14,
                borderRadius: 50,
                borderWidth: 1.5,
                borderColor: '#cbd5e1',
                backgroundColor: '#f8fafc',
                alignItems: 'center',
                justifyContent: 'center',
              }}
              onPress={() => navigation.goBack()}
              activeOpacity={0.75}
            >
              <Text style={{ fontSize: 15, fontWeight: '700', color: '#334155' }}>Done</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={{
                flex: 1,
                paddingVertical: 14,
                borderRadius: 50,
                borderWidth: 1.5,
                borderColor: '#cbd5e1',
                backgroundColor: '#f8fafc',
                alignItems: 'center',
                justifyContent: 'center',
              }}
              onPress={() => {
                navigation.goBack();
                navigation.navigate('EventAttendees', { eventId, eventName });
              }}
              activeOpacity={0.75}
            >
              <Text style={{ fontSize: 13, fontWeight: '700', color: '#334155', textAlign: 'center' }}>View Attendees</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <CameraView 
        style={StyleSheet.absoluteFillObject}
        facing="back"
        onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
        barcodeScannerSettings={{
          barcodeTypes: ['qr'],
        }}
      />
      
      {/* Scanner Overlay UI */}
      <View style={styles.overlay}>
        
        {/* The SVG Mask for Rounded Transparent Cutout */}
        <View pointerEvents="none" style={StyleSheet.absoluteFillObject}>
          <Svg height="100%" width="100%">
            <Defs>
              <Mask id="mask" x="0" y="0" height="100%" width="100%">
                <Rect height="100%" width="100%" fill="#fff" />
                <Rect x={(width - 280) / 2} y={(height - 280) / 2 - 30} width="280" height="280" rx="32" ry="32" fill="#000" />
              </Mask>
            </Defs>
            <Rect height="100%" width="100%" fill="rgba(0,0,0,0.6)" mask="url(#mask)" />
          </Svg>
        </View>

        {/* Content Container (Header, Scan Area, Footer) */}
        <View style={styles.contentContainer} pointerEvents="box-none">
          <View pointerEvents="box-none">
            <View style={styles.header}>
              <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
                <ArrowLeft size={24} color="#fff" />
              </TouchableOpacity>
              <Text style={styles.headerTitle}>Scan QR Code</Text>
              <View style={{ width: 40 }} />
            </View>
            
            <View style={styles.scanAreaWrapper} pointerEvents="none">
              <Text style={styles.scanInstruction}>Scan the Attendance QR Code for</Text>
              <Text style={styles.scanEventName}>{eventName}</Text>
            </View>
          </View>
          
          {/* Absolutely positioned scanning box to perfectly match the SVG hole */}
          <View style={styles.focusedBoxContainer} pointerEvents="box-none">
            <View style={styles.focusedBox}>
              {/* PhonePe style curved corners with scale animation */}
              <Animated.View style={{ ...StyleSheet.absoluteFillObject, transform: [{ scale: scaleAnim }] }}>
                <View style={[styles.corner, styles.topLeftCorner]} />
                <View style={[styles.corner, styles.topRightCorner]} />
                <View style={[styles.corner, styles.bottomLeftCorner]} />
                <View style={[styles.corner, styles.bottomRightCorner]} />
              </Animated.View>

              {/* Loading Indicator inside the scan box */}
              {loading && (
                <View style={styles.loadingCard}>
                  <ActivityIndicator size="small" color="#1a2d5a" />
                  <Text style={styles.loadingText}>Please wait...</Text>
                </View>
              )}

              {/* Error Box (Premium Stylish) */}
              {errorDetails && (
                <View style={{
                  position: 'absolute',
                  alignSelf: 'center',
                  width: width * 0.85,
                  backgroundColor: '#ffffff',
                  borderRadius: 24,
                  padding: 24,
                  alignItems: 'center',
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 10 },
                  shadowOpacity: 0.15,
                  shadowRadius: 20,
                  elevation: 15,
                  zIndex: 20,
                }}>
                  <View style={{ 
                    backgroundColor: '#fee2e2', 
                    padding: 16, 
                    borderRadius: 40, 
                    marginBottom: 16 
                  }}>
                    {errorDetails.type === 'location' ? (
                      <MapPinOff size={32} color="#ef4444" />
                    ) : (
                      <AlertCircle size={32} color="#ef4444" />
                    )}
                  </View>
                  <Text style={{ fontSize: 20, fontWeight: '800', color: '#0f172a', marginBottom: 8, textAlign: 'center' }}>
                    {errorDetails.title}
                  </Text>
                  <Text style={{ fontSize: 15, color: '#475569', textAlign: 'center', lineHeight: 22, marginBottom: 24 }}>
                    {errorDetails.message}
                  </Text>
                  <TouchableOpacity onPress={() => {
                    setErrorDetails(null);
                    setScanned(false);
                  }} style={{ 
                    backgroundColor: '#ef4444', 
                    paddingVertical: 14, 
                    paddingHorizontal: 32, 
                    borderRadius: 30,
                    width: '100%',
                    alignItems: 'center',
                  }}>
                    <Text style={{ color: '#fff', fontWeight: '700', fontSize: 16 }}>Try Again</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </View>

          <View style={styles.overlayBottomFixed} pointerEvents="none">
            <Text style={styles.instructionsText}>
              Center the QR code inside the frame to record your attendance.
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center'
  },
  message: {
    textAlign: 'center',
    paddingBottom: 10,
    color: '#fff',
    fontSize: 16
  },
  button: {
    backgroundColor: '#1a2d5a',
    padding: 15,
    borderRadius: 8,
    marginHorizontal: 40,
    alignItems: 'center'
  },
  buttonText: {
    color: '#fff',
    fontWeight: '700'
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'space-between',
  },
  contentContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'space-between',
  },
  focusedBoxContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    transform: [{ translateY: -30 }], // Match mask position perfectly
    zIndex: 1, // ensure it displays correctly
  },
  focusedBox: {
    width: 250,
    height: 250,
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center'
  },
  loadingCard: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
    zIndex: 10,
  },
  loadingText: {
    marginLeft: 12,
    fontSize: 15,
    fontWeight: '600',
    color: '#0f172a',
  },
  overlayBottomFixed: {
    paddingBottom: 60,
    paddingHorizontal: 40,
    alignItems: 'center',
  },
  instructionsText: {
    color: '#fff',
    textAlign: 'center',
    fontSize: 14,
    lineHeight: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingHorizontal: 20,
    paddingBottom: 20,
    backgroundColor: 'transparent', // Removed double blur layer
  },
  backBtn: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  headerTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  scanAreaWrapper: {
    alignItems: 'center',
    paddingTop: 40,
  },
  scanInstruction: {
    color: '#cbd5e1',
    fontSize: 14,
    marginBottom: 4,
  },
  scanEventName: {
    color: '#FCD34D',
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 30,
    textAlign: 'center',
    paddingHorizontal: 20
  },
  corner: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderColor: '#ffffff', // White corners like PhonePe
  },
  topLeftCorner: {
    top: 0,
    left: 0,
    borderTopWidth: 4,
    borderLeftWidth: 4,
    borderTopLeftRadius: 16,
  },
  topRightCorner: {
    top: 0,
    right: 0,
    borderTopWidth: 4,
    borderRightWidth: 4,
    borderTopRightRadius: 16,
  },
  bottomLeftCorner: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
    borderBottomLeftRadius: 16,
  },
  bottomRightCorner: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 4,
    borderRightWidth: 4,
    borderBottomRightRadius: 16,
  },
  successIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#dcfce7',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: 24,
  },
  successTitle: {
    fontSize: 28,
    fontWeight: '600',
    color: '#0f172a',
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
    textAlign: 'center',
    marginBottom: 8,
  },
  successSubtitle: {
    fontSize: 16,
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 32,
  },
  detailsCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 32,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  detailDivider: {
    height: 1,
    backgroundColor: '#f1f5f9',
  },
  detailLabel: {
    fontSize: 15,
    color: '#64748b',
  },
  detailValue: {
    fontSize: 15,
    color: '#0f172a',
    fontWeight: '700',
  },
  doneBtn: {
    backgroundColor: '#1e293b',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 16,
  },
  doneBtnText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  viewAttendanceBtn: {
    backgroundColor: 'transparent',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#cbd5e1',
  },
  viewAttendanceText: {
    color: '#0f172a',
    fontSize: 16,
    fontWeight: '700',
  },
  successScrollContainer: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  familySection: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 18,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  familyHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  familyIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#eff6ff',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  familyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
  },
  familyTitleTe: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
    marginTop: 1,
  },
  familySub: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 6,
    marginBottom: 14,
    lineHeight: 18,
  },
  familyActionBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    marginBottom: 10,
  },
  familyCountText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
  },
  selectAllBtn: {
    paddingVertical: 5,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#f1f5f9',
  },
  selectAllBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#2563eb',
  },
  familyList: {
    marginTop: 4,
  },
  memberItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: 12,
    marginBottom: 8,
    backgroundColor: 'transparent',
  },
  memberAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#eff6ff',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  memberAvatarText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1d4ed8',
  },
  memberInfo: {
    flex: 1,
  },
  memberName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#0f172a',
    marginBottom: 3,
  },
  relationPill: {
    alignSelf: 'flex-start',
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  relationText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#475569',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: '#cbd5e1',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  checkboxSelected: {
    backgroundColor: '#16a34a',
    borderColor: '#16a34a',
  },
  attendedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#dcfce7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  attendedBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#15803d',
  },
  saveFamilyBtn: {
    backgroundColor: '#16a34a',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 14,
    shadowColor: '#16a34a',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 3,
  },
  saveFamilyBtnText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
  saveSuccessBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0fdf4',
    borderWidth: 1,
    borderColor: '#bbf7d0',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginTop: 10,
    gap: 8,
  },
  saveSuccessText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#166534',
    flex: 1,
  },
  loader: {
    position: 'absolute',
  },
  footer: {
    padding: 30,
    paddingBottom: 50,
    alignItems: 'center',
  },
  footerText: {
    color: '#fff',
    textAlign: 'center',
    fontSize: 14,
    lineHeight: 20,
  },
  successDoneBtn: {
    backgroundColor: '#1e293b',
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 3,
  },
  successDoneBtnText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  familyActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
    width: '100%',
  },

});
