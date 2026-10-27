import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  Share,
  Dimensions
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, StackActions } from '@react-navigation/native';
import { 
  Trophy, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Share2, 
  RotateCcw, 
  Home, 
  BookOpen, 
  ChevronDown, 
  ChevronUp, 
  HelpCircle,
  Sparkles,
  Award
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../../context/ThemeContext';
import { QuizAttempt, QuizAnswerRecord } from '../../../types/quiz';

const { width } = Dimensions.get('window');

export default function QuizResultScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { isDark } = useTheme();

  const attempt: QuizAttempt = route.params?.attempt;

  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  if (!attempt) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: isDark ? '#090d16' : '#f8fafc', justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={{ color: isDark ? '#f8fafc' : '#0f172a' }}>No result found.</Text>
        <TouchableOpacity onPress={() => navigation.navigate('BibleQuizHome')} style={{ marginTop: 12 }}>
          <Text style={{ color: '#7c3aed', fontWeight: 'bold' }}>Go to Quiz Home</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const {
    quizTitle,
    score,
    totalQuestions,
    percentage,
    correctCount,
    incorrectCount,
    unansweredCount,
    durationSeconds
  } = attempt;

  // Unpack answers: support direct array, JSON string, or answersJson fallback
  const rawAnswers = attempt.answers || [];
  let answers: QuizAnswerRecord[] = [];
  if (typeof rawAnswers === 'string') {
    try {
      answers = JSON.parse(rawAnswers);
    } catch (_) {}
  } else if (Array.isArray(rawAnswers)) {
    answers = rawAnswers;
  }
  if ((!answers || answers.length === 0) && (attempt as any).answersJson) {
    try {
      answers = JSON.parse((attempt as any).answersJson);
    } catch (_) {}
  }

  const getPraiseMessage = () => {
    if (percentage >= 90) return { title: 'Outstanding!', subtitle: 'You have deep Scripture knowledge. "Thy word is a lamp unto my feet."' };
    if (percentage >= 70) return { title: 'Well Done!', subtitle: 'Great understanding of the Word. Keep growing in faith!' };
    if (percentage >= 50) return { title: 'Good Effort!', subtitle: 'Keep studying the Scriptures daily to grow even stronger!' };
    return { title: 'Keep Learning!', subtitle: 'Every question is an opportunity to learn God’s Word deeper.' };
  };

  const praise = getPraiseMessage();

  const formatDuration = (totalSec: number) => {
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    if (m === 0) return `${s}s`;
    return `${m}m ${s}s`;
  };

  const handleShare = async () => {
    try {
      const message = `✝️ Church of God — Bible Quiz Result 📖\n\nI scored ${score}/${totalQuestions} (${percentage}%) in the "${quizTitle}"!\n\nTest your Bible knowledge and grow in the Word with the Church of God app!`;
      await Share.share({ message });
    } catch (e) {
      console.log('Share error:', e);
    }
  };

  const handleGoQuizHome = () => {
    try {
      const state = navigation.getState();
      const routes = state?.routes || [];
      const hasQuizHome = routes.some((r: any) => r.name === 'BibleQuizHome');
      if (hasQuizHome) {
        navigation.dispatch(StackActions.popTo('BibleQuizHome'));
        return;
      }
    } catch (_) {}
    navigation.navigate('BibleQuizHome');
  };

  const toggleExpand = (idx: number) => {
    setExpandedIndex(prev => (prev === idx ? null : idx));
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: isDark ? '#090d16' : '#f8fafc' }]}>
      <StatusBar barStyle="light-content" />

      {/* Scrollable Content */}
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* HERO SCORE BANNER */}
        <LinearGradient
          colors={percentage >= 70 ? ['#4338ca', '#6d28d9'] : ['#1e293b', '#334155']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.heroBanner}
        >
          <View style={styles.trophyBadge}>
            {percentage >= 70 ? (
              <Trophy size={36} color="#fbbf24" />
            ) : (
              <Award size={36} color="#93c5fd" />
            )}
          </View>

          <Text style={styles.praiseTitle}>{praise.title}</Text>
          <Text style={styles.praiseSubtitle}>{praise.subtitle}</Text>

          {/* Big Score Ring / Box */}
          <View style={styles.scoreBox}>
            <Text style={styles.scorePercentage}>{percentage}%</Text>
            <Text style={styles.scoreFraction}>{score} of {totalQuestions} Correct • +{score * 2} Points</Text>
          </View>
        </LinearGradient>

        {/* SUMMARY STATS BAR */}
        <View style={[styles.statsRow, { backgroundColor: isDark ? '#111827' : '#ffffff', borderColor: isDark ? '#1f2937' : '#e2e8f0' }]}>
          <View style={styles.statCell}>
            <View style={[styles.cellIconBadge, { backgroundColor: '#dcfce7' }]}>
              <CheckCircle2 size={16} color="#16a34a" />
            </View>
            <Text style={[styles.cellValue, { color: '#16a34a' }]}>{correctCount}</Text>
            <Text style={styles.cellLabel}>Correct</Text>
          </View>

          <View style={[styles.cellDivider, { backgroundColor: isDark ? '#1f2937' : '#e2e8f0' }]} />

          <View style={styles.statCell}>
            <View style={[styles.cellIconBadge, { backgroundColor: '#fee2e2' }]}>
              <XCircle size={16} color="#dc2626" />
            </View>
            <Text style={[styles.cellValue, { color: '#dc2626' }]}>{incorrectCount}</Text>
            <Text style={styles.cellLabel}>Incorrect</Text>
          </View>

          <View style={[styles.cellDivider, { backgroundColor: isDark ? '#1f2937' : '#e2e8f0' }]} />

          <View style={styles.statCell}>
            <View style={[styles.cellIconBadge, { backgroundColor: '#ede9fe' }]}>
              <Clock size={16} color="#7c3aed" />
            </View>
            <Text style={[styles.cellValue, { color: isDark ? '#f8fafc' : '#0f172a' }]}>{formatDuration(durationSeconds)}</Text>
            <Text style={styles.cellLabel}>Time</Text>
          </View>
        </View>

        {/* LEADERBOARD ACHIEVER CALLOUT (50% TO 100%) */}
        {percentage >= 50 && (
          <TouchableOpacity 
            style={[styles.leaderboardCallout, { backgroundColor: isDark ? '#172554' : '#eff6ff', borderColor: isDark ? '#1e40af' : '#bfdbfe' }]}
            onPress={() => navigation.navigate('QuizLeaderboard')}
            activeOpacity={0.85}
          >
            <View style={styles.calloutIconWrap}>
              <Trophy size={22} color="#f59e0b" />
            </View>
            <View style={{ flex: 1, marginRight: 8 }}>
              <Text style={[styles.leaderboardCalloutTitle, { color: isDark ? '#93c5fd' : '#1e40af' }]}>
                Leaderboard Achiever! 🏆
              </Text>
              <Text style={[styles.leaderboardCalloutSub, { color: isDark ? '#bfdbfe' : '#3b82f6' }]}>
                You scored {percentage}% and qualified for the Church Leaderboard!
              </Text>
            </View>
            <View style={styles.calloutPill}>
              <Text style={styles.calloutPillText}>View Board →</Text>
            </View>
          </TouchableOpacity>
        )}

        {/* SECTION: SCRIPTURE REVIEW & EXPLANATIONS */}
        <View style={styles.reviewHeaderRow}>
          <BookOpen size={18} color="#7c3aed" style={{ marginRight: 8 }} />
          <Text style={[styles.reviewHeaderTitle, { color: isDark ? '#f8fafc' : '#0f172a' }]}>
            Scripture Review & Explanations
          </Text>
        </View>

        <View style={styles.answersList}>
          {answers.map((ans: QuizAnswerRecord, idx: number) => {
            const isExpanded = expandedIndex === idx;
            const options = Array.isArray(ans.options) ? ans.options : [];
            const correctOpt = options.find(o => o.id === ans.correctOptionId);
            const userOpt = options.find(o => o.id === ans.selectedOptionId);

            return (
              <View 
                key={ans.questionId || idx}
                style={[
                  styles.reviewCard, 
                  { backgroundColor: isDark ? '#111827' : '#ffffff', borderColor: isDark ? '#1f2937' : '#e2e8f0' }
                ]}
              >
                <TouchableOpacity 
                  activeOpacity={0.8}
                  style={styles.reviewCardHeader}
                  onPress={() => toggleExpand(idx)}
                >
                  <View style={[
                    styles.statusBadge,
                    ans.isCorrect ? { backgroundColor: '#dcfce7' } : { backgroundColor: '#fee2e2' }
                  ]}>
                    {ans.isCorrect ? (
                      <CheckCircle2 size={16} color="#16a34a" />
                    ) : (
                      <XCircle size={16} color="#dc2626" />
                    )}
                  </View>

                  <View style={{ flex: 1, marginHorizontal: 10 }}>
                    <Text style={[styles.reviewQIndex, { color: isDark ? '#94a3b8' : '#64748b' }]}>
                      Question {idx + 1} · {ans.verseReference}
                    </Text>
                    <Text 
                      style={[styles.reviewQText, { color: isDark ? '#f8fafc' : '#0f172a' }]}
                      numberOfLines={isExpanded ? undefined : 2}
                    >
                      {ans.questionText}
                    </Text>
                  </View>

                  {isExpanded ? (
                    <ChevronUp size={20} color={isDark ? '#cbd5e1' : '#64748b'} />
                  ) : (
                    <ChevronDown size={20} color={isDark ? '#cbd5e1' : '#64748b'} />
                  )}
                </TouchableOpacity>

                {/* Expanded Details */}
                {isExpanded && (
                  <View style={[styles.expandedContent, { borderTopColor: isDark ? '#1f2937' : '#f1f5f9' }]}>
                    {/* User's choice if incorrect */}
                    {!ans.isCorrect && (
                      <View style={[styles.choiceBox, { backgroundColor: isDark ? '#450a0a' : '#fef2f2', borderColor: '#fca5a5' }]}>
                        <Text style={[styles.choiceLabel, { color: '#dc2626' }]}>Your Answer:</Text>
                        <Text style={[styles.choiceText, { color: isDark ? '#fee2e2' : '#991b1b' }]}>
                          {userOpt ? userOpt.text : 'Skipped / Unanswered'}
                        </Text>
                      </View>
                    )}

                    {/* Correct Answer */}
                    <View style={[styles.choiceBox, { backgroundColor: isDark ? '#064e3b' : '#f0fdf4', borderColor: '#86efac' }]}>
                      <Text style={[styles.choiceLabel, { color: '#16a34a' }]}>Correct Answer:</Text>
                      <Text style={[styles.choiceText, { color: isDark ? '#dcfce7' : '#166534', fontWeight: 'bold' }]}>
                        {correctOpt ? correctOpt.text : 'Answer'}
                      </Text>
                    </View>

                    {/* Scripture Reference & Explanation */}
                    <View style={[styles.scriptureBox, { backgroundColor: isDark ? '#1e1b4b' : '#ede9fe', borderColor: '#c4b5fd' }]}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                        <BookOpen size={14} color="#7c3aed" style={{ marginRight: 6 }} />
                        <Text style={styles.scriptureRefText}>{ans.verseReference}</Text>
                      </View>
                      <Text style={[styles.explanationText, { color: isDark ? '#ddd6fe' : '#4c1d95' }]}>
                        {ans.explanation}
                      </Text>
                    </View>
                  </View>
                )}
              </View>
            );
          })}
        </View>
      </ScrollView>

      {/* BOTTOM ACTION BAR */}
      <View style={[styles.bottomBar, { backgroundColor: isDark ? '#0f172a' : '#ffffff', borderTopColor: isDark ? '#1e293b' : '#e2e8f0' }]}>
        <TouchableOpacity
          style={[styles.actionBtnShare, { backgroundColor: '#2563eb' }]}
          onPress={handleShare}
          activeOpacity={0.8}
        >
          <Share2 size={18} color="#ffffff" style={{ marginRight: 6 }} />
          <Text style={styles.actionBtnShareText}>
            Share
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionBtnPrimary, { backgroundColor: '#7c3aed' }]}
          onPress={handleGoQuizHome}
          activeOpacity={0.8}
        >
          <Home size={18} color="#ffffff" style={{ marginRight: 6 }} />
          <Text style={styles.actionBtnPrimaryText}>
            Quiz Home
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 24
  },
  heroBanner: {
    padding: 24,
    borderRadius: 24,
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#4338ca',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 4
  },
  trophyBadge: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12
  },
  praiseTitle: {
    color: '#ffffff',
    fontSize: 24,
    fontWeight: '800',
    marginBottom: 4
  },
  praiseSubtitle: {
    color: '#e0e7ff',
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 18,
    paddingHorizontal: 16
  },
  scoreBox: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: 20,
    alignItems: 'center'
  },
  scorePercentage: {
    color: '#ffffff',
    fontSize: 32,
    fontWeight: '900'
  },
  scoreFraction: {
    color: '#f8fafc',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: 20
  },
  statCell: {
    alignItems: 'center',
    flex: 1
  },
  cellIconBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4
  },
  cellValue: {
    fontSize: 16,
    fontWeight: '800'
  },
  cellLabel: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2
  },
  cellDivider: {
    width: 1,
    height: 32
  },
  reviewHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    paddingHorizontal: 4
  },
  reviewHeaderTitle: {
    fontSize: 16,
    fontWeight: '800'
  },
  answersList: {
    gap: 12,
    marginBottom: 20
  },
  reviewCard: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden'
  },
  reviewCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14
  },
  statusBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center'
  },
  reviewQIndex: {
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 2
  },
  reviewQText: {
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 20
  },
  expandedContent: {
    padding: 14,
    paddingTop: 10,
    borderTopWidth: 1,
    gap: 10
  },
  choiceBox: {
    padding: 10,
    borderRadius: 10,
    borderWidth: 1
  },
  choiceLabel: {
    fontSize: 11,
    fontWeight: '800',
    marginBottom: 2
  },
  choiceText: {
    fontSize: 13,
    lineHeight: 18
  },
  scriptureBox: {
    padding: 12,
    borderRadius: 12,
    borderWidth: 1
  },
  scriptureRefText: {
    color: '#7c3aed',
    fontSize: 13,
    fontWeight: '800'
  },
  explanationText: {
    fontSize: 12,
    lineHeight: 18
  },
  bottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    gap: 12
  },
  actionBtnShare: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 48,
    borderRadius: 24,
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3
  },
  actionBtnShareText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: 'bold'
  },
  actionBtnPrimary: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 48,
    borderRadius: 24,
    shadowColor: '#7c3aed',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3
  },
  actionBtnPrimaryText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: 'bold'
  },
  leaderboardCallout: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 20,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2
  },
  calloutIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#fef3c7',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10
  },
  leaderboardCalloutTitle: {
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 2
  },
  leaderboardCalloutSub: {
    fontSize: 12,
    lineHeight: 16
  },
  calloutPill: {
    backgroundColor: '#2563eb',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14
  },
  calloutPillText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '800'
  }
});
