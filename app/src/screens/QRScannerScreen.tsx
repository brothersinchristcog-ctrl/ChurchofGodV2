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
  Vibration
} from 'react-native';
import { Camera, CameraView, useCameraPermissions } from 'expo-camera';
import Svg, { Defs, LinearGradient, Stop, Rect, Mask } from 'react-native-svg';
import { ArrowLeft, CheckCircle2, MapPinOff, X, AlertCircle } from 'lucide-react-native';
import * as Location from 'expo-location';
import firestore from '@react-native-firebase/firestore';
import AttendanceService from '../services/AttendanceService';
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
  const [errorDetails, setErrorDetails] = useState<{title: string, message: string, type: 'location' | 'qr'} | null>(null);
  
  const scaleAnim = useRef(new Animated.Value(1)).current;

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
      
      if (alreadyAttended) {
        setLoading(false);
        Alert.alert(
          'Already Checked In',
          'You have already successfully recorded your attendance for this event.',
          [{ text: 'OK', onPress: () => navigation.goBack() }]
        );
        return;
      }

      // Log attendance
      const rawLocationName = customLocationName || locationName || 'Unspecified';
      // Strip any Plus Codes (e.g., 68J7+53M, ) from the string
      const finalLocationName = rawLocationName.replace(/[0-9A-Z]{2,6}\+[0-9A-Z]{2,4}(,\s*)?/g, '').trim() || 'Unspecified';
      
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

  if (success) {
    const today = new Date();
    const formattedDate = today.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    const formattedTime = today.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });

    return (
      <View style={[styles.container, { backgroundColor: '#f4f6f8', paddingHorizontal: 24, justifyContent: 'center' }]}>
        <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
        
        <View style={styles.successIconContainer}>
          <CheckCircle2 size={40} color="#16a34a" />
        </View>

        <Text style={styles.successTitle}>You're marked present</Text>
        <Text style={styles.successSubtitle}>Your attendance has been recorded.</Text>

        <View style={styles.detailsCard}>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Event</Text>
            <Text style={styles.detailValue}>{eventName}</Text>
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

        <TouchableOpacity 
          style={styles.doneBtn}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.doneBtnText}>Done</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.viewAttendanceBtn}
          onPress={() => {
            navigation.goBack();
            navigation.navigate('EventAttendees', { eventId, eventName });
          }}
        >
          <Text style={styles.viewAttendanceText}>View my attendance</Text>
        </TouchableOpacity>
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

});
