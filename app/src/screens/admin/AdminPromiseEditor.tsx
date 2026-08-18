import React, { useState, useEffect, useContext, useRef, useMemo } from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  ScrollView, 
  TextInput, 
  TouchableOpacity, 
  ActivityIndicator,
  Platform,
  Dimensions,
  Alert,
  Modal,
  Share,
  Image,
  Animated,
  Easing
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { 
  Calendar as CalendarIcon, 
  BookOpen, 
  Languages, 
  Play, 
  User, 
  Eye, 
  Save, 
  ChevronLeft,
  ChevronDown,
  X,
  ChevronRight,
  CheckCircle2,
  Menu,
  Check
} from 'lucide-react-native';
import { AdminTabContext } from '../../context/AdminTabContext';
import * as MediaLibrary from 'expo-media-library';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { captureRef } from 'react-native-view-shot';
import firestore from '@react-native-firebase/firestore';
import { useTheme } from '../../context/ThemeContext';
import Svg, { Path } from 'react-native-svg';

const AnimatedPath = Animated.createAnimatedComponent(Path);

import SalesforceService from '../../services/SalesforceService';

const { width } = Dimensions.get('window');

const THEME_COLORS = [
  '#1a2d5a', // Navy
  '#c0392b', // Red
  '#15803D', // Green
  '#7C3AED', // Purple
  '#D97706', // Amber
  '#0891B2', // Teal
  '#BE185D', // Pink
  '#4338CA', // Indigo
  '#374151', // Gray
  '#0F172A'  // Dark
];

const STATUS_OPTIONS = [
  { label: 'Draft — save only, not visible', value: 'Draft' },
  { label: 'Scheduled — auto-publish at midnight', value: 'Scheduled' },
  { label: 'Publish now — live immediately', value: 'Published' }
];

const STEPPER_TABS = [
  { id: 'schedule', label: 'Schedule', icon: CalendarIcon, color: '#f59e0b' },
  { id: 'english', label: 'English', text: 'A', color: '#3b82f6' },
  { id: 'telugu', label: 'Telugu', text: 'తె', color: '#8b5cf6' },
  { id: 'thumbnail', label: 'Thumbnail', icon: Eye, color: '#ec4899' },
  { id: 'youtube', label: 'YouTube', icon: Play, color: '#ef4444' },
  { id: 'pastor', label: 'Pastor', icon: User, color: '#14b8a6' },
  { id: 'publish', label: 'Publish', icon: Check, color: '#22c55e' }
];

