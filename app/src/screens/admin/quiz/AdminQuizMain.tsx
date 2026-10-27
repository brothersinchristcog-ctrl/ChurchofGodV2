import React, { useState, useEffect, useContext, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
  Dimensions,
  ActivityIndicator,
  FlatList,
  Platform,
  StatusBar
} from 'react-native';
import { SafeAreaInsetsContext } from 'react-native-safe-area-context';
import { 
  ChevronLeft, 
  ChevronRight,
  Plus, 
  BookOpen, 
  Edit3, 
  CheckCircle2, 
  Award, 
  Clock, 
  Users, 
  Search, 
  Filter, 
  Trash2, 
  ArrowUp, 
  ArrowDown, 
  Save, 
  Send, 
  Calendar, 
  Check, 
  AlertCircle, 
  Eye, 
  RefreshCw, 
  Layers,
  Sparkles,
  Zap,
  HelpCircle,
  X,
  Book,
  Play,
  Square,
  Bell,
  Sun,
  Moon
} from 'lucide-react-native';
import { AdminTabContext } from '../../../context/AdminTabContext';
import { useTheme } from '../../../context/ThemeContext';
import { useAuth } from '../../../context/AuthContext';
import firestore from '@react-native-firebase/firestore';
import functions from '@react-native-firebase/functions';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BibleQuestion, DifficultyLevel } from '../../../types/quiz';
import { LinearGradient } from 'expo-linear-gradient';
import anthropicQuizService from '../../../services/AnthropicQuizService';
import SalesforceService from '../../../services/SalesforceService';
import BibleQuizService from '../../../services/BibleQuizService';
import NotificationService from '../../../services/NotificationService';

const { width } = Dimensions.get('window');

// Dedicated Firebase Firestore collections for Pastor/Admin Quiz & Bank Questions
export const QUIZZES_COLLECTION = 'church_quizzes';
export const BANK_QUESTIONS_COLLECTION = 'bible_question_bank';

const CACHE_STORAGE_KEY = 'CODG_CHURCH_QUIZZES_CACHE_V3';
const BANK_QUESTIONS_CACHE_KEY = 'CODG_CHURCH_BANK_QUESTIONS_CACHE_V3';

// 66 Books of the Holy Bible categorized by Old and New Testament
export const BIBLE_BOOKS_DATA = {
  OT: [
    'Genesis', 'Exodus', 'Leviticus', 'Numbers', 'Deuteronomy', 
    'Joshua', 'Judges', 'Ruth', '1 Samuel', '2 Samuel', 
    '1 Kings', '2 Kings', '1 Chronicles', '2 Chronicles', 'Ezra', 
    'Nehemiah', 'Esther', 'Job', 'Psalms', 'Proverbs', 
    'Ecclesiastes', 'Song of Solomon', 'Isaiah', 'Jeremiah', 'Lamentations', 
    'Ezekiel', 'Daniel', 'Hosea', 'Joel', 'Amos', 
    'Obadiah', 'Jonah', 'Micah', 'Nahum', 'Habakkuk', 
    'Zephaniah', 'Haggai', 'Zechariah', 'Malachi'
  ],
  NT: [
    'Matthew', 'Mark', 'Luke', 'John', 'Acts', 
    'Romans', '1 Corinthians', '2 Corinthians', 'Galatians', 'Ephesians', 
    'Philippians', 'Colossians', '1 Thessalonians', '2 Thessalonians', '1 Timothy', 
    '2 Timothy', 'Titus', 'Philemon', 'Hebrews', 'James', 
    '1 Peter', '2 Peter', '1 John', '2 John', '3 John', 
    'Jude', 'Revelation'
  ]
};

export const BIBLE_CHAPTER_COUNTS: Record<string, number> = {
  // Old Testament (39)
  'Genesis': 50, 'Exodus': 40, 'Leviticus': 27, 'Numbers': 36, 'Deuteronomy': 34,
  'Joshua': 24, 'Judges': 21, 'Ruth': 4, '1 Samuel': 31, '2 Samuel': 24,
  '1 Kings': 22, '2 Kings': 25, '1 Chronicles': 29, '2 Chronicles': 36, 'Ezra': 10,
  'Nehemiah': 13, 'Esther': 10, 'Job': 42, 'Psalms': 150, 'Proverbs': 31,
  'Ecclesiastes': 12, 'Song of Solomon': 8, 'Isaiah': 66, 'Jeremiah': 52, 'Lamentations': 5,
  'Ezekiel': 48, 'Daniel': 12, 'Hosea': 14, 'Joel': 3, 'Amos': 9,
  'Obadiah': 1, 'Jonah': 4, 'Micah': 7, 'Nahum': 3, 'Habakkuk': 3,
  'Zephaniah': 3, 'Haggai': 2, 'Zechariah': 14, 'Malachi': 4,
  // New Testament (27)
  'Matthew': 28, 'Mark': 16, 'Luke': 24, 'John': 21, 'Acts': 28,
  'Romans': 16, '1 Corinthians': 16, '2 Corinthians': 13, 'Galatians': 6, 'Ephesians': 6,
  'Philippians': 4, 'Colossians': 4, '1 Thessalonians': 5, '2 Thessalonians': 3, '1 Timothy': 6,
  '2 Timothy': 4, 'Titus': 3, 'Philemon': 1, 'Hebrews': 13, 'James': 5,
  '1 Peter': 5, '2 Peter': 3, '1 John': 5, '2 John': 1, '3 John': 1,
  'Jude': 1, 'Revelation': 22
};

export const inferTestament = (bookName: string): 'ot' | 'nt' => {
  const clean = bookName.toLowerCase().trim();
  const isOT = BIBLE_BOOKS_DATA.OT.some(b => b.toLowerCase() === clean);
  return isOT ? 'ot' : 'nt';
};

export interface AdminQuizItem {
  id: string;
  title: string;
  category: string;
  audience: string;
  status: 'draft' | 'published' | 'scheduled' | 'completed';
  isLive?: boolean;
  isDeleted?: boolean;
  scheduledDate?: string;
  scheduledDateStr?: string;
  liveStartedAt?: string;
  durationMinutes: number;
  maxAttempts: number;
  passingScore: number;
  reviewAnswers: 'instant' | 'after_submission' | 'never';
  questions: BibleQuestion[];
  questionCount: number;
  createdAt: string;
  createdBy?: string;
  createdById?: string;
}

let inMemoryQuizzesCache: AdminQuizItem[] | null = null;
let inMemoryBankQuestionsCache: BibleQuestion[] | null = null;

