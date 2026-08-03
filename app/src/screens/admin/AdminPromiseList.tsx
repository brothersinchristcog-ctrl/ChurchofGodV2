import React, { useState, useEffect, useContext, useRef, useMemo } from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  TouchableOpacity, 
  ActivityIndicator, 
  Platform, 
  StatusBar,
  ScrollView,
  Dimensions,
  Animated,
  Easing
} from 'react-native';
import { BookOpen, Languages, Play, AlertCircle, Plus, Menu, Calendar, Clock, History } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { AdminTabContext } from '../../context/AdminTabContext';
import { useTheme } from '../../context/ThemeContext';

import SalesforceService, { DailyPromise } from '../../services/SalesforceService';

const { width } = Dimensions.get('window');

const PulsingDot = ({ delay }: { delay: number }) => {
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => getStyles(colors, isDark), [colors, isDark]);
  const pulse1 = useRef(new Animated.Value(0)).current;
  const pulse2 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const startPulse = (anim: Animated.Value, stagger: number) => {
      setTimeout(() => {
        Animated.loop(
          Animated.timing(anim, {
            toValue: 1,
            duration: 2500,
            useNativeDriver: true,
          })
        ).start();
      }, stagger);
    };

    const timeout = setTimeout(() => {
      startPulse(pulse1, 0);
      startPulse(pulse2, 1250);
    }, delay);

    return () => clearTimeout(timeout);
  }, [pulse1, pulse2, delay]);

  const getStyle = (anim: Animated.Value) => {
    return {
      transform: [{
        scale: anim.interpolate({
          inputRange: [0, 1],
          outputRange: [1, 4]
        })
      }],
      opacity: anim.interpolate({
        inputRange: [0, 0.1, 1],
        outputRange: [0, 0.6, 0]
      })
    };
  };

  return (
    <View style={{ alignItems: 'center', justifyContent: 'center' }}>
      <Animated.View style={[styles.pulseRing, getStyle(pulse1)]} />
      <Animated.View style={[styles.pulseRing, getStyle(pulse2)]} />
      <View style={styles.hangingDot} />
    </View>
  );
};

interface SwingingCardProps {
  value: number | string;
  label: string;
  icon: string;
  valueColor: string;
  initialDelay: number;
}