const AnimatedWaveStepper = ({ isDark, colors, dashOffset }: any) => {
  const [phase, setPhase] = useState(0);
  const scrollViewRef = useRef<ScrollView>(null);
  const isUserScrolling = useRef(false);

  useEffect(() => {
    const listenerId = dashOffset.addListener(({ value }: { value: number }) => {
      if (isUserScrolling.current) return; // Allow manual scrolling

      const currentX = 500 - value;
      let targetScrollX = currentX - (width / 2) + 40; // +40 slightly offsets to the right so we see the line ahead
      if (targetScrollX < 0) targetScrollX = 0;
      
      if (scrollViewRef.current) {
        scrollViewRef.current.scrollTo({ x: targetScrollX, animated: false });
      }
    });
    return () => {
      dashOffset.removeListener(listenerId);
    };
  }, [dashOffset]);

  useEffect(() => {
    let frame: number;
    const tick = () => {
      setPhase(p => p + 0.015); // Slower wave undulation
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, []);

  const wavePath = useMemo(() => {
    let d = '';
    for (let x = 37.5; x <= 487.5; x += 5) {
      const i = (x - 37.5) / 75;
      const y = 20 + Math.sin(phase - i * 1.5) * 15;
      if (x === 37.5) d += `M ${x} ${y}`;
      else d += ` L ${x} ${y}`;
    }
    return d;
  }, [phase]);

  return (
    <ScrollView 
      ref={scrollViewRef} 
      horizontal 
      showsHorizontalScrollIndicator={false} 
      contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 25, paddingTop: 20 }}
      onScrollBeginDrag={() => { isUserScrolling.current = true; }}
      onScrollEndDrag={() => { isUserScrolling.current = false; }}
      onMomentumScrollEnd={() => { isUserScrolling.current = false; }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', position: 'relative' }}>
        
        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: -1 }}>
          <Svg width={525} height={60}>
            <AnimatedPath 
              d={wavePath}
              fill="none" 
              stroke="#3b82f6" 
              strokeWidth="2" 
              strokeDasharray="500, 500"
              strokeDashoffset={dashOffset}
            />
          </Svg>
        </View>
        
        {STEPPER_TABS.map((step, index) => {
          const Icon = step.icon;
          const ty = Math.sin(phase - index * 1.5) * 15;
          const itemX = index * 75 + 37.5;
          const hitOffset = 500 - itemX;

          const animatedBg = dashOffset.interpolate({
            inputRange: [0, hitOffset - 1, hitOffset, 500],
            outputRange: [step.color, step.color, isDark ? '#1e293b' : '#eff6ff', isDark ? '#1e293b' : '#eff6ff'],
            extrapolate: 'clamp'
          });

          const animatedBorder = dashOffset.interpolate({
            inputRange: [0, hitOffset - 1, hitOffset, 500],
            outputRange: [step.color, step.color, isDark ? '#475569' : '#bfdbfe', isDark ? '#475569' : '#bfdbfe'],
            extrapolate: 'clamp'
          });

          const activeOpacity = dashOffset.interpolate({
            inputRange: [0, hitOffset - 1, hitOffset, 500],
            outputRange: [1, 1, 0, 0],
            extrapolate: 'clamp'
          });

          const inactiveOpacity = dashOffset.interpolate({
            inputRange: [0, hitOffset - 1, hitOffset, 500],
            outputRange: [0, 0, 1, 1],
            extrapolate: 'clamp'
          });

          return (
            <View key={step.id} style={{ alignItems: 'center', width: 75, transform: [{ translateY: ty }] }}>
              <Animated.View style={{ width: 40, height: 40, borderRadius: 20, borderWidth: 1, borderColor: animatedBorder, backgroundColor: animatedBg, justifyContent: 'center', alignItems: 'center', marginBottom: 8 }}>
                <Animated.View style={{ position: 'absolute', opacity: inactiveOpacity, alignItems: 'center', justifyContent: 'center' }}>
                  {step.text ? (
                    <Text style={{ color: '#3b82f6', fontSize: 16, fontWeight: '700' }}>{step.text}</Text>
                  ) : Icon ? (
                    <Icon size={18} color="#3b82f6" />
                  ) : null}
                </Animated.View>
                <Animated.View style={{ position: 'absolute', opacity: activeOpacity, alignItems: 'center', justifyContent: 'center' }}>
                  {step.text ? (
                    <Text style={{ color: '#ffffff', fontSize: 16, fontWeight: '700' }}>{step.text}</Text>
                  ) : Icon ? (
                    <Icon size={18} color="#ffffff" />
                  ) : null}
                </Animated.View>
              </Animated.View>
              <Text style={{ fontSize: 10, color: colors.textSecondary, fontWeight: '500' }}>{step.label}</Text>
            </View>
          );
        })}
      </View>
    </ScrollView>
  );
};

