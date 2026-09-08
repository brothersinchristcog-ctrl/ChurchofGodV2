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
  StatusBar,
  ScrollView
} from 'react-native';
import auth from '@react-native-firebase/auth';
import { RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { LinearGradient } from 'expo-linear-gradient';
import { AuthStackParamList } from '../../navigation/AuthNavigator';
import Theme from '../../theme/Theme';
import SalesforceService from '../../services/SalesforceService';
import { useAuth } from '../../context/AuthContext';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, Phone, User, LogIn, ArrowRight, Sparkle } from 'lucide-react-native';

import { ErrorBadge } from '../../components/ErrorBadge';
import { StarBackground } from '../../components/StarBackground';

type LoginScreenProps = {
  navigation: NativeStackNavigationProp<AuthStackParamList, 'Login'>;
  route: RouteProp<AuthStackParamList, 'Login'>;
};

export default function LoginScreen({ navigation, route }: LoginScreenProps) {
  const { signInAnonymously } = useAuth();
  const [showPhoneInput, setShowPhoneInput] = useState(route.params?.showPhoneInput || false);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [verifyingStatus, setVerifyingStatus] = useState('');
  const [memberName, setMemberName] = useState('');
  const [contactId, setContactId] = useState<string | undefined>(undefined);
  const [isMember, setIsMember] = useState(false);
  const [error, setError] = useState<any>(null);

  // ── Sync showPhoneInput with route params ──
  useEffect(() => {
    if (route.params?.showPhoneInput !== undefined) {
      setShowPhoneInput(route.params.showPhoneInput);
    }
  }, [route.params?.showPhoneInput]);

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
        <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
        <StarBackground />
        <View style={styles.landingTop}>
          <View style={styles.headerAbsolute}>
            <Text style={styles.cursiveWelcomeHeading}>Welcome to</Text>
            <Text style={styles.churchOfGodText}>Church of God</Text>
          </View>

          <View style={styles.textContainer}>
            <Text style={styles.contextTxt}>
              Join us in fellowship and spiritual growth as we journey together in faith.
            </Text>
            
            <Text style={styles.verseQuoteTxt}>
              "I was glad when they said unto me, Let us go into the house of the LORD."
            </Text>
            <Text style={styles.verseRefTxt}>— Psalm 122:1</Text>
          </View>
        </View>

        <View style={styles.landingBottom}>
          <View style={styles.badgeRow}>
            {/* SIGN IN BADGE (Yellow/Gold Gradient) */}
            <TouchableOpacity 
              style={styles.badgeBtnWrapper}
              onPress={() => setShowPhoneInput(true)}
              activeOpacity={0.85}
            >
              <LinearGradient
                colors={['#f6e09e', '#e5b842']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.gradientBadge}
              >
                <Text style={styles.signInBadgeTxt}>Sign in</Text>
              </LinearGradient>
            </TouchableOpacity>

            {/* SIGN UP BADGE (App Primary Rich Navy Gradient) */}
            <TouchableOpacity 
              style={styles.badgeBtnWrapper}
              onPress={() => navigation.navigate('SignUp')}
              activeOpacity={0.85}
            >
              <LinearGradient
                colors={['#1e3a8a', '#0f172a']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.gradientBadgeNavy}
              >
                <Text style={styles.signUpBadgeTxt}>Sign up</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>

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
      <StatusBar barStyle="light-content" backgroundColor="#0a162d" />
      <SafeAreaView style={{ flex: 1 }}>
        <ScrollView 
          contentContainerStyle={{ flexGrow: 1 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.authContent}>
          <View style={styles.headerSection}>
            <TouchableOpacity 
              style={styles.inlineBackBtn}
              onPress={() => setShowPhoneInput(false)}
            >
              <ChevronLeft size={24} color="#8da9c4" />
            </TouchableOpacity>
            <Text style={styles.authTitle}>Welcome Back</Text>
          </View>
          
          <View style={styles.authSubWrapper}>
            <Text style={styles.authSub}>Sign in to your member account</Text>
          </View>

          <View style={styles.centerForm}>
            <View style={[styles.authCard, phoneNumber.length === 10 && styles.authCardActive]}>
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
                style={[styles.submitBtnWrapper, (!isMember || loading) && styles.submitBtnDisabled]}
                onPress={handleSendCode}
                disabled={!isMember || loading}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={['#e5c158', '#b48208']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.submitBtnGradient}
                >
                  {loading ? (
                    <ActivityIndicator color="#0b132b" />
                  ) : (
                    <Text style={styles.submitBtnTxt}>Send Verification Code</Text>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </View>

            <View style={styles.footerInfo}>
              <Text style={styles.footerTxt}>Not a member yet? </Text>
              <TouchableOpacity onPress={() => navigation.navigate('SignUp')}>
                <Text style={styles.footerLink}>Register Here</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
        </ScrollView>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  // Landing Styles
  landingContainer: { flex: 1, backgroundColor: '#0a162d' },
  landingTop: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  headerAbsolute: {
    position: 'absolute',
    top: 100, // Move headers towards the top
    width: '100%',
    alignItems: 'center',
  },
  textContainer: {
    width: '90%',
    paddingHorizontal: 20,
    marginTop: 120, // Push it down slightly from the absolute headers
    alignItems: 'center',
  },
  cursiveWelcomeHeading: {
    fontSize: 68,
    fontWeight: 'normal',
    color: '#f3e7c4',
    fontFamily: Platform.OS === 'ios' ? 'Snell Roundhand' : Platform.OS === 'android' ? 'cursive' : 'Dancing Script, cursive',
    fontStyle: 'italic',
    textAlign: 'center',
    marginBottom: 0,
  },
  churchOfGodText: {
    fontSize: 22,
    fontWeight: '400',
    color: '#f3e7c4',
    textAlign: 'center',
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom: 16,
  },
  contextTxt: {
    fontSize: 16,
    color: '#cbd5e1', // Soft light slate
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24, // More space before the verse
    fontWeight: '300', // Lighter weight for elegance
    letterSpacing: 0.5,
  },
  verseQuoteTxt: {
    fontSize: 14,
    color: '#8da9c4', // Light blue/grey
    fontStyle: 'italic',
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 15,
    marginBottom: 8,
  },
  verseRefTxt: {
    fontSize: 12,
    color: '#e5c158', // Gold
    fontWeight: '600',
    textAlign: 'center',
    letterSpacing: 1,
  },
  
  landingBottom: { paddingHorizontal: 24, paddingBottom: 80, marginTop: -20, gap: 16, alignItems: 'center' },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    width: '100%',
  },
  badgeBtnWrapper: {
    flex: 1,
    maxWidth: 160,
  },
  gradientBadge: {
    borderRadius: 30,
    paddingVertical: 14,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#b48208',
    shadowColor: '#e5b842',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 5,
  },
  gradientBadgeNavy: {
    borderRadius: 30,
    paddingVertical: 14,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#3b82f6',
    shadowColor: '#1e3a8a',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.45,
    shadowRadius: 8,
    elevation: 6,
  },
  signInBadgeTxt: {
    color: '#0b132b',
    fontSize: 15,
    fontWeight: '700',
  },
  signUpBadgeTxt: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '600',
  },

  guestLink: { marginTop: 4, alignItems: 'center' },
  guestLinkTxt: { color: '#8da9c4', fontSize: 13, fontWeight: '500' },

  poweredByContainer: {
    marginTop: 35,
    alignItems: 'center',
    paddingBottom: Platform.OS === 'ios' ? 10 : 20,
  },
  poweredByTxt: {
    color: 'rgba(255, 255, 255, 0.4)',
    fontSize: 10,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    fontWeight: '600',
  },

  // Auth Styles
  authContainer: { flex: 1, backgroundColor: '#0a162d' }, // Dark background like sign up
  authContent: { paddingHorizontal: 25, flex: 1, paddingTop: Platform.OS === 'ios' ? 0 : 20 },
  centerForm: { flex: 1, justifyContent: 'center', paddingBottom: 40 },
  
  headerSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    marginLeft: -10, // Pull slightly left so back button aligns visually with the padding
  },
  inlineBackBtn: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  
  authTitle: { 
    fontSize: 42, // Slightly reduced so it fits nicely on one line with back button
    fontWeight: 'normal', 
    color: '#f3e7c4', 
    fontFamily: Platform.OS === 'ios' ? 'Snell Roundhand' : Platform.OS === 'android' ? 'cursive' : 'Georgia',
    fontStyle: 'italic',
  },
  authSubWrapper: {
    alignItems: 'flex-end',
    paddingRight: 55,
    marginTop: -8,
  },
  authSub: { fontSize: 15, color: '#8da9c4', fontStyle: 'italic', marginBottom: 20 },

  authCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  authCardActive: {
    borderColor: '#e5c158',
    backgroundColor: 'rgba(229, 193, 88, 0.03)',
  },

  inputSection: { marginBottom: 25 },
  inputLabel: { fontSize: 10, fontWeight: '800', color: '#8da9c4', letterSpacing: 1, marginBottom: 10 },
  inputWrapper: { 
    flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(0, 0, 0, 0.2)', 
    borderRadius: 14, paddingHorizontal: 16, height: 56, borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.05)' 
  },
  inputWrapperSuccess: { borderColor: '#BBF7D0', backgroundColor: 'rgba(21, 128, 61, 0.15)' },
  textInput: { flex: 1, marginLeft: 12, fontSize: 16, fontWeight: '600', color: '#ffffff' },
  statusText: { fontSize: 11, color: '#ef4444', marginTop: 8, fontWeight: '500' },
  statusTextSuccess: { color: '#4ade80' },

  memberBanner: { 
    backgroundColor: 'rgba(255, 255, 255, 0.05)', 
    padding: 18, 
    borderRadius: 16, 
    marginBottom: 25, 
    borderWidth: 1, 
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderLeftWidth: 4,
    borderLeftColor: '#e5c158' 
  },
  memberBannerTxt: { color: '#f3e7c4', fontSize: 16, fontWeight: '800' },
  memberBannerSub: { color: '#8da9c4', fontSize: 12, marginTop: 4 },

  submitBtnWrapper: { alignSelf: 'center', width: '80%', elevation: 4, shadowColor: '#e5c158', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8 },
  submitBtnGradient: { borderRadius: 30, paddingVertical: 16, alignItems: 'center' },
  submitBtnDisabled: { opacity: 0.5 },
  submitBtnTxt: { color: '#0b132b', fontSize: 15, fontWeight: '800' },

  footerInfo: { flexDirection: 'row', justifyContent: 'center', marginTop: 30 },
  footerTxt: { color: '#8da9c4', fontSize: 14 },
  footerLink: { color: '#e5c158', fontSize: 14, fontWeight: '700' },
});
