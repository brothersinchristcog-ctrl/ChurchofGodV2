import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, KeyboardAvoidingView, Platform, Modal } from 'react-native';
import { useTheme } from '../../../context/ThemeContext';
import { useAuth } from '../../../context/AuthContext';
import firebase from '@react-native-firebase/app';
import { Calendar, Clock, Book, User, Type, AlignLeft, Link as LinkIcon, Copy, CheckCircle, AlertCircle, X } from 'lucide-react-native';
import DateTimePickerModal from 'react-native-modal-datetime-picker';
import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';
import * as Clipboard from 'expo-clipboard';

GoogleSignin.configure({
  scopes: ['https://www.googleapis.com/auth/meetings.space.created'],
  webClientId: '610167013138-44leu198o42ms4q6eh9o8giemj15hltn.apps.googleusercontent.com',
  offlineAccess: true,
});

export default function AdminBibleClassesCreate({ onBack }: { onBack: () => void }) {
  const { isDark } = useTheme();
  const { member } = useAuth();
  const [loading, setLoading] = useState(false);
  
  // Custom Popup State
  const [popup, setPopup] = useState({
    visible: false,
    type: 'success', // 'success' | 'error' | 'link'
    title: '',
    message: '',
    link: '',
    onClose: () => {}
  });

  const showPopup = (type: 'success'|'error'|'link', title: string, message: string, link: string = '', onClose: () => void = () => {}) => {
    setPopup({ visible: true, type, title, message, link, onClose });
  };

  const closePopup = () => {
    const onC = popup.onClose;
    setPopup(prev => ({ ...prev, visible: false }));
    if (onC) onC();
  };

  const copyToClipboard = async (text: string) => {
    if (!text) return;
    await Clipboard.setStringAsync(text);
  };

  const promptAsync = async () => {
    try {
      setLoading(true);
      await GoogleSignin.hasPlayServices();
      await GoogleSignin.signIn();
      const tokens = await GoogleSignin.getTokens();
      if (tokens.accessToken) {
        await generateMeetLink(tokens.accessToken);
      }
    } catch (error: any) {
      if (error.code === statusCodes.SIGN_IN_CANCELLED) {
        console.log('User cancelled login flow');
      } else if (error.code === statusCodes.IN_PROGRESS) {
        console.log('Sign in is in progress');
      } else if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
        showPopup('error', 'Error', 'Play services not available or outdated');
      } else {
        showPopup('error', 'Google Sign-In Error', error.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const generateMeetLink = async (token: string) => {
    try {
      setLoading(true);
      const res = await fetch('https://meet.googleapis.com/v2/spaces', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          config: { accessType: 'OPEN' }
        })
      });
      const data = await res.json();
      if (data.meetingUri) {
        setForm(prev => ({ ...prev, meetingLink: data.meetingUri }));
        showPopup('link', 'Link Generated!', 'Your Google Meet link has been generated successfully. You can copy and share it below.', data.meetingUri);
      } else {
        showPopup('error', 'Error', 'Failed to generate link: ' + JSON.stringify(data));
      }
    } catch (e: any) {
      showPopup('error', 'Error', e.message);
    } finally {
      setLoading(false);
    }
  };

  const [form, setForm] = useState({
    title: '',
    topic: '',
    bibleBook: '',
    date: '',
    startTime: '',
    endTime: '',
    teacherName: member?.name || '',
    meetingLink: '',
  });

  const [isDatePickerVisible, setDatePickerVisibility] = useState(false);
  const [isStartTimePickerVisible, setStartTimePickerVisibility] = useState(false);
  const [isEndTimePickerVisible, setEndTimePickerVisibility] = useState(false);

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    });
  };
  
  const formatDateDDMMYYYY = (date: Date) => {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}-${month}-${year}`;
  };

  const handleChange = (key: string, value: string) => {
    setForm(prev => ({ ...prev, [key]: value }));
  };

  const parseDateTimeToMs = (dateStr: string, timeStr: string) => {
    try {
      const [day, month, year] = dateStr.split('-');
      
      const match = timeStr.match(/(\d+):(\d+)\s*(AM|PM)/i);
      if (!match) return null;

      let hours = match[1];
      const minutes = match[2];
      const modifier = match[3].toUpperCase();
      
      if (hours === '12') hours = '00';
      if (modifier === 'PM') hours = String(parseInt(hours, 10) + 12);
      
      const isoString = `${year}-${month}-${day}T${hours.padStart(2, '0')}:${minutes}:00`;
      return new Date(isoString).getTime();
    } catch (e) {
      return null;
    }
  };

  const handleCreate = async () => {
    if (!form.title || !form.date || !form.startTime || !form.endTime || !form.meetingLink) {
      showPopup('error', 'Missing Fields', 'Please fill out all required fields, including the Meeting Link.');
      return;
    }

    setLoading(true);
    try {
      const createBibleClass = firebase.app().functions('asia-south1').httpsCallable('createBibleClass');
      const startTimestamp = parseDateTimeToMs(form.date, form.startTime);
      const result = await createBibleClass({
        churchId: 'default',
        title: form.title,
        topic: form.topic,
        bibleBook: form.bibleBook,
        date: form.date,
        startTime: form.startTime,
        endTime: form.endTime,
        teacherId: member?.id || 'admin',
        teacherName: form.teacherName,
        meetingLink: form.meetingLink,
        recurrence: 'NONE',
        startTimestamp
      });

      const data = result.data as any;
      if (data.success) {
        showPopup('success', 'Class Created!', 'Bible Class has been scheduled successfully and members will be notified.', '', onBack);
      } else {
        showPopup('error', 'Error', data.message || 'Failed to create class');
      }
    } catch (error: any) {
      console.error(error);
      showPopup('error', 'Error', error.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={[styles.title, { color: isDark ? '#fff' : '#1e293b' }]}>Schedule New Class</Text>
        <Text style={styles.subtitle}>Generate a Google Meet link automatically, and notifications will be sent to members.</Text>
        
        <View style={styles.formGroup}>
          <Text style={[styles.label, { color: isDark ? '#cbd5e1' : '#475569' }]}>Class Title *</Text>
          <View style={[styles.inputContainer, { backgroundColor: isDark ? '#1e293b' : '#fff', borderColor: isDark ? '#334155' : '#e2e8f0' }]}>
            <Type size={20} color="#94a3b8" />
            <TextInput
              style={[styles.input, { color: isDark ? '#fff' : '#1e293b' }]}
              placeholder="e.g. Wednesday Night Bible Study"
              placeholderTextColor="#94a3b8"
              value={form.title}
              onChangeText={(t) => handleChange('title', t)}
            />
          </View>
        </View>

        <View style={styles.formGroup}>
          <Text style={[styles.label, { color: isDark ? '#cbd5e1' : '#475569' }]}>Topic / Theme</Text>
          <View style={[styles.inputContainer, { backgroundColor: isDark ? '#1e293b' : '#fff', borderColor: isDark ? '#334155' : '#e2e8f0' }]}>
            <AlignLeft size={20} color="#94a3b8" />
            <TextInput
              style={[styles.input, { color: isDark ? '#fff' : '#1e293b' }]}
              placeholder="e.g. Faith & Grace"
              placeholderTextColor="#94a3b8"
              value={form.topic}
              onChangeText={(t) => handleChange('topic', t)}
            />
          </View>
        </View>


        <View style={styles.formGroup}>
          <Text style={[styles.label, { color: isDark ? '#cbd5e1' : '#475569' }]}>Bible Book (Optional)</Text>
          <View style={[styles.inputContainer, { backgroundColor: isDark ? '#1e293b' : '#fff', borderColor: isDark ? '#334155' : '#e2e8f0' }]}>
            <Book size={20} color="#94a3b8" />
            <TextInput
              style={[styles.input, { color: isDark ? '#fff' : '#1e293b' }]}
              placeholder="e.g. Romans 8"
              placeholderTextColor="#94a3b8"
              value={form.bibleBook}
              onChangeText={(t) => handleChange('bibleBook', t)}
            />
          </View>
        </View>

        <View style={styles.formGroup}>
          <Text style={[styles.label, { color: isDark ? '#cbd5e1' : '#475569' }]}>Date *</Text>
          <TouchableOpacity 
            style={[styles.inputContainer, { backgroundColor: isDark ? '#1e293b' : '#fff', borderColor: isDark ? '#334155' : '#e2e8f0' }]}
            onPress={() => setDatePickerVisibility(true)}
          >
            <Calendar size={20} color="#94a3b8" />
            <Text style={[styles.input, { color: form.date ? (isDark ? '#fff' : '#1e293b') : '#94a3b8', lineHeight: 20 }]}>
              {form.date || 'DD-MM-YYYY'}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.row}>
          <View style={[styles.formGroup, { flex: 1, marginRight: 8 }]}>
            <Text style={[styles.label, { color: isDark ? '#cbd5e1' : '#475569' }]}>Start Time *</Text>
            <TouchableOpacity 
              style={[styles.inputContainer, { backgroundColor: isDark ? '#1e293b' : '#fff', borderColor: isDark ? '#334155' : '#e2e8f0' }]}
              onPress={() => setStartTimePickerVisibility(true)}
            >
              <Clock size={20} color="#94a3b8" />
              <Text style={[styles.input, { color: form.startTime ? (isDark ? '#fff' : '#1e293b') : '#94a3b8', lineHeight: 20 }]}>
                {form.startTime || 'e.g. 7:00 PM'}
              </Text>
            </TouchableOpacity>
          </View>
          
          <View style={[styles.formGroup, { flex: 1, marginLeft: 8 }]}>
            <Text style={[styles.label, { color: isDark ? '#cbd5e1' : '#475569' }]}>End Time *</Text>
            <TouchableOpacity 
              style={[styles.inputContainer, { backgroundColor: isDark ? '#1e293b' : '#fff', borderColor: isDark ? '#334155' : '#e2e8f0' }]}
              onPress={() => setEndTimePickerVisibility(true)}
            >
              <Clock size={20} color="#94a3b8" />
              <Text style={[styles.input, { color: form.endTime ? (isDark ? '#fff' : '#1e293b') : '#94a3b8', lineHeight: 20 }]}>
                {form.endTime || 'e.g. 8:30 PM'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.formGroup}>
          <Text style={[styles.label, { color: isDark ? '#cbd5e1' : '#475569' }]}>Teacher / Host Name</Text>
          <View style={[styles.inputContainer, { backgroundColor: isDark ? '#1e293b' : '#fff', borderColor: isDark ? '#334155' : '#e2e8f0' }]}>
            <User size={20} color="#94a3b8" />
            <TextInput
              style={[styles.input, { color: isDark ? '#fff' : '#1e293b' }]}
              placeholder="Teacher Name"
              placeholderTextColor="#94a3b8"
              value={form.teacherName}
              onChangeText={(t) => handleChange('teacherName', t)}
            />
          </View>
        </View>

        <View style={styles.formGroup}>
          <Text style={[styles.label, { color: isDark ? '#cbd5e1' : '#475569' }]}>Meeting Link *</Text>
          {form.meetingLink ? (
            <View style={[styles.inputContainer, { backgroundColor: isDark ? '#1e293b' : '#fff', borderColor: isDark ? '#334155' : '#e2e8f0', justifyContent: 'space-between', paddingRight: 8 }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, overflow: 'hidden' }}>
                <LinkIcon size={20} color="#2563eb" />
                <Text style={[styles.input, { color: '#2563eb', fontWeight: '500' }]} numberOfLines={1}>
                  {form.meetingLink}
                </Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <TouchableOpacity onPress={() => copyToClipboard(form.meetingLink)} style={styles.iconBtn}>
                  <Copy size={18} color="#64748b" />
                </TouchableOpacity>
                <View style={{ width: 1, height: 20, backgroundColor: '#e2e8f0', marginHorizontal: 8 }} />
                <TouchableOpacity onPress={() => setForm(prev => ({ ...prev, meetingLink: '' }))} style={{ padding: 8 }}>
                  <Text style={{ color: '#ef4444', fontSize: 13, fontWeight: '600' }}>Clear</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <TouchableOpacity 
              style={[styles.inputContainer, { backgroundColor: '#eff6ff', borderColor: '#bfdbfe', justifyContent: 'center' }]}
              onPress={() => promptAsync()}
              disabled={loading}
            >
              <Text style={{ color: '#2563eb', fontWeight: '600', fontSize: 15 }}>+ Generate Google Meet Link</Text>
            </TouchableOpacity>
          )}
        </View>

        <TouchableOpacity 
          style={styles.submitBtn} 
          activeOpacity={0.8}
          onPress={handleCreate}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.submitBtnText}>Create & Notify Members</Text>
          )}
        </TouchableOpacity>
        <View style={{ height: 40 }} />
      </ScrollView>

      <DateTimePickerModal
        isVisible={isDatePickerVisible}
        mode="date"
        onConfirm={(d) => {
          setDatePickerVisibility(false);
          handleChange('date', formatDateDDMMYYYY(d));
        }}
        onCancel={() => setDatePickerVisibility(false)}
      />
      
      <DateTimePickerModal
        isVisible={isStartTimePickerVisible}
        mode="time"
        onConfirm={(d) => {
          setStartTimePickerVisibility(false);
          handleChange('startTime', formatTime(d));
        }}
        onCancel={() => setStartTimePickerVisibility(false)}
      />

      <DateTimePickerModal
        isVisible={isEndTimePickerVisible}
        mode="time"
        onConfirm={(d) => {
          setEndTimePickerVisibility(false);
          handleChange('endTime', formatTime(d));
        }}
        onCancel={() => setEndTimePickerVisibility(false)}
      />

      {/* Custom Stylish Popup Modal */}
      <Modal
        visible={popup.visible}
        transparent
        animationType="fade"
        onRequestClose={closePopup}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: isDark ? '#1e293b' : '#fff' }]}>
            <View style={styles.modalHeader}>
              <View style={[
                styles.iconCircle, 
                { backgroundColor: popup.type === 'error' ? '#fee2e2' : '#dcfce7' }
              ]}>
                {popup.type === 'error' ? (
                  <AlertCircle size={32} color="#ef4444" />
                ) : (
                  <CheckCircle size={32} color="#10b981" />
                )}
              </View>
              <TouchableOpacity onPress={closePopup} style={styles.closeBtn}>
                <X size={20} color="#94a3b8" />
              </TouchableOpacity>
            </View>
            
            <Text style={[styles.modalTitle, { color: isDark ? '#fff' : '#1e293b' }]}>{popup.title}</Text>
            <Text style={[styles.modalMessage, { color: isDark ? '#cbd5e1' : '#64748b' }]}>{popup.message}</Text>
            
            {popup.type === 'link' && popup.link ? (
              <View style={styles.linkBox}>
                <Text style={styles.linkBoxText} numberOfLines={1}>{popup.link}</Text>
                <TouchableOpacity onPress={() => copyToClipboard(popup.link)} style={styles.copyBtn}>
                  <Copy size={16} color="#2563eb" />
                  <Text style={styles.copyBtnText}>Copy</Text>
                </TouchableOpacity>
              </View>
            ) : null}
            
            <TouchableOpacity 
              style={[styles.modalActionBtn, { backgroundColor: popup.type === 'error' ? '#ef4444' : '#2563eb' }]} 
              onPress={closePopup}
            >
              <Text style={styles.modalActionText}>
                {popup.type === 'error' ? 'Okay, got it' : (popup.type === 'link' ? 'Awesome!' : 'Done')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { padding: 20 },
  title: { fontSize: 22, fontWeight: '700', marginBottom: 6 },
  subtitle: { fontSize: 14, color: '#64748b', marginBottom: 24, lineHeight: 20 },
  formGroup: { marginBottom: 16 },
  label: { fontSize: 13, fontWeight: '600', marginBottom: 8, marginLeft: 4 },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 52,
  },
  input: { flex: 1, marginLeft: 10, fontSize: 15 },
  iconBtn: { padding: 8 },
  row: { flexDirection: 'row' },
  submitBtn: {
    backgroundColor: '#2563eb',
    height: 56,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  submitBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContent: {
    width: '100%',
    borderRadius: 24,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeBtn: {
    padding: 4,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 8,
  },
  modalMessage: {
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 24,
  },
  linkBox: {
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#bfdbfe',
    borderRadius: 12,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  linkBoxText: {
    color: '#1e40af',
    fontWeight: '600',
    flex: 1,
    marginRight: 10,
  },
  copyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#dbeafe',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  copyBtnText: {
    color: '#2563eb',
    fontWeight: '700',
    fontSize: 13,
  },
  modalActionBtn: {
    height: 52,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalActionText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  }
});
