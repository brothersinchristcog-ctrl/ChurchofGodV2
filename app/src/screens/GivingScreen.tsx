import React, { useState, useRef, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Dimensions,
  Linking,
  ActivityIndicator,
  Alert,
  StatusBar,
  Platform,
  Share,
  Animated,
  Modal,
  Easing
} from 'react-native';
import { 
  Lock, 
  Coins,
  CreditCard,
  Share2,
  Heart,
  ShieldCheck,
  DollarSign,
  Smartphone,
  CheckCircle,
  Wallet,
  Landmark,
  ArrowLeft
} from 'lucide-react-native';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { LinearGradient } from 'expo-linear-gradient';
import firestore from '@react-native-firebase/firestore';
import functions from '@react-native-firebase/functions';
import RazorpayCheckout from 'react-native-razorpay';
import ReceiptModal, { DonationRecord } from '../components/ReceiptModal';

const { width } = Dimensions.get('window');

const CATEGORIES = [
  { id: 'Tithe', label: 'Tithe', labelTe: 'దశమభాగం', icon: '🙏' },
  { id: 'Offering', label: 'Offering', labelTe: 'కానుక', icon: '🎁' },
  { id: 'Missions', label: 'Missions', labelTe: 'సేవా నిధి', icon: '🌍' },
  { id: 'Building', label: 'Building', labelTe: 'నిర్మాణ నిధి', icon: '🏛️' },
  { id: 'Special', label: 'Special', labelTe: 'ప్రత్యేక కానుక', icon: '💎' },
  { id: 'Other', label: 'Other', labelTe: 'ఇతర', icon: '📝' }
];

const PRESETS = [50, 100, 200, 500, 1000];

const AnimatedPayIcons = () => {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.timing(anim, {
        toValue: 6,
        duration: 7500, // 1.25 seconds per icon
        useNativeDriver: true,
        easing: Easing.linear
      })
    ).start();
  }, []);

  const getStyle = (index: number) => {
    let opacityInput, opacityOutput, yInput, yOutput;
    
    if (index === 0) {
      opacityInput = [0, 0.4, 5.6, 6];
      opacityOutput = [1, 0, 0, 1];
      yInput = [0, 0.4, 5.6, 6];
      yOutput = [0, -12, 12, 0];
    } else {
      opacityInput = [index - 1, index - 0.4, index, index + 0.4, index + 1];
      opacityOutput = [0, 0, 1, 0, 0];
      yInput = [index - 1, index - 0.4, index, index + 0.4, index + 1];
      yOutput = [12, 12, 0, -12, -12];
    }

    return {
      position: 'absolute' as const,
      left: 0,
      top: 0,
      opacity: anim.interpolate({
        inputRange: opacityInput,
        outputRange: opacityOutput,
        extrapolate: 'clamp'
      }),
      transform: [{
        translateY: anim.interpolate({
          inputRange: yInput,
          outputRange: yOutput,
          extrapolate: 'clamp'
        })
      }]
    };
  };

  return (
    <View style={{ width: 24, height: 24, position: 'relative' }}>
      <Animated.View style={getStyle(0)}><CreditCard color="#22c55e" size={24} /></Animated.View>
      <Animated.View style={getStyle(1)}><Smartphone color="#000000" size={24} /></Animated.View>
      <Animated.View style={getStyle(2)}><Wallet color="#8B4513" size={24} /></Animated.View>
      <Animated.View style={getStyle(3)}><Landmark color="#F5DEB3" size={24} /></Animated.View>
      <Animated.View style={getStyle(4)}><DollarSign color="#F97316" size={24} /></Animated.View>
      <Animated.View style={getStyle(5)}><CheckCircle color="#FCD34D" size={24} /></Animated.View>
    </View>
  );
};

const WORDS = [
  "Joy",
  "Love",
  "Faith"
];

const WORD_COLORS: Record<string, string> = {
  Joy:   '#60a5fa', // Bright sky blue
  Love:  '#f87171', // Warm crimson red
  Faith: '#FCD34D', // Rich golden yellow
};

