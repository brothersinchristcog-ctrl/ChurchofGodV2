import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  StatusBar,
  ActivityIndicator,
  Dimensions,
  Alert,
  RefreshControl,
  Platform,
  Animated,
  AppState
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { 
  ChevronLeft, 
  Info, 
  Crown, 
  ChevronRight, 
  BarChart2, 
  Sparkles,
  Trophy,
  User,
  History
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../../context/ThemeContext';
import { useAuth } from '../../../context/AuthContext';
import auth from '@react-native-firebase/auth';
import BibleQuizService from '../../../services/BibleQuizService';
import { LeaderboardEntry } from '../../../types/quiz';

const { width } = Dimensions.get('window');

type ScopeTab = 'global' | 'church' | 'daily' | 'weekly' | 'monthly';

const getAvatarLetter = (name?: string | null): string => {
  if (!name) return 'M';
  const clean = name.trim();
  return clean.length > 0 ? clean.charAt(0).toUpperCase() : 'M';
};

export default function QuizLeaderboardScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { isDark } = useTheme();
  const { user, member } = useAuth();

  const [activeTab, setActiveTab] = useState<ScopeTab>('global');
  const currentUserId = user?.uid || auth().currentUser?.uid || (member as any)?.id;
  const currentUserName = 
    member?.name?.trim() || 
    (member?.firstName ? `${member.firstName} ${member.lastName || ''}`.trim() : null) || 
    user?.displayName?.trim() || 
    (user?.email ? user.email.split('@')[0] : null) || 
    'Church Member';
  const currentUserChurch = (member as any)?.churchName || '';
  const currentUserPhoto = user?.photoURL || (member as any)?.photoUrl || (member as any)?.profileImage || undefined;

  const getDisplayName = (entry?: LeaderboardEntry | null): string => {
    if (!entry) return 'Church Member';
    const raw = entry.name?.trim();
    if (raw && raw.length > 0 && raw !== 'You') return raw;
    if (entry.isCurrentUser) return currentUserName || 'Church Member';
    return 'Church Member';
  };

  // 1. Immediately read in-memory cache so screen renders in 0ms with zero loading delay!
  const initialData = BibleQuizService.getCachedLeaderboard(
    activeTab,
    currentUserId,
    currentUserName,
    currentUserChurch,
    currentUserPhoto
  );

  const [entries, setEntries] = useState<LeaderboardEntry[]>(initialData?.entries || []);
  const [currentUserEntry, setCurrentUserEntry] = useState<LeaderboardEntry | null>(initialData?.currentUserEntry || null);
  const [loading, setLoading] = useState(!initialData);
  const [refreshing, setRefreshing] = useState(false);

  // Shimmer pulse animation for skeleton cards
  const pulseAnim = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 0.85,
          duration: 900,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0.4,
          duration: 900,
          useNativeDriver: true,
        }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, [pulseAnim]);

  useEffect(() => {
    // Live subscription to Firestore `quiz_attempts` — the single source of truth.
    // Every device computes rankings from the exact same documents, and deletions apply instantly.
    const immediate = BibleQuizService.getCachedLeaderboard(
      activeTab,
      currentUserId,
      currentUserName,
      currentUserChurch,
      currentUserPhoto
    );
    if (immediate) {
      setEntries(immediate.entries);
      setCurrentUserEntry(immediate.currentUserEntry);
      setLoading(false);
    }

    const unsubscribe = BibleQuizService.subscribeLeaderboard(
      activeTab,
      currentUserId,
      currentUserName,
      currentUserChurch,
      currentUserPhoto,
      (data) => {
        if (data && Array.isArray(data.entries)) {
          setEntries(data.entries);
          setCurrentUserEntry(data.currentUserEntry);
          setLoading(false);
        }
      }
    );

    const timer = setTimeout(() => {
      setLoading(false);
    }, 1200);

    return () => {
      clearTimeout(timer);
      if (typeof unsubscribe === 'function') {
        unsubscribe();
      }
    };
  }, [activeTab, currentUserId, currentUserName, currentUserChurch, currentUserPhoto]);

  /**
   * Fetch leaderboard from Firestore and immediately update state
   */
  const fetchLeaderboard = useCallback(async (tab: ScopeTab = activeTab, isPullToRefresh = false) => {
    if (isPullToRefresh) {
      setRefreshing(true);
    }

    try {
      const data = await BibleQuizService.getLeaderboard(
        tab,
        currentUserId,
        currentUserName,
        currentUserChurch,
        currentUserPhoto,
        isPullToRefresh
      );

      if (data && Array.isArray(data.entries)) {
        setEntries(data.entries);
        setCurrentUserEntry(data.currentUserEntry);
      }
    } catch (e) {
      console.warn('Notice: Leaderboard load error:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [activeTab, currentUserId, currentUserName, currentUserChurch, currentUserPhoto]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', nextState => {
      if (nextState === 'active') {
        fetchLeaderboard(activeTab, false);
      }
    });
    return () => sub.remove();
  }, [activeTab, fetchLeaderboard]);

  useFocusEffect(
    useCallback(() => {
      const immediate = BibleQuizService.getCachedLeaderboard(
        activeTab,
        currentUserId,
        currentUserName,
        currentUserChurch,
        currentUserPhoto
      );
      if (immediate) {
        setEntries(immediate.entries);
        setCurrentUserEntry(immediate.currentUserEntry);
        setLoading(false);
      }
      fetchLeaderboard(activeTab, false);
    }, [activeTab, currentUserId, currentUserName, currentUserChurch, currentUserPhoto, fetchLeaderboard])
  );

  /**
   * Tab switcher: immediately load and sync from Firestore
   */
  const handleTabChange = (tabId: ScopeTab) => {
    setActiveTab(tabId);
    fetchLeaderboard(tabId, false);
  };

  const showInfoModal = () => {
    Alert.alert(
      'Bible Quiz Leaderboard',
      'The leaderboard celebrates church members who score 50% to 100% on Bible Quizzes.\n\n• Top 1, 2, and 3 podium crowns require an average score of 50% or higher.\n• Contestants scoring below 50% are displayed in the standings table below.\n• Every correct answer in quizzes earns points!\n• Complete daily challenges and practice quizzes to rise into the podium rankings!',
      [{ text: 'Got It', style: 'default' }]
    );
  };

  const tabs: { id: ScopeTab; label: string; desc: string }[] = [
    { id: 'global', label: 'Global', desc: 'All-Time Competition Leaderboard' },
    { id: 'church', label: 'My Church', desc: 'My Church Member Rankings' },
    { id: 'daily', label: 'Daily', desc: "Today's Contest • Top 3 Scorers" },
    { id: 'weekly', label: 'Weekly', desc: 'Weekly Contest • Mon to Sun Average Scores' },
    { id: 'monthly', label: 'Monthly', desc: 'Monthly Contest • Day 1 to Month End Average Scores' }
  ];

  // Split entries into qualifiers (>= 50%) and non-qualifiers (< 50%)
  // Podium crowns are strictly reserved for qualifiers who achieve 50% or higher!
  // Contestants below 50% are listed in the table list below.
  const qualifiers = entries.filter(e => (e.averageAccuracy ?? 0) >= 50);
  const nonQualifiers = entries.filter(e => (e.averageAccuracy ?? 0) < 50);

  const top1 = qualifiers[0] || null;
  const top2 = qualifiers[1] || null;
  const top3 = qualifiers[2] || null;

  // Table list: qualifiers ranked 4th and beyond, PLUS all contestants below 50%
  const qualifiersInTable = qualifiers.slice(3);
  const tableList = [...qualifiersInTable, ...nonQualifiers];
  const activeTabMeta = tabs.find(t => t.id === activeTab) || tabs[0];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: isDark ? '#090d16' : '#ffffff' }]} edges={['top', 'bottom']}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      {/* TOP HEADER */}
      <View style={[styles.headerBar, { borderBottomColor: isDark ? '#1e293b' : '#f1f5f9' }]}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <ChevronLeft size={24} color={isDark ? '#f8fafc' : '#0f172a'} />
        </TouchableOpacity>

        <Text style={[styles.headerTitle, { color: isDark ? '#f8fafc' : '#0f172a' }]}>
          Bible Quiz Leaderboard
        </Text>

        <TouchableOpacity 
          style={styles.infoBtn}
          onPress={showInfoModal}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Info size={22} color={isDark ? '#94a3b8' : '#0f172a'} />
        </TouchableOpacity>
      </View>

      {/* HORIZONTAL SCOPE TABS */}
      <View style={styles.tabsWrapper}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsScroll}>
          {tabs.map(tab => {
            const isActive = activeTab === tab.id;
            return (
              <TouchableOpacity
                key={tab.id}
                style={[
                  styles.tabPill,
                  { backgroundColor: isDark ? '#1e293b' : '#f1f5f9' },
                  isActive && { backgroundColor: '#2563eb' }
                ]}
                onPress={() => handleTabChange(tab.id)}
              >
                <Text style={[
                  styles.tabPillText,
                  { color: isDark ? '#cbd5e1' : '#475569' },
                  isActive && { color: '#ffffff', fontWeight: 'bold' }
                ]}>
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* MAIN SCROLLABLE CONTENT */}
      <ScrollView 
        style={{ flex: 1 }}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => fetchLeaderboard(activeTab, true)}
            colors={['#2563eb']}
            tintColor="#2563eb"
          />
        }
      >
        {/* BANNER WITH SCRIPTURE */}
        <View style={styles.bannerWrapper}>
          <LinearGradient
            colors={isDark ? ['#1e3a5f', '#0f2744'] : ['#e0f2fe', '#fef3c7']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.bannerGradient}
          >
            <View style={{ flex: 1, paddingRight: 60 }}>
              <Text style={[styles.bannerTitle, { color: isDark ? '#ffffff' : '#0f172a' }]}>
                Top Bible Quiz Achievers
              </Text>
              <Text style={[styles.bannerSub, { color: isDark ? '#93c5fd' : '#2563eb' }]}>
                {activeTabMeta.desc}
              </Text>
              <Text style={[styles.bannerQuote, { color: isDark ? '#cbd5e1' : '#475569' }]}>
                "Your word is a lamp to my feet and a light to my path."
              </Text>
              <Text style={[styles.bannerRef, { color: isDark ? '#93c5fd' : '#64748b' }]}>
                Psalm 119:105
              </Text>
            </View>

            {/* Silhouette Cross Graphic in Sunset */}
            <View style={styles.crossIllustrationWrap}>
              <View style={styles.sunCircle} />
              <View style={styles.crossVertical} />
              <View style={styles.crossHorizontal} />
              <View style={styles.hillSilhouette} />
            </View>
          </LinearGradient>
        </View>

        {/* ALWAYS RENDER THE TOP 3 PODIUM (Skeleton preview for open spots) */}
        <View style={styles.podiumContainer}>
          {/* 2nd Place (Left) */}
          {top2 ? (
            <View style={[styles.podiumCol, styles.podiumCol2, { backgroundColor: isDark ? '#111827' : '#f8fafc', borderColor: isDark ? '#1f2937' : '#e2e8f0' }]}>
              {/* Silver Crown 2 */}
              <View style={styles.crownContainer}>
                <Crown size={24} color="#94a3b8" fill="#94a3b8" />
                <Text style={styles.crownNumber}>2</Text>
              </View>

              <View style={styles.podiumAvatarWrap}>
                {top2.avatarUrl ? (
                  <Image 
                    source={{ uri: top2.avatarUrl }} 
                    style={[styles.podiumAvatar, { borderColor: '#94a3b8' }]}
                  />
                ) : (
                  <View style={[styles.podiumAvatarFallback, { borderColor: '#94a3b8', backgroundColor: '#64748b' }]}>
                    <Text style={styles.avatarFallbackText}>
                      {getAvatarLetter(getDisplayName(top2))}
                    </Text>
                  </View>
                )}
                {top2.isCurrentUser && (
                  <View style={styles.avatarYouBadge}>
                    <Text style={styles.avatarYouBadgeText}>YOU</Text>
                  </View>
                )}
              </View>

              <View style={styles.podiumNameWrap}>
                <Text 
                  style={[styles.podiumName, { color: isDark ? '#f8fafc' : '#0f172a' }]} 
                  numberOfLines={2}
                  ellipsizeMode="tail"
                >
                  {getDisplayName(top2)}
                </Text>
              </View>

              <Text style={[styles.podiumPoints, { color: isDark ? '#f8fafc' : '#0f172a' }]}>
                {top2.points.toLocaleString()}
              </Text>
              <Text style={styles.podiumPointsLbl}>points</Text>

              <View style={[styles.podiumAvgBadge, { backgroundColor: isDark ? '#1e293b' : '#e2e8f0' }]}>
                <Text style={[styles.podiumAvgText, { color: isDark ? '#cbd5e1' : '#475569' }]}>
                  {top2.averageAccuracy ?? 0}% Avg
                </Text>
              </View>
            </View>
          ) : (
            <View style={[styles.podiumCol, styles.podiumCol2, styles.podiumColSkeleton, { backgroundColor: isDark ? '#0f172a' : '#f8fafc', borderColor: isDark ? '#334155' : '#cbd5e1' }]}>
              <View style={styles.crownContainer}>
                <Crown size={24} color="#94a3b8" fill="#94a3b8" style={{ opacity: 0.5 }} />
                <Text style={styles.crownNumber}>2</Text>
              </View>
              <View style={styles.podiumAvatarWrap}>
                <Animated.View style={[styles.skeletonAvatar, { borderColor: '#94a3b8', opacity: pulseAnim }]}>
                  <User size={22} color="#94a3b8" />
                </Animated.View>
              </View>
              <View style={styles.podiumNameWrap}>
                <Text style={[styles.skeletonLabel, { color: isDark ? '#94a3b8' : '#64748b' }]} numberOfLines={2}>
                  Awaiting 2nd
                </Text>
              </View>
              <View style={[styles.skeletonPointsPill, { backgroundColor: isDark ? '#1e293b' : '#e2e8f0' }]}>
                <Text style={[styles.skeletonPointsText, { color: isDark ? '#64748b' : '#94a3b8' }]}>Min 50%</Text>
              </View>
              <View style={[styles.podiumAvgBadge, { backgroundColor: 'transparent' }]}>
                <Text style={[styles.podiumAvgText, { color: isDark ? '#475569' : '#94a3b8' }]}>Open Spot</Text>
              </View>
            </View>
          )}

          {/* 1st Place (Center - Prominent) */}
          {top1 ? (
            <View style={[styles.podiumCol, styles.podiumCol1, { backgroundColor: isDark ? '#2e2505' : '#fef9c3', borderColor: '#facc15' }]}>
              {/* Gold Crown 1 */}
              <View style={styles.crownContainerLarge}>
                <Crown size={32} color="#f59e0b" fill="#f59e0b" />
                <Text style={styles.crownNumberLarge}>1</Text>
              </View>

              <View style={styles.podiumAvatarWrap}>
                {top1.avatarUrl ? (
                  <Image 
                    source={{ uri: top1.avatarUrl }} 
                    style={[styles.podiumAvatarLarge, { borderColor: '#f59e0b' }]}
                  />
                ) : (
                  <View style={[styles.podiumAvatarLargeFallback, { borderColor: '#f59e0b', backgroundColor: '#d97706' }]}>
                    <Text style={styles.avatarFallbackTextLarge}>
                      {getAvatarLetter(getDisplayName(top1))}
                    </Text>
                  </View>
                )}
                {top1.isCurrentUser && (
                  <View style={styles.avatarYouBadge}>
                    <Text style={styles.avatarYouBadgeText}>YOU</Text>
                  </View>
                )}
              </View>

              <View style={styles.podiumNameWrap}>
                <Text 
                  style={[styles.podiumName, { color: isDark ? '#ffffff' : '#0f172a', fontWeight: '800' }]} 
                  numberOfLines={2}
                  ellipsizeMode="tail"
                >
                  {getDisplayName(top1)}
                </Text>
              </View>

              <Text style={[styles.podiumPointsLarge, { color: isDark ? '#ffffff' : '#0f172a' }]}>
                {top1.points.toLocaleString()}
              </Text>
              <Text style={styles.podiumPointsLbl}>points</Text>

              <View style={[styles.podiumAvgBadge, { backgroundColor: isDark ? '#451a03' : '#fef08a' }]}>
                <Text style={[styles.podiumAvgText, { color: isDark ? '#fde047' : '#854d0e', fontWeight: '800' }]}>
                  {top1.averageAccuracy ?? 0}% Avg
                </Text>
              </View>
            </View>
          ) : (
            <View style={[styles.podiumCol, styles.podiumCol1, styles.podiumColSkeleton, { backgroundColor: isDark ? '#1f1905' : '#fefce8', borderColor: '#facc15' }]}>
              <View style={styles.crownContainerLarge}>
                <Crown size={32} color="#f59e0b" fill="#f59e0b" style={{ opacity: 0.6 }} />
                <Text style={styles.crownNumberLarge}>1</Text>
              </View>
              <View style={styles.podiumAvatarWrap}>
                <Animated.View style={[styles.skeletonAvatarLarge, { borderColor: '#f59e0b', opacity: pulseAnim }]}>
                  <User size={26} color="#f59e0b" />
                </Animated.View>
              </View>
              <View style={styles.podiumNameWrap}>
                <Text style={[styles.skeletonLabel, { color: isDark ? '#fbbf24' : '#b45309', fontWeight: '800' }]} numberOfLines={2}>
                  Awaiting 1st
                </Text>
              </View>
              <View style={[styles.skeletonPointsPill, { backgroundColor: isDark ? '#2e2505' : '#fef08a' }]}>
                <Text style={[styles.skeletonPointsText, { color: isDark ? '#d97706' : '#b45309' }]}>Min 50%</Text>
              </View>
              <View style={[styles.podiumAvgBadge, { backgroundColor: 'transparent' }]}>
                <Text style={[styles.podiumAvgText, { color: isDark ? '#92400e' : '#b45309' }]}>Open Spot</Text>
              </View>
            </View>
          )}

          {/* 3rd Place (Right) */}
          {top3 ? (
            <View style={[styles.podiumCol, styles.podiumCol3, { backgroundColor: isDark ? '#1f130b' : '#fff7ed', borderColor: isDark ? '#382215' : '#fed7aa' }]}>
              {/* Bronze Crown 3 */}
              <View style={styles.crownContainer}>
                <Crown size={24} color="#d97706" fill="#d97706" />
                <Text style={styles.crownNumber}>3</Text>
              </View>

              <View style={styles.podiumAvatarWrap}>
                {top3.avatarUrl ? (
                  <Image 
                    source={{ uri: top3.avatarUrl }} 
                    style={[styles.podiumAvatar, { borderColor: '#d97706' }]}
                  />
                ) : (
                  <View style={[styles.podiumAvatarFallback, { borderColor: '#d97706', backgroundColor: '#b45309' }]}>
                    <Text style={styles.avatarFallbackText}>
                      {getAvatarLetter(getDisplayName(top3))}
                    </Text>
                  </View>
                )}
                {top3.isCurrentUser && (
                  <View style={styles.avatarYouBadge}>
                    <Text style={styles.avatarYouBadgeText}>YOU</Text>
                  </View>
                )}
              </View>

              <View style={styles.podiumNameWrap}>
                <Text 
                  style={[styles.podiumName, { color: isDark ? '#f8fafc' : '#0f172a' }]} 
                  numberOfLines={2}
                  ellipsizeMode="tail"
                >
                  {getDisplayName(top3)}
                </Text>
              </View>

              <Text style={[styles.podiumPoints, { color: isDark ? '#f8fafc' : '#0f172a' }]}>
                {top3.points.toLocaleString()}
              </Text>
              <Text style={styles.podiumPointsLbl}>points</Text>

              <View style={[styles.podiumAvgBadge, { backgroundColor: isDark ? '#29180c' : '#ffedd5' }]}>
                <Text style={[styles.podiumAvgText, { color: isDark ? '#fed7aa' : '#b45309' }]}>
                  {top3.averageAccuracy ?? 0}% Avg
                </Text>
              </View>
            </View>
          ) : (
            <View style={[styles.podiumCol, styles.podiumCol3, styles.podiumColSkeleton, { backgroundColor: isDark ? '#140c06' : '#fffaf5', borderColor: isDark ? '#3d2516' : '#fed7aa' }]}>
              <View style={styles.crownContainer}>
                <Crown size={24} color="#d97706" fill="#d97706" style={{ opacity: 0.5 }} />
                <Text style={styles.crownNumber}>3</Text>
              </View>
              <View style={styles.podiumAvatarWrap}>
                <Animated.View style={[styles.skeletonAvatar, { borderColor: '#d97706', opacity: pulseAnim }]}>
                  <User size={22} color="#d97706" />
                </Animated.View>
              </View>
              <View style={styles.podiumNameWrap}>
                <Text style={[styles.skeletonLabel, { color: isDark ? '#d97706' : '#b45309' }]} numberOfLines={2}>
                  Awaiting 3rd
                </Text>
              </View>
              <View style={[styles.skeletonPointsPill, { backgroundColor: isDark ? '#29180c' : '#ffedd5' }]}>
                <Text style={[styles.skeletonPointsText, { color: isDark ? '#b45309' : '#d97706' }]}>Min 50%</Text>
              </View>
              <View style={[styles.podiumAvgBadge, { backgroundColor: 'transparent' }]}>
                <Text style={[styles.podiumAvgText, { color: isDark ? '#475569' : '#b45309' }]}>Open Spot</Text>
              </View>
            </View>
          )}
        </View>

        {/* LOADING INDICATOR (IF FETCHING AND NO ENTRIES YET) */}
        {loading && entries.length === 0 ? (
          <View style={{ paddingVertical: 20, alignItems: 'center' }}>
            <ActivityIndicator size="small" color="#2563eb" />
            <Text style={{ marginTop: 8, fontSize: 13, color: isDark ? '#94a3b8' : '#64748b' }}>
              Updating church rankings...
            </Text>
          </View>
        ) : entries.length === 0 ? (
          <View style={[styles.emptyContainer, { backgroundColor: isDark ? '#111827' : '#ffffff', borderColor: isDark ? '#1f2937' : '#e2e8f0' }]}>
            <View style={[styles.emptyIconWrap, { backgroundColor: isDark ? '#1e293b' : '#ede9fe' }]}>
              <Trophy size={32} color="#7c3aed" />
            </View>
            <Text style={[styles.emptyTitle, { color: isDark ? '#f8fafc' : '#0f172a' }]}>
              Podium Positions Open
            </Text>
            <Text style={[styles.emptySub, { color: isDark ? '#94a3b8' : '#64748b' }]}>
              Be the first church member to score 50% or higher and claim the #1 Gold Crown on the podium!
            </Text>
            <TouchableOpacity
              style={styles.emptyActionBtn}
              onPress={() => navigation.navigate('BibleQuizHome')}
            >
              <Text style={styles.emptyActionBtnText}>
                {BibleQuizService.isDailyCompletedTodaySync(currentUserId, currentUserName) ? 'Practice Bible Quiz' : "Start Today's Quiz"}
              </Text>
            </TouchableOpacity>
          </View>
        ) : tableList.length === 0 ? (
          /* When all contestants are on the podium, show clean motivation instead of duplicating them below */
          <View style={[styles.podiumNoticeCard, { backgroundColor: isDark ? '#111827' : '#ffffff', borderColor: isDark ? '#1f2937' : '#e2e8f0' }]}>
            <View style={styles.podiumNoticeHeader}>
              <Sparkles size={18} color="#f59e0b" style={{ marginRight: 8 }} />
              <Text style={[styles.podiumNoticeTitle, { color: isDark ? '#f8fafc' : '#0f172a' }]}>
                Leading on the Podium!
              </Text>
            </View>
            <Text style={[styles.podiumNoticeSub, { color: isDark ? '#94a3b8' : '#64748b' }]}>
              {qualifiers.length === 3 
                ? 'All top 3 spots are claimed on the podium! Take a quiz now to earn points and claim rank 4 and beyond.'
                : 'Top church contestants are leading on the podium above. Take a quiz now to claim the open spots!'}
            </Text>
          </View>
        ) : (
          /* LEADERBOARD TABLE */
          <View style={styles.tableWrapper}>
            <View style={styles.tableHeaderSection}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <BarChart2 size={16} color={isDark ? '#93c5fd' : '#2563eb'} style={{ marginRight: 6 }} />
                <Text style={[styles.tableSectionTitle, { color: isDark ? '#f8fafc' : '#0f172a' }]}>
                  {qualifiers.length > 0 ? 'Member Standings' : 'Participants Standings'}
                </Text>
              </View>
              {qualifiers.length < 3 && (
                <Text style={[styles.tableQualificationHint, { color: isDark ? '#fbbf24' : '#b45309' }]}>
                  ★ Score 50%+ to claim open podium crown
                </Text>
              )}
            </View>

            <View style={[styles.tableContainer, { backgroundColor: isDark ? '#111827' : '#ffffff', borderColor: isDark ? '#1f2937' : '#f1f5f9' }]}>
              {/* Table Column Headers */}
              <View style={[styles.tableHeaderRow, { borderBottomColor: isDark ? '#1f2937' : '#f1f5f9' }]}>
                <Text style={[styles.thText, styles.colRank]}>#</Text>
                <Text style={[styles.thText, styles.colNameHeader]}>Member Name</Text>
                <Text style={[styles.thText, styles.colAvg]}>Avg Score</Text>
                <Text style={[styles.thText, styles.colPoints]}>Points</Text>
                <Text style={[styles.thText, styles.colDone]}>Done</Text>
              </View>

              {/* Table Rows */}
              {tableList.map(item => {
                const isUser = item.isCurrentUser;
                const displayName = getDisplayName(item);
                const avatarLetter = getAvatarLetter(displayName);

                return (
                  <View 
                    key={item.uid}
                    style={[
                      styles.tableRow,
                      { borderBottomColor: isDark ? '#1f2937' : '#f8fafc' },
                      isUser && { 
                        backgroundColor: isDark ? '#172554' : '#eff6ff',
                        borderRadius: 12,
                        borderBottomWidth: 0,
                        marginVertical: 2
                      }
                    ]}
                  >
                    {/* Rank */}
                    <Text style={[styles.rankNum, styles.colRank, { color: isDark ? '#f8fafc' : '#0f172a' }]}>
                      {item.rank}
                    </Text>

                    {/* Member Profile Image with You Badge next to it & Full Name Below */}
                    <View style={styles.colNameRow}>
                      <View style={styles.tableAvatarRow}>
                        {item.avatarUrl ? (
                          <Image 
                            source={{ uri: item.avatarUrl }} 
                            style={styles.cellAvatar} 
                          />
                        ) : (
                          <View style={[styles.cellAvatarFallback, { backgroundColor: isUser ? '#2563eb' : '#7c3aed' }]}>
                            <Text style={styles.cellAvatarFallbackText}>
                              {avatarLetter}
                            </Text>
                          </View>
                        )}
                        {isUser && (
                          <View style={styles.tableYouBadge}>
                            <Text style={styles.tableYouBadgeText}>You</Text>
                          </View>
                        )}
                      </View>

                      <Text 
                        style={[styles.cellNameBelow, { color: isDark ? '#f8fafc' : '#0f172a' }]} 
                        numberOfLines={2}
                        ellipsizeMode="tail"
                      >
                        {displayName}
                      </Text>
                    </View>

                    {/* Avg Score */}
                    <View style={styles.colAvg}>
                      <Text style={[
                        styles.cellAvg, 
                        { 
                          color: (item.averageAccuracy ?? 0) >= 50 
                            ? (isDark ? '#93c5fd' : '#2563eb') 
                            : (isDark ? '#fbbf24' : '#d97706') 
                        }
                      ]}>
                        {item.averageAccuracy ?? 0}%
                      </Text>
                    </View>

                    {/* Points */}
                    <Text style={[styles.cellPoints, styles.colPoints, { color: isDark ? '#f8fafc' : '#0f172a' }]}>
                      {item.points.toLocaleString()}
                    </Text>

                    {/* Completed */}
                    <View style={styles.colDone}>
                      <Text style={[styles.cellCompleted, { color: isDark ? '#cbd5e1' : '#334155' }]}>
                        {item.completedCount}
                      </Text>
                      <ChevronRight size={12} color={isUser ? '#2563eb' : (isDark ? '#64748b' : '#94a3b8')} style={{ marginLeft: 2 }} />
                    </View>
                  </View>
                );
              })}
            </View>
          </View>
        )}
      </ScrollView>

      {/* STICKY BOTTOM BAR (YOUR RANK & VIEW MY HISTORY) */}
      {currentUserEntry && (
        <View style={[
          styles.bottomStickyBar, 
          { 
            backgroundColor: isDark ? '#0b1120' : '#ffffff', 
            borderTopColor: isDark ? '#1e293b' : '#e2e8f0',
            paddingBottom: Math.max(insets.bottom, Platform.OS === 'android' ? 14 : 10)
          }
        ]}>
          <View style={styles.bottomLeftSection}>
            {currentUserEntry.avatarUrl ? (
              <Image 
                source={{ uri: currentUserEntry.avatarUrl }} 
                style={styles.bottomAvatar} 
              />
            ) : (
              <View style={[styles.bottomAvatarFallback, { backgroundColor: '#2563eb' }]}>
                <Text style={styles.bottomAvatarFallbackText}>
                  {getAvatarLetter(getDisplayName(currentUserEntry))}
                </Text>
              </View>
            )}

            <View style={styles.bottomStatsRow}>
              <View style={styles.bottomStatBlock}>
                <Text style={styles.bottomStatLbl}>Rank</Text>
                <Text style={[styles.bottomStatVal, { color: isDark ? '#f8fafc' : '#0f172a' }]}>
                  {currentUserEntry.rank ? `#${currentUserEntry.rank}` : '--'}
                </Text>
              </View>

              <View style={[styles.bottomStatDivider, { backgroundColor: isDark ? '#334155' : '#cbd5e1' }]} />

              <View style={styles.bottomStatBlock}>
                <Text style={styles.bottomStatLbl}>Avg</Text>
                <Text style={[styles.bottomStatVal, { color: isDark ? '#93c5fd' : '#2563eb' }]}>
                  {currentUserEntry.averageAccuracy ?? 0}%
                </Text>
              </View>

              <View style={[styles.bottomStatDivider, { backgroundColor: isDark ? '#334155' : '#cbd5e1' }]} />

              <View style={styles.bottomStatBlock}>
                <Text style={styles.bottomStatLbl}>Points</Text>
                <Text style={[styles.bottomStatVal, { color: isDark ? '#f8fafc' : '#0f172a' }]}>
                  {currentUserEntry.points.toLocaleString()}
                </Text>
              </View>

              <View style={[styles.bottomStatDivider, { backgroundColor: isDark ? '#334155' : '#cbd5e1' }]} />

              <View style={styles.bottomStatBlock}>
                <Text style={styles.bottomStatLbl}>Done</Text>
                <Text style={[styles.bottomStatVal, { color: isDark ? '#f8fafc' : '#0f172a' }]}>
                  {currentUserEntry.completedCount}
                </Text>
              </View>
            </View>
          </View>

          <TouchableOpacity
            style={styles.bottomCtaBtn}
            onPress={() => navigation.navigate('QuizHistory')}
            activeOpacity={0.85}
          >
            <History size={15} color="#ffffff" style={{ marginRight: 4 }} />
            <Text style={styles.bottomCtaBtnText} numberOfLines={1}>History</Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1
  },
  backBtn: {
    padding: 6
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800'
  },
  infoBtn: {
    padding: 6
  },
  tabsWrapper: {
    paddingVertical: 8
  },
  tabsScroll: {
    paddingHorizontal: 16,
    gap: 8
  },
  tabPill: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20
  },
  tabPillText: {
    fontSize: 13,
    fontWeight: '600'
  },
  scrollContent: {
    paddingBottom: 24
  },
  bannerWrapper: {
    paddingHorizontal: 16,
    marginTop: 6,
    marginBottom: 16
  },
  bannerGradient: {
    borderRadius: 20,
    padding: 18,
    position: 'relative',
    overflow: 'hidden',
    minHeight: 125
  },
  bannerTitle: {
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 4
  },
  bannerSub: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 8
  },
  bannerQuote: {
    fontSize: 12,
    fontStyle: 'italic',
    lineHeight: 16
  },
  bannerRef: {
    fontSize: 11,
    fontWeight: '700',
    marginTop: 2
  },
  crossIllustrationWrap: {
    position: 'absolute',
    right: 14,
    top: 16,
    width: 60,
    height: 90,
    alignItems: 'center',
    justifyContent: 'center'
  },
  sunCircle: {
    position: 'absolute',
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#fbbf24',
    opacity: 0.7,
    top: 6
  },
  crossVertical: {
    position: 'absolute',
    width: 5,
    height: 46,
    backgroundColor: '#78350f',
    borderRadius: 2,
    top: 10
  },
  crossHorizontal: {
    position: 'absolute',
    width: 22,
    height: 5,
    backgroundColor: '#78350f',
    borderRadius: 2,
    top: 22
  },
  hillSilhouette: {
    position: 'absolute',
    bottom: -6,
    width: 70,
    height: 24,
    borderTopLeftRadius: 35,
    borderTopRightRadius: 35,
    backgroundColor: '#92400e',
    opacity: 0.8
  },
  podiumContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    paddingHorizontal: 16,
    marginBottom: 20,
    gap: 8
  },
  podiumCol: {
    flex: 1,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2
  },
  podiumCol1: {
    paddingVertical: 16,
    marginBottom: 0,
    minHeight: 230
  },
  podiumCol2: {
    paddingVertical: 14,
    marginBottom: 8,
    minHeight: 206
  },
  podiumCol3: {
    paddingVertical: 14,
    marginBottom: 8,
    minHeight: 206
  },
  crownContainer: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4
  },
  crownNumber: {
    position: 'absolute',
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '900',
    top: 8
  },
  crownContainerLarge: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4
  },
  crownNumberLarge: {
    position: 'absolute',
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '900',
    top: 11
  },
  podiumAvatarWrap: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6
  },
  avatarYouBadge: {
    position: 'absolute',
    bottom: -4,
    backgroundColor: '#2563eb',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.25,
    shadowRadius: 2,
    elevation: 3
  },
  avatarYouBadgeText: {
    color: '#ffffff',
    fontSize: 8.5,
    fontWeight: '900',
    letterSpacing: 0.3
  },
  podiumAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 2
  },
  podiumAvatarLarge: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 3
  },
  podiumNameWrap: {
    width: '100%',
    minHeight: 38,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 3,
    paddingHorizontal: 2
  },
  podiumName: {
    fontSize: 12,
    lineHeight: 15,
    fontWeight: '700',
    textAlign: 'center',
    width: '100%'
  },
  podiumChurch: {
    fontSize: 11,
    textAlign: 'center',
    marginBottom: 8
  },
  podiumPoints: {
    fontSize: 15,
    fontWeight: '800'
  },
  podiumPointsLarge: {
    fontSize: 17,
    fontWeight: '900'
  },
  podiumPointsLbl: {
    fontSize: 10,
    color: '#64748b'
  },
  podiumAvgBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2.5,
    borderRadius: 10,
    marginTop: 5
  },
  podiumAvgText: {
    fontSize: 10,
    fontWeight: '700'
  },
  podiumNoticeCard: {
    marginHorizontal: 16,
    padding: 20,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    marginBottom: 16
  },
  podiumNoticeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6
  },
  podiumNoticeTitle: {
    fontSize: 15,
    fontWeight: '800'
  },
  podiumNoticeSub: {
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
    maxWidth: 290
  },
  podiumColSkeleton: {
    borderStyle: 'dashed'
  },
  skeletonAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 2,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(148, 163, 184, 0.08)'
  },
  skeletonAvatarLarge: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 2.5,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(250, 204, 21, 0.1)'
  },
  skeletonLabel: {
    fontSize: 12,
    lineHeight: 15,
    fontWeight: '700',
    textAlign: 'center',
    width: '100%'
  },
  skeletonPointsPill: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
    marginTop: 2
  },
  skeletonPointsText: {
    fontSize: 11,
    fontWeight: '700'
  },
  openSpotNote: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderTopWidth: 1,
    marginTop: 4
  },
  openSpotText: {
    fontSize: 12,
    fontWeight: '600'
  },
  tableWrapper: {
    marginHorizontal: 16,
    marginBottom: 16
  },
  tableHeaderSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
    paddingHorizontal: 4
  },
  tableSectionTitle: {
    fontSize: 14,
    fontWeight: '800'
  },
  tableQualificationHint: {
    fontSize: 11,
    fontWeight: '700'
  },
  tableContainer: {
    borderRadius: 18,
    borderWidth: 1,
    overflow: 'hidden'
  },
  tableHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: 1
  },
  thText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748b'
  },
  colRank: {
    width: 28,
    textAlign: 'center'
  },
  colNameHeader: {
    flex: 1,
    textAlign: 'center'
  },
  colNameRow: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4
  },
  tableAvatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 3
  },
  tableYouBadge: {
    backgroundColor: '#2563eb',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 6,
    marginLeft: 4
  },
  tableYouBadgeText: {
    color: '#ffffff',
    fontSize: 8.5,
    fontWeight: '800'
  },
  cellNameBelow: {
    fontSize: 10.5,
    lineHeight: 13.5,
    fontWeight: '600',
    textAlign: 'center',
    width: '100%',
    paddingHorizontal: 2
  },
  colAvg: {
    width: 64,
    alignItems: 'center',
    justifyContent: 'center',
    textAlign: 'center'
  },
  colPoints: {
    width: 58,
    textAlign: 'right'
  },
  colDone: {
    width: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    textAlign: 'right'
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: 1
  },
  rankNum: {
    fontSize: 13,
    fontWeight: '700'
  },
  cellAvatar: {
    width: 34,
    height: 34,
    borderRadius: 17
  },
  youBadge: {
    backgroundColor: '#2563eb',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 6,
    marginLeft: 4,
    flexShrink: 0
  },
  youBadgeText: {
    color: '#ffffff',
    fontSize: 9,
    fontWeight: '800'
  },
  cellAvg: {
    fontSize: 12,
    fontWeight: '800'
  },
  cellPoints: {
    fontSize: 13,
    fontWeight: '800'
  },
  cellCompleted: {
    fontSize: 12,
    fontWeight: '600'
  },
  bottomStickyBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 10,
  },
  bottomLeftSection: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 8,
    gap: 8,
  },
  bottomAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 2,
    borderColor: '#2563eb'
  },
  bottomStatsRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  bottomStatBlock: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 2
  },
  bottomStatLbl: {
    fontSize: 9,
    color: '#64748b',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.2
  },
  bottomStatVal: {
    fontSize: 13,
    fontWeight: '800',
    marginTop: 1
  },
  bottomStatDivider: {
    width: 1,
    height: 18,
    opacity: 0.4,
  },
  bottomCtaBtn: {
    flexShrink: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2563eb',
    paddingVertical: 8,
    paddingHorizontal: 11,
    borderRadius: 18,
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3
  },
  bottomCtaBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700'
  },
  cellAvatarFallback: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center'
  },
  cellAvatarFallbackText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '800'
  },
  podiumAvatarFallback: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center'
  },
  podiumAvatarLargeFallback: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center'
  },
  avatarFallbackText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '900'
  },
  avatarFallbackTextLarge: {
    color: '#ffffff',
    fontSize: 22,
    fontWeight: '900'
  },
  bottomAvatarFallback: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#2563eb',
    alignItems: 'center',
    justifyContent: 'center'
  },
  bottomAvatarFallbackText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '900'
  },
  emptyContainer: {
    marginHorizontal: 16,
    marginTop: 10,
    padding: 28,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center'
  },
  emptyIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 6
  },
  emptySub: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 18,
    maxWidth: 280
  },
  emptyActionBtn: {
    backgroundColor: '#2563eb',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 24,
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 3
  },
  emptyActionBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '800'
  }
});
