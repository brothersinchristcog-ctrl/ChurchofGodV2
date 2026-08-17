import React, {
  useState, useEffect, useRef, useCallback, useMemo,
} from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  ScrollView, KeyboardAvoidingView, Platform, Image,
  Dimensions, ActivityIndicator, Alert, Modal,
  Animated, Easing, FlatList, SafeAreaView, StatusBar, Keyboard,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import firestore from '@react-native-firebase/firestore';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { ArrowLeft, MoreVertical, Send, Smile, Users, Shield, Mic, StopCircle, Play, Pause, X, Trash2, Edit3, MessageSquare } from 'lucide-react-native';
import storage from '@react-native-firebase/storage';
import { Audio } from 'expo-av';
import { fetchCelebrations, Member, isToday, paletteFor, initials } from './admin/CODCelebsData';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width: SW, height: SH } = Dimensions.get('window');

// ─── Types ────────────────────────────────────────────────
interface ChatMessage {
  id: string;
  text: string;
  senderName: string;
  senderUid: string;
  senderPhoto?: string;
  createdAt: any;
  reactions: Record<string, number>;
  reactedBy: Record<string, string[]>;
  isDeleted?: boolean;
  mentionedIds?: string[];
  mentionedNames?: string[];
  audioUrl?: string;
  audioDuration?: number; // in milliseconds
}

interface TypingUser {
  uid: string;
  name: string;
}

// ─── Helpers ──────────────────────────────────────────────
function getDateKey(d?: Date): string {
  const t = d || new Date();
  const y = t.getFullYear();
  const m = String(t.getMonth() + 1).padStart(2, '0');
  const day = String(t.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function formatTime(ts: any): string {
  if (!ts) return '';
  try {
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  } catch { return ''; }
}

function formatDisplayDate(dateKey: string): string {
  const [y, m, d] = dateKey.split('-').map(Number);
  const months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  return `${d} ${months[m - 1]} ${y}`;
}

function isNameMatch(n1: string, n2: string) {
  if (!n1 || !n2) return false;
  const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, ' ').trim().split(/\s+/).sort().join(' ');
  const clean1 = norm(n1);
  const clean2 = norm(n2);
  return clean1 === clean2 && clean1.length > 0;
}

const REACTION_LIST = ['❤️', '🙏', '🎉', '🎂'];
const CATEGORIZED_QUICK_WISHES: Record<string, string[]> = {
  birthday: [
    'Happy Birthday! 🎉',
    'Wishing you a blessed day! 🎂',
    'God bless you abundantly! 🙏',
  ],
  wedding: [
    'Happy Anniversary! 💕',
    'God bless your marriage! 💍',
    'Many more joyous years! 🙏',
  ],
  baptism: [
    'Happy Baptism Anniversary! 💧',
    'God bless your faith journey! 🕊️',
    'Keep growing in Christ! 🙏',
  ],
};

const CAT_CONFIG: Record<string, { emoji: string; label: string; color: string; avatarBg: readonly [string, string] }> = {
  birthday: { emoji: '🎂', label: 'Birthday',            color: '#fbbf24', avatarBg: ['#1e3a5f', '#2d4a73'] },
  wedding:  { emoji: '💕', label: 'Wedding Anniversary', color: '#f9a8d4', avatarBg: ['#3b1f4a', '#5a2d6e'] },
  baptism:  { emoji: '💧', label: 'Baptism Anniversary', color: '#7dd3fc', avatarBg: ['#0c2a3d', '#1a3f5c'] },
};

// ─── Sub-components ───────────────────────────────────────

function WaveLineEffect({ color = '#4ade80' }: { color?: string }) {
  const bar1 = useRef(new Animated.Value(0.3)).current;
  const bar2 = useRef(new Animated.Value(0.7)).current;
  const bar3 = useRef(new Animated.Value(0.4)).current;
  const bar4 = useRef(new Animated.Value(0.8)).current;

  useEffect(() => {
    const animateBar = (animVal: Animated.Value, minVal: number, maxVal: number, duration: number) => {
      return Animated.loop(
        Animated.sequence([
          Animated.timing(animVal, {
            toValue: maxVal,
            duration,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(animVal, {
            toValue: minVal,
            duration,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: true,
          }),
        ])
      );
    };

    const a1 = animateBar(bar1, 0.25, 1.0, 420);
    const a2 = animateBar(bar2, 0.35, 1.0, 320);
    const a3 = animateBar(bar3, 0.2, 0.9, 500);
    const a4 = animateBar(bar4, 0.3, 1.0, 380);

    a1.start();
    a2.start();
    a3.start();
    a4.start();

    return () => {
      a1.stop();
      a2.stop();
      a3.stop();
      a4.stop();
    };
  }, []);

  return (
    <View style={styles.waveContainer}>
      <Animated.View style={[styles.waveBar, { backgroundColor: color, transform: [{ scaleY: bar1 }] }]} />
      <Animated.View style={[styles.waveBar, { backgroundColor: color, transform: [{ scaleY: bar2 }] }]} />
      <Animated.View style={[styles.waveBar, { backgroundColor: color, transform: [{ scaleY: bar3 }] }]} />
      <Animated.View style={[styles.waveBar, { backgroundColor: color, transform: [{ scaleY: bar4 }] }]} />
    </View>
  );
}

function LiveBadgeWaveRipple() {
  const anim1 = useRef(new Animated.Value(0)).current;
  const anim2 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop1 = Animated.loop(
      Animated.timing(anim1, {
        toValue: 1,
        duration: 2000,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      })
    );
    const loop2 = Animated.loop(
      Animated.sequence([
        Animated.delay(1000),
        Animated.timing(anim2, {
          toValue: 1,
          duration: 2000,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
      ])
    );
    loop1.start();
    loop2.start();
    return () => {
      loop1.stop();
      loop2.stop();
    };
  }, []);

  const scale1 = anim1.interpolate({ inputRange: [0, 1], outputRange: [1, 1.45] });
  const opacity1 = anim1.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.7, 0.35, 0] });

  const scale2 = anim2.interpolate({ inputRange: [0, 1], outputRange: [1, 1.45] });
  const opacity2 = anim2.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.7, 0.35, 0] });

  return (
    <>
      <Animated.View
        style={[
          styles.badgeWaveRing,
          {
            transform: [{ scaleX: scale1 }, { scaleY: scale1 }],
            opacity: opacity1,
          },
        ]}
      />
      <Animated.View
        style={[
          styles.badgeWaveRing,
          {
            transform: [{ scaleX: scale2 }, { scaleY: scale2 }],
            opacity: opacity2,
          },
        ]}
      />
    </>
  );
}

function AvatarInitials({ name, size = 36, photoUrl, onAvatarPress }: { name: string; size?: number; photoUrl?: string | null; onAvatarPress?: () => void }) {
  const [imageFailed, setImageFailed] = useState(false);
  
  const content = (photoUrl && !imageFailed) ? (
    <Image 
      source={{ uri: photoUrl }} 
      style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: '#1e293b' }} 
      onError={() => setImageFailed(true)}
    />
  ) : (
    <LinearGradient
      colors={paletteFor(name) as any}
      style={{ width: size, height: size, borderRadius: size / 2, justifyContent: 'center', alignItems: 'center' }}
    >
      <Text style={{ color: '#fff', fontWeight: '800', fontSize: size * 0.38 }}>
        {initials(name)}
      </Text>
    </LinearGradient>
  );

  if (onAvatarPress) {
    return <TouchableOpacity activeOpacity={0.8} onPress={() => onAvatarPress()}>{content}</TouchableOpacity>;
  }
  return content;
}