export default function AdminPromiseEditor() {
  const { setActiveTab, editingData, setEditingData, openDrawer } = useContext(AdminTabContext);
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => getStyles(colors, isDark), [colors, isDark]);
  const [loading, setLoading] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const dashOffset = useRef(new Animated.Value(500)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(dashOffset, {
          toValue: 0,
          duration: 12000, // Greatly slowed down for a smooth, relaxed trace
          easing: Easing.linear,
          useNativeDriver: false,
        }),
        Animated.delay(5000) // Wait 5 seconds at the end before looping!
      ])
    ).start();
  }, []);
  
  const [showStatusPicker, setShowStatusPicker] = useState(false);
  
  const [form, setForm] = useState({
    date: new Date().toLocaleDateString('en-CA'),
    enRef: '',
    enVerse: '',
    enNote: '',
    teVerse: '',
    teRef: '',
    teNote: '',
    ytUrl: '',
    videoTitle: '',
    duration: '',
    pastor: '',
    status: 'Scheduled',
    theme: '#1a2d5a',
    imageUrl: ''
  });

  const stripHtml = (html?: string) => {
    if (!html) return '';
    return html.replace(/<[^>]*>?/gm, '').replace(/&nbsp;/g, ' ').replace(/&#39;/g, "'").trim();
  };

  useEffect(() => {
    if (editingData) {
      const cleanEnRef = editingData.verseReferenceEn?.startsWith('DP-') ? '' : editingData.verseReferenceEn;
      const cleanTeRef = editingData.verseReferenceTe || '';
      
      setForm({
        ...form,
        date: editingData.date || new Date().toLocaleDateString('en-CA'),
        enVerse: stripHtml(editingData.verse) || '',
        enRef: cleanEnRef || '',
        teVerse: stripHtml(editingData.verseTelugu) || '',
        teRef: cleanTeRef || '',
        enNote: stripHtml(editingData.devotionalNote) || '',
        ytUrl: editingData.youtubeId || '',
        videoTitle: editingData.videoTitle || '',
        duration: editingData.duration || '',
        pastor: editingData.pastor || '',
        status: editingData.status || 'Scheduled',
        theme: editingData.theme || '#1a2d5a',
        imageUrl: editingData.imageUrl || ''
      });
    } else {
      // Reset for NEW promise
      setForm({
        date: new Date().toLocaleDateString('en-CA'),
        enRef: '',
        enVerse: '',
        enNote: '',
        teVerse: '',
        teRef: '',
        teNote: '',
        ytUrl: '',
        videoTitle: '',
        duration: '',
        pastor: '',
        status: 'Scheduled',
        theme: '#1a2d5a',
        imageUrl: ''
      });
    }
  }, [editingData]);

  const [showSuccess, setShowSuccess] = useState(false);
  const [showThumbnailSuccess, setShowThumbnailSuccess] = useState(false);
  const [showError, setShowError] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const viewShotRef = useRef(null);

  const handleSaveToGallery = async () => {
    try {
      const { status } = await MediaLibrary.requestPermissionsAsync(true);
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'We need access to your gallery to save the promise card.');
        return;
      }

      const uri = await captureRef(viewShotRef, {
        format: 'png',
        quality: 1.0,
      });

      await MediaLibrary.saveToLibraryAsync(uri);
      Alert.alert('Saved!', 'The promise card has been saved to your gallery.');
    } catch (err) {
      console.error('Save failed:', err);
      Alert.alert('Error', 'Failed to save image.');
    }
  };

  const handleShare = async () => {
    try {
      const uri = await captureRef(viewShotRef, {
        format: 'png',
        quality: 1.0,
      });

      await Share.share({
        url: uri,
        message: `Today's Promise: ${form.enVerse} - ${form.enRef}`,
      });
    } catch (err) {
      console.error('Share failed:', err);
    }
  };

  const uploadImageToCloud = async (localUri: string): Promise<string> => {
    const filename = localUri.split('/').pop() || `promise_${Date.now()}.jpg`;
    const base64Data = await FileSystem.readAsStringAsync(localUri, { encoding: 'base64' });
    const { functions } = require('../../services/firebaseConfig');
    const uploadFunc = functions().app.functions('asia-south1').httpsCallable('uploadEventImage');
    const response = await uploadFunc({ image: base64Data, fileName: filename });
    if (response.data?.success && response.data?.url) return response.data.url;
    throw new Error('Cloud upload failed');
  };

  const pickThumbnail = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: 'images',
        allowsEditing: true,
        aspect: [16, 9],
        quality: 0.8,
      });

      if (!result.canceled) {
        setLoading(true);
        const cloudUrl = await uploadImageToCloud(result.assets[0].uri);
        setForm(prev => ({ ...prev, imageUrl: cloudUrl }));
        setShowThumbnailSuccess(true);
      }
    } catch (err) {
      console.error('Upload Error:', err);
      Alert.alert('Upload Failed', 'There was an issue uploading your image.');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (statusOverride?: string) => {
    const finalStatus = statusOverride || form.status;
    
    // Validation
    if (!form.date) return Alert.alert('Error', 'Please select a promise date.');
    if (!form.enVerse?.trim()) return Alert.alert('Error', 'Please enter the English verse.');
    if (!form.teVerse?.trim()) return Alert.alert('Error', 'Please enter the Telugu verse.');

    setLoading(true);
    try {
      const details = {
        id: editingData?.id,
        date: form.date,
        verse: form.enVerse,
        verseReferenceEn: form.enRef,
        verseTelugu: form.teVerse,
        verseReferenceTe: form.teRef,
        devotionalNote: form.enNote,
        youtubeId: form.ytUrl,
        videoTitle: form.videoTitle,
        duration: form.duration,
        pastor: form.pastor,
        status: finalStatus,
        theme: form.theme,
        imageUrl: form.imageUrl
      };
      
      await SalesforceService.createDailyPromise(details);

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
    setActiveTab(0);
  };

  const currentStatusLabel = STATUS_OPTIONS.find(o => o.value === form.status)?.label || form.status;

  // Simple JS-based date selection (Mocking a calendar grid for simplicity & stability)
  const renderDatePicker = () => {
    const days = Array.from({ length: 30 }, (_, i) => i + 1);
    return (
      <Modal visible={showDatePicker} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.pickerCard}>
            <View style={styles.pickerHd}>
              <Text style={styles.pickerTitle}>Select Date (April 2026)</Text>
              <TouchableOpacity onPress={() => setShowDatePicker(false)}><X size={20} color="#1a2d5a" /></TouchableOpacity>
            </View>
            <View style={styles.calGrid}>
              {days.map(d => (
                <TouchableOpacity 
                  key={d} 
                  style={[styles.calCell, form.date === `2026-04-${String(d).padStart(2,'0')}` && styles.calCellActive]}
                  onPress={() => {
                    setForm({...form, date: `2026-04-${String(d).padStart(2,'0')}`});
                    setShowDatePicker(false);
                  }}
                >
                  <Text style={[styles.calCellTxt, form.date === `2026-04-${String(d).padStart(2,'0')}` && styles.calCellTxtActive]}>{d}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      </Modal>
    );
  };

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {/* Header */}
        <LinearGradient colors={['#1a2d5a', '#3b82f6']} style={styles.headerOuter}>
          <LinearGradient colors={['#1a2d5a', '#23314d']} style={styles.headerInner}>
            <TouchableOpacity onPress={openDrawer} style={{ padding: 4, zIndex: 10 }}>
              <Menu size={26} color="#fff" />
            </TouchableOpacity>
            <View style={[StyleSheet.absoluteFillObject, { alignItems: 'center', justifyContent: 'center', paddingBottom: 5 }]} pointerEvents="none">
              <Text style={styles.headerTitle}>{editingData ? 'Edit promise' : 'New promise'}</Text>
            </View>
          </LinearGradient>
        </LinearGradient>

        {/* Stepper Track (Separate from header) */}
        <AnimatedWaveStepper isDark={isDark} colors={colors} dashOffset={dashOffset} />

        {/* 1. Schedule */}
        <View style={[styles.section, styles.secYellow]}>
          <View style={styles.secHd}>
            <CalendarIcon size={14} color={isDark ? '#FCD34D' : '#D97706'} />
            <Text style={[styles.secHdTXT, { color: isDark ? '#FCD34D' : '#D97706' }]}>Schedule</Text>
          </View>
          <View style={styles.fGroup}>
            <Text style={styles.fLabel}>Promise date <Text style={{color:'#c0392b'}}>*</Text></Text>
            <TouchableOpacity style={styles.inputWrap} onPress={() => setShowDatePicker(true)}>
              <Text style={styles.inputText}>{form.date.split('-').reverse().join(' - ')}</Text>
              <CalendarIcon size={14} color="#374151" style={styles.inputIcon} />
            </TouchableOpacity>
          </View>
          {renderDatePicker()}
          
          <View style={styles.fGroup}>
            <Text style={styles.fLabel}>Background theme</Text>
            <View style={styles.themeRow}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {THEME_COLORS.map(c => (
                  <TouchableOpacity key={c} style={[styles.themeChip, { backgroundColor: c }, form.theme === c && styles.themeActive]} onPress={() => setForm({...form, theme: c})} />
                ))}
              </ScrollView>
            </View>
          </View>
        </View>

        {/* 2. English Promise */}
        <View style={[styles.section, styles.secBlue]}>
          <View style={styles.secHd}>
            <BookOpen size={14} color={isDark ? '#60a5fa' : '#2563eb'} />
            <Text style={[styles.secHdTXT, { color: isDark ? '#60a5fa' : '#2563eb' }]}>English Promise</Text>
          </View>
          <View style={styles.fGroup}>
            <Text style={styles.fLabel}>Verse reference <Text style={{color:'#c0392b'}}>*</Text> <Text style={styles.fHint}>e.g. John 3:16</Text></Text>
            <TextInput style={styles.input} value={form.enRef} onChangeText={(v) => setForm({...form, enRef: v})} placeholder="Book Chapter:Verse" />
          </View>
          <View style={styles.fGroup}>
            <Text style={styles.fLabel}>Verse text — English <Text style={{color:'#c0392b'}}>*</Text></Text>
            <TextInput style={[styles.input, styles.textarea]} multiline value={form.enVerse} onChangeText={(v) => setForm({...form, enVerse: v})} placeholder="Type or paste the Bible verse in English…" />
          </View>
          <View style={styles.fGroup}>
            <Text style={styles.fLabel}>Devotional note — English <Text style={styles.fHint}>Optional</Text></Text>
            <TextInput style={[styles.input, styles.textarea]} multiline value={form.enNote} onChangeText={(v) => setForm({...form, enNote: v})} placeholder="Pastor's reflection in English…" />
          </View>
        </View>

        {/* 3. Telugu Promise */}
        <View style={[styles.section, styles.secViolet]}>
          <View style={styles.secHd}>
            <Languages size={14} color={isDark ? '#c4b5fd' : '#7c3aed'} />
            <Text style={[styles.secHdTXT, {color: isDark ? '#c4b5fd' : '#7c3aed'}]}>Telugu Promise - తెలుగు వాగ్దానం</Text>
          </View>
          <View style={styles.fGroup}>
            <Text style={styles.fLabel}>Verse reference — Telugu <Text style={styles.fHint}>e.g. యోహాను 3:16</Text></Text>
            <TextInput style={[styles.input, styles.teIn]} value={form.teRef} onChangeText={(v) => setForm({...form, teRef: v})} placeholder="పుస్తకం అధ్యాయం:వచనం" />
          </View>
          <View style={styles.fGroup}>
            <Text style={styles.fLabel}>Verse text — Telugu <Text style={{color:'#c0392b'}}>*</Text></Text>
            <TextInput style={[styles.input, styles.textarea, styles.teIn]} multiline value={form.teVerse} onChangeText={(v) => setForm({...form, teVerse: v})} placeholder="తెలుగులో బైబిల్ వచనం ఇక్కడ టైప్ చేయండి…" />
          </View>
          <View style={styles.fGroup}>
            <Text style={styles.fLabel}>Devotional note — Telugu <Text style={styles.fHint}>ఐచ్ఛికం</Text></Text>
            <TextInput style={[styles.input, styles.textarea, styles.teIn]} multiline value={form.teNote} onChangeText={(v) => setForm({...form, teNote: v})} placeholder="పాస్టర్ గారి వ్యాఖ్యానం తెలుగులో…" />
          </View>
        </View>

        {/* 3.5 Thumbnail Upload */}
        <View style={[styles.section, styles.secPink, { backgroundColor: isDark ? '#1e293b' : '#F3F4F6' }]}>
          <View style={styles.secHd}>
            <Eye size={14} color={isDark ? '#f472b6' : '#db2777'} />
            <Text style={[styles.secHdTXT, {color: isDark ? '#f472b6' : '#db2777'}]}>Daily Promise Thumbnail</Text>
          </View>
          <View style={styles.fGroup}>
            <Text style={styles.fLabel}>Upload Thumbnail Image <Text style={styles.fHint}>(Visible on member home screen)</Text></Text>
            {form.imageUrl ? (
              <View style={styles.thumbnailPreviewContainer}>
                <Image source={{ uri: form.imageUrl }} style={styles.thumbnailImg} resizeMode="cover" />
                <TouchableOpacity style={styles.removeThumbnailBtn} onPress={() => setForm(prev => ({ ...prev, imageUrl: '' }))}>
                  <Text style={styles.btnChangeThumbTxt}>Remove Image</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity style={styles.btnUploadThumb} onPress={pickThumbnail}>
                <Text style={styles.btnUploadThumbTxt}>Pick Image from Gallery</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* 4. YouTube Link */}
        <View style={[styles.section, styles.secRed]}>
          <View style={styles.secHd}>
            <Play size={14} color={isDark ? '#fca5a5' : '#c0392b'} />
            <Text style={[styles.secHdTXT, {color: isDark ? '#fca5a5' : '#c0392b'}]}>YouTube Link</Text>
          </View>
          <View style={styles.fGroup}>
            <Text style={styles.fLabel}>Video Title</Text>
            <TextInput style={styles.input} value={form.videoTitle} onChangeText={(v) => setForm({...form, videoTitle: v})} placeholder="Devotional Video Title" />
          </View>
          <View style={styles.fGroup}>
            <Text style={styles.fLabel}>Duration <Text style={styles.fHint}>e.g. 1:20</Text></Text>
            <TextInput style={styles.input} value={form.duration} onChangeText={(v) => setForm({...form, duration: v})} placeholder="Video duration" />
          </View>
          <View style={styles.fGroup}>
            <Text style={styles.fLabel}>YouTube video URL <Text style={styles.fHint}>today's 1-min devotional</Text></Text>
            <TextInput style={styles.input} value={form.ytUrl} onChangeText={(v) => setForm({...form, ytUrl: v})} placeholder="https://youtube.com/watch?v=…" />
            <Text style={styles.fSub}>Paste full URL or the 11-character video ID</Text>
          </View>
        </View>

        {/* 5. Pastor & Status */}
        <View style={[styles.section, styles.secBrightGreen]}>
          <View style={styles.secHd}>
            <User size={14} color={isDark ? '#34d399' : '#059669'} />
            <Text style={[styles.secHdTXT, { color: isDark ? '#34d399' : '#059669' }]}>Pastor & Status</Text>
          </View>
          <View style={styles.fGroup}>
            <Text style={styles.fLabel}>Pastor Name</Text>
            <TextInput style={styles.input} value={form.pastor} onChangeText={(v) => setForm({...form, pastor: v})} placeholder="Pastor Name" />
          </View>
          <View style={styles.fGroup}>
            <Text style={styles.fLabel}>Publish status</Text>
            <TouchableOpacity style={styles.input} onPress={() => setShowStatusPicker(true)}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={{ fontSize: 13, color: colors.text }}>{currentStatusLabel}</Text>
                <ChevronDown size={14} color={colors.textSecondary} />
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* Status Picker Modal */}
        <Modal visible={showStatusPicker} transparent animationType="slide">
          <View style={styles.modalOverlay}>
            <View style={styles.statusMenu}>
              <View style={styles.statusMenuHd}><Text style={styles.statusMenuTitle}>Select Publish Status</Text></View>
              {STATUS_OPTIONS.map(opt => (
                <TouchableOpacity 
                  key={opt.value} 
                  style={[styles.statusItem, form.status === opt.value && styles.statusItemActive]} 
                  onPress={() => { setForm({...form, status: opt.value}); setShowStatusPicker(false); }}
                >
                  <Text style={[styles.statusItemTxt, form.status === opt.value && styles.statusItemTxtActive]}>{opt.label}</Text>
                </TouchableOpacity>
              ))}
              <TouchableOpacity style={styles.statusCancel} onPress={() => setShowStatusPicker(false)}>
                <Text style={styles.statusCancelTxt}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* Thumbnail Success Modal */}
        <Modal visible={showThumbnailSuccess} transparent animationType="fade">
          <View style={styles.modalOverlay}>
            <View style={styles.successCard}>
              <View style={styles.successIconBox}>
                <CheckCircle2 size={50} color="#FCD34D" strokeWidth={2.5} />
              </View>
              <Text style={styles.successTitle}>Success!</Text>
              <Text style={styles.successSub}>Thumbnail uploaded to cloud successfully! Remember to Save Changes.</Text>
              <TouchableOpacity style={styles.successBtn} onPress={() => setShowThumbnailSuccess(false)}>
                <Text style={styles.successBtnTxt}>OK</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* Success Modal */}
        <Modal visible={showSuccess} transparent animationType="fade">
          <View style={styles.modalOverlay}>
            <View style={styles.successCard}>
              <View style={styles.successIconBox}>
                <CheckCircle2 size={50} color="#FCD34D" strokeWidth={2.5} />
              </View>
              <Text style={styles.successTitle}>Success!</Text>
              <Text style={styles.successSub}>Your daily promise has been published successfully.</Text>
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

        {/* Footer Actions */}
        <View style={{ flexDirection: 'row', gap: 12, marginBottom: 20 }}>
          <TouchableOpacity style={styles.btnBadge} onPress={() => handleSave('Draft')}>
            <LinearGradient colors={['#60a5fa', '#2563eb']} style={styles.btnBadgeGradient}>
              <Save size={16} color="#fff" />
              <Text style={styles.btnBadgeTxt}>Save as Draft</Text>
            </LinearGradient>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.btnBadge} onPress={() => handleSave()}>
            <LinearGradient colors={['#34d399', '#059669']} style={styles.btnBadgeGradient}>
              <Save size={16} color="#fff" />
              <Text style={styles.btnBadgeTxt}>Save & Publish</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.btnBack} onPress={() => setActiveTab(0)}>
          <Text style={styles.btnBackTxt}>← Back to list</Text>
        </TouchableOpacity>

        <View style={{ height: 60 }} />
      </ScrollView>

      {/* FAB */}
      <TouchableOpacity style={styles.fab} onPress={() => handleSave()}>
        <Save size={24} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}

