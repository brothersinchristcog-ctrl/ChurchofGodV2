import React, { useState, useContext, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Dimensions, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Video, PlusCircle, Calendar, Menu, Users, Plus, ArrowLeft, Book } from 'lucide-react-native';
import { AdminTabContext } from '../../../context/AdminTabContext';
import { useTheme } from '../../../context/ThemeContext';
import { db } from '../../../services/firebaseConfig';
import { useAuth } from '../../../context/AuthContext';
import AdminBibleClassesCreate from './AdminBibleClassesCreate';
import AdminBibleClassHost from './AdminBibleClassHost';

const { width } = Dimensions.get('window');

const BASE_TABS = [
  { id: "dashboard", label: "Dashboard", icon: Video },
  { id: "create",    label: "Create Class", icon: PlusCircle },
  { id: "history",   label: "All Classes", icon: Calendar },
];

export default function AdminBibleClassesMain() {
  const { openDrawer } = useContext(AdminTabContext) as any;
  const { member } = useAuth();
  const { isDark, colors } = useTheme();
  
  const [activeTab, setActiveTab] = useState('dashboard');
  const [classes, setClasses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);

  // New states for the requested features
  const [createMode, setCreateMode] = useState(false);
  const [historyFilter, setHistoryFilter] = useState<'ALL' | 'UPCOMING' | 'LIVE'>('ALL');
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    // Scaffold Firestore Listener for Classes
    const unsubscribe = db.collection(`churches/default/bibleClasses`)
      .orderBy('createdAt', 'desc')
      .onSnapshot(
        (snapshot: any) => {
          const fetched = snapshot.docs.map((doc: any) => ({
            id: doc.id,
            ...doc.data()
          }));
          setClasses(fetched);
          setLoading(false);
        },
        (error: any) => {
          console.error("Error fetching bible classes:", error);
          setLoading(false);
        }
      );

    return () => unsubscribe();
  }, []);

  // Update clock every second for the landing screen
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const handleStatClick = (filter: 'ALL' | 'UPCOMING' | 'LIVE') => {
    setHistoryFilter(filter);
    setActiveTab('history');
  };

  const renderDashboard = () => (
    <ScrollView contentContainerStyle={styles.content}>
      
      <View style={styles.statsGrid}>
        <TouchableOpacity 
          style={[styles.statCard, { backgroundColor: '#3b82f6' }]} // Blue
          onPress={() => handleStatClick('ALL')}
          activeOpacity={0.8}
        >
          <View style={styles.statIconWrapper}>
            <Video size={20} color="#3b82f6" />
          </View>
          <Text style={styles.statValueWhite}>{String(classes.length)}</Text>
          <Text style={styles.statLabelWhite}>Total Classes</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.statCard, { backgroundColor: '#f59e0b' }]} // Orange
          onPress={() => handleStatClick('UPCOMING')}
          activeOpacity={0.8}
        >
          <View style={styles.statIconWrapper}>
            <Calendar size={20} color="#f59e0b" />
          </View>
          <Text style={styles.statValueWhite}>
            {String(classes.filter(c => c.status === 'SCHEDULED').length)}
          </Text>
          <Text style={styles.statLabelWhite}>Upcoming</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.statCard, { backgroundColor: '#10b981' }]} // Green
          onPress={() => handleStatClick('LIVE')}
          activeOpacity={0.8}
        >
          <View style={styles.statIconWrapper}>
            <Video size={20} color="#10b981" />
          </View>
          <Text style={styles.statValueWhite}>
            {String(classes.filter(c => c.status === 'LIVE').length)}
          </Text>
          <Text style={styles.statLabelWhite}>Live Now</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.statCard, { backgroundColor: '#8b5cf6' }]} // Purple
          onPress={() => Alert.alert('Members Reached', 'This feature will show total unique attendees soon.')}
          activeOpacity={0.8}
        >
          <View style={styles.statIconWrapper}>
            <Users size={20} color="#8b5cf6" />
          </View>
          <Text style={styles.statValueWhite}>0</Text>
          <Text style={styles.statLabelWhite}>Members Reached</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.recentHeader}>
        <Text style={[styles.sectionTitle, { color: isDark ? '#fff' : '#1e293b', marginTop: 0, marginBottom: 0 }]}>Recent Classes</Text>
        {classes.length > 2 ? (
          <TouchableOpacity onPress={() => handleTabChange('history')} activeOpacity={0.7} style={{ padding: 4 }}>
            <Text style={{ color: '#3b82f6', fontWeight: '600', fontSize: 14 }}>Show More</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      {classes.slice(0, 2).map(c => (
        <TouchableOpacity 
          key={c.id} 
          style={[styles.classRow, { backgroundColor: isDark ? '#1e293b' : '#fff' }]}
          onPress={() => {
            setSelectedClassId(c.id);
            setActiveTab('host');
          }}
        >
          <View>
            <Text style={[styles.classRowTitle, { color: isDark ? '#fff' : '#1e293b' }]}>{String(c.title)}</Text>
            <Text style={styles.classRowSub}>{String(c.date)} • {String(c.status)}</Text>
          </View>
          <View style={[styles.statusDot, { backgroundColor: c.status === 'LIVE' ? '#10b981' : (c.status === 'SCHEDULED' ? '#f59e0b' : '#64748b') }]} />
        </TouchableOpacity>
      ))}

      <View style={{ height: 100 }} />
    </ScrollView>
  );

  const renderCreateLanding = () => {
    const timeString = currentTime.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    const dateString = currentTime.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

    return (
      <View style={styles.landingContainer}>
        
        <View style={[styles.timeBadge, { backgroundColor: isDark ? '#1e293b' : '#fff', borderColor: isDark ? '#475569' : '#cbd5e1', borderWidth: 2 }]}>
          <Text style={[styles.clockTime, { color: isDark ? '#fff' : '#1e293b' }]}>{timeString}</Text>
          <Text style={styles.clockDate}>{dateString}</Text>
        </View>
        
        <TouchableOpacity 
          style={[styles.bigActionCard, { backgroundColor: '#f97316' }]}
          onPress={() => setCreateMode(true)}
          activeOpacity={0.8}
        >
          <View style={styles.bigActionCardHeader}>
            <View style={styles.bigActionCardIconWrapper}>
              <Video size={32} color="#f97316" />
            </View>
            <Text style={styles.bigActionCardTitle}>Schedule New Class</Text>
          </View>
          <Text style={styles.bigActionCardDesc}>
            Guide your congregation deeper into the Word. Tap here to schedule a new Bible class, automatically generate a Google Meet link, and invite members to join in fellowship and study.
          </Text>
        </TouchableOpacity>

      </View>
    );
  };

  const getFilteredClasses = () => {
    if (historyFilter === 'UPCOMING') return classes.filter(c => c.status === 'SCHEDULED');
    if (historyFilter === 'LIVE') return classes.filter(c => c.status === 'LIVE');
    return classes;
  };

  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId);
    if (tabId === 'history') setHistoryFilter('ALL');
    if (tabId === 'create') setCreateMode(false);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: isDark ? '#0f172a' : '#f8fafc' }]} edges={['top']}>
      <StatusBar translucent backgroundColor="transparent" style={isDark ? "light" : "dark"} />
      
      <View style={[styles.header, { backgroundColor: 'transparent', borderBottomWidth: 0 }]}>
        <View style={styles.headerTop}>
          {activeTab === 'host' || createMode ? (
            <TouchableOpacity 
              onPress={() => {
                if (createMode) setCreateMode(false);
                else { setActiveTab('dashboard'); setSelectedClassId(null); }
              }} 
              style={styles.menuBtn}
            >
              <ArrowLeft size={24} color={isDark ? "#fff" : "#1e293b"} />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity onPress={openDrawer} style={styles.menuBtn}>
              <Menu size={24} color={isDark ? "#fff" : "#1e293b"} />
            </TouchableOpacity>
          )}
          
          {activeTab === 'dashboard' ? (
            <Text style={[styles.headerTitle, { color: isDark ? "#fff" : "#1e293b" }]}>Overview</Text>
          ) : (
            <View style={{ width: 24 }} /> // spacer for centering
          )}
          <View style={{ width: 24 }} />
        </View>
      </View>

      {loading ? (
        <View style={styles.loading}>
          <ActivityIndicator size="large" color="#2563eb" />
        </View>
      ) : (
        <View style={{ flex: 1 }}>
          {activeTab === 'dashboard' ? renderDashboard() : null}
          
          {activeTab === 'create' ? (
            createMode ? (
              <AdminBibleClassesCreate onBack={() => { setActiveTab('dashboard'); setCreateMode(false); }} />
            ) : (
              renderCreateLanding()
            )
          ) : null}
          
          {activeTab === 'host' && selectedClassId ? (
            <AdminBibleClassHost 
              classId={selectedClassId} 
              classesList={classes}
              onNavigate={(newId: string) => setSelectedClassId(newId)}
              onBack={() => { setActiveTab('dashboard'); setSelectedClassId(null); }} 
            />
          ) : null}
          
          {activeTab === 'history' ? (
            <ScrollView contentContainerStyle={styles.content}>
              {historyFilter !== 'ALL' ? (
                <View style={styles.filterPill}>
                  <Text style={styles.filterPillText}>Showing: {historyFilter}</Text>
                  <TouchableOpacity onPress={() => setHistoryFilter('ALL')}>
                    <Text style={styles.filterPillClear}>Clear</Text>
                  </TouchableOpacity>
                </View>
              ) : null}
              {getFilteredClasses().length === 0 ? (
                <Text style={[styles.emptyText, { color: isDark ? '#94a3b8' : '#64748b' }]}>No classes found.</Text>
              ) : (
                getFilteredClasses().map(c => (
                  <TouchableOpacity 
                    key={c.id} 
                    style={[
                      styles.historyCard, 
                      { 
                        backgroundColor: isDark ? '#1e293b' : '#fff',
                        borderLeftColor: c.status === 'LIVE' ? '#10b981' : (c.status === 'SCHEDULED' ? '#f59e0b' : '#94a3b8')
                      }
                    ]}
                    onPress={() => {
                      setSelectedClassId(c.id);
                      setActiveTab('host');
                    }}
                    activeOpacity={0.75}
                  >
                    <View style={styles.historyCardHeader}>
                      <Text style={[styles.historyTitle, { color: isDark ? '#fff' : '#1e293b' }]} numberOfLines={1}>
                        {String(c.title)}
                      </Text>
                      <View style={[
                        styles.historyBadge, 
                        { backgroundColor: c.status === 'LIVE' ? 'rgba(16,185,129,0.1)' : (c.status === 'SCHEDULED' ? 'rgba(245,158,11,0.1)' : (isDark ? 'rgba(148,163,184,0.1)' : 'rgba(100,116,139,0.1)')) }
                      ]}>
                        <Text style={[
                          styles.historyBadgeText, 
                          { color: c.status === 'LIVE' ? '#10b981' : (c.status === 'SCHEDULED' ? '#f59e0b' : (isDark ? '#cbd5e1' : '#64748b')) }
                        ]}>
                          {String(c.status)}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.historyCardFooter}>
                      <Calendar size={14} color="#64748b" />
                      <Text style={styles.historySub}>{String(c.date)} • {String(c.startTime)}</Text>
                    </View>
                  </TouchableOpacity>
                ))
              )}
              <View style={{ height: 100 }} />
            </ScrollView>
          ) : null}
        </View>
      )}

      {!loading && !selectedClassId && !createMode ? (
        <View style={[
          styles.floatingTabsContainer, 
          { 
            backgroundColor: isDark ? '#1e293b' : '#fff',
            borderColor: isDark ? '#334155' : '#e2e8f0',
            borderWidth: 1
          }
        ]}>
          {BASE_TABS.map((tab) => {
            const isActive = activeTab === tab.id;
            const Icon = tab.icon;
            
            let activeBgColor = '#2563eb';
            if (tab.id === 'create') activeBgColor = '#f97316';
            if (tab.id === 'history') activeBgColor = '#10b981';

            return (
              <TouchableOpacity
                key={tab.id}
                style={[
                  styles.floatingTab, 
                  isActive ? { backgroundColor: activeBgColor } : null
                ]}
                onPress={() => handleTabChange(tab.id)}
                activeOpacity={0.8}
              >
                <Icon size={20} color={isActive ? "#fff" : (isDark ? "#94a3b8" : "#64748b")} />
                {isActive ? (
                  <Text style={styles.floatingTabText}>
                    {tab.label}
                  </Text>
                ) : null}
              </TouchableOpacity>
            );
          })}
        </View>
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingTop: 8,
    borderBottomWidth: 0,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  menuBtn: { padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: '700' },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  content: { padding: 20 },
  sectionTitle: { fontSize: 20, fontWeight: '700', marginBottom: 16 },
  recentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 32,
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statCard: {
    width: (width - 40 - 12) / 2,
    padding: 14,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  statIconWrapper: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  statValueWhite: {
    fontSize: 22,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 2,
  },
  statLabelWhite: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.85)',
    fontWeight: '600',
  },
  classRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  classRowTitle: { fontSize: 16, fontWeight: '600', marginBottom: 4 },
  classRowSub: { fontSize: 13, color: '#64748b' },
  statusDot: { width: 12, height: 12, borderRadius: 6 },
  
  // History Cards
  historyCard: {
    padding: 16,
    borderRadius: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
    borderLeftWidth: 4,
  },
  historyCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  historyTitle: {
    flex: 1,
    fontSize: 17,
    fontWeight: '700',
    marginRight: 12,
  },
  historyBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  historyBadgeText: {
    fontSize: 11,
    fontWeight: '800',
  },
  historyCardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  historySub: {
    fontSize: 14,
    color: '#64748b',
    fontWeight: '500'
  },
  
  // Landing UI Styles
  landingContainer: {
    flex: 1,
    paddingTop: 16,
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  timeBadge: {
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 100,
    alignItems: 'center',
    alignSelf: 'center',
    marginBottom: 24,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  clockTime: {
    fontSize: 48,
    fontWeight: '300',
    marginBottom: 4,
  },
  clockDate: {
    fontSize: 16,
    color: '#64748b',
    fontWeight: '500',
  },
  bigActionCard: {
    width: '100%',
    padding: 24,
    borderRadius: 24,
    shadowColor: '#f97316',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 15,
    elevation: 8,
    marginBottom: 24,
  },
  bigActionCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  bigActionCardIconWrapper: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  bigActionCardTitle: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '800',
    flex: 1,
  },
  bigActionCardDesc: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 16,
    fontWeight: '500',
    lineHeight: 24,
  },
  
  // History Filter Pill
  filterPill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#eff6ff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#bfdbfe'
  },
  filterPillText: {
    color: '#1e40af',
    fontWeight: '600'
  },
  filterPillClear: {
    color: '#ef4444',
    fontWeight: '700'
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 40,
    fontSize: 15,
  },
  
  // Floating Tabs
  floatingTabsContainer: {
    position: 'absolute',
    bottom: 24,
    alignSelf: 'center',
    flexDirection: 'row',
    padding: 6,
    borderRadius: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 10,
    gap: 4
  },
  floatingTab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 24,
    gap: 8,
  },
  floatingTabText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
  }
});
