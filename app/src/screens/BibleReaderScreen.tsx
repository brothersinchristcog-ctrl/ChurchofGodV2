import React, { useState } from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  TouchableOpacity, 
  ScrollView, 
  Dimensions,
  Alert,
  Modal,
  FlatList,
  Platform,
  StatusBar
} from 'react-native';
import { ChevronLeft, ArrowLeft, Share2, BookMarked, Settings, Search, CheckCircle2 } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Svg, { Defs, LinearGradient, Stop, Rect } from 'react-native-svg';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import firestore from '@react-native-firebase/firestore';

const { width } = Dimensions.get('window');

const BOOK_MAP: any = {
  // OT
  'Genesis': 1, 'Exodus': 2, 'Leviticus': 3, 'Numbers': 4, 'Deuteronomy': 5,
  'Joshua': 6, 'Judges': 7, 'Ruth': 8, '1 Samuel': 9, '2 Samuel': 10,
  '1 Kings': 11, '2 Kings': 12, '1 Chronicles': 13, '2 Chronicles': 14, 'Ezra': 15,
  'Nehemiah': 16, 'Esther': 17, 'Job': 18, 'Psalms': 19, 'Proverbs': 20,
  'Ecclesiastes': 21, 'Song of Solomon': 22, 'Isaiah': 23, 'Jeremiah': 24, 'Lamentations': 25,
  'Ezekiel': 26, 'Daniel': 27, 'Hosea': 28, 'Joel': 29, 'Amos': 30,
  'Obadiah': 31, 'Jonah': 32, 'Micah': 33, 'Nahum': 34, 'Habakkuk': 35,
  'Zephaniah': 36, 'Haggai': 37, 'Zechariah': 38, 'Malachi': 39,
  // NT
  'Matthew': 40, 'Mark': 41, 'Luke': 42, 'John': 43, 'Acts': 44,
  'Romans': 45, '1 Corinthians': 46, '2 Corinthians': 47, 'Galatians': 48, 'Ephesians': 49,
  'Philippians': 50, 'Colossians': 51, '1 Thessalonians': 52, '2 Thessalonians': 53, '1 Timothy': 54,
  '2 Timothy': 55, 'Titus': 56, 'Philemon': 57, 'Hebrews': 58, 'James': 59,
  '1 Peter': 60, '2 Peter': 61, '1 John': 62, '2 John': 63, '3 John': 64,
  'Jude': 65, 'Revelation': 66,
  // Telugu
  'ఆదికాండము': 1, 'నిర్గమకాండము': 2, 'లేవీయకాండము': 3, 'సంఖ్యాకాండము': 4, 'ద్వితీయోపదేశకాండము': 5,
  'యెహోషువ': 6, 'న్యాయాధిపతులు': 7, 'రూతు': 8, '1 సమూయేలు': 9, '2 సమూయేలు': 10,
  '1 రాజులు': 11, '2 రాజులు': 12, '1 దినవృత్తాంతములు': 13, '2 దినవృత్తాంతములు': 14, 'ఎజ్రా': 15,
  'నెహెమ్యా': 16, 'ఎస్తేరు': 17, 'యోబు': 18, 'కీర్తనల గ్రంథము': 19, 'సామెతలు': 20,
  'ప్రసంగి': 21, 'పరమగీతము': 22, 'యెషయా': 23, 'యిర్మియా': 24, 'విలాపవాక్యములు': 25,
  'యెహెజ్కేలు': 26, 'దానియేలు': 27, 'హోషేయ': 28, 'యోవేలు': 29, 'ఆమోసు': 30,
  'ఓబద్యా': 31, 'యోనా': 32, 'మీకా': 33, 'నహూము': 34, 'హబక్కూకు': 35,
  'జెఫన్యా': 36, 'హగ్గయి': 37, 'జెకర్యా': 38, 'మలాకీ': 39,
  'మత్తయి సువార్త': 40, 'మార్కు సువార్త': 41, 'లూకా సువార్త': 42, 'యోహాను సువార్త': 43, 'అపొస్తలుల కార్యములు': 44,
  'రోమీయులకు వ్రాసిన పత్రిక': 45, '1 కొరింథీయులకు': 46, '2 కొరింథీయులకు': 47, 'గలతీయులకు': 48, 'ఎఫెసీయులకు': 49,
  'ఫిలిప్పీయులకు': 50, 'కొలొస్సయులకు': 51, '1 థెస్సలొనీకయులకు': 52, '2 థెస్సలొనీకయులకు': 53, '1 తిమోతికి': 54,
  '2 తిమోతికి': 55, 'తీతుకు': 56, 'ఫిలేమోనుకు': 57, 'హెబ్రీయులకు': 58, 'యాకోబు': 59,
  '1 పేతురు': 60, '2 పేతురు': 61, '1 యోహాను': 62, '2 యోహాను': 63, '3 యోహాను': 64,
  'యూదా': 65, 'ప్రకటన గ్రంథము': 66
};

