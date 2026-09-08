import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  TouchableOpacity,
  TouchableWithoutFeedback,
  TextInput,
  StatusBar,
  ActivityIndicator,
  RefreshControl,
  Dimensions,
  Platform,
  Alert,
  Modal,
  ScrollView
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ChevronLeft,
  ArrowLeft,
  Search,
  Music,
  ChevronRight,
  AlertCircle,
  BookMarked,
  Bookmark,
  X,
  CheckCircle,
  Info,
  Plus
} from 'lucide-react-native';
import { useAuth } from '../context/AuthContext';
import AddSongModal from '../components/AddSongModal';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Svg, { Defs, LinearGradient, Stop, Rect } from 'react-native-svg';
import SalesforceService, { WorshipSong } from '../services/SalesforceService';
import { useTheme } from '../context/ThemeContext';

const { width, height } = Dimensions.get('window');

const SONGBOOK_KEY = 'cog_my_songbook_ids';

const CATEGORIES = [
  'All',
  'Stuthi Songs',
  'Aradhana Songs',
  'Offering Songs',
  'Special Songs',
  'Gospel Songs',
  'Youth Songs',
  'Christmas Songs',
  'Easter Songs',
  'Marriage Songs',
  'Thanksgiving Songs',
  'Other'
];

export default function SongsScreen({ navigation }: any) {
  const { isDark, colors } = useTheme();
  const { member } = useAuth();

  const userTypeStr = member?.userType?.toLowerCase() || '';
  const isAdmin = userTypeStr === 'admin' || 
                  userTypeStr === 'system administrator' || 
                  userTypeStr.includes('admin') || 
                  userTypeStr === 'pastor';

  const [showAddModal, setShowAddModal] = useState(false);

  // ── Tabs ──────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<'browse' | 'songbook' | 'theme'>('browse');

  // ── All Songs ─────────────────────────────────────
  const [songs, setSongs] = useState<WorshipSong[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // ── Category filter ───────────────────────────────
  const [selectedCategory, setSelectedCategory] = useState('All');

  // ── Search ────────────────────────────────────────
  const [search, setSearch] = useState('');

  // ── Toast State ───────────────────────────────────
  const [toast, setToast] = useState<{ visible: boolean; title: string; desc: string; icon: 'add' | 'remove' }>({
    visible: false,
    title: '',
    desc: '',
    icon: 'add'
  });

  const showToast = (title: string, desc: string, icon: 'add' | 'remove') => {
    setToast({ visible: true, title, desc, icon });
    setTimeout(() => {
      setToast(prev => ({ ...prev, visible: false }));
    }, 2500);
  };

  // ── My Songbook ───────────────────────────────────
  const [savedIds, setSavedIds] = useState<string[]>([]);

  // ── Lyrics View ──────────────────────────────────
  const [selectedSong, setSelectedSong] = useState<WorshipSong | null>(null);

  // ── Load songs ────────────────────────────────────
  const fetchSongs = async () => {
    try {
      // Load from cache first for instant UI
      try {
        const cachedSongs = await AsyncStorage.getItem('cache_songs_all');
        if (cachedSongs) {
          setSongs(JSON.parse(cachedSongs));
          setLoading(false);
        }
      } catch (e) {
        // ignore cache read errors
      }

      // Fetch fresh data in background
      const data = await SalesforceService.getWorshipSongs();
      setSongs(data);
      
      // Update cache
      AsyncStorage.setItem('cache_songs_all', JSON.stringify(data)).catch(()=>{});
    } catch (error) {
      console.error('Error fetching songs:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // ── Load saved songbook from storage ─────────────
  const loadSavedIds = async () => {
    try {
      const raw = await AsyncStorage.getItem(SONGBOOK_KEY);
      if (raw) setSavedIds(JSON.parse(raw));
    } catch { /* ignore */ }
  };

  useEffect(() => {
    fetchSongs();
    loadSavedIds();
  }, []);

  const onRefresh = () => { setRefreshing(true); fetchSongs(); };

  // ── Toggle save/unsave song ───────────────────────
  const toggleSave = async (song: WorshipSong) => {
    const isAlreadySaved = savedIds.includes(song.id);
    let newIds: string[];
    if (isAlreadySaved) {
      newIds = savedIds.filter(id => id !== song.id);
      showToast('Removed', `"${song.title}" has been removed from your Songbook.`, 'remove');
    } else {
      newIds = [...savedIds, song.id];
      showToast('Saved!', `"${song.title}" has been added to your Songbook.`, 'add');
    }
    setSavedIds(newIds);
    await AsyncStorage.setItem(SONGBOOK_KEY, JSON.stringify(newIds));
  };

  // Helper: split multi-category string into array
  const getSongCategories = (song: WorshipSong): string[] =>
    (song.category || 'Other').split(';').map(c => c.trim()).filter(Boolean);

  // ── Filtered songs ────────────────────────────────
  const categoryBrowseSongs = songs.filter(s => {
    const cats = getSongCategories(s);
    if (cats.length === 1 && cats[0] === 'Theme Songs') return false;
    return selectedCategory === 'All' || cats.includes(selectedCategory);
  });

  const filteredBrowse = categoryBrowseSongs.map((s, idx) => ({ ...s, displayNumber: idx + 1 })).filter(s => {
    const q = search.toLowerCase().trim();
    if (!q) return true;
    if (q === s.displayNumber.toString()) return true;
    return s.title.toLowerCase().includes(q) ||
      (s.titleTe && s.titleTe.toLowerCase().includes(q)) ||
      (s.artist && s.artist.toLowerCase().includes(q));
  });

  const savedSongs = songs.filter(s => savedIds.includes(s.id));
  const filteredSongbook = savedSongs.map((s, idx) => ({ ...s, displayNumber: idx + 1 })).filter(s => {
    const q = search.toLowerCase().trim();
    if (!q) return true;
    if (q === s.displayNumber.toString()) return true;
    return s.title.toLowerCase().includes(q) || (s.titleTe && s.titleTe.toLowerCase().includes(q));
  });

  const categoryTheme = songs.filter(s => {
    const cats = getSongCategories(s);
    return cats.includes('Theme Songs');
  });

  const filteredTheme = categoryTheme.map((s, idx) => ({ ...s, displayNumber: idx + 1 })).filter(s => {
    const q = search.toLowerCase().trim();
    if (!q) return true;
    if (q === s.displayNumber.toString()) return true;
    return s.title.toLowerCase().includes(q) || (s.titleTe && s.titleTe.toLowerCase().includes(q));
  });

  // ── Song Card ─────────────────────────────────────
  const renderSongCard = ({ item, index }: { item: WorshipSong & { displayNumber: number }, index: number }) => {
    const isSaved = savedIds.includes(item.id);
    const currentList = activeTab === 'browse' ? filteredBrowse : activeTab === 'songbook' ? filteredSongbook : filteredTheme;
    return (
      <TouchableOpacity
        style={[styles.songCard, { backgroundColor: isDark ? '#1e293b' : '#fff', borderColor: isDark ? '#334155' : '#e5e7eb' }]}
        onPress={() => navigation.navigate('SongView', { songs: currentList, initialIndex: index })}
        onLongPress={() => toggleSave(item)}
        delayLongPress={400}
      >
        <View style={[styles.indexBox, { backgroundColor: isDark ? '#0f172a' : '#f3f4f6' }]}>
          <Text style={[styles.indexTxt, { color: isDark ? '#fff' : '#1a2d5a' }]}>{item.displayNumber}</Text>
        </View>
        <View style={styles.info}>
          <Text style={[styles.title, { color: isDark ? '#fff' : '#111827' }]} numberOfLines={1}>{item.title}</Text>
          <Text style={[styles.artist, { color: isDark ? '#94a3b8' : '#6B7280' }]} numberOfLines={1}>
            {item.titleTe ? `${item.titleTe} · ` : ''}{item.artist}
          </Text>
        </View>
        {isSaved && <Bookmark size={14} color="#c0392b" style={{ marginRight: 4 }} />}
        <ChevronRight size={16} color={isDark ? '#475569' : '#D1D5DB'} />
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: isDark ? '#0f172a' : '#f8fafc' }]}>
      <StatusBar barStyle="light-content" backgroundColor="#1a2d5a" />

      {/* ── Premium Header ── */}
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

            <View style={styles.pageHeader}>
              <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
                <ArrowLeft size={24} color="#fff" />
              </TouchableOpacity>
              <View style={styles.titleCol}>
                <Text style={styles.pageTitle}>Worship & Praise</Text>
                <Text style={styles.pageSub}>స్తుతి మరియు ఆరాధన</Text>
              </View>
              {isAdmin ? (
                <TouchableOpacity 
                  style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: '#f59e0b', justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 3, elevation: 4 }}
                  onPress={() => setShowAddModal(true)}
                >
                  <Plus size={24} color="#fff" />
                </TouchableOpacity>
              ) : (
                <View style={{ width: 40 }} />
              )}
            </View>
          </View>
        </View>
      </View>

      <AddSongModal 
        visible={showAddModal} 
        onClose={() => setShowAddModal(false)} 
        onSuccess={() => {
          fetchSongs();
          showToast('Success', 'Song added successfully!', 'add');
        }}
        isDark={isDark}
        colors={colors}
      />

      {/* ── Main Tabs ── */}
      <View style={styles.tabBar}>
        <TouchableOpacity style={[styles.tab, activeTab === 'browse' && styles.tabActive]}
          onPress={() => { setActiveTab('browse'); setSearch(''); }}>
          <Music size={14} color={activeTab === 'browse' ? '#fff' : '#64748b'} />
          <Text style={[styles.tabTxt, activeTab === 'browse' && styles.tabTxtActive]} numberOfLines={1} adjustsFontSizeToFit>Browse Songs</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tab, activeTab === 'songbook' && styles.tabActive]}
          onPress={() => { setActiveTab('songbook'); setSearch(''); }}>
          <BookMarked size={14} color={activeTab === 'songbook' ? '#fff' : '#64748b'} />
          <Text style={[styles.tabTxt, activeTab === 'songbook' && styles.tabTxtActive]} numberOfLines={1} adjustsFontSizeToFit>
            My Songbook {savedIds.length > 0 ? `(${savedIds.length})` : ''}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tab, activeTab === 'theme' && styles.tabActive]}
          onPress={() => { setActiveTab('theme'); setSearch(''); }}>
          <Music size={14} color={activeTab === 'theme' ? '#fff' : '#64748b'} />
          <Text style={[styles.tabTxt, activeTab === 'theme' && styles.tabTxtActive]} numberOfLines={1} adjustsFontSizeToFit>Theme Songs</Text>
        </TouchableOpacity>
      </View>

      {/* ── Category Chips (Browse only) ── */}
      {activeTab === 'browse' && (
        <ScrollView
          horizontal showsHorizontalScrollIndicator={false}
          style={styles.chipScroll} contentContainerStyle={{ paddingHorizontal: 16, gap: 8, alignItems: 'center' }}>
          {CATEGORIES.map(cat => (
            <TouchableOpacity
              key={cat}
              style={[styles.chip, selectedCategory === cat && styles.chipActive]}
              onPress={() => setSelectedCategory(cat)}>
              <Text style={[styles.chipTxt, selectedCategory === cat && styles.chipTxtActive]}>{cat}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {/* ── Search Bar ── */}
      <View style={[styles.searchBar, { backgroundColor: isDark ? '#1e293b' : '#fff' }]}>
        <Search size={18} color={isDark ? '#94a3b8' : '#64748b'} />
        <TextInput
          placeholder={activeTab === 'browse' ? 'Search songs...' : activeTab === 'theme' ? 'Search theme songs...' : 'Search your songbook...'}
          placeholderTextColor={isDark ? '#64748b' : '#94a3b8'}
          style={[styles.searchInput, { color: isDark ? '#fff' : '#0f172a' }]}
          value={search} onChangeText={setSearch}
          autoCorrect={false} autoCapitalize="none"
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch('')}>
            <X size={16} color="#94a3b8" />
          </TouchableOpacity>
        )}
      </View>

      {/* ── Long Press hint ── */}
      {activeTab === 'browse' && (
        <Text style={styles.hint}>💡 Long press a song to add it to My Songbook</Text>
      )}
      {activeTab === 'songbook' && (
        <Text style={styles.hint}>💡 Long press a song to remove it from your Songbook</Text>
      )}

      {/* ── Browse List ── */}
      {activeTab === 'browse' && (
        loading && !refreshing ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color="#fbbf24" />
          </View>
        ) : (
          <FlatList
            data={filteredBrowse}
            keyExtractor={item => item.id}
            renderItem={renderSongCard}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#1a2d5a" />}
            ListHeaderComponent={() => (
              <Text style={styles.secLbl}>
                {selectedCategory === 'All' ? 'ALL SONGS' : selectedCategory.toUpperCase()} · {filteredBrowse.length} Songs
              </Text>
            )}
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <AlertCircle size={44} color="#cbd5e1" />
                <Text style={[styles.emptyTitle, { color: isDark ? '#94a3b8' : '#1a2d5a' }]}>No songs found</Text>
                <Text style={styles.emptySub}>Try a different category or search term</Text>
              </View>
            }
          />
        )
      )}

      {/* ── My Songbook ── */}
      {activeTab === 'songbook' && (
        <FlatList
          data={filteredSongbook}
          keyExtractor={item => item.id}
          renderItem={renderSongCard}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={() => (
            <Text style={styles.secLbl}>MY SAVED SONGS · {filteredSongbook.length} Songs</Text>
          )}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <BookMarked size={44} color="#cbd5e1" />
              <Text style={[styles.emptyTitle, { color: isDark ? '#94a3b8' : '#1a2d5a' }]}>Your Songbook is Empty</Text>
              <Text style={styles.emptySub}>Long press any song in the Browse tab to save it here for offline viewing.</Text>
            </View>
          }
        />
      )}

      {/* ── Theme Songs List ── */}
      {activeTab === 'theme' && (
        loading && !refreshing ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color="#fbbf24" />
          </View>
        ) : (
          <FlatList
            data={filteredTheme}
            keyExtractor={item => item.id}
            renderItem={renderSongCard}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#1a2d5a" />}
            ListHeaderComponent={() => (
              <Text style={styles.secLbl}>
                THEME SONGS · {filteredTheme.length} Songs
              </Text>
            )}
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <Text style={[styles.emptyTitle, { color: isDark ? '#94a3b8' : '#1a2d5a' }]}>No Theme Songs</Text>
                <Text style={styles.emptySub}>There are currently no Theme Songs available.</Text>
              </View>
            }
          />
        )
      )}



      {/* ── Custom Toast Modal ── */}
      {toast.visible && (
        <Modal transparent visible animationType="fade">
          <View style={styles.toastBg}>
            <View style={styles.toastCard}>
              {toast.icon === 'add' ? (
                <CheckCircle size={32} color="#10b981" style={styles.toastIcon} />
              ) : (
                <Info size={32} color="#f59e0b" style={styles.toastIcon} />
              )}
              <Text style={styles.toastTitle}>{toast.title}</Text>
              <Text style={styles.toastDesc}>{toast.desc}</Text>
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  toastBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center' },
  toastCard: { width: '80%', backgroundColor: '#fff', borderRadius: 20, padding: 25, alignItems: 'center', elevation: 5, shadowColor: '#000', shadowOpacity: 0.1, shadowOffset: { width: 0, height: 4 }, shadowRadius: 10 },
  toastIcon: { marginBottom: 15 },
  toastTitle: { fontSize: 20, fontWeight: '800', color: '#1e293b', marginBottom: 8, textAlign: 'center' },
  toastDesc: { fontSize: 14, color: '#64748b', textAlign: 'center', lineHeight: 22 },

  container: { flex: 1 },
  loadingBox: { flex: 1, justifyContent: 'center', alignItems: 'center' },

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
  pageHeader: {
    backgroundColor: '#1a2d5a',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 15,
    marginBottom: 4,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomLeftRadius: 33,
    borderBottomRightRadius: 33,
    overflow: 'hidden'
  },
  backBtn: { padding: 4, width: 40, alignItems: 'flex-start' },
  titleCol: { flex: 1, alignItems: 'center' },
  pageTitle: { color: '#fff', fontSize: 18, fontWeight: '800' },
  pageSub: { color: 'rgba(255,255,255,0.7)', fontSize: 12, marginTop: 1, fontWeight: '600' },

  // Tabs
  tabBar: { flexDirection: 'row', backgroundColor: '#e2e8f0', marginHorizontal: 8, marginTop: 15, marginBottom: 0, borderRadius: 25, padding: 4, gap: 2 },
  tab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 10, borderRadius: 21, gap: 4 },
  tabActive: { backgroundColor: '#1a2d5a' },
  tabTxt: { fontSize: 12, fontWeight: '700', color: '#64748b', flexShrink: 1 },
  tabTxtActive: { color: '#fff' },

  // Category chips
  chipScroll: { marginTop: 12, height: 44, minHeight: 44, flexShrink: 0, flexGrow: 0 },
  chip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, backgroundColor: '#e2e8f0', borderWidth: 1, borderColor: '#e2e8f0' },
  chipActive: { backgroundColor: '#1a2d5a', borderColor: '#1a2d5a' },
  chipTxt: { fontSize: 12, fontWeight: '700', color: '#475569' },
  chipTxtActive: { color: '#fff' },

  // Search
  searchBar: {
    flexDirection: 'row', alignItems: 'center', marginHorizontal: 16, marginTop: 12, marginBottom: 4,
    borderRadius: 14, paddingHorizontal: 14, height: 46, elevation: 2,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, borderWidth: 1, borderColor: '#e2e8f0'
  },
  searchInput: { flex: 1, fontSize: 13, fontWeight: '600', paddingVertical: 8, marginLeft: 8 },

  hint: { fontSize: 10, color: '#94a3b8', textAlign: 'center', marginTop: 4, marginBottom: 8, fontStyle: 'italic' },

  listContent: { paddingBottom: 40 },
  secLbl: { fontSize: 10, fontWeight: '800', color: '#9CA3AF', letterSpacing: 0.8, marginHorizontal: 16, marginBottom: 10, marginTop: 6 },

  // Song Card
  songCard: {
    borderRadius: 14, borderWidth: 0.5, marginHorizontal: 16, marginBottom: 9,
    flexDirection: 'row', alignItems: 'center', padding: 12,
    elevation: 2, shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 3
  },
  indexBox: { width: 34, height: 34, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  indexTxt: { fontSize: 13, fontWeight: '800', color: '#1a2d5a' },
  info: { flex: 1 },
  title: { fontSize: 13, fontWeight: '700' },
  artist: { fontSize: 11, marginTop: 2, fontWeight: '500' },
  keyBadge: { backgroundColor: '#F0FDF4', paddingHorizontal: 7, paddingVertical: 3, borderRadius: 7, marginRight: 6 },
  keyTxt: { fontSize: 9, color: '#166534', fontWeight: '800' },

  emptyState: { padding: 40, alignItems: 'center', marginTop: 30 },
  emptyTitle: { fontSize: 15, fontWeight: '800', marginTop: 12 },
  emptySub: { fontSize: 12, color: '#94a3b8', textAlign: 'center', marginTop: 4 },

});
