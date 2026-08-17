import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, TextInput, Platform } from 'react-native';
import { COLORS, fmt, formatDateToDDMMYYYY } from './AdminExpenseUtils';
import { FileText, Check, X, User, Trash2 } from 'lucide-react-native';
import { db, functions } from '../../../services/firebaseConfig';
import { useAuth } from '../../../context/AuthContext';

export default function AdminExpenseApprovals({ expenses, onGenerateInvoice, onDelete }: any) {
  const { member } = useAuth();
  const [activeTab, setActiveTab] = useState<'pending' | 'approved' | 'rejected'>('pending');
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [remarks, setRemarks] = useState("");
  
  const pending = expenses.filter((e: any) => 
    e.status === 'Pending Approval'
  ).sort((a: any, b: any) => (a.submittedAt < b.submittedAt ? 1 : -1));

  const approved = expenses.filter((e: any) => 
    e.status === 'Approved'
  ).sort((a: any, b: any) => (a.approvedAt < b.approvedAt ? 1 : -1));

  const rejected = expenses.filter((e: any) => 
    e.status === 'Rejected'
  ).sort((a: any, b: any) => (a.approvedAt < b.approvedAt ? 1 : -1));

  const currentList = activeTab === 'pending' ? pending : activeTab === 'approved' ? approved : rejected;

  const handleApprove = async (expense: any) => {
    try {
      await db.collection('ledger_expenses').doc(expense.id).update({
        status: 'Approved',
        approvedBy: member?.name || 'Admin',
        approvedAt: new Date().toISOString(),
        approvalRemarks: ''
      });
      Alert.alert("Approved", "The expense has been approved.");
    } catch (err) {
      console.error(err);
      Alert.alert("Error", "Could not approve the expense.");
    }
  };

  const handleReject = async (expense: any) => {
    if (!remarks.trim()) {
      Alert.alert("Validation", "Please enter rejection remarks.");
      return;
    }
    try {
      await db.collection('ledger_expenses').doc(expense.id).update({
        status: 'Rejected',
        approvedBy: member?.name || 'Admin',
        approvedAt: new Date().toISOString(),
        approvalRemarks: remarks
      });
      setRejectId(null);
      setRemarks("");
      Alert.alert("Rejected", "The expense has been rejected.");
    } catch (err) {
      console.error(err);
      Alert.alert("Error", "Could not reject the expense.");
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.tabContainer}>
        <TouchableOpacity style={[styles.tab, activeTab === 'pending' && styles.activeTab]} onPress={() => setActiveTab('pending')}>
          <Text style={[styles.tabText, activeTab === 'pending' && styles.activeTabText]}>Pending ({pending.length})</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tab, activeTab === 'approved' && styles.activeTab]} onPress={() => setActiveTab('approved')}>
          <Text style={[styles.tabText, activeTab === 'approved' && styles.activeTabText]}>Approved</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tab, activeTab === 'rejected' && styles.activeTab]} onPress={() => setActiveTab('rejected')}>
          <Text style={[styles.tabText, activeTab === 'rejected' && styles.activeTabText]}>Rejected</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        {currentList.length === 0 ? (
          <View style={styles.empty}>
            {activeTab === 'pending' ? (
              <>
                <Check size={40} color={COLORS.greenMid} style={{ marginBottom: 16 }} />
                <Text style={styles.emptyText}>All caught up!</Text>
                <Text style={styles.emptySub}>There are no pending expenses to approve.</Text>
              </>
            ) : (
              <>
                <FileText size={40} color={COLORS.subtleText} style={{ marginBottom: 16 }} />
                <Text style={styles.emptyText}>Nothing here yet</Text>
                <Text style={styles.emptySub}>No {activeTab} expenses found.</Text>
              </>
            )}
          </View>
        ) : (
          currentList.map((e: any) => {
            const sum = e.items.reduce((s: number, i: any) => s + Number(i.amount), 0);
            return (
              <View key={e.id} style={styles.card}>
                <View style={styles.cardHead}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.title}>{e.eventName || e.items[0]?.category || 'Expense'}</Text>
                    <Text style={styles.subtitle}>{formatDateToDDMMYYYY(e.date)}</Text>
                  </View>
                  <Text style={styles.amount}>{fmt(sum)}</Text>
                </View>

                <View style={[styles.detailsRow, activeTab !== 'pending' && { flexDirection: 'column', alignItems: 'flex-start', gap: 6 }]}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <User size={14} color={COLORS.subtleText} />
                    <Text style={styles.detailsText}>Submitted by <Text style={{ fontWeight: '600' }}>{e.submittedBy || 'Admin'}</Text></Text>
                  </View>
                  {activeTab !== 'pending' && (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      {activeTab === 'approved' ? (
                        <Check size={14} color={COLORS.greenDeep} />
                      ) : (
                        <X size={14} color={COLORS.redInk} />
                      )}
                      <Text style={styles.detailsText}>
                        {activeTab === 'approved' ? 'Approved' : 'Rejected'} by <Text style={{ fontWeight: '600' }}>{e.approvedBy || 'Admin'}</Text>
                      </Text>
                    </View>
                  )}
                </View>

                {activeTab === 'pending' ? (
                  rejectId === e.id ? (
                    <View style={styles.rejectBox}>
                      <Text style={styles.rejectLabel}>Rejection Remarks (Required):</Text>
                      <TextInput
                        style={styles.rejectInput}
                        placeholder="Why is this being rejected?"
                        placeholderTextColor="#A39A7F"
                        value={remarks}
                        onChangeText={setRemarks}
                        multiline
                      />
                      <View style={styles.actionRow}>
                        <TouchableOpacity style={[styles.btn, styles.btnCancel]} onPress={() => { setRejectId(null); setRemarks(""); }}>
                          <Text style={styles.btnCancelText}>Cancel</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.btn, styles.btnReject]} onPress={() => handleReject(e)}>
                          <Text style={styles.btnRejectText}>Confirm Reject</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  ) : (
                    <View style={{ flexDirection: 'column', gap: 12 }}>
                      {(!e.approverId || e.approverId === member?.id) ? (
                        <View style={{ flexDirection: 'row', gap: 12 }}>
                          <TouchableOpacity style={[styles.badgeBtn, styles.btnRejectOutlined]} onPress={() => setRejectId(e.id)}>
                            <X size={16} color={COLORS.redInk} />
                            <Text style={styles.btnRejectOutlinedText}>Reject</Text>
                          </TouchableOpacity>
                          
                          <TouchableOpacity style={[styles.badgeBtn, styles.btnApprove]} onPress={() => {
                            Alert.alert("Approve Expense", "Are you sure you want to approve this expense?", [
                              { text: "Cancel", style: "cancel" },
                              { text: "Approve", onPress: () => handleApprove(e) }
                            ]);
                          }}>
                            <Check size={16} color="#fff" />
                            <Text style={styles.btnApproveText}>Approve</Text>
                          </TouchableOpacity>
                        </View>
                      ) : (
                        <View style={{ justifyContent: 'center' }}>
                          <Text style={{ fontSize: 13, color: COLORS.subtleText, fontStyle: 'italic' }}>
                            Waiting on {e.approverName || 'another admin'}
                          </Text>
                        </View>
                      )}

                      <View style={{ flexDirection: 'row', gap: 12 }}>
                        <TouchableOpacity style={[styles.btn, styles.btnGhost, { flex: 1 }]} onPress={() => onGenerateInvoice([e])}>
                          <FileText size={16} color={COLORS.ink} />
                          <Text style={styles.btnGhostText}>Preview</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.btn, styles.btnGhost, { paddingHorizontal: 16 }]} onPress={() => {
                          Alert.alert("Delete Expense", "Are you sure you want to delete this expense?", [
                            { text: "Cancel", style: "cancel" },
                            { text: "Delete", style: "destructive", onPress: () => onDelete(e.id) }
                          ]);
                        }}>
                          <Trash2 size={16} color={COLORS.redInk} />
                        </TouchableOpacity>
                      </View>
                    </View>
                  )
                ) : (
                  <View style={styles.actionRow}>
                    <View style={{ flexDirection: 'row', gap: 8 }}>
                      <TouchableOpacity style={[styles.btn, styles.btnGhost]} onPress={() => onGenerateInvoice([e])}>
                        <FileText size={16} color={COLORS.ink} />
                        <Text style={styles.btnGhostText}>Preview</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={[styles.btn, styles.btnGhost, { paddingHorizontal: 10 }]} onPress={() => {
                        Alert.alert("Delete Expense", "Are you sure you want to delete this expense?", [
                          { text: "Cancel", style: "cancel" },
                          { text: "Delete", style: "destructive", onPress: () => onDelete(e.id) }
                        ]);
                      }}>
                        <Trash2 size={16} color={COLORS.redInk} />
                      </TouchableOpacity>
                    </View>
                    {e.approvalRemarks ? (
                      <Text style={{ flex: 1, fontSize: 12, color: COLORS.subtleText, marginLeft: 12 }} numberOfLines={2}>
                        <Text style={{ fontWeight: '600' }}>Note: </Text>{e.approvalRemarks}
                      </Text>
                    ) : (
                      <View style={{ flex: 1 }} />
                    )}
                  </View>
                )}
              </View>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  tabContainer: { flexDirection: 'row', backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: COLORS.rule, paddingHorizontal: 8 },
  tab: { flex: 1, paddingVertical: 14, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' },
  activeTab: { borderBottomColor: COLORS.greenDeep },
  tabText: { fontSize: 13, fontWeight: '600', color: COLORS.subtleText },
  activeTabText: { color: COLORS.greenDeep },
  scroll: { padding: 16, paddingBottom: 100 },
  empty: { padding: 40, alignItems: 'center', justifyContent: 'center' },
  emptyText: { fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif', fontSize: 18, color: COLORS.greenDeep, fontWeight: 'bold' },
  emptySub: { fontSize: 14, color: COLORS.subtleText, marginTop: 8 },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: COLORS.rule },
  cardHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  title: { fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif', fontSize: 16, fontWeight: '600', color: COLORS.ink },
  subtitle: { fontSize: 12, color: COLORS.subtleText, marginTop: 2 },
  amount: { fontSize: 18, fontWeight: 'bold', color: COLORS.greenDeep },
  detailsRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 16, backgroundColor: COLORS.paperAlt, padding: 10, borderRadius: 8 },
  detailsText: { fontSize: 13, color: COLORS.ink },
  actionRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, alignItems: 'center' },
  btn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 10, paddingHorizontal: 14, borderRadius: 8, justifyContent: 'center' },
  badgeBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 8, paddingHorizontal: 16, borderRadius: 24, justifyContent: 'center', flex: 1 },
  btnGhost: { backgroundColor: '#f1f5f9' },
  btnGhostText: { fontSize: 13, fontWeight: '600', color: COLORS.ink },
  btnApprove: { backgroundColor: COLORS.greenMid, flex: 1 },
  btnApproveText: { fontSize: 13, fontWeight: '600', color: '#fff' },
  btnRejectOutlined: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#F8B4B4', flex: 1 },
  btnRejectOutlinedText: { fontSize: 13, fontWeight: '600', color: COLORS.redInk },
  rejectBox: { backgroundColor: '#FDE8E8', padding: 12, borderRadius: 8, marginTop: 8 },
  rejectLabel: { fontSize: 12, fontWeight: '600', color: COLORS.redInk, marginBottom: 8 },
  rejectInput: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#F8B4B4', borderRadius: 6, padding: 10, minHeight: 60, fontSize: 13, marginBottom: 12 },
  btnCancel: { backgroundColor: '#fff', flex: 1, borderWidth: 1, borderColor: '#ccc' },
  btnCancelText: { fontSize: 13, fontWeight: '500', color: '#333' },
  btnReject: { backgroundColor: COLORS.redInk, flex: 1 },
  btnRejectText: { fontSize: 13, fontWeight: '600', color: '#fff' }
});
