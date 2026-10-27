import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  StatusBar,
  ActivityIndicator,
  RefreshControl,
  AppState
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import auth from '@react-native-firebase/auth';
import { 
  ChevronLeft, 
  History, 
  Trophy, 
  Clock, 
  CheckCircle2, 
  BookOpen, 
  ChevronRight, 
  Calendar,
  Sparkles,
  Award
} from 'lucide-react-native';
import { useTheme } from '../../../context/ThemeContext';
import { useAuth } from '../../../context/AuthContext';
import BibleQuizService from '../../../services/BibleQuizService';
import { QuizAttempt, QuizStats } from '../../../types/quiz';

export default function QuizHistoryScreen() {
  const navigation = useNavigation<any>();
  const { isDark } = useTheme();
  const { user, member } = useAuth();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [history, setHistory] = useState<QuizAttempt[]>([]);
  const [stats, setStats] = useState<QuizStats | null>(null);

  const loadData = async (isRefresh = false) => {
    if (!isRefresh && history.length === 0) setLoading(true);
    try {
      const currentUid = user?.uid || auth().currentUser?.uid || (member as any)?.id;
      const currentName = member?.name || user?.displayName;
      const currentPhone = (member as any)?.phone || (member as any)?.mobilePhone || user?.phoneNumber || null;
      const [h, s] = await Promise.all([
        BibleQuizService.getQuizHistory(currentUid, currentName, currentPhone, isRefresh),
        BibleQuizService.getQuizStats(currentUid, currentName, currentPhone)
      ]);
      setHistory(h);
      setStats(s);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
    const sub = AppState.addEventListener('change', nextState => {
      if (nextState === 'active') {
        loadData(true);
      }
    });
    return () => sub.remove();
  }, [user?.uid, member?.id]);

  useFocusEffect(
    useCallback(() => {
      loadData();
      const currentUid = user?.uid || auth().currentUser?.uid || (member as any)?.id;
      const currentName = member?.name || user?.displayName;
      const unsubscribe = BibleQuizService.subscribeAttempts((attempts) => {
        const mine = BibleQuizService.getUserAttempts(attempts, currentUid, currentName);
        setHistory(mine);
        setStats(BibleQuizService.computeStats(mine));
        setLoading(false);
      });
      return unsubscribe;
    }, [user?.uid, member?.id, member?.name])
  );

  const onRefresh = () => {
    setRefreshing(true);
    loadData(true);
  };

  const formatDate = (isoStr: string) => {
    try {
      const d = new Date(isoStr);
      return d.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
    } catch (e) {
      return isoStr;
    }
  };

  const formatDuration = (totalSec: number) => {
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    if (m === 0) return `${s}s`;
    return `${m}m ${s}s`;
  };

  const renderItem = ({ item }: { item: QuizAttempt }) => {
    const isPassing = item.percentage >= 70;

    return (
      <TouchableOpacity
        activeOpacity={0.8}
        style={[
          styles.itemCard,
          { backgroundColor: isDark ? '#111827' : '#ffffff', borderColor: isDark ? '#1f2937' : '#e2e8f0' }
        ]}
        onPress={() => navigation.navigate('QuizResult', { attempt: item })}
      >
        <View style={styles.itemHeader}>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
              <View style={[
                styles.typeTag,
                item.quizType === 'daily' ? { backgroundColor: '#ede9fe' } : { backgroundColor: '#f1f5f9' }
              ]}>
                <Text style={[
                  styles.typeTagText,
                  item.quizType === 'daily' ? { color: '#7c3aed' } : { color: '#475569' }
                ]}>
                  {item.quizType.toUpperCase()}
                </Text>
              </View>
              <Text style={[styles.itemDate, { color: isDark ? '#94a3b8' : '#64748b' }]}>
                {formatDate(item.completedAt)}
              </Text>
            </View>
            <Text style={[styles.itemTitle, { color: isDark ? '#f8fafc' : '#0f172a' }]} numberOfLines={1}>
              {item.quizTitle}
            </Text>
          </View>

          <View style={[
            styles.scorePill,
            isPassing ? { backgroundColor: '#dcfce7' } : { backgroundColor: '#fee2e2' }
          ]}>
            <Text style={[
              styles.scorePillText,
              isPassing ? { color: '#16a34a' } : { color: '#dc2626' }
            ]}>
              {item.percentage}%
            </Text>
          </View>
        </View>

        <View style={[styles.itemFooter, { borderTopColor: isDark ? '#1f2937' : '#f1f5f9' }]}>
          <View style={styles.footerInfo}>
            <CheckCircle2 size={14} color="#16a34a" style={{ marginRight: 4 }} />
            <Text style={[styles.footerText, { color: isDark ? '#94a3b8' : '#64748b' }]}>
              {item.score}/{item.totalQuestions} Correct
            </Text>
          </View>

          <View style={styles.footerInfo}>
            <Clock size={14} color={isDark ? '#94a3b8' : '#64748b'} style={{ marginRight: 4 }} />
            <Text style={[styles.footerText, { color: isDark ? '#94a3b8' : '#64748b' }]}>
              {formatDuration(item.durationSeconds)}
            </Text>
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text style={styles.reviewLinkText}>Review</Text>
            <ChevronRight size={14} color="#7c3aed" />
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: isDark ? '#090d16' : '#f8fafc' }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      {/* Header */}
      <View style={[styles.header, { borderBottomColor: isDark ? '#1e293b' : '#e2e8f0' }]}>
        <TouchableOpacity
          style={[styles.backBtn, { backgroundColor: isDark ? '#1e293b' : '#ede9fe' }]}
          onPress={() => navigation.goBack()}
        >
          <ChevronLeft size={22} color={isDark ? '#e2e8f0' : '#4338ca'} />
        </TouchableOpacity>

        <View style={styles.headerTitleWrap}>
          <Text style={[styles.headerTitle, { color: isDark ? '#f8fafc' : '#0f172a' }]}>Quiz History</Text>
          <Text style={[styles.headerSub, { color: isDark ? '#94a3b8' : '#64748b' }]}>
            Past attempts & Scripture review
          </Text>
        </View>
      </View>

      {/* Stats Summary Strip */}
      <View style={[styles.statsStrip, { backgroundColor: isDark ? '#111827' : '#ffffff', borderColor: isDark ? '#1f2937' : '#e2e8f0' }]}>
        <View style={styles.statCol}>
          <Text style={[styles.statVal, { color: isDark ? '#f8fafc' : '#0f172a' }]}>{stats?.totalQuizzesTaken || 0}</Text>
          <Text style={styles.statLbl}>Quizzes</Text>
        </View>
        <View style={[styles.statDiv, { backgroundColor: isDark ? '#1f2937' : '#e2e8f0' }]} />
        <View style={styles.statCol}>
          <Text style={[styles.statVal, { color: '#16a34a' }]}>{stats?.averageAccuracy || 0}%</Text>
          <Text style={styles.statLbl}>Avg Accuracy</Text>
        </View>
        <View style={[styles.statDiv, { backgroundColor: isDark ? '#1f2937' : '#e2e8f0' }]} />
        <View style={styles.statCol}>
          <Text style={[styles.statVal, { color: '#d97706' }]}>{stats?.bestScore || 0}%</Text>
          <Text style={styles.statLbl}>Best Score</Text>
        </View>
      </View>

      {loading ? (
        <View style={styles.loaderWrap}>
          <ActivityIndicator size="large" color="#7c3aed" />
        </View>
      ) : history.length === 0 ? (
        <View style={styles.emptyWrap}>
          <View style={[styles.emptyIconCircle, { backgroundColor: isDark ? '#1e1b4b' : '#ede9fe' }]}>
            <History size={36} color="#7c3aed" />
          </View>
          <Text style={[styles.emptyTitle, { color: isDark ? '#f8fafc' : '#0f172a' }]}>No Quiz History Yet</Text>
          <Text style={[styles.emptyDesc, { color: isDark ? '#94a3b8' : '#64748b' }]}>
            Take your first Daily Challenge or Automatic Quiz to test your Bible knowledge and build your personal study log.
          </Text>
          <TouchableOpacity
            style={styles.emptyBtn}
            onPress={() => navigation.navigate('BibleQuizHome')}
          >
            <Text style={styles.emptyBtnText}>Start a Quiz</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={history}
          keyExtractor={item => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl 
              refreshing={refreshing} 
              onRefresh={onRefresh} 
              colors={['#7c3aed']} 
              tintColor="#7c3aed" 
            />
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center'
  },
  headerTitleWrap: {
    flex: 1,
    marginLeft: 12
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800'
  },
  headerSub: {
    fontSize: 12,
    marginTop: 2
  },
  statsStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    marginHorizontal: 16,
    marginTop: 14,
    marginBottom: 8,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1
  },
  statCol: {
    alignItems: 'center',
    flex: 1
  },
  statVal: {
    fontSize: 18,
    fontWeight: '800'
  },
  statLbl: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2
  },
  statDiv: {
    width: 1,
    height: 28
  },
  loaderWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  listContent: {
    padding: 16,
    paddingBottom: 24,
    gap: 12
  },
  itemCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1
  },
  itemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12
  },
  typeTag: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    marginRight: 8
  },
  typeTagText: {
    fontSize: 10,
    fontWeight: '800'
  },
  itemDate: {
    fontSize: 12
  },
  itemTitle: {
    fontSize: 15,
    fontWeight: '700'
  },
  scorePill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12
  },
  scorePillText: {
    fontSize: 14,
    fontWeight: '800'
  },
  itemFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 10,
    borderTopWidth: 1
  },
  footerInfo: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  footerText: {
    fontSize: 12
  },
  reviewLinkText: {
    color: '#7c3aed',
    fontSize: 12,
    fontWeight: '700',
    marginRight: 2
  },
  emptyWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32
  },
  emptyIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 6
  },
  emptyDesc: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20
  },
  emptyBtn: {
    backgroundColor: '#7c3aed',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 24
  },
  emptyBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: 'bold'
  }
});
