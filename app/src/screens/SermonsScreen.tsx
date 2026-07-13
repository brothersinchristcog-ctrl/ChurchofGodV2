import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StatusBar,
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  SectionList,
  Dimensions,
  Platform,
  InteractionManager
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { 
  ChevronLeft, 
  Play, 
  Mic,
  ChevronDown,
  ChevronRight,
  BookOpen,
  Layers,
  Sun,
  Moon
} from 'lucide-react-native';
import { useTheme } from '../context/ThemeContext';
import SalesforceService, { Sermon } from '../services/SalesforceService';

const { width } = Dimensions.get('window');

const ALL_CATEGORIES = [
  'All',
  'Bible Study',
  "Women's Fasting Prayer",
  'Second Saturday Prayer',
  'Sunday Service',
  'All-Night Prayer',
  'Youth Meeting',
  'Revival Meeting',
  'Special Messages',
  'Shorts',
  'Testimonies',
  'Uncategorized',
];

const CATEGORY_COLORS: Record<string, string> = {
  'Bible Study':              '#1a2d5a',
  "Women's Fasting Prayer":   '#be185d',
  'Second Saturday Prayer':   '#7c3aed',
  'Sunday Service':           '#0369a1',
  'All-Night Prayer':         '#1d4ed8',
  'Youth Meeting':            '#15803d',
  'Revival Meeting':          '#b45309',
  'Special Messages':         '#c0392b',
  'Shorts':                   '#d97706',
  'Testimonies':              '#047857',
  'Uncategorized':            '#64748b',
};

const SermonItem = React.memo(({ item, navigation, isDark }: any) => (
  <TouchableOpacity 
    style={[styles.sermonCard, { backgroundColor: isDark ? '#1e293b' : '#fff', borderColor: isDark ? '#334155' : '#f1f5f9' }]}
    onPress={() => navigation.navigate('SermonVideo', { 
      youtubeId: item.youtubeId, 
      videoTitle: item.title,
      pastor: item.pastor 
    })}
  >
    <View style={[styles.scThumb, { backgroundColor: isDark ? '#0f172a' : '#0f172a' }]}>
      <View style={styles.playOverlay}>
        <Play size={16} color="#fff" fill="#c0392b" />
      </View>
    </View>
    <View style={styles.scInfo}>
      <Text style={[styles.scTitle, { color: isDark ? '#f1f5f9' : '#1e293b' }]} numberOfLines={2}>
        {item.title}{item.titleTelugu ? ` · ${item.titleTelugu}` : ''}
      </Text>
      <Text style={[styles.scMeta, { color: isDark ? '#94a3b8' : '#64748b' }]}>
        {item.pastor || 'Brother Y. Rajesh'} · {item.date || 'N/A'}{item.duration && item.duration !== 'N/A' ? ` · ${item.duration}` : ''}
      </Text>
      {item.scripture ? (
        <View style={styles.scriptureTag}>
          <BookOpen size={10} color="#7c3aed" />
          <Text style={styles.scriptureTagTxt}>{item.scripture}</Text>
        </View>
      ) : null}
    </View>
  </TouchableOpacity>
));

const SermonSectionHeader = React.memo(({ title, count, isCollapsed, toggleSection, isDark }: any) => {
  const color = CATEGORY_COLORS[title] || '#1a2d5a';
  return (
    <TouchableOpacity
      style={[styles.sectionHeader, { borderLeftColor: color, backgroundColor: isDark ? '#0f172a' : '#f8fafc' }]}
      onPress={() => toggleSection(title)}
      activeOpacity={0.7}
    >
      <View style={{ flex: 1 }}>
        <Text style={[styles.sectionTitle, { color }]}>{title}</Text>
        <Text style={[styles.sectionCount, { color: isDark ? '#64748b' : '#94a3b8' }]}>{count} sermon{count !== 1 ? 's' : ''}</Text>
      </View>
      {isCollapsed
        ? <ChevronRight size={18} color={color} />
        : <ChevronDown size={18} color={color} />
      }
    </TouchableOpacity>
  );
});

