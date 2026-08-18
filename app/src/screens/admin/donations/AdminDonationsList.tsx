import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, FlatList, Modal } from 'react-native';
import { ArrowLeft, Search, Calendar as CalIcon, Download, Share2, CheckCircle2 } from 'lucide-react-native';
import { COLORS, formatCurrency, formatDate, generateBulkDonationReceipt, getBulkDonationReceiptHTML } from './AdminDonationsUtils';
import { useAuth } from '../../../context/AuthContext';
import { WebView } from 'react-native-webview';
import { db } from '../../../services/firebaseConfig';

export default function AdminDonationsList({ donations, onNavigate }: any) {
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState('All');
  const [typeFilter, setTypeFilter] = useState('All Types');
  const [showPdfModal, setShowPdfModal] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  
  const { user, member } = useAuth();
  const authorizerName = member?.name || user?.displayName || user?.email || 'Authorized Administrator';

  const dateOpts = ["All", "Today", "This Week", "This Month", "This Year"];
  const typeOpts = ["All Types", ...Array.from(new Set(donations.map((d: any) => d.type).filter(Boolean))) as string[]];

  const filteredList = donations.filter((d: any) => {
    const q = searchQuery.toLowerCase();
    const matchQ = !q || (d.name?.toLowerCase() || '').includes(q) || (d.id?.toLowerCase() || '').includes(q) || (d.ref?.toLowerCase() || '').includes(q);
    
    let matchDate = true;
    if (d.date && dateFilter !== 'All') {
      const dt = new Date(d.date);
      const today = new Date();
      if (dateFilter === "Today") matchDate = dt.toDateString() === today.toDateString();
      if (dateFilter === "This Week") {
        const startWeek = new Date(today);
        startWeek.setDate(today.getDate() - today.getDay());
        matchDate = dt >= startWeek;
      }
      if (dateFilter === "This Month") matchDate = dt >= new Date(today.getFullYear(), today.getMonth(), 1);
      if (dateFilter === "This Year") matchDate = dt >= new Date(today.getFullYear(), 0, 1);
    }
    
    // Hide corrupt literal template string IDs
    const isCorrupt = d.id?.includes('${');
    if (isCorrupt) {
      db.collection('ledger_donations').doc(d.id).delete().catch(console.error);
    }
    
    const matchType = typeFilter === 'All Types' || d.type === typeFilter;

    return matchQ && matchDate && matchType && !isCorrupt;
  });

  const handleLongPress = (id: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedIds(newSet);
  };

  const handlePress = (item: any) => {
    if (selectedIds.size > 0) {
      handleLongPress(item.id);
    } else {
      onNavigate('details', item);
    }
  };

  const isSelectionMode = selectedIds.size > 0;
  const canGenerateReceipt = isSelectionMode || (typeFilter !== 'All Types' && filteredList.length > 0);
  const receiptList = isSelectionMode ? filteredList.filter((d: any) => selectedIds.has(d.id)) : filteredList;
  const displayType = isSelectionMode 
    ? (Array.from(new Set(receiptList.map((d: any) => d.type))).length === 1 ? receiptList[0].type : 'CUSTOM') 
    : typeFilter;

  return (
    <View style={styles.container}>
      <View style={styles.topbar}>
        <View style={styles.topbarBgCircle} pointerEvents="none" />
        <View style={styles.topbarRow}>
          <TouchableOpacity style={styles.backBtn} onPress={() => onNavigate('dashboard')}>
            <ArrowLeft color="#fff" size={20} />
          </TouchableOpacity>
          <View>
            <Text style={styles.eyebrow}>RECORDS</Text>
            <Text style={styles.title}>All Donations</Text>
          </View>
        </View>
      </View>

      <View style={styles.content}>
        <View style={styles.searchWrap}>
          <Search color={COLORS.inkSoft} size={18} style={styles.searchIcon} />
          <TextInput 
            style={styles.searchInput}
            placeholder="Search by name, ID, or reference"
            placeholderTextColor={COLORS.inkSoft}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        <View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll} contentContainerStyle={{ gap: 8, paddingBottom: 6 }}>
            {dateOpts.map(o => (
              <TouchableOpacity key={o} style={[styles.filterPill, dateFilter === o && styles.filterPillActive]} onPress={() => setDateFilter(o)}>
                <Text style={[styles.filterPillText, dateFilter === o && styles.filterPillTextActive]}>{o}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll} contentContainerStyle={{ gap: 8, paddingBottom: 6 }}>
            {typeOpts.map(o => (
              <TouchableOpacity key={o} style={[styles.filterPill, typeFilter === o && styles.filterPillActive]} onPress={() => setTypeFilter(o)}>
                <Text style={[styles.filterPillText, typeFilter === o && styles.filterPillTextActive]}>{o}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {canGenerateReceipt && receiptList.length > 0 && (
          <TouchableOpacity 
            style={styles.bulkBtn} 
            onPress={() => setShowPdfModal(true)}
            activeOpacity={0.8}
          >
            <Download color="#fff" size={18} />
            <Text style={styles.bulkBtnText}>Generate Receipt ({receiptList.length})</Text>
          </TouchableOpacity>
        )}

        {filteredList.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={{ fontSize: 38, marginBottom: 10, opacity: 0.6 }}>🕊️</Text>
            <Text style={styles.emptyText}>No donations match your search or filters.</Text>
          </View>
        ) : (
          <FlatList 
            data={filteredList}
            keyExtractor={item => item.id}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 40 }}
            renderItem={({ item }) => (
              <TouchableOpacity 
                style={[styles.donItem, selectedIds.has(item.id) && styles.donItemActive]} 
                onPress={() => handlePress(item)}
                onLongPress={() => handleLongPress(item.id)}
                delayLongPress={300}
              >
                <View style={styles.donTop}>
                  <View style={{ flex: 1, paddingRight: 10 }}>
                    <Text style={styles.donName} numberOfLines={1}>{item.name === 'Anonymous' ? 'Unknown Donor' : item.name}</Text>
                    <View style={styles.donTypeWrap}>
                      <Text style={styles.donType}>{item.type}</Text>
                    </View>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    {selectedIds.has(item.id) && <CheckCircle2 color={COLORS.gold} size={20} />}
                    <Text style={styles.donAmount}>{formatCurrency(item.amount)}</Text>
                  </View>
                </View>
                <View style={styles.donMeta}>
                  <Text style={styles.donMetaText}>{formatDate(item.date)}</Text>
                  <Text style={styles.donMetaText}>{item.method}</Text>
                  <Text style={styles.donMetaText}>{item.id.replace('DON-', 'COG-')}</Text>
                </View>
              </TouchableOpacity>
            )}
          />
        )}
      </View>

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
  container: {
    flex: 1,
    backgroundColor: COLORS.parchment,
  },
  topbar: {
    backgroundColor: COLORS.indigo, 
    paddingTop: 45, 
    paddingBottom: 25,
    paddingHorizontal: 20,
    position: 'relative',
    overflow: 'hidden',
  },
  topbarBgCircle: {
    position: 'absolute',
    right: -40,
    top: -40,
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: 'rgba(201,162,39,0.18)',
  },
  topbarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderColor: 'rgba(255,255,255,0.18)',
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  eyebrow: {
    fontSize: 11,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    color: COLORS.goldLight,
    fontWeight: '600',
    opacity: 0.9,
  },
  title: {
    fontSize: 22,
    fontWeight: '600',
    color: '#fff',
    marginTop: 2,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  searchWrap: {
    position: 'relative',
    marginBottom: 14,
  },
  searchIcon: {
    position: 'absolute',
    left: 12,
    top: '50%',
    transform: [{ translateY: -9 }],
    zIndex: 1,
  },
  searchInput: {
    backgroundColor: COLORS.paper,
    borderWidth: 1,
    borderColor: COLORS.line,
    borderRadius: 10,
    padding: 11,
    paddingLeft: 38,
    fontSize: 14,
    color: COLORS.ink,
  },
  filterScroll: {
    maxHeight: 40,
    marginBottom: 16,
  },
  filterPill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: COLORS.paper,
    borderWidth: 1,
    borderColor: COLORS.line,
    justifyContent: 'center',
  },
  filterPillActive: {
    backgroundColor: COLORS.indigo,
    borderColor: COLORS.indigo,
  },
  filterPillText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: COLORS.inkSoft,
  },
  filterPillTextActive: {
    color: COLORS.goldLight,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 50,
  },
  emptyText: {
    fontSize: 13,
    color: COLORS.inkSoft,
  },
  donItem: {
    backgroundColor: COLORS.paper,
    borderWidth: 1,
    borderColor: COLORS.line,
    borderRadius: 14,
    padding: 14,
    paddingHorizontal: 16,
    marginBottom: 10,
    shadowColor: COLORS.indigo,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.10,
    shadowRadius: 30,
    elevation: 3,
  },
  donItemActive: {
    borderColor: COLORS.gold,
    backgroundColor: COLORS.paper,
    borderWidth: 2,
    padding: 13,
    paddingHorizontal: 15,
  },
  donTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  donName: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.ink,
  },
  donAmount: {
    fontSize: 17,
    fontWeight: '600',
    color: COLORS.indigo,
    marginTop: 2,
  },
  donTypeWrap: {
    backgroundColor: 'rgba(201,162,39,0.12)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginTop: 6,
  },
  donType: {
    fontSize: 10.5,
    fontWeight: '700',
    color: COLORS.gold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  donMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.line,
    paddingTop: 10,
  },
  donMetaText: {
    fontSize: 12,
    color: COLORS.inkSoft,
  },
  bulkBtn: {
    backgroundColor: COLORS.indigo,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    marginBottom: 16,
    gap: 8,
  },
  bulkBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  }
});