const AnimatedTitle = ({ isDark }: { isDark: boolean }) => {
  const [index, setIndex] = useState(0);
  const translateY = useRef(new Animated.Value(60)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  const ITEM_HEIGHT = 70; // Tall enough for GreatVibes ascenders/descenders

  const animateIn = () => {
    translateY.setValue(60);
    opacity.setValue(0);
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: 0,
        duration: 400,
        useNativeDriver: true,
        easing: Easing.out(Easing.ease),
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const animateOut = (next: () => void) => {
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: -60,
        duration: 400,
        useNativeDriver: true,
        easing: Easing.in(Easing.ease),
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(next);
  };

  useEffect(() => {
    animateIn();
    const interval = setInterval(() => {
      animateOut(() => {
        setIndex(prev => (prev + 1) % WORDS.length);
      });
    }, 2800);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    animateIn();
  }, [index]);

  const wordColor = WORD_COLORS[WORDS[index]] ?? '#FCD34D';
  const badgeColors: [string, string] = [wordColor + '33', wordColor + '22']; // translucent tint

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: 'transparent' }}>
      <Text style={[styles.headerTitle, { color: isDark ? '#f8fafc' : '#1e293b', backgroundColor: 'transparent' }]}>
        Give with
      </Text>
      {/* Badge */}
      <LinearGradient
        colors={[wordColor + '40', wordColor + '18']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={{
          marginLeft: 10,
          paddingHorizontal: 14,
          paddingVertical: 0,
          borderRadius: 999,
          borderWidth: 1.5,
          borderColor: wordColor + '80',
          minWidth: 90,
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
        }}
      >
        <Animated.View style={{ opacity, transform: [{ translateY }], backgroundColor: 'transparent' }}>
          <Text
            style={{
              color: wordColor,
              fontSize: 28,
              fontFamily: 'DancingScript_700Bold',
              backgroundColor: 'transparent',
              includeFontPadding: false,
              lineHeight: 34,
            }}
          >
            {WORDS[index]}
          </Text>
        </Animated.View>
      </LinearGradient>
    </View>
  );
};


