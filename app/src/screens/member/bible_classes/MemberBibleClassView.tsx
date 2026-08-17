import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Alert, Linking, Image } from 'react-native';
import { useTheme } from '../../../context/ThemeContext';
import { useAuth } from '../../../context/AuthContext';
import { db } from '../../../services/firebaseConfig';
import firebase from '@react-native-firebase/app';
import { Calendar, Clock, Video, User, ChevronLeft, MapPin } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';

export default function MemberBibleClassView({ route, navigation }: any) {
  const { classId } = route.params || {};
  const { isDark } = useTheme();
  const { member } = useAuth();
  
  const [classData, setClassData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);

  useEffect(() => {
    if (!classId) return;
    const unsub = db.collection(`churches/default/bibleClasses`).doc(classId)
      .onSnapshot(doc => {
        if (doc.data()) {
          setClassData({ id: doc.id, ...doc.data() });
        }
        setLoading(false);
      });
    return () => unsub();
  }, [classId]);

  const handleJoin = async () => {
    const link = classData?.meetingUri || classData?.meetingLink;
    if (!link) return;
    
    setJoining(true);
    try {
      // 1. Record Attendance
      const recordFn = firebase.app().functions('asia-south1').httpsCallable('recordBibleClassAttendance');
      await recordFn({ 
        churchId: 'default', 
        classId: classData.id, 
        memberId: member?.id || 'unknown',
        memberName: member?.name || 'Anonymous Member'
      });
      
      // 2. Open Meet URL
      try {
        await Linking.openURL(link);
      } catch (err) {
        Alert.alert('Error', 'Cannot open Google Meet app. Please make sure it is installed.');
      }
    } catch (e: any) {
      console.error(e);
      // Still try to open URL even if attendance fails (best effort)
      Linking.openURL(link).catch(() => {});
    } finally {
      setJoining(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: isDark ? '#0f172a' : '#f8fafc', justifyContent: 'center' }]}>
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  if (!classData) {
    return (
      <View style={[styles.container, { backgroundColor: isDark ? '#0f172a' : '#f8fafc', justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={{ color: isDark ? '#fff' : '#1e293b' }}>Class not found or has been removed.</Text>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginTop: 20 }}>
          <Text style={{ color: '#2563eb', fontWeight: '600' }}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const isLive = classData.status === 'LIVE';
  const isEnded = classData.status === 'ENDED' || classData.status === 'CANCELLED';

  return (
    <View style={[styles.container, { backgroundColor: isDark ? '#0f172a' : '#f8fafc' }]}>
      <View style={[styles.header, { backgroundColor: isDark ? '#1e293b' : '#fff' }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <ChevronLeft size={24} color={isDark ? "#fff" : "#1e293b"} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: isDark ? "#fff" : "#1e293b" }]}>Class Details</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={[styles.card, { backgroundColor: isDark ? '#1e293b' : '#fff' }]}>
          <View style={styles.cardHeader}>
            <View style={[styles.badge, { backgroundColor: isLive ? 'rgba(16, 185, 129, 0.15)' : (isEnded ? 'rgba(100, 116, 139, 0.15)' : 'rgba(245, 158, 11, 0.15)') }]}>
              {isLive && <View style={styles.liveDot} />}
              <Text style={[styles.badgeText, { color: isLive ? '#10b981' : (isEnded ? '#64748b' : '#f59e0b') }]}>
                {classData.status}
              </Text>
            </View>
            <Text style={styles.dateText}>{classData.date}</Text>
          </View>

          <Text style={[styles.title, { color: isDark ? '#fff' : '#1e293b' }]}>{classData.title}</Text>
          
          <Text style={styles.topicLabel}>Topic</Text>
          <Text style={[styles.topicText, { color: isDark ? '#cbd5e1' : '#475569' }]}>
            {classData.topic || 'N/A'} {classData.bibleBook ? `(${classData.bibleBook})` : ''}
          </Text>

          <View style={styles.infoGrid}>
            <View style={styles.infoItem}>
              <Clock size={20} color="#64748b" />
              <View>
                <Text style={styles.infoSub}>Time</Text>
                <Text style={[styles.infoVal, { color: isDark ? '#fff' : '#1e293b' }]}>{classData.startTime} - {classData.endTime}</Text>
              </View>
            </View>
            <View style={styles.infoItem}>
              <User size={20} color="#64748b" />
              <View>
                <Text style={styles.infoSub}>Teacher</Text>
                <Text style={[styles.infoVal, { color: isDark ? '#fff' : '#1e293b' }]}>{classData.teacherName}</Text>
              </View>
            </View>
          </View>

          {isEnded ? (
            <View style={styles.endedBox}>
              <Text style={styles.endedText}>This class has ended or was cancelled.</Text>
            </View>
          ) : (
            <TouchableOpacity 
              activeOpacity={0.8} 
              onPress={handleJoin}
              disabled={joining}
              style={{ marginTop: 20 }}
            >
              <LinearGradient
                colors={isLive ? ['#10b981', '#059669'] : ['#1a2d5a', '#2a4385']}
                style={styles.joinBtn}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                {joining ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Video size={20} color="#fff" />
                    <Text style={styles.joinBtnText}>
                      {isLive ? 'Join Class Now (Live)' : 'Join Meeting Room'}
                    </Text>
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>
          )}
        </View>

        <Text style={styles.hintText}>
          Tapping Join will open the Google Meet app on your device. Please ensure you have it installed.
        </Text>
      </ScrollView>
    </View>
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
  scroll: { padding: 20 },
  card: {
    borderRadius: 20,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.05,
    shadowRadius: 16,
    elevation: 4,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 100,
    gap: 6,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10b981',
  },
  badgeText: { fontSize: 12, fontWeight: '700' },
  dateText: { fontSize: 14, color: '#64748b', fontWeight: '500' },
  title: { fontSize: 24, fontWeight: '800', marginBottom: 20 },
  topicLabel: { fontSize: 13, color: '#64748b', fontWeight: '600', marginBottom: 4 },
  topicText: { fontSize: 16, marginBottom: 24 },
  infoGrid: { gap: 16, marginBottom: 16 },
  infoItem: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  infoSub: { fontSize: 12, color: '#64748b', fontWeight: '500', marginBottom: 2 },
  infoVal: { fontSize: 15, fontWeight: '600' },
  joinBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 16,
    gap: 10,
  },
  joinBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  endedBox: { backgroundColor: 'rgba(0,0,0,0.04)', padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 20 },
  endedText: { color: '#64748b', fontWeight: '500' },
  hintText: { textAlign: 'center', color: '#94a3b8', fontSize: 13, marginTop: 24, paddingHorizontal: 20, lineHeight: 20 }
});
