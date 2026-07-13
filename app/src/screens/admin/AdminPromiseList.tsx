import React, { useState, useEffect, useContext } from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  TouchableOpacity, 
  ActivityIndicator, 
  Platform, 
  StatusBar,
  ScrollView,
  Dimensions
} from 'react-native';
import { BookOpen, Languages, Play, AlertCircle, Plus } from 'lucide-react-native';
import { AdminTabContext } from '../../context/AdminTabContext';

import SalesforceService, { DailyPromise } from '../../services/SalesforceService';

const { width } = Dimensions.get('window');

export default function AdminPromiseList() {
  const { setActiveTab, setEditingData } = useContext(AdminTabContext);
  const [promises, setPromises] = useState<DailyPromise[]>([]);
  const [loading, setLoading] = useState(true);
  const [missingDates, setMissingDates] = useState<number[]>([]);
  
  // Use local date (YYYY-MM-DD) instead of UTC to avoid timezone mismatches
  const todayStr = new Date().toLocaleDateString('en-CA'); 
  const currentMonthShort = new Date().toLocaleString('default', { month: 'short' });

  const handleEdit = (item: DailyPromise) => {
    setEditingData(item);
    setActiveTab(1); // Go to Editor tab
  };

  const handleView = (item: DailyPromise) => {
    setEditingData(item);
    setActiveTab(5); // Go to App Preview tab
  };

  useEffect(() => {
    loadPromises();
  }, []);

  const loadPromises = async () => {
    setLoading(true);
    try {
      const data = await SalesforceService.getAdminPromises();
      setPromises(data);
      
      const now = new Date();
      const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
      const existingDates = new Set(data.map(p => p.date));
      const missing: number[] = [];
      for (let d = 1; d <= daysInMonth; d++) {
        const dStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        if (!existingDates.has(dStr)) missing.push(d);
      }
      setMissingDates(missing);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const todayPromise = promises.find(p => p.date === todayStr);
  const upcoming = promises.filter(p => p.date && p.date > todayStr).sort((a,b) => (a.date || '').localeCompare(b.date || ''));
  const past = promises.filter(p => p.date && p.date < todayStr).sort((a,b) => (b.date || '').localeCompare(a.date || ''));

  if (loading && promises.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FCD34D" />
      </View>
    );
  }

  const stripHtml = (html: string) => {
    if (!html) return '';
    return html
      .replace(/<[^>]*>?/gm, '')
      .replace(/&#39;/g, "'")
      .replace(/&quot;/g, '"')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>');
  };

  const renderCard = (item: DailyPromise, type: 'today' | 'upcoming' | 'past') => {
    const isMissingTe = !item.verseTelugu;
    const isMissingLink = !item.youtubeId;

    return (
      <View key={item.id} style={[styles.pCard, type === 'today' && styles.todayCard]}>
        <View style={styles.pCardHd}>
          <View style={{ flex: 1 }}>
            <Text style={styles.pDate}>{type === 'today' ? 'Today — ' : ''}{item.date}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 }}>
              <Text style={[styles.pDate, { fontSize: 10, color: '#9CA3AF', backgroundColor: '#f3f4f6', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }]}>
                {item.verseReferenceEn || item.verseReference || 'ID Missing'}
                {item.verseReferenceTe ? ` | ${item.verseReferenceTe}` : ''}
              </Text>
              {item.pastor ? <Text style={{ fontSize: 10, fontWeight: '700', color: '#c0392b' }}>• {item.pastor}</Text> : null}
            </View>
          </View>
          <View style={[
            styles.statusBadge, 
            type === 'today' ? styles.statusLive : (item.status === 'Draft' ? styles.statusDraft : (type === 'past' ? styles.statusPub : styles.statusSch))
          ]}>
            <Text style={styles.statusBadgeTxt}>
              {type === 'today' ? 'Live now' : (item.status || 'Published').toUpperCase()}
            </Text>
          </View>
        </View>

        <Text style={styles.pVerseEn} numberOfLines={2}>"{stripHtml(item.verse)}"</Text>
        {item.verseTelugu ? (
          <Text style={styles.pVerseTe} numberOfLines={2}>"{stripHtml(item.verseTelugu)}"</Text>
        ) : null}
        
        {item.videoTitle ? (
          <Text style={styles.pVideoTitle} numberOfLines={1}>🎬 {stripHtml(item.videoTitle)}</Text>
        ) : null}

        <View style={styles.pCardFoot}>
          <View style={styles.assetIcons}>
            <View style={styles.assetBox}><Text style={styles.assetTxt}>📖 English ✓</Text></View>
            <View style={styles.assetBox}>
              <Text style={[styles.assetTxt, isMissingTe && { color: '#c0392b' }]}>
                🇮🇳 {isMissingTe ? 'te Missing' : 'Telugu ✓'}
              </Text>
            </View>
            <View style={styles.assetBox}>
              <Text style={[styles.assetTxt, isMissingLink && { color: '#c0392b' }]}>
                ▶️ {isMissingLink ? 'No link' : 'YouTube ✓'}
              </Text>
            </View>
          </View>
          <TouchableOpacity onPress={() => type === 'past' ? handleView(item) : handleEdit(item)}>
            <Text style={styles.actionLink}>{type === 'past' ? 'View —' : 'Edit —'}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        
        {/* Header Section */}
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Daily Promises</Text>
            <Text style={styles.subtitle}>English + Telugu · YouTube links</Text>
          </View>
          <TouchableOpacity style={styles.newBtnTop} onPress={() => { setEditingData(null); setActiveTab(1); }}>
            <Text style={styles.newBtnTxt}>+ New</Text>
          </TouchableOpacity>
        </View>

        {/* Stats Row */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={[styles.statVal, { color: '#15803D' }]}>{promises.filter(p => p.status === 'Published').length}</Text>
            <Text style={styles.statLbl}>Published</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statVal, { color: '#D97706' }]}>{promises.filter(p => p.status === 'Draft').length}</Text>
            <Text style={styles.statLbl}>Drafts</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statVal, { color: '#c0392b' }]}>{missingDates.length}</Text>
            <Text style={styles.statLbl}>Missing</Text>
          </View>
        </View>

        {/* Global Alert */}
        <View style={styles.globalAlert}>
          <AlertCircle size={14} color="#D97706" />
          <Text style={styles.globalAlertTxt}>
            <Text style={{ fontWeight: '700' }}>{missingDates.length} dates missing!</Text> Red cells have no promise. Tap to add quickly.
          </Text>
        </View>

        {/* Sections */}
        <Text style={styles.secHd}>Today</Text>
        {todayPromise ? renderCard(todayPromise, 'today') : (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTxt}>No promise scheduled for today ({todayStr})</Text>
            <TouchableOpacity style={styles.emptyAdd} onPress={() => { setEditingData({ date: todayStr }); setActiveTab(1); }}>
              <Text style={styles.emptyAddTxt}>+ Schedule Today</Text>
            </TouchableOpacity>
          </View>
        )}

        <Text style={styles.secHd}>Upcoming</Text>
        {upcoming.length > 0 ? (
          upcoming.slice(0, 10).map(item => renderCard(item, 'upcoming'))
        ) : (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTxt}>No upcoming promises scheduled.</Text>
          </View>
        )}

        <View style={styles.missingSec}>
          <View style={styles.missingHd}>
            <Text style={styles.missingTitle}>Missing dates ({missingDates.length})</Text>
            <TouchableOpacity style={styles.fillAllBtn} onPress={() => setActiveTab(2)}>
              <Text style={styles.fillAllBtnTxt}>Fill all</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.mGrid}>
            {missingDates.slice(0, 8).map(d => (
              <TouchableOpacity key={d} style={styles.mCell} onPress={() => { 
                const now = new Date();
                const dStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
                setEditingData({ date: dStr }); 
                setActiveTab(1); 
              }}>
                <Text style={styles.mDate}>{currentMonthShort} {d}</Text>
                <Text style={styles.mAdd}>+ Add</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <Text style={styles.secHd}>Recent past</Text>
        {past.slice(0, 2).map(item => renderCard(item, 'past'))}

        <Text style={styles.footerBranding}>Church of GOD Admin · Daily Promise Manager</Text>
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* FAB */}
      <TouchableOpacity style={styles.fab} onPress={() => { setEditingData(null); setActiveTab(1); }}>
        <Plus size={28} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0f2f7' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f0f2f7' },
  scroll: { padding: 16 },

  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15, borderBottomWidth: 1, borderBottomColor: '#c0392b', paddingBottom: 10 },
  title: { fontSize: 16, fontWeight: '700', color: '#1a2d5a' },
  subtitle: { fontSize: 10, color: '#9CA3AF' },
  newBtnTop: { backgroundColor: '#c0392b', paddingHorizontal: 15, paddingVertical: 6, borderRadius: 15 },
  newBtnTxt: { color: '#fff', fontSize: 11, fontWeight: '700' },

  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 15 },
  statCard: { flex: 1, backgroundColor: '#fff', borderRadius: 8, paddingVertical: 15, alignItems: 'center', borderWidth: 0.5, borderColor: '#e5e7eb' },
  statVal: { fontSize: 24, fontWeight: '700' },
  statLbl: { fontSize: 10, color: '#9CA3AF', marginTop: 2 },

  globalAlert: { backgroundColor: '#FFFBEB', borderRadius: 8, padding: 12, marginBottom: 15, flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 0.5, borderColor: '#FDE68A' },
  globalAlertTxt: { flex: 1, fontSize: 11, color: '#B45309', marginLeft: 10, lineHeight: 16 },
 
  secHdRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, marginTop: 15 },
  secHd: { fontSize: 13, fontWeight: '700', color: '#374151' },
  fillBtn: { backgroundColor: '#c0392b', paddingHorizontal: 15, paddingVertical: 6, borderRadius: 8 },
  fillBtnTxt: { color: '#fff', fontSize: 11, fontWeight: '700' },

  pCard: { backgroundColor: '#fff', borderRadius: 10, padding: 15, marginBottom: 12, borderWidth: 0.5, borderColor: '#e5e7eb' },
  todayCard: { borderWidth: 2.5, borderColor: '#1a2d5a', backgroundColor: '#fcfdff' },
  pCardHd: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 },
  pDate: { fontSize: 13, fontWeight: '800', color: '#1a2d5a' },
  pRef: { fontSize: 11, fontWeight: '700', color: '#111827', marginTop: 2 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
  statusBadgeTxt: { fontSize: 8, fontWeight: '800', color: '#fff' },
  statusSch: { backgroundColor: '#2563eb' },
  statusDraft: { backgroundColor: '#D97706' },
  statusLive: { backgroundColor: '#c0392b' },
  statusPub: { backgroundColor: '#15803D' },

  pVerseEn: { fontSize: 11, color: '#374151', marginBottom: 5 },
  pVerseTe: { fontSize: 11, color: '#1a2d5a', fontStyle: 'italic', marginBottom: 5, fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif' },
  pVideoTitle: { fontSize: 10, color: '#6B7280', fontStyle: 'italic', marginBottom: 10 },

  warnRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 12 },
  warnTxt: { fontSize: 9, color: '#D97706', fontWeight: '600' },

  pCardFoot: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 0.5, borderTopColor: '#f3f4f6', paddingTop: 10 },
  assetIcons: { flexDirection: 'row', gap: 12 },
  assetBox: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  assetTxt: { fontSize: 9, fontWeight: '700', color: '#1a2d5a' },
  actionLink: { fontSize: 10, fontWeight: '700', color: '#1a2d5a' },

  missingSec: { marginTop: 10, marginBottom: 20 },
  missingHd: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  missingTitle: { fontSize: 12, fontWeight: '700', color: '#c0392b' },
  fillAllBtn: { backgroundColor: '#c0392b', paddingHorizontal: 15, paddingVertical: 7, borderRadius: 8 },
  fillAllBtnTxt: { color: '#fff', fontSize: 11, fontWeight: '700' },
  mGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  mCell: { width: (width - 32 - 24) / 4, backgroundColor: '#fdf2f2', borderWidth: 0.5, borderColor: '#fecaca', borderRadius: 8, paddingVertical: 12, alignItems: 'center' },
  mDate: { fontSize: 10, fontWeight: '800', color: '#991B1B' },
  mAdd: { fontSize: 8, color: '#DC2626', marginTop: 3 },

  footerBranding: { fontSize: 10, color: '#9CA3AF', textAlign: 'center', marginTop: 10 },

  emptyCard: { backgroundColor: '#fff', borderRadius: 11, padding: 20, alignItems: 'center', marginBottom: 12, borderStyle: 'dashed', borderWidth: 1.5, borderColor: '#d1d5db' },
  emptyTxt: { fontSize: 12, color: '#6B7280', marginBottom: 10 },
  emptyAdd: { backgroundColor: '#1a2d5a', paddingHorizontal: 15, paddingVertical: 8, borderRadius: 8 },
  emptyAddTxt: { color: '#fff', fontSize: 11, fontWeight: '600' },

  fab: { position: 'absolute', right: 20, bottom: 30, width: 60, height: 60, borderRadius: 30, backgroundColor: '#c0392b', justifyContent: 'center', alignItems: 'center', elevation: 10, shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 10 }
});