const getStyles = (colors: any, isDark: boolean) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scroll: { padding: 14, paddingBottom: 100 },

  headerOuter: {
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    marginBottom: 15,
    marginHorizontal: -14,
    marginTop: -14,
    paddingBottom: 4, 
  },
  headerInner: {
    paddingTop: 5,
    paddingHorizontal: 20,
    paddingBottom: 15,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    height: 60,
  },
  headerTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerIcon: { fontSize: 18 },
  headerTitle: { fontSize: 22, fontWeight: '700', color: '#fff', fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif' },

  section: { borderRadius: 12, padding: 14, marginBottom: 15, borderWidth: 0.5, borderColor: colors.border, borderLeftWidth: 4, backgroundColor: colors.card },
  secNavy: { borderLeftColor: isDark ? '#3b82f6' : '#1a2d5a' },
  secBlue: { borderLeftColor: '#2563eb' },
  secRed: { borderLeftColor: '#c0392b' },
  secGreen: { borderLeftColor: '#15803D' },
  secYellow: { borderLeftColor: '#F59E0B' },
  secViolet: { borderLeftColor: '#8B5CF6' },
  secBrown: { borderLeftColor: '#9a3412' },
  secPink: { borderLeftColor: '#ec4899' },
  secBrightGreen: { borderLeftColor: '#10b981' },

  secHd: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 },
  secHdTXT: { fontSize: 11, fontWeight: '700', color: colors.text, textTransform: 'uppercase', letterSpacing: 0.5 },

  fGroup: { marginBottom: 15 },
  fLabel: { fontSize: 11, fontWeight: '600', color: colors.text, marginBottom: 6 },
  fHint: { fontWeight: '400', color: colors.textSecondary, fontSize: 9 },
  fSub: { fontSize: 9, color: colors.textSecondary, marginTop: 4 },

  inputWrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: isDark ? '#1e293b' : '#fff', borderWidth: 1, borderColor: isDark ? '#64748b' : '#94a3b8', borderRadius: 8, padding: 10 },
  inputText: { flex: 1, fontSize: 13, color: colors.text },
  input: { backgroundColor: isDark ? '#1e293b' : '#fff', borderWidth: 1, borderColor: isDark ? '#64748b' : '#94a3b8', borderRadius: 8, padding: 10, fontSize: 13, color: colors.text },
  inputIcon: { marginLeft: 10 },
  textarea: { minHeight: 70, textAlignVertical: 'top' },
  teIn: { fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif', fontStyle: 'italic', color: colors.text },

  themeRow: { flexDirection: 'row', marginTop: 8, gap: 10 },
  themeChip: { width: 36, height: 36, borderRadius: 18, borderWidth: 3, borderColor: 'transparent' },
  themeActive: { borderColor: isDark ? '#94a3b8' : '#fff', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.4, shadowRadius: 4, elevation: 6 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center' },
  pickerCard: { backgroundColor: colors.card, width: '85%', borderRadius: 20, padding: 20, elevation: 10, borderWidth: 1, borderColor: colors.border },
  pickerHd: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  pickerTitle: { fontSize: 14, fontWeight: '700', color: colors.text },
  calGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 5 },
  calCell: { width: (width * 0.85 - 70) / 7, height: 35, justifyContent: 'center', alignItems: 'center', borderRadius: 8, backgroundColor: isDark ? '#334155' : '#f9fafb' },
  calCellActive: { backgroundColor: '#3b82f6' },
  calCellTxt: { fontSize: 11, color: colors.text, fontWeight: '600' },
  calCellTxtActive: { color: '#fff' },

  statusMenu: { backgroundColor: colors.card, width: '100%', position: 'absolute', bottom: 0, borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingBottom: 30, borderWidth: 1, borderColor: colors.border },
  statusMenuHd: { padding: 20, borderBottomWidth: 0.5, borderBottomColor: colors.border },
  statusMenuTitle: { fontSize: 14, fontWeight: '700', color: colors.text, textAlign: 'center' },
  statusItem: { padding: 20, borderBottomWidth: 0.5, borderBottomColor: colors.border },
  statusItemActive: { backgroundColor: isDark ? '#1e3a8a' : '#EFF6FF' },
  statusItemTxt: { fontSize: 13, color: colors.text, textAlign: 'center' },
  statusItemTxtActive: { color: isDark ? '#60a5fa' : '#2563eb', fontWeight: '700' },
  statusCancel: { padding: 15, alignItems: 'center' },
  statusCancelTxt: { color: '#ef4444', fontWeight: '700' },

  successCard: { backgroundColor: isDark ? '#1e293b' : '#1a2d5a', width: '85%', borderRadius: 24, padding: 30, alignItems: 'center', elevation: 20, shadowColor: '#000', shadowOpacity: 0.4, shadowRadius: 15, borderWidth: 2, borderColor: '#3b82f6' },
  successIconBox: { width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(255,255,255,0.1)', justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  successTitle: { fontSize: 24, fontWeight: '800', color: '#fff', marginBottom: 10 },
  successSub: { fontSize: 14, color: '#e5e7eb', textAlign: 'center', lineHeight: 22, marginBottom: 25 },
  successBtn: { backgroundColor: '#3b82f6', width: '100%', paddingVertical: 15, borderRadius: 12, alignItems: 'center' },
  successBtnTxt: { color: '#fff', fontSize: 15, fontWeight: '700', letterSpacing: 0.5 },

  errorCard: { backgroundColor: colors.card, width: '85%', borderRadius: 24, padding: 30, alignItems: 'center', elevation: 20, shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 15, borderWidth: 1, borderColor: colors.border },
  errorIconBox: { width: 70, height: 70, borderRadius: 35, backgroundColor: isDark ? '#7f1d1d' : '#FEF2F2', justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  errorTitle: { fontSize: 20, fontWeight: '800', color: isDark ? '#fca5a5' : '#c0392b', marginBottom: 10 },
  errorSub: { fontSize: 13, color: colors.textSecondary, textAlign: 'center', lineHeight: 20, marginBottom: 25 },

  cardPreview: { borderRadius: 14, padding: 20 },
  cardLabel: { fontSize: 10, color: '#FCD34D', fontWeight: '700', marginBottom: 10, letterSpacing: 1 },
  cardVerseEn: { color: '#fff', fontSize: 13, fontStyle: 'italic', lineHeight: 22, marginBottom: 8 },
  cardVerseTe: { color: '#aac4e8', fontSize: 14, fontStyle: 'italic', lineHeight: 22, marginBottom: 12, fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif' },
  cardRef: { color: '#FCD34D', fontSize: 11, fontWeight: '700', marginBottom: 15 },
  cardBtnRow: { flexDirection: 'row', gap: 10 },
  cardBtn: { flex: 1, backgroundColor: 'rgba(255,255,255,0.1)', paddingVertical: 8, borderRadius: 8, alignItems: 'center' },
  cardBtnRed: { backgroundColor: '#c0392b' },
  cardBtnTxt: { color: '#fff', fontSize: 10, fontWeight: '600' },

  btnBadge: { flex: 1, borderRadius: 25, overflow: 'hidden', elevation: 3, shadowColor: '#000', shadowOffset: {width: 0, height: 2}, shadowOpacity: 0.2, shadowRadius: 3 },
  btnBadgeGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12, paddingHorizontal: 15 },
  btnBadgeTxt: { color: '#fff', fontSize: 13, fontWeight: '700' },
  btnBack: { alignItems: 'center' },
  btnBackTxt: { fontSize: 12, color: colors.textSecondary, fontWeight: '600' },

  btnUploadThumb: { backgroundColor: isDark ? '#334155' : '#E5E7EB', borderRadius: 8, padding: 12, alignItems: 'center', borderWidth: 1, borderColor: colors.border, borderStyle: 'dashed' },
  btnUploadThumbTxt: { color: colors.textSecondary, fontSize: 13, fontWeight: '600' },
  thumbContainer: { flexDirection: 'row', alignItems: 'center', gap: 15 },
  thumbnailPreviewContainer: { flexDirection: 'row', alignItems: 'center', gap: 15, marginTop: 10 },
  thumbnailImg: { width: 80, height: 80, borderRadius: 8, backgroundColor: colors.border },
  btnChangeThumb: { backgroundColor: '#3b82f6', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 6 },
  removeThumbnailBtn: { backgroundColor: '#ef4444', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 6 },
  btnChangeThumbTxt: { color: '#fff', fontSize: 12, fontWeight: '600' },

  fab: { position: 'absolute', right: 20, bottom: 30, width: 56, height: 56, borderRadius: 28, backgroundColor: '#c0392b', justifyContent: 'center', alignItems: 'center', elevation: 8, shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 8 }
});
