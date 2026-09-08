import React, { useState, useEffect, useContext } from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  TouchableOpacity, 
  ScrollView, 
  Dimensions, 
  Platform,
  ActivityIndicator,
  RefreshControl,
  Image,
  TextInput
} from 'react-native';
import firestore from '@react-native-firebase/firestore';
import { Users, Menu, Search, CheckCircle, XCircle, Crown, ShieldAlert, Sparkles, Calendar, Clock } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { AdminTabContext } from '../../context/AdminTabContext';
import { useTheme } from '../../context/ThemeContext';

const SubscriptionCard = ({ sub, onRevoke, onOverride, colors, isDark, styles }: any) => {
  const isActive = sub.status === 'ACTIVE';
  const isOverride = sub.plan === 'admin_override';
  
  let descriptionText = '';
  if (isActive) {
    const startStr = sub.startDate && !isNaN(sub.startDate.getTime()) ? sub.startDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : 'an unknown date';
    const endStr = sub.endDate && !isNaN(sub.endDate.getTime()) ? sub.endDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : 'an unknown date';
    descriptionText = `This subscription started on ${startStr} and expires on ${endStr}.`;
  } else {
    const startStr = sub.startDate && !isNaN(sub.startDate.getTime()) ? sub.startDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : 'an unknown date';
    descriptionText = `This subscription is free and was created on ${startStr}.`;
  }

  const getPlanPrice = () => {
    if (isOverride) return 'MANUAL';
    if (sub.plan === 'monthly_10') return '$10/month';
    if (sub.plan === 'yearly_120') return '$120/year';
    return 'FREE';
  };

  return (
    <View style={styles.cardWrapper}>
      <LinearGradient
        key={`${sub.uid}-${sub.status}`} // Force full remount on status change to prevent React Native layout glitches
        colors={isActive 
          ? (isDark ? ['#1e3a8a', '#312e81'] : ['#dbeafe', '#e0e7ff']) 
          : (isDark ? ['#1e293b', '#334155'] : ['#ffffff', '#f1f5f9'])}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.card, isActive && styles.cardActive]}
      >
        
        <View style={styles.ribbonContainer}>
          <View style={[styles.ribbon, isActive ? styles.ribbonActive : styles.ribbonExpired]}>
            <Text style={[styles.ribbonText, isActive ? { color: '#78350f' } : { color: '#334155' }]}>
              {isActive ? 'PREMIUM' : 'FREE'}
            </Text>
          </View>
        </View>

        <View style={styles.cardHeader}>
          <View style={styles.userInfo}>
            <View style={styles.avatarContainer}>
              {sub.user.photoURL ? (
                <Image source={{ uri: sub.user.photoURL }} style={[styles.avatar, isActive && { borderColor: isDark ? 'rgba(255,255,255,0.4)' : '#60a5fa' }]} />
              ) : (
                <View style={[styles.avatarPlaceholder, isActive && { backgroundColor: isDark ? 'rgba(255,255,255,0.2)' : '#bfdbfe', borderColor: isDark ? 'rgba(255,255,255,0.3)' : '#93c5fd' }]}>
                  <Users size={20} color={isActive ? (isDark ? '#ffffff' : '#1e3a8a') : '#94a3b8'} />
                </View>
              )}
              {isActive && (
                <View style={[styles.activeIndicatorIcon, { borderColor: 'transparent', backgroundColor: '#fbbf24' }]}>
                  <Sparkles size={10} color="#92400e" />
                </View>
              )}
            </View>
            <View style={{ marginLeft: 14, marginRight: 80, justifyContent: 'center' }}>
              <Text style={[styles.userName, { color: isDark ? '#ffffff' : '#0f172a' }]} numberOfLines={1}>
                {sub.user.name || 'Unknown User'}
              </Text>
              <Text style={[styles.userPhone, { color: isDark ? '#94a3b8' : '#64748b' }]}>
                {sub.user.phone || 'No Phone'}
              </Text>
            </View>
          </View>
        </View>
        
        <Text style={[styles.planAccessText, { color: isDark ? '#cbd5e1' : '#0f172a' }]}>
           {isActive ? 'FULL ACCESS' : 'BASIC ACCESS'}
        </Text>

        <Text style={[styles.priceHeader, { color: isDark ? '#ffffff' : '#000000' }]}>
          {getPlanPrice()}
        </Text>

        <Text style={[styles.descriptionText, { color: isDark ? '#cbd5e1' : '#334155' }]}>
          {descriptionText}
        </Text>

        {sub.plan === 'admin_override' ? (
          <TouchableOpacity 
            style={[styles.actionBtn, styles.revokeBtn]} 
            onPress={() => onRevoke(sub.uid)}
          >
            <Text style={styles.revokeBtnText}>Revoke Override</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity 
            style={styles.actionBtn} 
            onPress={() => onOverride(sub.uid)}
          >
            <Text style={styles.actionBtnText}>Manual Override (+30 Days)</Text>
          </TouchableOpacity>
        )}
      </LinearGradient>
    </View>
  );
};

