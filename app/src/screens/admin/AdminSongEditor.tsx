import React, { useState, useEffect, useContext } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  ScrollView,
  ActivityIndicator,
  Alert,
  StatusBar,
  Dimensions,
  Platform,
  Modal
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Music, Save, ChevronDown, CheckCircle, Pencil, X, List, Eye, Square, Trash2, Star, Menu } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../../context/ThemeContext';
import { AdminTabContext } from '../../context/AdminTabContext';
import SalesforceService, { WorshipSong } from '../../services/SalesforceService';
import {
  getFirestore,
  collection,
  addDoc,
  serverTimestamp
} from '@react-native-firebase/firestore';

const { width, height } = Dimensions.get('window');

const CATEGORIES = [
  'Stuthi Songs',
  'Aradhana Songs',
  'Offering Songs',
  'Christmas Songs',
  'Easter Songs',
  'Youth Songs',
  'Gospel Songs',
  'Marriage Songs',
  'Thanksgiving Songs',
  'Special Songs',
  'Other',
  'Theme Songs'
];

const SONGBOOK_KEY = 'cog_my_songbook_ids';

const KEYS = [
  'C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B',
  'Cm', 'C#m', 'Dm', 'Ebm', 'Em', 'Fm', 'F#m', 'Gm', 'Abm', 'Am', 'Bbm', 'Bm'
];

