import React, { useState, useContext, useEffect } from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  ScrollView, 
  TextInput, 
  TouchableOpacity, 
  Alert,
  Modal,
  ActivityIndicator,
  Platform,
  Dimensions,
  StatusBar,
  Share
} from 'react-native';
import DateTimePickerModal from "react-native-modal-datetime-picker";
import { 
  Plus, 
  Search, 
  Calendar as LucideCalendar, 
  ChevronDown, 
  ChevronLeft,
  FileText,
  Calendar as CalendarIcon,
  Film,
  Mic2,
  Image as ImageIcon,
  Folder,
  Radio,
  Clock,
  Type,
  CheckCircle2,
  AlertCircle,
  Play,
  Monitor,
  ChevronRight,
  ArrowLeft,
  X,
  Bell,
  Save,
  Menu
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../context/ThemeContext';
import { AdminTabContext } from '../../context/AdminTabContext';

import SalesforceService from '../../services/SalesforceService';

const { width } = Dimensions.get('window');

const SERMON_CATEGORIES = [
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
];

function getStyles(colors: any, isDark: boolean) { return StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scroll: { padding: 20, paddingBottom: 100 },
  
  headerOuter: { borderBottomLeftRadius: 30, borderBottomRightRadius: 30, marginBottom: 25, marginHorizontal: -20, marginTop: -20, paddingBottom: 4 },
  headerInner: { padding: 15, paddingTop: Platform.OS === 'ios' ? 45 : 25, borderBottomLeftRadius: 30, borderBottomRightRadius: 30 },
  headerTitle: { fontSize: 20, fontWeight: '800', color: '#fff' },

  modBox: { marginBottom: 25, backgroundColor: colors.card, borderRadius: 16, padding: 20, elevation: 3, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, borderWidth: 1, borderColor: colors.border },
  modHd: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 15, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: colors.border },
  hdBlue: { borderLeftWidth: 3, borderLeftColor: isDark ? '#3b82f6' : '#1a2d5a', paddingLeft: 8 },
  hdRed: { borderLeftWidth: 3, borderLeftColor: '#c0392b', paddingLeft: 8 },
  hdYellow: { backgroundColor: isDark ? '#78350f' : '#fffbeb', borderLeftWidth: 3, borderLeftColor: isDark ? '#f59e0b' : '#d97706' },
  modHdTxt: { fontSize: 11, fontWeight: '700', color: isDark ? '#bfdbfe' : '#1a2d5a', textTransform: 'uppercase', letterSpacing: 0.5 },

  fGroup: { marginBottom: 16 },
  fLabel: { fontSize: 12, fontWeight: '600', color: colors.text, marginBottom: 6 },
  fHint: { fontSize: 9, color: '#9CA3AF', fontWeight: '400', marginTop: 2 },
  row: { flexDirection: 'row', gap: 10 },

  input: { backgroundColor: isDark ? '#1e293b' : '#fdfdfd', borderWidth: 0.5, borderColor: isDark ? '#4b5563' : '#64748b', borderRadius: 8, padding: 12, fontSize: 13, color: colors.text },
  inputWithIcon: { flexDirection: 'row', alignItems: 'center', backgroundColor: isDark ? '#1e293b' : '#fdfdfd', borderWidth: 0.5, borderColor: isDark ? '#4b5563' : '#64748b', borderRadius: 8, paddingHorizontal: 12, height: 45 },
  inputTxt: { fontSize: 13, color: colors.text },
  teIn: { fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif', color: isDark ? '#93c5fd' : '#1a2d5a', fontStyle: 'italic', backgroundColor: isDark ? '#0f172a' : '#F8FAFF' },
  textarea: { minHeight: 80, textAlignVertical: 'top' },

  selectBox: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: colors.card, borderWidth: 0.5, borderColor: colors.border, borderRadius: 8, padding: 12 },
  selectTxt: { fontSize: 13, color: colors.text, fontWeight: '500' },

  mediaBanner: { borderLeftWidth: 3, borderLeftColor: isDark ? '#3b82f6' : '#1a2d5a', paddingLeft: 8, flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 15, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: colors.border },
  mediaBannerTxt: { fontSize: 11, fontWeight: '700', color: isDark ? '#bfdbfe' : '#1a2d5a', textTransform: 'uppercase', letterSpacing: 0.5 },

  dashBox: { borderStyle: 'dashed', borderWidth: 1, borderColor: colors.border, borderRadius: 10, padding: 25, alignItems: 'center', backgroundColor: isDark ? '#0f172a' : '#fafafa' },
  dashBoxActive: { borderColor: isDark ? '#10b981' : '#059669', backgroundColor: isDark ? '#064e3b' : '#F0FDF4', borderStyle: 'solid' },
  dashTxt: { fontSize: 11, fontWeight: '600', color: colors.text, marginTop: 10 },
  dashHint: { fontSize: 9, color: '#9CA3AF', marginTop: 4 },

  toggleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12 },
  toggleTxt: { fontSize: 12, color: colors.text, fontWeight: '500' },
  switch: { width: 44, height: 24, borderRadius: 12, backgroundColor: isDark ? '#334155' : '#d1d5db', padding: 2 },
  switchOn: { backgroundColor: isDark ? '#3b82f6' : '#1a2d5a' },
  switchDot: { width: 20, height: 20, borderRadius: 10, backgroundColor: '#fff' },
  switchDotOn: { alignSelf: 'flex-end' },

  notifPreview: { backgroundColor: isDark ? '#1e293b' : '#f8fafc', borderRadius: 12, padding: 12, marginTop: 10, borderWidth: 1, borderColor: colors.border, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 5 },
  notifHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  notifLogo: { width: 14, height: 14, backgroundColor: isDark ? '#3b82f6' : '#1a2d5a', borderRadius: 4, justifyContent: 'center', alignItems: 'center' },
  notifHeaderTxt: { fontSize: 9, color: isDark ? '#94a3b8' : '#64748b' },
  notifTitle: { fontSize: 11, fontWeight: '700', color: colors.text },
  notifBody: { fontSize: 10, color: isDark ? '#94a3b8' : '#64748b' },

  btnActionHalf: { borderRadius: 10, padding: 15, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  btnActionHalfTxt: { color: '#fff', fontSize: 13, fontWeight: '700' },
  btnBackLink: { alignItems: 'center', marginTop: 10 },
  btnBackLinkTxt: { fontSize: 12, color: colors.text, fontWeight: '600' },

  pickerCard: { backgroundColor: colors.card, width: '90%', borderRadius: 12, padding: 8, elevation: 20, shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 15 },
  pickerItem: { padding: 15, borderRadius: 8 },
  pickerItemActive: { backgroundColor: isDark ? '#3b82f6' : '#1a2d5a' },
  pickerItemTxt: { fontSize: 13, color: colors.text, fontWeight: '500' },
  pickerItemTxtActive: { color: '#fff', fontWeight: '700' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', zIndex: 9999 },
  successCard: { backgroundColor: isDark ? '#1e293b' : '#1a2d5a', width: '85%', borderRadius: 24, padding: 30, alignItems: 'center', elevation: 20, shadowColor: '#000', shadowOpacity: 0.4, shadowRadius: 15, borderWidth: 2, borderColor: '#c0392b' },
  successIconBox: { width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(255,255,255,0.1)', justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  successTitle: { fontSize: 24, fontWeight: '800', color: '#fff', marginBottom: 10 },
  successSub: { fontSize: 14, color: '#e5e7eb', textAlign: 'center', lineHeight: 22, marginBottom: 25 },
  successBtn: { backgroundColor: '#c0392b', width: '100%', paddingVertical: 15, borderRadius: 12, alignItems: 'center' },
  successBtnTxt: { color: '#fff', fontSize: 15, fontWeight: '700', letterSpacing: 0.5 },

  errorCard: { backgroundColor: colors.card, width: '80%', borderRadius: 24, padding: 30, alignItems: 'center' },
  errorIconBox: { width: 70, height: 70, borderRadius: 35, backgroundColor: isDark ? '#7f1d1d' : '#FEF2F2', justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  errorTitle: { fontSize: 20, fontWeight: '800', color: isDark ? '#fca5a5' : '#c0392b', marginBottom: 10 },
  errorSub: { fontSize: 13, color: isDark ? '#cbd5e1' : '#6B7280', textAlign: 'center', marginBottom: 25 },

  fab: { position: 'absolute', right: 20, bottom: 30, width: 60, height: 60, borderRadius: 30, backgroundColor: '#c0392b', justifyContent: 'center', alignItems: 'center', elevation: 10, shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 10 },

  pickerCardJS: { backgroundColor: colors.card, width: '90%', borderRadius: 16, padding: 20, elevation: 20, shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 15 },
  pickerHd: { fontSize: 16, fontWeight: '800', color: isDark ? '#bfdbfe' : '#1a2d5a', marginBottom: 20, textAlign: 'center' },
  pickerGrid: { flexDirection: 'row', gap: 10, height: 200 },
  pickerCol: { flex: 1 },
  pickerColHd: { fontSize: 10, fontWeight: '700', color: '#9CA3AF', textTransform: 'uppercase', marginBottom: 10, textAlign: 'center' },
  pickerItemJS: { paddingVertical: 10, alignItems: 'center', borderRadius: 8, marginBottom: 4 },
  pickerItemJSActive: { backgroundColor: isDark ? '#064e3b' : '#F0FDF4' },
  pickerItemJSTxt: { fontSize: 14, color: colors.text, fontWeight: '500' },
  pickerItemJSTxtActive: { color: isDark ? '#34d399' : '#059669', fontWeight: '800' },
  pickerBtn: { backgroundColor: isDark ? '#3b82f6' : '#1a2d5a', borderRadius: 10, padding: 15, alignItems: 'center', marginTop: 20 },
  pickerBtnTxt: { color: '#fff', fontWeight: '700' },
});
}

export default function AdminSermonEditor() {
  const { setActiveTab, editingData, setEditingData, openDrawer } = useContext(AdminTabContext);
  const { colors, isDark } = useTheme();
  const styles = React.useMemo(() => getStyles(colors, isDark), [colors, isDark]);
  const [loading, setLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showError, setShowError] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [showStatusPicker, setShowStatusPicker] = useState(false);
  const statusOptions = [
    { label: 'Draft — not visible to members yet', value: 'Draft' },
    { label: 'Publish now — visible to all members', value: 'Published' },
    { label: 'Schedule for a specific date & time', value: 'Scheduled' }
  ];

  const [showDatePicker, setShowDatePicker] = useState(false);
  const [audioFile, setAudioFile] = useState<any>(null);
  const [thumbnailFile, setThumbnailFile] = useState<any>(null);

  const getStatusLabel = (val: string) => {
    return statusOptions.find(o => o.value === val)?.label || 'Select Status';
  };
  
  const [form, setForm] = useState({
    titleEn: '',
    titleTe: '',
    pastor: '',
    date: new Date().toLocaleDateString('en-CA'),
    ref: '',
    duration: '',
    youtubeId: '',
    description: '',
    status: 'Published',
    notifyMembers: true,
    autoSend: false
  });
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);

  const toggleCategory = (cat: string) => {
    setSelectedCategories(prev =>
      prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]
    );
  };

  useEffect(() => {
    if (editingData) {
      setForm(prev => ({
        ...prev,
        titleEn: editingData.title || '',
        titleTe: editingData.titleTelugu || '',
        pastor: editingData.pastor || '',
        date: editingData.date || new Date().toLocaleDateString('en-CA'),
        ref: editingData.scripture || '',
        duration: editingData.duration || '45 mins',
        youtubeId: editingData.youtubeId || '',
        description: editingData.description || '',
        status: editingData.status || 'Published'
      }));
      // Load existing categories
      if (editingData.categories) {
        setSelectedCategories(
          typeof editingData.categories === 'string'
            ? editingData.categories.split(';').filter(Boolean)
            : editingData.categories
        );
      }
    }
  }, [editingData]);

  const handleAudioPick = async () => {
    try {
      const DocumentPicker = require('expo-document-picker');
      const res = await DocumentPicker.getDocumentAsync({ type: 'audio/*' });
      if (!res.canceled) setAudioFile(res.assets[0]);
    } catch (err) { 
      console.error('Audio Pick Error:', err);
      Alert.alert("Feature Unavailable", "Audio picking requires a new development build. Please contact your developer.");
    }
  };

  const handleImagePick = async () => {
    try {
      const ImagePicker = require('expo-image-picker');
      const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: 'images', allowsEditing: true, aspect: [16, 9], quality: 0.8 });
      if (!res.canceled) setThumbnailFile(res.assets[0]);
    } catch (err) { 
      console.error('Image Pick Error:', err);
      Alert.alert("Feature Unavailable", "Image picking requires a new development build. Please contact your developer.");
    }
  };

  const handleConfirm = (date: Date) => {
    const formattedDate = date.toISOString().split('T')[0];
    setForm({ ...form, date: formattedDate });
    setShowDatePicker(false);
  };

  const handleSave = async (status: string) => {
    setLoading(true);
    try {
      const payload = {
        id: editingData?.id,
        ...form,
        status: status || form.status,
        scripture: form.ref,
        categories: selectedCategories.join(';')
      };
      await SalesforceService.createSermon(payload);
      setShowSuccess(true);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to save to Salesforce. Please check your connection.');
      setShowError(true);
    } finally {
      setLoading(false);
    }
  };

  const closeSuccess = () => {
    setShowSuccess(false);
    setActiveTab(3);
  };

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {/* ── Header ── */}
        <LinearGradient colors={['#1a2d5a', '#3b82f6']} style={styles.headerOuter}>
           <LinearGradient colors={['#1a2d5a', '#23314d']} style={styles.headerInner}>
            <View style={{ flexDirection: 'row', alignItems: 'center', width: '100%', justifyContent: 'center', position: 'relative' }}>
              <TouchableOpacity onPress={openDrawer} style={{ position: 'absolute', left: 0, padding: 4, zIndex: 10 }}>
                <Menu size={26} color="#fff" />
              </TouchableOpacity>
              <Text style={styles.headerTitle}>{editingData ? 'Edit Sermon' : 'New Sermon'}</Text>
            </View>
          </LinearGradient>
        </LinearGradient>

        {/* 1. Sermon Info */}
        <View style={styles.modBox}>
          <View style={[styles.modHd, styles.hdBlue]}>
            <FileText size={14} color="#3b82f6" />
            <Text style={styles.modHdTxt}>Sermon Info</Text>
          </View>
          
          <View style={styles.fGroup}>
            <Text style={styles.fLabel}>Title — English <Text style={{color:'#c0392b'}}>*</Text></Text>
            <TextInput style={styles.input} value={form.titleEn} onChangeText={(v) => setForm({...form, titleEn: v})} placeholder="e.g. Walking in Faith Through Trials" />
          </View>

          <View style={styles.fGroup}>
            <Text style={styles.fLabel}>Title — Telugu</Text>
            <TextInput style={[styles.input, styles.teIn]} value={form.titleTe} onChangeText={(v) => setForm({...form, titleTe: v})} placeholder="తెలుగులో శీర్షిక..." />
          </View>

          <View style={styles.fGroup}>
            <Text style={styles.fLabel}>Pastor Name <Text style={{color:'#c0392b'}}>*</Text></Text>
            <TextInput style={styles.input} value={form.pastor} onChangeText={(v) => setForm({...form, pastor: v})} placeholder="e.g. Pastor Daniel Raju" />
          </View>

          <View style={styles.row}>
            <View style={[styles.fGroup, {flex: 2}]}>
              <Text style={styles.fLabel}>Sermon Date</Text>
              <TouchableOpacity style={styles.inputWithIcon} onPress={() => setShowDatePicker(true)}>
                <Text style={styles.inputTxt}>{form.date}</Text>
                <CalendarIcon size={16} color="#1a2d5a" style={{ marginLeft: 'auto' }} />
              </TouchableOpacity>
            </View>
            <View style={[styles.fGroup, {flex: 1.2}]}>
              <Text style={styles.fLabel}>Duration</Text>
              <TextInput style={styles.input} value={form.duration} onChangeText={(v) => setForm({...form, duration: v})} placeholder="e.g. 42 min" />
            </View>
          </View>

          <DateTimePickerModal
            isVisible={showDatePicker}
            mode="date"
            onConfirm={handleConfirm}
            onCancel={() => setShowDatePicker(false)}
            date={new Date(form.date)}
          />

          <View style={styles.fGroup}>
            <Text style={styles.fLabel}>Scripture reference</Text>
            <TextInput style={styles.input} value={form.ref} onChangeText={(v) => setForm({...form, ref: v})} placeholder="e.g. James 1:2-4" />
          </View>
        </View>

        {/* Categories */}
        <View style={styles.modBox}>
          <View style={[styles.modHd, styles.hdBlue]}>
            <Folder size={14} color="#3b82f6" />
            <Text style={styles.modHdTxt}>Sermon Category</Text>
          </View>
          <Text style={[styles.fHint, { marginBottom: 14, fontSize: 11 }]}>Select all that apply. Members will see sermons grouped under these categories.</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
            {SERMON_CATEGORIES.map(cat => {
              const isSelected = selectedCategories.includes(cat);
              return (
                <TouchableOpacity
                  key={cat}
                  onPress={() => toggleCategory(cat)}
                  style={{
                    paddingHorizontal: 14,
                    paddingVertical: 8,
                    borderRadius: 20,
                    borderWidth: 1.5,
                    borderColor: isSelected ? (isDark ? '#3b82f6' : '#1a2d5a') : (isDark ? '#4b5563' : '#d1d5db'),
                    backgroundColor: isSelected ? (isDark ? '#3b82f6' : '#1a2d5a') : (isDark ? '#1e293b' : '#fff'),
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 6
                  }}
                >
                  {isSelected && <CheckCircle2 size={13} color="#FCD34D" />}
                  <Text style={{ fontSize: 12, fontWeight: '600', color: isSelected ? '#fff' : (isDark ? '#e2e8f0' : '#374151') }}>{cat}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
          {selectedCategories.length > 0 && (
            <View style={{ marginTop: 14, backgroundColor: '#f0f7ff', borderRadius: 8, padding: 10 }}>
              <Text style={{ fontSize: 11, color: '#1a2d5a', fontWeight: '600' }}>Selected: {selectedCategories.join(' · ')}</Text>
            </View>
          )}
        </View>

        {/* 2. Media & Details */}
        <View style={styles.modBox}>
          <View style={styles.mediaBanner}>
            <Film size={14} color="#3b82f6" />
            <Text style={styles.mediaBannerTxt}>Media & Details</Text>
          </View>

          <View style={styles.fGroup}>
            <Text style={styles.fLabel}>YouTube video URL</Text>
            <TextInput style={styles.input} value={form.youtubeId} onChangeText={(v) => setForm({...form, youtubeId: v})} placeholder="https://youtube.com/watch?v=..." />
            <Text style={styles.fHint}>Paste full URL or 11-character video ID</Text>
          </View>

          <View style={styles.fGroup}>
            <Text style={styles.fLabel}>Audio file <Text style={styles.fHint}>MP3 - Max 100MB</Text></Text>
            <TouchableOpacity style={[styles.dashBox, audioFile && styles.dashBoxActive]} onPress={handleAudioPick}>
              {audioFile ? (
                <>
                  <CheckCircle2 size={24} color="#059669" />
                  <Text style={[styles.dashTxt, {color: '#059669'}]}>{audioFile.name}</Text>
                  <Text style={styles.dashHint}>File ready to upload</Text>
                </>
              ) : (
                <>
                  <Mic2 size={24} color="#9CA3AF" />
                  <Text style={styles.dashTxt}>Tap to upload sermon audio</Text>
                  <Text style={styles.dashHint}>MP3 or WAV - Maximum 100 MB</Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          <View style={styles.fGroup}>
            <Text style={styles.fLabel}>Thumbnail <Text style={styles.fHint}>Auto-fetched from YouTube if linked</Text></Text>
            <TouchableOpacity style={[styles.dashBox, thumbnailFile && styles.dashBoxActive]} onPress={handleImagePick}>
              {thumbnailFile ? (
                <>
                  <CheckCircle2 size={24} color="#059669" />
                  <Text style={[styles.dashTxt, {color: '#059669'}]}>Image Selected</Text>
                  <Text style={styles.dashHint}>Custom thumbnail will be used</Text>
                </>
              ) : (
                <>
                  <ImageIcon size={24} color="#9CA3AF" />
                  <Text style={styles.dashTxt}>Upload custom thumbnail</Text>
                  <Text style={styles.dashHint}>JPG or PNG - 16:9 recommended</Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          <View style={styles.fGroup}>
            <Text style={styles.fLabel}>Description <Text style={styles.fHint}>Shown below title in app</Text></Text>
            <TextInput style={[styles.input, { fontFamily: 'monospace', fontSize: 12 }]} multiline numberOfLines={3} value={form.description} onChangeText={(v) => setForm({...form, description: v})} placeholder="Brief summary of this sermon..." />
          </View>
        </View>

        {/* 4. Notifications */}
        <View style={styles.modBox}>
          <View style={[styles.modHd, styles.hdBlue]}>
            <Bell size={14} color="#3b82f6" />
            <Text style={styles.modHdTxt}>Push Notification</Text>
          </View>
          <View style={styles.toggleRow}>
            <Text style={styles.toggleTxt}>Notify members when published</Text>
            <TouchableOpacity style={[styles.switch, styles.switchOn]} onPress={() => {}}>
              <View style={[styles.switchDot, styles.switchDotOn]} />
            </TouchableOpacity>
          </View>
          <View style={styles.toggleRow}>
            <Text style={styles.toggleTxt}>Auto-send immediately on publish</Text>
            <TouchableOpacity style={styles.switch} onPress={() => {}}>
              <View style={styles.switchDot} />
            </TouchableOpacity>
          </View>

          {/* Notification Preview */}
          <View style={styles.notifPreview}>
            <View style={styles.notifHeader}>
              <View style={styles.notifLogo}><Text style={{fontSize: 6, color: '#fff', fontWeight: '800'}}>CG</Text></View>
              <Text style={styles.notifHeaderTxt}>Church of GOD · Now</Text>
            </View>
            <Text style={styles.notifTitle}>New Sermon 🎙️</Text>
            <Text style={styles.notifBody}>Sermon title · Pastor name · Watch now</Text>
          </View>
        </View>

        {/* 5. Publish Status */}
        <View style={styles.modBox}>
          <View style={[styles.modHd, styles.hdBlue]}>
            <Radio size={14} color="#1a2d5a" />
            <Text style={styles.modHdTxt}>Publish Status</Text>
          </View>
          <TouchableOpacity style={styles.selectBox} onPress={() => setShowStatusPicker(true)}>
            <Text style={styles.selectTxt}>{getStatusLabel(form.status)}</Text>
            <ChevronDown size={18} color="#6B7280" />
          </TouchableOpacity>
        </View>

        {/* Action Buttons */}
        <View style={{ marginBottom: 40 }}>
          <View style={{ flexDirection: 'row', gap: 12, marginBottom: 15 }}>
            <TouchableOpacity style={{ flex: 1 }} onPress={() => handleSave('Draft')} disabled={loading}>
              <LinearGradient colors={['#1a2d5a', '#3b82f6']} style={[styles.btnActionHalf, loading && { opacity: 0.7 }]}>
                {loading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <FileText size={18} color="#fff" />
                    <Text style={styles.btnActionHalfTxt}>Save Draft</Text>
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity style={{ flex: 1 }} onPress={() => handleSave('Published')} disabled={loading}>
              <LinearGradient colors={['#10b981', '#059669']} style={[styles.btnActionHalf, loading && { opacity: 0.7 }]}>
                {loading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Radio size={18} color="#fff" />
                    <Text style={styles.btnActionHalfTxt}>Publish</Text>
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.btnBackLink} onPress={() => setActiveTab(3)}>
            <Text style={styles.btnBackLinkTxt}>← Back to sermons</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Status Picker Modal */}
      <Modal visible={showStatusPicker} transparent animationType="fade">
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowStatusPicker(false)}>
          <View style={styles.pickerCard}>
            {statusOptions.map((opt) => (
              <TouchableOpacity 
                key={opt.value} 
                style={[styles.pickerItem, form.status === opt.value && styles.pickerItemActive]}
                onPress={() => {
                  setForm({ ...form, status: opt.value });
                  setShowStatusPicker(false);
                }}
              >
                <Text style={[styles.pickerItemTxt, form.status === opt.value && styles.pickerItemTxtActive]}>
                  {opt.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Success Modal */}
      <Modal visible={showSuccess} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.successCard}>
              <View style={styles.successIconBox}>
                <CheckCircle2 size={50} color="#FCD34D" strokeWidth={2.5} />
              </View>
            <Text style={styles.successTitle}>Success!</Text>
            <Text style={styles.successSub}>Your sermon metadata has been saved successfully.</Text>
            <TouchableOpacity style={styles.successBtn} onPress={closeSuccess}>
              <Text style={styles.successBtnTxt}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Error Modal */}
      <Modal visible={showError} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.errorCard}>
            <View style={styles.errorIconBox}>
              <X size={40} color="#c0392b" strokeWidth={3} />
            </View>
            <Text style={styles.errorTitle}>Save Failed</Text>
            <Text style={styles.errorSub}>{errorMsg}</Text>
            <TouchableOpacity style={[styles.successBtn, { backgroundColor: '#c0392b' }]} onPress={() => setShowError(false)}>
              <Text style={styles.successBtnTxt}>Try Again</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
      {/* Floating Action Button */}
      <TouchableOpacity style={styles.fab} onPress={() => handleSave('Published')}>
        <Save size={24} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}
