import React, { useState, useRef, useEffect } from 'react';
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
  StatusBar,
  Animated,
  Easing
} from 'react-native';
import DateTimePickerModal from 'react-native-modal-datetime-picker';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ChevronLeft,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ShieldCheck,
  ChevronDown,
  Sparkle
} from 'lucide-react-native';
import { ErrorBadge } from '../../components/ErrorBadge';
import SalesforceService from '../../services/SalesforceService';

export default function SignUpScreen({ navigation }: any) {
  const [loading, setLoading] = useState(false);
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);
  const [isDatePickerVisible, setDatePickerVisibility] = useState(false);
  const [datePickerField, setDatePickerField] = useState('');
  const [error, setError] = useState<any>(null);

  // Form State (Preserving all original state properties & functionality)
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
    const options: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'long', year: 'numeric' };
    const formattedDisplayDate = date.toLocaleDateString('en-GB', options);
    // Standard ISO format YYYY-MM-DD for backend
    const isoDate = date.toISOString().split('T')[0];
    
    // Save ISO date to form state
    handleInputChange(datePickerField, isoDate);
    hideDatePicker();
  };

  // Helper to format stored ISO date to display format (e.g. 2000-01-11 -> 11-01-2000)
  const formatDisplayDate = (dateStr: string) => {
    if (!dateStr) return '';
    try {
      const parts = dateStr.split('-');
      if (parts.length === 3) {
        const year = parts[0];
        const month = parts[1].padStart(2, '0');
        const day = parts[2].padStart(2, '0');
        return `${day}-${month}-${year}`;
      }
    } catch (e) {}
    return dateStr;
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

    setLoading(true);
    const startTime = Date.now();
    try {
      console.log('🔍 [SignUpScreen] Step 1: Checking if member exists in Salesforce...');
      const checkResult = await SalesforceService.checkContactExists(formData.phone);
      console.log('🔍 [SignUpScreen] Step 1 result:', JSON.stringify(checkResult));

      if (checkResult?.exists) {
        console.log('⚠️ [SignUpScreen] Member already exists – showing duplicate modal');
        // Ensure loader displays for at least 5 seconds before showing duplicate modal
        const elapsed = Date.now() - startTime;
        if (elapsed < 5000) {
          await new Promise(resolve => setTimeout(resolve, 5000 - elapsed));
        }
        setShowDuplicateModal(true);
        setLoading(false);
        return;
      }

      console.log('✅ [SignUpScreen] Step 2: Member not found – proceeding to createMember...');
      const result = await SalesforceService.createMember({ ...formData, uid: undefined });
      console.log('✅ [SignUpScreen] Step 2 createMember result:', JSON.stringify(result));

      // Ensure loader displays for at least 5 seconds before navigating to success
      const elapsed = Date.now() - startTime;
      if (elapsed < 5000) {
        await new Promise(resolve => setTimeout(resolve, 5000 - elapsed));
      }

      if (result.success) {
        console.log('✅ [SignUpScreen] Step 3: Updating Firebase profile display name...');
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
      const elapsed = Date.now() - startTime;
      if (elapsed < 5000) {
        await new Promise(resolve => setTimeout(resolve, 5000 - elapsed));
      }
      const errMsg = err?.message || err?.code || String(err) || 'Unknown error';
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
      <StatusBar barStyle="light-content" backgroundColor="#0b132b" />

      <SafeAreaView style={{ flex: 1 }}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Top Header Section with Inline Back Button */}
            <View style={styles.headerSection}>
              <TouchableOpacity style={styles.inlineBackBtn} onPress={() => navigation.goBack()}>
                <ChevronLeft size={22} color="#8da9c4" />
              </TouchableOpacity>
              <Text style={styles.cursiveHeading}>Sign Up</Text>
              <View style={{ width: 40 }} />
            </View>
            <Text style={styles.subHeading}>
              Join our community of faith, worship and fellowship.
            </Text>

            {/* Glass Card Container */}
            <View style={styles.glassCard}>
              {/* FIRST NAME */}
              <View style={styles.inputGroup}>
                <Text style={styles.fieldLabel}>FIRST NAME</Text>
                <TextInput
                  style={styles.textInput}
                  value={formData.firstName}
                  onChangeText={(v) => handleInputChange('firstName', v)}
                  placeholder="John"
                  placeholderTextColor="#4a5b78"
                />
              </View>

              {/* LAST NAME */}
              <View style={styles.inputGroup}>
                <Text style={styles.fieldLabel}>LAST NAME</Text>
                <TextInput
                  style={styles.textInput}
                  value={formData.lastName}
                  onChangeText={(v) => handleInputChange('lastName', v)}
                  placeholder="Mathew"
                  placeholderTextColor="#4a5b78"
                />
              </View>

              {/* MOBILE NUMBER */}
              <View style={styles.inputGroup}>
                <Text style={styles.fieldLabel}>MOBILE NUMBER</Text>
                <TextInput
                  style={styles.textInput}
                  value={formData.phone}
                  onChangeText={(v) => handleInputChange('phone', v)}
                  placeholder="9876543210"
                  placeholderTextColor="#4a5b78"
                  keyboardType="phone-pad"
                  maxLength={10}
                />
              </View>

              {/* DATE OF BIRTH & GENDER ROW */}
              <View style={styles.rowGrid}>
                {/* DATE OF BIRTH */}
                <View style={[styles.inputGroup, { flex: 1.1 }]}>
                  <Text style={styles.fieldLabel}>DATE OF BIRTH</Text>
                  <TouchableOpacity
                    style={styles.datePickerBtn}
                    activeOpacity={0.8}
                    onPress={() => showDatePicker('dob')}
                  >
                    <Text
                      style={[
                        styles.datePickerTxt,
                        !formData.dob && { color: '#4a5b78' }
                      ]}
                    >
                      {formData.dob ? formatDisplayDate(formData.dob) : 'DD-MM-YYYY'}
                    </Text>
                    <Calendar size={16} color="#e0c38c" />
                  </TouchableOpacity>
                </View>

                {/* GENDER SELECTOR */}
                <View style={[styles.inputGroup, { flex: 1 }]}>
                  <Text style={styles.fieldLabel}>GENDER</Text>
                  <View style={styles.genderContainer}>
                    {['Male', 'Female'].map((g) => {
                      const isSelected = formData.gender === g;
                      return (
                        <TouchableOpacity
                          key={g}
                          style={[
                            styles.genderTab,
                            isSelected && styles.genderTabActive
                          ]}
                          activeOpacity={0.8}
                          onPress={() => handleInputChange('gender', g)}
                        >
                          <Text
                            style={[
                              styles.genderTabTxt,
                              isSelected && styles.genderTabTxtActive
                            ]}
                          >
                            {g}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              </View>

              {/* ERROR BADGE */}
              <ErrorBadge error={error} />

              {/* CREATE ACCOUNT BUTTON */}
              <TouchableOpacity
                style={[styles.submitButton, loading && { opacity: 0.85 }]}
                activeOpacity={0.85}
                onPress={handleSignUp}
                disabled={loading}
              >
                {loading ? (
                  <CustomMorphLoader />
                ) : (
                  <Text style={styles.submitButtonTxt}>Create Account</Text>
                )}
              </TouchableOpacity>
            </View>

            {/* SIGN IN LINK */}
            <View style={styles.signInRow}>
              <Text style={styles.alreadyTxt}>Already have an account? </Text>
              <TouchableOpacity onPress={() => navigation.navigate('Login', { showPhoneInput: true })}>
                <Text style={styles.signInLinkTxt}>Sign In</Text>
              </TouchableOpacity>
            </View>

            <View style={{ height: 60 }} />
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>

      {/* Duplicate Member Modal */}
      <Modal animationType="fade" transparent={true} visible={showDuplicateModal}>
        <View style={styles.modalOverlay}>
          <View style={styles.alertCard}>
            <View style={styles.alertIcon}>
              <AlertTriangle size={32} color="#e5c158" />
            </View>
            <Text style={styles.alertTitle}>Already Registered</Text>
            <Text style={styles.alertSub}>
              This mobile number is already registered in our church directory. Please sign in to your existing account.
            </Text>
            <TouchableOpacity
              style={styles.modalBtn}
              onPress={() => {
                setShowDuplicateModal(false);
                navigation.navigate('Login', { showPhoneInput: true });
              }}
            >
              <Text style={styles.modalBtnTxt}>Go to Sign In</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.modalSecBtn}
              onPress={() => setShowDuplicateModal(false)}
            >
              <Text style={styles.modalSecBtnTxt}>Edit Number</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Date Picker Modal */}
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

// ── Custom Uiverse Morphing Loader Component ──
function CustomMorphLoader() {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.timing(anim, {
        toValue: 1,
        duration: 2000,
        easing: Easing.bezier(0.42, 0, 0.58, 1),
        useNativeDriver: false,
      })
    ).start();
  }, [anim]);

  // Horizontal expansion (before8 keyframes)
  const horizDist = anim.interpolate({
    inputRange: [0, 0.35, 0.7, 1],
    outputRange: [14, 2, 14, 14],
  });

  // Vertical expansion (after6 keyframes)
  const vertDist = anim.interpolate({
    inputRange: [0, 0.35, 0.7, 1],
    outputRange: [14, 2, 14, 14],
  });

  return (
    <View style={loaderStyles.loaderContainer}>
      <View style={loaderStyles.loaderBox}>
        {/* Horizontal Pair: Pink & Cyan */}
        <Animated.View style={[loaderStyles.dot, { backgroundColor: 'rgba(225, 20, 98, 0.95)', transform: [{ translateX: Animated.multiply(horizDist, -1) }] }]} />
        <Animated.View style={[loaderStyles.dot, { backgroundColor: 'rgba(111, 202, 220, 0.95)', transform: [{ translateX: horizDist }] }]} />
        
        {/* Vertical Pair: Emerald Green & Gold */}
        <Animated.View style={[loaderStyles.dot, { backgroundColor: 'rgba(61, 184, 143, 0.95)', transform: [{ translateY: vertDist }] }]} />
        <Animated.View style={[loaderStyles.dot, { backgroundColor: 'rgba(233, 169, 32, 0.95)', transform: [{ translateY: Animated.multiply(vertDist, -1) }] }]} />
      </View>
    </View>
  );
}

const loaderStyles = StyleSheet.create({
  loaderContainer: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loaderBox: {
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
    transform: [{ rotate: '165deg' }],
  },
  dot: {
    position: 'absolute',
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a162d',
  },

  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 0,
    paddingBottom: 40,
  },

  // Header Title with Inline Back Button
  headerSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: -5,
    marginBottom: 2,
  },
  inlineBackBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  cursiveHeading: {
    fontSize: 48,
    fontWeight: 'normal',
    color: '#f3e7c4',
    fontFamily: Platform.OS === 'ios' ? 'Snell Roundhand' : Platform.OS === 'android' ? 'cursive' : 'Georgia',
    fontStyle: 'italic',
    textAlign: 'center',
  },
  subHeading: {
    fontSize: 13,
    color: '#94a3b8',
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: 15,
    marginBottom: 36,
  },

  // Premium Glass Card
  glassCard: {
    backgroundColor: 'rgba(15, 28, 54, 0.85)',
    borderRadius: 24,
    padding: 22,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.14)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.45,
    shadowRadius: 24,
    elevation: 10,
  },

  // Form Fields Styling
  rowGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  inputGroup: {
    marginBottom: 18,
  },
  fieldLabel: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#cbd5e1',
    letterSpacing: 1.2,
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  textInput: {
    backgroundColor: 'rgba(23, 42, 77, 0.75)',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    color: '#ffffff',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.16)',
  },

  // Date Picker Custom Input Button
  datePickerBtn: {
    backgroundColor: 'rgba(23, 42, 77, 0.75)',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.16)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  datePickerTxt: {
    fontSize: 14.5,
    color: '#ffffff',
    fontWeight: '500',
  },

  // Gender & Choice Tabs
  genderContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(23, 42, 77, 0.75)',
    borderRadius: 14,
    padding: 4,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.16)',
    gap: 4,
  },
  genderTab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 10,
  },
  genderTabActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  genderTabTxt: {
    fontSize: 13.5,
    fontWeight: '600',
    color: '#94a3b8',
  },
  genderTabTxtActive: {
    color: '#ffffff',
    fontWeight: '700',
  },

  // Sub Fields Box
  subFieldsBox: {
    marginTop: 4,
    paddingLeft: 12,
    borderLeftWidth: 2,
    borderLeftColor: '#d4af37',
    marginBottom: 8,
  },

  // Terms & Conditions Checkbox
  termsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    marginBottom: 22,
    gap: 10,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: '#7b93b4',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxActive: {
    backgroundColor: '#f3e7c4',
    borderColor: '#f3e7c4',
  },
  termsTxt: {
    flex: 1,
    fontSize: 12.5,
    color: '#8da9c4',
    lineHeight: 18,
  },
  termsLink: {
    color: '#f3e7c4',
    fontWeight: '600',
    textDecorationLine: 'underline',
  },

  // Primary Button
  submitButton: {
    backgroundColor: '#f1d592',
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    shadowColor: '#f1d592',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 6,
  },
  submitButtonTxt: {
    color: '#0b132b',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.3,
  },

  // Sign In Link
  signInRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 22,
  },
  alreadyTxt: {
    fontSize: 14,
    color: '#8da9c4',
  },
  signInLinkTxt: {
    fontSize: 14,
    fontWeight: '700',
    color: '#f3e7c4',
  },

  // Alert Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  alertCard: {
    backgroundColor: '#162447',
    borderRadius: 24,
    padding: 26,
    width: '100%',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  alertIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(229, 193, 88, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  alertTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#ffffff',
    marginBottom: 8,
  },
  alertSub: {
    fontSize: 13.5,
    color: '#8da9c4',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  modalBtn: {
    backgroundColor: '#f1d592',
    paddingVertical: 14,
    width: '100%',
    borderRadius: 14,
    alignItems: 'center',
  },
  modalBtnTxt: {
    color: '#0b132b',
    fontSize: 14,
    fontWeight: '700',
  },
  modalSecBtn: {
    marginTop: 14,
  },
  modalSecBtnTxt: {
    color: '#8da9c4',
    fontSize: 13,
    fontWeight: '600',
  },
});