function CelebrationCard({ member, isSelected, onPress, onAvatarPress }: { member: Member, isSelected?: boolean, onPress?: () => void, onAvatarPress?: (url?: string) => void }) {
  const [imageFailed, setImageFailed] = useState(false);
  const cfg = CAT_CONFIG[member.category] || CAT_CONFIG.birthday;
  const years = new Date().getFullYear() - member.refYear;
  const yearsLabel = member.category === 'birthday'
    ? ''
    : years > 0 ? `${years}${ordinal(years)} ` : '';

  return (
    <TouchableOpacity activeOpacity={0.8} onPress={onPress}>
      <View style={[
        styles.celebCard, 
        { borderColor: isSelected ? '#fbbf24' : '#64748b' }, 
        isSelected && styles.celebCardSelected
      ]}>
      {/* Avatar circle - left side */}
      <View style={styles.celebAvatarWrap}>
        <AvatarInitials name={member.name} size={44} photoUrl={member.photoUrl} onAvatarPress={() => onAvatarPress?.(member.photoUrl || undefined)} />
      </View>

      {/* Info - right side */}
      <View style={styles.celebInfo}>
        <Text style={styles.celebName} numberOfLines={1}>{member.name}</Text>
        <View style={styles.celebTypePill}>
          <Text style={styles.celebTypeEmoji}>{cfg.emoji}</Text>
          <Text style={[styles.celebTypeLabel, { color: cfg.color }]}>
            {yearsLabel}{cfg.label}
          </Text>
        </View>
      </View>
    </View>
    </TouchableOpacity>
  );
}

function ordinal(n: number) {
  const s = ['th','st','nd','rd'];
  const v = n % 100;
  return (s[(v - 20) % 10] || s[v] || s[0]);
}

