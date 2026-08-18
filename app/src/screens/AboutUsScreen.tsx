import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  Image,
  Dimensions,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { 
  ChevronLeft, Heart, Eye, Target, BookOpen, Calendar, 
  Sparkles, Gift, Bell, Hand, Users, Video, MessageSquare, Quote
} from 'lucide-react-native';
import firestore from '@react-native-firebase/firestore';
import { useTheme } from '../context/ThemeContext';

const { width } = Dimensions.get('window');

// Sacred Space Design System Tokens (Stitch)
const theme = {
  colors: {
    background: '#fbf9f8',
    surface: '#ffffff',
    surfaceContainerLow: '#f5f3f3',
    surfaceContainerLowest: '#ffffff',
    surfaceContainerHighest: '#e4e2e2',
    primary: '#11335b',
    primaryFixed: '#d5e3ff',
    primaryFixedDim: '#abc8f8',
    onPrimaryFixed: '#001c3b',
    secondary: '#735c00',
    secondaryContainer: '#fed65b',
    secondaryFixed: '#ffe088',
    onSecondaryFixed: '#241a00',
    tertiaryFixedDim: '#c8c6c2',
    tertiary: '#333330',
    border: '#eae8e7',
    textPrimary: '#1b1c1c',
    textSecondary: '#43474e',
  },
  radius: {
    md: 8,
    lg: 12,
    xl: 16,
    xxl: 24,
    full: 9999,
  },
};

interface AboutUsData {
  description: string;
  mission: string;
  vision: string;
}

const DEFAULT: AboutUsData = {
  description:
    'Welcome to Church of GOD. We are a Spirit-filled, family-oriented congregation dedicated to sharing the love of Jesus Christ with our community and the world.',
  mission:
    'A Sanctuary for Spiritual Growth',
  vision:
    'Building a house of prayer for all nations, where every soul finds a home and every heart finds peace.',
};

