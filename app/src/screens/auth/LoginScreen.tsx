import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  KeyboardAvoidingView, 
  Platform,
  Image,
  ActivityIndicator,
  Alert,
  StatusBar
} from 'react-native';
import auth from '@react-native-firebase/auth';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AuthStackParamList } from '../../navigation/AuthNavigator';
import Theme from '../../theme/Theme';
import SalesforceService from '../../services/SalesforceService';
import { useAuth } from '../../context/AuthContext';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, Phone, User, LogIn, ArrowRight } from 'lucide-react-native';

import { ErrorBadge } from '../../components/ErrorBadge';

type LoginScreenProps = {
  navigation: NativeStackNavigationProp<AuthStackParamList, 'Login'>;
};

export default function LoginScreen({ navigation }: LoginScreenProps) {
  const { signInAnonymously } = useAuth();
  const [showPhoneInput, setShowPhoneInput] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [verifyingStatus, setVerifyingStatus] = useState('');
  const [memberName, setMemberName] = useState('');
  const [contactId, setContactId] = useState<string | undefined>(undefined);
  const [isMember, setIsMember] = useState(false);
  const [error, setError] = useState<any>(null);

  // ── Auto-lookup member as user types ──
  useEffect(() => {
    const checkMembership = async () => {
      const cleanNum = phoneNumber.replace(/[^0-9]/g, '');
      if (cleanNum.length === 10) {
        setVerifyingStatus('Checking membership...');
        setError(null);
        try {
          const result = await SalesforceService.checkContactExists(cleanNum);
          if (result && result.exists) {
            setMemberName(result.member?.firstName || result.member?.name || '');
            setContactId(result.member?.id);
            setIsMember(true);
            setVerifyingStatus('');
          } else {
            setMemberName('');
            setContactId(undefined);
            setIsMember(false);
            setVerifyingStatus('Number not found in church records.');
          }
        } catch (err) {
          console.error(err);
          setError(err);
        }
      } else {
        setMemberName('');
        setContactId(undefined);
        setIsMember(false);
        setVerifyingStatus('');
      }
    };
    checkMembership();
  }, [phoneNumber]);

  const handleSendCode = async () => {
    let formattedNumber = phoneNumber.trim();
    if (formattedNumber.length === 10 && !formattedNumber.startsWith('+')) {
      formattedNumber = `+91${formattedNumber}`;
    }

    if (!formattedNumber.startsWith('+') || formattedNumber.length < 12) {
      setError('Please enter a valid 10-digit phone number.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      setVerifyingStatus('Sending OTP...');
      const confirmation = await auth().signInWithPhoneNumber(formattedNumber);
      navigation.navigate('VerifyOtp', { 
        confirmation, 
        phoneNumber: formattedNumber,
        contactId: contactId,
        memberName: memberName
      });
    } catch (err: any) {
      console.error('❌ [LoginScreen] signInWithPhoneNumber error:', {
        code: err?.code,
        message: err?.message,
        nativeErrorCode: err?.nativeErrorCode,
        userInfo: err?.userInfo,
      });
      setError(err);
    } finally {
      setLoading(false);
      setVerifyingStatus('');
    }
  };

  const handleGuestLogin = async () => {
    setLoading(true);
    setError(null);
    try {
      await signInAnonymously();
    } catch (err: any) {
      console.error(err);
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  if (!showPhoneInput) {
    return (
      <View style={styles.landingContainer}>
        <StatusBar barStyle="light-content" />
        <View style={styles.landingTop}>
          <View style={styles.logoCircleLarge}>
            <Image 
              source={require('../../../assets/logo.png')} 
              style={styles.logoImageLarge}
            />
          </View>
          <Text style={styles.churchTitleLarge}>Church of God</Text>
          <Text style={styles.mottoTextLarge}>A Gateway to Heaven</Text>
          <Text style={styles.teluguTaglineLarge}>KRISTHU NANDU SAHODARULU SAHAVASAMU</Text>
        </View>

        <View style={styles.landingBottom}>
          <TouchableOpacity 
            style={styles.mainActionBtn}
            onPress={() => setShowPhoneInput(true)}
          >
            <Text style={styles.mainActionBtnTxt}>Sign in</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.signUpBtn}
            onPress={() => navigation.navigate('SignUp')}
          >
            <Text style={styles.signUpBtnTxt}>Sign up</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.guestLink}
            onPress={handleGuestLogin}
          >
            <Text style={styles.guestLinkTxt}>Guest mode — browse without login</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.authContainer}
    >
      <StatusBar barStyle="dark-content" />
      <SafeAreaView style={{ flex: 1 }}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => setShowPhoneInput(false)}
        >
          <ChevronLeft size={24} color="#1a2d5a" />
        </TouchableOpacity>

        <View style={styles.authContent}>
          <Text style={styles.authTitle}>Welcome Back</Text>
          <Text style={styles.authSub}>Sign in to your member account</Text>

          <View style={styles.inputSection}>
            <Text style={styles.inputLabel}>PHONE NUMBER</Text>
            <View style={[styles.inputWrapper, isMember && styles.inputWrapperSuccess]}>
              <Phone size={20} color={isMember ? "#15803D" : "#9CA3AF"} />
              <TextInput 
                style={styles.textInput}
                placeholder="99887 76655"
                placeholderTextColor="#9CA3AF"
                keyboardType="phone-pad"
                value={phoneNumber}
                onChangeText={setPhoneNumber}
                maxLength={10}
              />
              {isMember && <User size={20} color="#15803D" />}
            </View>

            {verifyingStatus ? (
              <Text style={[styles.statusText, isMember && styles.statusTextSuccess]}>
                {verifyingStatus}
              </Text>
            ) : null}
          </View>

          {isMember && (
            <View style={styles.memberBanner}>
              <Text style={styles.memberBannerTxt}>Welcome, {memberName} 🙏</Text>
              <Text style={styles.memberBannerSub}>We found your church record.</Text>
            </View>
          )}

          <ErrorBadge error={error} />

          <TouchableOpacity 
            style={[styles.submitBtn, (!isMember || loading) && styles.submitBtnDisabled]}
            onPress={handleSendCode}
            disabled={!isMember || loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.submitBtnTxt}>Send Verification Code</Text>
            )}
          </TouchableOpacity>

          <View style={styles.footerInfo}>
            <Text style={styles.footerTxt}>Not a member yet? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('SignUp')}>
              <Text style={styles.footerLink}>Register Here</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  // Landing Styles
  landingContainer: { flex: 1, backgroundColor: '#1a2d5a' },
  landingTop: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  logoCircleLarge: { 
    width: 120, height: 120, borderRadius: 60, backgroundColor: '#fff', 
    justifyContent: 'center', alignItems: 'center', marginBottom: 25,
    overflow: 'hidden'
  },
  logoImageLarge: { width: 90, height: 90 },
  churchTitleLarge: { color: '#fff', fontSize: 28, fontWeight: '800', marginBottom: 5 },
  mottoTextLarge: { color: '#4fd1c5', fontSize: 16, fontWeight: '500', marginBottom: 10 },
  teluguTaglineLarge: { color: '#aac4e8', fontSize: 10, fontWeight: '600', letterSpacing: 1, textAlign: 'center' },
  
  landingBottom: { padding: 40, paddingBottom: 60, gap: 16 },
  mainActionBtn: { 
    backgroundColor: '#c0392b', borderRadius: 30, paddingVertical: 18, 
    justifyContent: 'center', alignItems: 'center',
    elevation: 5, shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 10
  },
  mainActionBtnTxt: { color: '#fff', fontSize: 18, fontWeight: '700' },
  
  signUpBtn: { 
    backgroundColor: '#1a2d5a', borderRadius: 30, paddingVertical: 18, 
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)'
  },
  signUpBtnTxt: { color: '#fff', fontSize: 18, fontWeight: '500' },

  guestLink: { marginTop: 10, alignItems: 'center' },
  guestLinkTxt: { color: '#6B7280', fontSize: 12, fontWeight: '500' },

  // Auth Styles
  authContainer: { flex: 1, backgroundColor: '#fff' },
  backButton: { padding: 20, paddingTop: Platform.OS === 'ios' ? 0 : 20 },
  authContent: { paddingHorizontal: 25, flex: 1 },
  authTitle: { fontSize: 28, fontWeight: '800', color: '#1a2d5a', marginBottom: 8 },
  authSub: { fontSize: 15, color: '#6B7280', marginBottom: 40 },

  inputSection: { marginBottom: 25 },
  inputLabel: { fontSize: 10, fontWeight: '800', color: '#1a2d5a', letterSpacing: 1, marginBottom: 10 },
  inputWrapper: { 
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#f9fafb', 
    borderRadius: 14, paddingHorizontal: 16, height: 56, borderWidth: 1, borderColor: '#e5e7eb' 
  },
  inputWrapperSuccess: { borderColor: '#BBF7D0', backgroundColor: '#F0FDF4' },
  textInput: { flex: 1, marginLeft: 12, fontSize: 16, fontWeight: '600', color: '#111827' },
  statusText: { fontSize: 11, color: '#c0392b', marginTop: 8, fontWeight: '500' },
  statusTextSuccess: { color: '#15803D' },

  memberBanner: { 
    backgroundColor: '#f8fafc', 
    padding: 18, 
    borderRadius: 16, 
    marginBottom: 25, 
    borderWidth: 1, 
    borderColor: '#e2e8f0',
    borderLeftWidth: 4,
    borderLeftColor: '#c0392b' 
  },
  memberBannerTxt: { color: '#1a2d5a', fontSize: 16, fontWeight: '800' },
  memberBannerSub: { color: '#64748b', fontSize: 12, marginTop: 4 },

  submitBtn: { backgroundColor: '#1a2d5a', borderRadius: 14, paddingVertical: 18, alignItems: 'center', elevation: 2 },
  submitBtnDisabled: { opacity: 0.5 },
  submitBtnTxt: { color: '#fff', fontSize: 15, fontWeight: '700' },

  footerInfo: { flexDirection: 'row', justifyContent: 'center', marginTop: 30 },
  footerTxt: { color: '#6B7280', fontSize: 14 },
  footerLink: { color: '#c0392b', fontSize: 14, fontWeight: '700' },
});
