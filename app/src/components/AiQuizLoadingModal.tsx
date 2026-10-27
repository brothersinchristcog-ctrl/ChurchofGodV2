import React, { useEffect, useState, useRef } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Animated,
  Dimensions
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Sparkles, BookOpen, Flame } from 'lucide-react-native';
import { useTheme } from '../context/ThemeContext';

interface AiQuizLoadingModalProps {
  visible: boolean;
  title?: string;
  subtitle?: string;
  topic?: string;
}

const INSPIRATIONAL_VERSES = [
  { text: 'Your word is a lamp for my feet, a light on my path.', ref: 'Psalm 119:105' },
  { text: 'All Scripture is God-breathed and is useful for teaching and training.', ref: '2 Timothy 3:16' },
  { text: 'The grass withers and the flowers fall, but the word of our God endures forever.', ref: 'Isaiah 40:8' },
  { text: 'Let the message of Christ dwell among you richly as you teach and admonish one another.', ref: 'Colossians 3:16' },
  { text: 'Thy word have I hid in mine heart, that I might not sin against thee.', ref: 'Psalm 119:11' }
];

export default function AiQuizLoadingModal({
  visible,
  title = 'Preparing Scripture Challenge',
  subtitle,
  topic
}: AiQuizLoadingModalProps) {
  const { isDark } = useTheme();
  const [verseIndex, setVerseIndex] = useState(0);

  const pulseAnim = useRef(new Animated.Value(1)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      setVerseIndex(Math.floor(Math.random() * INSPIRATIONAL_VERSES.length));

      // Gentle pulsing animation for emblem
      const pulseLoop = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.12,
            duration: 1000,
            useNativeDriver: true
          }),
          Animated.timing(pulseAnim, {
            toValue: 1.0,
            duration: 1000,
            useNativeDriver: true
          })
        ])
      );

      // Subtle rotation for spark
      const rotateLoop = Animated.loop(
        Animated.timing(rotateAnim, {
          toValue: 1,
          duration: 4000,
          useNativeDriver: true
        })
      );

      pulseLoop.start();
      rotateLoop.start();

      return () => {
        pulseLoop.stop();
        rotateLoop.stop();
      };
    }
  }, [visible]);

  if (!visible) return null;

  const currentVerse = INSPIRATIONAL_VERSES[verseIndex];

  return (
    <Modal
      transparent
      animationType="fade"
      visible={visible}
      statusBarTranslucent
    >
      <View style={styles.backdrop}>
        <View style={[
          styles.cardContainer,
          {
            backgroundColor: isDark ? '#111827' : '#ffffff',
            borderColor: isDark ? 'rgba(167, 139, 250, 0.3)' : 'rgba(124, 58, 237, 0.25)'
          }
        ]}>
          {/* Top Decorative Gradient Line */}
          <LinearGradient
            colors={['#6366f1', '#a855f7', '#ec4899', '#f59e0b']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.topGradientBar}
          />

          <View style={styles.cardContent}>
            {/* Animated Icon Badge */}
            <Animated.View style={[styles.iconHalo, { transform: [{ scale: pulseAnim }] }]}>
              <LinearGradient
                colors={['#7c3aed', '#4f46e5']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.iconCircle}
              >
                <BookOpen size={30} color="#ffffff" strokeWidth={2.2} />
                <View style={styles.sparkleBadge}>
                  <Sparkles size={14} color="#fbbf24" />
                </View>
              </LinearGradient>
            </Animated.View>

            {/* Title */}
            <Text style={[styles.mainTitle, { color: isDark ? '#f8fafc' : '#0f172a' }]}>
              {title}
            </Text>

            {/* Scope / Topic badge if provided */}
            {topic ? (
              <View style={[styles.topicBadge, { backgroundColor: isDark ? '#1e1b4b' : '#ede9fe' }]}>
                <Flame size={12} color="#7c3aed" style={{ marginRight: 5 }} />
                <Text style={styles.topicBadgeText} numberOfLines={1}>
                  {topic}
                </Text>
              </View>
            ) : null}

            {/* Subtitle / Description */}
            <Text style={[styles.subText, { color: isDark ? '#cbd5e1' : '#475569' }]}>
              {subtitle || 'Curating verified biblical questions and scriptural reflections...'}
            </Text>

            {/* Professional Progress Spinner */}
            <View style={styles.spinnerRow}>
              <ActivityIndicator size="small" color="#7c3aed" />
              <Text style={[styles.spinnerText, { color: isDark ? '#a78bfa' : '#6d28d9' }]}>
                Curating questions from Holy Scripture...
              </Text>
            </View>

            {/* Scripture Quote Box */}
            <View style={[
              styles.quoteBox,
              {
                backgroundColor: isDark ? 'rgba(30, 41, 59, 0.65)' : '#f8fafc',
                borderColor: isDark ? 'rgba(51, 65, 85, 0.8)' : '#e2e8f0'
              }
            ]}>
              <Text style={[styles.quoteText, { color: isDark ? '#e2e8f0' : '#334155' }]}>
                "{currentVerse.text}"
              </Text>
              <Text style={[styles.quoteRef, { color: isDark ? '#fbbf24' : '#b45309' }]}>
                — {currentVerse.ref}
              </Text>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const { width } = Dimensions.get('window');

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.68)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24
  },
  cardContainer: {
    width: Math.min(width - 48, 380),
    borderRadius: 24,
    borderWidth: 1.5,
    overflow: 'hidden',
    shadowColor: '#7c3aed',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.35,
    shadowRadius: 18,
    elevation: 10
  },
  topGradientBar: {
    height: 4,
    width: '100%'
  },
  cardContent: {
    padding: 24,
    alignItems: 'center'
  },
  iconHalo: {
    marginBottom: 16
  },
  iconCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#7c3aed',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6
  },
  sparkleBadge: {
    position: 'absolute',
    top: 2,
    right: 2,
    backgroundColor: '#1e1b4b',
    borderRadius: 10,
    padding: 3,
    borderWidth: 1.5,
    borderColor: '#fbbf24'
  },
  mainTitle: {
    fontSize: 18,
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: 0.2,
    marginBottom: 8
  },
  topicBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 10
  },
  topicBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#7c3aed'
  },
  subText: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 16
  },
  spinnerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 18
  },
  spinnerText: {
    fontSize: 12.5,
    fontWeight: '700'
  },
  quoteBox: {
    width: '100%',
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center'
  },
  quoteText: {
    fontSize: 12,
    fontStyle: 'italic',
    textAlign: 'center',
    lineHeight: 17,
    marginBottom: 4
  },
  quoteRef: {
    fontSize: 11,
    fontWeight: '800'
  }
});
