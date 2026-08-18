import React, { useState, useMemo, useEffect } from 'react';
import { 
  StyleSheet, View, Text, ScrollView, TouchableOpacity, 
  Modal, Platform, TextInput, KeyboardAvoidingView, Image
} from 'react-native';
import { 
  FileText, Check, ChevronRight, CalendarDays, Receipt, ChevronLeft, Share2, Download, Trash2
} from 'lucide-react-native';
import {
  COLORS, fmt, todayISO, getCategoryIconComponent, PaymentStamp, formatDateToDDMMYYYY, formatDateTime
} from './AdminExpenseUtils';
import { captureRef } from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import * as MediaLibrary from 'expo-media-library';
import * as Print from 'expo-print';
import { File, Paths } from 'expo-file-system';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../../../context/AuthContext';
import { db } from '../../../services/firebaseConfig';

const Sheet = ({ title, visible, onClose, children }: { title: string, visible: boolean, onClose: () => void, children: React.ReactNode }) => (
  <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
    <View style={styles.sheetOverlay}>
      <View style={styles.sheetContent}>
        <View style={styles.sheetHandle} />
        <View style={styles.sheetHead}>
          <Text style={styles.sheetTitle}>{title}</Text>
          <TouchableOpacity style={styles.iconBtnRound} onPress={onClose}>
            <ChevronLeft size={20} color={COLORS.ink} />
          </TouchableOpacity>
        </View>
        <ScrollView style={styles.sheetBody}>
          {children}
        </ScrollView>
      </View>
    </View>
  </Modal>
);

