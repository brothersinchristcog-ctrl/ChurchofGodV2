import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, Modal, Linking, Image, StatusBar } from 'react-native';
import { ArrowLeft, User, Calendar, Tag, Target, FileText, CreditCard, Link, Receipt, Info, Clock, Eye, Share2, Edit2, Trash2, Printer, Download, CheckCircle2 } from 'lucide-react-native';
import { COLORS, formatCurrency, formatDate, getInitials, generateDonationReceipt, getDonationReceiptHTML } from './AdminDonationsUtils';
import { db } from '../../../services/firebaseConfig';
import { WebView } from 'react-native-webview';
import { useAuth } from '../../../context/AuthContext';

export default function AdminDonationsDetails({ donation, onNavigate }: any) {
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [deleteSuccess, setDeleteSuccess] = useState(false);
  const [showPdfModal, setShowPdfModal] = useState(false);
  const [showAttachmentModal, setShowAttachmentModal] = useState(false);
  const { user, member } = useAuth();
  
  const authorizerName = member?.name || user?.displayName || user?.email || 'Authorized Administrator';

  const confirmDelete = async () => {
    setDeleteModalVisible(false);
    try {
      await db.collection('ledger_donations').doc(donation.id).delete();
      setDeleteSuccess(true);
    } catch (e) {
      Alert.alert('Error', 'Failed to delete donation.');
    }
  };

  const DetailRow = ({ icon: Icon, label, value, isLast = false, isLink = false, onPress }: any) => (
    <View style={[styles.detailRow, !isLast && { borderBottomWidth: 1, borderBottomColor: COLORS.line }]}>
      <View style={styles.kwrap}>
        <View style={styles.iconChip}>
          <Icon size={14} color={COLORS.inkSoft} />
        </View>
        <Text style={{ color: COLORS.inkSoft, fontSize: 13.5 }}>{label}</Text>
      </View>
      {isLink ? (
        <TouchableOpacity onPress={onPress} style={{ flex: 1, alignItems: 'flex-end', paddingLeft: 10 }}>
          <Text style={[styles.detailValue, { color: COLORS.indigo, textDecorationLine: 'underline' }]} numberOfLines={1}>{value || '—'}</Text>
        </TouchableOpacity>
      ) : (
        <View style={{ flex: 1, alignItems: 'flex-end', paddingLeft: 10 }}>
          <Text style={styles.detailValue} numberOfLines={2}>{value || '—'}</Text>
        </View>
      )}
    </View>
  );

  const receiptHtml = getDonationReceiptHTML(donation, authorizerName);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.indigo} />
      <View style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 150, backgroundColor: COLORS.indigo }} />
      <View style={styles.detailHero}>
        <View style={styles.topbarRow}>
          <TouchableOpacity style={styles.backBtn} onPress={() => onNavigate('list')}>
            <ArrowLeft color="#fff" size={20} />
          </TouchableOpacity>
          <Text style={styles.eyebrow}>DONATION DETAILS</Text>
          <View style={{ width: 36 }} />
        </View>

        <View style={styles.compactCard}>
          <View style={styles.compactRow}>
            <View style={styles.donorAvatarSmall}>
              <Text style={styles.avatarTextSmall}>{getInitials(donation.name)}</Text>
            </View>
            <View style={styles.compactInfo}>
              <Text style={styles.heroNameSmall} numberOfLines={1}>{donation.name === 'Anonymous' ? 'Unknown Donor' : donation.name}</Text>
            </View>
            <View style={styles.compactRight}>
              <Text style={styles.heroAmountSmall}>{formatCurrency(donation.amount)}</Text>
            </View>
          </View>
        </View>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        <View style={styles.detailCard}>
          <View style={styles.detailCardGlow} />
          
          <View style={styles.detailSectionTitle}>
            <Text style={styles.sectionTitleText}>DONATION</Text>
            <View style={styles.sectionTitleLine} />
          </View>
          <DetailRow icon={User} label="Donor Name" value={donation.name} />
          <DetailRow icon={Calendar} label="Donation Date" value={formatDate(donation.date)} />
          <DetailRow icon={Tag} label="Donation Type" value={donation.type} />
          <DetailRow icon={Target} label="Purpose" value={donation.purpose} />
          <DetailRow icon={FileText} label="Notes" value={donation.notes} isLast />

          <View style={styles.detailDivider} />
          <View style={styles.detailSectionTitle}>
            <Text style={styles.sectionTitleText}>PAYMENT</Text>
            <View style={styles.sectionTitleLine} />
          </View>
          <DetailRow icon={CreditCard} label="Payment Method" value={donation.method} />
          <DetailRow icon={Link} label="Transaction Ref" value={donation.ref} />
          <DetailRow 
            icon={Receipt} 
            label="Attached Receipt" 
            value={donation.attachmentUrl ? "Available" : "None"} 
            isLink={!!donation.attachmentUrl} 
            onPress={() => { if(donation.attachmentUrl) setShowAttachmentModal(true) }}
            isLast 
          />

          <View style={styles.detailDivider} />
          <View style={styles.detailSectionTitle}>
            <Text style={styles.sectionTitleText}>RECORD</Text>
            <View style={styles.sectionTitleLine} />
          </View>
          <DetailRow icon={Info} label="Created By" value={donation.createdBy || 'Admin'} />
          <DetailRow icon={Clock} label="Created Date" value={formatDate(donation.createdDate)} isLast />
        </View>

        <View style={styles.actionGrid}>
          <TouchableOpacity style={styles.actionBtn} onPress={() => setShowPdfModal(true)}>
            <Receipt size={18} color={COLORS.indigo} />
            <Text style={styles.actionBtnText}>Generate Receipt</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionBtn} onPress={() => onNavigate('create', donation)}>
            <Edit2 size={18} color={COLORS.indigo} />
            <Text style={styles.actionBtnText}>Edit Donation</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.dangerBtn} onPress={() => setDeleteModalVisible(true)}>
          <Trash2 size={16} color={COLORS.warn} />
          <Text style={styles.dangerBtnText}>Delete Donation</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* ===== DELETE SUCCESS MODAL ===== */}
      <Modal visible={deleteSuccess} transparent animationType="fade">
        <View style={{ flex: 1, backgroundColor: 'rgba(18,21,43,0.92)', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 28 }}>
          {/* Animated card */}
          <View style={{
            backgroundColor: '#fff',
            borderRadius: 28,
            padding: 32,
            width: '100%',
            alignItems: 'center',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 10 },
            shadowOpacity: 0.35,
            shadowRadius: 20,
            elevation: 20,
          }}>

            {/* Icon circle */}
            <View style={{
              width: 88, height: 88, borderRadius: 44,
              backgroundColor: '#FEF2F2',
              borderWidth: 3, borderColor: '#FECACA',
              justifyContent: 'center', alignItems: 'center',
              marginBottom: 20,
            }}>
              <Trash2 size={40} color="#EF4444" />
            </View>

            {/* Title */}
            <Text style={{ fontSize: 22, fontWeight: '800', color: '#111827', marginBottom: 8, textAlign: 'center' }}>
              Donation Deleted
            </Text>

            {/* Subtitle */}
            <Text style={{ fontSize: 14, color: '#6B7280', textAlign: 'center', lineHeight: 21, marginBottom: 6 }}>
              The donation record for
            </Text>
            <View style={{ backgroundColor: '#FEF2F2', paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, marginBottom: 6 }}>
              <Text style={{ fontSize: 14, fontWeight: '700', color: '#DC2626' }}>
                {donation.name === 'Anonymous' ? 'Unknown Donor' : donation.name}
              </Text>
            </View>
            <Text style={{ fontSize: 14, color: '#6B7280', textAlign: 'center', lineHeight: 21, marginBottom: 28 }}>
              has been permanently removed.{`\n`}This action cannot be undone.
            </Text>

            {/* Divider */}
            <View style={{ width: '100%', height: 1, backgroundColor: '#F3F4F6', marginBottom: 20 }} />

            {/* Back button */}
            <TouchableOpacity
              style={{
                backgroundColor: COLORS.indigo,
                borderRadius: 16,
                paddingVertical: 14,
                paddingHorizontal: 32,
                width: '100%',
                alignItems: 'center',
                flexDirection: 'row',
                justifyContent: 'center',
                gap: 8,
              }}
              onPress={() => onNavigate('list')}
            >
              <ArrowLeft size={18} color="#fff" />
              <Text style={{ color: '#fff', fontSize: 15, fontWeight: '700' }}>Back to Donations List</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal visible={deleteModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>Delete this donation?</Text>
            <Text style={styles.modalDesc}>This will permanently remove the record. This action cannot be undone.</Text>
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setDeleteModalVisible(false)}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.confirmBtn} onPress={confirmDelete}>
                <Text style={styles.confirmBtnText}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* PDF Generation Modal */}
      <Modal visible={showPdfModal} animationType="slide" presentationStyle="pageSheet">
        <View style={{ flex: 1, backgroundColor: COLORS.parchment }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, paddingTop: 60, backgroundColor: COLORS.indigo }}>
            <Text style={{ color: '#fff', fontSize: 18, fontWeight: '600' }}>Official Receipt</Text>
            <TouchableOpacity onPress={() => setShowPdfModal(false)} style={{ padding: 4 }}>
              <Text style={{ color: '#fff', fontSize: 16, fontWeight: '600' }}>Close</Text>
            </TouchableOpacity>
          </View>
          
          <View style={{ flex: 1, margin: 16, borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: COLORS.line, backgroundColor: '#fff' }}>
            <WebView originWhitelist={['*']} source={{ html: receiptHtml }} style={{ flex: 1 }} />
          </View>

          <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 10, padding: 20, paddingBottom: 40 }}>
            <TouchableOpacity style={{ backgroundColor: COLORS.indigo, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, alignItems: 'center', flexDirection: 'row', gap: 6 }} onPress={() => generateDonationReceipt(donation, true, authorizerName)}>
              <Download size={16} color="#fff" />
              <Text style={{ color: '#fff', fontWeight: '600', fontSize: 13 }}>Download</Text>
            </TouchableOpacity>
            <TouchableOpacity style={{ backgroundColor: COLORS.indigo, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, alignItems: 'center', flexDirection: 'row', gap: 6 }} onPress={() => generateDonationReceipt(donation, true, authorizerName)}>
              <Share2 size={16} color="#fff" />
              <Text style={{ color: '#fff', fontWeight: '600', fontSize: 13 }}>Share</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Attachment Viewer Modal */}
      <Modal visible={showAttachmentModal} animationType="fade" transparent>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center' }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', padding: 20, paddingTop: 50, position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10 }}>
            <Text style={{ color: '#fff', fontSize: 18, fontWeight: '600' }}>Attached Receipt</Text>
            <TouchableOpacity onPress={() => setShowAttachmentModal(false)}>
              <Text style={{ color: '#fff', fontSize: 16, fontWeight: '600' }}>Close</Text>
            </TouchableOpacity>
          </View>
          
          <View style={{ flex: 1, marginTop: 100, marginBottom: 40, marginHorizontal: 20, borderRadius: 12, overflow: 'hidden', backgroundColor: '#fff' }}>
            {donation.attachmentType === 'pdf' || donation.attachmentUrl?.includes('.pdf') ? (
              <WebView originWhitelist={['*']} source={{ uri: donation.attachmentUrl }} style={{ flex: 1 }} />
            ) : (
              <Image source={{ uri: donation.attachmentUrl }} style={{ width: '100%', height: '100%', resizeMode: 'contain' }} />
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.parchment },
  detailHero: {
    backgroundColor: COLORS.indigo,
    paddingTop: 15,
    paddingBottom: 25,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 25,
    borderBottomRightRadius: 25,
    marginBottom: 15,
    zIndex: 10,
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
  compactCard: {
    width: '100%',
    paddingTop: 5,
  },
  compactRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  donorAvatarSmall: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: COLORS.goldLight,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarTextSmall: { fontSize: 20, fontWeight: '700', color: COLORS.indigoDeep },
  compactInfo: {
    flex: 1,
    marginLeft: 14,
  },
  heroNameSmall: { fontSize: 16, fontWeight: '700', color: '#fff' },
  compactRight: {
    alignItems: 'flex-end',
  },
  heroAmountSmall: { fontSize: 18, fontWeight: '800', color: COLORS.goldLight, marginBottom: 4 },
  typeBadgeSmall: {
    backgroundColor: 'rgba(201,162,39,0.15)',
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12,
    borderColor: 'rgba(201,162,39,0.3)', borderWidth: 1,
  },
  typeBadgeTextSmall: { color: COLORS.goldLight, fontSize: 10, fontWeight: '700', letterSpacing: 0.5, textTransform: 'uppercase' },
  content: { flex: 1, paddingHorizontal: 20 },
  detailCard: {
    backgroundColor: COLORS.paper, borderColor: COLORS.line, borderWidth: 1,
    borderRadius: 22, overflow: 'hidden', paddingBottom: 10, marginBottom: 18,
  },
  detailCardGlow: { height: 4, backgroundColor: COLORS.goldLight },
  detailSectionTitle: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 6 },
  sectionTitleText: { fontSize: 11, letterSpacing: 1.2, fontWeight: '700', color: COLORS.gold, marginRight: 8 },
  sectionTitleLine: { flex: 1, height: 1, backgroundColor: COLORS.line },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 11, paddingHorizontal: 20 },
  kwrap: { flexDirection: 'row', alignItems: 'center', gap: 11 },
  iconChip: { width: 30, height: 30, borderRadius: 9, backgroundColor: 'rgba(201,162,39,0.10)', alignItems: 'center', justifyContent: 'center' },
  detailValue: { fontWeight: '600', color: COLORS.ink, textAlign: 'right' },
  detailDivider: { height: 1, backgroundColor: COLORS.line, marginHorizontal: 20, marginTop: 6 },
  actionGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  actionBtn: {
    width: '48%', backgroundColor: COLORS.paper, borderColor: COLORS.line, borderWidth: 1,
    borderRadius: 12, padding: 13, alignItems: 'center', marginBottom: 10,
  },
  actionBtnText: { fontSize: 12.5, fontWeight: '600', color: COLORS.indigo, marginTop: 6 },
  dangerBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: COLORS.paper, borderColor: 'rgba(181,84,43,0.3)', borderWidth: 1,
    borderRadius: 12, padding: 13, marginTop: 10, gap: 6,
  },
  dangerBtnText: { fontSize: 12.5, fontWeight: '600', color: COLORS.warn },
  
  // Modal styles
  modalOverlay: { flex: 1, backgroundColor: 'rgba(18,21,43,0.55)', justifyContent: 'flex-end' },
  modalSheet: { backgroundColor: COLORS.paper, borderTopLeftRadius: 22, borderTopRightRadius: 22, padding: 24, paddingBottom: 40 },
  modalTitle: { fontSize: 18, fontWeight: '600', color: COLORS.ink, marginBottom: 6 },
  modalDesc: { fontSize: 13, color: COLORS.inkSoft, marginBottom: 18 },
  modalActions: { flexDirection: 'row', gap: 10 },
  cancelBtn: { flex: 1, padding: 13, borderRadius: 12, borderWidth: 1, borderColor: COLORS.line, alignItems: 'center' },
  cancelBtnText: { fontSize: 14, fontWeight: '600', color: COLORS.ink },
  confirmBtn: { flex: 1, padding: 13, borderRadius: 12, backgroundColor: COLORS.warn, alignItems: 'center' },
  confirmBtnText: { fontSize: 14, fontWeight: '600', color: '#fff' }
});
