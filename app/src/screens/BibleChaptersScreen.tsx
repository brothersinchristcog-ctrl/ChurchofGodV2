import React from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  TouchableOpacity, 
  ScrollView, 
  Dimensions,
  StatusBar,
  Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, Book, CheckCircle2 } from 'lucide-react-native';
import { useTheme } from '../context/ThemeContext';
import { useFocusEffect } from '@react-navigation/native';
import firestore from '@react-native-firebase/firestore';
import { useAuth } from '../context/AuthContext';

const { width } = Dimensions.get('window');

const CHAPTER_COUNTS: any = {
  // OT
  'Genesis': 50, 'Exodus': 40, 'Leviticus': 27, 'Numbers': 36, 'Deuteronomy': 34,
  'Joshua': 24, 'Judges': 21, 'Ruth': 4, '1 Samuel': 31, '2 Samuel': 24,
  '1 Kings': 22, '2 Kings': 25, '1 Chronicles': 29, '2 Chronicles': 36, 'Ezra': 10,
  'Nehemiah': 13, 'Esther': 10, 'Job': 42, 'Psalms': 150, 'Proverbs': 31,
  'Ecclesiastes': 12, 'Song of Solomon': 8, 'Isaiah': 66, 'Jeremiah': 52, 'Lamentations': 5,
  'Ezekiel': 48, 'Daniel': 12, 'Hosea': 14, 'Joel': 3, 'Amos': 9,
  'Obadiah': 1, 'Jonah': 4, 'Micah': 7, 'Nahum': 3, 'Habakkuk': 3,
  'Zephaniah': 3, 'Haggai': 2, 'Zechariah': 14, 'Malachi': 4,
  // NT
  'Matthew': 28, 'Mark': 16, 'Luke': 24, 'John': 21, 'Acts': 28,
  'Romans': 16, '1 Corinthians': 16, '2 Corinthians': 13, 'Galatians': 6, 'Ephesians': 6,
  'Philippians': 4, 'Colossians': 4, '1 Thessalonians': 5, '2 Thessalonians': 3, '1 Timothy': 6,
  '2 Timothy': 4, 'Titus': 3, 'Philemon': 1, 'Hebrews': 13, 'James': 5,
  '1 Peter': 5, '2 Peter': 3, '1 John': 5, '2 John': 1, '3 John': 1,
  'Jude': 1, 'Revelation': 22,
  // Telugu Mapping
  'ఆదికాండము': 50, 'నిర్గమకాండము': 40, 'లేవీయకాండము': 27, 'సంఖ్యాకాండము': 36, 'ద్వితీయోపదేశకాండము': 34,
  'యెహోషువ': 24, 'న్యాయాధిపతులు': 21, 'రూతు': 4, '1 సమూయేలు': 31, '2 సమూయేలు': 24,
  '1 రాజులు': 22, '2 రాజులు': 25, '1 దినవృత్తాంతములు': 29, '2 దినవృత్తాంతములు': 36, 'ఎజ్రా': 10,
  'నెహెమ్యా': 13, 'ఎస్తేరు': 10, 'యోబు': 42, 'కీర్తనల గ్రంథము': 150, 'సామెతలు': 31,
  'ప్రసంగి': 12, 'పరమగీతము': 8, 'యెషయా': 66, 'యిర్మియా': 52, 'విలాపవాక్యములు': 5,
  'యెహెజ్కేలు': 48, 'దానియేలు': 12, 'హోషేయ': 14, 'యోవేలు': 3, 'ఆమోసు': 9,
  'ఓబద్యా': 1, 'యోనా': 4, 'మీకా': 7, 'నహూము': 3, 'హబక్కూకు': 3,
  'జెఫన్యా': 3, 'హగ్గయి': 2, 'జెకర్యా': 14, 'మలాకీ': 4,
  'మత్తయి సువార్త': 28, 'మార్కు సువార్త': 16, 'లూకా సువార్త': 24, 'యోహాను సువార్త': 21, 'అపొస్తలుల కార్యములు': 28,
  'రోమీయులకు వ్రాసిన పత్రిక': 16, '1 కొరింథీయులకు': 16, '2 కొరింథీయులకు': 13, 'గలతీయులకు': 6, 'ఎఫెసీయులకు': 6,
  'ఫిలిప్పీయులకు': 4, 'కొలొస్సయులకు': 4, '1 థెస్సలొనీకయులకు': 5, '2 థెస్సలొనీకయులకు': 3, '1 తిమోతికి': 6,
  '2 తిమోతికి': 4, 'తీతుకు': 3, 'ఫిలేమోనుకు': 1, 'హెబ్రీయులకు': 13, 'యాకోబు': 5,
  '1 పేతురు': 5, '2 పేతురు': 3, '1 యోహాను': 5, '2 యోహాను': 1, '3 యోహాను': 1,
  'యూదా': 1, 'ప్రకటన గ్రంథము': 22,
};

