import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  Alert,
  Dimensions,
  Animated,
  ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { 
  ChevronLeft, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  ChevronRight, 
  HelpCircle,
  BookOpen
} from 'lucide-react-native';
import { useTheme } from '../../../context/ThemeContext';
import { useAuth } from '../../../context/AuthContext';
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import BibleQuizService from '../../../services/BibleQuizService';
import { BibleQuestion, QuizAttempt, QuizAnswerRecord, QuizOption } from '../../../types/quiz';

const { width } = Dimensions.get('window');

export default function QuizPlayScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { isDark } = useTheme();
  const { user, member } = useAuth();

  const {
    quizId,
    quizTitle = 'Bible Quiz',
    quizType = 'automatic',
    questions = [] as BibleQuestion[],
    timeLimitMinutes,
    filterCriteria
  } = route.params || {};

  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<{ [questionId: string]: string }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [secondsElapsed, setSecondsElapsed] = useState(0);
  const [secondsRemaining, setSecondsRemaining] = useState(timeLimitMinutes ? timeLimitMinutes * 60 : 0);

  const progressAnim = useRef(new Animated.Value(0)).current;

  // Track timer
  useEffect(() => {
    const timer = setInterval(() => {
      setSecondsElapsed(prev => prev + 1);
      if (timeLimitMinutes) {
        setSecondsRemaining(prev => {
          if (prev <= 1) {
            clearInterval(timer);
            handleAutoSubmitOnTimeout();
            return 0;
          }
          return prev - 1;
        });
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLimitMinutes]);

  // Update progress bar
  useEffect(() => {
    if (questions.length > 0) {
      Animated.timing(progressAnim, {
        toValue: (currentIndex + 1) / questions.length,
        duration: 250,
        useNativeDriver: false
      }).start();
    }
  }, [currentIndex, questions.length]);

  const handleSelectOption = (questionId: string, optionId: string) => {
    setSelectedAnswers(prev => ({
      ...prev,
      [questionId]: optionId
    }));
  };

  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(prev => prev + 1);
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
    }
  };

  const handleQuitPrompt = () => {
    Alert.alert(
      'Leave Quiz?',
      'Your progress for this attempt will be lost.',
      [
        { text: 'Continue Quiz', style: 'cancel' },
        { text: 'Exit', style: 'destructive', onPress: () => navigation.goBack() }
      ]
    );
  };

  const handleAutoSubmitOnTimeout = () => {
    Alert.alert('Time Up!', 'Your time has expired. Submitting your answers now.', [
      { text: 'OK', onPress: () => executeSubmission() }
    ]);
  };

  const handleSubmitPress = () => {
    const answeredCount = Object.keys(selectedAnswers).length;
    const unanswered = questions.length - answeredCount;

    if (unanswered > 0) {
      Alert.alert(
        'Submit Quiz?',
        `You still have ${unanswered} unanswered question${unanswered > 1 ? 's' : ''}. Are you ready to submit?`,
        [
          { text: 'Review Questions', style: 'cancel' },
          { text: 'Submit Anyway', onPress: () => executeSubmission() }
        ]
      );
    } else {
      // Immediate submission without redundant confirm prompt
      executeSubmission();
    }
  };

  const executeSubmission = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);

    try {
      let correctCount = 0;
      let incorrectCount = 0;
      let unansweredCount = 0;

      const answerRecords: QuizAnswerRecord[] = questions.map((q: BibleQuestion) => {
        const chosenId = selectedAnswers[q.id] || null;
        const isCorrect = chosenId === q.correctOptionId;

        if (!chosenId) {
          unansweredCount++;
        } else if (isCorrect) {
          correctCount++;
        } else {
          incorrectCount++;
        }

        return {
          questionId: q.id || '',
          questionText: q.question || '',
          selectedOptionId: chosenId || null,
          correctOptionId: q.correctOptionId || '',
          isCorrect,
          options: q.options || [],
          verseReference: q.verseReference || '',
          explanation: q.explanation || '',
          book: q.book || '',
          chapter: q.chapter || 0
        };
      });

      const total = questions.length;
      const percentage = Math.round((correctCount / Math.max(1, total)) * 100);

      const currentUid = user?.uid || auth().currentUser?.uid || (member as any)?.id;
      const currentName = member?.name || user?.displayName || 'Church Member';
      const currentPhone = (member as any)?.phone || (member as any)?.mobilePhone || user?.phoneNumber || null;
      const currentPhoto = user?.photoURL || (member as any)?.photoUrl || (member as any)?.profileImage || null;
      const currentChurch = (member as any)?.churchName || null;

      const attempt: QuizAttempt = {
        id: `att_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
        quizId: quizId || undefined,
        quizTitle,
        quizType,
        score: correctCount,
        totalQuestions: total,
        percentage,
        correctCount,
        incorrectCount,
        unansweredCount,
        durationSeconds: secondsElapsed,
        completedAt: new Date().toISOString(),
        answers: answerRecords,
        filterCriteria: filterCriteria || null,
        uid: currentUid,
        memberName: currentName,
        memberPhone: currentPhone,
        memberPhotoUrl: currentPhoto,
        churchName: currentChurch
      };

      // 1. Persist directly to Cloud Firestore in Firebase (dispatched immediately)
      BibleQuizService.saveQuizAttempt(attempt, currentUid).catch(saveErr => {
        console.error('Quiz direct Firestore save failed:', saveErr);
      });

      // 1b. If official church quiz, record participant in church_quizzes subcollection
      if (quizType === 'admin' && quizId) {
        try {
          const participantId = currentUid || attempt.id;
          firestore()
            .collection('church_quizzes')
            .doc(quizId)
            .collection('participants')
            .doc(participantId)
            .set({
              uid: currentUid || null,
              name: currentName,
              score: correctCount,
              totalQuestions: total,
              percentage,
              completedAt: attempt.completedAt,
              attemptId: attempt.id
            }, { merge: true })
            .catch(() => {});
        } catch (_) {}
      }

      // 2. Immediately transition to QuizResult screen (instant 0ms response)
      setIsSubmitting(false);
      navigation.replace('QuizResult', { attempt });
    } catch (e) {
      console.error('Submission finalization error:', e);
      setIsSubmitting(false);
      Alert.alert('Error', 'There was a problem finalizing your score. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!questions || questions.length === 0) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: isDark ? '#090d16' : '#f8fafc', justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#7c3aed" />
        <Text style={{ marginTop: 12, color: isDark ? '#cbd5e1' : '#475569' }}>Loading questions...</Text>
      </SafeAreaView>
    );
  }

  const currentQ: BibleQuestion = questions[currentIndex];
  const chosenOptionId = selectedAnswers[currentQ?.id];

  const formatTimer = (totalSeconds: number) => {
    const m = Math.floor(totalSeconds / 60);
    const s = totalSeconds % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const optionLabels = ['A', 'B', 'C', 'D'];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: isDark ? '#090d16' : '#f8fafc' }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      {/* Top Header */}
      <View style={[styles.header, { borderBottomColor: isDark ? '#1e293b' : '#e2e8f0' }]}>
        <TouchableOpacity 
          style={[styles.closeBtn, { backgroundColor: isDark ? '#1e293b' : '#ede9fe' }]}
          onPress={handleQuitPrompt}
        >
          <ChevronLeft size={22} color={isDark ? '#e2e8f0' : '#4338ca'} />
        </TouchableOpacity>

        <View style={styles.headerInfo}>
          <Text style={[styles.headerTitle, { color: isDark ? '#f8fafc' : '#0f172a' }]} numberOfLines={1}>
            {quizTitle}
          </Text>
          <Text style={[styles.headerSubtitle, { color: isDark ? '#94a3b8' : '#64748b' }]}>
            Question {currentIndex + 1} of {questions.length}
          </Text>
        </View>

        <View style={[styles.timerBadge, { backgroundColor: isDark ? '#1e293b' : '#ede9fe' }]}>
          <Clock size={14} color="#7c3aed" style={{ marginRight: 4 }} />
          <Text style={styles.timerText}>
            {timeLimitMinutes ? formatTimer(secondsRemaining) : formatTimer(secondsElapsed)}
          </Text>
        </View>
      </View>

      {/* Animated Progress Bar */}
      <View style={[styles.progressBarTrack, { backgroundColor: isDark ? '#1e293b' : '#e2e8f0' }]}>
        <Animated.View 
          style={[
            styles.progressBarFill, 
            { 
              width: progressAnim.interpolate({
                inputRange: [0, 1],
                outputRange: ['0%', '100%']
              })
            }
          ]} 
        />
      </View>

      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Question Topic & Difficulty Pill */}
        <View style={styles.tagRow}>
          <View style={[styles.bookTag, { backgroundColor: isDark ? '#1e1b4b' : '#ede9fe' }]}>
            <BookOpen size={12} color="#7c3aed" style={{ marginRight: 4 }} />
            <Text style={styles.bookTagText}>{currentQ.book} {currentQ.chapter > 0 ? `· Ch ${currentQ.chapter}` : ''}</Text>
          </View>
          {currentQ.topic && (
            <View style={[styles.topicTag, { backgroundColor: isDark ? '#1f2937' : '#f1f5f9' }]}>
              <Text style={[styles.topicTagText, { color: isDark ? '#cbd5e1' : '#475569' }]}>{currentQ.topic}</Text>
            </View>
          )}
          <View style={[
            styles.difficultyTag,
            currentQ.difficulty === 'easy' && { backgroundColor: '#dcfce7' },
            currentQ.difficulty === 'medium' && { backgroundColor: '#fef3c7' },
            currentQ.difficulty === 'hard' && { backgroundColor: '#fee2e2' }
          ]}>
            <Text style={[
              styles.difficultyTagText,
              currentQ.difficulty === 'easy' && { color: '#16a34a' },
              currentQ.difficulty === 'medium' && { color: '#b45309' },
              currentQ.difficulty === 'hard' && { color: '#dc2626' }
            ]}>
              {currentQ.difficulty.toUpperCase()}
            </Text>
          </View>
        </View>

        {/* Question Text Card */}
        <View style={[styles.questionCard, { backgroundColor: isDark ? '#111827' : '#ffffff', borderColor: isDark ? '#1f2937' : '#e2e8f0' }]}>
          <Text style={[styles.questionText, { color: isDark ? '#f8fafc' : '#0f172a' }]}>
            {currentQ.question}
          </Text>
        </View>

        {/* 4 Answer Options */}
        <View style={styles.optionsList}>
          {currentQ.options.map((option: QuizOption, optIdx: number) => {
            const isSelected = chosenOptionId === option.id;
            return (
              <TouchableOpacity
                key={option.id}
                activeOpacity={0.8}
                style={[
                  styles.optionCard,
                  { backgroundColor: isDark ? '#111827' : '#ffffff', borderColor: isDark ? '#1f2937' : '#e2e8f0' },
                  isSelected && { borderColor: '#7c3aed', backgroundColor: isDark ? '#2e1065' : '#f5f3ff', borderWidth: 2 }
                ]}
                onPress={() => handleSelectOption(currentQ.id, option.id)}
              >
                <View style={[
                  styles.optionBadge,
                  { backgroundColor: isDark ? '#1e293b' : '#f1f5f9' },
                  isSelected && { backgroundColor: '#7c3aed' }
                ]}>
                  <Text style={[
                    styles.optionBadgeText,
                    { color: isDark ? '#cbd5e1' : '#475569' },
                    isSelected && { color: '#ffffff', fontWeight: 'bold' }
                  ]}>
                    {optionLabels[optIdx] || option.id.toUpperCase()}
                  </Text>
                </View>

                <Text style={[
                  styles.optionText,
                  { color: isDark ? '#f8fafc' : '#1e293b' },
                  isSelected && { color: isDark ? '#ffffff' : '#5b21b6', fontWeight: '700' }
                ]}>
                  {option.text}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>

      {/* Bottom Nav Action Bar */}
      <View style={[styles.bottomBar, { backgroundColor: isDark ? '#0f172a' : '#ffffff', borderTopColor: isDark ? '#1e293b' : '#e2e8f0' }]}>
        <TouchableOpacity
          style={[
            styles.prevBtn,
            { backgroundColor: isDark ? '#1e293b' : '#f1f5f9' },
            currentIndex === 0 && { opacity: 0.4 }
          ]}
          onPress={handlePrev}
          disabled={currentIndex === 0}
        >
          <ChevronLeft size={20} color={isDark ? '#cbd5e1' : '#475569'} />
          <Text style={[styles.prevBtnText, { color: isDark ? '#cbd5e1' : '#475569' }]}>Prev</Text>
        </TouchableOpacity>

        {currentIndex < questions.length - 1 ? (
          <TouchableOpacity
            style={[styles.nextBtn, { backgroundColor: '#7c3aed' }]}
            onPress={handleNext}
          >
            <Text style={styles.nextBtnText}>Next Question</Text>
            <ChevronRight size={20} color="#ffffff" />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.submitBtn, { backgroundColor: '#16a34a' }]}
            onPress={handleSubmitPress}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <ActivityIndicator color="#ffffff" size="small" />
            ) : (
              <>
                <CheckCircle2 size={18} color="#ffffff" style={{ marginRight: 6 }} />
                <Text style={styles.submitBtnText}>Submit Quiz</Text>
              </>
            )}
          </TouchableOpacity>
        )}
      </View>
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
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1
  },
  closeBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center'
  },
  headerInfo: {
    flex: 1,
    marginHorizontal: 12
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800'
  },
  headerSubtitle: {
    fontSize: 12,
    marginTop: 2
  },
  timerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14
  },
  timerText: {
    color: '#7c3aed',
    fontSize: 13,
    fontWeight: '700'
  },
  progressBarTrack: {
    height: 4,
    width: '100%'
  },
  progressBarFill: {
    height: 4,
    backgroundColor: '#7c3aed'
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 24
  },
  tagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12
  },
  bookTag: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12
  },
  bookTagText: {
    color: '#7c3aed',
    fontSize: 12,
    fontWeight: '700'
  },
  topicTag: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12
  },
  topicTagText: {
    fontSize: 12,
    fontWeight: '600'
  },
  difficultyTag: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10
  },
  difficultyTagText: {
    fontSize: 10,
    fontWeight: '800'
  },
  questionCard: {
    padding: 20,
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2
  },
  questionText: {
    fontSize: 18,
    fontWeight: '700',
    lineHeight: 26
  },
  optionsList: {
    gap: 12
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1.5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1
  },
  optionBadge: {
    width: 34,
    height: 34,
    borderRadius: 17,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14
  },
  optionBadgeText: {
    fontSize: 14,
    fontWeight: '600'
  },
  optionText: {
    flex: 1,
    fontSize: 15,
    lineHeight: 21,
    fontWeight: '500'
  },
  bottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    gap: 12
  },
  prevBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 24,
    gap: 4
  },
  prevBtnText: {
    fontSize: 14,
    fontWeight: '700'
  },
  nextBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 24,
    gap: 6
  },
  nextBtnText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: 'bold'
  },
  submitBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 24
  },
  submitBtnText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: 'bold'
  }
});
