import React, { useState, useEffect, useContext } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Info, Save, Menu, Edit2, Eye, Target } from 'lucide-react-native';
import firestore from '@react-native-firebase/firestore';
import { LinearGradient } from 'expo-linear-gradient';
import { AdminTabContext } from '../../context/AdminTabContext';
import { useTheme } from '../../context/ThemeContext';
import Theme from '../../theme/Theme';

interface AboutUsData {
  description: string;
  mission: string;
  vision: string;
  updatedAt?: any;
}

const DEFAULT_ABOUT: AboutUsData = {
  description:
    'Welcome to Brothers in Christ Fellowship — Church of God. We are a Spirit-filled, family-oriented congregation dedicated to sharing the love of Jesus Christ with our community and the world.',
  mission:
    'To share the Gospel of Jesus Christ, make disciples of all nations, and serve our community with love and compassion.',
  vision:
    'To see every family in our community transformed by the power of God and rooted in His Word.',
};

export default function AdminAboutUsEditor() {
  const { isDark } = useTheme();
  const theme = {
    background: isDark ? '#0b141a' : '#f0f2f7',
    surface: isDark ? '#111b21' : '#ffffff',
    border: isDark ? '#222e35' : '#e5e7eb',
    text: isDark ? '#e9edef' : '#111827',
    textSecondary: isDark ? '#8696a0' : '#6b7280',
  };
  const { openDrawer } = useContext(AdminTabContext);

  const [data, setData] = useState<AboutUsData>(DEFAULT_ABOUT);
  const [draft, setDraft] = useState<AboutUsData>(DEFAULT_ABOUT);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const doc = await firestore().collection('settings').doc('about').get();
      if (doc.exists()) {
        const d = doc.data() as AboutUsData;
        const fetched: AboutUsData = {
          description: d.description || DEFAULT_ABOUT.description,
          mission: d.mission || DEFAULT_ABOUT.mission,
          vision: d.vision || DEFAULT_ABOUT.vision,
        };
        setData(fetched);
        setDraft(fetched);
      }
      // If doc doesn't exist yet, silently use defaults
    } catch (err) {
      // Silently fall back to defaults (document may not exist yet)
      console.warn('AboutUs fetch:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleEdit = () => { setDraft({ ...data }); setIsEditing(true); };
  const handleCancel = () => { setDraft({ ...data }); setIsEditing(false); };

  const handleSave = async () => {
    if (!draft.description.trim()) { Alert.alert('Validation', 'Description cannot be empty.'); return; }
    setSaving(true);
    try {
      await firestore().collection('settings').doc('about').set({
        ...draft,
        updatedAt: firestore.FieldValue.serverTimestamp(),
      });
      setData({ ...draft });
      setIsEditing(false);
      Alert.alert('✅ Saved', 'About Us content updated successfully!');
    } catch (err) {
      Alert.alert('Save Error', 'Could not save. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FCD34D" />
        <Text style={styles.loadingText}>Loading About Us…</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={[styles.container, { backgroundColor: theme.background }]}>

        {/* ── Header ── */}
        <LinearGradient colors={['#1a2d5a', '#3b82f6']} style={styles.headerOuter}>
          <LinearGradient colors={['#1a2d5a', '#23314d']} style={styles.headerInner}>
            <View style={{ flexDirection: 'row', alignItems: 'center', width: '100%', justifyContent: 'space-between' }}>
              <TouchableOpacity onPress={openDrawer} style={{ padding: 4 }}>
                <Menu size={24} color="#fff" />
              </TouchableOpacity>
              
              <View style={{ alignItems: 'center' }}>
                <Text style={styles.headerTitle}>About Us</Text>
                <Text style={{ color: '#94a3b8', fontSize: 13, textAlign: 'center', marginTop: 2 }}>Church Companion</Text>
              </View>
              
              <TouchableOpacity
                style={styles.editToggleBtn}
                onPress={isEditing ? handleCancel : handleEdit}
              >
                {isEditing
                  ? <><Eye size={14} color="#aac4e8" /><Text style={[styles.editToggleTxt, { color: '#aac4e8' }]}>View</Text></>
                  : <><Edit2 size={14} color="#FCD34D" /><Text style={styles.editToggleTxt}>Edit</Text></>
                }
              </TouchableOpacity>
            </View>
          </LinearGradient>
        </LinearGradient>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* ─── VIEW MODE ─── */}
          {!isEditing ? (
            <>
              <View style={[styles.modeBanner, { backgroundColor: isDark ? "rgba(56, 189, 248, 0.1)" : "#e0f2fe" }]}>
                <Eye size={13} color={isDark ? "#38bdf8" : "#1a2d5a"} />
                <Text style={[styles.modeBannerTxt, { color: isDark ? "#38bdf8" : "#1a2d5a" }]}>Preview — tap Edit to make changes</Text>
              </View>

              <View style={[styles.viewCard, { backgroundColor: theme.surface, borderColor: theme.border, borderWidth: isDark ? 1 : 0 }]}>
                <View style={styles.viewCardHeader}>
                  <Info size={15} color={theme.text} />
                  <Text style={[styles.viewCardTitle, { color: theme.text }]}>Church Description</Text>
                </View>
                <Text style={[styles.viewCardBody, { color: theme.textSecondary }]}>{data.description}</Text>
              </View>

              <View style={[styles.viewCard, { backgroundColor: theme.surface, borderColor: theme.border, borderWidth: isDark ? 1 : 0 }]}>
                <View style={[styles.viewCardBand, { backgroundColor: '#fef3c7' }]}>
                  <Target size={15} color="#b45309" />
                  <Text style={[styles.viewCardTitle, { color: '#b45309' }]}>Our Mission</Text>
                </View>
                <Text style={[styles.viewCardBody, { paddingTop: 12 }]}>{data.mission}</Text>
              </View>

              <View style={[styles.viewCard, { backgroundColor: theme.surface, borderColor: theme.border, borderWidth: isDark ? 1 : 0 }]}>
                <View style={[styles.viewCardBand, { backgroundColor: '#ede9fe' }]}>
                  <Eye size={15} color="#7c3aed" />
                  <Text style={[styles.viewCardTitle, { color: '#7c3aed' }]}>Our Vision</Text>
                </View>
                <Text style={[styles.viewCardBody, { paddingTop: 12 }]}>{data.vision}</Text>
              </View>
            </>
          ) : (
            /* ─── EDIT MODE ─── */
            <>
              <View style={[styles.modeBanner, { backgroundColor: '#fef3c7' }]}>
                <Edit2 size={13} color="#b45309" />
                <Text style={[styles.modeBannerTxt, { color: '#b45309' }]}>Editing — tap Save to update</Text>
              </View>

              <View style={[styles.fieldCard, { backgroundColor: theme.surface, borderColor: theme.border, borderWidth: isDark ? 1 : 0 }]}>
                <Text style={[styles.fieldLabel, { color: theme.text }]}>📖 Church Description</Text>
                <Text style={[styles.fieldHint, { color: theme.textSecondary }]}>Main introduction shown to members.</Text>
                <TextInput
                  style={[styles.input, styles.textArea, { backgroundColor: isDark ? "#1e293b" : "#f8fafc", color: theme.text, borderColor: theme.border }]}
                  value={draft.description}
                  onChangeText={(t) => setDraft((p) => ({ ...p, description: t }))}
                  placeholder="Enter church description…"
                  placeholderTextColor="#94a3b8"
                  multiline
                  numberOfLines={5}
                  textAlignVertical="top"
                />
              </View>

              <View style={[styles.fieldCard, { backgroundColor: theme.surface, borderColor: theme.border, borderWidth: isDark ? 1 : 0 }]}>
                <Text style={[styles.fieldLabel, { color: theme.text }]}>🎯 Our Mission</Text>
                <Text style={[styles.fieldHint, { color: theme.textSecondary }]}>Displayed in a highlighted mission card.</Text>
                <TextInput
                  style={[styles.input, styles.textArea, { backgroundColor: isDark ? "#1e293b" : "#f8fafc", color: theme.text, borderColor: theme.border }]}
                  value={draft.mission}
                  onChangeText={(t) => setDraft((p) => ({ ...p, mission: t }))}
                  placeholder="Enter mission statement…"
                  placeholderTextColor="#94a3b8"
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                />
              </View>

              <View style={[styles.fieldCard, { backgroundColor: theme.surface, borderColor: theme.border, borderWidth: isDark ? 1 : 0 }]}>
                <Text style={[styles.fieldLabel, { color: theme.text }]}>🔭 Our Vision</Text>
                <Text style={[styles.fieldHint, { color: theme.textSecondary }]}>Displayed in a highlighted vision card.</Text>
                <TextInput
                  style={[styles.input, styles.textArea, { backgroundColor: isDark ? "#1e293b" : "#f8fafc", color: theme.text, borderColor: theme.border }]}
                  value={draft.vision}
                  onChangeText={(t) => setDraft((p) => ({ ...p, vision: t }))}
                  placeholder="Enter vision statement…"
                  placeholderTextColor="#94a3b8"
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                />
              </View>

              <View style={styles.actionRow}>
                <TouchableOpacity style={[styles.cancelBtn, { backgroundColor: isDark ? "#334155" : "#e2e8f0" }]} onPress={handleCancel}>
                  <Text style={[styles.cancelTxt, { color: theme.text }]}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.saveBtn, saving && styles.btnDisabled]}
                  onPress={handleSave}
                  disabled={saving}
                >
                  {saving
                    ? <ActivityIndicator color={isDark ? "#38bdf8" : "#1a2d5a"} size="small" />
                    : <><Save size={16} color={isDark ? "#38bdf8" : "#1a2d5a"} /><Text style={styles.saveTxt}>Save Changes</Text></>
                  }
                </TouchableOpacity>
              </View>
            </>
          )}

          <View style={{ height: 40 }} />
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0f2f7' },
  loadingContainer: { flex: 1, backgroundColor: '#1a2d5a', justifyContent: 'center', alignItems: 'center', gap: 12 },
  loadingText: { color: '#aac4e8', fontSize: 14 },

  /* Header */
  headerOuter: { borderBottomLeftRadius: 30, borderBottomRightRadius: 30, marginBottom: 15, paddingBottom: 4 },
  headerInner: { padding: 15, paddingTop: Platform.OS === 'ios' ? 40 : 20, borderBottomLeftRadius: 30, borderBottomRightRadius: 30 },
  headerTitle: { fontSize: 20, fontWeight: '800', color: '#fff' },
  editToggleBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: 'rgba(255,255,255,0.1)', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10 },
  editToggleTxt: { color: '#FCD34D', fontSize: 13, fontWeight: '700' },

  scroll: { flex: 1 },
  scrollContent: { padding: 14 },

  /* Mode banner */
  modeBanner: { backgroundColor: '#e0f2fe', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 9, marginBottom: 14, flexDirection: 'row', alignItems: 'center', gap: 8 },
  modeBannerTxt: { fontSize: 13, fontWeight: '700', color: '#1a2d5a' },

  /* View cards */
  viewCard: { backgroundColor: '#fff', borderRadius: 16, marginBottom: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 3, overflow: 'hidden' },
  viewCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 16, paddingBottom: 6 },
  viewCardBand: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 12 },
  viewCardTitle: { fontSize: 15, fontWeight: '800', color: '#1a2d5a' },
  viewCardBody: { fontSize: 14, color: '#475569', lineHeight: 22, paddingHorizontal: 16, paddingBottom: 16 },

  /* Edit fields */
  fieldCard: { backgroundColor: '#fff', borderRadius: 16, padding: 14, marginBottom: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 3 },
  fieldLabel: { fontSize: 14, fontWeight: '700', color: '#1a2d5a', marginBottom: 4 },
  fieldHint: { fontSize: 11, color: '#64748b', marginBottom: 10 },
  input: { borderWidth: 1.5, borderColor: '#e2e8f0', borderRadius: 10, padding: 11, fontSize: 14, color: '#1e293b', backgroundColor: '#f8fafc' },
  textArea: { minHeight: 90, textAlignVertical: 'top' },

  /* Action buttons */
  actionRow: { flexDirection: 'row', gap: 12, marginTop: 6 },
  cancelBtn: { flex: 1, backgroundColor: '#e2e8f0', borderRadius: 14, paddingVertical: 14, alignItems: 'center', justifyContent: 'center' },
  cancelTxt: { color: '#64748b', fontWeight: '700', fontSize: 15 },
  saveBtn: { flex: 2, backgroundColor: '#FCD34D', borderRadius: 14, paddingVertical: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, shadowColor: '#FCD34D', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 6 },
  btnDisabled: { opacity: 0.6 },
  saveTxt: { color: '#1a2d5a', fontWeight: '800', fontSize: 15 },
});