export default function BibleChaptersScreen({ route, navigation }: any) {
  const { bookName, lang } = route.params;
  const { isDark } = useTheme();

  const count = CHAPTER_COUNTS[bookName] || 20;
  const chapters = Array.from({ length: count }, (_, i) => i + 1);

  const { user } = useAuth();
  const [readChapters, setReadChapters] = React.useState<Set<number>>(new Set());

  useFocusEffect(
    React.useCallback(() => {
      const fetchReadChapters = async () => {
        if (!user?.uid) return;
        try {
          const doc = await firestore().collection('users').doc(user.uid).get();
          const data = doc.data();
          if (data) {
            const readList = data?.readChapters || [];
            const readSet = new Set<number>();
            readList.forEach((key: string) => {
              if (key.startsWith(`${lang}-${bookName}-`)) {
                const chapStr = key.split('-')[2];
                readSet.add(parseInt(chapStr, 10));
              }
            });
            setReadChapters(readSet);
          } else {
            setReadChapters(new Set());
          }
        } catch (e) {
          console.error(e);
        }
      };
      fetchReadChapters();
    }, [bookName, lang, user])
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: isDark ? '#0f172a' : '#f8fafc' }]}>
      <StatusBar barStyle="light-content" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <ChevronLeft color="#fff" size={28} />
        </TouchableOpacity>
        <View style={styles.titleInfo}>
          <Text style={styles.headerTitle}>{bookName}</Text>
          <Text style={styles.headerSub}>Select Chapter · అధ్యాయాన్ని ఎంచుకోండి</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={[styles.secTitle, { color: isDark ? '#fff' : '#1a2d5a' }]}>
          Chapters · అధ్యాయాలు
        </Text>
        <View style={styles.grid}>
          {chapters.map((chapter) => (
            <TouchableOpacity 
              key={chapter} 
              style={[
                styles.chapterBox, 
                { backgroundColor: isDark ? '#1e293b' : '#fff' },
                readChapters.has(chapter) && { borderColor: '#10b981', borderWidth: 2 }
              ]}
              onPress={() => navigation.navigate('BibleReader', { 
                bookName, 
                chapter, 
                lang 
              })}
            >
              <Text style={[styles.chapterNum, { color: isDark ? '#fff' : '#1a2d5a' }]}>
                {chapter}
              </Text>
              {readChapters.has(chapter) && (
                <View style={{ position: 'absolute', top: 4, right: 4 }}>
                  <CheckCircle2 color="#10b981" size={14} />
                </View>
              )}
            </TouchableOpacity>
          ))}
        </View>
        <View style={{ height: 100 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    backgroundColor: '#1a2d5a',
    paddingHorizontal: 16,
    paddingVertical: 15,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  backBtn: { padding: 4 },
  titleInfo: { alignItems: 'center' },
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: '800' },
  headerSub: { color: 'rgba(255,255,255,0.7)', fontSize: 12, fontWeight: '600' },

  scroll: { flex: 1, padding: 20 },
  secTitle: { fontSize: 16, fontWeight: '800', marginBottom: 20 },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'flex-start'
  },
  chapterBox: {
    width: (width - 76) / 5,
    height: (width - 76) / 5,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 }
  },
  chapterNum: { fontSize: 16, fontWeight: '800' }
});