const SwingingCard = ({ value, label, icon, valueColor, initialDelay }: SwingingCardProps) => {
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => getStyles(colors, isDark), [colors, isDark]);
  const rotateAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const timeout = setTimeout(() => {
      Animated.loop(
        Animated.sequence([
          Animated.timing(rotateAnim, {
            toValue: 1,
            duration: 800,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(rotateAnim, {
            toValue: -1,
            duration: 1600,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(rotateAnim, {
            toValue: 0,
            duration: 800,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
        ])
      ).start();
    }, initialDelay);
    return () => clearTimeout(timeout);
  }, [rotateAnim, initialDelay]);

  const rotate = rotateAnim.interpolate({
    inputRange: [-1, 1],
    outputRange: ['-3deg', '3deg']
  });

  // To fix anchor point being center by default, we apply a translateY, rotate, and reverse translateY
  // But a simple rotate is often enough for a subtle swing
  return (
    <View style={styles.hangingColumn}>
      <PulsingDot delay={initialDelay} />
      <Animated.View style={{ alignItems: 'center', width: '100%', transformOrigin: 'top', transform: [{ rotate }] }}>
        <View style={styles.hangingLine} />
        <View style={styles.statCard}>
          <Text style={[styles.statVal, { color: valueColor }]}>{value}</Text>
          <View style={styles.statLblRow}>
            <Text style={{color: valueColor, fontSize: 11}}>{icon}</Text>
            <Text style={styles.statLbl}>{label}</Text>
          </View>
        </View>
      </Animated.View>
    </View>
  );
};

export default function AdminPromiseList() {
  const { activeTab, setActiveTab, setEditingData, openDrawer } = useContext(AdminTabContext);
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => getStyles(colors, isDark), [colors, isDark]);

  const [promises, setPromises] = useState<DailyPromise[]>([]);
  const [loading, setLoading] = useState(true);
  const [missingDates, setMissingDates] = useState<number[]>([]);
  
  // Use local date (YYYY-MM-DD) instead of UTC to avoid timezone mismatches
  const todayStr = new Date().toLocaleDateString('en-CA'); 
  const currentMonthShort = new Date().toLocaleString('default', { month: 'short' });

  const handleEdit = (item: DailyPromise) => {
    setEditingData(item);
    setActiveTab(2); // Go to Editor tab (tab 2 = New Promise / AdminPromiseEditor)
  };

  const handleView = (item: DailyPromise) => {
    setEditingData(item);
    setActiveTab(5); // Go to App Preview tab
  };

  useEffect(() => {
    loadPromises();
  }, []);

  const loadPromises = async () => {
    setLoading(true);
    try {
      const data = await SalesforceService.getAdminPromises();
      setPromises(data);
      
      const now = new Date();
      const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
      const existingDates = new Set(data.map(p => p.date));
      const missing: number[] = [];
      for (let d = 1; d <= daysInMonth; d++) {
        const dStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        if (!existingDates.has(dStr)) missing.push(d);
      }
      setMissingDates(missing);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const todayPromise = promises.find(p => p.date === todayStr);
  const upcoming = promises.filter(p => p.date && p.date > todayStr).sort((a,b) => (a.date || '').localeCompare(b.date || ''));
  const past = promises.filter(p => p.date && p.date < todayStr).sort((a,b) => (b.date || '').localeCompare(a.date || ''));

  if (loading && promises.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FCD34D" />
      </View>
    );
  }

  const stripHtml = (html: string) => {
    if (!html) return '';
    return html
      .replace(/<[^>]*>?/gm, '')
      .replace(/&#39;/g, "'")
      .replace(/&quot;/g, '"')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>');
  };

  const renderCard = (item: DailyPromise, type: 'today' | 'upcoming' | 'past') => {
    const isMissingTe = !item.verseTelugu;
    const isMissingLink = !item.youtubeId;

    const innerContent = (
      <>
        <View style={styles.pCardHd}>
          <View style={{ flex: 1 }}>
            <Text style={styles.pDate}>{type === 'today' ? 'Today — ' : ''}{item.date}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 }}>
              <Text style={[styles.pDate, { fontSize: 11, color: colors.textSecondary, backgroundColor: isDark ? '#334155' : '#f3f4f6', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }]}>
                {item.verseReferenceEn || item.verseReference || 'ID Missing'}
                {item.verseReferenceTe ? ` | ${item.verseReferenceTe}` : ''}
              </Text>
            </View>
          </View>
          <View style={[
            styles.statusBadge, 
            type === 'today' ? styles.statusLive : (item.status === 'Draft' ? styles.statusDraft : (type === 'past' ? styles.statusPub : styles.statusSch))
          ]}>
            <Text style={styles.statusBadgeTxt}>
              {type === 'today' ? 'Live now' : (item.status || 'Published').toUpperCase()}
            </Text>
          </View>
        </View>

        <Text style={styles.pVerseEn} numberOfLines={2}>"{stripHtml(item.verse)}"</Text>
        {item.verseTelugu ? (
          <Text style={styles.pVerseTe} numberOfLines={2}>"{stripHtml(item.verseTelugu)}"</Text>
        ) : null}
        
        {item.videoTitle ? (
          <Text style={styles.pVideoTitle} numberOfLines={1}>🎬 {stripHtml(item.videoTitle)}</Text>
        ) : null}

        <View style={styles.pCardFoot}>
          <View style={styles.assetIcons}>
            <View style={styles.assetBox}><Text style={styles.assetTxt}>📖 English ✓</Text></View>
            <View style={styles.assetBox}>
              <Text style={[styles.assetTxt, isMissingTe && { color: '#c0392b' }]}>
                🇮🇳 {isMissingTe ? 'te Missing' : 'Telugu ✓'}
              </Text>
            </View>
            <View style={styles.assetBox}>
              <Text style={[styles.assetTxt, isMissingLink && { color: '#c0392b' }]}>
                ▶️ {isMissingLink ? 'No link' : 'YouTube ✓'}
              </Text>
            </View>
          </View>
          <TouchableOpacity onPress={() => type === 'past' ? handleView(item) : handleEdit(item)}>
            <Text style={styles.actionLink}>{type === 'past' ? 'View —' : 'Edit —'}</Text>
          </TouchableOpacity>
        </View>
      </>
    );

    if (type === 'past') {
      return (
        <LinearGradient 
          key={item.id}
          colors={['#1a2d5a', '#3b82f6']} 
          style={{ marginBottom: 12, borderRadius: 16, paddingLeft: 6 }}
        >
          <View style={{ 
            backgroundColor: colors.card, 
            borderTopRightRadius: 16,
            borderBottomRightRadius: 16,
            borderTopLeftRadius: 10,
            borderBottomLeftRadius: 10,
            borderWidth: 1, 
            borderColor: colors.border, 
            borderLeftWidth: 0,
            padding: 15 
          }}>
            {innerContent}
          </View>
        </LinearGradient>
      );
    }

    return (
      <View key={item.id} style={[styles.pCard, type === 'today' && styles.todayCard]}>
        {innerContent}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        
        {/* Header Section */}
        <LinearGradient
          colors={['#1a2d5a', '#3b82f6']}
          style={[styles.headerOuter]}
        >
          <LinearGradient
            colors={['#1a2d5a', '#23314d']}
            style={styles.headerInner}
          >
            <View style={styles.topNavRow}>
              <TouchableOpacity onPress={openDrawer} style={styles.hamburgerBtn}>
                <Menu color="#fff" size={26} />
              </TouchableOpacity>

              <View style={[StyleSheet.absoluteFillObject, { alignItems: 'center', justifyContent: 'center', paddingRight: 25 }]} pointerEvents="none">
                <Text style={styles.titleCentered} numberOfLines={1} adjustsFontSizeToFit>Daily Promises</Text>
              </View>

              <TouchableOpacity style={styles.newBtnTop} onPress={() => { setEditingData(null); setActiveTab(2); }}>
                <Plus size={12} color="#1a2d5a" />
                <Text style={styles.newBtnTxt} numberOfLines={1}>New</Text>
              </TouchableOpacity>
            </View>
          </LinearGradient>
        </LinearGradient>

        {/* Stats Row */}
        <View style={styles.statsRow}>
          <SwingingCard 
            value={promises.filter(p => p.status === 'Published').length}
            label="Published"
            icon="✓"
            valueColor="#15803D"
            initialDelay={0}
          />
          <SwingingCard 
            value={promises.filter(p => p.status === 'Draft').length}
            label="Drafts"
            icon="✎"
            valueColor="#D97706"
            initialDelay={500}
          />
          <SwingingCard 
            value={missingDates.length}
            label="Missing"
            icon="!"
            valueColor="#dc2626"
            initialDelay={1000}
          />
        </View>

        {/* Global Alert */}
        <View style={styles.globalAlert}>
          <View style={styles.alertIconWrap}>
            <AlertCircle size={18} color="#fff" />
          </View>
          <Text style={styles.globalAlertTxt}>
            <Text style={{ fontWeight: '700', color: '#452b04' }}>{missingDates.length} dates missing.</Text> Red beads and cards below have no promise yet — tap any one to add it quickly.
          </Text>
        </View>

        {/* Sections */}
        <View style={styles.secHdWrap}>
          <Calendar size={16} color={colors.text} />
          <Text style={styles.secHd}>Today</Text>
        </View>
        {todayPromise ? renderCard(todayPromise, 'today') : (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTxt}>No promise scheduled for today ({todayStr})</Text>
            <TouchableOpacity onPress={() => { setEditingData({ date: todayStr }); setActiveTab(2); }}>
              <LinearGradient colors={['#1a2d5a', '#3b82f6']} style={styles.emptyAdd}>
                <Text style={styles.emptyAddTxt}>+ Schedule Today</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.secHdWrap}>
          <Clock size={16} color={colors.text} />
          <Text style={styles.secHd}>Upcoming</Text>
        </View>
        {upcoming.length > 0 ? (
          upcoming.slice(0, 10).map(item => renderCard(item, 'upcoming'))
        ) : (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTxt}>No upcoming promises scheduled.</Text>
          </View>
        )}

        <View style={styles.missingSec}>
          <View style={styles.missingHd}>
            <Text style={styles.missingTitle}>Missing dates ({missingDates.length})</Text>
            <TouchableOpacity onPress={() => setActiveTab(2)}>
              <LinearGradient colors={['#1a2d5a', '#3b82f6']} style={styles.fillAllBtn}>
                <Text style={styles.fillAllBtnTxt}>Fill all</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
          <View style={styles.mGrid}>
            {missingDates.slice(0, 8).map(d => (
              <TouchableOpacity key={d} style={styles.mCell} onPress={() => { 
                const now = new Date();
                const dStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
                setEditingData({ date: dStr }); 
                setActiveTab(2); 
              }}>
                <Text style={styles.mDate}>{currentMonthShort} {d}</Text>
                <Text style={styles.mAdd}>+ Add</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.secHdWrap}>
          <History size={16} color={colors.text} />
          <Text style={styles.secHd}>Recent past</Text>
        </View>
        {past.slice(0, 2).map(item => renderCard(item, 'past'))}

        <Text style={styles.footerBranding}>Church of GOD Admin · Daily Promise Manager</Text>
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* FAB */}
      <TouchableOpacity style={styles.fab} onPress={() => { setEditingData(null); setActiveTab(2); }}>
        <Plus size={28} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}

const getStyles = (colors: any, isDark: boolean) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background },
  scroll: { padding: 16 },

  headerOuter: {
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    marginBottom: -25,
    marginHorizontal: -16,
    marginTop: -16,
    paddingBottom: 4, 
  },
  headerInner: {
    paddingTop: 10,
    paddingHorizontal: 20,
    paddingBottom: 31,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  topNavRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  hamburgerBtn: {
    padding: 4,
    marginLeft: -4,
  },
  titleCentered: { 
    fontSize: 22, 
    fontWeight: '700', 
    color: '#fff',
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
  },
  subtitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 5,
  },
  subtitle: { 
    fontSize: 13, 
    color: '#aac4e8' 
  },
  newBtnTop: { 
    backgroundColor: '#eab308',
    paddingHorizontal: 10, 
    paddingVertical: 4, 
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  newBtnTxt: { 
    color: '#1a2d5a', 
    fontSize: 11, 
    fontWeight: '700' 
  },

  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 15 },
  hangingColumn: { flex: 1, alignItems: 'center', marginTop: 10 },
  pulseRing: { position: 'absolute', width: 8, height: 8, borderRadius: 4, borderWidth: 1, borderColor: '#eab308' },
  hangingDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#eab308', elevation: 2, shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 2, zIndex: 10 },
  hangingLine: { width: 2, height: 22, backgroundColor: '#eab308', zIndex: 1, opacity: 0.7 },
  statCard: { backgroundColor: colors.card, borderRadius: 12, paddingVertical: 10, paddingHorizontal: 15, alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, elevation: 3, borderWidth: 1, borderColor: colors.border },
  statLblRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  statVal: { fontSize: 20, fontWeight: '700', fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif', color: colors.text },
  statLbl: { fontSize: 11, color: colors.textSecondary, fontWeight: '600' },

  globalAlert: { backgroundColor: '#FCEEB5', borderRadius: 12, padding: 12, marginBottom: 15, flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 0 },
  globalAlertTxt: { flex: 1, fontSize: 13, color: '#593f0b', marginLeft: 6, lineHeight: 18 },
  alertIconWrap: { backgroundColor: '#c79232', borderRadius: 20, width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
 
  secHdWrap: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12, marginTop: 15 },
  secHdRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, marginTop: 15 },
  secHd: { fontSize: 13, fontWeight: '700', color: colors.text },
  fillBtn: { backgroundColor: '#c0392b', paddingHorizontal: 15, paddingVertical: 6, borderRadius: 8 },
  fillBtnTxt: { color: '#fff', fontSize: 11, fontWeight: '700' },

  pCard: { backgroundColor: colors.card, borderRadius: 16, padding: 15, marginBottom: 12, borderWidth: 1, borderColor: colors.border },
  todayCard: { borderWidth: 2.5, borderColor: isDark ? '#3b82f6' : '#1a2d5a', backgroundColor: isDark ? '#1e293b' : '#fcfdff' },
  pCardHd: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 },
  pDate: { fontSize: 14, fontWeight: '800', color: isDark ? '#60a5fa' : '#1a2d5a' },
  pRef: { fontSize: 12, fontWeight: '700', color: colors.text, marginTop: 2 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
  statusBadgeTxt: { fontSize: 9, fontWeight: '800', color: '#fff' },
  statusSch: { backgroundColor: '#2563eb' },
  statusDraft: { backgroundColor: '#D97706' },
  statusLive: { backgroundColor: '#c0392b' },
  statusPub: { backgroundColor: '#15803D' },

  pVerseEn: { fontSize: 13, color: colors.text, marginBottom: 5 },
  pVerseTe: { fontSize: 13, color: isDark ? '#bfdbfe' : '#1a2d5a', fontStyle: 'italic', marginBottom: 5, fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif' },
  pVideoTitle: { fontSize: 12, color: colors.textSecondary, fontStyle: 'italic', marginBottom: 10 },

  warnRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 12 },
  warnTxt: { fontSize: 10, color: '#D97706', fontWeight: '600' },

  pCardFoot: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 0.5, borderTopColor: colors.border, paddingTop: 10 },
  assetIcons: { flexDirection: 'row', gap: 12 },
  assetBox: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  assetTxt: { fontSize: 10, fontWeight: '700', color: isDark ? '#93c5fd' : '#1a2d5a' },
  actionLink: { fontSize: 11, fontWeight: '700', color: isDark ? '#60a5fa' : '#1a2d5a' },

  missingSec: { marginTop: 10, marginBottom: 20 },
  missingHd: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  missingTitle: { fontSize: 12, fontWeight: '700', color: '#c0392b' },
  fillAllBtn: { paddingHorizontal: 15, paddingVertical: 7, borderRadius: 8 },
  fillAllBtnTxt: { color: '#fff', fontSize: 11, fontWeight: '700' },
  mGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  mCell: { width: (width - 32 - 24) / 4, backgroundColor: isDark ? '#334155' : '#f3f4f6', borderWidth: 0.5, borderColor: isDark ? colors.border : '#f87171', borderRadius: 8, paddingVertical: 12, alignItems: 'center' },
  mDate: { fontSize: 10, fontWeight: '800', color: colors.text },
  mAdd: { fontSize: 8, color: colors.textSecondary, marginTop: 3 },

  footerBranding: { fontSize: 10, color: colors.textSecondary, textAlign: 'center', marginTop: 10 },

  emptyCard: { backgroundColor: colors.card, borderRadius: 12, padding: 20, alignItems: 'center', marginBottom: 12, borderWidth: 1, borderColor: colors.border },
  emptyTxt: { fontSize: 12, color: colors.textSecondary, marginBottom: 10 },
  emptyAdd: { paddingHorizontal: 15, paddingVertical: 8, borderRadius: 20 },
  emptyAddTxt: { color: '#fff', fontSize: 11, fontWeight: '600' },

  fab: { position: 'absolute', right: 20, bottom: 30, width: 60, height: 60, borderRadius: 30, backgroundColor: '#c0392b', justifyContent: 'center', alignItems: 'center', elevation: 10, shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 10 }
});
