import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, Modal, FlatList, ActivityIndicator, Image } from 'react-native';
import { ArrowLeft, Check, ChevronDown, Camera, Image as ImageIcon, FileText as FilePdfIcon, X, Download, Share2 } from 'lucide-react-native';
import { COLORS, formatCurrency, formatDate, DEFAULT_CATEGORIES, PAYMENT_METHODS, getDonationReceiptHTML, generateDonationReceipt } from './AdminDonationsUtils';
import { WebView } from 'react-native-webview';
import { db, storage } from '../../../services/firebaseConfig';
import { useAuth } from '../../../context/AuthContext';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { FieldValue } from '../../../services/firebaseConfig';
import DateTimePickerModal from 'react-native-modal-datetime-picker';

export default function AdminDonationsForm({ editData, onNavigate }: any) {
  const { member } = useAuth();
  
  const [date, setDate] = useState(new Date().toISOString());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [name, setName] = useState('');
  const [type, setType] = useState(DEFAULT_CATEGORIES[0]);
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState(PAYMENT_METHODS[0]);
  const [ref, setRef] = useState('');
  const [purpose, setPurpose] = useState('');
  const [notes, setNotes] = useState('');
  const [receiptFile, setReceiptFile] = useState<any>(null); // { uri, name, type, isExisting }
  
  const [showSummary, setShowSummary] = useState(false);
  const [showReceipt, setShowReceipt] = useState(false);
  const [receiptHtml, setReceiptHtml] = useState('');
  const [categories, setCategories] = useState(DEFAULT_CATEGORIES);
  const [newType, setNewType] = useState('');
  const [showAddType, setShowAddType] = useState(false);
  const [toastMsg, setToastMsg] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [savedDonation, setSavedDonation] = useState<any>(null);

  const [showTypeDropdown, setShowTypeDropdown] = useState(false);
  const [showMethodDropdown, setShowMethodDropdown] = useState(false);

  useEffect(() => {
    // Fetch custom categories from Firestore
    const fetchCategories = async () => {
      try {
        const doc = await db.collection('settings').doc('donation_categories').get();
        const data = doc.data();
        if (data) {
          const fetchedCats = data.categories || [];
          setCategories(prev => {
            const combined = [...prev];
            fetchedCats.forEach((c: string) => {
              if (!combined.includes(c)) combined.push(c);
            });
            return combined;
          });
        }
      } catch (e) {
        console.error("Error fetching categories:", e);
      }
    };
    fetchCategories();
  }, []);

  useEffect(() => {
    if (editData) {
      setDate(editData.date || new Date().toISOString());
      setName(editData.name || '');
      setType(editData.type || DEFAULT_CATEGORIES[0]);
      setAmount(editData.amount?.toString() || '');
      setMethod(editData.method || PAYMENT_METHODS[0]);
      setRef(editData.ref || '');
      setPurpose(editData.purpose || '');
      setNotes(editData.notes || '');
      
      if (editData.attachmentUrl) {
        setReceiptFile({
          uri: editData.attachmentUrl,
          type: editData.attachmentType || 'image', // default to image if missing
          isExisting: true
        });
      }

      if (editData.type && !categories.includes(editData.type)) {
        setCategories(prev => [...prev, editData.type]);
      }
    }
  }, [editData]);

  const handleAddType = async () => {
    const val = newType.trim();
    if (val && !categories.includes(val)) {
      const updatedCategories = [...categories, val];
      setCategories(updatedCategories);
      
      // Save custom category to Firestore so it persists globally
      try {
        await db.collection('settings').doc('donation_categories').set({
          categories: FieldValue.arrayUnion(val)
        }, { merge: true });
      } catch (e) {
        console.error("Failed to save custom category", e);
      }
    }
    if (val) {
      setType(val);
      setNewType('');
      setShowAddType(false);
    }
  };

  const handleConfirmDate = (selectedDate: Date) => {
    setShowDatePicker(false);
    setDate(selectedDate.toISOString());
  };

  const pickImage = async (useCamera = false) => {
    let result;
    if (useCamera) {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) return;
      result = await ImagePicker.launchCameraAsync({ quality: 0.8 });
    } else {
      result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.8 });
    }
    
    if (!result.canceled && result.assets && result.assets.length > 0) {
      setReceiptFile({ uri: result.assets[0].uri, type: 'image' });
      setToastMsg('Receipt attached');
      setTimeout(() => setToastMsg(''), 2000);
    }
  };

  const pickDocument = async () => {
    const result = await DocumentPicker.getDocumentAsync({ type: 'application/pdf' });
    if (!result.canceled && result.assets && result.assets.length > 0) {
      setReceiptFile({ uri: result.assets[0].uri, name: result.assets[0].name, type: 'pdf' });
      setToastMsg('PDF attached');
      setTimeout(() => setToastMsg(''), 2000);
    }
  };

  const uploadReceipt = async (fileUri: string, id: string) => {
    if (!fileUri) return null;
    const ext = receiptFile.type === 'pdf' ? 'pdf' : 'jpg';
    const filename = `donations/${id}_${Date.now()}.${ext}`;
    const reference = storage().ref(filename);
    
    // For React Native Firebase, you can just use putFile with local file URIs
    await reference.putFile(fileUri);
    return await reference.getDownloadURL();
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const dateStr = date.split('T')[0].replace(/-/g, '');
      const uniqueSuffix = Date.now().toString().slice(-4) + Math.floor(Math.random() * 10);
      const docId = editData?.id || `COG-${dateStr}-${uniqueSuffix}`;

      let attachmentUrl = editData?.attachmentUrl || null;
      let attachmentType = editData?.attachmentType || null;

      // If there is a new receipt file (not existing), upload it
      if (receiptFile && !receiptFile.isExisting) {
        attachmentUrl = await uploadReceipt(receiptFile.uri, docId);
        attachmentType = receiptFile.type;
      } else if (!receiptFile) {
        attachmentUrl = null;
        attachmentType = null;
      }

      const data = {
        name: name.trim() || 'Unknown Donor',
        type,
        amount: Number(amount) || 0,
        date,
        method,
        ref: method === 'Cash' ? '—' : ref.trim() || '—',
        purpose: purpose.trim(),
        notes: notes.trim(),
        attachmentUrl,
        attachmentType,
        createdBy: member?.name || 'Admin',
        createdDate: new Date().toISOString(),
      };

      if (editData?.id) {
        await db.collection('ledger_donations').doc(editData.id).update(data);
      } else {
        await db.collection('ledger_donations').doc(docId).set({
          ...data,
          id: docId
        });
      }

      setShowSummary(false);

      // Build the receipt HTML and show it as a popup
      const donationForReceipt = {
        id: docId,
        name: name.trim() || 'Anonymous',
        type,
        amount: Number(amount) || 0,
        date,
        method,
        ref: method === 'Cash' ? '—' : ref.trim() || '—',
        purpose: purpose.trim(),
        notes: notes.trim(),
      };
      setSavedDonation(donationForReceipt);
      const html = getDonationReceiptHTML(donationForReceipt, member?.name || 'Authorized Administrator');
      setReceiptHtml(html);
      setShowReceipt(true);
    } catch (e) {
      console.error(e);
      alert('Error saving donation');
    } finally {
      setIsSaving(false);
    }
  };

  const DropdownModal = ({ visible, setVisible, data, selected, onSelect, title }: any) => (
    <Modal visible={visible} transparent animationType="fade">
      <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setVisible(false)}>
        <View style={styles.dropdownSheet}>
          <Text style={styles.dropdownTitle}>{title}</Text>
          <FlatList 
            data={data}
            keyExtractor={item => item}
            renderItem={({ item }) => (
              <TouchableOpacity style={styles.dropdownItem} onPress={() => { onSelect(item); setVisible(false); }}>
                <Text style={[styles.dropdownItemText, selected === item && styles.dropdownItemTextActive]}>{item}</Text>
                {selected === item && <Check size={18} color={COLORS.indigo} />}
              </TouchableOpacity>
            )}
          />
        </View>
      </TouchableOpacity>
    </Modal>
  );

  return (
    <View style={styles.container}>
      <View style={styles.topbar}>
        <View style={[styles.topbarRow, { justifyContent: 'space-between', width: '100%' }]}>
          <View style={{ width: 40, alignItems: 'flex-start' }}>
            <TouchableOpacity style={styles.backBtn} onPress={() => onNavigate(editData ? 'details' : 'dashboard', editData)}>
              <ArrowLeft color="#fff" size={20} />
            </TouchableOpacity>
          </View>
          <Text style={[styles.title, { flex: 1, textAlign: 'center' }]}>{editData ? 'Edit Donation' : 'Create Donation'}</Text>
          <View style={{ width: 40 }} />
        </View>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        <View style={styles.formCard}>
          <View style={styles.fieldRow}>
            <Text style={styles.label}>Donation Date</Text>
            <TouchableOpacity style={styles.input} onPress={() => setShowDatePicker(true)}>
              <Text style={{ color: COLORS.ink, fontSize: 14 }}>{formatDate(date)}</Text>
            </TouchableOpacity>
            <DateTimePickerModal
              isVisible={showDatePicker}
              mode="date"
              date={new Date(date)}
              onConfirm={handleConfirmDate}
              onCancel={() => setShowDatePicker(false)}
            />
          </View>
          
          <View style={styles.fieldRow}>
            <Text style={styles.label}>Member Name</Text>
            <TextInput style={styles.input} placeholder="Enter donor's name" placeholderTextColor={COLORS.inkSoft} value={name} onChangeText={setName} />
          </View>
          
          <View style={styles.fieldRow}>
            <Text style={styles.label}>Donation Type</Text>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <TouchableOpacity style={[styles.input, { flex: 1, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }]} onPress={() => setShowTypeDropdown(true)}>
                <Text style={{ color: COLORS.ink, fontSize: 14 }}>{type}</Text>
                <ChevronDown size={18} color={COLORS.inkSoft} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.addTypeBtn} onPress={() => setShowAddType(!showAddType)}>
                <Text style={{ color: COLORS.goldLight, fontWeight: '700', fontSize: 20 }}>+</Text>
              </TouchableOpacity>
            </View>
            {showAddType && (
              <View style={{ marginTop: 14 }}>
                <Text style={styles.label}>New Donation Type</Text>
                <TextInput style={styles.input} placeholder="e.g. Harvest Festival" placeholderTextColor={COLORS.inkSoft} value={newType} onChangeText={setNewType} />
                <TouchableOpacity style={styles.primaryBtn} onPress={handleAddType}>
                  <Text style={styles.primaryBtnText}>Add Donation Type</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          <View style={styles.fieldRow}>
            <Text style={styles.label}>Amount</Text>
            <View style={styles.amountInputWrap}>
              <Text style={styles.rupeeSymbol}>₹</Text>
              <TextInput style={styles.amountInput} placeholder="0.00" keyboardType="numeric" placeholderTextColor={COLORS.inkSoft} value={amount} onChangeText={setAmount} />
            </View>
          </View>

          <View style={styles.fieldRow}>
            <Text style={styles.label}>Payment Method</Text>
            <TouchableOpacity style={[styles.input, { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }]} onPress={() => setShowMethodDropdown(true)}>
              <Text style={{ color: COLORS.ink, fontSize: 14 }}>{method}</Text>
              <ChevronDown size={18} color={COLORS.inkSoft} />
            </TouchableOpacity>
          </View>

          {method === 'Cheque' && (
            <View style={styles.fieldRow}>
              <Text style={styles.label}>Cheque Number</Text>
              <TextInput style={styles.input} placeholder="e.g. 004521" placeholderTextColor={COLORS.inkSoft} value={ref} onChangeText={setRef} />
            </View>
          )}

          {(method === 'UPI' || method === 'Bank Transfer' || method === 'Online') && (
            <View style={styles.fieldRow}>
              <Text style={styles.label}>Transaction Reference</Text>
              <TextInput style={styles.input} placeholder="UTR / reference number" placeholderTextColor={COLORS.inkSoft} value={ref} onChangeText={setRef} />
            </View>
          )}

          <View style={styles.fieldRow}>
            <Text style={styles.label}>Purpose</Text>
            <TextInput style={styles.input} placeholder="e.g. Building Fund — Phase 2" placeholderTextColor={COLORS.inkSoft} value={purpose} onChangeText={setPurpose} />
          </View>
          
          <View style={styles.fieldRow}>
            <Text style={styles.label}>Notes</Text>
            <TextInput style={[styles.input, { minHeight: 80 }]} multiline placeholder="Optional notes" placeholderTextColor={COLORS.inkSoft} value={notes} onChangeText={setNotes} textAlignVertical="top" />
          </View>

          <View style={styles.fieldRow}>
            <Text style={styles.label}>Attach Receipt</Text>
            
            {receiptFile ? (
              <View style={styles.previewContainer}>
                {receiptFile.type === 'pdf' ? (
                  <View style={styles.pdfPreviewBox}>
                    <FilePdfIcon size={32} color={COLORS.warn} />
                    <Text style={styles.pdfPreviewText} numberOfLines={1}>{receiptFile.name || 'PDF Document'}</Text>
                  </View>
                ) : (
                  <Image source={{ uri: receiptFile.uri }} style={styles.imagePreview} />
                )}
                <TouchableOpacity style={styles.removeBtn} onPress={() => setReceiptFile(null)}>
                  <X size={16} color="#fff" />
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.attachRow}>
                <TouchableOpacity style={styles.attachBtn} onPress={() => pickImage(true)}>
                  <Camera size={20} color={COLORS.inkSoft} />
                  <Text style={styles.attachText}>Camera</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.attachBtn} onPress={() => pickImage(false)}>
                  <ImageIcon size={20} color={COLORS.inkSoft} />
                  <Text style={styles.attachText}>Gallery</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.attachBtn} onPress={pickDocument}>
                  <FilePdfIcon size={20} color={COLORS.inkSoft} />
                  <Text style={styles.attachText}>PDF</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>

        <TouchableOpacity style={styles.goldBtn} onPress={() => setShowSummary(true)}>
          <Text style={styles.goldBtnText}>Review & Save Donation</Text>
        </TouchableOpacity>
      </ScrollView>

      <DropdownModal visible={showTypeDropdown} setVisible={setShowTypeDropdown} data={categories} selected={type} onSelect={setType} title="Select Donation Type" />
      <DropdownModal visible={showMethodDropdown} setVisible={setShowMethodDropdown} data={PAYMENT_METHODS} selected={method} onSelect={setMethod} title="Select Payment Method" />

      {/* Summary Overlay */}
      <Modal visible={showSummary} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>Donation Summary</Text>
            <Text style={styles.modalDesc}>Please confirm the details before saving.</Text>
            
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Donor</Text>
              <Text style={styles.summaryValue}>{name || 'Anonymous'}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Donation Type</Text>
              <Text style={styles.summaryValue}>{type}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Payment Method</Text>
              <Text style={styles.summaryValue}>{method}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Donation Date</Text>
              <Text style={styles.summaryValue}>{formatDate(date)}</Text>
            </View>
            <View style={[styles.summaryRow, { borderBottomWidth: 0, marginTop: 6 }]}>
              <Text style={styles.summaryTotalLabel}>Total Amount</Text>
              <Text style={styles.summaryTotalValue}>{formatCurrency(amount || 0)}</Text>
            </View>

            <TouchableOpacity style={styles.primaryBtn} onPress={handleSave} disabled={isSaving}>
              {isSaving ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryBtnText}>Save Donation</Text>}
            </TouchableOpacity>
            <TouchableOpacity style={styles.cancelLinkBtn} onPress={() => setShowSummary(false)} disabled={isSaving}>
              <Text style={styles.cancelLinkText}>Go Back & Edit</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Receipt Popup */}
      <Modal visible={showReceipt} animationType="slide" onRequestClose={() => { setShowReceipt(false); onNavigate('dashboard'); }}>
        <View style={{ flex: 1, backgroundColor: COLORS.indigoDeep }}>
          {/* Header bar */}
          <View style={receiptModalStyles.header}>
            <View>
              <Text style={receiptModalStyles.headerTitle}>Donation Receipt</Text>
              <Text style={receiptModalStyles.headerSub}>Saved successfully ✓</Text>
            </View>
            <TouchableOpacity
              style={receiptModalStyles.closeBtn}
              onPress={() => { setShowReceipt(false); onNavigate('dashboard'); }}
            >
              <X size={20} color="#fff" />
            </TouchableOpacity>
          </View>

          {/* Receipt HTML in WebView */}
          <WebView
            originWhitelist={['*']}
            source={{ html: receiptHtml }}
            style={{ flex: 1, backgroundColor: '#fff' }}
            scalesPageToFit
          />

          {/* Download & Share buttons */}
          <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 12, paddingHorizontal: 20, paddingTop: 14, paddingBottom: 6, backgroundColor: COLORS.indigoDeep }}>
            <TouchableOpacity
              style={{ flex: 1, backgroundColor: COLORS.indigo, paddingVertical: 12, borderRadius: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' }}
              onPress={() => generateDonationReceipt(savedDonation, false, member?.name || 'Authorized Administrator')}
            >
              <Download size={16} color="#fff" />
              <Text style={{ color: '#fff', fontWeight: '600', fontSize: 13 }}>Download</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={{ flex: 1, backgroundColor: COLORS.indigo, paddingVertical: 12, borderRadius: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' }}
              onPress={() => generateDonationReceipt(savedDonation, true, member?.name || 'Authorized Administrator')}
            >
              <Share2 size={16} color="#fff" />
              <Text style={{ color: '#fff', fontWeight: '600', fontSize: 13 }}>Share</Text>
            </TouchableOpacity>
          </View>

          {/* Bottom close button */}
          <TouchableOpacity
            style={receiptModalStyles.doneBtn}
            onPress={() => { setShowReceipt(false); onNavigate('dashboard'); }}
          >
            <Text style={receiptModalStyles.doneBtnText}>Done — Go to Dashboard</Text>
          </TouchableOpacity>
        </View>
      </Modal>

      {/* Toast */}
      {!!toastMsg && (
        <View style={styles.toast}>
          <Check size={16} color={COLORS.goldLight} />
          <Text style={styles.toastText}>{toastMsg}</Text>
        </View>
      )}
    </View>
  );
}


const receiptModalStyles = StyleSheet.create({
  header: { backgroundColor: COLORS.indigo, paddingTop: 52, paddingBottom: 16, paddingHorizontal: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#fff' },
  headerSub: { fontSize: 12, color: COLORS.goldLight, marginTop: 2, fontWeight: '500' },
  closeBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
  doneBtn: { backgroundColor: COLORS.indigo, paddingVertical: 18, alignItems: 'center' },
  doneBtnText: { color: '#fff', fontSize: 15, fontWeight: '700', letterSpacing: 0.3 },
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.parchment },
  topbar: {
    backgroundColor: COLORS.indigo,
    paddingTop: 45,
    paddingBottom: 25,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 25,
    borderBottomRightRadius: 25,
    position: 'relative',
  },
  topbarRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 22, fontWeight: '700', color: '#fff' },
  content: { flex: 1, paddingHorizontal: 20, paddingTop: 16 },
  formCard: { backgroundColor: COLORS.paper, borderColor: COLORS.line, borderWidth: 1, borderRadius: 18, padding: 18, marginBottom: 14 },
  fieldRow: { marginBottom: 14 },
  label: { fontSize: 13, fontWeight: '600', color: COLORS.inkSoft, marginBottom: 8 },
  input: { backgroundColor: COLORS.paper, borderColor: COLORS.line, borderWidth: 1, borderRadius: 10, padding: 12, fontSize: 14, color: COLORS.ink },
  amountInputWrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.paper, borderColor: COLORS.line, borderWidth: 1, borderRadius: 10, paddingHorizontal: 12 },
  rupeeSymbol: { fontSize: 16, color: COLORS.inkSoft, marginRight: 6 },
  amountInput: { flex: 1, paddingVertical: 12, fontSize: 14, color: COLORS.ink },
  
  addTypeBtn: { width: 48, borderRadius: 10, backgroundColor: COLORS.indigo, alignItems: 'center', justifyContent: 'center' },
  attachRow: { flexDirection: 'row', gap: 10 },
  attachBtn: { flex: 1, backgroundColor: COLORS.parchment, borderWidth: 1, borderStyle: 'dashed', borderColor: COLORS.line, borderRadius: 10, padding: 14, alignItems: 'center', justifyContent: 'center' },
  attachText: { fontSize: 12, color: COLORS.inkSoft, marginTop: 4, fontWeight: '500' },

  previewContainer: { position: 'relative', width: '100%', height: 180, borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: COLORS.line },
  imagePreview: { width: '100%', height: '100%', resizeMode: 'cover' },
  pdfPreviewBox: { flex: 1, backgroundColor: '#f5f5f5', alignItems: 'center', justifyContent: 'center', padding: 20 },
  pdfPreviewText: { marginTop: 10, fontSize: 14, color: COLORS.ink, fontWeight: '500' },
  removeBtn: { position: 'absolute', top: 10, right: 10, backgroundColor: 'rgba(0,0,0,0.6)', width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },

  primaryBtn: { backgroundColor: COLORS.indigo, borderRadius: 12, padding: 15, alignItems: 'center', marginTop: 6 },
  primaryBtnText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  goldBtn: { backgroundColor: '#B8860B', borderRadius: 12, padding: 15, alignItems: 'center', marginTop: 6 },
  goldBtnText: { color: COLORS.indigoDeep, fontSize: 15, fontWeight: '700' },
  
  modalOverlay: { flex: 1, backgroundColor: 'rgba(18,21,43,0.55)', justifyContent: 'flex-end' },
  dropdownSheet: { backgroundColor: COLORS.paper, borderTopLeftRadius: 22, borderTopRightRadius: 22, padding: 24, paddingBottom: 40, maxHeight: '60%' },
  dropdownTitle: { fontSize: 16, fontWeight: '600', color: COLORS.ink, marginBottom: 16 },
  dropdownItem: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: COLORS.line },
  dropdownItemText: { fontSize: 15, color: COLORS.ink },
  dropdownItemTextActive: { color: COLORS.indigo, fontWeight: '600' },

  modalSheet: { backgroundColor: COLORS.paper, borderTopLeftRadius: 22, borderTopRightRadius: 22, padding: 24, paddingBottom: 40 },
  modalTitle: { fontSize: 18, fontWeight: '600', color: COLORS.ink, marginBottom: 6 },
  modalDesc: { fontSize: 13, color: COLORS.inkSoft, marginBottom: 18 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: COLORS.line, borderStyle: 'dashed' },
  summaryLabel: { color: COLORS.inkSoft, fontSize: 13.5 },
  summaryValue: { color: COLORS.ink, fontSize: 13.5, fontWeight: '500' },
  summaryTotalLabel: { color: COLORS.indigo, fontSize: 16, fontWeight: '700', marginTop: 6 },
  summaryTotalValue: { color: COLORS.indigo, fontSize: 16, fontWeight: '700', marginTop: 6 },
  cancelLinkBtn: { padding: 15, alignItems: 'center', marginTop: 6 },
  cancelLinkText: { color: COLORS.inkSoft, fontSize: 14, fontWeight: '600' },

  toast: { position: 'absolute', bottom: 40, left: 20, right: 20, backgroundColor: COLORS.indigoDeep, padding: 14, borderRadius: 12, flexDirection: 'row', alignItems: 'center', gap: 10 },
  toastText: { color: '#fff', fontSize: 13.5, fontWeight: '500' },
});