export default function GivingScreen({ navigation }: any) {
  const { user } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  
  const [activeCat, setActiveCat] = useState('Tithe');
  const [amount, setAmount] = useState('500');
  const [loading, setLoading] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [otherPurpose, setOtherPurpose] = useState('');
  const [showOtherModal, setShowOtherModal] = useState(false);
  
  const [recentDonations, setRecentDonations] = useState<DonationRecord[]>([]);
  const [selectedDonation, setSelectedDonation] = useState<DonationRecord | null>(null);
  const [showReceipt, setShowReceipt] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(true);
  
  // Fetch userName if available
  const [userName, setUserName] = useState(user?.displayName || 'Anonymous');

  useEffect(() => {
    // Optional: fetch more detailed user info from Firestore if needed
    if (user?.uid) {
      firestore().collection('users').doc(user.uid).get().then(doc => {
        const data = doc.data();
        if (data?.name) {
          setUserName(data.name);
        }
      }).catch(e => console.log('User fetch error:', e));
    }
  }, [user]);

  useEffect(() => {
    if (user?.uid) {
      const unsubscribe = firestore()
        .collection('church_donations')
        .where('userId', '==', user.uid)
        .onSnapshot(
          snapshot => {
            if (snapshot) {
              const donations: DonationRecord[] = [];
              snapshot.forEach(doc => {
                const data = doc.data();
                donations.push({
                  id: doc.id,
                  amount: data.amount,
                  category: data.category,
                  date: data.date || new Date().toISOString(),
                  userName: data.userName || user?.displayName || 'Anonymous',
                  paymentId: data.paymentId,
                  status: data.status,
                });
              });
              
              // Sort locally by date descending
              donations.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
              
              // Keep top 10 recent
              setRecentDonations(donations.slice(0, 10));
            }
            setLoadingHistory(false);
          },
          err => {
            console.error('Error fetching donations:', err);
            setLoadingHistory(false);
          }
        );
      
      return () => unsubscribe();
    } else {
      setLoadingHistory(false);
    }
  }, [user]);

  const handlePayment = async () => {
    const numAmt = parseFloat(amount);
    if (isNaN(numAmt) || numAmt <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid amount.');
      return;
    }

    setLoading(true);
    let docRef: any = null;
    try {
      // 1. Create a donation record in Firebase Firestore
      docRef = await firestore().collection('church_donations').add({
        amount: numAmt,
        category: activeCat === 'Other' && otherPurpose ? `Other: ${otherPurpose}` : activeCat,
        userId: user?.uid || 'anonymous',
        userName: userName,
        phone: user?.phoneNumber || '',
        status: 'pending',
        date: new Date().toISOString(),
        timestamp: firestore.FieldValue.serverTimestamp()
      });

      // 2. Call Firebase Function to create Razorpay Order
      const createOrder = functions().app.functions('asia-south1').httpsCallable('createRazorpayOrder');
      const response = await createOrder({
        amount: numAmt,
        type: 'donation',
        receipt: docRef.id
      });

      const { order, key_id } = response.data as any;

      // 3. Open Razorpay Checkout
      const options = {
        description: 'Church Donation',
        image: 'https://yt3.googleusercontent.com/AYz499xBLUqxUccyHR8_DubeLzrURqkLnD_r4HuEEkQeJaJHuJL15dxzvOnanGuyARyJcAAPBns=s160-c-k-c0x00ffffff-no-rj',
        currency: order.currency,
        key: key_id,
        amount: order.amount,
        name: 'Church of God',
        order_id: order.id,
        prefill: {
          email: user?.email || '',
          contact: user?.phoneNumber || '',
          name: userName
        },
        theme: { color: '#1a2d5a' }
      };

      RazorpayCheckout.open(options).then(async (data: any) => {
        // Payment Success
        // 4. Verify Payment with Backend
        try {
          const verifyPayment = functions().app.functions('asia-south1').httpsCallable('verifyRazorpayPayment');
          const verifyRes = await verifyPayment({
            razorpay_order_id: data.razorpay_order_id,
            razorpay_payment_id: data.razorpay_payment_id,
            razorpay_signature: data.razorpay_signature,
            type: 'donation'
          });

          if ((verifyRes.data as any).success) {
            await docRef.update({ 
              status: 'completed',
              paymentId: data.razorpay_payment_id,
              orderId: data.razorpay_order_id
            });
            Alert.alert('Success', 'Thank you for your generous donation!');
          } else {
            await docRef.update({ status: 'failed' });
            Alert.alert('Payment Failed', 'Verification failed.');
          }
        } catch (vErr) {
          console.error('Verification error:', vErr);
          await docRef.update({ status: 'failed' });
          Alert.alert('Payment Error', 'Payment was successful but verification failed.');
        }
      }).catch(async (error: any) => {
        // Payment Failed or Cancelled
        await docRef.update({ status: 'failed' });
        Alert.alert('Payment Cancelled', 'Your payment was cancelled or failed.');
      });
      
    } catch (err) {
      console.error('Donation error:', err);
      if (docRef) {
        await docRef.update({ status: 'failed' });
      }
      Alert.alert('Error', 'Unable to initiate payment. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async (text: string, label: string) => {
    try {
      await Share.share({
        message: text,
      });
    } catch (err) {
      console.error(err);
      Alert.alert('Error', 'Failed to share details.');
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: isDark ? '#0f172a' : '#f8fafc' }]}>
      <StatusBar barStyle="light-content" backgroundColor="#1a2d5a" />
      
      {/* ── Header Section ── */}
      <View style={[styles.header, { overflow: 'visible', backgroundColor: 'transparent' }]}>
        <View style={styles.headerTop}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <ArrowLeft size={28} color={isDark ? '#FCD34D' : '#1a2d5a'} />
          </TouchableOpacity>
        </View>
        
        <View style={[styles.headerContent, { overflow: 'visible', backgroundColor: 'transparent' }]}>
          <View style={{ alignItems: 'flex-start', overflow: 'visible', backgroundColor: 'transparent' }}>
            <AnimatedTitle isDark={isDark} />
            <Text style={[styles.headerQuote, { color: isDark ? '#94a3b8' : '#64748b' }]}>“God loves a cheerful giver” — 2 Cor 9:7</Text>
          </View>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        
        {/* ── Category Selection (Glassmorphic look) ── */}
        <Text style={[styles.sectionTitle, { color: isDark ? '#94a3b8' : '#64748b' }]}>SELECT GIVING CATEGORY</Text>
        <View style={styles.grid}>
          {CATEGORIES.map(cat => {
            const isActive = activeCat === cat.id;
            return (
              <TouchableOpacity 
                key={cat.id} 
                style={[
                  styles.gridItem, 
                  { backgroundColor: isDark ? '#1e293b' : '#fff' },
                  isActive && { borderColor: '#FCD34D' }
                ]}
                activeOpacity={0.8}
                onPress={() => {
                  setActiveCat(cat.id);
                  if (cat.id === 'Other') {
                    setShowOtherModal(true);
                  }
                }}
              >
                {isActive && (
                  <LinearGradient 
                    colors={['rgba(252, 211, 77, 0.15)', 'transparent']} 
                    style={[StyleSheet.absoluteFillObject, { borderRadius: 16 }]}
                  />
                )}
                <Text style={styles.catEmoji}>{cat.icon}</Text>
                <Text style={[styles.catTitle, { color: isDark ? '#f8fafc' : '#1e293b' }]}>{cat.label}</Text>
                <Text style={styles.catTitleTe}>{cat.labelTe}</Text>
                
                {isActive && (
                  <View style={styles.activeCheck}>
                    <ShieldCheck size={14} color="#FCD34D" />
                  </View>
                )}
              </TouchableOpacity>
            )
          })}
        </View>

        {/* ── Amount Selection ── */}
        <Text style={[styles.sectionTitle, { color: isDark ? '#94a3b8' : '#64748b', marginTop: 10 }]}>SELECT OR ENTER CUSTOM AMOUNT (₹)</Text>
        
        <View style={styles.presetRow}>
          {PRESETS.map(val => {
            const isActive = amount === val.toString();
            return (
              <TouchableOpacity 
                key={val} 
                style={[
                  styles.presetBtn, 
                  { backgroundColor: isDark ? '#1e293b' : '#fff' },
                  isActive && { backgroundColor: isDark ? '#FCD34D' : '#1a2d5a', borderColor: 'transparent' }
                ]}
                onPress={() => setAmount(val.toString())}
              >
                <Text style={[
                  styles.presetTxt, 
                  { color: isDark ? '#cbd5e1' : '#64748b' },
                  isActive && { color: isDark ? '#0f172a' : '#fff', fontWeight: '800' }
                ]}>₹{val}</Text>
              </TouchableOpacity>
            )
          })}
        </View>

        <View style={[
          styles.inputWrapper, 
          { backgroundColor: isDark ? '#1e293b' : '#fff' },
          isFocused && { borderColor: '#FCD34D', borderWidth: 2 }
        ]}>
           <Text style={styles.currencySymbol}>₹</Text>
           <TextInput
             style={[styles.amountInput, { color: isDark ? '#f8fafc' : '#1e293b' }]}
             keyboardType="numeric"
             value={amount}
             onChangeText={setAmount}
             placeholder="Enter custom amount"
             placeholderTextColor={isDark ? '#475569' : '#cbd5e1'}
             onFocus={() => setIsFocused(true)}
             onBlur={() => setIsFocused(false)}
           />
        </View>

        {/* ── Payment Button ── */}
        <TouchableOpacity 
          style={styles.payBtnContainer}
          onPress={handlePayment}
          disabled={loading}
          activeOpacity={0.8}
        >
          <LinearGradient 
            colors={['#1e3a8a', '#3b82f6', '#60a5fa']} 
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={[styles.payBtnInner, loading && { opacity: 0.7 }]}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Text style={styles.payBtnTxt}>Proceed to Pay ₹{amount || '0'}</Text>
                <AnimatedPayIcons />
              </>
            )}
          </LinearGradient>
        </TouchableOpacity>

        {/* ── UPI Box (Glassmorphic) ── */}
        <View style={[styles.upiInfoCard, { backgroundColor: isDark ? '#1e293b' : '#fff' }]}>
          <Text style={[styles.upiSectionTitle, { color: isDark ? '#FCD34D' : '#1a2d5a' }]}>Direct Transfer / PhonePe</Text>
          
          <View style={styles.upiDetailRow}>
            <View>
              <Text style={styles.upiLabel}>PHONEPE NUMBER</Text>
              <Text style={[styles.upiValue, { color: isDark ? '#f8fafc' : '#1e293b' }]}>8000504070</Text>
            </View>
            <TouchableOpacity 
              style={[styles.copyBtn, { backgroundColor: isDark ? '#334155' : '#f1f5f9' }]} 
              onPress={() => handleCopy('8000504070', 'PhonePe Number')}
            >
              <Share2 size={14} color={isDark ? '#FCD34D' : '#1a2d5a'} />
              <Text style={[styles.copyBtnTxt, { color: isDark ? '#FCD34D' : '#1a2d5a' }]}>Copy</Text>
            </TouchableOpacity>
          </View>

          <View style={[styles.upiDivider, { backgroundColor: isDark ? '#334155' : '#e2e8f0' }]} />

          <View style={styles.upiDetailRow}>
            <View>
              <Text style={styles.upiLabel}>UPI ID</Text>
              <Text style={[styles.upiValue, { color: isDark ? '#f8fafc' : '#1e293b' }]}>8000504070@ybl</Text>
            </View>
            <TouchableOpacity 
              style={[styles.copyBtn, { backgroundColor: isDark ? '#334155' : '#f1f5f9' }]} 
              onPress={() => handleCopy('8000504070@ybl', 'UPI ID')}
            >
              <Share2 size={14} color={isDark ? '#FCD34D' : '#1a2d5a'} />
              <Text style={[styles.copyBtnTxt, { color: isDark ? '#FCD34D' : '#1a2d5a' }]}>Copy</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ── Recent Payments History ── */}
        <View style={{ marginTop: 30 }}>
          <Text style={[styles.sectionTitle, { color: isDark ? '#94a3b8' : '#64748b' }]}>RECENT PAYMENTS HISTORY</Text>
          
          {loadingHistory ? (
            <ActivityIndicator size="small" color="#FCD34D" style={{ marginTop: 20 }} />
          ) : recentDonations.length === 0 ? (
            <View style={[styles.emptyHistoryBox, { backgroundColor: isDark ? '#1e293b' : '#fff' }]}>
              <Text style={[styles.emptyHistoryText, { color: isDark ? '#64748b' : '#94a3b8' }]}>No recent payments found.</Text>
            </View>
          ) : (
            recentDonations.map(donation => (
              <TouchableOpacity
                key={donation.id}
                style={[styles.historyCard, { backgroundColor: isDark ? '#1e293b' : '#fff' }]}
                onPress={() => {
                  setSelectedDonation(donation);
                  setShowReceipt(true);
                }}
              >
                <View style={styles.historyCardLeft}>
                  <View style={[styles.historyIconBox, { backgroundColor: isDark ? '#334155' : '#f1f5f9' }]}>
                     <CheckCircle size={20} color={donation.status === 'completed' ? "#10b981" : (donation.status === 'failed' ? "#ef4444" : "#f59e0b")} />
                  </View>
                  <View>
                    <Text style={[styles.historyCatText, { color: isDark ? '#f8fafc' : '#1e293b' }]}>{donation.category}</Text>
                    <Text style={[styles.historyDateText, { color: isDark ? '#94a3b8' : '#64748b' }]}>
                      {new Date(donation.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </Text>
                  </View>
                </View>
                <Text style={[styles.historyAmountText, { color: isDark ? '#FCD34D' : '#1a2d5a' }]}>₹{donation.amount}</Text>
              </TouchableOpacity>
            ))
          )}
        </View>

        <View style={styles.securityFooter}>
           <Lock size={12} color="#94a3b8" />
           <Text style={styles.securityText}>Secured by Razorpay · UPI · PhonePe · All major banks</Text>
        </View>
        
      </ScrollView>

      {/* ── Other Purpose Modal ── */}
      <Modal
        visible={showOtherModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowOtherModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: isDark ? '#1e293b' : '#fff' }]}>
            <Text style={[styles.modalTitle, { color: isDark ? '#fff' : '#1e293b' }]}>Enter Purpose</Text>
            <Text style={styles.modalSub}>What is this donation for?</Text>
            <TextInput
              style={[
                styles.modalInput,
                { 
                  backgroundColor: isDark ? '#0f172a' : '#f8fafc',
                  color: isDark ? '#fff' : '#1e293b',
                  borderColor: isDark ? '#334155' : '#e2e8f0'
                }
              ]}
              placeholder="E.g., Medical help, Event..."
              placeholderTextColor="#94a3b8"
              value={otherPurpose}
              onChangeText={setOtherPurpose}
              autoFocus
            />
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalBtnCancel} onPress={() => setShowOtherModal(false)}>
                <Text style={styles.modalBtnCancelTxt}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalBtnSave} onPress={() => setShowOtherModal(false)}>
                <Text style={styles.modalBtnSaveTxt}>Done</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── Receipt Modal ── */}
      <ReceiptModal 
        visible={showReceipt} 
        onClose={() => setShowReceipt(false)} 
        donation={selectedDonation} 
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { 
    paddingTop: Platform.OS === 'ios' ? 50 : 20, 
    paddingBottom: 10,
  },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 20, alignItems: 'center' },
  backBtn: { paddingVertical: 10, paddingHorizontal: 5, marginTop: 10 },
  backBtnTxt: { fontSize: 16, fontWeight: '700' },
  themeToggle: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16 },
  themeToggleText: { fontSize: 11, fontWeight: '700' },
  
  headerContent: { alignItems: 'center', marginTop: 4 },
  headerTitle: { fontSize: 24, fontWeight: '800', letterSpacing: 0.5 },
  headerQuote: { fontSize: 12, marginTop: 6, fontStyle: 'italic' },

  scrollContent: { padding: 20, paddingBottom: 50 },
  
  sectionTitle: { fontSize: 11, fontWeight: '800', letterSpacing: 1, marginBottom: 14, marginLeft: 4 },
  
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: 20 },
  gridItem: { 
    width: (width - 40 - 20) / 3, 
    borderRadius: 16, 
    padding: 12, 
    alignItems: 'center', 
    borderWidth: 1.5, 
    borderColor: 'transparent',
    marginBottom: 10,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
    position: 'relative',
    overflow: 'hidden'
  },
  catEmoji: { fontSize: 22, marginBottom: 6 },
  catTitle: { fontSize: 12, fontWeight: '700' },
  catTitleTe: { fontSize: 9, color: '#94a3b8', marginTop: 2 },
  activeCheck: { position: 'absolute', top: 6, right: 6 },

  presetRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 },
  presetBtn: { 
    flex: 1,
    marginHorizontal: 2,
    paddingVertical: 10, 
    borderRadius: 16, 
    borderWidth: 1,
    borderColor: '#e2e8f0',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.02,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1
  },
  presetTxt: { fontSize: 13, fontWeight: '600' },

  inputWrapper: { 
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5, 
    borderColor: '#e2e8f0', 
    borderRadius: 20, 
    paddingHorizontal: 20, 
    height: 64, 
    marginBottom: 24,
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2
  },
  currencySymbol: { fontSize: 24, fontWeight: '700', color: '#94a3b8', marginRight: 10 },
  amountInput: { flex: 1, fontSize: 28, fontWeight: '800' },

  payBtnContainer: {
    marginBottom: 24,
    borderRadius: 30,
    shadowColor: '#3b82f6',
    shadowOpacity: 0.5,
    shadowRadius: 15,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  payBtnInner: { 
    borderRadius: 30, 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'center',
    gap: 12,
    paddingVertical: 16,
    paddingHorizontal: 32
  },
  payBtnTxt: { 
    color: '#fff', 
    fontSize: 16, 
    fontWeight: '600',
    letterSpacing: 0.5
  },

  upiInfoCard: {
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
    elevation: 3
  },
  upiSectionTitle: { fontSize: 13, fontWeight: '800', marginBottom: 16, letterSpacing: 0.5 },
  upiDetailRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  upiLabel: { fontSize: 10, fontWeight: '800', color: '#94a3b8', letterSpacing: 1 },
  upiValue: { fontSize: 15, fontWeight: '800', marginTop: 4 },
  copyBtn: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12, gap: 6 },
  copyBtnTxt: { fontSize: 12, fontWeight: '700' },
  upiDivider: { height: 1, marginVertical: 16 },

  securityFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 24 },
  securityText: { fontSize: 11, color: '#94a3b8', fontWeight: '600' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalContent: { width: '100%', borderRadius: 24, padding: 24, elevation: 10, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 10, shadowOffset: { width: 0, height: 4 } },
  modalTitle: { fontSize: 18, fontWeight: '800', marginBottom: 6 },
  modalSub: { fontSize: 13, color: '#64748b', marginBottom: 20 },
  modalInput: { borderWidth: 1, borderRadius: 16, paddingHorizontal: 16, height: 50, fontSize: 15, marginBottom: 20 },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12 },
  modalBtnCancel: { paddingVertical: 10, paddingHorizontal: 16, borderRadius: 12, backgroundColor: 'transparent' },
  modalBtnCancelTxt: { color: '#64748b', fontWeight: '700', fontSize: 14 },
  modalBtnSave: { paddingVertical: 10, paddingHorizontal: 20, borderRadius: 12, backgroundColor: '#10b981' },
  modalBtnSaveTxt: { color: '#fff', fontWeight: '700', fontSize: 14 },
  
  emptyHistoryBox: { padding: 20, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginTop: 10 },
  emptyHistoryText: { fontSize: 13, fontStyle: 'italic' },
  historyCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderRadius: 16, marginBottom: 10, shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 6, shadowOffset: { width: 0, height: 3 }, elevation: 2 },
  historyCardLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  historyIconBox: { padding: 10, borderRadius: 12 },
  historyCatText: { fontSize: 14, fontWeight: '700' },
  historyDateText: { fontSize: 11, marginTop: 2 },
  historyAmountText: { fontSize: 15, fontWeight: '800' },
});
