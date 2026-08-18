import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Alert, Linking, PanResponder, ToastAndroid, Platform } from 'react-native';
import { useTheme } from '../../../context/ThemeContext';
import { db } from '../../../services/firebaseConfig';
import firebase from '@react-native-firebase/app';
import { Video, Calendar, Clock, Users, Play, Square, XCircle, Book, User, Trash } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { GoogleSignin } from '@react-native-google-signin/google-signin';

GoogleSignin.configure({
  scopes: ['https://www.googleapis.com/auth/meetings.space.created'],
  webClientId: '610167013138-44leu198o42ms4q6eh9o8giemj15hltn.apps.googleusercontent.com',
  offlineAccess: true,
});

export default function AdminBibleClassHost({ classId, classesList, onNavigate, onBack }: { classId: string, classesList?: any[], onNavigate?: (id: string) => void, onBack: () => void }) {
  const { isDark } = useTheme();
  
  const [classData, setClassData] = useState<any>(null);
  const [attendance, setAttendance] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    if (!classId) return;

    const unsubClass = db.collection(`churches/default/bibleClasses`).doc(classId)
      .onSnapshot(doc => {
        if (doc.data()) {
          setClassData({ id: doc.id, ...doc.data() });
        }
        setLoading(false);
      });

    const unsubAttendance = db.collection(`churches/default/bibleClasses/${classId}/attendance`)
      .orderBy('joinedAt', 'desc')
      .onSnapshot(snapshot => {
        setAttendance(snapshot.docs.map(d => d.data()));
      });

    return () => {
      unsubClass();
      unsubAttendance();
    };
  }, [classId]);

  const stateRef = React.useRef({ classId, classesList, onNavigate });
  
  useEffect(() => {
    stateRef.current = { classId, classesList, onNavigate };
  }, [classId, classesList, onNavigate]);

  const panResponder = React.useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (evt, gestureState) => {
        // Require a clear horizontal swipe, ignoring vertical scrolls
        return Math.abs(gestureState.dx) > 30 && Math.abs(gestureState.dx) > Math.abs(gestureState.dy);
      },
      onPanResponderRelease: (evt, gestureState) => {
        const { classId: currentId, classesList: list, onNavigate: navFn } = stateRef.current;
        if (!list || !navFn) return;
        
        const currentIndex = list.findIndex(c => c.id === currentId);
        if (currentIndex === -1) return;

        // Swiped Right -> Go to previous (newer) class
        if (gestureState.dx > 80) {
          if (currentIndex > 0) {
            navFn(list[currentIndex - 1].id);
          } else {
            if (Platform.OS === 'android') {
              ToastAndroid.show("This is the most recent class.", ToastAndroid.SHORT);
            } else {
              Alert.alert("Most Recent", "This is the most recent class.");
            }
          }
        }
        // Swiped Left -> Go to next (older) class
        else if (gestureState.dx < -80) {
          if (currentIndex < list.length - 1) {
            navFn(list[currentIndex + 1].id);
          } else {
            if (Platform.OS === 'android') {
              ToastAndroid.show("You have reached the oldest class.", ToastAndroid.SHORT);
            } else {
              Alert.alert("End of History", "You have reached the oldest class.");
            }
          }
        }
      },
    })
  ).current;

  const updateStatus = async (status: string) => {
    setUpdating(true);
    try {
      if (status === 'ENDED') {
        const link = classData?.meetingUri || classData?.meetingLink;
        if (link && link.includes('meet.google.com/')) {
          try {
            const pathPart = link.split('?')[0];
            const spaceId = pathPart.split('/').pop();
            
            await GoogleSignin.hasPlayServices();
            await GoogleSignin.signInSilently();
            const tokens = await GoogleSignin.getTokens();
            
            if (tokens.accessToken && spaceId) {
              await fetch(`https://meet.googleapis.com/v2/spaces/${spaceId}:endActiveConference`, {
                method: 'POST',
                headers: {
                  Authorization: `Bearer ${tokens.accessToken}`,
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify({})
              });
              // We don't alert on failure because consumer accounts (non-Workspace) 
              // often return 403 Permission Denied for this endpoint.
            }
          } catch (meetErr: any) {
            console.warn('Silent fail ending Meet call programmatically:', meetErr.message);
          }
        }
      }

      const updateFn = firebase.app().functions('asia-south1').httpsCallable('updateBibleClassStatus');
      await updateFn({ churchId: 'default', classId, status });
      Alert.alert('Status Updated', `Class is now ${status}`);
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to update status');
    } finally {
      setUpdating(false);
    }
  };

  const handleStartClass = async () => {
    if (classData?.meetingUri || classData?.meetingLink) {
      let link = classData.meetingUri || classData.meetingLink;
      if (!link.startsWith('http://') && !link.startsWith('https://')) {
        link = 'https://' + link;
      }
      try {
        await Linking.openURL(link);
        updateStatus('LIVE');
      } catch (err) {
        Alert.alert('Error', 'Cannot open Google Meet link. Make sure a browser or the Meet app is installed.');
      }
    } else {
      Alert.alert('Error', 'No meeting link found for this class.');
    }
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Class', 
      'Are you sure you want to permanently delete this class? This cannot be undone.', 
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive', 
          onPress: async () => {
            try {
              setUpdating(true);
              await db.collection('churches/default/bibleClasses').doc(classId).delete();
              onBack();
            } catch (e: any) {
              Alert.alert('Error', e.message);
              setUpdating(false);
            }
          } 
        }
      ]
    );
  };

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" color="#2563eb" /></View>;
  }

  if (!classData) {
    return <View style={styles.center}><Text>Class not found.</Text></View>;
  }

  return (
    <View style={styles.container} {...panResponder.panHandlers}>
      <ScrollView contentContainerStyle={styles.scroll}>
        
        <LinearGradient colors={['#1e3a8a', '#3b82f6']} style={styles.detailsCard}>
          <Text style={styles.titleWhite} numberOfLines={2}>{classData.title}</Text>
          {classData.topic ? (
            <Text style={styles.topicWhite}>{classData.topic}</Text>
          ) : null}

          <View style={styles.cardDividerWhite} />

          <View style={styles.infoGrid}>
            <View style={styles.infoRow}>
              <Calendar size={18} color="rgba(255,255,255,0.7)" />
              <Text style={styles.infoTextWhite}>{classData.date}</Text>
            </View>
            <View style={styles.infoRow}>
              <Clock size={18} color="rgba(255,255,255,0.7)" />
              <Text style={styles.infoTextWhite}>{classData.startTime} - {classData.endTime}</Text>
            </View>
            {classData.bibleBook ? (
              <View style={styles.infoRow}>
                <Book size={18} color="rgba(255,255,255,0.7)" />
                <Text style={styles.infoTextWhite}>{classData.bibleBook}</Text>
              </View>
            ) : null}
            {classData.teacherName ? (
              <View style={styles.infoRow}>
                <User size={18} color="rgba(255,255,255,0.7)" />
                <Text style={styles.infoTextWhite}>Host: {classData.teacherName}</Text>
              </View>
            ) : null}
          </View>
          
          {classData.status === 'ENDED' && (
            <View style={styles.endedBanner}>
              <Text style={styles.endedBannerText}>This class has ended</Text>
            </View>
          )}
        </LinearGradient>

        {classData.status === 'SCHEDULED' && (
          <TouchableOpacity onPress={handleStartClass} activeOpacity={0.8}>
            <LinearGradient colors={['#10b981', '#059669']} style={styles.actionBtn}>
              <Play size={20} color="#fff" />
              <Text style={styles.actionBtnText}>Start Class & Open Meet</Text>
            </LinearGradient>
          </TouchableOpacity>
        )}

        {classData.status === 'LIVE' && (
          <View style={styles.actionRow}>
            <TouchableOpacity onPress={() => Linking.openURL(classData?.meetingUri || classData?.meetingLink)} style={[styles.actionBtnSolid, { backgroundColor: '#2563eb', flex: 1 }]}>
              <Video size={18} color="#fff" />
              <Text style={styles.actionBtnText}>Return to Meet</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => updateStatus('ENDED')} style={[styles.actionBtnSolid, { backgroundColor: '#ef4444', flex: 1 }]}>
              <Square size={18} color="#fff" />
              <Text style={styles.actionBtnText}>End Class</Text>
            </TouchableOpacity>
          </View>
        )}

        {classData.status === 'SCHEDULED' && (
          <TouchableOpacity onPress={() => updateStatus('CANCELLED')} style={styles.cancelBtn}>
            <XCircle size={18} color="#ef4444" />
            <Text style={styles.cancelBtnText}>Cancel Class</Text>
          </TouchableOpacity>
        )}

        <View style={styles.divider} />

        <TouchableOpacity onPress={handleDelete} style={styles.deleteBtn}>
          <Trash size={18} color="#ef4444" />
          <Text style={styles.deleteBtnText}>Delete Class Record</Text>
        </TouchableOpacity>

        <View style={styles.divider} />

        <View style={styles.attendanceHeader}>
          <Users size={20} color={isDark ? "#fff" : "#1e293b"} />
          <Text style={[styles.sectionTitle, { color: isDark ? '#fff' : '#1e293b' }]}>Live Attendance ({attendance.length})</Text>
        </View>

        {attendance.length === 0 ? (
          <View style={styles.emptyAttendance}>
            <Text style={styles.emptyText}>No members have joined yet.</Text>
          </View>
        ) : (
          attendance.map((mem, i) => (
            <View key={i} style={[styles.attItem, { borderBottomColor: isDark ? '#334155' : '#e2e8f0' }]}>
              <View style={styles.attAvatar}>
                <Text style={styles.attAvatarTxt}>{mem.memberName?.charAt(0) || '?'}</Text>
              </View>
              <View>
                <Text style={[styles.attName, { color: isDark ? '#fff' : '#1e293b' }]}>{mem.memberName}</Text>
                <Text style={styles.attTime}>
                  Joined {new Date(mem.joinedAt?.toDate()).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}
                  {mem.exitedAt ? ` • Left ${new Date(mem.exitedAt?.toDate()).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}` : ''}
                </Text>
              </View>
            </View>
          ))
        )}

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scroll: { padding: 20, paddingBottom: 100 },
  detailsCard: { 
    padding: 24, 
    borderRadius: 20, 
    marginBottom: 24,
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 15,
    elevation: 8,
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
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    alignItems: 'center',
  },
  endedBannerText: { color: '#fff', fontWeight: '700', fontSize: 14, textTransform: 'uppercase', letterSpacing: 0.5 },
  actionBtn: { flexDirection: 'row', padding: 18, borderRadius: 12, alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 16 },
  actionRow: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  actionBtnSolid: { flexDirection: 'row', padding: 18, borderRadius: 12, alignItems: 'center', justifyContent: 'center', gap: 10 },
  actionBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  cancelBtn: { flexDirection: 'row', padding: 16, borderRadius: 12, alignItems: 'center', justifyContent: 'center', gap: 10, borderWidth: 1, borderColor: '#ef4444' },
  cancelBtnText: { color: '#ef4444', fontSize: 16, fontWeight: '600' },
  deleteBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 8 },
  deleteBtnText: { color: '#ef4444', fontSize: 15, fontWeight: '600' },
  divider: { height: 1, backgroundColor: 'rgba(0,0,0,0.1)', marginVertical: 24 },
  sectionTitle: { fontSize: 18, fontWeight: '700', marginLeft: 10 },
  attendanceHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  emptyAttendance: { padding: 20, alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.02)', borderRadius: 12 },
  emptyText: { color: '#94a3b8' },
  attItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1 },
  attAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#e2e8f0', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  attAvatarTxt: { fontSize: 16, fontWeight: '700', color: '#64748b' },
  attName: { fontSize: 15, fontWeight: '600', marginBottom: 2 },
  attTime: { fontSize: 12, color: '#64748b' },
});
