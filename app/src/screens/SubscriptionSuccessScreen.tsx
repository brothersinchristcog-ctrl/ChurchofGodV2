import React, { useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, BackHandler } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { CheckCircle, Download, Share2 } from 'lucide-react-native';
import { LinearGradient as ExpoLinearGradient } from 'expo-linear-gradient';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Share, Alert } from 'react-native';

export default function SubscriptionSuccessScreen({ navigation, route }: any) {
  const { user } = useAuth();
  const { isDark } = useTheme();
  
  const paymentId = route.params?.paymentId || 'pay_unknown';
  const plan = route.params?.plan || 'monthly';
  const isAnnual = plan === 'annual';
  const amount = isAnnual ? '₹12' : '₹1';
  const planName = isAnnual ? 'Annual Membership' : 'Monthly Membership';
  
  const startDate = new Date();
  const endDate = new Date();
  if (isAnnual) {
    endDate.setFullYear(endDate.getFullYear() + 1);
  } else {
    endDate.setDate(endDate.getDate() + 30);
  }

  // Prevent back button from going back to checkout
  useEffect(() => {
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      navigation.navigate('Tabs', { screen: 'Home' });
      return true;
    });
    return () => backHandler.remove();
  }, [navigation]);

  const handleDownloadReceipt = async () => {
    try {
      const html = `
        <html>
          <body style="font-family: Arial; padding: 40px; text-align: center;">
            <h1 style="color: #1a2d5a;">Church of GOD</h1>
            <h2>Membership Receipt</h2>
            <hr style="border: 1px solid #ccc; margin: 20px 0;" />
            <div style="text-align: left; max-width: 400px; margin: 0 auto; line-height: 1.8;">
              <p><strong>Name:</strong> ${user?.displayName || 'Member'}</p>
              <p><strong>Status:</strong> PAID</p>
              <p><strong>Transaction ID:</strong> ${paymentId}</p>
              <p><strong>Plan:</strong> ${planName}</p>
              <p><strong>Amount:</strong> ${amount}</p>
              <p><strong>Subscription Date:</strong> ${startDate.toLocaleDateString()}</p>
              <p><strong>Expires On:</strong> ${endDate.toLocaleDateString()}</p>
              <p><strong>Next Billing Date:</strong> ${endDate.toLocaleDateString()}</p>
            </div>
            <hr style="border: 1px solid #ccc; margin: 20px 0;" />
            <p style="color: #666; font-size: 12px;">Thank you for your membership.</p>
          </body>
        </html>
      `;
      const { uri } = await Print.printToFileAsync({ html });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri);
      } else {
        Alert.alert('Error', 'Sharing is not available on this device');
      }
    } catch (error) {
      console.error('Print Error:', error);
      Alert.alert('Error', 'Failed to generate receipt');
    }
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: `I just activated my Church of GOD membership! Transaction ID: ${paymentId}`,
      });
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: isDark ? '#0f172a' : '#f8fafc' }]}>
      <View style={styles.content}>
        <View style={styles.successIconWrapper}>
          <CheckCircle size={64} color="#10b981" />
        </View>
        
        <Text style={[styles.title, { color: isDark ? '#fff' : '#1e293b' }]}>
          Subscription Activated!
        </Text>
        
        <Text style={styles.subtitle}>
          Welcome back! Your Church of GOD membership has been successfully renewed.
        </Text>

        <View style={[styles.receiptCard, { backgroundColor: isDark ? '#1e293b' : '#fff' }]}>
          <View style={styles.receiptRow}>
            <Text style={styles.receiptLabel}>Plan</Text>
            <Text style={[styles.receiptValue, { color: isDark ? '#fff' : '#1e293b' }]}>{planName}</Text>
          </View>
          
          <View style={styles.receiptRow}>
            <Text style={styles.receiptLabel}>Amount</Text>
            <Text style={[styles.receiptValue, { color: isDark ? '#fff' : '#1e293b', fontSize: 18, fontWeight: '800' }]}>{amount}</Text>
          </View>
          
          <View style={styles.receiptDivider} />
          
          <View style={styles.receiptRow}>
            <Text style={styles.receiptLabel}>Transaction ID</Text>
            <Text style={[styles.receiptValue, { color: isDark ? '#e2e8f0' : '#475569', fontSize: 12 }]}>{paymentId}</Text>
          </View>
          
          <View style={styles.receiptRow}>
            <Text style={styles.receiptLabel}>Date</Text>
            <Text style={[styles.receiptValue, { color: isDark ? '#e2e8f0' : '#475569' }]}>
              {new Date().toLocaleDateString()}
            </Text>
          </View>
          
          <View style={styles.receiptRow}>
            <Text style={styles.receiptLabel}>Status</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <CheckCircle size={14} color="#10b981" />
              <Text style={{ color: '#10b981', fontWeight: '700', marginLeft: 4 }}>PAID</Text>
            </View>
          </View>
        </View>

        <View style={styles.actionRow}>
          <TouchableOpacity 
            style={[styles.iconButton, { backgroundColor: isDark ? '#334155' : '#f1f5f9' }]}
            onPress={handleDownloadReceipt}
          >
            <Download size={20} color={isDark ? '#cbd5e1' : '#475569'} />
            <Text style={[styles.iconButtonText, { color: isDark ? '#cbd5e1' : '#475569' }]}>Receipt</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.iconButton, { backgroundColor: isDark ? '#334155' : '#f1f5f9' }]}
            onPress={handleShare}
          >
            <Share2 size={20} color={isDark ? '#cbd5e1' : '#475569'} />
            <Text style={[styles.iconButtonText, { color: isDark ? '#cbd5e1' : '#475569' }]}>Share</Text>
          </TouchableOpacity>
        </View>
      </View>
      
      <View style={styles.footer}>
        <TouchableOpacity 
          style={styles.doneButton} 
          onPress={() => navigation.navigate('Tabs', { screen: 'Home' })}
        >
          <ExpoLinearGradient
            colors={['#1a2d5a', '#0a192f']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.doneGradient}
          >
            <Text style={styles.doneText}>Done</Text>
          </ExpoLinearGradient>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { 
    flex: 1, 
    padding: 24, 
    alignItems: 'center',
    justifyContent: 'center' 
  },
  successIconWrapper: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 15,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
    paddingHorizontal: 20,
  },
  receiptCard: {
    width: '100%',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 4,
    marginBottom: 24,
  },
  receiptRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  receiptLabel: {
    fontSize: 14,
    color: '#64748b',
    fontWeight: '500',
  },
  receiptValue: {
    fontSize: 15,
    fontWeight: '600',
  },
  receiptDivider: {
    height: 1,
    backgroundColor: 'rgba(0,0,0,0.05)',
    marginVertical: 12,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 16,
    width: '100%',
  },
  iconButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
  },
  iconButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  footer: {
    padding: 24,
    paddingBottom: 32,
  },
  doneButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  doneGradient: {
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  doneText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  }
});
