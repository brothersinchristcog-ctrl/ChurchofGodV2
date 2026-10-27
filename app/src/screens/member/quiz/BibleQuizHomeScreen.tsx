import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  StatusBar,
  Dimensions,
  Platform,
  Alert,
  RefreshControl,
  AppState,
  Modal,
  TextInput,
  BackHandler
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect, useRoute } from '@react-navigation/native';
import { 
  ChevronLeft, 
  Sparkles, 
  BookOpen, 
  Award, 
  Flame, 
  Clock, 
  CheckCircle2, 
  RotateCcw,
  Play, 
  Compass, 
  ShieldAlert, 
  History,
  Layers,
  ChevronRight,
  SlidersHorizontal,
  BookmarkCheck,
  Trophy,
  Scroll,
  BookMarked,
  Users,
  Shield,
  Heart,
  Feather,
  CheckSquare,
  Sun,
  Church,
  Globe,
  Smile,
  Zap,
  HeartHandshake,
  ShieldCheck,
  Crown,
  GraduationCap,
  X,
  Check,
  Filter,
  ChevronDown,
  ChevronUp,
  Search
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../../context/ThemeContext';
import { useAuth } from '../../../context/AuthContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import BibleQuizService, { VERIFIED_BIBLE_QUESTIONS } from '../../../services/BibleQuizService';
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';

let inMemoryLastMemberStats: QuizStats | null = null;
let inMemoryLastDailyCompletedDate: string | null = null;
import { 
  QuizFilterCriteria, 
  QuizStats, 
  TestamentScope, 
  DifficultyLevel,
  QuizCategory,
  QuizTrack,
  BibleQuestion,
  QuizAttempt
} from '../../../types/quiz';
import Coins3DIcon from '../../../components/Coins3DIcon';
import Category3DIcon from '../../../components/Category3DIcon';
import AiQuizLoadingModal from '../../../components/AiQuizLoadingModal';

const { width } = Dimensions.get('window');

const UNIQUE_CATEGORY_COLORS: Record<string, string> = {
  complete_bible: '#4f46e5', // Deep Indigo
  ot_studies: '#f59e0b', // Warm Golden Amber
  nt_studies: '#9333ea', // Royal Purple / Violet
  bible_characters: '#0284c7', // Ocean Sky Blue
  theology_doctrines: '#dc2626', // Crimson Red
  holy_spirit_life: '#ea580c', // Vivid Flame Orange
  prophecy_eschatology: '#059669', // Emerald Green
  family_relationships: '#db2777', // Hot Pink / Magenta
  christian_character: '#16a34a', // Bright Spring Leaf Green
  wisdom_literature: '#0d9488', // Deep Aquatic Teal
  scripture_challenges: '#2563eb', // Royal Cobalt Blue
  events_miracles_parables: '#eab308', // Sunny Marigold Yellow
  church_ministry: '#831843', // Deep Wine Plum
  people_nations_cultures: '#06b6d4', // Radiant Cyan
  special_tracks: '#b45309', // Warm Bronze Copper
};

const UNIQUE_TRACK_COLORS: Record<string, string> = {
  kids_quiz: '#06b6d4', // Playful Cyan
  youth_challenge: '#8b5cf6', // Electric Violet
  family_competition: '#ec4899', // Vibrant Pink
  couples_quiz: '#f43f5e', // Romantic Rose
  beginner_journey: '#10b981', // Fresh Mint Green
  pastors_leaders: '#b45309', // Dignified Bronze
  advanced_theology: '#4338ca', // Deep Royal Navy
  women_of_faith: '#c026d3', // Orchid / Magenta
  men_of_faith: '#0284c7', // Steel Sky Blue
  daily_challenge: '#ea580c', // Sunrise Orange
  church_competition: '#eab308', // Trophy Gold
  full_mastery: '#059669', // Mastery Emerald
};

export default function BibleQuizHomeScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { isDark } = useTheme();
  const { user, member } = useAuth();

  const currentUid = user?.uid || auth().currentUser?.uid || (member as any)?.id;
  const currentName = member?.name || user?.displayName;
  const currentPhone = (member as any)?.phone || (member as any)?.mobilePhone || user?.phoneNumber || null;

  const [loading, setLoading] = useState(false);
  const [loadingTitle, setLoadingTitle] = useState('Preparing Scripture Challenge');
  const [loadingTopic, setLoadingTopic] = useState<string | undefined>(undefined);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState<QuizStats | null>(() => {
    const attempts = BibleQuizService.getLoadedAttempts();
    if (attempts && attempts.length > 0) {
      const mine = BibleQuizService.getUserAttempts(attempts, currentUid, currentName, currentPhone);
      const computed = BibleQuizService.computeStats(mine);
      if (computed && computed.totalQuizzesTaken > 0) {
        inMemoryLastMemberStats = computed;
        return computed;
      }
    }
    return inMemoryLastMemberStats;
  });
  const [dailyCompleted, setDailyCompleted] = useState<boolean>(() => {
    const todayKey = BibleQuizService.getTodayDateKey();
    if (inMemoryLastDailyCompletedDate === todayKey) {
      return true;
    }
    return BibleQuizService.isDailyCompletedTodaySync(currentUid, currentName, currentPhone);
  });
  const [attemptsLoaded, setAttemptsLoaded] = useState<boolean>(() => BibleQuizService.isAttemptsLoaded());
  const [userAttempts, setUserAttempts] = useState<QuizAttempt[]>(() =>
    BibleQuizService.getUserAttempts(BibleQuizService.getLoadedAttempts(), currentUid, currentName, currentPhone)
  );

  // Restore cached stats and daily status from disk immediately on cold start
  useEffect(() => {
    AsyncStorage.getItem('@church_cached_member_quiz_stats')
      .then(stored => {
        if (stored) {
          try {
            const parsed = JSON.parse(stored);
            if (parsed && !inMemoryLastMemberStats) {
              inMemoryLastMemberStats = parsed;
              setStats(parsed);
            }
          } catch (_) {}
        }
      })
      .catch(() => {});

    AsyncStorage.getItem('@church_cached_daily_completed_date')
      .then(savedDate => {
        if (savedDate === BibleQuizService.getTodayDateKey()) {
          inMemoryLastDailyCompletedDate = savedDate;
          setDailyCompleted(true);
        }
      })
      .catch(() => {});
  }, []);

  // Auto-launch Daily Scripture Challenge if navigated via push notification
  const autoStartHandledRef = React.useRef(false);
  useEffect(() => {
    if (route.params?.autoStartDaily && !autoStartHandledRef.current) {
      autoStartHandledRef.current = true;
      if (!dailyCompleted) {
        const timer = setTimeout(() => {
          handleStartDailyChallenge();
        }, 350);
        return () => clearTimeout(timer);
      }
    }
  }, [route.params?.autoStartDaily, dailyCompleted]);

  // Direct Firestore listener: today's daily quiz completed by THIS member (resets next day or upon document deletion)
  useEffect(() => {
    const uid = currentUid || auth().currentUser?.uid;
    if (!uid) {
      return;
    }
    const unsub = BibleQuizService.subscribeDailyCompletion(uid, (isDone) => {
      setDailyCompleted(isDone);
    });

    // Immediate server read directly from quiz_attempts so state matches Cloud Firestore immediately
    let cancelled = false;
    const todayKey = BibleQuizService.getTodayDateKey();
    firestore()
      .collection('quiz_attempts')
      .where('uid', '==', uid)
      .get({ source: 'server' })
      .then(snap => {
        if (cancelled) return;
        const done = snap.docs.some(d => {
          const data: any = d.data();
          if (data?.quizType !== 'daily' || !data?.completedAt) return false;
          const dt = new Date(data.completedAt);
          const key = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
          return key === todayKey;
        });
        if (done) setDailyCompleted(true);
      })
      .catch(() => {});

    return () => {
      cancelled = true;
      unsub();
    };
  }, [currentUid]);

  // Real-time listener for current member's quiz attempts (for instantaneous completed status update)
  useEffect(() => {
    const uid = currentUid || auth().currentUser?.uid;
    if (!uid) return;

    const unsub = firestore()
      .collection('quiz_attempts')
      .where('uid', '==', uid)
      .onSnapshot(
        snap => {
          if (snap && !snap.empty) {
            const list = snap.docs.map(d => ({ id: d.id, ...d.data() } as QuizAttempt));
            setUserAttempts(prev => {
              const prevMap = new Map(prev.map(p => [p.id, p]));
              list.forEach(l => prevMap.set(l.id, l));
              return Array.from(prevMap.values());
            });
          }
        },
        () => {}
      );

    return () => unsub();
  }, [currentUid]);

  // Pre-warm today's daily quiz in the background so tapping "Start" is instantaneous
  useEffect(() => {
    if (!dailyCompleted) {
      BibleQuizService.getDailyQuiz().catch(() => {});
    }
  }, [dailyCompleted]);

  // Automatic Quiz Config State
  const [generatorTab, setGeneratorTab] = useState<'categories' | 'tracks' | 'books'>('categories');
  const [categories, setCategories] = useState<QuizCategory[]>(() => BibleQuizService.getCategoriesSync());
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('complete_bible');
  const [selectedSubcategoryId, setSelectedSubcategoryId] = useState<string>('all');
  const [subcategoryModalVisible, setSubcategoryModalVisible] = useState<boolean>(false);
  const [selectedTrackId, setSelectedTrackId] = useState<string>('kids_quiz');
  const tracks: QuizTrack[] = BibleQuizService.getQuizTracks();

  // Admin-prepared quizzes state (instantly visible from shared service cache)
  const [adminQuizzes, setAdminQuizzes] = useState<any[]>(() => BibleQuizService.getSharedChurchQuizzes());
  const [adminQuizzesLoading, setAdminQuizzesLoading] = useState<boolean>(
    () => BibleQuizService.getSharedChurchQuizzes().length === 0 && !BibleQuizService.isChurchQuizzesLoaded()
  );
  const [showAdminQuizzes, setShowAdminQuizzes] = useState<boolean>(false);

  // Show 5 cards initially with "See More" option
  const [showAllCategories, setShowAllCategories] = useState<boolean>(false);
  const [showAllTracks, setShowAllTracks] = useState<boolean>(false);

  const displayedCategories = useMemo(() => {
    return showAllCategories ? categories : categories.slice(0, 5);
  }, [showAllCategories, categories]);

  const displayedTracks = useMemo(() => {
    return showAllTracks ? tracks : tracks.slice(0, 5);
  }, [showAllTracks, tracks]);

  const [testament, setTestament] = useState<TestamentScope>('all');
  const [selectedBook, setSelectedBook] = useState<string>('All');
  const [selectedTopic, setSelectedTopic] = useState<string>('All');
  const [difficulty, setDifficulty] = useState<DifficultyLevel | 'mixed'>('mixed');
  const [questionCount, setQuestionCount] = useState<number>(10);
  const [showAdvanced, setShowAdvanced] = useState<boolean>(false);

  const [bookSearchQuery, setBookSearchQuery] = useState<string>('');

  const availableBooks = useMemo(() => {
    const list = BibleQuizService.getAvailableBooks(testament);
    if (!bookSearchQuery.trim()) return list;
    const q = bookSearchQuery.trim().toLowerCase();
    return list.filter(b => b === 'All' || b.toLowerCase().includes(q));
  }, [testament, bookSearchQuery]);

  const selectedCategory = categories.find(c => c.id === selectedCategoryId) || categories[0];
  const selectedSubcategory = selectedCategory?.subcategories.find(s => s.id === selectedSubcategoryId);
  const selectedTrack = tracks.find(t => t.id === selectedTrackId) || tracks[0];
  const selectedTrackColor = selectedTrack ? (UNIQUE_TRACK_COLORS[selectedTrack.id] || selectedTrack.color || '#7c3aed') : '#7c3aed';

  const scrollViewRef = React.useRef<ScrollView>(null);
  const configCardRef = React.useRef<View>(null);
  const [parentCardY, setParentCardY] = useState<number>(0);
  const [configCardY, setConfigCardY] = useState<number>(0);
  const parentCardYRef = React.useRef<number>(0);
  const configCardYRef = React.useRef<number>(0);

  // Load latest categories from Firestore
  useEffect(() => {
    BibleQuizService.getCategories().then(remoteCats => {
      if (remoteCats && remoteCats.length > 0) {
        setCategories(remoteCats);
      }
    }).catch(() => {});
  }, []);

  // Unified synchronizer: calculates user's streak, accuracy, completions, and daily status
  const syncQuizData = useCallback((attemptsList?: any[]) => {
    const attempts = attemptsList || BibleQuizService.getLoadedAttempts();
    const uid = user?.uid || auth().currentUser?.uid || (member as any)?.id;
    const name = member?.name || user?.displayName;
    const phone = (member as any)?.phone || (member as any)?.mobilePhone || user?.phoneNumber || null;

    const mine = BibleQuizService.getUserAttempts(attempts, uid, name, phone);
    const computedStats = BibleQuizService.computeStats(mine);
    const completedToday = BibleQuizService.isDailyCompletedIn(attempts, uid, name, phone);

    if (computedStats && (computedStats.totalQuizzesTaken > 0 || !inMemoryLastMemberStats)) {
      inMemoryLastMemberStats = computedStats;
      AsyncStorage.setItem('@church_cached_member_quiz_stats', JSON.stringify(computedStats)).catch(() => {});
    }
    if (completedToday) {
      inMemoryLastDailyCompletedDate = BibleQuizService.getTodayDateKey();
      AsyncStorage.setItem('@church_cached_daily_completed_date', BibleQuizService.getTodayDateKey()).catch(() => {});
    }

    setUserAttempts(mine);
    setStats(computedStats || inMemoryLastMemberStats);
    setDailyCompleted(completedToday);
  }, [user?.uid, member?.id, member?.name, user?.displayName, (member as any)?.phone, (member as any)?.mobilePhone, user?.phoneNumber]);

  const getQuizCompletion = useCallback((quiz: any): QuizAttempt | undefined => {
    if (!quiz) return undefined;
    return userAttempts.find(att => {
      if (att.quizId && quiz.id && att.quizId === quiz.id) return true;
      if (att.quizType === 'admin' && att.quizTitle && quiz.title && att.quizTitle.trim().toLowerCase() === quiz.title.trim().toLowerCase()) return true;
      return false;
    });
  }, [userAttempts]);

  // 1. Immediately re-calculate whenever user profile or auth state loads
  useEffect(() => {
    syncQuizData();
  }, [syncQuizData]);

  // 2. Real-time subscription to Firestore attempts
  useEffect(() => {
    const unsubscribe = BibleQuizService.subscribeAttempts((attempts, loaded) => {
      setAttemptsLoaded(loaded);
      syncQuizData(attempts);
    });
    return unsubscribe;
  }, [syncQuizData]);

  // 2b. Synchronizer & Real-time Firebase Firestore listener for published Admin Quizzes
  const syncAdminQuizzes = useCallback(() => {
    const list = BibleQuizService.getSharedChurchQuizzes();
    setAdminQuizzes(list);
    setAdminQuizzesLoading(false);
  }, []);

  useEffect(() => {
    const unsubscribe = BibleQuizService.subscribeChurchQuizzes((list) => {
      setAdminQuizzes(list);
      setAdminQuizzesLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleStartAdminQuiz = async (quiz: any) => {
    try {
      setLoadingTitle(quiz.title || 'Church Fellowship Quiz');
      setLoadingTopic('Fellowship Scripture Challenge');
      setLoading(true);
      let questions = quiz.questions;
      // If questions are not in the main doc, fetch directly from Firebase subcollection
      if (!questions || questions.length === 0) {
        try {
          const snap = await firestore()
            .collection('church_quizzes')
            .doc(quiz.id)
            .collection('questions')
            .orderBy('orderIndex', 'asc')
            .get();
          if (!snap.empty) {
            questions = snap.docs.map(d => d.data() as BibleQuestion);
          }
        } catch (err) {
          console.log('Firebase subcollection fetch error:', err);
        }
      }

      if (!questions || questions.length === 0) {
        Alert.alert('No Questions Found', 'This quiz does not have any questions stored in Firebase yet.');
        return;
      }

      navigation.navigate('QuizPlay', {
        quizId: quiz.id,
        quizTitle: quiz.title || 'Church Bible Competition',
        quizType: 'admin',
        questions,
        timeLimitMinutes: quiz.durationMinutes || 10,
        filterCriteria: {
          testament: 'all',
          difficulty: 'mixed',
          questionCount: questions.length
        }
      });
    } catch (e) {
      Alert.alert('Firebase Error', 'Could not start quiz from Firebase. Please check your connection.');
    } finally {
      setLoading(false);
    }
  };

  // 3. Screen focus: ensure fresh Firestore pull & clear any lingering loading spinner
  useFocusEffect(
    useCallback(() => {
      setLoading(false);
      syncQuizData();
      syncAdminQuizzes();
      BibleQuizService.fetchLatestAttempts(currentUid)
        .then(fresh => syncQuizData(fresh))
        .catch(() => {});
    }, [syncQuizData, syncAdminQuizzes, currentUid])
  );

  // 4. AppState listener: re-fetch from Firestore when resuming into app
  useEffect(() => {
    const sub = AppState.addEventListener('change', nextState => {
      if (nextState === 'active') {
        setLoading(false);
        syncAdminQuizzes();
        BibleQuizService.fetchLatestAttempts(currentUid)
          .then(fresh => syncQuizData(fresh))
          .catch(() => {});
      }
    });
    return () => sub.remove();
  }, [syncQuizData, syncAdminQuizzes, currentUid]);

  // 5. Pull-to-refresh handler (syncs Firestore with guaranteed fast completion)
  const handleRefresh = async () => {
    if (refreshing) return;
    setRefreshing(true);
    try {
      const refreshTask = async () => {
        const fresh = await BibleQuizService.fetchLatestAttempts(currentUid);
        syncQuizData(fresh);
        await syncAdminQuizzes();
      };

      await Promise.race([
        refreshTask(),
        new Promise(resolve => setTimeout(resolve, 2500))
      ]);
    } catch (e) {
      console.warn('Notice: BibleQuizHomeScreen refresh error:', e);
    } finally {
      setRefreshing(false);
    }
  };

  const handleHeaderBack = useCallback(() => {
    try {
      if (navigation.canGoBack()) {
        const state = navigation.getState();
        const routes = state?.routes || [];
        const prevRoute = routes.length >= 2 ? routes[routes.length - 2]?.name : null;
        // If previous route is an internal quiz screen, exit back to main app (Tabs -> Home)
        if (!prevRoute || ['QuizResult', 'QuizPlay', 'QuizHistory', 'QuizLeaderboard', 'BibleQuizSplash', 'BibleQuizHome'].includes(prevRoute)) {
          navigation.navigate('Tabs', { screen: 'Home' });
          return;
        }
        navigation.goBack();
        return;
      }
    } catch (_) {}
    navigation.navigate('Tabs', { screen: 'Home' });
  }, [navigation]);

  useFocusEffect(
    useCallback(() => {
      const onBackPress = () => {
        handleHeaderBack();
        return true;
      };
      const sub = BackHandler.addEventListener('hardwareBackPress', onBackPress);
      return () => sub.remove();
    }, [handleHeaderBack])
  );

  const handleStartDailyChallenge = async () => {
    try {
      setLoadingTitle("Today's Scripture Challenge");
      setLoadingTopic("5 Curated Daily Questions across the Bible");
      setLoading(true);
      const questions = await BibleQuizService.getDailyQuiz();
      navigation.navigate('QuizPlay', {
        quizTitle: "Today's Bible Challenge",
        quizType: 'daily',
        questions,
        timeLimitMinutes: 5
      });
    } catch (error) {
      Alert.alert('Error', 'Unable to start daily quiz. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const renderCategoryIcon = (iconName: string, size: number = 18, color: string = '#7c3aed') => {
    switch (iconName) {
      case 'Scroll': return <Scroll size={size} color={color} />;
      case 'BookMarked': return <BookMarked size={size} color={color} />;
      case 'Users': return <Users size={size} color={color} />;
      case 'Shield': return <Shield size={size} color={color} />;
      case 'Flame': return <Flame size={size} color={color} />;
      case 'Compass': return <Compass size={size} color={color} />;
      case 'Heart': return <Heart size={size} color={color} />;
      case 'Sparkles': return <Sparkles size={size} color={color} />;
      case 'Feather': return <Feather size={size} color={color} />;
      case 'CheckSquare': return <CheckSquare size={size} color={color} />;
      case 'Sun': return <Sun size={size} color={color} />;
      case 'Church': return <Church size={size} color={color} />;
      case 'Globe': return <Globe size={size} color={color} />;
      case 'Smile': return <Smile size={size} color={color} />;
      case 'Zap': return <Zap size={size} color={color} />;
      case 'HeartHandshake': return <HeartHandshake size={size} color={color} />;
      case 'ShieldCheck': return <ShieldCheck size={size} color={color} />;
      case 'Crown': return <Crown size={size} color={color} />;
      case 'GraduationCap': return <GraduationCap size={size} color={color} />;
      case 'Award': return <Award size={size} color={color} />;
      case 'Trophy': return <Trophy size={size} color={color} />;
      default: return <BookOpen size={size} color={color} />;
    }
  };

  const getHarmoniousTextColor = (baseColor?: string, dark?: boolean) => {
    if (dark) return '#ffffff';
    if (!baseColor) return '#1e1b4b';
    const deepShades: { [key: string]: string } = {
      '#6366f1': '#312e81', // Indigo -> Deep Indigo
      '#d97706': '#78350f', // Amber -> Deep Amber/Bronze
      '#2563eb': '#1e3a8a', // Blue -> Deep Navy
      '#dc2626': '#7f1d1d', // Crimson -> Deep Crimson
      '#0891b2': '#164e63', // Cyan -> Deep Cyan
      '#7c3aed': '#4c1d95', // Purple -> Deep Royal Purple
      '#ea580c': '#7c2d12', // Orange -> Deep Rust
      '#e11d48': '#881337', // Rose -> Deep Burgundy
      '#9333ea': '#581c87', // Violet -> Deep Violet
      '#4f46e5': '#2e1065', // Deep Indigo -> Deep Plum
      '#059669': '#064e3b', // Emerald -> Deep Forest Green
      '#b45309': '#78350f', // Amber -> Deep Amber
      '#0284c7': '#0c4a6e', // Sky -> Deep Slate Blue
      '#16a34a': '#14532d', // Green -> Deep Forest Green
      '#ca8a04': '#713f12', // Gold -> Deep Bronze Gold
    };
    return deepShades[baseColor.toLowerCase()] || '#1e1b4b';
  };

  const handleSelectTrack = (track: QuizTrack) => {
    setSelectedTrackId(track.id);
    setDifficulty(track.defaultDifficulty);

    // Pre-warm track quiz in the background so questions are ready immediately
    BibleQuizService.prewarmQuiz({
      testament,
      trackId: track.id,
      difficulty: track.defaultDifficulty,
      questionCount
    });

    // Automatically navigate & scroll smoothly to exactly the separated launch card spot
    setTimeout(() => {
      const targetY = parentCardYRef.current + configCardYRef.current;
      if (targetY > 0) {
        scrollViewRef.current?.scrollTo({
          y: Math.max(0, targetY - 16),
          animated: true,
        });
      }
    }, 120);
  };

  const handleSelectTestament = (tabId: TestamentScope) => {
    setTestament(tabId);
    setBookSearchQuery('');
    // If the currently selected book is not in the newly selected testament, reset to 'All'
    if (selectedBook !== 'All') {
      const allowed = BibleQuizService.getAvailableBooks(tabId);
      if (!allowed.includes(selectedBook)) {
        setSelectedBook('All');
      }
    }
  };

  const handleSelectBook = (bookName: string) => {
    setSelectedBook(bookName);

    // Pre-warm book quiz in the background so questions are ready immediately
    BibleQuizService.prewarmQuiz({
      testament,
      book: bookName !== 'All' ? bookName : undefined,
      difficulty,
      questionCount
    });

    // Automatically navigate & scroll smoothly to the separated launch card spot
    setTimeout(() => {
      const targetY = parentCardYRef.current + configCardYRef.current;
      if (targetY > 0) {
        scrollViewRef.current?.scrollTo({
          y: Math.max(0, targetY - 16),
          animated: true,
        });
      }
    }, 120);
  };

  const handleStartAutomaticQuiz = async () => {
    const selectedCategory = categories.find(c => c.id === selectedCategoryId);
    const selectedSubcategory = selectedCategory?.subcategories.find(s => s.id === selectedSubcategoryId);
    const selectedTrack = tracks.find(t => t.id === selectedTrackId);

    let effectiveTestament: TestamentScope = testament;
    if (generatorTab === 'categories' && selectedCategory) {
      effectiveTestament = selectedCategory.testamentScope;
    }

    const criteria: QuizFilterCriteria = {
      testament: effectiveTestament,
      book: generatorTab === 'books' && selectedBook !== 'All' ? selectedBook : undefined,
      difficulty,
      questionCount,
      categoryId: generatorTab === 'categories' ? selectedCategoryId : undefined,
      categoryTitle: selectedCategory?.title,
      subcategoryId: generatorTab === 'categories' && selectedSubcategoryId !== 'all' ? selectedSubcategoryId : undefined,
      subcategoryTitle: selectedSubcategory?.name,
      trackId: generatorTab === 'tracks' ? selectedTrackId : undefined
    };

    let titleForModal = 'Preparing Scripture Challenge';
    let topicForModal = undefined;
    if (generatorTab === 'tracks' && selectedTrack) {
      titleForModal = `${selectedTrack.title}`;
      topicForModal = `${selectedTrack.title} • ${questionCount} Questions`;
    } else if (generatorTab === 'books') {
      const bookName = selectedBook !== 'All' ? selectedBook : (testament === 'ot' ? 'Old Testament' : testament === 'nt' ? 'New Testament' : 'Entire Bible');
      titleForModal = `Book of ${bookName}`;
      topicForModal = `${bookName} • ${questionCount} Questions`;
    } else if (selectedCategory) {
      titleForModal = selectedSubcategory ? `${selectedSubcategory.name} Quiz` : `${selectedCategory.title} Quiz`;
      topicForModal = selectedCategory.title;
    }

    setLoadingTitle(titleForModal);
    setLoadingTopic(topicForModal);
    setLoading(true);

    try {
      const questions = await BibleQuizService.getAutomaticQuiz(criteria);
      if (!questions || questions.length === 0) {
        Alert.alert('Notice', 'No questions found for the selected criteria. Please broaden your selection.');
        return;
      }

      let quizTitle = 'Bible Knowledge Quiz';
      if (generatorTab === 'tracks' && selectedTrack) {
        quizTitle = selectedTrack.title;
      } else if (generatorTab === 'categories' && selectedCategory) {
        if (selectedSubcategory) {
          quizTitle = `${selectedSubcategory.name} Quiz`;
        } else {
          quizTitle = `${selectedCategory.title} Quiz`;
        }
      } else if (generatorTab === 'books' && selectedBook !== 'All') {
        quizTitle = `${selectedBook} Quiz`;
      }

      navigation.navigate('QuizPlay', {
        quizTitle,
        quizType: 'automatic',
        questions,
        filterCriteria: criteria
      });
    } catch (error) {
      Alert.alert('Error', 'Failed to generate quiz. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: isDark ? '#090d16' : '#f8fafc' }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      {/* Header Bar */}
      <View style={[styles.headerBar, { borderBottomColor: isDark ? '#1e293b' : '#e2e8f0' }]}>
        <TouchableOpacity 
          style={[styles.backBtn, { backgroundColor: isDark ? '#1e293b' : '#ede9fe' }]}
          onPress={handleHeaderBack}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <ChevronLeft size={22} color={isDark ? '#e2e8f0' : '#4338ca'} />
        </TouchableOpacity>

        <View style={styles.headerTitleWrap}>
          <Text style={[styles.headerTitle, { color: isDark ? '#f8fafc' : '#0f172a' }]}>Bible Quiz</Text>
          <Text style={[styles.headerSub, { color: isDark ? '#94a3b8' : '#64748b' }]}>Learn the Word • Test your Knowledge</Text>
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <TouchableOpacity 
            style={[styles.historyBtn, { backgroundColor: isDark ? '#1e293b' : '#fef3c7' }]}
            onPress={() => navigation.navigate('QuizLeaderboard')}
            accessibilityLabel="Quiz Leaderboard"
          >
            <Trophy size={19} color="#d97706" />
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.historyBtn, { backgroundColor: isDark ? '#1e293b' : '#ede9fe' }]}
            onPress={() => navigation.navigate('QuizHistory')}
            accessibilityLabel="Quiz History"
          >
            <History size={20} color={isDark ? '#cbd5e1' : '#4338ca'} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView 
        ref={scrollViewRef}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={isDark ? '#a78bfa' : '#6366f1'}
            colors={['#6366f1', '#a78bfa']}
          />
        }
      >
        {/* STATS STRIP */}
        <View style={[styles.statsStrip, { backgroundColor: isDark ? '#111827' : '#ffffff', borderColor: isDark ? '#1f2937' : '#e2e8f0' }]}>
          <View style={styles.statItem}>
            <View style={[styles.statIconBadge, { backgroundColor: '#fef3c7' }]}>
              <Flame size={16} color="#d97706" />
            </View>
            <View>
              <Text style={[styles.statValue, { color: isDark ? '#f8fafc' : '#0f172a' }]}>{stats?.streakDays || 0}</Text>
              <Text style={styles.statLabel}>Day Streak</Text>
            </View>
          </View>

          <View style={[styles.statDivider, { backgroundColor: isDark ? '#374151' : '#e2e8f0' }]} />

          <View style={styles.statItem}>
            <View style={[styles.statIconBadge, { backgroundColor: '#dcfce7' }]}>
              <CheckCircle2 size={16} color="#16a34a" />
            </View>
            <View>
              <Text style={[styles.statValue, { color: isDark ? '#f8fafc' : '#0f172a' }]}>{stats?.averageAccuracy || 0}%</Text>
              <Text style={styles.statLabel}>Accuracy</Text>
            </View>
          </View>

          <View style={[styles.statDivider, { backgroundColor: isDark ? '#374151' : '#e2e8f0' }]} />

          <View style={styles.statItem}>
            <View style={[styles.statIconBadge, { backgroundColor: '#ede9fe' }]}>
              <Award size={16} color="#7c3aed" />
            </View>
            <View>
              <Text style={[styles.statValue, { color: isDark ? '#f8fafc' : '#0f172a' }]}>{stats?.totalQuizzesTaken || 0}</Text>
              <Text style={styles.statLabel}>Completed</Text>
            </View>
          </View>
        </View>

        {/* POINTS MINI CARD WITH 3D COINS */}
        <TouchableOpacity
          style={[
            styles.pointsMiniCard,
            {
              backgroundColor: isDark ? '#111827' : '#ffffff',
              borderColor: isDark ? 'rgba(245, 158, 11, 0.35)' : '#fde68a',
            }
          ]}
          onPress={() => navigation.navigate('QuizLeaderboard')}
          activeOpacity={0.88}
        >
          <LinearGradient
            colors={isDark ? ['rgba(245, 158, 11, 0.12)', 'rgba(17, 24, 39, 0.6)'] : ['#fffdf0', '#fefce8']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.pointsMiniGradient}
          >
            <View style={styles.pointsCoinContainer}>
              <Coins3DIcon size={52} />
            </View>

            <View style={styles.pointsInfoWrap}>
              <View style={styles.pointsLabelRow}>
                <Text style={[styles.pointsLabelText, { color: isDark ? '#fbbf24' : '#d97706' }]}>
                  QUIZ POINTS
                </Text>
                <Text style={[styles.pointsInlineDot, { color: isDark ? '#64748b' : '#94a3b8' }]}>•</Text>
                <Text style={[styles.pointsInlineRule, { color: isDark ? '#fde68a' : '#b45309' }]}>
                  2 Points / Question
                </Text>
              </View>

              <View style={styles.pointsValueRow}>
                <Text style={[styles.pointsValueNumber, { color: isDark ? '#f8fafc' : '#0f172a' }]}>
                  {stats?.totalPoints ?? (stats?.totalCorrect || 0) * 2}
                </Text>
                <Text style={[styles.pointsValueSuffix, { color: isDark ? '#94a3b8' : '#64748b' }]}>
                  Points Earned
                </Text>
              </View>
            </View>

            <View style={[styles.pointsArrowBadge, { backgroundColor: isDark ? 'rgba(245, 158, 11, 0.15)' : '#fef3c7' }]}>
              <ChevronRight size={18} color={isDark ? '#fbbf24' : '#d97706'} />
            </View>
          </LinearGradient>
        </TouchableOpacity>

        {/* 1. HERO CARD: DAILY BIBLE CHALLENGE */}
        <LinearGradient
          colors={isDark ? ['#312e81', '#1e1b4b'] : ['#4338ca', '#312e81']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.dailyCard}
        >
          <View style={styles.dailyBadgeRow}>
            <View style={styles.dailyTag}>
              <Sparkles size={12} color="#fbbf24" style={{ marginRight: 4 }} />
              <Text style={styles.dailyTagText}>TODAY'S CHALLENGE</Text>
            </View>
            <View style={styles.dailyCountBadge}>
              <Text style={styles.dailyCountText}>5 Questions • Daily</Text>
            </View>
          </View>

          <Text style={styles.dailyTitle}>Daily Scripture Challenge</Text>
          <Text style={styles.dailyDesc}>
            Fresh curated questions for today to sharpen your Scripture understanding and keep your devotional streak active.
          </Text>

          {dailyCompleted ? (
            <View style={styles.dailyButtonRow}>
              <TouchableOpacity 
                style={[styles.dailyCta, styles.dailyCtaDisabled]}
                disabled={true}
                activeOpacity={1}
              >
                <CheckCircle2 size={16} color="#86efac" style={{ marginRight: 6 }} />
                <Text style={styles.dailyCtaDisabledText}>Completed Today ✓</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.leaderboardHeroBtn}
                onPress={() => navigation.navigate('QuizLeaderboard')}
                activeOpacity={0.85}
              >
                <Trophy size={16} color="#ffffff" style={{ marginRight: 6 }} />
                <Text style={styles.leaderboardHeroBtnText}>Leaderboard</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.dailyButtonRow}>
              <TouchableOpacity 
                style={styles.dailyCta}
                onPress={handleStartDailyChallenge}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#1e1b4b" size="small" />
                ) : (
                  <>
                    <Play size={16} color="#1e1b4b" fill="#1e1b4b" style={{ marginRight: 6 }} />
                    <Text style={styles.dailyCtaText}>Start Today's Quiz</Text>
                  </>
                )}
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.leaderboardPillBtn}
                onPress={() => navigation.navigate('QuizLeaderboard')}
                activeOpacity={0.85}
              >
                <Trophy size={16} color="#fbbf24" style={{ marginRight: 6 }} />
                <Text style={styles.leaderboardPillBtnText}>Leaderboard</Text>
              </TouchableOpacity>
            </View>
          )}
        </LinearGradient>

        {/* 2. AUTOMATIC QUIZ GENERATOR CARD */}
        <View 
          onLayout={(e) => {
            const y = e.nativeEvent.layout.y;
            if (y > 0) {
              setParentCardY(y);
              parentCardYRef.current = y;
            }
          }}
          style={[styles.card, { backgroundColor: isDark ? '#111827' : '#ffffff', borderColor: isDark ? '#1f2937' : '#e2e8f0' }]}
        >
          <View style={styles.cardHeader}>
            <View style={[styles.cardIconWrap, { backgroundColor: '#ede9fe' }]}>
              <BookOpen size={20} color="#6d28d9" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.cardTitle, { color: isDark ? '#f8fafc' : '#0f172a' }]}>
                Explore Bible Quizzes
              </Text>
              <Text style={[styles.cardSub, { color: isDark ? '#94a3b8' : '#64748b' }]}>
                Personalized quizzes by Category, Special Track, or Bible Book
              </Text>
            </View>
          </View>

          {/* Mode Selector (3 Tabs / Long Badge) */}
          <View style={[styles.modeTabsRow, { backgroundColor: isDark ? '#1e293b' : '#f1f5f9', borderColor: isDark ? '#334155' : '#e2e8f0' }]}>
            <TouchableOpacity
              style={[
                styles.modeTabBtn,
                generatorTab === 'categories' && styles.modeTabBtnActive
              ]}
              onPress={() => setGeneratorTab('categories')}
              activeOpacity={0.8}
            >
              <Text 
                style={[
                  styles.modeTabBtnText,
                  { color: isDark ? '#94a3b8' : '#64748b' },
                  generatorTab === 'categories' && styles.modeTabBtnTextActive
                ]}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.82}
              >
                15 Categories
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.modeTabBtn,
                generatorTab === 'tracks' && styles.modeTabBtnActive
              ]}
              onPress={() => setGeneratorTab('tracks')}
              activeOpacity={0.8}
            >
              <Text 
                style={[
                  styles.modeTabBtnText,
                  { color: isDark ? '#94a3b8' : '#64748b' },
                  generatorTab === 'tracks' && styles.modeTabBtnTextActive
                ]}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.82}
              >
                Special Tracks
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.modeTabBtn,
                generatorTab === 'books' && styles.modeTabBtnActive
              ]}
              onPress={() => setGeneratorTab('books')}
              activeOpacity={0.8}
            >
              <Text 
                style={[
                  styles.modeTabBtnText,
                  { color: isDark ? '#94a3b8' : '#64748b' },
                  generatorTab === 'books' && styles.modeTabBtnTextActive
                ]}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.82}
              >
                By Book
              </Text>
            </TouchableOpacity>
          </View>

          {/* TAB 1: 15 CATEGORIES IN COLUMN */}
          {generatorTab === 'categories' && (
            <View style={{ marginTop: 12 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <Text style={[styles.filterLabel, { color: isDark ? '#cbd5e1' : '#334155', marginBottom: 0 }]}>
                  Select Bible Category
                </Text>
                <Text style={{ fontSize: 11, color: isDark ? '#94a3b8' : '#64748b' }}>
                  {showAllCategories ? `${categories.length} Categories` : `Showing 5 of ${categories.length} Categories`} • Tap to Open
                </Text>
              </View>

              {/* Vertical Column of Category Cards matching Quiz Points Card */}
              {displayedCategories.map(cat => {
                const cardColor = UNIQUE_CATEGORY_COLORS[cat.id] || cat.color || '#4f46e5';

                return (
                  <TouchableOpacity
                    key={cat.id}
                    style={[
                      styles.pointsMiniCard,
                      {
                        marginBottom: 10,
                        backgroundColor: isDark ? '#111827' : '#ffffff',
                        borderColor: isDark ? `${cardColor}40` : `${cardColor}30`,
                        shadowColor: cardColor,
                      }
                    ]}
                    onPress={() => navigation.navigate('QuizCategoryDetail', { category: { ...cat, color: cardColor } })}
                    activeOpacity={0.88}
                  >
                    <LinearGradient
                      colors={
                        isDark 
                          ? [`${cardColor}18`, 'rgba(17, 24, 39, 0.65)']
                          : [`${cardColor}12`, '#ffffff']
                      }
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.pointsMiniGradient}
                    >
                      <View style={styles.pointsCoinContainer}>
                        <Category3DIcon iconName={cat.icon} size={48} color={cardColor} />
                      </View>

                      <View style={styles.pointsInfoWrap}>
                        <View style={styles.pointsLabelRow}>
                          <Text style={[styles.pointsLabelText, { color: cardColor }]}>
                            CATEGORY {cat.order < 10 ? `0${cat.order}` : cat.order}
                          </Text>
                          <Text style={[styles.pointsInlineDot, { color: isDark ? '#64748b' : '#94a3b8' }]}>•</Text>
                          <Text style={[styles.pointsInlineRule, { color: isDark ? '#94a3b8' : '#64748b' }]}>
                            {cat.subcategories.length} Topics
                          </Text>
                        </View>

                        <Text 
                          style={[
                            styles.quizMiniTitle, 
                            { color: isDark ? '#f8fafc' : '#0f172a' }
                          ]}
                          numberOfLines={2}
                        >
                          {cat.title}
                        </Text>
                      </View>

                      <View 
                        style={[
                          styles.pointsArrowBadge, 
                          { 
                            backgroundColor: isDark ? `${cardColor}18` : `${cardColor}12`
                          }
                        ]}
                      >
                        <ChevronRight size={18} color={cardColor} />
                      </View>
                    </LinearGradient>
                  </TouchableOpacity>
                );
              })}

              {/* See More / See Less Button for Categories */}
              {categories.length > 5 && (
                <TouchableOpacity
                  style={[
                    styles.seeMoreBtn,
                    {
                      backgroundColor: isDark ? '#1e293b' : '#f1f5f9',
                      borderColor: isDark ? 'rgba(124, 58, 237, 0.4)' : 'rgba(124, 58, 237, 0.25)',
                    }
                  ]}
                  onPress={() => setShowAllCategories(prev => !prev)}
                  activeOpacity={0.8}
                >
                  <Text 
                    style={[
                      styles.seeMoreBtnText,
                      { color: isDark ? '#c4b5fd' : '#6d28d9' }
                    ]}
                  >
                    {showAllCategories ? 'See Less' : `See More (${categories.length - 5} More Categories)`}
                  </Text>
                  {showAllCategories ? (
                    <ChevronUp size={16} color={isDark ? '#c4b5fd' : '#6d28d9'} />
                  ) : (
                    <ChevronDown size={16} color={isDark ? '#c4b5fd' : '#6d28d9'} />
                  )}
                </TouchableOpacity>
              )}
            </View>
          )}

          {/* TAB 2: SPECIAL QUIZ TRACKS */}
          {generatorTab === 'tracks' && (
            <View style={{ marginTop: 12 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <Text style={[styles.filterLabel, { color: isDark ? '#cbd5e1' : '#334155', marginBottom: 0 }]}>
                  Choose Special Track
                </Text>
                <Text style={{ fontSize: 11, color: isDark ? '#94a3b8' : '#64748b' }}>
                  {showAllTracks ? `${tracks.length} Tracks` : `Showing 5 of ${tracks.length} Tracks`} • Tap to Select
                </Text>
              </View>

              {/* Vertical Column of Track Cards matching Quiz Points Card */}
              {displayedTracks.map(track => {
                const isSelected = selectedTrackId === track.id;
                const cardColor = UNIQUE_TRACK_COLORS[track.id] || track.color || '#7c3aed';

                return (
                  <TouchableOpacity
                    key={track.id}
                    style={[
                      styles.pointsMiniCard,
                      {
                        marginBottom: 10,
                        backgroundColor: isDark ? '#111827' : '#ffffff',
                        borderColor: isSelected 
                          ? cardColor
                          : (isDark ? `${cardColor}40` : `${cardColor}30`),
                        borderWidth: isSelected ? 2 : 1.5,
                        shadowColor: cardColor,
                        shadowOpacity: isSelected ? 0.35 : (isDark ? 0.14 : 0.08),
                      }
                    ]}
                    onPress={() => handleSelectTrack(track)}
                    activeOpacity={0.88}
                  >
                    <LinearGradient
                      colors={
                        isSelected
                          ? (isDark 
                              ? [`${cardColor}28`, 'rgba(17, 24, 39, 0.75)'] 
                              : [`${cardColor}20`, '#ffffff'])
                          : (isDark 
                              ? [`${cardColor}18`, 'rgba(17, 24, 39, 0.65)'] 
                              : [`${cardColor}12`, '#ffffff'])
                      }
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.pointsMiniGradient}
                    >
                      <View style={styles.pointsCoinContainer}>
                        <Category3DIcon iconName={track.icon} size={48} color={cardColor} />
                      </View>

                      <View style={styles.pointsInfoWrap}>
                        <View style={styles.pointsLabelRow}>
                          <Text style={[styles.pointsLabelText, { color: cardColor }]}>
                            SPECIAL TRACK
                          </Text>
                          <Text style={[styles.pointsInlineDot, { color: isDark ? '#64748b' : '#94a3b8' }]}>•</Text>
                          <Text style={[styles.pointsInlineRule, { color: isDark ? '#94a3b8' : '#64748b' }]}>
                            {track.defaultDifficulty.toUpperCase()} LEVEL
                          </Text>
                        </View>

                        <Text 
                          style={[
                            styles.quizMiniTitle, 
                            { color: isDark ? '#f8fafc' : '#0f172a' }
                          ]}
                          numberOfLines={2}
                        >
                          {track.title}
                        </Text>
                      </View>

                      <View 
                        style={[
                          styles.pointsArrowBadge, 
                          { 
                            backgroundColor: isSelected 
                              ? cardColor 
                              : (isDark ? `${cardColor}18` : `${cardColor}12`)
                          }
                        ]}
                      >
                        {isSelected ? (
                          <Check size={18} color="#ffffff" strokeWidth={3} />
                        ) : (
                          <ChevronRight size={18} color={cardColor} />
                        )}
                      </View>
                    </LinearGradient>
                  </TouchableOpacity>
                );
              })}

              {/* See More / See Less Button for Tracks */}
              {tracks.length > 5 && (
                <TouchableOpacity
                  style={[
                    styles.seeMoreBtn,
                    {
                      backgroundColor: isDark ? '#1e293b' : '#f1f5f9',
                      borderColor: isDark ? 'rgba(124, 58, 237, 0.4)' : 'rgba(124, 58, 237, 0.25)',
                    }
                  ]}
                  onPress={() => setShowAllTracks(prev => !prev)}
                  activeOpacity={0.8}
                >
                  <Text 
                    style={[
                      styles.seeMoreBtnText,
                      { color: isDark ? '#c4b5fd' : '#6d28d9' }
                    ]}
                  >
                    {showAllTracks ? 'See Less' : `See More (${tracks.length - 5} More Tracks)`}
                  </Text>
                  {showAllTracks ? (
                    <ChevronUp size={16} color={isDark ? '#c4b5fd' : '#6d28d9'} />
                  ) : (
                    <ChevronDown size={16} color={isDark ? '#c4b5fd' : '#6d28d9'} />
                  )}
                </TouchableOpacity>
              )}
            </View>
          )}

          {/* TAB 3: BY BIBLE BOOK */}
          {generatorTab === 'books' && (
            <View style={{ marginTop: 12 }}>
              {/* Scripture Section */}
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <Text style={[styles.filterLabel, { color: isDark ? '#cbd5e1' : '#334155', marginBottom: 0 }]}>
                  Scripture Section
                </Text>
                <Text style={{ fontSize: 11, fontWeight: '700', color: isDark ? '#a78bfa' : '#6d28d9' }}>
                  {testament === 'all' ? '66 Books' : testament === 'ot' ? '39 OT Books' : '27 NT Books'}
                </Text>
              </View>

              <View style={styles.pillRow}>
                {[
                  { id: 'all', label: 'Entire Bible (66)' },
                  { id: 'ot', label: 'Old Testament (39)' },
                  { id: 'nt', label: 'New Testament (27)' }
                ].map(tab => (
                  <TouchableOpacity
                    key={tab.id}
                    style={[
                      styles.pill,
                      { backgroundColor: isDark ? '#1e293b' : '#f1f5f9' },
                      testament === tab.id && { backgroundColor: '#7c3aed' }
                    ]}
                    onPress={() => handleSelectTestament(tab.id as TestamentScope)}
                    activeOpacity={0.8}
                  >
                    <Text style={[
                      styles.pillText,
                      { color: isDark ? '#cbd5e1' : '#475569' },
                      testament === tab.id && { color: '#ffffff', fontWeight: 'bold' }
                    ]}>
                      {tab.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Choose Book Label Row */}
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <Text style={[styles.filterLabelSmall, { color: isDark ? '#cbd5e1' : '#475569', marginBottom: 0 }]}>
                  Choose Book ({availableBooks.length - (availableBooks.includes('All') ? 1 : 0)} Books)
                </Text>
                {bookSearchQuery.length > 0 && (
                  <TouchableOpacity 
                    onPress={() => setBookSearchQuery('')}
                    style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}
                  >
                    <Text style={{ fontSize: 12, fontWeight: '700', color: '#7c3aed' }}>Clear search</Text>
                  </TouchableOpacity>
                )}
              </View>

              {/* Big Size Search Box Below Choose Book */}
              <View 
                style={[
                  styles.bigBookSearchBox, 
                  { 
                    backgroundColor: isDark ? '#1e293b' : '#f8fafc', 
                    borderColor: isDark ? '#334155' : '#cbd5e1' 
                  }
                ]}
              >
                <Search size={18} color={isDark ? '#a78bfa' : '#7c3aed'} style={{ marginRight: 10 }} />
                <TextInput
                  style={[styles.bigBookSearchInput, { color: isDark ? '#f8fafc' : '#0f172a' }]}
                  placeholder={
                    testament === 'all' 
                      ? 'Search e.g. Genesis, Matthew...' 
                      : testament === 'ot' 
                        ? 'Search e.g. Genesis, Psalms...' 
                        : 'Search e.g. Matthew, Romans...'
                  }
                  placeholderTextColor={isDark ? '#64748b' : '#94a3b8'}
                  value={bookSearchQuery}
                  onChangeText={setBookSearchQuery}
                  autoCapitalize="words"
                  autoCorrect={false}
                />
                {bookSearchQuery.length > 0 && (
                  <TouchableOpacity 
                    onPress={() => setBookSearchQuery('')}
                    style={styles.bigSearchClearBtn}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <X size={16} color={isDark ? '#cbd5e1' : '#64748b'} />
                  </TouchableOpacity>
                )}
              </View>

              {/* Bible Book Horizontal Scroll */}
              <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={false} 
                contentContainerStyle={{ paddingVertical: 4, gap: 8 }}
                style={{ marginBottom: 10 }}
              >
                {availableBooks.map(b => {
                  const isSelected = selectedBook === b;
                  return (
                    <TouchableOpacity
                      key={b}
                      style={[
                        styles.smallPill,
                        { 
                          backgroundColor: isDark ? '#1e293b' : '#ffffff',
                          borderColor: isSelected ? '#7c3aed' : (isDark ? '#334155' : '#e2e8f0'),
                          borderWidth: isSelected ? 1.8 : 1,
                        },
                        isSelected && { backgroundColor: '#7c3aed' }
                      ]}
                      onPress={() => handleSelectBook(b)}
                      activeOpacity={0.8}
                    >
                      {b !== 'All' && (
                        <BookOpen 
                          size={12} 
                          color={isSelected ? '#ffffff' : (isDark ? '#a78bfa' : '#7c3aed')} 
                          style={{ marginRight: 5 }} 
                        />
                      )}
                      <Text style={[
                        styles.smallPillText,
                        { color: isDark ? '#94a3b8' : '#64748b' },
                        isSelected && { color: '#ffffff', fontWeight: 'bold' }
                      ]}>
                        {b === 'All' 
                          ? (testament === 'all' ? 'All (66 Books)' : testament === 'ot' ? 'All OT (39)' : 'All NT (27)') 
                          : b
                        }
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
          )}

          {/* SEPARATED SELECTED CARD & CONFIG LAUNCHER (Square with 4-side curves) */}
          {generatorTab !== 'categories' && (
            <View
              ref={configCardRef}
              onLayout={(e) => {
                const y = e.nativeEvent.layout.y;
                if (y > 0) {
                  setConfigCardY(y);
                  configCardYRef.current = y;
                }
              }}
              style={[
                styles.trackLaunchCard,
                {
                  backgroundColor: isDark ? '#111827' : '#ffffff',
                  borderColor: isDark 
                    ? (generatorTab === 'tracks' ? `${selectedTrackColor}60` : 'rgba(124, 58, 237, 0.45)')
                    : (generatorTab === 'tracks' ? `${selectedTrackColor}45` : 'rgba(124, 58, 237, 0.35)'),
                  shadowColor: generatorTab === 'tracks' ? selectedTrackColor : '#7c3aed',
                }
              ]}
            >
              {generatorTab === 'tracks' && selectedTrack && (
                <>
                  <View style={styles.selectedTrackHeaderRow}>
                    <View 
                      style={[
                        styles.selectedTrackIconBox, 
                        { 
                          backgroundColor: isDark ? `${selectedTrackColor}22` : `${selectedTrackColor}15`,
                          borderColor: isDark ? `${selectedTrackColor}45` : `${selectedTrackColor}30`,
                        }
                      ]}
                    >
                      <Category3DIcon iconName={selectedTrack.icon} size={42} color={selectedTrackColor} />
                    </View>

                    <View style={{ flex: 1, justifyContent: 'center' }}>
                      <View style={styles.selectedTrackMetaRow}>
                        <Text style={[styles.selectedTrackBadgeText, { color: selectedTrackColor }]} numberOfLines={1}>
                          SELECTED TRACK
                        </Text>
                        <View style={[styles.activePillBadge, { backgroundColor: selectedTrackColor }]}>
                          <Check size={11} color="#ffffff" strokeWidth={3} />
                          <Text style={styles.activePillBadgeText}>Active</Text>
                        </View>
                      </View>

                      <Text 
                        style={[
                          styles.selectedTrackTitleText, 
                          { color: isDark ? '#ffffff' : '#0f172a' }
                        ]}
                      >
                        {selectedTrack.title}
                      </Text>

                      <Text style={[styles.selectedTrackSubText, { color: isDark ? '#94a3b8' : '#64748b' }]}>
                        {selectedTrack.defaultDifficulty.toUpperCase()} Difficulty • Ready to play
                      </Text>
                    </View>
                  </View>

                  <View 
                    style={[
                      styles.trackLaunchDivider, 
                      { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)' }
                    ]} 
                  />
                </>
              )}

              {generatorTab === 'books' && (
                <>
                  <View style={styles.selectedTrackHeaderRow}>
                    <View 
                      style={[
                        styles.selectedTrackIconBox, 
                        { 
                          backgroundColor: isDark ? 'rgba(124, 58, 237, 0.22)' : 'rgba(124, 58, 237, 0.12)',
                          borderColor: isDark ? 'rgba(124, 58, 237, 0.45)' : 'rgba(124, 58, 237, 0.3)',
                        }
                      ]}
                    >
                      <BookOpen size={24} color="#7c3aed" />
                    </View>

                    <View style={{ flex: 1, justifyContent: 'center' }}>
                      <View style={styles.selectedTrackMetaRow}>
                        <Text style={[styles.selectedTrackBadgeText, { color: '#7c3aed' }]}>
                          CHOSEN SCRIPTURE
                        </Text>
                        <View style={[styles.activePillBadge, { backgroundColor: '#7c3aed' }]}>
                          <Check size={11} color="#ffffff" strokeWidth={3} />
                          <Text style={styles.activePillBadgeText}>Selected</Text>
                        </View>
                      </View>

                      <Text 
                        style={[
                          styles.selectedTrackTitleText, 
                          { color: isDark ? '#ffffff' : '#0f172a' }
                        ]}
                      >
                        {selectedBook === 'All' 
                          ? (testament === 'all' ? 'Complete Bible (66 Books)' : testament === 'ot' ? 'Old Testament (39 Books)' : 'New Testament (27 Books)') 
                          : `${selectedBook} Quiz`
                        }
                      </Text>

                      <Text style={[styles.selectedTrackSubText, { color: isDark ? '#94a3b8' : '#64748b' }]}>
                        {selectedBook === 'All'
                          ? (testament === 'all' ? 'All 66 Books across Old & New Testament' : testament === 'ot' ? '39 Books from Genesis to Malachi' : '27 Books from Matthew to Revelation')
                          : `${testament === 'all' ? 'Entire Bible' : testament === 'ot' ? 'Old Testament' : 'New Testament'} • Ready to play`
                        }
                      </Text>
                    </View>
                  </View>

                  <View 
                    style={[
                      styles.trackLaunchDivider, 
                      { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)' }
                    ]} 
                  />
                </>
              )}

              {/* Difficulty Level */}
              <Text style={[styles.filterLabel, { color: isDark ? '#cbd5e1' : '#334155', marginTop: 0 }]}>
                Difficulty Level
              </Text>
              <View style={styles.pillRow}>
                {[
                  { id: 'mixed', label: 'Mixed' },
                  { id: 'easy', label: 'Beginner' },
                  { id: 'medium', label: 'Intermediate' },
                  { id: 'hard', label: 'Advanced' }
                ].map(item => {
                  const isActive = difficulty === item.id;
                  const activeColor = generatorTab === 'tracks' ? selectedTrackColor : '#7c3aed';

                  return (
                    <TouchableOpacity
                      key={item.id}
                      style={[
                        styles.pill,
                        { backgroundColor: isDark ? '#1e293b' : '#f1f5f9' },
                        isActive && { backgroundColor: activeColor }
                      ]}
                      onPress={() => setDifficulty(item.id as any)}
                    >
                      <Text style={[
                        styles.pillText,
                        { color: isDark ? '#cbd5e1' : '#475569' },
                        isActive && { color: '#ffffff', fontWeight: 'bold' }
                      ]}>
                        {item.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Number of Questions */}
              <Text style={[styles.filterLabel, { color: isDark ? '#cbd5e1' : '#334155', marginTop: 12 }]}>
                Number of Questions
              </Text>
              <View style={styles.pillRow}>
                {[5, 10, 20].map(count => {
                  const isActive = questionCount === count;
                  const activeColor = generatorTab === 'tracks' ? selectedTrackColor : '#7c3aed';

                  return (
                    <TouchableOpacity
                      key={count}
                      style={[
                        styles.pill,
                        { backgroundColor: isDark ? '#1e293b' : '#f1f5f9', flex: 1, alignItems: 'center' },
                        isActive && { backgroundColor: activeColor }
                      ]}
                      onPress={() => setQuestionCount(count)}
                    >
                      <Text style={[
                        styles.pillText,
                        { color: isDark ? '#cbd5e1' : '#475569' },
                        isActive && { color: '#ffffff', fontWeight: 'bold' }
                      ]}>
                        {count} Questions
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Start Button */}
              <TouchableOpacity 
                style={[
                  styles.startQuizBtn, 
                  { 
                    backgroundColor: generatorTab === 'tracks' ? selectedTrackColor : '#7c3aed',
                    shadowColor: generatorTab === 'tracks' ? selectedTrackColor : '#7c3aed',
                    marginTop: 16,
                  }
                ]}
                onPress={handleStartAutomaticQuiz}
                disabled={loading}
                activeOpacity={0.85}
              >
                {loading ? (
                  <ActivityIndicator color="#ffffff" size="small" />
                ) : (
                  <>
                    <Play size={16} color="#ffffff" fill="#ffffff" style={{ marginRight: 8 }} />
                    <Text style={styles.startQuizBtnText} numberOfLines={1}>
                      {generatorTab === 'tracks' 
                        ? `Start Track Quiz • ${questionCount} Questions`
                        : `Start Bible Quiz • ${questionCount} Questions`
                      }
                    </Text>
                    <ChevronRight size={18} color="#ffffff" style={{ marginLeft: 6 }} />
                  </>
                )}
              </TouchableOpacity>

              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 10 }}>
                <Text style={{ fontSize: 12, color: isDark ? '#94a3b8' : '#64748b' }}>
                  🪙 Earn <Text style={{ fontWeight: '700', color: isDark ? '#fbbf24' : '#d97706' }}>2 Points</Text> per question
                </Text>
              </View>
            </View>
          )}
        </View>

        {/* 3. ADMIN PREPARED QUIZ CARD */}
        <View 
          style={[
            styles.card, 
            { 
              backgroundColor: isDark ? '#111827' : '#ffffff', 
              borderColor: showAdminQuizzes ? '#f59e0b' : (isDark ? '#1f2937' : '#e2e8f0'),
              borderWidth: showAdminQuizzes ? 1.8 : 1
            }
          ]}
        >
          {/* Clickable Header */}
          <TouchableOpacity 
            activeOpacity={0.85}
            onPress={() => setShowAdminQuizzes(prev => !prev)}
            style={styles.adminCardHeaderBtn}
          >
            <View style={[styles.cardHeader, !showAdminQuizzes && { marginBottom: 0 }]}>
              <View style={[styles.cardIconWrap, { backgroundColor: isDark ? 'rgba(245, 158, 11, 0.15)' : '#fef3c7' }]}>
                <BookmarkCheck size={20} color={isDark ? '#fbbf24' : '#b45309'} />
              </View>
              <View style={{ flex: 1, justifyContent: 'center' }}>
                <Text 
                  style={[styles.cardTitle, { color: isDark ? '#f8fafc' : '#0f172a', fontSize: 16 }]} 
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.85}
                >
                  Admin-Prepared Quizzes
                </Text>
                <Text 
                  style={[styles.cardSub, { color: isDark ? '#94a3b8' : '#64748b', marginTop: 2 }]}
                  numberOfLines={1}
                >
                  {showAdminQuizzes 
                    ? 'Official church competitions' 
                    : 'Special church competitions'
                  }
                </Text>
                <View style={styles.adminBadgeRow}>
                  <View style={[
                    styles.churchQuizBadge, 
                    { 
                      backgroundColor: isDark ? 'rgba(245, 158, 11, 0.18)' : '#fef3c7', 
                      borderColor: isDark ? 'rgba(245, 158, 11, 0.35)' : '#fde68a' 
                    }
                  ]}>
                    <BookmarkCheck size={11} color={isDark ? '#fbbf24' : '#b45309'} style={{ marginRight: 4 }} />
                    <Text style={[styles.churchQuizBadgeText, { color: isDark ? '#fbbf24' : '#b45309' }]}>
                      {adminQuizzes.length > 0 
                        ? `${adminQuizzes.length} Quiz${adminQuizzes.length > 1 ? 'zes' : ''} Available` 
                        : 'Church Quizzes'}
                    </Text>
                  </View>
                </View>
              </View>
              <View style={[
                styles.adminChevronWrap,
                { backgroundColor: isDark ? '#1e293b' : '#f8fafc', borderColor: isDark ? '#334155' : '#e2e8f0' }
              ]}>
                {showAdminQuizzes ? (
                  <ChevronUp size={18} color="#f59e0b" />
                ) : (
                  <ChevronDown size={18} color={isDark ? '#94a3b8' : '#64748b'} />
                )}
              </View>
            </View>
          </TouchableOpacity>

          {/* Expanded List of Admin-Prepared Quizzes */}
          {showAdminQuizzes && (
            <View style={styles.adminQuizzesExpandedContainer}>
              <View style={[styles.trackLaunchDivider, { marginVertical: 12, backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)' }]} />

              {adminQuizzesLoading && adminQuizzes.length === 0 ? (
                <View style={{ paddingVertical: 20, alignItems: 'center' }}>
                  <ActivityIndicator size="small" color="#f59e0b" />
                  <Text style={{ marginTop: 8, fontSize: 12, color: isDark ? '#94a3b8' : '#64748b' }}>
                    Loading church competitions...
                  </Text>
                </View>
              ) : adminQuizzes.length === 0 ? (
                <View style={[styles.adminNoticeBox, { backgroundColor: isDark ? '#172554' : '#eff6ff', borderColor: isDark ? '#1e3a8a' : '#bfdbfe' }]}>
                  <Text style={[styles.adminNoticeTitle, { color: isDark ? '#93c5fd' : '#1d4ed8' }]}>
                    No Quizzes Published Yet
                  </Text>
                  <Text style={[styles.adminNoticeText, { color: isDark ? '#bfdbfe' : '#3b82f6' }]}>
                    Check back soon! Your church administrators will publish new competitions and study quizzes here.
                  </Text>
                </View>
              ) : (
                <View style={{ gap: 12 }}>
                  {adminQuizzes.map((quiz, index) => {
                    const qCount = quiz.questionCount || (quiz.questions ? quiz.questions.length : 0) || 5;
                    const duration = quiz.durationMinutes || 10;
                    const isLive = quiz.isLive === true;
                    const completion = getQuizCompletion(quiz);
                    const isCompleted = !!completion;
                    return (
                      <View
                        key={quiz.id || index}
                        style={[
                          styles.adminQuizItemCard,
                          {
                            backgroundColor: isDark ? '#1a2336' : '#f8fafc',
                            borderColor: isCompleted 
                              ? (isDark ? 'rgba(16, 185, 129, 0.4)' : '#a7f3d0') 
                              : (isDark ? '#2a3b5c' : '#e2e8f0'),
                            borderWidth: isCompleted ? 1.5 : 1,
                          }
                        ]}
                      >
                        {/* Top Tag Row */}
                        <View style={styles.adminQuizItemHeader}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap', flex: 1 }}>
                            <View style={styles.adminQuizCategoryPill}>
                              <Sparkles size={11} color="#f59e0b" />
                              <Text style={styles.adminQuizCategoryTxt}>
                                {quiz.category || 'Church Competition'}
                              </Text>
                            </View>

                            {/* Completed OR Live or Scheduled Status Pill */}
                            {isCompleted ? (
                              <View style={[
                                styles.adminQuizStatusPill, 
                                { backgroundColor: 'rgba(16, 185, 129, 0.15)', borderColor: 'rgba(16, 185, 129, 0.35)', borderWidth: 1 }
                              ]}>
                                <CheckCircle2 size={11} color="#10b981" />
                                <Text style={[styles.adminQuizStatusTxt, { color: '#10b981' }]}>
                                  COMPLETED {completion?.percentage}% ✅
                                </Text>
                              </View>
                            ) : (
                              <View style={[
                                styles.adminQuizStatusPill, 
                                { backgroundColor: isLive ? 'rgba(239, 68, 68, 0.15)' : 'rgba(59, 130, 246, 0.15)' }
                              ]}>
                                <View style={[
                                  styles.adminQuizStatusDot, 
                                  { backgroundColor: isLive ? '#ef4444' : '#3b82f6' }
                                ]} />
                                <Text style={[
                                  styles.adminQuizStatusTxt, 
                                  { color: isLive ? '#ef4444' : '#3b82f6' }
                                ]}>
                                  {isLive ? 'LIVE NOW 🔴' : 'SCHEDULED'}
                                </Text>
                              </View>
                            )}
                          </View>

                          <View style={styles.adminQuizAudiencePill}>
                            <Text style={styles.adminQuizAudienceTxt}>
                              {quiz.audience || 'All Members'}
                            </Text>
                          </View>
                        </View>

                        {/* Title */}
                        <Text style={[styles.adminQuizItemTitle, { color: isDark ? '#ffffff' : '#0f172a' }]}>
                          {quiz.title}
                        </Text>

                        {/* Completed Score & Review Banner */}
                        {isCompleted && completion && (
                          <View style={[
                            styles.completedResultBanner, 
                            { 
                              backgroundColor: isDark ? 'rgba(16, 185, 129, 0.10)' : '#ecfdf5', 
                              borderColor: isDark ? 'rgba(16, 185, 129, 0.25)' : '#a7f3d0' 
                            }
                          ]}>
                            <View style={styles.completedResultLeft}>
                              <Trophy size={17} color={completion.percentage >= (quiz.passingScore || 70) ? '#f59e0b' : '#10b981'} />
                              <View style={{ flex: 1 }}>
                                <Text style={[styles.completedResultTitle, { color: isDark ? '#ffffff' : '#065f46' }]}>
                                  Your Score: <Text style={{ fontWeight: '800', color: completion.percentage >= (quiz.passingScore || 70) ? '#10b981' : '#f59e0b' }}>{completion.percentage}%</Text> ({completion.correctCount}/{completion.totalQuestions})
                                </Text>
                                <Text style={[styles.completedResultSub, { color: isDark ? '#94a3b8' : '#047857' }]}>
                                  {completion.percentage >= (quiz.passingScore || 70) ? 'Passed with Distinction 🏆' : 'Quiz Completed 📖'} · Tap below to review answers
                                </Text>
                              </View>
                            </View>
                          </View>
                        )}

                        {/* Scheduled Notice if quiz is scheduled but not yet live and not yet completed */}
                        {!isCompleted && !isLive && (
                          <View style={[styles.scheduledNoticeBanner, { backgroundColor: isDark ? 'rgba(59, 130, 246, 0.12)' : '#eff6ff', borderColor: isDark ? 'rgba(59, 130, 246, 0.25)' : '#bfdbfe' }]}>
                            <Clock size={13} color="#3b82f6" />
                            <Text style={[styles.scheduledNoticeTxt, { color: isDark ? '#93c5fd' : '#1d4ed8' }]}>
                              Starts: {quiz.scheduledDateStr || 'Scheduled by Pastor'} (Waiting for Host to start)
                            </Text>
                          </View>
                        )}

                        {/* Meta info row */}
                        <View style={styles.adminQuizMetaRow}>
                          <View style={styles.adminQuizMetaBadge}>
                            <Layers size={13} color="#f59e0b" />
                            <Text style={[styles.adminQuizMetaTxt, { color: isDark ? '#cbd5e1' : '#475569' }]}>
                              {qCount} Questions
                            </Text>
                          </View>

                          <View style={styles.adminQuizMetaBadge}>
                            <Clock size={13} color="#f59e0b" />
                            <Text style={[styles.adminQuizMetaTxt, { color: isDark ? '#cbd5e1' : '#475569' }]}>
                              {duration} Mins
                            </Text>
                          </View>

                          <View style={styles.adminQuizMetaBadge}>
                            <Award size={13} color="#f59e0b" />
                            <Text style={[styles.adminQuizMetaTxt, { color: isDark ? '#cbd5e1' : '#475569' }]}>
                              Pass {quiz.passingScore || 70}%
                            </Text>
                          </View>
                        </View>

                        {/* Action Buttons: If Completed -> View Result & Retake; If Live -> Join Live Quiz; If Scheduled -> Waiting */}
                        {isCompleted ? (
                          <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
                            <TouchableOpacity
                              style={[styles.adminQuizStartBtn, { flex: 1 }]}
                              onPress={() => {
                                if (completion) {
                                  navigation.navigate('QuizResult', { attempt: completion });
                                }
                              }}
                              activeOpacity={0.85}
                            >
                              <LinearGradient
                                colors={['#4f46e5', '#4338ca']}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 0 }}
                                style={styles.adminQuizStartGradient}
                              >
                                <Trophy size={15} color="#fbbf24" />
                                <Text style={styles.adminQuizStartTxt}>View Result & Answers</Text>
                                <ChevronRight size={16} color="#ffffff" />
                              </LinearGradient>
                            </TouchableOpacity>

                            <TouchableOpacity
                              style={[
                                styles.adminQuizRetakeBtn,
                                { 
                                  borderColor: isDark ? '#334155' : '#cbd5e1',
                                  backgroundColor: isDark ? '#1e293b' : '#f1f5f9'
                                }
                              ]}
                              onPress={() => {
                                Alert.alert(
                                  'Retake Quiz?',
                                  `You already scored ${completion?.percentage}%. Would you like to retake this quiz for practice?`,
                                  [
                                    { text: 'Cancel', style: 'cancel' },
                                    { text: 'Retake', onPress: () => handleStartAdminQuiz(quiz) }
                                  ]
                                );
                              }}
                              activeOpacity={0.85}
                            >
                              <RotateCcw size={16} color={isDark ? '#cbd5e1' : '#475569'} />
                            </TouchableOpacity>
                          </View>
                        ) : isLive ? (
                          <TouchableOpacity
                            style={styles.adminQuizStartBtn}
                            onPress={() => handleStartAdminQuiz(quiz)}
                            activeOpacity={0.85}
                          >
                            <LinearGradient
                              colors={['#10b981', '#059669']}
                              start={{ x: 0, y: 0 }}
                              end={{ x: 1, y: 0 }}
                              style={styles.adminQuizStartGradient}
                            >
                              <Play size={15} color="#ffffff" fill="#ffffff" />
                              <Text style={styles.adminQuizStartTxt}>Join Live Quiz</Text>
                              <ChevronRight size={16} color="#ffffff" />
                            </LinearGradient>
                          </TouchableOpacity>
                        ) : (
                          <TouchableOpacity
                            style={styles.adminQuizStartBtn}
                            onPress={() => {
                              Alert.alert(
                                'Waiting for Host to Start ⏳',
                                `"${quiz.title}" has been prepared by Pastor.\n\nPastor will start the quiz shortly. You will receive an immediate push notification the moment it goes LIVE!`,
                                [{ text: 'Got It', style: 'default' }]
                              );
                            }}
                            activeOpacity={0.85}
                          >
                            <View style={[styles.adminQuizStartGradient, { backgroundColor: isDark ? '#1e293b' : '#f1f5f9' }]}>
                              <Clock size={15} color="#f59e0b" />
                              <Text style={[styles.adminQuizStartTxt, { color: isDark ? '#fcd34d' : '#b45309', fontWeight: '800' }]}>
                                {quiz.scheduledDateStr ? `${quiz.scheduledDateStr} · Waiting to Start ⏳` : 'Waiting for Pastor to Start ⏳'}
                              </Text>
                            </View>
                          </TouchableOpacity>
                        )}
                      </View>
                    );
                  })}
                </View>
              )}
            </View>
          )}
        </View>

        {/* VIEW FULL HISTORY LINK */}
        <TouchableOpacity 
          style={[styles.historyRowCard, { backgroundColor: isDark ? '#111827' : '#ffffff', borderColor: isDark ? '#1f2937' : '#e2e8f0' }]}
          onPress={() => navigation.navigate('QuizHistory')}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <View style={[styles.statIconBadge, { backgroundColor: '#ede9fe', marginRight: 12 }]}>
              <History size={18} color="#7c3aed" />
            </View>
            <View>
              <Text style={[styles.historyRowTitle, { color: isDark ? '#f8fafc' : '#0f172a' }]}>My Quiz History & Verse Review</Text>
              <Text style={[styles.historyRowSub, { color: isDark ? '#94a3b8' : '#64748b' }]}>Review questions, scriptures, and past scores</Text>
            </View>
          </View>
          <ChevronRight size={20} color={isDark ? '#64748b' : '#94a3b8'} />
        </TouchableOpacity>

      </ScrollView>

      {/* AI Quiz Generation Modal */}
      <AiQuizLoadingModal 
        visible={loading}
        title={loadingTitle}
        topic={loadingTopic}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
    marginHorizontal: 12
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800'
  },
  headerSub: {
    fontSize: 12,
    marginTop: 2
  },
  historyBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center'
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40
  },
  statsStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 16
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    gap: 8
  },
  statIconBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center'
  },
  statValue: {
    fontSize: 16,
    fontWeight: '800'
  },
  statLabel: {
    fontSize: 11,
    color: '#64748b'
  },
  statDivider: {
    width: 1,
    height: 28
  },
  dailyCard: {
    padding: 20,
    borderRadius: 20,
    marginBottom: 16,
    shadowColor: '#4338ca',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 4
  },
  dailyBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12
  },
  dailyTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(251, 191, 36, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12
  },
  dailyTagText: {
    color: '#fbbf24',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5
  },
  dailyCountBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12
  },
  dailyCountText: {
    color: '#e0e7ff',
    fontSize: 11,
    fontWeight: '600'
  },
  dailyTitle: {
    color: '#ffffff',
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 6
  },
  dailyDesc: {
    color: '#c7d2fe',
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 16
  },
  dailyCta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fbbf24',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 24
  },
  dailyCtaText: {
    color: '#1e1b4b',
    fontSize: 14,
    fontWeight: '800'
  },
  dailyButtonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 10
  },
  dailyCtaDisabled: {
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(74, 222, 128, 0.35)'
  },
  dailyCtaDisabledText: {
    color: '#86efac',
    fontSize: 14,
    fontWeight: '800'
  },
  leaderboardHeroBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2563eb',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 24,
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 3
  },
  leaderboardHeroBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '800'
  },
  leaderboardPillBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(251, 191, 36, 0.4)',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 24
  },
  leaderboardPillBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700'
  },
  pointsMiniCard: {
    borderRadius: 18,
    borderWidth: 1.5,
    overflow: 'hidden',
    marginBottom: 16,
    shadowColor: '#d97706',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 3
  },
  pointsMiniGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    gap: 12
  },
  pointsCoinContainer: {
    width: 54,
    height: 54,
    justifyContent: 'center',
    alignItems: 'center'
  },
  pointsInfoWrap: {
    flex: 1,
    justifyContent: 'center'
  },
  pointsLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 3
  },
  pointsLabelText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5
  },
  pointsInlineDot: {
    fontSize: 10,
    fontWeight: '700'
  },
  pointsInlineRule: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.2
  },
  pointsValueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6
  },
  pointsValueNumber: {
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: 0.2
  },
  pointsValueSuffix: {
    fontSize: 12,
    fontWeight: '600'
  },
  pointsArrowBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center'
  },
  card: {
    padding: 18,
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 12
  },
  cardIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 21,
    justifyContent: 'center',
    alignItems: 'center'
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '800'
  },
  cardSub: {
    fontSize: 12,
    marginTop: 2
  },
  filterLabel: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 8,
    marginTop: 6
  },
  filterLabelSmall: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 6
  },
  pillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 14
  },
  pill: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20
  },
  pillText: {
    fontSize: 13,
    fontWeight: '500'
  },
  advancedToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    marginBottom: 10
  },
  advancedToggleText: {
    color: '#7c3aed',
    fontSize: 13,
    fontWeight: '600'
  },
  advancedBox: {
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 14
  },
  smallPill: {
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  smallPillText: {
    fontSize: 12.5,
    fontWeight: '600',
  },
  bigBookSearchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    height: 48,
    borderRadius: 14,
    borderWidth: 1.2,
    marginBottom: 12,
  },
  bigBookSearchInput: {
    flex: 1,
    fontSize: 13.5,
    fontWeight: '500',
    paddingVertical: 0,
    height: '100%',
  },
  bigSearchClearBtn: {
    padding: 6,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  startQuizBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 24,
    minHeight: 52,
    marginTop: 6
  },
  startQuizBtnText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: 'bold',
    textAlign: 'center',
    flexShrink: 1,
  },
  comingSoonBadge: {
    backgroundColor: '#fef3c7',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    marginLeft: 8
  },
  comingSoonText: {
    color: '#b45309',
    fontSize: 10,
    fontWeight: '700'
  },
  adminNoticeBox: {
    padding: 12,
    borderRadius: 14,
    borderWidth: 1
  },
  adminNoticeTitle: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 4
  },
  adminNoticeText: {
    fontSize: 12,
    lineHeight: 18
  },
  historyRowCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 16
  },
  historyRowTitle: {
    fontSize: 14,
    fontWeight: '700'
  },
  historyRowSub: {
    fontSize: 12,
    marginTop: 2
  },
  cardHeaderTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8
  },
  cardHeaderBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center'
  },
  cardHeaderBadgeText: {
    fontSize: 10.5,
    fontWeight: '800',
    textAlign: 'center',
    includeFontPadding: false
  },
  advancedBadge: {
    backgroundColor: '#ede9fe',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8
  },
  advancedBadgeText: {
    color: '#6d28d9',
    fontSize: 10,
    fontWeight: '800'
  },
  modeTabsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 13,
    padding: 3.5,
    marginTop: 12,
    marginBottom: 6,
    borderWidth: 1,
    minHeight: 44
  },
  modeTabBtn: {
    flex: 1,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    paddingHorizontal: 4
  },
  modeTabBtnActive: {
    backgroundColor: '#7c3aed',
    shadowColor: '#7c3aed',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.22,
    shadowRadius: 3,
    elevation: 2.5
  },
  modeTabBtnText: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
    textAlignVertical: 'center',
    includeFontPadding: false,
    letterSpacing: 0.1
  },
  modeTabBtnTextActive: {
    color: '#ffffff',
    fontWeight: '700'
  },
  categoryCard: {
    width: 140,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'flex-start'
  },
  categoryIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8
  },
  categoryCardTitle: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 2
  },
  categoryCardCount: {
    fontSize: 11
  },
  selectedCategoryBox: {
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    marginTop: 6
  },
  activeCategoryIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center'
  },
  selectedCategoryHeaderTitle: {
    fontSize: 14,
    fontWeight: '800'
  },
  selectedCategoryHeaderSub: {
    fontSize: 11,
    marginTop: 1
  },
  subcategoryPickerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    marginTop: 8
  },
  subcategoryPickerLabel: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5
  },
  subcategoryPickerValue: {
    fontSize: 13,
    fontWeight: '700',
    marginTop: 1
  },
  subQuickChip: {
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 12,
    marginRight: 6,
    borderWidth: 1,
    borderColor: '#e2e8f0'
  },
  subQuickChipText: {
    fontSize: 11
  },
  trackCard: {
    width: 200,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1
  },
  trackIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center'
  },
  trackDiffBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6
  },
  trackDiffBadgeText: {
    fontSize: 9,
    fontWeight: '800'
  },
  trackCardTitle: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 2
  },
  trackCardSub: {
    fontSize: 11,
    marginBottom: 6
  },
  trackCardDesc: {
    fontSize: 11,
    lineHeight: 15
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'flex-end'
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: '80%'
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0'
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '800'
  },
  modalSub: {
    fontSize: 12,
    marginTop: 2
  },
  modalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center'
  },
  subItemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 8
  },
  subItemTitle: {
    fontSize: 13,
    fontWeight: '700'
  },
  subItemDesc: {
    fontSize: 11,
    marginTop: 2,
    lineHeight: 15
  },
  topicTagsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    marginTop: 6
  },
  topicTagBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6
  },
  topicTagText: {
    fontSize: 10,
    fontWeight: '500'
  },
  categoryColumnCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 8
  },
  categoryIconBox: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center'
  },
  catColumnTitle: {
    fontSize: 14,
    fontWeight: '800'
  },
  catColumnSub: {
    fontSize: 12,
    marginTop: 2,
    lineHeight: 16
  },
  catColumnMeta: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 3
  },
  scopeBadgeMini: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6
  },
  scopeBadgeMiniText: {
    fontSize: 9,
    fontWeight: '800'
  },
  quizMiniCard: {
    borderRadius: 18,
    borderWidth: 1.5,
    overflow: 'hidden',
    marginBottom: 10,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.22,
    shadowRadius: 10,
    elevation: 3.5,
  },
  quizMiniGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 13,
    paddingHorizontal: 14,
    gap: 12,
  },
  quizMiniIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 15,
    borderWidth: 1.2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quizMiniInfoWrap: {
    flex: 1,
    justifyContent: 'center',
  },
  quizMiniTitle: {
    fontSize: 14.5,
    fontWeight: '800',
    lineHeight: 20,
    letterSpacing: 0.15,
  },
  quizMiniArrowBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  trackLaunchCard: {
    borderRadius: 20,
    borderWidth: 1.8,
    padding: 16,
    marginTop: 18,
    marginBottom: 8,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.16,
    shadowRadius: 10,
    elevation: 4,
  },
  selectedTrackHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  selectedTrackIconBox: {
    width: 48,
    height: 48,
    borderRadius: 14,
    borderWidth: 1.2,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 2,
  },
  selectedTrackMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 6,
    marginBottom: 4,
  },
  activePillBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3.5,
    borderRadius: 10,
  },
  activePillBadgeText: {
    color: '#ffffff',
    fontSize: 10.5,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  selectedTrackBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  selectedTrackTitleText: {
    fontSize: 15.5,
    fontWeight: '800',
    lineHeight: 22,
    marginBottom: 2,
  },
  selectedTrackSubText: {
    fontSize: 11.5,
    fontWeight: '600',
  },
  trackLaunchDivider: {
    height: 1.2,
    marginVertical: 14,
    width: '100%',
  },
  readyTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 12,
  },
  readyTagText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '800',
  },
  seeMoreBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 14,
    borderWidth: 1.5,
    marginTop: 4,
    marginBottom: 14,
    gap: 8,
  },
  seeMoreBtnText: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  adminCardHeaderBtn: {
    width: '100%',
  },
  adminBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
  },
  churchQuizBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 7,
    borderWidth: 1,
  },
  churchQuizBadgeText: {
    fontSize: 10.5,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  adminChevronWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 10,
    alignSelf: 'center',
  },
  adminQuizzesExpandedContainer: {
    marginTop: 2,
  },
  adminQuizItemCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    marginBottom: 4,
  },
  adminQuizItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  adminQuizCategoryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3.5,
    borderRadius: 6,
  },
  adminQuizCategoryTxt: {
    color: '#f59e0b',
    fontSize: 11,
    fontWeight: '700',
  },
  adminQuizAudiencePill: {
    backgroundColor: 'rgba(99, 102, 241, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3.5,
    borderRadius: 6,
  },
  adminQuizAudienceTxt: {
    color: '#818cf8',
    fontSize: 10.5,
    fontWeight: '700',
  },
  adminQuizItemTitle: {
    fontSize: 15.5,
    fontWeight: '800',
    marginBottom: 10,
    lineHeight: 21,
    letterSpacing: 0.15,
  },
  adminQuizMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 14,
    flexWrap: 'wrap',
  },
  adminQuizMetaBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  adminQuizMetaTxt: {
    fontSize: 11.5,
    fontWeight: '600',
  },
  adminQuizStartBtn: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  adminQuizStartGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 11,
  },
  adminQuizStartTxt: {
    color: '#ffffff',
    fontSize: 13.5,
    fontWeight: '800',
  },
  adminQuizStatusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  adminQuizStatusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  adminQuizStatusTxt: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  scheduledNoticeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 10,
  },
  scheduledNoticeTxt: {
    fontSize: 11.5,
    fontWeight: '600',
    flex: 1,
  },
  completedResultBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 12,
  },
  completedResultLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  completedResultTitle: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  completedResultSub: {
    fontSize: 11,
    fontWeight: '500',
    marginTop: 2,
  },
  adminQuizRetakeBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  }
});