function ReactionBar({ msg, myUid, onReact }: { msg: ChatMessage; myUid: string; onReact: (r: string) => void }) {
  const hasReactions = REACTION_LIST.some(r => (msg.reactions[r] || 0) > 0);
  return (
    <View style={styles.reactionBar}>
      {REACTION_LIST.map(r => {
        const count = msg.reactions[r] || 0;
        const reacted = (msg.reactedBy[r] || []).includes(myUid);
        if (count === 0) return null;
        return (
          <TouchableOpacity
            key={r}
            onPress={() => onReact(r)}
            style={[styles.reactionPill, reacted && styles.reactionPillActive]}
            activeOpacity={0.7}
          >
            <Text style={styles.reactionEmoji}>{r}</Text>
            <Text style={[styles.reactionCount, reacted && { color: '#fbbf24' }]}>{count}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

function AudioWave() {
  const bars = Array.from({ length: 25 }).map((_, i) => {
    const anim = useRef(new Animated.Value(0)).current;
    
    useEffect(() => {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(anim, {
            toValue: 1,
            duration: 200 + Math.random() * 250,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(anim, {
            toValue: 0,
            duration: 200 + Math.random() * 250,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      );
      setTimeout(() => pulse.start(), Math.random() * 600);
      return () => pulse.stop();
    }, []);

    return (
      <Animated.View
        key={i}
        style={{
          width: 3,
          height: 24,
          backgroundColor: '#fbbf24',
          borderRadius: 2,
          marginHorizontal: 2,
          transform: [
            {
              scaleY: anim.interpolate({
                inputRange: [0, 1],
                outputRange: [0.2, 1],
              }),
            },
          ],
        }}
      />
    );
  });

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', height: 28, paddingHorizontal: 4 }}>
      {bars}
    </View>
  );
}

function ChatBubble({
  msg, isOwn, myUid, onReact, onLongPress, celebrations, onAvatarPress
}: {
  msg: ChatMessage;
  isOwn: boolean;
  myUid: string;
  onReact: (msgId: string, r: string) => void;
  onLongPress: (msg: ChatMessage) => void;
  celebrations: Member[];
  onAvatarPress?: (url?: string) => void;
}) {
  const slideIn = useRef(new Animated.Value(isOwn ? 40 : -40)).current;
  const fadeIn = useRef(new Animated.Value(0)).current;

  // Audio Playback State
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackPos, setPlaybackPos] = useState(0);
  const soundRef = useRef<Audio.Sound | null>(null);

  useEffect(() => {
    return () => {
      if (soundRef.current) {
        soundRef.current.unloadAsync().catch(() => {});
      }
    };
  }, []);

  const togglePlayback = async () => {
    if (!msg.audioUrl) return;
    try {
      if (soundRef.current) {
        const status = await soundRef.current.getStatusAsync();
        if (status.isLoaded && status.isPlaying) {
          await soundRef.current.pauseAsync();
        } else {
          await soundRef.current.playAsync();
        }
      } else {
        await Audio.setAudioModeAsync({ playsInSilentModeIOS: true });
        const { sound } = await Audio.Sound.createAsync(
          { uri: msg.audioUrl },
          { shouldPlay: true },
          (status: any) => {
            if (status.isLoaded) {
              setPlaybackPos(status.positionMillis);
              setIsPlaying(status.isPlaying);
              if (status.didJustFinish) {
                setIsPlaying(false);
                setPlaybackPos(0);
                sound.stopAsync();
              }
            }
          }
        );
        soundRef.current = sound;
      }
    } catch (err) {
      console.log('Error playing audio', err);
    }
  };

  useEffect(() => {
    Animated.parallel([
      Animated.timing(slideIn, { toValue: 0, duration: 300, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      Animated.timing(fadeIn, { toValue: 1, duration: 300, useNativeDriver: true }),
    ]).start();
  }, []);

  if (msg.isDeleted) {
    return (
      <View style={[styles.bubbleRow, isOwn && styles.bubbleRowRight]}>
        <TouchableOpacity activeOpacity={0.9} onLongPress={() => onLongPress(msg)}>
          <View style={{ 
            flexDirection: 'row', 
            alignItems: 'center', 
            backgroundColor: isOwn ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.02)', 
            paddingHorizontal: 16, 
            paddingVertical: 12, 
            borderRadius: 16, 
            borderWidth: 1, 
            borderColor: 'rgba(255,255,255,0.1)',
            gap: 8 
          }}>
            <Text style={{ fontSize: 16 }}>🚫</Text>
            <Text style={{ color: '#94a3b8', fontStyle: 'italic', fontSize: 13 }}>This message was deleted</Text>
          </View>
        </TouchableOpacity>
      </View>
    );
  }

  const senderCel = celebrations.find(c => isNameMatch(c.name, msg.senderName));
  const resolvedPhoto = msg.senderPhoto || senderCel?.photoUrl || null;

  return (
    <Animated.View
      style={[
        styles.bubbleRow,
        isOwn && styles.bubbleRowRight,
        { opacity: fadeIn, transform: [{ translateX: slideIn }] },
      ]}
    >
      <View style={{ alignSelf: 'flex-start' }}>
        <AvatarInitials name={msg.senderName} size={34} photoUrl={resolvedPhoto} onAvatarPress={onAvatarPress} />
      </View>

      <View style={[styles.bubbleColumn, isOwn && { alignItems: 'flex-end' }]}>
        <TouchableOpacity
          onLongPress={() => onLongPress(msg)}
          activeOpacity={0.9}
        >
          {(() => {
            const text = (msg.text || '').trim();

            const mentionedMembers = (msg.mentionedIds || [])
              .map(id => celebrations.find(c => c.id === id))
              .filter((c): c is Member => Boolean(c));

            celebrations.forEach(c => {
              if (text.toLowerCase().includes(`@${c.name.toLowerCase()}`) && !mentionedMembers.some(m => m.id === c.id)) {
                mentionedMembers.push(c);
              }
            });

            // Strip all @Name mentions from the text
            let cleanText = text;
            mentionedMembers.forEach(m => {
              const reg = new RegExp(`@${m.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*`, 'gi');
              cleanText = cleanText.replace(reg, '');
            });
            cleanText = cleanText.trim();

            const bubbleContent = (
              <View style={{ gap: 3 }}>
                {!isOwn && (
                  <Text style={styles.bubbleSenderNameIncoming} numberOfLines={1}>
                    {msg.senderName}
                  </Text>
                )}

                <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 5 }}>
                  {mentionedMembers.map(m => (
                    <View key={m.id} style={isOwn ? styles.bubbleMentionBadgeOwn : styles.bubbleMentionBadge}>
                      <Text style={isOwn ? styles.bubbleMentionBadgeTextOwn : styles.bubbleMentionBadgeText}>
                        @{m.name}
                      </Text>
                    </View>
                  ))}
                  {msg.audioUrl ? (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 4 }}>
                      <TouchableOpacity onPress={togglePlayback} style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: isOwn ? 'rgba(255,255,255,0.2)' : 'rgba(251,191,36,0.2)', justifyContent: 'center', alignItems: 'center' }}>
                        {isPlaying ? <Pause size={16} color={isOwn ? "#fff" : "#fbbf24"} /> : <Play size={16} color={isOwn ? "#fff" : "#fbbf24"} style={{ marginLeft: 2 }} />}
                      </TouchableOpacity>
                      <View style={{ flex: 1, minWidth: 100, height: 4, backgroundColor: isOwn ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.1)', borderRadius: 2, overflow: 'hidden' }}>
                        <View style={{ width: `${msg.audioDuration ? (playbackPos / msg.audioDuration) * 100 : 0}%`, height: '100%', backgroundColor: isOwn ? '#fff' : '#fbbf24' }} />
                      </View>
                      <Text style={{ fontSize: 11, color: isOwn ? 'rgba(255,255,255,0.7)' : 'rgba(148,163,184,0.8)' }}>
                        {Math.floor((msg.audioDuration || 0) / 1000 / 60)}:
                        {Math.floor(((msg.audioDuration || 0) / 1000) % 60).toString().padStart(2, '0')}
                      </Text>
                    </View>
                  ) : cleanText ? (
                    <Text style={[isOwn ? styles.bubbleTextOwn : styles.bubbleText, { flexShrink: 1 }]}>
                      {cleanText}
                    </Text>
                  ) : null}
                </View>

                <Text style={[styles.bubbleTimeInline, { textAlign: 'right' }]}>
                  {formatTime(msg.createdAt)}
                </Text>
              </View>
            );

            return isOwn ? (
              <LinearGradient
                colors={['#fbbf24', '#d97706']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={[styles.bubble, styles.bubbleOwn]}
              >
                {bubbleContent}
              </LinearGradient>
            ) : (
              <View style={styles.bubbleIncoming}>
                {bubbleContent}
              </View>
            );
          })()}
        </TouchableOpacity>

        <ReactionBar msg={msg} myUid={myUid} onReact={(r) => onReact(msg.id, r)} />
      </View>

    </Animated.View>
  );
}

// ─── Main Screen ─────────────────────────────────────────
export default function DailyCelebrationChatScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { user, member } = useAuth();

  const dateKeyParam: string | undefined = route.params?.dateKey;
  const dateKey = dateKeyParam || getDateKey();
  const isArchived = dateKey !== getDateKey();
  const displayDate = formatDisplayDate(dateKey);

  const [celebrations, setCelebrations] = useState<Member[]>(route.params?.celebrations || []);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [senderPhotos, setSenderPhotos] = useState<Record<string, string>>({});
  const [longPressedMsg, setLongPressedMsg] = useState<ChatMessage | null>(null);
  const [editingMsg, setEditingMsg] = useState<ChatMessage | null>(null);
  const [viewingPhoto, setViewingPhoto] = useState<string | null>(null);
  const [liveCelebPhotos, setLiveCelebPhotos] = useState<Record<string, string>>({});

  // ── Query Firestore directly for celebrant photos to ensure freshness
  useEffect(() => {
    const fetchFreshCelebPhotos = async () => {
      const newPhotos: Record<string, string> = {};
      for (const c of celebrations) {
        try {
          let snap = await firestore().collection('users').where('name', '==', c.name).limit(1).get();
          if (snap.empty) {
            const words = c.name.split(' ');
            if (words.length === 2) {
              snap = await firestore().collection('users').where('name', '==', `${words[1]} ${words[0]}`).limit(1).get();
            }
          }
          if (snap.empty && c.phone) {
             const cleanPhone = c.phone.replace(/[^0-9]/g, '').slice(-10);
             snap = await firestore().collection('users').where('phone', '==', cleanPhone).limit(1).get();
          }
          if (!snap.empty) {
             const photo = snap.docs[0].data()?.photoURL;
             if (photo) newPhotos[c.id] = photo;
          }
        } catch (e) {}
      }
      if (Object.keys(newPhotos).length > 0) {
        setLiveCelebPhotos(newPhotos);
      }
    };
    if (celebrations.length > 0) {
      fetchFreshCelebPhotos();
    }
  }, [celebrations]);
  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([]);
  const [inputText, setInputText] = useState('');
  const [sending, setSending] = useState(false);
  const [memberCount, setMemberCount] = useState(0);

  // Audio recording state
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const recordingRef = useRef<Audio.Recording | null>(null);
  const recordingTimerRef = useRef<any>(null);

  const insets = useSafeAreaInsets();
  const [isLive, setIsLive] = useState(!isArchived);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showSub = Keyboard.addListener(showEvent, (e) => setKeyboardHeight(e.endCoordinates.height));
    const hideSub = Keyboard.addListener(hideEvent, () => setKeyboardHeight(0));
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);
  const [loadingCelebs, setLoadingCelebs] = useState(celebrations.length === 0);
  const [showMenu, setShowMenu] = useState(false);

  // Mentions & Filtering State
  const highlightCelebrationId: string | undefined = route.params?.highlightCelebrationId;

  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [selectedMentionIds, setSelectedMentionIds] = useState<string[]>([]);
  const [filterCelebrantId, setFilterCelebrantId] = useState<string | null>(highlightCelebrationId || null);

  // Dynamically generate quick wishes based on active celebration categories today
  const activeCategories = Array.from(new Set(celebrations.map(c => c.category)));
  const activeQuickWishes = activeCategories.flatMap(cat => CATEGORIZED_QUICK_WISHES[cat] || []);

  const flatListRef = useRef<FlatList>(null);
  const typingTimerRef = useRef<any>(null);
  const isAdmin = ['admin', 'pastor', 'system administrator'].some(r =>
    member?.userType?.toLowerCase().includes(r)
  );

  const collectionPath = `daily_celebration_chats/${dateKey}/messages`;
  const metaPath = `daily_celebration_chats/${dateKey}`;

  // ── Load celebrations
  useEffect(() => {
    const load = async () => {
      setLoadingCelebs(true);
      try {
        const all = await fetchCelebrations(true); // force fresh data for this check
        const todays = isArchived
          ? all // for archive just show all  
          : all.filter(isToday);
        setCelebrations(todays);
      } catch (e) {
      } finally {
        setLoadingCelebs(false);
      }
    };
    load();
  }, [dateKey]);

  // ── Meta doc — ensure it exists for today
  useEffect(() => {
    if (isArchived) return;
    const metaRef = firestore().doc(metaPath);
    metaRef.get().then(snap => {
      if (!snap.exists()) {
        const types = [...new Set(celebrations.map(c => c.category))];
        metaRef.set({
          isLive: true,
          celebrationTypes: types,
          celebrationCount: celebrations.length,
          messageCount: 0,
          createdAt: firestore.FieldValue.serverTimestamp(),
        }).catch(() => {});
      }
    });
  }, [celebrations, isArchived]);

  // ── Track initial last-read time when entering screen
  const [initialLastReadTime, setInitialLastReadTime] = useState<number | null>(null);

  useEffect(() => {
    AsyncStorage.getItem(`@daily_celebration_last_read_${dateKey}`).then(val => {
      if (val) {
        setInitialLastReadTime(parseInt(val, 10));
      } else {
        setInitialLastReadTime(0);
      }
    }).catch(() => {
      setInitialLastReadTime(0);
    });
  }, [dateKey]);

  // ── Real-time messages
  useEffect(() => {
    const unsub = firestore()
      .collection(collectionPath)
      .orderBy('createdAt', 'asc')
      .onSnapshot(snap => {
        if (!snap) return;
        const msgs: ChatMessage[] = snap.docs.map(d => ({
          id: d.id,
          ...(d.data() as any),
        }));
        setMessages(msgs);
        setMemberCount(new Set(msgs.map(m => m.senderUid)).size);
        setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);

        // Update last-read timestamp in AsyncStorage
        AsyncStorage.setItem(`@daily_celebration_last_read_${dateKey}`, Date.now().toString()).catch(() => {});
      }, () => {});

    return () => {
      AsyncStorage.setItem(`@daily_celebration_last_read_${dateKey}`, Date.now().toString()).catch(() => {});
      unsub();
    };
  }, [collectionPath, dateKey]);

  // ── Real-time typing
  useEffect(() => {
    if (isArchived) return;
    const unsub = firestore()
      .collection(`${metaPath}/typing`)
      .onSnapshot(snap => {
        if (!snap) return;
        const now = Date.now();
        const active: TypingUser[] = snap.docs
          .filter(d => {
            const ts = d.data().updatedAt?.toMillis?.() || 0;
            return now - ts < 5000 && d.id !== user?.uid;
          })
          .map(d => ({ uid: d.id, name: d.data().name }));
        setTypingUsers(active);
      }, () => {});
    return () => unsub();
  }, [metaPath, isArchived]);

  // ── Fetch missing sender photos
  useEffect(() => {
    const fetchMissingPhotos = async () => {
      const uniqueUids = Array.from(new Set(messages.map(m => m.senderUid)));
      const missingUids = uniqueUids.filter(uid => uid && !senderPhotos[uid]);
      if (missingUids.length === 0) return;

      const newPhotos: Record<string, string> = {};
      await Promise.all(
        missingUids.map(async (uid) => {
          try {
            const doc = await firestore().collection('users').doc(uid).get();
            const photo = doc.data()?.photoURL;
            if (photo) newPhotos[uid] = photo;
          } catch (e) {}
        })
      );

      if (Object.keys(newPhotos).length > 0) {
        setSenderPhotos(prev => ({ ...prev, ...newPhotos }));
      }
    };
    fetchMissingPhotos();
  }, [messages.length]);

  // ── Audio Recording
  const startRecording = async () => {
    try {
      const permission = await Audio.requestPermissionsAsync();
      if (permission.status === 'granted') {
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: true,
          playsInSilentModeIOS: true,
        });
        const { recording } = await Audio.Recording.createAsync(
          Audio.RecordingOptionsPresets.HIGH_QUALITY
        );
        recordingRef.current = recording;
        setIsRecording(true);
        setRecordingDuration(0);
        recordingTimerRef.current = setInterval(() => {
          setRecordingDuration((prev) => prev + 1);
        }, 1000);
      } else {
        Alert.alert('Permission required', 'Please grant microphone access to send voice messages.');
      }
    } catch (err) {
      console.error('Failed to start recording', err);
    }
  };

  const cancelRecording = async () => {
    try {
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
      setIsRecording(false);
      setRecordingDuration(0);
      const recording = recordingRef.current;
      if (recording) {
        await recording.stopAndUnloadAsync();
        recordingRef.current = null;
      }
    } catch (err) {
      console.error('Failed to cancel recording', err);
    }
  };

  const stopAndSendRecording = async () => {
    try {
      setSending(true);
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
      setIsRecording(false);
      
      const recording = recordingRef.current;
      if (!recording) return;
      
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      recordingRef.current = null;
      
      if (!uri) {
        setSending(false);
        return;
      }

      // Upload to Firebase Storage
      const response = await fetch(uri);
      const blob = await response.blob();
      const filename = `audio_${Date.now()}.m4a`;
      const ref = storage().ref(`celebration_audio/${dateKey}/${filename}`);
      
      await ref.put(blob);
      const downloadURL = await ref.getDownloadURL();
      
      // Save to Firestore
      await firestore().collection(collectionPath).add({
        text: '',
        senderName: member?.name || 'Anonymous',
        senderUid: user?.uid,
        senderPhoto: user?.photoURL || null,
        audioUrl: downloadURL,
        audioDuration: recordingDuration * 1000,
        createdAt: firestore.FieldValue.serverTimestamp(),
        reactions: {},
        reactedBy: {},
      });
      
      // Increment meta count
      firestore().doc(metaPath).update({
        messageCount: firestore.FieldValue.increment(1),
      }).catch(() => {});
      
      setRecordingDuration(0);
      setSending(false);
    } catch (err) {
      console.error('Failed to send recording', err);
      setSending(false);
      Alert.alert('Error', 'Failed to send voice message.');
    }
  };

  // ── Send message
  const handleSend = async () => {
    const rawText = inputText.trim();
    const validMentionIds = [...selectedMentionIds];

    // Auto-detect any celebrant in celebrations whose @Name is typed in rawText
    celebrations.forEach(c => {
      if (rawText.toLowerCase().includes(`@${c.name.toLowerCase()}`) && !validMentionIds.includes(c.id)) {
        validMentionIds.push(c.id);
      }
    });

    let finalText = rawText;
    if (!finalText && validMentionIds.length > 0) {
      finalText = 'God bless you abundantly! 🙏';
    }

    if (!finalText || sending || !user || !member) return;

    setSending(true);
    setInputText('');
    setMentionQuery(null);
    setSelectedMentionIds([]);
    clearTyping();
    try {
      if (editingMsg) {
        await firestore().collection(collectionPath).doc(editingMsg.id).update({
          text: finalText,
          mentionedIds: validMentionIds,
          isEdited: true,
        });
        setEditingMsg(null);
      } else {
        const activeCelebrant = filterCelebrantId ? celebrations.find(c => c.id === filterCelebrantId) : celebrations[0];
        const celebrationId = activeCelebrant ? `${activeCelebrant.id}_${dateKey}` : undefined;

        await firestore().collection(collectionPath).add({
          text: finalText,
          senderName: member.name,
          senderUid: user.uid,
          senderPhoto: user.photoURL || null,
          createdAt: firestore.FieldValue.serverTimestamp(),
          reactions: {},
          reactedBy: {},
          mentionedIds: validMentionIds,
          celebrationId: celebrationId || null,
        });
        // Increment meta count
        firestore().doc(metaPath).update({
          messageCount: firestore.FieldValue.increment(1),
        }).catch(() => {});
      }
    } catch (e) {
      Alert.alert('Error', 'Could not save message. Please try again.');
      setInputText(rawText);
      setSelectedMentionIds(validMentionIds);
    } finally {
      setSending(false);
    }
  };

  // ── Typing indicator
  const handleTyping = (text: string) => {
    setInputText(text);

    // Mention detection
    const lastWord = text.split(' ').pop();
    if (lastWord !== undefined && lastWord.startsWith('@')) {
      setMentionQuery(lastWord.slice(1).toLowerCase());
    } else {
      setMentionQuery(null);
    }
    if (isArchived || !user || !member) return;
    firestore()
      .doc(`${metaPath}/typing/${user.uid}`)
      .set({ name: member.name, updatedAt: firestore.FieldValue.serverTimestamp() })
      .catch(() => {});
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    typingTimerRef.current = setTimeout(clearTyping, 3000);
  };

  const clearTyping = () => {
    if (!user) return;
    firestore().doc(`${metaPath}/typing/${user.uid}`).delete().catch(() => {});
  };

  // ── React to message
  const handleReact = async (msgId: string, emoji: string) => {
    if (!user || isArchived) return;
    const ref = firestore().doc(`${collectionPath}/${msgId}`);
    const snap = await ref.get();
    if (!snap.exists()) return;
    const data = snap.data() as any;
    const reactedBy = data.reactedBy || {};
    const users: string[] = reactedBy[emoji] || [];
    const already = users.includes(user.uid);
    await ref.update({
      [`reactions.${emoji}`]: firestore.FieldValue.increment(already ? -1 : 1),
      [`reactedBy.${emoji}`]: already
        ? firestore.FieldValue.arrayRemove(user.uid)
        : firestore.FieldValue.arrayUnion(user.uid),
    });
  };

  // ── Long press (delete options)
  const handleLongPress = (msg: ChatMessage) => {
    const isAdmin = member?.userType === 'admin';
    const isOwn = msg.senderUid === user?.uid;
    if (isAdmin || isOwn) {
      setLongPressedMsg(msg);
    }
  };

  const liveCelebrations = useMemo(() => {
    return celebrations.map(c => {
      let freshPhoto: string | undefined | null = liveCelebPhotos[c.id];
      if (!freshPhoto && member && isNameMatch(c.name, member.name)) {
        freshPhoto = user?.photoURL;
      }
      if (!freshPhoto) {
        const msg = messages.find(m => isNameMatch(m.senderName, c.name));
        if (msg && senderPhotos[msg.senderUid]) {
          freshPhoto = senderPhotos[msg.senderUid];
        }
      }
      return { ...c, photoUrl: freshPhoto || c.photoUrl };
    });
  }, [celebrations, liveCelebPhotos, messages, senderPhotos, member, user]);

  const firstUnreadId = useMemo(() => {
    if (initialLastReadTime === null || initialLastReadTime === 0) return null;
    const firstUnread = messages.find(m => {
      if (m.senderUid === user?.uid) return false;
      const msgTime = m.createdAt?.toMillis ? m.createdAt.toMillis() : (m.createdAt ? new Date(m.createdAt).getTime() : 0);
      return msgTime > initialLastReadTime;
    });
    return firstUnread ? firstUnread.id : null;
  }, [messages, initialLastReadTime, user?.uid]);

  const renderMessage = ({ item }: { item: ChatMessage }) => {
    const isOwn = item.senderUid === user?.uid;
    const latestPhoto = isOwn ? user?.photoURL : senderPhotos[item.senderUid];
    const showUnreadBadge = item.id === firstUnreadId;

    return (
      <View style={{ width: '100%' }}>
        {showUnreadBadge && (
          <View style={styles.unreadDividerContainer}>
            <View style={styles.unreadDividerLine} />
            <View style={styles.unreadDividerBadge}>
              <Text style={styles.unreadDividerBadgeText}>👇 New Unread Messages</Text>
            </View>
            <View style={styles.unreadDividerLine} />
          </View>
        )}
        <ChatBubble
          msg={{ ...item, senderPhoto: latestPhoto || item.senderPhoto }}
          isOwn={isOwn}
          myUid={user?.uid || ''}
          onReact={handleReact}
          onLongPress={handleLongPress}
          celebrations={liveCelebrations}
          onAvatarPress={(url) => { if (url) setViewingPhoto(url); }}
        />
      </View>
    );
  };

  const hasCelebrations = celebrations.length > 0;

  const filteredMessages = filterCelebrantId ? messages.filter(m => {
    if (m.mentionedIds?.includes(filterCelebrantId)) return true;
    const celebrant = liveCelebrations.find(c => c.id === filterCelebrantId);
    if (celebrant) {
      const nameParts = celebrant.name.toLowerCase().split(' ').filter(p => p.length > 2);
      const textLower = m.text.toLowerCase();
      return nameParts.some(part => textLower.includes(part));
    }
    return false;
  }) : messages;

  const filteredMemberCount = new Set(filteredMessages.map(m => m.senderUid)).size;

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#060e1e" />
      <KeyboardAvoidingView
        style={[
          styles.flex,
          Platform.OS === 'android' && {
            paddingBottom: keyboardHeight > 0 ? keyboardHeight + Math.max(insets.bottom, 24) : 0,
          },
        ]}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        <LinearGradient
          colors={['#060e1e', '#0a1628', '#0d1f3c']}
          style={StyleSheet.absoluteFill}
        />

        <View style={[styles.header, { paddingTop: Math.max(insets.top + 12, Platform.OS === 'android' ? 44 : 54) }]}>
          <TouchableOpacity style={styles.headerBack} onPress={() => {
            if (navigation.canGoBack()) {
              navigation.goBack();
            } else {
              navigation.replace('Tabs');
            }
          }}>
            <ArrowLeft size={20} color="#f8fafc" />
          </TouchableOpacity>

          <View style={styles.headerCenter}>
            <View style={styles.headerTitleRow}>
              <Text style={styles.headerEmoji}>🎉</Text>
              <Text style={styles.headerTitle}>Today's Celebrations</Text>
            </View>
            <Text style={styles.headerDate}>{displayDate}</Text>
          </View>

          <View style={styles.headerRight}>
            {isArchived ? (
              <View style={styles.archivedBadge}>
                <Text style={styles.archivedBadgeText}>Archived</Text>
              </View>
            ) : (
              <View style={styles.liveBadgeWrapper}>
                <LiveBadgeWaveRipple />
                <View style={styles.liveBadge}>
                  <WaveLineEffect />
                  <Text style={styles.liveBadgeText}>LIVE</Text>
                </View>
              </View>
            )}
          </View>
        </View>

        <LinearGradient
          colors={['transparent', 'rgba(251,191,36,0.5)', 'transparent']}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
          style={styles.goldDivider}
        />

        {loadingCelebs ? (
          <ActivityIndicator color="#fbbf24" style={{ marginVertical: 16 }} />
        ) : hasCelebrations ? (
          <View style={styles.celebSection}>
            <View style={styles.celebSectionHeader}>
              <Text style={styles.celebSectionSub}>👆 Tap a card to see their dedicated wishes</Text>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.celebScroll}
            >
              {liveCelebrations.map(m => (
                <CelebrationCard 
                  key={`${m.id}-${m.category}`} 
                  member={m} 
                  isSelected={filterCelebrantId === m.id}
                  onPress={() => setFilterCelebrantId(prev => prev === m.id ? null : m.id)}
                  onAvatarPress={(url) => { if (url) setViewingPhoto(url); }}
                />
              ))}
            </ScrollView>
          </View>
        ) : null}

        <View style={styles.wishesHeader}>
          <View style={styles.wishesHeaderLeft}>
            <Text style={styles.wishesTitle}>💬 Live Wishes</Text>
          </View>
          <View style={[styles.memberCountPill, filterCelebrantId && { backgroundColor: '#fbbf24', borderColor: '#d97706', borderWidth: 1 }]}>
            <Users size={12} color={filterCelebrantId ? "#000" : "#94a3b8"} />
            <Text style={[styles.memberCountText, filterCelebrantId && { color: '#000', fontWeight: 'bold' }]}>
              {filterCelebrantId ? `${filteredMemberCount} wished` : `${memberCount} members`}
            </Text>
          </View>
        </View>

        {isArchived && (
          <View style={styles.archivedNotice}>
            <Text style={styles.archivedNoticeText}>
              This celebration has ended. You can still view the wishes shared by our church family.
            </Text>
          </View>
        )}

        {!hasCelebrations && !loadingCelebs ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>🕊️</Text>
            <Text style={styles.emptyTitle}>No Celebrations Today</Text>
            <Text style={styles.emptySubtitle}>
              Come back tomorrow to celebrate with our church family.
            </Text>
          </View>
        ) : (
          <>
            <FlatList
              ref={flatListRef}
              data={filteredMessages}
              keyExtractor={item => item.id}
              renderItem={renderMessage}
              contentContainerStyle={styles.messageList}
              showsVerticalScrollIndicator={false}
              onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
              ListEmptyComponent={
                <View style={styles.emptyChat}>
                  <Text style={styles.emptyChatText}>
                    Be the first to send a blessing! 🙏
                  </Text>
                  <Text style={styles.emptyChatSubtext}>
                    Tip: Type '@' to direct your message to a specific person celebrating today.
                  </Text>
                </View>
              }
            />

            {!isArchived ? (
              <View style={[styles.bottomPanel, { paddingBottom: keyboardHeight > 0 ? 6 : Math.max(10, insets.bottom + 4) }]}>
                {typingUsers.length > 0 && (
                  <View style={styles.typingIndicator}>
                    <View style={styles.typingDots}>
                      {[0, 1, 2].map(i => <BounceDot key={i} delay={i * 150} />)}
                    </View>
                    <Text style={styles.typingText}>
                      {typingUsers.map(t => t.name).join(', ')} {typingUsers.length === 1 ? 'is' : 'are'} typing...
                    </Text>
                  </View>
                )}
                {(mentionQuery !== null || !inputText.trim()) && (
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                    style={styles.quickWishBar}
                    contentContainerStyle={styles.quickWishContent}
                  >
                    {mentionQuery !== null ? (
                      liveCelebrations
                        .filter(c => c.name.toLowerCase().includes(mentionQuery.toLowerCase()))
                        .map(c => (
                          <TouchableOpacity
                            key={`mention-${c.id}`}
                            style={styles.quickWishPill}
                            onPress={() => {
                              setSelectedMentionIds(prev => Array.from(new Set([...prev, c.id])));
                              setMentionQuery(null);
                              const words = inputText.split(' ');
                              if (words.length > 0 && words[words.length - 1].startsWith('@')) {
                                words.pop();
                                setInputText(words.join(' ').trim());
                              }
                            }}
                            activeOpacity={0.7}
                          >
                            <Text style={styles.quickWishText}>@{c.name}</Text>
                          </TouchableOpacity>
                        ))
                    ) : (
                      activeQuickWishes.map(w => (
                        <TouchableOpacity
                          key={w}
                          style={styles.quickWishPill}
                          onPress={() => setInputText(w)}
                          activeOpacity={0.7}
                        >
                          <Text style={styles.quickWishText}>{w}</Text>
                        </TouchableOpacity>
                      ))
                    )}
                  </ScrollView>
                )}

                <View style={styles.composerRow}>
                  {isRecording ? (
                    <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: '#ef4444' }} />
                        <AudioWave />
                      </View>
                      <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 6, paddingHorizontal: 12, backgroundColor: 'rgba(239, 68, 68, 0.15)', borderRadius: 16 }} onPress={cancelRecording}>
                        <X size={16} color="#ef4444" />
                        <Text style={{ color: '#ef4444', fontWeight: '600', fontSize: 13 }}>Cancel</Text>
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <View style={styles.composerInputWrapper}>
                      {editingMsg && (
                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: 'rgba(59, 130, 246, 0.15)', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4, marginBottom: 6, borderWidth: 1, borderColor: 'rgba(59, 130, 246, 0.4)' }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                            <Edit3 size={14} color="#60a5fa" />
                            <Text style={{ color: '#60a5fa', fontSize: 12, fontWeight: '700' }}>Editing message</Text>
                          </View>
                          <TouchableOpacity onPress={() => { setEditingMsg(null); setInputText(''); }}>
                            <X size={16} color="#94a3b8" />
                          </TouchableOpacity>
                        </View>
                      )}
                      {selectedMentionIds.length > 0 && (
                        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginBottom: 4 }}>
                          {selectedMentionIds.map(id => {
                            const cel = liveCelebrations.find(c => c.id === id);
                            if (!cel) return null;
                            return (
                              <TouchableOpacity
                                key={id}
                                style={styles.inlineComposerBadge}
                                onPress={() => {
                                  setSelectedMentionIds(prev => prev.filter(x => x !== id));
                                  setInputText(prev => prev.replace(`@${cel.name}`, '').trim());
                                }}
                                activeOpacity={0.7}
                              >
                                <Text style={styles.inlineComposerBadgeText}>@{cel.name} ✕</Text>
                              </TouchableOpacity>
                            );
                          })}
                        </View>
                      )}
                      <TextInput
                        style={styles.composerInput}
                        placeholder={selectedMentionIds.length > 0 ? "Add a message..." : "Type @ to mention or a blessing..."}
                        placeholderTextColor="rgba(148,163,184,0.6)"
                        value={inputText}
                        onChangeText={handleTyping}
                        onBlur={clearTyping}
                        multiline
                        maxLength={500}
                        returnKeyType="send"
                        onSubmitEditing={handleSend}
                      />
                    </View>
                  )}
                  <TouchableOpacity
                    style={[styles.sendBtn, styles.sendBtnActive]}
                    onPress={
                      isRecording 
                        ? stopAndSendRecording 
                        : inputText.trim() 
                          ? handleSend 
                          : startRecording
                    }
                    disabled={sending}
                    activeOpacity={0.8}
                  >
                    <LinearGradient
                      colors={isRecording ? ['#ef4444', '#b91c1c'] : ['#fbbf24', '#d97706']}
                      style={styles.sendBtnGradient}
                    >
                      {sending
                        ? <ActivityIndicator size="small" color="#0a1628" />
                        : isRecording
                          ? <Send size={18} color="#ffffff" />
                          : inputText.trim() 
                            ? <Send size={18} color="#0a1628" />
                            : <Mic size={18} color="#0a1628" />
                      }
                    </LinearGradient>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <View style={[styles.archivedComposer, { paddingBottom: Math.max(14, insets.bottom + 10) }]}>
                <Text style={styles.archivedComposerText}>
                  This chat is now closed.
                </Text>
              </View>
            )}
          </>
        )}

        {/* ── MENU MODAL ── */}
        <Modal visible={showMenu} transparent animationType="fade" onRequestClose={() => setShowMenu(false)}>
          <TouchableOpacity style={styles.menuOverlay} activeOpacity={1} onPress={() => setShowMenu(false)}>
            <View style={styles.menuCard}>
              <Text style={styles.menuTitle}>Options</Text>
              <TouchableOpacity style={styles.menuItem} onPress={() => { setShowMenu(false); navigation.navigate('CelebrationHistory'); }}>
                <Text style={styles.menuItemText}>📅 View Celebration History</Text>
              </TouchableOpacity>
              {isAdmin && (
                <>
                  <View style={styles.menuDivider} />
                  <Text style={[styles.menuTitle, { color: '#ef4444', fontSize: 11 }]}>Admin Controls</Text>
                  <TouchableOpacity style={styles.menuItem} onPress={() => {
                    setShowMenu(false);
                    Alert.alert('Disable Chat', 'This will make the chat read-only for all members.', [
                      { text: 'Cancel', style: 'cancel' },
                      { text: 'Disable', style: 'destructive', onPress: () => {
                        firestore().doc(metaPath).update({ isLive: false });
                        setIsLive(false);
                      }},
                    ]);
                  }}>
                    <Shield size={14} color="#ef4444" />
                    <Text style={[styles.menuItemText, { color: '#ef4444' }]}> Disable Chat</Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          </TouchableOpacity>
        </Modal>

        {/* ── LONG PRESS MENU ── */}
        <Modal
          visible={!!longPressedMsg}
          transparent
          animationType="fade"
          onRequestClose={() => setLongPressedMsg(null)}
        >
          <TouchableOpacity 
            style={styles.modalBackdrop} 
            activeOpacity={1} 
            onPress={() => setLongPressedMsg(null)}
          >
            <View style={styles.deleteModalContainer}>
              <View style={styles.deleteModalHeader}>
                <View style={styles.deleteIconCircle}>
                  <MessageSquare size={22} color="#fbbf24" />
                </View>
                <Text style={styles.deleteModalTitle}>Message Options</Text>
              </View>
              <Text style={styles.deleteModalDesc}>
                {longPressedMsg?.isDeleted ? 'This message is already marked as deleted. Do you want to permanently remove it?' : 'Choose an action for this message:'}
              </Text>
              
              <View style={styles.deleteModalActions}>
                <TouchableOpacity style={[styles.deleteBtn, styles.deleteCancelBtn]} onPress={() => setLongPressedMsg(null)}>
                  <Text style={styles.deleteCancelText}>Cancel</Text>
                </TouchableOpacity>

                {/* Edit Option (only for own non-deleted text messages) */}
                {longPressedMsg && !longPressedMsg.isDeleted && longPressedMsg.senderUid === user?.uid && !longPressedMsg.audioUrl && (
                  <TouchableOpacity 
                    style={[styles.deleteBtn, styles.editActionBtn]}
                    onPress={() => {
                      if (longPressedMsg) {
                        setEditingMsg(longPressedMsg);
                        setInputText(longPressedMsg.text || '');
                        setSelectedMentionIds(longPressedMsg.mentionedIds || []);
                      }
                      setLongPressedMsg(null);
                    }}
                  >
                    <Edit3 size={15} color="#3b82f6" />
                    <Text style={styles.editActionText}>Edit</Text>
                  </TouchableOpacity>
                )}

                <TouchableOpacity 
                  style={[styles.deleteBtn, styles.deleteConfirmBtn]} 
                  onPress={() => {
                    if (longPressedMsg) {
                      firestore().doc(`${collectionPath}/${longPressedMsg.id}`).delete().catch(err => {
                        console.error('Failed to delete message from Firebase:', err);
                        Alert.alert('Error', 'Failed to delete message from Firebase.');
                      });
                    }
                    setLongPressedMsg(null);
                  }}
                >
                  <Text style={styles.deleteConfirmText}>Delete</Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableOpacity>
        </Modal>
        {/* Profile Image Viewer Modal */}
        <Modal visible={!!viewingPhoto} transparent animationType="fade" onRequestClose={() => setViewingPhoto(null)}>
          <TouchableOpacity style={styles.photoViewerBackdrop} activeOpacity={1} onPress={() => setViewingPhoto(null)}>
            <TouchableOpacity activeOpacity={1} style={styles.photoViewerClose} onPress={() => setViewingPhoto(null)}>
              <X size={24} color="#fff" />
            </TouchableOpacity>
            {viewingPhoto && (
              <Image source={{ uri: viewingPhoto }} style={styles.photoViewerImg} resizeMode="cover" />
            )}
          </TouchableOpacity>
        </Modal>

      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ─── Bounce dot for typing ─────────────────────────────────
function BounceDot({ delay }: { delay: number }) {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(anim, { toValue: -6, duration: 300, useNativeDriver: true }),
        Animated.timing(anim, { toValue: 0, duration: 300, useNativeDriver: true }),
        Animated.delay(600),
      ])
    ).start();
  }, []);
  return (
    <Animated.View style={[styles.bounceDot, { transform: [{ translateY: anim }] }]} />
  );
}

