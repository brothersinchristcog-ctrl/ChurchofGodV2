import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Modal,
  StyleSheet,
  Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { X, Save } from 'lucide-react-native';
import SalesforceService from '../services/SalesforceService';
import {
  getFirestore,
  collection,
  addDoc,
  serverTimestamp
} from '@react-native-firebase/firestore';

const CATEGORIES = [
  'Stuthi Songs',
  'Aradhana Songs',
  'Offering Songs',
  'Youth Songs',
  'Easter Songs',
  'Christmas Songs',
  'Gospel Songs',
  'Marriage Songs',
  'Thanksgiving Songs',
  'Special Songs',
  'Other',
  'Theme Songs'
];

interface AddSongModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
  isDark: boolean;
  colors: any;
}

export default function AddSongModal({ visible, onClose, onSuccess, isDark, colors }: AddSongModalProps) {
  const [titleEn, setTitleEn] = useState('');
  const [titleTe, setTitleTe] = useState('');
  const [artist, setArtist] = useState('COG Worship');
  const [lyrics, setLyrics] = useState('');
  const [status, setStatus] = useState('Published');
  const [categories, setCategories] = useState<string[]>([]);
  const [youtubeId, setYoutubeId] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const resetForm = () => {
    setTitleEn(''); setTitleTe(''); setLyrics(''); setYoutubeId('');
    setArtist('COG Worship'); setCategories([]); setStatus('Published');
  };

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
      await SalesforceService.createWorshipSong({
        titleEn: titleEn.trim(),
        titleTe: titleTe.trim(),
        artist: artist.trim(),
        lyrics: lyrics.trim(),
        status,
        category: primaryCategory,
        youtubeId: youtubeId.trim()
      });

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

      resetForm();
      onSuccess();
      onClose();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to publish song.');
    } finally {
      setSubmitting(false);
    }
  };

  const styles = StyleSheet.create({
    scroll: { padding: 16 },
    card: { backgroundColor: colors.card, borderRadius: 16, padding: 20, marginBottom: 16, elevation: 3, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 5, borderWidth: 1, borderColor: colors.border },
    sectionTitle: { fontSize: 12, fontWeight: '800', color: isDark ? '#bfdbfe' : '#1a2d5a', letterSpacing: 1, marginBottom: 20 },
    inputGroup: { marginBottom: 20 },
    label: { fontSize: 11, fontWeight: '700', color: isDark ? '#94a3b8' : '#64748b', marginBottom: 8, letterSpacing: 0.5 },
    textInput: { backgroundColor: isDark ? '#1e293b' : '#f8fafc', borderWidth: 1, borderColor: isDark ? '#334155' : '#e2e8f0', borderRadius: 12, padding: 14, fontSize: 15, color: isDark ? '#fff' : '#111827' },
    statusSelectRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 10, paddingVertical: 12, borderTopWidth: 1, borderColor: isDark ? '#334155' : '#e2e8f0' },
    statusLabel: { fontSize: 14, fontWeight: '600', color: isDark ? '#e2e8f0' : '#475569' },
    statusBtnGroup: { flexDirection: 'row', backgroundColor: isDark ? '#1e293b' : '#f1f5f9', borderRadius: 20, padding: 4 },
    statusBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 16 },
    statusBtnActive: { backgroundColor: '#3b82f6' },
    statusBtnActiveDraft: { backgroundColor: '#f59e0b' },
    statusBtnTxt: { fontSize: 13, fontWeight: '700', color: isDark ? '#94a3b8' : '#64748b' },
    statusBtnTxtActive: { color: '#fff' },
    saveBtn: { backgroundColor: '#10b981', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 16, borderRadius: 16, marginTop: 10, elevation: 2, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 4 },
    saveBtnTxt: { color: '#fff', fontSize: 16, fontWeight: '800', marginLeft: 8 },
  });

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={{ flex: 1, backgroundColor: isDark ? '#0f172a' : '#f1f5f9' }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderColor: isDark ? '#334155' : '#e2e8f0', backgroundColor: isDark ? '#1e293b' : '#fff' }}>
          <Text style={{ fontSize: 18, fontWeight: '800', color: isDark ? '#fff' : '#1a2d5a' }}>Create New Song</Text>
          <TouchableOpacity onPress={onClose} style={{ padding: 4, backgroundColor: isDark ? '#334155' : '#f1f5f9', borderRadius: 16 }}>
            <X size={20} color={isDark ? '#94a3b8' : '#64748b'} />
          </TouchableOpacity>
        </View>

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

            <View style={styles.inputGroup}>
              <Text style={styles.label}>ARTIST / BAND</Text>
              <TextInput style={styles.textInput} placeholder="COG Worship..."
                placeholderTextColor="#94a3b8" value={artist} onChangeText={setArtist} />
            </View>

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
              : <><Save size={18} color="#fff" /><Text style={styles.saveBtnTxt}>Publish Song</Text></>
            }
          </TouchableOpacity>
          <View style={{ height: 60 }} />
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}