export default function SermonsScreen({ navigation }: any) {
  const { isDark, toggleTheme } = useTheme();
  const [sermons, setSermons] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string>('All');
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});
  const insets = useSafeAreaInsets();

  const fetchSermons = async () => {
    try {
      const data = await SalesforceService.getSermons(64);
      setSermons(data);
    } catch (error) {
      console.error('Error fetching sermons:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { 
    const interactionPromise = InteractionManager.runAfterInteractions(() => {
      fetchSermons(); 
    });
    return () => interactionPromise.cancel();
  }, []);

  const onRefresh = () => { setRefreshing(true); fetchSermons(); };

  const toggleSection = (cat: string) => {
    setCollapsedSections(prev => ({ ...prev, [cat]: !prev[cat] }));
  };

  // Build grouped sections
  const buildSections = () => {
    const filtered = activeCategory === 'All' ? sermons : sermons.filter(s => {
      if (activeCategory === 'Uncategorized') return !s.categories || s.categories.length === 0;
      return s.categories && s.categories.includes(activeCategory);
    });

    if (activeCategory !== 'All') {
      return [{ title: activeCategory, data: filtered }];
    }

    // Group by ALL categories
    const grouped: Record<string, any[]> = {};
    filtered.forEach(sermon => {
      const cats = sermon.categories && sermon.categories.length > 0
        ? sermon.categories
        : ['Uncategorized'];
      cats.forEach((cat: string) => {
        if (!grouped[cat]) grouped[cat] = [];
        grouped[cat].push(sermon);
      });
    });

    // Sort categories in defined order
    return ALL_CATEGORIES.filter(c => c !== 'All' && grouped[c]?.length > 0)
      .map(cat => ({ title: cat, data: grouped[cat] }));
  };

  const sections = buildSections();

  return (
    <View style={[styles.container, { backgroundColor: isDark ? '#0f172a' : '#f8fafc' }]}>
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 20) + 10, paddingBottom: 16 }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <ChevronLeft color="#fff" size={24} />
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Sermons</Text>
          <Text style={styles.headerSub}>Watch & Listen</Text>
        </View>
        <TouchableOpacity style={styles.themeToggle} onPress={toggleTheme}>
          {isDark ? <Sun color="#fbbf24" size={20} /> : <Moon color="#cbd5e1" size={20} />}
        </TouchableOpacity>
      </View>

      <View style={[styles.filterSection, { backgroundColor: isDark ? '#0f172a' : '#fff' }]}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
          {ALL_CATEGORIES.map(cat => (
            <TouchableOpacity 
              key={cat} 
              style={[
                styles.pill, 
                activeCategory === cat ? { backgroundColor: '#1a2d5a', borderColor: '#1a2d5a' } : { backgroundColor: isDark ? '#1e293b' : '#f1f5f9', borderColor: isDark ? '#334155' : '#e2e8f0' }
              ]}
              onPress={() => setActiveCategory(cat)}
            >
              <Text style={[
                styles.pillText, 
                activeCategory === cat ? { color: '#fff' } : { color: isDark ? '#94a3b8' : '#64748b' }
              ]}>{cat}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {loading && !refreshing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#1a2d5a" />
          <Text style={styles.loadingText}>Loading Sermons...</Text>
        </View>
      ) : (
        <SectionList
        sections={sections}
        keyExtractor={(item, index) => item.id + index.toString()}
        renderItem={({ item, section }) => {
          if (collapsedSections[section.title]) return null;
          return <SermonItem item={item} navigation={navigation} isDark={isDark} />;
        }}
        renderSectionHeader={({ section: { title, data } }) => (
          <SermonSectionHeader 
            title={title} 
            count={data.length} 
            isCollapsed={collapsedSections[title]} 
            toggleSection={toggleSection} 
            isDark={isDark} 
          />
        )}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Layers size={48} color={isDark ? '#334155' : '#cbd5e1'} />
            <Text style={[styles.emptyTitle, { color: isDark ? '#94a3b8' : '#64748b' }]}>No sermons found</Text>
            <Text style={[styles.emptySub, { color: isDark ? '#475569' : '#94a3b8' }]}>Pull down to refresh</Text>
          </View>
        }
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
        initialNumToRender={10}
        maxToRenderPerBatch={10}
        windowSize={5}
        removeClippedSubviews={Platform.OS === 'android'}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#1a2d5a" />}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { color: '#fbbf24', marginTop: 15, fontWeight: '600' },

  header: {
    backgroundColor: '#1a2d5a',
    paddingTop: Platform.OS === 'ios' ? 60 : 25,
    paddingHorizontal: 20,
    paddingBottom: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  backText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  headerCenter: { alignItems: 'center' },
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: '700' },
  headerSub: { color: '#aac4e8', fontSize: 12, marginTop: 2 },
  themeToggle: {
    backgroundColor: 'rgba(0,0,0,0.3)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)'
  },
  themeToggleText: { color: '#fff', fontSize: 16 },

  filterSection: { paddingVertical: 12 },
  filterScroll: { paddingHorizontal: 16, gap: 8 },
  pill: {
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
  },
  pillText: { fontSize: 12, fontWeight: '600' },

  sectionBlock: { marginBottom: 4 },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderLeftWidth: 4,
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 12,
    elevation: 1,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 4,
  },
  sectionTitle: { fontSize: 14, fontWeight: '800', letterSpacing: 0.3 },
  sectionCount: { fontSize: 11, fontWeight: '500', marginTop: 2 },

  sermonCard: {
    marginHorizontal: 16,
    marginTop: 8,
    borderRadius: 14,
    padding: 14,
    flexDirection: 'row',
    gap: 14,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 5,
    borderWidth: 1,
  },
  scThumb: {
    width: 80,
    height: 56,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden'
  },
  playOverlay: {
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center'
  },
  scInfo: { flex: 1 },
  scTitle: { fontSize: 13, fontWeight: '700', lineHeight: 18 },
  scMeta: { fontSize: 10, marginTop: 5, lineHeight: 14 },
  scriptureTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 6,
    backgroundColor: '#f5f3ff',
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8
  },
  scriptureTagTxt: { fontSize: 9, fontWeight: '700', color: '#7c3aed' },

  emptyState: { alignItems: 'center', paddingVertical: 80 },
  emptyTitle: { fontSize: 17, fontWeight: '700', marginTop: 16 },
  emptySub: { fontSize: 13, marginTop: 6 },
});
