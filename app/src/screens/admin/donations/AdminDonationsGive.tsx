import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Dimensions, Modal } from 'react-native';
import { ArrowLeft, CheckCircle, DollarSign, Download, Share2, CheckCircle2 } from 'lucide-react-native';
import { COLORS, formatCurrency, formatDate, generateBulkDonationReceipt, getBulkDonationReceiptHTML } from './AdminDonationsUtils';
import { db } from '../../../services/firebaseConfig';
import ReceiptModal from '../../../components/ReceiptModal';
import { WebView } from 'react-native-webview';
import { useAuth } from '../../../context/AuthContext';

const CATEGORIES = [
  { id: 'All', label: 'All', icon: '📋' },
  { id: 'Tithe', label: 'Tithe', icon: '🙏' },
  { id: 'Offering', label: 'Offering', icon: '🎁' },
  { id: 'Missions', label: 'Missions', icon: '🌍' },
  { id: 'Building', label: 'Building', icon: '🏛️' },
  { id: 'Special', label: 'Special', icon: '💎' },
  { id: 'Other', label: 'Other', icon: '📝' }
];

export default function AdminDonationsGive({ onNavigate }: any) {
  const [activeCategory, setActiveCategory] = useState('All');
  const [donations, setDonations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDonation, setSelectedDonation] = useState<any>(null);
  const [showReceipt, setShowReceipt] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showPdfModal, setShowPdfModal] = useState(false);
  const { user, member } = useAuth();
  const authorizerName = member?.name || user?.displayName || user?.email || 'Authorized Administrator';

  useEffect(() => {
    // Fetch online member donations from church_donations
    const unsubscribe = db.collection('church_donations')
      .orderBy('date', 'desc')
      .onSnapshot((snapshot) => {
        if (snapshot) {
          const fetched = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));
          setDonations(fetched);
        }
        setLoading(false);
      }, (error) => {
        console.error("Error fetching church donations:", error);
        setLoading(false);
      });

    return () => unsubscribe();
  }, []);

  const filteredDonations = activeCategory === 'All' 
    ? donations 
    : donations.filter(d => (d.category || '').startsWith(activeCategory));

  const totalAmount = filteredDonations
    .filter(d => d.status === 'completed')
    .reduce((sum, d) => sum + (parseFloat(d.amount) || 0), 0);

  const handleLongPress = (id: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedIds(newSet);
  };

  const handlePress = (donation: any) => {
    if (selectedIds.size > 0) {
      handleLongPress(donation.id);
    } else {
      setSelectedDonation(donation);
      setShowReceipt(true);
    }
  };

  const isSelectionMode = selectedIds.size > 0;
  const receiptList = isSelectionMode ? filteredDonations.filter(d => selectedIds.has(d.id)) : filteredDonations;
  const canGenerateReceipt = isSelectionMode || (activeCategory !== 'All' && filteredDonations.length > 0);
  const displayType = isSelectionMode 
    ? (Array.from(new Set(receiptList.map(d => d.category))).length === 1 ? receiptList[0].category : 'CUSTOM') 
    : activeCategory;

  return (
    <View style={styles.container}>
      <View style={styles.hero}>
        <View style={styles.topbarRow}>
          <TouchableOpacity style={styles.backBtn} onPress={() => onNavigate('dashboard')}>
            <ArrowLeft color="#fff" size={20} />
          </TouchableOpacity>
          <Text style={styles.eyebrow}>ONLINE DONATIONS</Text>
          <View style={{ width: 36 }} />
        </View>

        <Text style={styles.heroTitle}>Member Payments</Text>
        <Text style={styles.heroSub}>View real-time donations made via Razorpay</Text>
      </View>

      <View style={styles.filterContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
          {CATEGORIES.map(cat => {
            const isActive = activeCategory === cat.id;
            return (
              <TouchableOpacity
                key={cat.id}
                style={[styles.badge, isActive && styles.badgeActive]}
                onPress={() => setActiveCategory(cat.id)}
              >
                <Text style={[styles.badgeIcon, isActive && { opacity: 1 }]}>{cat.icon}</Text>
                <Text style={[styles.badgeText, isActive && styles.badgeTextActive]}>{cat.label}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      <View style={{ paddingHorizontal: 20, marginBottom: 15 }}>
        <View style={styles.summaryCard}>
          <View style={styles.summaryIconWrap}>
            <DollarSign size={16} color={COLORS.goldLight} />
          </View>
          <Text style={styles.summaryLabel}>
            {activeCategory === 'All' ? 'Total Online Donations' : `${activeCategory} Total`}
          </Text>
          <View style={{ flex: 1 }} />
          <Text style={styles.summaryAmount}>{formatCurrency(totalAmount)}</Text>
        </View>
      </View>

      {canGenerateReceipt && receiptList.length > 0 && (
        <View style={{ paddingHorizontal: 20, marginBottom: 15 }}>
          <TouchableOpacity 
            style={styles.bulkBtn} 
            onPress={() => setShowPdfModal(true)}
            activeOpacity={0.8}
          >
            <Download color="#fff" size={18} />
            <Text style={styles.bulkBtnText}>Generate Receipt ({receiptList.length})</Text>
          </TouchableOpacity>
        </View>
      )}

      <ScrollView style={styles.content} contentContainerStyle={styles.listContent} showsVerticalScrollIndicator={false}>
        {loading ? (
          <ActivityIndicator size="large" color={COLORS.indigo} style={{ marginTop: 40 }} />
        ) : filteredDonations.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No online payments found for this category.</Text>
          </View>
        ) : (
          filteredDonations.map(donation => (
            <TouchableOpacity 
              key={donation.id} 
              style={[styles.historyCard, selectedIds.has(donation.id) && styles.historyCardActive]}
              onPress={() => handlePress(donation)}
              onLongPress={() => handleLongPress(donation.id)}
              delayLongPress={300}
            >
              <View style={styles.historyCardLeft}>
                <View style={[styles.historyIconBox, { backgroundColor: '#f1f5f9' }]}>
                  {selectedIds.has(donation.id) ? (
                    <CheckCircle2 size={24} color={COLORS.gold} />
                  ) : (
                    <CheckCircle size={20} color={donation.status === 'completed' ? "#10b981" : (donation.status === 'failed' ? "#ef4444" : "#f59e0b")} />
                  )}
                </View>
                <View>
                  <Text style={styles.historyNameText}>{donation.userName || donation.name || 'Anonymous'}</Text>
                  <Text style={styles.historyCatText}>{donation.category}</Text>
                  <Text style={styles.historyDateText}>
                    {donation.date ? new Date(donation.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Unknown'}
                  </Text>
                </View>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={styles.historyAmountText}>{formatCurrency(donation.amount)}</Text>
                {donation.status !== 'completed' && (
                  <Text style={[styles.statusText, { color: donation.status === 'failed' ? '#ef4444' : '#f59e0b' }]}>
                    {donation.status}
                  </Text>
                )}
              </View>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>

      {/* Receipt Modal for Online Donations */}
      <ReceiptModal 
        visible={showReceipt} 
        onClose={() => setShowReceipt(false)} 
        donation={selectedDonation} 
      />

      {/* Bulk Receipt Modal */}
      <Modal visible={showPdfModal} animationType="slide" presentationStyle="pageSheet">
        <View style={{ flex: 1, backgroundColor: COLORS.parchment }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, paddingTop: 60, backgroundColor: COLORS.indigo }}>
            <Text style={{ color: '#fff', fontSize: 18, fontWeight: '600' }}>Receipt Preview</Text>
            <TouchableOpacity onPress={() => setShowPdfModal(false)} style={{ padding: 4 }}>
              <Text style={{ color: '#fff', fontSize: 16, fontWeight: '600' }}>Close</Text>
            </TouchableOpacity>
          </View>
          
          <View style={{ flex: 1, margin: 16, borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: COLORS.line, backgroundColor: '#fff' }}>
            <WebView originWhitelist={['*']} source={{ html: getBulkDonationReceiptHTML(receiptList, displayType, authorizerName) }} style={{ flex: 1 }} />
          </View>

          <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 10, padding: 20, paddingBottom: 40 }}>
            <TouchableOpacity style={{ backgroundColor: COLORS.indigo, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, alignItems: 'center', flexDirection: 'row', gap: 6 }} onPress={() => generateBulkDonationReceipt(receiptList, displayType, false, authorizerName)}>
              <Download size={16} color="#fff" />
              <Text style={{ color: '#fff', fontWeight: '600', fontSize: 13 }}>Download</Text>
            </TouchableOpacity>
            <TouchableOpacity style={{ backgroundColor: COLORS.indigo, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, alignItems: 'center', flexDirection: 'row', gap: 6 }} onPress={() => generateBulkDonationReceipt(receiptList, displayType, true, authorizerName)}>
              <Share2 size={16} color="#fff" />
              <Text style={{ color: '#fff', fontWeight: '600', fontSize: 13 }}>Share</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.parchment },
  hero: {
    backgroundColor: COLORS.indigo,
    paddingTop: 15,
    paddingBottom: 20,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 25,
    borderBottomRightRadius: 25,
  },
  topbarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 20,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center', justifyContent: 'center',
  },
  eyebrow: {
    fontSize: 12, letterSpacing: 1.5, color: COLORS.goldLight, fontWeight: '700',
  },
  heroTitle: { fontSize: 28, fontWeight: '800', color: '#fff', marginBottom: 6, textAlign: 'center' },
  heroSub: { fontSize: 13, color: 'rgba(255,255,255,0.7)', textAlign: 'center' },
  
  filterContainer: {
    paddingVertical: 15,
    backgroundColor: COLORS.parchment,
  },
  filterScroll: {
    paddingHorizontal: 15,
    gap: 10,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: COLORS.line,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
  },
  badgeActive: {
    backgroundColor: COLORS.indigo,
    borderColor: COLORS.indigo,
  },
  badgeIcon: {
    fontSize: 14,
    opacity: 0.7,
  },
  badgeText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.inkSoft,
  },
  badgeTextActive: {
    color: '#fff',
  },
  
  summaryCard: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: COLORS.line,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  summaryIconWrap: {
    width: 30, height: 30,
    borderRadius: 8,
    backgroundColor: COLORS.indigo,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  summaryLabel: {
    fontSize: 13.5,
    fontWeight: '700',
    color: COLORS.ink,
  },
  summaryAmount: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.indigo,
  },

  content: { flex: 1 },
  listContent: { paddingHorizontal: 20, paddingBottom: 40 },
  
  historyCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
    borderWidth: 1,
    borderColor: COLORS.line,
  },
  historyCardActive: {
    borderColor: COLORS.gold,
    backgroundColor: COLORS.paper,
    borderWidth: 2,
    padding: 15, // to offset the 2px border vs 1px
  },
  historyCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  historyIconBox: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  historyNameText: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.ink,
    marginBottom: 2,
  },
  historyCatText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.inkSoft,
    marginBottom: 2,
  },
  historyDateText: {
    fontSize: 11,
    color: '#94a3b8',
    fontWeight: '500',
  },
  historyAmountText: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.indigo,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
    marginTop: 4,
    textTransform: 'uppercase',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    color: COLORS.inkSoft,
    fontSize: 14,
    fontStyle: 'italic',
  },
  bulkBtn: {
    backgroundColor: COLORS.indigo,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  bulkBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  }
});
