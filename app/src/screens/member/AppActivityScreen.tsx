import React, { useState, useMemo, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, SafeAreaView, TouchableOpacity, RefreshControl, InteractionManager, ActivityIndicator, Alert } from 'react-native';
import { ChevronLeft, ChevronRight, Info, MoreVertical } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import firestore from '@react-native-firebase/firestore';
import { 
  buildDataset, 
  demoReference, 
  hourlyBuckets, 
  dailyBuckets,
  thisWeekBuckets,
  featureUsage,
  heatmap,
  memberProfile,
  formatNumber,
  dateKey,
  HourBucket,
  DayBucket,
  MemberProfile,
  ActivityDataset
} from '../../lib/activity-data';

import { ActivityChart, ChartPoint } from '../../components/activity/ActivityChart';
import { FeatureUsagePanel } from '../../components/activity/FeatureUsagePanel';
import { MemberListModal } from '../../components/activity/MemberListModal';
import { MemberProfileModal } from '../../components/activity/MemberProfileModal';
import { MemberRow } from '../../components/activity/MemberRow';
import { MemberAvatar } from '../../components/activity/MemberAvatar';
import { memberBreakdown } from '../../lib/activity-data';
import { Users } from 'lucide-react-native';
import { useRealActivityData } from '../../hooks/useRealActivityData';

