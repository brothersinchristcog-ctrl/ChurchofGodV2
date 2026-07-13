import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  ActivityIndicator,
  Platform,
  PermissionsAndroid,
  Linking,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors, spacing, radius, typography, shadow } from '../theme/Theme';

interface LatLng {
  lat: number;
  lng: number;
  name?: string;
}

interface LiveJourneyTrackerProps {
  eventId?: string;
  home: LatLng;
  destination: LatLng;
  destinationName: string;
  initialDistanceKm?: number;
  initialDurationMins?: number;
  altHome?: LatLng;
  altInitialDistanceKm?: number;
  altInitialDurationMins?: number;
  isDisabled?: boolean;
}

type TravelStatus = 'Traveling' | 'Stopped' | 'Arrived';

const getCurrentLocationWithFallback = async (
  onSuccess: (info: any) => void,
  onFailure: (error: any) => void
) => {
  try {
    const location = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.High,
    });
    onSuccess(location);
  } catch (error) {
    console.warn('High accuracy Location fetch failed, trying balanced accuracy...', error);
    try {
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      onSuccess(location);
    } catch (err) {
      console.warn('Balanced location fetch also failed:', err);
      onFailure(err);
    }
  }
};

const LiveJourneyTracker: React.FC<LiveJourneyTrackerProps> = ({
  eventId,
  home,
  destination,
  destinationName,
  initialDistanceKm,
  initialDurationMins,
  altHome,
  altInitialDistanceKm,
  altInitialDurationMins,
  isDisabled = false,
}) => {
  const [selectedMode, setSelectedMode] = useState<'primary' | 'alt'>('primary');
  const activeHome = selectedMode === 'primary' ? home : (altHome || home);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [isTracking, setIsTracking] = useState(false);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [currentLocation, setCurrentLocation] = useState<LatLng | null>(null);
  const [currentLocationName, setCurrentLocationName] = useState<string>('Unknown');
  const [remainingKm, setRemainingKm] = useState<number>(0);
  const [remainingMins, setRemainingMins] = useState<number>(0);
  const [totalKm, setTotalKm] = useState<number>(1); // To avoid division by zero
  const [status, setStatus] = useState<TravelStatus>('Traveling');
  const [lastMovedAt, setLastMovedAt] = useState<number>(Date.now());
  const [isUpdating, setIsUpdating] = useState(false);
  const [hasStartedTracking, setHasStartedTracking] = useState(false);
  
  // Animation for the car
  const carProgress = useRef(new Animated.Value(0)).current;

  // 1. Sync static distance from props whenever they change (if not tracking)
  useEffect(() => {
    if (hasStartedTracking || isTracking) return;

    if (selectedMode === 'alt' && altInitialDistanceKm !== undefined && altInitialDurationMins !== undefined) {
      setTotalKm(altInitialDistanceKm);
      setRemainingKm(altInitialDistanceKm);
      setRemainingMins(altInitialDurationMins);
      setCurrentLocationName(activeHome.name || 'Current Location');
    } else if (selectedMode === 'primary' && initialDistanceKm !== undefined && initialDurationMins !== undefined) {
      setTotalKm(initialDistanceKm);
      setRemainingKm(initialDistanceKm);
      setRemainingMins(initialDurationMins);
      setCurrentLocationName(activeHome.name || 'Current Location');
    } else {
      // Fallback: fetch from Google Maps if props are missing
      const fetchFallback = async () => {
        try {
          const GOOGLE_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_KEY;
          if (!GOOGLE_KEY) return;
          const loc = activeHome;
          const res = await fetch(
            `https://maps.googleapis.com/maps/api/directions/json?origin=${loc.lat},${loc.lng}&destination=${destination.lat},${destination.lng}&key=${GOOGLE_KEY}`
          );
          const data = await res.json();
          if (data.status === 'OK' && data.routes.length > 0) {
            const distKm = data.routes[0].legs[0].distance.value / 1000;
            const durationMins = Math.round(data.routes[0].legs[0].duration.value / 60);

            setTotalKm(distKm);
            setRemainingKm(distKm);
            setRemainingMins(durationMins);
            setCurrentLocationName(loc.name || 'Current Location');
          }
        } catch (e) {
          console.warn('Initial static distance fetch failed:', e);
        }
      };
      fetchFallback();
    }
  }, [
    selectedMode,
    activeHome.lat,
    activeHome.lng,
    activeHome.name,
    destination.lat,
    destination.lng,
    initialDistanceKm,
    initialDurationMins,
    altInitialDistanceKm,
    altInitialDurationMins,
    isTracking
  ]);

  // 2. Check location permissions once on mount (optional)
  useEffect(() => {
    let isMounted = true;
    const checkPerms = async () => {
      try {
        const { status } = await Location.getForegroundPermissionsAsync();
        if (isMounted) setHasPermission(status === 'granted');
      } catch (err) {}
    };
    checkPerms();
    return () => { isMounted = false; };
  }, []);

  const [isSimulating, setIsSimulating] = useState(false);

  // 3. Load tracking state from AsyncStorage on mount
  useEffect(() => {
    if (!eventId) return;
    let isMounted = true;
    const loadState = async () => {
      try {
        const savedStr = await AsyncStorage.getItem(`journey_${eventId}`);
        if (savedStr && isMounted) {
          const saved = JSON.parse(savedStr);
          if (saved.isTracking || saved.status === 'Arrived' || saved.status === 'Stopped' || saved.hasStartedTracking) {
            if (saved.hasStartedTracking !== undefined) setHasStartedTracking(saved.hasStartedTracking);
            setIsTracking(saved.isTracking);
            if (saved.status) setStatus(saved.status);
            if (saved.currentLocation) setCurrentLocation(saved.currentLocation);
            if (saved.currentLocationName) setCurrentLocationName(saved.currentLocationName);
            if (saved.remainingKm !== undefined) setRemainingKm(saved.remainingKm);
            if (saved.remainingMins !== undefined) setRemainingMins(saved.remainingMins);
            if (saved.totalKm !== undefined) setTotalKm(saved.totalKm);
            if (saved.lastMovedAt) setLastMovedAt(saved.lastMovedAt);
            if (saved.isSimulating) setIsSimulating(saved.isSimulating);
            if (saved.selectedMode) setSelectedMode(saved.selectedMode);
            
            // Set car position based on restored state
            const effectiveTotal = Math.max(saved.totalKm || 1, saved.remainingKm || 0);
            const progress = effectiveTotal > 0 ? (1 - ((saved.remainingKm || 0) / effectiveTotal)) : 0;
            carProgress.setValue(progress < 0 ? 0 : progress > 1 ? 1 : progress);
          }
        }
      } catch (e) {}
    };
    loadState();
    return () => { isMounted = false; };
  }, [eventId]);

  // 4. Save tracking state to AsyncStorage whenever it changes
  useEffect(() => {
    if (!eventId) return;
    const saveState = async () => {
      try {
        if (!isTracking && status === 'Traveling') {
           // We haven't really started or we stopped completely (not paused).
           // If they hit "Stop Tracking", status might be 'Traveling' but isTracking is false.
           // Actually, let's always save the state so it restores exactly.
        }
        const stateToSave = {
          isTracking,
          status,
          currentLocation,
          currentLocationName,
          remainingKm,
          remainingMins,
          totalKm,
          lastMovedAt,
          isSimulating,
          selectedMode,
          hasStartedTracking
        };
        await AsyncStorage.setItem(`journey_${eventId}`, JSON.stringify(stateToSave));
      } catch (e) {}
    };
    saveState();
  }, [eventId, isTracking, status, currentLocation, currentLocationName, remainingKm, remainingMins, totalKm, lastMovedAt, isSimulating, selectedMode, hasStartedTracking]);

  const handleStartTracking = async () => {
    setHasStartedTracking(true);
    let grantedLocation = hasPermission === true;
    setGpsError(null);
    if (!grantedLocation) {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        grantedLocation = status === 'granted';
        if (grantedLocation) {
          setHasPermission(true);
        } else {
          setGpsError('Location permissions denied.');
        }
      } catch (err: any) {
        console.warn(err);
        setGpsError(`Permission request error: ${err.message || err}`);
      }
    }

    if (grantedLocation) {
      setIsTracking(true);
      setStatus('Traveling');
      setLastMovedAt(Date.now());
      
      // Fetch exact current location immediately on start to display real place name right away
      setIsUpdating(true);
      getCurrentLocationWithFallback(
        async (info) => {
          await updateJourney(info.coords.latitude, info.coords.longitude, true);
        },
        (error) => {
          console.warn('Immediate location fetch failed:', error);
          setGpsError(`GPS Start Fetch failed: ${error.message || 'Timeout/Unavailable'}`);
          setIsUpdating(false);
        }
      );
    } else {
      // Permission denied - Enter Simulation Mode
      console.warn('Location permission denied. Entering Simulation Mode.');
      setHasPermission(false);
      setIsSimulating(true);
      setIsTracking(true);
      setStatus('Traveling');
      setLastMovedAt(Date.now());
      
      // Start simulation from home coordinates
      setCurrentLocation({ lat: activeHome.lat, lng: activeHome.lng });
    }
  };

  const handleStopTracking = () => {
    setIsTracking(false);
    setIsSimulating(false);
  };

  const handleManualReload = async () => {
    if (!isTracking || isUpdating) return;
    setGpsError(null);
    setIsUpdating(true);
    getCurrentLocationWithFallback(
      async (info) => {
        const lat = info.coords.latitude;
        const lng = info.coords.longitude;
        setCurrentLocation({ lat, lng });
        await updateJourney(lat, lng);
        setLastMovedAt(Date.now());
      },
      (error) => {
        console.warn('Manual location reload failed:', error);
        setGpsError(`Reload failed: ${error.message || 'Timeout/Unavailable'}`);
        setIsUpdating(false);
      }
    );
  };

  // The actual location watching OR simulation
  useEffect(() => {
    let locationInterval: ReturnType<typeof setInterval> | null = null;
    let simInterval: ReturnType<typeof setInterval> | null = null;
    let isMounted = true;

    if (isSimulating && isTracking) {
      // SIMULATION MODE - Follow the actual road steps!
      const runSimulation = async () => {
        try {
          const GOOGLE_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_KEY;
          if (!GOOGLE_KEY) throw new Error('No API key');
          
          const res = await fetch(
            `https://maps.googleapis.com/maps/api/directions/json?origin=${activeHome.lat},${activeHome.lng}&destination=${destination.lat},${destination.lng}&key=${GOOGLE_KEY}`
          );
          const data = await res.json();
          if (data.status === 'OK' && data.routes.length > 0) {
            const steps = data.routes[0].legs[0].steps;
            const points = steps.map((s: any) => ({ lat: s.end_location.lat, lng: s.end_location.lng }));
            points.unshift({ lat: activeHome.lat, lng: activeHome.lng }); // add starting point
            points.push({ lat: destination.lat, lng: destination.lng }); // add destination
            
            // Set initial baseline from the starting point of simulation
            if (points.length > 0) {
              await updateJourney(points[0].lat, points[0].lng, true);
            }

            let stepIndex = 1;
            simInterval = setInterval(() => {
              if (stepIndex < points.length && isMounted) {
                const pt = points[stepIndex];
                updateJourney(pt.lat, pt.lng);
                stepIndex++;
              } else {
                if (simInterval) clearInterval(simInterval);
              }
            }, 4000); // Move every 4 seconds along the steps
          } else {
            throw new Error('Directions status not OK');
          }
        } catch (e) {
          console.warn('Simulation directions failed, using straight-line fallback', e);
          let currentLat = activeHome.lat;
          let currentLng = activeHome.lng;
          const latStep = (destination.lat - activeHome.lat) / 20;
          const lngStep = (destination.lng - activeHome.lng) / 20;

          // Set baseline for fallback simulation
          updateJourney(currentLat, currentLng, true);

          let stepCount = 0;
          simInterval = setInterval(() => {
            if (stepCount < 20 && isMounted) {
              currentLat += latStep;
              currentLng += lngStep;
              updateJourney(currentLat, currentLng);
              stepCount++;
            } else {
              if (simInterval) clearInterval(simInterval);
            }
          }, 5000);
        }
      };

      runSimulation();
    } else if (isTracking && hasPermission) {
      // REAL GPS TRACKING - Automatic background updates disabled per user request.
      // Pastor will use the Manual "Reload" button to update their current position.
      locationInterval = setInterval(() => {
        const now = Date.now();
        if (now - lastMovedAt > 5 * 60 * 1000 && status !== 'Arrived') { // 5 minutes without significant move
          setStatus('Stopped');
        }
      }, 60000);
    }

    return () => {
      isMounted = false;
      if (locationInterval) clearInterval(locationInterval);
      if (simInterval) clearInterval(simInterval);
    };
  }, [isTracking, hasPermission, isSimulating, lastMovedAt, status, activeHome, destination]);

  const updateJourney = async (lat: number, lng: number, isBaseline = false) => {
    setCurrentLocation({ lat, lng });
    setIsUpdating(true);
    try {
      const GOOGLE_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_KEY;
      if (!GOOGLE_KEY) return;

      // 1. Reverse Geocode to get current town/village
      const geoRes = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${GOOGLE_KEY}`);
      const geoData = await geoRes.json();
      
      let currentPlaceName = 'Unknown Location';
      if (geoData.status === 'OK' && geoData.results.length > 0) {
        // Try to find locality or sublocality
        const addressComponents = geoData.results[0].address_components;
        const locality = addressComponents.find((c: any) => c.types.includes('locality'));
        const sublocality = addressComponents.find((c: any) => c.types.includes('sublocality'));
        currentPlaceName = locality?.long_name || sublocality?.long_name || geoData.results[0].formatted_address.split(',')[0];
      }
      setCurrentLocationName(currentPlaceName);

      // 2. Distance Matrix to get ETA and Remaining Distance
      const distRes = await fetch(
        `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${lat},${lng}&destinations=${destination.lat},${destination.lng}&key=${GOOGLE_KEY}`
      );
      const distData = await distRes.json();
      
      if (distData.status === 'OK' && distData.rows[0].elements[0].status === 'OK') {
        const element = distData.rows[0].elements[0];
        const remKm = element.distance.value / 1000;
        const remMins = Math.round(element.duration.value / 60);
        
        setRemainingKm(remKm);
        setRemainingMins(remMins);

        // Update Car Animation Progress (0 to 1)
        // totalKm should represent the full journey from Origin to Destination.
        // We only expand it if the user is somehow further away than the initial calculated distance.
        if (remKm > totalKm) {
          setTotalKm(remKm);
        }
        
        const effectiveTotal = Math.max(totalKm, remKm);
        let progress = effectiveTotal > 0 ? (1 - (remKm / effectiveTotal)) : 0;
        if (progress < 0) progress = 0;
        if (progress > 1) progress = 1;
        
        Animated.timing(carProgress, {
          toValue: progress,
          duration: 1000,
          useNativeDriver: false,
        }).start();

        // Check if Arrived (e.g., less than 0.5 km)
        if (remKm < 0.5) {
          setStatus('Arrived');
          setIsTracking(false);
        } else {
          // Check if moved significantly to update status to Traveling
          setStatus('Traveling');
          setLastMovedAt(Date.now());
        }
      }
    } catch (e) {
      console.warn('Error updating journey', e);
    } finally {
      setIsUpdating(false);
    }
  };

  const renderStatusBadge = () => {
    let bgColor = colors.primaryLight;
    let textColor = colors.primaryDark;
    let icon = 'ellipse';

    if (status === 'Traveling') {
      bgColor = '#E6F4EA'; // light green
      textColor = '#137333'; // dark green
      icon = 'radio-button-on';
    } else if (status === 'Stopped') {
      bgColor = '#FEF7E0'; // light yellow
      textColor = '#B06000'; // dark yellow
      icon = 'alert-circle';
    } else if (status === 'Arrived') {
      bgColor = '#E8EAF6'; // light blue
      textColor = '#283593'; // dark blue
      icon = 'checkmark-circle';
    }

    return (
      <View style={[styles.statusBadge, { backgroundColor: bgColor }]}>
        <Ionicons name={icon as any} size={14} color={textColor} />
        <Text style={[styles.statusText, { color: textColor }]}>{status}</Text>
      </View>
    );
  };

  return (
    <View style={styles.card}>
      <View style={[styles.headerRow, { flexWrap: 'wrap', gap: 8 }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', flexShrink: 1, flexWrap: 'wrap', gap: 6 }}>
          <Text style={styles.cardLabel}>{isSimulating ? 'Live Tracker (Simulation)' : 'Live Journey Tracker'}</Text>
          <View style={{ backgroundColor: '#FFF', borderWidth: 1, borderColor: colors.primary, paddingHorizontal: 6, paddingVertical: 2, borderRadius: radius.full }}>
            <Text style={{ fontSize: 10, fontWeight: '700', color: colors.primary }}>
              {remainingKm.toFixed(1)} km • {remainingMins >= 60 ? `${Math.floor(remainingMins / 60)}h ${remainingMins % 60}m` : `${remainingMins}m`}
            </Text>
          </View>
        </View>
        {isTracking && renderStatusBadge()}
      </View>

      {/* Progress Bar Area */}
      <View style={styles.progressContainer}>
          {/* Toggle for multiple origins */}
          {altHome && (
            <View style={{ marginBottom: 16 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8, paddingHorizontal: 4 }}>
                <Ionicons name="information-circle-outline" size={14} color={colors.textTertiary} />
                <Text style={{ fontSize: 11, color: colors.textTertiary, marginLeft: 4 }}>
                  Multiple events today. Select your starting point:
                </Text>
              </View>
              <View style={{ flexDirection: 'row', backgroundColor: colors.bgSecondary, borderRadius: radius.full, padding: 4 }}>
                <TouchableOpacity 
                  style={{ flex: 1, paddingVertical: 8, paddingHorizontal: 4, alignItems: 'center', backgroundColor: selectedMode === 'primary' ? colors.primary : 'transparent', borderRadius: radius.full, ...((selectedMode === 'primary') ? shadow.card : {}) }}
                  onPress={() => { setSelectedMode('primary'); setIsTracking(false); setHasStartedTracking(false); setStatus('Traveling'); carProgress.setValue(0); setCurrentLocation(null); }}
                >
                  <Text numberOfLines={1} ellipsizeMode="tail" style={{ fontSize: 11, fontWeight: '700', color: selectedMode === 'primary' ? '#FFF' : colors.textSecondary }}>{home.name || 'Origin'}</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={{ flex: 1, paddingVertical: 8, paddingHorizontal: 4, alignItems: 'center', backgroundColor: selectedMode === 'alt' ? colors.primary : 'transparent', borderRadius: radius.full, ...((selectedMode === 'alt') ? shadow.card : {}) }}
                  onPress={() => { setSelectedMode('alt'); setIsTracking(false); setHasStartedTracking(false); setStatus('Traveling'); carProgress.setValue(0); setCurrentLocation(null); }}
                >
                  <Text numberOfLines={1} ellipsizeMode="tail" style={{ fontSize: 11, fontWeight: '700', color: selectedMode === 'alt' ? '#FFF' : colors.textSecondary }}>{altHome.name || 'Alt Origin'}</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          <View style={styles.endpointsRow}>
            <View style={styles.endpoint}>
              <Ionicons name="location" size={16} color={colors.primary} />
              <Text style={styles.endpointText} numberOfLines={1}>{activeHome.name || 'Origin'}</Text>
            </View>
            <View style={[styles.endpoint, { alignItems: 'flex-end' }]}>
              <Ionicons name="flag" size={16} color={colors.primary} />
              <Text style={styles.endpointText} numberOfLines={1}>{destinationName}</Text>
            </View>
          </View>

        <View style={styles.trackContainer}>
          <View style={styles.trackLine} />
          
          {/* Colored Path Covered */}
          <Animated.View style={[styles.trackLine, { 
            backgroundColor: colors.primary, 
            width: carProgress.interpolate({
              inputRange: [0, 1],
              outputRange: ['0%', '100%']
            }) 
          }]} />

          {isTracking || currentLocation ? (
            <Animated.View
              style={[
                styles.carIconContainer,
                {
                  left: carProgress.interpolate({
                    inputRange: [0, 1],
                    outputRange: ['0%', '90%'], // 90% so it doesn't overflow
                  }),
                },
              ]}
            >
              <MaterialCommunityIcons name="car-side" size={26} color={colors.primary} />
            </Animated.View>
          ) : (
            <View style={[styles.carIconContainer, { left: '0%' }]}>
              <MaterialCommunityIcons name="car-side" size={26} color={colors.textSecondary} />
            </View>
          )}
        </View>
      </View>

      {/* Stats Area */}
      {isTracking ? (
        <View style={styles.statsContainer}>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Current Location</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Ionicons name="location" size={16} color={colors.error} />
              <Text style={styles.statValue} numberOfLines={2}>
                {currentLocationName}
              </Text>
            </View>
            {gpsError && (
              <View style={{ marginTop: 4 }}>
                <Text style={{ fontSize: 11, color: colors.error, fontWeight: '600' }}>
                  ⚠️ Location Service Warning: {gpsError}
                </Text>
                {gpsError.toLowerCase().includes('denied') && (
                  <TouchableOpacity 
                    style={{ marginTop: 4, alignSelf: 'flex-start', borderBottomWidth: 1, borderBottomColor: colors.primary }}
                    onPress={() => Linking.openSettings()}
                  >
                    <Text style={{ fontSize: 11, color: colors.primary, fontWeight: '700' }}>
                      Open Settings to Enable Location
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
          </View>

          <View style={styles.statDivider} />

          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Remaining</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Ionicons name="map-outline" size={16} color={colors.primary} />
                <Text style={styles.statValueSmall}>{remainingKm.toFixed(1)} km</Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Ionicons name="time-outline" size={16} color={colors.primary} />
                <Text style={styles.statValueSmall}>
                  {remainingMins >= 60 ? `${Math.floor(remainingMins / 60)}h ${remainingMins % 60}m` : `${remainingMins}m`}
                </Text>
              </View>
            </View>
          </View>
        </View>
      ) : null}

      {/* Actions */}
      <View style={styles.actionRow}>
        {!isTracking && status !== 'Arrived' ? (
          isDisabled ? (
            <View style={[styles.startButton, { backgroundColor: colors.border }]}>
              <Ionicons name="calendar-outline" size={18} color={colors.textSecondary} />
              <Text style={[styles.startButtonText, { color: colors.textSecondary }]}>Available on event day</Text>
            </View>
          ) : (
            <TouchableOpacity style={styles.startButton} onPress={handleStartTracking}>
              <Ionicons name="play" size={18} color="#FFF" />
              <Text style={styles.startButtonText}>Start Journey</Text>
            </TouchableOpacity>
          )
        ) : isTracking ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, width: '100%', paddingVertical: 4 }}>
            {/* Pause / Resume Badge */}
            {status === 'Stopped' ? (
              <TouchableOpacity 
                style={[styles.actionBadgeBtn, { backgroundColor: '#E6F4EA', borderColor: '#137333' }]} 
                onPress={() => {
                  setStatus('Traveling');
                  setLastMovedAt(Date.now());
                }}
              >
                <Ionicons name="play" size={14} color="#137333" />
                <Text style={[styles.actionBadgeText, { color: '#137333' }]}>Resume</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity 
                style={[styles.actionBadgeBtn, { backgroundColor: '#FEF7E0', borderColor: '#F59E0B' }]} 
                onPress={() => setStatus('Stopped')}
              >
                <Ionicons name="pause" size={14} color="#D97706" />
                <Text style={[styles.actionBadgeText, { color: '#D97706' }]}>Pause</Text>
              </TouchableOpacity>
            )}

            {/* Stop Badge */}
            <TouchableOpacity 
              style={[styles.actionBadgeBtn, { backgroundColor: '#FEE2E2', borderColor: '#EF4444' }]} 
              onPress={handleStopTracking}
            >
              <Ionicons name="stop" size={14} color="#DC2626" />
              <Text style={[styles.actionBadgeText, { color: '#DC2626' }]}>Stop</Text>
            </TouchableOpacity>

            {/* Reload Badge */}
            <TouchableOpacity 
              style={[styles.actionBadgeBtn, { backgroundColor: '#DBEAFE', borderColor: '#3B82F6' }, isUpdating && { opacity: 0.7 }]} 
              onPress={handleManualReload}
              disabled={isUpdating}
            >
              {isUpdating ? (
                <ActivityIndicator size="small" color="#2563EB" />
              ) : (
                <Ionicons name="refresh" size={14} color="#2563EB" />
              )}
              <Text style={[styles.actionBadgeText, { color: '#2563EB' }]}>Reload</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.arrivedBox}>
            <Ionicons name="checkmark-circle" size={20} color="#137333" />
            <Text style={styles.arrivedText}>You have arrived at the destination</Text>
          </View>
        )}
        
        {isUpdating && !isTracking && <ActivityIndicator size="small" color={colors.primary} style={{ marginLeft: 12 }} />}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.bgPrimary,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadow.card,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  cardLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textTertiary,
    textTransform: 'uppercase',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.full,
    gap: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '700',
  },
  progressContainer: {
    marginBottom: spacing.md,
  },
  endpointsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  endpoint: {
    flex: 1,
  },
  endpointText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textPrimary,
    marginTop: 4,
  },
  trackContainer: {
    height: 30,
    justifyContent: 'center',
  },
  trackLine: {
    height: 4,
    backgroundColor: colors.border,
    borderRadius: 2,
    width: '100%',
    position: 'absolute',
  },
  carIconContainer: {
    position: 'absolute',
    top: -8, // Slight negative offset puts it right on the line without clipping
    zIndex: 2,
    alignItems: 'center',
    justifyContent: 'center',
    width: 30,
  },
  statsContainer: {
    flexDirection: 'column',
    backgroundColor: colors.bgSecondary,
    borderRadius: radius.sm,
    padding: spacing.md,
    marginBottom: spacing.md,
    gap: 12,
  },
  statBox: {
    width: '100%',
  },
  statDivider: {
    width: '100%',
    height: 1,
    backgroundColor: colors.border,
  },
  statLabel: {
    fontSize: 11,
    color: colors.textTertiary,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
    marginLeft: 4,
    flex: 1,
  },
  statValueSmall: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
    marginLeft: 4,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  startButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: radius.full,
    gap: 8,
  },
  startButtonText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '700',
  },
  actionBadgeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderRadius: radius.md,
    borderWidth: 1,
    gap: 4,
  },
  actionBadgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  arrivedBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E6F4EA',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: radius.md,
    gap: 8,
  },
  arrivedText: {
    color: '#137333',
    fontSize: 14,
    fontWeight: '700',
  },
});

export default LiveJourneyTracker;
