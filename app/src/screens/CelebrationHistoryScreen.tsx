import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  SafeAreaView, StatusBar, ActivityIndicator, Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import firestore from '@react-native-firebase/firestore';
import { useNavigation } from '@react-navigation/native';
import { ArrowLeft, Calendar, MessageCircle, ChevronRight } from 'lucide-react-native';

interface HistoryEntry {
  dateKey: string;
  displayDate: string;
  celebrationTypes: string[];
  celebrationCount: number;
  messageCount: number;
  isLive: boolean;
}

const TYPE_EMOJI: Record<string, string> = {
  birthday: '🎂',
  wedding: '💍',
  baptism: '💧',
};
const TYPE_LABEL: Record<string, string> = {
  birthday: 'Birthday',
  wedding: 'Wedding Anniversary',
  baptism: 'Baptism Anniversary',
};

function formatDisplayDate(dateKey: string): string {
  const [y, m, d] = dateKey.split('-').map(Number);
  const months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  return `${d} ${months[m - 1]} ${y}`;
}

function isToday(dateKey: string): boolean {
  const t = new Date();
  const y = t.getFullYear();
  const m = String(t.getMonth() + 1).padStart(2, '0');
  const d = String(t.getDate()).padStart(2, '0');
  return dateKey === `${y}-${m}-${d}`;
}

export default function CelebrationHistoryScreen() {
  const navigation = useNavigation<any>();
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = firestore()
      .collection('daily_celebration_chats')
      .orderBy(firestore.FieldPath.documentId(), 'desc')
      .limit(60)
      .onSnapshot(snap => {
        if (!snap) return;
        const entries: HistoryEntry[] = snap.docs.map(doc => {
          const data = doc.data();
          return {
            dateKey: doc.id,
            displayDate: formatDisplayDate(doc.id),
            celebrationTypes: data.celebrationTypes || [],
            celebrationCount: data.celebrationCount || 0,
            messageCount: data.messageCount || 0,
            isLive: data.isLive ?? true,
          };
        });
        setHistory(entries);
        setLoading(false);
      }, () => setLoading(false));
    return () => unsub();
  }, []);

  const renderItem = ({ item }: { item: HistoryEntry }) => {
    const today = isToday(item.dateKey);
    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => navigation.navigate('DailyCelebrationChat', { dateKey: item.dateKey })}
        activeOpacity={0.8}
      >
        <LinearGradient
          colors={['rgba(255,255,255,0.06)', 'rgba(255,255,255,0.02)']}
          style={styles.cardInner}
        >
          {/* Left accent */}
          <LinearGradient
            colors={today ? ['#fbbf24', '#d97706'] : ['#334155', '#1e293b']}
            style={styles.cardAccent}
          />

          {/* Date */}
          <View style={styles.cardDateCol}>
            <Calendar size={14} color={today ? '#fbbf24' : '#64748b'} />
            <Text style={[styles.cardDate, today && { color: '#fbbf24' }]}>
              {item.displayDate}
            </Text>
            {today && (
              <View style={styles.todayBadge}>
                <Text style={styles.todayBadgeText}>TODAY</Text>
              </View>
            )}
          </View>

          {/* Celebration types */}
          <View style={styles.cardTypes}>
            {item.celebrationTypes.map(t => (
              <View key={t} style={styles.typePill}>
                <Text style={styles.typeEmoji}>{TYPE_EMOJI[t] || '🎉'}</Text>
                <Text style={styles.typeLabel}>{TYPE_LABEL[t] || t}</Text>
              </View>
            ))}
          </View>

          {/* Message count */}
          <View style={styles.cardMeta}>
            <MessageCircle size={12} color="#64748b" />
            <Text style={styles.cardMetaText}>{item.messageCount} wishes</Text>
          </View>

          <ChevronRight size={16} color="#475569" />
        </LinearGradient>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor="#060e1e" />
      <LinearGradient colors={['#060e1e', '#0a1628']} style={StyleSheet.absoluteFill} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <ArrowLeft size={20} color="#f8fafc" />
        </TouchableOpacity>
        <View>
          <Text style={styles.headerTitle}>📅 Celebration History</Text>
          <Text style={styles.headerSub}>Past daily celebrations</Text>
        </View>
      </View>

      <LinearGradient
        colors={['transparent', 'rgba(251,191,36,0.4)', 'transparent']}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
        style={{ height: 1 }}
      />

      {loading ? (
        <View style={styles.loading}>
          <ActivityIndicator color="#fbbf24" />
        </View>
      ) : history.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyEmoji}>📭</Text>
          <Text style={styles.emptyTitle}>No History Yet</Text>
          <Text style={styles.emptySub}>Celebration chats will appear here after they end.</Text>
        </View>
      ) : (
        <FlatList
          data={history}
          keyExtractor={item => item.dateKey}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#060e1e' },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'android' ? 16 : 8,
    paddingBottom: 14,
  },
  backBtn: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.07)',
    justifyContent: 'center', alignItems: 'center',
  },
  headerTitle: { color: '#f8fafc', fontSize: 17, fontWeight: '800' },
  headerSub: { color: '#64748b', fontSize: 12, marginTop: 1 },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32 },
  emptyEmoji: { fontSize: 48, marginBottom: 12 },
  emptyTitle: { color: '#f1f5f9', fontSize: 18, fontWeight: '800', marginBottom: 8 },
  emptySub: { color: '#64748b', fontSize: 14, textAlign: 'center', lineHeight: 20 },
  list: { paddingHorizontal: 16, paddingVertical: 12, gap: 10 },
  card: { borderRadius: 16, overflow: 'hidden' },
  cardInner: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    padding: 14, borderRadius: 16,
    borderWidth: 1, borderColor: 'rgba(71,85,105,0.3)',
  },
  cardAccent: { width: 3, height: 48, borderRadius: 2 },
  cardDateCol: { flex: 1 },
  cardDate: { color: '#cbd5e1', fontSize: 13, fontWeight: '700', marginTop: 3 },
  todayBadge: {
    alignSelf: 'flex-start', marginTop: 4,
    backgroundColor: 'rgba(251,191,36,0.12)',
    borderRadius: 8, paddingHorizontal: 6, paddingVertical: 2,
    borderWidth: 1, borderColor: 'rgba(251,191,36,0.3)',
  },
  todayBadgeText: { color: '#fbbf24', fontSize: 9, fontWeight: '800', letterSpacing: 1 },
  cardTypes: { flex: 2, gap: 4 },
  typePill: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  typeEmoji: { fontSize: 12 },
  typeLabel: { color: '#94a3b8', fontSize: 11 },
  cardMeta: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  cardMetaText: { color: '#64748b', fontSize: 11 },
});