export default function AppActivityScreen() {
  const navigation = useNavigation();
  const [refreshing, setRefreshing] = useState(false);
  const [period, setPeriod] = useState<'today' | '7days' | '30days' | '3months'>('today');
  const [ready, setReady] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

  const handlePrevious = () => {
    if (!selectedPointId) return;
    const idx = activePoints.findIndex(p => ('key' in p ? p.key : String(p.hour)) === selectedPointId);
    if (idx > 0) {
      const prev = activePoints[idx - 1];
      setSelectedPointId('key' in prev ? prev.key : String(prev.hour));
    }
  };

  const handleNext = () => {
    if (!selectedPointId) return;
    const idx = activePoints.findIndex(p => ('key' in p ? p.key : String(p.hour)) === selectedPointId);
    if (idx < activePoints.length - 1) {
      const next = activePoints[idx + 1];
      setSelectedPointId('key' in next ? next.key : String(next.hour));
    }
  };
  
  const isNextDisabled = false; // We can disable it if it's the last point

  const handleResetActivity = () => {
    Alert.alert(
      "Reset App Activity",
      "Are you sure you want to delete all app activity data? This cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Reset", 
          style: "destructive",
          onPress: async () => {
            try {
              setRefreshing(true);
              
              // Helper to chunk array for Firestore batch limit (500)
              const chunk = (arr: any[], size: number) =>
                Array.from({ length: Math.ceil(arr.length / size) }, (v, i) =>
                  arr.slice(i * size, i * size + size)
                );

              const sessionsSnap = await firestore().collection('activity_sessions').get();
              const sessionChunks = chunk(sessionsSnap.docs, 400);
              for (const c of sessionChunks) {
                const batch = firestore().batch();
                c.forEach(doc => batch.delete(doc.ref));
                await batch.commit();
              }

              const eventsSnap = await firestore().collection('activity_events').get();
              const eventChunks = chunk(eventsSnap.docs, 400);
              for (const c of eventChunks) {
                const batch = firestore().batch();
                c.forEach(doc => batch.delete(doc.ref));
                await batch.commit();
              }

              Alert.alert("Success", "App activity has been reset.");
            } catch (err) {
              console.error("Reset activity failed", err);
              Alert.alert("Error", "Failed to reset activity.");
            } finally {
              setRefreshing(false);
            }
          }
        }
      ]
    );
  };

  useEffect(() => {
    InteractionManager.runAfterInteractions(() => {
      setReady(true);
    });
  }, []);
  
  // Real Data Fetching (fetching up to 92 days to cover 3 months)
  const { sessions, events, loading: dataLoading, refetch } = useRealActivityData(ready ? 92 : 0);
  
  // Data State
  const ds = useMemo(() => {
    const d = new Date();
    return {
      today: d,
      now: d,
      sessions: sessions,
      events: events
    } as ActivityDataset;
  }, [sessions, events]);

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    // Use a small extra timeout to make the UI feel responsive and let the hook's loading state catch it
    setTimeout(() => setRefreshing(false), 300);
  };

  // Derived metrics
  const todayBuckets = useMemo(() => hourlyBuckets(ds, ds.today), [ds]);
  const days7 = useMemo(() => thisWeekBuckets(ds), [ds]);
  const days30 = useMemo(() => dailyBuckets(ds, 30), [ds]);
  const days90 = useMemo(() => dailyBuckets(ds, 92), [ds]);

  const activePoints = period === 'today' ? todayBuckets 
    : period === '7days' ? days7 
    : period === '30days' ? days30 
    : days90;

  const chartMode = period === 'today' ? 'hourly' : 'daily';
  const chartPoints: ChartPoint[] = activePoints.map((p) => ({
    id: 'key' in p ? p.key : String(p.hour),
    label: p.label,
    members: p.members,
    sessions: p.sessions,
  }));

  const [selectedPointId, setSelectedPointId] = useState<string | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [isMemberListOpen, setIsMemberListOpen] = useState(false);

  // Auto-select the current time/day when switching tabs or loading
  React.useEffect(() => {
    if (dataLoading) return; // Wait for real data before auto-selecting
    
    if (activePoints.length > 0) {
      const isValid = selectedPointId !== null && activePoints.some(p => ('key' in p ? p.key : String(p.hour)) === selectedPointId);
      if (!isValid) {
        const mostRecentActive = [...activePoints].reverse().find(p => p.members > 0);

        if (mostRecentActive) {
          setSelectedPointId('key' in mostRecentActive ? mostRecentActive.key : String(mostRecentActive.hour));
        } else {
          if (period === 'today') {
            const currentHour = new Date().getHours();
            setSelectedPointId(String(currentHour));
          } else {
            const todayKey = dateKey(ds.today);
            const hasToday = activePoints.some(p => ('key' in p ? p.key : String(p.hour)) === todayKey);
            if (hasToday) {
              setSelectedPointId(todayKey);
            } else {
              const last = activePoints[activePoints.length - 1];
              setSelectedPointId('key' in last ? last.key : String(last.hour));
            }
          }
        }
      }
    }
  }, [activePoints, period]);

  // Modals state
  const selectedBucket = selectedPointId 
    ? activePoints.find(p => ('key' in p ? p.key : String(p.hour)) === selectedPointId)
    : null;
    
  const selectedMembers = selectedBucket ? memberBreakdown(selectedBucket.sessionList) : [];
  const profile: MemberProfile | null = selectedUserId ? memberProfile(ds, selectedUserId) : null;

  // Header stats
  const totalToday = todayBuckets.reduce((sum, b) => sum + b.members, 0); // approx
  const uniqueToday = new Set(todayBuckets.flatMap(b => b.sessionList.map(s => s.userId))).size;
  const sessionsToday = todayBuckets.reduce((sum, b) => sum + b.sessions, 0);

  // Compute who is literally online right now
  const isMemberOnline = (userId: string) => {
    // Find all sessions for this user today
    const userSessions = ds.sessions.filter(s => s.userId === userId && s.startedAt.toDateString() === new Date().toDateString());
    // They are currently online if any of their sessions have isActive = true
    return userSessions.some(s => s.isActive);
  };

  const uniqueWeek = new Set(days7.flatMap(b => b.sessionList.map(s => s.userId))).size;
  const sessionsWeek = days7.reduce((sum, b) => sum + b.sessions, 0);

  const uniqueMonth = new Set(days30.flatMap(b => b.sessionList.map(s => s.userId))).size;
  const sessionsMonth = days30.reduce((sum, b) => sum + b.sessions, 0);

  const avgActivity = uniqueMonth > 0 ? (sessionsMonth / uniqueMonth).toFixed(1) : '0';

  const usage = useMemo(() => featureUsage(days7.flatMap(b => b.sessionList)), [days7]);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView 
        style={styles.scrollArea}
        refreshControl={<RefreshControl refreshing={refreshing || dataLoading} onRefresh={onRefresh} />}
      >
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <ChevronLeft color="#0f172a" size={24} />
        </TouchableOpacity>
        <View style={styles.headerTitles}>
          <Text style={styles.headerTitle}>App Activity</Text>
        </View>
        <TouchableOpacity style={styles.moreButton} onPress={() => setShowMenu(!showMenu)}>
          <MoreVertical color="#0f172a" size={24} />
        </TouchableOpacity>
        
        {showMenu && (
          <View style={styles.dropdownMenu}>
            <TouchableOpacity 
              style={styles.dropdownItem}
              onPress={() => {
                setShowMenu(false);
                handleResetActivity();
              }}
            >
              <Text style={styles.dropdownItemText}>Reset App Activity</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {!ready ? (
        <View style={{ height: 300, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color="#0f172a" />
        </View>
      ) : (
        <View>
        <View style={styles.infoCard}>
          <Info color="#3b82f6" size={20} style={styles.infoIcon} />
          <Text style={styles.infoText}>
            Track when and how frequently church members use the app — unique members, sessions, and exact activity times.
          </Text>
        </View>

        {/* Stats Grid */}
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>TODAY</Text>
            <View style={styles.statRow}>
              <Text style={styles.statValue}>{formatNumber(uniqueToday)}</Text>
              <Text style={styles.statSub}> members</Text>
            </View>
            <Text style={styles.statFooter}>{formatNumber(sessionsToday)} sessions</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>THIS WEEK</Text>
            <View style={styles.statRow}>
              <Text style={styles.statValue}>{formatNumber(uniqueWeek)}</Text>
              <Text style={styles.statSub}> members</Text>
            </View>
            <Text style={styles.statFooter}>{formatNumber(sessionsWeek)} sessions</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>THIS MONTH</Text>
            <View style={styles.statRow}>
              <Text style={styles.statValue}>{formatNumber(uniqueMonth)}</Text>
              <Text style={styles.statSub}> members</Text>
            </View>
            <Text style={styles.statFooter}>{formatNumber(sessionsMonth)} sessions</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>AVG. ACTIVITY</Text>
            <View style={styles.statRow}>
              <Text style={styles.statValue}>{avgActivity}</Text>
            </View>
            <Text style={styles.statFooter}>sessions per member</Text>
          </View>
        </View>

        {/* Main Chart Card */}
        <View style={[styles.card, styles.chartCard]}>
          <View style={styles.cardHeaderRow}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', width: '100%', marginBottom: 12 }}>
              <View style={[styles.cardTitleContainer, { marginBottom: 0, flex: 1 }]}>
                <Text style={[styles.cardTitle, styles.serifTitle]}>Member activity</Text>
                <Text style={styles.cardSubtitle}>
                  {period === 'today' 
                    ? 'Hourly unique members active today' 
                    : 'Active members over time'}
                </Text>
              </View>
              <View style={[styles.navButtonsContainer, { marginTop: -4 }]}>
                <TouchableOpacity onPress={handlePrevious} style={[styles.navButton, { borderRightWidth: 1, borderRightColor: '#e2e8f0' }]}>
                  <ChevronLeft color="#0f172a" size={20} />
                </TouchableOpacity>
                <TouchableOpacity onPress={handleNext} style={[styles.navButton, { opacity: isNextDisabled ? 0.3 : 1 }]} disabled={isNextDisabled}>
                  <ChevronRight color="#0f172a" size={20} />
                </TouchableOpacity>
              </View>
            </View>
            <View style={styles.filterPillContainer}>
              {(['today', '7days', '30days', '3months'] as const).map((p) => (
                <TouchableOpacity 
                  key={p} 
                  style={[styles.filterPillBtn, period === p && styles.filterPillBtnActive]}
                  onPress={() => { setPeriod(p); setSelectedPointId(null); setIsMemberListOpen(false); }}
                >
                  <Text style={[styles.filterPillText, period === p && styles.filterPillTextActive]}>
                    {p === 'today' ? 'Today' : p === '7days' ? '7 Days' : p === '30days' ? '30 Days' : '3 Months'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.chartWrapper}>
            <ActivityChart 
              points={chartPoints} 
              selectedId={selectedPointId} 
              onSelect={setSelectedPointId} 
              mode={chartMode} 
            />
          </View>
          
          {selectedBucket && (
            <View style={styles.selectedPanel}>
              <View style={[styles.selectedHeader, { flexDirection: 'column', alignItems: 'stretch' }]}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
                  <View>
                    <Text style={styles.selectedLabel}>{period === 'today' ? 'SELECTED HOUR' : 'SELECTED DATE'}</Text>
                    <Text style={styles.selectedTitle}>{selectedBucket.label}</Text>
                  </View>
                  <View style={styles.activeMembersBadge}>
                    <Users size={16} color="#475569" style={{ marginRight: 6 }} />
                    <Text style={styles.activeMembersText}>{selectedBucket.members} members active</Text>
                  </View>
                </View>
                <Text style={styles.selectedDate} numberOfLines={1}>
                  {'date' in selectedBucket 
                    ? selectedBucket.date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
                    : ds.today.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
                  } {new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                </Text>
              </View>

              <View style={styles.inlineMemberList}>
                {selectedMembers.slice(0, 4).map((m: any) => (
                  <MemberRow 
                    key={m.member.userId} 
                    entry={m} 
                    today={ds.today} 
                    online={isMemberOnline(m.member.userId)} 
                    onSelect={(uid) => setSelectedUserId(uid)} 
                  />
                ))}
              </View>

              {selectedMembers.length > 4 && (
                <TouchableOpacity style={styles.viewAllBtn} onPress={() => setIsMemberListOpen(true)}>
                  <Text style={styles.viewAllText}>View all {selectedMembers.length} members</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>

        {/* Feature Usage */}
        <View style={[styles.card, { marginBottom: 32 }]}>
          <Text style={styles.cardTitle}>What are members using?</Text>
          <Text style={styles.cardSubtitle}>Feature adoption among active members (last 7 days)</Text>
          <View style={{ marginTop: 16 }}>
            <FeatureUsagePanel usage={usage} periodLabel="this week" />
          </View>
        </View>
        </View>
      )}
      </ScrollView>

      {/* Modals */}
      {ready && selectedBucket && isMemberListOpen && (
        <MemberListModal
          open={isMemberListOpen}
          title={selectedBucket.label}
          subtitle={`${selectedBucket.members} unique members active`}
          entries={selectedMembers}
          today={ds.today}
          onClose={() => setIsMemberListOpen(false)}
          onSelectMember={(uid) => {
            setIsMemberListOpen(false);
            setSelectedUserId(uid);
          }}
        />
      )}

      {profile && (
        <MemberProfileModal
          profile={profile}
          today={ds.today}
          onClose={() => setSelectedUserId(null)}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f1f5f9',
  },
  header: {
    backgroundColor: 'transparent',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    paddingTop: 54,
    paddingBottom: 16,
  },
  backButton: {
    position: 'absolute',
    left: 16,
    bottom: 16,
    zIndex: 1,
  },
  headerTitles: {
    alignItems: 'center',
  },
  headerSub: {
    color: '#94a3b8',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: 2,
  },
  headerTitle: {
    color: '#0f172a',
    fontSize: 24,
    fontWeight: 'bold',
  },
  moreButton: {
    position: 'absolute',
    right: 16,
    bottom: 16,
    zIndex: 2,
  },
  dropdownMenu: {
    position: 'absolute',
    top: 60,
    right: 16,
    backgroundColor: '#ffffff',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
    zIndex: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  dropdownItem: {
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  dropdownItemText: {
    color: '#ef4444',
    fontSize: 14,
    fontWeight: '600',
  },
  infoCard: {
    flexDirection: 'row',
    backgroundColor: '#eff6ff',
    margin: 16,
    padding: 16,
    borderRadius: 12,
    alignItems: 'flex-start',
    borderWidth: 1,
    borderColor: '#cbd5e1', // ash color
  },
  infoIcon: {
    marginRight: 12,
    marginTop: 2,
  },
  infoText: {
    flex: 1,
    color: '#1e3a8a',
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '500',
  },
  scrollArea: {
    flex: 1,
  },
  statsGrid: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 12,
  },
  statCard: {
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#4a4a4a',
    width: '48%',
  },
  statLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#64748b',
    marginBottom: 8,
  },
  statRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#0f172a',
  },
  statSub: {
    fontSize: 12,
    color: '#64748b',
    marginLeft: 2,
  },
  statFooter: {
    fontSize: 11,
    color: '#94a3b8',
    marginTop: 8,
  },
  card: {
    backgroundColor: '#ffffff',
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  chartCard: {
    backgroundColor: '#fffdfa', // warm white
    borderColor: '#e7e5e0',
    padding: 16,
  },
  cardHeaderRow: {
    flexDirection: 'column',
    alignItems: 'flex-start',
  },
  cardTitleContainer: {
    marginBottom: 12,
  },
  navButtonsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
  },
  navButton: {
    padding: 6,
    paddingHorizontal: 10,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0f172a',
  },
  serifTitle: {
    color: '#1e293b',
    fontSize: 20,
    fontWeight: '700',
  },
  cardSubtitle: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 4,
    marginBottom: 8,
  },
  filterPillContainer: {
    flexDirection: 'row',
    backgroundColor: '#f1f0ea',
    borderRadius: 20,
    padding: 4,
  },
  filterPillBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    alignItems: 'center',
    borderRadius: 16,
  },
  filterPillBtnActive: {
    backgroundColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  filterPillText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#64748b',
  },
  filterPillTextActive: {
    color: '#0f172a',
    fontWeight: '600',
  },
  chartWrapper: {
    marginTop: 16,
    marginHorizontal: -16, 
  },
  selectedPanel: {
    marginTop: 20,
    backgroundColor: '#f4f2eb',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e7e5e0',
  },
  selectedHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  selectedLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748b',
    letterSpacing: 1,
    marginBottom: 2,
  },
  selectedTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  selectedDate: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  activeMembersBadge: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  activeMembersText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1e293b',
  },
  avatarsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 16,
  },
  moreAvatars: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  moreAvatarsText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748b',
  },
  inlineMemberList: {
    backgroundColor: '#f4f2eb',
  },
  viewAllBtn: {
    marginTop: 16,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    alignSelf: 'flex-start',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
  },
  viewAllText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1e293b',
  }
});