// ─── Styles ───────────────────────────────────────────────
const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#060e1e' },
  flex: { flex: 1 },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingTop: Platform.OS === 'android' ? 14 : 8,
    paddingBottom: 10,
    gap: 8,
  },
  headerBack: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.07)',
    justifyContent: 'center', alignItems: 'center',
  },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  headerEmoji: { fontSize: 18 },
  headerTitle: {
    color: '#f8fafc', fontSize: 16, fontWeight: '800', letterSpacing: 0.2,
  },
  headerDate: { color: 'rgba(148,163,184,0.8)', fontSize: 11, marginTop: 1 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  liveBadgeWrapper: {
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeWaveRing: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    borderRadius: 20,
    borderWidth: 1.2,
    borderColor: 'rgba(74,222,128,0.7)',
    backgroundColor: 'rgba(34,197,94,0.08)',
  },
  liveBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(34,197,94,0.1)',
    borderWidth: 1, borderColor: 'rgba(34,197,94,0.3)',
    borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5,
  },
  waveContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    height: 12,
  },
  waveBar: {
    width: 2.5,
    height: 12,
    borderRadius: 1.25,
  },
  liveBadgeText: { color: '#4ade80', fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },
  archivedBadge: {
    backgroundColor: 'rgba(100,116,139,0.2)',
    borderRadius: 10, paddingHorizontal: 8, paddingVertical: 4,
  },
  archivedBadgeText: { color: '#64748b', fontSize: 10, fontWeight: '700' },
  menuBtn: {
    width: 34, height: 34, borderRadius: 17,
    justifyContent: 'center', alignItems: 'center',
  },
  goldDivider: { height: 1, marginHorizontal: 0 },

  // Celebration cards
  celebSection: { paddingTop: 16 },
  celebSectionHeader: { paddingHorizontal: 16, marginBottom: 12 },
  celebSectionTitle: { color: '#f8fafc', fontSize: 16, fontWeight: '700' },
  celebSectionSub: { color: '#94a3b8', fontSize: 13, marginTop: 2 },
  celebScroll: { paddingHorizontal: 16, paddingBottom: 16, gap: 12 },
  celebCard: {
    backgroundColor: '#0a1628',
    borderRadius: 16,
    borderWidth: 1.5,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    minWidth: 180,
    maxWidth: 240,
    marginRight: 8,
  },
  celebCardSelected: {
    backgroundColor: '#1e293b',
    borderWidth: 2,
    shadowColor: '#fbbf24',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 4,
  },
  celebAvatarWrap: {},
  celebAvatarImg: { width: 44, height: 44, borderRadius: 22 },
  celebAvatarCircle: {
    width: 44, height: 44, borderRadius: 22,
    justifyContent: 'center', alignItems: 'center',
  },
  celebAvatarText: { color: '#fbbf24', fontSize: 16, fontWeight: '800' },
  celebInfo: { flex: 1, justifyContent: 'center' },
  celebName: {
    color: '#f8fafc', fontSize: 14, fontWeight: '700', marginBottom: 2,
  },
  celebTypePill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
  },
  celebTypeEmoji: { fontSize: 12 },
  celebTypeLabel: { fontSize: 11, fontWeight: '600' },


  // Wishes header
  wishesHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 10,
  },
  wishesHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  wishesTitle: { color: '#f8fafc', fontSize: 15, fontWeight: '800' },
  memberCountPill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 10, paddingHorizontal: 8, paddingVertical: 4,
  },
  memberCountText: { color: '#64748b', fontSize: 11 },

  // Archived notice
  archivedNotice: {
    marginHorizontal: 16, marginBottom: 8,
    backgroundColor: 'rgba(100,116,139,0.12)',
    borderRadius: 10, padding: 10,
  },
  archivedNoticeText: { color: '#94a3b8', fontSize: 12, textAlign: 'center', lineHeight: 18 },

  // Messages
  messageList: { paddingHorizontal: 14, paddingVertical: 8, gap: 12, flexGrow: 1 },
  unreadDividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 12,
    marginHorizontal: 8,
    gap: 8,
  },
  unreadDividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(239, 68, 68, 0.5)',
  },
  unreadDividerBadge: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.5)',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  unreadDividerBadgeText: {
    color: '#f87171',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  bubbleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  bubbleRowRight: { alignSelf: 'flex-end', flexDirection: 'row-reverse' },
  bubbleColumn: { flexShrink: 1, gap: 3 },
  bubbleSenderName: { fontSize: 12, fontWeight: '700', marginBottom: 2 },
  bubbleSenderNameIncoming: {
    color: '#fbbf24',
    fontSize: 13,
    fontWeight: '800',
    marginBottom: 2,
  },
  bubbleSenderNameOwn: { color: '#fbbf24', textAlign: 'right', marginRight: 2 },
  bubbleIncoming: {
    backgroundColor: 'rgba(30,41,59,0.95)',
    borderWidth: 1, borderColor: 'rgba(71,85,105,0.5)',
    borderRadius: 18, borderBottomLeftRadius: 4,
    paddingHorizontal: 14, paddingVertical: 10,
    width: SW * 0.72,
    overflow: 'hidden',
  },
  bubble: {
    borderRadius: 18, paddingHorizontal: 14, paddingVertical: 10,
    width: SW * 0.72,
    overflow: 'hidden',
  },
  bubbleOwn: { borderBottomRightRadius: 4 },
  bubbleText: { color: '#e2e8f0', fontSize: 14, lineHeight: 20 },
  bubbleTextOwn: { color: '#0a1628', fontSize: 14, lineHeight: 20, fontWeight: '600' },
  bubbleTime: { color: 'rgba(100,116,139,0.7)', fontSize: 10, marginHorizontal: 4 },
  bubbleInlineContent: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 6,
  },
  bubbleTimeInline: {
    color: 'rgba(251,191,36,0.75)',
    fontSize: 11,
    fontWeight: '600',
    fontStyle: 'italic',
    alignSelf: 'flex-end',
    marginLeft: 4,
    marginTop: 2,
  },
  deletedMsg: { color: '#475569', fontSize: 13, fontStyle: 'italic', marginLeft: 40 },
  inlineBadgeWrapper: {
    backgroundColor: 'rgba(251,191,36,0.18)',
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginHorizontal: 3,
    borderWidth: 1,
    borderColor: 'rgba(251,191,36,0.5)',
  },
  inlineBadgeText: {
    color: '#fbbf24',
    fontWeight: '800',
    fontSize: 13,
  },
  inlineBadgeWrapperOwn: {
    backgroundColor: '#0a1628',
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginHorizontal: 3,
    borderWidth: 1,
    borderColor: 'rgba(251,191,36,0.5)',
  },
  inlineBadgeTextOwn: {
    color: '#fbbf24',
    fontWeight: '800',
    fontSize: 13,
  },
  bubbleMentionBadge: {
    backgroundColor: 'rgba(251,191,36,0.2)',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: 'rgba(251,191,36,0.6)',
  },
  bubbleMentionBadgeText: {
    color: '#fbbf24',
    fontSize: 11,
    fontWeight: '700',
  },
  bubbleMentionBadgeOwn: {
    backgroundColor: 'rgba(10,22,40,0.4)',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: 'rgba(251,191,36,0.6)',
  },
  bubbleMentionBadgeTextOwn: {
    color: '#fbbf24',
    fontSize: 11,
    fontWeight: '700',
  },
  bubbleMentionEmoji: { fontSize: 11 },

  // Reactions
  reactionBar: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 2, marginHorizontal: 2 },
  reactionPill: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: 'rgba(30,41,59,0.8)',
    borderRadius: 12, paddingHorizontal: 7, paddingVertical: 3,
    borderWidth: 1, borderColor: 'rgba(71,85,105,0.4)',
  },
  reactionPillActive: { borderColor: 'rgba(251,191,36,0.5)', backgroundColor: 'rgba(251,191,36,0.08)' },
  reactionEmoji: { fontSize: 12 },
  reactionCount: { color: '#94a3b8', fontSize: 11, fontWeight: '700' },

  // Typing
  typingIndicator: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 4, paddingVertical: 4, gap: 8,
  },
  typingDots: { flexDirection: 'row', gap: 3 },
  bounceDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#fbbf24' },
  typingText: { color: '#64748b', fontSize: 12, fontStyle: 'italic' },

  // Empty
  emptyChat: { alignItems: 'center', paddingVertical: 40, paddingHorizontal: 20 },
  emptyChatText: { color: 'rgba(148,163,184,0.7)', fontSize: 15, textAlign: 'center', marginBottom: 8 },
  emptyChatSubtext: { color: 'rgba(148,163,184,0.5)', fontSize: 13, textAlign: 'center', fontStyle: 'italic' },
  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32 },
  emptyEmoji: { fontSize: 56, marginBottom: 16 },
  emptyTitle: { color: '#f1f5f9', fontSize: 20, fontWeight: '800', textAlign: 'center', marginBottom: 10 },
  emptySubtitle: { color: '#64748b', fontSize: 14, textAlign: 'center', lineHeight: 22 },

  // Bottom Panel & Composer
  bottomPanel: {
    backgroundColor: '#0a1628',
    borderTopWidth: 1,
    borderTopColor: 'rgba(251,191,36,0.15)',
    paddingTop: 8,
    paddingHorizontal: 12,
  },
  quickWishBar: { flexGrow: 0, marginBottom: 8 },
  quickWishContent: { paddingHorizontal: 4, gap: 8, paddingVertical: 4, alignItems: 'center' },
  quickWishPill: {
    paddingHorizontal: 14, paddingVertical: 7,
    backgroundColor: 'rgba(251,191,36,0.12)',
    borderRadius: 18, borderWidth: 1, borderColor: 'rgba(251,191,36,0.4)',
    justifyContent: 'center', alignItems: 'center',
    height: 34,
  },
  quickWishText: { color: '#fbbf24', fontSize: 12, fontWeight: '700' },

  composer: {
    flexDirection: 'column',
    paddingHorizontal: 0, paddingTop: 4,
  },
  composerRow: {
    flexDirection: 'row', alignItems: 'flex-end', gap: 8, paddingBottom: 4,
  },
  composerInputWrapper: {
    flex: 1,
    flexDirection: 'column',
    minHeight: 42,
    backgroundColor: 'rgba(30,41,59,0.8)',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(71,85,105,0.4)',
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  inlineComposerBadge: {
    backgroundColor: '#fbbf24',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  inlineComposerBadgeText: {
    color: '#060e1e',
    fontWeight: '800',
    fontSize: 12,
  },
  composerEmoji: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.05)',
    justifyContent: 'center', alignItems: 'center',
  },
  composerInput: {
    minHeight: 34, maxHeight: 120,
    paddingHorizontal: 0, paddingVertical: 4,
    color: '#f1f5f9', fontSize: 14,
  },
  inputBadgeTextFormatted: {
    backgroundColor: 'rgba(251,191,36,0.15)',
    color: '#fbbf24',
    fontWeight: '800',
  },
  sendBtn: { width: 38, height: 38 },
  sendBtnActive: {},
  sendBtnGradient: { width: 38, height: 38, borderRadius: 19, justifyContent: 'center', alignItems: 'center' },

  archivedComposer: {
    paddingVertical: 14, paddingHorizontal: 20,
    backgroundColor: 'rgba(10,22,40,0.98)',
    borderTopWidth: 1, borderTopColor: 'rgba(71,85,105,0.25)',
    alignItems: 'center',
    paddingBottom: Platform.OS === 'ios' ? 20 : 14,
  },
  archivedComposerText: { color: '#475569', fontSize: 13, fontStyle: 'italic' },

  // Menu
  menuOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-start', alignItems: 'flex-end', paddingTop: 80, paddingRight: 16 },
  menuCard: {
    backgroundColor: '#1e293b', borderRadius: 16, padding: 16, minWidth: 220,
    borderWidth: 1, borderColor: 'rgba(71,85,105,0.4)',
    shadowColor: '#000', shadowOpacity: 0.4, shadowRadius: 12, shadowOffset: { width: 0, height: 6 },
  },
  menuTitle: { color: '#94a3b8', fontSize: 11, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 8 },
  menuItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, gap: 6 },
  menuItemText: { color: '#e2e8f0', fontSize: 14 },
  menuDivider: { height: 1, backgroundColor: 'rgba(71,85,105,0.3)', marginVertical: 8 },

  // Mentions
  mentionOverlay: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#334155',
    padding: 8,
    marginHorizontal: 16,
    marginBottom: 8,
    maxHeight: 150,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 5,
  },
  mentionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
    gap: 12,
  },
  mentionItemText: {
    color: '#f8fafc',
    fontSize: 14,
    fontWeight: '600',
  },
  mentionBadge: {
    backgroundColor: '#334155',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginBottom: 4,
  },
  mentionBadgeOwn: {
    backgroundColor: '#f59e0b',
    alignSelf: 'flex-end',
  },
  mentionBadgeText: {
    color: '#cbd5e1',
    fontSize: 11,
    fontWeight: '700',
  },
  mentionBadgeTextOwn: {
    color: '#fffbeb',
  },

  // Delete Modal
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(6, 14, 30, 0.8)', justifyContent: 'center', alignItems: 'center' },
  deleteModalContainer: { width: '88%', backgroundColor: '#0a1628', borderRadius: 24, padding: 24, borderWidth: 1, borderColor: 'rgba(251,191,36,0.3)', alignItems: 'center' },
  deleteModalHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 },
  deleteIconCircle: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(251, 191, 36, 0.12)', justifyContent: 'center', alignItems: 'center' },
  deleteModalTitle: { color: '#f8fafc', fontSize: 18, fontWeight: '700', letterSpacing: 0.3 },
  deleteModalDesc: { color: '#94a3b8', fontSize: 14, textAlign: 'center', marginBottom: 24 },
  deleteModalActions: { flexDirection: 'row', gap: 10, width: '100%', justifyContent: 'space-between' },
  deleteBtn: { flex: 1, paddingVertical: 12, paddingHorizontal: 6, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  deleteCancelBtn: { backgroundColor: 'rgba(255,255,255,0.08)' },
  deleteCancelText: { color: '#f8fafc', textAlign: 'center', fontWeight: '600', fontSize: 13 },
  editActionBtn: { backgroundColor: 'rgba(59, 130, 246, 0.15)', flexDirection: 'row', gap: 6, borderWidth: 1, borderColor: '#3b82f6' },
  editActionText: { color: '#60a5fa', textAlign: 'center', fontWeight: '700', fontSize: 13 },
  deleteConfirmBtn: { backgroundColor: '#ef4444' },
  deleteConfirmText: { color: '#ffffff', textAlign: 'center', fontWeight: '700', fontSize: 13 },

  // Photo Viewer Modal
  photoViewerBackdrop: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center', alignItems: 'center',
  },
  photoViewerClose: {
    position: 'absolute', top: Platform.OS === 'ios' ? 60 : 40, right: 20,
    padding: 12, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 30,
    zIndex: 10,
  },
  photoViewerImg: {
    width: SW * 0.85, height: SW * 0.85, borderRadius: SW * 0.425,
    borderWidth: 2, borderColor: '#fbbf24',
  },
});