const ENGLISH_NAMES = [
  'Genesis', 'Exodus', 'Leviticus', 'Numbers', 'Deuteronomy', 'Joshua', 'Judges', 'Ruth', '1 Samuel', '2 Samuel',
  '1 Kings', '2 Kings', '1 Chronicles', '2 Chronicles', 'Ezra', 'Nehemiah', 'Esther', 'Job', 'Psalms', 'Proverbs',
  'Ecclesiastes', 'Song of Solomon', 'Isaiah', 'Jeremiah', 'Lamentations', 'Ezekiel', 'Daniel', 'Hosea', 'Joel', 'Amos',
  'Obadiah', 'Jonah', 'Micah', 'Nahum', 'Habakkuk', 'Zephaniah', 'Haggai', 'Zechariah', 'Malachi',
  'Matthew', 'Mark', 'Luke', 'John', 'Acts', 'Romans', '1 Corinthians', '2 Corinthians', 'Galatians', 'Ephesians',
  'Philippians', 'Colossians', '1 Thessalonians', '2 Thessalonians', '1 Timothy', '2 Timothy', 'Titus', 'Philemon', 'Hebrews', 'James',
  '1 Peter', '2 Peter', '1 John', '2 John', '3 John', 'Jude', 'Revelation'
];

// Local Telugu Bible Data Fallback
const LOCAL_TELUGU_BIBLE: any = require('../../assets/telugu_bible.json');

