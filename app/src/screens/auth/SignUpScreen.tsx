import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  Alert,
  Modal,
  Image,
  StatusBar
} from 'react-native';
import DateTimePickerModal from 'react-native-modal-datetime-picker';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ChevronLeft,
  User,
  Phone,
  MapPin,
  Heart,
  ShieldCheck,
  AlertTriangle,
  Calendar,
  CircleUser,
  Map,
  ArrowRight
} from 'lucide-react-native';
import { ErrorBadge } from '../../components/ErrorBadge';
import SalesforceService from '../../services/SalesforceService';

export default function SignUpScreen({ navigation }: any) {
  const [loading, setLoading] = useState(false);
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);
  const [isDatePickerVisible, setDatePickerVisibility] = useState(false);
  const [datePickerField, setDatePickerField] = useState('');
  const [error, setError] = useState<any>(null);

  // Form State
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    dob: '',
    phone: '',
    email: '',
    gender: 'Male',
    maritalStatus: 'Single',
    anniversaryDate: '',
    numberOfChildren: '',
    baptized: 'No',
    baptismDate: '',
    baptismChurch: '',
    churchName: '',
    street: '',
    mandal: '',
    city: '',
    district: '',
    state: '',
    zip: '',
    nationality: 'Indian',
  });

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const showDatePicker = (field: string) => {
    setDatePickerField(field);
    setDatePickerVisibility(true);
  };

  const hideDatePicker = () => {
    setDatePickerVisibility(false);
  };

  const handleConfirm = (date: Date) => {
    const formattedDate = date.toISOString().split('T')[0];
    handleInputChange(datePickerField, formattedDate);
    hideDatePicker();
  };

  const handleSignUp = async () => {
    setError(null);
    console.log('🚀 [SignUpScreen] handleSignUp triggered. formData:', {
      firstName: formData.firstName,
      lastName: formData.lastName,
      phone: formData.phone,
      baptized: formData.baptized,
      maritalStatus: formData.maritalStatus,
    });

    if (!formData.firstName || !formData.lastName || !formData.phone) {
      setError('Please fill in your name and phone number.');
      return;
    }

    if (formData.baptized === 'Yes' && (!formData.baptismDate || !formData.baptismChurch)) {
      setError('Please provide the Date and Church of your baptism.');
      return;
    }

    if (formData.maritalStatus !== 'Single' && (!formData.anniversaryDate || !formData.numberOfChildren)) {
      setError('Please provide your Anniversary Date and Number of Children.');
      return;
    }

    setLoading(true);
    try {
      console.log('🔍 [SignUpScreen] Step 1: Checking if member exists in Salesforce...');
      const checkResult = await SalesforceService.checkContactExists(formData.phone);
      console.log('🔍 [SignUpScreen] Step 1 result:', JSON.stringify(checkResult));

      if (checkResult?.exists) {
        console.log('⚠️ [SignUpScreen] Member already exists – showing duplicate modal');
        setShowDuplicateModal(true);
        setLoading(false);
        return;
      }

      console.log('✅ [SignUpScreen] Step 2: Member not found – proceeding to createMember...');
      const result = await SalesforceService.createMember({ ...formData, uid: undefined });
      console.log('✅ [SignUpScreen] Step 2 createMember result:', JSON.stringify(result));

      if (result.success) {
        console.log('✅ [SignUpScreen] Step 3: Updating Firebase profile display name...');
        // 4. Update Firebase Profile so name is available instantly
        try {
          const currentUser = require('@react-native-firebase/auth').default().currentUser;
          if (currentUser) {
            await currentUser.updateProfile({
              displayName: formData.firstName
            });
          }
        } catch (profileErr) {
          console.warn('Profile name sync failed, but member created:', profileErr);
        }

        // Clear celebrations cache so new member shows up immediately if celebrating today
        const AsyncStorage = require('@react-native-async-storage/async-storage').default;
        await AsyncStorage.removeItem('cog_admin_celebs_cache_v2').catch(() => {});

        if (result.warnings) {
          Alert.alert(
            'Partially Saved',
            'Member created but some fields failed to sync:\n\n' + result.warnings.join('\n'),
            [{ text: 'OK', onPress: () => navigation.navigate('RegistrationSuccess') }]
          );
        } else {
          navigation.navigate('RegistrationSuccess');
        }
      }
    } catch (err: any) {
      const errMsg = err?.message || err?.code || String(err) || 'Unknown error';
      // Temporarily show raw error on screen for debugging
      Alert.alert(
        '🔴 Debug: Registration Error',
        `Code: ${err?.code || 'none'}\n\nMessage: ${errMsg}\n\nRaw: ${JSON.stringify(err?.userInfo || err?.nativeErrorCode || '')}`,
        [{ text: 'OK' }]
      );
      setError(err);
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1a2d5a" />

      {/* ── Page Header ── */}
      <View style={styles.pageHeader}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <ChevronLeft size={20} color="#aac4e8" />
          <Text style={styles.backBtnTxt}>Back</Text>
        </TouchableOpacity>
        <View style={styles.titleCol}>
          <Text style={styles.pageTitle}>New Registration</Text>
          <Text style={styles.pageSub}>క్రొత్త సభ్యుల నమోదు</Text>
        </View>
        <View style={{ width: 60 }} />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

          <View style={styles.introBox}>
            <Text style={styles.introTitle}>Welcome to Our Family 🙏</Text>
            <Text style={styles.introSub}>Please fill in your details to join the Church of God community.</Text>
          </View>

          {/* ── Section 1: Personal ── */}
          <View style={styles.secHd}>
            <CircleUser size={14} color="#1a2d5a" />
            <Text style={styles.secLbl}>PERSONAL INFORMATION</Text>
          </View>
          <View style={styles.formCard}>
            <InputRow label="First Name" value={formData.firstName} onChange={(v: string) => handleInputChange('firstName', v)} placeholder="John" />
            <InputRow label="Last Name" value={formData.lastName} onChange={(v: string) => handleInputChange('lastName', v)} placeholder="Doe" />
            <InputRow label="Email Address" value={formData.email} onChange={(v: string) => handleInputChange('email', v)} placeholder="john.doe@example.com" keyboardType="email-address" />
            <TouchableOpacity onPress={() => showDatePicker('dob')}>
              <View pointerEvents="none">
                <InputRow label="Date of Birth" value={formData.dob} placeholder="Select Date" />
              </View>
            </TouchableOpacity>

            <Text style={styles.innerLbl}>GENDER</Text>
            <View style={styles.pillRow}>
              {['Male', 'Female'].map(g => (
                <TouchableOpacity key={g} style={[styles.pill, formData.gender === g && styles.pillActive]} onPress={() => handleInputChange('gender', g)}>
                  <Text style={[styles.pillTxt, formData.gender === g && styles.pillTxtActive]}>{g}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.innerLbl}>MARITAL STATUS</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.pillRow}>
              {['Single', 'Married', 'Widowed', 'Divorced'].map(m => (
                <TouchableOpacity key={m} style={[styles.pill, formData.maritalStatus === m && styles.pillActive, { marginRight: 8 }]} onPress={() => handleInputChange('maritalStatus', m)}>
                  <Text style={[styles.pillTxt, formData.maritalStatus === m && styles.pillTxtActive]}>{m}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {formData.maritalStatus !== 'Single' && (
              <View style={[styles.nestedFields, { borderLeftColor: '#1a2d5a' }]}>
                <TouchableOpacity onPress={() => showDatePicker('anniversaryDate')}>
                  <View pointerEvents="none">
                    <InputRow label="Anniversary Date" value={formData.anniversaryDate} placeholder="Select Date" />
                  </View>
                </TouchableOpacity>
                <InputRow 
                  label="Number of Children" 
                  value={formData.numberOfChildren} 
                  onChange={(v: string) => handleInputChange('numberOfChildren', v)} 
                  placeholder="0" 
                  keyboardType="numeric" 
                />
              </View>
            )}

            <InputRow label="Nationality" value={formData.nationality} onChange={(v: string) => handleInputChange('nationality', v)} placeholder="Indian" />
          </View>

          {/* ── Section 2: Spiritual ── */}
          <View style={styles.secHd}>
            <ShieldCheck size={14} color="#15803D" />
            <Text style={[styles.secLbl, { color: '#15803D' }]}>SPIRITUAL JOURNEY</Text>
          </View>
          <View style={styles.formCard}>
            <Text style={styles.innerLbl}>HAVE YOU BEEN BAPTIZED?</Text>
            <View style={styles.pillRow}>
              {['Yes', 'No'].map(b => (
                <TouchableOpacity key={b} style={[styles.pill, formData.baptized === b && styles.pillActive]} onPress={() => handleInputChange('baptized', b)}>
                  <Text style={[styles.pillTxt, formData.baptized === b && styles.pillTxtActive]}>{b}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {formData.baptized === 'Yes' && (
              <View style={styles.nestedFields}>
                <TouchableOpacity onPress={() => showDatePicker('baptismDate')}>
                  <View pointerEvents="none">
                    <InputRow label="Baptism Date" value={formData.baptismDate} placeholder="Select Date" />
                  </View>
                </TouchableOpacity>
                <InputRow label="Baptism Church" value={formData.baptismChurch} onChange={(v: string) => handleInputChange('baptismChurch', v)} placeholder="Church Name" />
              </View>
            )}
            <InputRow label="Current Church Name" value={formData.churchName} onChange={(v: string) => handleInputChange('churchName', v)} placeholder="COG Branch Name" />
          </View>

          {/* ── Section 3: Contact ── */}
          <View style={styles.secHd}>
            <MapPin size={14} color="#c0392b" />
            <Text style={[styles.secLbl, { color: '#c0392b' }]}>CONTACT & LOCATION</Text>
          </View>
          <View style={styles.formCard}>
            <InputRow label="Phone Number" value={formData.phone} onChange={(v: string) => handleInputChange('phone', v)} placeholder="9988776655" keyboardType="phone-pad" />

            <View style={styles.grid}>
              <View style={{ flex: 1 }}>
                <InputRow label="Street / Door No" value={formData.street} onChange={(v: string) => handleInputChange('street', v)} placeholder="1-23/A" />
              </View>
              <View style={{ flex: 1 }}>
                <InputRow label="Mandal" value={formData.mandal} onChange={(v: string) => handleInputChange('mandal', v)} placeholder="Mandal" />
              </View>
            </View>

            <View style={styles.grid}>
              <View style={{ flex: 1 }}>
                <InputRow label="City / Village" value={formData.city} onChange={(v: string) => handleInputChange('city', v)} placeholder="City" />
              </View>
              <View style={{ flex: 1 }}>
                <InputRow label="District" value={formData.district} onChange={(v: string) => handleInputChange('district', v)} placeholder="District" />
              </View>
            </View>

            <View style={styles.grid}>
              <View style={{ flex: 1 }}>
                <InputRow label="State" value={formData.state} onChange={(v: string) => handleInputChange('state', v)} placeholder="State" />
              </View>
              <View style={{ flex: 1 }}>
                <InputRow label="Pincode" value={formData.zip} onChange={(v: string) => handleInputChange('zip', v)} placeholder="500001" keyboardType="numeric" />
              </View>
            </View>
          </View>
          
          <ErrorBadge error={error} />

          <TouchableOpacity
            style={[styles.submitBtn, loading && { opacity: 0.7 }]}
            onPress={handleSignUp}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <View style={styles.btnContent}>
                <Text style={styles.submitBtnTxt}>Complete Registration</Text>
                <ArrowRight size={18} color="#fff" />
              </View>
            )}
          </TouchableOpacity>

          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Duplicate Modal */}
      <Modal animationType="fade" transparent={true} visible={showDuplicateModal}>
        <View style={styles.modalOverlay}>
          <View style={styles.alertCard}>
            <View style={styles.alertIcon}><AlertTriangle size={32} color="#c0392b" /></View>
            <Text style={styles.alertTitle}>Already a Member</Text>
            <Text style={styles.alertSub}>This phone number is already registered in our system. Please sign in instead.</Text>
            <TouchableOpacity style={styles.modalBtn} onPress={() => { setShowDuplicateModal(false); navigation.navigate('Login'); }}>
              <Text style={styles.modalBtnTxt}>Go to Sign In</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.modalSecBtn} onPress={() => setShowDuplicateModal(false)}>
              <Text style={styles.modalSecBtnTxt}>Change Number</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <DateTimePickerModal
        isVisible={isDatePickerVisible}
        mode="date"
        onConfirm={handleConfirm}
        onCancel={hideDatePicker}
        maximumDate={new Date()}
      />
    </View>
  );
}

function InputRow({ label, value, onChange, placeholder, keyboardType = 'default' }: any) {
  return (
    <View style={styles.inputGroup}>
      <Text style={styles.inputLabel}>{label}</Text>
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor="#9CA3AF"
        keyboardType={keyboardType}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0f2f7' },

  // Header
  pageHeader: {
    backgroundColor: '#1a2d5a',
    paddingTop: Platform.OS === 'ios' ? 50 : 20,
    paddingHorizontal: 16,
    paddingBottom: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, minWidth: 60 },
  backBtnTxt: { color: '#aac4e8', fontSize: 13, fontWeight: '500' },
  titleCol: { flex: 1, alignItems: 'center' },
  pageTitle: { color: '#fff', fontSize: 14, fontWeight: '600' },
  pageSub: { color: '#aac4e8', fontSize: 9.5, marginTop: 1 },

  scroll: { paddingBottom: 40 },

  introBox: { padding: 25, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e5e7eb', marginBottom: 15 },
  introTitle: { fontSize: 20, fontWeight: '800', color: '#1a2d5a', marginBottom: 6 },
  introSub: { fontSize: 13, color: '#6B7280', lineHeight: 20 },

  secHd: { flexDirection: 'row', alignItems: 'center', gap: 10, marginHorizontal: 16, marginBottom: 10, marginTop: 10 },
  secLbl: { fontSize: 10, fontWeight: '800', color: '#1a2d5a', letterSpacing: 1 },

  formCard: { backgroundColor: '#fff', marginHorizontal: 12, borderRadius: 16, padding: 16, marginBottom: 20, borderWidth: 0.5, borderColor: '#e5e7eb' },

  inputGroup: { marginBottom: 15 },
  inputLabel: { fontSize: 10, fontWeight: '700', color: '#6B7280', textTransform: 'uppercase', marginBottom: 8, letterSpacing: 0.5 },
  input: { backgroundColor: '#f9fafb', borderRadius: 10, paddingHorizontal: 15, paddingVertical: 12, fontSize: 14, color: '#111827', borderWidth: 1, borderColor: '#e5e7eb' },

  innerLbl: { fontSize: 10, fontWeight: '700', color: '#6B7280', textTransform: 'uppercase', marginBottom: 10, marginTop: 5 },
  pillRow: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  pill: { paddingHorizontal: 15, paddingVertical: 8, borderRadius: 10, backgroundColor: '#f9fafb', borderWidth: 1, borderColor: '#e5e7eb' },
  pillActive: { backgroundColor: '#1a2d5a', borderColor: '#1a2d5a' },
  pillTxt: { fontSize: 12, fontWeight: '600', color: '#4B5563' },
  pillTxtActive: { color: '#fff' },

  nestedFields: { paddingLeft: 12, borderLeftWidth: 2, borderLeftColor: '#c0392b', marginBottom: 15, marginTop: 5 },
  grid: { flexDirection: 'row', gap: 12 },

  submitBtn: { backgroundColor: '#c0392b', margin: 12, borderRadius: 16, paddingVertical: 18, alignItems: 'center', elevation: 5 },
  btnContent: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  submitBtnTxt: { color: '#fff', fontSize: 15, fontWeight: '800' },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: 30 },
  alertCard: { backgroundColor: '#fff', borderRadius: 24, padding: 30, width: '100%', alignItems: 'center' },
  alertIcon: { width: 60, height: 60, borderRadius: 30, backgroundColor: '#fef2f2', justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  alertTitle: { fontSize: 20, fontWeight: '800', color: '#1a2d5a', marginBottom: 10 },
  alertSub: { fontSize: 14, color: '#6B7280', textAlign: 'center', lineHeight: 22, marginBottom: 25 },
  modalBtn: { backgroundColor: '#1a2d5a', paddingVertical: 15, width: '100%', borderRadius: 12, alignItems: 'center' },
  modalBtnTxt: { color: '#fff', fontSize: 14, fontWeight: '700' },
  modalSecBtn: { marginTop: 15 },
  modalSecBtnTxt: { color: '#6B7280', fontSize: 13, fontWeight: '600' },
});