export default function AdminSongEditor() {
  const { setActiveTab, openDrawer } = useContext(AdminTabContext);
  const { colors, isDark } = useTheme();
  const styles = getStyles(colors, isDark);

  // Screen-level tab
  const [screenTab, setScreenTab] = useState<'list' | 'theme'>('list');
  const [showPostModal, setShowPostModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');

  // ── POST SONG FORM ──────────────────────────────
  const [titleEn, setTitleEn] = useState('');
  const [titleTe, setTitleTe] = useState('');
  const [artist, setArtist] = useState('COG Worship');
  const [lyrics, setLyrics] = useState('');
  const [status, setStatus] = useState('Published');
  const [categories, setCategories] = useState<string[]>([]);
  const [youtubeId, setYoutubeId] = useState('');

  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [syncReceipt, setSyncReceipt] = useState({ savedTo: '', id: '' });

  // ── POSTED SONGS LIST ───────────────────────────
  const [postedSongs, setPostedSongs] = useState<WorshipSong[]>([]);
  const [loadingList, setLoadingList] = useState(false);
  const [listSearchQuery, setListSearchQuery] = useState('');
  const [showDeleteSuccess, setShowDeleteSuccess] = useState(false);
  const [deletedSongTitle, setDeletedSongTitle] = useState('');
  const [songToDelete, setSongToDelete] = useState<{ id: string; title: string } | null>(null);

  // ── EDIT MODAL ──────────────────────────────────
  const [editingSong, setEditingSong] = useState<WorshipSong | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editTitleTe, setEditTitleTe] = useState('');
  const [editArtist, setEditArtist] = useState('');
  const [editKey, setEditKey] = useState('C');
  const [editLyrics, setEditLyrics] = useState('');
  const [editCategories, setEditCategories] = useState<string[]>([]);
  const [editYoutubeId, setEditYoutubeId] = useState('');
  const [editStatus, setEditStatus] = useState('Published');
  const [savingEdit, setSavingEdit] = useState(false);
  const [showEditCategoryPicker, setShowEditCategoryPicker] = useState(false);
  const [showEditKeyPicker, setShowEditKeyPicker] = useState(false);

  const fetchPostedSongs = async () => {
    setLoadingList(true);
    try {
      const data = await SalesforceService.getWorshipSongs();
      setPostedSongs(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingList(false);
    }
  };

  useEffect(() => {
    fetchPostedSongs();
  }, []);

  // ── PUBLISH NEW SONG ─────────────────────────────
  const handlePublishSong = async () => {
    if (!titleEn.trim()) {
      Alert.alert('Required', 'Please enter a Song Title (English).');
      return;
    }
    if (!lyrics.trim()) {
      Alert.alert('Required', 'Please enter the Song Lyrics.');
      return;
    }
    setSubmitting(true);
    try {
      const primaryCategory = categories.join(';') || 'Other';
      const receipt = await SalesforceService.createWorshipSong({
        titleEn: titleEn.trim(),
        titleTe: titleTe.trim(),
        artist: artist.trim(),
        lyrics: lyrics.trim(),
        status,
        category: primaryCategory,
        youtubeId: youtubeId.trim()
      });
      setSyncReceipt({ savedTo: receipt.savedTo, id: receipt.id });

      const db = getFirestore();
      try {
        await addDoc(collection(db, 'worshipSongs'), {
          title: titleEn.trim(), titleTe: titleTe.trim(), artist: artist.trim(),
          lyrics: lyrics.trim(), status, category: primaryCategory,
          youtubeId: youtubeId.trim(), createdAt: serverTimestamp()
        });
      } catch { /* rules may block — OK */ }

      try {
        await addDoc(collection(db, 'broadcasts'), {
          title: `🎵 New Song: ${titleEn.trim()}`,
          content: `A new worship song "${titleEn.trim()}" has been posted under ${primaryCategory}!`,
          date: new Date().toISOString().split('T')[0],
          type: 'announcement',
          createdAt: serverTimestamp()
        });
      } catch { /* rules may block — OK */ }

      setShowSuccess(true);
    } catch (error: any) {
      Alert.alert('Salesforce Sync Error', error.message || 'Failed to sync with Salesforce.');
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setTitleEn(''); setTitleTe(''); setLyrics(''); setYoutubeId('');
    setArtist('COG Worship'); setCategories([]); setStatus('Published');
  };

  // ── OPEN EDIT MODAL ──────────────────────────────
  const openEdit = (song: WorshipSong) => {
    setEditingSong(song);
    setEditTitle(song.title);
    setEditTitleTe(song.titleTe || '');
    setEditArtist(song.artist || 'COG Worship');
    setEditLyrics(song.lyrics || '');
    // Split semicolon-separated categories back into array
    const cats = (song.category || 'Other')
      .split(';').map(c => c.trim()).filter(Boolean);
    setEditCategories(cats);
    setEditYoutubeId(song.youtubeId || '');
    setEditStatus('Published');
  };

  const handleSaveEdit = async () => {
    if (!editingSong) return;
    if (!editTitle.trim()) { Alert.alert('Required', 'Song title is required.'); return; }
    setSavingEdit(true);
    try {
      const primaryEditCategory = editCategories.join(';') || 'Other';
      await SalesforceService.updateWorshipSong(editingSong.id, {
        titleEn: editTitle.trim(),
        titleTe: editTitleTe.trim(),
        artist: editArtist.trim(),
        lyrics: editLyrics.trim(),
        category: primaryEditCategory,
        status: editStatus,
        youtubeId: editYoutubeId.trim()
      });
      Alert.alert('✅ Updated', 'Song updated successfully in Salesforce!');
      setEditingSong(null);
      fetchPostedSongs();
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to update song.');
    } finally {
      setSavingEdit(false);
    }
  };

  // ── RENDER POSTED SONG ITEM ──────────────────────
  const [adminSelectedSong, setAdminSelectedSong] = useState<WorshipSong | null>(null);

  const handleDeleteSong = (id: string, title: string) => {
    setSongToDelete({ id, title });
  };

  const confirmDeleteSong = async () => {
    if (!songToDelete) return;
    try {
      await SalesforceService.deleteWorshipSong(songToDelete.id);
      fetchPostedSongs();
      setDeletedSongTitle(songToDelete.title);
      setSongToDelete(null);
      setShowDeleteSuccess(true);
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to delete song.');
    }
  };

  const handleToggleTheme = async (song: WorshipSong) => {
    try {
      const currentCats = (song.category || 'Other')
        .split(';')
        .map(c => c.trim())
        .filter(Boolean);
      let newCats: string[];
      if (currentCats.includes('Theme Songs')) {
        // Remove Theme Songs; keep remaining categories (fallback to Other)
        newCats = currentCats.filter(c => c !== 'Theme Songs');
        if (newCats.length === 0) newCats = ['Other'];
      } else {
        // Add Theme Songs to existing categories
        newCats = [...currentCats, 'Theme Songs'];
      }
      
      const newCategoryStr = newCats.join(';');
      
      // Optimistically update the state to prevent full screen refresh
      setPostedSongs(prev => prev.map(s => s.id === song.id ? { ...s, category: newCategoryStr } : s));

      await SalesforceService.updateWorshipSong(song.id, { category: newCategoryStr });
    } catch (e: any) {
      Alert.alert('Error', 'Failed to toggle theme status.');
      // Revert/refresh on error
      fetchPostedSongs();
    }
  };

  const renderSongItem = ({ item, index }: { item: WorshipSong & { displayNumber?: number }; index: number }) => {
    const isTheme = (item.category || '').split(';').map(c => c.trim()).includes('Theme Songs');
    const displayNum = item.displayNumber ?? index + 1;
    return (
      <View style={styles.songItem}>
        <View style={styles.songIconBox}>
          <Music size={16} color="#3b82f6" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.songItemTitle} numberOfLines={1}>{displayNum}. {item.title}</Text>
          <Text style={styles.songItemSub} numberOfLines={1}>
            {item.category || 'Other'}
          </Text>
        </View>
        <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
          <TouchableOpacity 
            onPress={() => handleToggleTheme(item)} 
            style={{ 
              paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12, borderWidth: 1, 
              borderColor: isTheme ? '#f59e0b' : '#e2e8f0', 
              backgroundColor: isTheme ? '#fef3c7' : '#f8fafc',
              flexDirection: 'row', alignItems: 'center', gap: 4 
            }}>
            <Star size={12} color={isTheme ? "#d97706" : "#94a3b8"} fill={isTheme ? "#f59e0b" : "none"} />
            <Text style={{ fontSize: 10, fontWeight: '700', color: isTheme ? '#d97706' : '#64748b' }}>
              {isTheme ? 'THEME SONG' : 'MAKE THEME'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => openEdit(item)} style={{ padding: 4 }}>
            <Pencil size={15} color="#3b82f6" />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => handleDeleteSong(item.id, item.title)} style={{ padding: 4 }}>
            <Trash2 size={16} color="#ef4444" />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  // ── POST SONG FORM UI ────────────────────────────
  const renderPostForm = () => (
    <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>SONG DETAILS</Text>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>SONG TITLE (ENGLISH) · ఆంగ్ల శీర్షిక *</Text>
          <TextInput style={styles.textInput} placeholder="E.g. Amazing Grace..."
            placeholderTextColor="#94a3b8" value={titleEn} onChangeText={setTitleEn} />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>SONG TITLE (TELUGU) · తెలుగు శీర్షిక</Text>
          <TextInput style={styles.textInput} placeholder="ఉదాహరణ: అద్భుతమైన కృప..."
            placeholderTextColor="#94a3b8" value={titleTe} onChangeText={setTitleTe} />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>YOUTUBE VIDEO LINK · యూట్యూబ్ లింక్</Text>
          <TextInput style={styles.textInput} placeholder="E.g. dQw4w9WgXcQ or https://youtu.be/..."
            placeholderTextColor="#94a3b8" value={youtubeId} onChangeText={setYoutubeId} />
        </View>

        {/* Artist */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>ARTIST / BAND</Text>
          <TextInput style={styles.textInput} placeholder="COG Worship..."
            placeholderTextColor="#94a3b8" value={artist} onChangeText={setArtist} />
        </View>

        {/* Categories Multi-select */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>CATEGORIES (tap to select multiple)</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 }}>
            {CATEGORIES.map(cat => {
              const isThemeCat = cat === 'Theme Songs';
              const isSelected = categories.includes(cat);
              return (
                <TouchableOpacity
                  key={cat}
                  style={[{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1.5,
                    borderColor: isSelected ? (isThemeCat ? '#f59e0b' : (isDark ? '#3b82f6' : '#1a2d5a')) : (isDark ? '#334155' : '#e2e8f0'),
                    backgroundColor: isSelected ? (isThemeCat ? (isDark ? '#78350f' : '#fef3c7') : (isDark ? '#3b82f6' : '#1a2d5a')) : (isDark ? '#1e293b' : '#f8fafc') }]}
                  onPress={() => {
                    setCategories(prev =>
                      prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]
                    );
                  }}
                >
                  <Text style={{ fontSize: 11, fontWeight: '700',
                    color: isSelected ? (isThemeCat ? (isDark ? '#fcd34d' : '#d97706') : '#fff') : (isDark ? '#94a3b8' : '#64748b') }}>{cat}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
          <Text style={{ fontSize: 10, color: '#94a3b8', marginTop: 6, fontStyle: 'italic' }}>
            ⭐ Select "Theme Songs" to make this song appear in the Member Theme Songs tab.
          </Text>
        </View>



        <View style={styles.inputGroup}>
          <Text style={styles.label}>SONG LYRICS & SCRIPTS · సాహిత్యం *</Text>
          <TextInput
            style={[styles.textInput, { height: 200, textAlignVertical: 'top', paddingTop: 12 }]}
            placeholder={`Verse 1:\nAmazing grace! How sweet the sound...\n\nChorus:\nMy chains are gone, I've been set free...`}
            placeholderTextColor="#94a3b8" multiline value={lyrics} onChangeText={setLyrics}
          />
        </View>

        <View style={styles.statusSelectRow}>
          <Text style={styles.statusLabel}>Publish Status</Text>
          <View style={styles.statusBtnGroup}>
            <TouchableOpacity style={[styles.statusBtn, status === 'Published' && styles.statusBtnActive]}
              onPress={() => setStatus('Published')}>
              <Text style={[styles.statusBtnTxt, status === 'Published' && styles.statusBtnTxtActive]}>Published</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.statusBtn, status === 'Draft' && styles.statusBtnActiveDraft]}
              onPress={() => setStatus('Draft')}>
              <Text style={[styles.statusBtnTxt, status === 'Draft' && styles.statusBtnTxtActive]}>Draft</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>


      <TouchableOpacity style={[styles.saveBtn, submitting && { backgroundColor: '#94a3b8' }]}
        onPress={handlePublishSong} disabled={submitting}>
        {submitting
          ? <ActivityIndicator size="small" color="#fff" />
          : <><Save size={18} color="#fff" /><Text style={styles.saveBtnTxt}>Publish Song Lyrics</Text></>
        }
      </TouchableOpacity>
      <View style={{ height: 60 }} />
    </ScrollView>
  );

  // ── POSTED SONGS LIST UI ─────────────────────────
  const renderPostedList = () => (
    <View style={{ flex: 1 }}>
      {loadingList ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color="#c0392b" />
        </View>
      ) : (
        <FlatList
          data={(() => {
            const categoryFiltered = postedSongs.filter(s => {
              const cats = (s.category || 'Other').split(';').map(c => c.trim()).filter(Boolean);
              const matchesCat = selectedCategory === 'All' || cats.includes(selectedCategory);
              
              if (screenTab === 'theme') {
                return matchesCat && cats.includes('Theme Songs');
              }
              if (cats.length === 1 && cats[0] === 'Theme Songs') return false;
              return matchesCat;
            });
            
            return categoryFiltered
              .map((s, idx) => ({ ...s, displayNumber: idx + 1 }))
              .filter(s => {
                const q = listSearchQuery.toLowerCase().trim();
                if (!q) return true;
                if (q === s.displayNumber.toString()) return true;
                return s.title.toLowerCase().includes(q) || 
                       (s.titleTe && s.titleTe.toLowerCase().includes(q)) ||
                       (s.artist && s.artist.toLowerCase().includes(q));
              });
          })()}
          keyExtractor={(item) => item.id}
          renderItem={renderSongItem}
          contentContainerStyle={{ padding: 16, paddingBottom: 60 }}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={(
            <>
              <View style={styles.listHeaderRow}>
                <Text style={styles.listHeaderTitle}>{screenTab === 'theme' ? 'Theme Songs' : 'All Worship Songs'}</Text>
                <View style={styles.countBadge}>
                  <Text style={styles.countTxt}>{postedSongs.length} Total</Text>
                </View>
              </View>
              <View style={{ marginBottom: 16 }}>
                <TextInput
                  style={styles.textInput}
                  placeholder="Search songs by title..."
                  placeholderTextColor="#94a3b8"
                  value={listSearchQuery}
                  onChangeText={setListSearchQuery}
                />
              </View>
            </>
          )}
          ListEmptyComponent={() => (
            <View style={{ padding: 40, alignItems: 'center' }}>
              <Music size={44} color="#cbd5e1" />
              <Text style={{ fontSize: 15, fontWeight: '800', color: '#1a2d5a', marginTop: 12 }}>No songs yet</Text>
              <Text style={{ fontSize: 12, color: '#94a3b8', marginTop: 4 }}>Post your first song using the "Post Song" tab.</Text>
            </View>
          )}
          refreshing={loadingList}
          onRefresh={fetchPostedSongs}
        />
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* Header */}
      <LinearGradient colors={['#1a2d5a', '#3b82f6']} style={styles.headerOuter}>
        <LinearGradient colors={['#1a2d5a', '#23314d']} style={styles.headerInner}>
          <View style={{ flexDirection: 'row', alignItems: 'center', width: '100%', justifyContent: 'space-between', position: 'relative', paddingLeft: 40 }}>
            <TouchableOpacity onPress={openDrawer} style={{ position: 'absolute', left: 0, padding: 4, zIndex: 10 }}>
              <Menu size={26} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Song Manager</Text>
            <TouchableOpacity onPress={() => setShowPostModal(true)} style={{ backgroundColor: '#f59e0b', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, flexDirection: 'row', alignItems: 'center', elevation: 2, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 3 }}>
              <Text style={{ color: '#fff', fontSize: 12, fontWeight: '800' }}>+ New Song</Text>
            </TouchableOpacity>
          </View>
        </LinearGradient>
      </LinearGradient>

      {/* Screen Tabs */}
      <View style={styles.screenTabBar}>
        <TouchableOpacity
          style={[styles.screenTab, screenTab === 'list' && styles.screenTabActive]}
          onPress={() => setScreenTab('list')}>
          <List size={14} color={screenTab === 'list' ? '#fff' : '#64748b'} />
          <Text style={[styles.screenTabTxt, screenTab === 'list' && styles.screenTabTxtActive]}>All Songs</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.screenTab, screenTab === 'theme' && styles.screenTabActive]}
          onPress={() => setScreenTab('theme')}>
          <Star size={14} color={screenTab === 'theme' ? '#fff' : '#64748b'} />
          <Text style={[styles.screenTabTxt, screenTab === 'theme' && styles.screenTabTxtActive]}>Theme Songs</Text>
        </TouchableOpacity>
      </View>

      {/* Category Chips */}
      <View style={{ height: 44, marginBottom: 10 }}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.chipScroll}
          contentContainerStyle={{ paddingHorizontal: 16, gap: 8, alignItems: 'center' }}>
          {['All', ...CATEGORIES].map(cat => (
            <TouchableOpacity
              key={cat}
              style={[styles.chip, selectedCategory === cat && styles.chipActive]}
              onPress={() => setSelectedCategory(cat)}>
              <Text style={[styles.chipTxt, selectedCategory === cat && styles.chipTxtActive]}>{cat}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Content */}
      {renderPostedList()}

      {/* Post Song Modal */}
      <Modal visible={showPostModal} animationType="slide" onRequestClose={() => setShowPostModal(false)}>
        <SafeAreaView style={{ flex: 1, backgroundColor: isDark ? '#0f172a' : '#f1f5f9' }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderColor: isDark ? '#334155' : '#e2e8f0', backgroundColor: isDark ? '#1e293b' : '#fff' }}>
            <Text style={{ fontSize: 18, fontWeight: '800', color: isDark ? '#fff' : '#1a2d5a' }}>Create New Song</Text>
            <TouchableOpacity onPress={() => setShowPostModal(false)} style={{ padding: 4, backgroundColor: isDark ? '#334155' : '#f1f5f9', borderRadius: 16 }}>
              <X size={20} color={isDark ? '#94a3b8' : '#64748b'} />
            </TouchableOpacity>
          </View>
          {renderPostForm()}
        </SafeAreaView>
      </Modal>

      {/* ── Category Picker Modal (kept but unused now – categories use inline chips) ── */}

      {/* ── Edit Song Modal ── */}
      {editingSong && (
        <Modal transparent animationType="slide" visible onRequestClose={() => setEditingSong(null)}>
          <View style={styles.editModalBg}>
            <View style={styles.editModalCard}>
              <View style={styles.editModalHeader}>
                <Text style={styles.editModalTitle}>Edit Song</Text>
                <TouchableOpacity onPress={() => setEditingSong(null)} style={styles.editCloseBtn}>
                  <X size={20} color="#475569" />
                </TouchableOpacity>
              </View>

              <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }}>
                <View style={{ padding: 20 }}>
                  <Text style={styles.label}>TITLE (ENGLISH) *</Text>
                  <TextInput style={[styles.textInput, { marginBottom: 14 }]} value={editTitle}
                    onChangeText={setEditTitle} placeholder="Song title..." placeholderTextColor="#94a3b8" />

                  <Text style={styles.label}>TITLE (TELUGU)</Text>
                  <TextInput style={[styles.textInput, { marginBottom: 14 }]} value={editTitleTe}
                    onChangeText={setEditTitleTe} placeholder="తెలుగు శీర్షిక..." placeholderTextColor="#94a3b8" />

                  <Text style={styles.label}>ARTIST</Text>
                  <TextInput style={[styles.textInput, { marginBottom: 14 }]} value={editArtist}
                    onChangeText={setEditArtist} placeholder="COG Worship..." placeholderTextColor="#94a3b8" />

                  {/* Edit Categories multi-select */}
                  <Text style={[styles.label, { marginBottom: 6 }]}>CATEGORIES (tap to toggle)</Text>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 6 }}>
                    {CATEGORIES.map(cat => {
                      const isThemeCat = cat === 'Theme Songs';
                      const isSelected = editCategories.includes(cat);
                      return (
                        <TouchableOpacity
                          key={cat}
                          style={[{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1.5,
                            borderColor: isSelected ? (isThemeCat ? '#f59e0b' : '#1a2d5a') : '#e2e8f0',
                            backgroundColor: isSelected ? (isThemeCat ? '#fef3c7' : '#1a2d5a') : '#f8fafc' }]}
                          onPress={() => {
                            setEditCategories(prev =>
                              prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]
                            );
                          }}
                        >
                          <Text style={{ fontSize: 11, fontWeight: '700',
                            color: isSelected ? (isThemeCat ? '#d97706' : '#fff') : '#64748b' }}>{cat}</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                  <Text style={{ fontSize: 10, color: '#94a3b8', marginBottom: 14, fontStyle: 'italic' }}>
                    ⭐ Select "Theme Songs" to show this song in the Member Theme Songs tab.
                  </Text>



                  <Text style={styles.label}>YOUTUBE ID / LINK</Text>
                  <TextInput style={[styles.textInput, { marginBottom: 14 }]} value={editYoutubeId}
                    onChangeText={setEditYoutubeId} placeholder="YouTube ID..." placeholderTextColor="#94a3b8" />

                  <Text style={styles.label}>LYRICS *</Text>
                  <TextInput
                    style={[styles.textInput, { height: 180, textAlignVertical: 'top', paddingTop: 12, marginBottom: 20 }]}
                    value={editLyrics} onChangeText={setEditLyrics}
                    placeholder="Song lyrics..." placeholderTextColor="#94a3b8" multiline
                  />

                  <TouchableOpacity style={[styles.saveBtn, savingEdit && { backgroundColor: '#94a3b8' }]}
                    onPress={handleSaveEdit} disabled={savingEdit}>
                    {savingEdit
                      ? <ActivityIndicator size="small" color="#fff" />
                      : <><Save size={18} color="#fff" /><Text style={styles.saveBtnTxt}>Save Changes</Text></>
                    }
                  </TouchableOpacity>
                  <View style={{ height: 30 }} />
                </View>
              </ScrollView>
            </View>
          </View>

          {/* Edit Category Picker removed – using inline chips above */}
          {/* Edit Key Picker */}
          {showEditKeyPicker && (
            <Modal transparent animationType="fade" visible onRequestClose={() => setShowEditKeyPicker(false)}>
              <TouchableOpacity style={styles.modalOverlay} activeOpacity={1}
                onPress={() => setShowEditKeyPicker(false)}>
                <View style={styles.pickerModalBox}>
                  <Text style={styles.pickerModalTitle}>Select Key</Text>
                  <ScrollView>
                    {KEYS.map(k => (
                      <TouchableOpacity key={k} style={styles.pickerModalItem}
                        onPress={() => { setEditKey(k); setShowEditKeyPicker(false); }}>
                        <Text style={[styles.pickerModalTxt, editKey === k && { color: '#c0392b', fontWeight: '800' }]}>{k}</Text>
                        {editKey === k && <CheckCircle size={16} color="#c0392b" />}
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              </TouchableOpacity>
            </Modal>
          )}
        </Modal>
      )}

      {/* ── Delete Confirmation Modal ── */}
      {songToDelete && (
        <Modal transparent visible animationType="fade">
          <View style={styles.successBg}>
            <View style={styles.successCard}>
              <View style={[styles.successIconOuter, { backgroundColor: '#fee2e2' }]}>
                <View style={[styles.successIconInner, { backgroundColor: '#ef4444', shadowColor: '#ef4444' }]}>
                  <Trash2 size={36} color="#fff" />
                </View>
              </View>
              <Text style={styles.successTitle}>Delete Song?</Text>
              <Text style={styles.successDesc}>
                Are you sure you want to delete <Text style={{ fontWeight: '800', color: '#ef4444' }}>"{songToDelete.title}"</Text>? This action cannot be undone.
              </Text>
              <View style={{ flexDirection: 'row', gap: 12, marginTop: 10, width: '100%' }}>
                <TouchableOpacity style={[styles.successActionBtn, { flex: 1, backgroundColor: '#f1f5f9' }]} onPress={() => setSongToDelete(null)}>
                  <Text style={[styles.successActionTxt, { color: '#475569' }]}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.successActionBtn, { flex: 1, backgroundColor: '#ef4444' }]} onPress={confirmDeleteSong}>
                  <Text style={styles.successActionTxt}>Delete</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}

      {/* ── Delete Success Modal ── */}
      {showDeleteSuccess && (
        <Modal transparent visible animationType="fade">
          <View style={styles.successBg}>
            <View style={styles.successCard}>
              <View style={[styles.successIconOuter, { backgroundColor: '#fee2e2' }]}>
                <View style={[styles.successIconInner, { backgroundColor: '#ef4444', shadowColor: '#ef4444' }]}>
                  <Trash2 size={36} color="#fff" />
                </View>
              </View>
              <Text style={styles.successTitle}>Song Deleted</Text>
              <Text style={styles.successDesc}>
                "{deletedSongTitle}" has been successfully removed from your songbook.
              </Text>
              <TouchableOpacity style={[styles.successActionBtn, { backgroundColor: '#ef4444' }]} onPress={() => setShowDeleteSuccess(false)}>
                <Text style={styles.successActionTxt}>Got It</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}

      {/* ── Success Modal ── */}
      {showSuccess && (
        <Modal transparent visible animationType="fade">
          <View style={styles.successBg}>
            <View style={styles.successCard}>
              <View style={styles.successIconOuter}>
                <View style={styles.successIconInner}>
                  <CheckCircle size={36} color="#fff" />
                </View>
              </View>
              <Text style={styles.successTitle}>Publication Successful!</Text>
              <Text style={styles.successDesc}>
                "{titleEn}" has been published under <Text style={{ fontWeight: '800', color: isDark ? '#38bdf8' : '#1a2d5a' }}>{categories.join(', ') || 'Other'}</Text>!
              </Text>
              <TouchableOpacity style={styles.successActionBtn} onPress={() => { setShowSuccess(false); resetForm(); setShowPostModal(false); fetchPostedSongs(); }}>
                <Text style={styles.successActionTxt}>Close & View Songs</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.successSecBtn} onPress={() => { setShowSuccess(false); resetForm(); }}>
                <Text style={styles.successSecTxt}>Post Another Song</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
}

function getStyles(colors: any, isDark: boolean) { return StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  headerOuter: { borderBottomLeftRadius: 30, borderBottomRightRadius: 30, marginBottom: 10, marginHorizontal: 0, marginTop: -20, paddingBottom: 4 },
  headerInner: { padding: 15, paddingTop: Platform.OS === 'ios' ? 60 : 40, borderBottomLeftRadius: 30, borderBottomRightRadius: 30 },
  headerTitle: { fontSize: 20, fontWeight: '800', color: '#fff' },

  // Screen Tab Bar
  screenTabBar: {
    flexDirection: 'row',
    backgroundColor: isDark ? '#1e293b' : '#f8fafc',
    margin: 16,
    borderRadius: 25,
    padding: 4,
    gap: 4,
    borderWidth: 1,
    borderColor: colors.border
  },
  screenTab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 10, borderRadius: 21, gap: 6 },
  screenTabActive: { backgroundColor: isDark ? '#3b82f6' : '#1a2d5a' },
  screenTabTxt: { fontSize: 13, fontWeight: '700', color: isDark ? '#94a3b8' : '#64748b' },
  screenTabTxtActive: { color: '#fff' },

  chipScroll: { flexGrow: 0 },
  chip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: isDark ? '#1e293b' : '#f1f5f9', borderWidth: 1, borderColor: isDark ? '#334155' : '#e2e8f0', height: 36, justifyContent: 'center' },
  chipActive: { backgroundColor: isDark ? '#3b82f6' : '#1a2d5a', borderColor: isDark ? '#3b82f6' : '#1a2d5a' },
  chipTxt: { fontSize: 13, fontWeight: '600', color: isDark ? '#94a3b8' : '#64748b' },
  chipTxtActive: { color: '#fff', fontWeight: '800' },

  scroll: { padding: 16 },
  card: { backgroundColor: colors.card, borderRadius: 16, padding: 20, marginBottom: 16, elevation: 3, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 5, borderWidth: 1, borderColor: colors.border },
  sectionTitle: { fontSize: 12, fontWeight: '800', color: isDark ? '#bfdbfe' : '#1a2d5a', letterSpacing: 1, marginBottom: 20 },

  inputGroup: { marginBottom: 16 },
  row: { flexDirection: 'row', alignItems: 'flex-start' },
  label: { fontSize: 10, fontWeight: '800', color: colors.text, marginBottom: 8, letterSpacing: 0.5 },
  textInput: {
    backgroundColor: isDark ? '#1e293b' : '#f8fafc', borderWidth: 1, borderColor: colors.border,
    borderRadius: 8, paddingHorizontal: 14, height: 48, fontSize: 13, color: colors.text, fontWeight: '600'
  },
  pickerBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: isDark ? '#1e293b' : '#f8fafc', borderWidth: 1, borderColor: colors.border, borderRadius: 8, paddingHorizontal: 12, height: 48 },
  pickerTxt: { fontSize: 13, color: colors.text, fontWeight: '700', flex: 1 },

  statusSelectRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 },
  statusLabel: { fontSize: 13, color: colors.text, fontWeight: '700' },
  statusBtnGroup: { flexDirection: 'row', gap: 8 },
  statusBtn: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 8, backgroundColor: isDark ? '#1e293b' : '#f1f5f9' },
  statusBtnActive: { backgroundColor: isDark ? '#3b82f6' : '#1a2d5a' },
  statusBtnActiveDraft: { backgroundColor: isDark ? '#4b5563' : '#64748b' },
  statusBtnTxt: { fontSize: 12, color: isDark ? '#cbd5e1' : '#475569', fontWeight: '700' },
  statusBtnTxtActive: { color: '#fff' },

  infoBox: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: isDark ? '#064e3b' : '#ecfdf5', padding: 15, borderRadius: 12, borderWidth: 0.5, borderColor: isDark ? '#059669' : '#a7f3d0', marginBottom: 20 },
  infoText: { flex: 1, fontSize: 11, color: isDark ? '#a7f3d0' : '#065f46', lineHeight: 18, fontWeight: '500' },

  saveBtn: { alignSelf: 'center', width: '75%', backgroundColor: isDark ? '#10b981' : '#059669', height: 54, borderRadius: 30, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, elevation: 4, shadowColor: isDark ? '#10b981' : '#059669', shadowOpacity: 0.3, shadowRadius: 5 },
  saveBtnTxt: { color: '#fff', fontSize: 14, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5 },

  // List
  listHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  listHeaderTitle: { fontSize: 15, fontWeight: '800', color: isDark ? '#fff' : '#1a2d5a' },
  countBadge: { backgroundColor: isDark ? '#064e3b' : '#ecfdf5', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12 },
  countTxt: { fontSize: 11, fontWeight: '800', color: isDark ? '#a7f3d0' : '#059669' },
  songItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.card, borderRadius: 12, padding: 14, marginBottom: 10, elevation: 2, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 3, borderWidth: 1, borderColor: colors.border },
  songIconBox: { width: 36, height: 36, borderRadius: 10, backgroundColor: isDark ? '#1e293b' : '#f0f4ff', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  songItemTitle: { fontSize: 13, fontWeight: '700', color: colors.text },
  songItemSub: { fontSize: 11, color: isDark ? '#94a3b8' : '#64748b', marginTop: 2, fontWeight: '500' },
  editBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: isDark ? '#1e293b' : '#f0f4ff', justifyContent: 'center', alignItems: 'center' },

  // Picker Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.6)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  pickerModalBox: { backgroundColor: colors.card, borderRadius: 16, width: '100%', maxWidth: 320, maxHeight: '65%', paddingVertical: 15, elevation: 10 },
  pickerModalTitle: { fontSize: 13, fontWeight: '800', color: isDark ? '#94a3b8' : '#64748b', paddingHorizontal: 20, paddingBottom: 15, borderBottomWidth: 1, borderBottomColor: colors.border, marginBottom: 5, letterSpacing: 0.5 },
  pickerModalItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 20, borderBottomWidth: 1, borderBottomColor: colors.border },
  pickerModalTxt: { fontSize: 15, color: colors.text, fontWeight: '600' },

  // Edit Modal
  editModalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  editModalCard: { backgroundColor: colors.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, height: height * 0.88 },
  editModalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: colors.border },
  editModalTitle: { fontSize: 17, fontWeight: '900', color: colors.text },
  editCloseBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: isDark ? '#1e293b' : '#f1f5f9', justifyContent: 'center', alignItems: 'center' },

  // Success Modal
  successBg: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.75)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  successCard: { backgroundColor: colors.card, borderRadius: 24, padding: 24, width: '100%', maxWidth: 400, alignItems: 'center', elevation: 10 },
  successIconOuter: { width: 80, height: 80, borderRadius: 40, backgroundColor: isDark ? '#064e3b' : '#ecfdf5', justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  successIconInner: { width: 60, height: 60, borderRadius: 30, backgroundColor: '#10b981', justifyContent: 'center', alignItems: 'center' },
  successTitle: { fontSize: 20, fontWeight: '900', color: colors.text, marginBottom: 8, textAlign: 'center' },
  successDesc: { fontSize: 13, color: isDark ? '#cbd5e1' : '#475569', textAlign: 'center', lineHeight: 20, marginBottom: 20 },
  summaryBox: { backgroundColor: isDark ? '#1e293b' : '#f8fafc', borderRadius: 12, padding: 14, width: '100%', borderWidth: 1, borderColor: colors.border, marginBottom: 20 },
  summaryLbl: { fontSize: 9, fontWeight: '800', color: isDark ? '#94a3b8' : '#94a3b8', letterSpacing: 0.5, marginBottom: 6 },
  receiptText: { fontSize: 11, color: isDark ? '#cbd5e1' : '#64748b', marginTop: 2 },
  successActionBtn: { backgroundColor: isDark ? '#3b82f6' : '#1a2d5a', height: 48, borderRadius: 12, width: '100%', justifyContent: 'center', alignItems: 'center', marginBottom: 10 },
  successActionTxt: { color: '#fff', fontSize: 13, fontWeight: '800' },
  successSecBtn: { height: 48, borderRadius: 12, width: '100%', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: colors.border },
  successSecTxt: { color: colors.text, fontSize: 13, fontWeight: '800' },
});
}