const { width } = Dimensions.get('window');

export default function AdminSubscriptionsMain() {
  const { isDark, colors } = useTheme();
  const { openDrawer } = useContext(AdminTabContext) as any;
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [subscriptions, setSubscriptions] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('ACTIVE');
  
  const styles = getStyles(colors, isDark);

  const fetchSubscriptions = async () => {
    try {
      // 1. Fetch all users
      const usersSnap = await firestore().collection('users').get();
      const usersMap = new Map();
      usersSnap.forEach(doc => {
        usersMap.set(doc.id, { id: doc.id, ...doc.data() });
      });

      // 2. Fetch all subscriptions
      const subsSnap = await firestore().collectionGroup('subscription').get();
      const subDocsMap = new Map();
      subsSnap.forEach(doc => {
        if (doc.id === 'current') {
          const uid = doc.ref.parent.parent?.id;
          if (uid) {
            subDocsMap.set(uid, doc.data());
          }
        }
      });

      // 3. Merge
      const subs: any[] = [];
      usersMap.forEach((userData, uid) => {
        const subData = subDocsMap.get(uid);
        
        let startD = null;
        let endD = null;
        if (subData) {
          if (subData.startDate) {
            startD = typeof subData.startDate.toDate === 'function' ? subData.startDate.toDate() : new Date(subData.startDate);
          }
          if (subData.endDate) {
            endD = typeof subData.endDate.toDate === 'function' ? subData.endDate.toDate() : new Date(subData.endDate);
          }
        }

        subs.push({
          uid,
          status: subData?.status || 'FREE',
          endDate: endD,
          startDate: startD,
          plan: subData?.plan || 'Free Plan',
          user: userData || {}
        });
      });
      
      setSubscriptions(subs);
    } catch (err) {
      console.error('Error fetching subscriptions:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchSubscriptions();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchSubscriptions();
  };

  const filteredSubs = subscriptions.filter(sub => {
    // 1. Search Query
    if (searchQuery) {
      const searchLower = searchQuery.toLowerCase();
      const name = (sub.user.name || '').toLowerCase();
      const phone = (sub.user.phone || '').toLowerCase();
      if (!name.includes(searchLower) && !phone.includes(searchLower)) return false;
    }

    // 2. Filter Tabs
    const now = new Date();
    if (filterType === 'ACTIVE') {
      return sub.status === 'ACTIVE';
    }
    if (filterType === 'EXPIRED') {
      return sub.status === 'ACTIVE' && sub.endDate && sub.endDate < now;
    }
    if (filterType === 'FREE') {
      return sub.status !== 'ACTIVE';
    }
    
    return true;
  });

  return (
    <View style={styles.container}>
      <ScrollView 
        stickyHeaderIndices={[1]}
        contentContainerStyle={{ paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      >
        {/* Child 0: Header (Scrolls away) */}
        <View style={styles.headerTopRow}>
          <View style={styles.headerTitleContainer}>
            <TouchableOpacity onPress={openDrawer} style={styles.menuButton}>
              <Menu color={isDark ? "#fff" : colors.primary} size={24} />
            </TouchableOpacity>
            <View style={styles.iconContainer}>
              <Users size={20} color={isDark ? "#fcd34d" : "#fff"} />
            </View>
            <Text style={styles.headerTitle}>Subscriptions</Text>
          </View>
        </View>

        {/* Child 1: Search & Filters (Sticks to top) */}
        <View style={styles.stickySection}>
          <View style={styles.searchContainer}>
            <Search size={20} color="#94a3b8" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search by name or phone..."
              placeholderTextColor="#94a3b8"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>
          
          <View style={styles.segmentedControl}>
            {['ACTIVE', 'EXPIRED', 'FREE'].map((f) => (
              <TouchableOpacity 
                key={f}
                style={[styles.segmentBtn, filterType === f && { backgroundColor: isDark ? '#3b82f6' : colors.primary }]}
                onPress={() => setFilterType(f)}
              >
                <Text style={[styles.segmentBtnText, filterType === f && { color: '#ffffff', fontWeight: 'bold' }]}>
                  {f}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Child 2: List */}
        <View style={styles.scrollContent}>
          {loading ? (
          <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 40 }} />
        ) : filteredSubs.length === 0 ? (
          <View style={styles.emptyState}>
            <Users size={48} color={isDark ? '#334155' : '#cbd5e1'} />
            <Text style={styles.emptyText}>No subscriptions found.</Text>
          </View>
        ) : (
          filteredSubs.map((sub, index) => (
            <SubscriptionCard 
              key={sub.uid} 
              sub={sub} 
              colors={colors} 
              isDark={isDark} 
              styles={styles}
              onRevoke={async (uid: string) => {
                try {
                  await firestore().collection('users').doc(uid).collection('subscription').doc('current').delete();
                  alert('Manual override revoked. User is now on FREE plan.');
                  fetchSubscriptions();
                } catch (e) {
                  alert('Error revoking subscription override');
                }
              }}
              onOverride={async (uid: string) => {
                try {
                  const d = new Date();
                  d.setDate(d.getDate() + 30);
                  await firestore().collection('users').doc(uid).collection('subscription').doc('current').set({
                    status: 'ACTIVE',
                    startDate: new Date(),
                    endDate: d,
                    plan: 'admin_override'
                  }, { merge: true });
                  alert('Subscription overridden to ACTIVE for 30 days');
                  fetchSubscriptions();
                } catch (e) {
                  alert('Error overriding subscription');
                }
              }}
            />
          ))
        )}
        </View>
      </ScrollView>
    </View>
  );
}

const getStyles = (colors: any, isDark: boolean) => StyleSheet.create({
  actionBtn: {
    marginTop: 24,
    backgroundColor: isDark ? 'rgba(59, 130, 246, 0.15)' : '#eff6ff',
    paddingVertical: 14,
    borderRadius: 24,
    alignItems: 'center',
  },
  actionBtnText: {
    color: '#3b82f6',
    fontWeight: '700',
    fontSize: 15,
  },
  revokeBtn: {
    backgroundColor: isDark ? 'rgba(239, 68, 68, 0.15)' : '#fef2f2',
  },
  revokeBtnText: {
    color: '#ef4444',
    fontWeight: '700',
    fontSize: 15,
  },
  container: {
    flex: 1,
    backgroundColor: isDark ? '#0f172a' : '#f8fafc',
  },
  headerTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
  },
  headerTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  menuButton: {
    padding: 8,
    marginRight: 8,
    marginLeft: -8,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: isDark ? '#334155' : colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: isDark ? '#fff' : '#1e293b',
  },
  stickySection: {
    backgroundColor: isDark ? '#0f172a' : '#f8fafc',
    paddingTop: 10,
    paddingBottom: 4,
    zIndex: 10,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: isDark ? '#1e293b' : '#f1f5f9',
    borderRadius: 16,
    paddingHorizontal: 16,
    height: 50,
    marginHorizontal: 20,
    marginBottom: 16,
  },
  searchInput: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
    color: isDark ? '#f8fafc' : '#0f172a',
  },
  segmentedControl: {
    flexDirection: 'row',
    backgroundColor: isDark ? '#1e293b' : '#e2e8f0',
    borderRadius: 12,
    marginHorizontal: 20,
    padding: 4,
    marginBottom: 10,
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentBtnText: {
    fontSize: 13,
    color: isDark ? '#cbd5e1' : '#475569',
    fontWeight: '600',
  },
  scrollContent: {
    padding: 20,
    paddingTop: 10,
  },
  cardWrapper: {
    marginBottom: 20,
    borderRadius: 24,
    shadowColor: isDark ? '#000' : '#4f46e5',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: isDark ? 0.5 : 0.15,
    shadowRadius: 20,
    elevation: 6,
  },
  card: {
    borderRadius: 24,
    padding: 24,
    backgroundColor: isDark ? '#1e293b' : '#ffffff',
    overflow: 'hidden',
    position: 'relative',
  },
  cardActive: {
    borderColor: isDark ? '#3b82f6' : '#bfdbfe',
    borderWidth: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
    position: 'relative',
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatarContainer: {
    position: 'relative',
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 2,
    borderColor: isDark ? '#334155' : '#e2e8f0',
  },
  avatarPlaceholder: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: isDark ? '#334155' : '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: isDark ? '#1e293b' : '#fff',
  },
  activeIndicatorIcon: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
  },
  userName: {
    fontSize: 18,
    fontWeight: '800',
    color: isDark ? '#f8fafc' : '#0f172a',
    marginBottom: 4,
  },
  userPhone: {
    fontSize: 14,
    color: isDark ? '#94a3b8' : '#64748b',
    fontWeight: '500',
  },
  ribbonContainer: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 80,
    height: 80,
    overflow: 'hidden',
    borderTopRightRadius: 24,
    zIndex: 10,
  },
  ribbon: {
    position: 'absolute',
    top: 16,
    right: -32,
    width: 120,
    transform: [{ rotate: '45deg' }],
    paddingVertical: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ribbonActive: {
    backgroundColor: '#fcd34d', // Vibrant Gold
  },
  ribbonExpired: {
    backgroundColor: isDark ? '#64748b' : '#cbd5e1', // Sleek Gray
  },
  ribbonText: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  planAccessText: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
    color: '#000000',
    marginTop: 2,
    marginBottom: 16,
  },
  priceHeader: {
    fontSize: 36,
    fontWeight: '700',
    marginBottom: 16,
  },
  descriptionText: {
    fontSize: 14,
    lineHeight: 22,
    marginBottom: 4,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 60,
  },
  emptyText: {
    marginTop: 16,
    fontSize: 16,
    color: isDark ? '#94a3b8' : '#64748b',
    fontWeight: '500',
  }
});