const VerseItem = React.memo(({ 
  item, 
  index, 
  isTarget, 
  isSelected, 
  selectionMode, 
  toggleVerseSelection, 
  handleVerseLongPress, 
  isDark, 
  englishBookName, 
  chapter,
  setVerseLayouts,
  searchQuery
}: any) => {
  const renderText = (text: string, baseStyle: any, highlightStyle: any) => {
    if (!searchQuery || !isTarget) return <Text style={baseStyle}>{text}</Text>;
    const parts = text.split(new RegExp(`(${searchQuery})`, 'gi'));
    return (
      <Text style={baseStyle}>
        {parts.map((part, i) => 
          part.toLowerCase() === searchQuery.toLowerCase() ? 
            <Text key={i} style={highlightStyle}>{part}</Text> : 
            <Text key={i}>{part}</Text>
        )}
      </Text>
    );
  };
  if (selectionMode) {
    return (
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={() => toggleVerseSelection(item.verse)}
        onLongPress={() => toggleVerseSelection(item.verse)}
        style={[
          styles.verseRow,
          isSelected && (isDark ? styles.selectedVerseDark : styles.selectedVerseLight)
        ]}
        onLayout={(e) => {
          const y = e.nativeEvent.layout.y;
          setVerseLayouts && setVerseLayouts((prev: any) => ({...prev, [item.verse]: y}));
        }}
      >
        <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
          {isSelected && <CheckCircle2 color="#fff" size={14} />}
        </View>
        <Text style={[styles.verseNumber, { color: isDark ? (isSelected ? '#0f172a' : '#94a3b8') : (isSelected ? '#1a2d5a' : '#1a2d5a') }]}>{item.verse}</Text>
        <Text style={[styles.verseText, { color: isDark ? (isSelected ? '#bfdbfe' : '#e2e8f0') : (isSelected ? '#1e3a8a' : '#1e293b') }]}>
          {item.text}
        </Text>
      </TouchableOpacity>
    );
  }

  if (isTarget) {
    return (
      <TouchableOpacity
        activeOpacity={0.7}
        onLongPress={() => handleVerseLongPress(item)}
        style={[styles.highlightedCard, isDark ? styles.highlightedCardDark : styles.highlightedCardLight]}
        onLayout={(e) => {
          const y = e.nativeEvent.layout.y;
          setVerseLayouts && setVerseLayouts((prev: any) => ({...prev, [item.verse]: y}));
        }}
      >
        <Text style={[styles.quoteDecor, { color: isDark ? 'rgba(253,224,71,0.35)' : 'rgba(217,119,6,0.2)' }]}>“</Text>
        <View style={[styles.verseNumBadge, { backgroundColor: isDark ? '#fde047' : '#d97706' }]}>
          <Text style={[styles.verseNumBadgeTxt, { color: isDark ? '#1a1a00' : '#fff' }]}>{item.verse}</Text>
        </View>
        {renderText(
          item.text,
          [styles.highlightedVerseText, { color: isDark ? '#fef9c3' : '#78350f' }],
          { backgroundColor: isDark ? 'rgba(250,204,21,0.4)' : '#fde047', color: isDark ? '#fff' : '#000', fontWeight: 'bold' }
        )}
        <View style={styles.verseRefTag}>
          <Text style={[styles.verseRefTagTxt, { color: isDark ? '#fde047' : '#d97706' }]}>
            {englishBookName} {chapter}:{item.verse}
          </Text>
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      activeOpacity={0.6}
      onLongPress={() => handleVerseLongPress(item)}
      style={styles.verseRow}
      onLayout={(e) => {
        const y = e.nativeEvent.layout.y;
        setVerseLayouts && setVerseLayouts((prev: any) => ({...prev, [item.verse]: y}));
      }}
    >
      <Text style={[styles.verseNumber, { color: isDark ? '#94a3b8' : '#1a2d5a' }]}>{item.verse}</Text>
      <Text style={[styles.verseText, { color: isDark ? '#e2e8f0' : '#1e293b' }]}>
        {item.text}
      </Text>
    </TouchableOpacity>
  );
});

export default function BibleReaderScreen({ route, navigation }: any) {
  const { bookName, chapter, lang, targetVerse, searchQuery } = route.params;
  const { isDark } = useTheme();
  const { user } = useAuth();
  const [verses, setVerses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showVerseOptionsModal, setShowVerseOptionsModal] = useState(false);
  const [selectedVerseItem, setSelectedVerseItem] = useState<any>(null);

  // Multi-verse selection
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedVerses, setSelectedVerses] = useState<Set<number>>(new Set());
  const [savedVerseCount, setSavedVerseCount] = useState(0);

  const flatListRef = React.useRef<FlatList>(null);
  const hasScrolledToTarget = React.useRef(false);
  const [verseLayouts, setVerseLayouts] = useState<{ [key: number]: number }>({});
  const [isRead, setIsRead] = useState(false);

  // Key format: `${lang}-${bookName}-${chapter}`
  const chapterKey = `${lang}-${bookName}-${chapter}`;

  // Derive English name and total chapters
  const bookIndex = (BOOK_MAP[bookName] || 1) - 1;
  const englishBookName = ENGLISH_NAMES[bookIndex] || bookName;
  const totalChapters = LOCAL_TELUGU_BIBLE?.Book?.[bookIndex]?.Chapter?.length || 150;

  React.useEffect(() => {
    fetchVerses();
    setVerseLayouts({});
    hasScrolledToTarget.current = false;
    // Exit selection mode when chapter changes
    setSelectionMode(false);
    setSelectedVerses(new Set());
    
    // Check read status
    const checkReadStatus = async () => {
      if (!user?.uid) return;
      try {
        const doc = await firestore().collection('users').doc(user.uid).get();
        const data = doc.data();
        if (data) {
          const readList = data?.readChapters || [];
          setIsRead(readList.includes(chapterKey));
        } else {
          setIsRead(false);
        }
      } catch (e) {
        console.error('Error fetching read status:', e);
      }
    };
    checkReadStatus();
  }, [bookName, chapter, lang, chapterKey, user]);

  const toggleMarkAsRead = async () => {
    if (!user?.uid) {
      Alert.alert('Sign In Required', 'Please sign in to track your reading progress.');
      return;
    }
    try {
      const userRef = firestore().collection('users').doc(user.uid);
      
      if (isRead) {
        await userRef.set({
          readChapters: firestore.FieldValue.arrayRemove(chapterKey)
        }, { merge: true });
        setIsRead(false);
      } else {
        await userRef.set({
          readChapters: firestore.FieldValue.arrayUnion(chapterKey)
        }, { merge: true });
        setIsRead(true);
      }
    } catch (e) {
      console.error('Error updating read status:', e);
      Alert.alert('Error', 'Failed to update read status.');
    }
  };

  React.useEffect(() => {
    hasScrolledToTarget.current = false;
  }, [targetVerse, chapter]);

  React.useEffect(() => {
    if (targetVerse && verses.length > 0 && !hasScrolledToTarget.current) {
      const index = verses.findIndex(v => v.verse === targetVerse);
      if (index !== -1) {
        hasScrolledToTarget.current = true;
        setTimeout(() => {
          flatListRef.current?.scrollToIndex({
            index,
            animated: true,
            viewPosition: 0.1
          });
        }, 300);
      }
    }
  }, [targetVerse, verses]);

  const fetchVerses = async () => {
    try {
      setLoading(true);
      setError(null);

      // 1. Check Local Fallback for Telugu First (Simple & Robust)
      if (lang === 'Telugu') {
        const bIndex = (BOOK_MAP[bookName] || 1) - 1;
        if (LOCAL_TELUGU_BIBLE && LOCAL_TELUGU_BIBLE.Book && LOCAL_TELUGU_BIBLE.Book[bIndex]) {
          const bookData = LOCAL_TELUGU_BIBLE.Book[bIndex];
          if (bookData.Chapter && bookData.Chapter[chapter - 1]) {
            console.log(`📖 Loading ${bookName} Chapter ${chapter} from local JSON...`);
            const chapterData = bookData.Chapter[chapter - 1].Verse;
            const formattedVerses = chapterData.map((v: any, i: number) => ({
              verse: i + 1,
              text: v.Verse
            }));
            setVerses(formattedVerses);
            setLoading(false);
            return;
          }
        }
      }

      // 2. Otherwise, use API (Primary for English, Fallback for Telugu)
      const bookId = BOOK_MAP[bookName] || 1;
      const versions = lang === 'English' ? ['KJV', 'ASV'] : ['TELBSI', 'BSITEL', 'TEL'];
      
      let data = null;
      let lastError = null;

      for (const v of versions) {
        try {
          const url = `https://bolls.life/get-text/${v}/${bookId}/${chapter}/`;
          console.log(`🔗 Fetching from API (${v}):`, url);
          
          const response = await fetch(url, {
            headers: { 'Accept': 'application/json' }
          });
          
          if (response.ok) {
            const result = await response.json();
            if (result && Array.isArray(result) && result.length > 0) {
              // Strip Strong's numbers, <sup> translator notes, and any other HTML tags
              data = result.map((item: any) => ({
                ...item,
                text: item.text ? item.text
                  .replace(/<S>\d*<\/S>/gi, '') // Remove Strongs
                  .replace(/<sup[^>]*>.*?<\/sup>/gi, '') // Remove translator notes
                  .replace(/<[^>]+>/g, '') // Strip any other stray HTML tags (<i>, <b>, etc.)
                  .replace(/\s{2,}/g, ' ') // Clean up double spaces
                  .trim() : item.text
              }));
              break;
            }
          }
        } catch (e: any) {
          lastError = e.message;
        }
      }

      if (!data) {
        throw new Error('Scripture not available offline. Please check your internet connection.');
      }
      setVerses(data);
    } catch (error: any) {
      console.error('❌ Bible Load Error:', error);
      setError(error.message || 'Failed to load verses.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerseLongPress = (item: any) => {
    if (selectionMode) {
      // Already in selection mode — toggle this verse
      toggleVerseSelection(item.verse);
    } else {
      // Enter selection mode with this verse pre-selected
      setSelectedVerses(new Set([item.verse]));
      setSelectionMode(true);
    }
  };

  const toggleVerseSelection = (verseNum: number) => {
    setSelectedVerses(prev => {
      const next = new Set(prev);
      if (next.has(verseNum)) {
        next.delete(verseNum);
      } else {
        next.add(verseNum);
      }
      return next;
    });
  };

  const cancelSelection = () => {
    setSelectionMode(false);
    setSelectedVerses(new Set());
  };

  const saveMultipleVersesToNotes = async () => {
    if (selectedVerses.size === 0) return;
    try {
      const stored = await AsyncStorage.getItem('@SermonPersonalNotes');
      const notes = stored ? JSON.parse(stored) : [];

      const dateStr = new Date().toLocaleDateString('en-US', {
        month: 'short', day: 'numeric', year: 'numeric',
        hour: '2-digit', minute: '2-digit'
      });

      // Sort selected verse numbers
      const sortedVerseNums = Array.from(selectedVerses).sort((a, b) => a - b);

      // Build combined content
      const content = sortedVerseNums
        .map(vNum => {
          const v = verses.find((v: any) => v.verse === vNum);
          return v ? `[${vNum}] ${v.text}` : '';
        })
        .filter(Boolean)
        .join('\n\n');

      // Build a smart title e.g. "Matthew 5:3-7" or "Matthew 5:3,6,9"
      const isContiguous = sortedVerseNums.every((v, i) => i === 0 || v === sortedVerseNums[i - 1] + 1);
      const rangeLabel = isContiguous && sortedVerseNums.length > 1
        ? `${sortedVerseNums[0]}-${sortedVerseNums[sortedVerseNums.length - 1]}`
        : sortedVerseNums.join(',');

      const newNote = {
        id: Date.now().toString(),
        title: `${englishBookName} ${chapter}:${rangeLabel}`,
        content,
        timestamp: dateStr
      };

      notes.unshift(newNote);
      await AsyncStorage.setItem('@SermonPersonalNotes', JSON.stringify(notes));

      setSavedVerseCount(sortedVerseNums.length);
      cancelSelection();
      setShowSuccessModal(true);
    } catch (e) {
      console.error(e);
      Alert.alert('Error', 'Failed to save verses.');
    }
  };

  const saveToSermonNotes = async (item: any) => {
    setShowVerseOptionsModal(false);
    try {
      const stored = await AsyncStorage.getItem('@SermonPersonalNotes');
      const notes = stored ? JSON.parse(stored) : [];
      
      const dateStr = new Date().toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });

      const newNote = {
        id: Date.now().toString(),
        title: `${englishBookName} ${chapter}:${item.verse}`,
        content: item.text,
        timestamp: dateStr
      };

      notes.unshift(newNote);
      await AsyncStorage.setItem('@SermonPersonalNotes', JSON.stringify(notes));
      setShowSuccessModal(true);
    } catch (e) {
      console.error(e);
      Alert.alert("Error", "Failed to save verse.");
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: isDark ? '#0f172a' : '#fff' }]}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      
      {/* Premium Header */}
      <View style={styles.headerWrapper}>
        <View style={styles.headerShadowWrapper}>
          <View style={styles.gradientBorderContainer}>
            <Svg height="100%" width="100%" style={{ position: 'absolute', top: 0, left: 0 }}>
              <Defs>
                <LinearGradient id="borderGrad" x1="0" y1="0" x2="1" y2="0">
                  <Stop offset="0" stopColor="#3b82f6" />
                  <Stop offset="0.5" stopColor="#0ea5e9" />
                  <Stop offset="1" stopColor="#8b5cf6" />
                </LinearGradient>
              </Defs>
              <Rect width="100%" height="100%" fill="url(#borderGrad)" />
            </Svg>

            <View style={styles.header}>
              <View style={styles.headerLeft}>
                <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
                  <ArrowLeft color="#fff" size={24} />
                </TouchableOpacity>
              </View>
              
              <View style={styles.headerCenter}>
                <Text style={styles.headerTitle} numberOfLines={1} adjustsFontSizeToFit>
                  {lang === 'Telugu' ? `${englishBookName} · ${bookName}` : englishBookName}
                </Text>
                <Text style={styles.headerSub}>Chapter {chapter} · అధ్యాయం {chapter}</Text>
              </View>
              
              <View style={styles.headerRight}>
                {/* Removed icons per user request, keep empty for balance */}
              </View>
            </View>
          </View>
        </View>
      </View>

      <View style={{ flex: 1 }}>
        <FlatList 
          ref={flatListRef}
          style={styles.scroll} 
          showsVerticalScrollIndicator={false}
          data={verses}
          keyExtractor={(item) => item.verse.toString()}
          contentContainerStyle={styles.readerContent}
          initialNumToRender={15}
          maxToRenderPerBatch={10}
          windowSize={5}
          removeClippedSubviews={Platform.OS === 'android'}
          onScrollToIndexFailed={(info) => {
            const wait = new Promise(resolve => setTimeout(resolve, 500));
            wait.then(() => {
              flatListRef.current?.scrollToIndex({ index: info.index, animated: true, viewPosition: 0.1 });
            });
          }}
          ListHeaderComponent={
            <>
              {loading && (
                <View style={styles.loadingContainer}>
                   <Text style={{ color: '#1a2d5a', fontWeight: '700' }}>Loading verses... పరిశుద్ధ గ్రంథం లోడ్ అవుతోంది...</Text>
                </View>
              )}
              {error && (
                <View style={styles.loadingContainer}>
                   <Text style={{ color: '#c0392b', fontWeight: '700', textAlign: 'center' }}>{error}</Text>
                   <TouchableOpacity style={styles.retryBtn} onPress={fetchVerses}>
                     <Text style={styles.retryText}>Tap to Retry · మళ్ళీ ప్రయత్నించండి</Text>
                   </TouchableOpacity>
                </View>
              )}
            </>
          }
          renderItem={({ item, index }) => (
            <VerseItem
              item={item}
              index={index}
              isTarget={targetVerse === item.verse}
              isSelected={selectedVerses.has(item.verse)}
              selectionMode={selectionMode}
              toggleVerseSelection={toggleVerseSelection}
              handleVerseLongPress={handleVerseLongPress}
              isDark={isDark}
              englishBookName={englishBookName}
              chapter={chapter}
              setVerseLayouts={setVerseLayouts}
              searchQuery={searchQuery}
            />
          )}
          ListFooterComponent={
            <>
              {!loading && verses.length > 0 && (
                <View style={styles.chapterEnd}>
                  <TouchableOpacity 
                    style={[styles.markAsReadBtn, isRead && styles.markAsReadBtnActive, isDark && !isRead && { backgroundColor: '#1e293b', borderColor: '#334155' }]}
                    onPress={toggleMarkAsRead}
                  >
                    <CheckCircle2 color={isRead ? '#fff' : (isDark ? '#e2e8f0' : '#1a2d5a')} size={20} />
                    <Text style={[styles.markAsReadTxt, isRead && styles.markAsReadTxtActive, isDark && !isRead && { color: '#e2e8f0' }]}>
                      {isRead ? 'Unmark as Read' : 'Mark as Read'}
                    </Text>
                  </TouchableOpacity>
                  <View style={styles.divider} />
                  <Text style={styles.endText}>End of Chapter {chapter}</Text>
                </View>
              )}
              <View style={{ height: 100 }} />
            </>
          }
        />
      </View>

      {/* Bottom Bar — switches between nav and selection action bar */}
      {selectionMode ? (
        <View style={[styles.selectionBar, { backgroundColor: isDark ? '#1e293b' : '#fff' }]}>
          <TouchableOpacity style={styles.selectionCancelBtn} onPress={cancelSelection}>
            <Text style={[styles.selectionCancelTxt, { color: isDark ? '#94a3b8' : '#64748b' }]}>Cancel</Text>
          </TouchableOpacity>
          <View style={styles.selectionCountBox}>
            <Text style={[styles.selectionCountTxt, { color: isDark ? '#e2e8f0' : '#1a2d5a' }]}>
              {selectedVerses.size} verse{selectedVerses.size !== 1 ? 's' : ''} selected
            </Text>
          </View>
          <TouchableOpacity
            style={[styles.selectionSaveBtn, selectedVerses.size === 0 && { opacity: 0.4 }]}
            onPress={saveMultipleVersesToNotes}
            disabled={selectedVerses.size === 0}
          >
            <BookMarked color="#fff" size={16} />
            <Text style={styles.selectionSaveTxt}>Save</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.bottomBar}>
          <TouchableOpacity 
            style={[styles.barAction, chapter <= 1 && { opacity: 0.3 }]} 
            onPress={() => chapter > 1 && navigation.replace('BibleReader', { bookName, chapter: chapter - 1, lang, direction: 'backward' })}
            disabled={chapter <= 1}
          >
            <ChevronLeft color="#1a2d5a" size={24} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.barMain}>
            <Text style={styles.barMainTxt}>{chapter} / {totalChapters}</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.barAction, chapter >= totalChapters && { opacity: 0.3 }]}
            onPress={() => chapter < totalChapters && navigation.replace('BibleReader', { bookName, chapter: chapter + 1, lang, direction: 'forward' })}
            disabled={chapter >= totalChapters}
          >
            <ChevronLeft color="#1a2d5a" size={24} style={{ transform: [{ rotate: '180deg' }] }} />
          </TouchableOpacity>
        </View>
      )}

      {/* Verse Options Modal */}
      <Modal
        visible={showVerseOptionsModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowVerseOptionsModal(false)}
      >
        <TouchableOpacity 
          style={styles.optionsOverlay} 
          activeOpacity={1} 
          onPress={() => setShowVerseOptionsModal(false)}
        >
          <View style={[styles.optionsSheet, { backgroundColor: isDark ? '#1e293b' : '#ffffff' }]}>
            {/* Handle bar */}
            <View style={styles.optionsHandle} />

            {/* Verse Reference Header */}
            <View style={styles.optionsHeader}>
              <View style={styles.optionsIconBox}>
                <BookMarked color="#1a2d5a" size={22} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.optionsRefText, { color: isDark ? '#f8fafc' : '#0f172a' }]}>
                  {englishBookName} {chapter}:{selectedVerseItem?.verse}
                </Text>
                <Text style={[styles.optionsSubText, { color: isDark ? '#94a3b8' : '#64748b' }]}>
                  Long-pressed verse
                </Text>
              </View>
            </View>

            {/* Verse Preview */}
            {selectedVerseItem && (
              <View style={[styles.optionsVersePreview, { backgroundColor: isDark ? '#0f172a' : '#f8fafc' }]}>
                <Text style={[styles.optionsVersePreviewText, { color: isDark ? '#cbd5e1' : '#334155' }]} numberOfLines={3}>
                  {selectedVerseItem.text}
                </Text>
              </View>
            )}

            {/* Action Button */}
            <TouchableOpacity
              style={styles.optionsActionBtn}
              onPress={() => selectedVerseItem && saveToSermonNotes(selectedVerseItem)}
            >
              <BookMarked color="#ffffff" size={18} />
              <Text style={styles.optionsActionBtnTxt}>Add to Sermon Notes</Text>
            </TouchableOpacity>

            {/* Cancel */}
            <TouchableOpacity
              style={styles.optionsCancelBtn}
              onPress={() => setShowVerseOptionsModal(false)}
            >
              <Text style={[styles.optionsCancelTxt, { color: isDark ? '#94a3b8' : '#64748b' }]}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Beautiful Success Modal */}
      <Modal
        visible={showSuccessModal}
        transparent={true}
        animationType="fade"
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: isDark ? '#1e293b' : '#fff' }]}>
            <View style={styles.modalIconContainer}>
              <CheckCircle2 color="#10b981" size={50} />
            </View>
            <Text style={[styles.modalTitle, { color: isDark ? '#f8fafc' : '#0f172a' }]}>
              {savedVerseCount > 1 ? `${savedVerseCount} Verses Saved!` : 'Verse Saved!'}
            </Text>
            <Text style={[styles.modalDesc, { color: isDark ? '#94a3b8' : '#64748b' }]}>
              {savedVerseCount > 1
                ? `${savedVerseCount} verses have been added to your Sermon Notes as one entry.`
                : 'This verse has been successfully added to your Sermon Notes.'}
            </Text>
            
            <View style={styles.modalActions}>
              <TouchableOpacity 
                style={[styles.modalBtn, styles.modalBtnSecondary]} 
                onPress={() => setShowSuccessModal(false)}
              >
                <Text style={styles.modalBtnSecondaryTxt}>Continue Reading</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.modalBtn, styles.modalBtnPrimary]} 
                onPress={() => {
                  setShowSuccessModal(false);
                  navigation.navigate('MemberNotes');
                }}
              >
                <Text style={styles.modalBtnPrimaryTxt}>View Notes</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerWrapper: {
    width: '100%',
    position: 'relative'
  },
  headerShadowWrapper: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 15,
    borderBottomLeftRadius: 35,
    borderBottomRightRadius: 35,
    backgroundColor: '#1a2d5a', 
  },
  gradientBorderContainer: {
    borderBottomLeftRadius: 35,
    borderBottomRightRadius: 35,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 15,
    marginBottom: 4,
    backgroundColor: '#1a2d5a',
    borderBottomLeftRadius: 33,
    borderBottomRightRadius: 33,
    overflow: 'hidden'
  },
  headerLeft: { flex: 1, alignItems: 'flex-start' },
  backBtn: { padding: 4 },
  headerCenter: { flex: 3, alignItems: 'center' },
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: '800', textAlign: 'center' },
  headerSub: { color: 'rgba(255,255,255,0.7)', fontSize: 12, fontWeight: '600', textAlign: 'center' },
  headerRight: { flex: 1, flexDirection: 'row', justifyContent: 'flex-end' },

  scroll: { flex: 1 },
  readerContent: { padding: 20 },
  loadingContainer: { 
    height: 300, 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  verseRow: {
    flexDirection: 'row',
    marginBottom: 20,
    alignItems: 'flex-start'
  },
  verseNumber: {
    width: 28,
    fontSize: 14,
    fontWeight: '900',
    color: '#1a2d5a',
    marginTop: 4
  },
  verseText: {
    flex: 1,
    fontSize: 17,
    lineHeight: 28,
    fontWeight: '500'
  },
  // Highlighted verse card — gold/amber themed
  highlightedCard: {
    marginBottom: 20,
  },
  highlightedCardLight: {
    backgroundColor: '#fffbeb',
    borderRadius: 16,
    padding: 18,
    marginHorizontal: -4,
    borderWidth: 1.5,
    borderColor: '#fcd34d',
    shadowColor: '#d97706',
    shadowOpacity: 0.22,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6
  },
  highlightedCardDark: {
    backgroundColor: '#1c1a00',
    borderRadius: 16,
    padding: 18,
    marginHorizontal: -4,
    borderWidth: 1.5,
    borderColor: 'rgba(253,224,71,0.4)',
    shadowColor: '#fde047',
    shadowOpacity: 0.15,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6
  },
  quoteDecor: {
    fontSize: 80,
    lineHeight: 68,
    fontWeight: '900',
    marginBottom: -10,
    marginLeft: -4
  },
  verseNumBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 20,
    marginBottom: 10
  },
  verseNumBadgeTxt: {
    fontSize: 12,
    fontWeight: '800'
  },
  highlightedVerseText: {
    fontSize: 19,
    lineHeight: 32,
    fontWeight: '700',
    marginBottom: 14
  },
  verseRefTag: {
    alignSelf: 'flex-end',
    borderTopWidth: 1,
    borderTopColor: 'rgba(217,119,6,0.2)',
    paddingTop: 8,
    width: '100%',
    alignItems: 'flex-end'
  },
  verseRefTagTxt: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5
  },
  
  // Legacy (kept for safety)

  // Multi-verse selection styles
  selectedVerseLight: {
    backgroundColor: 'rgba(26, 45, 90, 0.08)',
    borderRadius: 10,
    paddingVertical: 4,
    paddingHorizontal: 4,
    marginHorizontal: -4,
    borderLeftWidth: 3,
    borderLeftColor: '#1a2d5a'
  },
  selectedVerseDark: {
    backgroundColor: 'rgba(96, 165, 250, 0.15)',
    borderRadius: 10,
    paddingVertical: 4,
    paddingHorizontal: 4,
    marginHorizontal: -4,
    borderLeftWidth: 3,
    borderLeftColor: '#60a5fa'
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: '#94a3b8',
    marginRight: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 3,
    flexShrink: 0
  },
  checkboxSelected: {
    backgroundColor: '#1a2d5a',
    borderColor: '#1a2d5a'
  },

  // Selection action bar
  selectionBar: {
    position: 'absolute',
    bottom: 30,
    left: 20,
    right: 20,
    height: 60,
    borderRadius: 30,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    elevation: 12,
    shadowColor: '#1a2d5a',
    shadowOpacity: 0.2,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 5 }
  },
  selectionCancelBtn: {
    paddingHorizontal: 8
  },
  selectionCancelTxt: {
    fontSize: 14,
    fontWeight: '600'
  },
  selectionCountBox: {
    flex: 1,
    alignItems: 'center'
  },
  selectionCountTxt: {
    fontSize: 14,
    fontWeight: '800'
  },
  selectionSaveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#1a2d5a',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20
  },
  selectionSaveTxt: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '800'
  },

  chapterEnd: { alignItems: 'center', marginTop: 40 },
  markAsReadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 24,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0'
  },
  markAsReadBtnActive: {
    backgroundColor: '#10b981',
    borderColor: '#10b981'
  },
  markAsReadTxt: {
    color: '#1a2d5a',
    fontSize: 15,
    fontWeight: '700'
  },
  markAsReadTxtActive: {
    color: '#fff'
  },
  divider: { width: 50, height: 2, backgroundColor: '#e2e8f0', marginBottom: 10 },
  endText: { fontSize: 12, color: '#94a3b8', fontWeight: '600' },

  bottomBar: {
    position: 'absolute',
    bottom: 30,
    left: 20,
    right: 20,
    height: 60,
    backgroundColor: '#fff',
    borderRadius: 30,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    elevation: 10,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 }
  },
  barAction: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center'
  },
  barMain: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center'
  },
  barMainTxt: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1a2d5a'
  },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20
  },
  modalContent: {
    width: '100%',
    maxWidth: 340,
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    elevation: 10,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 15,
    shadowOffset: { width: 0, height: 10 }
  },
  modalIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#ecfdf5',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 8,
    textAlign: 'center'
  },
  modalDesc: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    width: '100%'
  },
  modalBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center'
  },
  modalBtnSecondary: {
    backgroundColor: '#f1f5f9'
  },
  modalBtnSecondaryTxt: {
    color: '#475569',
    fontSize: 14,
    fontWeight: '700'
  },
  modalBtnPrimary: {
    backgroundColor: '#1a2d5a'
  },
  modalBtnPrimaryTxt: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700'
  },
  
  retryBtn: {
    marginTop: 20,
    backgroundColor: '#1a2d5a',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
  },
  retryText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14
  },

  // Verse Options Bottom Sheet
  optionsOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end'
  },
  optionsSheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 24,
    paddingBottom: 36,
    elevation: 20,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: -5 }
  },
  optionsHandle: {
    width: 44,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#cbd5e1',
    alignSelf: 'center',
    marginBottom: 20
  },
  optionsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 16
  },
  optionsIconBox: {
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: '#eff6ff',
    justifyContent: 'center',
    alignItems: 'center'
  },
  optionsRefText: {
    fontSize: 18,
    fontWeight: '800'
  },
  optionsSubText: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 2
  },
  optionsVersePreview: {
    borderRadius: 14,
    padding: 14,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(100,116,139,0.12)'
  },
  optionsVersePreviewText: {
    fontSize: 14,
    lineHeight: 22,
    fontWeight: '500'
  },
  optionsActionBtn: {
    backgroundColor: '#1a2d5a',
    borderRadius: 16,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginBottom: 12
  },
  optionsActionBtnTxt: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '800'
  },
  optionsCancelBtn: {
    paddingVertical: 12,
    alignItems: 'center'
  },
  optionsCancelTxt: {
    fontSize: 15,
    fontWeight: '600'
  }
});