export default function AdminQuizMain() {
  const insetsContext = useContext(SafeAreaInsetsContext);
  const insets = insetsContext || { top: 0, bottom: 0, left: 0, right: 0 };
  const { goBack } = useContext(AdminTabContext);
  const { isDark, colors } = useTheme();
  const { member } = useAuth();

  // Dynamic safe insets so modal headers never overlap camera punch hole/notch, and bottom buttons stay above device navigation bar
  const safeTopPadding = Math.max(
    insets.top + (Platform.OS === 'ios' ? 8 : 18),
    Platform.OS === 'android' ? (StatusBar.currentHeight ? StatusBar.currentHeight + 18 : 50) : 52
  );
  const safeBottomPadding = Math.max(
    insets.bottom + 16,
    Platform.OS === 'android' ? 32 : 34
  );

  // Navigation tab inside Admin Quiz
  const [activeSegment, setActiveSegment] = useState<'quizzes' | 'bank' | 'attempts'>('quizzes');
  
  // Quizzes list state: IMMEDIATELY VISIBLE in 0ms (starts empty or loads from Firestore/cache)
  const [quizzes, setQuizzes] = useState<AdminQuizItem[]>(() => inMemoryQuizzesCache || []);
  const [loading, setLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Question Bank: ONLY real pastor/admin questions stored in Firebase (38 mock questions removed)
  const [bankQuestions, setBankQuestions] = useState<BibleQuestion[]>(() => inMemoryBankQuestionsCache || []);
  const [bankSearch, setBankSearch] = useState('');
  const [bankTestament, setBankTestament] = useState<'all' | 'ot' | 'nt'>('all');
  const [bankDifficulty, setBankDifficulty] = useState<string>('all');
  const [selectedBook, setSelectedBook] = useState<string>('all');

  // Modal States
  const [createQuizModalVisible, setCreateQuizModalVisible] = useState(false);
  const [previewQuizModalVisible, setPreviewQuizModalVisible] = useState(false);
  const [previewingQuiz, setPreviewingQuiz] = useState<AdminQuizItem | null>(null);
  const [addQuestionModalVisible, setAddQuestionModalVisible] = useState(false);

  // Bible Picker Modal States
  const [biblePickerVisible, setBiblePickerVisible] = useState(false);
  const [pickerTestament, setPickerTestament] = useState<'OT' | 'NT'>('NT');
  const [pickerBookSearch, setPickerBookSearch] = useState('');
  const [pickerSelectedBook, setPickerSelectedBook] = useState('John');
  const [pickerSelectedChapter, setPickerSelectedChapter] = useState(3);
  const [pickerVerseInput, setPickerVerseInput] = useState('16');
  const [pickerStep, setPickerStep] = useState<'book' | 'chapter' | 'verse'>('book');

  // AI Assistant States (Anthropic Claude AI)
  const [isGeneratingQuestion, setIsGeneratingQuestion] = useState(false);
  const [isGeneratingExplanation, setIsGeneratingExplanation] = useState(false);

  // New Question to Bank Form States
  const [newQuestionText, setNewQuestionText] = useState('');
  const [newOptionA, setNewOptionA] = useState('');
  const [newOptionB, setNewOptionB] = useState('');
  const [newOptionC, setNewOptionC] = useState('');
  const [newOptionD, setNewOptionD] = useState('');
  const [newCorrectOption, setNewCorrectOption] = useState<'a' | 'b' | 'c' | 'd'>('a');
  const [newBook, setNewBook] = useState('');
  const [newChapter, setNewChapter] = useState('');
  const [newVerse, setNewVerse] = useState('');
  const [newDifficulty, setNewDifficulty] = useState<DifficultyLevel>('easy');
  const [newExplanation, setNewExplanation] = useState('');

  // Create Quiz Wizard State
  const [wizardStep, setWizardStep] = useState<1 | 2 | 3>(1); // 1: Settings, 2: Questions, 3: Review & Publish
  const [quizTitle, setQuizTitle] = useState('');
  const [quizCategory, setQuizCategory] = useState('Gospels & Life of Jesus');
  const [quizAudience, setQuizAudience] = useState('All Church Members');
  const [quizDuration, setQuizDuration] = useState('10'); // minutes (0 for unlimited)
  const [quizAttempts, setQuizAttempts] = useState('1');
  const [quizPassingScore, setQuizPassingScore] = useState('70');
  const [quizReviewMode, setQuizReviewMode] = useState<'instant' | 'after_submission' | 'never'>('after_submission');
  const [stagedQuestions, setStagedQuestions] = useState<BibleQuestion[]>([]);

  // Scheduling states in Create Quiz Wizard
  const [scheduleOption, setScheduleOption] = useState<'live_now' | 'in_2_hours' | 'today_evening' | 'tomorrow_morning' | 'tomorrow_evening' | 'custom'>('today_evening');
  const [customScheduleDate, setCustomScheduleDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  });
  const [customScheduleTime, setCustomScheduleTime] = useState('19:00');
  const [isSavingQuiz, setIsSavingQuiz] = useState(false);
  const [quizSuccessModalVisible, setQuizSuccessModalVisible] = useState(false);
  const [lastSavedQuiz, setLastSavedQuiz] = useState<AdminQuizItem | null>(null);
  const [lastSavedIntent, setLastSavedIntent] = useState<'draft' | 'publish_now' | 'schedule'>('schedule');

  // Quick title presets for pastors
  const quickTitles = [
    'Sunday Bible Quiz',
    'Youth Bible Challenge',
    'Gospels & Life of Jesus',
    'Church Weekly Competition'
  ];

  // 1. Restore cached Bank Questions & Church Quizzes in 0ms on app open
  useEffect(() => {
    // Restore Question Bank cache
    AsyncStorage.getItem(BANK_QUESTIONS_CACHE_KEY)
      .then(stored => {
        if (stored) {
          try {
            const parsed = JSON.parse(stored);
            if (Array.isArray(parsed)) {
              inMemoryBankQuestionsCache = parsed;
              setBankQuestions(parsed);
            }
          } catch (_) {}
        }
      })
      .catch(() => {});

    // Restore Quizzes cache
    AsyncStorage.getItem(CACHE_STORAGE_KEY)
      .then(stored => {
        if (stored) {
          try {
            const parsed = JSON.parse(stored);
            if (Array.isArray(parsed) && parsed.length > 0) {
              inMemoryQuizzesCache = parsed;
              setQuizzes(parsed);
            }
          } catch (_) {}
        }
      })
      .catch(() => {});

    // Ensure FCM token for this admin/device is registered and synchronized with Firestore
    NotificationService.syncTokenIfLoggedIn();
  }, []);

  // 2. Real-time listener for Bible Question Bank (dedicated Firestore collection: bible_question_bank)
  useEffect(() => {
    const unsub = firestore()
      .collection(BANK_QUESTIONS_COLLECTION)
      .onSnapshot(
        snapshot => {
          if (snapshot && !snapshot.empty) {
            const list: BibleQuestion[] = snapshot.docs.map(doc => ({
              id: doc.id,
              ...doc.data()
            } as BibleQuestion));

            inMemoryBankQuestionsCache = list;
            setBankQuestions(list);
            AsyncStorage.setItem(BANK_QUESTIONS_CACHE_KEY, JSON.stringify(list)).catch(() => {});
          } else {
            inMemoryBankQuestionsCache = [];
            setBankQuestions([]);
            AsyncStorage.setItem(BANK_QUESTIONS_CACHE_KEY, JSON.stringify([])).catch(() => {});
          }
        },
        err => console.log('Notice: bible_question_bank sync notice:', err)
      );
    return () => unsub();
  }, []);

  // Quick 1-tap random question selection from real question bank
  const handleQuickPickQuestions = (count: number) => {
    if (bankQuestions.length === 0) {
      Alert.alert('Question Bank is Empty', 'Please add questions to the Question Bank first using the "+" button.');
      return;
    }
    const pool = [...bankQuestions];
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    const picked = pool.slice(0, count);
    setStagedQuestions(picked);
  };

  // 3. Real-time background sync for Church Quizzes (dedicated Firestore collection: church_quizzes)
  useEffect(() => {
    const unsubscribe = firestore()
      .collection(QUIZZES_COLLECTION)
      .onSnapshot(
        snap => {
          setIsSyncing(false);
          setRefreshing(false);
          if (snap && !snap.empty) {
            const list: AdminQuizItem[] = snap.docs
              .filter(doc => {
                const d = doc.data();
                return d.status !== 'deleted' && !d.isDeleted;
              })
              .map(doc => {
                const d = doc.data();
                return {
                  id: doc.id,
                  title: d.title || 'Untitled Quiz',
                  category: d.category || 'General Bible',
                  audience: d.audience || 'All Church Members',
                  status: (d.status || 'draft') as 'draft' | 'published' | 'scheduled' | 'completed',
                  isLive: d.isLive ?? false,
                  scheduledDate: d.scheduledDate,
                  scheduledDateStr: d.scheduledDateStr,
                  liveStartedAt: d.liveStartedAt,
                  durationMinutes: d.durationMinutes || 10,
                  maxAttempts: d.maxAttempts || 1,
                  passingScore: d.passingScore || 70,
                  reviewAnswers: d.reviewAnswers || 'after_submission',
                  questions: d.questions || [],
                  questionCount: d.questionCount || (d.questions ? d.questions.length : 0),
                  createdAt: d.createdAt || new Date().toISOString(),
                };
              });
            // Sort by newest created first in memory
            list.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());

            inMemoryQuizzesCache = list;
            setQuizzes(list);
            AsyncStorage.setItem(CACHE_STORAGE_KEY, JSON.stringify(list)).catch(() => {});
            // Immediately sync with Member View competitions cache in 0ms
            BibleQuizService.setSharedChurchQuizzes(
              list.filter(q => (q.status === 'published' || q.status === 'scheduled') && !q.isDeleted)
            );
          } else {
            inMemoryQuizzesCache = [];
            setQuizzes([]);
            AsyncStorage.setItem(CACHE_STORAGE_KEY, JSON.stringify([])).catch(() => {});
            BibleQuizService.setSharedChurchQuizzes([]);
          }
        },
        error => {
          console.log('Firebase church_quizzes onSnapshot notice:', error);
          setIsSyncing(false);
          setRefreshing(false);
        }
      );

    return () => unsubscribe();
  }, []);

  // Filter bank questions
  const filteredBankQuestions = useMemo(() => {
    return bankQuestions.filter(q => {
      if (bankTestament !== 'all' && q.testament !== bankTestament) return false;
      if (bankDifficulty !== 'all' && q.difficulty !== bankDifficulty) return false;
      if (selectedBook !== 'all' && q.book !== selectedBook) return false;
      if (bankSearch.trim()) {
        const s = bankSearch.toLowerCase();
        const mQ = q.question.toLowerCase().includes(s);
        const mRef = q.verseReference.toLowerCase().includes(s);
        const mBook = q.book.toLowerCase().includes(s);
        if (!mQ && !mRef && !mBook) return false;
      }
      return true;
    });
  }, [bankQuestions, bankTestament, bankDifficulty, selectedBook, bankSearch]);

  // Unique books available in bank
  const availableBooks = useMemo(() => {
    const set = new Set<string>();
    bankQuestions.forEach(q => set.add(q.book));
    return ['all', ...Array.from(set)];
  }, [bankQuestions]);

  // Handle selecting / toggling question in Wizard (Method A)
  const toggleStagedQuestion = (q: BibleQuestion) => {
    const exists = stagedQuestions.some(item => item.id === q.id);
    if (exists) {
      setStagedQuestions(prev => prev.filter(item => item.id !== q.id));
    } else {
      setStagedQuestions(prev => [...prev, q]);
    }
  };

  // Reordering staged questions in Wizard
  const moveQuestion = (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === stagedQuestions.length - 1) return;
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    const copy = [...stagedQuestions];
    const temp = copy[index];
    copy[index] = copy[targetIndex];
    copy[targetIndex] = temp;
    setStagedQuestions(copy);
  };

  const removeStagedQuestion = (id: string) => {
    setStagedQuestions(prev => prev.filter(q => q.id !== id));
  };

  // Delete published or draft quiz permanently
  const handleDeleteQuiz = (quiz: AdminQuizItem) => {
    Alert.alert(
      'Delete Quiz?',
      `Are you sure you want to delete "${quiz.title}"?\n\nChurch members will no longer be able to take this quiz.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive', 
          onPress: async () => {
            try {
              // 1. Immediately update local admin state and cache
              const updated = quizzes.filter(q => q.id !== quiz.id);
              inMemoryQuizzesCache = updated;
              setQuizzes(updated);
              AsyncStorage.setItem(CACHE_STORAGE_KEY, JSON.stringify(updated)).catch(() => {});

              // 2. Also immediately purge from member published quizzes cache in AsyncStorage
              // Immediately update shared Member View cache in 0ms
              BibleQuizService.setSharedChurchQuizzes(
                updated.filter(q => (q.status === 'published' || q.status === 'scheduled') && !q.isDeleted)
              );

              // 3. Mark as deleted in Firestore first so all real-time queries immediately receive removal
              try {
                await firestore().collection(QUIZZES_COLLECTION).doc(quiz.id).set({
                  status: 'deleted',
                  isDeleted: true,
                  isLive: false,
                  deletedAt: new Date().toISOString()
                }, { merge: true });
              } catch (_) {}

              // 4. Delete Firestore document
              await firestore().collection(QUIZZES_COLLECTION).doc(quiz.id).delete();
              Alert.alert('Quiz Deleted', `"${quiz.title}" has been deleted.`);
            } catch (err: any) {
              console.error('Delete quiz error:', err);
              Alert.alert('Error', 'Could not delete quiz. Please check your connection.');
            }
          }
        }
      ]
    );
  };

  // Delete question permanently from Bible Question Bank in Firestore
  const handleDeleteBankQuestion = (q: BibleQuestion) => {
    Alert.alert(
      'Delete Question',
      `Are you sure you want to delete this question from the Question Bank?\n\n"${q.question.length > 80 ? q.question.slice(0, 80) + '...' : q.question}"`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await firestore().collection(BANK_QUESTIONS_COLLECTION).doc(q.id).delete();
              const updated = bankQuestions.filter(item => item.id !== q.id);
              inMemoryBankQuestionsCache = updated;
              setBankQuestions(updated);
              AsyncStorage.setItem(BANK_QUESTIONS_CACHE_KEY, JSON.stringify(updated)).catch(() => {});
              Alert.alert('Question Deleted', 'Removed from Bible Question Bank.');
            } catch (err: any) {
              console.error('Error deleting question:', err);
              Alert.alert('Error', `Could not delete question: ${err?.message || 'Please check your connection.'}`);
            }
          }
        }
      ]
    );
  };

  // Open Bible picker modal initialized to book, chapter, or verse step
  const openBiblePicker = (step: 'book' | 'chapter' | 'verse' = 'book') => {
    if (newBook.trim()) {
      setPickerSelectedBook(newBook.trim());
      const isOT = BIBLE_BOOKS_DATA.OT.some(b => b.toLowerCase() === newBook.toLowerCase().trim());
      setPickerTestament(isOT ? 'OT' : 'NT');
    }
    if (newChapter.trim()) {
      setPickerSelectedChapter(parseInt(newChapter, 10) || 1);
    }
    if (newVerse.trim()) {
      setPickerVerseInput(newVerse.trim());
    }
    setPickerStep(step);
    setPickerBookSearch('');
    setBiblePickerVisible(true);
  };

  // Confirm Bible Selection and auto-populate scripture reference
  const handleApplyBibleSelection = () => {
    const book = pickerSelectedBook;
    const chapter = pickerSelectedChapter;
    const verse = pickerVerseInput.trim() || '1';

    setNewBook(book);
    setNewChapter(String(chapter));
    setNewVerse(verse);
    setBiblePickerVisible(false);

    // If question text is empty, prompt pastor to optionally auto-generate with Claude AI
    if (!newQuestionText.trim()) {
      Alert.alert(
        `Scripture Selected: ${book} ${chapter}:${verse}`,
        'Would you like Claude AI to auto-generate the question, 4 options, and theological explanation, or will you type manually?',
        [
          { text: 'Type Manually', style: 'cancel' },
          {
            text: '✨ Auto-Generate (AI)',
            onPress: () => handleGenerateFromScripture(book, chapter, verse)
          }
        ]
      );
    } else if (!newExplanation.trim()) {
      // Auto-generate explanation if not provided
      handleAutoGenerateExplanation(book, String(chapter), verse);
    }
  };

  // Generate question, options, answer, and explanation from scripture reference using Anthropic Claude AI
  const handleGenerateFromScripture = async (bookParam?: string, chapterParam?: number, verseParam?: string) => {
    const book = bookParam || newBook.trim();
    const chapter = chapterParam || parseInt(newChapter, 10) || 1;
    const verse = verseParam || newVerse.trim();

    if (!book) {
      Alert.alert('Scripture Missing', 'Please select a Bible Book and Chapter first.');
      return;
    }

    setIsGeneratingQuestion(true);
    try {
      const generated = await anthropicQuizService.generateQuestionFromScripture({
        book,
        chapter,
        verse,
        difficulty: newDifficulty
      });

      setNewQuestionText(generated.question);
      setNewOptionA(generated.options[0]?.text || '');
      setNewOptionB(generated.options[1]?.text || '');
      setNewOptionC(generated.options[2]?.text || '');
      setNewOptionD(generated.options[3]?.text || '');
      setNewCorrectOption(generated.correctOptionId);
      setNewExplanation(generated.explanation);
      if (!newBook) setNewBook(book);
      if (!newChapter) setNewChapter(String(chapter));
      if (!newVerse && verse) setNewVerse(verse);

      Alert.alert(
        'Question Generated!',
        `Created question based on ${book} ${chapter}${verse ? ':' + verse : ''}. You can review or edit any field before saving.`
      );
    } catch (err: any) {
      console.warn('Anthropic question generation error:', err);
      Alert.alert('AI Error', `Could not generate question: ${err?.message || 'Please check your connection and try again.'}`);
    } finally {
      setIsGeneratingQuestion(false);
    }
  };

  // Auto-generate explanation using Anthropic Claude AI
  const handleAutoGenerateExplanation = async (bookParam?: string, chapterParam?: string, verseParam?: string) => {
    const book = bookParam || newBook.trim();
    const chapter = chapterParam || newChapter.trim();
    const verse = verseParam || newVerse.trim();
    const scriptureRef = book ? `${book} ${chapter ? chapter + ':' : ''}${verse}` : 'Bible Scripture';

    if (!newQuestionText.trim() && !book) {
      Alert.alert('Info Needed', 'Please enter a Question Text or select a Bible Reference first so Claude AI can generate an accurate explanation.');
      return;
    }

    const correctText = newCorrectOption === 'a' ? newOptionA 
      : newCorrectOption === 'b' ? newOptionB 
      : newCorrectOption === 'c' ? newOptionC 
      : newOptionD;

    setIsGeneratingExplanation(true);
    try {
      const exp = await anthropicQuizService.generateExplanation({
        question: newQuestionText.trim() || `Scripture question on ${scriptureRef}`,
        scriptureRef,
        correctOptionText: correctText.trim() || undefined
      });

      setNewExplanation(exp);
    } catch (err: any) {
      console.warn('Anthropic explanation error:', err);
      Alert.alert('AI Notice', `Could not generate explanation: ${err?.message || 'Please type explanation manually.'}`);
    } finally {
      setIsGeneratingExplanation(false);
    }
  };

  // Save new verified question to Question Bank in Firestore (collection: bible_question_bank)
  const handleSaveNewQuestion = async () => {
    if (!newQuestionText.trim()) {
      Alert.alert('Required', 'Please enter question text.');
      return;
    }
    if (!newOptionA.trim() || !newOptionB.trim()) {
      Alert.alert('Required', 'Please provide at least Option A and Option B.');
      return;
    }

    const options = [
      { id: 'a', text: newOptionA.trim() },
      { id: 'b', text: newOptionB.trim() },
      ...(newOptionC.trim() ? [{ id: 'c', text: newOptionC.trim() }] : []),
      ...(newOptionD.trim() ? [{ id: 'd', text: newOptionD.trim() }] : []),
    ];

    const book = newBook.trim() || 'General';
    const ch = parseInt(newChapter, 10) || 1;
    const v = newVerse.trim() || '1';
    const verseRef = newBook.trim() ? `${newBook} ${newChapter ? newChapter + ':' : ''}${newVerse}` : 'Bible Scripture';

    const newQ: BibleQuestion = {
      id: `bank-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      question: newQuestionText.trim(),
      options,
      correctOptionId: newCorrectOption,
      book,
      chapter: ch,
      verse: v,
      verseReference: verseRef,
      explanation: newExplanation.trim() || 'Verified Church of God scripture teaching.',
      difficulty: newDifficulty,
      testament: inferTestament(book),
      source: 'admin'
    };

    try {
      await firestore().collection(BANK_QUESTIONS_COLLECTION).doc(newQ.id).set({
        ...newQ,
        createdBy: member?.name || 'Pastor / Administrator',
        createdById: member?.id || 'admin',
        createdAt: new Date().toISOString()
      });
      const updatedBank = [newQ, ...bankQuestions.filter(q => q.id !== newQ.id)];
      inMemoryBankQuestionsCache = updatedBank;
      setBankQuestions(updatedBank);
      AsyncStorage.setItem(BANK_QUESTIONS_CACHE_KEY, JSON.stringify(updatedBank)).catch(() => {});
      
      // Reset form
      setNewQuestionText('');
      setNewOptionA('');
      setNewOptionB('');
      setNewOptionC('');
      setNewOptionD('');
      setNewBook('');
      setNewChapter('');
      setNewVerse('');
      setNewExplanation('');
      setAddQuestionModalVisible(false);

      Alert.alert('Question Added!', `Added to Bible Question Bank in Firebase. Total questions: ${updatedBank.length}`);
    } catch (e: any) {
      console.error('Error saving question:', e);
      Alert.alert('Error', `Could not save question: ${e?.message || 'Please check Firestore rules and connection.'}`);
    }
  };

  // Compute exact schedule timing details based on selected preset
  const getScheduleTiming = () => {
    const now = new Date();
    if (scheduleOption === 'live_now') {
      return {
        isLive: false,
        status: 'published' as const,
        scheduledDate: now.toISOString(),
        scheduledDateStr: 'Immediate (Waiting to Start)'
      };
    }

    if (scheduleOption === 'in_2_hours') {
      const d = new Date(now.getTime() + 2 * 60 * 60 * 1000);
      const timeStr = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      return {
        isLive: false,
        status: 'scheduled' as const,
        scheduledDate: d.toISOString(),
        scheduledDateStr: `Today at ${timeStr} (in 2 hours)`
      };
    }

    if (scheduleOption === 'today_evening') {
      const d = new Date(now);
      d.setHours(19, 0, 0, 0);
      if (d.getTime() <= now.getTime()) {
        d.setTime(now.getTime() + 90 * 60 * 1000);
      }
      const timeStr = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      return {
        isLive: false,
        status: 'scheduled' as const,
        scheduledDate: d.toISOString(),
        scheduledDateStr: `Today at ${timeStr}`
      };
    }

    if (scheduleOption === 'tomorrow_morning') {
      const d = new Date(now);
      d.setDate(d.getDate() + 1);
      d.setHours(9, 0, 0, 0);
      return {
        isLive: false,
        status: 'scheduled' as const,
        scheduledDate: d.toISOString(),
        scheduledDateStr: `Tomorrow at 9:00 AM`
      };
    }

    if (scheduleOption === 'tomorrow_evening') {
      const d = new Date(now);
      d.setDate(d.getDate() + 1);
      d.setHours(19, 0, 0, 0);
      return {
        isLive: false,
        status: 'scheduled' as const,
        scheduledDate: d.toISOString(),
        scheduledDateStr: `Tomorrow at 7:00 PM`
      };
    }

    // Custom option
    let d = new Date();
    try {
      const [year, month, day] = customScheduleDate.split('-').map(Number);
      const [hour, min] = customScheduleTime.split(':').map(Number);
      if (year && month && day) {
        d = new Date(year, month - 1, day, hour || 19, min || 0, 0);
      }
    } catch (_) {}
    const dateStr = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const timeStr = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    return {
      isLive: false,
      status: 'scheduled' as const,
      scheduledDate: d.toISOString(),
      scheduledDateStr: `${dateStr} at ${timeStr}`
    };
  };

  // Save / Publish / Schedule Quiz to Firebase Firestore (instant 0ms response, sanitized payload)
  const handleSaveQuiz = async (intent: 'draft' | 'publish_now' | 'schedule') => {
    if (!quizTitle.trim()) {
      Alert.alert('Title Missing', 'Please enter a title for the quiz.');
      return;
    }
    // Only require questions when publishing or scheduling; drafts can be saved with 0 questions!
    if (intent !== 'draft' && stagedQuestions.length === 0) {
      Alert.alert('No Questions Added', 'Please add at least 1 question to publish or schedule this quiz.');
      return;
    }

    setIsSavingQuiz(true);
    const quizId = `quiz-${Date.now()}`;
    const scheduleInfo = intent === 'draft' 
      ? { isLive: false, status: 'draft' as const, scheduledDate: null, scheduledDateStr: 'Draft' }
      : intent === 'publish_now'
        ? { isLive: false, status: 'published' as const, scheduledDate: new Date().toISOString(), scheduledDateStr: 'Immediate (Waiting to Start)' }
        : getScheduleTiming();

    const newQuiz: AdminQuizItem = {
      id: quizId,
      title: quizTitle.trim(),
      category: quizCategory || 'Bible Knowledge',
      audience: quizAudience || 'All Members',
      status: scheduleInfo.status,
      isLive: scheduleInfo.isLive,
      scheduledDate: scheduleInfo.scheduledDate || undefined,
      scheduledDateStr: scheduleInfo.scheduledDateStr || (scheduleInfo.isLive ? 'Live Now' : 'Draft'),
      liveStartedAt: scheduleInfo.isLive ? new Date().toISOString() : undefined,
      durationMinutes: parseInt(quizDuration, 10) || 10,
      maxAttempts: parseInt(quizAttempts, 10) || 1,
      passingScore: parseInt(quizPassingScore, 10) || 70,
      reviewAnswers: quizReviewMode,
      questions: stagedQuestions,
      questionCount: stagedQuestions.length,
      createdAt: new Date().toISOString(),
      createdBy: member?.name || 'Administrator',
      createdById: member?.id || 'admin'
    };

    // 1. Immediately update local admin state & cache for instant 0ms response
    const updatedList = [newQuiz, ...quizzes.filter(q => q.id !== quizId)];
    inMemoryQuizzesCache = updatedList;
    setQuizzes(updatedList);
    AsyncStorage.setItem(CACHE_STORAGE_KEY, JSON.stringify(updatedList)).catch(() => {});

    // 2. If published or scheduled, also immediately update member published cache in 0ms
    if (intent !== 'draft') {
      BibleQuizService.setSharedChurchQuizzes(
        updatedList.filter(q => (q.status === 'published' || q.status === 'scheduled') && !q.isDeleted)
      );
    }

    // 3. Close create modal & trigger celebration modal immediately without hanging UI!
    setLastSavedQuiz(newQuiz);
    setLastSavedIntent(intent);
    setCreateQuizModalVisible(false);
    setQuizSuccessModalVisible(true);
    setIsSavingQuiz(false);

    // 4. Sanitize Firestore payload (guarantee NO undefined values reach Firestore SDK)
    const cleanQuizDoc = {
      id: quizId,
      title: newQuiz.title,
      category: newQuiz.category,
      audience: newQuiz.audience,
      status: newQuiz.status,
      isLive: newQuiz.isLive,
      scheduledDate: newQuiz.scheduledDate || null,
      scheduledDateStr: newQuiz.scheduledDateStr || (newQuiz.isLive ? 'Live Now' : 'Draft'),
      liveStartedAt: newQuiz.liveStartedAt || null,
      durationMinutes: newQuiz.durationMinutes,
      maxAttempts: newQuiz.maxAttempts,
      passingScore: newQuiz.passingScore,
      reviewAnswers: newQuiz.reviewAnswers,
      questions: stagedQuestions.map(q => JSON.parse(JSON.stringify(q))),
      questionCount: stagedQuestions.length,
      createdAt: newQuiz.createdAt,
      createdBy: newQuiz.createdBy,
      createdById: newQuiz.createdById,
      updatedAt: new Date().toISOString()
    };
    const sanitizedPayload = JSON.parse(JSON.stringify(cleanQuizDoc));

    // 5. Persist to Firestore & broadcast notifications in background
    (async () => {
      try {
        // Save top-level quiz metadata
        await firestore().collection(QUIZZES_COLLECTION).doc(quizId).set(sanitizedPayload);

        // Snapshot questions in subcollection if any exist
        if (stagedQuestions.length > 0) {
          const batch = firestore().batch();
          stagedQuestions.forEach((q, idx) => {
            const qRef = firestore().collection(QUIZZES_COLLECTION).doc(quizId).collection('questions').doc(q.id);
            const cleanQ = JSON.parse(JSON.stringify(q));
            batch.set(qRef, {
              ...cleanQ,
              orderIndex: idx + 1
            });
          });
          await batch.commit();
        }

        // Broadcast notifications for scheduled or prepared quizzes
        if (intent !== 'draft') {
          const notifTitle = '📅 Church Bible Quiz Prepared';
          const notifBody = `Pastor has prepared "${newQuiz.title}" (${newQuiz.scheduledDateStr}). Get ready to participate once Pastor starts the quiz!`;

          // 1. Dispatch push notification via Cloud Function (asia-south1)
          try {
            const notifyCallable = functions().app.functions('asia-south1').httpsCallable('notifyMembers');
            notifyCallable({
              title: notifTitle,
              body: notifBody,
              type: 'bible_quiz',
              target: 'all'
            }).then((res: any) => {
              console.log('✅ Prepared Quiz Push Notification dispatched via notifyMembers:', res?.data);
            }).catch((err: any) => {
              console.warn('⚠️ notifyMembers notice:', err?.message || err);
            });
          } catch (_) {}

          // 2. Firestore broadcast
          firestore().collection('broadcasts').add({
            title: notifTitle,
            content: notifBody,
            type: 'bible_quiz',
            quizId: newQuiz.id,
            isLive: false,
            scheduledTime: newQuiz.scheduledDate || null,
            date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
            createdAt: firestore.FieldValue.serverTimestamp()
          }).then(docRef => {
            console.log('✅ Scheduled quiz broadcast saved to Firestore:', docRef.id);
          }).catch(err => console.log('Notice: Broadcast notice:', err));

          // Salesforce broadcast log
          SalesforceService.createNotificationBroadcast({
            title: notifTitle,
            message: notifBody,
            type: 'Announcement',
            sendTo: 'All'
          }).catch(() => {});
        }
      } catch (err: any) {
        console.warn('Background Firestore save notice:', err);
      }
    })();
  };

  // Start quiz live at exact scheduled time (pastor clicks Start button in Admin Dashboard)
  const handleStartQuizNow = (quiz: AdminQuizItem) => {
    Alert.alert(
      'Start Quiz Now? 🔴',
      `Launch "${quiz.title}" for church members right now?\n\nThis will make the quiz LIVE immediately and send a Live Push Notification to all church members.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Start Quiz Now',
          style: 'default',
          onPress: async () => {
            try {
              const nowIso = new Date().toISOString();
              await firestore().collection(QUIZZES_COLLECTION).doc(quiz.id).update({
                status: 'published',
                isLive: true,
                liveStartedAt: nowIso
              });

              const updated: AdminQuizItem[] = quizzes.map(q => 
                q.id === quiz.id ? { ...q, status: 'published', isLive: true, liveStartedAt: nowIso } : q
              );
              inMemoryQuizzesCache = updated;
              setQuizzes(updated);
              AsyncStorage.setItem(CACHE_STORAGE_KEY, JSON.stringify(updated)).catch(() => {});

              // Also update member cache immediately
              BibleQuizService.setSharedChurchQuizzes(
                updated.filter(q => (q.status === 'published' || q.status === 'scheduled') && !q.isDeleted)
              );

              // Dispatch live push notification to all members!
              // 1. Direct Cloud Function call (asia-south1) for immediate multicast delivery
              try {
                const notifyCallable = functions().app.functions('asia-south1').httpsCallable('notifyMembers');
                notifyCallable({
                  title: '🔴 Bible Quiz is NOW LIVE!',
                  body: `"${quiz.title}" is NOW LIVE! Tap here to join and test your Scripture knowledge!`,
                  type: 'bible_quiz',
                  target: 'all'
                }).then((res: any) => {
                  console.log('✅ Live Quiz Push Notification delivered via notifyMembers:', res?.data);
                }).catch((notifyErr: any) => {
                  console.warn('⚠️ notifyMembers dispatch notice:', notifyErr?.message || notifyErr);
                });
              } catch (pushErr) {
                console.warn('⚠️ Could not invoke notifyMembers:', pushErr);
              }

              // 2. Also record in Firestore broadcasts (syncs to member Updates feed & triggers background push)
              firestore().collection('broadcasts').add({
                title: '🔴 Bible Quiz is NOW LIVE!',
                content: `"${quiz.title}" is NOW LIVE! Tap here to join and test your Scripture knowledge!`,
                type: 'bible_quiz',
                quizId: quiz.id,
                isLive: true,
                date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
                createdAt: firestore.FieldValue.serverTimestamp()
              }).then(docRef => {
                console.log('✅ Broadcast saved to Firestore with ID:', docRef.id);
              }).catch(err => {
                console.warn('⚠️ Error recording broadcast to Firestore:', err);
              });

              SalesforceService.createNotificationBroadcast({
                title: `🔴 LIVE QUIZ: ${quiz.title}`,
                message: `Church Bible Quiz "${quiz.title}" is NOW LIVE for all members!`,
                type: 'Announcement',
                sendTo: 'All'
              }).catch(() => {});

              Alert.alert('Quiz is Now LIVE! 🔴', 'Church members can now tap Take This Quiz and participate. Push notifications have been sent to member devices!');
            } catch (err: any) {
              console.error('Error starting quiz live:', err);
              Alert.alert('Error', `Could not start quiz: ${err?.message || 'Please check connection.'}`);
            }
          }
        }
      ]
    );
  };

  // Pause / Set quiz to Waiting (pastor stops live mode without concluding)
  const handlePauseQuiz = (quiz: AdminQuizItem) => {
    Alert.alert(
      'Set Quiz to Waiting? ⏳',
      `Stop live mode for "${quiz.title}" and put it back to Waiting?\n\nMembers will no longer see "Join Live Quiz" until you click "Start Quiz Now" again.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Set to Waiting',
          style: 'default',
          onPress: async () => {
            try {
              await firestore().collection(QUIZZES_COLLECTION).doc(quiz.id).update({
                isLive: false
              });

              const updated: AdminQuizItem[] = quizzes.map(q => 
                q.id === quiz.id ? { ...q, isLive: false } : q
              );
              inMemoryQuizzesCache = updated;
              setQuizzes(updated);
              AsyncStorage.setItem(CACHE_STORAGE_KEY, JSON.stringify(updated)).catch(() => {});

              // Also update member cache immediately
              BibleQuizService.setSharedChurchQuizzes(
                updated.filter(q => (q.status === 'published' || q.status === 'scheduled') && !q.isDeleted)
              );

              Alert.alert('Quiz Set to Waiting ⏳', `"${quiz.title}" is now waiting for you to click Start Quiz Now.`);
            } catch (err: any) {
              Alert.alert('Error', 'Could not update quiz.');
            }
          }
        }
      ]
    );
  };

  // Conclude / End a live quiz
  const handleEndQuiz = (quiz: AdminQuizItem) => {
    Alert.alert(
      'End Quiz?',
      `Are you sure you want to end "${quiz.title}"? Members will no longer be able to start new attempts.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'End Quiz',
          style: 'destructive',
          onPress: async () => {
            try {
              await firestore().collection(QUIZZES_COLLECTION).doc(quiz.id).update({
                isLive: false,
                status: 'completed'
              });

              const updated: AdminQuizItem[] = quizzes.map(q => 
                q.id === quiz.id ? { ...q, isLive: false, status: 'completed' } : q
              );
              inMemoryQuizzesCache = updated;
              setQuizzes(updated);
              AsyncStorage.setItem(CACHE_STORAGE_KEY, JSON.stringify(updated)).catch(() => {});

              // Also update member cache immediately
              AsyncStorage.getItem('CODG_MEMBER_PUBLISHED_QUIZZES_KEY')
                .then(stored => {
                  const list = stored ? JSON.parse(stored) : [];
                  const updatedMember = list.map((q: any) => 
                    q.id === quiz.id ? { ...q, isLive: false, status: 'completed' } : q
                  );
                  return AsyncStorage.setItem('CODG_MEMBER_PUBLISHED_QUIZZES_KEY', JSON.stringify(updatedMember));
                })
                .catch(() => {});

              Alert.alert('Quiz Concluded', 'This quiz is now closed for submissions.');
            } catch (err: any) {
              Alert.alert('Error', 'Could not end quiz.');
            }
          }
        }
      ]
    );
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'published': return '#10b981';
      case 'scheduled': return '#3b82f6';
      case 'completed': return '#64748b';
      default: return '#f59e0b';
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: isDark ? '#0b1120' : '#f8fafc' }]}>
      {/* ── Top Header Bar ── */}
      <View style={[styles.header, { paddingTop: safeTopPadding, backgroundColor: isDark ? '#111c34' : '#ffffff', borderBottomColor: isDark ? '#1e2d4d' : '#e2e8f0' }]}>
        <TouchableOpacity style={styles.backBtn} onPress={goBack} activeOpacity={0.75}>
          <ChevronLeft size={24} color={isDark ? '#fcd34d' : colors.primary} />
        </TouchableOpacity>
        <View style={styles.headerTitleWrap}>
          <Text style={[styles.headerTitle, { color: isDark ? '#ffffff' : '#0f172a' }]}>Bible Quiz Management</Text>
          <Text style={[styles.headerSubtitle, { color: isDark ? '#94a3b8' : '#64748b' }]}>Church Competitions & Question Bank</Text>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* ── Quick Stats Row ── */}
        <View style={styles.statsRow}>
          <LinearGradient colors={isDark ? ['#1e293b', '#0f172a'] : ['#eff6ff', '#dbeafe']} style={styles.statCard}>
            <View style={[styles.statIconCircle, { backgroundColor: 'rgba(59, 130, 246, 0.15)' }]}>
              <Award size={18} color="#3b82f6" />
            </View>
            <Text style={[styles.statValue, { color: isDark ? '#ffffff' : '#0f172a' }]}>{quizzes.length}</Text>
            <Text style={[styles.statLabel, { color: isDark ? '#94a3b8' : '#64748b' }]}>Total Quizzes</Text>
          </LinearGradient>

          <LinearGradient colors={isDark ? ['#1e293b', '#0f172a'] : ['#fef3c7', '#fde68a']} style={styles.statCard}>
            <View style={[styles.statIconCircle, { backgroundColor: 'rgba(245, 158, 11, 0.15)' }]}>
              <BookOpen size={18} color="#f59e0b" />
            </View>
            <Text style={[styles.statValue, { color: isDark ? '#ffffff' : '#0f172a' }]}>{bankQuestions.length}</Text>
            <Text style={[styles.statLabel, { color: isDark ? '#94a3b8' : '#64748b' }]}>Bank Questions</Text>
          </LinearGradient>

          <LinearGradient colors={isDark ? ['#1e293b', '#0f172a'] : ['#ecfdf5', '#d1fae5']} style={styles.statCard}>
            <View style={[styles.statIconCircle, { backgroundColor: 'rgba(16, 185, 129, 0.15)' }]}>
              <Users size={18} color="#10b981" />
            </View>
            <Text style={[styles.statValue, { color: isDark ? '#ffffff' : '#0f172a' }]}>
              {quizzes.filter(q => q.status === 'published').length}
            </Text>
            <Text style={[styles.statLabel, { color: isDark ? '#94a3b8' : '#64748b' }]}>Active Live</Text>
          </LinearGradient>
        </View>

        {/* ── Action Launchers: Clean & Intuitive ── */}
        <View style={styles.launchersCard}>
          {/* Main Action: Create Bible Quiz */}
          <TouchableOpacity 
            style={[styles.primaryLauncher, { backgroundColor: colors.primary }]}
            onPress={() => {
              setWizardStep(1);
              setCreateQuizModalVisible(true);
            }}
            activeOpacity={0.85}
          >
            <LinearGradient colors={['#1e3a8a', '#172554']} style={styles.primaryLauncherGradient}>
              <View style={styles.launcherIconWrap}>
                <Sparkles size={24} color="#fcd34d" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.launcherTitle}>Create Bible Quiz</Text>
                <Text style={styles.launcherSub}>Easily create & publish quiz for church members</Text>
              </View>
              <View style={styles.launcherArrow}>
                <Plus size={18} color="#fcd34d" />
              </View>
            </LinearGradient>
          </TouchableOpacity>

          {/* Long Card: Select from Bible */}
          <TouchableOpacity 
            style={[
              styles.selectFromBibleLongCard, 
              { 
                backgroundColor: isDark ? '#141f36' : '#ffffff', 
                borderColor: isDark ? '#213052' : '#e2e8f0' 
              }
            ]}
            onPress={() => {
              setAddQuestionModalVisible(true);
              setTimeout(() => openBiblePicker('book'), 250);
            }}
            activeOpacity={0.85}
          >
            <View style={[styles.bibleCardIconWrap, { backgroundColor: isDark ? 'rgba(59, 130, 246, 0.15)' : '#eff6ff' }]}>
              <BookOpen size={22} color="#3b82f6" />
            </View>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Text style={[styles.bibleCardTitle, { color: isDark ? '#ffffff' : '#0f172a' }]}>
                  Select from Bible
                </Text>
                <View style={[styles.comingSoonBadge, { backgroundColor: isDark ? 'rgba(252, 211, 77, 0.15)' : '#fef3c7' }]}>
                  <Text style={[styles.comingSoonText, { color: isDark ? '#fcd34d' : '#b45309' }]}>
                    Interactive
                  </Text>
                </View>
              </View>
              <Text style={[styles.bibleCardSub, { color: isDark ? '#94a3b8' : '#64748b' }]}>
                Browse Old & New Testament scriptures to add questions book-by-book
              </Text>
            </View>
            <ChevronRight size={18} color={isDark ? '#64748b' : '#94a3b8'} />
          </TouchableOpacity>
        </View>

        {/* ── Segment Toggle Tabs ── */}
        <View style={[styles.segmentContainer, { backgroundColor: isDark ? '#131e33' : '#e2e8f0' }]}>
          <TouchableOpacity 
            style={[styles.segmentTab, activeSegment === 'quizzes' && { backgroundColor: isDark ? '#223254' : '#ffffff' }]}
            onPress={() => setActiveSegment('quizzes')}
          >
            <Text style={[styles.segmentText, activeSegment === 'quizzes' && styles.segmentTextActive, { color: isDark ? '#ffffff' : '#0f172a' }]}>
              All Quizzes ({quizzes.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[
              styles.segmentTab, 
              activeSegment === 'bank' && { backgroundColor: isDark ? '#223254' : '#ffffff' },
              { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 }
            ]}
            onPress={() => setActiveSegment('bank')}
          >
            <Text style={[styles.segmentText, activeSegment === 'bank' && styles.segmentTextActive, { color: isDark ? '#ffffff' : '#0f172a' }]}>
              Question Bank ({bankQuestions.length})
            </Text>
            <TouchableOpacity 
              style={[styles.smallAddBadgeBtn, { backgroundColor: '#fcd34d' }]}
              onPress={() => setAddQuestionModalVisible(true)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Plus size={12} color="#0b1120" />
            </TouchableOpacity>
          </TouchableOpacity>
        </View>

        {/* ── Segment 1: Quizzes List ── */}
        {activeSegment === 'quizzes' && (
          <View style={styles.sectionWrap}>

            {quizzes.length === 0 ? (
              <View style={[styles.quizCard, { backgroundColor: isDark ? '#141f36' : '#ffffff', borderColor: isDark ? '#213052' : '#e2e8f0', alignItems: 'center', paddingVertical: 28 }]}>
                <BookOpen size={36} color="#fcd34d" style={{ marginBottom: 12 }} />
                <Text style={{ color: isDark ? '#ffffff' : '#0f172a', fontSize: 16, fontWeight: '800', marginBottom: 6 }}>
                  No Church Quizzes Created Yet
                </Text>
                <Text style={{ color: isDark ? '#94a3b8' : '#64748b', fontSize: 12, textAlign: 'center', maxWidth: 290, lineHeight: 18, marginBottom: 16 }}>
                  Quizzes are stored directly in Firebase collection 'church_quizzes'. Tap below to create your first competition or add questions to your bank!
                </Text>
                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <TouchableOpacity 
                    style={[styles.publishNowBtn, { backgroundColor: '#fcd34d' }]}
                    onPress={() => {
                      setWizardStep(1);
                      setCreateQuizModalVisible(true);
                    }}
                  >
                    <Plus size={16} color="#0b1120" />
                    <Text style={[styles.publishNowTxt, { color: '#0b1120' }]}>Create Quiz</Text>
                  </TouchableOpacity>

                  <TouchableOpacity 
                    style={[styles.saveDraftBtn, { borderColor: '#fcd34d' }]}
                    onPress={() => setAddQuestionModalVisible(true)}
                  >
                    <Plus size={16} color="#fcd34d" />
                    <Text style={[styles.saveDraftTxt, { color: '#fcd34d' }]}>+ Add Question</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              quizzes.map((quiz) => (
                <View 
                  key={quiz.id} 
                  style={[styles.quizCard, { backgroundColor: isDark ? '#141f36' : '#ffffff', borderColor: isDark ? '#213052' : '#e2e8f0' }]}
                >
                <View style={styles.quizHeaderRow}>
                  <View style={[styles.statusBadge, { 
                    backgroundColor: quiz.isLive 
                      ? '#ef444422' 
                      : quiz.status === 'scheduled' 
                        ? '#3b82f622' 
                        : getStatusColor(quiz.status) + '22' 
                  }]}>
                    <View style={[styles.statusDot, { 
                      backgroundColor: quiz.isLive 
                        ? '#ef4444' 
                        : quiz.status === 'scheduled' 
                          ? '#3b82f6' 
                          : getStatusColor(quiz.status) 
                    }]} />
                    <Text style={[styles.statusText, { 
                      color: quiz.isLive 
                        ? '#ef4444' 
                        : quiz.status === 'scheduled' 
                          ? '#3b82f6' 
                          : getStatusColor(quiz.status),
                      fontWeight: '800'
                    }]}>
                      {quiz.isLive ? '🔴 LIVE NOW' : quiz.status === 'scheduled' ? '📅 SCHEDULED' : quiz.status.toUpperCase()}
                    </Text>
                  </View>
                  <Text style={[styles.quizCategory, { color: isDark ? '#94a3b8' : '#64748b' }]}>{quiz.category}</Text>
                </View>

                <Text style={[styles.quizTitle, { color: isDark ? '#ffffff' : '#0f172a' }]}>{quiz.title}</Text>

                {/* Scheduled Timing Banner if scheduled */}
                {quiz.scheduledDateStr && !quiz.isLive && (
                  <View style={[styles.quizScheduleBanner, { backgroundColor: isDark ? '#1a2744' : '#eff6ff', borderColor: isDark ? '#26385a' : '#bfdbfe' }]}>
                    <Clock size={13} color="#3b82f6" />
                    <Text style={[styles.quizScheduleTxt, { color: isDark ? '#93c5fd' : '#1d4ed8' }]}>
                      Scheduled for: {quiz.scheduledDateStr}
                    </Text>
                  </View>
                )}

                <View style={styles.quizMetaRow}>
                  <View style={styles.metaItem}>
                    <Layers size={14} color="#fcd34d" />
                    <Text style={[styles.metaText, { color: isDark ? '#cbd5e1' : '#475569' }]}>{quiz.questionCount} Questions</Text>
                  </View>
                  <View style={styles.metaItem}>
                    <Clock size={14} color="#fcd34d" />
                    <Text style={[styles.metaText, { color: isDark ? '#cbd5e1' : '#475569' }]}>{quiz.durationMinutes} Mins</Text>
                  </View>
                  <View style={styles.metaItem}>
                    <Users size={14} color="#fcd34d" />
                    <Text style={[styles.metaText, { color: isDark ? '#cbd5e1' : '#475569' }]}>{quiz.audience}</Text>
                  </View>
                </View>

                <View style={[styles.quizFooterRow, { borderTopColor: isDark ? '#1e2c4a' : '#f1f5f9' }]}>
                  {/* Start Quiz Now or End Quiz button */}
                  {!quiz.isLive ? (
                    <TouchableOpacity 
                      style={[styles.startLiveBtn, { backgroundColor: '#10b981' }]}
                      onPress={() => handleStartQuizNow(quiz)}
                      activeOpacity={0.8}
                    >
                      <Play size={13} color="#ffffff" fill="#ffffff" />
                      <Text style={styles.startLiveBtnTxt}>Start Quiz Now</Text>
                    </TouchableOpacity>
                  ) : (
                    <View style={{ flexDirection: 'row', gap: 6 }}>
                      <TouchableOpacity 
                        style={[styles.startLiveBtn, { backgroundColor: '#f59e0b' }]}
                        onPress={() => handlePauseQuiz(quiz)}
                        activeOpacity={0.8}
                      >
                        <Clock size={13} color="#ffffff" />
                        <Text style={styles.startLiveBtnTxt}>Set Waiting</Text>
                      </TouchableOpacity>
                      <TouchableOpacity 
                        style={[styles.startLiveBtn, { backgroundColor: '#ef4444' }]}
                        onPress={() => handleEndQuiz(quiz)}
                        activeOpacity={0.8}
                      >
                        <Square size={13} color="#ffffff" fill="#ffffff" />
                        <Text style={styles.startLiveBtnTxt}>End</Text>
                      </TouchableOpacity>
                    </View>
                  )}

                  <TouchableOpacity 
                    style={styles.quizActionBtn}
                    onPress={() => {
                      setPreviewingQuiz(quiz);
                      setPreviewQuizModalVisible(true);
                    }}
                  >
                    <Eye size={15} color="#3b82f6" />
                    <Text style={styles.quizActionTxt}>Preview</Text>
                  </TouchableOpacity>

                  <TouchableOpacity 
                    style={styles.quizActionBtn}
                    onPress={() => handleDeleteQuiz(quiz)}
                  >
                    <Trash2 size={15} color="#ef4444" />
                    <Text style={[styles.quizActionTxt, { color: '#ef4444' }]}>Delete</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )))}
          </View>
        )}

        {/* ── Segment 2: Bible Question Bank Browser ── */}
        {activeSegment === 'bank' && (
          <View style={styles.sectionWrap}>
            {/* Bank Header Bar with + Add Question Button */}
            <View style={[styles.bankHeaderRow, { backgroundColor: isDark ? '#141f36' : '#ffffff', borderColor: isDark ? '#213052' : '#e2e8f0' }]}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.bankHeaderTitle, { color: isDark ? '#ffffff' : '#0f172a' }]}>
                  Verified Bible Question Bank
                </Text>
                <Text style={[styles.bankHeaderSub, { color: isDark ? '#94a3b8' : '#64748b' }]}>
                  {bankQuestions.length} verified scripture questions
                </Text>
              </View>

              <TouchableOpacity
                style={[styles.addBankQuestionBtn, { backgroundColor: '#fcd34d' }]}
                onPress={() => setAddQuestionModalVisible(true)}
                activeOpacity={0.8}
              >
                <Plus size={16} color="#0b1120" />
                <Text style={styles.addBankQuestionTxt}>Add Question</Text>
              </TouchableOpacity>
            </View>
            {/* Search Box */}
            <View style={[styles.searchBar, { backgroundColor: isDark ? '#141f36' : '#ffffff', borderColor: isDark ? '#213052' : '#e2e8f0' }]}>
              <Search size={18} color="#94a3b8" />
              <TextInput
                style={[styles.searchInput, { color: isDark ? '#ffffff' : '#0f172a' }]}
                placeholder="Search Scripture, book, chapter or keyword..."
                placeholderTextColor="#94a3b8"
                value={bankSearch}
                onChangeText={setBankSearch}
              />
              {bankSearch.length > 0 && (
                <TouchableOpacity onPress={() => setBankSearch('')}>
                  <X size={16} color="#94a3b8" />
                </TouchableOpacity>
              )}
            </View>

            {/* Filter Pills */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterPillsRow}>
              {/* Testament Filters */}
              {(['all', 'ot', 'nt'] as const).map(t => (
                <TouchableOpacity
                  key={t}
                  style={[
                    styles.filterPill,
                    bankTestament === t && { backgroundColor: colors.primary, borderColor: colors.primary },
                    { borderColor: isDark ? '#243456' : '#cbd5e1' }
                  ]}
                  onPress={() => setBankTestament(t)}
                >
                  <Text style={[styles.filterPillTxt, bankTestament === t && { color: '#fcd34d', fontWeight: '700' }]}>
                    {t === 'all' ? 'All Testaments' : t === 'ot' ? 'Old Testament' : 'New Testament'}
                  </Text>
                </TouchableOpacity>
              ))}

              {/* Difficulty Filters */}
              {['all', 'easy', 'medium', 'hard'].map(d => (
                <TouchableOpacity
                  key={d}
                  style={[
                    styles.filterPill,
                    bankDifficulty === d && { backgroundColor: '#f59e0b', borderColor: '#f59e0b' },
                    { borderColor: isDark ? '#243456' : '#cbd5e1' }
                  ]}
                  onPress={() => setBankDifficulty(d)}
                >
                  <Text style={[styles.filterPillTxt, bankDifficulty === d && { color: '#0b1120', fontWeight: '700' }]}>
                    {d.toUpperCase()}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Text style={[styles.bankResultCount, { color: isDark ? '#94a3b8' : '#64748b' }]}>
              Showing {filteredBankQuestions.length} verified Bible questions
            </Text>

            {/* Question Cards or Empty State */}
            {filteredBankQuestions.length === 0 ? (
              <View style={[styles.quizCard, { backgroundColor: isDark ? '#141f36' : '#ffffff', borderColor: isDark ? '#213052' : '#e2e8f0', alignItems: 'center', paddingVertical: 32 }]}>
                <BookOpen size={36} color="#fcd34d" style={{ marginBottom: 12 }} />
                <Text style={{ color: isDark ? '#ffffff' : '#0f172a', fontSize: 16, fontWeight: '800', marginBottom: 6 }}>
                  Question Bank is Empty (0 Questions)
                </Text>
                <Text style={{ color: isDark ? '#94a3b8' : '#64748b', fontSize: 12, textAlign: 'center', maxWidth: 290, lineHeight: 18, marginBottom: 16 }}>
                  All mock questions have been removed. Tap below to add your first real verified Scripture question to Firebase!
                </Text>
                <TouchableOpacity 
                  style={[styles.publishNowBtn, { backgroundColor: '#fcd34d' }]}
                  onPress={() => setAddQuestionModalVisible(true)}
                >
                  <Plus size={16} color="#0b1120" />
                  <Text style={[styles.publishNowTxt, { color: '#0b1120' }]}>Add First Question</Text>
                </TouchableOpacity>
              </View>
            ) : (
              filteredBankQuestions.map((q, idx) => (
              <View 
                key={q.id} 
                style={[styles.questionCard, { backgroundColor: isDark ? '#141f36' : '#ffffff', borderColor: isDark ? '#213052' : '#e2e8f0' }]}
              >
                <View style={styles.questionCardHeader}>
                  <View style={styles.verseBadge}>
                    <Text style={styles.verseBadgeTxt}>{q.verseReference}</Text>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <View style={[styles.diffBadge, { backgroundColor: q.difficulty === 'easy' ? '#10b98122' : q.difficulty === 'medium' ? '#f59e0b22' : '#ef444422' }]}>
                      <Text style={[styles.diffBadgeTxt, { color: q.difficulty === 'easy' ? '#10b981' : q.difficulty === 'medium' ? '#f59e0b' : '#ef4444' }]}>
                        {q.difficulty.toUpperCase()}
                      </Text>
                    </View>
                    <TouchableOpacity 
                      style={styles.deleteQuestionBtn}
                      onPress={() => handleDeleteBankQuestion(q)}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      accessibilityLabel="Delete Question"
                    >
                      <Trash2 size={15} color="#ef4444" />
                    </TouchableOpacity>
                  </View>
                </View>

                <Text style={[styles.questionText, { color: isDark ? '#ffffff' : '#0f172a' }]}>{q.question}</Text>

                <View style={styles.optionsList}>
                  {q.options.map(opt => {
                    const isCorrect = opt.id === q.correctOptionId;
                    return (
                      <View 
                        key={opt.id} 
                        style={[
                          styles.optionItem,
                          isCorrect ? styles.optionItemCorrect : { backgroundColor: isDark ? '#1a2742' : '#f8fafc' }
                        ]}
                      >
                        <Text style={[styles.optionLetter, isCorrect && { color: '#10b981', fontWeight: '700' }]}>
                          {opt.id.toUpperCase()}.
                        </Text>
                        <Text style={[styles.optionText, isCorrect && { color: '#10b981', fontWeight: '600' }]}>
                          {opt.text}
                        </Text>
                        {isCorrect && <Check size={14} color="#10b981" />}
                      </View>
                    );
                  })}
                </View>

                {q.explanation ? (
                  <View style={styles.explanationBox}>
                    <Text style={styles.explanationLabel}>Explanation:</Text>
                    <Text style={styles.explanationTxt}>{q.explanation}</Text>
                  </View>
                ) : null}
              </View>
            )))}
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* ─────────────────────────────────────────────────────────────
          MODAL 1: CREATE BIBLE QUIZ WIZARD (Combines Method A & B)
         ───────────────────────────────────────────────────────────── */}
      <Modal visible={createQuizModalVisible} animationType="slide" transparent={false} statusBarTranslucent={true}>
        <View style={[styles.wizardModalContainer, { backgroundColor: isDark ? '#0b1120' : '#f8fafc' }]}>
          {/* Wizard Header */}
          <View style={[styles.wizardHeader, { paddingTop: safeTopPadding, backgroundColor: isDark ? '#111c34' : '#ffffff', borderBottomColor: isDark ? '#1e2d4d' : '#e2e8f0' }]}>
            <TouchableOpacity onPress={() => setCreateQuizModalVisible(false)} style={styles.wizardCloseBtn}>
              <X size={22} color={isDark ? '#ffffff' : '#0f172a'} />
            </TouchableOpacity>
            <View style={styles.wizardStepIndicator}>
              <Text style={[styles.wizardStepTitle, { color: isDark ? '#ffffff' : '#0f172a' }]}>
                {wizardStep === 1 ? '1. Quiz Settings' : wizardStep === 2 ? '2. Select / Add Questions' : '3. Review & Publish'}
              </Text>
              <Text style={styles.wizardStepSub}>Step {wizardStep} of 3</Text>
            </View>
            <View style={{ width: 32 }} />
          </View>

          {/* Stepper Progress Bar */}
          <View style={styles.wizardProgressBar}>
            <View style={[styles.progressTrack, { width: wizardStep === 1 ? '33%' : wizardStep === 2 ? '66%' : '100%', backgroundColor: '#fcd34d' }]} />
          </View>

          <ScrollView contentContainerStyle={styles.wizardScroll}>
            {/* STEP 1: Basic Settings */}
            {wizardStep === 1 && (
              <View style={styles.stepContent}>
                <Text style={[styles.formSectionHeader, { color: isDark ? '#fcd34d' : colors.primary }]}>Quiz Basic Details</Text>

                <Text style={styles.fieldLabel}>Quiz Title *</Text>
                <TextInput
                  style={[styles.inputBox, { backgroundColor: isDark ? '#141f36' : '#ffffff', color: isDark ? '#ffffff' : '#0f172a', borderColor: isDark ? '#213052' : '#cbd5e1' }]}
                  placeholder="e.g. Life of Jesus — Church Bible Competition"
                  placeholderTextColor="#94a3b8"
                  value={quizTitle}
                  onChangeText={setQuizTitle}
                />

                {/* Quick Title Suggestions for Instant Setup */}
                <Text style={[styles.fieldLabel, { marginTop: 4, marginBottom: 6, fontSize: 11, color: isDark ? '#94a3b8' : '#64748b' }]}>
                  Quick suggestions (tap to use):
                </Text>
                <View style={styles.quickTitlesContainer}>
                  {quickTitles.map(t => (
                    <TouchableOpacity
                      key={t}
                      style={[
                        styles.quickTitleChip,
                        quizTitle === t && { backgroundColor: '#fcd34d', borderColor: '#fcd34d' },
                        { backgroundColor: isDark ? '#141f36' : '#f1f5f9', borderColor: isDark ? '#263554' : '#cbd5e1' }
                      ]}
                      onPress={() => setQuizTitle(t)}
                    >
                      <Text style={[styles.quickTitleTxt, { color: quizTitle === t ? '#0b1120' : (isDark ? '#cbd5e1' : '#475569'), fontWeight: quizTitle === t ? '800' : '600' }]}>
                        {t}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <Text style={[styles.fieldLabel, { marginTop: 14 }]}>Category / Topic</Text>
                <TextInput
                  style={[styles.inputBox, { backgroundColor: isDark ? '#141f36' : '#ffffff', color: isDark ? '#ffffff' : '#0f172a', borderColor: isDark ? '#213052' : '#cbd5e1' }]}
                  placeholder="e.g. Gospels & Life of Jesus, Genesis, Romans..."
                  placeholderTextColor="#94a3b8"
                  value={quizCategory}
                  onChangeText={setQuizCategory}
                />

                <Text style={styles.fieldLabel}>Target Audience</Text>
                <TextInput
                  style={[styles.inputBox, { backgroundColor: isDark ? '#141f36' : '#ffffff', color: isDark ? '#ffffff' : '#0f172a', borderColor: isDark ? '#213052' : '#cbd5e1' }]}
                  placeholder="e.g. All Church Members, Youth, Sunday School..."
                  placeholderTextColor="#94a3b8"
                  value={quizAudience}
                  onChangeText={setQuizAudience}
                />

                <Text style={[styles.formSectionHeader, { color: isDark ? '#fcd34d' : colors.primary, marginTop: 24 }]}>Rules & Timing</Text>

                <View style={styles.formRow}>
                  <View style={{ flex: 1, marginRight: 8 }}>
                    <Text style={styles.fieldLabel}>Timer (Minutes)</Text>
                    <TextInput
                      style={[styles.inputBox, { backgroundColor: isDark ? '#141f36' : '#ffffff', color: isDark ? '#ffffff' : '#0f172a', borderColor: isDark ? '#213052' : '#cbd5e1' }]}
                      keyboardType="number-pad"
                      value={quizDuration}
                      onChangeText={setQuizDuration}
                    />
                  </View>
                  <View style={{ flex: 1, marginLeft: 8 }}>
                    <Text style={styles.fieldLabel}>Max Attempts</Text>
                    <TextInput
                      style={[styles.inputBox, { backgroundColor: isDark ? '#141f36' : '#ffffff', color: isDark ? '#ffffff' : '#0f172a', borderColor: isDark ? '#213052' : '#cbd5e1' }]}
                      keyboardType="number-pad"
                      value={quizAttempts}
                      onChangeText={setQuizAttempts}
                    />
                  </View>
                </View>

                <Text style={styles.fieldLabel}>Passing Score (%)</Text>
                <TextInput
                  style={[styles.inputBox, { backgroundColor: isDark ? '#141f36' : '#ffffff', color: isDark ? '#ffffff' : '#0f172a', borderColor: isDark ? '#213052' : '#cbd5e1' }]}
                  keyboardType="number-pad"
                  value={quizPassingScore}
                  onChangeText={setQuizPassingScore}
                />

                <Text style={styles.fieldLabel}>Answer Key Release</Text>
                <View style={styles.choiceRow}>
                  {[
                    { id: 'after_submission', label: 'After Submission' },
                    { id: 'instant', label: 'Instant Per Question' },
                    { id: 'never', label: 'Exam Mode (Never)' },
                  ].map(item => (
                    <TouchableOpacity
                      key={item.id}
                      style={[
                        styles.choicePill,
                        quizReviewMode === item.id && { backgroundColor: '#fcd34d', borderColor: '#fcd34d' },
                        { borderColor: isDark ? '#263554' : '#cbd5e1' }
                      ]}
                      onPress={() => setQuizReviewMode(item.id as any)}
                    >
                      <Text style={[styles.choicePillTxt, quizReviewMode === item.id && { color: '#0b1120', fontWeight: '700' }]}>
                        {item.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

            {/* STEP 2: Sourcing Questions from Verified Bible Bank */}
            {wizardStep === 2 && (
              <View style={styles.stepContent}>
                <View style={styles.stagedBadgeBar}>
                  <Text style={styles.stagedBadgeTitle}>
                    {stagedQuestions.length} Questions Selected for this Quiz
                  </Text>
                  {stagedQuestions.length > 0 && (
                    <TouchableOpacity onPress={() => setStagedQuestions([])}>
                      <Text style={{ color: '#ef4444', fontSize: 12, fontWeight: '700' }}>Clear All</Text>
                    </TouchableOpacity>
                  )}
                </View>

                {/* Quick 1-Tap Pick Buttons */}
                <Text style={[styles.formSectionHeader, { color: isDark ? '#fcd34d' : colors.primary }]}>
                  ⚡ Quick Pick Questions
                </Text>
                <View style={styles.quickPicksRow}>
                  <TouchableOpacity 
                    style={[styles.quickPickBtn, { backgroundColor: '#fcd34d' }]}
                    onPress={() => handleQuickPickQuestions(5)}
                    activeOpacity={0.8}
                  >
                    <Zap size={15} color="#0b1120" />
                    <Text style={[styles.quickPickTxt, { color: '#0b1120' }]}>Pick 5 Questions</Text>
                  </TouchableOpacity>

                  <TouchableOpacity 
                    style={[styles.quickPickBtn, { backgroundColor: isDark ? '#1e2d4d' : '#e0f2fe' }]}
                    onPress={() => handleQuickPickQuestions(10)}
                    activeOpacity={0.8}
                  >
                    <Zap size={15} color={isDark ? '#93c5fd' : '#2563eb'} />
                    <Text style={[styles.quickPickTxt, { color: isDark ? '#93c5fd' : '#2563eb' }]}>Pick 10 Questions</Text>
                  </TouchableOpacity>
                </View>

                <Text style={[styles.formSectionHeader, { color: isDark ? '#fcd34d' : colors.primary, marginTop: 14 }]}>
                  Select Verified Questions
                </Text>

                {/* Quick Search Bar */}
                <View style={[styles.searchBar, { backgroundColor: isDark ? '#141f36' : '#ffffff', borderColor: isDark ? '#213052' : '#e2e8f0', marginBottom: 12 }]}>
                  <Search size={16} color="#94a3b8" />
                  <TextInput
                    style={[styles.searchInput, { color: isDark ? '#ffffff' : '#0f172a' }]}
                    placeholder="Search by book or verse (e.g. John, Genesis)..."
                    placeholderTextColor="#94a3b8"
                    value={bankSearch}
                    onChangeText={setBankSearch}
                  />
                  {bankSearch.length > 0 && (
                    <TouchableOpacity onPress={() => setBankSearch('')}>
                      <X size={16} color="#94a3b8" />
                    </TouchableOpacity>
                  )}
                </View>

                {/* Question Selection List or Empty State */}
                {filteredBankQuestions.length === 0 ? (
                  <View style={{ alignItems: 'center', paddingVertical: 24, paddingHorizontal: 16 }}>
                    <BookOpen size={30} color="#fcd34d" style={{ marginBottom: 10 }} />
                    <Text style={{ color: isDark ? '#ffffff' : '#0f172a', fontSize: 14, fontWeight: '800', textAlign: 'center', marginBottom: 6 }}>
                      No Questions in Bank Yet
                    </Text>
                    <Text style={{ color: isDark ? '#94a3b8' : '#64748b', fontSize: 12, textAlign: 'center', marginBottom: 14 }}>
                      Your Question Bank has no questions yet. Tap below to add questions to your church question bank.
                    </Text>
                    <TouchableOpacity
                      style={[styles.quickPickBtn, { backgroundColor: '#fcd34d', alignSelf: 'center', paddingHorizontal: 16 }]}
                      onPress={() => setAddQuestionModalVisible(true)}
                    >
                      <Plus size={15} color="#0b1120" />
                      <Text style={[styles.quickPickTxt, { color: '#0b1120', fontWeight: '800' }]}>+ Add Question to Bank</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  filteredBankQuestions.slice(0, 50).map(q => {
                    const isSelected = stagedQuestions.some(item => item.id === q.id);
                    return (
                      <TouchableOpacity
                        key={q.id}
                        style={[
                          styles.pickQuestionItem,
                          isSelected && { borderColor: '#fcd34d', backgroundColor: isDark ? '#1b2c4d' : '#fef9c3' },
                          { backgroundColor: isDark ? '#141f36' : '#ffffff', borderColor: isDark ? '#213052' : '#e2e8f0' }
                        ]}
                        onPress={() => toggleStagedQuestion(q)}
                        activeOpacity={0.8}
                      >
                        <View style={[styles.checkboxCircle, isSelected && { backgroundColor: '#fcd34d', borderColor: '#fcd34d' }]}>
                          {isSelected && <Check size={14} color="#0b1120" />}
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.pickVerse, { color: '#fcd34d' }]}>{q.verseReference} · {q.difficulty.toUpperCase()}</Text>
                          <Text style={[styles.pickText, { color: isDark ? '#ffffff' : '#0f172a' }]}>{q.question}</Text>
                        </View>
                      </TouchableOpacity>
                    );
                  })
                )}
              </View>
            )}

            {/* STEP 3: Review, Reorder & Publish */}
            {wizardStep === 3 && (
              <View style={styles.stepContent}>
                <View style={styles.reviewSummaryCard}>
                  <Text style={styles.reviewSummaryTitle}>{quizTitle || 'Untitled Quiz'}</Text>
                  <Text style={styles.reviewSummarySub}>
                    {quizCategory} · {quizAudience} · {quizDuration} mins timer · {stagedQuestions.length} questions
                  </Text>
                </View>

                <Text style={[styles.formSectionHeader, { color: isDark ? '#fcd34d' : colors.primary, marginTop: 16 }]}>
                  Selected Questions ({stagedQuestions.length})
                </Text>

                {stagedQuestions.map((q, index) => (
                  <View 
                    key={q.id} 
                    style={[styles.reorderItem, { backgroundColor: isDark ? '#141f36' : '#ffffff', borderColor: isDark ? '#213052' : '#e2e8f0' }]}
                  >
                    <View style={styles.orderNumberBadge}>
                      <Text style={styles.orderNumberTxt}>{index + 1}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.reorderVerse, { color: '#fcd34d' }]}>{q.verseReference}</Text>
                      <Text style={[styles.reorderText, { color: isDark ? '#ffffff' : '#0f172a' }]} numberOfLines={2}>
                        {q.question}
                      </Text>
                    </View>
                    <View style={styles.reorderControls}>
                      <TouchableOpacity 
                        style={styles.reorderBtn} 
                        onPress={() => moveQuestion(index, 'up')}
                        disabled={index === 0}
                      >
                        <ArrowUp size={16} color={index === 0 ? '#64748b' : '#fcd34d'} />
                      </TouchableOpacity>
                      <TouchableOpacity 
                        style={styles.reorderBtn} 
                        onPress={() => moveQuestion(index, 'down')}
                        disabled={index === stagedQuestions.length - 1}
                      >
                        <ArrowDown size={16} color={index === stagedQuestions.length - 1 ? '#64748b' : '#fcd34d'} />
                      </TouchableOpacity>
                      <TouchableOpacity 
                        style={styles.reorderBtn} 
                        onPress={() => removeStagedQuestion(q.id)}
                      >
                        <Trash2 size={16} color="#ef4444" />
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
                {/* ── Schedule & Timing Selection ── */}
                <Text style={[styles.formSectionHeader, { color: isDark ? '#fcd34d' : colors.primary, marginTop: 22 }]}>
                  📅 Launch & Schedule Timing
                </Text>
                <Text style={[styles.fieldSub, { color: isDark ? '#94a3b8' : '#64748b', marginBottom: 12 }]}>
                  Schedule for a specific time or go live now. Church members will receive a push notification when scheduled and when live!
                </Text>

                <View style={styles.scheduleOptionsContainer}>
                  {[
                    { id: 'today_evening', title: "Today's Evening", sub: 'Today at 7:00 PM', icon: Moon },
                    { id: 'in_2_hours', title: 'In 2 Hours', sub: 'Starts in 120 minutes', icon: Clock },
                    { id: 'tomorrow_morning', title: 'Tomorrow Morning', sub: 'Tomorrow at 9:00 AM', icon: Sun },
                    { id: 'tomorrow_evening', title: 'Tomorrow Evening', sub: 'Tomorrow at 7:00 PM', icon: Calendar },
                    { id: 'live_now', title: 'Immediate Launch', sub: 'Ready to start anytime via Start button', icon: Zap },
                    { id: 'custom', title: 'Custom Date & Time', sub: 'Specify custom schedule', icon: Calendar },
                  ].map(item => {
                    const isSelected = scheduleOption === item.id;
                    const IconComponent = item.icon;
                    return (
                      <TouchableOpacity
                        key={item.id}
                        style={[
                          styles.scheduleOptionCard,
                          isSelected && { borderColor: '#fcd34d', backgroundColor: isDark ? '#1a2744' : '#fefce8' },
                          { backgroundColor: isDark ? '#141f36' : '#ffffff', borderColor: isSelected ? '#fcd34d' : (isDark ? '#213052' : '#e2e8f0') }
                        ]}
                        onPress={() => setScheduleOption(item.id as any)}
                        activeOpacity={0.8}
                      >
                        <View style={[styles.scheduleOptionIconWrap, isSelected && { backgroundColor: 'rgba(252, 211, 77, 0.2)' }]}>
                          <IconComponent size={16} color={isSelected ? '#fcd34d' : (isDark ? '#94a3b8' : '#64748b')} />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.scheduleOptionTitle, { color: isSelected ? (isDark ? '#ffffff' : '#0f172a') : (isDark ? '#cbd5e1' : '#334155'), fontWeight: isSelected ? '700' : '500' }]}>
                            {item.title}
                          </Text>
                          <Text style={[styles.scheduleOptionSub, { color: isDark ? '#94a3b8' : '#64748b' }]}>
                            {item.sub}
                          </Text>
                        </View>
                        {isSelected && (
                          <View style={styles.scheduleOptionCheck}>
                            <Check size={14} color="#0b1120" />
                          </View>
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {/* Custom Schedule Inputs */}
                {scheduleOption === 'custom' && (
                  <View style={[styles.customScheduleWrap, { backgroundColor: isDark ? '#141f36' : '#ffffff', borderColor: isDark ? '#213052' : '#e2e8f0' }]}>
                    <View style={{ flex: 1, marginRight: 8 }}>
                      <Text style={styles.fieldLabel}>Date (YYYY-MM-DD)</Text>
                      <TextInput
                        style={[styles.inputBox, { backgroundColor: isDark ? '#0b1120' : '#f8fafc', color: isDark ? '#ffffff' : '#0f172a', borderColor: isDark ? '#213052' : '#cbd5e1' }]}
                        placeholder="2026-10-27"
                        placeholderTextColor="#94a3b8"
                        value={customScheduleDate}
                        onChangeText={setCustomScheduleDate}
                      />
                    </View>
                    <View style={{ flex: 1, marginLeft: 8 }}>
                      <Text style={styles.fieldLabel}>Time (24h, HH:MM)</Text>
                      <TextInput
                        style={[styles.inputBox, { backgroundColor: isDark ? '#0b1120' : '#f8fafc', color: isDark ? '#ffffff' : '#0f172a', borderColor: isDark ? '#213052' : '#cbd5e1' }]}
                        placeholder="19:00"
                        placeholderTextColor="#94a3b8"
                        value={customScheduleTime}
                        onChangeText={setCustomScheduleTime}
                      />
                    </View>
                  </View>
                )}
              </View>
            )}

            <View style={{ height: 120 + safeBottomPadding }} />
          </ScrollView>

          {/* Wizard Bottom Action Bar */}
          <View style={[styles.wizardBottomBar, { paddingBottom: safeBottomPadding, backgroundColor: isDark ? '#111c34' : '#ffffff', borderTopColor: isDark ? '#1e2d4d' : '#e2e8f0' }]}>
            {wizardStep === 3 ? (
              <View style={styles.step3ActionBar}>
                {/* 1. Back */}
                <TouchableOpacity 
                  style={[styles.step3BackBtn, { backgroundColor: isDark ? '#1e2c4a' : '#f1f5f9', borderColor: isDark ? '#2c3f66' : '#cbd5e1' }]}
                  onPress={() => setWizardStep(2)}
                  disabled={isSavingQuiz}
                  activeOpacity={0.8}
                >
                  <ChevronLeft size={16} color={isDark ? '#e2e8f0' : '#334155'} />
                  <Text style={[styles.step3BackTxt, { color: isDark ? '#e2e8f0' : '#334155' }]}>Back</Text>
                </TouchableOpacity>

                {/* 2. Save Draft */}
                <TouchableOpacity 
                  style={[styles.step3DraftBtn, { backgroundColor: isDark ? '#18243e' : '#ffffff', borderColor: isDark ? '#33476f' : '#cbd5e1' }]}
                  onPress={() => handleSaveQuiz('draft')}
                  disabled={isSavingQuiz}
                  activeOpacity={0.8}
                >
                  <Save size={15} color={isDark ? '#94a3b8' : '#475569'} />
                  <Text style={[styles.step3DraftTxt, { color: isDark ? '#cbd5e1' : '#334155' }]}>Save Draft</Text>
                </TouchableOpacity>

                {/* 3. Schedule or Publish Live */}
                {scheduleOption === 'live_now' ? (
                  <TouchableOpacity 
                    style={[styles.step3PrimaryBtn, { backgroundColor: '#10b981' }]}
                    onPress={() => handleSaveQuiz('publish_now')}
                    disabled={isSavingQuiz}
                    activeOpacity={0.85}
                  >
                    {isSavingQuiz ? (
                      <ActivityIndicator size="small" color="#ffffff" />
                    ) : (
                      <>
                        <Send size={15} color="#ffffff" />
                        <Text style={styles.step3PrimaryTxt}>Publish Quiz</Text>
                      </>
                    )}
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity 
                    style={[styles.step3PrimaryBtn, { backgroundColor: '#2563eb' }]}
                    onPress={() => handleSaveQuiz('schedule')}
                    disabled={isSavingQuiz}
                    activeOpacity={0.85}
                  >
                    {isSavingQuiz ? (
                      <ActivityIndicator size="small" color="#ffffff" />
                    ) : (
                      <>
                        <Calendar size={15} color="#ffffff" />
                        <Text style={styles.step3PrimaryTxt}>Schedule Quiz</Text>
                      </>
                    )}
                  </TouchableOpacity>
                )}
              </View>
            ) : (
              <View style={styles.wizardNormalStepRow}>
                {wizardStep > 1 ? (
                  <TouchableOpacity 
                    style={[styles.wizardNavBtn, { backgroundColor: isDark ? '#1e2c4a' : '#f1f5f9' }]}
                    onPress={() => setWizardStep(1)}
                  >
                    <Text style={[styles.wizardNavTxt, { color: isDark ? '#ffffff' : '#0f172a' }]}>Back</Text>
                  </TouchableOpacity>
                ) : <View style={{ flex: 1 }} />}

                <TouchableOpacity 
                  style={[styles.wizardNavBtn, { backgroundColor: '#fcd34d' }]}
                  onPress={() => {
                    if (wizardStep === 1 && !quizTitle.trim()) {
                      Alert.alert('Required', 'Please enter a quiz title to proceed.');
                      return;
                    }
                    setWizardStep(prev => (prev === 1 ? 2 : 3));
                  }}
                >
                  <Text style={[styles.wizardNavTxt, { color: '#0b1120', fontWeight: '800' }]}>
                    {wizardStep === 1 ? 'Next: Questions' : 'Next: Schedule & Settings'}
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </Modal>

      {/* ─────────────────────────────────────────────────────────────
          MODAL 2: ADD TO BIBLE QUESTION BANK
         ───────────────────────────────────────────────────────────── */}
      <Modal visible={addQuestionModalVisible} animationType="slide" transparent={false} statusBarTranslucent={true}>
        <View style={[styles.wizardModalContainer, { backgroundColor: isDark ? '#0b1120' : '#f8fafc' }]}>
          {/* Header */}
          <View style={[styles.wizardHeader, { paddingTop: safeTopPadding, backgroundColor: isDark ? '#111c34' : '#ffffff', borderBottomColor: isDark ? '#1e2d4d' : '#e2e8f0' }]}>
            <TouchableOpacity onPress={() => setAddQuestionModalVisible(false)} style={styles.wizardCloseBtn}>
              <X size={22} color={isDark ? '#ffffff' : '#0f172a'} />
            </TouchableOpacity>
            <View style={styles.wizardStepIndicator}>
              <Text style={[styles.wizardStepTitle, { color: isDark ? '#ffffff' : '#0f172a' }]}>
                Add to Question Bank
              </Text>
              <Text style={styles.wizardStepSub}>Currently {bankQuestions.length} Questions</Text>
            </View>
            <View style={{ width: 32 }} />
          </View>

          <ScrollView contentContainerStyle={styles.wizardScroll}>
            <View style={styles.stepContent}>
              {/* Question Creation Options: Bible vs Manual */}
              <View style={[styles.bibleSourceCard, { backgroundColor: isDark ? '#141f36' : '#ffffff', borderColor: isDark ? '#213052' : '#e2e8f0' }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <BookOpen size={16} color="#fcd34d" />
                    <Text style={[styles.bibleSourceTitle, { color: isDark ? '#ffffff' : '#0f172a' }]}>
                      Scripture Bible Integration
                    </Text>
                  </View>
                  <TouchableOpacity 
                    style={[styles.openBiblePickerBtn, { backgroundColor: '#fcd34d' }]}
                    onPress={() => openBiblePicker('book')}
                    activeOpacity={0.8}
                  >
                    <BookOpen size={14} color="#0b1120" />
                    <Text style={styles.openBiblePickerBtnTxt}>
                      {newBook ? 'Change Scripture' : 'Select from Bible'}
                    </Text>
                  </TouchableOpacity>
                </View>

                {newBook ? (
                  <View style={[styles.selectedScriptureBanner, { backgroundColor: isDark ? '#1a2744' : '#f0fdf4', borderColor: isDark ? '#2c3e66' : '#bbf7d0' }]}>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.selectedScriptureLabel, { color: isDark ? '#94a3b8' : '#15803d' }]}>Selected Scripture:</Text>
                      <Text style={[styles.selectedScriptureRef, { color: isDark ? '#fcd34d' : '#166534' }]}>
                        {newBook} {newChapter ? newChapter + ':' : ''}{newVerse || '1'}
                      </Text>
                    </View>
                    <TouchableOpacity
                      style={[styles.aiGenerateBtn, { backgroundColor: isGeneratingQuestion ? '#94a3b8' : '#1e3a8a' }]}
                      onPress={() => handleGenerateFromScripture()}
                      disabled={isGeneratingQuestion}
                    >
                      {isGeneratingQuestion ? (
                        <ActivityIndicator size="small" color="#fcd34d" />
                      ) : (
                        <Sparkles size={14} color="#fcd34d" />
                      )}
                      <Text style={styles.aiGenerateBtnTxt}>
                        {isGeneratingQuestion ? 'Generating...' : '✨ Auto-Fill with AI'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <Text style={[styles.bibleSourceHint, { color: isDark ? '#94a3b8' : '#64748b' }]}>
                    Choose scripture from the Bible to auto-populate reference, or type/paste your question and options manually.
                  </Text>
                )}
              </View>

              <Text style={[styles.formSectionHeader, { color: isDark ? '#fcd34d' : colors.primary, marginTop: 14 }]}>
                Scripture Question
              </Text>

              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={styles.fieldLabel}>Question Text *</Text>
                <Text style={{ fontSize: 11, color: isDark ? '#94a3b8' : '#64748b' }}>Type, paste or AI auto-fill</Text>
              </View>
              <TextInput
                style={[
                  styles.inputBox, 
                  { backgroundColor: isDark ? '#141f36' : '#ffffff', color: isDark ? '#ffffff' : '#0f172a', borderColor: isDark ? '#213052' : '#cbd5e1', height: 75, textAlignVertical: 'top' }
                ]}
                placeholder="e.g. In which city was Jesus born according to Luke 2?"
                placeholderTextColor="#94a3b8"
                multiline
                value={newQuestionText}
                onChangeText={setNewQuestionText}
              />

              <Text style={[styles.formSectionHeader, { color: isDark ? '#fcd34d' : colors.primary, marginTop: 20 }]}>
                Answer Options & Correct Answer
              </Text>

              {/* Option A */}
              <View style={{ marginTop: 8 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={styles.fieldLabel}>Option A *</Text>
                  {newCorrectOption === 'a' && (
                    <Text style={{ fontSize: 11, fontWeight: '700', color: '#10b981' }}>✓ Correct Answer</Text>
                  )}
                </View>
                <TextInput
                  style={[styles.inputBox, { backgroundColor: isDark ? '#141f36' : '#ffffff', color: isDark ? '#ffffff' : '#0f172a', borderColor: newCorrectOption === 'a' ? '#10b981' : (isDark ? '#213052' : '#cbd5e1') }]}
                  placeholder="Option A text (manually type or edit)"
                  placeholderTextColor="#94a3b8"
                  value={newOptionA}
                  onChangeText={setNewOptionA}
                />
              </View>

              {/* Option B */}
              <View style={{ marginTop: 12 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={styles.fieldLabel}>Option B *</Text>
                  {newCorrectOption === 'b' && (
                    <Text style={{ fontSize: 11, fontWeight: '700', color: '#10b981' }}>✓ Correct Answer</Text>
                  )}
                </View>
                <TextInput
                  style={[styles.inputBox, { backgroundColor: isDark ? '#141f36' : '#ffffff', color: isDark ? '#ffffff' : '#0f172a', borderColor: newCorrectOption === 'b' ? '#10b981' : (isDark ? '#213052' : '#cbd5e1') }]}
                  placeholder="Option B text (manually type or edit)"
                  placeholderTextColor="#94a3b8"
                  value={newOptionB}
                  onChangeText={setNewOptionB}
                />
              </View>

              {/* Option C */}
              <View style={{ marginTop: 12 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={styles.fieldLabel}>Option C (Optional)</Text>
                  {newCorrectOption === 'c' && (
                    <Text style={{ fontSize: 11, fontWeight: '700', color: '#10b981' }}>✓ Correct Answer</Text>
                  )}
                </View>
                <TextInput
                  style={[styles.inputBox, { backgroundColor: isDark ? '#141f36' : '#ffffff', color: isDark ? '#ffffff' : '#0f172a', borderColor: newCorrectOption === 'c' ? '#10b981' : (isDark ? '#213052' : '#cbd5e1') }]}
                  placeholder="Option C text (manually type or edit)"
                  placeholderTextColor="#94a3b8"
                  value={newOptionC}
                  onChangeText={setNewOptionC}
                />
              </View>

              {/* Option D */}
              <View style={{ marginTop: 12 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={styles.fieldLabel}>Option D (Optional)</Text>
                  {newCorrectOption === 'd' && (
                    <Text style={{ fontSize: 11, fontWeight: '700', color: '#10b981' }}>✓ Correct Answer</Text>
                  )}
                </View>
                <TextInput
                  style={[styles.inputBox, { backgroundColor: isDark ? '#141f36' : '#ffffff', color: isDark ? '#ffffff' : '#0f172a', borderColor: newCorrectOption === 'd' ? '#10b981' : (isDark ? '#213052' : '#cbd5e1') }]}
                  placeholder="Option D text (manually type or edit)"
                  placeholderTextColor="#94a3b8"
                  value={newOptionD}
                  onChangeText={setNewOptionD}
                />
              </View>

              {/* Correct Option Selector */}
              <Text style={[styles.fieldLabel, { marginTop: 14 }]}>Select Correct Option:</Text>
              <View style={styles.choiceRow}>
                {(['a', 'b', 'c', 'd'] as const).map(opt => (
                  <TouchableOpacity
                    key={opt}
                    style={[
                      styles.choicePill,
                      newCorrectOption === opt && { backgroundColor: '#10b981', borderColor: '#10b981' },
                      { borderColor: isDark ? '#263554' : '#cbd5e1' }
                    ]}
                    onPress={() => setNewCorrectOption(opt)}
                  >
                    <Text style={[styles.choicePillTxt, newCorrectOption === opt && { color: '#ffffff', fontWeight: '800' }]}>
                      Option {opt.toUpperCase()}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 22 }}>
                <Text style={[styles.formSectionHeader, { color: isDark ? '#fcd34d' : colors.primary, marginTop: 0 }]}>
                  Scripture Reference & Difficulty
                </Text>
                <TouchableOpacity 
                  style={styles.openBibleLinkBtn}
                  onPress={() => openBiblePicker('book')}
                >
                  <BookOpen size={13} color="#fcd34d" />
                  <Text style={styles.openBibleLinkTxt}>Open Bible</Text>
                </TouchableOpacity>
              </View>

              {/* Scripture Reference: Book, Chapter, Verse (Pressable to open Bible Picker & auto-populate!) */}
              <View style={styles.formRow}>
                <View style={{ flex: 2, marginRight: 8 }}>
                  <Text style={styles.fieldLabel}>Book (Click to Pick)</Text>
                  <TouchableOpacity
                    style={[
                      styles.inputBox, 
                      styles.bookSelectBox,
                      { backgroundColor: isDark ? '#141f36' : '#ffffff', borderColor: isDark ? '#213052' : '#cbd5e1' }
                    ]}
                    onPress={() => openBiblePicker('book')}
                    activeOpacity={0.7}
                  >
                    <Text 
                      style={[
                        styles.bookSelectBoxTxt, 
                        { color: newBook ? (isDark ? '#ffffff' : '#0f172a') : '#94a3b8', fontWeight: newBook ? '700' : '400' }
                      ]}
                      numberOfLines={1}
                    >
                      {newBook || 'Select Book...'}
                    </Text>
                    <BookOpen size={15} color="#fcd34d" />
                  </TouchableOpacity>
                </View>

                <View style={{ flex: 1, marginRight: 8 }}>
                  <Text style={styles.fieldLabel}>Chapter</Text>
                  <TouchableOpacity
                    style={[
                      styles.inputBox, 
                      styles.bookSelectBox,
                      { backgroundColor: isDark ? '#141f36' : '#ffffff', borderColor: isDark ? '#213052' : '#cbd5e1' }
                    ]}
                    onPress={() => openBiblePicker('chapter')}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.bookSelectBoxTxt, { color: newChapter ? (isDark ? '#ffffff' : '#0f172a') : '#94a3b8' }]}>
                      {newChapter || 'Ch'}
                    </Text>
                  </TouchableOpacity>
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={styles.fieldLabel}>Verse</Text>
                  <TextInput
                    style={[styles.inputBox, { backgroundColor: isDark ? '#141f36' : '#ffffff', color: isDark ? '#ffffff' : '#0f172a', borderColor: isDark ? '#213052' : '#cbd5e1' }]}
                    placeholder="e.g. 16"
                    placeholderTextColor="#94a3b8"
                    value={newVerse}
                    onChangeText={setNewVerse}
                  />
                </View>
              </View>

              {/* Difficulty */}
              <Text style={styles.fieldLabel}>Difficulty Level</Text>
              <View style={styles.choiceRow}>
                {(['easy', 'medium', 'hard'] as const).map(diff => (
                  <TouchableOpacity
                    key={diff}
                    style={[
                      styles.choicePill,
                      newDifficulty === diff && { backgroundColor: '#fcd34d', borderColor: '#fcd34d' },
                      { borderColor: isDark ? '#263554' : '#cbd5e1' }
                    ]}
                    onPress={() => setNewDifficulty(diff)}
                  >
                    <Text style={[styles.choicePillTxt, newDifficulty === diff && { color: '#0b1120', fontWeight: '800' }]}>
                      {diff.charAt(0).toUpperCase() + diff.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Explanation with AI Auto-Generate */}
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 14 }}>
                <Text style={styles.fieldLabel}>Explanation / Teaching Note</Text>
                <TouchableOpacity 
                  style={[styles.autoGenExplainBtn, { backgroundColor: isGeneratingExplanation ? 'rgba(252, 211, 77, 0.1)' : 'rgba(252, 211, 77, 0.18)' }]}
                  onPress={() => handleAutoGenerateExplanation()}
                  disabled={isGeneratingExplanation}
                  activeOpacity={0.8}
                >
                  {isGeneratingExplanation ? (
                    <ActivityIndicator size="small" color="#fcd34d" style={{ transform: [{ scale: 0.8 }] }} />
                  ) : (
                    <Sparkles size={13} color="#fcd34d" />
                  )}
                  <Text style={styles.autoGenExplainTxt}>
                    {isGeneratingExplanation ? 'Generating...' : '✨ Auto-Generate with AI'}
                  </Text>
                </TouchableOpacity>
              </View>
              <TextInput
                style={[
                  styles.inputBox, 
                  { backgroundColor: isDark ? '#141f36' : '#ffffff', color: isDark ? '#ffffff' : '#0f172a', borderColor: isDark ? '#213052' : '#cbd5e1', height: 68, textAlignVertical: 'top' }
                ]}
                placeholder="Helpful verse explanation shown during review (or tap Auto-Generate with AI)..."
                placeholderTextColor="#94a3b8"
                multiline
                value={newExplanation}
                onChangeText={setNewExplanation}
              />
            </View>

            <View style={{ height: 120 + safeBottomPadding }} />
          </ScrollView>

          {/* Action Bar */}
          <View style={[styles.wizardBottomBar, { paddingBottom: safeBottomPadding, backgroundColor: isDark ? '#111c34' : '#ffffff', borderTopColor: isDark ? '#1e2d4d' : '#e2e8f0' }]}>
            <TouchableOpacity 
              style={[styles.wizardNavBtn, { backgroundColor: isDark ? '#1e2c4a' : '#f1f5f9' }]}
              onPress={() => setAddQuestionModalVisible(false)}
            >
              <Text style={[styles.wizardNavTxt, { color: isDark ? '#ffffff' : '#0f172a' }]}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.wizardNavBtn, { backgroundColor: '#fcd34d' }]}
              onPress={handleSaveNewQuestion}
            >
              <Text style={[styles.wizardNavTxt, { color: '#0b1120', fontWeight: '800' }]}>Save to Bank</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ─────────────────────────────────────────────────────────────
          MODAL 3: PREVIEW QUIZ
         ───────────────────────────────────────────────────────────── */}
      <Modal visible={previewQuizModalVisible} animationType="fade" transparent={true} statusBarTranslucent={true}>
        <View style={styles.previewBackdrop}>
          <View style={[styles.previewModalBox, { backgroundColor: isDark ? '#131e33' : '#ffffff' }]}>
            <View style={styles.previewHeader}>
              <Text style={[styles.previewModalTitle, { color: isDark ? '#ffffff' : '#0f172a' }]}>
                {previewingQuiz?.title}
              </Text>
              <TouchableOpacity onPress={() => setPreviewQuizModalVisible(false)}>
                <X size={20} color={isDark ? '#ffffff' : '#0f172a'} />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 420 }}>
              <Text style={[styles.previewMeta, { color: isDark ? '#94a3b8' : '#64748b' }]}>
                Category: {previewingQuiz?.category} · {previewingQuiz?.durationMinutes} mins · {previewingQuiz?.questions.length} questions
              </Text>

              {previewingQuiz?.questions.map((q, idx) => (
                <View key={q.id || idx} style={[styles.previewQuestionCard, { backgroundColor: isDark ? '#19253d' : '#f8fafc' }]}>
                  <Text style={[styles.previewQNum, { color: '#fcd34d' }]}>Q{idx + 1}. {q.verseReference}</Text>
                  <Text style={[styles.previewQTxt, { color: isDark ? '#ffffff' : '#0f172a' }]}>{q.question}</Text>
                  {q.options.map(opt => (
                    <Text 
                      key={opt.id} 
                      style={[
                        styles.previewOptTxt, 
                        opt.id === q.correctOptionId ? { color: '#10b981', fontWeight: '700' } : { color: isDark ? '#94a3b8' : '#64748b' }
                      ]}
                    >
                      {opt.id.toUpperCase()}. {opt.text} {opt.id === q.correctOptionId ? '✓' : ''}
                    </Text>
                  ))}
                </View>
              ))}
            </ScrollView>

            <TouchableOpacity 
              style={[styles.closePreviewBtn, { backgroundColor: '#fcd34d' }]}
              onPress={() => setPreviewQuizModalVisible(false)}
            >
              <Text style={styles.closePreviewTxt}>Close Preview</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ─────────────────────────────────────────────────────────────
          MODAL 4: INTERACTIVE BIBLE PICKER (Book -> Chapter -> Verse)
         ───────────────────────────────────────────────────────────── */}
      <Modal visible={biblePickerVisible} animationType="slide" transparent={false} statusBarTranslucent={true}>
        <View style={[styles.wizardModalContainer, { backgroundColor: isDark ? '#0b1120' : '#f8fafc' }]}>
          {/* Picker Header */}
          <View style={[styles.wizardHeader, { paddingTop: safeTopPadding, backgroundColor: isDark ? '#111c34' : '#ffffff', borderBottomColor: isDark ? '#1e2d4d' : '#e2e8f0' }]}>
            <TouchableOpacity 
              onPress={() => {
                if (pickerStep === 'verse') {
                  setPickerStep('chapter');
                } else if (pickerStep === 'chapter') {
                  setPickerStep('book');
                } else {
                  setBiblePickerVisible(false);
                }
              }} 
              style={styles.wizardCloseBtn}
            >
              {pickerStep === 'book' ? (
                <X size={22} color={isDark ? '#ffffff' : '#0f172a'} />
              ) : (
                <ChevronLeft size={24} color={isDark ? '#fcd34d' : colors.primary} />
              )}
            </TouchableOpacity>

            <View style={styles.wizardStepIndicator}>
              <Text style={[styles.wizardStepTitle, { color: isDark ? '#ffffff' : '#0f172a' }]}>
                {pickerStep === 'book' 
                  ? 'Select Bible Book' 
                  : pickerStep === 'chapter' 
                  ? `${pickerSelectedBook} — Select Chapter` 
                  : `${pickerSelectedBook} ${pickerSelectedChapter} — Reference`}
              </Text>
              <Text style={styles.wizardStepSub}>
                {pickerStep === 'book' 
                  ? '66 Books of Holy Scripture' 
                  : pickerStep === 'chapter' 
                  ? `Choose Chapter (1 to ${BIBLE_CHAPTER_COUNTS[pickerSelectedBook] || 20})` 
                  : 'Enter or select Verse reference'}
              </Text>
            </View>

            <TouchableOpacity 
              onPress={() => setBiblePickerVisible(false)}
              style={styles.wizardCloseBtn}
            >
              <X size={20} color={isDark ? '#94a3b8' : '#64748b'} />
            </TouchableOpacity>
          </View>

          {/* Stepper Indicator */}
          <View style={[styles.pickerStepTabRow, { backgroundColor: isDark ? '#111c34' : '#ffffff', borderBottomColor: isDark ? '#1e2d4d' : '#e2e8f0' }]}>
            <TouchableOpacity 
              style={[styles.pickerStepTab, pickerStep === 'book' && styles.pickerStepTabActive]}
              onPress={() => setPickerStep('book')}
            >
              <Text style={[styles.pickerStepTabTxt, pickerStep === 'book' && { color: '#fcd34d', fontWeight: '800' }]}>
                1. Book: {pickerSelectedBook || 'Select'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.pickerStepTab, pickerStep === 'chapter' && styles.pickerStepTabActive]}
              onPress={() => setPickerStep('chapter')}
            >
              <Text style={[styles.pickerStepTabTxt, pickerStep === 'chapter' && { color: '#fcd34d', fontWeight: '800' }]}>
                2. Chapter: {pickerSelectedChapter}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.pickerStepTab, pickerStep === 'verse' && styles.pickerStepTabActive]}
              onPress={() => setPickerStep('verse')}
            >
              <Text style={[styles.pickerStepTabTxt, pickerStep === 'verse' && { color: '#fcd34d', fontWeight: '800' }]}>
                3. Verse: {pickerVerseInput || '1'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* STEP 1: Select Book */}
          {pickerStep === 'book' && (
            <View style={{ flex: 1 }}>
              {/* Search Box */}
              <View style={[styles.searchBar, { marginHorizontal: 16, marginTop: 12, backgroundColor: isDark ? '#141f36' : '#ffffff', borderColor: isDark ? '#213052' : '#e2e8f0' }]}>
                <Search size={18} color="#94a3b8" />
                <TextInput
                  style={[styles.searchInput, { color: isDark ? '#ffffff' : '#0f172a' }]}
                  placeholder="Search Bible book (e.g. John, Genesis)..."
                  placeholderTextColor="#94a3b8"
                  value={pickerBookSearch}
                  onChangeText={setPickerBookSearch}
                />
                {pickerBookSearch.length > 0 && (
                  <TouchableOpacity onPress={() => setPickerBookSearch('')}>
                    <X size={16} color="#94a3b8" />
                  </TouchableOpacity>
                )}
              </View>

              {/* Testament Selector Tabs */}
              <View style={[styles.pickerTestamentRow, { marginHorizontal: 16, marginVertical: 10 }]}>
                <TouchableOpacity
                  style={[
                    styles.pickerTestamentTab, 
                    pickerTestament === 'OT' && { backgroundColor: colors.primary, borderColor: colors.primary },
                    { borderColor: isDark ? '#223254' : '#cbd5e1' }
                  ]}
                  onPress={() => setPickerTestament('OT')}
                >
                  <Text style={[styles.pickerTestamentTxt, pickerTestament === 'OT' && { color: '#fcd34d', fontWeight: '800' }]}>
                    Old Testament (39)
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.pickerTestamentTab, 
                    pickerTestament === 'NT' && { backgroundColor: colors.primary, borderColor: colors.primary },
                    { borderColor: isDark ? '#223254' : '#cbd5e1' }
                  ]}
                  onPress={() => setPickerTestament('NT')}
                >
                  <Text style={[styles.pickerTestamentTxt, pickerTestament === 'NT' && { color: '#fcd34d', fontWeight: '800' }]}>
                    New Testament (27)
                  </Text>
                </TouchableOpacity>
              </View>

              <ScrollView contentContainerStyle={styles.pickerBooksGrid} showsVerticalScrollIndicator={false}>
                {(BIBLE_BOOKS_DATA[pickerTestament] || []).filter(b => {
                  if (!pickerBookSearch.trim()) return true;
                  return b.toLowerCase().includes(pickerBookSearch.toLowerCase().trim());
                }).map(book => {
                  const isSelected = pickerSelectedBook === book;
                  const chCount = BIBLE_CHAPTER_COUNTS[book] || 1;
                  return (
                    <TouchableOpacity
                      key={book}
                      style={[
                        styles.pickerBookItem,
                        { 
                          backgroundColor: isSelected ? (isDark ? '#1e3a8a' : '#eff6ff') : (isDark ? '#141f36' : '#ffffff'),
                          borderColor: isSelected ? '#3b82f6' : (isDark ? '#213052' : '#e2e8f0')
                        }
                      ]}
                      onPress={() => {
                        setPickerSelectedBook(book);
                        setPickerSelectedChapter(1);
                        setPickerStep('chapter');
                      }}
                      activeOpacity={0.7}
                    >
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.pickerBookName, { color: isSelected ? (isDark ? '#93c5fd' : '#1d4ed8') : (isDark ? '#ffffff' : '#0f172a') }]}>
                          {book}
                        </Text>
                        <Text style={[styles.pickerBookSub, { color: isDark ? '#94a3b8' : '#64748b' }]}>
                          {chCount} Chapters
                        </Text>
                      </View>
                      <ChevronRight size={16} color={isSelected ? '#3b82f6' : (isDark ? '#475569' : '#cbd5e1')} />
                    </TouchableOpacity>
                  );
                })}
                <View style={{ height: safeBottomPadding + 40 }} />
              </ScrollView>
            </View>
          )}

          {/* STEP 2: Select Chapter */}
          {pickerStep === 'chapter' && (
            <View style={{ flex: 1, paddingHorizontal: 16 }}>
              <View style={[styles.pickerSelectedBanner, { backgroundColor: isDark ? '#141f36' : '#ffffff', borderColor: isDark ? '#213052' : '#e2e8f0' }]}>
                <BookOpen size={20} color="#fcd34d" />
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={[styles.pickerSelectedBannerTitle, { color: isDark ? '#ffffff' : '#0f172a' }]}>
                    {pickerSelectedBook}
                  </Text>
                  <Text style={[styles.pickerSelectedBannerSub, { color: isDark ? '#94a3b8' : '#64748b' }]}>
                    Select a chapter ({BIBLE_CHAPTER_COUNTS[pickerSelectedBook] || 20} chapters total)
                  </Text>
                </View>
                <TouchableOpacity 
                  onPress={() => setPickerStep('book')}
                  style={styles.changeBookPill}
                >
                  <Text style={styles.changeBookPillTxt}>Change Book</Text>
                </TouchableOpacity>
              </View>

              <ScrollView contentContainerStyle={styles.chaptersGrid} showsVerticalScrollIndicator={false}>
                {Array.from({ length: BIBLE_CHAPTER_COUNTS[pickerSelectedBook] || 20 }, (_, i) => i + 1).map(ch => {
                  const isSelected = pickerSelectedChapter === ch;
                  return (
                    <TouchableOpacity
                      key={ch}
                      style={[
                        styles.chapterSquare,
                        {
                          backgroundColor: isSelected ? '#fcd34d' : (isDark ? '#141f36' : '#ffffff'),
                          borderColor: isSelected ? '#f59e0b' : (isDark ? '#213052' : '#cbd5e1')
                        }
                      ]}
                      onPress={() => {
                        setPickerSelectedChapter(ch);
                        setPickerStep('verse');
                      }}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.chapterSquareTxt, { color: isSelected ? '#0b1120' : (isDark ? '#ffffff' : '#0f172a'), fontWeight: isSelected ? '800' : '600' }]}>
                        {ch}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
                <View style={{ height: safeBottomPadding + 40 }} />
              </ScrollView>
            </View>
          )}

          {/* STEP 3: Select Verse Reference */}
          {pickerStep === 'verse' && (
            <ScrollView contentContainerStyle={{ padding: 16 }} showsVerticalScrollIndicator={false}>
              <View style={[styles.pickerSelectedBanner, { backgroundColor: isDark ? '#141f36' : '#ffffff', borderColor: isDark ? '#213052' : '#e2e8f0', marginBottom: 16 }]}>
                <BookOpen size={20} color="#fcd34d" />
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={[styles.pickerSelectedBannerTitle, { color: isDark ? '#ffffff' : '#0f172a' }]}>
                    {pickerSelectedBook} Chapter {pickerSelectedChapter}
                  </Text>
                  <Text style={[styles.pickerSelectedBannerSub, { color: isDark ? '#94a3b8' : '#64748b' }]}>
                    Specify verse or verse range below
                  </Text>
                </View>
              </View>

              <Text style={styles.fieldLabel}>Verse Number or Range (e.g. 16 or 1-4)</Text>
              <TextInput
                style={[
                  styles.inputBox, 
                  { backgroundColor: isDark ? '#141f36' : '#ffffff', color: isDark ? '#ffffff' : '#0f172a', borderColor: isDark ? '#213052' : '#cbd5e1', fontSize: 16, height: 48, fontWeight: '700' }
                ]}
                placeholder="e.g. 16 or 1-5"
                placeholderTextColor="#94a3b8"
                value={pickerVerseInput}
                onChangeText={setPickerVerseInput}
                keyboardType="default"
              />

              <Text style={[styles.fieldLabel, { marginTop: 16 }]}>Quick Verse Shortcuts:</Text>
              <View style={styles.quickVerseRow}>
                {['1', '5', '10', '16', '1-5', 'Entire Chapter'].map(shortcut => (
                  <TouchableOpacity
                    key={shortcut}
                    style={[
                      styles.quickVerseChip,
                      pickerVerseInput === (shortcut === 'Entire Chapter' ? '1' : shortcut) && { backgroundColor: '#fcd34d', borderColor: '#fcd34d' },
                      { borderColor: isDark ? '#223254' : '#cbd5e1' }
                    ]}
                    onPress={() => setPickerVerseInput(shortcut === 'Entire Chapter' ? '1' : shortcut)}
                  >
                    <Text style={[styles.quickVerseChipTxt, pickerVerseInput === (shortcut === 'Entire Chapter' ? '1' : shortcut) && { color: '#0b1120', fontWeight: '800' }]}>
                      {shortcut}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Summary Card */}
              <View style={[styles.verseSummaryCard, { backgroundColor: isDark ? '#1a2744' : '#eff6ff', borderColor: isDark ? '#2b3f6c' : '#bfdbfe', marginTop: 24 }]}>
                <Text style={[styles.verseSummaryLabel, { color: isDark ? '#93c5fd' : '#1d4ed8' }]}>Reference Preview:</Text>
                <Text style={[styles.verseSummaryRef, { color: isDark ? '#fcd34d' : '#1e3a8a' }]}>
                  {pickerSelectedBook} {pickerSelectedChapter}:{pickerVerseInput || '1'}
                </Text>
                <Text style={[styles.verseSummaryHint, { color: isDark ? '#94a3b8' : '#64748b' }]}>
                  Tapping "Apply Scripture Reference" will auto-populate the Book, Chapter, Verse, and Scripture Reference in your question form!
                </Text>
              </View>

              <TouchableOpacity
                style={[styles.applyScriptureBtn, { backgroundColor: '#fcd34d', marginTop: 20 }]}
                onPress={handleApplyBibleSelection}
                activeOpacity={0.8}
              >
                <CheckCircle2 size={18} color="#0b1120" />
                <Text style={styles.applyScriptureBtnTxt}>
                  Apply Scripture: {pickerSelectedBook} {pickerSelectedChapter}:{pickerVerseInput || '1'}
                </Text>
              </TouchableOpacity>

              <View style={{ height: safeBottomPadding + 40 }} />
            </ScrollView>
          )}
        </View>
      </Modal>

      {/* ─────────────────────────────────────────────────────────────
          MODAL 5: QUIZ SUCCESS & CONFIRMATION CELEBRATION MODAL
         ───────────────────────────────────────────────────────────── */}
      <Modal visible={quizSuccessModalVisible} animationType="fade" transparent={true} statusBarTranslucent={true}>
        <View style={styles.successModalBackdrop}>
          <View style={[styles.successModalCard, { backgroundColor: isDark ? '#131e33' : '#ffffff' }]}>
            <View style={[styles.successIconCircle, { backgroundColor: lastSavedIntent === 'publish_now' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(252, 211, 77, 0.15)' }]}>
              {lastSavedIntent === 'publish_now' ? (
                <Sparkles size={36} color="#10b981" />
              ) : lastSavedIntent === 'schedule' ? (
                <Calendar size={36} color="#fcd34d" />
              ) : (
                <Save size={36} color="#94a3b8" />
              )}
            </View>

            <Text style={[styles.successTitle, { color: isDark ? '#ffffff' : '#0f172a' }]}>
              {lastSavedIntent === 'publish_now' 
                ? 'Quiz Prepared & Published! 🚀' 
                : lastSavedIntent === 'schedule'
                  ? 'Quiz Scheduled! 🎉'
                  : 'Quiz Draft Saved! 💾'}
            </Text>

            <Text style={[styles.successSub, { color: isDark ? '#94a3b8' : '#64748b' }]}>
              {lastSavedIntent === 'publish_now'
                ? 'Quiz is now ready in your dashboard. Tap "Start Quiz Now" at the exact moment you want to launch it live for church members!'
                : lastSavedIntent === 'schedule'
                  ? `Scheduled for ${lastSavedQuiz?.scheduledDateStr || 'upcoming date'}. Church members can see it is scheduled!`
                  : 'Draft stored securely. You can review and launch it anytime.'}
            </Text>

            {/* Quiz Info Box */}
            {lastSavedQuiz && (
              <View style={[styles.successQuizSummary, { backgroundColor: isDark ? '#1a2744' : '#f8fafc', borderColor: isDark ? '#26385a' : '#e2e8f0' }]}>
                <Text style={[styles.successQuizTitle, { color: isDark ? '#ffffff' : '#0f172a' }]} numberOfLines={2}>
                  {lastSavedQuiz.title}
                </Text>
                
                <View style={styles.successMetaRow}>
                  <Text style={[styles.successMetaTxt, { color: '#fcd34d' }]}>
                    {lastSavedQuiz.questions.length} Questions
                  </Text>
                  <Text style={{ color: isDark ? '#475569' : '#cbd5e1' }}>•</Text>
                  <Text style={[styles.successMetaTxt, { color: isDark ? '#cbd5e1' : '#475569' }]}>
                    {lastSavedQuiz.durationMinutes} mins
                  </Text>
                  <Text style={{ color: isDark ? '#475569' : '#cbd5e1' }}>•</Text>
                  <Text style={[styles.successMetaTxt, { color: isDark ? '#cbd5e1' : '#475569' }]}>
                    Pass {lastSavedQuiz.passingScore}%
                  </Text>
                </View>

                {lastSavedIntent === 'schedule' && lastSavedQuiz.scheduledDateStr && (
                  <View style={[styles.successSchedulePill, { backgroundColor: isDark ? '#141f36' : '#eff6ff' }]}>
                    <Clock size={13} color="#3b82f6" />
                    <Text style={[styles.successScheduleTxt, { color: isDark ? '#93c5fd' : '#1d4ed8' }]}>
                      Scheduled: {lastSavedQuiz.scheduledDateStr}
                    </Text>
                  </View>
                )}

                {lastSavedIntent !== 'draft' && (
                  <View style={[styles.successNotifBadge, { backgroundColor: isDark ? 'rgba(59, 130, 246, 0.15)' : '#eff6ff' }]}>
                    <Bell size={13} color="#3b82f6" />
                    <Text style={[styles.successNotifTxt, { color: isDark ? '#93c5fd' : '#1d4ed8' }]}>
                      Push notification broadcasted to all church members
                    </Text>
                  </View>
                )}
              </View>
            )}

            <TouchableOpacity 
              style={[styles.successDoneBtn, { backgroundColor: '#fcd34d' }]}
              onPress={() => {
                setQuizSuccessModalVisible(false);
                setActiveSegment('quizzes');
                // Reset form state
                setWizardStep(1);
                setQuizTitle('');
                setStagedQuestions([]);
              }}
              activeOpacity={0.85}
            >
              <Text style={styles.successDoneTxt}>View in Dashboard</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingTop: Platform.OS === 'ios' ? 52 : (StatusBar.currentHeight ? StatusBar.currentHeight + 18 : 50),
    paddingBottom: 14,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
  },
  backBtn: {
    padding: 6,
    marginRight: 8,
  },
  headerTitleWrap: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  headerSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  quickAddBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    padding: 16,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    padding: 12,
    borderRadius: 14,
    alignItems: 'center',
  },
  statIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '800',
  },
  statLabel: {
    fontSize: 10,
    fontWeight: '600',
    marginTop: 2,
    textAlign: 'center',
  },
  launchersCard: {
    gap: 10,
    marginBottom: 16,
  },
  primaryLauncher: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  primaryLauncherGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
  },
  launcherIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(252, 211, 77, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  launcherTitle: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '800',
  },
  launcherSub: {
    color: '#94a3b8',
    fontSize: 12,
    marginTop: 2,
  },
  launcherArrow: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(252, 211, 77, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectFromBibleLongCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    gap: 12,
  },
  bibleCardIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bibleCardTitle: {
    fontSize: 15,
    fontWeight: '800',
  },
  bibleCardSub: {
    fontSize: 12,
    marginTop: 2,
    lineHeight: 16,
  },
  comingSoonBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  comingSoonText: {
    fontSize: 10,
    fontWeight: '800',
  },
  quickTitlesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 4,
  },
  quickTitleChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 1,
  },
  quickTitleTxt: {
    fontSize: 11,
  },
  quickPicksRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 8,
  },
  quickPickBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 12,
  },
  quickPickTxt: {
    fontSize: 12,
    fontWeight: '800',
  },
  segmentContainer: {
    flexDirection: 'row',
    padding: 4,
    borderRadius: 12,
    marginBottom: 16,
  },
  segmentTab: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  segmentText: {
    fontSize: 12,
    fontWeight: '600',
  },
  segmentTextActive: {
    fontWeight: '800',
  },
  sectionWrap: {
    gap: 12,
  },
  quizCard: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
  },
  quizHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 6,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  quizCategory: {
    fontSize: 11,
    fontWeight: '600',
  },
  quizTitle: {
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 10,
  },
  quizMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 14,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  metaText: {
    fontSize: 12,
    fontWeight: '500',
  },
  quizFooterRow: {
    flexDirection: 'row',
    borderTopWidth: 1,
    paddingTop: 10,
    justifyContent: 'space-between',
  },
  quizActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 4,
  },
  quizActionTxt: {
    fontSize: 12,
    fontWeight: '700',
    color: '#3b82f6',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    height: 44,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
  },
  filterPillsRow: {
    gap: 8,
    paddingVertical: 6,
  },
  filterPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  filterPillTxt: {
    fontSize: 11,
    color: '#94a3b8',
    fontWeight: '600',
  },
  bankResultCount: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
    marginBottom: 8,
  },
  questionCard: {
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  questionCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  verseBadge: {
    backgroundColor: 'rgba(252, 211, 77, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  verseBadgeTxt: {
    color: '#fcd34d',
    fontSize: 11,
    fontWeight: '700',
  },
  diffBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  diffBadgeTxt: {
    fontSize: 10,
    fontWeight: '700',
  },
  questionText: {
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 20,
    marginBottom: 10,
  },
  optionsList: {
    gap: 6,
    marginBottom: 10,
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 8,
  },
  optionItemCorrect: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderWidth: 1,
    borderColor: '#10b981',
  },
  optionLetter: {
    fontSize: 12,
    color: '#94a3b8',
  },
  optionText: {
    fontSize: 12,
    color: '#94a3b8',
    flex: 1,
  },
  explanationBox: {
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    padding: 8,
    borderRadius: 8,
  },
  explanationLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#3b82f6',
    marginBottom: 2,
  },
  explanationTxt: {
    fontSize: 11,
    color: '#94a3b8',
    lineHeight: 16,
  },
  // Wizard Modal Styles
  wizardModalContainer: {
    flex: 1,
  },
  wizardHeader: {
    paddingTop: Platform.OS === 'ios' ? 52 : (StatusBar.currentHeight ? StatusBar.currentHeight + 18 : 50),
    paddingBottom: 14,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
  },
  wizardCloseBtn: {
    padding: 6,
  },
  wizardStepIndicator: {
    alignItems: 'center',
  },
  wizardStepTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  wizardStepSub: {
    fontSize: 11,
    color: '#94a3b8',
    marginTop: 2,
  },
  wizardProgressBar: {
    height: 3,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  progressTrack: {
    height: '100%',
  },
  wizardScroll: {
    padding: 16,
  },
  stepContent: {
    gap: 12,
  },
  formSectionHeader: {
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#94a3b8',
    marginTop: 6,
  },
  inputBox: {
    height: 46,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    fontSize: 14,
  },
  formRow: {
    flexDirection: 'row',
  },
  choiceRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  choicePill: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
  },
  choicePillTxt: {
    fontSize: 12,
    color: '#94a3b8',
  },
  stagedBadgeBar: {
    backgroundColor: 'rgba(252, 211, 77, 0.15)',
    padding: 12,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 8,
  },
  stagedBadgeTitle: {
    color: '#fcd34d',
    fontSize: 13,
    fontWeight: '800',
  },
  pickQuestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    gap: 10,
    marginBottom: 8,
  },
  checkboxCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: '#94a3b8',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pickVerse: {
    fontSize: 10,
    fontWeight: '700',
    marginBottom: 2,
  },
  pickText: {
    fontSize: 13,
    fontWeight: '600',
  },
  dividerLine: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    marginVertical: 16,
  },
  manualOptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  radioCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: '#94a3b8',
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioCircleActive: {
    borderColor: '#10b981',
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#10b981',
  },
  manualOptionInput: {
    flex: 1,
    height: 42,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 12,
    fontSize: 13,
  },
  addCustomBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 10,
    marginTop: 10,
  },
  addCustomBtnTxt: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
  reviewSummaryCard: {
    backgroundColor: '#1e2d4d',
    padding: 16,
    borderRadius: 12,
  },
  reviewSummaryTitle: {
    color: '#fcd34d',
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 4,
  },
  reviewSummarySub: {
    color: '#94a3b8',
    fontSize: 12,
  },
  reorderItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    gap: 10,
    marginBottom: 8,
  },
  orderNumberBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(252, 211, 77, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  orderNumberTxt: {
    color: '#fcd34d',
    fontSize: 11,
    fontWeight: '800',
  },
  reorderVerse: {
    fontSize: 10,
    fontWeight: '700',
    marginBottom: 2,
  },
  reorderText: {
    fontSize: 12,
    fontWeight: '600',
  },
  reorderControls: {
    flexDirection: 'row',
    gap: 4,
  },
  reorderBtn: {
    padding: 6,
  },
  wizardBottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 32 : 28,
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
  },
  wizardNavBtn: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
  },
  wizardNavTxt: {
    fontSize: 14,
    fontWeight: '700',
  },
  wizardPublishRow: {
    flexDirection: 'row',
    gap: 10,
  },
  saveDraftBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  saveDraftTxt: {
    fontSize: 13,
    fontWeight: '700',
  },
  publishNowBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 10,
  },
  publishNowTxt: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
  step3ActionBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    gap: 8,
  },
  step3BackBtn: {
    flex: 1,
    height: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 11,
    borderWidth: 1,
    gap: 4,
  },
  step3BackTxt: {
    fontSize: 13,
    fontWeight: '700',
  },
  step3DraftBtn: {
    flex: 1.3,
    height: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 11,
    borderWidth: 1,
    gap: 6,
  },
  step3DraftTxt: {
    fontSize: 13,
    fontWeight: '700',
  },
  step3PrimaryBtn: {
    flex: 1.8,
    height: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 11,
    gap: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 3,
  },
  step3PrimaryTxt: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '800',
  },
  wizardNormalStepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  previewBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    padding: 16,
  },
  previewModalBox: {
    borderRadius: 18,
    padding: 18,
  },
  previewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  previewModalTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  previewMeta: {
    fontSize: 12,
    marginBottom: 14,
  },
  previewQuestionCard: {
    padding: 12,
    borderRadius: 10,
    marginBottom: 10,
  },
  previewQNum: {
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 4,
  },
  previewQTxt: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 6,
  },
  previewOptTxt: {
    fontSize: 12,
    lineHeight: 18,
  },
  closePreviewBtn: {
    marginTop: 14,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  closePreviewTxt: {
    color: '#0b1120',
    fontSize: 13,
    fontWeight: '800',
  },
  smallAddBadgeBtn: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 4,
  },
  bankHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 12,
  },
  bankHeaderTitle: {
    fontSize: 15,
    fontWeight: '800',
  },
  bankHeaderSub: {
    fontSize: 12,
    marginTop: 2,
  },
  addBankQuestionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
  },
  addBankQuestionTxt: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0b1120',
  },
  deleteQuestionBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bibleSourceCard: {
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 16,
  },
  bibleSourceTitle: {
    fontSize: 14,
    fontWeight: '800',
  },
  openBiblePickerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  openBiblePickerBtnTxt: {
    fontSize: 11,
    fontWeight: '800',
    color: '#0b1120',
  },
  selectedScriptureBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    marginTop: 6,
    gap: 8,
  },
  selectedScriptureLabel: {
    fontSize: 10,
    fontWeight: '600',
    marginBottom: 2,
  },
  selectedScriptureRef: {
    fontSize: 15,
    fontWeight: '800',
  },
  aiGenerateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  aiGenerateBtnTxt: {
    fontSize: 11,
    fontWeight: '800',
    color: '#fcd34d',
  },
  bibleSourceHint: {
    fontSize: 11,
    lineHeight: 16,
    marginTop: 4,
  },
  openBibleLinkBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: 'rgba(252, 211, 77, 0.15)',
  },
  openBibleLinkTxt: {
    fontSize: 11,
    fontWeight: '700',
    color: '#fcd34d',
  },
  bookSelectBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
  },
  bookSelectBoxTxt: {
    fontSize: 13,
  },
  autoGenExplainBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  autoGenExplainTxt: {
    fontSize: 11,
    fontWeight: '700',
    color: '#fcd34d',
  },
  pickerStepTabRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
  },
  pickerStepTab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  pickerStepTabActive: {
    borderBottomColor: '#fcd34d',
  },
  pickerStepTabTxt: {
    fontSize: 11,
    color: '#94a3b8',
    fontWeight: '600',
  },
  pickerTestamentRow: {
    flexDirection: 'row',
    gap: 8,
  },
  pickerTestamentTab: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
  },
  pickerTestamentTxt: {
    fontSize: 12,
    color: '#94a3b8',
    fontWeight: '600',
  },
  pickerBooksGrid: {
    paddingHorizontal: 16,
    paddingTop: 8,
    gap: 8,
  },
  pickerBookItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  pickerBookName: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 2,
  },
  pickerBookSub: {
    fontSize: 11,
  },
  pickerSelectedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginVertical: 12,
  },
  pickerSelectedBannerTitle: {
    fontSize: 15,
    fontWeight: '800',
  },
  pickerSelectedBannerSub: {
    fontSize: 11,
    marginTop: 2,
  },
  changeBookPill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: 'rgba(252, 211, 77, 0.15)',
  },
  changeBookPillTxt: {
    fontSize: 11,
    fontWeight: '700',
    color: '#fcd34d',
  },
  chaptersGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingVertical: 8,
    justifyContent: 'flex-start',
  },
  chapterSquare: {
    width: (width - 32 - 32) / 5,
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  chapterSquareTxt: {
    fontSize: 14,
  },
  quickVerseRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  quickVerseChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    borderWidth: 1,
  },
  quickVerseChipTxt: {
    fontSize: 12,
    color: '#94a3b8',
  },
  verseSummaryCard: {
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  verseSummaryLabel: {
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 4,
  },
  verseSummaryRef: {
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 6,
  },
  verseSummaryHint: {
    fontSize: 11,
    lineHeight: 16,
  },
  applyScriptureBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
  },
  applyScriptureBtnTxt: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0b1120',
  },
  quizScheduleBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 8,
    marginBottom: 4,
  },
  quizScheduleTxt: {
    fontSize: 12,
    fontWeight: '700',
  },
  startLiveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
  },
  startLiveBtnTxt: {
    fontSize: 12,
    fontWeight: '800',
    color: '#ffffff',
  },
  scheduleOptionsContainer: {
    gap: 8,
    marginBottom: 10,
  },
  scheduleOptionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1.5,
  },
  scheduleOptionIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scheduleOptionTitle: {
    fontSize: 14,
    marginBottom: 2,
  },
  scheduleOptionSub: {
    fontSize: 11,
  },
  scheduleOptionCheck: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#fcd34d',
    justifyContent: 'center',
    alignItems: 'center',
  },
  customScheduleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 6,
  },
  successModalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  successModalCard: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 8,
  },
  successIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  successTitle: {
    fontSize: 20,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 8,
  },
  successSub: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 20,
  },
  successQuizSummary: {
    width: '100%',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 20,
  },
  successQuizTitle: {
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 8,
  },
  successMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  successMetaTxt: {
    fontSize: 12,
    fontWeight: '700',
  },
  successSchedulePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    marginTop: 4,
    alignSelf: 'flex-start',
  },
  successScheduleTxt: {
    fontSize: 11.5,
    fontWeight: '700',
  },
  successNotifBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    marginTop: 8,
  },
  successNotifTxt: {
    fontSize: 11,
    fontWeight: '600',
    flex: 1,
  },
  successDoneBtn: {
    width: '100%',
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  successDoneTxt: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0b1120',
  },
  fieldSub: {
    fontSize: 12.5,
    lineHeight: 18,
  },
});

