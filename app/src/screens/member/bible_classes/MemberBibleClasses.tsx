import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Alert, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { ChevronLeft, Video, Calendar, Clock, Book, User } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../../../context/ThemeContext';
import { useAuth } from '../../../context/AuthContext';
import { db, FieldValue, auth } from '../../../services/firebaseConfig';
import firebase from '@react-native-firebase/app';
import { LinearGradient } from 'expo-linear-gradient';

export default function MemberBibleClasses() {
  const navigation = useNavigation<any>();
  const { isDark, colors } = useTheme();
  const { member } = useAuth();
  
  const [classes, setClasses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('upcoming'); // 'live', 'upcoming', 'completed'
  const [hasSetInitialTab, setHasSetInitialTab] = useState(false);
  const [joinedLiveClasses, setJoinedLiveClasses] = useState<string[]>([]);

  useEffect(() => {
    if (!loading && !hasSetInitialTab && classes.length > 0) {
      const hasLive = classes.some(c => c.status === 'LIVE');
      if (hasLive) {
        setActiveTab('live');
        setHasSetInitialTab(true);
      }
    }
  }, [loading, classes, hasSetInitialTab]);

  useEffect(() => {
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

  const getFilteredClasses = () => {
    return classes.filter(c => {
      if (activeTab === 'live') return c.status === 'LIVE';
      if (activeTab === 'upcoming') return c.status === 'SCHEDULED';
      if (activeTab === 'completed') return c.status === 'ENDED' || c.status === 'CANCELLED';
      return true;
    });
  };

  const renderClassCard = ({ item }: { item: any }) => {
    const isLive = item.status === 'LIVE';
    const isScheduled = item.status === 'SCHEDULED';
    const hasJoined = joinedLiveClasses.includes(item.id);

    return (
      <View style={styles.cardWrapper}>
        <LinearGradient 
          colors={
            isLive ? ['#064e3b', '#10b981'] : 
            (isScheduled ? ['#1e3a8a', '#3b82f6'] : ['#334155', '#64748b'])
          } 
          style={styles.detailsCard}
        >
          <Text style={styles.titleWhite} numberOfLines={2}>{item.title}</Text>
          {item.topic ? (
            <Text style={styles.topicWhite}>{item.topic}</Text>
          ) : null}

          <View style={styles.cardDividerWhite} />

          <View style={styles.infoGrid}>
            <View style={styles.infoRow}>
              <Calendar size={18} color="rgba(255,255,255,0.7)" />
              <Text style={styles.infoTextWhite}>{item.date}</Text>
            </View>
            <View style={styles.infoRow}>
              <Clock size={18} color="rgba(255,255,255,0.7)" />
              <Text style={styles.infoTextWhite}>{item.startTime} - {item.endTime}</Text>
            </View>
            {item.bibleBook ? (
              <View style={styles.infoRow}>
                <Book size={18} color="rgba(255,255,255,0.7)" />
                <Text style={styles.infoTextWhite}>{item.bibleBook}</Text>
              </View>
            ) : null}
            <View style={styles.infoRow}>
              <User size={18} color="rgba(255,255,255,0.7)" />
              <Text style={styles.infoTextWhite}>Host: {item.teacherName || 'Admin'}</Text>
            </View>
          </View>
          
          {item.status === 'ENDED' || item.status === 'CANCELLED' ? (
            <View style={styles.endedBanner}>
              <Text style={styles.endedBannerText}>
                {item.status === 'CANCELLED' ? 'This class was cancelled' : 'This class has ended'}
              </Text>
            </View>
          ) : (
            <View style={[styles.joinBtnWrapper, { flexDirection: 'row', gap: 12 }]}>
              <TouchableOpacity 
                activeOpacity={0.8}
                onPress={() => {
                  let link = item.meetingUri || item.meetingLink;
                  if (link) {
                    if (!link.startsWith('http://') && !link.startsWith('https://')) {
                      link = 'https://' + link;
                    }
                    Linking.openURL(link).then(() => {
                      if (isLive && !hasJoined) {
                        setJoinedLiveClasses(prev => [...prev, item.id]);
                        // Record attendance in Firestore
                        try {
                          const uid = auth().currentUser?.uid || member?.id || 'unknown_' + Math.random().toString(36).substring(7);
                          const memberName = member?.name || 'Unknown Member';
                          db.collection(`churches/default/bibleClasses/${item.id}/attendance`)
                            .doc(uid)
                            .set({
                              memberId: uid,
                              memberName: memberName,
                              joinedAt: FieldValue.serverTimestamp()
                            }, { merge: true });
                        } catch (e) {
                          console.error('Error recording attendance:', e);
                        }
                      }
                    }).catch(err => {
                      Alert.alert('Error', 'Could not open meeting link. Make sure you have a browser or Google Meet installed.');
                    });
                  } else {
                    Alert.alert('Not Available', 'The meeting link for this class has not been provided.');
                  }
                }}
              >
                <View style={[
                  styles.joinBtnInner, 
                  { 
                    backgroundColor: isLive ? '#fff' : 'rgba(255,255,255,0.1)',
                    borderColor: isLive ? '#fff' : 'rgba(255,255,255,0.4)',
                  }
                ]}>
                  <Video size={16} color={isLive ? "#059669" : "#fff"} style={{ marginRight: 6 }} />
                  <Text style={[styles.joinBtnText, { color: isLive ? '#059669' : '#fff' }]}>
                    {isLive ? (hasJoined ? 'Joined' : 'Join Live Class') : 'Join Meeting Room'}
                  </Text>
                </View>
              </TouchableOpacity>
              
              {hasJoined && (
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => {
                    Alert.alert('Leave Class', 'Mark yourself as exited from this session?', [
                      { text: 'Cancel', style: 'cancel' },
                      { text: 'Leave', style: 'destructive', onPress: () => {
                          setJoinedLiveClasses(prev => prev.filter(id => id !== item.id));
                          try {
                            const uid = auth().currentUser?.uid || member?.id;
                            if (uid) {
                              db.collection(`churches/default/bibleClasses/${item.id}/attendance`)
                                .doc(uid)
                                .update({
                                  exitedAt: FieldValue.serverTimestamp()
                                });
                            }
                          } catch (e) {
                            console.error('Error exiting:', e);
                          }
                      }}
                    ]);
                  }}
                >
                  <View style={[styles.joinBtnInner, { backgroundColor: 'transparent', borderColor: 'rgba(255,255,255,0.3)' }]}>
                    <Text style={[styles.joinBtnText, { color: '#fff' }]}>Leave</Text>
                  </View>
                </TouchableOpacity>
              )}
            </View>
          )}
        </LinearGradient>
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: isDark ? '#0f172a' : '#f8fafc' }]} edges={['top']}>
      <StatusBar style={isDark ? "light" : "dark"} />
      
      {/* HEADER */}
      <View style={[styles.header, { backgroundColor: isDark ? '#1e293b' : '#fff' }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <ChevronLeft size={24} color={isDark ? "#fff" : "#1e293b"} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: isDark ? "#fff" : "#1e293b" }]}>Online Bible Classes</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* TABS */}
      <View style={styles.tabsContainer}>
        {['live', 'upcoming', 'completed'].map(tab => (
          <TouchableOpacity 
            key={tab}
            style={[
              styles.tabBtn, 
              activeTab === tab && styles.tabBtnActive,
              activeTab === tab && { backgroundColor: isDark ? '#334155' : '#e2e8f0' }
            ]}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[
              styles.tabText, 
              { color: isDark ? '#94a3b8' : '#64748b' },
              activeTab === tab && { color: isDark ? '#fff' : '#1e293b', fontWeight: '700' }
            ]}>
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* CONTENT */}
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#2563eb" />
        </View>
      ) : getFilteredClasses().length === 0 ? (
        <View style={styles.center}>
          <Calendar size={48} color={isDark ? "#334155" : "#cbd5e1"} />
          <Text style={[styles.emptyText, { color: isDark ? "#94a3b8" : "#64748b" }]}>
            No classes found for this category.
          </Text>
        </View>
      ) : (
        <FlatList
          data={getFilteredClasses()}
          keyExtractor={item => item.id}
          renderItem={renderClassCard}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  backBtn: { padding: 8, marginLeft: -8 },
  headerTitle: { fontSize: 18, fontWeight: '700' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  emptyText: { fontSize: 15, textAlign: 'center', marginTop: 16, lineHeight: 22 },
  listContent: { padding: 16, gap: 16 },
  cardWrapper: {
    marginBottom: 16,
  },
  detailsCard: { 
    padding: 24, 
    borderRadius: 20, 
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 15,
    elevation: 6,
  },
  titleWhite: { fontSize: 26, fontWeight: '800', marginBottom: 6, color: '#fff' },
  topicWhite: { fontSize: 16, color: '#bfdbfe', fontWeight: '500' },
  cardDividerWhite: { height: 1, backgroundColor: 'rgba(255,255,255,0.2)', marginVertical: 16 },
  infoGrid: { gap: 14 },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  infoTextWhite: { fontSize: 16, fontWeight: '600', color: '#fff' },
  endedBanner: {
    marginTop: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  endedBannerText: { color: '#fff', fontWeight: '700', fontSize: 14, textTransform: 'uppercase', letterSpacing: 0.5 },
  joinBtnWrapper: {
    marginTop: 24,
    alignItems: 'flex-start',
  },
  joinBtnInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
  },
  joinBtnText: {
    fontSize: 14,
    fontWeight: '700',
  },
  tabsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginTop: 16,
    marginBottom: 8,
    gap: 8,
  },
  tabBtn: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: 'transparent',
  },
  tabBtnActive: {
    backgroundColor: 'rgba(0,0,0,0.05)',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
