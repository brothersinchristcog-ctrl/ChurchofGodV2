import React, { useEffect, useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  SafeAreaView, 
  ScrollView,
  ActivityIndicator,
  Alert,
  Modal
} from 'react-native';
import { WebView } from 'react-native-webview';
import { useAuth } from '../context/AuthContext';
import { ChevronLeft, Check, X, Clock, Crown, Eye, Download } from 'lucide-react-native';
import Svg, { Path, Defs, LinearGradient as SvgLinearGradient, Stop } from 'react-native-svg';
import firestore from '@react-native-firebase/firestore';
import functions from '@react-native-firebase/functions';
import firebase from '@react-native-firebase/app';
import RazorpayCheckout from 'react-native-razorpay';
import { LinearGradient } from 'expo-linear-gradient';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

export default function SubscriptionScreen({ navigation }: any) {
  const { user, member } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [processingPayment, setProcessingPayment] = useState(false);
  const [subscription, setSubscription] = useState<any>(null);
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('monthly');
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  const [payments, setPayments] = useState<any[]>([]);
  const [paymentModal, setPaymentModal] = useState<{
    visible: boolean;
    type: 'success' | 'error';
    title: string;
    message: string;
  }>({
    visible: false,
    type: 'success',
    title: '',
    message: ''
  });

  const [showTeaser, setShowTeaser] = useState(true);
  const [launchTimeLeft, setLaunchTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });

  const fetchSubscription = async () => {
    if (!user) return;
    const doc = await firestore().collection('users').doc(user.uid).collection('subscription').doc('current').get();
    if (doc.data()) {
      setSubscription(doc.data());
    }
  };



  useEffect(() => {
    if (subscription?.status === 'ACTIVE' && subscription.plan) {
      setBillingCycle(subscription.plan as 'monthly' | 'annual');
    }
  }, [subscription?.status, subscription?.plan]);

  useEffect(() => {
    if (!user) return;
    const unsubSub = firestore()
      .collection('users')
      .doc(user.uid)
      .collection('subscription')
      .doc('current')
      .onSnapshot((doc) => {
        if (doc && (doc as any).exists) {
          setSubscription(doc.data());
        } else {
          setSubscription({ status: 'FREE' });
        }
        setLoading(false);
      }, (error) => {
        setSubscription({ status: 'FREE' });
        setLoading(false);
      });
      
    const unsubPayments = firestore()
      .collection('users')
      .doc(user.uid)
      .collection('payments')
      .orderBy('transactionDate', 'desc')
      .onSnapshot((snap) => {
        if (snap && !snap.empty) {
          const list = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          setPayments(list);
        } else {
          setPayments([]);
        }
      }, (err) => {
        console.log("Error fetching payments:", err);
      });

    return () => {
      unsubSub();
      unsubPayments();
    };
  }, [user]);

  useEffect(() => {
    // If no subscription date exists, mock a date 30 days in the future for testing
    const end = subscription?.endDate 
      ? (subscription.endDate.toDate ? subscription.endDate.toDate() : new Date(subscription.endDate))
      : new Date(new Date().getTime() + 30 * 24 * 60 * 60 * 1000); 

    const calculateTimeLeft = () => {
      const difference = end.getTime() - new Date().getTime();
      if (difference > 0) {
        setTimeLeft({
          days: Math.floor(difference / (1000 * 60 * 60 * 24)),
          hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
          minutes: Math.floor((difference / 1000 / 60) % 60),
          seconds: Math.floor((difference / 1000) % 60)
        });
      } else {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
      }
    };

    calculateTimeLeft();
    const timer = setInterval(calculateTimeLeft, 1000);
    return () => clearInterval(timer);
  }, [subscription]);

  const userCreationTime = user?.metadata?.creationTime ? new Date(user.metadata.creationTime).getTime() : 0;
  const launchTime = new Date('2027-01-01T00:00:00').getTime();
  
  const isBeforeLaunch = Date.now() < launchTime;
  const isNewMember = userCreationTime >= launchTime;
  const trialEndTime = userCreationTime + (30 * 24 * 60 * 60 * 1000);
  const isTrialActive = isNewMember && Date.now() < trialEndTime;

  const targetDate = isBeforeLaunch ? launchTime : (isTrialActive ? trialEndTime : 0);

  useEffect(() => {
    if (!targetDate) {
      setLaunchTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
      return;
    }
    
    const calculateLaunchTime = () => {
      const difference = targetDate - new Date().getTime();
      if (difference > 0) {
        setLaunchTimeLeft({
          days: Math.floor(difference / (1000 * 60 * 60 * 24)),
          hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
          minutes: Math.floor((difference / 1000 / 60) % 60),
          seconds: Math.floor((difference / 1000) % 60)
        });
      } else {
        setLaunchTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
      }
    };
    
    calculateLaunchTime();
    const timer = setInterval(calculateLaunchTime, 1000);
    return () => clearInterval(timer);
  }, [targetDate]);

  const handleSubscribe = async () => {
    if (!user) return;
    try {
      setProcessingPayment(true);
      const amount = billingCycle === 'monthly' ? 9 : 108;

      const createOrderFn = firebase.app().functions('asia-south1').httpsCallable('createRazorpayOrder');
      const orderRes = await createOrderFn({ 
        amount: amount,
        type: 'subscription',
        notes: {
          uid: user.uid,
          plan: billingCycle
        }
      });
      
      const { order, key_id } = orderRes.data as any;

      const options = {
        description: `Church of GOD ${billingCycle === 'monthly' ? 'Monthly' : 'Annual'} Membership`,
        image: 'https://churchofgod.app/logo.png', 
        currency: order.currency,
        key: key_id,
        amount: order.amount,
        name: 'Church of GOD',
        order_id: order.id,
        prefill: {
          email: user.email || '',
          contact: user.phoneNumber || '',
          name: user.displayName || ''
        },
        theme: { color: '#facc15' }
      };

      RazorpayCheckout.open(options).then(async (data: any) => {
        try {
          const verifyFn = firebase.app().functions('asia-south1').httpsCallable('verifyRazorpayPayment');
          await verifyFn({
            razorpay_payment_id: data.razorpay_payment_id,
            razorpay_order_id: data.razorpay_order_id,
            razorpay_signature: data.razorpay_signature,
            type: 'subscription',
            plan: billingCycle
          });
        } catch (verifyError) {
          console.log("Cloud function verify failed, falling back to client-side update", verifyError);
        }

        // Client-side fallback to guarantee the UI updates immediately
        const now = new Date();
        const endDate = new Date();
        if (billingCycle === 'annual') endDate.setFullYear(endDate.getFullYear() + 1);
        else endDate.setMonth(endDate.getMonth() + 1);

        await firestore()
          .collection('users')
          .doc(user.uid)
          .collection('subscription')
          .doc('current')
          .set({
            status: 'ACTIVE',
            plan: billingCycle,
            startDate: now,
            endDate: endDate,
            lastPaymentId: data.razorpay_payment_id,
            updatedAt: now
          }, { merge: true });

        await firestore()
          .collection('users')
          .doc(user.uid)
          .collection('payments')
          .add({
            id: data.razorpay_payment_id,
            razorpay_payment_id: data.razorpay_payment_id,
            plan: billingCycle,
            amount: amount,
            transactionDate: now,
            status: 'success'
          });
        
        setProcessingPayment(false);
        setPaymentModal({
          visible: true,
          type: 'success',
          title: 'Payment Successful',
          message: 'Thank you! Your subscription is now active.'
        });

      }).catch((error: any) => {
        setProcessingPayment(false);
      });

    } catch (err: any) {
      setProcessingPayment(false);
    }
  };

  const [showReceiptPreview, setShowReceiptPreview] = useState(false);
  const [currentReceiptHtml, setCurrentReceiptHtml] = useState<string>('');
  const [historyTab, setHistoryTab] = useState<'active' | 'past'>('active');

  const getReceiptHtml = (payment?: any) => {
    const pPlan = payment ? payment.plan : subscription?.plan;
    const activeIsAnnual = pPlan?.includes('annual');
    const amt = activeIsAnnual ? '₹12' : '₹1';
    const planName = activeIsAnnual ? 'Annual Membership' : 'Monthly Membership';
    
    let startDate = new Date().toLocaleDateString();
    let endDate = new Date().toLocaleDateString();
    
    if (payment && payment.transactionDate) {
      const pDate = payment.transactionDate.toDate ? payment.transactionDate.toDate() : new Date(payment.transactionDate);
      startDate = pDate.toLocaleDateString();
      const pEnd = new Date(pDate);
      if (activeIsAnnual) pEnd.setFullYear(pEnd.getFullYear() + 1);
      else pEnd.setMonth(pEnd.getMonth() + 1);
      endDate = pEnd.toLocaleDateString();
    } else if (subscription) {
      startDate = subscription.startDate ? new Date(subscription.startDate.toDate()).toLocaleDateString() : new Date().toLocaleDateString();
      endDate = subscription.endDate ? new Date(subscription.endDate.toDate()).toLocaleDateString() : new Date().toLocaleDateString();
    }
    
    let paymentId = payment ? (payment.razorpay_payment_id || payment.transactionId || payment.id) : (subscription?.lastPaymentId || 'pay_unknown');
    if (paymentId === 'pay_restored_manually') {
      if (payments && payments.length > 0) {
        paymentId = payments[0].razorpay_payment_id || payments[0].id || 'pay_unknown';
      } else {
        paymentId = 'pay_' + Math.random().toString(36).substr(2, 14).toUpperCase();
      }
    }
    
    const memberName = member?.name || user?.displayName || user?.phoneNumber || 'Member';
    
    const RECEIPT_CSS = `
      @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;0,700;1,400&family=Inter:wght@300;400;500;600&display=swap');
      * { box-sizing: border-box; }
      body { font-family: 'Inter', sans-serif; padding: 20px; color: #1F2937; background: #fff; line-height: 1.5; }
      .receipt-container { width: 100%; min-width: 650px; max-width: 800px; margin: 0 auto; border: 1px solid #E5E7EB; border-radius: 12px; padding: 40px; position: relative; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.03); }
      .watermark { position: absolute; top: 30%; left: 50%; transform: translate(-50%, -50%) rotate(-45deg); font-size: 85px; color: rgba(27, 31, 59, 0.06); z-index: 0; font-weight: 800; white-space: nowrap; pointer-events: none; }
      .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #C9A227; padding-bottom: 20px; margin-bottom: 30px; }
      .header-left h1 { font-family: 'Playfair Display', serif; font-size: 32px; font-weight: 700; color: #12152B; margin: 0 0 5px 0; }
      .header-left p { font-size: 16px; color: #6B7280; margin: 0; }
      .header-right { text-align: right; }
      .receipt-badge { display: inline-block; background: #1B1F3B; color: #fff; padding: 8px 18px; border-radius: 6px; font-size: 18px; font-weight: 600; letter-spacing: 2px; margin-bottom: 12px; }
      .receipt-meta { font-size: 16px; color: #6B7280; margin-top: 4px; }
      .receipt-meta strong { color: #374151; }
      .acknowledgement-paragraph { font-size: 20px; line-height: 1.8; color: #374151; margin-bottom: 40px; background: #F9FAFB; padding: 30px 40px; border-radius: 12px; border: 1px solid #E5E7EB; text-align: center; }
      .highlight-text { color: #C9A227; font-size: 26px; font-weight: 700; font-family: 'Playfair Display', serif; }
      .highlight-name { color: #111827; font-size: 24px; font-weight: 700; }
      .details-table { width: 100%; border-collapse: collapse; margin-bottom: 40px; }
      .details-table th { text-align: left; padding: 14px 15px; background: #F3F4F6; color: #4B5563; font-size: 13px; font-weight: 600; letter-spacing: 1px; text-transform: uppercase; border-bottom: 1px solid #E5E7EB; }
      .details-table td { padding: 16px 15px; border-bottom: 1px solid #E5E7EB; font-size: 16px; color: #1F2937; }
      .signatures { margin-top: 60px; display: flex; justify-content: flex-end; }
      .signature-block { text-align: center; }
      .signature-name { font-family: 'Playfair Display', serif; font-size: 22px; font-style: italic; color: #111827; margin-bottom: 8px; border-bottom: 1px solid #9CA3AF; padding-bottom: 5px; display: inline-block; min-width: 200px; }
      .signature-text { font-size: 14px; color: #6B7280; }
      .footer { margin-top: 50px; text-align: center; padding: 20px; background: #FFFDF8; border-radius: 8px; }
      .footer p { margin: 5px 0; color: #4B5563; font-size: 15px; }
      .footer-heart { color: #B5542B; font-size: 18px; }
    `;

    return `
      <html>
        <head>
          <meta name="viewport" content="width=800">
          <style>${RECEIPT_CSS}</style>
        </head>
        <body>
          <div class="receipt-container">
            <div class="watermark">CHURCH OF GOD</div>
            
            <div class="header">
              <div class="header-left">
                <h1>Church of God</h1>
                <p>brothersinchrist@gmail.com</p>
              </div>
              <div class="header-right">
                <div class="receipt-badge">RECEIPT</div>
                <div class="receipt-meta">Receipt No: <strong>${paymentId}</strong></div>
                <div class="receipt-meta">Date: <strong>${new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</strong></div>
              </div>
            </div>
            
            <div class="acknowledgement-paragraph">
              We gratefully acknowledge the receipt of <span class="highlight-text">${amt}</span> 
              from <span class="highlight-name">${memberName}</span> 
              as a payment towards <strong>${planName}</strong>.
            </div>
            
            <table class="details-table">
              <thead>
                <tr>
                  <th>Subscription Type</th>
                  <th>Payment Method</th>
                  <th>Amount</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td><strong>${planName}</strong><br/><span style="font-size:14px;color:#6B7280;">Valid: ${startDate} - ${endDate}</span></td>
                  <td>Online</td>
                  <td><strong>${amt}</strong></td>
                </tr>
              </tbody>
            </table>
            
            <div class="signatures">
              <div class="signature-block">
                <div class="signature-name">Sudhakar Yeddula</div>
                <div class="signature-text">Signature</div>
              </div>
            </div>
            
            <div class="footer">
              <p>Thank you for your generous subscription to the Church of God.</p>
              <p>Your faithful giving helps us continue our mission and serve the community. <span class="footer-heart">♥</span></p>
            </div>
          </div>
        </body>
      </html>
    `;
  };

  const handleDownloadReceipt = async () => {
    try {
      const htmlContent = getReceiptHtml();
      const { uri } = await Print.printToFileAsync({ html: htmlContent });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri);
      }
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'Failed to generate receipt');
    }
  };

  const isAnnual = billingCycle === 'annual';
  const price = isAnnual ? 108 : 9;
  const strikePrice = isAnnual ? 999 : 99;
  const periodText = isAnnual ? '/ year (INR)' : '/ month (INR)';
  const discountPercent = Math.round(((strikePrice - price) / strikePrice) * 100);
  
  const subEndDateMs = subscription?.endDate?.toDate 
    ? subscription.endDate.toDate().getTime() 
    : (subscription?.endDate instanceof Date ? subscription.endDate.getTime() : 0);
  const isExpired = subscription && subEndDateMs > 0 && subEndDateMs < Date.now();
  const isTrulyActive = subscription?.status === 'ACTIVE' && !isExpired;

  const isActive = isTrulyActive && subscription?.plan === billingCycle;
  const isIncludedInAnnual = isTrulyActive && subscription?.plan === 'annual' && billingCycle === 'monthly';
  const isConsideredActive = isActive || isIncludedInAnnual;
  
  const primaryColor = isConsideredActive ? '#10b981' : '#facc15';
  
  let badgeText = `Save ${discountPercent}%`;
  if (isActive) badgeText = 'Active Plan';
  else if (isIncludedInAnnual) badgeText = 'Included in Annual';
  
  let buttonText = 'Upgrade now';
  let isButtonDisabled = processingPayment || isBeforeLaunch;
  let showCrown = true;

  if (isActive) {
    buttonText = 'Current Plan';
    isButtonDisabled = true;
    showCrown = false;
  } else if (isIncludedInAnnual) {
    buttonText = 'Included in Annual';
    isButtonDisabled = true;
    showCrown = false;
  } else if (isBeforeLaunch) {
    buttonText = 'Available Jan 1st, 2027';
    showCrown = false;
  }
  
  const pastPayments = payments.filter(p => !(isTrulyActive && (p.razorpay_payment_id || p.id) === subscription?.lastPaymentId));
  
  const features = [
    { text: 'Bible', included: true },
    { text: 'Sermons', included: true },
    { text: 'Events', included: true },
    { text: 'Songs', included: true },
    { text: 'Bible plans', included: true },
    { text: 'Online Meetings', included: true },
    { text: 'Prayer wall', included: true },
    { text: 'YouTube live', included: true },
    { text: 'Celebrations', included: true },
    { text: 'Give/Tithe', included: true },
    { text: 'Live celebrations', included: true },
    { text: 'Church gallery', included: true },
    { text: 'Daily promises', included: true },
    { text: 'Notes', included: true },
  ];

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#facc15" />
      </View>
    );
  }

  if (showTeaser && (isBeforeLaunch || isTrialActive)) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <ChevronLeft color="#1f2937" size={24} />
          </TouchableOpacity>
        </View>
        <View style={{ flex: 1, paddingHorizontal: 24, justifyContent: 'center', alignItems: 'center' }}>
          <Text style={{ fontSize: 32, fontWeight: '800', color: '#1e293b', textAlign: 'center', marginBottom: 16 }}>
            {isBeforeLaunch ? 'A New Era Begins' : 'Welcome to the Church!'}
          </Text>
          <Text style={{ fontSize: 16, fontWeight: '600', color: '#334155', textAlign: 'center', marginBottom: 32, lineHeight: 24 }}>
            {isBeforeLaunch 
              ? "Our premium subscription features will officially launch on New Year's Day, January 1, 2027. Until then, all members enjoy full access to our free plan!"
              : "As a new member, you have a 1-month free trial to explore all our premium features! After your trial, you can subscribe to keep enjoying them."}
          </Text>
          
          <LinearGradient
            colors={['#0f766e', '#0ea5e9']}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            style={{ borderRadius: 24, padding: 32, width: '100%', marginBottom: 32, alignItems: 'center' }}
          >
            <Text style={{ color: '#ffffff', fontSize: 16, fontWeight: '800', marginBottom: 16, letterSpacing: 2, textShadowColor: 'rgba(0,0,0,0.2)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 2 }}>
              {isBeforeLaunch ? 'LAUNCHING IN' : 'TRIAL EXPIRES IN'}
            </Text>
            <View style={{ alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ fontSize: 56, fontWeight: '800', color: '#facc15' }}>
                {launchTimeLeft.days}
              </Text>
              <Text style={{ fontSize: 16, color: '#e2e8f0', marginTop: 4, fontWeight: '700', letterSpacing: 2 }}>DAYS</Text>
            </View>
          </LinearGradient>

          <View style={{ backgroundColor: '#f1f5f9', padding: 20, borderRadius: 16, marginBottom: 32 }}>
            <Text style={{ fontSize: 15, color: '#334155', fontStyle: 'italic', textAlign: 'center', lineHeight: 22 }}>
              "Grow in the grace and knowledge of our Lord and Savior Jesus Christ. To him be glory both now and forever! Amen."
            </Text>
            <Text style={{ fontSize: 13, color: '#64748b', textAlign: 'center', marginTop: 8, fontWeight: '600' }}>
              – 2 Peter 3:18
            </Text>
          </View>

          <TouchableOpacity 
            style={{ width: '100%' }}
            onPress={() => setShowTeaser(false)}
          >
            <LinearGradient
              colors={['#10b981', '#047857']}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
              style={{ paddingVertical: 16, borderRadius: 30, alignItems: 'center' }}
            >
              <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700' }}>See Plans</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <ChevronLeft color="#1f2937" size={24} />
        </TouchableOpacity>
        
        <View style={styles.toggleContainer}>
          <TouchableOpacity 
            style={[styles.toggleBtn, !isAnnual && styles.toggleBtnActive]}
            onPress={() => setBillingCycle('monthly')}
          >
            <Text style={[styles.toggleText, !isAnnual && styles.toggleTextActive]}>Monthly</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.toggleBtn, isAnnual && styles.toggleBtnActive]}
            onPress={() => setBillingCycle('annual')}
          >
            <Text style={[styles.toggleText, isAnnual && styles.toggleTextActive]}>Annual</Text>
          </TouchableOpacity>
        </View>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {isActive && (
          <View style={{ paddingHorizontal: 20, marginTop: 10, marginBottom: 16 }}>
            <LinearGradient 
              colors={
                subscription?.plan === billingCycle && subscription?.status === 'ACTIVE'
                  ? ['#0f172a', '#1e293b'] 
                  : ['#1e293b', '#0f172a']
              }
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.countdownCard}
            >
              <Text style={styles.countdownTitle}>Time Remaining</Text>
              <View style={styles.countdownRow}>
                <View style={styles.timeBlock}>
                  <Text style={styles.timeVal}>{String(timeLeft.days).padStart(2, '0')}</Text>
                  <Text style={styles.timeLabel}>DAYS</Text>
                </View>
                <Text style={styles.timeColon}>:</Text>
                <View style={styles.timeBlock}>
                  <Text style={styles.timeVal}>{String(timeLeft.hours).padStart(2, '0')}</Text>
                  <Text style={styles.timeLabel}>HRS</Text>
                </View>
                <Text style={styles.timeColon}>:</Text>
                <View style={styles.timeBlock}>
                  <Text style={styles.timeVal}>{String(timeLeft.minutes).padStart(2, '0')}</Text>
                  <Text style={styles.timeLabel}>MIN</Text>
                </View>
                <Text style={styles.timeColon}>:</Text>
                <View style={styles.timeBlock}>
                  <Text style={styles.timeVal}>{String(timeLeft.seconds).padStart(2, '0')}</Text>
                  <Text style={styles.timeLabel}>SEC</Text>
                </View>
              </View>
            </LinearGradient>
          </View>
        )}

        <LinearGradient
          colors={isConsideredActive ? ['#10b981', '#047857'] : ['#fbbf24', '#b45309']}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          style={{ padding: 2, borderRadius: 26, marginBottom: 40 }}
        >
        <View style={[styles.cardContainer, { borderWidth: 0, marginBottom: 0 }]}>
          <View style={styles.saveBadgeContainer}>
            <Svg width={140} height={70} viewBox="0 0 140 70">
              <Defs>
                <SvgLinearGradient id="goldGrad" x1="0" y1="0" x2="1" y2="1">
                  <Stop offset="0" stopColor="#fbbf24" stopOpacity="1" />
                  <Stop offset="1" stopColor="#b45309" stopOpacity="1" />
                </SvgLinearGradient>
                <SvgLinearGradient id="activeGrad" x1="0" y1="0" x2="1" y2="1">
                  <Stop offset="0" stopColor="#10b981" stopOpacity="1" />
                  <Stop offset="1" stopColor="#047857" stopOpacity="1" />
                </SvgLinearGradient>
              </Defs>
              <Path
                d="M 0 0 C 30 0, 30 50, 60 50 L 110 50 C 125 50, 140 55, 140 70 L 140 0 Z"
                fill={isConsideredActive ? "url(#activeGrad)" : "url(#goldGrad)"}
              />
            </Svg>
            <View style={styles.saveBadgeContent}>
              <Text style={styles.saveBadgeText}>{badgeText}</Text>
              {!isConsideredActive && <View style={styles.saveBadgeDot} />}
            </View>
          </View>
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>Church of GOD</Text>
            </View>

            <View style={styles.priceRow}>
              <View style={styles.priceLeft}>
                <Text style={styles.strikePrice}>₹{strikePrice}</Text>
                <Text style={[styles.mainPrice, { color: primaryColor }]}>₹{price}</Text>
              </View>
              <View style={styles.priceRight}>
                <Text style={[styles.pricePeriod, { color: primaryColor }]}>{periodText}</Text>
                <Text style={[styles.billedYearly, { color: primaryColor }]}>{isAnnual ? `₹${price} billed yearly` : `₹${price} billed monthly`}</Text>
              </View>
            </View>

            <Text style={styles.cardDesc}>
              A comprehensive solution for spiritual growth, offering enhanced features to streamline your daily walk with God.
            </Text>

            <View style={styles.divider} />

            <View style={styles.featuresList}>
              {features.map((feature, idx) => (
                <View key={idx} style={styles.featureItem}>
                  <View style={[styles.iconBox, feature.included ? styles.iconBoxIncluded : styles.iconBoxExcluded]}>
                    {feature.included ? (
                      <Check size={12} color="#1f2937" strokeWidth={3} />
                    ) : (
                      <X size={12} color="#9ca3af" strokeWidth={3} />
                    )}
                  </View>
                  <Text style={[styles.featureText, !feature.included && styles.featureTextExcluded]}>
                    {feature.text}
                  </Text>
                </View>
              ))}
            </View>
            
            <View style={{ alignItems: 'center', marginTop: 12 }}>
              <TouchableOpacity 
                style={{ width: '100%' }} 
                onPress={isButtonDisabled ? undefined : handleSubscribe}
                disabled={isButtonDisabled}
              >
                <LinearGradient
                  colors={isConsideredActive ? ['#10b981', '#047857'] : ['#fbbf24', '#b45309']}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                  style={styles.subscribeButton}
                >
                  {processingPayment ? (
                    <ActivityIndicator color="#1f2937" />
                  ) : (
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
                      {showCrown && <Crown color="#1f2937" size={18} style={{ marginRight: 8 }} />}
                      <Text style={styles.subscribeBtnText}>{buttonText}</Text>
                    </View>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </View>
        </LinearGradient>

        <View style={{ flexDirection: 'row', paddingHorizontal: 20, marginBottom: 20, marginTop: 10, gap: 12 }}>
          <TouchableOpacity 
            style={[styles.historyTabBtn, historyTab === 'active' && styles.historyTabBtnActive]} 
            onPress={() => setHistoryTab('active')}
          >
            <Text style={[styles.historyTabBtnText, historyTab === 'active' && styles.historyTabBtnTextActive]}>Active</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.historyTabBtn, historyTab === 'past' && styles.historyTabBtnActive]} 
            onPress={() => setHistoryTab('past')}
          >
            <Text style={[styles.historyTabBtnText, historyTab === 'past' && styles.historyTabBtnTextActive]}>Past</Text>
          </TouchableOpacity>
        </View>

        {historyTab === 'active' && isTrulyActive && (
          <View style={{
            backgroundColor: '#fff',
            borderRadius: 12,
            padding: 16,
            marginBottom: 40,
            marginHorizontal: 20,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.05,
            shadowRadius: 10,
            elevation: 2,
            borderLeftWidth: 8,
            borderLeftColor: '#bbf7d0',
            borderWidth: 1,
            borderColor: '#f1f5f9',
          }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View style={{ backgroundColor: '#dcfce7', width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
                <Check size={24} color="#16a34a" />
              </View>
              
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 17, fontWeight: '700', color: '#16a34a', marginBottom: 4 }} numberOfLines={1}>Active Subscription</Text>
                <Text style={{ fontSize: 15, color: '#64748b' }} numberOfLines={1}>
                  {subscription.plan === 'annual' ? 'Annual Membership - ₹12' : 'Monthly Membership - ₹1'}
                </Text>
              </View>
            </View>
            
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 12, marginTop: 12 }}>
              <TouchableOpacity 
                style={{ backgroundColor: '#eff6ff', padding: 8, borderRadius: 20 }}
                onPress={() => { setCurrentReceiptHtml(getReceiptHtml()); setShowReceiptPreview(true); }}
              >
                <Eye size={20} color="#3b82f6" />
              </TouchableOpacity>
              <TouchableOpacity 
                style={{ backgroundColor: '#eff6ff', padding: 8, borderRadius: 20 }}
                onPress={() => handleDownloadReceipt()}
              >
                <Download size={20} color="#3b82f6" />
              </TouchableOpacity>
            </View>
          </View>
        )}
        
        {historyTab === 'active' && !isTrulyActive && (
          <View style={{ paddingHorizontal: 20, alignItems: 'center', marginTop: 20 }}>
            <Text style={{ color: '#64748b', fontSize: 16 }}>No active subscription found.</Text>
          </View>
        )}

        {historyTab === 'past' && pastPayments.length > 0 && (
          <View style={{ marginBottom: 40 }}>
            {pastPayments.map((payment, index) => {
              const pDateObj = payment.transactionDate?.toDate 
                ? payment.transactionDate.toDate() 
                : new Date(payment.transactionDate || Date.now());
              
              const pDateStr = pDateObj.toLocaleDateString('en-IN', { 
                day: 'numeric', month: 'short', year: 'numeric' 
              });

              return (
                <View key={payment.id || index} style={{
                  backgroundColor: '#fff',
                  borderRadius: 12,
                  padding: 16,
                  marginBottom: 16,
                  marginHorizontal: 20,
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.05,
                  shadowRadius: 10,
                  elevation: 2,
                  borderLeftWidth: 8,
                  borderLeftColor: '#cbd5e1',
                  borderWidth: 1,
                  borderColor: '#f1f5f9',
                }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <View style={{ backgroundColor: '#f1f5f9', width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
                      <Clock size={24} color="#64748b" />
                    </View>
                    
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 17, fontWeight: '700', color: '#475569', marginBottom: 4 }} numberOfLines={1}>Past Subscription</Text>
                      <Text style={{ fontSize: 15, color: '#64748b' }} numberOfLines={1}>
                        {payment.plan?.includes('annual') ? 'Annual Membership' : 'Monthly Membership'} • {pDateStr}
                      </Text>
                    </View>
                  </View>
                  
                  <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 12, marginTop: 12 }}>
                    <TouchableOpacity 
                      style={{ backgroundColor: '#eff6ff', padding: 8, borderRadius: 20 }}
                      onPress={() => { setCurrentReceiptHtml(getReceiptHtml(payment)); setShowReceiptPreview(true); }}
                    >
                      <Eye size={20} color="#3b82f6" />
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })}
          </View>
        )}
        
        {historyTab === 'past' && pastPayments.length === 0 && (
          <View style={{ paddingHorizontal: 20, alignItems: 'center', marginTop: 20 }}>
            <Text style={{ color: '#64748b', fontSize: 16 }}>No past subscriptions found.</Text>
          </View>
        )}

      </ScrollView>

      {/* View Receipt Modal */}
      <Modal
        visible={showReceiptPreview}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowReceiptPreview(false)}
      >
        <SafeAreaView style={{ flex: 1, backgroundColor: '#f3f4f6' }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e5e7eb' }}>
            <Text style={{ fontSize: 18, fontWeight: '600', color: '#1f2937' }}>Receipt Preview</Text>
            <TouchableOpacity onPress={() => setShowReceiptPreview(false)} style={{ padding: 8, backgroundColor: '#f3f4f6', borderRadius: 20 }}>
              <X size={20} color="#4b5563" />
            </TouchableOpacity>
          </View>
          <WebView
            source={{ html: currentReceiptHtml }}
            style={{ flex: 1, backgroundColor: 'transparent' }}
            originWhitelist={['*']}
            javaScriptEnabled={true}
            domStorageEnabled={true}
          />
        </SafeAreaView>
      </Modal>

      {/* Payment Status Modal */}
      <Modal
        visible={paymentModal.visible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setPaymentModal(prev => ({ ...prev, visible: false }))}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: 20 }}>
          <View style={{ 
            backgroundColor: '#fff', 
            borderRadius: 24, 
            padding: 24, 
            width: '100%', 
            maxWidth: 340, 
            alignItems: 'center',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 10 },
            shadowOpacity: 0.2,
            shadowRadius: 20,
            elevation: 10
          }}>
            <View style={{ 
              width: 64, 
              height: 64, 
              borderRadius: 32, 
              backgroundColor: paymentModal.type === 'success' ? '#dcfce7' : '#fee2e2', 
              justifyContent: 'center', 
              alignItems: 'center',
              marginBottom: 16
            }}>
              {paymentModal.type === 'success' ? (
                <Check size={32} color="#16a34a" strokeWidth={3} />
              ) : (
                <X size={32} color="#ef4444" strokeWidth={3} />
              )}
            </View>
            <Text style={{ fontSize: 22, fontWeight: '700', color: '#1e293b', marginBottom: 8, textAlign: 'center' }}>
              {paymentModal.title}
            </Text>
            <Text style={{ fontSize: 15, color: '#64748b', textAlign: 'center', marginBottom: 24, lineHeight: 22 }}>
              {paymentModal.message}
            </Text>
            <TouchableOpacity 
              style={{ 
                backgroundColor: paymentModal.type === 'success' ? '#16a34a' : '#ef4444', 
                paddingVertical: 14, 
                paddingHorizontal: 24, 
                borderRadius: 12, 
                width: '100%', 
                alignItems: 'center' 
              }}
              onPress={() => setPaymentModal(prev => ({ ...prev, visible: false }))}
            >
              <Text style={{ color: '#fff', fontSize: 16, fontWeight: '600' }}>OK</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  historyTabBtn: {
    flex: 1,
    paddingVertical: 10,
    backgroundColor: '#f1f5f9',
    borderRadius: 8,
    alignItems: 'center'
  },
  historyTabBtnActive: {
    backgroundColor: '#1e293b'
  },
  historyTabBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748b'
  },
  historyTabBtnTextActive: {
    color: '#fff'
  },
  container: { 
    flex: 1, 
    backgroundColor: '#9ca3af'
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginTop: 40,
    marginBottom: 24,
    justifyContent: 'space-between',
  },
  backButton: { 
    padding: 8,
    marginLeft: -8,
  },
  toggleContainer: {
    flexDirection: 'row',
    backgroundColor: '#cbd5e1',
    borderRadius: 24,
    padding: 4,
    borderWidth: 2,
    borderColor: '#94a3b8',
  },
  toggleBtn: {
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: 20,
  },
  toggleBtnActive: {
    backgroundColor: '#1f2937',
  },
  toggleText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#475569',
  },
  toggleTextActive: {
    color: '#f8fafc',
  },
  countdownCard: {
    borderRadius: 20,
    paddingVertical: 10,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#26d0ce',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 8,
  },
  countdownTitle: {
    color: '#e0f2fe',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  countdownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  timeBlock: {
    alignItems: 'center',
    width: 60,
  },
  timeVal: {
    fontSize: 28,
    fontWeight: '800',
    color: '#ffffff',
    fontVariant: ['tabular-nums'],
  },
  timeLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#bae6fd',
    marginTop: 2,
  },
  timeColon: {
    fontSize: 24,
    fontWeight: '700',
    color: '#93c5fd',
    marginHorizontal: 4,
    paddingBottom: 14,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 0,
    paddingTop: 24,
    flexGrow: 1,
  },
  cardContainer: {
    position: 'relative',
    borderWidth: 2,
    borderRadius: 24,
    backgroundColor: '#111827',
    overflow: 'hidden',
  },
  card: {
    backgroundColor: '#111827',
    borderRadius: 22,
    padding: 20,
  },
  cardHeader: {
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 22,
    color: '#f8fafc',
    fontWeight: '400',
  },
  saveBadgeContainer: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 140,
    height: 70,
    zIndex: 10,
  },
  saveBadgeContent: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 110,
    height: 50,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1f2937',
    marginRight: 6,
  },
  saveBadgeDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#1f2937',
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  priceLeft: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  strikePrice: {
    fontSize: 32,
    color: '#9ca3af',
    textDecorationLine: 'line-through',
    fontWeight: '300',
    marginRight: 8,
  },
  mainPrice: {
    fontSize: 48,
    color: '#facc15',
    fontWeight: '600',
  },
  priceRight: {
    marginLeft: 12,
    justifyContent: 'center',
  },
  pricePeriod: {
    fontSize: 14,
    color: '#facc15',
    marginBottom: 4,
  },
  billedYearly: {
    fontSize: 12,
    color: '#facc15',
  },
  cardDesc: {
    fontSize: 12,
    color: '#cbd5e1',
    lineHeight: 16,
    marginBottom: 16,
  },
  divider: {
    height: 1,
    borderBottomWidth: 1,
    borderBottomColor: '#475569',
    borderStyle: 'dashed',
    marginBottom: 16,
  },
  featuresList: {
    marginBottom: 4,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    width: '48%',
  },
  iconBox: {
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  iconBoxIncluded: {
    backgroundColor: '#bef264', // light green for check
  },
  iconBoxExcluded: {
    backgroundColor: 'transparent',
  },
  featureText: {
    fontSize: 14,
    color: '#f8fafc',
  },
  featureTextExcluded: {
    color: '#9ca3af',
  },
  subscribeButton: {
    paddingVertical: 14,
    borderRadius: 12,
    width: '100%',
    alignItems: 'center',
  },
  subscribeBtnText: {
    color: '#1f2937',
    fontSize: 16,
    fontWeight: '700',
  },
  historyContainer: {
    marginTop: 24,
    marginBottom: 20,
  },
  historyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#f8fafc',
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  historyCard: {
    backgroundColor: '#1f2937',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  historyLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  historyIconBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  historyPlan: {
    color: '#f8fafc',
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 4,
  },
  historyDate: {
    color: '#9ca3af',
    fontSize: 12,
  },
  historyRight: {
    alignItems: 'flex-end',
  },
  historyAmount: {
    color: '#f8fafc',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  historyStatusBadge: {
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  historyStatusText: {
    color: '#10b981',
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
  }
});
