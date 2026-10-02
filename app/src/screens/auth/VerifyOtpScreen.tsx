import React, { useState } from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  KeyboardAvoidingView, 
  Platform,
  ActivityIndicator,
  Alert,
  StatusBar,
  ScrollView
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import auth from '@react-native-firebase/auth';
import { AuthStackParamList } from '../../navigation/AuthNavigator';
import Theme from '../../theme/Theme';
import SalesforceService from '../../services/SalesforceService';
import { ChevronLeft, ShieldCheck, RefreshCw } from 'lucide-react-native';

import { ErrorBadge } from '../../components/ErrorBadge';

type VerifyOtpScreenProps = NativeStackScreenProps<AuthStackParamList, 'VerifyOtp'>;

export default function VerifyOtpScreen({ route, navigation }: VerifyOtpScreenProps) {
  const { confirmation, phoneNumber, contactId, memberName } = route.params;
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('');
  const [error, setError] = useState<any>(null);

  const handleVerify = async () => {
    setError(null);
    if (code.length !== 6) {
      setError('Please enter the 6-digit code sent to your phone.');
      return;
    }

    setLoading(true);
    setStatus('Verifying your code...');
    
    try {
      const result = await confirmation.confirm(code);

      if (result?.user && contactId) {
        setStatus('Linking church profile...');
        try {
          await SalesforceService.syncMember(contactId, result.user.uid);
          
          let rawRole = 'member';
          try {
            const sfResult = await SalesforceService.checkContactExists(phoneNumber);
            if (sfResult && sfResult.exists) {
              rawRole = (sfResult.member?.userType || 'Member').toLowerCase();
            }
          } catch (e) {
            console.log('⚠️ Could not fetch role from Salesforce, defaulting to member');
          }
          
          const role = ['admin', 'pastor'].includes(rawRole) ? rawRole : 'member';

          // Save profile details to Firestore so Push Notifications can match them by name
          const firestore = require('@react-native-firebase/firestore').default;
          await firestore().collection('users').doc(result.user.uid).set({
            name: memberName || '',
            phone: phoneNumber || '',
            role: role,
            onboardingComplete: true
          }, { merge: true });
          console.log('✨ Saved member profile to Firestore successfully!');
        } catch (syncError) {
          console.error('❌ Sync failed:', syncError);
        }
      }
    } catch (err: any) {
      console.error('❌ Error:', err.code);
      setError(err);
    } finally {
      setLoading(false);
      setStatus('');
    }
  };

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      <SafeAreaView style={styles.safeArea}>
        
        {/* ── Top Header Section ── */}
        <View style={styles.headerSection}>
          <TouchableOpacity style={styles.inlineBackBtn} onPress={() => navigation.goBack()}>
            <ChevronLeft size={22} color="#1a2d5a" />
          </TouchableOpacity>
          <Text style={styles.cursiveHeading}>Verification</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView 
          showsVerticalScrollIndicator={false} 
          contentContainerStyle={styles.scrollContent}
        >
          <View style={styles.content}>
            <View style={styles.infoSection}>
              <View style={styles.iconCircle}>
                <ShieldCheck size={32} color="#1a2d5a" />
              </View>
              <Text style={styles.authTitle}>Verify your phone</Text>
              <Text style={styles.authSub}>We sent a 6-digit code to</Text>
              <View style={styles.phoneBadge}>
                <Text style={styles.phoneTxt}>{phoneNumber}</Text>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                  <Text style={styles.changeNumTxt}>Change</Text>
                </TouchableOpacity>
              </View>

              {memberName ? (
                <View style={styles.memberBanner}>
                  <Text style={styles.memberBannerTxt}>Welcome, {memberName} 🙏</Text>
                  <Text style={styles.memberBannerSub}>Please verify your identity.</Text>
                </View>
              ) : null}
            </View>

            <View style={styles.inputSection}>
              <Text style={styles.inputLabel}>ENTER 6-DIGIT CODE</Text>
              <View style={styles.codeContainer}>
                <TextInput
                  style={styles.codeInput}
                  placeholder="000 000"
                  placeholderTextColor="#D1D5DB"
                  keyboardType="number-pad"
                  maxLength={6}
                  value={code}
                  onChangeText={setCode}
                  autoFocus
                />
              </View>
            </View>

            <ErrorBadge error={error} />

            <TouchableOpacity 
              style={[styles.submitBtn, loading && styles.submitBtnDisabled]}
              onPress={handleVerify}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.submitBtnTxt}>Verify & Sign In</Text>
              )}
            </TouchableOpacity>

            {status ? <Text style={styles.statusTxt}>{status}</Text> : null}
          </View>
        </ScrollView>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  safeArea: { flex: 1 },
  
  // Header (New Inline Design)
  headerSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 10 : 20,
    paddingBottom: 20,
    width: '100%',
  },
  inlineBackBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cursiveHeading: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1a2d5a',
  },

  content: { width: '100%', paddingHorizontal: 25, paddingTop: 20, alignItems: 'center', paddingBottom: 40 },
  scrollContent: { flexGrow: 1 },
  
  infoSection: { alignItems: 'center', marginBottom: 40 },
  iconCircle: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#f0f2f7', justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  authTitle: { fontSize: 24, fontWeight: '800', color: '#1a2d5a', marginBottom: 8 },
  authSub: { fontSize: 14, color: '#6B7280' },
  
  phoneBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 24,
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    gap: 12
  },
  phoneTxt: { fontSize: 16, fontWeight: '700', color: '#111827' },
  changeNumTxt: { fontSize: 13, fontWeight: '600', color: '#3b82f6', textDecorationLine: 'underline' },

  inputSection: { width: '100%', marginBottom: 30 },
  inputLabel: { fontSize: 10, fontWeight: '800', color: '#1a2d5a', letterSpacing: 1, marginBottom: 12, textAlign: 'center' },
  codeContainer: { 
    backgroundColor: '#f9fafb', borderRadius: 16, borderWidth: 1, borderColor: '#e5e7eb',
    height: 70, justifyContent: 'center', alignItems: 'center'
  },
  codeInput: { fontSize: 32, fontWeight: '700', color: '#111827', letterSpacing: 10, textAlign: 'center', width: '100%' },

  submitBtn: { backgroundColor: '#1a2d5a', width: '100%', borderRadius: 16, paddingVertical: 18, alignItems: 'center', elevation: 2 },
  submitBtnDisabled: { opacity: 0.5 },
  submitBtnTxt: { color: '#fff', fontSize: 16, fontWeight: '700' },

  statusTxt: { fontSize: 12, color: '#1a2d5a', fontWeight: '600', marginTop: 15 },

  resendBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 30 },
  resendTxt: { fontSize: 14, color: '#6B7280', fontWeight: '600' },
  
  memberBanner: { 
    backgroundColor: '#f8fafc', 
    padding: 18, 
    borderRadius: 16, 
    marginTop: 25, 
    borderWidth: 1, 
    borderColor: '#e2e8f0',
    borderLeftWidth: 4,
    borderLeftColor: '#c0392b',
    width: '100%'
  },
  memberBannerTxt: { color: '#1a2d5a', fontSize: 16, fontWeight: '800' },
  memberBannerSub: { color: '#64748b', fontSize: 12, marginTop: 4 },
});
