import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Animated,
  PanResponder,
  Dimensions,
  StyleSheet,
  Platform,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import firestore from '@react-native-firebase/firestore';
import { useAuth } from '../context/AuthContext';
import { fetchCelebrations, Member, isToday } from '../screens/admin/CODCelebsData';

function getDateKey(d?: Date): string {
  const t = d || new Date();
  const y = t.getFullYear();
  const m = String(t.getMonth() + 1).padStart(2, '0');
  const day = String(t.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

// Safe margins
const BUTTON_SIZE = 62;
const LABEL_HEIGHT = 18;
const TOTAL_HEIGHT = BUTTON_SIZE + LABEL_HEIGHT + 6;
const EDGE_MARGIN = 16;
const BOTTOM_NAV_HEIGHT = Platform.OS === 'ios' ? 90 : 70;
const SAFE_TOP = Platform.OS === 'ios' ? 120 : 90;
const SAFE_BOTTOM = SCREEN_H - BOTTOM_NAV_HEIGHT - TOTAL_HEIGHT - EDGE_MARGIN;

const POSITION_KEY = '@celebration_fab_pos';

// Emojis by category
const CATEGORY_EMOJIS: Record<string, string[]> = {
  birthday: ['🎂', '🎉', '🎁'],
  wedding: ['💍', '❤️', '🥂'],
  baptism: ['💧', '✝️', '🙏'],
  general: ['🎉', '❤️', '🙏', '🌟'],
};

interface Props {
  navigation: any;
}

export default function FloatingCelebrationButton({ navigation }: Props) {
  const { user } = useAuth();
  const [visible, setVisible] = useState(false);
  const [todayCelebrations, setTodayCelebrations] = useState<Member[]>([]);
  const [currentEmoji, setCurrentEmoji] = useState('🎉');
  const [emojiOpacity] = useState(new Animated.Value(1));
  const [unreadCount, setUnreadCount] = useState(0);

  // Position state
  const posRef = useRef({ x: SCREEN_W - BUTTON_SIZE - EDGE_MARGIN - 12, y: SCREEN_H * 0.55 });
  const pan = useRef(new Animated.ValueXY()).current;
  const isDragging = useRef(false);

  // Animations
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0.4)).current;
  const entranceAnim = useRef(new Animated.Value(0)).current;

  // ── 1. Load celebrations
  // ── 1. Load celebrations function
  const checkTodayCelebrations = useCallback(async (mounted = true) => {
    try {
      const all = await fetchCelebrations(false);
      if (!mounted) return;
      const todays = all.filter(isToday);
      if (todays.length > 0) {
        setTodayCelebrations(todays);
        setVisible(true);
      } else {
        setTodayCelebrations([]);
        setVisible(false);
      }
    } catch (e) {
      console.log('[FloatingCelebButton] Failed to load celebrations', e);
      if (mounted) {
        setTodayCelebrations([]);
        setVisible(false);
      }
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    checkTodayCelebrations(mounted);
    return () => { mounted = false; };
  }, [checkTodayCelebrations]);

  // ── 2. Load saved position
  useEffect(() => {
    const loadPos = async () => {
      try {
        const saved = await AsyncStorage.getItem(POSITION_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          posRef.current = parsed;
          pan.setValue({ x: parsed.x, y: parsed.y });
        } else {
          // Default position: right side, mid-screen
          const defaultX = SCREEN_W - BUTTON_SIZE - EDGE_MARGIN - 12;
          const defaultY = SCREEN_H * 0.55;
          posRef.current = { x: defaultX, y: defaultY };
          pan.setValue({ x: defaultX, y: defaultY });
        }
      } catch (e) {}
    };
    loadPos();
  }, []);

  // ── 3. Entrance animation
  useEffect(() => {
    if (visible) {
      Animated.spring(entranceAnim, {
        toValue: 1,
        tension: 60,
        friction: 8,
        useNativeDriver: false,
      }).start();
    }
  }, [visible]);

  // ── 4. Pulse animation (gentle float)
  useEffect(() => {
    if (!visible) return;
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.08, duration: 1200, useNativeDriver: false }),
        Animated.timing(pulseAnim, { toValue: 1.0, duration: 1200, useNativeDriver: false }),
      ])
    );
    const glow = Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, { toValue: 1.0, duration: 1000, useNativeDriver: false }),
        Animated.timing(glowAnim, { toValue: 0.4, duration: 1000, useNativeDriver: false }),
      ])
    );
    pulse.start();
    glow.start();
    return () => { pulse.stop(); glow.stop(); };
  }, [visible]);

  // ── 5. Rotating emoji
  useEffect(() => {
    if (todayCelebrations.length === 0) return;

    // User specifically requested this exact emoji order
    const emojis = ['🎉', '🎂', '🎁', '💧', '💍'];

    let idx = 0;
    const rotate = () => {
      // Fade out
      Animated.timing(emojiOpacity, { toValue: 0, duration: 250, useNativeDriver: false }).start(() => {
        idx = (idx + 1) % emojis.length;
        setCurrentEmoji(emojis[idx]);
        // Fade in
        Animated.timing(emojiOpacity, { toValue: 1, duration: 250, useNativeDriver: false }).start();
      });
    };

    setCurrentEmoji(emojis[0]);
    const interval = setInterval(rotate, 5000);
    return () => clearInterval(interval);
  }, [todayCelebrations]);

  // ── 5b. Unread Messages Listener
  useEffect(() => {
    if (todayCelebrations.length === 0) return;

    const dateKey = getDateKey();
    const collectionPath = `daily_celebration_chats/${dateKey}/messages`;

    const calculateUnread = async (snapDocs: any[]) => {
      try {
        const lastReadStr = await AsyncStorage.getItem(`@daily_celebration_last_read_${dateKey}`);
        const lastReadTime = lastReadStr ? parseInt(lastReadStr, 10) : 0;
        let count = 0;
        snapDocs.forEach(doc => {
          const data = doc.data();
          if (data.senderUid && data.senderUid !== user?.uid) {
            const msgTime = data.createdAt?.toMillis ? data.createdAt.toMillis() : (data.createdAt ? new Date(data.createdAt).getTime() : 0);
            if (msgTime > lastReadTime) {
              count++;
            }
          }
        });
        setUnreadCount(count);
      } catch (e) {}
    };

    const unsub = firestore()
      .collection(collectionPath)
      .onSnapshot(snap => {
        if (snap) {
          calculateUnread(snap.docs);
        }
      }, () => {});

    return () => unsub();
  }, [todayCelebrations, user?.uid]);

  // ── 5c. Refresh celebrations & unread count on screen focus
  useEffect(() => {
    if (!navigation || !navigation.addListener) return;
    const unsubscribeFocus = navigation.addListener('focus', () => {
      checkTodayCelebrations();
      if (todayCelebrations.length === 0) return;
      const dateKey = getDateKey();
      AsyncStorage.getItem(`@daily_celebration_last_read_${dateKey}`).then(lastReadStr => {
        const lastReadTime = lastReadStr ? parseInt(lastReadStr, 10) : 0;
        firestore()
          .collection(`daily_celebration_chats/${dateKey}/messages`)
          .get()
          .then(snap => {
            let count = 0;
            snap.docs.forEach(doc => {
              const data = doc.data();
              if (data.senderUid && data.senderUid !== user?.uid) {
                const msgTime = data.createdAt?.toMillis ? data.createdAt.toMillis() : (data.createdAt ? new Date(data.createdAt).getTime() : 0);
                if (msgTime > lastReadTime) {
                  count++;
                }
              }
            });
            setUnreadCount(count);
          }).catch(() => {});
      }).catch(() => {});
    });
    return unsubscribeFocus;
  }, [navigation, todayCelebrations, user?.uid, checkTodayCelebrations]);

  // ── 6. Clamp to safe area
  const clampPosition = (x: number, y: number) => {
    const clampedX = Math.max(EDGE_MARGIN, Math.min(x, SCREEN_W - BUTTON_SIZE - EDGE_MARGIN));
    const clampedY = Math.max(SAFE_TOP, Math.min(y, SAFE_BOTTOM));
    return { x: clampedX, y: clampedY };
  };

  // ── 7. Snap to nearest edge
  const snapToEdge = useCallback((x: number, y: number) => {
    const midX = SCREEN_W / 2;
    const snappedX = x < midX
      ? EDGE_MARGIN
      : SCREEN_W - BUTTON_SIZE - EDGE_MARGIN;
    const clamped = clampPosition(snappedX, y);
    Animated.spring(pan, {
      toValue: clamped,
      tension: 80,
      friction: 10,
      useNativeDriver: false,
    }).start();
    posRef.current = clamped;
    AsyncStorage.setItem(POSITION_KEY, JSON.stringify(clamped)).catch(() => {});
  }, []);

  // ── 8. PanResponder
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gs) =>
        Math.abs(gs.dx) > 4 || Math.abs(gs.dy) > 4,

      onPanResponderGrant: () => {
        isDragging.current = false;
        pan.setOffset({ x: posRef.current.x, y: posRef.current.y });
        pan.setValue({ x: 0, y: 0 });
      },

      onPanResponderMove: Animated.event(
        [null, { dx: pan.x, dy: pan.y }],
        { 
          useNativeDriver: false,
          listener: (_: any, gs?: any) => {
            if (gs && (Math.abs(gs.dx) > 4 || Math.abs(gs.dy) > 4)) {
              isDragging.current = true;
            }
          }
        }
      ),

      onPanResponderRelease: (_, gs) => {
        pan.flattenOffset();
        const rawX = posRef.current.x + gs.dx;
        const rawY = posRef.current.y + gs.dy;
        if (isDragging.current) {
          snapToEdge(rawX, rawY);
        }
        setTimeout(() => { isDragging.current = false; }, 100);
      },
    })
  ).current;

  const handlePress = () => {
    if (!isDragging.current) {
      navigation.navigate('DailyCelebrationChat', { 
        celebrations: todayCelebrations,
        dateKey: getDateKey()
      });
    }
  };

  if (!visible) return null;

  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: [
            { translateX: pan.x },
            { translateY: pan.y },
            { scale: Animated.multiply(pulseAnim, entranceAnim) },
          ],
        },
      ]}
      {...panResponder.panHandlers}
    >
      {/* Gold glow ring */}
      <Animated.View style={[styles.glowRing, { opacity: glowAnim }]} />

      {/* Main button */}
      <TouchableOpacity
        onPress={handlePress}
        activeOpacity={0.9}
        style={styles.buttonWrapper}
      >
        <LinearGradient
          colors={['#1a3060', '#0a1628']}
          style={styles.button}
        >
          {/* Gold border ring */}
          <View style={styles.goldBorder} />

          {/* Emoji */}
          <Animated.Text style={[styles.emoji, { opacity: emojiOpacity }]}>
            {currentEmoji}
          </Animated.Text>

          {/* Live dot */}
          <Animated.View style={[styles.liveDot, { opacity: glowAnim }]} />
        </LinearGradient>

        {/* Unread Badge Overlay */}
        {unreadCount > 0 && (
          <View style={styles.unreadBadge}>
            <Text style={styles.unreadBadgeText}>
              {unreadCount > 99 ? '99+' : unreadCount}
            </Text>
          </View>
        )}
      </TouchableOpacity>

      {/* Label */}
      <View style={styles.labelContainer}>
        <Text style={styles.label}>Live Celebrations</Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    width: BUTTON_SIZE,
    alignItems: 'center',
    zIndex: 9999,
    elevation: 20,
  },
  glowRing: {
    position: 'absolute',
    top: -8,
    left: -8,
    width: BUTTON_SIZE + 16,
    height: BUTTON_SIZE + 16,
    borderRadius: (BUTTON_SIZE + 16) / 2,
    backgroundColor: 'rgba(251, 191, 36, 0.18)',
  },
  buttonWrapper: {
    width: BUTTON_SIZE,
    height: BUTTON_SIZE,
    borderRadius: BUTTON_SIZE / 2,
    shadowColor: '#fbbf24',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 12,
  },
  button: {
    width: BUTTON_SIZE,
    height: BUTTON_SIZE,
    borderRadius: BUTTON_SIZE / 2,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  goldBorder: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: BUTTON_SIZE / 2,
    borderWidth: 2,
    borderColor: '#fbbf24',
  },
  emoji: {
    fontSize: 26,
    textAlign: 'center',
  },
  liveDot: {
    position: 'absolute',
    top: 7,
    right: 7,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#22c55e',
    borderWidth: 1.5,
    borderColor: '#0a1628',
  },
  labelContainer: {
    marginTop: 5,
    paddingHorizontal: 6,
    paddingVertical: 2,
    backgroundColor: 'rgba(10, 22, 40, 0.85)',
    borderRadius: 6,
    borderWidth: 0.5,
    borderColor: 'rgba(251, 191, 36, 0.4)',
    width: 90,
  },
  label: {
    color: '#fbbf24',
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.3,
    textAlign: 'center',
  },
  unreadBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#ef4444',
    borderRadius: 10,
    minWidth: 22,
    height: 22,
    paddingHorizontal: 5,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#0a1628',
    elevation: 15,
    zIndex: 10000,
  },
  unreadBadgeText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '900',
  },
});