export default function AdminExpenseInvoices({ expenses, pendingInvoiceEntries, clearPendingInvoice, onSendForApproval, onDeleteInvoice }: any) {
  const { member } = useAuth();
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showCreateSheet, setShowCreateSheet] = useState(false);
  const [combinedPreview, setCombinedPreview] = useState<{entries: any[], label: string, invNo?: string} | null>(null);
  const [preparedBy, setPreparedBy] = useState('');
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [showAdminSelector, setShowAdminSelector] = useState(false);
  const [admins, setAdmins] = useState<any[]>([]);
  const [fetchingAdmins, setFetchingAdmins] = useState(false);
  const invoiceRef = React.useRef<View>(null);

  const openAdminSelector = async () => {
    setShowAdminSelector(true);
    if (admins.length === 0) {
      setFetchingAdmins(true);
      try {
        const SalesforceService = require('../../../services/SalesforceService').default;
        const loaded = await SalesforceService.getApprovers();
        setAdmins(loaded);
      } catch (err) {
        console.log('Failed to fetch admins', err);
      }
      setFetchingAdmins(false);
    }
  };

  const shareInvoice = async () => {
    try {
      if (invoiceRef.current) {
        const uri = await captureRef(invoiceRef.current, { format: 'png', quality: 1 });
        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(uri, { UTI: 'public.png', mimeType: 'image/png', dialogTitle: 'Share Invoice' });
        } else {
          alert("Sharing is not available on this device");
        }
      }
    } catch (err) {
      alert("Failed to share invoice");
      console.error(err);
    }
  };

  const downloadInvoice = async () => {
    try {
      if (invoiceRef.current) {
        const { status } = await MediaLibrary.requestPermissionsAsync();
        if (status === 'granted') {
          const uri = await captureRef(invoiceRef.current, { format: 'png', quality: 1 });
          await MediaLibrary.saveToLibraryAsync(uri);
          setToastMsg("Invoice saved to your gallery!");
          setTimeout(() => setToastMsg(null), 3500);
        } else {
          alert("Permission to save photos is required.");
        }
      }
    } catch (err) {
      alert("Failed to download invoice");
      console.error(err);
    }
  };
  const pdfInvoice = async () => {
    try {
      if (invoiceRef.current) {
        let pdfName = "Invoice-ChurchOfGod";
        if (combinedPreview) {
          if (combinedPreview.entries.length === 1) {
            const e = combinedPreview.entries[0];
            if (e.eventName) {
              pdfName = `${e.eventName}_invoice-churchofgod`;
            } else {
              const baseName = e.vendor ? e.vendor : (e.items[0]?.category || "Expense");
              pdfName = `${baseName}_invoice-churchofgod`;
            }
          } else {
            pdfName = `${combinedPreview.label.replace(/[^a-zA-Z0-9]/g, '')}_invoice-churchofgod`;
          }
        }
        
        // Remove spaces and special chars for safe filename
        const safeName = pdfName.replace(/[^a-zA-Z0-9-]/g, '_');

        const dataUri = await captureRef(invoiceRef.current, { format: 'png', quality: 1, result: 'data-uri' });
        const html = `
          <html>
            <body style="margin:0;padding:0;display:flex;justify-content:center;align-items:center;background-color:#F5EFE1;">
              <img src="${dataUri}" style="max-width:100%;max-height:100vh;object-fit:contain;" />
            </body>
          </html>
        `;
        const { uri } = await Print.printToFileAsync({ html, width: 612, height: 792 }); // Standard US Letter size
        
        const sourceFile = new File(uri);
        const targetFile = new File(Paths.cache, `${safeName}.pdf`);
        
        if (targetFile.exists) {
          targetFile.delete();
        }
        
        await sourceFile.copy(targetFile);

        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(targetFile.uri, { UTI: 'com.adobe.pdf', mimeType: 'application/pdf', dialogTitle: 'Share PDF Invoice' });
        } else {
          alert("Sharing is not available on this device");
        }
      }
    } catch (err) {
      alert("Failed to generate PDF");
      console.error(err);
    }
  };


  const eventGroups = useMemo(() => {
    const map: any = {};
    expenses.forEach((e: any) => { 
      if (e.eventName) { 
        if (!map[e.eventName]) map[e.eventName] = [];
        map[e.eventName].push(e); 
      } 
    });
    return Object.entries(map).map(([name, list]: any) => ({ name, list })).sort((a: any, b: any) => (a.list[0].date < b.list[0].date ? 1 : -1));
  }, [expenses]);

  const invoicedGroups = useMemo(() => {
    const map: any = {};
    expenses.forEach((e: any) => {
      const invs = new Set<string>();
      if (e.invoiceNumber) invs.add(e.invoiceNumber);
      if (e.invoiceNumbers && Array.isArray(e.invoiceNumbers)) {
        e.invoiceNumbers.forEach((i: string) => invs.add(i));
      }
      
      invs.forEach(inv => {
        if (!map[inv]) map[inv] = [];
        map[inv].push(e);
      });
    });
    return Object.entries(map).map(([invNo, list]: any) => ({ invNo, list })).sort((a: any, b: any) => {
      const dateA = a.list[0].invoiceDate || a.list[0].date || "";
      const dateB = b.list[0].invoiceDate || b.list[0].date || "";
      return dateB.localeCompare(dateA);
    });
  }, [expenses]);

  const exitSelectMode = () => {
    setSelectMode(false);
    setSelectedIds(new Set());
  };

  const toggleId = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleGroup = (list: any[]) => {
    const ids = list.map(e => e.id);
    const allSelected = ids.every(id => selectedIds.has(id));
    setSelectedIds(prev => {
      const next = new Set(prev);
      ids.forEach(id => (allSelected ? next.delete(id) : next.add(id)));
      return next;
    });
  };

  const selectedEntries = useMemo(
    () => expenses.filter((e: any) => selectedIds.has(e.id)),
    [expenses, selectedIds]
  );

  const selectedTotal = useMemo(
    () => selectedEntries.reduce((s: number, e: any) => s + e.items.reduce((s2: number, i: any) => s2 + Number(i.amount), 0), 0),
    [selectedEntries]
  );

  useEffect(() => {
    if (pendingInvoiceEntries && pendingInvoiceEntries.length > 0) {
      const invNo = pendingInvoiceEntries[0].invoiceNumber;
      let label = pendingInvoiceEntries.length === 1 
        ? (pendingInvoiceEntries[0].eventName ? `Event — ${pendingInvoiceEntries[0].eventName}` : "Normal Expense") 
        : "Multiple Expenses";
      
      setCombinedPreview({ entries: pendingInvoiceEntries, label, invNo });
      if (clearPendingInvoice) clearPendingInvoice();
    }
  }, [pendingInvoiceEntries]);

  useEffect(() => {
    if (combinedPreview) {
      const preparedBys = [...new Set(combinedPreview.entries.map((e: any) => e.submittedBy).filter(Boolean))];
      setPreparedBy(preparedBys.length > 0 ? preparedBys.join(', ') : member?.name || '');
    }
  }, [combinedPreview, member]);

  const selectedLabel = () => {
    const eventsHit = new Set(selectedEntries.filter((e: any) => e.eventName).map((e: any) => e.eventName));
    const normalCount = selectedEntries.filter((e: any) => !e.eventName).length;
    const parts = [];
    if (eventsHit.size === 1) parts.push(`Event — ${[...eventsHit][0]}`);
    else if (eventsHit.size > 1) parts.push(`${eventsHit.size} Events`);
    if (normalCount > 0) parts.push(`${normalCount} Normal Expense${normalCount > 1 ? "s" : ""}`);
    return parts.join(" + ") || "Selected Expenses";
  };

  const generateCombinedInvoice = async () => {
    if (selectedEntries.length === 0) return;
    let seq = parseInt(await AsyncStorage.getItem('inv_seq') || '0', 10);
    seq += 1;
    await AsyncStorage.setItem('inv_seq', seq.toString());
    const invNo = `INV-COG${seq.toString().padStart(4, '0')}`;
    setCombinedPreview({ entries: selectedEntries, label: selectedLabel(), invNo });
  };

  const renderInvoiceRow = (e: any) => {
    const sum = e.items.reduce((s: number, i: any) => s + Number(i.amount), 0);
    const cat = e.items[0]?.category || "Miscellaneous";
    const CatIcon = getCategoryIconComponent(cat);
    const checked = selectedIds.has(e.id);
    
    return (
      <TouchableOpacity 
        key={e.id} 
        style={styles.ledgerLine}
        onPress={async () => {
          if (selectMode) toggleId(e.id);
          else {
            let seq = parseInt(await AsyncStorage.getItem('inv_seq') || '0', 10);
            seq += 1;
            await AsyncStorage.setItem('inv_seq', seq.toString());
            const invNo = `INV-COG${seq.toString().padStart(4, '0')}`;
            setCombinedPreview({ entries: [e], label: e.eventName ? `Event — ${e.eventName}` : "Normal Expense", invNo });
          }
        }}
        onLongPress={() => {
          if (!selectMode) {
            setSelectMode(true);
            setSelectedIds(new Set([e.id]));
          }
        }}
      >
        {selectMode ? (
          <View style={[styles.checkbox, checked && styles.checkboxChecked]}>
            {checked && <Check size={12} color="#fff" strokeWidth={3} />}
          </View>
        ) : (
          <View style={styles.ledgerLineIcon}><CatIcon size={16} color={COLORS.greenMid} /></View>
        )}
        <View style={styles.ledgerLineMid}>
          <Text style={styles.ledgerLineCat}>{e.items.length > 1 ? `${cat} +${e.items.length - 1} more` : cat}</Text>
          <Text style={styles.ledgerLineDetail}>{e.vendor || (e.items.some((i: any) => i.vendor) ? "Multiple Vendors" : "—")} · {formatDateToDDMMYYYY(e.date)}</Text>
        </View>
        <Text style={styles.ledgerLineAmt}>{fmt(sum)}</Text>
        {!selectMode && <FileText size={14} color="#8A8267" style={{marginLeft: 10}} />}
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {invoicedGroups.length === 0 ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
          <FileText size={48} color="#D1C7A9" />
          <Text style={{ marginTop: 16, fontSize: 16, color: COLORS.subtleText, textAlign: 'center', fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif' }}>
            No invoice generated.
          </Text>
          <Text style={{ marginTop: 8, fontSize: 14, color: COLORS.subtleText, textAlign: 'center' }}>
            Go to the Expenses tab and select "Generate Invoice" from an expense's details to view it here.
          </Text>
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          {invoicedGroups.map(({ invNo, list }: any) => {
            const e = list[0];
            const sum = list.reduce((s: number, exp: any) => s + exp.items.reduce((s2: number, i: any) => s2 + Number(i.amount), 0), 0);
            const label = list.length === 1 
              ? (e.eventName || 'Normal Expense') 
              : (list.every((ex: any) => ex.eventName === e.eventName) ? (e.eventName || 'Normal Expenses') : 'Multiple Expenses');
            
            const approvedBys = [...new Set(list.map((exp: any) => exp.approvedBy).filter(Boolean))];
            const approvedByStr = approvedBys.length > 0 ? approvedBys.join(', ') : null;
            
            return (
              <TouchableOpacity key={invNo} style={styles.invoiceCard} onPress={() => setCombinedPreview({ entries: list, label, invNo })} activeOpacity={0.7}>
                <View style={styles.invoiceCardDeco} pointerEvents="none">
                  <FileText size={90} color={COLORS.brass} opacity={0.1} />
                </View>
                
                <View style={styles.invoiceCardContent}>
                  <View style={styles.invoiceCardLeft}>
                    <Text style={styles.invoiceCardAmt}>{fmt(sum)}</Text>
                    <Text style={styles.invoiceCardLabel} numberOfLines={1}>{label}</Text>
                    <Text style={styles.invoiceCardCount}>{list.length} expense{list.length !== 1 ? 's' : ''}</Text>
                    {(() => {
                      const isRejected = list.some((exp: any) => exp.status === 'Rejected');
                      if (isRejected && approvedByStr) {
                        return (
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 8, backgroundColor: '#FEE2E2', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, alignSelf: 'flex-start' }}>
                            <Text style={{ fontSize: 10, color: '#B91C1C', fontWeight: '700' }}>REJECTED BY {approvedByStr.toUpperCase()}</Text>
                          </View>
                        );
                      }
                      if (approvedByStr) {
                        return (
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 8, backgroundColor: '#E8F5E9', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, alignSelf: 'flex-start' }}>
                            <Check size={10} color={COLORS.greenDeep} strokeWidth={3} />
                            <Text style={{ fontSize: 10, color: COLORS.greenDeep, fontWeight: '700' }}>APPROVED BY {approvedByStr.toUpperCase()}</Text>
                          </View>
                        );
                      }
                      return (
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 8, backgroundColor: COLORS.paperAlt, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, alignSelf: 'flex-start' }}>
                          <Text style={{ fontSize: 10, color: COLORS.subtleText, fontWeight: '600' }}>PENDING APPROVAL</Text>
                        </View>
                      );
                    })()}
                  </View>

                  <View style={styles.invoiceCardRight}>
                    <View style={styles.invoiceCardRightTop}>
                      <View style={styles.invoiceCardBadge}>
                        <Text style={styles.invoiceCardBadgeText}>{invNo}</Text>
                      </View>
                      <TouchableOpacity style={styles.invoiceCardDeleteIcon} hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }} onPress={() => {
                        import('react-native').then(({ Alert }) => {
                          Alert.alert(
                            "Delete Invoice?",
                            "This will un-group these expenses and remove the invoice number.",
                            [
                              { text: "Cancel", style: "cancel" },
                              { text: "Delete", style: "destructive", onPress: () => {
                                if (onDeleteInvoice) onDeleteInvoice(invNo);
                              }}
                            ]
                          );
                        });
                      }}>
                        <Trash2 size={14} color="#e53e3e" />
                      </TouchableOpacity>
                    </View>
                    
                    <View style={styles.invoiceCardRightBottom}>
                      <CalendarDays size={11} color={COLORS.subtleText} />
                      <Text style={styles.invoiceCardDate}>{formatDateTime(e.invoiceDate || e.date)}</Text>
                    </View>
                  </View>
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}

      {/* Invoice Preview Modal */}
      <Modal visible={!!combinedPreview} transparent animationType="slide">
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <View style={styles.sheetOverlay}>
            <View style={[styles.sheetContent, { maxHeight: '90%' }]}>
              <View style={styles.sheetHandle} />
            <View style={styles.sheetHead}>
              <Text style={styles.sheetTitle}>Invoice Preview</Text>
              <TouchableOpacity style={styles.iconBtnRound} onPress={() => { setCombinedPreview(null); exitSelectMode(); }}>
                <ChevronLeft size={20} color={COLORS.ink} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.sheetBody}>
              {combinedPreview && (() => {
                const isSingle = combinedPreview.entries.length === 1;
                const invNo = combinedPreview.invNo || `INV-COG0001`;
                const invDate = isSingle ? formatDateToDDMMYYYY(combinedPreview.entries[0].date || todayISO()) : new Date().toLocaleDateString('en-GB').replace(/\//g, '-');
                
                const eventNames = [...new Set(combinedPreview.entries.map((e: any) => e.eventName).filter(Boolean))];
                const normalCount = combinedPreview.entries.filter((e: any) => !e.eventName).length;
                const types = [...eventNames];
                if (normalCount > 0) types.push(normalCount > 1 ? "Normal Expenses" : "Normal Expense");
                const invType = types.length > 0 ? types.join(', ') : 'Normal Expense';

                const paidBys = [...new Set(combinedPreview.entries.map((e: any) => e.paidBy).filter(Boolean))];
                const paidBy = paidBys.length > 0 ? paidBys.join(', ') : '—';

                const payMethods = [...new Set(combinedPreview.entries.map((e: any) => e.paymentMethod).filter(Boolean))];
                const payMethod = payMethods.length > 0 ? payMethods.join(', ') : '—';

                const refNo = isSingle ? combinedPreview.entries[0].reference : '';
                
                const approvedBys = [...new Set(combinedPreview.entries.map((e: any) => e.approvedBy).filter(Boolean))];
                const derivedApprovedBy = approvedBys.length > 0 ? approvedBys.join(', ') : '';
                const isRejected = combinedPreview.entries.some((e: any) => e.status === 'Rejected');

                return (
                <View style={{ marginBottom: 40, width: '100%' }}>
                {toastMsg && (
                  <View style={{ position: 'absolute', top: '45%', left: 0, right: 0, alignItems: 'center', zIndex: 999, elevation: 10 }}>
                    <View style={styles.successToast}>
                      <View style={styles.successIconCircle}>
                        <Check size={16} color="#fff" strokeWidth={3} />
                      </View>
                      <Text style={styles.successText}>{toastMsg}</Text>
                    </View>
                  </View>
                )}
                <View style={styles.invoiceDoc} ref={invoiceRef} collapsable={false}>
                  <View style={styles.watermarkContainer} pointerEvents="none">
                    <Image source={require('../../../../assets/logo.png')} style={styles.watermarkImage} resizeMode="contain" />
                  </View>
                  <Text style={styles.invoiceDocTitle}>CHURCH OF GOD</Text>
                  <Text style={styles.invoiceDocSub}>Invoice</Text>
                  
                  <View style={styles.detailGrid}>
                    <View style={styles.detailRow}>
                      <View style={styles.detailCell}><Text style={styles.detailLabel}>Invoice No</Text><Text style={styles.detailValue}>{invNo}</Text></View>
                      <View style={styles.detailCell}><Text style={styles.detailLabel}>Date</Text><Text style={styles.detailValue}>{invDate}</Text></View>
                    </View>
                    <View style={styles.detailRow}>
                      <View style={styles.detailCell}><Text style={styles.detailLabel}>Event Type</Text><Text style={styles.detailValue}>{invType}</Text></View>
                      <View style={styles.detailCell}><Text style={styles.detailLabel}>Paid By</Text><Text style={styles.detailValue}>{paidBy}</Text></View>
                    </View>
                    <View style={styles.detailRow}>
                      <View style={styles.detailCell}><Text style={styles.detailLabel}>Payment Method</Text><Text style={styles.detailValue}>{payMethod}</Text></View>
                      <View style={styles.detailCell}>
                        {!!refNo && <><Text style={styles.detailLabel}>Ref No</Text><Text style={styles.detailValue}>{refNo}</Text></>}
                      </View>
                    </View>
                  </View>
                  
                  {/* Just render a summary list */}
                  <View style={{ marginTop: 20 }}>
                    <View style={{ flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: COLORS.rule, paddingBottom: 6, marginBottom: 4 }}>
                      <Text style={{ flex: 2, fontWeight: '700', color: COLORS.ink, fontSize: 12.5 }}>Category</Text>
                      <Text style={{ flex: 3, fontWeight: '700', color: COLORS.ink, fontSize: 12.5 }}>Details / Vendor</Text>
                      <Text style={{ flex: 1.5, textAlign: 'right', fontWeight: '700', color: COLORS.ink, fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif', fontSize: 12.5 }}>Amount</Text>
                    </View>
                    {combinedPreview.entries.map((e: any) => {
                      return e.items.map((i: any) => {
                        const ItemIcon = getCategoryIconComponent(i.category);
                        return (
                          <View key={`${e.id}-${i.id}`} style={{ flexDirection: 'row', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: '#A9A187' }}>
                            <View style={{ flex: 2, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                              <ItemIcon size={13} color={COLORS.greenMid} />
                              <Text style={{ fontSize: 12, fontWeight: '500', color: COLORS.ink }} numberOfLines={1}>{i.category}</Text>
                            </View>
                            <View style={{ flex: 3, justifyContent: 'center' }}>
                              <Text style={{ fontSize: 11.5, color: COLORS.ink }} numberOfLines={1}>{i.vendor || e.vendor || 'No Vendor'}</Text>
                              {i.detail && <Text style={{ fontSize: 10.5, color: COLORS.ink, fontWeight: '600' }} numberOfLines={1}>{i.detail}</Text>}
                            </View>
                            <Text style={{ flex: 1.5, textAlign: 'right', fontSize: 12, color: COLORS.ink }}>{fmt(i.amount)}</Text>
                          </View>
                        );
                      });
                    })}
                  </View>
                  
                  <View style={styles.ledgerTotalRow}>
                    <Text style={styles.ledgerTotalLabel}>Grand Total</Text>
                    <Text style={styles.ledgerTotalAmt}>
                      {fmt(combinedPreview.entries.reduce((s: number, e: any) => s + e.items.reduce((s2: number, i: any) => s2 + Number(i.amount), 0), 0))}
                    </Text>
                  </View>

                  <View style={styles.signatureRow}>
                    <View style={styles.signatureCol}>
                      <TextInput style={styles.signatureInput} value={preparedBy} onChangeText={setPreparedBy} placeholder="Name" placeholderTextColor="#D1CBB8" />
                      <View style={styles.signatureLine} />
                      <Text style={styles.signatureLabel}>PREPARED BY</Text>
                    </View>
                    <View style={styles.signatureCol}>
                      <TextInput style={[styles.signatureInput, isRejected ? { color: '#B91C1C' } : {}]} value={derivedApprovedBy} editable={false} placeholder="Pending" placeholderTextColor="#D1CBB8" />
                      <View style={[styles.signatureLine, isRejected ? { backgroundColor: '#FCA5A5' } : {}]} />
                      <Text style={[styles.signatureLabel, isRejected ? { color: '#B91C1C' } : {}]}>{isRejected ? 'REJECTED BY' : 'APPROVED BY'}{"\n"}(PASTOR /{"\n"}TREASURER)</Text>
                    </View>
                  </View>

                  <Text style={styles.invoiceFooter}>CHURCH OF GOD</Text>
                </View>

                <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 12, marginTop: 16 }}>
                  <TouchableOpacity style={styles.badgeBtn} onPress={downloadInvoice}>
                    <Download size={14} color="#fff" />
                    <Text style={styles.badgeBtnText}>Download</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.badgeBtn} onPress={shareInvoice}>
                    <Share2 size={14} color="#fff" />
                    <Text style={styles.badgeBtnText}>Share</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.badgeBtn} onPress={pdfInvoice}>
                    <FileText size={14} color="#fff" />
                    <Text style={styles.badgeBtnText}>PDF</Text>
                  </TouchableOpacity>
                </View>

                {combinedPreview.entries.some((e: any) => e.status === 'Draft' || !e.status || e.status === 'Rejected') && (
                  <TouchableOpacity style={[styles.badgeBtn, { backgroundColor: COLORS.brass, marginTop: 16, width: '100%', justifyContent: 'center', paddingVertical: 12 }]} onPress={openAdminSelector}>
                    <Text style={[styles.badgeBtnText, { color: COLORS.greenDeep, fontSize: 15 }]}>Send for Approval</Text>
                  </TouchableOpacity>
                )}
                </View>
                );
              })()}
            </ScrollView>
          </View>
        </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Admin Selector Modal */}
      <Modal visible={showAdminSelector} transparent animationType="fade">
        <View style={[styles.sheetOverlay, { backgroundColor: 'rgba(0,0,0,0.5)' }]}>
          <View style={[styles.sheetContent, { maxHeight: '60%' }]}>
            <View style={styles.sheetHandle} />
            <View style={styles.sheetHead}>
              <Text style={styles.sheetTitle}>Select Approver</Text>
              <TouchableOpacity style={styles.iconBtnRound} onPress={() => setShowAdminSelector(false)}>
                <ChevronLeft size={20} color={COLORS.ink} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.sheetBody}>
              {fetchingAdmins ? (
                <Text style={{ textAlign: 'center', padding: 20, color: COLORS.subtleText }}>Loading admins...</Text>
              ) : admins.length === 0 ? (
                <Text style={{ textAlign: 'center', padding: 20, color: COLORS.subtleText }}>No admins found.</Text>
              ) : (
                admins.map(admin => (
                  <TouchableOpacity key={admin.id} style={{ padding: 16, borderBottomWidth: 1, borderBottomColor: COLORS.rule, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }} onPress={() => {
                    setShowAdminSelector(false);
                    if (onSendForApproval && combinedPreview) {
                      combinedPreview.entries.forEach((entry: any) => {
                        if (entry.status === 'Draft' || !entry.status || entry.status === 'Rejected') {
                          onSendForApproval(entry, admin);
                        }
                      });
                      setCombinedPreview(null);
                      exitSelectMode();
                    }
                  }}>
                    <View>
                      <Text style={{ fontSize: 16, fontWeight: '600', color: COLORS.ink }}>{admin.name}</Text>
                      <Text style={{ fontSize: 12, color: COLORS.subtleText, marginTop: 2 }}>{admin.userType}</Text>
                    </View>
                    <ChevronRight size={18} color={COLORS.brass} />
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  invoiceHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: COLORS.paperAlt,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.rule,
  },
  invoiceIntro: {
    flex: 1,
    fontSize: 12,
    color: COLORS.ink,
    lineHeight: 16,
  },
  btnGhost: {
    marginLeft: 12,
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: COLORS.rule,
    borderRadius: 6,
  },
  btnGhostText: {
    fontSize: 12,
    fontWeight: '500',
    color: COLORS.ink,
  },
  createInvoiceCta: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    margin: 16,
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.rule,
  },
  createInvoiceCtaIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.paperAlt,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  createInvoiceCtaTextCol: {
    flex: 1,
  },
  createInvoiceCtaTitle: {
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.ink,
  },
  createInvoiceCtaSub: {
    fontSize: 11.5,
    color: '#8A8267',
    marginTop: 2,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 100,
  },
  sectionBlock: {
    marginBottom: 20,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1.5,
    borderBottomColor: COLORS.brass,
    paddingBottom: 6,
    marginBottom: 10,
    gap: 6,
  },
  sectionTitle: {
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.greenDeep,
    letterSpacing: 0.2,
  },
  ledgerCard: {
    backgroundColor: COLORS.paperCard,
    borderWidth: 1,
    borderColor: COLORS.rule,
    borderRadius: 8,
    marginBottom: 12,
    overflow: 'hidden',
  },
  eventGroupSelectHead: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.paperAlt,
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.rule,
  },
  ledgerCardHeadTextPlain: {
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.greenDeep,
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.rule,
    backgroundColor: COLORS.paperAlt,
  },
  ledgerCardHeadText: {
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.greenDeep,
  },
  ledgerTable: {
    paddingHorizontal: 12,
  },
  ledgerLine: {
    position: 'relative',
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.paperAlt,
  },
  ledgerLineIcon: {
    width: 24,
    alignItems: 'center',
    marginRight: 10,
  },
  ledgerLineMid: {
    flex: 1,
  },
  ledgerLineCat: {
    fontSize: 13,
    color: COLORS.ink,
  },
  ledgerLineDetail: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 10,
    color: '#8A8267',
    marginTop: 2,
  },
  ledgerLineAmt: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.ink,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: '#A39A7F',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    backgroundColor: '#fff',
  },
  checkboxChecked: {
    backgroundColor: COLORS.greenMid,
    borderColor: COLORS.greenMid,
  },
  checkboxPartial: {
    backgroundColor: COLORS.greenMid,
    borderColor: COLORS.greenMid,
  },
  partialMark: {
    width: 10,
    height: 3,
    backgroundColor: '#fff',
    borderRadius: 1.5,
  },
  selectionBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: COLORS.greenDeep,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    paddingBottom: Platform.OS === 'ios' ? 30 : 16,
  },
  selectionBarInfo: {
    flexDirection: 'column',
  },
  selectionBarCount: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 11,
    color: '#A9803C',
    textTransform: 'uppercase',
  },
  selectionBarTotal: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
  selectionBarGenerateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 6,
    gap: 8,
  },
  selectionBarGenerateBtnText: {
    color: COLORS.greenDeep,
    fontSize: 14,
    fontWeight: '600',
  },

  // Sheet
  sheetOverlay: {
    flex: 1,
    backgroundColor: 'rgba(23, 20, 15, 0.45)',
    justifyContent: 'flex-end',
  },
  sheetContent: {
    backgroundColor: COLORS.paperCard,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    height: '95%',
    paddingBottom: 40,
  },
  sheetHandle: {
    width: 36,
    height: 4,
    backgroundColor: COLORS.rule,
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 4,
  },
  sheetHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.rule,
  },
  sheetTitle: {
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
    fontWeight: '600',
    fontSize: 15,
    color: COLORS.greenDeep,
  },
  iconBtnRound: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: COLORS.paperAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetBody: {
    padding: 16,
    paddingBottom: 40,
  },
  ciManual: {
    paddingTop: 10,
  },
  ciHelp: {
    fontSize: 13,
    color: '#7A7157',
    lineHeight: 18,
    marginBottom: 20,
  },
  btnPrimary: {
    flexDirection: 'row',
    backgroundColor: COLORS.greenDeep,
    padding: 14,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  btnPrimaryText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
  },

  // Invoice Doc
  invoiceDoc: {
    backgroundColor: '#FAF7EC',
    borderWidth: 1,
    borderColor: COLORS.rule,
    padding: 24,
    borderRadius: 8,
    position: 'relative',
    overflow: 'hidden',
  },
  watermarkContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 0,
  },
  watermarkImage: {
    width: 300,
    height: 300,
    opacity: 0.15,
  },
  invoiceDocTitle: {
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
    fontSize: 20,
    fontWeight: '600',
    color: COLORS.ink,
    textAlign: 'center',
  },
  invoiceDocSub: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 10,
    color: COLORS.ink,
    fontWeight: '600',
    textAlign: 'center',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 4,
    marginBottom: 20,
  },
  detailGrid: {
    backgroundColor: 'transparent',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.rule,
    padding: 16,
    paddingBottom: 4,
    marginBottom: 24,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  detailCell: {
    flex: 1,
    paddingRight: 8,
  },
  detailLabel: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 9,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    color: '#8A8267',
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.ink,
  },
  ledgerTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    marginTop: 16,
  },
  ledgerTotalLabel: {
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
    fontWeight: '600',
    fontSize: 16,
    color: COLORS.greenDeep,
  },
  ledgerTotalAmt: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontWeight: '600',
    fontSize: 16,
    color: COLORS.greenDeep,
  },
  signatureRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 40,
    gap: 12,
  },
  signatureCol: {
    flex: 1,
    alignItems: 'center',
  },
  signatureLine: {
    height: 1,
    backgroundColor: COLORS.rule,
    width: '100%',
    marginBottom: 4,
  },
  signatureInput: {
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
    fontSize: 11,
    color: COLORS.ink,
    textAlign: 'center',
    padding: 0,
    minHeight: 18,
    width: '100%',
  },
  signatureLabel: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 9,
    color: '#6b7280',
    fontWeight: '700',
    textAlign: 'center',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 2,
  },
  invoiceFooter: {
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
    fontSize: 13,
    color: COLORS.ink,
    textAlign: 'center',
    marginTop: 32,
    letterSpacing: 1,
    fontWeight: '600',
  },
  badgeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a2d5a',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    gap: 6,
  },
  badgeBtnText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  successToast: {
    backgroundColor: '#1a2d5a',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 30,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 5,
  },
  successIconCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#10b981',
    justifyContent: 'center',
    alignItems: 'center',
  },
  successText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  invoiceCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#EFECE5',
    borderLeftWidth: 4,
    borderLeftColor: COLORS.brass,
    shadowColor: '#2C3E20',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
    overflow: 'hidden',
    position: 'relative',
  },
  invoiceCardDeco: {
    position: 'absolute',
    right: -20,
    bottom: -10,
    transform: [{ rotate: '-15deg' }],
  },
  invoiceCardContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  invoiceCardLeft: {
    flex: 1,
    paddingRight: 16,
  },
  invoiceCardAmt: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 24,
    fontWeight: '800',
    color: COLORS.greenDeep,
    letterSpacing: -0.5,
    marginBottom: 2,
  },
  invoiceCardLabel: {
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
    fontSize: 15,
    fontWeight: '600',
    color: '#1a2d5a',
    marginBottom: 4,
  },
  invoiceCardCount: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 11,
    color: COLORS.subtleText,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  invoiceCardRight: {
    alignItems: 'flex-end',
  },
  invoiceCardRightTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  invoiceCardBadge: {
    backgroundColor: COLORS.greenDeep,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  invoiceCardBadgeText: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 10,
    color: '#ffffff',
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  invoiceCardDeleteIcon: {
    padding: 6,
    backgroundColor: '#fff5f5',
    borderRadius: 6,
  },
  invoiceCardRightBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  invoiceCardDate: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 11,
    color: COLORS.subtleText,
    fontWeight: '600',
  }
});
