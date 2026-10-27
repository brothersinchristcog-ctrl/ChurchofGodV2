import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, StatusBar, Platform } from 'react-native';
import { ArrowLeft, Bookmark, CheckCircle, Info, ChevronLeft, ChevronRight } from 'lucide-react-native';
import { useTheme } from '../context/ThemeContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Svg, { Defs, LinearGradient, Stop, Rect } from 'react-native-svg';

const SONGBOOK_KEY = 'cog_my_songbook_ids';

export default function SongViewScreen({ route, navigation }: any) {
  const { songs = [], initialIndex = 0 } = route.params;
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const song = songs[currentIndex];
  const { isDark } = useTheme();
  const scrollViewRef = useRef<ScrollView>(null);
  
  const handlePrev = () => {
    setCurrentIndex((prev: number) => Math.max(0, prev - 1));
    scrollViewRef.current?.scrollTo({ y: 0, animated: true });
  };
  
  const handleNext = () => {
    setCurrentIndex((prev: number) => Math.min(songs.length - 1, prev + 1));
    scrollViewRef.current?.scrollTo({ y: 0, animated: true });
  };
  
  const [savedIds, setSavedIds] = useState<string[]>([]);
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

  useEffect(() => {
    const loadSavedIds = async () => {
      try {
        const raw = await AsyncStorage.getItem(SONGBOOK_KEY);
        if (raw) setSavedIds(JSON.parse(raw));
      } catch { /* ignore */ }
    };
    loadSavedIds();
  }, []);

  const toggleSave = async () => {
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

  const isSaved = savedIds.includes(song.id);

  return (
    <View style={[styles.container, { backgroundColor: isDark ? '#0f172a' : '#f8fafc' }]}>
      <StatusBar barStyle="light-content" backgroundColor="#1a2d5a" />

      <ScrollView ref={scrollViewRef} showsVerticalScrollIndicator={false}>
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
                  <Text style={styles.pageTitle} numberOfLines={1}>{song.title}</Text>
                  <Text style={styles.pageSub} numberOfLines={1}>{song.category || 'Other'}</Text>
                </View>
                <TouchableOpacity 
                  style={[styles.bookmarkBtn, isSaved && styles.bookmarkBtnActive]}
                  onPress={toggleSave}
                >
                  <Bookmark size={20} color={isSaved ? '#fff' : '#fff'} />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.scrollContent}>


        <Text style={[styles.modalSecHeader, { color: isDark ? '#94a3b8' : '#1a2d5a' }]}>LYRICS & SCRIPTS · సాహిత్యం</Text>
        <View style={[styles.lyricsBox, { backgroundColor: isDark ? '#1e293b' : '#fff' }]}>
          <Text style={[styles.lyricsText, { color: isDark ? '#e2e8f0' : '#334155' }]}>
            {song.lyrics || 'Lyrics are being updated by the administrator. Please check back soon.'}
          </Text>

          <View style={[styles.navBadge, { backgroundColor: '#1a2d5a' }]}>
            <TouchableOpacity 
              style={styles.navBtn} 
              onPress={handlePrev}
              disabled={currentIndex === 0}
            >
              <ChevronLeft size={24} color={currentIndex === 0 ? 'rgba(255,255,255,0.3)' : '#fff'} />
            </TouchableOpacity>
            
            <Text style={[styles.navCount, { color: '#fff' }]}>
              Song {currentIndex + 1} of {songs.length}
            </Text>
            
            <TouchableOpacity 
              style={styles.navBtn} 
              onPress={handleNext}
              disabled={currentIndex === songs.length - 1}
            >
              <ChevronRight size={24} color={currentIndex === songs.length - 1 ? 'rgba(255,255,255,0.3)' : '#fff'} />
            </TouchableOpacity>
          </View>
        </View>
        <View style={{ height: 60 }} />
        </View>
      </ScrollView>

      {/* ── Custom Toast Modal ── */}
      {toast.visible && (
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
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerWrapper: { width: '100%', position: 'relative', zIndex: 10 },
  headerShadowWrapper: { shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.4, shadowRadius: 20, elevation: 15, borderBottomLeftRadius: 35, borderBottomRightRadius: 35, backgroundColor: '#1a2d5a' },
  gradientBorderContainer: { borderBottomLeftRadius: 35, borderBottomRightRadius: 35, overflow: 'hidden' },
  pageHeader: { backgroundColor: '#1a2d5a', paddingHorizontal: 16, paddingTop: Platform.OS === 'ios' ? 60 : 40, paddingBottom: 15, marginBottom: 4, flexDirection: 'row', alignItems: 'center', borderBottomLeftRadius: 33, borderBottomRightRadius: 33, overflow: 'hidden' },
  backBtn: { padding: 4, width: 40, alignItems: 'flex-start' },
  titleCol: { flex: 1, alignItems: 'center', paddingHorizontal: 10 },
  pageTitle: { color: '#fff', fontSize: 18, fontWeight: '800' },
  pageSub: { color: 'rgba(255,255,255,0.7)', fontSize: 12, marginTop: 1, fontWeight: '600', textTransform: 'uppercase' },
  bookmarkBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center' },
  bookmarkBtnActive: { backgroundColor: '#c0392b' },
  scrollContent: { padding: 16 },
  navBadge: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 8, borderRadius: 30, marginTop: 20, marginBottom: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 8, elevation: 5 },
  navBtn: { padding: 8, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.1)' },
  navCount: { fontSize: 14, fontWeight: '700' },
  modalSecHeader: { fontSize: 11, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 12, marginLeft: 4 },
  lyricsBox: { borderRadius: 16, padding: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 3 },
  lyricsText: { fontSize: 15, lineHeight: 28, fontWeight: '500', fontStyle: 'italic' },
  toastBg: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center', zIndex: 999 },
  toastCard: { width: '80%', backgroundColor: '#fff', borderRadius: 20, padding: 25, alignItems: 'center', elevation: 5, shadowColor: '#000', shadowOpacity: 0.1, shadowOffset: { width: 0, height: 4 }, shadowRadius: 10 },
  toastIcon: { marginBottom: 15 },
  toastTitle: { fontSize: 20, fontWeight: '800', color: '#1e293b', marginBottom: 8, textAlign: 'center' },
  toastDesc: { fontSize: 14, color: '#64748b', textAlign: 'center', lineHeight: 22 },
});