export default function AboutUsScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { isDark } = useTheme();
  const [data, setData] = useState<AboutUsData>(DEFAULT);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = firestore()
      .collection('settings')
      .doc('about')
      .onSnapshot(
        (doc) => {
          if (doc.exists()) {
            const d = doc.data() as AboutUsData;
            setData({
              description: d.description || DEFAULT.description,
              mission: d.mission || DEFAULT.mission,
              vision: d.vision || DEFAULT.vision,
            });
          }
          setLoading(false);
        },
        (err) => {
          console.warn('AboutUs listener error:', err);
          setLoading(false);
        }
      );
    return () => unsub();
  }, []);

  return (
    <View style={[styles.container, { backgroundColor: isDark ? '#0f172a' : theme.colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top || 20, backgroundColor: isDark ? '#1e293b' : '#ffffff' }]}>
        <View style={styles.headerInner}>
          <TouchableOpacity style={[styles.backBtn, { backgroundColor: isDark ? '#334155' : 'rgba(17,51,91,0.05)' }]} onPress={() => navigation.goBack()}>
            <ChevronLeft size={22} color={isDark ? '#fff' : theme.colors.primary} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: isDark ? '#fff' : theme.colors.primary }]}>About Us</Text>
          <View style={{ width: 40 }} />
        </View>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={isDark ? '#FCD34D' : theme.colors.primary} />
        </View>
      ) : (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[styles.scrollContent, { paddingTop: 20 }]}
          showsVerticalScrollIndicator={false}
        >
          {/* Hero Branding Section */}
          <View style={styles.heroSection}>
            <Image
              source={require('../../assets/logo.png')}
              style={[styles.logo, { borderColor: isDark ? '#FCD34D' : 'rgba(195, 198, 207, 0.3)', borderWidth: isDark ? 2 : 0 }]}
              resizeMode="cover"
            />
            <Text style={[styles.heroTitle, { color: isDark ? '#fff' : theme.colors.primary }]}>Church of GOD</Text>
            <Text style={[styles.heroSubtitle, { color: isDark ? '#cbd5e1' : theme.colors.primary, fontSize: 18, marginTop: 8, fontStyle: 'normal' }]}>
              క్రీస్తు నందు సహోదరుల సహవాసము
            </Text>
          </View>

          {/* Our Calling Section */}
          <View style={[styles.callingSection, { backgroundColor: isDark ? '#1e293b' : theme.colors.surfaceContainerLowest, borderColor: isDark ? '#334155' : 'rgba(228,226,226,0.5)' }]}>
            <View style={styles.sectionHeaderWrap}>
              <Heart size={24} color={isDark ? '#FCD34D' : theme.colors.secondary} />
              <Text style={[styles.sectionTitle, { color: isDark ? '#fff' : theme.colors.primary }]}>Our Calling</Text>
            </View>
            <Text style={[styles.bodyTextLg, { color: isDark ? '#cbd5e1' : theme.colors.textPrimary }]}>At Church of GOD, our calling is rooted in a simple yet profound mandate: to serve and love our community as a reflection of divine compassion. We believe that every individual is a story of grace waiting to be told, and we strive to be the supportive chapter where healing and purpose meet.</Text>
          </View>

          {/* Our Vision (Asymmetric Highlight) */}
          <View style={styles.visionSection}>
            <View style={[styles.visionImageWrap, { borderColor: isDark ? '#334155' : 'rgba(228,226,226,0.5)' }]}>
              <Image
                source={{ uri: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDCRrQhraZUrt8P0ycMeRmUKcXWr_MqDqAmtoYG3tNj-cKX7AOm3gmFuMKAnsCN5T_8JIXBvTxbYkNIx9T-mWm891XoMFENUSJDrULVnP6UztbzMidM4pZQIZnVGW2mnMjixbvq3jSPRekUfP3-PKbRmxxQuyDCNukU8sykDm0e2NJVYuEGMo7riqcWOOsUP7SdrJt05MykucTl9oxSvQc_1MXkQN0T0_T83sNwe1aASucUgKsrvM0u' }}
                style={styles.visionImage}
                resizeMode="cover"
              />
              <View style={[styles.visionGradient, { backgroundColor: isDark ? 'rgba(0,0,0,0.3)' : 'rgba(17,51,91,0.15)' }]} />
            </View>
            <View style={styles.visionContent}>
              <Text style={[styles.sectionTitle, { marginBottom: 16, color: isDark ? '#fff' : theme.colors.primary }]}>Our Vision</Text>
              <View style={[styles.visionQuoteBox, { borderLeftColor: isDark ? '#FCD34D' : theme.colors.secondaryContainer }]}>
                <Text style={[styles.visionQuoteText, { color: isDark ? '#fff' : '#000' }]}>"Building a house of prayer for all nations, where every soul finds a home and every heart finds peace."</Text>
              </View>
              <Text style={[styles.bodyTextMd, { color: isDark ? '#94a3b8' : theme.colors.textSecondary }]}>
                We look forward to a future where the walls of the church extend into the streets, bringing hope to the hopeless and a tangible sense of belonging to all who seek it.
              </Text>
            </View>
          </View>

          {/* Our Core Values (Pill Chips) */}
          <View style={styles.valuesSection}>
            <Text style={[styles.sectionTitle, { marginBottom: 24, textAlign: 'center', color: isDark ? '#fff' : theme.colors.primary }]}>Our Core Values</Text>
            <View style={styles.valuesGrid}>
              <View style={[styles.valueChip, { backgroundColor: isDark ? '#334155' : theme.colors.primaryFixed }]}>
                <Heart size={20} color={isDark ? '#FCD34D' : theme.colors.onPrimaryFixed} />
                <Text style={[styles.valueLabel, { color: isDark ? '#fff' : theme.colors.onPrimaryFixed }]}>Compassion</Text>
              </View>
              <View style={[styles.valueChip, { backgroundColor: isDark ? '#334155' : theme.colors.secondaryFixed }]}>
                <Target size={20} color={isDark ? '#FCD34D' : theme.colors.onSecondaryFixed} />
                <Text style={[styles.valueLabel, { color: isDark ? '#fff' : theme.colors.onSecondaryFixed }]}>Integrity</Text>
              </View>
              <View style={[styles.valueChip, { backgroundColor: isDark ? '#334155' : theme.colors.surfaceContainerHighest }]}>
                <Sparkles size={20} color={isDark ? '#FCD34D' : theme.colors.textSecondary} />
                <Text style={[styles.valueLabel, { color: isDark ? '#fff' : theme.colors.textSecondary }]}>Faith</Text>
              </View>
              <View style={[styles.valueChip, { backgroundColor: isDark ? '#334155' : theme.colors.primaryFixedDim }]}>
                <Users size={20} color={isDark ? '#FCD34D' : theme.colors.primary} />
                <Text style={[styles.valueLabel, { color: isDark ? '#fff' : theme.colors.primary }]}>Fellowship</Text>
              </View>
            </View>
          </View>

          {/* App Features (Bento-style Cards) */}
          <View style={styles.featuresSection}>
            <Text style={[styles.sectionTitle, { marginBottom: 24, color: isDark ? '#fff' : theme.colors.primary }]}>Connected in Spirit</Text>
            <View style={styles.bentoGrid}>
              
              {/* Sermons */}
              <View style={[styles.bentoCard, { backgroundColor: isDark ? '#1e293b' : '#ffffff', borderColor: isDark ? '#334155' : 'rgba(17,51,91,0.08)' }]}>
                <View style={[styles.bentoIconBox, { backgroundColor: isDark ? 'rgba(252, 211, 77, 0.1)' : 'rgba(17,51,91,0.1)' }]}>
                  <BookOpen size={24} color={isDark ? '#FCD34D' : theme.colors.primary} />
                </View>
                <Text style={[styles.bentoTitle, { color: isDark ? '#fff' : theme.colors.primary }]}>Sermons On-Demand</Text>
                <Text style={[styles.bentoDesc, { color: isDark ? '#94a3b8' : theme.colors.textSecondary }]}>Revisit Sunday messages anytime. Journey through our archive of teachings wherever you are.</Text>
              </View>
              
              {/* Live Services */}
              <View style={[styles.bentoCard, { backgroundColor: isDark ? '#1e293b' : '#ffffff', borderColor: isDark ? '#334155' : 'rgba(17,51,91,0.08)' }]}>
                <View style={[styles.bentoIconBox, { backgroundColor: isDark ? 'rgba(252, 211, 77, 0.1)' : 'rgba(115,92,0,0.1)' }]}>
                  <Video size={24} color={isDark ? '#FCD34D' : theme.colors.secondary} />
                </View>
                <Text style={[styles.bentoTitle, { color: isDark ? '#fff' : theme.colors.primary }]}>Live Services</Text>
                <Text style={[styles.bentoDesc, { color: isDark ? '#94a3b8' : theme.colors.textSecondary }]}>Watch our Sunday gatherings live. Connect from anywhere in the world.</Text>
              </View>

              {/* Prayer (Specialized Card) */}
              <View style={[styles.bentoCard, styles.prayerCard, { backgroundColor: isDark ? '#1e293b' : '#ffffff', borderColor: isDark ? '#334155' : 'rgba(17,51,91,0.08)' }]}>
                <View style={[styles.bentoIconBox, { backgroundColor: isDark ? 'rgba(252, 211, 77, 0.1)' : 'rgba(255,224,136,0.3)' }]}>
                  <Hand size={24} color={isDark ? '#FCD34D' : theme.colors.onSecondaryFixed} />
                </View>
                <Text style={[styles.bentoTitle, { color: isDark ? '#fff' : theme.colors.primary }]}>Prayer Requests</Text>
                <Text style={[styles.bentoDesc, { fontStyle: 'italic', color: isDark ? '#94a3b8' : theme.colors.textSecondary }]}>"Submit and join in communal prayer. Your burdens are shared, and your joys are celebrated."</Text>
              </View>

              {/* Giving */}
              <View style={[styles.bentoCard, { backgroundColor: isDark ? '#1e293b' : '#ffffff', borderColor: isDark ? '#334155' : 'rgba(17,51,91,0.08)' }]}>
                <View style={[styles.bentoIconBox, { backgroundColor: isDark ? 'rgba(252, 211, 77, 0.1)' : 'rgba(17,51,91,0.1)' }]}>
                  <Gift size={24} color={isDark ? '#FCD34D' : theme.colors.primary} />
                </View>
                <Text style={[styles.bentoTitle, { color: isDark ? '#fff' : theme.colors.primary }]}>Giving & Support</Text>
                <Text style={[styles.bentoDesc, { color: isDark ? '#94a3b8' : theme.colors.textSecondary }]}>Seamlessly support church ministries. Secure and faithful stewardship for our shared mission.</Text>
              </View>

              {/* Devotionals */}
              <View style={[styles.bentoCard, { backgroundColor: isDark ? '#1e293b' : '#ffffff', borderColor: isDark ? '#334155' : 'rgba(17,51,91,0.08)' }]}>
                <View style={[styles.bentoIconBox, { backgroundColor: isDark ? 'rgba(252, 211, 77, 0.1)' : 'rgba(200,198,194,0.4)' }]}>
                  <Sparkles size={24} color={isDark ? '#FCD34D' : theme.colors.tertiary} />
                </View>
                <Text style={[styles.bentoTitle, { color: isDark ? '#fff' : theme.colors.primary }]}>Daily Promises</Text>
                <Text style={[styles.bentoDesc, { color: isDark ? '#94a3b8' : theme.colors.textSecondary }]}>Start your day with scripture and reflection. Morning bread for your spiritual journey.</Text>
              </View>

              {/* Events */}
              <View style={[styles.bentoCard, { backgroundColor: isDark ? '#1e293b' : '#ffffff', borderColor: isDark ? '#334155' : 'rgba(17,51,91,0.08)' }]}>
                <View style={[styles.bentoIconBox, { backgroundColor: isDark ? 'rgba(252, 211, 77, 0.1)' : 'rgba(17,51,91,0.1)' }]}>
                  <Calendar size={24} color={isDark ? '#FCD34D' : theme.colors.primary} />
                </View>
                <Text style={[styles.bentoTitle, { color: isDark ? '#fff' : theme.colors.primary }]}>Events & RSVP</Text>
                <Text style={[styles.bentoDesc, { color: isDark ? '#94a3b8' : theme.colors.textSecondary }]}>Stay updated and register for gatherings. Never miss a moment with your church family.</Text>
              </View>

            </View>
          </View>

          {/* Scripture Block */}
          <View style={[styles.scriptureBlock, { backgroundColor: isDark ? '#1e293b' : theme.colors.primary }]}>
            <View style={styles.quoteIconWrap}>
              <Quote size={80} color={isDark ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.1)'} />
            </View>
            <Text style={styles.scriptureText}>
              "And the peace of God, which transcends all understanding, will guard your hearts and your minds in Christ Jesus."
            </Text>
            <Text style={[styles.scriptureRef, { color: isDark ? '#FCD34D' : 'rgba(255,255,255,0.8)' }]}>PHILIPPIANS 4:7</Text>
          </View>

          <View style={{ height: 40 }} />
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: theme.colors.background,
  },
  header: {
    backgroundColor: '#ffffff',
  },
  headerInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(17,51,91,0.05)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: { color: theme.colors.primary, fontSize: 18, fontFamily: 'PlusJakartaSans_600SemiBold' },

  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 40 },

  // Hero Branding Section
  heroSection: {
    alignItems: 'center',
    paddingVertical: 20,
    marginBottom: 40,
  },
  logo: {
    width: 96,
    height: 96,
    borderRadius: 48,
    marginBottom: 24,
  },
  heroTitle: {
    fontSize: 42,
    fontFamily: 'EBGaramond_500Medium',
    color: theme.colors.primary,
    marginBottom: 4,
    letterSpacing: -0.5,
  },
  heroSubtitle: {
    fontSize: 18,
    color: theme.colors.textSecondary,
    fontStyle: 'italic',
    fontFamily: 'PlusJakartaSans_400Regular',
  },

  // Our Calling Section
  callingSection: {
    backgroundColor: theme.colors.surfaceContainerLowest,
    borderRadius: theme.radius.xl,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(228,226,226,0.5)', // border-outline-variant/10
    marginBottom: 60,
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 15 },
    shadowOpacity: 0.04,
    shadowRadius: 20,
    elevation: 2,
  },
  sectionHeaderWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 28,
    fontFamily: 'EBGaramond_500Medium',
    color: theme.colors.primary,
  },
  bodyTextLg: {
    fontSize: 18,
    lineHeight: 28,
    color: theme.colors.textPrimary,
    fontFamily: 'PlusJakartaSans_400Regular',
  },
  bodyTextMd: {
    fontSize: 16,
    lineHeight: 24,
    color: theme.colors.textSecondary,
    marginTop: 20,
    fontFamily: 'PlusJakartaSans_400Regular',
  },

  // Vision Section
  visionSection: {
    marginBottom: 60,
  },
  visionImageWrap: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: theme.radius.xxl,
    overflow: 'hidden',
    backgroundColor: theme.colors.surfaceContainerLowest,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(228,226,226,0.5)',
  },
  visionImage: {
    width: '100%',
    height: '100%',
  },
  visionGradient: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(17,51,91,0.15)', // subtle gradient overlay
  },
  visionContent: {
    marginTop: 16,
  },
  visionQuoteBox: {
    borderLeftWidth: 4,
    borderLeftColor: theme.colors.secondaryContainer,
    paddingLeft: 20,
    paddingVertical: 4,
  },
  visionQuoteText: {
    fontSize: 28,
    color: '#000',
    fontFamily: 'Caveat_700Bold',
    lineHeight: 34,
  },

  // Values Section
  valuesSection: {
    marginBottom: 60,
    alignItems: 'center',
  },
  valuesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 16,
  },
  valueChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: theme.radius.full,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  valueLabel: {
    fontSize: 14,
    fontFamily: 'PlusJakartaSans_500Medium',
    letterSpacing: 0.5,
  },

  // App Features (Bento)
  featuresSection: {
    marginBottom: 60,
  },
  bentoGrid: {
    flexDirection: 'column', // In Stitch mobile view, grid is single column typically, or 2 col on tablet. Let's do 1 column for true bento on mobile, or 2 if width allows.
    gap: 20,
  },
  bentoCard: {
    backgroundColor: '#ffffff',
    borderRadius: theme.radius.xl,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(17,51,91,0.08)',
    shadowColor: '#11335b',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.06,
    shadowRadius: 20,
    elevation: 4,
  },
  prayerBorder: {
    borderLeftWidth: 4,
    borderLeftColor: theme.colors.secondaryContainer,
  },
  prayerCard: {
    borderWidth: 1,
    borderColor: 'rgba(17,51,91,0.08)',
    backgroundColor: '#ffffff',
    borderRadius: theme.radius.xl,
    padding: 24,
    shadowColor: '#11335b',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.06,
    shadowRadius: 20,
    elevation: 4,
  },
  bentoIconBox: {
    width: 48,
    height: 48,
    borderRadius: theme.radius.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  bentoTitle: {
    fontSize: 20,
    fontFamily: 'PlusJakartaSans_600SemiBold',
    color: theme.colors.primary,
    marginBottom: 8,
  },
  bentoDesc: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    lineHeight: 22,
    fontFamily: 'PlusJakartaSans_400Regular',
  },

  // Scripture Block
  scriptureBlock: {
    backgroundColor: theme.colors.primary,
    borderRadius: 16,
    paddingVertical: 48,
    paddingHorizontal: 24,
    alignItems: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  quoteIconWrap: {
    position: 'absolute',
    top: 20,
    right: 20,
  },
  scriptureText: {
    fontSize: 18,
    fontStyle: 'italic',
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 28,
    fontFamily: 'EBGaramond_500Medium',
  },
  scriptureRef: {
    fontSize: 14,
    letterSpacing: 2,
    color: 'rgba(255,255,255,0.8)',
    fontFamily: 'PlusJakartaSans_600SemiBold',
  },
});
